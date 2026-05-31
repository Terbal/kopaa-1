export default class PeekSystem {
  constructor(scene, fogSystem) {
    this.scene = scene;
    this.fogSystem = fogSystem;

    this.maxPeeks = 3;
    this.peekDuration = 2000;
    this.peeksUsed = 0;
    this.isPeeking = false;
    this.peekTimer = null;
    this.endTimer = null;

    this.normalZoom = 0.25;
    this.peekZoom = 0.18;

    this.spaceKey = scene.input.keyboard.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );
  }

  update(isObservationPhase) {
    if (isObservationPhase) return;
    if (Phaser.Input.Keyboard.JustDown(this.spaceKey)) {
      this.triggerPeek();
    }
  }

  triggerPeek() {
    if (this.isPeeking) return;
    if (this.peeksUsed >= this.maxPeeks) {
      this.showNopeEffect();
      return;
    }

    this.peeksUsed++;
    this.isPeeking = true;

    // Cacher le fog
    this.fogSystem.isPaused = true;
    this.fogSystem.fogImage.setVisible(false);

    // Zoom out direct
    this.scene.cameras.main.setZoom(this.peekZoom);

    this.scene.events.emit("peek-used", {
      used: this.peeksUsed,
      max: this.maxPeeks,
    });

    this.peekTimer = this.scene.time.delayedCall(this.peekDuration, () =>
      this.endPeek(),
    );
  }

  endPeek() {
    if (this.endTimer) return;
    this.isPeeking = false;

    // Zoom in direct
    this.scene.cameras.main.setZoom(this.normalZoom);

    this.endTimer = this.scene.time.delayedCall(150, () => {
      this.fogSystem.isPaused = false;
      this.fogSystem.fogImage.setVisible(true);
      this.endTimer = null;
      this.scene.events.emit("peek-ended");
    });
  }

  showNopeEffect() {
    this.scene.cameras.main.flash(300, 255, 0, 0, false);
  }

  getPeeksRemaining() {
    return this.maxPeeks - this.peeksUsed;
  }

  reset() {
    this.peeksUsed = 0;
    this.isPeeking = false;
    this.fogSystem.isPaused = false;
    this.endTimer = null;
    if (this.peekTimer) this.peekTimer.remove();
  }
}
