import { useEffect, useState } from "react";

export default function useRoom(socket) {
  const [players, setPlayers] = useState([]);
  const [roundOver, setRoundOver] = useState(false);
  const [nextRoundAt, setNextRoundAt] = useState(null);
  const [history, setHistory] = useState([]);
  const [settings, setSettings] = useState({ totalRounds: null });
  const [gameOver, setGameOver] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const onPlayers = (roster) => setPlayers(roster);
    const onRoundOver = (payload) => {
      setRoundOver(true);
      setNextRoundAt(payload?.nextRoundAt ?? null);
    };
    const onPuzzle = () => {
      setRoundOver(false);
      setNextRoundAt(null);
    };
    const onHistory = (h) => setHistory(Array.isArray(h) ? h : []);
    const onSettings = (s) => setSettings(s || { totalRounds: null });
    const onGameOver = () => setGameOver(true);
    const onGameReset = () => {
      setGameOver(false);
      setRoundOver(false);
      setNextRoundAt(null);
      setHistory([]);
    };

    socket.on("players", onPlayers);
    socket.on("round over", onRoundOver);
    socket.on("puzzle", onPuzzle);
    socket.on("history", onHistory);
    socket.on("settings", onSettings);
    socket.on("game over", onGameOver);
    socket.on("game reset", onGameReset);
    return () => {
      socket.off("players", onPlayers);
      socket.off("round over", onRoundOver);
      socket.off("puzzle", onPuzzle);
      socket.off("history", onHistory);
      socket.off("settings", onSettings);
      socket.off("game over", onGameOver);
      socket.off("game reset", onGameReset);
    };
  }, [socket]);

  return { players, roundOver, nextRoundAt, history, settings, gameOver };
}
