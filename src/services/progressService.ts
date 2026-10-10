import type { Progress } from "@/types/academy";
export const progressService = {
  async get(): Promise<Progress | null> {
    return null;
  },
  async recordAttempt(_puzzleId: string, _correct: boolean): Promise<void> {},
};
