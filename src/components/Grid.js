import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import useSocket, { entryToBoard } from "../utils/useSocket";
import useGame from "../utils/useGame";
import useRoom from "../utils/useRoom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPause, faPlay } from "@fortawesome/free-solid-svg-icons";

const AppContainer = styled.div`
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 100vh;
  gap: 2vw;
  padding: 2vmin;
  box-sizing: border-box;

  @media (max-width: 700px) {
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    gap: 1.5vmin;
    padding: 1vmin;
    min-height: unset;
  }
`;

const BoardColumn = styled.div`
  display: flex;
  flex-direction: column;
  align-items: stretch;
`;

const ButtonContainer = styled.div`
  display: flex;
  justify-content: space-between;
`;

const DifficultyIndicator = styled.div`
  margin: 0.5rem;
  padding: 0.25rem 0;
  display: inline-block;
  font-size: 2vmin;
`;

const GameButton = styled.div`
  margin: 0.5rem;
  padding: 0.25rem 0;
  display: inline-block;
  cursor: pointer;
  font-size: 2vmin;
  border-bottom: 1px solid transparent;

  &:hover {
    border-bottom: 1px solid black;
  }
`;

const GridContainer = styled.div`
  position: relative;
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  border: 2px solid black;
  width: min(80vmin, 95vw);
  height: min(80vmin, 95vw);
  margin: 0 auto;
`;

const PauseOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.6);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  font-size: 4vmin;
  font-weight: 600;
`;

const ResumeButton = styled.button`
  font-size: 3vmin;
  padding: 1.2vmin 2.4vmin;
  border: 1px solid #888;
  border-radius: 0.5rem;
  background: white;
  cursor: pointer;
  &:hover {
    background: #f4f4f4;
  }
`;

const ClockRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5vmin;
  margin-bottom: 0.5rem;
`;

const PauseButton = styled.button`
  font-size: 1.8vmin;
  padding: 0.4vmin 1vmin;
  border: 1px solid #ccc;
  border-radius: 0.3rem;
  background: white;
  cursor: pointer;
  &:hover {
    background: #f4f4f4;
  }
`;

const Pad = styled.div`
  display: grid;
  grid-template-columns: repeat(10, 1fr);
  gap: 0.4vmin;
  margin-top: 1vmin;
  width: min(80vmin, 95vw);

  @media (max-width: 700px) {
    grid-template-columns: repeat(5, 1fr);
    gap: 1.5vmin;
    margin-top: 2vmin;
  }
`;

const PadButton = styled.button`
  position: relative;
  font-size: 2.2vmin;
  padding: 0.6vmin 0;
  border: 1px solid #ccc;
  border-radius: 0.3rem;
  background: white;
  color: ${(props) => (props.exhausted ? "#bbb" : "black")};
  cursor: pointer;
  user-select: none;
  line-height: 1;

  &:hover {
    background: #f4f4f4;
  }

  @media (max-width: 700px) {
    font-size: 6vw;
    padding: 2.5vw 0;
    border-radius: 0.5rem;
  }
`;

const PadCount = styled.span`
  display: block;
  font-size: 1.2vmin;
  color: #888;
  margin-top: 0.3vmin;

  @media (max-width: 700px) {
    font-size: 2.5vw;
    margin-top: 0.8vw;
  }
`;

const Square = styled.div`
  border-top: ${(props) => (props.i / 3 >= 1 ? "2px solid black" : "")};
  border-left: ${(props) => (props.i % 3 > 0 ? "2px solid black" : "")};
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
`;

const StyledCell = styled.div`
  border-top: ${(props) => (props.i / 3 >= 1 ? "1px solid #aaa" : "")};
  border-left: ${(props) => (props.i % 3 > 0 ? "1px solid #aaa" : "")};
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  color: ${(props) => (props.isOriginal ? "black" : "#75aadb")};
  font-size: 4vmin;
  user-select: none;
  cursor: ${(props) => (props.isOriginal ? "default" : "pointer")};
  outline: none;

  &:focus {
    background-color: rgba(100, 100, 100, 0.1);
  }
`;

const NotesGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
  width: 100%;
  height: 100%;
  font-size: 1.6vmin;
  line-height: 1;
  color: #888;
  text-align: center;
  place-items: center;
`;

const NameGate = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1rem;
  align-items: center;
  font-size: 2vmin;

  input {
    font-size: 2vw;
    border: solid black 0.2vw;
    padding: 0.4vw 0.8vw;
  }

  button {
    font-size: 2vmin;
    padding: 0.5rem 1rem;
    cursor: pointer;
  }
`;

const PlayersPanel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  min-width: 18vmin;
  font-size: 1.8vmin;
`;

const PlayerRow = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  padding: 0.4rem 0.6rem;
  border: 1px solid ${(props) => (props.isMe ? "#00AA4A" : "#ddd")};
  border-radius: 0.4rem;
  background: ${(props) =>
    props.finishRank ? "rgba(0, 170, 74, 0.08)" : "transparent"};
`;

const PlayerHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
`;

const ProgressBar = styled.div`
  height: 0.8vmin;
  background: #eee;
  border-radius: 0.4vmin;
  overflow: hidden;
`;

const ProgressFill = styled.div`
  height: 100%;
  width: ${(props) => Math.round(props.value * 100)}%;
  background: ${(props) => (props.isMe ? "#00AA4A" : "#75aadb")};
  transition: width 0.2s ease;
`;

const Clock = styled.div`
  text-align: center;
  font-size: 4vmin;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: ${(props) => (props.running ? "#222" : "#999")};
  margin-bottom: 0.5rem;
`;

const Banner = styled.div`
  margin: 0.5rem 0;
  padding: 0.5rem;
  text-align: center;
  background: #fffbe5;
  border: 1px solid #e6dca0;
  border-radius: 0.4rem;
  font-size: 2vmin;
`;

function Cell({ value, idx, i, isOriginal, isSelected, onSelect }) {
  const isNotes = Array.isArray(value);
  return (
    <StyledCell
      i={i}
      onClick={() => onSelect(idx)}
      isOriginal={isOriginal}
      style={
        isSelected
          ? { outline: "2px solid #75aadb", outlineOffset: "-2px", zIndex: 1 }
          : undefined
      }
    >
      {isNotes ? (
        <NotesGrid>
          {[...Array(9)].map((_, n) => (
            <div key={n}>{value.includes(String(n + 1)) ? n + 1 : ""}</div>
          ))}
        </NotesGrid>
      ) : (
        value
      )}
    </StyledCell>
  );
}

const formatMs = (ms) => {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
};

function Players({ players, myId, myProgress }) {
  const sorted = [...players].sort((a, b) => {
    if (a.finishRank && b.finishRank) return a.finishRank - b.finishRank;
    if (a.finishRank) return -1;
    if (b.finishRank) return 1;
    return b.progress - a.progress;
  });
  return (
    <PlayersPanel>
      <div style={{ fontWeight: 700, fontSize: "2.2vmin" }}>Players</div>
      {sorted.map((p) => {
        const isMe = p.id === myId;
        const progress = isMe ? myProgress : p.progress;
        const label = (p.name || "Anon") + (isMe ? " (you)" : "");
        return (
          <PlayerRow key={p.id} isMe={isMe} finishRank={p.finishRank}>
            <PlayerHeader>
              <span>
                {p.isHost && (
                  <span
                    title="host"
                    style={{ color: "#bbb", marginRight: "0.3rem" }}
                  >
                    ★
                  </span>
                )}
                {label}
                {p.finishRank ? ` · #${p.finishRank}` : ""}
                {p.finishMs != null ? ` · ${formatMs(p.finishMs)}` : ""}
              </span>
              <span>{p.score} pts</span>
            </PlayerHeader>
            <ProgressBar>
              <ProgressFill value={progress} isMe={isMe} />
            </ProgressBar>
            <div style={{ fontSize: "1.5vmin", color: "#888" }}>
              {Math.round(progress * 100)}%
            </div>
          </PlayerRow>
        );
      })}
    </PlayersPanel>
  );
}

