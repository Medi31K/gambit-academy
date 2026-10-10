import { describe, expect, it, beforeEach } from "vitest";
import { Chess } from "chess.js";
import { nextRating, START_RATING } from "./training-rating";
import { isAcceptedMove, isLegalLine, toPuzzle } from "./puzzle-data";
import { primaryTheme, themeInfo, themeLabel } from "./puzzle-themes";
import { guestProgress } from "./guest-progress";
import { validatePuzzle } from "@/services/adminService";

// Real row 00008 from the Lichess puzzle database (CC0).
const ROW = {
  id: "00008",
  fen: "r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24",
  moves: ["f2g3", "e6e7", "b2b1", "b3c1", "b1c1", "h6c1"],
  rating: 1913,
  themes: ["crushing", "hangingPiece", "long", "middlegame"],
  game_url: "https://lichess.org/787zsVup/black#47",
};

describe("training rating", () => {
  it("moves up on a solve and down on a miss, by the same amount at equal ratings", () => {
    expect(nextRating(1200, 0, 1200, true)).toBe(1220);
    expect(nextRating(1200, 0, 1200, false)).toBe(1180);
  });
  it("uses a smaller step after 20 rated puzzles", () => {
    expect(nextRating(1200, 20, 1200, true)).toBe(1210);
  });
  it("gains little for an easy puzzle and loses a lot for missing it", () => {
    expect(nextRating(1500, 30, 1000, true)).toBe(1501);
    expect(nextRating(1500, 30, 1000, false)).toBe(1481);
  });
  it("stays between 400 and 3200", () => {
    expect(nextRating(400, 30, 400, false)).toBe(400);
    expect(nextRating(3200, 30, 3200, true)).toBe(3200);
  });
});

describe("puzzle data", () => {
  it("splits the opponent's move from the solution", () => {
    const puzzle = toPuzzle(ROW);
    expect(puzzle?.setupMove).toBe("f2g3");
    expect(puzzle?.solution).toEqual(["e6e7", "b2b1", "b3c1", "b1c1", "h6c1"]);
    expect(puzzle?.theme).toBe("Hanging piece");
  });
  it("rejects a row whose moves are not legal", () => {
    expect(toPuzzle({ ...ROW, moves: ["f2g3", "e6e8"] })).toBeNull();
    expect(toPuzzle({ ...ROW, fen: "not a fen" })).toBeNull();
    expect(toPuzzle({ ...ROW, moves: ["f2g3"] })).toBeNull();
  });
  it("accepts any checkmate on the last move, and only the listed move elsewhere", () => {
    const game = new Chess("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1");
    game.move("Ra8#");
    expect(isAcceptedMove(game, "a1b1", "a1a8", true)).toBe(true);
    expect(isAcceptedMove(game, "a1b1", "a1a8", false)).toBe(false);
    expect(isLegalLine("6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1", ["a1a8"])).toBe(true);
  });
});

describe("puzzle themes", () => {
  it("prefers a named mate pattern over the mate length", () => {
    expect(primaryTheme(["mateIn2", "smotheredMate", "short"])).toBe("smotheredMate");
  });
  it("ignores length and phase tags", () => {
    expect(primaryTheme(["short", "middlegame", "fork"])).toBe("fork");
    expect(primaryTheme(["short", "crushing"])).toBe("mixed");
  });
  it("labels unknown tags readably", () => {
    expect(themeLabel("someNewTag")).toBe("Some new tag");
  });
  it("gives a generic but true explanation when no motif is tagged", () => {
    expect(themeInfo(["crushing", "short"], 2).explanation).toContain("2 moves");
  });
});

describe("guest progress", () => {
  beforeEach(() => localStorage.clear());
  const puzzle = { id: "p1", rating: 1200, themes: ["fork", "short"] };
  it("rates only the first try and remembers mistakes", () => {
    expect(guestProgress.progress()).toBeNull();
    expect(guestProgress.record(puzzle, false)).toEqual({ rated: true, rating: 1180, delta: -20 });
    expect(guestProgress.record(puzzle, true)).toEqual({ rated: false, rating: 1180, delta: 0 });
    const progress = guestProgress.progress();
    expect(progress?.guest).toBe(true);
    expect(progress?.accuracy).toEqual([{ theme: "fork", correct: 0, total: 1 }]);
    expect(progress?.mistakes[0]?.puzzleId).toBe("p1");
    expect(guestProgress.recentIds()).toEqual(["p1"]);
  });
  it("starts from the default rating", () => {
    expect(guestProgress.rating()).toBe(START_RATING);
  });
});

describe("admin puzzle validation", () => {
  const input = { id: "00008", fen: ROW.fen, moves: ROW.moves, rating: 1913, themes: [] };
  it("accepts a legal puzzle", () => {
    expect(validatePuzzle(input)).toBeNull();
  });
  it("rejects illegal moves, bad ratings and bad IDs", () => {
    expect(validatePuzzle({ ...input, moves: ["f2g3", "e6e8"] })).toMatch(/legal/);
    expect(validatePuzzle({ ...input, rating: 50 })).toMatch(/Rating/);
    expect(validatePuzzle({ ...input, id: "a b" })).toMatch(/ID/);
  });
});
