import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useRef, useState } from "react";
import { Chess, SQUARES, type PieceSymbol } from "chess.js";
import { Flag, GraduationCap, Lightbulb, RotateCcw, Swords, Undo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { InteractiveBoard } from "@/components/chess/interactive-board";
import { Engine, type Analysis, type EngineLine } from "@/lib/engine";
import { BOTS, COACH_OPTIONS, botMove, type Bot } from "@/lib/bots";
import {
  COACH_LEVELS,
  COACH_NAME,
  COACH_STYLES,
  coachRating,
  describeOwnMove,
  greeting,
  openingLine,
  type CoachLevel,
  type CoachStyle,
} from "@/lib/coach";
import { CoachAvatar } from "@/components/chess/coach-avatar";
import { QualityIcon } from "@/components/chess/quality-icon";
import {
  LABELS,
  LABEL_ORDER,
  reviewMove,
  winChance,
  type MoveLabel,
  type MoveReview,
} from "@/lib/move-quality";
import { loadOpenings, lookupOpening } from "@/lib/openings";
import { tryMove, uciMove } from "@/lib/chess-logic";
import { pageHead } from "@/lib/metadata";

export const Route = createFileRoute("/play")({
  head: () =>
    pageHead(
      "Play",
      "Play free chess against bots from beginner to master, with an optional coach that rates your moves.",
    ),
  component: Play,
});

type Side = "w" | "b";
interface Setup {
  // The coach is played like a bot, with id "coach".
  bot: Bot;
  side: Side;
  coach: boolean;
  level?: CoachLevel;
}

function Play() {
  const [setup, setSetup] = useState<Setup | null>(null);
  const [round, setRound] = useState(0);
  // The setup screen is long on a phone; start each screen from the top.
  useEffect(() => window.scrollTo(0, 0), [setup]);
  return (
    <div className="page">
      <div className="page-heading">
        <h1>Play</h1>
        <p>Play {COACH_NAME}, who talks you through the game, or take on a bot.</p>
      </div>
      {setup ? (
        <GameView
          key={round}
          setup={setup}
          rematch={() => setRound((n) => n + 1)}
          change={() => setSetup(null)}
        />
      ) : (
        <SetupView start={setSetup} />
      )}
    </div>
  );
}

function Avatar({ bot, size = 44 }: { bot: Bot; size?: number }) {
  if (bot.id === "coach") return <CoachAvatar size={size} className="coach-face" />;
  return (
    <span
      className="bot-avatar"
      style={{ background: bot.color, width: size, height: size, fontSize: size * 0.42 }}
      aria-hidden="true"
    >
      {bot.name.replace(/^(The|Professor) /, "").charAt(0)}
    </span>
  );
}

function SidePicker({
  side,
  setSide,
}: {
  side: Side | "random";
  setSide: (side: Side | "random") => void;
}) {
  return (
    <div className="side-picker" role="radiogroup" aria-label="Your colour">
      <span className="panel-text">Play as</span>
      {(["w", "random", "b"] as const).map((value) => (
        <Button
          key={value}
          type="button"
          role="radio"
          aria-checked={side === value}
          variant={side === value ? "secondary" : "ghost"}
          onClick={() => setSide(value)}
        >
          {value === "w" ? "White" : value === "b" ? "Black" : "Random"}
        </Button>
      ))}
    </div>
  );
}

const pickSide = (side: Side | "random"): Side =>
  side === "random" ? (Math.random() < 0.5 ? "w" : "b") : side;

function SetupView({ start }: { start: (setup: Setup) => void }) {
  const [tab, setTab] = useState<"coach" | "bots">("coach");
  const [bot, setBot] = useState<Bot>(
    () => BOTS.find((item) => item.id === "margot") ?? (BOTS[0] as Bot),
  );
  const [level, setLevel] = useState<CoachLevel>(
    () => COACH_LEVELS.find((item) => item.id === "club") ?? (COACH_LEVELS[0] as CoachLevel),
  );
  const [style, setStyle] = useState<CoachStyle>("balanced");
  const [side, setSide] = useState<Side | "random">("w");
  const rating = coachRating(level, style);
  return (
    <div className="play-setup">
      <div className="mode-switch" role="tablist" aria-label="Opponent type">
        <button
          type="button"
          role="tab"
          aria-selected={tab === "coach"}
          className={tab === "coach" ? "active" : ""}
          onClick={() => setTab("coach")}
        >
          <GraduationCap />
          <span>
            <strong>Play the coach</strong>
            {COACH_NAME} rates every move, explains her own, and lets you take moves back.
          </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={tab === "bots"}
          className={tab === "bots" ? "active" : ""}
          onClick={() => setTab("bots")}
        >
          <Swords />
          <span>
            <strong>Play a bot</strong>A normal game against a character. Full review at the end.
          </span>
        </button>
      </div>
      {tab === "coach" ? (
        <div className="coach-setup">
          <div className="coach-intro">
            <CoachAvatar size={104} className="coach-face" />
            <p className="speech">{greeting(level)}</p>
          </div>
          <div className="coach-options">
            <div>
              <h2 className="panel-title">Your level</h2>
              <div className="level-list" role="radiogroup" aria-label="Your level">
                {COACH_LEVELS.map((item) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={item.id === level.id}
                    key={item.id}
                    className={item.id === level.id ? "active" : ""}
                    onClick={() => setLevel(item)}
                  >
                    {item.label} <span>{item.rating}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <h2 className="panel-title">How hard?</h2>
              <div className="style-list" role="radiogroup" aria-label="Difficulty">
                {(Object.keys(COACH_STYLES) as CoachStyle[]).map((key) => (
                  <button
                    type="button"
                    role="radio"
                    aria-checked={style === key}
                    key={key}
                    className={style === key ? "active" : ""}
                    onClick={() => setStyle(key)}
                  >
                    <strong>{COACH_STYLES[key].label}</strong>
                    {COACH_STYLES[key].text}
                  </button>
                ))}
              </div>
              <p className="panel-text">
                {COACH_NAME} will play at about {rating}. At lower levels she sometimes leaves a
                piece hanging, the way real players do. See if you can spot it.
              </p>
            </div>
          </div>
          <div className="play-start">
            <SidePicker side={side} setSide={setSide} />
            <Button
              size="lg"
              onClick={() =>
                start({
                  bot: {
                    id: "coach",
                    name: COACH_NAME,
                    rating,
                    blurb: "",
                    color: "#9c4a3c",
                  },
                  coach: true,
                  level,
                  side: pickSide(side),
                })
              }
            >
              Play {COACH_NAME}
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="bot-grid" role="radiogroup" aria-label="Opponent">
            {BOTS.map((item) => (
              <button
                type="button"
                role="radio"
                aria-checked={item.id === bot.id}
                key={item.id}
                className={`bot-card ${item.id === bot.id ? "active" : ""}`}
                onClick={() => setBot(item)}
              >
                <Avatar bot={item} />
                <span>
                  <strong>{item.name}</strong>
                  <span className="bot-rating">≈ {item.rating}</span>
                  <span className="bot-blurb">{item.blurb}</span>
                </span>
              </button>
            ))}
          </div>
          <div className="play-start">
            <SidePicker side={side} setSide={setSide} />
            <Button size="lg" onClick={() => start({ bot, coach: false, side: pickSide(side) })}>
              Play {bot.name}
            </Button>
          </div>
        </>
      )}
      <p className="panel-text">
        Ratings are Gambit Academy estimates, not official Elo. {COACH_NAME} and the bots run on the
        Stockfish engine, right in your browser.
      </p>
    </div>
  );
}

interface PlayedMove {
  san: string;
  to: string;
  color: Side;
  review?: MoveReview;
}

type Arrow = { startSquare: string; endSquare: string; color: string };

// Ratings that come with an arrow to the better move.
const SHOW_BETTER: MoveLabel[] = ["inaccuracy", "mistake", "miss", "blunder"];

function resultText(game: Chess, side: Side, resigned: boolean): string {
  if (resigned) return "You resigned.";
  if (game.isCheckmate())
    return game.turn() === side ? "Checkmate. You lost." : "Checkmate. You won!";
  if (game.isStalemate()) return "Draw by stalemate.";
  if (game.isThreefoldRepetition()) return "Draw by repetition.";
  if (game.isInsufficientMaterial()) return "Draw. Neither side can mate.";
  if (game.isDraw()) return "Draw by the 50-move rule.";
  return "";
}

// A finished position has no engine line, so describe it for the reviewer.
function finalAnalysis(game: Chess): Analysis {
  const line: EngineLine = game.isCheckmate()
    ? { move: "", mate: -1, pv: [] }
    : { move: "", cp: 0, pv: [] };
  return { best: "", lines: [line] };
}

function GameView({
  setup,
  rematch,
  change,
}: {
  setup: Setup;
  rematch: () => void;
  change: () => void;
}) {
  const { bot, side, coach, level } = setup;
  // What the coach is saying, newest last.
  const [talk, setTalk] = useState<string[]>(() =>
    level ? [greeting(level), openingLine(side)] : [],
  );
  const say = (line: string) => line && setTalk((list) => [...list.slice(-3), line]);
  const [game] = useState(() => new Chess());
  const [position, setPosition] = useState(game.fen());
  const [moves, setMoves] = useState<PlayedMove[]>([]);
  const [thinking, setThinking] = useState(false);
  const [engineError, setEngineError] = useState("");
  const [resigned, setResigned] = useState(false);
  const [arrows, setArrows] = useState<Arrow[]>([]);
  const [hint, setHint] = useState(0);
  // Evaluation from the player's side, -1 to 1.
  const [evaluation, setEvaluation] = useState<number | null>(null);
  const engine = useRef<Engine | null>(null);
  const generation = useRef(0);
  const cache = useRef(new Map<string, Promise<Analysis>>());
  // The last opening the coach named, so she doesn't repeat herself.
  const announced = useRef("");

  const over = resigned || game.isGameOver();
  const yourTurn = !over && !thinking && game.turn() === side;
  const lastReview = [...moves].reverse().find((move) => move.review)?.review;

  const sync = () => setPosition(game.fen());

  const analyse = useCallback((fen: string) => {
    const engineRef = engine.current;
    if (!engineRef) return Promise.reject(new Error("Engine not ready"));
    let pending = cache.current.get(fen);
    if (!pending) {
      pending = engineRef.analyse(fen, { depth: 12, multipv: 2 }, COACH_OPTIONS);
      cache.current.set(fen, pending);
    }
    return pending;
  }, []);

  const botTurn = useCallback(async () => {
    const engineRef = engine.current;
    if (!engineRef || game.isGameOver()) return;
    const gen = generation.current;
    const started = Date.now();
    setThinking(true);
    try {
      const fen = game.fen();
      const { uci } = await botMove(engineRef, fen, bot.rating);
      const wait = 450 - (Date.now() - started);
      if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait));
      if (gen !== generation.current) return;
      const move = uciMove(game, uci);
      if (!move) throw new Error("The bot picked an illegal move.");
      setMoves((list) => [...list, { san: move.san, to: move.to, color: move.color }]);
      sync();
      if (coach) {
        let line = describeOwnMove(fen, uci);
        const opening = await lookupOpening(game.fen());
        if (opening?.exact && opening.name !== announced.current) {
          announced.current = opening.name;
          const named = `This is the ${opening.name}.`;
          line = line === "Your move." ? named : `${line} ${named}`;
        }
        if (gen === generation.current) say(line);
      }
      if (!game.isGameOver()) {
        // Analyse the player's position early, so rating their move is quick.
        void analyse(game.fen()).then((result) => {
          if (gen === generation.current) setEvaluation(winChance(result.lines[0]));
        });
      }
    } catch (error) {
      setEngineError(error instanceof Error ? error.message : "The engine stopped working.");
    } finally {
      if (gen === generation.current) setThinking(false);
    }
    // `game` is stable for the whole game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analyse, bot.rating]);

  useEffect(() => {
    let created: Engine;
    try {
      created = new Engine();
    } catch {
      setEngineError("Your browser couldn't start the chess engine.");
      return;
    }
    engine.current = created;
    void loadOpenings();
    void created.newGame().then(() => {
      if (side === "w") void analyse(game.fen()).then((r) => setEvaluation(winChance(r.lines[0])));
      else void botTurn();
    });
    return () => {
      generation.current++;
      created.terminate();
      engine.current = null;
    };
    // Runs once per game.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function onMove(from: string, to: string, promotion: PieceSymbol = "q") {
    if (!yourTurn) return false;
    const fenBefore = game.fen();
    const move = tryMove(game, from, to, promotion);
    if (!move) return false;
    const uci = move.from + move.to + (move.promotion ?? "");
    const index = moves.length;
    const gen = generation.current;
    setMoves((list) => [...list, { san: move.san, to: move.to, color: move.color }]);
    setArrows([]);
    setHint(0);
    sync();
    setThinking(true);
    void (async () => {
      try {
        const before = await analyse(fenBefore);
        const fenAfter = game.fen();
        const after = game.isGameOver() ? finalAnalysis(game) : await analyse(fenAfter);
        const opening = await lookupOpening(fenAfter);
        if (gen !== generation.current) return;
        if (opening?.exact) announced.current = opening.name;
        const review = reviewMove(fenBefore, uci, before, after, opening?.name);
        setMoves((list) => list.map((item, i) => (i === index ? { ...item, review } : item)));
        setEvaluation(-winChance(after.lines[0]));
        if (coach && game.isCheckmate()) say("Checkmate! Well played. You earned that one.");
        if (coach && review.better && SHOW_BETTER.includes(review.label)) {
          setArrows([
            {
              startSquare: review.better.uci.slice(0, 2),
              endSquare: review.better.uci.slice(2, 4),
              color: "#4f8a5b",
            },
          ]);
        }
      } catch {
        // Rating is a bonus; the game goes on without it.
      }
      if (gen !== generation.current) return;
      if (game.isGameOver()) setThinking(false);
      else await botTurn();
    })();
    return true;
  }

  function takeBack() {
    if (thinking || !moves.length) return;
    generation.current++;
    // Undo the bot's reply and your move, so it's your turn again.
    let undone = 0;
    do {
      game.undo();
      undone++;
    } while (game.turn() !== side && game.history().length);
    if (game.turn() !== side) {
      // Only the bot's first move is left (you play Black): keep it.
      void botTurn();
    }
    setMoves((list) => list.slice(0, Math.max(0, list.length - undone)));
    setArrows([]);
    setHint(0);
    setResigned(false);
    sync();
    void analyse(game.fen())
      .then((r) => setEvaluation(winChance(r.lines[0])))
      .catch(() => undefined);
  }

  async function showHint() {
    if (!yourTurn) return;
    const result = await analyse(game.fen()).catch(() => null);
    const best = result?.best;
    if (!best) return;
    const level = Math.min(hint + 1, 2);
    setHint(level);
    setArrows(
      level === 1
        ? []
        : [{ startSquare: best.slice(0, 2), endSquare: best.slice(2, 4), color: "#c2702f" }],
    );
  }

  const hintSquare = hint === 1 ? cache.current.get(game.fen()) : undefined;
  const [hintFrom, setHintFrom] = useState<string>();
  useEffect(() => {
    if (!hintSquare) return setHintFrom(undefined);
    void hintSquare.then((r) => setHintFrom(r.best.slice(0, 2)));
  }, [hintSquare]);

  const result = over ? resultText(game, side, resigned) : "";
  // The rating sits on the square your last move went to, while your piece is still there.
  const lastMine = [...moves].reverse().find((move) => move.color === side);
  const badgeSquare = SQUARES.find((square) => square === lastMine?.to);
  const badge =
    (coach || over) && lastMine?.review && badgeSquare && game.get(badgeSquare)?.color === side
      ? {
          square: badgeSquare,
          content: <QualityIcon label={lastMine.review.label} />,
        }
      : undefined;
  const playerMoves = moves.filter((move) => move.color === side && move.review);
  const accuracy = playerMoves.length
    ? Math.round(
        playerMoves.reduce((sum, move) => sum + (move.review?.accuracy ?? 0), 0) /
          playerMoves.length,
      )
    : null;

  return (
    <div className="workspace">
      <div className="board-column">
        <div className="player-strip">
          <Avatar bot={bot} size={34} />
          <span>
            <strong>{bot.id === "coach" ? `Coach ${bot.name}` : bot.name}</strong>{" "}
            <span className="bot-rating">≈ {bot.rating}</span>
          </span>
          {thinking && !over && <span className="thinking">Thinking…</span>}
        </div>
        <div className={coach ? "board-with-eval" : ""}>
          {coach && <VerticalEval value={evaluation ?? 0} side={side} />}
          <InteractiveBoard
            id="gambit-board"
            game={game}
            position={position}
            orientation={side === "w" ? "white" : "black"}
            onMove={onMove}
            disabled={!yourTurn}
            hintSquare={hint === 1 ? hintFrom : undefined}
            arrows={arrows}
            badge={badge}
          />
        </div>
        <div className="board-bar">
          <span className="turn-indicator" aria-live="polite">
            {over ? result : yourTurn ? "Your move" : `${bot.name} is thinking`}
          </span>
          <div className="board-tools">
            {coach && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Hint"
                  aria-label="Hint"
                  disabled={!yourTurn}
                  onClick={() => void showHint()}
                >
                  <Lightbulb />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  title="Take back"
                  aria-label="Take back"
                  disabled={thinking || !moves.some((m) => m.color === side)}
                  onClick={takeBack}
                >
                  <Undo2 />
                </Button>
              </>
            )}
            <Button
              variant="ghost"
              size="icon"
              title="Resign"
              aria-label="Resign"
              disabled={over || !moves.length}
              onClick={() => {
                if (window.confirm("Resign this game?")) {
                  generation.current++;
                  setThinking(false);
                  setResigned(true);
                }
              }}
            >
              <Flag />
            </Button>
          </div>
        </div>
      </div>
      <aside className="side-panel">
        {engineError && (
          <div className="feedback" role="alert">
            {engineError} Try reloading the page.
          </div>
        )}
        {coach && (
          <div className="coach-talk">
            <CoachAvatar size={64} className="coach-face" />
            <div className="speech" aria-live="polite">
              {talk.at(-1) ?? ""}
            </div>
          </div>
        )}
        {coach && !over && (
          <>
            {evaluation !== null && <EvalBar value={evaluation} />}
            <CoachNote review={lastReview} hint={hint} />
          </>
        )}
        {over && (
          <div className="game-review">
            <h2 className="panel-title">{result}</h2>
            {accuracy !== null && (
              <p className="review-accuracy">
                <strong>{accuracy}%</strong> accuracy
                <span>Based on the engine's view of each of your moves.</span>
              </p>
            )}
            <LabelCounts moves={playerMoves} />
            <div className="admin-actions">
              <Button onClick={rematch}>
                <RotateCcw />
                Play again
              </Button>
              <Button variant="outline" onClick={change}>
                Change opponent
              </Button>
            </div>
          </div>
        )}
        <h2 className="panel-title mt-6">Moves</h2>
        <MoveList moves={moves} side={side} showRatings={coach || over} />
        {!over && (
          <Button variant="link" className="px-0" onClick={change}>
            Change opponent
          </Button>
        )}
      </aside>
    </div>
  );
}

// Vertical bar beside the board. White's share sits on White's side of the board.
function VerticalEval({ value, side }: { value: number; side: Side }) {
  const yours = (value + 1) / 2;
  const white = side === "w" ? yours : 1 - yours;
  return (
    <div
      className={`eval-vertical ${side === "b" ? "flipped" : ""}`}
      role="img"
      aria-label={`Evaluation: White ${Math.round(white * 100)}%`}
    >
      <span style={{ height: `${Math.round(white * 100)}%` }} />
    </div>
  );
}

// What the bar beside the board means, in words.
function EvalBar({ value }: { value: number }) {
  const percent = Math.round(((value + 1) / 2) * 100);
  return (
    <div className="eval">
      <span className="panel-text">
        {percent >= 60
          ? "You're better here."
          : percent <= 40
            ? "Your opponent is better here."
            : "The position is about equal."}
      </span>
    </div>
  );
}

function CoachNote({ review, hint }: { review: MoveReview | undefined; hint: number }) {
  if (hint)
    return (
      <div className="feedback">
        <Lightbulb />
        <span>
          {hint === 1
            ? "The piece to move is outlined. Tap Hint again to see the move."
            : "The arrow shows the engine's best move."}
        </span>
      </div>
    );
  if (!review)
    return <p className="panel-text">Make a move and I'll tell you what I think of it.</p>;
  return (
    <div className={`coach-note q-${review.label}`} role="status">
      <QualityIcon label={review.label} size={30} />
      <div>
        <strong>{LABELS[review.label].name}</strong>
        <p>{review.comment}</p>
        {review.better && SHOW_BETTER.includes(review.label) && (
          <p className="panel-text">The green arrow shows the better move.</p>
        )}
      </div>
    </div>
  );
}

// How many of your moves earned each rating, best first.
function LabelCounts({ moves }: { moves: PlayedMove[] }) {
  return (
    <dl className="label-counts">
      {LABEL_ORDER.map((label) => {
        const count = moves.filter((move) => move.review?.label === label).length;
        return (
          <div key={label} className={`q-${label} ${count ? "" : "none"}`}>
            <dt>{LABELS[label].name}</dt>
            <dd>{count}</dd>
            <QualityIcon label={label} size={26} />
          </div>
        );
      })}
    </dl>
  );
}

function MoveList({
  moves,
  side,
  showRatings,
}: {
  moves: PlayedMove[];
  side: Side;
  showRatings: boolean;
}) {
  if (!moves.length) return <p className="panel-text">No moves yet.</p>;
  const rows: [PlayedMove | undefined, PlayedMove | undefined][] = [];
  const start = moves[0]?.color === "b" ? 1 : 0;
  const padded = start ? [undefined, ...moves] : moves;
  for (let i = 0; i < padded.length; i += 2) rows.push([padded[i], padded[i + 1]]);
  const cell = (move: PlayedMove | undefined) => (
    <span className="move-cell">
      {move?.san ?? ""}
      {showRatings && move?.color === side && move.review && (
        <QualityIcon label={move.review.label} size={16} className="quality-mini" />
      )}
    </span>
  );
  return (
    <div className="move-list play-moves">
      {rows.map((row, i) => (
        <div className="contents" key={i}>
          <span>{i + 1}.</span>
          {cell(row[0])}
          {cell(row[1])}
        </div>
      ))}
    </div>
  );
}
