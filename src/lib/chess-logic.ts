import { Chess, type Square, type PieceSymbol } from "chess.js";
export function legalDestinations(game: Chess, from: Square): Square[] {
  return game.moves({ square: from, verbose: true }).map((move) => move.to);
}
export function tryMove(game: Chess, from: string, to: string, promotion: PieceSymbol = "q") {
  try {
    return game.move({ from, to, promotion });
  } catch {
    return null;
  }
}
export function needsPromotion(game: Chess, from: Square, to: string): boolean {
  return game
    .moves({ square: from, verbose: true })
    .some((move) => move.to === to && Boolean(move.promotion));
}
export function gameStatus(game: Chess): string {
  if (game.isCheckmate()) return `Checkmate · ${game.turn() === "w" ? "Black" : "White"} wins`;
  if (game.isStalemate()) return "Draw · Stalemate";
  if (game.isDraw()) return "Draw";
  return `${game.turn() === "w" ? "White" : "Black"} to move${game.isCheck() ? " · Check" : ""}`;
}
export function uciMove(game: Chess, uci: string) {
  return tryMove(
    game,
    uci.slice(0, 2),
    uci.slice(2, 4),
    uci.charAt(4) === "n" ? "n" : uci.charAt(4) === "r" ? "r" : uci.charAt(4) === "b" ? "b" : "q",
  );
}
