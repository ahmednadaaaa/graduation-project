// ╔══════════════════════════════════════════════════════════════════════════╗
// ║                        BusTrack Pro — Mock Data                         ║
// ║  Single source of truth for all app data.                               ║
// ║  Replaces: mockData.ts + mapData.ts                                     ║
// ╚══════════════════════════════════════════════════════════════════════════╝
//
// GPS reference — Kafr El Sheikh University area:
//   University main gate (Sakha Rd):  31.0994, 30.9475
//   Al Geish St (main N-S artery):    lng ≈ 30.9408
//   City center:                      31.1114, 30.9479
//   University Hospital (El Gish St): 31.1007, 30.9508


// ════════════════════════════════════════════════════════════════════════════
// 1. TYPES
// ════════════════════════════════════════════════════════════════════════════

export type UserRole = "admin" | "student" | "driver";

// ── Auth ──────────────────────────────────────────────────────────────────
export interface AuthUser {
  id: string;
  name: string;
  email: string;
  password: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  parentPhone?: string;
  grade?: string;
  facePhotos: string[];
}

// ── Profiles (used inside dashboards) ────────────────────────────────────
export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  avatar?: string;
  assignedBus?: string | null;
};

export interface DriverProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  license: string;
  busNumber: string;
  avatar: string;
}

export interface StudentProfile {
  id: string;
  name: string;
  email: string;
  phone: string;
  grade: string;
  avatar: string;
  parentPhone?: string;
}

// ── Admin table types ─────────────────────────────────────────────────────
export interface AdminStudent {
  id: string;
  name: string;
  grade: string;
  bus: string;          // bus number e.g. "SB-101"
  stop: string;         // pickup stop name
  status: "active" | "inactive";
  email: string;
  phone: string;
  parentPhone?: string;
  route?: string;
  pickupPoint?: string;
  avatar?: string | null;
};

export interface AdminDriver {
  id: string;
  name: string;
  phone: string;
  licenseNumber: string;
  licenseExpiry: string;
  assignedBus: string;
  status: "active" | "inactive";
  availability: "available" | "on-duty" | "off-duty";
  avatar?: string;
}

export interface AdminBus {
  id: string;
  busNumber: string;
  capacity: number;
  plateNumber: string;
  assignedDriver: string;
  route: string;
  status: "active" | "maintenance" | "inactive";
}

export interface AdminRoute {
  id: string;
  name: string;
  assignedBus: string;
  stops: string[];
  status: "active" | "inactive";
}

// ── Map types ─────────────────────────────────────────────────────────────
export interface KafLocation {
  name: string;
  lat: number;
  lng: number;
}

export interface MapStudent {
  id: string;
  name: string;
  lat: number;
  lng: number;
  avatar: string;
  assignedBusId: string | null;
  locationName?: string;
}

export interface MapBus {
  id: string;
  number: string;
  color: string;
  colorHex: string;
  driverName: string;
  waypoints: [number, number][];
  route: [number, number][];
  startLat: number;
  startLng: number;
  capacity: number;
  speed: number;
}

// ── Live tracking ─────────────────────────────────────────────────────────
export interface BusLocation {
  busId: string;
  busNumber: string;
  lat: number;
  lng: number;
  destinationLat: number;
  destinationLng: number;
  speed: number;
  heading: number;
  occupancy: number;
  capacity: number;
  status: "on-route" | "approaching" | "arrived" | "idle" | "delayed";
  routeName: string;
  nextStop: string;
  eta: number;
  driverName: string;
  lastUpdated: string;
}

export interface AvailableRoute {
  id: string;
  routeName: string;
  busNumber: string;
  driverName: string;
  stops: string[];
  estimatedPickupTime: string;
  status: "active" | "inactive";
  eta: number;
  occupancy: number;
  capacity: number;
}

// ── Records ───────────────────────────────────────────────────────────────
export interface AttendanceRecord {
  id: string;
  studentName: string;
  busNumber: string;
  date: string;
  boardingTime: string;
  status: "present" | "absent" | "late";
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "info" | "warning" | "success" | "error";
  timestamp: string;
  read: boolean;
}

export interface RouteStop {
  id: string;
  name: string;
  lat: number;
  lng: number;
  eta: string;
  status: "completed" | "current" | "upcoming";
  studentsCount: number;
}

