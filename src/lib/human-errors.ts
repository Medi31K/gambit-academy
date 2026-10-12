import { Chess, type PieceSymbol, type Square } from "chess.js";

// Models the classic human slip: leaving a piece where it can simply be taken.
// Used to make lower-rated opponents lose material the way real beginners do,
// instead of playing random nonsense moves.

export const PIECE_VALUES: Record<PieceSymbol, number> = { p: 1, n: 3, b: 3, r: 5, q: 9, k: 0 };

// The most material the opponent can win with one capture in this position
// (opponent = side to move). A capture on a defended square costs the capturer
// its own piece back.
export function bestCaptureGain(game: Chess): number {
  let best = 0;
  const defender = game.turn() === "w" ? "b" : "w";
  for (const move of game.moves({ verbose: true })) {
    if (!move.captured) continue;
    const victim = PIECE_VALUES[move.captured];
    const after = new Chess(game.fen());
    after.move(move);
    const recapture = after.attackers(move.to as Square, defender).length > 0;
    const gain = victim - (recapture ? PIECE_VALUES[move.piece] : 0);
    if (gain > best) best = gain;
  }
  return best;
}

// Moves that leave material hanging, with how much each one gives away.
// Captures that win material themselves are left out, so a "slip" never
// accidentally turns into a good trade.
export function hangingMoves(fen: string): { uci: string; loss: number }[] {
  const game = new Chess(fen);
  const baseline = bestCaptureGain(flip(game));
  const result: { uci: string; loss: number }[] = [];
  for (const move of game.moves({ verbose: true })) {
    const after = new Chess(fen);
    after.move(move);
    if (after.isCheckmate() || after.isCheck()) continue;
    const gained = move.captured ? PIECE_VALUES[move.captured] : 0;
    const loss = bestCaptureGain(after) - gained - baseline;
    if (loss >= 3) result.push({ uci: move.from + move.to + (move.promotion ?? ""), loss });
  }
  return result;
}

// The same position with the other side to move (for "what is already hanging").
function flip(game: Chess): Chess {
  const parts = game.fen().split(" ");
  parts[1] = parts[1] === "w" ? "b" : "w";
  parts[3] = "-";
  try {
    return new Chess(parts.join(" "));
  } catch {
    // Flipping is impossible when the side to move is in check; nothing is "hanging" then.
    return new Chess("4k3/8/8/8/8/8/8/4K3 w - - 0 1");
  }
}

// Chance per move that a player of this rating leaves a piece hanging.
// Zero from 2000 up; about 1 in 20 moves at 1200; very common below 500.
export function slipChance(rating: number): number {
  if (rating >= 2000) return 0;
  return 0.3 * ((2000 - Math.max(100, rating)) / 1900) ** 2;
}

// Picks a hanging move, preferring the more valuable pieces.
export function pickSlip(
  options: { uci: string; loss: number }[],
  random: () => number,
): string | undefined {
  if (!options.length) return undefined;
  const weights = options.map((option) => option.loss ** 1.5);
  let roll = random() * weights.reduce((sum, value) => sum + value, 0);
  for (let i = 0; i < options.length; i++) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) return options[i]?.uci;
  }
  return options[0]?.uci;
}
