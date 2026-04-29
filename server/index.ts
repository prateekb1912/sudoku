import { Server } from "socket.io";
import express from "express";
import http from "http";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: process.env.CLIENT_URL || "http://localhost:5173",
    methods: ["GET", "POST"],
  },
});
const rooms = new Map();

io.on("connection", (socket) => {
  socket.on("join", (roomId) => {
    socket.join(roomId);
    socket.data.room = roomId;
    const state = rooms.get(roomId);
    if (state) socket.emit("send board", state);
  });
  socket.on("make move", (msg) => {
    socket.to(socket.data.room).emit("make move", msg);
  });
  socket.on("send board", (state) => {
    rooms.set(socket.data.room, state);
    socket.to(socket.data.room).emit("send board", state);
  });
  socket.on("validate board", (msg) => {
    socket.to(socket.data.room).emit("validate board", msg);
  });
});

server.listen(3001, () => {
  console.log("server running on port 3001");
});
