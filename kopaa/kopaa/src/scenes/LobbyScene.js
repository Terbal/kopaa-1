import Phaser from "phaser";
import { io } from "socket.io-client";

export default class LobbyScene extends Phaser.Scene {
  constructor() {
    super("LobbyScene");
  }

  create() {
    // =========================
    // PROFIL — lu depuis sessionStorage
    // =========================
    let profile = null;
    try {
      profile = JSON.parse(sessionStorage.getItem("mazecup_session"));
    } catch {}

    if (!profile) {
      // Pas de profil → retour accueil
      window.location.href = "/";
      return;
    }

    this.myPseudo = profile.pseudo;
    this.myColor = profile.color;

    // =========================
    // ÉTAT
    // =========================
    this.socket = null;
    this.players = {};
    this.myId = null;
    this.isHost = false;
    this.playerRows = {};
    this.chatLines = [];
    this._lbObjects = [];

    const W = this.scale.width;
    const H = this.scale.height;

    // =========================
    // FOND
    // =========================
    this.add.rectangle(0, 0, W, H, 0x080810).setOrigin(0);
    for (let i = 0; i < 6; i++) {
      this.add.rectangle(0, H * 0.15 * i, W, 1, 0xff8c00, 0.04).setOrigin(0);
    }

    // =========================
    // TITRE
    // =========================
    this.add
      .text(W / 2, H * 0.06, "MAZE CUP", {
        fontFamily: "'Orbitron', monospace",
        fontSize: "clamp(28px, 5vw, 42px)",
        color: "#ff8c00",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // =========================
    // PROFIL AFFICHÉ
    // =========================
    const hexColor =
      "#" + (this.myColor || 0xff8c00).toString(16).padStart(6, "0");

    this.add
      .circle(W / 2 - 160, H * 0.14, 18, this.myColor || 0xff8c00)
      .setStrokeStyle(1, 0xffffff, 0.2);

    this.add
      .text(W / 2 - 135, H * 0.14, this.myPseudo, {
        fontSize: "18px",
        color: hexColor,
        fontStyle: "bold",
      })
      .setOrigin(0, 0.5);

    const changeBtn = this.add
      .text(W / 2 + 80, H * 0.14, "CHANGER", {
        fontSize: "10px",
        color: "#443322",
        letterSpacing: 2,
      })
      .setOrigin(0, 0.5)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => changeBtn.setStyle({ color: "#ff8c00" }))
      .on("pointerout", () => changeBtn.setStyle({ color: "#443322" }))
      .on("pointerdown", () => {
        window.location.href = "/";
      });

    // =========================
    // JOUEURS CONNECTÉS
    // =========================
    const playersX = W * 0.1;
    const playersY = H * 0.25;

    this.add.text(playersX, playersY - 24, "JOUEURS CONNECTÉS", {
      fontSize: "11px",
      color: "#443322",
      letterSpacing: 3,
    });

    this.playersContainer = this.add.container(playersX, playersY);

    // =========================
    // CHAT
    // =========================
    this._createChatUI();

    // =========================
    // LEADERBOARD (droite)
    // =========================
    this._createLeaderboardPanel();

    // =========================
    // COUNTDOWN
    // =========================
    this.countdownText = this.add
      .text(W / 2, H * 0.88, "", {
        fontSize: "24px",
        color: "#ff8c00",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    // =========================
    // BOUTON START HOST
    // =========================
    this.startBtn = this.add
      .text(W / 2, H * 0.94, "▶  LANCER MAINTENANT", {
        fontSize: "18px",
        color: "#000000",
        backgroundColor: "#ff8c00",
        padding: { x: 24, y: 12 },
      })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setVisible(false)
      .on("pointerover", () => this.startBtn.setAlpha(0.8))
      .on("pointerout", () => this.startBtn.setAlpha(1))
      .on("pointerdown", () => this.socket?.emit("forceStart"));

    // =========================
    // CONNEXION SOCKET
    // =========================
    this._connect();
  }

  _connect() {
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
          value > 0 ? `DÉBUT DANS ${value}s` : "C'EST PARTI !",
        );
      }
    });

    this.socket.on("chatMessage", ({ pseudo, text, color }) => {
      this._addChatMessage(pseudo, text, color);
    });

    this.socket.on("leaderboardUpdated", (board) => {
      this._renderLeaderboard(board);
    });

    this.socket.on("startGame", () => {
      this.chatInput?.remove();
      this.scene.start("GameScene", {
        socket: this.socket,
        myId: this.myId,
        players: this.players,
      });
    });

    this.socket.emit("joinLobby", {
      pseudo: this.myPseudo,
      color: this.myColor,
    });

