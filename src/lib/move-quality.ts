import { Chess, type PieceSymbol, type Square } from "chess.js";
import { uciMove } from "@/lib/chess-logic";
import type { Analysis, EngineLine } from "@/lib/engine";

// Rates a player's move by how much it changed their winning chances,
// according to the engine. Labels follow the standard chess annotation
// symbols (!!, !, ?!, ?, ??). Comments only state what the engine lines show.

export type MoveLabel =
  | "brilliant"
  | "great"
  | "book"
  | "best"
  | "excellent"
  | "good"
  | "inaccuracy"
  | "mistake"
  | "miss"
  | "blunder";

// In display order, best first. `symbol` is the text form, for places that
// can't show the icon.
export const LABELS: Record<MoveLabel, { name: string; symbol: string }> = {
  brilliant: { name: "Brilliant", symbol: "!!" },
  great: { name: "Great", symbol: "!" },
  book: { name: "Book", symbol: "📖" },
  best: { name: "Best", symbol: "★" },
  excellent: { name: "Excellent", symbol: "👍" },
  good: { name: "Good", symbol: "✓" },
  inaccuracy: { name: "Inaccuracy", symbol: "?!" },
  mistake: { name: "Mistake", symbol: "?" },
  miss: { name: "Miss", symbol: "✗" },
  blunder: { name: "Blunder", symbol: "??" },
};

export const LABEL_ORDER = Object.keys(LABELS) as MoveLabel[];

export interface MoveReview {
  label: MoveLabel;
  comment: string;
  // The engine's preferred move in UCI and SAN, when the player chose another.
  better?: { uci: string; san: string } | undefined;
  accuracy: number;
}

const VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 100 };
const NAMES: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

// Winning chances from -1 (lost) to 1 (won), for the side the score belongs to.
// Same curve Lichess uses for its analysis.
export function winChance(line: Pick<EngineLine, "cp" | "mate"> | undefined): number {
  if (!line) return 0;
  if (line.mate !== undefined) return line.mate > 0 ? 1 : -1;
  const cp = Math.max(-1000, Math.min(1000, line.cp ?? 0));
  return 2 / (1 + Math.exp(-0.00368208 * cp)) - 1;
}

// 0 to 100 for one move, from the drop in winning percentage.
export function moveAccuracy(before: number, after: number): number {
  const drop = Math.max(0, (before - after) * 50);
  const value = 103.1668 * Math.exp(-0.04354 * drop) - 3.1669;
  return Math.max(0, Math.min(100, value));
}

function san(fen: string, uci: string): string {
  const game = new Chess(fen);
  return uciMove(game, uci)?.san ?? uci;
}

// True when the moved piece (not a pawn or king) can be taken and the player
// would lose material on that square.
export function isSacrifice(fen: string, uci: string): boolean {
  const game = new Chess(fen);
  const move = uciMove(game, uci);
  if (!move || move.piece === "p" || move.piece === "k") return false;
  const to = move.to as Square;
  const enemy = game.turn();
  const attackers = game.attackers(to, enemy);
  if (!attackers.length) return false;
  const gained = move.captured ? VALUES[move.captured] : 0;
  const cheapest = Math.min(...attackers.map((square) => VALUES[game.get(square)?.type ?? "k"]));
  const defended = game.attackers(to, enemy === "w" ? "b" : "w").length > 0;
  const value = VALUES[move.promotion ?? move.piece];
  return defended ? cheapest < value - gained : value > gained;
}

