import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Bus, Users, AlertTriangle, Clock } from "lucide-react";
import AppLayout from "@/components/layout/AppLayout";
import KPICard from "@/components/dashboard/KPICard";
import MapView from "@/components/map/MapView";
import AttendanceTable from "@/components/dashboard/AttendanceTable";
import AnalyticsCharts from "@/components/dashboard/AnalyticsCharts";
import { useAppStore } from "@/store/useAppStore";
import wsService from "@/services/websocket";
import type { BusLocation, Notification } from "@/utils/data";
import {
  fetchDashboardStats,
  type DashboardStats,
} from "@/lib/apiClient";

import LiveMapTab from "./LiveMapPage";
import AttendanceTab from "./AttendancePage";
import AnalyticsTab from "./AnalyticsPage";
import BusesTab from "./BusesPage";
import DriversTab from "./DriversPage";
import RoutesTab from "./RoutesPage";
import StudentsTab from "./StudentsPage";
import ApprovalsTab from "./ApprovalsPage";
import AIRoutingTab from "./AIRoutingPage";

export type AdminTab =
  | "dashboard"
  | "map"
  | "attendance"
  | "analytics"
  | "buses"
  | "drivers"
  | "routes"
  | "students"
  | "approvals"
  | "ai_routing";

const TAB_TITLES: Record<AdminTab, string> = {
  dashboard:  "Dashboard",
  map:        "Live Tracking Map",
  attendance: "Attendance Records",
  analytics:  "Analytics & Reports",
  buses:      "Fleet Management",
  drivers:    "Driver Management",
  routes:     "Route Management",
  students:   "Student Directory",
  approvals:  "Account Approvals",
  ai_routing: "AI Route Optimizer",
};

// ─── Dashboard home ───────────────────────────────────────────────────────────
const AdminHome = () => {
  const { busLocations, setBusLocations, updateBusLocation, addNotification, notifications } =
    useAppStore();
  const [apiStats, setApiStats] = useState<DashboardStats | null>(null);
  const [attendanceLogs, setAttendanceLogs] = useState<any[]>([]);

  useEffect(() => {
    // wsService.connect(); // Disabled failing global /ws
    const handler = (data: BusLocation | Notification) => {
      if ("busId" in data) updateBusLocation(data as BusLocation);
    };
    wsService.subscribe("bus-location", handler);
    return () => {
      wsService.unsubscribe("bus-location", handler);
    };
  }, [updateBusLocation]);

  useEffect(() => {
    let cancelled = false;
    
    // Stats
    fetchDashboardStats()
      .then((s) => {
        if (!cancelled) setApiStats(s);
      })
      .catch(() => {
        if (!cancelled) setApiStats(null);
      });

    // Attendance Logs
    import("@/lib/apiClient").then(m => m.fetchAttendanceLogs())
      .then(logs => {
        if (!cancelled) setAttendanceLogs(logs);
      })
      .catch(() => {
        if (!cancelled) setAttendanceLogs([]);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const activeBuses = apiStats?.active_buses ?? busLocations.filter((b) => b.status !== "idle").length;
  const todayPresent = apiStats?.today_present ?? 0;
  const todayAbsent = apiStats?.today_absent ?? 0;
  const todayScans = apiStats?.today_scans ?? 0;
  const totalStudents = apiStats?.total_students ?? 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard title="Active buses" value={activeBuses} icon={Bus} variant="primary" trend={apiStats ? `${apiStats.total_buses} buses in fleet` : "Live map data"} />
        <KPICard title="Present today" value={todayPresent} icon={Users} variant="success" trend={apiStats ? `${totalStudents} students total` : "From UniTrack backend"} />
        <KPICard title="Absent today" value={todayAbsent} icon={Clock} variant="warning" trend="Daily attendance" />
        <KPICard title="Scans today" value={todayScans} icon={AlertTriangle} variant="destructive" trend={apiStats ? `${apiStats.registered_faces} faces enrolled` : "Face scan logs"} />
      </div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
        <h2 className="text-lg font-semibold mb-3">Live Tracking</h2>
        <MapView buses={busLocations} />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
        <h2 className="text-lg font-semibold mb-3">Analytics</h2>
        <AnalyticsCharts />
      </motion.div>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
        <AttendanceTable records={attendanceLogs} />
      </motion.div>
    </div>
  );
};

// ─── Shell ────────────────────────────────────────────────────────────────────
const AdminDashboard = () => {
  const activeTab = useAppStore((s) => s._activeAdminTab as AdminTab);

  return (
    <AppLayout title={TAB_TITLES[activeTab] ?? "Dashboard"}>
      {activeTab === "dashboard"  && <AdminHome />}
      {activeTab === "map"        && <LiveMapTab    asTab />}
      {activeTab === "attendance" && <AttendanceTab  asTab />}
      {activeTab === "analytics"  && <AnalyticsTab   asTab />}
      {activeTab === "buses"      && <BusesTab        asTab />}
      {activeTab === "drivers"    && <DriversTab      asTab />}
      {activeTab === "routes"     && <RoutesTab       asTab />}
      {activeTab === "students"   && <StudentsTab     asTab />}
      {activeTab === "approvals"  && <ApprovalsTab    asTab />}
      {activeTab === "ai_routing" && <AIRoutingTab    asTab />}
    </AppLayout>
  );
};

export default AdminDashboard;