export interface StudentPickup {
  id: string;
  name: string;
  stop: string;
  status: "waiting" | "boarded" | "absent";
  avatar?: string;
  phone?: string;
}


// ════════════════════════════════════════════════════════════════════════════
// 2. USERS & AUTH
// ════════════════════════════════════════════════════════════════════════════

export const mockAuthUsers: AuthUser[] = [
  // ── Admin ────────────────────────────────────────────────────────────────
  { id: "user-admin", name: "Admin User",    email: "admin@bustrack.io",   password: "Admin@2026",   role: "admin",   avatar: "https://i.pravatar.cc/150?img=3",  phone: "01000000000" , facePhotos: []},
  // ── Drivers ──────────────────────────────────────────────────────────────
  { id: "driver-1",   name: "Ahmad Khaled", email: "driver@bustrack.io",  password: "Driver@2026",  role: "driver",  avatar: "https://i.pravatar.cc/150?img=12", phone: "01012345678", facePhotos: [] },
  { id: "driver-2",   name: "Sara Mostafa", email: "sara.m@bustrack.io",  password: "Sara@2026",    role: "driver",  avatar: "https://i.pravatar.cc/150?img=32", phone: "01098765432", facePhotos: [] },
  { id: "driver-3",   name: "Omar Ramadan", email: "omar.r@bustrack.io",  password: "Omar@2026",    role: "driver",  avatar: "https://i.pravatar.cc/150?img=53", phone: "01055667788", facePhotos: [] },
  // ── Students ─────────────────────────────────────────────────────────────
  { id: "student-1",  name: "Maya Johnson", email: "student@bustrack.io", password: "Student@2026", role: "student", avatar: "https://i.pravatar.cc/150?img=48", phone: "01011112222", parentPhone: "01011110000", grade: "Grade 10", facePhotos: [] },
  { id: "student-2",  name: "Ali Hassan",   email: "ali.h@bustrack.io",   password: "Ali@2026",     role: "student", avatar: "https://i.pravatar.cc/150?img=68", phone: "01022223333", parentPhone: "01022220000", grade: "Grade 9", facePhotos: [] },
  { id: "student-3",  name: "Emma Davis",   email: "emma.d@bustrack.io",  password: "Emma@2026",    role: "student", avatar: "https://i.pravatar.cc/150?img=45", phone: "01033334444", parentPhone: "01033330000", grade: "Grade 11", facePhotos: [] },
  { id: "student-4",  name: "Noah Smith",   email: "noah.s@bustrack.io",  password: "Noah@2026",    role: "student", avatar: "https://i.pravatar.cc/150?img=59", phone: "01044445555", parentPhone: "01044440000", grade: "Grade 8", facePhotos: [] },
];

// ════════════════════════════════════════════════════════════════════════════
// 3. DRIVER PROFILES  (derived from authUsers — no duplication)
// ════════════════════════════════════════════════════════════════════════════

export const mockDrivers: DriverProfile[] = [];

// ════════════════════════════════════════════════════════════════════════════
// 4. STUDENT PROFILES  (full data — single definition)
// ════════════════════════════════════════════════════════════════════════════

export const mockStudents: StudentProfile[] = [];

// ════════════════════════════════════════════════════════════════════════════
// 5. MAP DATA  (buses, students with GPS coords)
// ════════════════════════════════════════════════════════════════════════════

export const UNIVERSITY: KafLocation = { name: "Kafr El Sheikh University", lat: 31.0994, lng: 30.9475 };

export const KAFR_LOCATIONS: KafLocation[] = [
  { name: "Kafr El Sheikh University", lat: 31.0994, lng: 30.9475 },
  { name: "University Main Gate",      lat: 31.1000, lng: 30.9470 },
  { name: "Al Geish St North",         lat: 31.1148, lng: 30.9408 },
  { name: "Al Geish St Central",       lat: 31.1060, lng: 30.9408 },
  { name: "University Hospital",       lat: 31.1007, lng: 30.9508 },
  { name: "Gen. Gamal Hamad St",       lat: 31.1068, lng: 30.9368 },
  { name: "Al Ustad St",               lat: 31.1145, lng: 30.9479 },
  { name: "West District",             lat: 31.1095, lng: 30.9295 },
  { name: "Al Mahkama St",             lat: 31.1007, lng: 30.9408 },
];

export const STUDENT_PICKUP_LOCATIONS: KafLocation[] = KAFR_LOCATIONS.slice(1);

