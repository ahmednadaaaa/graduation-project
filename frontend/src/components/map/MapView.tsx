// MapView.tsx — Legacy compatibility file
// The map system has been refactored into 3 separate maps:
//   - AdminMap   → src/components/map/AdminMap.tsx
//   - DriverMap  → src/components/map/DriverMap.tsx
//   - StudentMap → src/components/map/StudentMap.tsx
//
// This file re-exports AdminMap for any legacy usage.

export { default } from "./AdminMap";
