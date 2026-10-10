// Labels and explanations for the theme tags in the Lichess puzzle database.
// The text describes what each motif means in general; it never claims
// anything about a specific position that the puzzle data does not state.

interface ThemeInfo {
  label: string;
  // Shown as the first hint, before the piece to move is revealed.
  idea: string;
  // Shown once the puzzle is solved or the solution is revealed.
  explanation: string;
}

const THEMES: Record<string, ThemeInfo> = {
  mateIn1: {
    label: "Mate in 1",
    idea: "There is a checkmate in one move.",
    explanation: "Checkmate in one. Before anything else, check every check you have.",
  },
  mateIn2: {
    label: "Mate in 2",
    idea: "You can force checkmate in two moves.",
    explanation:
      "A forced mate in two. Look at checks first, then moves that take away the king's last squares.",
  },
  mateIn3: {
    label: "Mate in 3",
    idea: "You can force checkmate in three moves.",
    explanation:
      "A forced mate in three. Forcing moves (checks, captures, threats) keep the opponent's replies few enough to calculate.",
  },
  mateIn4: {
    label: "Mate in 4",
    idea: "You can force checkmate in four moves.",
    explanation:
      "A forced mate in four. Long mates are found by following forcing moves, one reply at a time.",
  },
  mateIn5: {
    label: "Mate in 5+",
    idea: "You can force checkmate, but it takes five moves or more.",
    explanation:
      "A long forced mate. Each move limits the king further until it runs out of squares.",
  },
  backRankMate: {
    label: "Back-rank mate",
    idea: "The enemy king is stuck on its back rank behind its own pawns.",
    explanation:
      "Back-rank mate: a rook or queen checks on the last rank, and the king's own pawns block its escape.",
  },
  smotheredMate: {
    label: "Smothered mate",
    idea: "The king is surrounded by its own pieces. A knight can deliver the blow.",
    explanation:
      "Smothered mate: a knight gives checkmate to a king that is boxed in by its own pieces.",
  },
  anastasiaMate: {
    label: "Anastasia's mate",
    idea: "A knight and a rook or queen can trap the king on the edge.",
    explanation:
      "Anastasia's mate: a knight covers the escape squares while a rook or queen mates along the edge file.",
  },
  arabianMate: {
    label: "Arabian mate",
    idea: "A knight and a rook can work together in the corner.",
    explanation:
      "Arabian mate: the rook mates the cornered king while the knight guards the rook and the last escape square.",
  },
  bodenMate: {
    label: "Boden's mate",
    idea: "Two bishops on crossing diagonals can trap the king.",
    explanation:
      "Boden's mate: two bishops on criss-crossing diagonals mate a king blocked by its own pieces.",
  },
  doubleBishopMate: {
    label: "Double bishop mate",
    idea: "Two bishops on neighbouring diagonals can trap the king.",
    explanation: "Double bishop mate: two bishops on adjacent diagonals leave the king no square.",
  },
  dovetailMate: {
    label: "Dovetail mate",
    idea: "The queen can mate a king whose escape squares are blocked by its own pieces.",
    explanation:
      "Dovetail mate: the queen mates from a diagonal next to the king, whose own pieces block the way out.",
  },
  hookMate: {
    label: "Hook mate",
    idea: "A rook, knight and pawn can combine against the king.",
    explanation:
      "Hook mate: the rook mates, protected by a knight, which is in turn protected by a pawn.",
  },
  killBoxMate: {
    label: "Kill box mate",
    idea: "A rook and queen together can box in the king.",
    explanation:
      "Kill box mate: a rook next to the king, backed up by the queen, closes every escape square.",
  },
  vukovicMate: {
    label: "Vukovic mate",
    idea: "A rook and knight can mate the king on the edge.",
    explanation:
      "Vukovic mate: the rook mates with support from another piece, while the knight covers the king's escape squares.",
  },
  triangleMate: {
    label: "Triangle mate",
    idea: "A queen and rook can form a triangle around the king.",
    explanation:
      "Triangle mate: the queen and rook form a triangle that covers all escape squares.",
  },
  balestraMate: {
    label: "Balestra mate",
    idea: "A bishop and queen can trap the king together.",
    explanation:
      "Balestra mate: the bishop gives the mate while the queen covers the remaining escape squares.",
  },
  blindSwineMate: {
    label: "Blind swine mate",
    idea: "Two rooks on the seventh rank can be deadly.",
    explanation: "Blind swine mate: two rooks on the seventh rank work together to mate the king.",
  },
  cornerMate: {
    label: "Corner mate",
    idea: "The king is stuck in the corner.",
    explanation: "Corner mate: a rook or queen and a knight trap the king in the corner.",
  },
  epauletteMate: {
    label: "Epaulette mate",
    idea: "The king's own pieces stand on both sides of it.",
    explanation:
      "Epaulette mate: the king's own pieces block the squares on both sides of it, and it is mated from the front.",
  },
  fork: {
    label: "Fork",
    idea: "Look for a move that attacks two things at once.",
    explanation: "A fork: one piece attacks two targets, and only one of them can be saved.",
  },
  pin: {
    label: "Pin",
    idea: "One of the opponent's pieces can't move without exposing something more valuable.",
    explanation:
      "A pin: a piece can't move (or shouldn't) because a more valuable piece stands behind it.",
  },
  skewer: {
    label: "Skewer",
    idea: "Attack a valuable piece that has something else standing behind it.",
    explanation:
      "A skewer: the valuable piece in front has to move, and the piece behind it is lost.",
  },
  discoveredAttack: {
    label: "Discovered attack",
    idea: "Moving one piece can open a line for another.",
    explanation:
      "A discovered attack: one piece moves out of the way and reveals an attack by the piece behind it.",
  },
  doubleCheck: {
    label: "Double check",
    idea: "Two pieces can give check at the same time.",
    explanation:
      "A double check: the king is attacked twice at once, so the only defence is to move the king.",
  },
  hangingPiece: {
    label: "Hanging piece",
    idea: "Something is undefended. Look for a free piece.",
    explanation:
      "A hanging piece: a piece was left without enough defence and can be won outright.",
  },
  trappedPiece: {
    label: "Trapped piece",
    idea: "One of the opponent's pieces has no safe squares.",
    explanation: "A trapped piece: it has nowhere safe to go and can be won.",
  },
  sacrifice: {
    label: "Sacrifice",
    idea: "Giving up material may be the strongest move here.",
    explanation:
      "A sacrifice: material is given up on purpose to get something bigger, like mate or a winning attack.",
  },
  deflection: {
    label: "Deflection",
    idea: "A defender has an important job. Can you drag it away?",
    explanation:
      "A deflection: a defending piece is forced away from the square or piece it was protecting.",
  },
  attraction: {
    label: "Attraction",
    idea: "Can you lure a piece onto a square where it becomes a target?",
    explanation:
      "An attraction: a piece, often the king, is forced onto a square where a follow-up tactic works.",
  },
  capturingDefender: {
    label: "Remove the defender",
    idea: "Take the piece that is holding the position together.",
    explanation:
      "Removing the defender: capture the piece that protects something, and what it protected falls.",
  },
  clearance: {
    label: "Clearance",
    idea: "One of your pieces is in the way of another.",
    explanation:
      "A clearance: a piece moves, often with tempo, to open a square, file or diagonal for another piece.",
  },
  interference: {
    label: "Interference",
    idea: "Can you put a piece between a defender and what it defends?",
    explanation:
      "Interference: a piece is placed between two enemy pieces, cutting the line that connects them.",
  },
  intermezzo: {
    label: "In-between move",
    idea: "Before the obvious move, is there a stronger one?",
    explanation:
      "An in-between move: instead of the expected reply, a forcing move comes first and changes the picture.",
  },
  xRayAttack: {
    label: "X-ray",
    idea: "A piece can act through another piece on the same line.",
    explanation:
      "An x-ray: a piece attacks or defends a square through another piece standing on the same line.",
  },
  quietMove: {
    label: "Quiet move",
    idea: "The best move isn't a check or a capture.",
    explanation:
      "A quiet move: no check and no capture, yet it sets up a threat the opponent can't meet.",
  },
  defensiveMove: {
    label: "Defensive move",
    idea: "First look at what the opponent is threatening.",
    explanation:
      "A defensive move: the precise move that stops the threat or avoids losing material.",
  },
  exposedKing: {
    label: "Exposed king",
    idea: "The enemy king has little shelter. Go after it.",
    explanation: "An exposed king: with few defenders around it, the king becomes a target.",
  },
  kingsideAttack: {
    label: "Kingside attack",
    idea: "The action is on the side where the king castled.",
    explanation: "A kingside attack: pieces combine against the king after it castled short.",
  },
  queensideAttack: {
    label: "Queenside attack",
    idea: "The action is on the queenside, where the king castled.",
    explanation: "A queenside attack: pieces combine against the king after it castled long.",
  },
  attackingF2F7: {
    label: "Attack on f2/f7",
    idea: "The square next to the king, defended only by the king, is weak.",
    explanation:
      "An attack on f2 or f7: early in the game these squares are protected only by the king.",
  },
  advancedPawn: {
    label: "Advanced pawn",
    idea: "A pawn deep in enemy territory can decide the game.",
    explanation:
      "An advanced pawn: a pawn close to promotion ties down the opponent or turns into a new queen.",
  },
  promotion: {
    label: "Promotion",
    idea: "A pawn is ready to become a new piece.",
    explanation: "Promotion: a pawn reaches the last rank and becomes a queen or another piece.",
  },
  underPromotion: {
    label: "Underpromotion",
    idea: "A queen isn't always the best choice when promoting.",
    explanation:
      "Underpromotion: promoting to a knight, bishop or rook works better than a queen here.",
  },
  enPassant: {
    label: "En passant",
    idea: "Remember the special pawn capture.",
    explanation:
      "En passant: a pawn that just moved two squares can be captured as if it had moved one.",
  },
  castling: {
    label: "Castling",
    idea: "Castling can be part of the solution.",
    explanation: "Castling moves the king to safety and brings a rook into play in one move.",
  },
  zugzwang: {
    label: "Zugzwang",
    idea: "Sometimes the opponent would rather not move at all.",
    explanation: "Zugzwang: every move the opponent has makes their position worse.",
  },
  pawnEndgame: {
    label: "Pawn endgame",
    idea: "Only kings and pawns. Count the moves carefully.",
    explanation: "A pawn endgame: king activity and exact counting decide who promotes first.",
  },
  rookEndgame: {
    label: "Rook endgame",
    idea: "Rook endgames reward active rooks and kings.",
    explanation:
      "A rook endgame: activity of the rook and king usually matters more than material.",
  },
  bishopEndgame: {
    label: "Bishop endgame",
    idea: "Think about which squares the bishops can and can't reach.",
    explanation: "A bishop endgame: the colour of the bishop's squares shapes the whole fight.",
  },
  knightEndgame: {
    label: "Knight endgame",
    idea: "Knights are slow. Count how many moves they need.",
    explanation: "A knight endgame: knight moves are short, so precise counting decides it.",
  },
  queenEndgame: {
    label: "Queen endgame",
    idea: "Queen endgames are full of checks. Look at all of them.",
    explanation: "A queen endgame: checks and king safety decide the outcome.",
  },
  queenRookEndgame: {
    label: "Queen and rook endgame",
    idea: "Heavy pieces left. Look for checks and attacks on the king.",
    explanation: "A queen and rook endgame: heavy pieces work together against an exposed king.",
  },
};

