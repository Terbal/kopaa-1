import Phaser from "phaser";
import mazeData from "../maze/mazeData";
import Player from "../entities/Player";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {
    this.load.image("player", "src/assets/player.png");
  }

  create() {
    this.player = new Player(this, 400, 300);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.cameras.main.startFollow(this.player);
    this.physics.world.setBounds(0, 0, 3000, 3000);
    this.cameras.main.setBounds(0, 0, 3000, 3000);
    this.walls = this.physics.add.staticGroup();
    const tileSize = 64;
    for (let row = 0; row < mazeData.length; row++) {
      for (let col = 0; col < mazeData[row].length; col++) {
        const tile = mazeData[row][col];

        if (tile === 1) {
          const wall = this.add.rectangle(
            col * tileSize,
            row * tileSize,
            tileSize,
            tileSize,
            0x333333,
          );

          wall.setOrigin(0);

          this.physics.add.existing(wall, true);

          this.walls.add(wall);
        }
      }
    }
    this.physics.add.collider(this.player, this.walls);
    this.player = new Player(this, 100, 100);
    this.fog = this.add.renderTexture(0, 0, 3000, 3000);
    this.fog.fill(0x000000, 0.92);
    this.fog.setScrollFactor(1);
    this.lightMask = this.make.graphics();
  }

  update() {
    this.player.move(this.cursors);
    this.lightMask.clear();

    this.lightMask.fillStyle(0xffffff);

    this.lightMask.fillCircle(this.player.x, this.player.y, 200);

    this.lightMask.fillCircle(this.player.x, this.player.y, 120);

    this.fog.clear();

    this.fog.fill(0x000000, 0.92);

    this.fog.erase(this.lightMask);
  }
}
