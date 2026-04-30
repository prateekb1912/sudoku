import { Server } from "socket.io";
import express from "express";
import http from "http";
import os from "os";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || true, // allow LAN origins in dev
    methods: ["GET", "POST"],
  },
});

type Player = {
  id: string;
  name: string;
  progress: number;
  finishRank: number | null;
  finishMs: number | null;
  score: number;
};

type Puzzle = { originalBoard: any[]; difficulty: any };

type RoundResult = {
  playerId: string;
  name: string;
  rank: number;
  finishMs: number | null;
  points: number;
};

type Settings = { totalRounds: number | null }; // null = unlimited

type Room = {
  puzzle: Puzzle | null;
  players: Map<string, Player>;
  finishedCount: number;
  hostId: string | null;
  roundStartedAt: number | null;
  nextRoundTimer: NodeJS.Timeout | null;
  history: { round: number; results: RoundResult[] }[];
  currentRoundResults: RoundResult[];
  settings: Settings;
  gameOver: boolean;
};

const rooms = new Map<string, Room>();

// scoring scales with player count: 1st place = N, 2nd = N-1, ...
const pointsFor = (rank: number, totalPlayers: number) =>
  Math.max(0, totalPlayers - rank + 1);

const getRoom = (id: string): Room => {
  let r = rooms.get(id);
  if (!r) {
    r = {
      puzzle: null,
      players: new Map(),
      finishedCount: 0,
      hostId: null,
      roundStartedAt: null,
      nextRoundTimer: null,
      history: [],
      currentRoundResults: [],
      settings: { totalRounds: null },
      gameOver: false,
    };
    rooms.set(id, r);
  }
  return r;
};

const roster = (room: Room) =>
  Array.from(room.players.values()).map((p) => ({
    ...p,
    isHost: p.id === room.hostId,
  }));

const broadcastPlayers = (roomId: string, room: Room) => {
  io.to(roomId).emit("players", roster(room));
};

const allFinished = (room: Room) =>
  room.players.size > 0 &&
  Array.from(room.players.values()).every((p) => p.finishRank !== null);

const roundInProgress = (room: Room) =>
  room.puzzle !== null && !allFinished(room);

const finalizeRound = (roomId: string, room: Room) => {
  const roundNumber = room.history.length + 1;
  room.history.push({ round: roundNumber, results: room.currentRoundResults });
  io.to(roomId).emit("history", room.history);
  const reachedLimit =
    room.settings.totalRounds !== null &&
    room.history.length >= room.settings.totalRounds;
  if (reachedLimit) {
    room.gameOver = true;
    io.to(roomId).emit("round over", { nextRoundAt: null });
    io.to(roomId).emit("game over");
  } else {
    io.to(roomId).emit("round over", { nextRoundAt: null });
  }
};

