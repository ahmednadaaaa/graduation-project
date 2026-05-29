import { Bus, Users, Map, User } from "lucide-react";

type TabType = "Home" | "students" | "map" | "profile";

const DriverBottomNav = ({ activeTab, setActiveTab }: { activeTab: TabType; setActiveTab: (t: TabType) => void }) => {
  const tabs = [
    { id: "Home" as const, icon: Bus, label: "Home" },
    { id: "students" as const, icon: Users, label: "Students" },
    { id: "map" as const, icon: Map, label: "Map" },
    { id: "profile" as const, icon: User, label: "Profile" },
  ];

  return (
    <nav className="glass-card-strong border-t border-border/50 flex">
      {tabs.map((tab) => (
        <button key={tab.id} onClick={() => setActiveTab(tab.id)} className={`flex-1 flex flex-col items-center py-3 text-xs transition-colors ${activeTab === tab.id ? "text-primary" : "text-muted-foreground"}`}>
          <tab.icon className="h-5 w-5 mb-1" />
          {tab.label}
        </button>
      ))}
    </nav>
  );
};

export default DriverBottomNav;
