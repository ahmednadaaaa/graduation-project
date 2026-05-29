import React, { useState, useEffect } from "react";
import AppLayout from "@/components/layout/AppLayout";
import { motion } from "framer-motion";
import { MapContainer, TileLayer, Marker, Popup, Polyline } from "react-leaflet";
import L from "leaflet";
import { Brain, MapPin, Zap, Navigation, Clock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { fetchDashboardStudents, optimizeRoute, type AiStudent, type AiRouteOptimizationResponse } from "@/lib/apiClient";
import "leaflet/dist/leaflet.css";

// Fix leaflet default icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const customStopIcon = new L.DivIcon({
  className: "bg-transparent",
  html: `<div class="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-lg" style="background-color: #ef4444;"></div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const customStartIcon = new L.DivIcon({
  className: "bg-transparent",
  html: `<div class="w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-lg" style="background-color: #3b82f6;">⭐</div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

interface Props {
  asTab?: boolean;
}

const DEFAULT_START_LAT = 31.0994;
const DEFAULT_START_LON = 30.9475; // Kafr El Sheikh University

const AIRoutingContent = () => {
  const [students, setStudents] = useState<AiStudent[]>([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AiRouteOptimizationResponse | null>(null);

  useEffect(() => {
    const loadStudents = async () => {
      try {
        const raw = await fetchDashboardStudents();
        const validStudents = raw
          .filter(s => s.home_latitude && s.home_longitude)
          .map(s => ({
            id: s.id,
            name: s.full_name,
            lat: Number(s.home_latitude),
            lon: Number(s.home_longitude)
          }));
        setStudents(validStudents);
      } catch (err) {
        toast.error("Failed to fetch students");
      }
    };
    loadStudents();
  }, []);

  const handleOptimize = async () => {
    if (students.length === 0) {
      toast.error("No students with home locations found.");
      return;
    }
    setLoading(true);
    try {
      const res = await optimizeRoute(DEFAULT_START_LAT, DEFAULT_START_LON, students);
      setResult(res);
      toast.success("Route optimized successfully!");
    } catch (err) {
      toast.error("Failed to optimize route");
    } finally {
      setLoading(false);
    }
  };

  const polylineCoords: [number, number][] = result 
    ? [[DEFAULT_START_LAT, DEFAULT_START_LON], ...result.stops.map(s => [s.lat, s.lon] as [number, number])]
    : [];

  return (
    <div className="flex h-[calc(100vh-120px)] w-full rounded-xl overflow-hidden border border-border/50 bg-background relative">
      <div className="w-96 border-r border-border/50 bg-background flex flex-col z-10 shrink-0">
        <div className="p-5 border-b border-border/50">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" /> AI Route Optimizer
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            Uses Nearest Neighbor algorithm to calculate the most efficient pickup route.
          </p>
        </div>

        <div className="p-5 space-y-4 border-b border-border/50 bg-secondary/10">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium">Eligible Students</span>
            <Badge variant="secondary">{students.length}</Badge>
          </div>
          
          <Button 
            onClick={handleOptimize} 
            className="w-full gap-2 font-bold" 
            disabled={loading || students.length === 0}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 rounded-full border-2 border-primary-foreground border-t-transparent animate-spin" />
                Calculating...
              </span>
            ) : (
              <span className="flex items-center gap-2"><Zap className="h-4 w-4" /> Optimize Route</span>
            )}
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {result ? (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="glass-card rounded-xl p-3 text-center border-dashed">
                  <Navigation className="h-4 w-4 mx-auto mb-1 text-blue-500" />
                  <p className="text-lg font-black">{result.total_distance_km}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Kilometers</p>
                </div>
                <div className="glass-card rounded-xl p-3 text-center border-dashed">
                  <Clock className="h-4 w-4 mx-auto mb-1 text-green-500" />
                  <p className="text-lg font-black">{result.total_time_minutes}</p>
                  <p className="text-[10px] text-muted-foreground uppercase">Minutes ETA</p>
                </div>
              </div>

              <div className="space-y-0 relative ml-2">
                <div className="absolute left-2.5 top-2 bottom-2 w-0.5 bg-border" />
                
                <div className="flex gap-3 relative pb-4">
                  <div className="relative z-10 w-6 h-6 rounded-full bg-blue-500 flex items-center justify-center text-white shadow-md text-[10px]">
                    ⭐
                  </div>
                  <div>
                    <p className="text-sm font-bold">University Gate (Start)</p>
                  </div>
                </div>

                {result.stops.map((stop, i) => (
                  <div key={i} className="flex gap-3 relative pb-4">
                    <div className="relative z-10 w-6 h-6 rounded-full bg-red-500 border-2 border-background flex items-center justify-center text-white shadow-md text-[10px] font-bold">
                      {i + 1}
                    </div>
                    <div className="-mt-0.5">
                      <p className="text-sm font-bold flex items-center gap-1">
                        <User className="h-3 w-3 text-muted-foreground" /> {stop.student_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        +{stop.distance_from_prev_km}km • ETA: {stop.accumulated_time_mins}m
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="text-center py-10 opacity-50">
              <MapPin className="h-10 w-10 mx-auto mb-2" />
              <p className="text-sm">Click "Optimize Route" to generate.</p>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 relative bg-secondary/20 z-0">
        <MapContainer 
          center={[DEFAULT_START_LAT, DEFAULT_START_LON]} 
          zoom={13} 
          style={{ height: "100%", width: "100%", zIndex: 0 }}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            attribution='&copy; <a href="https://carto.com/">Carto</a>'
          />

          <Marker position={[DEFAULT_START_LAT, DEFAULT_START_LON]} icon={customStartIcon}>
            <Popup><strong>Start Location</strong><br/>Kafr El Sheikh University</Popup>
          </Marker>

          {result && result.stops.map((stop, i) => {
            const icon = new L.DivIcon({
              className: "bg-transparent",
              html: `<div class="w-7 h-7 rounded-full border-2 border-white flex items-center justify-center text-xs font-bold text-white shadow-lg" style="background-color: #ef4444;">${i + 1}</div>`,
              iconSize: [28, 28],
              iconAnchor: [14, 14],
            });
            return (
              <Marker key={i} position={[stop.lat, stop.lon]} icon={icon}>
                <Popup>
                  <strong>Stop {i + 1}: {stop.student_name}</strong><br/>
                  ETA: {stop.accumulated_time_mins} mins
                </Popup>
              </Marker>
            );
          })}

          {result && (
            <Polyline 
              positions={polylineCoords} 
              color="#3b82f6" 
              weight={4} 
              opacity={0.7} 
              dashArray="8, 8"
            />
          )}

          {!result && students.map((s, i) => (
             <Marker key={i} position={[s.lat, s.lon]}>
               <Popup>{s.name}</Popup>
             </Marker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
};

const AIRoutingPage = ({ asTab }: Props) => {
  if (asTab) return <AIRoutingContent />;
  return (
    <AppLayout title="AI Route Optimizer">
      <div className="p-6">
        <AIRoutingContent />
      </div>
    </AppLayout>
  );
};

export default AIRoutingPage;
