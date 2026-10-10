export interface User {
  id: string;
  username: string;
  email: string;
  role: "user" | "admin";
}
export interface Puzzle {
  id: string;
  // Position before the opponent's last move. That move (setupMove) is played
  // on the board first, then the solver answers with solution[0].
  fen: string;
  setupMove: string;
  solution: string[];
  themes: string[];
  theme: string;
  rating: number;
  idea: string;
  explanation: string;
  gameUrl: string | null;
}
export interface PuzzleRow {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
  game_url: string | null;
}
export interface AttemptResult {
  rated: boolean;
  rating: number;
  delta: number;
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
  sortOrder: number;
  published: boolean;
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
  ratedAttempts: number;
  weakestTheme: string | null;
  suggestedNextStep: string;
  // True when the progress is kept only in this browser.
  guest: boolean;
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
export interface AdminUser extends User {
  banned: boolean;
  trainingRating: number;
  ratedAttempts: number;
  createdAt: string;
}
export interface LessonInput {
  categoryId: string;
  title: string;
  explanation: string;
  fen: string;
  sortOrder: number;
  published: boolean;
}
export interface AdminStats {
  puzzles: number;
  lessons: number;
  users: number;
  attempts: number;
}
