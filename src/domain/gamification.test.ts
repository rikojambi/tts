import { describe, expect, it } from 'vitest';
import {
  applyStreak, buyPowerUp, consumePowerUp, dateKey, isLevelUnlocked,
  newlyUnlockedAchievements,
} from './gamification';
import type { LevelResult, PlayerProfile } from '@/types';

const profile: PlayerProfile = {
  id: 'main', name: 'Uji', avatar: '🧭', xp: 0, coins: 100, streak: 0,
  lastPlayedDate: null, createdAt: 0,
};

describe('gamification', () => {
  it('membuka level bertahap berdasarkan bintang level sebelumnya', () => {
    expect(isLevelUnlocked(1, [])).toBe(true);
    expect(isLevelUnlocked(2, [])).toBe(false);
    const results: LevelResult[] = [{
      levelId: 1, stars: 2, score: 900, correct: 10, total: 10, durationMs: 1000, playedAt: 1,
    }];
    expect(isLevelUnlocked(2, results)).toBe(true);
    expect(isLevelUnlocked(3, results)).toBe(false);
  });

  it('tidak menambah streak dua kali dalam satu hari', () => {
    const today = dateKey();
    const dayBefore = dateKey(Date.now() - 86400000);
    const first = applyStreak(profile);
    expect(first.streak).toBe(1);
    expect(applyStreak(first).streak).toBe(1);
    const nextDay = applyStreak({ ...first, lastPlayedDate: dayBefore });
    expect(nextDay.streak).toBe(2);
    expect(today).toBe(dateKey());
  });

  it('membuka achievement hanya sekali', () => {
    const context = {
      totalCorrect: 10, totalGames: 1, totalLevelsCleared: 0,
      maxStreak: 0, maxScore: 100, battleWins: 0,
    };
    const unlocked = newlyUnlockedAchievements(context, []);
    expect(unlocked.map((a) => a.id)).toContain('first-correct');
    expect(unlocked.map((a) => a.id)).toContain('ten-correct');
    expect(newlyUnlockedAchievements(context, unlocked.map((a) => a.id))).toHaveLength(0);
  });

  it('membeli dan memakai power-up dengan koin', () => {
    const purchase = buyPowerUp(profile, [], 'hint');
    expect(purchase?.profile.coins).toBe(70);
    expect(purchase?.inventory[0]?.qty).toBe(1);
    expect(buyPowerUp({ ...profile, coins: 10 }, [], 'hint')).toBeNull();
    const used = consumePowerUp(purchase!.inventory, 'hint');
    expect(used?.[0]?.qty).toBe(0);
    expect(consumePowerUp(used!, 'hint')).toBeNull();
  });
});
