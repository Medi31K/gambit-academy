import { nextRating, START_RATING } from "@/lib/training-rating";
import { META_THEMES, themeLabel } from "@/lib/puzzle-themes";
import type { AttemptResult, Progress } from "@/types/academy";

// Progress for visitors without an account, kept only in this browser.
const KEY = "gambit-guest-progress";

interface GuestAttempt {
  id: string;
  themes: string[];
  correct: boolean;
  date: string;
}
interface GuestData {
  rating: number;
  ratedAttempts: number;
  attempts: GuestAttempt[];
}

const MAX_ATTEMPTS = 500;

function empty(): GuestData {
  return { rating: START_RATING, ratedAttempts: 0, attempts: [] };
}

function read(): GuestData {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const data = JSON.parse(raw) as GuestData;
    if (typeof data.rating !== "number" || !Array.isArray(data.attempts)) return empty();
    return data;
  } catch {
    return empty();
  }
}

function write(data: GuestData) {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    // Storage can be full or blocked; training still works without it.
  }
}

export const guestProgress = {
  rating(): number {
    return read().rating;
  },
  recentIds(): string[] {
    return read()
      .attempts.slice(-100)
      .map((attempt) => attempt.id);
  },
  record(
    puzzle: { id: string; rating: number; themes: string[] },
    correct: boolean,
  ): AttemptResult {
    const data = read();
    if (data.attempts.some((attempt) => attempt.id === puzzle.id)) {
      return { rated: false, rating: data.rating, delta: 0 };
    }
    const before = data.rating;
    data.rating = nextRating(before, data.ratedAttempts, puzzle.rating, correct);
    data.ratedAttempts += 1;
    data.attempts.push({
      id: puzzle.id,
      themes: puzzle.themes,
      correct,
      date: new Date().toISOString(),
    });
    data.attempts = data.attempts.slice(-MAX_ATTEMPTS);
    write(data);
    return { rated: true, rating: data.rating, delta: data.rating - before };
  },
  progress(): Progress | null {
    const data = read();
    if (!data.ratedAttempts) return null;
    const totals = new Map<string, { correct: number; total: number }>();
    for (const attempt of data.attempts) {
      for (const theme of attempt.themes) {
        if (META_THEMES.has(theme)) continue;
        const entry = totals.get(theme) ?? { correct: 0, total: 0 };
        entry.total += 1;
        if (attempt.correct) entry.correct += 1;
        totals.set(theme, entry);
      }
    }
    const accuracy = [...totals]
      .map(([theme, value]) => ({ theme, ...value }))
      .sort((a, b) => b.total - a.total || a.theme.localeCompare(b.theme));
    const mistakes = data.attempts
      .filter((attempt) => !attempt.correct)
      .slice(-10)
      .reverse()
      .map((attempt) => ({
        puzzleId: attempt.id,
        theme: attempt.themes.find((theme) => !META_THEMES.has(theme)) ?? "mixed",
        date: attempt.date,
      }));
    return withSuggestion({
      trainingRating: data.rating,
      ratedAttempts: data.ratedAttempts,
      accuracy,
      mistakes,
      weakestTheme: weakest(accuracy),
      suggestedNextStep: "",
      guest: true,
    });
  },
};

export function weakest(accuracy: { theme: string; correct: number; total: number }[]) {
  const candidates = accuracy.filter((item) => item.total >= 3);
  candidates.sort((a, b) => a.correct / a.total - b.correct / b.total || b.total - a.total);
  return candidates[0]?.theme ?? null;
}

export function withSuggestion(progress: Progress): Progress {
  return { ...progress, suggestedNextStep: suggestion(progress) };
}

function suggestion(progress: Progress): string {
  if (progress.weakestTheme)
    return `Practise ${themeLabel(progress.weakestTheme).toLowerCase()} puzzles`;
  if (progress.mistakes.length) return "Retry a recent mistake";
  if (progress.ratedAttempts < 10) return "Solve a few more puzzles";
  return "Keep solving puzzles";
}
