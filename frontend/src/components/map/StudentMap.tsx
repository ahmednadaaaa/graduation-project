// src/components/map/StudentMap.tsx
// ── Real-time bus tracking for students ──

import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap, useMapEvents } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  UNIVERSITY,
  STUDENT_PICKUP_LOCATIONS,
  nearestLocationName,
  fetchRoadRoute,
  calcDistance,
} from "@/utils/data";
import type { StudentLocation } from "@/pages/student/StudentDashboard";
import type { ApiRouteRow } from "@/lib/apiClient";

// ── Types ──
interface LiveBus {
  id: string;
  bus_number: string;
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

const BUS_COLORS = ["#ef4444", "#3b82f6", "#22c55e", "#f59e0b", "#8b5cf6", "#06b6d4"];

// ── Icons ──
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png",
});

const createBusIcon = (color: string, label: string, isAssigned: boolean) =>
  L.divIcon({
    className: "",
    html: `<div style="
      background:${color};
      width:${isAssigned ? 42 : 34}px;
      height:${isAssigned ? 42 : 34}px;
      border-radius:50%;
      display:flex;flex-direction:column;
      align-items:center;justify-content:center;
      border:${isAssigned ? '4px solid #7c3aed' : '2px solid white'};
      box-shadow:0 3px 10px rgba(0,0,0,0.4);
      font-size:${isAssigned ? 20 : 16}px;
      position:relative;
    ">
      🚌
      ${isAssigned ? '<span style="position:absolute;top:-8px;right:-8px;background:#7c3aed;color:white;font-size:10px;padding:2px 5px;border-radius:6px;font-weight:bold;">YOURS</span>' : ''}
      <span style="font-size:8px;color:white;font-weight:bold;margin-top:-2px;">${label}</span>
    </div>`,
    iconSize: [42, 42],
    iconAnchor: [21, 21],
  });

