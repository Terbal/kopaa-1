import Phaser from "phaser";

import { IS_MOBILE } from "../main";
import JoystickSystem from "../systems/JoystickSystem";
import GlanceButton from "../systems/GlanceButton";
import MinimapSystem from "../systems/MinimapSystem";

import Player from "../entities/Player";
import mazeData from "../maze/mazeData";
import MazeBuilder from "../systems/MazeBuilder";
import SpawnSystem from "../systems/SpawnSystem";
import FogSystem from "../systems/FogSystem";
import ObservationSystem from "../systems/ObservationSystem";
import CollisionSystem from "../systems/CollisionSystem";
import Trophy from "../entities/Trophy";
import SocketManager from "../managers/SocketManager";
import Potion from "../entities/Potion";
import PhantomSystem from "../systems/PhantomSystem";
import GlanceSystem from "../systems/GlanceSystem";
import LeaderboardUI from "../ui/LeaderboardUI";
import ScoreSystem from "../systems/ScoreSystem";
import TrailSystem from "../systems/TrailSystem";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("player_front", "/assets/player_front.png");
    this.load.image("player_back", "/assets/player_back.png");
    this.load.image("player_left", "/assets/player_left.png");
    this.load.image("player_right", "/assets/player_right.png");
    // this.load.image("trophy", "/assets/trophy.png");
    // this.load.image("potion", "/assets/potion.png");
  }

  create() {
    // =========================
    // DONNÉES LOBBY
    // =========================
    const data = this.scene.settings.data || {};
    const { socket, myId, players: lobbyPlayers } = data;
    this._lobbyPlayers = lobbyPlayers || {};

    // Nettoyer les anciens listeners si rematch
    if (socket) {
      socket.off("playerJoined");
      socket.off("playerMoved");
      socket.off("playerLeft");
      socket.off("gameOver");
      socket.off("rematchReady");
      socket.off("scoresUpdated");
      socket.off("allPositions");
      socket.off("wallPotionCollected");
      socket.off("leaderboardUpdated");
      socket.off("potionSpawned");
      socket.off("potionCollected");
    }

    // Reset caméra
    this.cameras.main.setZoom(0.25);
    this.cameras.main.scrollX = 0;
    this.cameras.main.scrollY = 0;

    // =========================
    // INPUT
    // =========================
    this.cursors = this.input.keyboard.createCursorKeys();

    // =========================
    // LABYRINTHE
    // =========================
    this.mazeBuilder = new MazeBuilder(this);
    this.walls = this.mazeBuilder.build();

    // =========================
    // COLLISIONS
    // =========================
    this.collisionSystem = new CollisionSystem(this);

    // =========================
    // SPAWN PLAYER
    // =========================
    this.spawnSystem = new SpawnSystem();
    const spawn = this.spawnSystem.getRandomSpawn();

    // Couleur du joueur depuis le profil lobby
    const myColor = this._lobbyPlayers[myId]?.color || 0xff8c00;
    this.player = new Player(this, spawn.x, spawn.y, myColor);
    this.collisionSystem.playerVsWalls(this.player, this.walls);

    // =========================
    // WORLD SETUP
    // =========================
    const mapW = mazeData[0].length * 64;
    const mapH = mazeData.length * 64;
    this.physics.world.setBounds(0, 0, mapW, mapH);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, mapW, mapH);

    // =========================
    // SYSTEMS
    // =========================
    this.observationSystem = new ObservationSystem(this);
    this.fogSystem = new FogSystem(this, this.player);
    this.phantomSystem = new PhantomSystem(this, this.player);

    // =========================
    // GLANCE SYSTEM
    // =========================
    this.glanceSystem = new GlanceSystem(this, this.fogSystem);
    this.glanceSystem.setVisible(false);

    // =========================
    // JOYSTICK + BOUTON MOBILE
    // =========================
    if (this.joystickSystem) this.joystickSystem.destroy();
    if (this.glanceButton) this.glanceButton.destroy();
    this.joystickSystem = new JoystickSystem(this);
    this.glanceButton = new GlanceButton(this, this.glanceSystem);
    this.joystickSystem.setVisible(false);
    this.glanceButton.setVisible(false);

    // =========================
    // TROPHY
    // =========================
    this.createTrophy();

    // =========================
    // GAME STATE
    // =========================
    this.isGameFinished = false;

    // =========================
    // SOCKET
    // =========================
    this.remotePlayers = {};
    this._lastPlayers = this._lobbyPlayers;
    this.socketManager = new SocketManager(socket, myId);

    if (lobbyPlayers) {
      Object.values(lobbyPlayers).forEach((p) => {
        if (p.id !== this.socketManager.myId) {
          this.addRemotePlayer(p);
        }
      });
    }

    this.socketManager.onPlayerJoined((p) => {
      this.addRemotePlayer(p);
    });

    this.socketManager.onPlayerMoved(({ id, x, y }) => {
      if (this.remotePlayers[id]) {
        this.remotePlayers[id].setPosition(x, y);
        this.remotePlayers[id]._border?.setPosition(x, y);
      }
    });

    this.socketManager.onPlayerLeft(({ id }) => {
      if (this.remotePlayers[id]) {
        this.remotePlayers[id]._border?.destroy();
        this.remotePlayers[id].destroy();
        delete this.remotePlayers[id];
      }
    });

    this.socketManager.onGameOver(({ winnerId }) => {
      this.showEndScreen(winnerId === this.socketManager.myId);
    });

    // =========================
    // POTION
    // =========================
    this.potion = new Potion(this, -1000, -1000);
    this.potion.hide();

    this.socketManager.socket.on("potionSpawned", ({ x, y }) => {
      this.potion.moveTo(x, y);
    });

    this.socketManager.socket.on("potionCollected", () => {
      this.potion.hide();
      if (this.phantomSystem.isPhantom) {
        this.phantomSystem.cancel();
      }
    });

    this.socketManager.socket.emit("requestPotionPosition");

    // =========================
    // SCORE + LEADERBOARD
    // =========================
    this.scoreSystem = new ScoreSystem();

    const allPlayers = { ...this._lobbyPlayers };
    if (myId && !allPlayers[myId]) {
      allPlayers[myId] = { id: myId, pseudo: "Moi", color: myColor };
    }

    this.scoreSystem.init(allPlayers);

    const tileSize = 64;
    const trophyX = (mazeData[0].length * tileSize) / 2;
    const trophyY = (mazeData.length * tileSize) / 2;

    if (this.leaderboardUI) this.leaderboardUI.destroy();
    this.leaderboardUI = new LeaderboardUI(this);
    this.leaderboardUI.init(allPlayers, myId, trophyX, trophyY);
    this.leaderboardUI.setVisible(false);

    // allPositions — après leaderboard + scoreSystem
    this.socketManager.socket.on("allPositions", (positions) => {
      if (!this.leaderboardUI || !this.scoreSystem) return;
      positions.forEach(({ id, x, y }) => {
        if (id === this.socketManager.myId) {
          const myScore = this.scoreSystem.getScore(this.socketManager.myId);
          this.leaderboardUI.update(id, this.player.x, this.player.y, myScore);
        } else if (this.remotePlayers[id]) {
          this.remotePlayers[id].setPosition(x, y);
          const score = this.scoreSystem.getScore(id);
          this.leaderboardUI.update(id, x, y, score);
        }
      });
      this.leaderboardUI.sort();
    });

    this.socketManager.socket.on("scoresUpdated", ({ scores }) => {
      Object.entries(scores).forEach(([id, score]) => {
        if (this.remotePlayers[id]) {
          this.leaderboardUI.update(
            id,
            this.remotePlayers[id].x,
            this.remotePlayers[id].y,
            score,
          );
        }
      });
      this.leaderboardUI.sort();
    });

    // Pénalité coup d'œil
    this.events.off("glanceUsed");
    this.events.on("glanceUsed", () => {
      const newScore = this.scoreSystem.penalizeGlance(this.socketManager.myId);
      this.leaderboardUI.update(
        this.socketManager.myId,
        this.player.x,
        this.player.y,
        newScore,
      );
      this.socketManager.socket.emit("scoreUpdate", {
        scores: this.scoreSystem.all(),
      });
    });

    // =========================
    // MINIMAP
    // =========================
    if (this.minimapSystem) this.minimapSystem.destroy();
    this.minimapSystem = new MinimapSystem(this, myId);
    this.minimapSystem.setVisible(false);

    // =========================
    // TRAIL SYSTEM
    // =========================
    if (this.trailSystem) this.trailSystem.destroy();
    this.trailSystem = new TrailSystem(this);

    this._trailTimer = this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        if (this.isGameFinished || this.observationSystem.isObservationPhase)
          return;
        const myCol =
          this._lobbyPlayers[this.socketManager.myId]?.color || 0xff8c00;
        this.trailSystem.addStep(this.player.x, this.player.y, myCol);
        Object.entries(this.remotePlayers).forEach(([id, sprite]) => {
          const color = this._lobbyPlayers[id]?.color || 0xffffff;
          this.trailSystem.addStep(sprite.x, sprite.y, color);
        });
      },
    });
  }

  update(time, delta) {
    if (this.isGameFinished) return;

    // =========================
    // PLAYER MOVE + GHOSTS
    // =========================
    this.player.move(this.cursors, this.joystickSystem);
    this.player.updateGhosts(delta);
    this.trailSystem.update();
    this.trophy.update();

    // =========================
    // LEADERBOARD VISIBILITY
    // =========================
    if (!this.observationSystem.isObservationPhase) {
      this.leaderboardUI.setVisible(true);
      this.glanceSystem.setVisible(true);
      this.joystickSystem.setVisible(true);
      this.glanceButton.setVisible(true);

      const myScore = this.scoreSystem.getScore(this.socketManager.myId);
      this.leaderboardUI.update(
        this.socketManager.myId,
        this.player.x,
        this.player.y,
        myScore,
      );
      this.leaderboardUI.sort();

      // Minimap — mettre à jour ma position
      this.minimapSystem.setVisible(true);
      const myColor =
        this._lobbyPlayers[this.socketManager.myId]?.color || 0xff8c00;
      this.minimapSystem.updatePlayer(
        this.socketManager.myId,
        this.player.x,
        this.player.y,
        myColor,
        true,
      );

      // Adversaires
      Object.entries(this.remotePlayers).forEach(([id, sprite]) => {
        const color = this._lobbyPlayers[id]?.color || 0xffffff;
        this.minimapSystem.updatePlayer(id, sprite.x, sprite.y, color, false);
      });
    } else {
      this.minimapSystem.setVisible(false);
      this.leaderboardUI.setVisible(false);
      this.glanceSystem.setVisible(false);
      this.joystickSystem.setVisible(false);
      this.glanceButton.setVisible(false);
    }

    // =========================
    // PHANTOM + GLANCE
    // =========================
    this.phantomSystem.update(delta);
    this.glanceSystem.update(delta);

    // =========================
    // COLLISION JOUEUR VS REMOTE
    // =========================
    if (!this.phantomSystem.isPhantom) {
      Object.values(this.remotePlayers).forEach((remote) => {
        const dist = Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          remote.x,
          remote.y,
        );
        if (dist < 40) {
          const angle = Phaser.Math.Angle.Between(
            remote.x,
            remote.y,
            this.player.x,
            this.player.y,
          );
          this.player.setVelocity(Math.cos(angle) * 350, Math.sin(angle) * 350);
          this.time.delayedCall(150, () => {
            if (!this.isGameFinished) this.player.setVelocity(0, 0);
          });
        }
      });
    }

    // =========================
    // POTION PICKUP
    // =========================
    if (this.potion.active) {
      this.physics.overlap(this.player, this.potion, () =>
        this.collectPotion(),
      );
    }

    // =========================
    // SOCKET MOVE
    // =========================
    this.socketManager.sendMove(this.player.x, this.player.y);

    // =========================
    // FOG UPDATE
    // =========================
    this.fogSystem.update(this.observationSystem.isObservationPhase);

    // =========================
    // WIN CHECK
    // =========================
    this.physics.overlap(this.player, this.trophy, () => this.winGame());
  }

  collectPotion() {
    this.potion.hide();
    this.scoreSystem.registerPotionUse(this.socketManager.myId);
    this.socketManager.socket.emit("potionCollected", {
      id: this.socketManager.myId,
    });
    this.phantomSystem.activate(() => {});
  }

  createTrophy() {
    const tileSize = 64;
    const largeur = mazeData[0].length * tileSize;
    const hauteur = mazeData.length * tileSize;
    this.trophy = new Trophy(this, largeur / 2, hauteur / 2);
    this.trophy.setVisible(true);
    this.trophy.setActive(true);
    this.trophy.setDepth(10);
  }

  showEndScreen(isWinner) {
    this.minimapSystem?.setVisible(false);
    this.leaderboardUI?.setVisible(false);
    this.isGameFinished = true;
    this.player.setVelocity(0, 0);
    this.joystickSystem?.setVisible(false);
    this.glanceButton?.setVisible(false);

    // =========================
    // CALCUL SCORES FINAUX
    // =========================
    const tileSize = 64;
    const trophyX = (mazeData[0].length * tileSize) / 2;
    const trophyY = (mazeData.length * tileSize) / 2;
    const myId = this.socketManager.myId;

    const playerDistances = [
      {
        id: myId,
        dist: Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          trophyX,
          trophyY,
        ),
      },
    ];

    Object.entries(this.remotePlayers).forEach(([id, sprite]) => {
      playerDistances.push({
        id,
        dist: Phaser.Math.Distance.Between(
          sprite.x,
          sprite.y,
          trophyX,
          trophyY,
        ),
      });
    });

    const { scores, sorted } = this.scoreSystem.applyEndScores(playerDistances);

    const gameScores = sorted.map(({ id }) => ({
      id,
      pseudo: this._lastPlayers[id]?.pseudo || "Joueur",
      score: scores[id] || 0,
    }));

    this.socketManager.socket.emit("saveScores", { gameScores });

    // =========================
    // CINÉMATIQUE
    // =========================
    this.cameras.main.flash(300, 255, 255, 255, false);
    this.cameras.main.shake(250, 0.003);

    this.time.delayedCall(200, () => {
      this.cameras.main.zoomTo(0.25, 400, "Sine.easeOut");
    });

    // =========================
    // ATTENDRE LE LEADERBOARD GLOBAL
    // =========================
    this.socketManager.socket.once("leaderboardUpdated", (board) => {
      this._buildEndScreen(isWinner, sorted, scores, board);
    });
  }

  _buildEndScreen(isWinner, sorted, scores, board) {
    const W = this.scale.width;
    const H = this.scale.height;
    const myId = this.socketManager.myId;
    const myRank = sorted.findIndex((p) => p.id === myId) + 1;
    const medals = ["🥇", "🥈", "🥉"];

    // =========================
    // OVERLAY COMPLET
    // =========================
    this.add
      .rectangle(0, 0, W, H, 0x000000, 0.92)
      .setScrollFactor(0)
      .setDepth(9990)
      .setOrigin(0);

    // =========================
    // TITRE
    // =========================
    const medal = medals[myRank - 1] || `#${myRank}`;
    this.add
      .text(W / 2, H * 0.06, isWinner ? "VICTOIRE !" : "FIN DE PARTIE", {
        fontSize: "32px",
        color: isWinner ? "#ff8c00" : "#666666",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9991);

    this.add
      .text(W / 2, H * 0.13, `${medal}  Tu termines ${myRank}e`, {
        fontSize: "16px",
        color: "#888888",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9991);

    // Séparateur
    this.add
      .rectangle(W / 2, H * 0.18, W * 0.85, 1, 0xff8c00, 0.2)
      .setScrollFactor(0)
      .setDepth(9991)
      .setOrigin(0.5);

    // =========================
    // TABLEAU PARTIE EN COURS
    // =========================
    this.add
      .text(W / 2, H * 0.2, "RÉSULTATS DE LA PARTIE", {
        fontSize: "10px",
        color: "#554433",
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9991);

    // En-têtes tableau
    const tableX = W / 2;
    const tableW = Math.min(W * 0.88, 500);
    const colRang = tableX - tableW / 2 + 20;
    const colPseudo = tableX - tableW / 2 + 70;
    const colPts = tableX + tableW / 2 - 80;
    const colTotal = tableX + tableW / 2 - 10;
    const headerY = H * 0.25;

    // Fond tableau
    this.add
      .rectangle(
        tableX,
        headerY + 10,
        tableW,
        36 + sorted.length * 40,
        0x0a0808,
        0.8,
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(9990)
      .setStrokeStyle(1, 0xff8c00, 0.15);

    // Headers
    [
      [colRang, "RG"],
      [colPseudo, "JOUEUR"],
      [colPts, "CETTE PARTIE"],
      [colTotal, "TOTAL"],
    ].forEach(([x, label]) => {
      this.add
        .text(x, headerY, label, {
          fontSize: "10px",
          color: "#443322",
          letterSpacing: 2,
        })
        .setScrollFactor(0)
        .setDepth(9992);
    });

    this.add
      .rectangle(tableX, headerY + 18, tableW - 20, 1, 0xff8c00, 0.1)
      .setScrollFactor(0)
      .setDepth(9992)
      .setOrigin(0.5);

    // Lignes joueurs
    sorted.forEach(({ id }, i) => {
      const rowY = headerY + 28 + i * 40;
      const isMe = id === myId;
      const pseudo = this._lastPlayers[id]?.pseudo || "Joueur";
      const ptsPartie = scores[id] || 0;
      const color = this._lastPlayers[id]?.color || 0xffffff;
      const hex = "#" + color.toString(16).padStart(6, "0");
      const rankStr = medals[i] || `${i + 1}`;

      // Highlight ma ligne
      if (isMe) {
        this.add
          .rectangle(tableX, rowY + 12, tableW - 8, 34, 0xff8c00, 0.06)
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(9991);
      }

      // Rang
      this.add
        .text(colRang, rowY, rankStr, {
          fontSize: "16px",
          color: isMe ? "#ff8c00" : "#555555",
        })
        .setScrollFactor(0)
        .setDepth(9992);

      // Point couleur + pseudo
      this.add
        .circle(colPseudo + 6, rowY + 10, 6, color)
        .setScrollFactor(0)
        .setDepth(9992);

      this.add
        .text(colPseudo + 18, rowY, pseudo, {
          fontSize: "15px",
          color: isMe ? "#ffffff" : "#888888",
          fontStyle: isMe ? "bold" : "normal",
        })
        .setScrollFactor(0)
        .setDepth(9992);

      // Pts partie
      this.add
        .text(colPts, rowY, `+${ptsPartie}`, {
          fontSize: "15px",
          color: "#ffd700",
          fontStyle: "bold",
        })
        .setScrollFactor(0)
        .setDepth(9992);

      // Total cumulé — chercher dans le board
      const boardEntry = board.find((b) => b.pseudo === pseudo);
      const totalPts = boardEntry?.totalScore ?? ptsPartie;
      this.add
        .text(colTotal, rowY, `${totalPts}`, {
          fontSize: "15px",
          color: isMe ? "#ff8c00" : "#666666",
          fontStyle: isMe ? "bold" : "normal",
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(9992);

      // Séparateur ligne
      if (i < sorted.length - 1) {
        this.add
          .rectangle(tableX, rowY + 36, tableW - 20, 1, 0xff8c00, 0.05)
          .setScrollFactor(0)
          .setDepth(9991)
          .setOrigin(0.5);
      }
    });

    // Séparateur
    const sepY = H * 0.25 + 28 + sorted.length * 40 + 20;
    this.add
      .rectangle(W / 2, sepY, W * 0.85, 1, 0xff8c00, 0.2)
      .setScrollFactor(0)
      .setDepth(9991)
      .setOrigin(0.5);

    // =========================
    // BONUS / PÉNALITÉS (compact)
    // =========================
    const myGlances = this.scoreSystem.glanceCounts[myId] || 0;
    const myPotion = this.scoreSystem.usedPotion[myId];
    const bonusY = sepY + 16;

    const bonusItems = [
      myGlances === 0
        ? "✅ Sans coup d'œil +25"
        : `❌ ${myGlances} coup(s) d'œil -${myGlances * 15}`,
      myPotion ? "❌ Potion utilisée" : "✅ Sans potion +20",
    ];

    bonusItems.forEach((txt, i) => {
      this.add
        .text(W / 2, bonusY + i * 22, txt, {
          fontSize: "12px",
          color: txt.startsWith("✅") ? "#00ff88" : "#ff4444",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(9991);
    });

    // =========================
    // BOUTONS
    // =========================
    const btnY = bonusY + bonusItems.length * 22 + 28;

    const btnSame = this.add
      .text(W / 2, btnY, "🔁  REJOUER ENSEMBLE", {
        fontSize: "16px",
        color: "#000000",
        backgroundColor: "#ff8c00",
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9993)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => btnSame.setAlpha(0.8))
      .on("pointerout", () => btnSame.setAlpha(1))
      .on("pointerdown", () => {
        this.waitingText.setText("En attente...");
        this.socketManager.socket.emit("requestRematch");
      });

    this.waitingText = this.add
      .text(W / 2, btnY + 48, "", {
        fontSize: "12px",
        color: "#443322",
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9993);

    const btnNew = this.add
      .text(W / 2, btnY + 68, "🔍  CHERCHER UN AUTRE JOUEUR", {
        fontSize: "12px",
        color: "#443322",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9993)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => btnNew.setStyle({ color: "#ff8c00" }))
      .on("pointerout", () => btnNew.setStyle({ color: "#443322" }))
      .on("pointerdown", () => {
        this.socketManager.disconnect();
        window.location.href = "/";
      });

    this.socketManager.socket.on("rematchReady", () => {
      this.scene.start("GameScene", {
        socket: this.socketManager.socket,
        myId: this.socketManager.myId,
        players: this._lastPlayers,
      });
    });
  }

  addRemotePlayer(p) {
    if (!p?.id || this.remotePlayers[p.id]) return;

    const sprite = new Player(
      this,
      p.x || 500,
      p.y || 500,
      p.color || 0xffffff,
    );
    this.remotePlayers[p.id] = sprite;
    this.collisionSystem.playerVsWalls(sprite, this.walls);
  }

  winGame() {
    if (this.isGameFinished) return;
    this.socketManager.sendWin();
  }

  showEndScreen(isWinner) {
    this.minimapSystem?.setVisible(false);
    this.leaderboardUI?.setVisible(false);
    this.isGameFinished = true;
    this.player.setVelocity(0, 0);
    this.joystickSystem?.setVisible(false);
    this.glanceButton?.setVisible(false);

    // =========================
    // CALCUL SCORES FINAUX
    // =========================
    const tileSize = 64;
    const trophyX = (mazeData[0].length * tileSize) / 2;
    const trophyY = (mazeData.length * tileSize) / 2;
    const myId = this.socketManager.myId;

    const playerDistances = [
      {
        id: myId,
        dist: Phaser.Math.Distance.Between(
          this.player.x,
          this.player.y,
          trophyX,
          trophyY,
        ),
      },
    ];

    Object.entries(this.remotePlayers).forEach(([id, sprite]) => {
      playerDistances.push({
        id,
        dist: Phaser.Math.Distance.Between(
          sprite.x,
          sprite.y,
          trophyX,
          trophyY,
        ),
      });
    });

    const { scores, sorted } = this.scoreSystem.applyEndScores(playerDistances);

    const gameScores = sorted.map(({ id }) => ({
      id,
      pseudo: this._lastPlayers[id]?.pseudo || "Joueur",
      score: scores[id] || 0,
    }));

    this.socketManager.socket.emit("saveScores", { gameScores });

    // =========================
    // CINÉMATIQUE
    // =========================
    this.cameras.main.flash(300, 255, 255, 255, false);
    this.cameras.main.shake(250, 0.003);

    this.time.delayedCall(200, () => {
      this.cameras.main.zoomTo(0.25, 400, "Sine.easeOut");
    });

    // =========================
    // ATTENDRE LE LEADERBOARD GLOBAL
    // =========================
    this.socketManager.socket.once("leaderboardUpdated", (board) => {
      this._buildEndScreen(isWinner, sorted, scores, board);
    });
  }

  _buildEndScreen(isWinner, sorted, scores, board) {
    const W = this.scale.width;
    const H = this.scale.height;
    const myId = this.socketManager.myId;
    const myRank = sorted.findIndex((p) => p.id === myId) + 1;
    const medals = ["🥇", "🥈", "🥉"];

    // =========================
    // OVERLAY COMPLET
    // =========================
    this.add
      .rectangle(0, 0, W, H, 0x000000, 0.92)
      .setScrollFactor(0)
      .setDepth(9990)
      .setOrigin(0);

    // =========================
    // TITRE
    // =========================
    const medal = medals[myRank - 1] || `#${myRank}`;
    this.add
      .text(W / 2, H * 0.06, isWinner ? "VICTOIRE !" : "FIN DE PARTIE", {
        fontSize: "32px",
        color: isWinner ? "#ff8c00" : "#666666",
        fontStyle: "bold",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9991);

    this.add
      .text(W / 2, H * 0.13, `${medal}  Tu termines ${myRank}e`, {
        fontSize: "16px",
        color: "#888888",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9991);

    // Séparateur
    this.add
      .rectangle(W / 2, H * 0.18, W * 0.85, 1, 0xff8c00, 0.2)
      .setScrollFactor(0)
      .setDepth(9991)
      .setOrigin(0.5);

    // =========================
    // TABLEAU PARTIE EN COURS
    // =========================
    this.add
      .text(W / 2, H * 0.2, "RÉSULTATS DE LA PARTIE", {
        fontSize: "10px",
        color: "#554433",
        letterSpacing: 4,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9991);

    // En-têtes tableau
    const tableX = W / 2;
    const tableW = Math.min(W * 0.88, 500);
    const colRang = tableX - tableW / 2 + 20;
    const colPseudo = tableX - tableW / 2 + 70;
    const colPts = tableX + tableW / 2 - 80;
    const colTotal = tableX + tableW / 2 - 10;
    const headerY = H * 0.25;

    // Fond tableau
    this.add
      .rectangle(
        tableX,
        headerY + 10,
        tableW,
        36 + sorted.length * 40,
        0x0a0808,
        0.8,
      )
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(9990)
      .setStrokeStyle(1, 0xff8c00, 0.15);

    // Headers
    [
      [colRang, "RG"],
      [colPseudo, "JOUEUR"],
      [colPts, "CETTE PARTIE"],
      [colTotal, "TOTAL"],
    ].forEach(([x, label]) => {
      this.add
        .text(x, headerY, label, {
          fontSize: "10px",
          color: "#443322",
          letterSpacing: 2,
        })
        .setScrollFactor(0)
        .setDepth(9992);
    });

    this.add
      .rectangle(tableX, headerY + 18, tableW - 20, 1, 0xff8c00, 0.1)
      .setScrollFactor(0)
      .setDepth(9992)
      .setOrigin(0.5);

    // Lignes joueurs
    sorted.forEach(({ id }, i) => {
      const rowY = headerY + 28 + i * 40;
      const isMe = id === myId;
      const pseudo = this._lastPlayers[id]?.pseudo || "Joueur";
      const ptsPartie = scores[id] || 0;
      const color = this._lastPlayers[id]?.color || 0xffffff;
      const hex = "#" + color.toString(16).padStart(6, "0");
      const rankStr = medals[i] || `${i + 1}`;

      // Highlight ma ligne
      if (isMe) {
        this.add
          .rectangle(tableX, rowY + 12, tableW - 8, 34, 0xff8c00, 0.06)
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(9991);
      }

      // Rang
      this.add
        .text(colRang, rowY, rankStr, {
          fontSize: "16px",
          color: isMe ? "#ff8c00" : "#555555",
        })
        .setScrollFactor(0)
        .setDepth(9992);

      // Point couleur + pseudo
      this.add
        .circle(colPseudo + 6, rowY + 10, 6, color)
        .setScrollFactor(0)
        .setDepth(9992);

      this.add
        .text(colPseudo + 18, rowY, pseudo, {
          fontSize: "15px",
          color: isMe ? "#ffffff" : "#888888",
          fontStyle: isMe ? "bold" : "normal",
        })
        .setScrollFactor(0)
        .setDepth(9992);

      // Pts partie
      this.add
        .text(colPts, rowY, `+${ptsPartie}`, {
          fontSize: "15px",
          color: "#ffd700",
          fontStyle: "bold",
        })
        .setScrollFactor(0)
        .setDepth(9992);

      // Total cumulé — chercher dans le board
      const boardEntry = board.find((b) => b.pseudo === pseudo);
      const totalPts = boardEntry?.totalScore ?? ptsPartie;
      this.add
        .text(colTotal, rowY, `${totalPts}`, {
          fontSize: "15px",
          color: isMe ? "#ff8c00" : "#666666",
          fontStyle: isMe ? "bold" : "normal",
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(9992);

      // Séparateur ligne
      if (i < sorted.length - 1) {
        this.add
          .rectangle(tableX, rowY + 36, tableW - 20, 1, 0xff8c00, 0.05)
          .setScrollFactor(0)
          .setDepth(9991)
          .setOrigin(0.5);
      }
    });

    // Séparateur
    const sepY = H * 0.25 + 28 + sorted.length * 40 + 20;
    this.add
      .rectangle(W / 2, sepY, W * 0.85, 1, 0xff8c00, 0.2)
      .setScrollFactor(0)
      .setDepth(9991)
      .setOrigin(0.5);

    // =========================
    // BONUS / PÉNALITÉS (compact)
    // =========================
    const myGlances = this.scoreSystem.glanceCounts[myId] || 0;
    const myPotion = this.scoreSystem.usedPotion[myId];
    const bonusY = sepY + 16;

    const bonusItems = [
      myGlances === 0
        ? "✅ Sans coup d'œil +25"
        : `❌ ${myGlances} coup(s) d'œil -${myGlances * 15}`,
      myPotion ? "❌ Potion utilisée" : "✅ Sans potion +20",
    ];

    bonusItems.forEach((txt, i) => {
      this.add
        .text(W / 2, bonusY + i * 22, txt, {
          fontSize: "12px",
          color: txt.startsWith("✅") ? "#00ff88" : "#ff4444",
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(9991);
    });

    // =========================
    // BOUTONS
    // =========================
    const btnY = bonusY + bonusItems.length * 22 + 28;

    const btnSame = this.add
      .text(W / 2, btnY, "🔁  REJOUER ENSEMBLE", {
        fontSize: "16px",
        color: "#000000",
        backgroundColor: "#ff8c00",
        padding: { x: 28, y: 14 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9993)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => btnSame.setAlpha(0.8))
      .on("pointerout", () => btnSame.setAlpha(1))
      .on("pointerdown", () => {
        this.waitingText.setText("En attente...");
        this.socketManager.socket.emit("requestRematch");
      });

    this.waitingText = this.add
      .text(W / 2, btnY + 48, "", {
        fontSize: "12px",
        color: "#443322",
        letterSpacing: 2,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9993);

    const btnNew = this.add
      .text(W / 2, btnY + 68, "🔍  CHERCHER UN AUTRE JOUEUR", {
        fontSize: "12px",
        color: "#443322",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9993)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => btnNew.setStyle({ color: "#ff8c00" }))
      .on("pointerout", () => btnNew.setStyle({ color: "#443322" }))
      .on("pointerdown", () => {
        this.socketManager.disconnect();
        window.location.href = "/";
      });

    this.socketManager.socket.on("rematchReady", () => {
      this.scene.start("GameScene", {
        socket: this.socketManager.socket,
        myId: this.socketManager.myId,
        players: this._lastPlayers,
      });
    });
  }

  _showGlobalLeaderboard(board) {
    const W = this.scale.width;
    const H = this.scale.height;

    const panelW = 260;
    const panelH = Math.min(board.length * 34 + 56, 360);
    const panelX = W / 2 + 200;
    const panelY = H / 2 - panelH / 2;

    this.add
      .rectangle(panelX, panelY, panelW, panelH, 0x060408, 0.92)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(9991)
      .setStrokeStyle(1, 0xff8c00, 0.2);

    this.add
      .text(panelX, panelY + 14, "CLASSEMENT GÉNÉRAL", {
        fontSize: "11px",
        color: "#ff8c00",
        letterSpacing: 3,
        fontStyle: "bold",
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(9992);

    this.add
      .rectangle(panelX, panelY + 30, panelW - 20, 1, 0xff8c00, 0.1)
      .setScrollFactor(0)
      .setDepth(9992);

    const medals = ["🥇", "🥈", "🥉"];
    const maxRows = Math.floor((panelH - 56) / 34);
    const myPseudo = this._lastPlayers[this.socketManager.myId]?.pseudo;

    board.slice(0, maxRows).forEach((p, i) => {
      const y = panelY + 40 + i * 34;
      const isMe = p.pseudo === myPseudo;
      const rank = medals[i] || `${i + 1}.`;

      if (isMe) {
        this.add
          .rectangle(panelX, y + 12, panelW - 16, 28, 0xff8c00, 0.07)
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(9991);
      }

      this.add
        .text(panelX - 110, y, `${rank}  ${p.pseudo}`, {
          fontSize: "13px",
          color: isMe ? "#ff8c00" : "#666666",
          fontStyle: isMe ? "bold" : "normal",
        })
        .setScrollFactor(0)
        .setDepth(9992);

      this.add
        .text(panelX + 110, y, `${p.totalScore} pts`, {
          fontSize: "13px",
          color: "#ffd700",
          fontStyle: "bold",
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(9992);

      this.add
        .text(panelX + 110, y + 16, `${p.gamesPlayed} partie(s)`, {
          fontSize: "9px",
          color: "#332211",
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(9992);
    });
  }
}