// Map students — same people as mockStudents but with GPS coords
// id uses "st-X" prefix to distinguish map markers from profile ids
export const MOCK_STUDENTS: MapStudent[] = [
  { id: "st-1", name: "Maya Johnson", lat: 31.1095, lng: 30.9450, avatar: "https://i.pravatar.cc/150?img=48", assignedBusId: "bus-1", locationName: "Al Ustad St North"        },
  { id: "st-2", name: "Ali Hassan",   lat: 31.1030, lng: 30.9408, avatar: "https://i.pravatar.cc/150?img=68", assignedBusId: "bus-2", locationName: "Al Geish St - City Center" },
  { id: "st-3", name: "Emma Davis",   lat: 31.1120, lng: 30.9408, avatar: "https://i.pravatar.cc/150?img=45", assignedBusId: "bus-2", locationName: "Al Geish St North"        },
  { id: "st-4", name: "Noah Smith",   lat: 31.1080, lng: 30.9355, avatar: "https://i.pravatar.cc/150?img=59", assignedBusId: "bus-3", locationName: "West of Al Geish St"      },
];

// Helper: get full StudentProfile for a MapStudent (match by name)
export const getStudentProfile = (mapStudent: MapStudent): StudentProfile | undefined =>
  mockStudents.find((s) => s.name.toLowerCase() === mapStudent.name.toLowerCase());

export const MOCK_BUSES: MapBus[] = [];

// ════════════════════════════════════════════════════════════════════════════
// 6. ADMIN TABLE DATA
// ════════════════════════════════════════════════════════════════════════════

export const mockAdminStudents: AdminStudent[] = [
  { id: "s1", name: "Maya Johnson", grade: "Grade 10", bus: "SB-101", stop: "Al Ustad St North",         status: "active", email: "student@bustrack.io", phone: "01011112222", parentPhone: "01011110000" },
  { id: "s2", name: "Ali Hassan",   grade: "Grade 9",  bus: "SB-102", stop: "Al Geish St - City Center", status: "active", email: "ali.h@bustrack.io",   phone: "01022223333", parentPhone: "01022220000" },
  { id: "s3", name: "Emma Davis",   grade: "Grade 11", bus: "SB-102", stop: "Al Geish St North",         status: "active", email: "emma.d@bustrack.io",  phone: "01033334444", parentPhone: "01033330000" },
  { id: "s4", name: "Noah Smith",   grade: "Grade 8",  bus: "SB-103", stop: "West of Al Geish St",       status: "active", email: "noah.s@bustrack.io",  phone: "01044445555", parentPhone: "01044440000" },
  { id: "s5", name: "Lara Khalil",  grade: "Grade 10", bus: "SB-103", stop: "Gen. Gamal Hamad St",       status: "active", email: "lara.k@bustrack.io",  phone: "01055556666", parentPhone: "01055550000" },
  { id: "s6", name: "Zain Abou",    grade: "Grade 11", bus: "SB-104", stop: "Al Mahkama St",             status: "active", email: "zain.a@bustrack.io",  phone: "01066667777", parentPhone: "01066670000" },
];

export const mockAdminDrivers: AdminDriver[] = [
  { id: "d1", name: "Ahmad Khaled", phone: "01012345678", licenseNumber: "DRV-987654", licenseExpiry: "2026-12-10", assignedBus: "SB-101", status: "active", availability: "on-duty",  avatar: "https://i.pravatar.cc/150?img=12" },
  { id: "d2", name: "Sara Mostafa", phone: "01098765432", licenseNumber: "DRV-123456", licenseExpiry: "2026-05-22", assignedBus: "SB-102", status: "active", availability: "available", avatar: "https://i.pravatar.cc/150?img=32" },
  { id: "d3", name: "Omar Ramadan", phone: "01055667788", licenseNumber: "DRV-654321", licenseExpiry: "2025-11-15", assignedBus: "SB-103", status: "active", availability: "off-duty", avatar: "https://i.pravatar.cc/150?img=53" },
];