// Lichess tags that describe length, phase or result rather than an idea.
// Keep in sync with public.is_meta_theme() in the database.
export const META_THEMES = new Set([
  "short",
  "long",
  "veryLong",
  "oneMove",
  "opening",
  "middlegame",
  "endgame",
  "advantage",
  "crushing",
  "equality",
  "mate",
  "master",
  "masterVsMaster",
  "superGM",
]);

// The most specific themes come first, so a "smothered mate" puzzle is shown as
// that rather than as "mate in 2".
const PRIORITY = Object.keys(THEMES).sort((a, b) => rank(a) - rank(b));

function rank(theme: string) {
  if (theme.endsWith("Mate")) return 0;
  if (theme.startsWith("mateIn")) return 2;
  if (theme.endsWith("Endgame")) return 3;
  return 1;
}

export function themeLabel(theme: string): string {
  if (THEMES[theme]) return THEMES[theme].label;
  if (theme === "mixed") return "Mixed";
  const words = theme.replace(/([a-z])([A-Z0-9])/g, "$1 $2").toLowerCase();
  return words.charAt(0).toUpperCase() + words.slice(1);
}

export function primaryTheme(themes: string[]): string {
  return (
    PRIORITY.find((theme) => themes.includes(theme)) ??
    themes.find((theme) => !META_THEMES.has(theme)) ??
    "mixed"
  );
}

export function themeInfo(themes: string[], solverMoves: number) {
  const theme = primaryTheme(themes);
  const info = THEMES[theme];
  const plural = solverMoves === 1 ? "move" : "moves";
  if (info) return { theme, ...info };
  if (themes.includes("mate")) {
    return {
      theme,
      label: "Checkmate",
      idea: "There is a forced checkmate.",
      explanation: "A forced checkmate. Forcing moves leave the king no way out.",
    };
  }
  const gain = themes.includes("crushing") || themes.includes("advantage");
  return {
    theme,
    label: themeLabel(theme),
    idea: gain
      ? "There is a way to win material or a decisive advantage."
      : "Look for the most forcing move: checks, captures and threats.",
    explanation: `The solution takes ${solverMoves} ${plural}. Play through it again and notice which move made the difference.`,
  };
}
