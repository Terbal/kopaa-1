import Phaser from "phaser";
import { io } from "socket.io-client";

export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super("LobbyScene");
  }

  create() {
    this.socket = null;
    this.players = {};
    this.myId = null;
    this.isHost = false;
    this.playerRows = {};
    this.messages = [];

    // =========================
    // FOND
    // =========================
    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x0a0a0a)
      .setOrigin(0);

    // =========================
    // TITRE
    // =========================
    this.add
      .text(this.scale.width / 2, 50, "🏆 MAZE CUP", {
        fontSize: "52px",
        color: "#ffd700",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 6,
      })
      .setOrigin(0.5);

    // =========================
    // PSEUDO INPUT (HTML overlay)
    // =========================
    this.createPseudoInput();

    // =========================
    // ZONE JOUEURS
    // =========================
    this.add.text(this.scale.width / 2 - 200, 130, "JOUEURS", {
      fontSize: "20px",
      color: "#888888",
    });

    this.playersContainer = this.add.container(this.scale.width / 2 - 200, 160);

    // =========================
    // CHAT UI
    // =========================
    this.createChatUI();

    // =========================
    // COUNTDOWN TEXT
    // =========================
    this.countdownText = this.add
      .text(this.scale.width / 2, this.scale.height - 120, "", {
        fontSize: "32px",
        color: "#00ffcc",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // =========================
    // BOUTON START (host)
    // =========================
    this.startBtn = this.add
      .text(
        this.scale.width / 2,
        this.scale.height - 60,
        "▶ LANCER LA PARTIE",
        {
          fontSize: "28px",
          color: "#ffffff",
          backgroundColor: "#222222",
          padding: { x: 20, y: 10 },
          stroke: "#00ffcc",
          strokeThickness: 2,
        },
      )
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .on("pointerover", () => this.startBtn.setStyle({ color: "#00ffcc" }))
      .on("pointerout", () => this.startBtn.setStyle({ color: "#ffffff" }))
      .on("pointerdown", () => this.socket?.emit("forceStart"));
  }

  // =========================
  // PSEUDO INPUT
  // =========================
  create() {
    this.socket = null;
    this.players = {};
    this.myId = null;
    this.isHost = false;
    this.playerRows = {};
    this.messages = [];

    const W = this.scale.width;
    const H = this.scale.height;

    // =========================
    // FOND DÉGRADÉ
    // =========================
    this.add.rectangle(0, 0, W, H, 0x080810).setOrigin(0);

    // Lignes décoratives néon
    for (let i = 0; i < 6; i++) {
      this.add.rectangle(0, H * 0.15 * i, W, 1, 0x00ffcc, 0.05).setOrigin(0);
    }

    // =========================
    // TITRE
    // =========================
    this.add
      .text(W / 2, H * 0.1, "🏆 MAZE CUP", {
        fontSize: "56px",
        color: "#ffd700",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    this.add
      .text(W / 2, H * 0.1 + 60, "mémorise • survive • gagne", {
        fontSize: "18px",
        color: "#555566",
        fontStyle: "italic",
      })
      .setOrigin(0.5);

    // =========================
    // CARTE CENTRALE (zone pseudo)
    // =========================
    const cardW = 420;
    const cardH = 200;
    const cardX = W / 2 - cardW / 2;
    const cardY = H * 0.28;

    this.add
      .rectangle(W / 2, cardY + cardH / 2, cardW, cardH, 0x111122, 0.95)
      .setOrigin(0.5)
      .setStrokeStyle(1, 0x00ffcc, 0.4);

    this.add
      .text(W / 2, cardY + 28, "ENTRE TON PSEUDO", {
        fontSize: "16px",
        color: "#666688",
        letterSpacing: 4,
      })
      .setOrigin(0.5);

    // Input HTML centré dans la carte
    this.pseudoInput = document.createElement("input");
    this.pseudoInput.type = "text";
    this.pseudoInput.placeholder = "Pseudo...";
    this.pseudoInput.maxLength = 16;
    Object.assign(this.pseudoInput.style, {
      position: "fixed",
      top: `${cardY + 60}px`,
      left: "50%",
      transform: "translateX(-50%)",
      width: "280px",
      padding: "12px 20px",
      fontSize: "20px",
      background: "#0d0d1a",
      color: "#ffffff",
      border: "2px solid #00ffcc44",
      borderRadius: "10px",
      outline: "none",
      textAlign: "center",
      letterSpacing: "2px",
      zIndex: "100",
    });
    document.body.appendChild(this.pseudoInput);

    // Bouton REJOINDRE
    this.joinBtn = document.createElement("button");
    this.joinBtn.textContent = "▶  REJOINDRE";
    Object.assign(this.joinBtn.style, {
      position: "fixed",
      top: `${cardY + 130}px`,
      left: "50%",
      transform: "translateX(-50%)",
      width: "280px",
      padding: "12px 0",
      fontSize: "18px",
      fontWeight: "bold",
      background: "linear-gradient(135deg, #00ffcc, #0088ff)",
      color: "#000000",
      border: "none",
      borderRadius: "10px",
      cursor: "pointer",
      letterSpacing: "2px",
      zIndex: "100",
    });
    document.body.appendChild(this.joinBtn);

    this.joinBtn.addEventListener("click", () => this.joinLobby());
    this.pseudoInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") this.joinLobby();
    });

    // =========================
    // ZONE JOUEURS (gauche)
    // =========================
    const playersX = W / 2 - 260;
    const playersY = H * 0.56;

    this.add.text(playersX, playersY - 30, "JOUEURS CONNECTÉS", {
      fontSize: "14px",
      color: "#445566",
      letterSpacing: 3,
    });

    this.playersContainer = this.add.container(playersX, playersY);

    // =========================
    // CHAT (droite)
    // =========================
    this.createChatUI();

    // =========================
    // COUNTDOWN
    // =========================
    this.countdownText = this.add
      .text(W / 2, H * 0.88, "", {
        fontSize: "28px",
        color: "#00ffcc",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // =========================
    // BOUTON START HOST
    // =========================
    this.startBtn = this.add
      .text(W / 2, H * 0.94, "▶ LANCER MAINTENANT", {
        fontSize: "22px",
        color: "#ffffff",
        backgroundColor: "#0d1a0d",
        padding: { x: 20, y: 10 },
        stroke: "#00ff88",
        strokeThickness: 1,
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .on("pointerover", () => this.startBtn.setStyle({ color: "#00ff88" }))
      .on("pointerout", () => this.startBtn.setStyle({ color: "#ffffff" }))
      .on("pointerdown", () => this.socket?.emit("forceStart"));
  }

  joinLobby() {
    const pseudo = this.pseudoInput.value.trim() || "Joueur";

    // Cacher l'input
    this.pseudoInput.remove();
    this.joinBtn.remove();

    // Connexion socket
    this.socket = io("http://localhost:3000");

    this.socket.on("init", ({ myId, players, isHost }) => {
      this.myId = myId;
      this.isHost = isHost;
      this.players = players;

      Object.values(players).forEach((p) => this.addPlayerRow(p));

      if (isHost) this.startBtn.setVisible(true);
    });

    this.socket.on("playerJoined", (p) => {
      this.players[p.id] = p;
      this.addPlayerRow(p);
    });

    this.socket.on("playerUpdated", (p) => {
      this.players[p.id] = p;
      this.updatePlayerRow(p);
    });

    this.socket.on("playerLeft", ({ id }) => {
      delete this.players[id];
      this.removePlayerRow(id);
    });

    this.socket.on("lobbyCountdown", ({ value }) => {
      if (value === null) {
        this.countdownText.setText("");
      } else {
        this.countdownText.setText(
          value > 0 ? `Début dans ${value}s...` : "C'est parti !",
        );
      }
    });

    this.socket.on("chatMessage", ({ pseudo, text, color }) => {
      this.addChatMessage(pseudo, text, color);
    });

    this.socket.on("startGame", () => {
      // Passer le socket à GameScene
      this.scene.start("GameScene", {
        socket: this.socket,
        myId: this.myId,
        players: this.players,
      });
    });

    this.socket.emit("joinLobby", { pseudo });

    // Demander le leaderboard global
    this.socket.emit("getLeaderboard");
    this.socket.on("leaderboardUpdated", (board) => {
      this._renderGlobalLeaderboard(board);
    });
  }

  // =========================
  // PLAYER ROWS
  // =========================
  addPlayerRow(p) {
    const y = Object.keys(this.playerRows).length * 44;
    const color = p.color || 0xffffff;

    const row = this.add.container(0, y);
    const dot = this.add.circle(0, 12, 10, color);
    const name = this.add.text(22, 2, p.pseudo, {
      fontSize: "20px",
      color: "#ffffff",
    });
    const ready = this.add.text(200, 2, p.ready ? "✅" : "⏳", {
      fontSize: "18px",
    });

    row.add([dot, name, ready]);
    this.playersContainer.add(row);
    this.playerRows[p.id] = { row, ready };
  }

  updatePlayerRow(p) {
    if (this.playerRows[p.id]) {
      this.playerRows[p.id].ready.setText(p.ready ? "✅" : "⏳");
    }
  }

  removePlayerRow(id) {
    if (this.playerRows[id]) {
      this.playerRows[id].row.destroy();
      delete this.playerRows[id];
    }
  }

  // =========================
  // CHAT UI
  // =========================
  createChatUI() {
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W / 2 + 80;
    const cy = H * 0.56;

    this.add.text(cx, cy - 30, "CHAT", {
      fontSize: "14px",
      color: "#445566",
      letterSpacing: 3,
    });

    this.chatZone = this.add.container(cx, cy);
    this.chatLines = [];

    this.chatInput = document.createElement("input");
    this.chatInput.type = "text";
    this.chatInput.placeholder = "Envoyer un message...";
    this.chatInput.maxLength = 100;
    Object.assign(this.chatInput.style, {
      position: "fixed",
      bottom: "48px",
      left: `${cx}px`,
      width: "260px",
      padding: "8px 14px",
      fontSize: "14px",
      background: "#0d0d1a",
      color: "#ffffff",
      border: "1px solid #333355",
      borderRadius: "6px",
      outline: "none",
      zIndex: "100",
    });
    document.body.appendChild(this.chatInput);

    this.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && this.chatInput.value.trim()) {
        this.socket?.emit("chatMessage", { text: this.chatInput.value.trim() });
        this.chatInput.value = "";
      }
    });
  }

  addChatMessage(pseudo, text, color) {
    const hexColor = "#" + color.toString(16).padStart(6, "0");
    const y = this.chatLines.length * 26;

    const line = this.add.text(0, y, `${pseudo}: ${text}`, {
      fontSize: "15px",
      color: hexColor,
      wordWrap: { width: 280 },
    });

    this.chatZone.add(line);
    this.chatLines.push(line);

    // Max 8 lignes visibles
    if (this.chatLines.length > 8) {
      this.chatLines[0].destroy();
      this.chatLines.shift();
      this.chatLines.forEach((l, i) => l.setY(i * 26));
    }
  }

  _renderGlobalLeaderboard(board) {
    // Nettoyer l'ancien si exists
    if (this._lbObjects) {
      this._lbObjects.forEach((o) => o.destroy());
    }
    this._lbObjects = [];

    const W = this.scale.width;
    const H = this.scale.height;
    const x = W / 2 + 180;
    const y = H * 0.28;
    const rowH = 32;
    const panelH = Math.min(board.length * rowH + 50, 300);

    const bg = this.add
      .rectangle(x, y, 280, panelH, 0x080810, 0.95)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0xffd700, 0.2);
    this._lbObjects.push(bg);

    const title = this.add
      .text(x, y + 14, "🏅 CLASSEMENT GÉNÉRAL", {
        fontSize: "13px",
        color: "#ffd700",
        fontStyle: "bold",
        letterSpacing: 2,
      })
      .setOrigin(0.5, 0);
    this._lbObjects.push(title);

    if (board.length === 0) {
      const empty = this.add
        .text(x, y + 45, "Aucune partie jouée", {
          fontSize: "13px",
          color: "#333355",
        })
        .setOrigin(0.5, 0);
      this._lbObjects.push(empty);
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];

    board.slice(0, 8).forEach((p, i) => {
      const ry = y + 44 + i * rowH;
      const rank = medals[i] || `${i + 1}.`;

      const row = this.add.text(x - 120, ry, `${rank}  ${p.pseudo}`, {
        fontSize: "14px",
        color: "#cccccc",
      });
      this._lbObjects.push(row);

      const pts = this.add
        .text(x + 120, ry, `${p.totalScore} pts`, {
          fontSize: "14px",
          color: "#ffd700",
          fontStyle: "bold",
        })
        .setOrigin(1, 0);
      this._lbObjects.push(pts);
    });
  }

  // Nettoyer les inputs HTML quand on quitte la scène
  shutdown() {
    this.chatInput?.remove();
  }
}
