import Phaser from "phaser";

export default class GameScene extends Phaser.Scene {
  constructor() {
    super("GameScene");
  }

  preload() {}

  create() {
    this.add.text(500, 300, "Maze Cup", {
      fontSize: "48px",
      color: "#ffffff",
    });
  }

  update() {}
}
