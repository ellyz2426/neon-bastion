// Neon Bastion - Combo & Scoring System

export interface ComboState {
  multiplier: number;
  killStreak: number;
  lastKillTime: number;
  comboTimeout: number;
  maxCombo: number;
  totalBonusCredits: number;
}

export function createComboState(): ComboState {
  return {
    multiplier: 1,
    killStreak: 0,
    lastKillTime: 0,
    comboTimeout: 3, // seconds between kills to maintain combo
    maxCombo: 1,
    totalBonusCredits: 0,
  };
}

export function registerKill(combo: ComboState, time: number, baseReward: number): {
  bonusCredits: number;
  scoreMultiplier: number;
  comboText: string | null;
} {
  const elapsed = time - combo.lastKillTime;
  combo.lastKillTime = time;

  if (elapsed < combo.comboTimeout && combo.killStreak > 0) {
    // Continue combo
    combo.killStreak++;
    combo.multiplier = 1 + Math.floor(combo.killStreak / 3) * 0.5;
    combo.multiplier = Math.min(combo.multiplier, 5);
  } else {
    // Reset combo
    combo.killStreak = 1;
    combo.multiplier = 1;
  }

  if (combo.multiplier > combo.maxCombo) {
    combo.maxCombo = combo.multiplier;
  }

  const bonusCredits = Math.floor(baseReward * (combo.multiplier - 1));
  combo.totalBonusCredits += bonusCredits;

  let comboText: string | null = null;
  if (combo.killStreak >= 3 && combo.killStreak % 3 === 0) {
    const labels = [
      "", "", "", "TRIPLE KILL!",
      "", "", "RAMPAGE!",
      "", "", "UNSTOPPABLE!",
      "", "", "GODLIKE!",
    ];
    comboText = labels[combo.killStreak] || `${combo.killStreak}x COMBO!`;
    if (!comboText) comboText = `${combo.killStreak}x STREAK!`;
  }

  return { bonusCredits, scoreMultiplier: combo.multiplier, comboText };
}

export function updateCombo(combo: ComboState, time: number) {
  if (combo.killStreak > 0 && time - combo.lastKillTime > combo.comboTimeout) {
    combo.killStreak = 0;
    combo.multiplier = 1;
  }
}
