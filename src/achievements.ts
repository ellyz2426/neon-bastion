// Neon Bastion - Achievement System

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  condition: (stats: GameStats) => boolean;
  unlocked: boolean;
}

export interface GameStats {
  totalKills: number;
  totalWaves: number;
  totalCreditsEarned: number;
  maxCombo: number;
  towersBuilt: number;
  towersSold: number;
  upgadesMade: number;
  bossesKilled: number;
  perfectWaves: number; // waves with no core damage
  gamesPlayed: number;
  gamesWon: number;
  highScore: number;
  highestWave: number;
  totalPlayTime: number;
}

export function createGameStats(): GameStats {
  return {
    totalKills: 0,
    totalWaves: 0,
    totalCreditsEarned: 0,
    maxCombo: 0,
    towersBuilt: 0,
    towersSold: 0,
    upgadesMade: 0,
    bossesKilled: 0,
    perfectWaves: 0,
    gamesPlayed: 0,
    gamesWon: 0,
    highScore: 0,
    highestWave: 0,
    totalPlayTime: 0,
  };
}

export function createAchievements(): Achievement[] {
  return [
    {
      id: "first_blood",
      name: "First Blood",
      description: "Destroy your first enemy",
      icon: "🎯",
      condition: (s) => s.totalKills >= 1,
      unlocked: false,
    },
    {
      id: "centurion",
      name: "Centurion",
      description: "Destroy 100 enemies total",
      icon: "💯",
      condition: (s) => s.totalKills >= 100,
      unlocked: false,
    },
    {
      id: "mass_destruction",
      name: "Mass Destruction",
      description: "Destroy 500 enemies total",
      icon: "💀",
      condition: (s) => s.totalKills >= 500,
      unlocked: false,
    },
    {
      id: "boss_slayer",
      name: "Boss Slayer",
      description: "Defeat a boss",
      icon: "👑",
      condition: (s) => s.bossesKilled >= 1,
      unlocked: false,
    },
    {
      id: "combo_master",
      name: "Combo Master",
      description: "Reach a 3x combo multiplier",
      icon: "⚡",
      condition: (s) => s.maxCombo >= 3,
      unlocked: false,
    },
    {
      id: "architect",
      name: "Architect",
      description: "Build 20 towers in one game",
      icon: "🏗️",
      condition: (s) => s.towersBuilt >= 20,
      unlocked: false,
    },
    {
      id: "perfect_wave",
      name: "Untouchable",
      description: "Complete a wave without core damage",
      icon: "🛡️",
      condition: (s) => s.perfectWaves >= 1,
      unlocked: false,
    },
    {
      id: "survivor",
      name: "Survivor",
      description: "Reach wave 20",
      icon: "🏆",
      condition: (s) => s.highestWave >= 20,
      unlocked: false,
    },
    {
      id: "champion",
      name: "Champion",
      description: "Win on Normal difficulty",
      icon: "🎖️",
      condition: (s) => s.gamesWon >= 1,
      unlocked: false,
    },
    {
      id: "rich",
      name: "Tycoon",
      description: "Earn 5000 credits in one game",
      icon: "💰",
      condition: (s) => s.totalCreditsEarned >= 5000,
      unlocked: false,
    },
  ];
}

export function checkAchievements(
  achievements: Achievement[],
  stats: GameStats
): Achievement[] {
  const newlyUnlocked: Achievement[] = [];
  achievements.forEach((a) => {
    if (!a.unlocked && a.condition(stats)) {
      a.unlocked = true;
      newlyUnlocked.push(a);
    }
  });
  return newlyUnlocked;
}

// Save/load from localStorage
export function saveStats(stats: GameStats) {
  try {
    localStorage.setItem("nb_stats", JSON.stringify(stats));
  } catch {}
}

export function loadStats(): GameStats {
  try {
    const data = localStorage.getItem("nb_stats");
    if (data) return { ...createGameStats(), ...JSON.parse(data) };
  } catch {}
  return createGameStats();
}

export function saveAchievements(achievements: Achievement[]) {
  try {
    const unlocked = achievements.filter((a) => a.unlocked).map((a) => a.id);
    localStorage.setItem("nb_achievements", JSON.stringify(unlocked));
  } catch {}
}

export function loadAchievementState(achievements: Achievement[]) {
  try {
    const data = localStorage.getItem("nb_achievements");
    if (data) {
      const unlocked: string[] = JSON.parse(data);
      achievements.forEach((a) => {
        if (unlocked.includes(a.id)) a.unlocked = true;
      });
    }
  } catch {}
}
