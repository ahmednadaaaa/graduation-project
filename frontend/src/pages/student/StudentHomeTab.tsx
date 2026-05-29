import { motion } from "framer-motion";
import { Bus, Clock, MapPin, Users, Zap, Navigation, Activity, RefreshCw, ChevronRight } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { interpolateRoute, calcDistance, splitRoute } from "@/utils/data";
import type { StudentProfile } from "@/utils/data";
import type { StudentLocation } from "@/pages/student/StudentDashboard";
import type { ApiBusRow, ApiRouteRow } from "@/lib/apiClient";

interface Props {
  profile: StudentProfile;
  studentLocation: StudentLocation | null;
  busProgress: number;
  onGoToMap: () => void;
  realBus: ApiBusRow | null;
  serviceAvailable: boolean;
  realRoute: ApiRouteRow | null;
}

const StudentHomeTab = ({ profile, studentLocation, busProgress, onGoToMap, realBus, serviceAvailable, realRoute }: Props) => {
  const assignedBus = realBus ? {
    id: realBus.bus_number,
    number: realBus.bus_number,
    color: "blue",
    colorHex: "#3b82f6",
    driverName: realBus.driver_name,
    waypoints: realBus.current_location ? [[realBus.current_location.latitude, realBus.current_location.longitude]] : [[31.1148, 30.9408]],
    route: [[31.1148, 30.9408], [31.1060, 30.9408], [31.0994, 30.9475]],
    startLat: 31.1148,
    startLng: 30.9408,
    capacity: realBus.capacity,
    speed: realBus.current_location?.speed_kmh ?? 30
  } : null;

  // Use waypoints as fallback route for ETA calculation (OSRM route loaded in parent)
  const activeRoute = assignedBus?.route ?? [];
  const busPos = assignedBus && activeRoute.length > 0 ? interpolateRoute(activeRoute, busProgress) : null;

  const etaMinutes =
    assignedBus && busPos && studentLocation
      ? Math.max(1, Math.round((calcDistance(busPos[0], busPos[1], studentLocation.lat, studentLocation.lng) / assignedBus.speed) * 60))
      : null;

  const occupancyPct = realBus ? Math.round((28 / realBus.capacity) * 100) : 0;
  const occupancyColor = occupancyPct > 80 ? "#ef4444" : occupancyPct > 60 ? "#f59e0b" : "#22c55e";

  // ── Service Unavailable ──
  if (!serviceAvailable) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <div>
          <h1 className="text-lg font-black">Hi {profile?.name ?? "Student"} 👋</h1>
          <p className="text-[9px] uppercase font-bold tracking-[0.1em] text-muted-foreground">Status Update</p>
        </div>
        <div className="rounded-[2rem] border border-red-500/20 bg-red-500/5 p-8 text-center space-y-4">
          <div className="text-5xl mb-2">🚫</div>
          <p className="font-black text-base text-red-500">Service Currently Unavailable</p>
          <p className="text-sm text-muted-foreground">
            There are no active buses at the moment. Please check back during operational hours.
          </p>
        </div>
      </motion.div>
    );
  }

  // ── No location set yet ──
  if (!studentLocation || !assignedBus) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        {/* Greeting */}
        <div>
          <h1 className="text-lg font-black">Hi {profile?.name ?? "Student"} 👋</h1>
          <p className="text-[9px] uppercase font-bold tracking-[0.1em] text-muted-foreground">Welcome back</p>
        </div>

        {/* Prompt card */}
        <div className="rounded-[2rem] border border-dashed border-primary/40 bg-primary/5 p-8 text-center space-y-4">
          <div className="text-5xl mb-2">📍</div>
          <p className="font-black text-base">No Bus Assigned Yet</p>
          <p className="text-sm text-muted-foreground">
            Go to the Map tab and set your pickup location to get assigned to the nearest bus.
          </p>
          <Button onClick={onGoToMap} className="gap-2">
            <MapPin className="h-4 w-4" /> Set My Location
          </Button>
        </div>
      </motion.div>
    );
  }

  // ── Bus assigned ──
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 pb-6">
      
      {/* Greeting */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-black">Hi {profile?.name ?? "Student"} 👋</h1>
          <p className="text-[9px] uppercase font-bold tracking-[0.1em] text-muted-foreground">Premium Access Active</p>
        </div>
        <button
          onClick={onGoToMap}
          className="text-[10px] text-primary font-bold flex items-center gap-1 hover:opacity-80 transition"
        >
          View Map <ChevronRight className="h-3 w-3" />
        </button>
      </div>

      {/* ── Main Bus Card ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative overflow-hidden rounded-[2.5rem] p-7 shadow-2xl border"
        style={{
          borderColor: assignedBus.colorHex + "44",
          background: `linear-gradient(135deg, ${assignedBus.colorHex}18 0%, transparent 100%)`,
        }}
      >
        {/* Glow */}
        <div className="absolute inset-0 rounded-[2.5rem] pointer-events-none bg-gradient-to-br from-white/5 via-transparent to-transparent" />
        {/* BG icon */}
        <div className="absolute top-0 right-0 p-6 opacity-10">
          <Activity className="h-20 w-20" style={{ color: assignedBus.colorHex }} />
        </div>

        {/* Top row */}
        <div className="relative z-10 flex justify-between items-start mb-6">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl border-2 border-white shadow-lg"
              style={{ background: assignedBus.colorHex }}
            >
              🚌
            </div>
            <div>
              <p className="text-[10px] uppercase text-muted-foreground tracking-widest">Your Bus</p>
              <h2 className="text-2xl font-black">{assignedBus.number}</h2>
              <p className="text-xs text-muted-foreground">{assignedBus.driverName}</p>
            </div>
          </div>
          <Badge
            className="text-white border-none px-3 py-1 text-[10px] font-bold"
            style={{ background: assignedBus.colorHex }}
          >
            On Route
          </Badge>
        </div>

        {/* ETA big */}
        <div className="relative z-10 mb-6">
          <p className="text-xs text-muted-foreground uppercase tracking-wider">Time to Arrival</p>
          <motion.p
            key={etaMinutes}
            initial={{ scale: 0.9 }}
            animate={{ scale: [1, 1.04, 1] }}
            transition={{ duration: 0.5 }}
            className="text-6xl font-extrabold tracking-tight"
            style={{ color: assignedBus.colorHex }}
          >
            {etaMinutes}
            <span className="text-xl ml-2 text-foreground/60">min</span>
          </motion.p>
          <p className="text-xs text-muted-foreground mt-1">Estimated arrival</p>
        </div>

        {/* Stats row */}
        <div className="relative z-10 grid grid-cols-3 gap-3">
          <div className="bg-background/60 rounded-2xl p-3 text-center border border-border/30">
            <Zap className="h-3.5 w-3.5 mx-auto mb-1 text-yellow-500" />
            <p className="text-sm font-black">{assignedBus.speed}</p>
            <p className="text-[10px] text-muted-foreground">km/h</p>
          </div>
          <div className="bg-background/60 rounded-2xl p-3 text-center border border-border/30">
            <Users className="h-3.5 w-3.5 mx-auto mb-1 text-green-500" />
            <p className="text-sm font-black">28/{assignedBus.capacity}</p>
            <p className="text-[10px] text-muted-foreground">Occupancy</p>
          </div>
          <div className="bg-background/60 rounded-2xl p-3 text-center border border-border/30">
            <Navigation className="h-3.5 w-3.5 mx-auto mb-1 text-primary" />
            <p className="text-sm font-black">{assignedBus.route.length - 1}</p>
            <p className="text-[10px] text-muted-foreground">Stops</p>
          </div>
        </div>
      </motion.div>

      {/* Pickup location card */}
      <div className="rounded-2xl border border-border/50 p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center flex-shrink-0">
          <MapPin className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold">Your Pickup</p>
          <p className="font-black text-sm truncate">{studentLocation.locationName}</p>
          <p className="text-[10px] text-muted-foreground">
            {studentLocation.lat.toFixed(4)}, {studentLocation.lng.toFixed(4)}
          </p>
        </div>
      </div>

      {/* Occupancy bar */}
      <div className="rounded-2xl border border-border/50 p-4 space-y-3">
        <div className="flex justify-between items-center">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Bus Occupancy</p>
          <p className="text-xs font-bold">28 / {assignedBus.capacity} seats</p>
        </div>
        <div className="w-full h-2.5 bg-border rounded-full overflow-hidden">
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${occupancyPct}%` }}
            transition={{ duration: 0.8 }}
            className="h-full rounded-full"
            style={{ background: occupancyColor }}
          />
        </div>
        <div className="flex justify-between text-[10px] text-muted-foreground">
          <span>Available: {assignedBus.capacity - 28} seats</span>
          <span>{occupancyPct}% full</span>
        </div>
      </div>

      {/* Route stops */}
      <div className="rounded-[2rem] border border-border/50 p-5 space-y-3">
        <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Route Stops</p>
        <div className="space-y-0 relative">
          <div className="absolute left-[10px] top-2 bottom-2 w-0.5 bg-border" />
          {(realRoute?.stops || assignedBus.route).map((stop, i) => {
            const stopName = typeof stop === 'object' && 'name' in stop ? stop.name : (i === 0 ? "Depot Start" : i === assignedBus.route.length - 1 ? "🏛️ University" : `Stop ${i + 1}`);
            const isFirst = i === 0;
            const isLast = realRoute ? i === realRoute.stops.length - 1 : i === assignedBus.route.length - 1;
            const isDone = (busProgress * ((realRoute?.stops.length || assignedBus.route.length) - 1)) > i;

            return (
              <div key={i} className="flex gap-4 relative pb-5 last:pb-0">
                <div className="relative z-10 flex-shrink-0">
                  <div
                    className={`h-5 w-5 rounded-full border-2 flex items-center justify-center transition-all ${
                      isDone
                        ? "border-green-500 bg-green-500"
                        : isLast
                        ? "border-purple-500 bg-purple-100"
                        : "border-border bg-background"
                    }`}
                  >
                    {isDone && <span className="text-white text-[8px]">✓</span>}
                    {isLast && <span className="text-[8px]">🏛</span>}
                  </div>
                </div>
                <div className="-mt-0.5">
                  <p className={`text-sm font-bold ${isDone ? "line-through text-muted-foreground opacity-60" : ""}`}>
                    {stopName}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
};

export default StudentHomeTab;
