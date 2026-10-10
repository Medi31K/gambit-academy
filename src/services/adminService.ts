import { requireSupabase } from "@/lib/supabase";
import { isLegalLine } from "@/lib/puzzle-data";
import type { AdminStats, AdminUser } from "@/types/academy";

// Every call here is checked again by the database (is_admin()), so hiding the
// admin page is a convenience, not the protection.
export interface PuzzleInput {
  id: string;
  fen: string;
  moves: string[];
  rating: number;
  themes: string[];
}

export const adminService = {
  async users(search = ""): Promise<AdminUser[]> {
    const { data, error } = await requireSupabase().rpc("admin_list_users", {
      p_search: search.trim(),
      p_limit: 50,
    });
    if (error) throw error;
    return (
      (data as {
        id: string;
        username: string;
        email: string;
        role: string;
        banned: boolean;
        training_rating: number;
        rated_attempts: number;
        created_at: string;
      }[]) ?? []
    ).map((row) => ({
      id: row.id,
      username: row.username,
      email: row.email,
      role: row.role === "admin" ? "admin" : "user",
      banned: row.banned,
      trainingRating: row.training_rating,
      ratedAttempts: row.rated_attempts,
      createdAt: row.created_at,
    }));
  },
  async stats(): Promise<AdminStats | null> {
    const { data, error } = await requireSupabase().rpc("admin_stats");
    if (error) throw error;
    return data as AdminStats;
  },
  async setBanned(userId: string, banned: boolean): Promise<void> {
    const { error } = await requireSupabase().rpc("admin_set_banned", {
      p_user_id: userId,
      p_banned: banned,
    });
    if (error) throw new Error(error.message);
  },
  async savePuzzle(input: PuzzleInput, isNew: boolean): Promise<void> {
    const problem = validatePuzzle(input);
    if (problem) throw new Error(problem);
    const supabase = requireSupabase();
    const row = {
      id: input.id.trim(),
      fen: input.fen.trim(),
      moves: input.moves,
      rating: input.rating,
      themes: input.themes,
    };
    const { error } = isNew
      ? await supabase.from("puzzles").insert(row)
      : await supabase.from("puzzles").update(row).eq("id", row.id);
    if (error)
      throw new Error(error.code === "23505" ? "A puzzle with that ID exists." : error.message);
  },
  async removePuzzle(id: string): Promise<void> {
    const { error } = await requireSupabase().from("puzzles").delete().eq("id", id);
    if (error) throw error;
  },
};

export function validatePuzzle(input: PuzzleInput): string | null {
  if (!/^[A-Za-z0-9_-]{1,40}$/.test(input.id.trim()))
    return "Use an ID of letters, numbers, - or _.";
  if (input.moves.length < 2) {
    return "Add the opponent's move first, then at least one answer.";
  }
  if (!isLegalLine(input.fen.trim(), input.moves)) {
    return "The FEN or one of the moves isn't legal. Moves are in UCI, like e2e4 or e7e8q.";
  }
  if (!Number.isInteger(input.rating) || input.rating < 400 || input.rating > 3200) {
    return "Rating must be a whole number from 400 to 3200.";
  }
  return null;
}
