import { ReactNode } from "react";
import { Moon, Sun, Search } from "lucide-react";
import { useAppStore } from "@/store/useAppStore";
import NotificationPanel from "@/components/notifications/NotificationPanel";
import AppSidebar from "@/components/layout/AppSidebar";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

const AppLayout = ({ children, title }: AppLayoutProps) => {
  const { isDark, toggleTheme, user } = useAppStore();

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 shrink-0 border-b border-border/50 glass-card-strong flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-3">
            {title && <h1 className="text-lg font-semibold">{title}</h1>}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 hover:bg-secondary transition-colors"
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <NotificationPanel />
            <div className="flex items-center gap-2 ml-2 pl-2 border-l border-border/50">
              {user?.avatar ? (
                <img src={user.avatar} alt={user.name} className="h-8 w-8 rounded-full object-cover border border-primary/20" />
              ) : (
                <div className="h-8 w-8 rounded-full gradient-primary flex items-center justify-center text-xs text-primary-foreground font-bold">
                  {user?.name?.charAt(0) || "A"}
                </div>
              )}
            </div>
          </div>
        </header>
        {/* Content — scrolls independently, sidebar stays fixed */}
        <main className="flex-1 p-4 md:p-6 overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </div>
    </div>
  );
};

export default AppLayout;
