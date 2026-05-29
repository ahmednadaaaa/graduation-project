// Re-export everything from the unified data file
// @/types/index.ts is kept for backward compatibility
export type {
  UserRole, User, DriverProfile, StudentProfile,
  AvailableRoute, BusLocation, Notification,
  AttendanceRecord, RouteStop, StudentPickup,
} from "@/utils/data";
