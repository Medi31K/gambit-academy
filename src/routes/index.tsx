import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useRef, type PointerEvent } from "react";
import { ArrowRight, BookOpen, Grid2X2, Puzzle, ArrowUpRight, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractiveBoard } from "@/components/chess/interactive-board";
import { useChessGame } from "@/hooks/use-chess-game";
import { gameStatus, tryMove } from "@/lib/chess-logic";
import { contentService } from "@/services/contentService";
import { pageHead } from "@/lib/metadata";
import heroImage from "@/assets/chess-study.jpg";
const homeQuery = { queryKey: ["home"], queryFn: contentService.home };
export const Route = createFileRoute("/")({
  head: () => pageHead("Home", "Free chess puzzles and lessons for every level."),
  loader: async ({ context }) => {
    await context.queryClient.ensureQueryData(homeQuery);
  },
  component: Home,
});

const cardCopy: Record<
  string,
  { title: string; text: string; to: "/puzzles" | "/learn" | "/practice" }
> = {
  puzzles: {
    title: "Puzzles",
    text: "Real positions from real games, sorted by theme and difficulty.",
    to: "/puzzles",
  },
  learn: {
    title: "Lessons",
    text: "Checkmates, tactics, openings and endgames, from beginner to advanced.",
    to: "/learn",
  },
  practice: {
    title: "Practice board",
    text: "Play both sides and try out moves on the board.",
    to: "/practice",
  },
};

/** Writes the pointer position (-1…1 from the element's centre) to CSS variables, mouse only. */
function trackPointer(event: PointerEvent<HTMLElement>) {
  if (event.pointerType !== "mouse") return;
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const el = event.currentTarget;
  const rect = el.getBoundingClientRect();
  const x = (event.clientX - rect.left) / rect.width;
  const y = (event.clientY - rect.top) / rect.height;
  el.style.setProperty("--px", (x * 2 - 1).toFixed(3));
  el.style.setProperty("--py", (y * 2 - 1).toFixed(3));
  el.style.setProperty("--gx", `${(x * 100).toFixed(1)}%`);
  el.style.setProperty("--gy", `${(y * 100).toFixed(1)}%`);
}
function resetPointer(event: PointerEvent<HTMLElement>) {
  const el = event.currentTarget;
  el.style.setProperty("--px", "0");
  el.style.setProperty("--py", "0");
}

function Home() {
  const { data } = useSuspenseQuery(homeQuery);
  return (
    <>
      <section className="home-hero" onPointerMove={trackPointer} onPointerLeave={resetPointer}>
        <img
          className="hero-image"
          src={heroImage}
          width={1040}
          height={598}
          alt="Ivory knight and burgundy chess pieces on a sunlit rose-colored board"
          fetchPriority="high"
        />
        <div className="hero-glow" aria-hidden="true" />
        <div className="hero-inner">
          <h1>Gambit Academy</h1>
          <p className="hero-description">
            Free puzzles, lessons and a board to think on. For every level, no strings attached.
          </p>
          <div className="hero-actions">
            <Button variant="hero" asChild>
              <Link to="/puzzles">
                <Puzzle />
                Solve puzzles
                <ArrowRight className="nudge" />
              </Link>
            </Button>
            <Button variant="heroOutline" asChild>
              <Link to="/learn">
                <BookOpen />
                Start learning
              </Link>
            </Button>
          </div>
        </div>
      </section>
      <section className="home-content">
        <MiniBoard />
        <div className="section-heading">
          <div>
            <h2>Training</h2>
          </div>
        </div>
        <div className="path-grid">
          {data.paths.map((path) => {
            const copy = cardCopy[path.id];
            if (!copy) return null;
            return (
              <Link
                key={path.id}
                className={`path-card path-${path.id}`}
                to={copy.to}
                onPointerMove={trackPointer}
                onPointerLeave={resetPointer}
              >
                <div className="path-top">
                  <span className="path-icon">
                    {path.id === "puzzles" ? (
                      <Puzzle />
                    ) : path.id === "learn" ? (
                      <BookOpen />
                    ) : (
                      <Grid2X2 />
                    )}
                  </span>
                </div>
                <h3>{copy.title}</h3>
                <p>{copy.text}</p>
                <span className="path-link">
                  {path.label}
                  <ArrowUpRight />
                </span>
              </Link>
            );
          })}
        </div>
      </section>
    </>
  );
}

function MiniBoard() {
  const { game, position, sync, reset } = useChessGame();
  const moves = game.history().length;
  return (
    <div className="mini-board">
      <div className="mini-board-board">
        <InteractiveBoard
          id="home-board"
          game={game}
          position={position}
          previewOnHover
          onMove={(from, to, promotion) => {
            const result = tryMove(game, from, to, promotion);
            if (result) sync();
            return Boolean(result);
          }}
        />
      </div>
      <div className="mini-board-copy">
        <h2>Make a move</h2>
        <p>Hover a piece to see where it can go. Click or drag to play, for both sides.</p>
        <div className="turn-indicator" aria-live="polite">
          <span className={`turn-dot ${game.turn() === "b" ? "black" : ""}`} />
          {gameStatus(game)}
          {moves > 0 && (
            <span className="mini-board-count">
              · {moves} {moves === 1 ? "move" : "moves"}
            </span>
          )}
        </div>
        <div className="mini-board-actions">
          <Button variant="outline" size="sm" onClick={reset} disabled={!moves}>
            <RotateCcw />
            Reset
          </Button>
          <Button variant="link" size="sm" asChild>
            <Link to="/practice">
              Open the full board
              <ArrowRight className="nudge" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
