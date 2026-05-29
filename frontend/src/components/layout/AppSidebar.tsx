import { motion, AnimatePresence } from "framer-motion";
import {
  LayoutDashboard, Map, Users, Bus,
  LogOut, ChevronLeft, ChevronRight,
  BarChart3, Route, ClipboardList,
} from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import type { AdminTab } from "@/pages/admin/AdminDashboard";

const adminLinks: { tab: AdminTab; label: string; icon: React.ElementType }[] = [
  { tab: "dashboard",  label: "Dashboard",  icon: LayoutDashboard },
  { tab: "map",        label: "Live Map",   icon: Map },
  { tab: "attendance", label: "Attendance", icon: ClipboardList },
  { tab: "analytics",  label: "Analytics",  icon: BarChart3 },
  { tab: "buses",      label: "Buses",      icon: Bus },
  { tab: "drivers",    label: "Drivers",    icon: Users },
  { tab: "routes",     label: "Routes",     icon: Route },
  { tab: "students",   label: "Students",   icon: Users },
  { tab: "approvals",  label: "Approvals",  icon: Users },
  { tab: "ai_routing", label: "AI Routing", icon: Map },
];

const AppSidebar = () => {
  const { sidebarOpen, setSidebarOpen, user, logout, navigateAdminTab, _activeAdminTab } =
    useAppStore();

  if (!user) return null;

  const isAdmin = user.role === "admin";
  const activeAdminTab = _activeAdminTab as AdminTab;

  return (
    <motion.aside
      animate={{ width: sidebarOpen ? 240 : 64 }}
      transition={{ duration: 0.2 }}
      className="h-full sticky top-0 glass-card-strong border-r border-border/50 flex flex-col z-30 shrink-0"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-border/50">
        <div className="h-8 w-8 rounded-lg gradient-primary flex items-center justify-center shrink-0">
          <Bus className="h-4 w-4 text-primary-foreground" />
        </div>
        <AnimatePresence>
          {sidebarOpen && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="font-bold text-sm whitespace-nowrap"
            >
              BusTrack Pro
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Nav */}
      <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
        {isAdmin &&
          adminLinks.map((link) => {
            const isActive = activeAdminTab === link.tab;
            return (
              <button
                key={link.tab}
                onClick={() => navigateAdminTab(link.tab)}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all w-full text-left ${
                  isActive
                    ? "bg-primary/10 text-primary font-medium"
                    : "text-muted-foreground hover:bg-secondary hover:text-foreground"
                }`}
              >
                <link.icon className="h-4 w-4 shrink-0" />
                <AnimatePresence>
                  {sidebarOpen && (
                    <motion.span
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="whitespace-nowrap"
                    >
                      {link.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            );
          })}
      </nav>

      {/* Footer */}
      <div className="p-2 border-t border-border/50 space-y-1">
        <button
          onClick={logout}
          className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-muted-foreground hover:bg-secondary hover:text-foreground w-full transition-colors"
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {sidebarOpen && <span>Logout</span>}
        </button>
      </div>

      {/* Toggle */}
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="absolute -right-3 top-20 h-6 w-6 rounded-full bg-card border border-border flex items-center justify-center hover:bg-secondary transition-colors z-50"
      >
        {sidebarOpen ? <ChevronLeft className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
    </motion.aside>
  );
};

export default AppSidebar;
