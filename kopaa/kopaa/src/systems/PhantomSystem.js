export default class PhantomSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.isPhantom = false;
    this.duration = 60000; // 60 secondes

    // Timer UI affiché sur le joueur
    this.timerLabel = scene.add
      .text(0, 0, "", {
        fontSize: "18px",
        color: "#00ffcc",
        stroke: "#000000",
        strokeThickness: 3,
        fontStyle: "bold",
      })
      .setDepth(9999)
      .setVisible(false);
  }

  activate(onExpire) {
    if (this.isPhantom) return;
    this.isPhantom = true;

    // Visuel joueur semi-transparent
    this.player.setAlpha(0.4);
    this.player.setTint(0x00ffcc);

    // Countdown affiché
    this.remainingMs = this.duration;
    this.timerLabel.setVisible(true);
    this.onExpire = onExpire;
  }

  update(delta) {
    if (!this.isPhantom) return;

    this.remainingMs -= delta;

    // Position du label au-dessus du joueur
    const cam = this.scene.cameras.main;
    const screenX = (this.player.x - cam.scrollX) * cam.zoom;
    const screenY = (this.player.y - cam.scrollY) * cam.zoom - 50;
    this.timerLabel.setPosition(screenX - 20, screenY);
    this.timerLabel.setText(`👻 ${Math.ceil(this.remainingMs / 1000)}s`);

    if (this.remainingMs <= 0) {
      this.deactivate();
    }
  }

  deactivate() {
    this.isPhantom = false;
    this.player.clearTint();
    this.player.setAlpha(1);
    this.timerLabel.setVisible(false);

    if (this.onExpire) this.onExpire();
  }
}
