import { create } from "zustand";
import type { User, BusLocation, Notification } from "@/utils/data";
import type { AdminTab } from "@/pages/admin/AdminDashboard";

interface AppState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  login: (user: User, token: string) => void;
  logout: () => void;
  isDark: boolean;
  toggleTheme: () => void;
  busLocations: BusLocation[];
  setBusLocations: (locations: BusLocation[]) => void;
  updateBusLocation: (location: BusLocation) => void;
  notifications: Notification[];
  addNotification: (notification: Notification) => void;
  markNotificationRead: (id: string) => void;
  unreadCount: () => number;
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
  // Admin tab system
  _activeAdminTab: AdminTab;
  navigateAdminTab: (tab: AdminTab) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: (() => { try { const u = localStorage.getItem("user"); return u ? JSON.parse(u) : null; } catch { return null; } })(),
  token: localStorage.getItem("token"),
  isAuthenticated: !!localStorage.getItem("token"),
  login: (user, token) => {
    localStorage.setItem("token", token);
    localStorage.setItem("user", JSON.stringify(user));
    set({ user, token, isAuthenticated: true });
  },
  logout: () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    set({ user: null, token: null, isAuthenticated: false });
  },
  isDark: true,
  toggleTheme: () => set((state) => ({ isDark: !state.isDark })),
  busLocations: [],
  setBusLocations: (locations) => set({ busLocations: locations }),
  updateBusLocation: (location) =>
    set((state) => ({
      busLocations: state.busLocations.map((b) =>
        b.busId === location.busId ? location : b
      ),
    })),
  notifications: [],
  addNotification: (notification) =>
    set((state) => ({ notifications: [notification, ...state.notifications] })),
  markNotificationRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      ),
    })),
  unreadCount: () => get().notifications.filter((n) => !n.read).length,
  sidebarOpen: true,
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  // Admin tab system — single source of truth, survives reload via Zustand store
  _activeAdminTab: "dashboard",
  navigateAdminTab: (tab) => set({ _activeAdminTab: tab }),
}));
