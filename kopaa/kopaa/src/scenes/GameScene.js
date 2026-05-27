import Phaser from "phaser";

import Player from "../entities/Player";
import mazeData from "../maze/mazeData";
import MazeBuilder from "../systems/MazeBuilder";
import SpawnSystem from "../systems/SpawnSystem";
import FogSystem from "../systems/FogSystem";
import ObservationSystem from "../systems/ObservationSystem";
import CollisionSystem from "../systems/CollisionSystem";

import Trophy from "../entities/Trophy";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    // =========================
    // ASSETS
    // =========================
    this.load.image("player", "/player.png");
    this.load.image("trophy", "/trophy.png");
  }

  create() {
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
    this.cameras.main.setZoom(0.25);

    // =========================
    // SYSTEMS
    // =========================
    this.observationSystem = new ObservationSystem(this);
    this.fogSystem = new FogSystem(this, this.player);

    // =========================
    // TROPHY
    // =========================
    this.createTrophy();

    // =========================
    // GAME STATE
    // =========================
    this.isGameFinished = false;

    // =========================
    // WIN TEXT
    // =========================
    this.winText = this.add.text(0, 0, "", {
      fontSize: "64px",
      color: "#ffd700",
      fontStyle: "bold",
    });

    this.winText.setDepth(10000);
    this.winText.setVisible(false);
  }

  update() {
    if (this.isGameFinished) return;

    // =========================
    // PLAYER MOVE
    // =========================
    this.player.move(this.cursors);

    // =========================
    // FOG UPDATE
    // La seule ligne changée : on passe la caméra en paramètre
    // pour que FogSystem puisse convertir world → screen coords
    // =========================
    this.fogSystem.update(
      this.observationSystem.isObservationPhase,
      this.cameras.main,
    );

    // =========================
    // WIN CHECK
    // =========================
    this.physics.overlap(this.player, this.trophy, () => this.winGame());
  }

  // =========================
  // CREATE TROPHY
  // =========================
  createTrophy() {
    const tileSize = 64;

    const largeur = mazeData[0].length * tileSize;
    const hauteur = mazeData.length * tileSize;

    const centerX = largeur / 2;
    const centerY = hauteur / 2;

    this.trophy = new Trophy(this, centerX, centerY);

    // sécurité visuelle
    this.trophy.setVisible(true);
    this.trophy.setActive(true);
    this.trophy.setDepth(10);
  }

  // =========================
  // WIN CONDITION
  // =========================
  winGame() {
    this.isGameFinished = true;

    this.winText.setText("WINNER 🏆");

    this.winText.setPosition(this.player.x - 150, this.player.y - 200);

    this.winText.setVisible(true);

    this.player.setVelocity(0, 0);
  }
}
