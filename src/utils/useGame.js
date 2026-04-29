import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import sudoku from "sudoku";
import { entryToBoard } from "./useSocket";

const EMPTY = () => new Array(81).fill("");

const computeProgress = (board, originalBoard) => {
  let total = 0;
  let filled = 0;
  for (let i = 0; i < 81; i++) {
    if (originalBoard[i] === "") {
      total++;
      const v = board[i];
      // notes (arrays) don't count as filled
      if (typeof v === "string" && v !== "") filled++;
    }
  }
  return total === 0 ? 0 : filled / total;
};

export const DIFFICULTY_BANDS = {
  easy: [0, 1.5],
  medium: [1.5, 2.5],
  hard: [2.5, Infinity],
};

const generatePuzzle = (level = "medium") => {
  const [min, max] = DIFFICULTY_BANDS[level] || DIFFICULTY_BANDS.medium;
  let best = null;
  let bestDist = Infinity;
  for (let attempt = 0; attempt < 200; attempt++) {
    const generated = sudoku.makepuzzle();
    const rating = sudoku.ratepuzzle(generated, 20);
    if (rating >= min && rating < max) {
      return {
        originalBoard: generated.map((i) => (i !== null ? String(i + 1) : "")),
        difficulty: rating,
      };
    }
    const dist = rating < min ? min - rating : rating - max;
    if (dist < bestDist) {
      bestDist = dist;
      best = { generated, rating };
    }
  }
  return {
    originalBoard: best.generated.map((i) => (i !== null ? String(i + 1) : "")),
    difficulty: best.rating,
  };
};

const solveOriginal = (originalBoard) => {
  const solved = sudoku.solvepuzzle(
    originalBoard.map((v) => (v === "" ? null : parseInt(v) - 1)),
  );
  return solved ? solved.map((v) => (v === null ? "" : String(v + 1))) : null;
};

export default function useGame(socket) {
  const [originalBoard, setOriginalBoard] = useState(EMPTY);
  const [board, setBoard] = useState(EMPTY);
  const [difficulty, setDifficulty] = useState("");
  const [finished, setFinished] = useState(false);
  const [startedAt, setStartedAt] = useState(null);

  const solutionRef = useRef(null);
  const finishedRef = useRef(false);

  useEffect(() => {
    if (!socket) return;

    const onPuzzle = ({ originalBoard, difficulty, startedAt }) => {
      const key = originalBoard.join(",");
      let restored = originalBoard.slice();
      try {
        const saved = JSON.parse(localStorage.getItem("sudoku.board") || "null");
        if (saved && saved.key === key && Array.isArray(saved.board) && saved.board.length === 81) {
          restored = saved.board;
        }
      } catch {} // eslint-disable-line no-empty
      setOriginalBoard(originalBoard);
      setBoard(restored);
      setDifficulty(difficulty);
      setStartedAt(startedAt ?? Date.now());
      solutionRef.current = solveOriginal(originalBoard);
      finishedRef.current = false;
      setFinished(false);
      // resync progress with server in case we restored mid-game state
      socket.emit("progress", computeProgress(restored, originalBoard));
    };

    const onNeedPuzzle = () => {
      const level = localStorage.getItem("sudoku.difficulty") || "medium";
      socket.emit("new game", generatePuzzle(level));
    };

    socket.on("puzzle", onPuzzle);
    socket.on("need puzzle", onNeedPuzzle);
    return () => {
      socket.off("puzzle", onPuzzle);
      socket.off("need puzzle", onNeedPuzzle);
    };
  }, [socket]);

  const update = useCallback(
    (square, i, val) => {
      if (!socket || finishedRef.current) return;
      const idx = entryToBoard(square, i);
      if (originalBoard[idx] !== "") return;

      setBoard((b) => {
        const next = b.slice();
        next[idx] = val;
        try {
          localStorage.setItem(
            "sudoku.board",
            JSON.stringify({ key: originalBoard.join(","), board: next }),
          );
        } catch {} // eslint-disable-line no-empty
        socket.emit("progress", computeProgress(next, originalBoard));

        const solution = solutionRef.current;
        if (solution && val !== "") {
          let done = true;
          for (let k = 0; k < 81; k++) {
            if (next[k] !== solution[k]) {
              done = false;
              break;
            }
          }
          if (done) {
            finishedRef.current = true;
            setFinished(true);
            // emit handled by the component so it can attach pause-adjusted elapsed
          }
        }
        return next;
      });
    },
    [originalBoard, socket],
  );

  const newGame = useCallback(
    (level = "medium") => {
      if (!socket) return;
      socket.emit("new game", generatePuzzle(level));
    },
    [socket],
  );

  const myProgress = useMemo(
    () => computeProgress(board, originalBoard),
    [board, originalBoard],
  );

  return { board, originalBoard, difficulty, update, newGame, myProgress, finished, startedAt };
}
