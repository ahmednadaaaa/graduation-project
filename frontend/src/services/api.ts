import { apiClient } from "@/lib/apiClient";

const api = apiClient;

export const locationApi = {
  update: (
    data: {
      bus_number: string;
      latitude: number;
      longitude: number;
      speed_kmh?: number;
      heading?: number;
    },
    timeout?: number,
  ) => api.post("/bus/location/update/", data, timeout ? { timeout } : {}),
};

export const attendanceApi = {
  record: (
    data: { studentId: string; busId: string; status: string },
    timeout?: number,
  ) => api.post("/attendance/record", data, timeout ? { timeout } : {}),
  getHistory: (
    params?: { date?: string; busId?: string },
    timeout?: number,
  ) =>
    api.get("/attendance/history", {
      params,
      ...(timeout ? { timeout } : {}),
    }),
};

export const notificationApi = {
  getAll: (timeout?: number) =>
    api.get("/notifications", timeout ? { timeout } : {}),
  markRead: (id: string) => api.put(`/notifications/${id}/read`),
};

export const routeApi = {
  optimize: (routeId: string, timeout?: number) =>
    api.post(`/optimizer/route/${routeId}`, {}, timeout ? { timeout } : {}),
  getAll: (timeout?: number) =>
    api.get("/bus/routes/all/", timeout ? { timeout } : {}),
};

export default api;
