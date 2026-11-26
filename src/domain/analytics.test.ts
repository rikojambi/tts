import { describe, expect, it } from 'vitest';
import { answerAccuracy, competenceStats, hardestQuestions, memberContribution } from './analytics';
import type { AnswerEvent } from '@/types';

const event = (overrides: Partial<AnswerEvent>): AnswerEvent => ({
  id: Math.random().toString(), timestamp: 1, playerId: 'p1', playerName: 'Ana',
  groupId: 'g1', questionId: 'q1', answer: 'AIR', correct: true, durationMs: 1000, points: 100,
  ...overrides,
});

describe('learning analytics', () => {
  const events = [
    event({}),
    event({ id: '2', questionId: 'q2', correct: false, answer: 'SALAH', durationMs: 5000, points: 0 }),
    event({ id: '3', playerId: 'p2', playerName: 'Budi', groupId: 'g2', questionId: 'q3', durationMs: 2000 }),
  ];

  it('menghitung persentase benar/salah dan rata-rata waktu', () => {
    const stats = answerAccuracy(events);
    expect(stats.correct).toBe(2);
    expect(stats.wrong).toBe(1);
    expect(stats.correctPercent).toBeCloseTo(66.67, 1);
    expect(stats.averageMs).toBeCloseTo(2666.67, 0);
  });

  it('mengurutkan kompetensi, soal sulit, dan kontribusi anggota', () => {
    const competence = competenceStats(events, (e) => e.questionId);
    expect(competence[0]?.key).toBe('q1');
    const hardest = hardestQuestions(events, [
      { id: 'q1', prompt: 'Satu' }, { id: 'q2', prompt: 'Dua' }, { id: 'q3', prompt: 'Tiga' },
    ]);
    expect(hardest[0]?.id).toBe('q2');
    const members = memberContribution(events);
    expect(members[0]?.name).toBe('Ana');
  });
});
