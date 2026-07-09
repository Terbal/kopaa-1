import Phaser from "phaser";

export default class Player extends Phaser.Physics.Arcade.Sprite {
  constructor(scene, x, y, color = 0xffffff) {
    super(scene, x, y, "player_front");

    scene.add.existing(this);
    scene.physics.add.existing(this);

    this.speed = 220;
    this.color = color;
    this.setCollideWorldBounds(true);
    this.setDisplaySize(48, 48);

    console.log("[Player] width:", this.width, "height:", this.height);

    // =============================================
    // true en 3ème paramètre = centrage automatique
    // Les valeurs sont en pixels de texture native
    // On prend 80% de la taille native pour la hitbox
    // =============================================
    this.body.setSize(220, 270, true);
    this.body.debugShowBody = true;
    this.body.debugBodyColor = 0xff0000;

    this.setDepth(10);
    this.setTint(color);

    this._dir = "front";
    this._vx = 0;
    this._vy = 0;

    this._ghosts = [];
    this._ghostCount = 5;
    this._ghostTimer = 0;

    for (let i = 0; i < this._ghostCount; i++) {
      const ghost = scene.add
        .image(x, y, "player_front")
        .setDisplaySize(48, 48)
        .setTint(color)
        .setAlpha(0)
        .setDepth(9 - i);
      this._ghosts.push({ img: ghost, x, y, key: "player_front" });
    }

    this._particles = scene.add.particles(0, 0, "player_front", {
      scale: { start: 0.05, end: 0 },
      alpha: { start: 0.3, end: 0 },
      lifespan: 180,
      frequency: 40,
      tint: color,
      blendMode: "ADD",
      emitting: false,
    });
    this._particles.setDepth(8);
  }

  move(cursors, joystick = null) {
    this._vx = 0;
    this._vy = 0;

    if (joystick?.isActive) {
      const { dx, dy } = joystick.getDirection();
      if (Math.abs(dx) > 0.1 || Math.abs(dy) > 0.1) {
        this._vx = dx * this.speed;
        this._vy = dy * this.speed;
      }
    }

    if (!this._vx && !this._vy) {
      if (cursors.left.isDown) {
        this._vx = -this.speed;
      } else if (cursors.right.isDown) {
        this._vx = this.speed;
      } else if (cursors.up.isDown) {
        this._vy = -this.speed;
      } else if (cursors.down.isDown) {
        this._vy = this.speed;
      }
    }

    this.setVelocity(this._vx, this._vy);

    const moving = Math.abs(this._vx) > 10 || Math.abs(this._vy) > 10;

    if (moving) {
      let newDir = this._dir;
      if (Math.abs(this._vx) > Math.abs(this._vy)) {
        newDir = this._vx > 0 ? "right" : "left";
      } else {
        newDir = this._vy > 0 ? "front" : "back";
      }
      if (newDir !== this._dir) {
        this._dir = newDir;
        this.setTexture(`player_${newDir}`);
        // Réappliquer après changement de texture
        this.body.setSize(220, 270, true);
      }
    }

    this._particles.emitting = moving;
    if (moving) {
      this._particles.setPosition(this.x, this.y);
    }
  }

  updateGhosts(delta) {
    this._ghostTimer += delta;
    const moving = Math.abs(this._vx) > 10 || Math.abs(this._vy) > 10;

    if (!moving) {
      this._ghosts.forEach((g) => {
        g.img.setAlpha(Math.max(0, g.img.alpha - 0.05));
      });
      return;
    }

    if (this._ghostTimer > 30) {
      this._ghostTimer = 0;
      for (let i = this._ghosts.length - 1; i > 0; i--) {
        this._ghosts[i].x = this._ghosts[i - 1].x;
        this._ghosts[i].y = this._ghosts[i - 1].y;
        this._ghosts[i].key = this._ghosts[i - 1].key;
      }
      this._ghosts[0].x = this.x;
      this._ghosts[0].y = this.y;
      this._ghosts[0].key = `player_${this._dir}`;
    }

    this._ghosts.forEach((g, i) => {
      const size = 48 * (1 - i * 0.04);
      const alpha = (1 - i / this._ghosts.length) * 0.35;
      g.img.setPosition(g.x, g.y);
      g.img.setTexture(g.key);
      g.img.setAlpha(alpha);
      g.img.setDisplaySize(size, size);
    });
  }

  destroy() {
    this._ghosts.forEach((g) => g.img.destroy());
    this._particles.destroy();
    super.destroy();
  }
}
