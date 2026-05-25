import Phaser from "phaser";
import mazeData from "../maze/mazeData";
import Player from "../entities/Player";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    // =========================
    // IMAGE DU JOUEUR
    // =========================
    this.load.image("player", "src/assets/player.png");
  }

  create() {
    // =========================
    // PHASE D'OBSERVATION
    // =========================
    this.isObservationPhase = true;

    // =========================
    // TEMPS D'OBSERVATION
    // =========================
    this.observationTime = 3;

    // =========================
    // INPUT CLAVIER
    // =========================
    this.cursors = this.input.keyboard.createCursorKeys();

    // =========================
    // GROUPE DES MURS
    // =========================
    this.walls = this.physics.add.staticGroup();

    // =========================
    // TAILLE D'UNE CASE
    // =========================
    const tileSize = 64;

    // =========================
    // GÉNÉRATION DU LABYRINTHE
    // =========================
    for (let row = 0; row < mazeData.length; row++) {
      for (let col = 0; col < mazeData[row].length; col++) {
        const tile = mazeData[row][col];

        // =========================
        // SI C'EST UN MUR
        // =========================
        if (tile === 1) {
          const wall = this.add.rectangle(
            col * tileSize,
            row * tileSize,
            tileSize,
            tileSize,
            0x333333,
          );

          // =========================
          // ALIGNEMENT EN HAUT GAUCHE
          // =========================
          wall.setOrigin(0);

          // =========================
          // AJOUT PHYSIQUE
          // =========================
          this.physics.add.existing(wall, true);

          // =========================
          // AJOUT AU GROUPE DES MURS
          // =========================
          this.walls.add(wall);
        }
      }
    }

    // =========================
    // SPAWN ALÉATOIRE
    // =========================
    const spawn = this.getRandomSpawn();

    // =========================
    // CRÉATION DU JOUEUR
    // =========================
    this.player = new Player(this, spawn.x, spawn.y);

    // =========================
    // COLLISION JOUEUR ↔ MURS
    // =========================
    this.physics.add.collider(this.player, this.walls);

    // =========================
    // TAILLE DU MONDE
    // =========================
    this.physics.world.setBounds(0, 0, 5000, 5000);

    // =========================
    // CAMÉRA SUIT LE JOUEUR
    // =========================
    this.cameras.main.startFollow(this.player);

    // =========================
    // LIMITES DE LA CAMÉRA
    // =========================
    this.cameras.main.setBounds(0, 0, 5000, 5000);

    // =========================
    // ZOOM OUT INITIAL
    // =========================
    this.cameras.main.setZoom(0.25);

    // =========================
    // FOG OF WAR
    // =========================
    this.fog = this.add.renderTexture(0, 0, 5000, 5000);

    this.fog.fill(0x000000, 0.92);

    // =========================
    // MASQUE LUMINEUX
    // =========================
    this.lightMask = this.make.graphics();

    // =========================
    // TEXTE TIMER
    // =========================
    this.timerText = this.add.text(
      20,
      20,
      `MEMORISE : ${this.observationTime}`,
      {
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold",
        backgroundColor: "#000000",
        padding: {
          x: 12,
          y: 8,
        },
      },
    );

    // =========================
    // TEXTE FIXE À L'ÉCRAN
    // =========================
    this.timerText.setScrollFactor(0);

    // =========================
    // TEXTE AU-DESSUS DE TOUT
    // =========================
    this.timerText.setDepth(999);

    // =========================
    // TIMER OBSERVATION
    // =========================
    this.time.addEvent({
      delay: 1000,

      repeat: 2,

      callback: () => {
        this.observationTime--;

        this.timerText.setText(`MEMORISE : ${this.observationTime}`);

        // =========================
        // FIN DE LA PHASE
        // =========================
        if (this.observationTime <= 0) {
          this.startFogPhase();
        }
      },
    });
  }

  update() {
    // =========================
    // DÉPLACEMENT JOUEUR
    // =========================
    this.player.move(this.cursors);

    // =========================
    // SI PHASE FOG ACTIVE
    // =========================
    if (!this.isObservationPhase) {
      // =========================
      // RESET MASQUE
      // =========================
      this.lightMask.clear();

      // =========================
      // COULEUR LUMIÈRE
      // =========================
      this.lightMask.fillStyle(0xffffff);

      // =========================
      // GRAND CERCLE
      // =========================
      this.lightMask.fillCircle(this.player.x, this.player.y, 220);

      // =========================
      // PETIT CERCLE
      // =========================
      this.lightMask.fillCircle(this.player.x, this.player.y, 130);

      // =========================
      // RESET FOG
      // =========================
      this.fog.clear();

      // =========================
      // NOIR GLOBAL
      // =========================
      this.fog.fill(0x000000, 0.92);

      // =========================
      // TROU AUTOUR DU JOUEUR
      // =========================
      this.fog.erase(this.lightMask);
    } else {
      // =========================
      // PAS DE FOG AU DÉBUT
      // =========================
      this.fog.clear();
    }
  }

  // =========================
  // DÉBUT PHASE FOG
  // =========================
  startFogPhase() {
    // =========================
    // ACTIVE LE FOG
    // =========================
    this.isObservationPhase = false;

    // =========================
    // TEXTE
    // =========================
    this.timerText.setText("GO GO GO");

    // =========================
    // ZOOM NORMAL
    // =========================
    this.cameras.main.zoomTo(1, 1200);

    // =========================
    // SHAKE CAMÉRA
    // =========================
    this.cameras.main.shake(400, 0.003);
  }

  // =========================
  // SPAWN RANDOM
  // =========================
  getRandomSpawn() {
    const tileSize = 64;

    let x;
    let y;

    let valid = false;

    while (!valid) {
      const col = Phaser.Math.Between(1, mazeData[0].length - 2);

      const row = Phaser.Math.Between(1, mazeData.length - 2);

      // =========================
      // SI CASE LIBRE
      // =========================
      if (mazeData[row][col] === 0) {
        x = col * tileSize;
        y = row * tileSize;

        valid = true;
      }
    }

    return { x, y };
  }
}
