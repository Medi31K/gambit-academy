import { openingKey } from "@/lib/opening-key";

// Named openings from the Lichess opening list (CC0), built by
// scripts/build-openings.mjs. A move that reaches one of these positions is a
// "book" move.

export interface OpeningBook {
  names: string[];
  // Position key -> name index * 2, plus 1 when the position is the one the
  // name belongs to (not just a step on the way to it).
  positions: Record<string, number>;
}

export interface Opening {
  name: string;
  exact: boolean;
}

export function findOpening(book: OpeningBook, fen: string): Opening | null {
  const value = book.positions[openingKey(fen)];
  if (value === undefined) return null;
  const name = book.names[Math.floor(value / 2)];
  return name ? { name, exact: value % 2 === 1 } : null;
}

let loading: Promise<OpeningBook | null> | null = null;

// Fetched once, on first use. Without it, games simply have no book moves.
export function loadOpenings(): Promise<OpeningBook | null> {
  loading ??= fetch("/data/openings.json")
    .then((response) => (response.ok ? (response.json() as Promise<OpeningBook>) : null))
    .catch(() => null);
  return loading;
}

export async function lookupOpening(fen: string): Promise<Opening | null> {
  const book = await loadOpenings();
  return book ? findOpening(book, fen) : null;
}
