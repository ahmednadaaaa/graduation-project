// src/components/map/AdminMap.tsx
// ── Real-time bus tracking connected to Django backend ──

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { UNIVERSITY, fetchRoadRoute } from "@/utils/data";

// ── Fix Leaflet icons ──
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl:       "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl:     "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

// ── Types from Backend ──
interface LiveBus {
  id: string;
  bus_number: string;
  plate_number: string;
  status: string;
  driver_name: string;
  current_location: {
    latitude: string;
    longitude: string;
    speed_kmh: string | null;
    heading: string | null;
    timestamp: string;
  } | null;
}

interface BusState {
  id: string;
  bus_number: string;
  driver_name: string;
  status: string;
  lat: number;
  lng: number;
  speed: number;
  heading: number;
  colorHex: string;
  lastUpdated: string;
}

// ── Bus Colors ──
const BUS_COLORS = [
  "#ef4444", "#3b82f6", "#22c55e",
  "#f59e0b", "#8b5cf6", "#06b6d4",
];

const createBusIcon = (color: string, label: string, heading: number) =>
  L.divIcon({
    className: "",
    html: `
      <div style="
        transform: rotate(${heading}deg);
        transition: transform 0.5s ease;
      ">
        <div style="
          background:${color};
          width:44px;height:44px;
          border-radius:50%;
          display:flex;flex-direction:column;
          align-items:center;justify-content:center;
          border:3px solid white;
          box-shadow:0 2px 12px rgba(0,0,0,0.45);
          font-size:20px;
        ">🚌<span style="font-size:8px;color:white;font-weight:bold;margin-top:-2px;">${label}</span>
        </div>
      </div>`,
    iconSize:   [44, 44],
    iconAnchor: [22, 22],
  });

const universityIcon = L.divIcon({
  className: "",
  html: `<div style="background:#7c3aed;width:42px;height:42px;border-radius:10px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 12px rgba(124,58,237,0.5);font-size:22px;">🏛️</div>`,
  iconSize:   [42, 42],
  iconAnchor: [21, 21],
});

// ── API Base URL ──
const API_BASE = import.meta.env.VITE_API_URL || "";
const WS_BASE  = (API_BASE || `http://${window.location.host}`).replace("http", "ws");

const getToken = () => localStorage.getItem("token") || "";

// ── FitBounds Helper ──
const FitBounds = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (positions.length > 1 && !fitted.current) {
      map.fitBounds(L.latLngBounds(positions), { padding: [50, 50] });
      fitted.current = true;
    }
  }, [positions.length, map]);
  return null;
};

interface AdminMapProps {
  className?: string;
  fullScreen?: boolean;
}

