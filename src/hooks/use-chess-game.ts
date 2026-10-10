import { useState } from "react";
import { Chess } from "chess.js";
export function useChessGame(fen?: string) {
  const [game] = useState(() => new Chess(fen));
  const [position, setPosition] = useState(game.fen());
  const sync = () => setPosition(game.fen());
  return {
    game,
    position,
    sync,
    undo: () => {
      game.undo();
      sync();
    },
    reset: () => {
      game.reset();
      sync();
    },
  };
}
