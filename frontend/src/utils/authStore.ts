// ─── Shared in-memory auth store ─────────────────────────────────────────────
// Centralises the registered-users list so both Login and Register can access it
// without prop-drilling. Swap with localStorage / backend in production.

import { mockAuthUsers, type AuthUser } from "@/utils/data";

let _users: AuthUser[] = [...mockAuthUsers];

export const authStore = {
  getUsers: (): AuthUser[] => _users,
  addUser:  (u: AuthUser) => { _users = [..._users, u]; },
  findByEmail: (email: string) => _users.find((u) => u.email.toLowerCase() === email.toLowerCase()),
  authenticate: (email: string, password: string): AuthUser | null => {
    const u = _users.find((u) => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    return u ?? null;
  },
};
