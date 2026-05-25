import Phaser from "phaser";

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "player");

    scene.add.existing(this);

    scene.physics.add.existing(this);

    this.speed = 220;
    this.setCollideWorldBounds(true);
  }

  move(cursors) {
    this.setVelocity(0);

    if (cursors.left.isDown) {
      this.setVelocityX(-this.speed);
    }

    if (cursors.right.isDown) {
      this.setVelocityX(this.speed);
    }

    if (cursors.up.isDown) {
      this.setVelocityY(-this.speed);
    }

    if (cursors.down.isDown) {
      this.setVelocityY(this.speed);
    }
  }
}
