import type { Puzzle } from "@/types/academy";
export const puzzleService = {
  async next(_excludeId?: string): Promise<Puzzle | null> {
    return null;
  },
  async list(): Promise<Puzzle[]> {
    return [];
  },
};
