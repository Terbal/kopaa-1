export default class ObservationSystem {
  constructor(scene) {
    this.scene = scene;
    this.isObservationPhase = true;
    this.observationTime = 5;

    const W = scene.scale.width;
    const H = scene.scale.height;

    // =========================
    // CENTRER LA CAMÉRA SUR LA MAP
    // =========================
    const tileSize = 64;
    const mapW = 35 * tileSize; // 2240
    const mapH = 35 * tileSize;

    // Zoom pour voir toute la map
    const zoomX = W / mapW;
    const zoomY = H / mapH;
    const zoom = Math.min(zoomX, zoomY) * 0.95;

    scene.cameras.main.setZoom(zoom);
    scene.cameras.main.centerOn(mapW / 2, mapH / 2);
    scene.cameras.main.stopFollow();

    // =========================
    // OVERLAY PHASE
    // =========================
    this.overlay = scene.add
      .rectangle(W / 2, 60, 320, 52, 0x000000, 0.8)
      .setScrollFactor(0)
      .setDepth(9998)
      .setOrigin(0.5);

    this.phaseLabel = scene.add
      .text(W / 2, 42, "PHASE 1 — MÉMORISE", {
        fontSize: "11px",
        color: "#ff8c00",
        letterSpacing: 4,
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9999);

    this.timerText = scene.add
      .text(W / 2, 62, "", {
        fontSize: "22px",
        color: "#ffffff",
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9999);

    this.subLabel = scene.add
      .text(W / 2, 88, "Mémorise le chemin vers la coupe", {
        fontSize: "12px",
        color: "#554433",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(9999);

    this._updateTimer();
    this.startTimer();
  }

  _updateTimer() {
    const sec = this.observationTime;
    this.timerText.setText(
      `⏱  ${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`,
    );
  }

  startTimer() {
    this.scene.time.addEvent({
      delay: 1000,
      repeat: this.observationTime - 1,
      callback: () => {
        this.observationTime--;
        this._updateTimer();
        if (this.observationTime <= 0) {
          this.startFogPhase();
        }
      },
    });
  }

  startFogPhase() {
    this.isObservationPhase = false;

    // Changer le texte
    this.phaseLabel.setText("PHASE 2 — LE BROUILLARD");
    this.timerText.setText("GO !");
    this.subLabel.setText("Fie-toi à ta mémoire !");

    // Faire disparaître l'overlay après 1.5s
    this.scene.time.delayedCall(1500, () => {
      this.scene.tweens.add({
        targets: [this.overlay, this.phaseLabel, this.timerText, this.subLabel],
        alpha: 0,
        duration: 500,
        onComplete: () => {
          this.overlay.destroy();
          this.phaseLabel.destroy();
          this.timerText.destroy();
          this.subLabel.destroy();
        },
      });
    });

    // Zoom sur le joueur
    this.scene.cameras.main.startFollow(this.scene.player);
    this.scene.cameras.main.zoomTo(1, 1200, "Sine.easeInOut");
    this.scene.cameras.main.shake(400, 0.003);
  }
}
