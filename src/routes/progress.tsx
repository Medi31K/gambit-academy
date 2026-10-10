import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/academy/empty-state";
import { progressService } from "@/services/progressService";
import { authService } from "@/services/authService";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/progress")({
  head: () => pageHead("Progress", "Puzzle accuracy, recent mistakes, and training rating."),
  component: ProgressPage,
});
function ProgressPage() {
  const user = useQuery({ queryKey: ["user"], queryFn: authService.getUser });
  const query = useQuery({
    queryKey: ["progress", user.data?.id],
    queryFn: progressService.get,
    enabled: Boolean(user.data),
    retry: false,
  });
  const data = query.data;
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
          <strong className="!text-xl">{data?.suggestedNextStep ?? "—"}</strong>
          <Button variant="link" asChild className="px-0">
            <Link to="/practice">
              Practice board
              <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
      {data ? (
        <div className="progress-columns">
          <section>
            <h2>Accuracy by theme</h2>
            {data.accuracy.map((item) => (
              <div className="data-row" key={item.theme}>
                <span>{item.theme}</span>
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
                  <span>{item.theme}</span>
                  <time>{item.date}</time>
                </div>
              ))
            ) : (
              <p className="panel-text mt-4">No recent mistakes.</p>
            )}
          </section>
        </div>
      ) : (
        <EmptyState
          loading={user.isLoading || Boolean(user.data && query.isLoading)}
          error={user.isError || query.isError}
          title={
            user.isError || query.isError
              ? "Progress couldn’t load"
              : user.data
                ? "No progress yet. Your results will appear here."
                : "Log in to keep your results here."
          }
          description=""
          retry={() => {
            void user.refetch();
            void query.refetch();
          }}
        />
      )}
      {!user.data && !user.isLoading && (
        <div className="text-center">
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
