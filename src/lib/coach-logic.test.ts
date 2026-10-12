import { describe, expect, it } from "vitest";
import type { Engine } from "./engine";
import { botMove } from "./bots";
import { COACH_LEVELS, coachRating, describeOwnMove } from "./coach";
import { hangingMoves, pickSlip, slipChance } from "./human-errors";
import { reviewMove } from "./move-quality";
import { findOpening, type OpeningBook } from "./openings";
import { readFileSync } from "node:fs";
import { Chess } from "chess.js";

const START = "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1";
const level = (id: string) => COACH_LEVELS.find((item) => item.id === id)!;

describe("human slips", () => {
  it("finds a move that puts the queen where a pawn takes it", () => {
    const moves = hangingMoves("4k3/8/3p4/8/8/Q7/8/4K3 w - - 0 5");
    expect(moves).toContainEqual({ uci: "a3c5", loss: 9 });
  });
  it("never counts a check as a slip", () => {
    // Qe5+ can be taken by the pawn, but it's check.
    const moves = hangingMoves("4k3/8/3p4/8/8/8/8/Q3K3 w - - 0 5");
    expect(moves.map((move) => move.uci)).not.toContain("a1e5");
  });
  it("finds nothing to hang in the starting position", () => {
    expect(hangingMoves(START)).toEqual([]);
  });
  it("doesn't count a piece that was already hanging", () => {
    // The knight on d5 is already attacked by the pawn; moving the king loses nothing new.
    const moves = hangingMoves("4k3/8/2p5/3N4/8/8/8/4K3 w - - 0 5");
    expect(moves.map((move) => move.uci)).not.toContain("e1e2");
  });
  it("slips more often at lower ratings and never from 2000", () => {
    expect(slipChance(2000)).toBe(0);
    expect(slipChance(2600)).toBe(0);
    expect(slipChance(100)).toBeCloseTo(0.3, 5);
    expect(slipChance(400)).toBeGreaterThan(slipChance(1200));
  });
  it("prefers hanging the more valuable piece", () => {
    const options = [
      { uci: "a", loss: 3 },
      { uci: "b", loss: 9 },
    ];
    expect(pickSlip(options, () => 0.5)).toBe("b");
    expect(pickSlip(options, () => 0)).toBe("a");
    expect(pickSlip([], () => 0.5)).toBeUndefined();
  });
});

describe("bot moves with slips", () => {
  const engine = {
    analyse: () =>
      Promise.resolve({ best: "e1e2", lines: [{ move: "e1e2", cp: 0, pv: ["e1e2"] }] }),
  } as unknown as Engine;
  const fen = "4k3/8/3p4/8/8/Q7/8/4K3 w - - 0 5";

  it("leaves a piece hanging when the roll says so", async () => {
    const choice = await botMove(engine, fen, 100, () => 0);
    expect(choice.slip).toBe(true);
    expect(hangingMoves(fen).map((move) => move.uci)).toContain(choice.uci);
  });
  it("plays the engine's move otherwise", async () => {
    expect(await botMove(engine, fen, 2000, () => 0)).toEqual({ uci: "e1e2", slip: false });
  });
  it("doesn't slip in the first moves of the game", async () => {
    const early = "4k3/8/3p4/8/8/Q7/8/4K3 w - - 0 2";
    expect((await botMove(engine, early, 100, () => 0)).slip).toBe(false);
  });
});

