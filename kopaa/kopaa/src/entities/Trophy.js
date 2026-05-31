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

    // Pulse via tween — plus fiable que update()
    scene.tweens.add({
      targets: this,
      scaleX: 0.095,
      scaleY: 0.095,
      duration: 700,
      yoyo: true,
      repeat: -1,
      ease: "Sine.easeInOut",
    });
  }

  update() {
    this.rotation += 0.02;
  }
}
