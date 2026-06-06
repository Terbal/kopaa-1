import mazeData from "../maze/mazeData";

export default class MazeBuilder {
  constructor(scene) {
    this.scene = scene;
    this.tileSize = 64;
    this.walls = this.scene.physics.add.staticGroup();
  }

  build() {
    const ts = this.tileSize;
    const rows = mazeData.length;
    const cols = mazeData[0].length;

    // =========================
    // SOL — texture grille
    // =========================
    const floorGraphics = this.scene.add.graphics();

    // Fond sol sombre bleuté
    floorGraphics.fillStyle(0x0a0a12, 1);
    floorGraphics.fillRect(0, 0, cols * ts, rows * ts);

    // Lignes horizontales de la grille
    floorGraphics.lineStyle(1, 0x1a1a2e, 0.6);
    for (let r = 0; r <= rows; r++) {
      floorGraphics.beginPath();
      floorGraphics.moveTo(0, r * ts);
      floorGraphics.lineTo(cols * ts, r * ts);
      floorGraphics.strokePath();
    }

    // Lignes verticales de la grille
    for (let c = 0; c <= cols; c++) {
      floorGraphics.beginPath();
      floorGraphics.moveTo(c * ts, 0);
      floorGraphics.lineTo(c * ts, rows * ts);
      floorGraphics.strokePath();
    }

    // Points aux intersections
    floorGraphics.fillStyle(0x1e1e3a, 0.8);
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c <= cols; c++) {
        floorGraphics.fillRect(c * ts - 1, r * ts - 1, 2, 2);
      }
    }

    floorGraphics.setDepth(-1); // sous tout le reste

    // =========================
    // MURS
    // =========================
    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        if (mazeData[row][col] !== 1) continue;

        const x = col * ts;
        const y = row * ts;

        const g = this.scene.add.graphics();

        // Corps du mur sombre brun
        g.fillStyle(0x1a1208, 1);
        g.fillRect(x, y, ts, ts);

        // Voisins murs
        const top = row > 0 && mazeData[row - 1][col] === 1;
        const bottom = row < rows - 1 && mazeData[row + 1][col] === 1;
        const left = col > 0 && mazeData[row][col - 1] === 1;
        const right = col < cols - 1 && mazeData[row][col + 1] === 1;

        // Contours orange sur faces exposées uniquement
        const glowColor = 0xff8c00;
        const glowW = 2;

        g.fillStyle(glowColor, 0.9);
        if (!top) g.fillRect(x, y, ts, glowW);
        if (!bottom) g.fillRect(x, y + ts - glowW, ts, glowW);
        if (!left) g.fillRect(x, y, glowW, ts);
        if (!right) g.fillRect(x + ts - glowW, y, glowW, ts);

        // Coins renforcés
        g.fillStyle(glowColor, 0.5);
        if (!top && !left) g.fillRect(x, y, 4, 4);
        if (!top && !right) g.fillRect(x + ts - 4, y, 4, 4);
        if (!bottom && !left) g.fillRect(x, y + ts - 4, 4, 4);
        if (!bottom && !right) g.fillRect(x + ts - 4, y + ts - 4, 4, 4);

        // Texture intérieure
        g.fillStyle(0x0d0a04, 0.4);
        g.fillRect(x + 8, y + 8, ts - 16, ts - 16);

        g.setDepth(1);

        // Collider invisible centré
        const wall = this.scene.add.rectangle(
          x + ts / 2,
          y + ts / 2,
          ts,
          ts,
          0x000000,
          0,
        );
        this.scene.physics.add.existing(wall, true);
        this.walls.add(wall);
      }
    }

    return this.walls;
  }
}