export const mockAdminBuses: AdminBus[] = [
  { id: "b1", busNumber: "SB-101", capacity: 35, plateNumber: "ABC-1234", assignedDriver: "Ahmad Khaled", route: "Route Alpha", status: "active"      },
  { id: "b2", busNumber: "SB-102", capacity: 30, plateNumber: "XYZ-5678", assignedDriver: "Sara Mostafa", route: "Route Beta",  status: "active"      },
  { id: "b3", busNumber: "SB-103", capacity: 40, plateNumber: "LMN-9012", assignedDriver: "Omar Ramadan", route: "Route Gamma", status: "maintenance" },
  { id: "b4", busNumber: "SB-104", capacity: 35, plateNumber: "QRS-3456", assignedDriver: "Lina H.",      route: "Route Delta", status: "active"      },
];

export const mockAdminRoutes: AdminRoute[] = [
  { id: "r1", name: "Route Alpha", assignedBus: "SB-101", stops: ["Al Ustad St", "Al Geish St North", "University Gate"],              status: "active"   },
  { id: "r2", name: "Route Beta",  assignedBus: "SB-102", stops: ["Al Geish St North", "Al Geish St Central", "University Gate"],     status: "active"   },
  { id: "r3", name: "Route Gamma", assignedBus: "SB-103", stops: ["West District", "Gen. Gamal Hamad St", "University Gate"],         status: "inactive" },
];

// ════════════════════════════════════════════════════════════════════════════
// 7. LIVE TRACKING & ROUTES
// ════════════════════════════════════════════════════════════════════════════

export const mockBusLocations: BusLocation[] = [];

export const mockAvailableRoutes: AvailableRoute[] = [
  { id: "route-1", routeName: "Route Alpha", busNumber: "SB-101", driverName: "Ahmad Khaled", stops: ["University Depot", "Al Geish St North", "Al Ustad St", "Al Mahkama St", "KFS University"], estimatedPickupTime: "07:15 AM", status: "active",   eta: 8,  occupancy: 28, capacity: 40 },
  { id: "route-2", routeName: "Route Beta",  busNumber: "SB-102", driverName: "Sara Mostafa", stops: ["University Depot", "Al Geish St North", "Al Geish St Central", "University Hospital", "KFS University"], estimatedPickupTime: "07:25 AM", status: "active",   eta: 3,  occupancy: 35, capacity: 40 },
  { id: "route-3", routeName: "Route Gamma", busNumber: "SB-103", driverName: "Omar Ramadan", stops: ["University Depot", "West District", "Gen. Gamal Hamad St", "Al Mahkama St", "KFS University"], estimatedPickupTime: "07:10 AM", status: "inactive", eta: 0,  occupancy: 0,  capacity: 40 },
  { id: "route-4", routeName: "Route Delta", busNumber: "SB-104", driverName: "Lina Hassan",  stops: ["University Depot", "Al Geish St Central", "University Hospital", "Sakha Rd", "KFS University"], estimatedPickupTime: "07:30 AM", status: "active",   eta: 12, occupancy: 22, capacity: 40 },
];

// ════════════════════════════════════════════════════════════════════════════
// 8. ATTENDANCE, NOTIFICATIONS, ROUTE STOPS, STUDENT PICKUPS
// ════════════════════════════════════════════════════════════════════════════

export const mockAttendance: AttendanceRecord[] = [];

export const mockNotifications: Notification[] = [];

export const mockRouteStops: RouteStop[] = [];

export const mockStudentPickups: StudentPickup[] = [];


// ════════════════════════════════════════════════════════════════════════════
// 9. MAP UTILITIES
// ════════════════════════════════════════════════════════════════════════════

function decodePolyline(encoded: string): [number, number][] {
  let index = 0, len = encoded.length;
  let lat = 0, lng = 0;
  const path: [number, number][] = [];
  while (index < len) {
    let b, shift = 0, result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lat += dlat;
    shift = 0;
    result = 0;
    do {
      b = encoded.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);
    const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
    lng += dlng;
    path.push([lat / 1e5, lng / 1e5]);
  }
  return path;
}

export interface RouteData {
  coordinates: [number, number][];
  distance: { text: string; value: number };
  duration: { text: string; value: number };
}

