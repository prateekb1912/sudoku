import React, { useEffect, useRef, useState } from "react";
import styled from "styled-components";
import useSocket, { entryToBoard } from "../utils/useSocket";
import useGame from "../utils/useGame";
import useRoom from "../utils/useRoom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPause, faPlay, faEraser } from "@fortawesome/free-solid-svg-icons";

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
    padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 50vw);
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
  border: none;
  width: min(80vmin, 95vw);
  height: min(80vmin, 95vw);
  margin: 0 auto;

  @media (max-width: 700px) {
    width: min(99vw, 55vh);
    height: min(99vw, 55vh);
  }
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
  grid-template-columns: repeat(11, 1fr);
  gap: 0.4vmin;
  margin-top: 1vmin;
  width: min(80vmin, 95vw);

  @media (max-width: 700px) {
    position: fixed;
    left: 0;
    right: 0;
    bottom: calc(env(safe-area-inset-bottom, 0px) + 2vw);
    width: 100vw;
    margin-top: 0;
    padding: 0 3vw;
    box-sizing: border-box;
    grid-template-columns: repeat(5, 1fr);
    grid-auto-rows: 1fr;
    gap: 2vw;
    justify-items: center;
    z-index: 5;

    .notes-inline {
      display: none;
    }
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
    width: 100%;
    aspect-ratio: 1 / 1;
    padding: 0;
    font-size: 7vw;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }
`;

const NotesToggleFloating = styled.button`
  display: none;

  @media (max-width: 700px) {
    display: flex;
    align-items: center;
    justify-content: center;
    position: fixed;
    left: 50%;
    transform: translateX(-50%);
    bottom: calc(env(safe-area-inset-bottom, 0px) + 44vw);
    width: 13vw;
    height: 13vw;
    border-radius: 50%;
    border: 1px solid #ccc;
    background: ${(props) => (props.active ? "#d6e6fb" : "white")};
    border-color: ${(props) => (props.active ? "#3b82f6" : "#ccc")};
    font-size: 6vw;
    cursor: pointer;
    z-index: 6;
    box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08);
  }
`;

const PreRoundOverlay = styled.div`
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10;
  padding: 4vmin;
`;

const PreRoundCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 0.8rem;
  padding: 3vmin 4vmin;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.08);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5vmin;
  font-size: 2vmin;

  select,
  button {
    font-size: 2vmin;
  }

  @media (max-width: 700px) {
    padding: 5vw 6vw;
    gap: 4vw;
    font-size: 4vw;

    select,
    button {
      font-size: 4vw;
    }
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
  border-top: ${(props) => (props.i / 3 >= 1 ? "1px solid #6ea5cf" : "")};
  border-left: ${(props) => (props.i % 3 > 0 ? "1px solid #6ea5cf" : "")};
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  grid-template-rows: 1fr 1fr 1fr;
`;

const StyledCell = styled.div`
  border-top: none;
  border-left: none;
  position: relative;
  display: flex;

  &::after {
    content: "";
    position: absolute;
    left: 18%;
    right: 18%;
    bottom: 6%;
    height: 1px;
    background: #d8dde3;
    display: ${(props) => (Math.floor(props.i / 3) === 2 ? "none" : "block")};
  }

  &::before {
    content: "";
    position: absolute;
    top: 18%;
    bottom: 18%;
    right: 6%;
    width: 1px;
    background: #d8dde3;
    display: ${(props) => (props.i % 3 === 2 ? "none" : "block")};
  }
  align-items: center;
  justify-content: center;
  text-align: center;
  color: ${(props) => (props.isOriginal ? "#4a4a4a" : "#7a7a7a")};
  font-weight: 400;
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
  font-size: 2vmin;
  line-height: 1;
  color: #6b7a90;
  text-align: center;
  place-items: center;

  @media (max-width: 700px) {
    font-size: 2.6vw;
  }
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

const SidePanels = styled.div`
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: flex-start;
  flex-wrap: wrap;
`;

const Panel = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  min-width: 18vmin;
  max-height: 70vh;
  overflow-y: auto;
  padding: 0.6rem;
  border: 1px solid #ddd;
  border-radius: 0.5rem;
  background: white;

  @media (max-width: 700px) {
    width: 92vw;
    min-width: 0;
    max-height: 35vh;
  }
`;

