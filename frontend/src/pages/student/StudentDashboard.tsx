import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bus, MapPin, User, History, Sun, Moon, Home, Clock, Zap, Users, RefreshCw, ChevronRight } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { interpolateRoute, calcDistance } from "@/utils/data";
import StudentMap from "@/components/map/StudentMap";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import { Badge } from "@/components/ui/badge";
import wsService from "@/services/websocket";
import type { BusLocation, Notification } from "@/utils/data";
import StudentHomeTab from "@/pages/student/StudentHomeTab";
import StudentProfileTab from "@/pages/student/StudentProfileTab";
import { fetchFullStudentProfile, fetchBusByNumber, updateStudentProfile, fetchDashboardBuses, fetchRouteDetails } from "@/lib/apiClient";
import type { StudentProfileResponse, ApiBusRow, ApiRouteRow } from "@/lib/apiClient";
import { toast } from "sonner"; // Assuming sonner is used for toasts

export interface StudentLocation {
  lat: number;
  lng: number;
  locationName: string;
  assignedBusId: string;
}

const StudentDashboard = () => {
  const { updateBusLocation, addNotification, notifications, isDark, toggleTheme, logout, user } = useAppStore();
  const [activeTab, setActiveTab] = useState<"home" | "map" | "history" | "profile">("map");
  const [studentLocation, setStudentLocation] = useState<StudentLocation | null>(null);
  const [busProgress, setBusProgress] = useState(0.08);
  const [apiAttendance, setApiAttendance] = useState<any[]>([]);
  const [realProfile, setRealProfile] = useState<StudentProfileResponse | null>(null);
  const [realBus, setRealBus] = useState<ApiBusRow | null>(null);
  const [realRoute, setRealRoute] = useState<ApiRouteRow | null>(null);
  const [serviceAvailable, setServiceAvailable] = useState(true);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [profile, attendance, allBuses] = await Promise.all([
          fetchFullStudentProfile(),
          import("@/lib/apiClient").then(m => m.fetchStudentAttendance()),
          fetchDashboardBuses()
        ]);
        
        setRealProfile(profile);
        setApiAttendance(attendance);
        
        const activeBuses = allBuses.filter(b => b.is_active && b.status !== 'inactive');
        setServiceAvailable(activeBuses.length > 0);

        if (profile.assigned_bus) {
          const busData = await fetchBusByNumber(profile.assigned_bus);
          setRealBus(busData);
          
          if (busData.route) {
            const routeData = await fetchRouteDetails(Number(busData.route));
            setRealRoute(routeData);
          }

          // Auto-set location if profile has assigned bus
          if (!studentLocation && profile.home_latitude && profile.home_longitude) {
            setStudentLocation({
              lat: Number(profile.home_latitude),
              lng: Number(profile.home_longitude),
              locationName: profile.home_address || "Home",
              assignedBusId: busData.bus_number
            });
          }
        }
      } catch (err) {
        console.error("Failed to load real data:", err);
      } finally {
        setLoading(false);
      }
    };
    loadData();
  }, []);

  // Merge real and mock for "balance"
  const studentProfile = realProfile ? {
    id: String(realProfile.id),
    name: realProfile.full_name,
    email: realProfile.email,
    phone: "",
    grade: `Year ${realProfile.academic_year}`,
    avatar: realProfile.profile_picture || "https://i.pravatar.cc/150?img=48",
    parentPhone: ""
  } : {
    id: user?.id || "st-0",
    name: user?.name || "Student",
    email: user?.email || "student@example.com",
    phone: "",
    grade: "Grade 10",
    avatar: user?.avatar || "https://i.pravatar.cc/150?img=48",
    parentPhone: ""
  };

  useEffect(() => {
    if (realProfile) {
      const studentWsUrl = `${WS_BASE}/ws/user/${realProfile.id}/?token=${getToken()}`;
      const ws = new WebSocket(studentWsUrl);
      
      ws.onmessage = (e) => {
        try {
          const msg = JSON.parse(e.data);
          if (msg.type === "notification") {
            addNotification(msg.data);
          }
        } catch {}
      };

      return () => ws.close();
    }
  }, [realProfile]);

  useEffect(() => {
    const handler = (data: BusLocation | Notification) => {
      if ("busId" in data) updateBusLocation(data as BusLocation);
    };
    wsService.subscribe("bus-location", handler);
    return () => wsService.unsubscribe("bus-location", handler);
  }, []);

  // Animate bus progress after location set
  useEffect(() => {
    clearInterval(intervalRef.current!);
    if (!studentLocation) return;
    setBusProgress(0.08);
    intervalRef.current = setInterval(() => {
      setBusProgress((p) => {
        if (p >= 0.95) { clearInterval(intervalRef.current!); return 0.95; }
        return p + 0.0012;
      });
    }, 600);
    return () => clearInterval(intervalRef.current!);
  }, [studentLocation?.assignedBusId]);

  const handleLocationSet = async (loc: StudentLocation) => {
    setStudentLocation(loc);
    setActiveTab("home");
    
    // Save to backend
    try {
      await updateStudentProfile({
        home_latitude: loc.lat,
        home_longitude: loc.lng,
        home_address: loc.locationName,
        assigned_bus: loc.assignedBusId
      });
      
      // Refresh bus data
      const busData = await fetchBusByNumber(loc.assignedBusId);
      setRealBus(busData);
    } catch (err) {
      console.error("Failed to save location:", err);
    }
  };

  const handleClearLocation = async () => {
    const prevLoc = studentLocation;
    setStudentLocation(null);
    setBusProgress(0.08);
    setRealBus(null);
    setActiveTab("map");

    // Clear in backend
    try {
      await updateStudentProfile({
        assigned_bus: ""
      });
    } catch (err) {
      console.error("Failed to clear location:", err);
      setStudentLocation(prevLoc);
    }
  };

  // Use real bus and route if available, else mock
  const assignedBus = realBus ? {
    id: realBus.bus_number,
    number: realBus.bus_number,
    color: "blue",
    colorHex: "#3b82f6",
    driverName: realBus.driver_name,
    waypoints: realRoute 
      ? realRoute.stops.map(s => [Number(s.latitude), Number(s.longitude)] as [number, number])
      : (realBus.current_location ? [[realBus.current_location.latitude, realBus.current_location.longitude]] : [[31.1148, 30.9408]]),
    route: realRoute 
      ? realRoute.stops.map(s => [Number(s.latitude), Number(s.longitude)] as [number, number])
      : [[31.1148, 30.9408], [31.1060, 30.9408], [31.0994, 30.9475]],
    startLat: realRoute ? Number(realRoute.stops[0].latitude) : 31.1148,
    startLng: realRoute ? Number(realRoute.stops[0].longitude) : 30.9408,
    capacity: realBus.capacity,
    speed: realBus.current_location?.speed_kmh ?? 30
  } : null;

  const busPos = assignedBus ? interpolateRoute(assignedBus.route, busProgress) : null;
  const etaMinutes = assignedBus && busPos && studentLocation
    ? Math.max(1, Math.round((calcDistance(busPos[0], busPos[1], studentLocation.lat, studentLocation.lng) / assignedBus.speed) * 60))
    : null;

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">

      {/* ── Header ── */}
      <header className="glass-card-strong border-b border-border/50 px-4 py-3 flex items-center justify-between flex-shrink-0 z-20">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center">
            <Bus className="h-4 w-4 text-primary-foreground" />
          </div>
          <span className="font-bold text-sm">BusTrack</span>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleTheme} className="rounded-lg p-2 hover:bg-secondary transition-colors">
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </button>
          <NotificationPanel />
          <button onClick={logout} className="text-xs text-muted-foreground hover:text-foreground">Logout</button>
        </div>
      </header>

      {/* ── Assigned Bus Bar (only on map tab, after location set) ── */}
      <AnimatePresence>
        {activeTab === "map" && studentLocation && assignedBus && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="flex-shrink-0 overflow-hidden"
          >
            <div
              className="mx-3 my-2 rounded-xl px-4 py-3 flex items-center gap-3 border"
              style={{
                borderColor: assignedBus.colorHex + "50",
                background: `linear-gradient(90deg, ${assignedBus.colorHex}18 0%, transparent 100%)`,
              }}
            >
              {/* Color dot + bus number */}
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-sm flex-shrink-0 shadow border-2 border-white"
                style={{ background: assignedBus.colorHex }}
              >
                🚌
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="font-black text-sm">{assignedBus.number}</span>
                  <Badge
                    className="text-[9px] text-white border-none h-4 px-1.5"
                    style={{ background: assignedBus.colorHex }}
                  >
                    Active
                  </Badge>
                </div>
                <div className="flex items-center gap-2.5 mt-0.5">
                  <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
                    <Clock className="h-2.5 w-2.5" /> {etaMinutes ?? "--"} min ETA
                  </span>
                  <span className="text-[11px] text-muted-foreground truncate max-w-[110px]">
                    📍 {studentLocation.locationName}
                  </span>
                </div>
              </div>

              {/* Quick stats */}
              <div className="flex gap-3 flex-shrink-0 text-center">
                <div>
                  <p className="text-[11px] font-black">{assignedBus.speed}</p>
                  <p className="text-[9px] text-muted-foreground">km/h</p>
                </div>
                <div>
                  <p className="text-[11px] font-black">{assignedBus.capacity}</p>
                  <p className="text-[9px] text-muted-foreground">cap</p>
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Content ── */}
      <div className={`flex-1 overflow-hidden ${activeTab === "map" ? "" : "overflow-y-auto"}`}>

        {/* Map tab - full height, no padding */}
        {activeTab === "map" && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="h-full p-3 pb-0"
          >
            <StudentMap
              fullScreen
              studentLocation={studentLocation}
              onLocationSet={handleLocationSet}
              onClearLocation={handleClearLocation}
              realRoute={realRoute}
            />
          </motion.div>
        )}

        {activeTab === "home" && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="h-full overflow-y-auto p-4"
          >
            <StudentHomeTab
              profile={studentProfile}
              studentLocation={studentLocation}
              busProgress={busProgress}
              onGoToMap={() => setActiveTab("map")}
              realBus={realBus}
              serviceAvailable={serviceAvailable}
              realRoute={realRoute}
            />
          </motion.div>
        )}

  {activeTab === "history" && (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto p-4 space-y-3">
      <h2 className="font-semibold">Attendance History</h2>
      {apiAttendance.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-8">No attendance records found</p>
      ) : (
        apiAttendance.map((record) => (
          <div key={record.id} className="glass-card rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">{record.date}</p>
              <p className="text-xs text-muted-foreground">Bus {record.bus_number} • {record.boarding_time}</p>
            </div>
            <Badge variant={record.status === "present" ? "default" : record.status === "late" ? "secondary" : "destructive"}>
              {record.status}
            </Badge>
          </div>
        ))
      )}
    </motion.div>
  )}

        {activeTab === "profile" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-full overflow-y-auto p-4">
            <StudentProfileTab profile={studentProfile} />
          </motion.div>
        )}
      </div>

      {/* ── Bottom Navigation ── */}
      <nav className="glass-card-strong border-t border-border/50 flex flex-shrink-0">
        {[
          { id: "home" as const, icon: Home, label: "Home" },
          { id: "map" as const, icon: MapPin, label: "Map" },
          { id: "history" as const, icon: History, label: "History" },
          { id: "profile" as const, icon: User, label: "Profile" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex flex-col items-center py-3 text-xs transition-colors ${
              activeTab === tab.id ? "text-primary" : "text-muted-foreground"
            }`}
          >
            <tab.icon className="h-5 w-5 mb-1" />
            {tab.label}
          </button>
        ))}
      </nav>
    </div>
  );
};

export default StudentDashboard;
