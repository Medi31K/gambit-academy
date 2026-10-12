import {
  lazy,
  Suspense,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { SQUARES, type Chess, type Square, type PieceSymbol } from "chess.js";
import { Button } from "@/components/ui/button";
import { legalDestinations, needsPromotion } from "@/lib/chess-logic";
const loadBoard = () => import("react-chessboard");
const Chessboard = lazy(() => loadBoard().then((module) => ({ default: module.Chessboard })));
// Start downloading the board as soon as the app loads in the browser, so it
// doesn't pop in late when a board page opens.
if (typeof window !== "undefined") void loadBoard();
export function InteractiveBoard({
  id = "gambit-board",
  game,
  position,
  orientation = "white",
  onMove,
  disabled = false,
  hintSquare,
  previewOnHover = false,
  arrows = [],
  badge,
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
  /** Arrows drawn by the app, e.g. a hint or a better move. */
  arrows?: { startSquare: string; endSquare: string; color: string }[];
  /** Something to pin to the corner of one square, like a move rating. */
  badge?: { square: string; content: ReactNode } | undefined;
}) {
  const [mounted, setMounted] = useState(false);
  const [selected, setSelected] = useState<Square | null>(null);
  const [hovered, setHovered] = useState<Square | null>(null);
  const [promotion, setPromotion] = useState<{ from: Square; to: string } | null>(null);
  // Squares marked with a right click. Cleared by any left click or move.
  const [marked, setMarked] = useState<string[]>([]);
  // Where the right button went down. Releasing on the same square marks it;
  // releasing elsewhere is an arrow, which the board draws itself.
  const rightDown = useRef<string | null>(null);
  useEffect(() => setMounted(true), []);
  useEffect(() => {
    setSelected(null);
    setHovered(null);
    setPromotion(null);
    setMarked([]);
  }, [position]);
  function select(target: Square) {
    setMarked([]);
    if (disabled) return;
    // Clicking the selected piece again closes its moves.
    if (selected === target) return setSelected(null);
    if (selected && move(selected, target)) return;
    setSelected(game.get(target)?.color === game.turn() ? target : null);
  }
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
  for (const square of marked) {
    squareStyles[square] = {
      ...squareStyles[square],
      boxShadow: "inset 0 0 0 999px var(--board-mark)",
    };
  }
  if (game.isCheck()) {
    const king = SQUARES.find((square) => {
      const piece = game.get(square);
      return piece?.type === "k" && piece.color === game.turn();
    });
    if (king) squareStyles[king] = { backgroundColor: "var(--board-check)" };
  }
  return (
    <div
      className="board-wrapper"
      aria-label="Interactive chessboard"
      onContextMenu={(event) => event.preventDefault()}
    >
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
              // Right-click and drag draws an arrow; a plain right click marks a square.
              allowDrawingArrows: true,
              arrows,
              clearArrowsOnClick: true,
              // Hold Shift, Ctrl or Alt while dragging for a different colour.
              arrowOptions: {
                colors: {
                  default: "#c2702f",
                  shift: "#4f8a5b",
                  ctrl: "#b03a3a",
                  alt: "#3f6fa8",
                  meta: "#b03a3a",
                },
                color: "#c2702f",
                secondaryColor: "#4f8a5b",
                tertiaryColor: "#b03a3a",
                arrowLengthReducerDenominator: 8,
                sameTargetArrowLengthReducerDenominator: 4,
                arrowWidthDenominator: 5,
                activeArrowWidthMultiplier: 0.9,
                opacity: 0.8,
                activeOpacity: 0.5,
                arrowStartOffset: 0,
              },
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
                if (target) select(target);
              },
              squareRenderer: ({ square, children }) => (
                <div
                  className="h-full w-full"
                  // react-chessboard skips `squareStyles` when a custom renderer is used,
                  // so highlights and legal-move dots are applied here.
                  style={{ ...squareStyles[square], position: "relative" }}
                  onMouseDown={(event) => {
                    if (event.button === 2) rightDown.current = square;
                  }}
                  onMouseUp={(event) => {
                    if (event.button !== 2) return;
                    if (rightDown.current === square) {
                      setMarked((list) =>
                        list.includes(square)
                          ? list.filter((s) => s !== square)
                          : [...list, square],
                      );
                    }
                    rightDown.current = null;
                  }}
                  role="button"
                  tabIndex={disabled ? -1 : 0}
                  aria-label={`${square}${game.get(SQUARES.find((s) => s === square) ?? "a1") ? " occupied" : ""}`}
                  onKeyDown={(event) => {
                    if (event.key !== "Enter" && event.key !== " ") return;
                    event.preventDefault();
                    const target = SQUARES.find((s) => s === square);
                    if (target) select(target);
                  }}
                >
                  {children}
                  {badge?.square === square && (
                    <span className="board-badge" aria-hidden="true">
                      {badge.content}
                    </span>
                  )}
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
