import type {
  Achievement,
  AchievementContext,
  InventoryItem,
  LevelResult,
  PlayerProfile,
  PowerUp,
  PowerUpId,
} from '@/types';

export const POWER_UPS: PowerUp[] = [
  { id: 'hint', name: 'Petunjuk Ekstra', description: 'Menampilkan satu huruf petunjuk pada TTS.', price: 30, icon: '💡' },
  { id: 'extraTime', name: 'Waktu Tambahan', description: 'Menambah 15 detik pada mode bertiming.', price: 40, icon: '⏱️' },
  { id: 'doubleXp', name: 'XP Dobel', description: 'Menggandakan XP pada permainan berikutnya.', price: 80, icon: '⚡' },
];

export const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-correct', name: 'Langkah Pertama', description: 'Menjawab satu pertanyaan dengan benar.', icon: '🌟', rewardXp: 20, rewardCoins: 10, condition: (c) => c.totalCorrect >= 1 },
  { id: 'ten-correct', name: 'Pembelajar Rajin', description: 'Menjawab 10 pertanyaan dengan benar.', icon: '📚', rewardXp: 60, rewardCoins: 30, condition: (c) => c.totalCorrect >= 10 },
  { id: 'fifty-correct', name: 'Jago TTS', description: 'Menjawab 50 pertanyaan dengan benar.', icon: '🧠', rewardXp: 150, rewardCoins: 75, condition: (c) => c.totalCorrect >= 50 },
  { id: 'five-games', name: 'Pelaut Kecil', description: 'Menyelesaikan 5 permainan.', icon: '🚢', rewardXp: 70, rewardCoins: 35, condition: (c) => c.totalGames >= 5 },
  { id: 'twenty-games', name: 'Penjelajah', description: 'Menyelesaikan 20 permainan.', icon: '🧭', rewardXp: 180, rewardCoins: 90, condition: (c) => c.totalGames >= 20 },
  { id: 'first-level', name: 'Pintu Petualangan', description: 'Menyelesaikan level pertama.', icon: '🗝️', rewardXp: 50, rewardCoins: 25, condition: (c) => c.totalLevelsCleared >= 1 },
  { id: 'ten-levels', name: 'Penakluk Dunia', description: 'Menyelesaikan 10 level petualangan.', icon: '🗺️', rewardXp: 250, rewardCoins: 120, condition: (c) => c.totalLevelsCleared >= 10 },
  { id: 'grand-master', name: 'Grand Master', description: 'Menyelesaikan seluruh level petualangan.', icon: '👑', rewardXp: 600, rewardCoins: 300, condition: (c) => c.totalLevelsCleared >= 20 },
  { id: 'streak-three', name: 'Api Semangat', description: 'Bermain 3 hari berturut-turut.', icon: '🔥', rewardXp: 80, rewardCoins: 40, condition: (c) => c.maxStreak >= 3 },
  { id: 'streak-seven', name: 'Disiplin Tinggi', description: 'Bermain 7 hari berturut-turut.', icon: '🏅', rewardXp: 200, rewardCoins: 100, condition: (c) => c.maxStreak >= 7 },
  { id: 'perfect-score', name: 'Nilai Sempurna', description: 'Meraih 1000 poin atau lebih dalam satu permainan.', icon: '💎', rewardXp: 120, rewardCoins: 60, condition: (c) => c.maxScore >= 1000 },
  { id: 'battle-winner', name: 'Juara Kelas', description: 'Memenangkan satu Classroom Battle.', icon: '🏆', rewardXp: 100, rewardCoins: 50, condition: (c) => c.battleWins >= 1 },
];

export function dateKey(timestamp = Date.now()): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function consecutiveDayCount(lastDate: string | null, today = dateKey()): number {
  if (!lastDate) return 1;
  const parse = (s: string) => {
    const [y, m, d] = s.split('-').map(Number);
    return new Date(y!, m! - 1, d!).getTime();
  };
  const diff = Math.round((parse(today) - parse(lastDate)) / 86400000);
  if (diff === 0) return -1; // Sudah tercatat hari ini; streak tidak berubah.
  if (diff === 1) return 2;
  return 1;
}

export function applyStreak(profile: PlayerProfile, now = Date.now()): PlayerProfile {
  const today = dateKey(now);
  const delta = consecutiveDayCount(profile.lastPlayedDate, today);
  if (delta < 0) return profile;
  const base = profile.lastPlayedDate && dateKey(now - 86400000) === profile.lastPlayedDate ? profile.streak : 0;
  return { ...profile, streak: Math.max(1, base + delta - 1), lastPlayedDate: today };
}

export function buildAchievementContext(
  results: { correct: number; total: number; score: number; mode: string; details?: Record<string, unknown> }[],
  levelResults: LevelResult[],
  maxStreak: number,
): AchievementContext {
  return {
    totalCorrect: results.reduce((sum, r) => sum + r.correct, 0),
    totalGames: results.length,
    totalLevelsCleared: new Set(levelResults.filter((r) => r.stars > 0).map((r) => r.levelId)).size,
    maxStreak,
    maxScore: results.reduce((max, r) => Math.max(max, r.score), 0),
    battleWins: results.filter((r) => r.mode === 'battle' && r.details?.won === true).length,
  };
}

export function newlyUnlockedAchievements(context: AchievementContext, unlockedIds: string[]): Achievement[] {
  const unlocked = new Set(unlockedIds);
  return ACHIEVEMENTS.filter((a) => !unlocked.has(a.id) && a.condition(context));
}

export function isLevelUnlocked(levelId: number, levelResults: LevelResult[]): boolean {
  if (levelId <= 1) return true;
  return levelResults.some((result) => result.levelId === levelId - 1 && result.stars > 0);
}

export function buyPowerUp(profile: PlayerProfile, inventory: InventoryItem[], id: PowerUpId) {
  const item = POWER_UPS.find((p) => p.id === id);
  if (!item || profile.coins < item.price) return null;
  const existing = inventory.find((entry) => entry.id === id);
  const nextInventory: InventoryItem[] = existing
    ? inventory.map((entry) => entry.id === id ? { ...entry, qty: entry.qty + 1 } : entry)
    : [...inventory, { id, qty: 1 }];
  return {
    profile: { ...profile, coins: profile.coins - item.price },
    inventory: nextInventory,
  };
}

export function consumePowerUp(inventory: InventoryItem[], id: PowerUpId): InventoryItem[] | null {
  const existing = inventory.find((entry) => entry.id === id);
  if (!existing || existing.qty < 1) return null;
  return inventory.map((entry) => entry.id === id ? { ...entry, qty: entry.qty - 1 } : entry);
}
