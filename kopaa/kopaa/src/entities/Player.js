import Phaser from "phaser";

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y) {
    super(scene, x, y, "player");
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.speed = 220;
    this.setCollideWorldBounds(true);
  }

  move(cursors, joystick = null) {
    this.setVelocity(0);

    // Joystick mobile
    if (joystick && joystick.isActive) {
      const { dx, dy } = joystick.getDirection();
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        this.setVelocityX(dx * this.speed);
        this.setVelocityY(dy * this.speed);
        return;
      }
    }

    // Clavier desktop
    if (cursors.left.isDown) this.setVelocityX(-this.speed);
    if (cursors.right.isDown) this.setVelocityX(this.speed);
    if (cursors.up.isDown) this.setVelocityY(-this.speed);
    if (cursors.down.isDown) this.setVelocityY(this.speed);
  }
}
