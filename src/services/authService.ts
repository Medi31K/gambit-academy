import type { Credentials, SignupDetails, User } from "@/types/academy";
export const authService = {
  async getUser(): Promise<User | null> {
    return null;
  },
  async login(_details: Credentials): Promise<User> {
    throw new Error("Accounts are being set up. You can keep learning as a guest.");
  },
  async signup(_details: SignupDetails): Promise<User> {
    throw new Error("Accounts are being set up. You can keep learning as a guest.");
  },
  async logout(): Promise<void> {},
};