io.on("connection", (socket) => {
  socket.on(
    "join",
    ({ room: roomId, name }: { room: string; name: string }) => {
      socket.join(roomId);
      socket.data.room = roomId;
      const room = getRoom(roomId);
      if (!room.players.has(socket.id)) {
        room.players.set(socket.id, {
          id: socket.id,
          name: String(name || "Anon").slice(0, 20),
          progress: 0,
          finishRank: null,
          finishMs: null,
          score: 0,
        });
      }
      if (!room.hostId) room.hostId = socket.id;
      if (room.puzzle && !room.gameOver)
        socket.emit("puzzle", {
          ...room.puzzle,
          startedAt: room.roundStartedAt,
        });
      else if (socket.id === room.hostId && !room.gameOver)
        socket.emit("need puzzle");
      if (room.history.length) socket.emit("history", room.history);
      socket.emit("settings", room.settings);
      if (room.gameOver) socket.emit("game over");
      broadcastPlayers(roomId, room);
    },
  );

  socket.on("settings", (s: Partial<Settings>) => {
    const roomId = socket.data.room;
    if (!roomId) return;
    const room = getRoom(roomId);
    if (socket.id !== room.hostId) return;
    // settings can only change before round 1 starts
    if (room.history.length > 0 || roundInProgress(room)) return;
    if (s && "totalRounds" in s) {
      const n = s.totalRounds;
      if (n === null) room.settings.totalRounds = null;
      else if (typeof n === "number" && n >= 1 && n <= 50)
        room.settings.totalRounds = Math.floor(n);
    }
    io.to(roomId).emit("settings", room.settings);
  });

  socket.on("end game", () => {
    const roomId = socket.data.room;
    if (!roomId) return;
    const room = getRoom(roomId);
    if (socket.id !== room.hostId) return;
    if (roundInProgress(room)) return;
    if (room.history.length === 0) return;
    if (room.nextRoundTimer) {
      clearTimeout(room.nextRoundTimer);
      room.nextRoundTimer = null;
    }
    room.gameOver = true;
    io.to(roomId).emit("game over");
  });

  socket.on("start game", () => {
    // host resets after a finished game to start fresh
    const roomId = socket.data.room;
    if (!roomId) return;
    const room = getRoom(roomId);
    if (socket.id !== room.hostId) return;
    if (!room.gameOver) return;
    room.gameOver = false;
    room.puzzle = null;
    room.history = [];
    room.currentRoundResults = [];
    room.finishedCount = 0;
    room.roundStartedAt = null;
    for (const p of room.players.values()) {
      p.score = 0;
      p.progress = 0;
      p.finishRank = null;
      p.finishMs = null;
    }
    io.to(roomId).emit("history", room.history);
    io.to(roomId).emit("game reset");
    broadcastPlayers(roomId, room);
  });

  socket.on("new game", (puzzle: Puzzle) => {
    const roomId = socket.data.room;
    if (!roomId) return;
    const room = getRoom(roomId);
    if (socket.id !== room.hostId) return; // only host starts rounds
    if (room.gameOver) return;
    if (
      room.settings.totalRounds !== null &&
      room.history.length >= room.settings.totalRounds
    )
      return;
    // ignore if a round is still in progress — prevents accidental resets
    if (roundInProgress(room)) return;
    if (room.nextRoundTimer) {
      clearTimeout(room.nextRoundTimer);
      room.nextRoundTimer = null;
    }
    room.puzzle = puzzle;
    room.finishedCount = 0;
    room.roundStartedAt = Date.now();
    room.currentRoundResults = [];
    for (const p of room.players.values()) {
      p.progress = 0;
      p.finishRank = null;
      p.finishMs = null;
    }
    io.to(roomId).emit("puzzle", { ...puzzle, startedAt: room.roundStartedAt });
    broadcastPlayers(roomId, room);
  });

  socket.on("progress", (progress: number) => {
    const roomId = socket.data.room;
    if (!roomId) return;
    const room = getRoom(roomId);
    const p = room.players.get(socket.id);
    if (!p) return;
    p.progress = Math.max(0, Math.min(1, Number(progress) || 0));
    broadcastPlayers(roomId, room);
  });

  socket.on("finish", (payload?: { elapsedMs?: number }) => {
    const roomId = socket.data.room;
    if (!roomId) return;
    const room = getRoom(roomId);
    const p = room.players.get(socket.id);
    if (!p || p.finishRank !== null) return;
    room.finishedCount += 1;
    p.finishRank = room.finishedCount;
    const reported = Number(payload?.elapsedMs);
    const serverElapsed = room.roundStartedAt
      ? Date.now() - room.roundStartedAt
      : null;
    // trust the client's pause-adjusted elapsed, but cap at server elapsed so it can't be negative or in the future
    p.finishMs =
      Number.isFinite(reported) && reported >= 0
        ? Math.min(reported, serverElapsed ?? reported)
        : serverElapsed;
    p.progress = 1;
    const points = pointsFor(p.finishRank, room.players.size);
    p.score += points;
    room.currentRoundResults.push({
      playerId: p.id,
      name: p.name,
      rank: p.finishRank,
      finishMs: p.finishMs,
      points,
    });
    broadcastPlayers(roomId, room);
    if (allFinished(room)) finalizeRound(roomId, room);
  });

  socket.on("dev finish all", () => {
    const roomId = socket.data.room;
    if (!roomId) return;
    const room = getRoom(roomId);
    if (!roundInProgress(room)) return;
    const serverElapsed = room.roundStartedAt
      ? Date.now() - room.roundStartedAt
      : 0;
    for (const p of room.players.values()) {
      if (p.finishRank !== null) continue;
      room.finishedCount += 1;
      p.finishRank = room.finishedCount;
      p.finishMs = serverElapsed;
      p.progress = 1;
      const points = pointsFor(p.finishRank, room.players.size);
      p.score += points;
      room.currentRoundResults.push({
        playerId: p.id,
        name: p.name,
        rank: p.finishRank,
        finishMs: p.finishMs,
        points,
      });
    }
    broadcastPlayers(roomId, room);
    if (allFinished(room)) finalizeRound(roomId, room);
  });

  socket.on("disconnect", () => {
    const roomId = socket.data.room;
    if (!roomId) return;
    const room = rooms.get(roomId);
    if (!room) return;
    room.players.delete(socket.id);
    if (room.players.size === 0) {
      rooms.delete(roomId);
      return;
    }
    if (room.hostId === socket.id) {
      const next = room.players.keys().next().value ?? null;
      room.hostId = next;
      // if no puzzle yet, ask the new host to make one
      if (!room.puzzle && next) io.to(next).emit("need puzzle");
    }
    broadcastPlayers(roomId, room);
    if (allFinished(room)) io.to(roomId).emit("round over");
  });
});

const PORT = 3001;
server.listen(PORT, () => {
  console.log(`server running:`);
  console.log(`  Local:   http://localhost:${PORT}`);
  for (const iface of Object.values(os.networkInterfaces()).flat()) {
    if (iface && iface.family === "IPv4" && !iface.internal) {
      console.log(`  Network: http://${iface.address}:${PORT}`);
    }
  }
});
