import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { ArrowDownUp, ArrowRight, RotateCcw, Undo2, XCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractiveBoard } from "@/components/chess/interactive-board";
import { useChessGame } from "@/hooks/use-chess-game";
import { gameStatus, tryMove } from "@/lib/chess-logic";
import { pageHead } from "@/lib/metadata";
export const Route = createFileRoute("/practice")({
  head: () =>
    pageHead("Practice board", "A free chessboard with legal moves, undo, and move history."),
  component: Practice,
});
function Practice() {
  const { game, position, sync, undo, reset } = useChessGame();
  const [flipped, setFlipped] = useState(false);
  const [notation, setNotation] = useState("");
  const [error, setError] = useState("");
  const history = game.history();
  return (
    <div className="page">
      <div className="page-heading">
        <h1>Practice board</h1>
      </div>
      <div className="workspace">
        <div className="board-column">
          <InteractiveBoard
            game={game}
            position={position}
            orientation={flipped ? "black" : "white"}
            onMove={(from, to, promotion) => {
              const result = tryMove(game, from, to, promotion);
              if (result) {
                sync();
                setError("");
              }
              return Boolean(result);
            }}
          />
          <div className="board-bar">
            <div className="turn-indicator" aria-live="polite">
              <span className={`turn-dot ${game.turn() === "b" ? "black" : ""}`} />
              {gameStatus(game)}
            </div>
            <div className="board-tools">
              <Button
                variant="ghost"
                size="icon"
                title="Undo move"
                aria-label="Undo move"
                disabled={!history.length}
                onClick={() => {
                  undo();
                  setError("");
                }}
              >
                <Undo2 />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Flip board"
                aria-label="Flip board"
                onClick={() => setFlipped(!flipped)}
              >
                <ArrowDownUp />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                title="Reset board"
                aria-label="Reset board"
                onClick={() => {
                  reset();
                  setError("");
                }}
              >
                <RotateCcw />
              </Button>
            </div>
          </div>
        </div>
        <aside className="side-panel">
          <div className="panel-section mt-6">
            <h3 className="panel-label">Move list</h3>
            {history.length ? (
              <div className="move-list" aria-label="Move history">
                {Array.from({ length: Math.ceil(history.length / 2) }, (_, index) => (
                  <div className="contents" key={index}>
                    <span className="move-number">{index + 1}.</span>
                    <span className="move-entry">{history[index * 2]}</span>
                    <span className="move-entry">{history[index * 2 + 1] ?? "—"}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="panel-empty">No moves yet.</div>
            )}
          </div>
          <div className="panel-section">
            <h3 className="panel-label">Play a move</h3>
            <form
              className="legal-input"
              onSubmit={(event) => {
                event.preventDefault();
                try {
                  game.move(notation.trim());
                  sync();
                  setNotation("");
                  setError("");
                } catch {
                  setError("Illegal move.");
                }
              }}
            >
              <input
                className="field"
                aria-label="Move in standard notation"
                placeholder="e.g. e4 or Nf3"
                value={notation}
                onChange={(event) => setNotation(event.target.value)}
              />
              <Button variant="outline" size="icon" aria-label="Play move" type="submit">
                <ArrowRight />
              </Button>
            </form>
            {error && (
              <div className="feedback" role="alert">
                <XCircle />
                {error}
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
