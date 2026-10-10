import { ArrowRight, BookOpen, RefreshCw, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
export function EmptyState({
  title,
  loading,
  error,
  retry,
}: {
  title: string;
  description: string;
  loading?: boolean;
  error?: boolean;
  retry?: () => void;
}) {
  return (
    <div className="empty-state">
      <div className="empty-icon">
        {loading ? <RefreshCw className="animate-spin" /> : error ? <RefreshCw /> : <Sprout />}
      </div>
      <h2>{loading ? "Loading…" : title}</h2>

      {error && retry ? (
        <Button variant="outline" onClick={retry}>
          <RefreshCw />
          Try again
        </Button>
      ) : (
        !loading && (
          <Button variant="outline" asChild>
            <Link to="/practice">
              <BookOpen />
              Practice board
              <ArrowRight />
            </Link>
          </Button>
        )
      )}
    </div>
  );
}