// `opening` is the name of the known opening the move reaches, if any; such a
// move is a book move whatever the engine thinks of it.
export function reviewMove(
  fenBefore: string,
  played: string,
  before: Analysis,
  after: Analysis,
  opening?: string | null,
): MoveReview {
  const top = before.lines[0];
  const wcBefore = winChance(top);
  // `after` is from the opponent's side, so flip it.
  const reply = after.lines[0];
  const wcAfter = reply ? -winChance(reply) : 0;
  const drop = Math.max(0, wcBefore - wcAfter);
  const accuracy = moveAccuracy(wcBefore, wcAfter);
  const bestUci = before.best || top?.move || "";
  const isBest = played === bestUci || drop <= 0.01;
  const fenAfter = (() => {
    const game = new Chess(fenBefore);
    uciMove(game, played);
    return game.fen();
  })();
  const better =
    bestUci && played !== bestUci ? { uci: bestUci, san: san(fenBefore, bestUci) } : undefined;
  const replySan = reply?.move ? san(fenAfter, reply.move) : "";
  const playedMove = uciMove(new Chess(fenBefore), played);
  const bestMove = better ? uciMove(new Chess(fenBefore), better.uci) : null;
  // The engine wanted to capture something valuable and the player didn't.
  const missedCapture =
    bestMove?.captured && VALUES[bestMove.captured] >= 3 && playedMove?.to !== bestMove.to
      ? `You missed ${bestMove.san}, taking the ${NAMES[bestMove.captured]} on ${bestMove.to}.`
      : "";
  const missedMate = !isBest && top?.mate !== undefined && top.mate > 0 ? top.mate : 0;

  let label: MoveLabel;
  if (opening) label = "book";
  // A chance to win material or mate went begging, but the move itself doesn't
  // leave the player worse off.
  else if (drop >= 0.2 && wcAfter > -0.2 && (missedMate || missedCapture)) label = "miss";
  else if (drop >= 0.3) label = "blunder";
  else if (drop >= 0.2) label = "mistake";
  else if (drop >= 0.1) label = "inaccuracy";
  else if (isBest) {
    const second = before.lines[1];
    if (isSacrifice(fenBefore, played) && wcAfter > -0.1 && wcBefore < 0.85) label = "brilliant";
    // Taking a loose piece is the best move, but hardly a great find.
    else if (
      second &&
      !playedMove?.captured &&
      wcBefore - winChance(second) >= 0.25 &&
      wcBefore < 0.9
    )
      label = "great";
    else label = "best";
  } else label = drop < 0.04 ? "excellent" : "good";

  return {
    label,
    comment: comment(),
    better: isBest || label === "book" ? undefined : better,
    accuracy,
  };

  function comment(): string {
    const missed = missedCapture;
    const mateFor = reply?.mate !== undefined && reply.mate < 0 ? -reply.mate : 0;
    const mateAgainst = reply?.mate !== undefined && reply.mate > 0 ? reply.mate : 0;
    switch (label) {
      case "book":
        return `A book move from the ${opening}.`;
      case "miss":
        return missedMate
          ? `You missed a forced mate in ${missedMate}, starting with ${better?.san ?? "another move"}.`
          : missed;
      case "brilliant":
        return "A sacrifice, and the best move on the board. Giving up material here pays off.";
      case "great":
        return "The only good move in the position. Every other option was clearly worse.";
      case "best":
        if (mateFor) return `The best move. You have a forced mate in ${mateFor}.`;
        if (playedMove?.captured && VALUES[playedMove.captured] >= 3)
          return `Good, you took the ${NAMES[playedMove.captured]}. That's the best move here.`;
        return "That's the best move here.";
      case "excellent":
        return "Very close to the best move.";
      case "good":
        return (
          missed || `A reasonable move. ${better?.san ?? "Another move"} was a little stronger.`
        );
      default: {
        const lead = label === "blunder" ? "Ouch." : label === "mistake" ? "Careful." : "Hmm.";
        let why = "";
        if (mateAgainst) why = `It allows ${replySan} and mate in ${mateAgainst}.`;
        else if (replySan) {
          const game = new Chess(fenAfter);
          const move = reply ? uciMove(game, reply.move) : null;
          why = move?.captured
            ? `After ${replySan}, you lose your ${NAMES[move.captured]}.`
            : `${replySan} is a strong answer.`;
        }
        if (missed && !mateAgainst) return `${lead} ${missed}`;
        const instead = better ? ` ${better.san} was better.` : "";
        return `${lead} ${why}${instead}`.trim();
      }
    }
  }
}
