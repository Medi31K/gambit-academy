import { getSupabase } from "@/lib/supabase";
import { toPuzzle } from "@/lib/puzzle-data";
import { guestProgress } from "@/lib/guest-progress";
import type { Puzzle, PuzzleRow } from "@/types/academy";

const COLUMNS = "id, fen, moves, rating, themes, game_url";

export interface NextPuzzleOptions {
  exclude?: string[];
  theme?: string | undefined;
  // Logged-in players are matched to their saved rating by the database.
  loggedIn?: boolean;
}

export const puzzleService = {
  async next(options: NextPuzzleOptions = {}): Promise<Puzzle | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const exclude = [...(options.exclude ?? [])];
    if (!options.loggedIn) exclude.push(...guestProgress.recentIds());
    // A row that fails validation is skipped and another one is fetched.
    for (let tries = 0; tries < 3; tries++) {
      const { data, error } = await supabase.rpc("next_puzzle", {
        p_target_rating: options.loggedIn ? null : guestProgress.rating(),
        p_exclude: exclude,
        p_theme: options.theme ?? null,
      });
      if (error) throw error;
      const row = (data as PuzzleRow[] | null)?.[0];
      if (!row) return null;
      const puzzle = toPuzzle(row);
      if (puzzle) return puzzle;
      exclude.push(row.id);
    }
    return null;
  },
  async get(id: string): Promise<Puzzle | null> {
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase
      .from("puzzles")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toPuzzle(data as PuzzleRow) : null;
  },
  async list(search = ""): Promise<PuzzleRow[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    let query = supabase.from("puzzles").select(COLUMNS).order("created_at", { ascending: false });
    if (search.trim()) query = query.ilike("id", `${search.trim()}%`);
    const { data, error } = await query.limit(50);
    if (error) throw error;
    return (data as PuzzleRow[]) ?? [];
  },
};
