export default class CollisionSystem {
  constructor(scene) {
    this.scene = scene;
  }

  // =========================
  // COLLISION JOUEUR ↔ MURS
  // =========================
  playerVsWalls(player, walls) {
    this.scene.physics.add.collider(player, walls);
  }

  // =========================
  // OVERLAP JOUEUR ↔ COUPE
  // =========================
  playerVsTrophy(player, trophy, callback) {
    this.scene.physics.add.overlap(player, trophy, callback);
  }
}
