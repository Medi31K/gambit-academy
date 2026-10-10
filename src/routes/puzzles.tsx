import { createFileRoute, Link, useHydrated } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Chess, type PieceSymbol } from "chess.js";
import {
  CheckCircle2,
  ExternalLink,
  Eye,
  Lightbulb,
  Puzzle as PuzzleIcon,
  SkipForward,
  XCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/academy/empty-state";
import { InteractiveBoard } from "@/components/chess/interactive-board";
import { puzzleService } from "@/services/puzzleService";
import { progressService } from "@/services/progressService";
import { authService } from "@/services/authService";
import { pageHead } from "@/lib/metadata";
import { tryMove, uciMove } from "@/lib/chess-logic";
import { isAcceptedMove } from "@/lib/puzzle-data";
import { themeLabel } from "@/lib/puzzle-themes";
import type { AttemptResult, Puzzle } from "@/types/academy";
interface PuzzleSearch {
  // Replay one puzzle, e.g. a recent mistake.
  id?: string | undefined;
  // Practise one Lichess theme tag, e.g. "fork".
  theme?: string | undefined;
}
export const Route = createFileRoute("/puzzles")({
  validateSearch: (search: Record<string, unknown>): PuzzleSearch => ({
    id: typeof search["id"] === "string" && search["id"] ? search["id"] : undefined,
    theme: typeof search["theme"] === "string" && search["theme"] ? search["theme"] : undefined,
  }),
  head: () => pageHead("Puzzles", "Free chess puzzles with hints and solutions."),
  component: Puzzles,
});
function Puzzles() {
  const { id, theme } = Route.useSearch();
  const navigate = Route.useNavigate();
  const user = useQuery({ queryKey: ["user"], queryFn: authService.getUser });
  const loggedIn = Boolean(user.data);
  // Puzzles load in the browser only; match the server's empty board until hydrated.
  const hydrated = useHydrated();
  // Puzzles seen in this visit, so "Next puzzle" never repeats one.
  const [seen, setSeen] = useState<string[]>([]);
  const query = useQuery({
    queryKey: ["puzzle", id ?? null, theme ?? null, loggedIn, seen.length],
    queryFn: () =>
      id ? puzzleService.get(id) : puzzleService.next({ exclude: seen, theme, loggedIn }),
    enabled: !user.isPending,
    retry: false,
    staleTime: Infinity,
    refetchOnWindowFocus: false,
  });
  const next = () => {
    const current = query.data?.id;
    if (id) void navigate({ search: theme ? { theme } : {} });
    if (current) setSeen((list) => (list.includes(current) ? list : [...list, current]));
  };
  return (
    <div className="page">
      <div className="page-heading">
        <h1>Puzzles</h1>
        <p>Find the best moves in real game positions, with hints when you need them.</p>
      </div>
      {theme && (
        <p className="puzzle-filter">
          Practising: <strong>{themeLabel(theme)}</strong> ·{" "}
          <Link to="/puzzles" search={{}}>
            All themes
          </Link>
        </p>
      )}
      {hydrated && query.data ? (
        <PuzzleWorkspace key={query.data.id} puzzle={query.data} loggedIn={loggedIn} next={next} />
      ) : (
        <div className="workspace">
          <div className="board-column">
            <div className="board-empty">
              <div className="board-empty-label">
                <PuzzleIcon />
              </div>
            </div>
          </div>
          <aside className="side-panel">
            <div className="puzzle-metadata">
              <div>
                <span>To move</span>
                <strong>—</strong>
              </div>
              <div>
                <span>Theme</span>
                <strong>—</strong>
              </div>
              <div>
                <span>Rating</span>
                <strong>—</strong>
              </div>
            </div>
            <div className="puzzle-buttons">
              <Button variant="outline" disabled>
                <Lightbulb />
                Hint
              </Button>
              <Button variant="outline" disabled>
                <Eye />
                Show solution
              </Button>
              <Button disabled>
                <SkipForward />
                Next puzzle
              </Button>
            </div>
            <EmptyState
              loading={!hydrated || user.isPending || query.isPending}
              error={query.isError}
              title={
                query.isError
                  ? "Puzzles couldn’t load"
                  : id
                    ? "That puzzle isn't available."
                    : theme
                      ? "No more puzzles with this theme right now."
                      : "No puzzles yet. They're on the way."
              }
              description=""
              retry={() => {
                void query.refetch();
              }}
            />
          </aside>
        </div>
      )}
    </div>
  );
}
function PuzzleWorkspace({
  puzzle,
  loggedIn,
  next,
}: {
  puzzle: Puzzle;
  loggedIn: boolean;
  next: () => void;
}) {
  const [game] = useState(() => new Chess(puzzle.fen));
  const [position, setPosition] = useState(game.fen());
  // The solver plays the side that is NOT to move in the stored position,
  // because the opponent's last move is played first.
  const [solverColor] = useState<"white" | "black">(() =>
    game.turn() === "w" ? "black" : "white",
  );
  const [ready, setReady] = useState(false);
  const [index, setIndex] = useState(0);
  const [hint, setHint] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "solution" | null>(null);
  const [busy, setBusy] = useState(true);
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [saveError, setSaveError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Refs, because these are read inside timers that outlive a render.
  const failed = useRef(false);
  const helped = useRef(false);
  const recorded = useRef(false);
  const done = index >= puzzle.solution.length;
  useEffect(() => {
    timer.current = setTimeout(() => {
      uciMove(game, puzzle.setupMove);
      setPosition(game.fen());
      setReady(true);
      setBusy(false);
    }, 600);
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, [game, puzzle.setupMove]);
  const record = (correct: boolean) => {
    if (recorded.current) return;
    recorded.current = true;
    progressService
      .recordAttempt(puzzle, correct, helped.current, loggedIn)
      .then(setResult)
      .catch(() => setSaveError("Progress could not be saved."));
  };
  function play(from: string, to: string, promotion: PieceSymbol = "q") {
    if (busy || done) return false;
    const expected = puzzle.solution[index] ?? "";
    const isLast = index === puzzle.solution.length - 1;
    const move = tryMove(game, from, to, promotion);
    if (!move) return false;
    const uci = from + to + (move.promotion ?? "");
    if (!isAcceptedMove(game, expected, uci, isLast)) {
      game.undo();
      setFeedback("wrong");
      // The first wrong move means the puzzle counts as not solved.
      if (!failed.current) {
        failed.current = true;
        record(false);
      }
      return false;
    }
    setPosition(game.fen());
    setFeedback("correct");
    setHint(0);
    const nextIndex = index + 1;
    if (nextIndex >= puzzle.solution.length) {
      setIndex(nextIndex);
      record(true);
      return true;
    }
    setBusy(true);
    setIndex(nextIndex);
    timer.current = setTimeout(() => {
      uciMove(game, puzzle.solution[nextIndex] ?? "");
      setPosition(game.fen());
      setIndex(nextIndex + 1);
      setBusy(false);
      if (nextIndex + 1 >= puzzle.solution.length) record(true);
    }, 550);
    return true;
  }
  function showHint() {
    helped.current = true;
    setHint(Math.min(hint + 1, 2));
  }
  function solution() {
    if (timer.current) clearTimeout(timer.current);
    helped.current = true;
    record(false);
    setBusy(true);
    setHint(0);
    setFeedback("solution");
    let cursor = index;
    const step = () => {
      const move = puzzle.solution[cursor];
      if (!move) {
        setBusy(false);
        setIndex(cursor);
        return;
      }
      uciMove(game, move);
      setPosition(game.fen());
      cursor++;
      setIndex(cursor);
      timer.current = setTimeout(step, 750);
    };
    step();
  }
  const toMove = game.turn() === "w" ? "White" : "Black";
  return (
    <div className="workspace">
      <div className="board-column">
        <InteractiveBoard
          game={game}
          position={position}
          orientation={solverColor}
          onMove={play}
          disabled={busy || done}
          hintSquare={hint > 1 ? puzzle.solution[index]?.slice(0, 2) : undefined}
        />
        <div className="board-bar">
          <span className="turn-indicator" aria-live="polite">
            {!ready
              ? "Watch the opponent's move"
              : done
                ? "Puzzle complete"
                : `${toMove} to move · Find the best move`}
          </span>
        </div>
      </div>
      <aside className="side-panel">
        <h2 className="panel-title">Puzzle details</h2>
        <div className="puzzle-metadata">
          <div>
            <span>You play</span>
            <strong>{solverColor === "white" ? "White" : "Black"}</strong>
          </div>
          <div>
            <span>Theme</span>
            <strong>{done || feedback === "solution" || hint > 0 ? puzzle.theme : "Hidden"}</strong>
          </div>
          <div>
            <span>Difficulty</span>
            <strong>{puzzle.rating}</strong>
          </div>
        </div>
        <div className="puzzle-buttons">
          <Button variant="outline" disabled={busy || done} onClick={showHint}>
            <Lightbulb />
            Hint
          </Button>
          <Button variant="outline" disabled={busy || done} onClick={solution}>
            <Eye />
            Show solution
          </Button>
          <Button
            disabled={busy && ready}
            onClick={() => {
              // Skipping after a wrong move still counts that attempt.
              if (failed.current) record(false);
              next();
            }}
          >
            <SkipForward />
            Next puzzle
          </Button>
        </div>
        {hint > 0 && !done && (
          <div className="feedback">
            <Lightbulb />
            <span>
              {puzzle.idea}
              {hint > 1 && <p>The piece to move is outlined on the board.</p>}
            </span>
          </div>
        )}
        {feedback && (
          <div className={`feedback ${feedback === "correct" ? "correct" : ""}`} role="status">
            {feedback === "wrong" ? (
              <XCircle />
            ) : feedback === "solution" ? (
              <Eye />
            ) : (
              <CheckCircle2 />
            )}
            <div>
              <strong>
                {feedback === "wrong"
                  ? "Not quite"
                  : feedback === "solution"
                    ? "Solution"
                    : done
                      ? failed.current
                        ? "Completed"
                        : "Solved"
                      : "Correct"}
              </strong>
              <p>
                {feedback === "wrong"
                  ? "That's legal, but it's not the move. Try again, or ask for a hint."
                  : done || feedback === "solution"
                    ? puzzle.explanation
                    : "Keep going."}
              </p>
            </div>
          </div>
        )}
        {result && (
          <p className="rating-change" aria-live="polite">
            {result.rated
              ? `Training rating ${result.rating} (${result.delta >= 0 ? "+" : ""}${result.delta})`
              : "Already tried before, so this one isn't rated."}
            <span>Not an official Elo.{!loggedIn && " Saved in this browser only."}</span>
          </p>
        )}
        {done && puzzle.gameUrl && (
          <a className="game-link" href={puzzle.gameUrl} target="_blank" rel="noreferrer">
            See the game on Lichess
            <ExternalLink />
          </a>
        )}
        {saveError && (
          <div className="feedback" role="alert">
            <XCircle />
            {saveError}
          </div>
        )}
      </aside>
    </div>
  );
}