const PlayersPanel = styled(Panel)`
  font-size: 1.8vmin;
`;

const HistoryPanel = styled(Panel)`
  font-size: 1.6vmin;
`;

const HistoryRound = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.3rem 0.5rem;
  border: 1px solid #eee;
  border-radius: 0.3rem;
`;

const HistoryTitle = styled.div`
  font-weight: 600;
  font-size: 1.5vmin;
  color: #555;
`;

const HistoryRow = styled.div`
  display: flex;
  justify-content: space-between;
  gap: 0.5rem;
  font-weight: ${(props) => (props.isMe ? 600 : 400)};
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
  background: #f3f4f6;
  border: 1px solid #d1d5db;
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

const LeaderboardOverlay = styled.div`
  position: fixed;
  inset: 0;
  background: rgba(20, 18, 5, 0.55);
  backdrop-filter: blur(6px);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  z-index: 1000;
`;

const LeaderboardCard = styled.div`
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 1rem;
  padding: 2rem 2.4rem;
  width: min(560px, 92vw);
  max-height: 92vh;
  overflow-y: auto;
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.35);
`;

const LeaderboardSubtitle = styled.div`
  text-align: center;
  font-size: 1.6vmin;
  color: #806a2a;
  margin-bottom: 1rem;
`;

const LeaderboardTitle = styled.div`
  font-size: 2.4vmin;
  font-weight: 800;
  text-align: center;
  letter-spacing: 0.05em;
  color: #6b4d00;
  margin-bottom: 0.9rem;
`;

const LeaderboardRow = styled.div`
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 0.9rem;
  padding: 0.6rem 0.8rem;
  border-radius: 0.5rem;
  background: ${(p) =>
    p.rank === 1
      ? "rgba(255, 215, 0, 0.25)"
      : p.rank === 2
        ? "rgba(192, 192, 192, 0.22)"
        : p.rank === 3
          ? "rgba(205, 127, 50, 0.22)"
          : "rgba(255, 255, 255, 0.45)"};
  border: 1px solid
    ${(p) =>
      p.rank === 1
        ? "#e6c000"
        : p.rank === 2
          ? "#b8b8b8"
          : p.rank === 3
            ? "#b87333"
            : "#e8d999"};
  outline: ${(p) => (p.isMe ? "2px solid #00AA4A" : "none")};
  outline-offset: 2px;
  margin-bottom: 0.4rem;
`;

const LbMedal = styled.div`
  font-size: 2.4vmin;
  font-weight: 800;
  width: 2.6vmin;
  text-align: center;
`;

const LbName = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
`;

const LbPlayerName = styled.div`
  font-size: 2vmin;
  font-weight: 700;
  color: #2a1f00;
`;

const LbStats = styled.div`
  font-size: 1.4vmin;
  color: #806a2a;
`;

const LbPoints = styled.div`
  font-size: 2.4vmin;
  font-weight: 800;
  color: #6b4d00;
`;

const LbActions = styled.div`
  display: flex;
  justify-content: center;
  margin-top: 0.9rem;
