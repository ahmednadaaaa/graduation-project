import axios, { type AxiosError } from "axios";

/** Base path includes `api` — proxied to Django in dev (see vite.config). */
export const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  timeout: 30000,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (res) => res,
  (err: AxiosError) => {
    const isAuthEndpoint = err.config?.url?.includes("/users/login/") || err.config?.url?.includes("/users/register/");
    if (err.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem("token");
      localStorage.removeItem("refresh");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  },
);

export type JwtLoginResponse = {
  access: string;
  refresh: string;
};

export type ProfileResponse = {
  id: number;
  email: string;
  full_name: string;
  phone: string | null;
  role: string;
  date_joined: string;
  profile_picture: string | null;
  assigned_bus: string | null;
};

export type StudentProfileResponse = {
  id: number;
  full_name: string;
  email: string;
  profile_picture: string | null;
  university_id: string;
  faculty: string;
  department: string;
  academic_year: number;
  home_latitude: string | null;
  home_longitude: string | null;
  home_address: string | null;
  assigned_bus: string | null;
  is_face_registered: boolean;
  face_images_count: number;
  has_enough_face_images: boolean;
};

export async function loginWithPassword(
  email: string,
  password: string,
): Promise<JwtLoginResponse> {
  const { data } = await apiClient.post<JwtLoginResponse>("/users/login/", {
    email,
    password,
  });
  return data;
}

export async function fetchProfile(): Promise<ProfileResponse> {
  const { data } = await apiClient.get<ProfileResponse>("/users/profile/");
  return data;
}

export async function uploadProfilePicture(file: File): Promise<{ profile_picture: string }> {
  const fd = new FormData();
  fd.append("profile_picture", file);
  const { data } = await apiClient.put<{ profile_picture: string }>("/users/profile/", fd);
  return data;
}

export async function updateUserProfile(payload: Partial<{
  full_name: string;
  phone: string;
}>): Promise<ProfileResponse> {
  const { data } = await apiClient.put<ProfileResponse>("/users/profile/", payload);
  return data;
}

export async function fetchFullStudentProfile(): Promise<StudentProfileResponse> {
  const { data } = await apiClient.get<StudentProfileResponse>("/students/profile/");
  return data;
}

export async function registerUser(payload: {
  email: string;
  password: string;
  full_name: string;
  role: string;
  phone?: string;
  academic_year?: number;
}): Promise<void> {
  await apiClient.post("/users/register/", payload);
}

export async function createStudentProfile(payload: {
  university_id: string;
  faculty: string;
  department: string;
  academic_year: number;
}): Promise<void> {
  await apiClient.post("/students/profile/", payload);
}

export async function updateStudentProfile(payload: Partial<{
  university_id: string;
  faculty: string;
  department: string;
  academic_year: number;
  home_latitude: number;
  home_longitude: number;
  home_address: string;
  assigned_bus: string;
}>): Promise<void> {
  await apiClient.put("/students/profile/", payload);
}

export async function uploadFaceImage(
  blob: Blob,
  filename: string,
  label?: string,
): Promise<void> {
  const fd = new FormData();
  fd.append("image", blob, filename);
  if (label) fd.append("label", label);
  await apiClient.post("/students/face-images/", fd);
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const parts = dataUrl.split(",");
  const mime = parts[0].match(/:(.*?);/)?.[1] || "image/jpeg";
  const bstr = atob(parts[1] || "");
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

export type DashboardStats = {
  total_students: number;
  total_buses: number;
  total_drivers: number;
  active_buses: number;
  today_present: number;
  today_absent: number;
  today_scans: number;
  registered_faces: number;
};

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const { data } = await apiClient.get<DashboardStats>("/dashboard/stats/");
  return data;
}

export type ApiStudentRow = {
  id: number;
  full_name: string;
  email: string;
  phone: string | null;
  university_id: string;
  faculty: string;
  department: string;
  academic_year: number;
  assigned_bus: string | null;
  home_latitude: string | null;
  home_longitude: string | null;
  home_address: string | null;
  is_face_registered: boolean;
  is_active: boolean;
  profile_picture: string | null;
};

export async function fetchDashboardStudents(): Promise<ApiStudentRow[]> {
  const { data } = await apiClient.get<{ students: ApiStudentRow[] }>(
    "/dashboard/students/",
  );
  return data.students ?? [];
}

export async function deleteDashboardStudent(id: number): Promise<void> {
  await apiClient.delete(`/dashboard/students/${id}/`);
}

