import type { Lesson, LessonCategory } from "@/types/academy";
export const lessonService = {
  async categories(): Promise<LessonCategory[]> {
    return [
      {
        id: "checkmates",
        name: "Checkmate patterns",
        level: "Beginner",
        description: "Recognize the patterns that finish a game.",
      },
      {
        id: "tactics",
        name: "Tactics",
        level: "Intermediate",
        description: "Find forks, pins, and the moves that change everything.",
      },
      {
        id: "openings",
        name: "Opening principles",
        level: "Beginner",
        description: "Give your pieces a good start, not a script to memorize.",
      },
      {
        id: "endgames",
        name: "Endgames",
        level: "Intermediate",
        description: "Turn a small advantage into a well-earned win.",
      },
      {
        id: "positional",
        name: "Positional play",
        level: "Advanced",
        description: "Build a plan when there is no obvious next move.",
      },
      {
        id: "calculation",
        name: "Calculation",
        level: "Advanced",
        description: "See a little further. Think a little clearer.",
      },
    ];
  },
  async list(_categoryId?: string): Promise<Lesson[]> {
    return [];
  },
  async get(_id: string): Promise<Lesson | null> {
    return null;
  },
};
