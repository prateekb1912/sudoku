import { useEffect, useState } from "react";

export default function useRoom(socket) {
  const [players, setPlayers] = useState([]);
  const [roundOver, setRoundOver] = useState(false);
  const [nextRoundAt, setNextRoundAt] = useState(null);

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

    socket.on("players", onPlayers);
    socket.on("round over", onRoundOver);
    socket.on("puzzle", onPuzzle);
    return () => {
      socket.off("players", onPlayers);
      socket.off("round over", onRoundOver);
      socket.off("puzzle", onPuzzle);
    };
  }, [socket]);

  return { players, roundOver, nextRoundAt };
}
