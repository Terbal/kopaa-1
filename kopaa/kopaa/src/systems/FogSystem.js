export default class FogSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.active = false;
    this.visionRadius = 120;
    this.time = 0;

    const W = scene.scale.width;
    const H = scene.scale.height;

    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext("2d");

    // ← Fix : supprimer l'ancienne texture si elle existe
    if (scene.textures.exists("fogCanvas")) {
      scene.textures.remove("fogCanvas");
    }

    scene.textures.addCanvas("fogCanvas", this.canvas);
    this.fogImage = scene.add.image(0, 0, "fogCanvas");
    this.fogImage.setOrigin(0, 0);
    this.fogImage.setDepth(1000);
    this.fogImage.setScrollFactor(0);
    this.fogImage.setVisible(false);
  }

  activate() {
    this.active = true;
    this.fogImage.setVisible(true);
  }

  // Bruit organique simple — somme de sinus déphasés
  _noise(x, y, t) {
    return (
      Math.sin(x * 0.015 + t * 0.0008) * 0.3 +
      Math.sin(y * 0.012 - t * 0.0006) * 0.3 +
      Math.sin((x + y) * 0.009 + t * 0.001) * 0.2 +
      Math.sin((x - y) * 0.011 - t * 0.0007) * 0.2
    );
  }

  update(isObservationPhase, delta = 16) {
    if (isObservationPhase) {
      this.fogImage.setVisible(false);
      return;
    }

    if (!this.active) this.activate();

    this.time += delta;

    const cam = this.scene.cameras.main;
    const screenX = (this.player.x - cam.scrollX) * cam.zoom;
    const screenY = (this.player.y - cam.scrollY) * cam.zoom;

    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // =========================
    // 1. Fond noir
    // =========================
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.fillRect(0, 0, W, H);

    // =========================
    // 2. Zone de vision principale
    // =========================
    ctx.globalCompositeOperation = "destination-out";

    // Rayon qui "respire" légèrement
    const breathe = Math.sin(this.time * 0.002) * 6;
    const baseRadius = this.visionRadius + breathe;

    // Bords déformés — on trace un polygone irrégulier
    const points = 64;
    ctx.beginPath();

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2;

      // Déformation organique du bord
      const noise = this._noise(
        Math.cos(angle) * 100 + screenX,
        Math.sin(angle) * 100 + screenY,
        this.time,
      );
      const r = baseRadius + noise * 28;

      const px = screenX + Math.cos(angle) * r;
      const py = screenY + Math.sin(angle) * r;

      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }

    ctx.closePath();

    // Gradient intérieur pour un fondu doux
    const gradient = ctx.createRadialGradient(
      screenX,
      screenY,
      baseRadius * 0.4,
      screenX,
      screenY,
      baseRadius * 1.15,
    );
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.fill();

    // =========================
    // 3. Particules de brouillard flottantes
    // =========================
    ctx.globalCompositeOperation = "source-over";

    const nbParticles = 18;
    for (let i = 0; i < nbParticles; i++) {
      // Position orbitale autour du joueur, dans la zone de transition
      const seed = i * 137.5; // angle d'or pour distribution uniforme
      const orbitAngle = (seed + this.time * 0.04) * (Math.PI / 180);
      const orbitDist =
        baseRadius * 0.75 + Math.sin(this.time * 0.003 + i) * 20;

      const px = screenX + Math.cos(orbitAngle) * orbitDist;
      const py = screenY + Math.sin(orbitAngle) * orbitDist;
      const pRadius = 18 + Math.sin(this.time * 0.002 + i * 0.8) * 8;

      // Opacité variable — effet de tourbillon
      const alpha = 0.06 + Math.abs(Math.sin(this.time * 0.0015 + i)) * 0.08;

      const pGrad = ctx.createRadialGradient(px, py, 0, px, py, pRadius);
      pGrad.addColorStop(0, `rgba(0, 0, 0, ${alpha})`);
      pGrad.addColorStop(1, "rgba(0, 0, 0, 0)");

      ctx.fillStyle = pGrad;
      ctx.beginPath();
      ctx.arc(px, py, pRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // =========================
    // 4. Refresh texture Phaser
    // =========================
    this.scene.textures.get("fogCanvas").refresh();
  }

  resize() {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    this.canvas.width = W;
    this.canvas.height = H;
  }
}
