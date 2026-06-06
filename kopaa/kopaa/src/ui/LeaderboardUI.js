export default class LeaderboardUI {
  constructor(scene) {
    this.scene = scene;
    this.rows = {};
    this.trophyX = 0;
    this.trophyY = 0;
    this.maxDist = 1;
    this.myId = null;
    this._myDist = null;
    this._allObjects = []; // pour cleanup au rematch
    this.rowH = 42;
    this.gaugeW = 150;
  }

  // =========================
  // CLEANUP (rematch)
  // =========================
  destroy() {
    this._allObjects.forEach((obj) => {
      if (obj && obj.destroy) obj.destroy();
    });
    this._allObjects = [];
    this.rows = {};
    this._myDist = null;
  }

  _track(obj) {
    this._allObjects.push(obj);
    return obj;
  }

  // =========================
  // INIT
  // =========================
  init(players, myId, trophyX, trophyY) {
    this._myDist = null;
    this.myId = myId;
    this.trophyX = trophyX;
    this.trophyY = trophyY;

    // Distance max = diagonale du labyrinthe
    const mazeW = 35 * 64;
    const mazeH = 35 * 64;
    this.maxDist = Math.sqrt(mazeW * mazeW + mazeH * mazeH);

    const W = this.scene.scale.width;
    const opponents = Object.values(players).filter((p) => p.id !== myId);
    const panelH = 28 + opponents.length * this.rowH;

    // Fond panel adversaires
    this._track(
      this.scene.add
        .rectangle(W - 15, 55, 195, panelH, 0x000000, 0.72)
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(9989)
        .setVisible(false),
    );

    this._track(
      this.scene.add
        .text(W - 20, 60, "ADVERSAIRES", {
          fontSize: "10px",
          color: "#333355",
          letterSpacing: 3,
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(9990)
        .setVisible(false),
    );

    opponents.forEach((p, i) => this._createRow(p, i));

    // Mon rang — sous le panel
    const rankY = 65 + panelH + 8;

    this.rankBg = this._track(
      this.scene.add
        .rectangle(W - 15, rankY, 195, 30, 0x000000, 0.72)
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(9989)
        .setVisible(false),
    );

    this.rankText = this._track(
      this.scene.add
        .text(W - 20, rankY + 6, "MON RANG  --", {
          fontSize: "13px",
          color: "#ffd700",
          fontStyle: "bold",
          stroke: "#000000",
          strokeThickness: 2,
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(9992)
        .setVisible(false),
    );
  }

  // =========================
  // CRÉER UNE LIGNE
  // =========================
  _createRow(p, index) {
    const W = this.scene.scale.width;
    const color = p.color || 0xffffff;
    const hex = "#" + color.toString(16).padStart(6, "0");
    const baseX = W - 185;
    const baseY = 80 + index * this.rowH;

    const nameText = this._track(
      this.scene.add
        .text(baseX, baseY, p.pseudo || "?", {
          fontSize: "11px",
          color: hex,
          fontStyle: "bold",
        })
        .setOrigin(0, 0)
        .setScrollFactor(0)
        .setDepth(9992)
        .setVisible(false),
    );

    const trend = this._track(
      this.scene.add
        .text(baseX + this.gaugeW, baseY, "—", {
          fontSize: "10px",
          color: "#444466",
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(9992)
        .setVisible(false),
    );

    // Fond jauge
    const gaugeBg = this._track(
      this.scene.add
        .rectangle(baseX, baseY + 16, this.gaugeW, 7, 0x0d0d1f)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(9991)
        .setVisible(false),
    );

    // Fill jauge — on utilise scaleX au lieu de width
    const gaugeFill = this._track(
      this.scene.add
        .rectangle(baseX, baseY + 16, this.gaugeW, 7, color)
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(9992)
        .setAlpha(0.85)
        .setVisible(false)
        .setScale(0, 1),
    );

    // Dot
    const dot = this._track(
      this.scene.add
        .circle(baseX, baseY + 16, 6, color)
        .setScrollFactor(0)
        .setDepth(9994)
        .setVisible(false),
    );

    // Halo
    const halo = this._track(
      this.scene.add
        .circle(baseX, baseY + 16, 11, color, 0.15)
        .setScrollFactor(0)
        .setDepth(9993)
        .setVisible(false),
    );

    // Coupe au bout
    const cup = this._track(
      this.scene.add
        .text(baseX + this.gaugeW + 8, baseY + 16, "🏆", {
          fontSize: "11px",
        })
        .setOrigin(0, 0.5)
        .setScrollFactor(0)
        .setDepth(9992)
        .setVisible(false),
    );

    this.rows[p.id] = {
      nameText,
      trend,
      gaugeBg,
      gaugeFill,
      dot,
      halo,
      cup,
      progress: 0,
      dist: null,
      lastDist: null,
      score: 0,
      color,
      baseX,
      baseY,
      _pulsing: false,
    };
  }

  // =========================
  // UPDATE (appelé chaque frame)
  // =========================
  update(id, x, y, score) {
    // Mon joueur — juste stocker la distance, pas de jauge
    if (id === this.myId) {
      this._myDist = Phaser.Math.Distance.Between(
        x,
        y,
        this.trophyX,
        this.trophyY,
      );
      this._refreshRank();
      return;
    }

    const row = this.rows[id];
    if (!row) return;

    const dist = Phaser.Math.Distance.Between(x, y, this.trophyX, this.trophyY);
    const progress = Math.min(1, Math.max(0, 1 - dist / this.maxDist));

    row.dist = dist;
    row.progress = progress;
    row.score = score;

    // =========================
    // JAUGE via scaleX (fiable)
    // =========================
    this.scene.tweens.add({
      targets: row.gaugeFill,
      scaleX: progress,
      duration: 200,
      ease: "Sine.easeOut",
      overwrite: true,
    });

    // Dot qui suit le bout de la jauge
    const dotTargetX = row.baseX + this.gaugeW * progress;
    this.scene.tweens.add({
      targets: [row.dot, row.halo],
      x: dotTargetX,
      duration: 200,
      ease: "Sine.easeOut",
      overwrite: true,
    });

    // =========================
    // TENDANCE
    // =========================
    if (row.lastDist !== null) {
      const delta = row.lastDist - dist;
      if (delta > 3) {
        row.trend.setText("▲").setColor("#00ff88");
      } else if (delta < -3) {
        row.trend.setText("▼").setColor("#ff4444");
      } else {
        row.trend.setText("—").setColor("#333355");
      }
    }
    row.lastDist = dist;

    // =========================
    // PULSE si proche
    // =========================
    if (progress > 0.78 && !row._pulsing) {
      row._pulsing = true;
      this.scene.tweens.add({
        targets: row.halo,
        alpha: 0.55,
        scaleX: 2.2,
        scaleY: 2.2,
        duration: 450,
        yoyo: true,
        repeat: -1,
        ease: "Sine.easeInOut",
      });
    } else if (progress <= 0.78 && row._pulsing) {
      row._pulsing = false;
      this.scene.tweens.killTweensOf(row.halo);
      row.halo.setAlpha(0.15).setScale(1);
    }

    // Re-calculer le rang après update adversaire
    this._refreshRank();
  }

  // =========================
  // RANG (basé sur distance)
  // =========================
  _refreshRank() {
    if (!this.rankText || this._myDist === null) return;

    const closerCount = Object.values(this.rows).filter(
      (r) => r.dist !== null && r.dist < this._myDist,
    ).length;

    const rank = closerCount + 1;
    const total = Object.keys(this.rows).length + 1;
    const medals = ["🥇", "🥈", "🥉"];
    const medal = medals[rank - 1] || `${rank}e`;

    this.rankText.setText(`MON RANG  ${medal} ${rank}/${total}`);
  }

  // =========================
  // TRI DYNAMIQUE (appelé depuis GameScene)
  // =========================
  sort() {
    const sorted = Object.entries(this.rows).sort(
      (a, b) => b[1].progress - a[1].progress,
    );

    sorted.forEach(([id, row], i) => {
      const targetY = 80 + i * this.rowH;
      if (row._currentIndex === i) return; // pas bougé
      row._currentIndex = i;

      this.scene.tweens.add({
        targets: row.nameText,
        y: targetY,
        duration: 280,
        ease: "Back.easeOut",
        overwrite: true,
      });
      this.scene.tweens.add({
        targets: row.trend,
        y: targetY,
        duration: 280,
        ease: "Back.easeOut",
        overwrite: true,
      });
      this.scene.tweens.add({
        targets: [row.gaugeBg, row.gaugeFill, row.dot, row.halo],
        y: targetY + 16,
        duration: 280,
        ease: "Back.easeOut",
        overwrite: true,
      });
      this.scene.tweens.add({
        targets: row.cup,
        y: targetY + 16,
        duration: 280,
        ease: "Back.easeOut",
        overwrite: true,
      });
    });
  }

  // =========================
  // VISIBILITÉ
  // =========================
  setVisible(visible) {
    this._allObjects.forEach((obj) => {
      if (obj && obj.setVisible) obj.setVisible(visible);
    });
  }
}
