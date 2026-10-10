import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { BookOpen, ChartNoAxesCombined, LockKeyhole, Puzzle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import { puzzleService } from "@/services/puzzleService";
import { lessonService } from "@/services/lessonService";
import { adminService } from "@/services/adminService";
import { pageHead } from "@/lib/metadata";
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
function Admin() {
  const { data: user } = useQuery({ queryKey: ["user"], queryFn: authService.getUser });
  const [tab, setTab] = useState("Puzzles");
  const allowed = user?.role === "admin";
  const puzzles = useQuery({
    queryKey: ["admin", "puzzles"],
    queryFn: puzzleService.list,
    enabled: allowed && tab === "Puzzles",
  });
  const lessons = useQuery({
    queryKey: ["admin", "lessons"],
    queryFn: () => lessonService.list(),
    enabled: allowed && tab === "Lessons",
  });
  const users = useQuery({
    queryKey: ["admin", "users"],
    queryFn: adminService.users,
    enabled: allowed && tab === "Users",
  });
  const stats = useQuery({
    queryKey: ["admin", "stats"],
    queryFn: adminService.stats,
    enabled: allowed && tab === "Stats",
  });
  if (!allowed)
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
  const data =
    tab === "Puzzles" ? puzzles : tab === "Lessons" ? lessons : tab === "Users" ? users : stats;
  return (
    <div className="page">
      <div className="page-heading">
        <h1>Admin</h1>
      </div>
      <div className="admin-tabs" role="tablist">
        {["Puzzles", "Lessons", "Users", "Stats"].map((item, index) => (
          <Button
            key={item}
            role="tab"
            aria-selected={tab === item}
            variant={tab === item ? "secondary" : "ghost"}
            onClick={() => setTab(item)}
          >
            {index === 0 ? (
              <Puzzle />
            ) : index === 1 ? (
              <BookOpen />
            ) : index === 2 ? (
              <Users />
            ) : (
              <ChartNoAxesCombined />
            )}
            {item}
          </Button>
        ))}
      </div>
      <section role="tabpanel">
        <div className="data-row">
          <strong>{tab}</strong>
        </div>
        {data.isError ? (
          <div className="empty-state">
            <h2>Couldn’t load {tab.toLowerCase()}.</h2>
            <Button
              variant="outline"
              onClick={() => {
                void data.refetch();
              }}
            >
              Try again
            </Button>
          </div>
        ) : data.isLoading ? (
          <div className="empty-state">Loading…</div>
        ) : (
          <div className="empty-state">
            <h2>No {tab.toLowerCase()} yet.</h2>
          </div>
        )}
      </section>
    </div>
  );
}