const myLocationIcon = L.divIcon({
  className: "",
  html: `<div style="position:relative;width:32px;height:32px;">
    <div style="position:absolute;inset:0;border-radius:50%;background:rgba(59,130,246,0.25);animation:pulse 2s infinite;"></div>
    <div style="position:absolute;inset:4px;border-radius:50%;background:#3b82f6;border:3px solid white;box-shadow:0 2px 8px rgba(59,130,246,0.6);display:flex;align-items:center;justify-content:center;font-size:12px;">📍</div>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const universityIcon = L.divIcon({
  className: "",
  html: `<div style="background:#7c3aed;width:36px;height:36px;border-radius:10px;display:flex;align-items:center;justify-content:center;border:3px solid white;box-shadow:0 2px 10px rgba(124,58,237,0.5);font-size:17px;">🏛️</div>`,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// ── Helpers ──
const OnceFlyer = ({ pos }: { pos: [number, number] | null }) => {
  const map = useMap();
  const prevPos = useRef<string>("");
  useEffect(() => {
    if (!pos) return;
    const key = `${pos[0]},${pos[1]}`;
    if (key !== prevPos.current) {
      prevPos.current = key;
      map.flyTo(pos, 15, { animate: true, duration: 1.2 });
    }
  }, [pos, map]);
  return null;
};

const ClickPicker = ({ onPick, enabled }: { onPick: (lat: number, lng: number) => void; enabled: boolean }) => {
  useMapEvents({
    click(e) {
      if (enabled) onPick(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
};

interface StudentMapProps {
  className?: string;
  fullScreen?: boolean;
  studentLocation: StudentLocation | null;
  onLocationSet: (loc: StudentLocation) => void;
  onClearLocation: () => void;
  realRoute?: ApiRouteRow | null;
}

const API_BASE = import.meta.env.VITE_API_URL || "";
const WS_BASE  = (API_BASE || `http://${window.location.host}`).replace("http", "ws");
const getToken = () => localStorage.getItem("token") || "";

const StudentMap = ({ className = "", fullScreen = false, studentLocation, onLocationSet, onClearLocation, realRoute }: StudentMapProps) => {
  const [isPicking, setIsPicking] = useState(false);
  const [buses, setBuses] = useState<BusState[]>([]);
  const [wsStatus, setWsStatus] = useState<"connecting" | "connected" | "disconnected">("connecting");
  const [routeInfo, setRouteInfo] = useState<{ coords: [number, number][]; distance: string; duration: string } | null>(null);
  const wsRefs = useRef<Record<string, WebSocket>>({});
  const colorMap = useRef<Record<string, string>>({});
  const colorIdx = useRef(0);

  const getBusColor = useCallback((busId: string) => {
    if (!colorMap.current[busId]) {
      colorMap.current[busId] = BUS_COLORS[colorIdx.current % BUS_COLORS.length];
      colorIdx.current++;
    }
    return colorMap.current[busId];
  }, []);

  const fetchBusesData = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/bus/`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: LiveBus[] = await res.json();
      const mapped: BusState[] = data.map((bus) => ({
        id: bus.id,
        bus_number: bus.bus_number,
        driver_name: bus.driver_name,
        status: bus.status,
        lat: bus.current_location ? parseFloat(bus.current_location.latitude) : UNIVERSITY.lat,
        lng: bus.current_location ? parseFloat(bus.current_location.longitude) : UNIVERSITY.lng,
        speed: bus.current_location?.speed_kmh ? parseFloat(bus.current_location.speed_kmh) : 0,
        heading: bus.current_location?.heading ? parseFloat(bus.current_location.heading) : 0,
        colorHex: getBusColor(bus.id),
        lastUpdated: bus.current_location?.timestamp || new Date().toISOString(),
      }));
      setBuses(mapped);
    } catch (err) {
      console.error("Failed to fetch buses:", err);
    }
  }, [getBusColor]);

  const connectWebSocket = useCallback((busId: string, busNumber: string) => {
    if (wsRefs.current[busId]?.readyState === WebSocket.OPEN) return;
    const ws = new WebSocket(`${WS_BASE}/ws/bus/${busNumber}/location/?token=${getToken()}`);
    ws.onopen = () => setWsStatus("connected");
    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type === "location_update") {
          const d = msg.data;
          setBuses((prev) => prev.map((b) => b.id === busId ? {
            ...b,
            lat: parseFloat(d.latitude),
            lng: parseFloat(d.longitude),
            speed: parseFloat(d.speed_kmh || "0"),
            heading: parseFloat(d.heading || "0"),
            lastUpdated: d.timestamp,
          } : b));
        }
      } catch {}
    };
    ws.onclose = () => {
      setWsStatus("disconnected");
      setTimeout(() => connectWebSocket(busId, busNumber), 3000);
    };
    wsRefs.current[busId] = ws;
  }, []);

  useEffect(() => {
    fetchBusesData().then(() => {
      buses.forEach((bus) => connectWebSocket(bus.id, bus.bus_number));
    });
    const pollTarget = setInterval(fetchBusesData, 10000);
    return () => {
      clearInterval(pollTarget);
      Object.values(wsRefs.current).forEach((ws) => ws.close());
    };
  }, [fetchBusesData, connectWebSocket, buses.length === 0]); // Re-connect only if list is empty or init

  const getNearestBusId = (lat: number, lng: number) => {
    if (buses.length === 0) return "bus-1";
    let best = buses[0].bus_number;
    let minDist = Infinity;
    buses.forEach(b => {
      const d = calcDistance(lat, lng, b.lat, b.lng);
      if (d < minDist) { minDist = d; best = b.bus_number; }
    });
    return best;
  };

  const handlePickOnMap = (lat: number, lng: number) => {
    const busId = getNearestBusId(lat, lng);
    const locationName = nearestLocationName(lat, lng);
    onLocationSet({ lat, lng, locationName, assignedBusId: busId });
    setIsPicking(false);
  };

  const handleQuickPick = (lat: number, lng: number, name: string) => {
    const busId = getNearestBusId(lat, lng);
    onLocationSet({ lat, lng, locationName: name, assignedBusId: busId });
  };

  const studentPos: [number, number] | null = studentLocation ? [studentLocation.lat, studentLocation.lng] : null;
  const assignedBus = studentLocation ? buses.find(b => b.bus_number === studentLocation.assignedBusId || b.id === studentLocation.assignedBusId) : null;

  // Fetch route from Bus to Student
  useEffect(() => {
    if (!studentPos || !assignedBus) {
      setRouteInfo(null);
      return;
    }
    const waypoints: [number, number][] = [[assignedBus.lat, assignedBus.lng], studentPos];
    fetchRoadRoute(waypoints).then(data => {
      setRouteInfo({
        coords: data.coordinates,
        distance: data.distance.text,
        duration: data.duration.text
      });
    }).catch(() => {
      setRouteInfo({
        coords: waypoints,
        distance: "--",
        duration: "--"
      });
    });
  }, [assignedBus?.lat, assignedBus?.lng, studentPos?.[0]]);

  return (
    <div className={`flex flex-col ${fullScreen ? "h-full" : "h-[500px]"} ${className}`}>
      <style>{`
        @keyframes pulse {
          0% { transform: scale(0.95); opacity: 0.5; }
          50% { transform: scale(1.15); opacity: 0.3; }
          100% { transform: scale(0.95); opacity: 0.5; }
        }
      `}</style>

      <div className="relative z-0 flex-1 rounded-2xl overflow-hidden border border-border/40 shadow-md">
        
        {/* Connection Status Bar */}
        <div className="absolute top-3 left-3 z-[1000] flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-background/90 backdrop-blur-sm border border-border/60 rounded-full px-3 py-1.5 shadow text-[10px] font-bold uppercase tracking-wider">
            <span className={`h-2 w-2 rounded-full ${
              wsStatus === "connected" ? "bg-green-500 animate-pulse" : "bg-red-500"
            }`} />
            {wsStatus === "connected" ? "Live Tracking" : "Reconnecting..."}
          </div>
        </div>

        {/* Student ETA Card */}
        {assignedBus && studentLocation && (
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 z-[1000] w-[90%] max-w-sm">
            <div className="bg-background/95 backdrop-blur-md border border-border/50 rounded-2xl p-4 shadow-2xl">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="h-8 w-8 bg-primary/10 rounded-lg flex items-center justify-center text-lg">🚌</div>
                  <div>
                    <h4 className="text-[10px] font-bold uppercase text-muted-foreground leading-none">Your Assigned Bus</h4>
                    <p className="font-bold text-sm leading-none mt-1">{assignedBus.bus_number}</p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase text-primary block leading-none">Arriving In</span>
                  <span className="text-xl font-black">{routeInfo?.duration || "--"}</span>
                </div>
              </div>
              
              <div className="flex items-center gap-4 pt-3 border-t border-border/40">
                <div className="flex-1">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground block">Distance</span>
                  <span className="text-sm font-bold">{routeInfo?.distance || "--"}</span>
                </div>
                <div className="flex-1">
                  <span className="text-[9px] font-bold uppercase text-muted-foreground block">Bus Speed</span>
                  <span className="text-sm font-bold">{Math.round(assignedBus.speed)} km/h</span>
                </div>
              </div>
            </div>
          </div>
        )}

        <MapContainer center={[31.1070, 30.9440]} zoom={14} style={{ height: "100%", width: "100%" }}>
          <TileLayer 
            attribution="&copy; Google" 
            url="https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}" 
          />
          <ClickPicker onPick={handlePickOnMap} enabled={isPicking} />
          <OnceFlyer pos={studentPos} />

          <Marker position={[UNIVERSITY.lat, UNIVERSITY.lng]} icon={universityIcon}>
            <Popup><strong>🏛️ {UNIVERSITY.name}</strong></Popup>
          </Marker>

          {buses.map((bus) => {
            const isMyBus = assignedBus?.id === bus.id;
            return (
              <React.Fragment key={bus.id}>
                 {isMyBus && realRoute && realRoute.stops.length > 0 && (
                   <Polyline 
                    positions={realRoute.stops.map(s => [Number(s.latitude), Number(s.longitude)])} 
                    pathOptions={{ color: bus.colorHex, weight: 6, opacity: 0.4, dashArray: "10, 10" }} 
                   />
                )}
                {isMyBus && routeInfo && (
                   <Polyline 
                    positions={routeInfo.coords} 
                    pathOptions={{ color: bus.colorHex, weight: 4, opacity: 0.8 }} 
                   />
                )}
                <Marker position={[bus.lat, bus.lng]} icon={createBusIcon(bus.colorHex, bus.bus_number, isMyBus)}>
                  <Popup>
                    <div className="p-1">
                      <strong style={{ color: bus.colorHex }}>🚌 {bus.bus_number}</strong>
                      <div className="text-xs mt-1">
                        Driver: {bus.driver_name}<br />
                        Speed: {bus.speed} km/h<br />
                        <span className="opacity-60">Updated: {new Date(bus.lastUpdated).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              </React.Fragment>
            );
          })}

          {studentPos && (
            <Marker position={studentPos} icon={myLocationIcon}>
              <Popup><strong>📍 Your Pickup</strong><br/>{studentLocation?.locationName}</Popup>
            </Marker>
          )}
        </MapContainer>

        {!studentLocation && !isPicking && (
          <div className="absolute inset-0 z-[1000] flex items-center justify-center bg-background/60 backdrop-blur-sm">
            <div className="bg-background border border-border/70 rounded-2xl shadow-2xl p-6 mx-5 w-full max-w-xs text-center">
              <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4 text-2xl">📍</div>
              <h3 className="font-bold text-lg mb-2">Track Your Bus</h3>
              <p className="text-sm text-muted-foreground mb-6">Select your pickup location to see the nearest bus in real-time.</p>
              <div className="space-y-3">
                <button onClick={() => handleQuickPick(31.1000, 30.9450, "Sakha Road Junction")} className="w-full py-3 rounded-xl font-bold text-sm bg-primary text-white hover:bg-primary/90 transition-all">Use Current Location</button>
                <button onClick={() => setIsPicking(true)} className="w-full py-3 rounded-xl font-bold text-sm border border-border/60 hover:bg-secondary/20 transition-all">Pick on Map</button>
              </div>
            </div>
          </div>
        )}

        {isPicking && (
          <div className="absolute top-4 inset-x-4 z-[1000] bg-orange-500 text-white text-xs font-bold px-4 py-3 rounded-xl shadow-lg flex justify-between items-center">
            <span>🎯 Tap your pickup point on the map</span>
            <button onClick={() => setIsPicking(false)} className="bg-white/20 px-2 py-1 rounded text-[10px]">CANCEL</button>
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentMap;
