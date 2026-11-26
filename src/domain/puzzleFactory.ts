import { generateCrossword } from './crossword';
import type { CrosswordPuzzle, Difficulty, Question } from '@/types';

export function puzzleFromQuestions(
  questions: Question[],
  options: {
    title: string;
    subject?: string;
    topic?: string;
    difficulty?: Difficulty;
    count?: number;
    seed?: number;
    attempts?: number;
  },
): CrosswordPuzzle {
  const selected = questions
    .filter((q) => q.answer.length >= 3 && q.answer.length <= 14)
    .slice(0, options.count ?? questions.length);
  return generateCrossword(
    selected.map((q) => ({ id: q.id, answer: q.answer, clue: q.prompt })),
    {
      title: options.title,
      subject: options.subject,
      topic: options.topic,
      difficulty: options.difficulty,
      seed: options.seed ?? Date.now() % 100000,
      attempts: options.attempts ?? 16,
    },
  );
}
