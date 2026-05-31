export default class LeaderboardUI {
  constructor(scene) {
    this.scene = scene;
    this.rows = {};

    const W = scene.scale.width;

    this.bg = scene.add
      .rectangle(W - 10, 10, 220, 200, 0x000000, 0.75)
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(9990)
      .setVisible(false);

    this.title = scene.add
      .text(W - 20, 18, "CLASSEMENT", {
        fontSize: "14px",
        color: "#888888",
        letterSpacing: 3,
      })
      .setOrigin(1, 0)
      .setScrollFactor(0)
      .setDepth(9991)
      .setVisible(false);
  }

  init(players, myId, trophyX, trophyY) {
    this.myId = myId;
    this.trophyX = trophyX;
    this.trophyY = trophyY;

    const W = this.scene.scale.width;
    const startY = 50;
    const rowH = 52;
    const nbPlayers = Object.keys(players).length;

    this.bg.height = 40 + nbPlayers * rowH;
    this.bg.setVisible(true);
    this.title.setVisible(true);

    Object.values(players).forEach((p, i) => {
      const y = startY + i * rowH;
      const isMe = p.id === myId;
      const hexColor =
        "#" + (p.color || 0xffffff).toString(16).padStart(6, "0");

      const dot = this.scene.add
        .circle(W - 210, y + 8, 7, p.color || 0xffffff)
        .setScrollFactor(0)
        .setDepth(9992);

      const nameText = this.scene.add
        .text(W - 195, y, p.pseudo || "Joueur", {
          fontSize: "16px",
          color: isMe ? "#ffffff" : "#aaaaaa",
          fontStyle: isMe ? "bold" : "normal",
        })
        .setScrollFactor(0)
        .setDepth(9992);

      const distText = this.scene.add
        .text(W - 195, y + 20, "dist: --", {
          fontSize: "12px",
          color: hexColor,
        })
        .setScrollFactor(0)
        .setDepth(9992);

      const scoreText = this.scene.add
        .text(W - 25, y, "0 pts", {
          fontSize: "15px",
          color: "#ffd700",
          fontStyle: "bold",
        })
        .setOrigin(1, 0)
        .setScrollFactor(0)
        .setDepth(9992);

      this.rows[p.id] = { nameText, distText, scoreText, dot, score: 0 };
    });
  }

  update(id, x, y, score) {
    if (!this.rows[id]) return;

    const dist = Math.round(
      Phaser.Math.Distance.Between(x, y, this.trophyX, this.trophyY),
    );

    this.rows[id].distText.setText(`dist: ${dist}`);
    this.rows[id].score = score;
    this.rows[id].scoreText.setText(`${score} pts`);
  }

  sort() {
    const W = this.scene.scale.width;
    const startY = 50;
    const rowH = 52;

    const sorted = Object.entries(this.rows).sort(
      (a, b) => b[1].score - a[1].score,
    );

    sorted.forEach(([id, row], i) => {
      const y = startY + i * rowH;
      row.nameText.setY(y);
      row.distText.setY(y + 20);
      row.scoreText.setY(y);
      row.dot.setY(y + 8);
    });
  }

  setVisible(visible) {
    this.bg.setVisible(visible);
    this.title.setVisible(visible);
    Object.values(this.rows).forEach((r) => {
      r.nameText.setVisible(visible);
      r.distText.setVisible(visible);
      r.scoreText.setVisible(visible);
      r.dot.setVisible(visible);
    });
  }
}
