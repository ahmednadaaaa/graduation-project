import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bus, Users, Map, User, CheckCircle, Sun, Moon } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import { mockRouteStops, mockStudentPickups, mockDrivers } from "@/utils/data";
import DriverMap from "@/components/map/DriverMap";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { StudentPickup, DriverProfile } from "@/utils/data";
import DriverHeader from "@/pages/driver/DriverHeader";
import DriverHomeTab from "@/pages/driver/DriverHomeTab";
import DriverStudentsTab from "@/pages/driver/DriverStudentsTab";
import DriverProfileTab from "@/pages/driver/DriverProfileTab";
import DriverBottomNav from "@/pages/driver/DriverBottomNav";

type TabType = "Home" | "students" | "map" | "profile";

const DriverDashboard = () => {
  const { user } = useAppStore();
  const [activeTab, setActiveTab] = useState<TabType>("Home");
  const [pickups, setPickups] = useState<StudentPickup[]>([]);
  const [tripStatus, setTripStatus] = useState<"idle" | "running" | "paused" | "ended">("idle");
  const [seconds, setSeconds] = useState(0);
  const [watchId, setWatchId] = useState<number | null>(null);
  const { token } = useAppStore();

  const startTrip = () => {
    if (navigator.geolocation) {
      setTripStatus("running");
      const id = navigator.geolocation.watchPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          if (token && driverProfile.busNumber) {
            fetch('/api/bus/driver/location/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
              },
              body: JSON.stringify({
                latitude,
                longitude,
                bus_number: driverProfile.busNumber
              })
            }).catch(e => console.error("Location update failed:", e));
          }
        },
        (error) => console.error("Error getting location", error),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
      );
      setWatchId(id);
    } else {
      alert("Geolocation is not supported by this browser.");
    }
  };

  const endTrip = () => {
    if (watchId !== null) {
      navigator.geolocation.clearWatch(watchId);
      setWatchId(null);
    }
    setTripStatus("ended");
    setSeconds(0); // Optional: reset timer or keep it for review
  };

  useEffect(() => {
    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [watchId]);

  useEffect(() => {
    let cancelled = false;
    import("@/lib/apiClient").then(m => m.fetchDriverStudents())
      .then(data => {
        if (!cancelled && data.length > 0) {
          setPickups(data.map(s => ({
            id: String(s.id),
            name: s.name,
            avatar: `https://i.pravatar.cc/150?u=${encodeURIComponent(s.email)}`,
            pickupPoint: s.pickup_point,
            status: s.status as any
          })));
        }
      })
      .catch((e) => console.error("Driver students fetch fail:", e));
    return () => { cancelled = true; };
  }, []);

  const driverProfile = mockDrivers.find((d) => d.email === user?.email) || {
    id: "0",
    name: user?.name || "Driver",
    email: user?.email || "",
    phone: "",
    license: "—",
    busNumber: user?.assignedBus || "BUS-01",
    avatar: user?.avatar || "https://i.pravatar.cc/150?img=12"
  };

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    if (tripStatus === "running") { interval = setInterval(() => setSeconds((prev) => prev + 1), 1000); }
    return () => { if (interval) clearInterval(interval); };
  }, [tripStatus]);

  const confirmBoarding = (id: string) => setPickups((prev) => prev.map((s) => (s.id === id ? { ...s, status: "boarded" as const } : s)));
  const markAbsent = (id: string) => setPickups((prev) => prev.map((s) => (s.id === id ? { ...s, status: "absent" as const } : s)));

  const boarded = pickups.filter((p) => p.status === "boarded").length;
  const absent = pickups.filter((p) => p.status === "absent").length;
  const waiting = pickups.filter((p) => p.status === "waiting").length;

  return (
    <div className="h-screen flex flex-col bg-background">
      <DriverHeader profile={driverProfile} />
      <div className="flex-1 p-4 space-y-4 overflow-y-auto">
        {activeTab === "Home" && (
          <DriverHomeTab 
            tripStatus={tripStatus}  
            seconds={seconds} 
            boarded={boarded} 
            waiting={waiting} 
            absent={absent} 
            startTrip={startTrip}
            endTrip={endTrip}
          />
        )}
        {activeTab === "students" && (
          <DriverStudentsTab pickups={pickups} boarded={boarded} waiting={waiting} absent={absent} confirmBoarding={confirmBoarding} markAbsent={markAbsent} />
        )}
        {activeTab === "map" && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="h-[calc(100vh-170px)]">
            <DriverMap busId={driverProfile.busNumber} fullScreen />
          </motion.div>
        )}
        {activeTab === "profile" && <DriverProfileTab profile={driverProfile} />}
      </div>
      <DriverBottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
};

export default DriverDashboard;