const AdminMap = ({ className = "", fullScreen = false }: AdminMapProps) => {
  const [buses, setBuses]           = useState<BusState[]>([]);
  const [loading, setLoading]       = useState(true);
  const [wsStatus, setWsStatus]     = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [roadRoutes, setRoadRoutes] = useState<Record<string, [number, number][]>>({});

  const wsRefs   = useRef<Record<string, WebSocket>>({});
  const colorMap = useRef<Record<string, string>>({});
  let   colorIdx = useRef(0);

  // ── Get consistent color per bus ──
  const getBusColor = useCallback((busId: string) => {
    if (!colorMap.current[busId]) {
      colorMap.current[busId] = BUS_COLORS[colorIdx.current % BUS_COLORS.length];
      colorIdx.current++;
    }
    return colorMap.current[busId];
  }, []);

  // ── Fetch buses list ──
  const fetchBusesData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bus/`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LiveBus[] = await res.json();

      const mapped: BusState[] = data.map((bus) => ({
        id:          bus.id,
        bus_number:  bus.bus_number,
        driver_name: bus.driver_name || "—",
        status:      bus.status,
        lat:         bus.current_location ? parseFloat(bus.current_location.latitude)  : UNIVERSITY.lat,
        lng:         bus.current_location ? parseFloat(bus.current_location.longitude) : UNIVERSITY.lng,
        speed:       bus.current_location?.speed_kmh  ? parseFloat(bus.current_location.speed_kmh)  : 0,
        heading:     bus.current_location?.heading    ? parseFloat(bus.current_location.heading)    : 0,
        colorHex:    getBusColor(bus.id),
        lastUpdated: bus.current_location?.timestamp || new Date().toISOString(),
      }));

      setBuses(mapped);
      setLoading(false);
      return mapped;
    } catch (err) {
      console.error("Failed to fetch buses:", err);
      setLoading(false);
      return [];
    }
  }, [getBusColor]);

  // ── WebSocket per bus ──
  const connectWebSocket = useCallback((busId: string, busNumber: string) => {
    if (wsRefs.current[busId]?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(
      `${WS_BASE}/ws/bus/${busNumber}/location/?token=${getToken()}`
    );

    ws.onopen = () => {
      setWsStatus("connected");
      console.log(`WS connected: bus ${busNumber}`);
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "location_update") {
          const d = msg.data;
          setBuses((prev) =>
            prev.map((b) =>
              b.id === busId
                ? {
                    ...b,
                    lat:         parseFloat(d.latitude),
                    lng:         parseFloat(d.longitude),
                    speed:       parseFloat(d.speed_kmh  || "0"),
                    heading:     parseFloat(d.heading    || "0"),
                    lastUpdated: d.timestamp,
                  }
                : b
            )
          );
        }
      } catch {}
    };

    ws.onclose = () => {
      setWsStatus("disconnected");
      setTimeout(() => connectWebSocket(busId, busNumber), 3000);
    };

    ws.onerror = () => ws.close();

    wsRefs.current[busId] = ws;
  }, []);

  // ── Initialize ──
  useEffect(() => {
    fetchBusesData().then((mapped) => {
      mapped.forEach((bus) => connectWebSocket(bus.id, bus.bus_number));
    });

    const poll = setInterval(fetchBusesData, 10000);

    return () => {
      clearInterval(poll);
      Object.values(wsRefs.current).forEach((ws) => ws.close());
    };
  }, [fetchBusesData, connectWebSocket]);

  // ── Fetch OSRM route for each bus ──
  useEffect(() => {
    buses.forEach((bus) => {
      if (roadRoutes[bus.id]) return;
      const waypoints: [number, number][] = [
        [bus.lat, bus.lng],
        [UNIVERSITY.lat, UNIVERSITY.lng],
      ];
      fetchRoadRoute(waypoints)
        .then((route) =>
          setRoadRoutes((prev) => ({ ...prev, [bus.id]: route }))
        )
        .catch(() => {
          setRoadRoutes((prev) => ({
            ...prev,
            [bus.id]: [[bus.lat, bus.lng], [UNIVERSITY.lat, UNIVERSITY.lng]],
          }));
        });
    });
  }, [buses.length, roadRoutes]);

  const allPositions: [number, number][] = [
    ...buses.map((b) => [b.lat, b.lng] as [number, number]),
    [UNIVERSITY.lat, UNIVERSITY.lng],
  ];

  return (
    <div className={`relative z-0 overflow-hidden rounded-xl ${fullScreen ? "h-full" : "h-[500px]"} ${className}`}>

      {/* ── Status Bar ── */}
      <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
        <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-border/60 rounded-full px-3 py-1.5 shadow text-xs font-semibold">
          <span className={`h-2 w-2 rounded-full ${
            wsStatus === "connected"    ? "bg-green-500 animate-pulse" :
            wsStatus === "connecting"   ? "bg-yellow-500 animate-pulse" :
            "bg-red-500"
          }`} />
          {wsStatus === "connected"  ? "Live" :
           wsStatus === "connecting" ? "Connecting…" : "Reconnecting…"}
        </div>

        {!loading && (
          <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-border/60 rounded-full px-3 py-1.5 shadow text-xs font-semibold">
            🚌 {buses.length} {buses.length === 1 ? "Bus" : "Buses"}
          </div>
        )}
      </div>

      {loading && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border/60 rounded-full px-4 py-1.5 shadow-lg text-xs font-semibold text-muted-foreground">
          <span className="h-2 w-2 rounded-full bg-primary animate-pulse inline-block" />
          Loading buses…
        </div>
      )}

      {!loading && buses.length === 0 && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[1000] flex items-center gap-2 bg-yellow-500/90 backdrop-blur-sm rounded-full px-4 py-1.5 shadow-lg text-xs font-semibold text-white">
          ⚠️ No buses found
        </div>
      )}

      <MapContainer
        center={[UNIVERSITY.lat, UNIVERSITY.lng]}
        zoom={14}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution="&copy; Google"
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}"
        />

        {buses.map((bus) => (
          <React.Fragment key={bus.id}>
            {/* Bus Path to University */}
            {roadRoutes[bus.id] && roadRoutes[bus.id].length > 1 && (
              <Polyline
                positions={roadRoutes[bus.id]}
                pathOptions={{
                  color:   bus.colorHex,
                  weight:  4,
                  opacity: 0.7,
                }}
              />
            )}

            {/* Bus Marker */}
            <Marker
              position={[bus.lat, bus.lng]}
              icon={createBusIcon(bus.colorHex, bus.bus_number, bus.heading)}
            >
              <Popup>
                <div style={{ minWidth: 160 }}>
                  <strong style={{ color: bus.colorHex }}>
                    🚌 {bus.bus_number}
                  </strong>
                  <br />
                  Driver: {bus.driver_name}
                  <br />
                  Speed: {bus.speed} km/h
                  <br />
                  Status: <span style={{ color: bus.status === "en-route" ? "#22c55e" : "#3b82f6" }}>{bus.status}</span>
                  <br />
                  <span style={{ fontSize: 10, color: "#9ca3af" }}>
                    Updated: {new Date(bus.lastUpdated).toLocaleTimeString()}
                  </span>
                </div>
              </Popup>
            </Marker>
          </React.Fragment>
        ))}

        <Marker position={[UNIVERSITY.lat, UNIVERSITY.lng]} icon={universityIcon}>
          <Popup>
            <strong>🏛️ {UNIVERSITY.name}</strong>
            <br />
            Final destination
          </Popup>
        </Marker>

        <FitBounds positions={allPositions} />
      </MapContainer>
    </div>
  );
};

export default AdminMap;
