import { getSupabase, requireSupabase } from "@/lib/supabase";
import type { Lesson, LessonCategory, LessonInput } from "@/types/academy";

const COLUMNS = "id, category_id, title, explanation, fen, sort_order, published";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
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
  async list(categoryId?: string, includeDrafts = false): Promise<Lesson[]> {
    const supabase = getSupabase();
    if (!supabase) return [];
    let query = supabase.from("lessons").select(COLUMNS).order("sort_order").order("created_at");
    if (categoryId) query = query.eq("category_id", categoryId);
    // Row Level Security hides drafts from everyone but admins anyway.
    if (!includeDrafts) query = query.eq("published", true);
    const { data, error } = await query;
    if (error) throw error;
    return (data ?? []).map(toLesson);
  },
  async get(id: string): Promise<Lesson | null> {
    const supabase = getSupabase();
    if (!supabase || !UUID.test(id)) return null;
    const { data, error } = await supabase
      .from("lessons")
      .select(COLUMNS)
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    return data ? toLesson(data) : null;
  },
  async save(input: LessonInput, id?: string): Promise<void> {
    const supabase = requireSupabase();
    const row = {
      category_id: input.categoryId,
      title: input.title.trim(),
      explanation: input.explanation.trim(),
      fen: input.fen.trim(),
      sort_order: input.sortOrder,
      published: input.published,
      updated_at: new Date().toISOString(),
    };
    const { error } = id
      ? await supabase.from("lessons").update(row).eq("id", id)
      : await supabase.from("lessons").insert(row);
    if (error) throw error;
  },
  async remove(id: string): Promise<void> {
    const { error } = await requireSupabase().from("lessons").delete().eq("id", id);
    if (error) throw error;
  },
};

interface LessonRow {
  id: string;
  category_id: string;
  title: string;
  explanation: string;
  fen: string;
  sort_order: number;
  published: boolean;
}

function toLesson(row: LessonRow): Lesson {
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    explanation: row.explanation,
    fen: row.fen,
    sortOrder: row.sort_order,
    published: row.published,
  };
}
