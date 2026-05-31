import Phaser from "phaser";
import mazeData from "../maze/mazeData";

export default class Potion extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "potion");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setImmovable(true);
    this.body.setAllowGravity(false);
    this.setScale(0.06);
    this.setTint(0x00ffcc);
    this.setDepth(8);

    // Pulse visuel
    scene.tweens.add({
      targets: this,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  // Téléporte la potion dans une case libre aléatoire
  relocate() {
    const tileSize = 64;
    const freeCells = [];

    mazeData.forEach((row, r) => {
      row.forEach((cell, c) => {
        if (cell === 0) {
          freeCells.push({
            x: c * tileSize + tileSize / 2,
            y: r * tileSize + tileSize / 2,
          });
        }
      });
    });

    const pos = Phaser.Utils.Array.GetRandom(freeCells);
    this.setPosition(pos.x, pos.y);
    this.setVisible(true);
    this.setActive(true);
    this.body.enable = true;
  }
}
