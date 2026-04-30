import { useEffect, useState } from "react";
import { io } from "socket.io-client";

// Use Vite env var if set, else fall back to the same host the page was served from.
// This lets phones on the LAN connect when running with `--host`.
const SERVER_URL =
  import.meta.env.VITE_SERVER_URL ||
  (typeof window !== "undefined"
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : "http://localhost:3001");

export const entryToBoard = (square, i) => {
  const row = Math.floor(square / 3) * 3 + Math.floor(i / 3);
  const col = (square % 3) * 3 + (i % 3);
  return row * 9 + col;
};

const getClientId = () => {
  if (typeof window === "undefined") return null;
  let id = localStorage.getItem("sudoku.clientId");
  if (!id) {
    id =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    localStorage.setItem("sudoku.clientId", id);
  }
  return id;
};

export default function useSocket({ room, name }) {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [myId, setMyId] = useState(null);

  useEffect(() => {
    if (!name) return;
    const clientId = getClientId();
    setMyId(clientId);
    const s = io(SERVER_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 500,
      reconnectionDelayMax: 3000,
    });
    setSocket(s);

    s.on("connect", () => {
      setConnected(true);
      s.emit("join", { room, name, clientId });
    });
    s.on("disconnect", () => setConnected(false));

    return () => {
      s.disconnect();
      setSocket(null);
    };
  }, [room, name]);

  return { socket, connected, myId };
}
