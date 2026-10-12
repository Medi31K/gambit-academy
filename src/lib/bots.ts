import type { Engine } from "@/lib/engine";
import { hangingMoves, pickSlip, slipChance } from "@/lib/human-errors";

// Practice opponents. Ratings are approximate Gambit Academy estimates, not
// official Elo. From 1320 up, Stockfish's own strength limit (UCI_Elo) is used;
// below that, the bot searches shallowly and sometimes plays a random move.
export interface Bot {
  id: string;
  name: string;
  rating: number;
  blurb: string;
  color: string;
}

export const BOTS: Bot[] = [
  {
    id: "pip",
    name: "Pip",
    rating: 250,
    blurb: "Just learned how the knight moves.",
    color: "#c9a27e",
  },
  {
    id: "juniper",
    name: "Juniper",
    rating: 500,
    blurb: "Loves sending the queen out early.",
    color: "#8fae7e",
  },
  {
    id: "otto",
    name: "Otto",
    rating: 800,
    blurb: "Knows the rules. Sometimes forgets a piece.",
    color: "#7e9cae",
  },
  {
    id: "margot",
    name: "Margot",
    rating: 1100,
    blurb: "Plays it safe and waits for your mistakes.",
    color: "#b48ead",
  },
  {
    id: "felix",
    name: "Felix",
    rating: 1400,
    blurb: "A club regular with a taste for tactics.",
    color: "#d08770",
  },
  {
    id: "ingrid",
    name: "Ingrid",
    rating: 1700,
    blurb: "Calm, careful and hard to trick.",
    color: "#5e81ac",
  },
  {
    id: "darius",
    name: "Darius",
    rating: 2000,
    blurb: "A sharp attacker. Watch your king.",
    color: "#bf616a",
  },
  {
    id: "vale",
    name: "Professor Vale",
    rating: 2300,
    blurb: "Thinks in plans, not just moves.",
    color: "#6b705c",
  },
  {
    id: "archivist",
    name: "The Archivist",
    rating: 2600,
    blurb: "Has seen every opening twice.",
    color: "#4c566a",
  },
  {
    id: "ash",
    name: "Ash",
    rating: 2800,
    blurb: "Our strongest opponent. Bring your best.",
    color: "#2e3440",
  },
];

const ENGINE_FLOOR = 1320;

export interface BotSettings {
  options: Record<string, string | number | boolean>;
  depth?: number | undefined;
  movetime?: number | undefined;
  multipv: number;
  // Chance per move of leaving a piece hanging, like a human slip.
  slipChance: number;
}

export function botSettings(rating: number): BotSettings {
  const slips = slipChance(rating);
  if (rating >= ENGINE_FLOOR) {
    return {
      options: { UCI_LimitStrength: true, UCI_Elo: Math.min(3190, rating), "Skill Level": 20 },
      movetime: 300 + Math.round((rating - ENGINE_FLOOR) / 6),
      multipv: 1,
      slipChance: slips,
    };
  }
  return {
    options: { UCI_LimitStrength: false, "Skill Level": 0 },
    depth: Math.max(1, Math.round(rating / 300)),
    multipv: 4,
    slipChance: slips,
  };
}

// Picks among the engine's candidate moves, favouring the best one.
export function pickWeighted(moves: string[], random: () => number): string | undefined {
  const weights = [1, 0.6, 0.4, 0.3].slice(0, moves.length);
  const total = weights.reduce((sum, value) => sum + value, 0);
  let roll = random() * total;
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i] ?? 0;
    if (roll <= 0) return moves[i];
  }
  return moves[0];
}

export interface BotChoice {
  uci: string;
  // True when the bot deliberately left material hanging.
  slip: boolean;
}

export async function botMove(
  engine: Engine,
  fen: string,
  rating: number,
  random: () => number = Math.random,
): Promise<BotChoice> {
  const settings = botSettings(rating);
  // No slips in the first few moves, so games don't open with nonsense.
  const moveNumber = Number(fen.split(" ")[5] ?? 1);
  if (moveNumber > 3 && settings.slipChance && random() < settings.slipChance) {
    const slip = pickSlip(hangingMoves(fen), random);
    if (slip) return { uci: slip, slip: true };
  }
  const result = await engine.analyse(
    fen,
    { depth: settings.depth, movetime: settings.movetime, multipv: settings.multipv },
    settings.options,
  );
  if (settings.multipv > 1) {
    const candidates = result.lines.map((line) => line.move);
    return { uci: pickWeighted(candidates, random) ?? result.best, slip: false };
  }
  return { uci: result.best, slip: false };
}

// Full-strength settings for the coach's analysis.
export const COACH_OPTIONS = { UCI_LimitStrength: false, "Skill Level": 20 };
