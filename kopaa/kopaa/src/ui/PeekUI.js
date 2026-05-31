export default class PeekUI {
  constructor(scene, peekSystem) {
    this.scene = scene;
    this.peekSystem = peekSystem;

    const W = scene.scale.width;
    const H = scene.scale.height;

    // =============================================
    // BOUTON COUP D'ŒIL
    // =============================================
    this.button = scene.add
      .text(W / 2, H - 60, "👁 COUP D'ŒIL", {
        fontSize: "22px",
        color: "#ffffff",
        backgroundColor: "#1a1a2e",
        padding: { x: 20, y: 12 },
        fontStyle: "bold",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000)
      .setInteractive({ useHandCursor: true });

    this.button.on("pointerdown", () => peekSystem.triggerPeek());
    this.button.on("pointerover", () =>
      this.button.setStyle({ color: "#ffd700" }),
    );
    this.button.on("pointerout", () =>
      this.button.setStyle({ color: "#ffffff" }),
    );

    // =============================================
    // COMPTEUR RESTANT
    // =============================================
    this.counter = scene.add
      .text(W / 2, H - 25, "", {
        fontSize: "14px",
        color: "#aaaaaa",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000);

    // =============================================
    // OVERLAY pendant le peek
    // =============================================
    this.peekOverlay = scene.add
      .text(W / 2, 60, "👁 VUE GLOBALE", {
        fontSize: "20px",
        color: "#ffd700",
        backgroundColor: "#000000aa",
        padding: { x: 16, y: 8 },
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(2000)
      .setVisible(false);

    // =============================================
    // EVENTS
    // =============================================
    scene.events.on("peek-used", ({ used, max }) => {
      const remaining = max - used;
      this.updateCounter(remaining);
      this.peekOverlay.setVisible(true);
      if (remaining <= 0) {
        this.button.setStyle({ color: "#ff4444" });
        this.button.setText("👁 ÉPUISÉ");
      }
    });

    scene.events.on("peek-ended", () => {
      this.peekOverlay.setVisible(false);
    });

    this.updateCounter(peekSystem.maxPeeks);
  }

  updateCounter(remaining) {
    this.counter.setText(
      `${remaining} coup${remaining > 1 ? "s" : ""} d'œil restant${remaining > 1 ? "s" : ""}`,
    );
  }
}
