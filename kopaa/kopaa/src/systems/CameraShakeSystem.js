export default class CameraShakeSystem {
  constructor(scene) {
    this.scene = scene;
    this.cam = scene.cameras.main;
  }

  shake(intensity = 0.005, duration = 200) {
    this.cam.shake(duration, intensity);
  }

  shakeByDistance(distance) {
    if (distance < 150) {
      this.shake(0.05, 300);
    } else if (distance < 350) {
      this.shake(0.03, 200);
    } else if (distance < 600) {
      this.shake(0.015, 150);
    }
  }

  shakeOnStart() {
    this.shake(0.04, 500);
  }

  shakeOnWallHit() {
    this.shake(0.02, 100);
  }

  shakeOnWin() {
    this.shake(0.08, 600);
  }
}
