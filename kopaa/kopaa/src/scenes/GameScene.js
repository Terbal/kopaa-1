import Phaser from "phaser";

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
    this.load.image("player", "/player.png");
    this.load.image("trophy", "/trophy.png");
    this.load.image("potion", "/potion.png");
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
    this.player = new Player(this, spawn.x, spawn.y);
    this.collisionSystem.playerVsWalls(this.player, this.walls);

    // =========================
    // WORLD SETUP
    // =========================
    this.physics.world.setBounds(0, 0, 5000, 5000);
    this.cameras.main.startFollow(this.player);
    this.cameras.main.setBounds(0, 0, 5000, 5000);

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
    // TROPHY
    // =========================
    this.createTrophy();

    // =========================
    // GAME STATE
    // =========================
    this.isGameFinished = false;

    // =========================
    // SOCKET — en premier avant tout le reste
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
      }
    });

    this.socketManager.onPlayerLeft(({ id }) => {
      if (this.remotePlayers[id]) {
        this.remotePlayers[id].destroy();
        delete this.remotePlayers[id];
      }
    });

    this.socketManager.onGameOver(({ winnerId }) => {
      this.showEndScreen(winnerId === this.socketManager.myId);
    });

    // =========================
    // POTION — après socketManager
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
      allPlayers[myId] = { id: myId, pseudo: "Moi", color: 0x00ffff };
    }

    this.scoreSystem.init(allPlayers);

    const tileSize = 64;
    const trophyX = (mazeData[0].length * tileSize) / 2;
    const trophyY = (mazeData.length * tileSize) / 2;

    if (this.leaderboardUI) this.leaderboardUI.destroy();
    this.leaderboardUI = new LeaderboardUI(this);
    this.leaderboardUI.init(allPlayers, myId, trophyX, trophyY);
    this.leaderboardUI.setVisible(false);

    // =========================
    // allPositions — après leaderboard + scoreSystem
    // =========================
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
    // TRAIL SYSTEM — en dernier
    // =========================
    if (this.trailSystem) this.trailSystem.destroy();
    this.trailSystem = new TrailSystem(this);

    this._trailTimer = this.time.addEvent({
      delay: 300,
      loop: true,
      callback: () => {
        if (this.isGameFinished || this.observationSystem.isObservationPhase)
          return;

        const myColor =
          this._lobbyPlayers[this.socketManager.myId]?.color || 0x00ffff;
        this.trailSystem.addStep(this.player.x, this.player.y, myColor);

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
    // PLAYER MOVE
    // =========================
    this.player.move(this.cursors);
    this.trailSystem.update();
    this.trophy.update();

    // =========================
    // LEADERBOARD
    // =========================
    if (!this.observationSystem.isObservationPhase) {
      this.leaderboardUI.setVisible(true);
      this.glanceSystem.setVisible(true);

      const myScore = this.scoreSystem.getScore(this.socketManager.myId);
      this.leaderboardUI.update(
        this.socketManager.myId,
        this.player.x,
        this.player.y,
        myScore,
      );
      this.leaderboardUI.sort();
    } else {
      this.leaderboardUI.setVisible(false);
      this.glanceSystem.setVisible(false);
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
    this.fogSystem.update(this.observationSystem.isObservationPhase, delta);

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

    this.phantomSystem.activate(() => {
      this.potion.relocate();
    });
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

  addRemotePlayer({ id, x, y, color }) {
    const sprite = this.add.rectangle(x, y, 40, 40, color);
    sprite.setDepth(5);
    this.remotePlayers[id] = sprite;
  }

  winGame() {
    if (this.isGameFinished) return;
    this.socketManager.sendWin();
  }

  showEndScreen(isWinner) {
    this.isGameFinished = true;
    this.player.setVelocity(0, 0);
    this.cameras.main.shake(300, 0.005);

    // =========================
    // CALCUL SCORES FINAUX
    // =========================
    const tileSize = 64;
    const trophyX = (mazeData[0].length * tileSize) / 2;
    const trophyY = (mazeData.length * tileSize) / 2;

    // Distances finales de tous les joueurs
    const playerDistances = [];

    // Moi
    playerDistances.push({
      id: this.socketManager.myId,
      dist: Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        trophyX,
        trophyY,
      ),
    });

    // Adversaires
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

    // Envoyer scores au serveur pour persistance
    const gameScores = sorted.map(({ id }) => ({
      id,
      pseudo: this._lastPlayers[id]?.pseudo || "Joueur",
      score: scores[id] || 0,
    }));
    this.socketManager.socket.emit("saveScores", { gameScores });

    // Recevoir le leaderboard global mis à jour
    this.socketManager.socket.once("leaderboardUpdated", (board) => {
      this._showGlobalLeaderboard(board);
    });

    // Mettre à jour le leaderboard avec scores finaux
    sorted.forEach(({ id, dist }) => {
      const x =
        id === this.socketManager.myId
          ? this.player.x
          : this.remotePlayers[id]?.x || 0;
      const y =
        id === this.socketManager.myId
          ? this.player.y
          : this.remotePlayers[id]?.y || 0;
      this.leaderboardUI.update(id, x, y, scores[id]);
    });
    this.leaderboardUI.sort();
    this.leaderboardUI.setVisible(true);

    // =========================
    // OVERLAY
    // =========================
    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.75)
      .setScrollFactor(0)
      .setDepth(9997)
      .setOrigin(0);

    // Résultat principal
    this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 - 120,
        isWinner ? "WINNER 🏆" : "PERDU 💀",
        {
          fontSize: "72px",
          color: isWinner ? "#ffd700" : "#ff4444",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 6,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9998);

    // =========================
    // RECAP SCORE
    // =========================
    const myScore = scores[this.socketManager.myId] || 0;
    const myGlances =
      this.scoreSystem.glanceCounts[this.socketManager.myId] || 0;
    const myPotion = this.scoreSystem.usedPotion[this.socketManager.myId];
    const myRank =
      sorted.findIndex((p) => p.id === this.socketManager.myId) + 1;

    const recapLines = [
      `SCORE FINAL : ${myScore} pts`,
      `Classement : #${myRank}/${sorted.length}`,
      myGlances === 0
        ? "✅ Aucun coup d'œil  (+25)"
        : `❌ ${myGlances} coup(s) d'œil  (-${myGlances * 15})`,
      myPotion ? "❌ Potion utilisée" : "✅ Sans potion  (+20)",
    ];

    recapLines.forEach((line, i) => {
      this.add
        .text(this.scale.width / 2, this.scale.height / 2 - 30 + i * 32, line, {
          fontSize: i === 0 ? "26px" : "18px",
          color: i === 0 ? "#ffd700" : "#cccccc",
          stroke: "#000000",
          strokeThickness: 3,
        })
        .setOrigin(0.5)
        .setScrollFactor(0)
        .setDepth(9998);
    });

    // =========================
    // BOUTONS
    // =========================
    const btnSame = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 110,
        "🔁  REJOUER ENSEMBLE",
        {
          fontSize: "26px",
          color: "#ffffff",
          backgroundColor: "#1a1a1a",
          padding: { x: 24, y: 12 },
          stroke: "#00ffcc",
          strokeThickness: 2,
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9999)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => btnSame.setStyle({ color: "#00ffcc" }))
      .on("pointerout", () => btnSame.setStyle({ color: "#ffffff" }))
      .on("pointerdown", () => {
        this.waitingText.setText("En attente de l'autre joueur...");
        this.socketManager.socket.emit("requestRematch");
      });

    const btnNew = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 175,
        "🔍  CHERCHER UN AUTRE JOUEUR",
        {
          fontSize: "20px",
          color: "#aaaaaa",
          backgroundColor: "#1a1a1a",
          padding: { x: 24, y: 12 },
        },
      )
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9999)
      .setInteractive({ useHandCursor: true })
      .on("pointerover", () => btnNew.setStyle({ color: "#ffffff" }))
      .on("pointerout", () => btnNew.setStyle({ color: "#aaaaaa" }))
      .on("pointerdown", () => {
        this.socketManager.disconnect();
        this.scene.start("LobbyScene");
      });

    this.waitingText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 148, "", {
        fontSize: "16px",
        color: "#888888",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9999);

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

    // Fond panneau
    const panelW = 320;
    const panelH = Math.min(board.length * 36 + 60, 400);
    const panelX = W / 2 + 220;
    const panelY = H / 2 - panelH / 2 - 30;

    this.add
      .rectangle(panelX, panelY, panelW, panelH, 0x000000, 0.85)
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(9998);

    this.add
      .text(panelX, panelY + 14, "🏅 CLASSEMENT GÉNÉRAL", {
        fontSize: "14px",
        color: "#ffd700",
        fontStyle: "bold",
        letterSpacing: 2,
      })
      .setOrigin(0.5, 0)
      .setScrollFactor(0)
      .setDepth(9999);

    // En-têtes
    this.add
      .text(panelX - 140, panelY + 38, "#  JOUEUR", {
        fontSize: "11px",
        color: "#444466",
        letterSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(9999);

    this.add
      .text(panelX + 100, panelY + 38, "TOTAL", {
        fontSize: "11px",
        color: "#444466",
        letterSpacing: 2,
      })
      .setScrollFactor(0)
      .setDepth(9999);

    // Lignes
    const medals = ["🥇", "🥈", "🥉"];
    const maxRows = Math.floor((panelH - 60) / 36);

    board.slice(0, maxRows).forEach((p, i) => {
      const y = panelY + 60 + i * 36;
      const isMe =
        p.pseudo === this._lastPlayers[this.socketManager.myId]?.pseudo;
      const rank = medals[i] || `${i + 1}.`;

      // Highlight si c'est moi
      if (isMe) {
        this.add
          .rectangle(panelX, y + 10, panelW - 20, 30, 0x00ffcc, 0.08)
          .setOrigin(0.5, 0.5)
          .setScrollFactor(0)
          .setDepth(9998);
      }

      this.add
        .text(panelX - 140, y, `${rank}  ${p.pseudo}`, {
          fontSize: "15px",
          color: isMe ? "#00ffcc" : "#cccccc",
          fontStyle: isMe ? "bold" : "normal",
        })
        .setScrollFactor(0)
        .setDepth(9999);

      this.add
        .text(panelX + 140, y, `${p.totalScore} pts`, {
          fontSize: "15px",
          color: "#ffd700",
          fontStyle: "bold",
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(9999);

      // Parties jouées
      this.add
        .text(panelX + 140, y + 18, `${p.gamesPlayed} partie(s)`, {
          fontSize: "10px",
          color: "#444466",
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(9999);
    });
  }
}
