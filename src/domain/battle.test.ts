import { describe, expect, it } from 'vitest';
import { createBattleState, getTurn, leaderboard, skipBattleTurn, submitBattleAnswer } from './battle';
import type { BattleConfig } from '@/types';

const config: BattleConfig = {
  groups: [
    { id: 'g1', name: 'Merah', color: '#f00', score: 0, members: [{ id: 'a1', name: 'Ana' }, { id: 'a2', name: 'Budi' }] },
    { id: 'g2', name: 'Biru', color: '#00f', score: 0, members: [{ id: 'b1', name: 'Sari' }] },
  ],
  questionIds: ['q1', 'q2'],
  secondsPerTurn: 30,
  pointsPerCorrect: 100,
  skipPenalty: 10,
  passesEnabled: true,
};

describe('Classroom Battle engine', () => {
  it('memulai pada kelompok dan anggota pertama', () => {
    const state = createBattleState(config);
    const turn = getTurn(state);
    expect(turn?.group.id).toBe('g1');
    expect(turn?.member.name).toBe('Ana');
    expect(turn?.questionId).toBe('q1');
  });

  it('berpindah kelompok setelah satu soal dijawab dan mencatat poin', () => {
    let state = createBattleState(config);
    state = submitBattleAnswer(state, {
      playerId: 'a1', playerName: 'Ana', groupId: 'g1', questionId: 'q1',
      answer: 'BUKU', correct: true, durationMs: 1000, points: 120,
    });
    expect(getTurn(state)?.group.id).toBe('g2');
    expect(state.events).toHaveLength(1);
    const board = leaderboard(state);
    expect(board[0]?.score).toBe(120);
    expect(board[0]?.members[0]?.correct).toBe(1);
  });

  it('menolak jawaban di luar giliran', () => {
    const state = createBattleState(config);
    const rejected = submitBattleAnswer(state, {
      playerId: 'b1', playerName: 'Sari', groupId: 'g2', questionId: 'q1',
      answer: 'BUKU', correct: true, durationMs: 0, points: 100,
    });
    expect(rejected).toBe(state);
  });

  it('mengganti anggota dalam kelompok saat kelompok itu giliran lagi', () => {
    let state = createBattleState(config);
    state = skipBattleTurn(state); // g1 (Ana)
    state = skipBattleTurn(state); // g2 (Sari)
    expect(getTurn(state)?.group.id).toBe('g1');
    expect(getTurn(state)?.member.name).toBe('Budi');
    expect(state.events).toHaveLength(2);
    expect(state.events.every((event) => event.points === -10)).toBe(true);
  });

  it('menyelesaikan permainan setelah seluruh soal terlewati', () => {
    let state = createBattleState(config);
    for (let i = 0; i < 4; i += 1) state = skipBattleTurn(state);
    expect(state.finished).toBe(true);
    expect(getTurn(state)).toBeNull();
  });
});
