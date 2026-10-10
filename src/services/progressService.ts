import { getSupabase } from "@/lib/supabase";
import { guestProgress, withSuggestion } from "@/lib/guest-progress";
import type { AttemptResult, Progress, Puzzle } from "@/types/academy";

export const progressService = {
  // Progress for the logged-in player, or this browser's guest progress.
  async get(loggedIn = false): Promise<Progress | null> {
    if (!loggedIn) return guestProgress.progress();
    const supabase = getSupabase();
    if (!supabase) return null;
    const { data, error } = await supabase.rpc("my_progress");
    if (error) throw error;
    if (!data) return null;
    const progress = data as Omit<Progress, "guest" | "suggestedNextStep">;
    if (!progress.ratedAttempts) return null;
    return withSuggestion({ ...progress, suggestedNextStep: "", guest: false });
  },
  // A puzzle counts as solved only without a wrong move, hint or solution.
  async recordAttempt(
    puzzle: Pick<Puzzle, "id" | "rating" | "themes">,
    correct: boolean,
    usedHelp: boolean,
    loggedIn: boolean,
  ): Promise<AttemptResult> {
    if (!loggedIn) return guestProgress.record(puzzle, correct && !usedHelp);
    const supabase = getSupabase();
    if (!supabase) throw new Error("Progress could not be saved.");
    const { data, error } = await supabase.rpc("record_attempt", {
      p_puzzle_id: puzzle.id,
      p_correct: correct,
      p_used_help: usedHelp,
    });
    if (error) throw error;
    return data as AttemptResult;
  },
};