export type ApiBusRow = {
  id: number;
  bus_number: string;
  plate_number: string;
  capacity: number;
  status: string;
  is_active: boolean;
  driver_name: string;
  route_name: string | null;
  current_location?: {
    latitude: number;
    longitude: number;
    speed_kmh: number | null;
    heading: number | null;
    timestamp: string;
  };
};

export async function fetchBusByNumber(busNumber: string): Promise<ApiBusRow> {
  const { data } = await apiClient.get<ApiBusRow>(`/bus/${busNumber}/`);
  return data;
}

export async function fetchDashboardBuses(): Promise<ApiBusRow[]> {
  const { data } = await apiClient.get<{ buses: ApiBusRow[] }>(
    "/dashboard/buses/",
  );
  return data.buses ?? [];
}

export async function createDashboardBus(payload: {
  bus_number: string;
  plate_number: string;
  capacity: number;
}): Promise<void> {
  await apiClient.post("/dashboard/buses/", payload);
}

export type ApiRouteRow = {
  id: number;
  name: string;
  description: string | null;
  is_active: boolean;
  stops: { id: number; name: string }[];
  buses_count: number;
};

export async function fetchBusRoutes(): Promise<ApiRouteRow[]> {
  const { data } = await apiClient.get<ApiRouteRow[]>("/bus/routes/");
  return Array.isArray(data) ? data : [];
}

export async function createBusRoute(payload: any): Promise<ApiRouteRow> {
  const { data } = await apiClient.post<ApiRouteRow>("/bus/routes/", payload);
  return data;
}

export async function updateBusRoute(id: number, payload: any): Promise<ApiRouteRow> {
  const { data } = await apiClient.patch<ApiRouteRow>(`/bus/routes/${id}/`, payload);
  return data;
}

export async function deleteBusRoute(id: number): Promise<void> {
  await apiClient.delete(`/bus/routes/${id}/`);
}

export async function fetchRouteDetails(routeId: number): Promise<ApiRouteRow> {
  const { data } = await apiClient.get<ApiRouteRow>(`/bus/routes/${routeId}/`);
  return data;
}

export type ApiDriverRow = {
  id: number;
  full_name: string;
  email: string;
  phone: string;
  is_active: boolean;
  assigned_bus: string | null;
  license_number?: string;
  license_expiry?: string;
  profile_picture?: string | null;
};

export async function fetchDashboardDrivers(): Promise<ApiDriverRow[]> {
  const { data } = await apiClient.get<{ drivers: ApiDriverRow[] }>(
    "/dashboard/drivers/",
  );
  return data.drivers ?? [];
}

export type ApiAttendanceLog = {
  id: number;
  student_name: string;
  university_id: string | null;
  bus_number: string;
  action: string;
  timestamp: string;
  status: string;
  boarding_time: string | null;
};

export async function fetchAttendanceLogs(): Promise<ApiAttendanceLog[]> {
  const { data } = await apiClient.get<ApiAttendanceLog[]>(
    "/dashboard/attendance/logs/",
  );
  return data ?? [];
}

export async function fetchStudentAttendance(): Promise<any[]> {
  const { data } = await apiClient.get<any[]>("/students/attendance/history/");
  return data ?? [];
}

export async function fetchDriverStudents(): Promise<any[]> {
  const { data } = await apiClient.get<any[]>("/bus/my-students/");
  return data ?? [];
}

export type ApiPendingUser = {
  id: number;
  email: string;
  full_name: string;
  role: string;
  date_joined: string;
  phone?: string;
};

export async function fetchPendingUsers(): Promise<ApiPendingUser[]> {
  const { data } = await apiClient.get<ApiPendingUser[]>("/users/admin/pending/");
  return data ?? [];
}

export async function approveUser(userId: number): Promise<void> {
  await apiClient.post(`/users/admin/approve/${userId}/`);
}

export async function rejectUser(userId: number, reason: string = ""): Promise<void> {
  await apiClient.post(`/users/admin/reject/${userId}/`, { reason });
}

export type AiStudent = {
  id: number;
  name: string;
  lat: number;
  lon: number;
};

export type AiRouteOptimizationResponse = {
  total_distance_km: number;
  total_time_minutes: number;
  stops: {
    student_id: number;
    student_name: string;
    lat: number;
    lon: number;
    distance_from_prev_km: number;
    accumulated_time_mins: number;
  }[];
};

export async function optimizeRoute(
  startLat: number,
  startLon: number,
  students: AiStudent[]
): Promise<AiRouteOptimizationResponse> {
  const { data } = await apiClient.post<AiRouteOptimizationResponse>("/ai/optimize-route/", {
    start_lat: startLat,
    start_lon: startLon,
    students,
  });
  return data;
}
