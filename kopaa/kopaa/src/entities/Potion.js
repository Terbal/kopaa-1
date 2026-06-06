import Phaser from "phaser";

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

    scene.tweens.add({
      targets: this,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  moveTo(x, y) {
    this.setPosition(x, y);
    this.setVisible(true);
    this.setActive(true);
    if (this.body) this.body.enable = true;
  }

  hide() {
    this.setVisible(false);
    this.setActive(false);
    if (this.body) this.body.enable = false;
  }
}
