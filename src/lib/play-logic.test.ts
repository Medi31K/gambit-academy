import { describe, expect, it } from "vitest";
import { parseSearch } from "./engine";
import { isSacrifice, moveAccuracy, reviewMove, winChance } from "./move-quality";
import { botSettings, pickWeighted } from "./bots";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";

describe("engine output parsing", () => {
  it("keeps the deepest line per MultiPV slot", () => {
    const result = parseSearch([
      "info depth 10 multipv 1 score cp 30 pv e2e4 e7e5",
      "info depth 10 multipv 2 score cp 20 pv d2d4",
      "info depth 12 multipv 1 score cp 35 pv d2d4 d7d5",
      "info depth 12 multipv 2 score mate -3 pv a2a3",
      "bestmove d2d4 ponder d7d5",
    ]);
    expect(result.best).toBe("d2d4");
    expect(result.lines[0]).toEqual({ move: "d2d4", cp: 35, pv: ["d2d4", "d7d5"] });
    expect(result.lines[1]?.mate).toBe(-3);
  });
});

describe("move quality", () => {
  it("maps scores to winning chances", () => {
    expect(winChance({ cp: 0 })).toBe(0);
    expect(winChance({ mate: 2 })).toBe(1);
    expect(winChance({ cp: 300 })).toBeGreaterThan(0.5);
  });
  it("gives full accuracy for no loss and less for a big drop", () => {
    expect(moveAccuracy(0.2, 0.2)).toBeCloseTo(100, 0);
    expect(moveAccuracy(0.5, -0.5)).toBeLessThan(20);
  });
  it("calls the engine's own move best", () => {
    const before = { best: "e2e4", lines: [{ move: "e2e4", cp: 30, pv: ["e2e4"] }] };
    const after = { best: "e7e5", lines: [{ move: "e7e5", cp: -30, pv: ["e7e5"] }] };
    expect(reviewMove(START, "e2e4", before, after).label).toBe("best");
  });
  it("calls a move that hangs the queen a blunder and names the capture", () => {
    const fen = "4k3/8/8/3p4/8/8/8/2Q1K3 w - - 0 1";
    const before = { best: "c1h6", lines: [{ move: "c1h6", cp: 800, pv: ["c1h6"] }] };
    const after = { best: "d5c4", lines: [{ move: "d5c4", cp: 900, pv: ["d5c4"] }] };
    const review = reviewMove(fen, "c1c4", before, after);
    expect(review.label).toBe("blunder");
    expect(review.comment).toContain("you lose your queen");
    expect(review.better?.san).toBe("Qh6");
  });
  it("spots a piece left where it can be taken", () => {
    // White rook to a square attacked by a pawn.
    expect(isSacrifice("4k3/8/3p4/8/8/8/8/2R1K3 w - - 0 1", "c1c5")).toBe(true);
    expect(isSacrifice("4k3/8/3p4/8/8/8/8/2R1K3 w - - 0 1", "c1c4")).toBe(false);
  });
});

describe("bots", () => {
  it("uses Stockfish's strength limit from 1320 up", () => {
    expect(botSettings(2000).options).toMatchObject({ UCI_LimitStrength: true, UCI_Elo: 2000 });
    expect(botSettings(2800).randomChance).toBe(0);
  });
  it("makes weaker bots search shallowly and play random moves more often", () => {
    expect(botSettings(250).depth).toBe(1);
    expect(botSettings(250).randomChance).toBeGreaterThan(botSettings(1100).randomChance);
  });
  it("picks the best candidate most of the time", () => {
    expect(pickWeighted(["a", "b", "c"], () => 0)).toBe("a");
    expect(pickWeighted(["a", "b", "c"], () => 0.99)).toBe("c");
  });
});
