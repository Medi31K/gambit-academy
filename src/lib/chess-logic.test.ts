import { describe, expect, it } from "vitest";
import { Chess } from "chess.js";
import { gameStatus, legalDestinations, needsPromotion, tryMove, uciMove } from "./chess-logic";
describe("Practice chess rules", () => {
  it("rejects illegal moves without changing the board", () => {
    const game = new Chess();
    const before = game.fen();
    expect(tryMove(game, "e2", "e5")).toBeNull();
    expect(game.fen()).toBe(before);
  });
  it("provides legal destinations and standard notation", () => {
    const game = new Chess();
    expect(legalDestinations(game, "e2")).toEqual(["e3", "e4"]);
    expect(tryMove(game, "g1", "f3")?.san).toBe("Nf3");
    expect(game.turn()).toBe("b");
  });
  it("allows castling through legal game play", () => {
    const game = new Chess();
    ["e4", "e5", "Nf3", "Nc6", "Bc4", "Nf6"].forEach((move) => game.move(move));
    expect(tryMove(game, "e1", "g1")?.san).toBe("O-O");
    expect(game.get("f1")?.type).toBe("r");
  });
  it("captures en passant", () => {
    const game = new Chess();
    ["e4", "a6", "e5", "d5"].forEach((move) => game.move(move));
    expect(tryMove(game, "e5", "d6")?.isEnPassant()).toBe(true);
    expect(game.get("d5")).toBeUndefined();
  });
  it("detects checkmate and prevents further moves", () => {
    const game = new Chess();
    ["f3", "e5", "g4", "Qh4#"].forEach((move) => game.move(move));
    expect(gameStatus(game)).toBe("Checkmate · Black wins");
    expect(tryMove(game, "e2", "e3")).toBeNull();
  });
  it("supports undo and reset", () => {
    const game = new Chess();
    const start = game.fen();
    game.move("e4");
    game.undo();
    expect(game.fen()).toBe(start);
    game.move("d4");
    game.reset();
    expect(game.history()).toEqual([]);
    expect(game.fen()).toBe(start);
  });
  it("supports all four promotion choices after a legal game", () => {
    const moves = ["a4", "h5", "a5", "h4", "a6", "h3", "axb7", "hxg2"];
    for (const piece of ["q", "r", "b", "n"] as const) {
      const game = new Chess();
      moves.forEach((move) => game.move(move));
      expect(needsPromotion(game, "b7", "a8")).toBe(true);
      expect(tryMove(game, "b7", "a8", piece)?.promotion).toBe(piece);
      expect(game.get("a8")?.type).toBe(piece);
    }
  });
  it("plays UCI continuations using the rules engine", () => {
    const game = new Chess();
    expect(uciMove(game, "e2e4")?.san).toBe("e4");
    expect(uciMove(game, "e7e5")?.san).toBe("e5");
  });
});
