import type { AdminStats, User } from "@/types/academy";
export const adminService = {
  async users(): Promise<User[]> {
    return [];
  },
  async stats(): Promise<AdminStats | null> {
    return null;
  },
};
