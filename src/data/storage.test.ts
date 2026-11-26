import { beforeAll, describe, expect, it } from 'vitest';
import { ensureSeeded } from './seed';
import {
  addRecord, exportBackup, getProfile, importBackup, listLevels, listPuzzles,
  listQuestions, listRecords, saveQuestion, syncQueueSize,
} from './storage';
import { validatePuzzle } from '@/domain/crossword';
import type { Question } from '@/types';

describe('persistensi lokal dan seed data', () => {
  beforeAll(async () => {
    await ensureSeeded();
  });

  it('mengisi 20 level dan 200 soal', async () => {
    expect(await listLevels()).toHaveLength(20);
    expect(await listQuestions()).toHaveLength(200);
  });

  it('setiap level memiliki TTS valid', async () => {
    const puzzles = await listPuzzles();
    expect(puzzles).toHaveLength(20);
    for (const puzzle of puzzles) {
      expect(validatePuzzle(puzzle).valid).toBe(true);
      expect(puzzle.words.length).toBeGreaterThanOrEqual(8);
    }
  });

  it('profil dibuat otomatis dan diperbarui', async () => {
    const profile = await getProfile();
    expect(profile.id).toBe('main');
    expect(profile.name).toBe('Petualang');
  });

  it('soal baru tersimpan dan menambah antrean sinkronisasi', async () => {
    const before = await syncQueueSize();
    const question: Question = {
      id: 'test-custom', subject: 'Umum', grade: 'X', topic: 'Uji', difficulty: 'mudah',
      prompt: 'Hewan yang dikenal sebagai kuda nil? ', answer: 'KUDANIL', hint: 'Hewan besar', explanation: 'Kuda nil adalah mamalia air.',
    };
    await saveQuestion(question);
    const stored = (await listQuestions()).find((q) => q.id === question.id);
    expect(stored?.answer).toBe('KUDANIL');
    expect(await syncQueueSize()).toBeGreaterThanOrEqual(before + 1);
  });

  it('backup dan pulihkan data tanpa duplikasi', async () => {
    await addRecord({
      id: 'record-test', mode: 'quick', subject: 'Umum', score: 100,
      correct: 4, total: 5, durationMs: 1000, playedAt: Date.now(),
    });
    const backup = await exportBackup();
    expect(backup.levels).toHaveLength(20);
    expect(backup.questions.length).toBeGreaterThanOrEqual(200);
    await importBackup(backup);
    const records = await listRecords();
    expect(records.filter((r) => r.id === 'record-test')).toHaveLength(1);
  });
});
