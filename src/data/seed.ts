import { db } from './db';
import { generateCrossword } from '@/domain/crossword';
import { materializeLevel } from '@/content/seedFormat';
import { levels1to10 } from '@/content/levels1to10';
import { levels11to20 } from '@/content/levels11to20';
import { getSettings, setSetting } from './storage';
import type { Subject } from '@/types';

export const SEED_VERSION = 1;

const SUBJECTS: Subject[] = [
  { id: 'umum', name: 'Pengetahuan Umum', color: '#f97316' },
  { id: 'indonesia', name: 'Bahasa Indonesia', color: '#ef4444' },
  { id: 'inggris', name: 'Bahasa Inggris', color: '#3b82f6' },
  { id: 'matematika', name: 'Matematika', color: '#8b5cf6' },
  { id: 'sains', name: 'Sains', color: '#14b8a6' },
  { id: 'sejarah', name: 'Sejarah', color: '#eab308' },
  { id: 'geografi', name: 'Geografi', color: '#22c55e' },
  { id: 'teknologi', name: 'Teknologi', color: '#06b6d4' },
  { id: 'ekonomi', name: 'Ekonomi', color: '#f59e0b' },
  { id: 'literasi', name: 'Literasi Digital', color: '#ec4899' },
];

/** Mengisi konten bawaan sekali saja. Aman dijalankan berulang kali. */
export async function ensureSeeded(): Promise<void> {
  const settings = await getSettings();
  if (settings.seedVersion === SEED_VERSION && (await db.levels.count()) === 20) return;

  const seeds = [...levels1to10, ...levels11to20].sort((a, b) => a.id - b.id);
  const levels = seeds.map(materializeLevel);
  const questions = levels.flatMap((level) => level.questions);
  const puzzles = levels.map((level) => {
    const puzzle = generateCrossword(
      level.questions.map((question) => ({
        id: question.id,
        answer: question.answer,
        clue: question.prompt,
      })),
      {
        title: `Level ${level.id}: ${level.title}`,
        subject: level.subject,
        topic: level.topic,
        difficulty: level.difficulty,
        attempts: 10,
        seed: 9000 + level.id,
      },
    );
    return { ...puzzle, id: `level-${level.id}`, createdAt: Date.now(), custom: false };
  });

  await db.transaction('rw', db.levels, db.questions, db.puzzles, db.subjects, db.settings, async () => {
    await db.levels.bulkPut(levels);
    await db.questions.bulkPut(questions);
    await db.puzzles.bulkPut(puzzles);
    await db.subjects.bulkPut(SUBJECTS);
  });
  await setSetting('seedVersion', SEED_VERSION);
}
