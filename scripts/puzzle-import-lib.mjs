// Pure helpers for scripts/import-puzzles.mjs. No I/O here, so everything is unit-testable.
import { Chess } from "chess.js";

export const DEFAULT_CONFIG = Object.freeze({
  minPopularity: 80,
  minPlays: 500,
  maxRatingDeviation: 90,
  minRating: 400,
  maxRating: 3200,
  minMoves: 2,
  maxMoves: 16,
  perBucket: 2200,
  seed: 1,
});

const ENV_KEYS = {
  minPopularity: "MIN_POPULARITY",
  minPlays: "MIN_PLAYS",
  maxRatingDeviation: "MAX_RATING_DEVIATION",
  minRating: "MIN_RATING",
  maxRating: "MAX_RATING",
  minMoves: "MIN_MOVES",
  maxMoves: "MAX_MOVES",
  perBucket: "PER_BUCKET",
  seed: "SEED",
};

/** Builds the import config from env vars, falling back to DEFAULT_CONFIG. */
export function readConfig(env = {}) {
  const config = { ...DEFAULT_CONFIG };
  for (const [key, envName] of Object.entries(ENV_KEYS)) {
    const raw = env[envName];
    if (raw === undefined || raw.trim() === "") continue;
    const value = Number(raw);
    if (!Number.isFinite(value)) throw new Error(`${envName} must be a number, got "${raw}"`);
    config[key] = value;
  }
  return config;
}

const splitWords = (s) => (s ? s.trim().split(/\s+/).filter(Boolean) : []);

/**
 * Parses one Lichess puzzle CSV line. The Lichess file never quotes fields
 * (tags use underscores, URLs have no commas), so a plain split is enough.
 * Returns null for blank or malformed lines.
 */
export function parseRow(line) {
  const fields = line.trim().split(",");
  if (fields.length < 9) return null;
  const [id, fen, moves, rating, rd, popularity, nbPlays, themes, gameUrl, openingTags = ""] =
    fields;
  const numbers = [rating, rd, popularity, nbPlays].map(Number);
  if (!id || !fen || numbers.some((n) => !Number.isFinite(n))) return null;
  return {
    id,
    fen,
    moves: splitWords(moves),
    rating: numbers[0],
    ratingDeviation: numbers[1],
    popularity: numbers[2],
    nbPlays: numbers[3],
    themes: splitWords(themes),
    gameUrl: gameUrl || null,
    openingTags: splitWords(openingTags),
  };
}

/** Quality filter: popular, well-played, stable-rated puzzles of reasonable length. */
export function passesFilter(puzzle, config = DEFAULT_CONFIG) {
  return (
    puzzle.popularity >= config.minPopularity &&
    puzzle.nbPlays >= config.minPlays &&
    puzzle.ratingDeviation <= config.maxRatingDeviation &&
    puzzle.rating >= config.minRating &&
    puzzle.rating <= config.maxRating &&
    puzzle.moves.length >= config.minMoves &&
    puzzle.moves.length <= config.maxMoves
  );
}

const UCI_MOVE = /^([a-h][1-8])([a-h][1-8])([qrbn])?$/;

/** True if the FEN loads and every UCI move is legal in sequence. */
export function isValidPuzzle(puzzle) {
  let chess;
  try {
    chess = new Chess(puzzle.fen);
  } catch {
    return false;
  }
  for (const uci of puzzle.moves) {
    const match = UCI_MOVE.exec(uci);
    if (!match) return false;
    const [, from, to, promotion] = match;
    try {
      chess.move(promotion ? { from, to, promotion } : { from, to });
    } catch {
      return false;
    }
  }
  return true;
}

/** Index of the 100-point rating bucket used for even sampling. */
export const ratingBucket = (rating) => Math.floor(rating / 100);

/** Label of the 200-point band used in the summary, e.g. "1800-1999". */
export function ratingBand(rating) {
  const start = Math.floor(rating / 200) * 200;
  return `${start}-${start + 199}`;
}

/** mulberry32: small, fast, seeded PRNG returning floats in [0, 1). */
export function createRng(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Per-key reservoir sampler (Algorithm R), keeping up to `capacity` items per key. */
export function createBucketSampler(capacity, rng) {
  const buckets = new Map();
  return {
    add(key, item) {
      let bucket = buckets.get(key);
      if (!bucket) {
        bucket = { seen: 0, items: [] };
        buckets.set(key, bucket);
      }
      bucket.seen += 1;
      if (bucket.items.length < capacity) {
        bucket.items.push(item);
        return;
      }
      const j = Math.floor(rng() * bucket.seen);
      if (j < capacity) bucket.items[j] = item;
    },
    items() {
      return [...buckets.keys()].sort((a, b) => a - b).flatMap((k) => buckets.get(k).items);
    },
  };
}

/** Maps a parsed puzzle to a public.puzzles row (random_key/created_at use DB defaults). */
export function toDbRow(puzzle) {
  return {
    id: puzzle.id,
    fen: puzzle.fen,
    moves: puzzle.moves,
    rating: puzzle.rating,
    rating_deviation: puzzle.ratingDeviation,
    popularity: puzzle.popularity,
    nb_plays: puzzle.nbPlays,
    themes: puzzle.themes,
    game_url: puzzle.gameUrl,
    opening_tags: puzzle.openingTags,
  };
}

/** Strips a trailing slash and a trailing /rest/v1 so either URL form works. */
export function normalizeSupabaseUrl(url) {
  return url
    .trim()
    .replace(/\/+$/, "")
    .replace(/\/rest\/v1$/, "")
    .replace(/\/+$/, "");
}

/** Splits an array into chunks of `size`. */
export function chunk(items, size) {
  const out = [];
  for (let i = 0; i < items.length; i += size) out.push(items.slice(i, i + size));
  return out;
}
