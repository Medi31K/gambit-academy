#!/usr/bin/env node
// Imports a rating-balanced, quality-filtered sample of the Lichess puzzle database (CC0)
// into public.puzzles. Reads the decompressed CSV from stdin:
//   curl -sSfL https://database.lichess.org/lichess_db_puzzle.csv.zst | zstd -dc \
//     | node scripts/import-puzzles.mjs
// Env: SUPABASE_URL, SUPABASE_SECRET_KEY, PER_BUCKET, SEED, DRY_RUN=1, plus filter
// overrides (MIN_POPULARITY, MIN_PLAYS, MAX_RATING_DEVIATION, MIN_RATING, MAX_RATING,
// MIN_MOVES, MAX_MOVES).
import { createInterface } from "node:readline";
import {
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

const BATCH_SIZE = 1000;
const MAX_RETRIES = 4;

async function samplePuzzles(input, config) {
  const sampler = createBucketSampler(config.perBucket, createRng(config.seed));
  const stats = { read: 0, malformed: 0, passed: 0 };
  let isHeader = true;

  for await (const line of createInterface({ input, crlfDelay: Infinity })) {
    if (isHeader) {
      isHeader = false;
      if (line.startsWith("PuzzleId,")) continue;
    }
    if (!line.trim()) continue;
    stats.read += 1;
    const puzzle = parseRow(line);
    if (!puzzle) {
      stats.malformed += 1;
      continue;
    }
    if (!passesFilter(puzzle, config)) continue;
    stats.passed += 1;
    sampler.add(ratingBucket(puzzle.rating), puzzle);
  }
  return { sampled: sampler.items(), stats };
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function postBatch(endpoint, key, rows) {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify(rows),
  });
  if (!res.ok) {
    const body = (await res.text()).slice(0, 500);
    throw new Error(`HTTP ${res.status}: ${body}`);
  }
}

async function postWithRetry(endpoint, key, rows, label) {
  for (let attempt = 0; ; attempt += 1) {
    try {
      return await postBatch(endpoint, key, rows);
    } catch (err) {
      if (attempt >= MAX_RETRIES) throw err;
      const delay = 1000 * 2 ** attempt;
      console.warn(`${label} failed (${err.message}); retrying in ${delay / 1000}s`);
      await sleep(delay);
    }
  }
}

async function upload(rows, env) {
  const { SUPABASE_URL, SUPABASE_SECRET_KEY } = env;
  if (!SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error("SUPABASE_URL and SUPABASE_SECRET_KEY must be set (or use DRY_RUN=1)");
  }
  const endpoint = `${normalizeSupabaseUrl(SUPABASE_URL)}/rest/v1/puzzles?on_conflict=id`;
  const batches = chunk(rows, BATCH_SIZE);
  let uploaded = 0;
  for (const [i, batch] of batches.entries()) {
    await postWithRetry(endpoint, SUPABASE_SECRET_KEY, batch, `Batch ${i + 1}/${batches.length}`);
    uploaded += batch.length;
    console.log(`Uploaded batch ${i + 1}/${batches.length} (${uploaded}/${rows.length})`);
  }
  return uploaded;
}

function countByBand(puzzles) {
  const counts = new Map();
  for (const p of puzzles) {
    const band = ratingBand(p.rating);
    counts.set(band, (counts.get(band) ?? 0) + 1);
  }
  return [...counts.entries()].sort(([a], [b]) => parseInt(a, 10) - parseInt(b, 10));
}

function printSummary({ stats, sampled, valid, uploaded, dryRun }) {
  console.log("\n=== Puzzle import summary ===");
  console.log(`Rows read:            ${stats.read}`);
  console.log(`Malformed:            ${stats.malformed}`);
  console.log(`Passed filter:        ${stats.passed}`);
  console.log(`Kept after sampling:  ${sampled.length}`);
  console.log(`Invalid (chess.js):   ${sampled.length - valid.length}`);
  console.log(`Uploaded:             ${dryRun ? `0 (dry run, ${valid.length} ready)` : uploaded}`);
  console.log("Per 200-rating band:");
  for (const [band, count] of countByBand(valid)) {
    console.log(`  ${band.padEnd(10)} ${count}`);
  }
}

async function main() {
  const env = process.env;
  const config = readConfig(env);
  const dryRun = env.DRY_RUN === "1" || env.DRY_RUN === "true";
  console.log(`Config: ${JSON.stringify(config)}${dryRun ? " (dry run)" : ""}`);

  const { sampled, stats } = await samplePuzzles(process.stdin, config);
  const valid = sampled.filter(isValidPuzzle);
  const uploaded = dryRun ? 0 : await upload(valid.map(toDbRow), env);
  printSummary({ stats, sampled, valid, uploaded, dryRun });
}

main().catch((err) => {
  console.error(`Import failed: ${err.message}`);
  process.exit(1);
});