describe("coach", () => {
  it("adjusts the rating by style and keeps it in range", () => {
    expect(coachRating(level("club"), "balanced")).toBe(1000);
    expect(coachRating(level("club"), "challenging")).toBe(1250);
    expect(coachRating(level("first-steps"), "casual")).toBe(100);
    expect(coachRating(level("grandmaster"), "challenging")).toBe(3000);
  });
  it("describes her own moves from the board", () => {
    expect(describeOwnMove(START, "e2e4")).toBe("Taking some space in the centre.");
    expect(describeOwnMove(START, "g1f3")).toBe("Bringing my knight into the game.");
    expect(describeOwnMove("r3k2r/8/8/8/8/8/8/R3K2R b KQkq - 0 10", "e8g8")).toContain("castling");
    expect(describeOwnMove("4k3/8/8/8/8/8/8/R3K3 w - - 0 1", "a1a8")).toContain("Check!");
    expect(describeOwnMove("4k3/8/8/3q4/8/8/4P3/4K3 w - - 0 1", "e2e4")).toBe(
      "Watch out: I'm attacking your queen on d5.",
    );
    const foolsMate = "rnbqkbnr/pppp1ppp/8/4p3/6P1/5P2/PPPPP2P/RNBQKBNR b KQkq - 0 2";
    expect(describeOwnMove(foolsMate, "d8h4")).toContain("Checkmate");
  });
  it("tells you when you missed a free piece", () => {
    const fen = "4k3/8/8/3q4/8/2N5/8/4K3 w - - 0 1";
    const before = { best: "c3d5", lines: [{ move: "c3d5", cp: 900, pv: ["c3d5"] }] };
    const after = { best: "d5d4", lines: [{ move: "d5d4", cp: 0, pv: ["d5d4"] }] };
    const missed = reviewMove(fen, "e1e2", before, after);
    expect(missed.label).toBe("miss");
    expect(missed.comment).toBe("You missed Nxd5, taking the queen on d5.");
    expect(missed.better?.san).toBe("Nxd5");
    const taken = { best: "e8d7", lines: [{ move: "e8d7", cp: -900, pv: ["e8d7"] }] };
    const took = reviewMove(fen, "c3d5", before, taken);
    expect(took.label).toBe("best");
    expect(took.comment).toBe("Good, you took the queen. That's the best move here.");
  });
  it("calls it a miss when a mate was there and you played on", () => {
    // Back-rank mate with Ra8 was available.
    const fen = "6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1";
    const before = { best: "a1a8", lines: [{ move: "a1a8", mate: 1, pv: ["a1a8"] }] };
    const after = { best: "h7h6", lines: [{ move: "h7h6", cp: -400, pv: ["h7h6"] }] };
    const review = reviewMove(fen, "h2h3", before, after);
    expect(review.label).toBe("miss");
    expect(review.comment).toBe("You missed a forced mate in 1, starting with Ra8#.");
  });
  it("still calls a losing move a blunder, even if it also misses a capture", () => {
    const fen = "4k3/8/8/3q4/8/2N5/8/4K3 w - - 0 1";
    const before = { best: "c3d5", lines: [{ move: "c3d5", cp: 900, pv: ["c3d5"] }] };
    const after = { best: "d5c3", lines: [{ move: "d5c3", cp: 700, pv: ["d5c3"] }] };
    expect(reviewMove(fen, "c3b5", before, after).label).toBe("blunder");
  });
  it("labels a known opening move as book", () => {
    const before = { best: "d2d4", lines: [{ move: "d2d4", cp: 30, pv: ["d2d4"] }] };
    const after = { best: "e7e5", lines: [{ move: "e7e5", cp: -10, pv: ["e7e5"] }] };
    const review = reviewMove(START, "e2e4", before, after, "King's Pawn Game");
    expect(review.label).toBe("book");
    expect(review.comment).toBe("A book move from the King's Pawn Game.");
    expect(review.better).toBeUndefined();
  });
});

describe("opening book", () => {
  const book = JSON.parse(readFileSync("public/data/openings.json", "utf8")) as OpeningBook;
  const after = (...moves: string[]) => {
    const game = new Chess();
    for (const move of moves) game.move(move);
    return game.fen();
  };
  it("names well-known openings", () => {
    expect(findOpening(book, after("e4", "c5"))).toEqual({ name: "Sicilian Defense", exact: true });
    expect(findOpening(book, after("e4", "e5", "Nf3", "Nc6", "Bc4"))?.name).toBe("Italian Game");
    expect(findOpening(book, after("d4", "d5", "c4"))?.name).toBe("Queen's Gambit");
  });
  it("finds the same opening by transposition", () => {
    expect(findOpening(book, after("Nf3", "Nc6", "e4", "e5"))?.name).toBe(
      findOpening(book, after("e4", "e5", "Nf3", "Nc6"))?.name,
    );
  });
  it("knows nothing about a random position", () => {
    expect(findOpening(book, after("a4", "h5", "Ra3", "Rh6", "Rb3", "Rb6"))).toBeNull();
    expect(findOpening(book, START)).toBeNull();
  });
});
