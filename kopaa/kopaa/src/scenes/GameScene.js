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
    // POTION
    // =========================
    this.potion = new Potion(this, 0, 0);
    this.potion.relocate();

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

    this.socketManager.socket.on("allPositions", (positions) => {
      positions.forEach(({ id, x, y }) => {
        if (id === this.socketManager.myId) {
          // Mettre à jour mon rang avec ma vraie position
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

    // Cleanup propre si rematch
    if (this.leaderboardUI) {
      this.leaderboardUI.destroy();
    }

    this.leaderboardUI = new LeaderboardUI(this);
    this.leaderboardUI.init(allPlayers, myId, trophyX, trophyY);
    this.leaderboardUI.setVisible(false);

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
  }

  update(time, delta) {
    if (this.isGameFinished) return;

    // =========================
    // PLAYER MOVE
    // =========================
    this.player.move(this.cursors);
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
    this.potion.setVisible(false);
    this.potion.setActive(false);
    this.potion.body.enable = false;
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

    // Scores finaux
    const allIds = Object.keys(this._lastPlayers);
    const winnerId = isWinner
      ? this.socketManager.myId
      : allIds.find((id) => id !== this.socketManager.myId);

    const finalScores = this.scoreSystem.applyEndScores(winnerId, allIds);

    Object.entries(finalScores).forEach(([id, score]) => {
      const x =
        id === this.socketManager.myId
          ? this.player.x
          : this.remotePlayers[id]?.x || 0;
      const y =
        id === this.socketManager.myId
          ? this.player.y
          : this.remotePlayers[id]?.y || 0;
      this.leaderboardUI.update(id, x, y, score);
    });
    this.leaderboardUI.sort();
    this.leaderboardUI.setVisible(true);

    // Overlay
    this.add
      .rectangle(0, 0, this.scale.width, this.scale.height, 0x000000, 0.7)
      .setScrollFactor(0)
      .setDepth(9997)
      .setOrigin(0);

    // Résultat
    this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 - 100,
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

    // Bouton REJOUER ENSEMBLE
    const btnSame = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 20,
        "🔁  REJOUER ENSEMBLE",
        {
          fontSize: "30px",
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

    // Bouton CHERCHER UN AUTRE JOUEUR
    const btnNew = this.add
      .text(
        this.scale.width / 2,
        this.scale.height / 2 + 110,
        "🔍  CHERCHER UN AUTRE JOUEUR",
        {
          fontSize: "24px",
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

    // Texte attente
    this.waitingText = this.add
      .text(this.scale.width / 2, this.scale.height / 2 + 60, "", {
        fontSize: "18px",
        color: "#888888",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9999);

    // Rematch ready
    this.socketManager.socket.on("rematchReady", () => {
      this.scene.start("GameScene", {
        socket: this.socketManager.socket,
        myId: this.socketManager.myId,
        players: this._lastPlayers,
      });
    });
  }
}