`;

function FinalLeaderboard({ players, history, myId, isHost, onStartNew }) {
  const sorted = [...players].sort((a, b) => b.score - a.score);
  const medal = (rank) =>
    rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`;
  const winner = sorted[0];
  return (
    <LeaderboardOverlay>
      <LeaderboardCard>
        <LeaderboardTitle>FINAL LEADERBOARD</LeaderboardTitle>
        {winner && (
          <LeaderboardSubtitle>
            {winner.name || "Anon"} wins with {winner.score} pts
          </LeaderboardSubtitle>
        )}
        {sorted.map((p, i) => {
          const rank = i + 1;
          const isMe = p.id === myId;
          const times = history
            .flatMap((h) => h.results)
            .filter((r) => r.playerId === p.id && r.finishMs != null)
            .map((r) => r.finishMs);
          const totalMs = times.reduce((a, b) => a + b, 0);
          const bestMs = times.length ? Math.min(...times) : null;
          const wins = history.filter(
            (h) => h.results.find((r) => r.rank === 1)?.playerId === p.id,
          ).length;
          return (
            <LeaderboardRow key={p.id} rank={rank} isMe={isMe}>
              <LbMedal>{medal(rank)}</LbMedal>
              <LbName>
                <LbPlayerName>
                  {p.name || "Anon"}
                  {isMe && (
                    <span
                      style={{
                        marginLeft: "0.5rem",
                        fontSize: "1.4vmin",
                        color: "#00AA4A",
                        fontWeight: 600,
                      }}
                    >
                      you
                    </span>
                  )}
                </LbPlayerName>
                {bestMs != null && (
                  <LbStats>
                    {wins} {wins === 1 ? "win" : "wins"} · best{" "}
                    {formatMs(bestMs)} · total {formatMs(totalMs)}
                  </LbStats>
                )}
              </LbName>
              <LbPoints>{p.score}</LbPoints>
            </LeaderboardRow>
          );
        })}
        <LbActions>
          {isHost ? (
            <GameButton onClick={onStartNew}>Start new game</GameButton>
          ) : (
            <div style={{ color: "#806a2a", fontSize: "1.6vmin" }}>
              Waiting for host to start a new game…
            </div>
          )}
        </LbActions>
      </LeaderboardCard>
    </LeaderboardOverlay>
  );
}

