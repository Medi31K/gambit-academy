import { lazy, Suspense, useEffect, useState, type CSSProperties } from "react";
import { SQUARES, type Chess, type Square, type PieceSymbol } from "chess.js";
import { Button } from "@/components/ui/button";
import { legalDestinations, needsPromotion } from "@/lib/chess-logic";
const Chessboard = lazy(() =>
  import("react-chessboard").then((module) => ({ default: module.Chessboard })),
);
export function InteractiveBoard({
  id = "gambit-board",
  game,
  position,
  orientation = "white",
  onMove,
  disabled = false,
  hintSquare,
  previewOnHover = false,
}: {
  id?: string;
  game: Chess;
  position: string;
  orientation?: "white" | "black";
  onMove: (from: string, to: string, promotion?: PieceSymbol) => boolean;
  disabled?: boolean;
  hintSquare?: string | undefined;
  /** Show a piece's legal moves while the pointer rests on it, before it is selected. */
  previewOnHover?: boolean;
}) {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<Square | null>(null);
  const [hovered, setHovered] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: string } | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setSelected(null);
    setHovered(null);
    setPromotion(null);
  }, [position]);
  function move(from: Square, to: string) {
    if (disabled) return false;
    if (needsPromotion(game, from, to)) {
      setPromotion({ from, to });
      return false;
    }
    const result = onMove(from, to);
    if (result) setSelected(null);
    return result;
  }
  const squareStyles: Record<string, CSSProperties> = {};
  const last = game.history({ verbose: true }).at(-1);
  if (last) {
    squareStyles[last.from] = { backgroundColor: "var(--board-last)" };
    squareStyles[last.to] = { backgroundColor: "var(--board-last)" };
  }
  if (hintSquare) squareStyles[hintSquare] = { boxShadow: "inset 0 0 0 5px var(--primary)" };
  const focus = selected ?? (previewOnHover && !disabled ? hovered : null);
  if (focus) {
    if (selected) squareStyles[selected] = { backgroundColor: "var(--board-selected)" };
    else squareStyles[focus] = { boxShadow: "inset 0 0 0 3px var(--board-selected)" };
    legalDestinations(game, focus).forEach((square) => {
      squareStyles[square] = {
        ...squareStyles[square],
        backgroundImage: game.get(square)
          ? "radial-gradient(transparent 60%, var(--board-dot) 61%)"
          : "radial-gradient(var(--board-dot) 20%, transparent 21%)",
      };
    });
  }
  if (game.isCheck()) {
    const king = SQUARES.find((square) => {
      const piece = game.get(square);
      return piece?.type === "k" && piece.color === game.turn();
    });
    if (king) squareStyles[king] = { backgroundColor: "var(--board-check)" };
  }
  return (
    <div className="board-wrapper" aria-label="Interactive chessboard">
      <Suspense fallback={<div className="board-loading">Loading board…</div>}>
        {mounted && (
          <Chessboard
            options={{
              id,
              position,
              boardOrientation: orientation,
              darkSquareStyle: { backgroundColor: "var(--board-dark)" },
              lightSquareStyle: { backgroundColor: "var(--board-light)" },
              squareStyles,
              squareStyle: { touchAction: "none" },
              lightSquareNotationStyle: { color: "var(--hero-ink)", fontSize: "11px" },
              darkSquareNotationStyle: { color: "var(--hero-ink)", fontSize: "11px" },
              animationDurationInMs: window.matchMedia("(prefers-reduced-motion: reduce)").matches
                ? 0
                : 180,
              allowDragging: !disabled,
              canDragPiece: ({ piece }) => piece.pieceType.charAt(0) === game.turn(),
              allowDrawingArrows: false,
              onMouseOverSquare: ({ square }) => {
                if (!previewOnHover) return;
                const target = SQUARES.find((s) => s === square);
                setHovered(target && game.get(target)?.color === game.turn() ? target : null);
              },
              onMouseOutSquare: () => {
                if (previewOnHover) setHovered(null);
              },
              onPieceDrop: ({ sourceSquare, targetSquare }) => {
                const from = SQUARES.find((s) => s === sourceSquare);
                return from && targetSquare ? move(from, targetSquare) : false;
              },
              onSquareClick: ({ square }) => {
                const target = SQUARES.find((s) => s === square);
                if (!target || disabled) return;
                if (selected && selected !== target && move(selected, target)) return;
                if (game.get(target)?.color === game.turn()) setSelected(target);
                else setSelected(null);
              },
              squareRenderer: ({ square, children }) => (
                <div
                  className="h-full w-full"
                  // react-chessboard skips `squareStyles` when a custom renderer is used,
                  // so highlights and legal-move dots are applied here.
                  style={squareStyles[square]}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label={`${square}${game.get(SQUARES.find((s) => s === square) ?? "a1") ? " occupied" : ""}`}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    const target = SQUARES.find((s) => s === square);
                    if (!target || disabled) return;
                    if (selected && selected !== target && move(selected, target)) return;
                    setSelected(game.get(target)?.color === game.turn() ? target : null);
                  }}
                >
                  {children}
                </div>
              ),
            }}
          />
        )}
      </Suspense>
      {promotion && (
        <div className="promotion-picker" role="dialog" aria-modal="true" aria-label="Promote pawn">
          <h2>Promote pawn</h2>
          <div className="promotion-options">
            {(["q", "r", "b", "n"] as const).map((piece, index) => (
              <Button
                key={piece}
                autoFocus={index === 0}
                variant="outline"
                onClick={() => {
                  onMove(promotion.from, promotion.to, piece);
                  setPromotion(null);
                  setSelected(null);
                }}
              >
                {{ q: "Queen", r: "Rook", b: "Bishop", n: "Knight" }[piece]}
              </Button>
            ))}
          </div>
          <Button variant="ghost" onClick={() => setPromotion(null)}>
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
}
