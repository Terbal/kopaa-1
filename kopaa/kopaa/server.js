import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEADERBOARD_PATH = path.join(__dirname, "leaderboard.json");

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

const players = {};
let gameWon = false;
let countdownInterval = null;
let countdownValue = 10;

// =========================
// LEADERBOARD PERSISTANT
// =========================
function loadLeaderboard() {
  try {
    const raw = fs.readFileSync(LEADERBOARD_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function saveLeaderboard(data) {
  fs.writeFileSync(LEADERBOARD_PATH, JSON.stringify(data, null, 2));
}

function updateLeaderboard(gameScores) {
  const board = loadLeaderboard();

  gameScores.forEach(({ id, pseudo, score }) => {
    const existing = board.find((p) => p.pseudo === pseudo);
    if (existing) {
      existing.totalScore += score;
      existing.gamesPlayed += 1;
      existing.bestScore = Math.max(existing.bestScore, score);
      existing.lastSeen = Date.now();
    } else {
      board.push({
        pseudo,
        totalScore: score,
        gamesPlayed: 1,
        bestScore: score,
        lastSeen: Date.now(),
      });
    }
  });

  board.sort((a, b) => b.totalScore - a.totalScore);
  saveLeaderboard(board);
  return board;
}

// =========================
// REMATCH VOTES
// =========================
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
  // SAVE SCORES FINAUX
  // =========================
  socket.on("saveScores", ({ gameScores }) => {
    const board = updateLeaderboard(gameScores);
    io.emit("leaderboardUpdated", board);
    console.log("📊 Leaderboard mis à jour");
  });

  // =========================
  // DEMANDE LEADERBOARD
  // =========================
  socket.on("getLeaderboard", () => {
    socket.emit("leaderboardUpdated", loadLeaderboard());
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
    rematchVotes.delete(socket.id);
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

// =========================
// BROADCAST POSITIONS
// =========================
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
