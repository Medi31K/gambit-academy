// Builds public/data/openings.json from the Lichess opening list
// (https://github.com/lichess-org/chess-openings, CC0 public domain).
//
//   node --experimental-strip-types scripts/build-openings.mjs path/to/folder-with-a-e.tsv
//
// Every position on every named line is stored, keyed by a hash of its board,
// side to move and castling rights. A position takes the name of the line it
// is named for, or of the longest named line that leads to it.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { Chess } from "chess.js";
import { openingKey } from "../src/lib/opening-key.ts";

const folder = process.argv[2];
if (!folder) throw new Error("Pass the folder that holds a.tsv … e.tsv");

const lines = ["a", "b", "c", "d", "e"].flatMap((file) =>
  readFileSync(join(folder, `${file}.tsv`), "utf8")
    .split("\n")
    .slice(1)
    .filter(Boolean)
    .map((row) => {
      const [eco, name, pgn] = row.split("\t");
      return { eco, name, pgn };
    }),
);

const names = [];
const nameIndex = new Map();
const indexOf = (name) => {
  if (!nameIndex.has(name)) {
    nameIndex.set(name, names.length);
    names.push(name);
  }
  return nameIndex.get(name);
};

// key -> { name, exact, depth }
const exact = new Map();
const games = lines.map((line) => {
  const game = new Chess();
  game.loadPgn(line.pgn);
  const key = openingKey(game.fen());
  // Several lines can name the same position; the first (lowest ECO) wins.
  if (!exact.has(key)) exact.set(key, line.name);
  return game;
});

const positions = new Map();
for (const game of games) {
  const replay = new Chess();
  let inherited = null;
  for (const move of game.history()) {
    replay.move(move);
    const key = openingKey(replay.fen());
    const name = exact.get(key);
    if (name) inherited = name;
    if (!inherited) continue;
    const value = name ? indexOf(name) * 2 + 1 : indexOf(inherited) * 2;
    const previous = positions.get(key);
    // Prefer an exact name, then the first one seen.
    if (previous === undefined || (previous % 2 === 0 && value % 2 === 1))
      positions.set(key, value);
  }
}

mkdirSync("public/data", { recursive: true });
writeFileSync(
  "public/data/openings.json",
  JSON.stringify({ names, positions: Object.fromEntries(positions) }),
);
console.log(`${lines.length} lines, ${names.length} names, ${positions.size} positions`);
