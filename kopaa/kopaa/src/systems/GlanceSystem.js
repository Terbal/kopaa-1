export default class GlanceSystem {
  constructor(scene, fogSystem) {
    this.scene = scene;
    this.fogSystem = fogSystem;

    this.cooldown = 30000; // 30 secondes
    this.duration = 1000; // 1 seconde de vision
    this.isActive = false;
    this.remainingCooldown = 0;
    this.usageCount = 0; // pour le scoring plus tard

    // =========================
    // UI — icône + barre cooldown
    // =========================
    const x = 20;
    const y = scene.scale.height - 70;

    this.labelText = scene.add
      .text(x, y, "👁 COUP D'ŒIL", {
        fontSize: "18px",
        color: "#ffffff",
        stroke: "#000000",
        strokeThickness: 3,
      })
      .setScrollFactor(0)
      .setDepth(9999);

    // Fond de la barre
    this.barBg = scene.add
      .rectangle(x, y + 28, 160, 12, 0x333333)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(9999);

    // Barre de recharge
    this.bar = scene.add
      .rectangle(x, y + 28, 160, 12, 0x00ffcc)
      .setOrigin(0, 0)
      .setScrollFactor(0)
      .setDepth(10000);

    // Texte PRÊT / cooldown
    this.statusText = scene.add
      .text(x + 165, y + 28, "PRÊT", {
        fontSize: "14px",
        color: "#00ffcc",
        stroke: "#000000",
        strokeThickness: 2,
      })
      .setScrollFactor(0)
      .setDepth(10000);

    // =========================
    // INPUTS
    // =========================
    scene.input.keyboard.on("keydown-SPACE", () => this.trigger());
    scene.input.on("pointerdown", () => this.trigger());
  }

  trigger() {
    if (this.isActive || this.remainingCooldown > 0) return;

    this.isActive = true;
    this.usageCount++;

    // Désactiver le fog 1 seconde
    this.fogSystem.fogImage.setVisible(false);

    // Flash UI
    this.bar.setFillStyle(0xffffff);
    this.statusText.setText("👁").setColor("#ffffff");

    // Effet flash écran
    this.scene.cameras.main.flash(200, 255, 255, 255, false);

    // Remettre le fog après 1 sec + lancer cooldown
    this.scene.time.delayedCall(this.duration, () => {
      this.fogSystem.fogImage.setVisible(true);
      this.isActive = false;
      this.remainingCooldown = this.cooldown;
      this.bar.setFillStyle(0x00ffcc);
    });

    // Notifier score (-15 pts) — branché plus tard
    this.scene.events.emit("glanceUsed");
  }

  update(delta) {
    if (this.remainingCooldown > 0) {
      this.remainingCooldown -= delta;
      if (this.remainingCooldown < 0) this.remainingCooldown = 0;

      // Barre de progression
      const ratio = 1 - this.remainingCooldown / this.cooldown;
      this.bar.width = 160 * ratio;

      // Texte countdown
      const sec = Math.ceil(this.remainingCooldown / 1000);
      this.statusText.setText(`${sec}s`).setColor("#888888");
    } else if (!this.isActive) {
      this.bar.width = 160;
      this.statusText.setText("PRÊT").setColor("#00ffcc");
    }
  }

  // Cacher l'UI en phase d'observation
  setVisible(visible) {
    this.labelText.setVisible(visible);
    this.barBg.setVisible(visible);
    this.bar.setVisible(visible);
    this.statusText.setVisible(visible);
  }
}
