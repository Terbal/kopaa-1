import mazeData from "../maze/mazeData";

export default class MazeBuilder {
  constructor(scene) {
    this.scene = scene;

    this.tileSize = 64;

    this.walls = this.scene.physics.add.staticGroup();
  }

  build() {
    for (let row = 0; row < mazeData.length; row++) {
      for (let col = 0; col < mazeData[row].length; col++) {
        const tile = mazeData[row][col];

        // =========================
        // SI MUR
        // =========================
        if (tile === 1) {
          const wall = this.scene.add.rectangle(
            col * this.tileSize,
            row * this.tileSize,
            this.tileSize,
            this.tileSize,
            0x333333,
          );

          wall.setOrigin(0);

          // =========================
          // PHYSIQUE
          // =========================
          this.scene.physics.add.existing(wall, true);

          this.walls.add(wall);
        }
      }
    }

    return this.walls;
  }
}
