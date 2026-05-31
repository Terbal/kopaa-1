export default class ScoreSystem {
  constructor() {
    this.scores = {}; // id → score
  }

  init(players) {
    Object.keys(players).forEach((id) => {
      this.scores[id] = 0;
    });
  }

  getScore(id) {
    return this.scores[id] || 0;
  }

  // Pénalité coup d'œil
  penalizeGlance(id) {
    this.scores[id] = Math.max(0, (this.scores[id] || 0) - 15);
    return this.scores[id];
  }

  // Attribuer les scores de fin
  applyEndScores(winnerId, allIds) {
    const points = [100, 60, 40, 20];
    const ordered = [winnerId, ...allIds.filter((id) => id !== winnerId)];
    ordered.forEach((id, i) => {
      this.scores[id] = (this.scores[id] || 0) + (points[i] || 10);
    });
    return this.scores;
  }

  all() {
    return this.scores;
  }
}
