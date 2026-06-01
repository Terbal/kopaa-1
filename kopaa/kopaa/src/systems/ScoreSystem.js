export default class ScoreSystem {
  constructor() {
    this.scores = {};
    this.glanceCounts = {};
    this.usedPotion = {};
    this.startTime = null;
  }

  init(players) {
    Object.keys(players).forEach((id) => {
      this.scores[id] = 0;
      this.glanceCounts[id] = 0;
      this.usedPotion[id] = false;
    });
    this.startTime = Date.now();
  }

  getScore(id) {
    return this.scores[id] || 0;
  }

  all() {
    return { ...this.scores };
  }

  penalizeGlance(id) {
    this.glanceCounts[id] = (this.glanceCounts[id] || 0) + 1;
    this.scores[id] = Math.max(0, (this.scores[id] || 0) - 15);
    return this.scores[id];
  }

  registerPotionUse(id) {
    this.usedPotion[id] = true;
  }

  // =========================
  // SCORES FINAUX
  // =========================
  applyEndScores(playerDistances) {
    // Trier du plus proche au plus loin
    const sorted = [...playerDistances].sort((a, b) => a.dist - b.dist);
    const elapsedSec = (Date.now() - this.startTime) / 1000;

    sorted.forEach((p, rank) => {
      // Au-delà du top 3 → 0 points
      if (rank >= 3) {
        this.scores[p.id] = Math.max(0, this.scores[p.id] || 0);
        console.log(`[SCORE] ${p.id} — rang ${rank + 1} → 0 pts bonus`);
        return;
      }

      // =========================
      // BASE POINTS — top 3 seulement
      // =========================
      const basePoints = [100, 60, 40];
      const base = basePoints[rank];

      // =========================
      // BONUS — top 3 seulement
      // =========================
      let bonus = 0;
      const breakdown = [`Base: +${base}`];

      if ((this.glanceCounts[p.id] || 0) === 0) {
        bonus += 25;
        breakdown.push("Sans coup d'œil: +25");
      }

      if (!this.usedPotion[p.id]) {
        bonus += 20;
        breakdown.push("Sans potion: +20");
      }

      if (elapsedSec < 180) {
        const speedBonus = Math.round(Math.max(0, (180 - elapsedSec) / 3));
        bonus += speedBonus;
        breakdown.push(`Vitesse: +${speedBonus}`);
      }

      // =========================
      // DIVISEUR selon rang
      // 1er → diviseur 1 (tout)
      // 2ème → diviseur 2 (moitié)
      // 3ème → diviseur 3 (tiers)
      // =========================
      const divisors = [1, 2, 3];
      const divisor = divisors[rank];

      const total = Math.round((base + bonus) / divisor);
      breakdown.push(`÷${divisor} = ${total} pts`);

      this.scores[p.id] = (this.scores[p.id] || 0) + total;

      console.log(`[SCORE] ${p.id} — ${breakdown.join(" | ")}`);
    });

    return { scores: this.scores, sorted };
  }
}