export default function Grid() {
  const room = window.location.pathname.slice(1) || "1";
  const [name, setName] = useState(
    () => localStorage.getItem("sudoku.name") || "",
  );
  const [draftName, setDraftName] = useState("");

  const [level, setLevel] = useState(
    () => localStorage.getItem("sudoku.difficulty") || "medium",
  );

  const { socket, connected, myId } = useSocket({ room, name });
  const {
    board,
    originalBoard,
    difficulty,
    update,
    newGame,
    myProgress,
    finished,
    startedAt,
  } = useGame(socket);
  const { players, roundOver, nextRoundAt } = useRoom(socket);
  const isHost = players.some((p) => p.id === myId && p.isHost);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const elapsed = startedAt ? Math.max(0, now - startedAt) : 0;
  const countdown = nextRoundAt
    ? Math.max(0, Math.ceil((nextRoundAt - now) / 1000))
    : 0;

  useEffect(() => {
    if (name) localStorage.setItem("sudoku.name", name);
  }, [name]);

  useEffect(() => {
    localStorage.setItem("sudoku.difficulty", level);
  }, [level]);

  const [selectedIdx, setSelectedIdx] = useState(null);
  const [paused, setPaused] = useState(false);

  // unpause automatically when a new round starts
  useEffect(() => {
    if (startedAt) setPaused(false);
  }, [startedAt]);

  const updateAt = (idx, val) => {
    if (idx == null || finished || paused) return;
    if (originalBoard[idx] !== "") return;
    const square = Math.floor(idx / 27) * 3 + Math.floor((idx % 9) / 3);
    const i = (Math.floor(idx / 9) % 3) * 3 + (idx % 3);
    update(square, i, val);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (
        e.key === "ArrowUp" ||
        e.key === "ArrowDown" ||
        e.key === "ArrowLeft" ||
        e.key === "ArrowRight"
      ) {
        e.preventDefault();
        setSelectedIdx((prev) => {
          const cur = prev ?? 0;
          let row = Math.floor(cur / 9);
          let col = cur % 9;
          if (e.key === "ArrowUp") row = (row + 8) % 9;
          else if (e.key === "ArrowDown") row = (row + 1) % 9;
          else if (e.key === "ArrowLeft") col = (col + 8) % 9;
          else if (e.key === "ArrowRight") col = (col + 1) % 9;
          return row * 9 + col;
        });
        return;
      }
      if (paused) return;
      if (selectedIdx == null) return;
      if (e.key === "Backspace" || e.key === "Delete") {
        updateAt(selectedIdx, "");
        return;
      }
      let digit = null;
      if (e.code && e.code.startsWith("Digit")) digit = e.code[5];
      else if (e.code && e.code.startsWith("Numpad") && /[0-9]/.test(e.code[6]))
        digit = e.code[6];
      else if (/^[0-9]$/.test(e.key)) digit = e.key;
      if (digit === null) return;
      if (digit === "0") {
        updateAt(selectedIdx, "");
        return;
      }
      if (e.shiftKey) {
        const cur = board[selectedIdx];
        const cur_notes = Array.isArray(cur) ? cur : [];
        const next = cur_notes.includes(digit)
          ? cur_notes.filter((n) => n !== digit)
          : [...cur_notes, digit];
        updateAt(selectedIdx, next.length ? next : "");
      } else {
        updateAt(selectedIdx, digit);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedIdx, board, originalBoard, finished, paused, update]); // eslint-disable-line react-hooks/exhaustive-deps

  const padInput = (digit) => {
    if (selectedIdx == null) return;
    updateAt(selectedIdx, digit);
  };

  const remaining = (() => {
    const counts = { 1: 9, 2: 9, 3: 9, 4: 9, 5: 9, 6: 9, 7: 9, 8: 9, 9: 9 };
    for (let i = 0; i < 81; i++) {
      const v = board[i];
      if (typeof v === "string" && v in counts) counts[v]--;
    }
    return counts;
  })();

  if (!name) {
    return (
      <AppContainer>
        <NameGate
          onSubmit={(e) => {
            e.preventDefault();
            const trimmed = draftName.trim();
            if (trimmed) setName(trimmed.slice(0, 20));
          }}
        >
          <div>What's your name?</div>
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            maxLength={20}
          />
          <button type="submit">Join room "{room}"</button>
        </NameGate>
      </AppContainer>
    );
  }

  return (
    <AppContainer>
      <BoardColumn>
        <ClockRow>
          <Clock running={!!startedAt && !roundOver && !finished && !paused}>
            {startedAt ? formatMs(elapsed) : "0:00"}
          </Clock>
          {!!startedAt && !roundOver && !finished && (
            <PauseButton onClick={() => setPaused((p) => !p)}>
              {paused ? (
                <FontAwesomeIcon icon={faPlay} />
              ) : (
                <FontAwesomeIcon icon={faPause} />
              )}
            </PauseButton>
          )}
        </ClockRow>
        <ButtonContainer>
          <DifficultyIndicator>
            {difficulty !== "" ? "Difficulty: " + difficulty : ""}
          </DifficultyIndicator>
          {roundOver && isHost && (
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "0.5rem",
              }}
            >
              <select
                value={level}
                onChange={(e) => setLevel(e.target.value)}
                style={{ fontSize: "1.8vmin" }}
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
              <GameButton onClick={() => newGame(level)}>New round</GameButton>
            </div>
          )}
          {roundOver && !isHost && (
            <DifficultyIndicator>
              Waiting for host to start the next round…
            </DifficultyIndicator>
          )}
        </ButtonContainer>
        {finished && !roundOver && (
          <Banner>You finished! Waiting for the others...</Banner>
        )}
        {!finished && myProgress === 1 && (
          <Banner style={{ background: "#ffe5e5", borderColor: "#e6a0a0" }}>
            Board is full but something's wrong — check your numbers.
          </Banner>
        )}
        {roundOver && (
          <Banner>
            Round over.
            {nextRoundAt ? ` Next round in ${countdown}s…` : ""}
          </Banner>
        )}
        <GridContainer>
          {[...Array(9)].map((_, square) => (
            <Square key={square} i={square}>
              {[...Array(9)].map((_, i) => {
                const idx = entryToBoard(square, i);
                return (
                  <Cell
                    key={i}
                    i={i}
                    idx={idx}
                    value={board[idx]}
                    isOriginal={originalBoard[idx] !== ""}
                    isSelected={selectedIdx === idx}
                    onSelect={paused ? () => {} : setSelectedIdx}
                  />
                );
              })}
            </Square>
          ))}
          {paused && (
            <PauseOverlay>
              <ResumeButton onClick={() => setPaused(false)}>
                <FontAwesomeIcon icon={faPlay} />
              </ResumeButton>
            </PauseOverlay>
          )}
        </GridContainer>
        <Pad>
          {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
            <PadButton
              key={d}
              exhausted={remaining[d] <= 0}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => padInput(d)}
            >
              {d}
              <PadCount>{Math.max(0, remaining[d])}</PadCount>
            </PadButton>
          ))}
          <PadButton
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => padInput("")}
            title="Clear cell"
          >
            ✕<PadCount>&nbsp;</PadCount>
          </PadButton>
        </Pad>
      </BoardColumn>
      <Players players={players} myId={myId} myProgress={myProgress} />
    </AppContainer>
  );
}
