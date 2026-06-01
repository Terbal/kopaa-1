import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

const players = {};
let gameWon = false;
let countdownInterval = null;
let countdownValue = 10;

// En dehors de io.on pour être partagé entre les connexions
const rematchVotes = new Set();

function getHost() {
  const ids = Object.keys(players);
  return ids.length > 0 ? ids[0] : null;
}

function startCountdown() {
  if (countdownInterval) return;
  countdownValue = 10;

  countdownInterval = setInterval(() => {
    countdownValue--;
    io.emit("lobbyCountdown", { value: countdownValue });

    if (countdownValue <= 0) {
      clearInterval(countdownInterval);
      countdownInterval = null;
      io.emit("startGame");
    }
  }, 1000);
}

function stopCountdown() {
  if (countdownInterval) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  io.emit("lobbyCountdown", { value: null });
}

io.on("connection", (socket) => {
  console.log(`✅ Connecté : ${socket.id}`);

  // =========================
  // JOIN LOBBY
  // =========================
  socket.on("joinLobby", ({ pseudo }) => {
    const colors = [0x00ffff, 0xff00ff, 0xffff00, 0x00ff88];
    const colorIndex = Object.keys(players).length % colors.length;

    players[socket.id] = {
      id: socket.id,
      pseudo: pseudo || "Joueur",
      color: colors[colorIndex],
      ready: false,
      isHost: Object.keys(players).length === 0,
    };

    socket.emit("init", {
      myId: socket.id,
      players,
      isHost: players[socket.id].isHost,
      gameWon,
    });

    socket.broadcast.emit("playerJoined", players[socket.id]);

    if (Object.keys(players).length >= 2) startCountdown();

    console.log(
      `👤 ${pseudo} a rejoint — ${Object.keys(players).length} joueurs`,
    );
  });

  // =========================
  // READY
  // =========================
  socket.on("setReady", ({ ready }) => {
    if (players[socket.id]) {
      players[socket.id].ready = ready;
      io.emit("playerUpdated", players[socket.id]);
    }
  });

  // =========================
  // CHAT
  // =========================
  socket.on("chatMessage", ({ text }) => {
    if (!players[socket.id]) return;
    io.emit("chatMessage", {
      pseudo: players[socket.id].pseudo,
      text: text.slice(0, 100),
      color: players[socket.id].color,
    });
  });

  // =========================
  // FORCE START (host)
  // =========================
  socket.on("forceStart", () => {
    if (socket.id !== getHost()) return;
    stopCountdown();
    io.emit("startGame");
    console.log("🚀 Partie forcée par le host");
  });

  // =========================
  // MOVE
  // =========================
  socket.on("move", ({ x, y }) => {
    if (!players[socket.id]) return;
    players[socket.id].x = x;
    players[socket.id].y = y;
    socket.broadcast.emit("playerMoved", { id: socket.id, x, y });
  });

  // =========================
  // SCORE UPDATE
  // =========================
  socket.on("scoreUpdate", ({ scores }) => {
    // Broadcast les scores à tous les autres
    socket.broadcast.emit("scoresUpdated", { scores });
  });

  // =========================
  // WIN
  // =========================
  socket.on("win", () => {
    if (gameWon) return;
    gameWon = true;
    io.emit("gameOver", { winnerId: socket.id });
    console.log(`🏆 Gagnant : ${players[socket.id]?.pseudo}`);
  });

  // =========================
  // REMATCH
  // =========================
  socket.on("requestRematch", () => {
    rematchVotes.add(socket.id);

    socket.broadcast.emit("rematchVote", {
      pseudo: players[socket.id]?.pseudo,
      count: rematchVotes.size,
      total: Object.keys(players).length,
    });

    if (rematchVotes.size >= Object.keys(players).length) {
      rematchVotes.clear();
      gameWon = false;
      io.emit("rematchReady");
      console.log("🔁 Rematch lancé");
    }
  });

  // =========================
  // DISCONNECT
  // =========================
  socket.on("disconnect", () => {
    const pseudo = players[socket.id]?.pseudo || socket.id;
    rematchVotes.delete(socket.id); // nettoyer le vote si déco
    delete players[socket.id];
    io.emit("playerLeft", { id: socket.id });
    console.log(
      `❌ ${pseudo} déconnecté — ${Object.keys(players).length} joueurs`,
    );

    if (Object.keys(players).length < 2) stopCountdown();
    if (Object.keys(players).length === 0) {
      gameWon = false;
      rematchVotes.clear();
      console.log("🔄 Reset");
    }
  });
});

setInterval(() => {
  const positions = Object.values(players).map((p) => ({
    id: p.id,
    x: p.x || 0,
    y: p.y || 0,
  }));
  if (positions.length > 0) {
    io.emit("allPositions", positions);
  }
}, 50);

httpServer.listen(3000, () => {
  console.log("🚀 Serveur sur http://localhost:3000");
});
