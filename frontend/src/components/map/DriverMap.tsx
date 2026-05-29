// src/components/map/DriverMap.tsx
// ── Real-time tracking for drivers ──

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import React, { useEffect, useRef, useState, useCallback } from "react";
import { UNIVERSITY, fetchRoadRoute } from "@/utils/data";

// ── Icons ──
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const createBusIcon = (color: string, label: string) =>
  L.divIcon({
    className: "",
    html: `<div style="background:${color};width:42px;height:42px;border-radius:50%;display:flex;flex-direction:column;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 3px 12px rgba(0,0,0,0.5);font-size:20px;">🚌<span style="font-size:8px;color:white;font-weight:bold;margin-top:-2px;">${label}</span></div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });

const studentPickupIcon = L.divIcon({
  className: "",
  html: `<div style="background:#3b82f6;width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;border:2px solid white;box-shadow:0 2px 8px rgba(0,0,0,0.3);font-size:14px;">👤</div>`,
  iconSize: [28, 28],
  iconAnchor: [14, 14],
});

const universityIcon = L.divIcon({
  className: "",
  html: `<div style="background:#7c3aed;width:38px;height:38px;border-radius:8px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 8px rgba(124,58,237,0.5);font-size:20px;">🏛️</div>`,
  iconSize: [38, 38],
  iconAnchor: [19, 19],
});

// ── Types ──
interface LiveBus {
  id: string;
  bus_number: string;
  driver_name: string;
  status: string;
  current_location: {
    latitude: string;
    longitude: string;
    speed_kmh: string | null;
    timestamp: string;
  } | null;
}

interface BusState {
  id: string;
  bus_number: string;
  lat: number;
  lng: number;
  speed: number;
  lastUpdated: string;
}

const FitBounds = ({ positions }: { positions: [number, number][] }) => {
  const map = useMap();
  const fitted = useRef(false);
  useEffect(() => {
    if (positions.length > 1 && !fitted.current) {
      map.fitBounds(L.latLngBounds(positions), { padding: [50, 50] });
      fitted.current = true;
    }
  }, [positions, map]);
  return null;
};

interface DriverMapProps {
  busId?: string;
  className?: string;
  fullScreen?: boolean;
}

const API_BASE = import.meta.env.VITE_API_URL || "";
const WS_BASE  = (API_BASE || `http://${window.location.host}`).replace("http", "ws");
const getToken = () => localStorage.getItem("token") || "";

const DriverMap = ({ busId, className = "", fullScreen = false }: DriverMapProps) => {
  const [bus, setBus] = useState<BusState | null>(null);
  const [loading, setLoading] = useState(true);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [routeInfo, setRouteInfo] = useState<{ coords: [number, number][]; distance: string; duration: string } | null>(null);
  
  const wsRef = useRef<WebSocket | null>(null);

  const fetchBusData = useCallback(async () => {
    if (!busId) return;
    try {
      const res = await fetch(`${API_BASE}/api/bus/${busId}/`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LiveBus = await res.json();
      const st = {
        id: data.id,
        bus_number: data.bus_number,
        lat: data.current_location ? parseFloat(data.current_location.latitude) : UNIVERSITY.lat,
        lng: data.current_location ? parseFloat(data.current_location.longitude) : UNIVERSITY.lng,
        speed: data.current_location?.speed_kmh ? parseFloat(data.current_location.speed_kmh) : 0,
        lastUpdated: data.current_location?.timestamp || new Date().toISOString(),
      };
      setBus(st);
      setLoading(false);
      return st;
    } catch (err) {
      console.error("Failed to fetch bus:", err);
      setLoading(false);
    }
  }, [busId]);

  const connectWS = useCallback((busNumber: string) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(`${WS_BASE}/ws/bus/${busNumber}/location/?token=${getToken()}`);
    ws.onopen = () => setWsStatus("connected");
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "location_update") {
          const d = msg.data;
          setBus(prev => prev ? {
            ...prev,
            lat: parseFloat(d.latitude),
            lng: parseFloat(d.longitude),
            speed: parseFloat(d.speed_kmh || "0"),
            lastUpdated: d.timestamp,
          } : null);
        }
      } catch {}
    };
    ws.onclose = () => {
      setWsStatus("disconnected");
      setTimeout(() => connectWS(busNumber), 3000);
    };
    wsRef.current = ws;
  }, []);

  useEffect(() => {
    fetchBusData().then(data => {
      if (data) connectWS(data.bus_number);
    });
    const poll = setInterval(fetchBusData, 10000);
    return () => {
      clearInterval(poll);
      wsRef.current?.close();
    };
  }, [fetchBusData, connectWS]);

  // Route to University
  useEffect(() => {
    if (!bus) return;
    const waypoints: [number, number][] = [[bus.lat, bus.lng], [UNIVERSITY.lat, UNIVERSITY.lng]];
    fetchRoadRoute(waypoints).then(data => {
      setRouteInfo({
        coords: data.coordinates,
        distance: data.distance.text,
        duration: data.duration.text
      });
    }).catch(() => {
      setRouteInfo({
        coords: waypoints,
        distance: "Calculating...",
        duration: "Calculating..."
      });
    });
  }, [bus?.id, routeInfo === null]);

  if (loading) return <div className="h-full flex items-center justify-center text-muted-foreground animate-pulse">Initializing map...</div>;
  if (!bus) return <div className="h-full flex items-center justify-center text-red-500">Bus configuration not found</div>;

  const allPositions: [number, number][] = [[bus.lat, bus.lng], [UNIVERSITY.lat, UNIVERSITY.lng]];

  return (
    <div className={`relative z-0 overflow-hidden rounded-xl ${fullScreen ? "h-full" : "h-[460px]"} ${className}`}>
      
      {/* Driver UI Overlay */}
      <div className="absolute top-3 left-3 z-[1000] flex flex-col gap-2">
        <div className="bg-background/90 backdrop-blur-sm border border-border/60 rounded-xl p-3 shadow-lg flex items-center gap-3">
          <div className="h-10 w-10 bg-primary/10 rounded-full flex items-center justify-center text-xl">🚌</div>
          <div>
            <h4 className="font-bold text-xs uppercase tracking-tight opacity-50">Assigned Bus</h4>
            <p className="font-black text-lg leading-none">{bus.bus_number}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 bg-background/90 backdrop-blur-sm border border-border/60 rounded-full px-3 py-1.5 shadow text-[10px] font-bold uppercase tracking-wider">
          <span className={`h-2 w-2 rounded-full ${wsStatus === "connected" ? "bg-green-500 animate-pulse" : "bg-red-500"}`} />
          {wsStatus === "connected" ? "Telemetry Active" : "Reconnecting..."}
        </div>
      </div>

      {/* ETA & Distance Card */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-md">
        <div className="bg-background/95 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-2xl flex items-center justify-between">
          <div className="flex flex-col">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Arrival Time</span>
            <span className="text-2xl font-black text-primary">{routeInfo?.duration || "--"}</span>
          </div>
          <div className="h-10 w-px bg-border/50" />
          <div className="flex flex-col items-center">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Current Speed</span>
            <span className="text-2xl font-black">{Math.round(bus.speed)} <span className="text-xs font-medium">km/h</span></span>
          </div>
          <div className="h-10 w-px bg-border/50" />
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold uppercase text-muted-foreground tracking-widest">Distance</span>
            <span className="text-2xl font-black">{routeInfo?.distance || "--"}</span>
          </div>
        </div>
      </div>

      <MapContainer center={[bus.lat, bus.lng]} zoom={15} style={{ height: "100%", width: "100%" }}>
        <TileLayer 
          attribution="&copy; Google Maps" 
          url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" 
        />
        
        {routeInfo && routeInfo.coords.length > 1 && (
          <Polyline positions={routeInfo.coords} pathOptions={{ color: "#3b82f6", weight: 6, opacity: 0.8 }} />
        )}

        <Marker position={[bus.lat, bus.lng]} icon={createBusIcon("#3b82f6", bus.bus_number)}>
          <Popup>
            <strong>Your Location</strong><br/>
            Speed: {bus.speed} km/h
          </Popup>
        </Marker>

        <Marker position={[UNIVERSITY.lat, UNIVERSITY.lng]} icon={universityIcon}>
          <Popup><strong>🏛️ {UNIVERSITY.name}</strong></Popup>
        </Marker>

        <FitBounds positions={allPositions} />
      </MapContainer>
    </div>
  );
};

export default DriverMap;
