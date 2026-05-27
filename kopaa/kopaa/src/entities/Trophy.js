import Phaser from "phaser";

export default class Trophy extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "trophy");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.setImmovable(true);
    this.body.setAllowGravity(false);

    this.setScale(0.08);
    this.setTint(0xffd700);
    this.setDepth(10);
  }

  update() {
    // ici plus tard :
    // animation glow / rotation / pulse
    this.rotation += 0.002;
  }
}
