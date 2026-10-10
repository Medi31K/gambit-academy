-- Gambit Academy starter lessons (3 per category), added as unpublished drafts.
-- Every position, key move and evaluation was checked with chess.js and Stockfish.
-- Safe to run more than once: a lesson with the same title is not added twice.
-- Review and publish them in Admin > Lessons.
insert into public.lessons (category_id, title, explanation, fen, sort_order, published)
select v.category_id, v.title, v.explanation, v.fen, v.sort_order, false
from (values
  ($txt$checkmates$txt$, $txt$The back-rank mate$txt$, $txt$Black's king is tucked behind three pawns that haven't moved. That shelter is also a cage: the king has no square to step to.
Play Ra8. The rook checks along the eighth rank, nothing can block or capture it, and the king can't move. That's checkmate.
The defence is cheap: one pawn move like h6 ("luft", air for the king) early on gives the king an escape square.
When an opponent's king has no luft, look along its back rank for a rook or queen check.$txt$, $txt$6k1/5ppp/8/8/8/8/5PPP/R5K1 w - - 0 1$txt$, 1),
  ($txt$checkmates$txt$, $txt$Queen and king: mate, not stalemate$txt$, $txt$With a queen and king against a lone king, the queen gives the final check and the king protects her.
Here Qg7 is mate: the queen checks from right next to the black king, and your king on g6 guards her so she can't be taken.
Careful with Qb3. It covers g8 while your king covers g7 and h7, but it isn't check. Black has no legal move, so that's stalemate and the game is a draw.
Before every quiet queen move in these endings, ask: does my opponent still have a legal move?$txt$, $txt$7k/8/6K1/8/8/8/1Q6/8 w - - 0 1$txt$, 2),
  ($txt$checkmates$txt$, $txt$Two rooks: the ladder$txt$, $txt$Two rooks can mate without help from the king. One rook cuts the king off along a rank, the other gives check on the next rank.
The rook on a7 already keeps the black king off the seventh rank. Now Rb8 checks along the eighth rank, and every square the king could use is covered. Checkmate.
In a game you climb the ladder rank by rank, swapping which rook checks. If the king gets close to a rook, move that rook far away along its rank and keep going.$txt$, $txt$4k3/R7/8/8/8/8/8/1R4K1 w - - 0 1$txt$, 3),
  ($txt$tactics$txt$, $txt$The knight fork$txt$, $txt$A fork is one piece attacking two targets at once. Knights are great at it because their jump can't be blocked.
Nc7 gives check and attacks the rook on a8 at the same time. Black has to deal with the check, and then Nxa8 wins the rook.
Look for squares where your knight would hit the king plus something valuable, especially when pieces stand on the same colour square a knight's jump apart.$txt$, $txt$r3k3/8/8/1N6/8/8/8/4K3 w - - 0 1$txt$, 1),
  ($txt$tactics$txt$, $txt$The pin$txt$, $txt$A pin freezes a piece because something more valuable stands behind it.
Play Bb5. The bishop attacks the knight on c6, and the black king is behind it on the same diagonal. The knight can't move at all, because moving it would expose the king to check.
A pin against the king is absolute: the pinned piece has no legal moves. A pin against a queen or rook is relative: the piece may move, but it costs material.
Once a piece is pinned, attack it again. It can't run away.$txt$, $txt$4k3/8/2n5/8/B7/8/8/4K3 w - - 0 1$txt$, 2),
  ($txt$tactics$txt$, $txt$The skewer$txt$, $txt$A skewer is a pin turned around: the valuable piece is in front and has to move, and whatever stood behind it falls.
Ra6 gives check along the sixth rank, with the black queen on h6 behind the king. The king must step off the rank, and then Rxh6 wins the queen.
Kings and queens on the same line, rank or diagonal are a signal to look for a skewer.$txt$, $txt$8/8/2k4q/8/8/8/8/R5K1 w - - 0 1$txt$, 3),
  ($txt$openings$txt$, $txt$Fight for the centre$txt$, $txt$The four centre squares (d4, e4, d5, e5) matter because pieces placed there reach the most of the board.
Both sides started with a centre pawn, and both knights came out towards the middle. White's knight on f3 already attacks Black's pawn on e5, and Black defended it with the knight.
A simple plan for the first moves: one or two centre pawns, knights before bishops, and every move doing something.
Try moving pieces on the board and notice how many more squares a knight controls from the centre than from the edge.$txt$, $txt$r1bqkbnr/pppp1ppp/2n5/4p3/4P3/5N2/PPPP1PPP/RNBQKB1R w KQkq - 2 3$txt$, 1),
  ($txt$openings$txt$, $txt$Don't fall for the early queen attack$txt$, $txt$White's queen and bishop are both aiming at f7, which only the black king defends. White threatens Qxf7, which would be checkmate.
A natural developing move like Nf6 loses on the spot to Qxf7#.
Instead, g6 blocks the attack and hits the queen at the same time, or Qe7 defends f7 directly. Either way, Black is fine, and the white queen has to move again.
Lesson: when a piece comes out early, check what it threatens before you continue your plan.$txt$, $txt$r1bqkbnr/pppp1ppp/2n5/4p2Q/2B1P3/8/PPPP1PPP/RNB1K1NR b KQkq - 3 3$txt$, 2),
  ($txt$openings$txt$, $txt$Castle early$txt$, $txt$White's knight and bishop have left the kingside, so the squares between king and rook are empty.
Castling (O-O) now does two jobs in one move: it tucks the king behind pawns and brings the rook towards the centre.
A king left in the middle gets in the way once files open. In most openings, aim to castle within the first ten moves.$txt$, $txt$r1bqk1nr/pppp1ppp/2n5/2b1p3/2B1P3/5N2/PPPP1PPP/RNBQK2R w KQkq - 4 4$txt$, 3),
  ($txt$endgames$txt$, $txt$The rule of the square$txt$, $txt$Can a king catch a passed pawn without help? Draw a square: from the pawn to its promotion square, then the same distance sideways.
It's Black to move. The pawn on a5 needs four moves to reach a1, so its square runs from a5 to e5 and down to e1. The white king on e4 is already inside it, so it gets back in time however Black plays.
If the king were one file further away, on f4, it would be outside the square and the pawn would promote. (With White to move, the king could step into the square first, so always check whose turn it is.)
With the pawn still on its starting square, remember it can move two squares at once, so draw the square from one rank further forward.$txt$, $txt$7k/8/8/p7/4K3/8/8/8 b - - 0 1$txt$, 1),
  ($txt$endgames$txt$, $txt$The opposition$txt$, $txt$Kings can't stand next to each other. When they face each other with one square between them, the side that does NOT have to move holds the opposition.
White to move wins here with Ke6, taking the opposition. The black king has to give way, and the white king escorts the pawn home.
If it were Black's move instead, Ke7 would take the opposition first, and the game would be a draw.
In king and pawn endings, the king in front of the pawn matters more than the pawn itself.$txt$, $txt$4k3/8/8/4K3/4P3/8/8/8 w - - 0 1$txt$, 2),
  ($txt$endgames$txt$, $txt$King on the sixth rank$txt$, $txt$Here the white king has reached the sixth rank directly in front of its pawn. This is a win whoever is to move.
Kf6 or Kd6 keeps control of the squares in front of the pawn, and the pawn walks through.
For pawns on the b- to g-files, getting your king to the sixth rank in front of the pawn is the target. (Rook pawns are the exception and are often a draw.)$txt$, $txt$4k3/8/4K3/4P3/8/8/8/8 w - - 0 1$txt$, 3),
  ($txt$positional$txt$, $txt$Outposts for knights$txt$, $txt$An outpost is a square in your opponent's half that no enemy pawn can attack. A knight placed there can't be chased away.
Black has no c-pawn and the e-pawn has already passed e6, so no black pawn can ever attack d5. The knight on d5 is a permanent thorn.
When you look for a plan, ask which squares your opponent's pawns can no longer cover, and steer a knight towards them.$txt$, $txt$r4rk1/pp3ppp/3p4/3Np3/4P3/8/PPP2PPP/R4RK1 w - - 0 1$txt$, 1),
  ($txt$positional$txt$, $txt$Good and bad bishops$txt$, $txt$A bishop only ever uses squares of one colour. If your own pawns are fixed on that colour, they get in its way.
Both bishops here run on light squares. White's pawns on c4, d5 and e4 stand on light squares too, so White's bishop on e2 is hemmed in behind them and has few useful squares.
Black's pawns on c5, d6 and e5 are on dark squares, out of the way of Black's bishop on d7, which has open diagonals in both directions.
Rule of thumb: put your pawns on the opposite colour of your bishop.$txt$, $txt$6k1/3b1ppp/3p4/2pPp3/2P1P3/8/4BPPP/6K1 w - - 0 1$txt$, 2),
  ($txt$positional$txt$, $txt$Rooks belong on open files$txt$, $txt$An open file has no pawns on it. A rook there can travel all the way into the opponent's position.
The d-file and c-file are both open. White's rook already controls the d-file, Black's the c-file.
Rd7 puts the rook on the seventh rank, where it attacks the pawns on b7 and f7. Rooks on the seventh are a classic advantage.
Notice both sides have pushed their h-pawn. Without that escape square, a rook check on the back rank would be mate.
Bring your rooks to open files early, before your opponent claims them.$txt$, $txt$2r3k1/pp3pp1/4p2p/8/8/4P2P/PP3PP1/3R2K1 w - - 0 1$txt$, 3),
  ($txt$calculation$txt$, $txt$Checks, captures, threats$txt$, $txt$A good habit before every move: list the forcing moves first. Checks, then captures, then threats.
Here the black queen stands in the centre on d5. Nxd5 simply captures it, because nothing protects it.
That sounds obvious, but in games pieces get left hanging all the time. Scanning for captures first finds these moves before anything fancier.$txt$, $txt$r1b2rk1/ppp2ppp/2n5/3q4/3P4/2N2N2/PP3PPP/R2QKB1R w KQ - 0 1$txt$, 1),
  ($txt$calculation$txt$, $txt$Count attackers and defenders$txt$, $txt$Before capturing on a square, count how many of your pieces attack it and how many of theirs defend it.
The pawn on d5 is attacked twice, by the knight on c3 and the bishop on f3. Look at the black pieces: the knight on c6 and the rook on e6 are close, but neither of them covers d5.
Two attackers, no defenders: the pawn is simply free. Bxd5 even attacks the knight and the rook at once.
When attackers outnumber defenders, and the trades don't cost you a more valuable piece, the capture usually wins material.$txt$, $txt$4k3/8/2n1r3/3p4/8/2N2B2/8/6K1 w - - 0 1$txt$, 2),
  ($txt$calculation$txt$, $txt$Blunder check: what changed?$txt$, $txt$Before you move, look at what your opponent's last move changed. New attacks often come from the piece that just moved.
Black's bishop on c5 now aims at f2. That square is defended only by White's king for now, so it's worth knowing which of your moves would make it weaker.
Here White can simply castle, which adds the rook's protection to f2 and keeps everything safe.
One question per move is enough: what does my opponent want to do next?$txt$, $txt$r1bqk2r/pppp1ppp/2n2n2/2b1p3/2B1P3/3P1N2/PPP2PPP/RNBQK2R w KQkq - 0 1$txt$, 3)
) as v (category_id, title, explanation, fen, sort_order)
where not exists (select 1 from public.lessons l where l.title = v.title);
