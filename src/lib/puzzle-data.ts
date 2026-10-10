import { Chess } from "chess.js";
import { uciMove } from "@/lib/chess-logic";
import { themeInfo } from "@/lib/puzzle-themes";
import type { Puzzle, PuzzleRow } from "@/types/academy";

// Turns a database row (Lichess format) into a puzzle the board can play.
// Returns null when the moves don't form a legal line from the FEN, so a
// broken row is skipped instead of shown.
export function toPuzzle(row: PuzzleRow): Puzzle | null {
  const [setupMove, ...solution] = row.moves;
  if (!setupMove || !solution.length || !isLegalLine(row.fen, row.moves)) return null;
  const solverMoves = Math.ceil(solution.length / 2);
  const info = themeInfo(row.themes, solverMoves);
  return {
    id: row.id,
    fen: row.fen,
    setupMove,
    solution,
    themes: row.themes,
    theme: info.label,
    rating: row.rating,
    idea: info.idea,
    explanation: info.explanation,
    gameUrl: row.game_url,
  };
}

export function isLegalLine(fen: string, moves: string[]): boolean {
  let game: Chess;
  try {
    game = new Chess(fen);
  } catch {
    return false;
  }
  return moves.every((move) => /^[a-h][1-8][a-h][1-8][qrbn]?$/.test(move) && uciMove(game, move));
}

// Lichess accepts any mating move as correct on the last move of a mate
// puzzle, because several moves can mate. Everywhere else only the listed move
// counts.
export function isAcceptedMove(
  game: Chess,
  expected: string,
  played: string,
  isLastMove: boolean,
): boolean {
  if (played === expected) return true;
  return isLastMove && game.isCheckmate();
}