    this.socket.emit("getLeaderboard");
  }

  // =========================
  // PLAYER ROWS
  // =========================
  addPlayerRow(p) {
    const y = Object.keys(this.playerRows).length * 40;
    const color = p.color || 0xffffff;
    const hex = "#" + color.toString(16).padStart(6, "0");

    const row = this.add.container(0, y);
    const dot = this.add.circle(6, 14, 8, color);
    const name = this.add.text(22, 4, p.pseudo, {
      fontSize: "16px",
      color: "#cccccc",
    });
    const status = this.add.text(180, 4, "⏳", { fontSize: "14px" });

    row.add([dot, name, status]);
    this.playersContainer.add(row);
    this.playerRows[p.id] = { row, status };
  }

  updatePlayerRow(p) {
    if (this.playerRows[p.id]) {
      this.playerRows[p.id].status.setText(p.ready ? "✅" : "⏳");
    }
  }

  removePlayerRow(id) {
    if (this.playerRows[id]) {
      this.playerRows[id].row.destroy();
      delete this.playerRows[id];
    }
  }

  // =========================
  // CHAT
  // =========================
  _createChatUI() {
    const W = this.scale.width;
    const H = this.scale.height;
    const cx = W * 0.38;
    const cy = H * 0.25;

    this.add.text(cx, cy - 24, "CHAT", {
      fontSize: "11px",
      color: "#443322",
      letterSpacing: 3,
    });

    this.chatZone = this.add.container(cx, cy);
    this.chatLines = [];

    this.chatInput = document.createElement("input");
    this.chatInput.type = "text";
    this.chatInput.placeholder = "Message...";
    this.chatInput.maxLength = 100;
    Object.assign(this.chatInput.style, {
      position: "fixed",
      bottom: "40px",
      left: `${W * 0.38}px`,
      width: "240px",
      padding: "8px 14px",
      fontSize: "13px",
      background: "#060408",
      color: "#ffffff",
      border: "1px solid rgba(255,140,0,0.15)",
      borderRadius: "6px",
      outline: "none",
      zIndex: "100",
      fontFamily: "Inter, sans-serif",
    });
    document.body.appendChild(this.chatInput);

    this.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && this.chatInput.value.trim()) {
        this.socket?.emit("chatMessage", { text: this.chatInput.value.trim() });
        this.chatInput.value = "";
      }
    });
  }

  _addChatMessage(pseudo, text, color) {
    const hex = "#" + (color || 0xffffff).toString(16).padStart(6, "0");
    const y = this.chatLines.length * 24;

    const line = this.add.text(0, y, `${pseudo}: ${text}`, {
      fontSize: "13px",
      color: hex,
      wordWrap: { width: 240 },
    });

    this.chatZone.add(line);
    this.chatLines.push(line);

    if (this.chatLines.length > 10) {
      this.chatLines[0].destroy();
      this.chatLines.shift();
      this.chatLines.forEach((l, i) => l.setY(i * 24));
    }
  }

  // =========================
  // LEADERBOARD PANEL
  // =========================
  _createLeaderboardPanel() {
    const W = this.scale.width;
    const H = this.scale.height;
    const x = W * 0.72;
    const y = H * 0.22;

    this.add
      .text(x, y - 24, "CLASSEMENT GÉNÉRAL", {
        fontSize: "11px",
        color: "#443322",
        letterSpacing: 3,
      })
      .setOrigin(0.5, 0);

    this._lbPanelX = x;
    this._lbPanelY = y;
  }

  _renderLeaderboard(board) {
    if (this._lbObjects) this._lbObjects.forEach((o) => o.destroy());
    this._lbObjects = [];

    const x = this._lbPanelX;
    const y = this._lbPanelY;
    const rowH = 30;
    const panelH = Math.min(board.length * rowH + 40, 280);

    const bg = this.add
      .rectangle(x, y, 260, panelH, 0x060408, 0.95)
      .setOrigin(0.5, 0)
      .setStrokeStyle(1, 0xff8c00, 0.15);
    this._lbObjects.push(bg);

    if (board.length === 0) {
      const empty = this.add
        .text(x, y + 20, "Aucune partie jouée", {
          fontSize: "12px",
          color: "#332211",
        })
        .setOrigin(0.5, 0);
      this._lbObjects.push(empty);
      return;
    }

    const medals = ["🥇", "🥈", "🥉"];

    board.slice(0, 8).forEach((p, i) => {
      const ry = y + 12 + i * rowH;
      const rank = medals[i] || `${i + 1}.`;
      const isMe = p.pseudo === this.myPseudo;

      if (isMe) {
        const highlight = this.add
          .rectangle(x, ry + 10, 254, rowH - 2, 0xff8c00, 0.06)
          .setOrigin(0.5, 0.5);
        this._lbObjects.push(highlight);
      }

      const nameText = this.add.text(x - 110, ry, `${rank}  ${p.pseudo}`, {
        fontSize: "13px",
        color: isMe ? "#ff8c00" : "#888888",
        fontStyle: isMe ? "bold" : "normal",
      });
      this._lbObjects.push(nameText);

      const pts = this.add
        .text(x + 110, ry, `${p.totalScore}`, {
          fontSize: "13px",
          color: "#ffd700",
          fontStyle: "bold",
        })
        .setOrigin(1, 0);
      this._lbObjects.push(pts);
    });
  }

  shutdown() {
    this.chatInput?.remove();
  }
}