function Players({ players, myId, myProgress, history }) {
  const sorted = [...players].sort((a, b) => {
    if (a.finishRank && b.finishRank) return a.finishRank - b.finishRank;
    if (a.finishRank) return -1;
    if (b.finishRank) return 1;
    return b.progress - a.progress;
  });
  return (
    <SidePanels>
      <PlayersPanel>
        <div style={{ fontWeight: 700, fontSize: "2.2vmin" }}>Players</div>
        {sorted.map((p) => {
          const isMe = p.id === myId;
          const progress = isMe ? myProgress : p.progress;
          return (
            <PlayerRow key={p.id} isMe={isMe} finishRank={p.finishRank}>
              <PlayerHeader>
                <span>
                  <span
                    title={p.disconnected ? "disconnected" : "online"}
                    style={{
                      display: "inline-block",
                      width: "0.9vmin",
                      height: "0.9vmin",
                      borderRadius: "50%",
                      background: p.disconnected ? "#e53935" : "#22c55e",
                      marginRight: "0.5rem",
                      verticalAlign: "middle",
                    }}
                  />
                  {p.isHost && (
                    <span
                      title="host"
                      style={{ color: "#bbb", marginRight: "0.3rem" }}
                    >
                      ★
                    </span>
                  )}
                  {p.name || "Anon"}
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
      {history && history.length > 0 && (
        <HistoryPanel>
          <div style={{ fontWeight: 700, fontSize: "1.8vmin" }}>
            Round history
          </div>
          {[...history].reverse().map((h) => (
            <HistoryRound key={h.round}>
              <HistoryTitle>Round {h.round}</HistoryTitle>
              {[...h.results]
                .sort((a, b) => a.rank - b.rank)
                .map((r) => {
                  const isMe = r.playerId === myId;
                  return (
                    <HistoryRow key={r.playerId} isMe={isMe}>
                      <span>
                        #{r.rank} {r.name || "Anon"}
                        {r.finishMs != null ? ` · ${formatMs(r.finishMs)}` : ""}
                      </span>
                      <span>+{r.points}</span>
                    </HistoryRow>
                  );
                })}
            </HistoryRound>
          ))}
        </HistoryPanel>
      )}
    </SidePanels>
  );
}

export default function Grid() {
  const room = window.location.pathname.slice(1) || "1";
  const [name, setName] = useState(
    () => localStorage.getItem("sudoku.name") || "",
  );
  const [draftName, setDraftName] = useState("");

  const [level, setLevel] = useState("medium");

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
    autoSolve,
  } = useGame(socket);

  const devMode =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).has("dev");
  const { players, roundOver, nextRoundAt, history, settings, gameOver } =
    useRoom(socket);
  const isHost = players.some((p) => p.id === myId && p.isHost);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, []);

  const countdown = nextRoundAt
    ? Math.max(0, Math.ceil((nextRoundAt - now) / 1000))
    : 0;

  useEffect(() => {
    if (name) localStorage.setItem("sudoku.name", name);
  }, [name]);

  const [selectedIdx, setSelectedIdx] = useState(null);
  const [paused, setPaused] = useState(false);
  const [pausedAccum, setPausedAccum] = useState(0);
  const pauseStartRef = useRef(null);

  // unpause and reset accumulator when a new round starts
  useEffect(() => {
    if (startedAt) {
      setPaused(false);
      setPausedAccum(0);
      pauseStartRef.current = null;
    }
  }, [startedAt]);

  const togglePause = () => {
    if (!paused) {
      pauseStartRef.current = Date.now();
      setPaused(true);
    } else {
      if (pauseStartRef.current != null) {
        const delta = Date.now() - pauseStartRef.current;
        pauseStartRef.current = null;
        setPausedAccum((a) => a + delta);
      }
      setPaused(false);
    }
  };

  const frozenElapsedRef = useRef(null);
  useEffect(() => {
    frozenElapsedRef.current = null;
  }, [startedAt]);

  const liveElapsed = startedAt
    ? Math.max(
        0,
        now -
          startedAt -
          pausedAccum -
          (paused && pauseStartRef.current != null
            ? now - pauseStartRef.current
            : 0),
      )
    : 0;

  if (finished && frozenElapsedRef.current == null) {
    frozenElapsedRef.current = liveElapsed;
  }

  const adjustedElapsed =
    finished && frozenElapsedRef.current != null
      ? frozenElapsedRef.current
      : liveElapsed;

  // emit finish with pause-adjusted elapsed exactly once per round
  // Track the startedAt the current `finished` flag belongs to.
  // Only emit when `finished` flipped true within this round — not when
  // a stale `finished=true` lingers across a round transition.
  const finishedRoundRef = useRef(null);
  const emittedRoundRef = useRef(null);
  useEffect(() => {
    if (finished) {
      if (finishedRoundRef.current == null)
        finishedRoundRef.current = startedAt;
    } else {
      finishedRoundRef.current = null;
    }
  }, [finished, startedAt]);
  useEffect(() => {
    if (
      finished &&
      socket &&
      startedAt &&
      finishedRoundRef.current === startedAt &&
      emittedRoundRef.current !== startedAt
    ) {
      emittedRoundRef.current = startedAt;
      const ongoingPause =
        paused && pauseStartRef.current != null
          ? Date.now() - pauseStartRef.current
          : 0;
      const elapsedMs = Math.max(
        0,
        Date.now() - startedAt - pausedAccum - ongoingPause,
      );
      socket.emit("finish", { elapsedMs });
    }
  }, [finished, socket, startedAt, pausedAccum, paused]);

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

  const [notesMode, setNotesMode] = useState(false);
  const notesModeRef = useRef(false);
  useEffect(() => {
    notesModeRef.current = notesMode;
  }, [notesMode]);

  const padInput = (digit) => {
    if (selectedIdx == null) return;
    const useNotes = notesModeRef.current && digit !== "";
    if (devMode) {
      // eslint-disable-next-line no-console
      console.log("[padInput]", {
        digit,
        notesMode: notesModeRef.current,
        useNotes,
        selectedIdx,
        cur: board[selectedIdx],
      });
    }
    if (!useNotes) {
      updateAt(selectedIdx, digit);
      return;
    }
    const cur = board[selectedIdx];
    const curNotes = Array.isArray(cur) ? cur : [];
    const next = curNotes.includes(digit)
      ? curNotes.filter((n) => n !== digit)
      : [...curNotes, digit];
    updateAt(selectedIdx, next.length ? next : "");
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
            {startedAt ? formatMs(adjustedElapsed) : "0:00"}
          </Clock>
          {!!startedAt && !roundOver && !finished && (
            <PauseButton onClick={togglePause}>
              {paused ? (
                <FontAwesomeIcon icon={faPlay} />
              ) : (
                <FontAwesomeIcon icon={faPause} />
              )}
            </PauseButton>
          )}
          {devMode && !!startedAt && !roundOver && !finished && (
            <GameButton
              onClick={autoSolve}
              style={{ fontSize: "1.4vmin" }}
              title="Dev: auto-fill solution"
            >
              Auto-solve
            </GameButton>
          )}
          {devMode && !!startedAt && !roundOver && (
            <GameButton
              onClick={() => socket?.emit("dev finish all")}
              style={{ fontSize: "1.4vmin" }}
              title="Dev: force-finish all players"
            >
              Force end
            </GameButton>
          )}
        </ClockRow>
        <ButtonContainer>
          <DifficultyIndicator>
            {difficulty !== "" ? "Difficulty: " + difficulty : ""}
          </DifficultyIndicator>
        </ButtonContainer>
        {finished && !roundOver && (
          <Banner>You finished! Waiting for the others...</Banner>
        )}
        {!finished && myProgress === 1 && (
          <Banner style={{ background: "#ffe5e5", borderColor: "#e6a0a0" }}>
            Board is full but something's wrong — check your numbers.
          </Banner>
        )}
        {roundOver && !gameOver && (
          <Banner>
            Round over.
            {nextRoundAt ? ` Next round in ${countdown}s…` : ""}
          </Banner>
        )}
        {gameOver && (
          <FinalLeaderboard
            players={players}
            history={history}
            myId={myId}
            isHost={isHost}
            onStartNew={() => socket?.emit("start game")}
          />
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
          {(!startedAt || roundOver) && !gameOver && (
            <PreRoundOverlay>
              <PreRoundCard>
                {isHost ? (
                  <>
                    <div style={{ fontWeight: 600 }}>
                      {roundOver ? "Round over" : "Ready to play?"}
                    </div>
                    {history.length === 0 && !startedAt && (
                      <label
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.6rem",
                        }}
                      >
                        Rounds:
                        <select
                          value={
                            settings.totalRounds === null
                              ? "unlimited"
                              : String(settings.totalRounds)
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            socket?.emit("settings", {
                              totalRounds: v === "unlimited" ? null : Number(v),
                            });
                          }}
                          title="Number of rounds"
                        >
                          <option value="unlimited">Unlimited</option>
                          <option value="1">1 round</option>
                          <option value="3">3 rounds</option>
                          <option value="5">5 rounds</option>
                          <option value="10">10 rounds</option>
                        </select>
                      </label>
                    )}
                    <label
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.6rem",
                      }}
                    >
                      Difficulty:
                      <select
                        value={level}
                        onChange={(e) => setLevel(e.target.value)}
                      >
                        <option value="easy">Easy</option>
                        <option value="medium">Medium</option>
                        <option value="hard">Hard</option>
                      </select>
                    </label>
                    <GameButton
                      onClick={() => newGame(level)}
                      style={{
                        background: "#3b82f6",
                        color: "white",
                        border: "1px solid #2563eb",
                        borderRadius: "0.4rem",
                        padding: "0.5rem 1.2rem",
                        margin: 0,
                      }}
                    >
                      {roundOver ? "New round" : "Start round"}
                    </GameButton>
                    {roundOver && settings.totalRounds === null && (
                      <GameButton onClick={() => socket?.emit("end game")}>
                        End game
                      </GameButton>
                    )}
                  </>
                ) : (
                  <div style={{ textAlign: "center" }}>
                    Waiting for host to start the {roundOver ? "next " : ""}
                    round…
                    {settings.totalRounds !== null && (
                      <div style={{ marginTop: "0.5rem", color: "#888" }}>
                        Round {history.length + 1} of {settings.totalRounds}
                      </div>
                    )}
                  </div>
                )}
              </PreRoundCard>
            </PreRoundOverlay>
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
            <FontAwesomeIcon icon={faEraser} />
            <PadCount>&nbsp;</PadCount>
          </PadButton>
          <PadButton
            className="notes-inline"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => setNotesMode((n) => !n)}
            title="Toggle notes mode"
            style={{
              background: notesMode ? "#d6e6fb" : undefined,
              borderColor: notesMode ? "#3b82f6" : undefined,
            }}
          >
            ✎<PadCount>{notesMode ? "on" : "off"}</PadCount>
          </PadButton>
        </Pad>
        <NotesToggleFloating
          active={notesMode}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setNotesMode((n) => !n)}
          title="Toggle notes mode"
        >
          ✎
        </NotesToggleFloating>
      </BoardColumn>
      <Players
        players={players}
        myId={myId}
        myProgress={myProgress}
        history={history}
      />
    </AppContainer>
  );
}