export async function fetchRoadRoute(waypoints: [number, number][]): Promise<RouteData> {
  const origin = `${waypoints[0][0]},${waypoints[0][1]}`;
  const destination = `${waypoints[waypoints.length - 1][0]},${waypoints[waypoints.length - 1][1]}`;
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

  if (!apiKey) {
    console.warn("Google Maps API Key missing, falling back to OSRM");
    const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`OSRM ${res.status}`);
    const json = await res.json();
    if (json.code !== "Ok" || !json.routes?.[0]) throw new Error("OSRM: no route");
    
    const route = json.routes[0];
    return {
      coordinates: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
      distance: { text: `${(route.distance / 1000).toFixed(1)} km`, value: route.distance },
      duration: { text: `${Math.round(route.duration / 60)} mins`, value: route.duration },
    };
  }

  try {
    const backendUrl = `${import.meta.env.VITE_API_URL || "/api"}/bus/directions/?origin=${origin}&destination=${destination}`;
    const res = await fetch(backendUrl, {
      headers: { Authorization: `Bearer ${localStorage.getItem("token")}` }
    });
    const json = await res.json();

    if (json.status !== "OK") {
      throw new Error(`Google Directions (Proxy) Error: ${json.status}`);
    }

    const route = json.routes[0];
    const leg = route.legs[0];
    
    return {
      coordinates: decodePolyline(route.overview_polyline.points),
      distance: { text: leg.distance.text, value: leg.distance.value },
      duration: { text: leg.duration.text, value: leg.duration.value },
    };
  } catch (error) {
    console.error("Google Directions failed, falling back to OSRM:", error);
    const coords = waypoints.map(([lat, lng]) => `${lng},${lat}`).join(";");
    const url = `https://router.project-osrm.org/route/v1/driving/${coords}?overview=full&geometries=geojson`;
    const res = await fetch(url);
    const json = await res.json();
    const route = json.routes[0];
    return {
      coordinates: route.geometry.coordinates.map(([lng, lat]: [number, number]) => [lat, lng] as [number, number]),
      distance: { text: `${(route.distance / 1000).toFixed(1)} km`, value: route.distance },
      duration: { text: `${Math.round(route.duration / 60)} mins`, value: route.duration },
    };
  }
}

export function calcDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function interpolateRoute(route: [number, number][], progress: number): [number, number] {
  if (progress <= 0) return route[0];
  if (progress >= 1) return route[route.length - 1];
  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const d = calcDistance(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);
    segLengths.push(d); totalLen += d;
  }
  let target = progress * totalLen;
  for (let i = 0; i < segLengths.length; i++) {
    if (target <= segLengths[i]) {
      const t = segLengths[i] > 0 ? target / segLengths[i] : 0;
      return [route[i][0] + (route[i + 1][0] - route[i][0]) * t, route[i][1] + (route[i + 1][1] - route[i][1]) * t];
    }
    target -= segLengths[i];
  }
  return route[route.length - 1];
}

export function splitRoute(route: [number, number][], progress: number): { traveled: [number, number][]; remaining: [number, number][] } {
  if (progress <= 0) return { traveled: [route[0]], remaining: [...route] };
  if (progress >= 1) return { traveled: [...route], remaining: [route[route.length - 1]] };
  const segLengths: number[] = [];
  let totalLen = 0;
  for (let i = 0; i < route.length - 1; i++) {
    const d = calcDistance(route[i][0], route[i][1], route[i + 1][0], route[i + 1][1]);
    segLengths.push(d); totalLen += d;
  }
  let target = progress * totalLen;
  let splitIdx = 0;
  for (let i = 0; i < segLengths.length; i++) {
    if (target <= segLengths[i]) { splitIdx = i; break; }
    target -= segLengths[i]; splitIdx = i + 1;
  }
  const currentPos = interpolateRoute(route, progress);
  return {
    traveled:  [...route.slice(0, splitIdx + 1), currentPos],
    remaining: [currentPos, ...route.slice(splitIdx + 1)],
  };
}

export function assignStudentToBus(studentLat: number, studentLng: number): string {
  let bestBusId = MOCK_BUSES[0].id;
  let minDist = Infinity;
  MOCK_BUSES.forEach((bus) => {
    bus.waypoints.forEach(([lat, lng]) => {
      const dist = calcDistance(studentLat, studentLng, lat, lng);
      if (dist < minDist) { minDist = dist; bestBusId = bus.id; }
    });
  });
  return bestBusId;
}

export function nearestLocationName(lat: number, lng: number): string {
  let name = KAFR_LOCATIONS[0].name;
  let minDist = Infinity;
  KAFR_LOCATIONS.forEach((loc) => {
    const d = calcDistance(lat, lng, loc.lat, loc.lng);
    if (d < minDist) { minDist = d; name = loc.name; }
  });
  return name;
}
