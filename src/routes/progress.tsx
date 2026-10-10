import { createFileRoute, Link, useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/academy/empty-state";
import { progressService } from "@/services/progressService";
import { authService } from "@/services/authService";
import { pageHead } from "@/lib/metadata";
import { themeLabel } from "@/lib/puzzle-themes";
export const Route = createFileRoute("/progress")({
  head: () => pageHead("Progress", "Puzzle accuracy, recent mistakes, and training rating."),
  component: ProgressPage,
});
function ProgressPage() {
  const user = useQuery({ queryKey: ["user"], queryFn: authService.getUser });
  const loggedIn = Boolean(user.data);
  // Progress lives in the browser, so render "loading" until hydrated to match the server.
  const hydrated = useHydrated();
  const query = useQuery({
    queryKey: ["progress", user.data?.id ?? "guest"],
    queryFn: () => progressService.get(loggedIn),
    enabled: !user.isPending,
    retry: false,
  });
  const data = hydrated ? query.data : undefined;
  return (
    <div className="page">
      <div className="page-heading">
        <h1>Progress</h1>
        <p>Your puzzle accuracy, recent mistakes and training rating, all in one place.</p>
      </div>
      <div className="progress-metrics">
        <div className="progress-metric">
          <h2>Training rating</h2>
          <strong>{data?.trainingRating ?? "—"}</strong>
          <p>Gambit Academy training rating, not an official Elo</p>
        </div>
        <div className="progress-metric">
          <h2>Puzzle accuracy</h2>
          <strong>
            {data && data.accuracy.reduce((n, item) => n + item.total, 0)
              ? `${Math.round((100 * data.accuracy.reduce((n, item) => n + item.correct, 0)) / data.accuracy.reduce((n, item) => n + item.total, 0))}%`
              : "—"}
          </strong>
        </div>
        <div className="progress-metric">
          <h2>Suggested next step</h2>
          <strong className="!text-xl">
            {data?.suggestedNextStep ?? "Solve your first puzzle"}
          </strong>
          <Button variant="link" asChild className="px-0">
            {data?.weakestTheme ? (
              <Link to="/puzzles" search={{ theme: data.weakestTheme }}>
                Start
                <ArrowRight />
              </Link>
            ) : data?.mistakes[0] ? (
              <Link to="/puzzles" search={{ id: data.mistakes[0].puzzleId }}>
                Retry it
                <ArrowRight />
              </Link>
            ) : (
              <Link to="/puzzles">
                Puzzles
                <ArrowRight />
              </Link>
            )}
          </Button>
        </div>
      </div>
      {data ? (
        <div className="progress-columns">
          <section>
            <h2>Accuracy by theme</h2>
            {data.accuracy.slice(0, 12).map((item) => (
              <div className="data-row" key={item.theme}>
                <Link to="/puzzles" search={{ theme: item.theme }}>
                  {themeLabel(item.theme)}
                </Link>
                <span>
                  {item.total ? Math.round((100 * item.correct) / item.total) : 0}% · {item.correct}
                  /{item.total}
                </span>
              </div>
            ))}
          </section>
          <section>
            <h2>Recent mistakes</h2>
            {data.mistakes.length ? (
              data.mistakes.map((item, index) => (
                <div className="data-row" key={`${item.puzzleId}-${index}`}>
                  <Link to="/puzzles" search={{ id: item.puzzleId }}>
                    {themeLabel(item.theme)} · retry
                  </Link>
                  <time dateTime={item.date}>{new Date(item.date).toLocaleDateString()}</time>
                </div>
              ))
            ) : (
              <p className="panel-text mt-4">No recent mistakes.</p>
            )}
          </section>
        </div>
      ) : (
        <EmptyState
          loading={!hydrated || user.isPending || query.isPending}
          error={user.isError || query.isError}
          title={
            user.isError || query.isError
              ? "Progress couldn’t load"
              : "No progress yet. Solve a puzzle and your results will appear here."
          }
          description=""
          retry={() => {
            void user.refetch();
            void query.refetch();
          }}
        />
      )}
      {hydrated && !user.data && !user.isPending && (
        <div className="text-center">
          <p className="panel-text mb-4">
            As a guest, progress is saved in this browser only. An account keeps it everywhere.
          </p>
          <Button asChild>
            <Link to="/signup">
              Sign up
              <ArrowRight />
            </Link>
          </Button>
        </div>
      )}
    </div>
  );
}
