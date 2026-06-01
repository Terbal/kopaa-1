export default class TrailSystem {
  constructor(scene) {
    this.scene = scene;
    this.particles = []; // { sprite, createdAt, lifetime, color }
    this.lifetime = 20000; // 20 secondes

    // Formes de pas aléatoires (polygones simples)
    this.footShapes = [
      // Pied gauche allongé
      [
        [-6, -3],
        [6, -3],
        [7, 3],
        [4, 5],
        [-4, 5],
        [-7, 3],
      ],
      // Pied droit allongé
      [
        [-7, -3],
        [7, -3],
        [6, 3],
        [4, 5],
        [-4, 5],
        [-6, 3],
      ],
      // Petit pied arrondi
      [
        [-5, -4],
        [5, -4],
        [6, 0],
        [5, 4],
        [-5, 4],
        [-6, 0],
      ],
      // Pied large
      [
        [-7, -2],
        [7, -2],
        [7, 4],
        [-7, 4],
      ],
    ];
  }

  // =========================
  // AJOUTER UN PAS
  // =========================
  addStep(x, y, color) {
    const shapePoints =
      this.footShapes[Phaser.Math.Between(0, this.footShapes.length - 1)];

    // Rotation aléatoire du pas
    const angle = Phaser.Math.Between(-180, 180) * (Math.PI / 180);
    const rotated = shapePoints.map(([px, py]) => {
      const rx = px * Math.cos(angle) - py * Math.sin(angle);
      const ry = px * Math.sin(angle) + py * Math.cos(angle);
      return [rx + x, ry + y];
    });

    // Dessiner le pas via Graphics
    const g = this.scene.add.graphics();
    g.fillStyle(color, 0.85);
    g.beginPath();
    rotated.forEach(([px, py], i) => {
      if (i === 0) g.moveTo(px, py);
      else g.lineTo(px, py);
    });
    g.closePath();
    g.fillPath();

    // Petit halo autour
    g.fillStyle(color, 0.2);
    g.fillCircle(x, y, 9);

    g.setDepth(3); // sous le joueur mais au-dessus du sol

    this.particles.push({
      graphics: g,
      createdAt: this.scene.time.now,
      lifetime: this.lifetime,
      color,
      x,
      y,
      alpha: 0.85,
    });
  }

  // =========================
  // UPDATE — fade out progressif
  // =========================
  update() {
    const now = this.scene.time.now;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      const elapsed = now - p.createdAt;

      if (elapsed >= p.lifetime) {
        p.graphics.destroy();
        this.particles.splice(i, 1);
        continue;
      }

      // Alpha diminue progressivement
      // 0 → 10s : plein eclat
      // 10s → 20s : fade out
      const fadeStart = p.lifetime * 0.5;
      if (elapsed > fadeStart) {
        const fadeProgress = (elapsed - fadeStart) / (p.lifetime - fadeStart);
        p.graphics.setAlpha(p.alpha * (1 - fadeProgress));
      }
    }
  }

  // =========================
  // CLEANUP
  // =========================
  destroy() {
    this.particles.forEach((p) => p.graphics.destroy());
    this.particles = [];
  }
}
