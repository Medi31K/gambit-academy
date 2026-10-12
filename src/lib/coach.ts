import { Chess, type PieceSymbol, type Square } from "chess.js";
import { uciMove } from "@/lib/chess-logic";
import { PIECE_VALUES } from "@/lib/human-errors";

// The coach you play against: one character at a level you choose.
// Everything she says about a move is worked out from the position itself.

export const COACH_NAME = "Mira";

export interface CoachLevel {
  id: string;
  label: string;
  rating: number;
}

export const COACH_LEVELS: CoachLevel[] = [
  { id: "first-steps", label: "First steps", rating: 100 },
  { id: "beginner", label: "Beginner", rating: 400 },
  { id: "improver", label: "Improver", rating: 700 },
  { id: "club", label: "Club player", rating: 1000 },
  { id: "strong-club", label: "Strong club player", rating: 1300 },
  { id: "advanced", label: "Advanced", rating: 1600 },
  { id: "expert", label: "Expert", rating: 2000 },
  { id: "master", label: "Master", rating: 2400 },
  { id: "grandmaster", label: "Grandmaster", rating: 2800 },
];

export type CoachStyle = "casual" | "balanced" | "challenging";

export const COACH_STYLES: Record<CoachStyle, { label: string; text: string; offset: number }> = {
  casual: { label: "Casual", text: "An easier game so you can focus on learning.", offset: -250 },
  balanced: { label: "Balanced", text: "An even match at your level.", offset: 0 },
  challenging: { label: "Challenging", text: "A tougher game that pushes you.", offset: 250 },
};

export function coachRating(level: CoachLevel, style: CoachStyle): number {
  return Math.max(100, Math.min(3000, level.rating + COACH_STYLES[style].offset));
}

const NAMES: Record<PieceSymbol, string> = {
  p: "pawn",
  n: "knight",
  b: "bishop",
  r: "rook",
  q: "queen",
  k: "king",
};

export function greeting(level: CoachLevel): string {
  if (level.rating <= 400)
    return `Hi, I'm ${COACH_NAME}! Let's play a relaxed game. I'll tell you what I think of your moves as we go.`;
  if (level.rating >= 2000)
    return `Hi, I'm ${COACH_NAME}. At this level I won't give much away, but I'll still explain what's happening.`;
  return `Hi, I'm ${COACH_NAME}! I'd love to play a friendly game. I'll comment on your moves and tell you what I'm planning.`;
}

export function openingLine(side: "w" | "b"): string {
  return side === "w"
    ? "You have White, so you go first. Good luck!"
    : "I'll start with White. Take your time with your moves.";
}

// What the coach says about her own move. Only facts the board shows.
export function describeOwnMove(fenBefore: string, uci: string): string {
  const game = new Chess(fenBefore);
  const move = uciMove(game, uci);
  if (!move) return "";
  if (game.isCheckmate()) return "Checkmate. Good game! Want to try again?";
  if (game.isStalemate()) return "Stalemate, so it's a draw.";
  if (move.isKingsideCastle() || move.isQueensideCastle())
    return "I'm castling to tuck my king away safely.";
  if (game.isCheck()) return "Check! Your king has to deal with that first.";
  const threat = mainThreat(game, move.to as Square);
  if (move.captured) {
    return threat
      ? `I'll take your ${NAMES[move.captured]}, and now your ${threat.name} on ${threat.square} is under attack too.`
      : `I'll take your ${NAMES[move.captured]}.`;
  }
  if (move.promotion) return `My pawn becomes a ${NAMES[move.promotion]}!`;
  if (threat) return `Watch out: I'm attacking your ${threat.name} on ${threat.square}.`;
  const moveNumber = Number(fenBefore.split(" ")[5] ?? 1);
  const backRank = move.color === "w" ? "1" : "8";
  if (moveNumber <= 12 && (move.piece === "n" || move.piece === "b") && move.from[1] === backRank)
    return `Bringing my ${NAMES[move.piece]} into the game.`;
  if (moveNumber <= 6 && move.piece === "p" && ["d", "e"].includes(move.to[0] ?? ""))
    return "Taking some space in the centre.";
  return "Your move.";
}

// A piece of the player's that the coach's moved piece now attacks and that
// is either undefended or worth more than the attacker.
function mainThreat(game: Chess, from: Square): { name: string; square: string } | null {
  const attacker = game.get(from);
  if (!attacker) return null;
  const victimColor = game.turn();
  let best: { name: string; square: string; value: number } | null = null;
  // Look at what the piece would attack if it were its turn again.
  const parts = game.fen().split(" ");
  parts[1] = attacker.color;
  parts[3] = "-";
  let probe: Chess;
  try {
    probe = new Chess(parts.join(" "));
  } catch {
    return null;
  }
  for (const target of probe.moves({ square: from, verbose: true })) {
    if (!target.captured || target.captured === "k") continue;
    const value = PIECE_VALUES[target.captured];
    const defended = game.attackers(target.to as Square, victimColor).length > 0;
    if (defended && value <= PIECE_VALUES[attacker.type]) continue;
    if (!best || value > best.value)
      best = { name: NAMES[target.captured], square: target.to, value };
  }
  return best ? { name: best.name, square: best.square } : null;
}
