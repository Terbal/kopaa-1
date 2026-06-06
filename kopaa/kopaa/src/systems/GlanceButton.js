import { IS_MOBILE } from "../main";

export default class GlanceButton {
  constructor(scene, glanceSystem) {
    this.scene = scene;
    this.glanceSystem = glanceSystem;
    this.isActive = IS_MOBILE;

    if (!this.isActive) return;

    this._createUI();
  }

  _createUI() {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    // Position — bas droite
    const btnX = W - 90;
    const btnY = H - 120;
    const btnR = 45;

    // Fond bouton
    this.bg = this.scene.add.graphics();
    this._drawBtn(false);
    this.bg.setScrollFactor(0).setDepth(99990);

    // Icône œil
    this.label = this.scene.add
      .text(btnX, btnY, "👁", {
        fontSize: "28px",
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(99991);

    // Texte "COUP D'ŒIL"
    this.sublabel = this.scene.add
      .text(btnX, btnY + 32, "COUP D'ŒIL", {
        fontSize: "9px",
        color: "#ff8c00",
        letterSpacing: 1,
      })
      .setOrigin(0.5)
      .setScrollFactor(0)
      .setDepth(99991);

    this._btnX = btnX;
    this._btnY = btnY;
    this._btnR = btnR;

    // Touch detection
    this.scene.input.on("pointerdown", (pointer) => {
      // Bouton uniquement si touch dans la zone droite
      if (pointer.x > this.scene.scale.width / 2) {
        const dist = Math.sqrt(
          (pointer.x - this._btnX) ** 2 + (pointer.y - this._btnY) ** 2,
        );
        if (dist < this._btnR) {
          this.glanceSystem.trigger();
          this._drawBtn(true);
          this.scene.time.delayedCall(200, () => this._drawBtn(false));
        }
      }
    });
  }

  _drawBtn(pressed) {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    const btnX = W - 90;
    const btnY = H - 120;

    this.bg.clear();
    this.bg.fillStyle(0x000000, pressed ? 0.7 : 0.4);
    this.bg.fillCircle(btnX, btnY, 45);
    this.bg.lineStyle(2, 0xff8c00, pressed ? 1 : 0.5);
    this.bg.strokeCircle(btnX, btnY, 45);

    // Mettre à jour la position si resize
    this._btnX = btnX;
    this._btnY = btnY;
  }

  setVisible(visible) {
    if (!this.isActive) return;
    this.bg?.setVisible(visible);
    this.label?.setVisible(visible);
    this.sublabel?.setVisible(visible);
  }

  destroy() {
    this.bg?.destroy();
    this.label?.destroy();
    this.sublabel?.destroy();
  }
}
