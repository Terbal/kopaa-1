import mazeData from "../maze/mazeData";

export default class MinimapSystem {
  constructor(scene, myId) {
    this.scene = scene;
    this.myId = myId;
    this.tileSize = 64;
    this.mapW = mazeData[0].length;
    this.mapH = mazeData.length;

    // Taille de la minimap à l'écran
    this.mmSize = 140;
    this.mmX = 16;
    this.mmY = 16;
    this.cellW = this.mmSize / this.mapW;
    this.cellH = this.mmSize / this.mapH;

    this._dots = {}; // id → graphics

    this._buildMap();
  }

  _buildMap() {
    const g = this.scene.add.graphics();

    // Fond minimap
    g.fillStyle(0x000000, 0.75);
    g.fillRect(this.mmX - 2, this.mmY - 2, this.mmSize + 4, this.mmSize + 4);
    g.lineStyle(1, 0xff8c00, 0.3);
    g.strokeRect(this.mmX - 2, this.mmY - 2, this.mmSize + 4, this.mmSize + 4);

    // Murs
    g.fillStyle(0x2a1f0a, 1);
    for (let r = 0; r < this.mapH; r++) {
      for (let c = 0; c < this.mapW; c++) {
        if (mazeData[r][c] === 1) {
          g.fillRect(
            this.mmX + c * this.cellW,
            this.mmY + r * this.cellH,
            this.cellW,
            this.cellH,
          );
        }
      }
    }

    // Coupe au centre
    g.fillStyle(0xffd700, 1);
    const cx = this.mmX + (this.mapW / 2) * this.cellW;
    const cy = this.mmY + (this.mapH / 2) * this.cellH;
    g.fillTriangle(cx, cy - 3, cx - 3, cy + 2, cx + 3, cy + 2);

    g.setScrollFactor(0).setDepth(99980);
    this._mapGraphics = g;
  }

  // Ajouter ou mettre à jour un point joueur
  updatePlayer(id, worldX, worldY, color, isMe) {
    if (!this._dots[id]) {
      const dot = this.scene.add.graphics();
      dot.setScrollFactor(0).setDepth(99981);
      this._dots[id] = dot;

      // Halo pulsant pour le joueur principal
      if (isMe) {
        this._halo = this.scene.add.graphics();
        this._halo.setScrollFactor(0).setDepth(99980);
        this._haloPulse = 0;
      }
    }

    const mmX = this.mmX + (worldX / (this.mapW * this.tileSize)) * this.mmSize;
    const mmY = this.mmY + (worldY / (this.mapH * this.tileSize)) * this.mmSize;

    const dot = this._dots[id];
    dot.clear();

    if (isMe) {
      // Moi — plus grand + bordure blanche
      dot.fillStyle(color, 1);
      dot.fillCircle(mmX, mmY, 4);
      dot.lineStyle(1, 0xffffff, 0.9);
      dot.strokeCircle(mmX, mmY, 4);

      // Halo pulsant
      if (this._halo) {
        this._halo.clear();
        const pulse = 0.3 + Math.abs(Math.sin(this._haloPulse)) * 0.4;
        this._halo.fillStyle(color, pulse);
        this._halo.fillCircle(mmX, mmY, 7);
        this._haloPulse += 0.08;
      }
    } else {
      // Adversaires — plus petits
      dot.fillStyle(color, 0.85);
      dot.fillCircle(mmX, mmY, 2.5);
    }
  }

  removePlayer(id) {
    if (this._dots[id]) {
      this._dots[id].destroy();
      delete this._dots[id];
    }
  }

  setVisible(visible) {
    this._mapGraphics?.setVisible(visible);
    this._halo?.setVisible(visible);
    Object.values(this._dots).forEach((d) => d.setVisible(visible));
  }

  destroy() {
    this._mapGraphics?.destroy();
    this._halo?.destroy();
    Object.values(this._dots).forEach((d) => d.destroy());
    this._dots = {};
  }
}
