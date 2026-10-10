import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useRef, useState } from "react";
import { Chess, type PieceSymbol } from "chess.js";
import {
  CheckCircle2,
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
import { pageHead } from "@/lib/metadata";
import { tryMove, uciMove } from "@/lib/chess-logic";
import type { Puzzle } from "@/types/academy";
export const Route = createFileRoute("/puzzles")({
  head: () => pageHead("Puzzles", "Free chess puzzles with hints and solutions."),
  component: Puzzles,
});
function Puzzles() {
  const [exclude, setExclude] = useState<string>();
  const query = useQuery({
    queryKey: ["puzzle", exclude],
    queryFn: () => puzzleService.next(exclude),
    retry: false,
  });
  return (
    <div className="page">
      <div className="page-heading">
        <h1>Puzzles</h1>
        <p>Find the best moves in real game positions, with hints when you need them.</p>
      </div>
      {query.data ? (
        <PuzzleWorkspace
          key={query.data.id}
          puzzle={query.data}
          next={() => {
            if (exclude === query.data?.id) void query.refetch();
            else setExclude(query.data?.id);
          }}
        />
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
              loading={query.isLoading}
              error={query.isError}
              title={
                query.isError ? "Puzzles couldn’t load" : "No puzzles yet. They're on the way."
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
function PuzzleWorkspace({ puzzle, next }: { puzzle: Puzzle; next: () => void }) {
  const [game] = useState(() => new Chess(puzzle.fen));
  const [position, setPosition] = useState(game.fen());
  const [index, setIndex] = useState(0);
  const [hint, setHint] = useState(0);
  const [feedback, setFeedback] = useState<"correct" | "wrong" | "solution" | null>(null);
  const [busy, setBusy] = useState(false);
  const [attemptedWrong, setAttemptedWrong] = useState(false);
  const [saveError, setSaveError] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );
  const record = (correct: boolean) => {
    void progressService
      .recordAttempt(puzzle.id, correct)
      .catch(() => setSaveError("Progress could not be saved."));
  };
  function play(from: string, to: string, promotion: PieceSymbol = "q") {
    if (busy || index >= puzzle.solution.length) return false;
    const expected = puzzle.solution[index];
    const result = tryMove(game, from, to, promotion);
    if (!result) return false;
    const uci = from + to + (result.promotion ?? "");
    if (uci !== expected) {
      game.undo();
      setFeedback("wrong");
      setAttemptedWrong(true);
      return false;
    }
    setPosition(game.fen());
    setFeedback("correct");
    setHint(0);
    const nextIndex = index + 1;
    if (nextIndex >= puzzle.solution.length) {
      setIndex(nextIndex);
      record(!attemptedWrong);
      return true;
    }
    setBusy(true);
    setIndex(nextIndex);
    timer.current = setTimeout(() => {
      const reply = puzzle.solution[nextIndex];
      if (reply) {
        uciMove(game, reply);
        setPosition(game.fen());
      }
      setIndex(nextIndex + 1);
      setBusy(false);
      if (nextIndex + 1 >= puzzle.solution.length) record(!attemptedWrong);
    }, 550);
    return true;
  }
  function solution() {
    if (timer.current) clearTimeout(timer.current);
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
    record(false);
  }
  return (
    <div className="workspace">
      <div className="board-column">
        <InteractiveBoard
          game={game}
          position={position}
          orientation={new Chess(puzzle.fen).turn() === "w" ? "white" : "black"}
          onMove={play}
          disabled={busy || index >= puzzle.solution.length}
          hintSquare={hint > 1 ? puzzle.solution[index]?.slice(0, 2) : undefined}
        />
        <div className="board-bar">
          <span className="turn-indicator" aria-live="polite">
            {index >= puzzle.solution.length
              ? "Puzzle complete"
              : `${game.turn() === "w" ? "White" : "Black"} to move`}
          </span>
        </div>
      </div>
      <aside className="side-panel">
        <h2 className="panel-title">Puzzle details</h2>
        <div className="puzzle-metadata">
          <div>
            <span>To move</span>
            <strong>{game.turn() === "w" ? "White" : "Black"}</strong>
          </div>
          <div>
            <span>Theme</span>
            <strong>{puzzle.theme}</strong>
          </div>
          <div>
            <span>Difficulty</span>
            <strong>{puzzle.rating}</strong>
          </div>
        </div>
        <div className="puzzle-buttons">
          <Button
            variant="outline"
            disabled={busy || index >= puzzle.solution.length}
            onClick={() => setHint(Math.min(hint + 1, 2))}
          >
            <Lightbulb />
            Hint
          </Button>
          <Button
            variant="outline"
            disabled={busy || index >= puzzle.solution.length}
            onClick={solution}
          >
            <Eye />
            Show solution
          </Button>
          <Button disabled={busy} onClick={next}>
            <SkipForward />
            Next puzzle
          </Button>
        </div>
        {hint > 0 && (
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
                    : "Correct"}
              </strong>
              <p>
                {feedback === "wrong"
                  ? "Legal move, but not the solution."
                  : index >= puzzle.solution.length || feedback === "solution"
                    ? puzzle.explanation
                    : "Continue the solution."}
              </p>
            </div>
          </div>
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
