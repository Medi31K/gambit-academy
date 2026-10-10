import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { lessonService } from "@/services/lessonService";
import { pageHead } from "@/lib/metadata";
const categoriesQuery = { queryKey: ["categories"], queryFn: lessonService.categories };
export const Route = createFileRoute("/learn")({
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(categoriesQuery);
  },
  head: () =>
    pageHead(
      "Lessons",
      "Explore free chess lessons in checkmate patterns, tactics, opening principles, endgames, positional play, and calculation.",
    ),
  component: Learn,
});
function Learn() {
  const { data } = useSuspenseQuery(categoriesQuery);
  const [level, setLevel] = useState("All levels");
  return (
    <div className="page">
      <div className="page-heading">
        <h1>Lessons</h1>
        <p>Browse chess topics at your level, from checkmate patterns to positional play.</p>
      </div>
      <div className="library-top">
        <div className="filter-tabs" aria-label="Filter lessons by level">
          {["All levels", "Beginner", "Intermediate", "Advanced"].map((item) => (
            <Button
              key={item}
              variant="ghost"
              className={level === item ? "selected" : ""}
              aria-pressed={level === item}
              onClick={() => setLevel(item)}
            >
              {item}
            </Button>
          ))}
        </div>
      </div>
      <div className="category-grid">
        {data
          .filter((category) => level === "All levels" || category.level === level)
          .map((category) => (
            <Link
              key={category.id}
              to="/lessons/$lessonId"
              params={{ lessonId: category.id }}
              className="category-card"
            >
              <span className="level-tag">{category.level}</span>
              <h2>{category.name}</h2>

              <span className="category-link">
                View lessons
                <ArrowUpRight className="size-4" />
              </span>
            </Link>
          ))}
      </div>
    </div>
  );
}
