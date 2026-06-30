import Phaser from "phaser";
import mazeData from "../maze/mazeData";

export default class SpawnSystem {
  constructor() {
    this.tileSize = 64;
  }

  getRandomSpawn() {
    let x;
    let y;

    let valid = false;

    while (!valid) {
      const col = Phaser.Math.Between(1, mazeData[0].length - 2);

      const row = Phaser.Math.Between(1, mazeData.length - 2);

      // =========================
      // CASE LIBRE
      // =========================
      if (mazeData[row][col] === 0) {
        x = col * this.tileSize + this.tileSize / 2;
        y = row * this.tileSize + this.tileSize / 2;

        valid = true;
      }
    }

    return { x, y };
  }
}
