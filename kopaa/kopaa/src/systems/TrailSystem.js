export default class TrailSystem {
  constructor(scene) {
    this.scene = scene;
    this.trailDuration = 5000; // 5 secondes
    this.trailInterval = 100;
    this.dotRadius = 8;
    this.points = [];
  }

  addPoint(x, y, color = "#ffffff") {
    this.points.push({ x, y, time: this.scene.time.now, color });
  }

  update() {
    const now = this.scene.time.now;
    this.points = this.points.filter((p) => now - p.time < this.trailDuration);
  }

  draw(ctx, cam, playerScreenX, playerScreenY, visionRadius) {
    const now = this.scene.time.now;

    for (const point of this.points) {
      const age = now - point.time;
      const lifeRatio = 1 - age / this.trailDuration;

      const sx = (point.x - cam.scrollX) * cam.zoom;
      const sy = (point.y - cam.scrollY) * cam.zoom;

      const dist = Math.sqrt(
        Math.pow(sx - playerScreenX, 2) + Math.pow(sy - playerScreenY, 2),
      );

      if (dist > visionRadius) continue;

      const alpha = lifeRatio * 0.9;
      if (alpha <= 0.01) continue;

      const r = Math.max(this.dotRadius * cam.zoom, 3);

      ctx.globalCompositeOperation = "source-over";

      const glow = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * 2.5);
      glow.addColorStop(0, this.hexToRgba(point.color, alpha));
      glow.addColorStop(0.4, this.hexToRgba(point.color, alpha * 0.6));
      glow.addColorStop(1, this.hexToRgba(point.color, 0));

      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(sx, sy, r * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  hexToRgba(hex, alpha) {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `rgba(${r},${g},${b},${alpha})`;
  }

  reset() {
    this.points = [];
  }
}
