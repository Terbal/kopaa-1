export default class ObservationSystem {
  constructor(scene) {
    this.scene = scene;

    this.isObservationPhase = true;

    this.observationTime = 3;

    // =========================
    // TEXTE TIMER
    // =========================
    this.timerText = this.scene.add.text(
      20,
      20,
      `MEMORISE : ${this.observationTime}`,
      {
        fontSize: "32px",
        color: "#ffffff",
        fontStyle: "bold",
        backgroundColor: "#000000",
        padding: {
          x: 12,
          y: 8,
        },
      },
    );

    this.timerText.setScrollFactor(0);

    this.timerText.setDepth(999);

    this.startTimer();
  }

  startTimer() {
    this.scene.time.addEvent({
      delay: 1000,

      repeat: 2,

      callback: () => {
        this.observationTime--;

        this.timerText.setText(`MEMORISE : ${this.observationTime}`);

        // =========================
        // FIN PHASE
        // =========================
        if (this.observationTime <= 0) {
          this.startFogPhase();
        }
      },
    });
  }

  startFogPhase() {
    // =========================
    // ACTIVE FOG
    // =========================
    this.isObservationPhase = false;

    // =========================
    // UI
    // =========================
    this.timerText.setText("GO GO GO");

    // =========================
    // ZOOM
    // =========================
    this.scene.cameras.main.zoomTo(1, 1200);

    // =========================
    // SHAKE
    // =========================
    this.scene.cameras.main.shake(400, 0.003);
  }
}
