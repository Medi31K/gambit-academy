// Talks to Stockfish (GPLv3), which runs as a separate program in a Web
// Worker. Commands are plain UCI text, queued so only one search runs at once.

export interface EngineLine {
  move: string;
  // Score from the point of view of the side to move.
  cp?: number;
  mate?: number;
  pv: string[];
}

export interface Analysis {
  best: string;
  lines: EngineLine[];
}

export interface SearchOptions {
  depth?: number | undefined;
  movetime?: number | undefined;
  multipv?: number | undefined;
}

export type EngineOptions = Record<string, string | number | boolean>;

const ENGINE_URL = "/engine/stockfish.js";

export class Engine {
  private worker: Worker;
  private listeners = new Set<(line: string) => void>();
  private queue: Promise<unknown> = Promise.resolve();
  private options: EngineOptions = {};
  private ready: Promise<void>;

  constructor(url = ENGINE_URL) {
    this.worker = new Worker(url);
    this.worker.onmessage = (event) => {
      for (const listener of this.listeners) listener(String(event.data));
    };
    this.ready = this.command("uci", "uciok")
      .then(() => this.command("isready", "readyok"))
      .then(() => undefined);
  }

  // Sends a command and resolves with every line up to the one starting with `until`.
  private command(text: string, until: string): Promise<string[]> {
    return new Promise((resolve) => {
      const lines: string[] = [];
      const listener = (line: string) => {
        lines.push(line);
        if (line.startsWith(until)) {
          this.listeners.delete(listener);
          resolve(lines);
        }
      };
      this.listeners.add(listener);
      this.worker.postMessage(text);
    });
  }

  private run<T>(task: () => Promise<T>): Promise<T> {
    const next = this.queue.then(task, task);
    this.queue = next.catch(() => undefined);
    return next;
  }

  private async apply(options: EngineOptions) {
    let changed = false;
    for (const [name, value] of Object.entries(options)) {
      if (this.options[name] === value) continue;
      this.worker.postMessage(`setoption name ${name} value ${value}`);
      this.options[name] = value;
      changed = true;
    }
    if (changed) await this.command("isready", "readyok");
  }

  newGame(): Promise<void> {
    return this.run(async () => {
      await this.ready;
      this.worker.postMessage("ucinewgame");
      await this.command("isready", "readyok");
    });
  }

  analyse(fen: string, search: SearchOptions, options: EngineOptions = {}): Promise<Analysis> {
    return this.run(async () => {
      await this.ready;
      await this.apply({ ...options, MultiPV: search.multipv ?? 1 });
      this.worker.postMessage(`position fen ${fen}`);
      const go = search.movetime
        ? `go movetime ${search.movetime}`
        : `go depth ${search.depth ?? 12}`;
      const output = await this.command(go, "bestmove");
      return parseSearch(output);
    });
  }

  terminate() {
    this.worker.terminate();
    this.listeners.clear();
  }
}

// Keeps the deepest line reported for each MultiPV slot.
export function parseSearch(output: string[]): Analysis {
  const byRank = new Map<number, { depth: number; line: EngineLine }>();
  let best = "";
  for (const text of output) {
    if (text.startsWith("bestmove")) {
      best = text.split(" ")[1] ?? "";
      continue;
    }
    if (!text.startsWith("info") || !text.includes(" pv ")) continue;
    const depth = Number(/ depth (\d+)/.exec(text)?.[1] ?? 0);
    const rank = Number(/ multipv (\d+)/.exec(text)?.[1] ?? 1);
    const score = / score (cp|mate) (-?\d+)/.exec(text);
    const pv = text.split(" pv ")[1]?.trim().split(" ") ?? [];
    if (!score || !pv[0]) continue;
    const line: EngineLine = { move: pv[0], pv };
    if (score[1] === "cp") line.cp = Number(score[2]);
    else line.mate = Number(score[2]);
    const previous = byRank.get(rank);
    if (!previous || depth >= previous.depth) byRank.set(rank, { depth, line });
  }
  const lines = [...byRank.entries()].sort((a, b) => a[0] - b[0]).map(([, value]) => value.line);
  return { best: best === "(none)" ? "" : best, lines };
}
