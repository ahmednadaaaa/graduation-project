import { Bus, Sun, Moon } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import type { DriverProfile } from "@/utils/data";

const DriverHeader = ({ profile }: { profile: DriverProfile }) => {
  const { logout, toggleTheme, isDark } = useAppStore();
  return (
    <header className="glass-card-strong border-b border-border/50 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
      <div className="flex items-center gap-3">
        <img src={profile.avatar} alt={profile.name} className="h-10 w-10 rounded-xl object-cover" />
        <div>
          <p className="font-bold text-sm">{profile.busNumber} • Route Alpha</p>
          <p className="text-xs text-muted-foreground">{profile.name} • Driver</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button onClick={toggleTheme} className="rounded-lg p-2 hover:bg-secondary transition-colors">
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
        <NotificationPanel />
        <button onClick={logout} className="text-xs text-muted-foreground hover:text-foreground px-3 py-1.5 border border-border rounded-lg">
          Logout
        </button>
      </div>
    </header>
  );
};

export default DriverHeader;
