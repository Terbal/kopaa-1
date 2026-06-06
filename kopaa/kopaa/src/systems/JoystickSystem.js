import { IS_MOBILE } from "../main";

export default class JoystickSystem {
  constructor(scene) {
    this.scene = scene;
    this.isActive = IS_MOBILE;

    // Vecteur de direction
    this.dx = 0;
    this.dy = 0;

    // État joystick
    this._pointerId = null;
    this._baseX = 0;
    this._baseY = 0;
    this._stickX = 0;
    this._stickY = 0;
    this._radius = 60;
    this._knobRadius = 28;

    if (!this.isActive) return;

    this._createUI();
    this._bindEvents();
  }

  _createUI() {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;

    // Position joystick — bas gauche
    this._joyX = 100;
    this._joyY = H - 120;

    // Base (cercle extérieur)
    this.base = this.scene.add.graphics();
    this._drawBase(false);
    this.base.setScrollFactor(0).setDepth(99990);

    // Knob (cercle intérieur mobile)
    this.knob = this.scene.add.graphics();
    this._drawKnob(this._joyX, this._joyY);
    this.knob.setScrollFactor(0).setDepth(99991);
  }

  _drawBase(active) {
    this.base.clear();
    this.base.lineStyle(2, 0xff8c00, active ? 0.6 : 0.3);
    this.base.strokeCircle(this._joyX, this._joyY, this._radius);
    this.base.fillStyle(0x000000, 0.3);
    this.base.fillCircle(this._joyX, this._joyY, this._radius);
  }

  _drawKnob(x, y) {
    this.knob.clear();
    this.knob.fillStyle(0xff8c00, 0.7);
    this.knob.fillCircle(x, y, this._knobRadius);
    // Croix directionnelle
    this.knob.fillStyle(0xffffff, 0.4);
    this.knob.fillRect(x - 10, y - 2, 20, 4);
    this.knob.fillRect(x - 2, y - 10, 4, 20);
  }

  _bindEvents() {
    const scene = this.scene;

    scene.input.on("pointerdown", (pointer) => {
      // Joystick uniquement si touch dans la zone gauche
      if (pointer.x < scene.scale.width / 2 && this._pointerId === null) {
        this._pointerId = pointer.id;
        this._baseX = pointer.x;
        this._baseY = pointer.y;
        this._joyX = pointer.x;
        this._joyY = pointer.y;
        this._drawBase(true);
        this._drawKnob(pointer.x, pointer.y);
      }
    });

    scene.input.on("pointermove", (pointer) => {
      if (pointer.id !== this._pointerId) return;

      const dx = pointer.x - this._baseX;
      const dy = pointer.y - this._baseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const clamped = Math.min(dist, this._radius);
      const angle = Math.atan2(dy, dx);

      const knobX = this._baseX + Math.cos(angle) * clamped;
      const knobY = this._baseY + Math.sin(angle) * clamped;

      this.dx = Math.cos(angle) * (clamped / this._radius);
      this.dy = Math.sin(angle) * (clamped / this._radius);

      this._drawBase(true);
      this._drawKnob(knobX, knobY);
    });

    scene.input.on("pointerup", (pointer) => {
      if (pointer.id !== this._pointerId) return;
      this._pointerId = null;
      this.dx = 0;
      this.dy = 0;

      // Reset position joystick
      this._joyX = 100;
      this._joyY = scene.scale.height - 120;
      this._drawBase(false);
      this._drawKnob(this._joyX, this._joyY);
    });
  }

  // Appelé depuis Player.move()
  getDirection() {
    return { dx: this.dx, dy: this.dy };
  }

  setVisible(visible) {
    if (!this.isActive) return;
    this.base?.setVisible(visible);
    this.knob?.setVisible(visible);
    this.glanceBtn?.setVisible(visible);
    this.glanceBtnText?.setVisible(visible);
  }

  destroy() {
    this.base?.destroy();
    this.knob?.destroy();
    this.glanceBtn?.destroy();
    this.glanceBtnText?.destroy();
  }
}
