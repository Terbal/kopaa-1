export default class FogSystem {
  constructor(scene, player) {
    this.scene = scene;
    this.player = player;
    this.active = false;
    this.visionRadius = 120;

    const W = scene.scale.width;
    const H = scene.scale.height;

    // =============================================
    // Canvas 2D natif — fonctionne Canvas ET WebGL
    // =============================================
    this.canvas = document.createElement("canvas");
    this.canvas.width = W;
    this.canvas.height = H;
    this.ctx = this.canvas.getContext("2d");

    // Texture Phaser créée depuis notre canvas natif
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

  update(isObservationPhase) {
    if (isObservationPhase) {
      this.fogImage.setVisible(false);
      return;
    }

    if (!this.active) this.activate();

    const cam = this.scene.cameras.main;

    // Coordonnées écran du joueur
    const screenX = (this.player.x - cam.scrollX) * cam.zoom;
    const screenY = (this.player.y - cam.scrollY) * cam.zoom;

    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;

    // 1. Remplir tout en noir opaque
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.fillRect(0, 0, W, H);

    // 2. Creuser le trou avec destination-out
    ctx.globalCompositeOperation = "destination-out";
    const gradient = ctx.createRadialGradient(
      screenX, screenY, this.visionRadius * 0.5,  // cercle intérieur net
      screenX, screenY, this.visionRadius           // bord avec léger fondu
    );
    gradient.addColorStop(0, "rgba(0,0,0,1)");
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(screenX, screenY, this.visionRadius, 0, Math.PI * 2);
    ctx.fill();

    // 3. Remettre le mode normal
    ctx.globalCompositeOperation = "source-over";

    // 4. Signaler à Phaser que la texture a changé
    this.scene.textures.get("fogCanvas").refresh();
  }

  resize() {
    const W = this.scene.scale.width;
    const H = this.scene.scale.height;
    this.canvas.width = W;
    this.canvas.height = H;
  }
}