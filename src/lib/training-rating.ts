// Gambit Academy training rating. It is Elo-style but it is not an official
// Elo rating. Must match public.record_attempt() in the database.
export const START_RATING = 1200;
const MIN_RATING = 400;
const MAX_RATING = 3200;

export function nextRating(
  rating: number,
  ratedAttempts: number,
  puzzleRating: number,
  solved: boolean,
): number {
  const expected = 1 / (1 + 10 ** ((puzzleRating - rating) / 400));
  const k = ratedAttempts < 20 ? 40 : 20;
  const score = solved ? 1 : 0;
  const change = k * (score - expected);
  // Round half away from zero, like Postgres round().
  const rounded = Math.sign(change) * Math.round(Math.abs(change));
  return Math.min(MAX_RATING, Math.max(MIN_RATING, rating + rounded));
}
