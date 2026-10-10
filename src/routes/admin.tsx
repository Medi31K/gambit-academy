import { createFileRoute, useHydrated } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState, type FormEvent, type ReactNode } from "react";
import { Chess } from "chess.js";
import {
  BookOpen,
  ChartNoAxesCombined,
  LockKeyhole,
  Pencil,
  Plus,
  Puzzle,
  Trash2,
  Users,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import { puzzleService } from "@/services/puzzleService";
import { lessonService } from "@/services/lessonService";
import { adminService, type PuzzleInput } from "@/services/adminService";
import { pageHead } from "@/lib/metadata";
import type { Lesson, LessonInput, PuzzleRow } from "@/types/academy";

export const Route = createFileRoute("/admin")({
  head: () => ({
    ...pageHead("Admin", "Manage Gambit Academy puzzles, lessons, users, and training statistics."),
    meta: [
      ...pageHead(
        "Admin",
        "Manage Gambit Academy puzzles, lessons, users, and training statistics.",
      ).meta,
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Admin,
});

const TABS = [
  { id: "Puzzles", icon: <Puzzle /> },
  { id: "Lessons", icon: <BookOpen /> },
  { id: "Users", icon: <Users /> },
  { id: "Stats", icon: <ChartNoAxesCombined /> },
] as const;
type Tab = (typeof TABS)[number]["id"];

function Admin() {
  const user = useQuery({ queryKey: ["user"], queryFn: authService.getUser });
  const [tab, setTab] = useState<Tab>("Puzzles");
  // The account is only known in the browser, so the first render must match
  // the server's "loading" output even if the check finished early.
  const hydrated = useHydrated();
  if (!hydrated || user.isPending) return <div className="page empty-state">Loading…</div>;
  if (user.data?.role !== "admin")
    return (
      <div className="page">
        <div className="empty-state">
          <div className="empty-icon">
            <LockKeyhole />
          </div>
          <h1>Admin access required.</h1>
        </div>
      </div>
    );
  return (
    <div className="page">
      <div className="page-heading">
        <h1>Admin</h1>
      </div>
      <div className="admin-tabs" role="tablist">
        {TABS.map((item) => (
          <Button
            key={item.id}
            role="tab"
            aria-selected={tab === item.id}
            variant={tab === item.id ? "secondary" : "ghost"}
            onClick={() => setTab(item.id)}
          >
            {item.icon}
            {item.id}
          </Button>
        ))}
      </div>
      <section role="tabpanel" className="admin-panel">
        {tab === "Puzzles" && <PuzzlesTab />}
        {tab === "Lessons" && <LessonsTab />}
        {tab === "Users" && <UsersTab selfId={user.data.id} />}
        {tab === "Stats" && <StatsTab />}
      </section>
    </div>
  );
}

function errorText(error: unknown) {
  return error instanceof Error ? error.message : "Something went wrong. Please try again.";
}

function ErrorNote({ error }: { error: unknown }) {
  if (!error) return null;
  return (
    <div className="feedback" role="alert">
      <XCircle />
      {errorText(error)}
    </div>
  );
}

function ListState({
  loading,
  error,
  empty,
  retry,
  children,
}: {
  loading: boolean;
  error: unknown;
  empty: boolean;
  retry: () => void;
  children: ReactNode;
}) {
  if (loading) return <div className="empty-state">Loading…</div>;
  if (error)
    return (
      <div className="empty-state">
        <h2>Couldn’t load this list.</h2>
        <p className="panel-text">{errorText(error)}</p>
        <Button variant="outline" onClick={retry}>
          Try again
        </Button>
      </div>
    );
  if (empty) return <div className="empty-state">Nothing here yet.</div>;
  return <>{children}</>;
}

function confirmDelete(what: string) {
  return window.confirm(`Delete ${what}? This can't be undone.`);
}

// ---------------------------------------------------------------------------
// Puzzles
// ---------------------------------------------------------------------------

function PuzzlesTab() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<PuzzleRow | "new" | null>(null);
  const list = useQuery({
    queryKey: ["admin", "puzzles", search],
    queryFn: () => puzzleService.list(search),
  });
  const remove = useMutation({
    mutationFn: adminService.removePuzzle,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin"] }),
  });
  if (editing)
    return (
      <PuzzleForm
        puzzle={editing === "new" ? null : editing}
        done={() => {
          setEditing(null);
          void queryClient.invalidateQueries({ queryKey: ["admin"] });
        }}
      />
    );
  return (
    <>
      <div className="admin-toolbar">
        <input
          className="field"
          type="search"
          placeholder="Search by puzzle ID"
          aria-label="Search by puzzle ID"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        <Button onClick={() => setEditing("new")}>
          <Plus />
          Add puzzle
        </Button>
      </div>
      <p className="panel-text">Showing the 50 newest matches.</p>
      <ErrorNote error={remove.error} />
      <ListState
        loading={list.isLoading}
        error={list.error}
        empty={!list.data?.length}
        retry={() => void list.refetch()}
      >
        {list.data?.map((puzzle) => (
          <div className="data-row admin-row" key={puzzle.id}>
            <span>
              <strong>{puzzle.id}</strong> · {puzzle.rating} ·{" "}
              <span className="panel-text">{puzzle.themes.join(", ") || "no themes"}</span>
            </span>
            <span className="admin-actions">
              <Button variant="ghost" size="sm" onClick={() => setEditing(puzzle)}>
                <Pencil />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                onClick={() => confirmDelete(`puzzle ${puzzle.id}`) && remove.mutate(puzzle.id)}
              >
                <Trash2 />
                Delete
              </Button>
            </span>
          </div>
        ))}
      </ListState>
    </>
  );
}

function PuzzleForm({ puzzle, done }: { puzzle: PuzzleRow | null; done: () => void }) {
  const save = useMutation({
    mutationFn: (input: PuzzleInput) => adminService.savePuzzle(input, !puzzle),
    onSuccess: done,
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const words = (name: string) =>
      String(form.get(name) ?? "")
        .split(/[\s,]+/)
        .filter(Boolean);
    save.mutate({
      id: String(form.get("id") ?? ""),
      fen: String(form.get("fen") ?? ""),
      moves: words("moves").map((move) => move.toLowerCase()),
      rating: Number(form.get("rating")),
      themes: words("themes"),
    });
  };
  return (
    <form className="auth-form admin-form" onSubmit={submit}>
      <h2>{puzzle ? `Edit puzzle ${puzzle.id}` : "Add puzzle"}</h2>
      <label>
        ID
        <input
          className="field"
          name="id"
          required
          defaultValue={puzzle?.id}
          readOnly={Boolean(puzzle)}
        />
      </label>
      <label>
        FEN (the position before the opponent's move)
        <input className="field" name="fen" required defaultValue={puzzle?.fen} />
      </label>
      <label>
        Moves in UCI, separated by spaces. The first is the opponent's move.
        <input
          className="field"
          name="moves"
          required
          placeholder="e7e5 f3e5 d8e7"
          defaultValue={puzzle?.moves.join(" ")}
        />
      </label>
      <label>
        Rating
        <input
          className="field"
          name="rating"
          type="number"
          min={400}
          max={3200}
          required
          defaultValue={puzzle?.rating ?? 1200}
        />
      </label>
      <label>
        Themes (Lichess tags, e.g. fork mateIn2)
        <input className="field" name="themes" defaultValue={puzzle?.themes.join(" ")} />
      </label>
      <p className="panel-text">Every move is checked with chess.js before saving.</p>
      <ErrorNote error={save.error} />
      <div className="admin-actions">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save puzzle"}
        </Button>
        <Button type="button" variant="ghost" onClick={done}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Lessons
// ---------------------------------------------------------------------------

function LessonsTab() {
  const queryClient = useQueryClient();
  const [editing, setEditing] = useState<Lesson | "new" | null>(null);
  const categories = useQuery({ queryKey: ["categories"], queryFn: lessonService.categories });
  const list = useQuery({
    queryKey: ["admin", "lessons"],
    queryFn: () => lessonService.list(undefined, true),
  });
  const remove = useMutation({
    mutationFn: lessonService.remove,
    onSuccess: () => queryClient.invalidateQueries(),
  });
  const categoryName = (id: string) => categories.data?.find((item) => item.id === id)?.name ?? id;
  if (editing)
    return (
      <LessonForm
        lesson={editing === "new" ? null : editing}
        categories={categories.data ?? []}
        done={() => {
          setEditing(null);
          void queryClient.invalidateQueries();
        }}
      />
    );
  return (
    <>
      <div className="admin-toolbar">
        <Button onClick={() => setEditing("new")}>
          <Plus />
          Add lesson
        </Button>
      </div>
      <ErrorNote error={remove.error} />
      <ListState
        loading={list.isLoading}
        error={list.error}
        empty={!list.data?.length}
        retry={() => void list.refetch()}
      >
        {list.data?.map((lesson) => (
          <div className="data-row admin-row" key={lesson.id}>
            <span>
              <strong>{lesson.title}</strong> ·{" "}
              <span className="panel-text">
                {categoryName(lesson.categoryId)} · {lesson.published ? "Published" : "Draft"}
              </span>
            </span>
            <span className="admin-actions">
              <Button variant="ghost" size="sm" onClick={() => setEditing(lesson)}>
                <Pencil />
                Edit
              </Button>
              <Button
                variant="ghost"
                size="sm"
                disabled={remove.isPending}
                onClick={() => confirmDelete(`“${lesson.title}”`) && remove.mutate(lesson.id)}
              >
                <Trash2 />
                Delete
              </Button>
            </span>
          </div>
        ))}
      </ListState>
    </>
  );
}

function LessonForm({
  lesson,
  categories,
  done,
}: {
  lesson: Lesson | null;
  categories: { id: string; name: string }[];
  done: () => void;
}) {
  const save = useMutation({
    mutationFn: (input: LessonInput) => {
      try {
        new Chess(input.fen);
      } catch {
        throw new Error("That FEN isn't a valid position.");
      }
      return lessonService.save(input, lesson?.id);
    },
    onSuccess: done,
  });
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    save.mutate({
      categoryId: String(form.get("category")),
      title: String(form.get("title") ?? ""),
      explanation: String(form.get("explanation") ?? ""),
      fen: String(form.get("fen") ?? "").trim(),
      sortOrder: Number(form.get("sortOrder")) || 0,
      published: form.get("published") === "on",
    });
  };
  return (
    <form className="auth-form admin-form" onSubmit={submit}>
      <h2>{lesson ? "Edit lesson" : "Add lesson"}</h2>
      <label>
        Category
        <select
          className="field"
          name="category"
          defaultValue={lesson?.categoryId ?? categories[0]?.id}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Title
        <input
          className="field"
          name="title"
          required
          maxLength={120}
          defaultValue={lesson?.title}
        />
      </label>
      <label>
        Position (FEN)
        <input
          className="field"
          name="fen"
          required
          defaultValue={lesson?.fen ?? new Chess().fen()}
        />
      </label>
      <label>
        Explanation (each line becomes a paragraph)
        <textarea
          className="field"
          name="explanation"
          rows={8}
          defaultValue={lesson?.explanation}
        />
      </label>
      <label>
        Order in its category
        <input
          className="field"
          name="sortOrder"
          type="number"
          defaultValue={lesson?.sortOrder ?? 0}
        />
      </label>
      <label className="admin-check">
        <input type="checkbox" name="published" defaultChecked={lesson?.published ?? false} />
        Published (visible to everyone)
      </label>
      <ErrorNote error={save.error} />
      <div className="admin-actions">
        <Button type="submit" disabled={save.isPending}>
          {save.isPending ? "Saving…" : "Save lesson"}
        </Button>
        <Button type="button" variant="ghost" onClick={done}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

// ---------------------------------------------------------------------------
// Users and stats
// ---------------------------------------------------------------------------

function UsersTab({ selfId }: { selfId: string }) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const list = useQuery({
    queryKey: ["admin", "users", search],
    queryFn: () => adminService.users(search),
  });
  const ban = useMutation({
    mutationFn: ({ id, banned }: { id: string; banned: boolean }) =>
      adminService.setBanned(id, banned),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["admin", "users"] }),
  });
  return (
    <>
      <div className="admin-toolbar">
        <input
          className="field"
          type="search"
          placeholder="Search by username or email"
          aria-label="Search by username or email"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
      </div>
      <ErrorNote error={ban.error} />
      <ListState
        loading={list.isLoading}
        error={list.error}
        empty={!list.data?.length}
        retry={() => void list.refetch()}
      >
        {list.data?.map((user) => (
          <div className="data-row admin-row" key={user.id}>
            <span>
              <strong>{user.username}</strong>
              {user.role === "admin" && " · admin"}
              {user.banned && " · suspended"}
              <span className="panel-text block">
                {user.email} · rating {user.trainingRating} · {user.ratedAttempts} rated puzzles ·
                joined {new Date(user.createdAt).toLocaleDateString()}
              </span>
            </span>
            {user.id !== selfId && (
              <Button
                variant={user.banned ? "outline" : "ghost"}
                size="sm"
                disabled={ban.isPending}
                onClick={() => {
                  if (
                    user.banned ||
                    window.confirm(`Suspend ${user.username}? They won't be able to log in.`)
                  )
                    ban.mutate({ id: user.id, banned: !user.banned });
                }}
              >
                {user.banned ? "Lift suspension" : "Suspend"}
              </Button>
            )}
          </div>
        ))}
      </ListState>
    </>
  );
}

function StatsTab() {
  const stats = useQuery({ queryKey: ["admin", "stats"], queryFn: adminService.stats });
  return (
    <ListState
      loading={stats.isLoading}
      error={stats.error}
      empty={!stats.data}
      retry={() => void stats.refetch()}
    >
      <div className="progress-metrics">
        {(
          [
            ["Puzzles", stats.data?.puzzles],
            ["Lessons", stats.data?.lessons],
            ["Accounts", stats.data?.users],
            ["Puzzle attempts", stats.data?.attempts],
          ] as const
        ).map(([label, value]) => (
          <div className="progress-metric" key={label}>
            <h2>{label}</h2>
            <strong>{value?.toLocaleString() ?? "—"}</strong>
          </div>
        ))}
      </div>
    </ListState>
  );
}
