import { describe, expect, it } from 'vitest';
import { calculateAnswerPoints, calculateStars, checkAnswer, levelFromXp, xpForLevel } from './scoring';

describe('checkAnswer', () => {
  it('menerima variasi huruf besar, spasi, dan tanda baca', () => {
    expect(checkAnswer(' air ', 'AIR')).toBe(true);
    expect(checkAnswer('a-i-r', 'AIR')).toBe(true);
    expect(checkAnswer('air', 'API')).toBe(false);
    expect(checkAnswer('', 'AIR')).toBe(false);
  });
});

describe('calculateAnswerPoints', () => {
  const base = { correct: true, difficulty: 'sedang' as const, durationMs: 5000, timeLimitMs: 30000, basePoints: 100 };
  it('memberi nol untuk jawaban salah', () => {
    expect(calculateAnswerPoints({ ...base, correct: false })).toBe(0);
  });
  it('memberi bonus kecepatan dan streak', () => {
    const slow = calculateAnswerPoints({ ...base, durationMs: 30000 });
    const fast = calculateAnswerPoints({ ...base, durationMs: 0 });
    const streak = calculateAnswerPoints({ ...base, durationMs: 0, streak: 4 });
    expect(fast).toBeGreaterThan(slow);
    expect(streak).toBeGreaterThan(fast);
  });
  it('memotong poin bila memakai petunjuk', () => {
    expect(calculateAnswerPoints({ ...base, usedHint: true })).toBeLessThan(calculateAnswerPoints(base));
  });
  it('menaikkan poin sesuai kesulitan', () => {
    expect(calculateAnswerPoints({ ...base, difficulty: 'sulit' })).toBeGreaterThan(calculateAnswerPoints({ ...base, difficulty: 'mudah' }));
  });
});

describe('calculateStars', () => {
  it('memberi 3 bintang hanya bila target tercapai dan semua benar', () => {
    expect(calculateStars(1200, 1000, 10, 10)).toBe(3);
    expect(calculateStars(1200, 1000, 9, 10)).toBe(2);
  });
  it('memberi 0 bintang tanpa jawaban benar', () => {
    expect(calculateStars(0, 1000, 0, 10)).toBe(0);
  });
});

describe('level progression', () => {
  it('menghitung level dari XP secara konsisten', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(xpForLevel(5))).toBe(5);
    expect(levelFromXp(xpForLevel(5) + 1)).toBe(5);
  });
});
