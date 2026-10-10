export interface User {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
}
export interface Puzzle {
  id: string;
  fen: string;
  solution: string[];
  theme: string;
  rating: number;
  idea: string;
  explanation: string;
}
export interface LessonCategory {
  id: string;
  name: string;
  level: "Beginner" | "Intermediate" | "Advanced";
  description: string;
}
export interface Lesson {
  id: string;
  categoryId: string;
  title: string;
  explanation: string;
  fen: string;
}
export interface ThemeAccuracy {
  theme: string;
  correct: number;
  total: number;
}
export interface Progress {
  trainingRating: number;
  accuracy: ThemeAccuracy[];
  mistakes: { puzzleId: string; theme: string; date: string }[];
  suggestedNextStep: string;
}
export interface Credentials {
  identifier: string;
  password: string;
}
export interface SignupDetails {
  username: string;
  email: string;
  password: string;
}
export interface AdminStats {
  puzzles: number;
  lessons: number;
  users: number;
  attempts: number;
}
