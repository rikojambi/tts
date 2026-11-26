import { normalizeAnswer } from './crossword';
import type { Difficulty } from '@/types';

export function checkAnswer(input: string, answer: string): boolean {
  const a = normalizeAnswer(input);
  const b = normalizeAnswer(answer);
  return a.length > 0 && a === b;
}

export interface PointInput {
  correct: boolean;
  difficulty: Difficulty;
  durationMs: number;
  timeLimitMs: number;
  basePoints: number;
  usedHint?: boolean;
  streak?: number;
}

const difficultyFactor: Record<Difficulty, number> = { mudah: 1, sedang: 1.25, sulit: 1.6 };

/** Skor = pokok + bonus kecepatan + bonus streak, dipotong bila memakai petunjuk. */
export function calculateAnswerPoints(input: PointInput): number {
  if (!input.correct) return 0;
  const base = Math.round(input.basePoints * difficultyFactor[input.difficulty]);
  const timeRatio = Math.max(0, Math.min(1, 1 - input.durationMs / Math.max(1, input.timeLimitMs)));
  const speedBonus = Math.round(base * 0.5 * timeRatio);
  const streakBonus = Math.round(base * Math.min(0.5, Math.max(0, (input.streak ?? 0) * 0.1)));
  const raw = base + speedBonus + streakBonus;
  return Math.max(1, Math.round(raw * (input.usedHint ? 0.7 : 1)));
}

export function calculateStars(score: number, targetScore: number, correct: number, total: number): number {
  if (total === 0 || correct === 0) return 0;
  if (score >= targetScore && correct === total) return 3;
  if (score >= targetScore * 0.7 || correct / total >= 0.8) return 2;
  return 1;
}

/** XP yang dibutuhkan untuk mencapai level tertentu (level 1 dimulai dari 0 XP). */
export function xpForLevel(level: number): number {
  return Math.round(50 * (level - 1) * level / 2);
}

export function levelFromXp(xp: number): number {
  let level = 1;
  while (xpForLevel(level + 1) <= xp && level < 999) level += 1;
  return level;
}

export function levelProgress(xp: number): { level: number; current: number; needed: number; ratio: number } {
  const level = levelFromXp(xp);
  const current = xp - xpForLevel(level);
  const needed = xpForLevel(level + 1) - xpForLevel(level);
  return { level, current, needed, ratio: needed > 0 ? current / needed : 0 };
}
