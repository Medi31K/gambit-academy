import { describe, expect, it } from "vitest";
import {
  DEFAULT_CONFIG,
  chunk,
  createBucketSampler,
  createRng,
  isValidPuzzle,
  normalizeSupabaseUrl,
  parseRow,
  passesFilter,
  ratingBand,
  ratingBucket,
  readConfig,
  toDbRow,
} from "./puzzle-import-lib.mjs";

const REAL_ROW =
  "00008,r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24,f2g3 e6e7 b2b1 b3c1 b1c1 h6c1,1913,75,94,6481,crushing hangingPiece long middlegame,https://lichess.org/787zsVup/black#47,";
// Same position, but e6e8 is blocked by the black rook on e7.
const ILLEGAL_ROW =
  "0000X,r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24,f2g3 e6e8,1913,75,94,6481,crushing,https://lichess.org/787zsVup/black#47,";
// Popularity 40 is below the default minimum of 80.
const UNPOPULAR_ROW =
  "000Zb,5r1k/pp4pp/5p2/1BbQp1r1/6K1/7P/1PP3P1/3R3R w - - 2 26,g4h4 c5f2 g2g3 f2g3,1424,74,40,880,advantage mate mateIn2 middlegame short,https://lichess.org/iihZGl6t#51,Sicilian_Defense Sicilian_Defense_Other_Variations";

function parse(line: string) {
  const puzzle = parseRow(line);
  if (!puzzle) throw new Error("expected row to parse");
  return puzzle;
}

describe("parseRow", () => {
  it("parses a real Lichess row", () => {
    expect(parse(REAL_ROW)).toEqual({
      id: "00008",
      fen: "r6k/pp2r2p/4Rp1Q/3p4/8/1N1P2R1/PqP2bPP/7K b - - 0 24",
      moves: ["f2g3", "e6e7", "b2b1", "b3c1", "b1c1", "h6c1"],
      rating: 1913,
      ratingDeviation: 75,
      popularity: 94,
      nbPlays: 6481,
      themes: ["crushing", "hangingPiece", "long", "middlegame"],
      gameUrl: "https://lichess.org/787zsVup/black#47",
      openingTags: [],
    });
  });

  it("splits opening tags", () => {
    expect(parse(UNPOPULAR_ROW).openingTags).toEqual([
      "Sicilian_Defense",
      "Sicilian_Defense_Other_Variations",
    ]);
  });

  it("returns null for blank or malformed lines", () => {
    expect(parseRow("")).toBeNull();
    expect(parseRow("abc,def")).toBeNull();
    expect(parseRow("1,fen,e2e4 e7e5,notanumber,75,94,6481,x,url,")).toBeNull();
  });
});

describe("passesFilter", () => {
  it("keeps a popular, well-played puzzle", () => {
    expect(passesFilter(parse(REAL_ROW))).toBe(true);
  });

  it("drops an unpopular puzzle", () => {
    expect(passesFilter(parse(UNPOPULAR_ROW))).toBe(false);
  });

  it("respects each threshold", () => {
    const base = parse(REAL_ROW);
    expect(passesFilter({ ...base, nbPlays: 499 })).toBe(false);
    expect(passesFilter({ ...base, ratingDeviation: 91 })).toBe(false);
    expect(passesFilter({ ...base, rating: 399 })).toBe(false);
    expect(passesFilter({ ...base, rating: 3201 })).toBe(false);
    expect(passesFilter({ ...base, moves: ["e2e4"] })).toBe(false);
    expect(passesFilter({ ...base, moves: Array(17).fill("e2e4") })).toBe(false);
  });
});

describe("readConfig", () => {
  it("uses defaults and env overrides", () => {
    expect(readConfig({})).toEqual(DEFAULT_CONFIG);
    expect(readConfig({ PER_BUCKET: "50", SEED: "7", MIN_POPULARITY: "" })).toMatchObject({
      perBucket: 50,
      seed: 7,
      minPopularity: 80,
    });
  });

  it("rejects non-numeric values", () => {
    expect(() => readConfig({ PER_BUCKET: "lots" })).toThrow(/PER_BUCKET/);
  });
});

describe("isValidPuzzle", () => {
  it("accepts the real puzzle", () => {
    expect(isValidPuzzle(parse(REAL_ROW))).toBe(true);
  });

  it("rejects an illegal move", () => {
    expect(isValidPuzzle(parse(ILLEGAL_ROW))).toBe(false);
  });

  it("rejects a bad FEN and malformed UCI", () => {
    const base = parse(REAL_ROW);
    expect(isValidPuzzle({ ...base, fen: "not a fen" })).toBe(false);
    expect(isValidPuzzle({ ...base, moves: ["f2g3", "e6-e7"] })).toBe(false);
  });

  it("handles promotion", () => {
    const puzzle = { fen: "8/P7/8/8/8/8/8/k6K b - - 0 1", moves: ["a1b1", "a7a8q"] };
    expect(isValidPuzzle(puzzle)).toBe(true);
  });
});

describe("sampling", () => {
  it("buckets and bands ratings", () => {
    expect(ratingBucket(1913)).toBe(19);
    expect(ratingBand(1913)).toBe("1800-1999");
    expect(ratingBand(400)).toBe("400-599");
  });

  it("is deterministic for a seed and caps each bucket", () => {
    const run = (seed: number) => {
      const sampler = createBucketSampler(3, createRng(seed));
      for (let i = 0; i < 100; i++) sampler.add(i % 2, i);
      return sampler.items();
    };
    expect(run(1)).toEqual(run(1));
    expect(run(1)).toHaveLength(6);
    expect(run(1)).not.toEqual(run(2));
  });
});

describe("helpers", () => {
  it("maps to a DB row without DB-defaulted columns", () => {
    const row = toDbRow(parse(REAL_ROW));
    expect(row).toMatchObject({ id: "00008", rating_deviation: 75, nb_plays: 6481 });
    expect(row).not.toHaveProperty("random_key");
    expect(row).not.toHaveProperty("created_at");
  });

  it("normalizes the Supabase URL", () => {
    expect(normalizeSupabaseUrl("https://x.supabase.co/")).toBe("https://x.supabase.co");
    expect(normalizeSupabaseUrl("https://x.supabase.co/rest/v1/")).toBe("https://x.supabase.co");
  });

  it("chunks arrays", () => {
    expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
  });
});
