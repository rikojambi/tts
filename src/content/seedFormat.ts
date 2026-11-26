import type { Difficulty, Question } from '@/types';
import type { SavedLevel } from '@/data/db';

/** [pertanyaan, jawaban (A-Z tanpa spasi), petunjuk, pembahasan] */
export type QuestionSeed = [string, string, string, string];

export interface LevelSeed {
  id: number;
  title: string;
  subject: string;
  topic: string;
  difficulty: Difficulty;
  targetScore: number;
  xp: number;
  coins: number;
  questions: QuestionSeed[];
}

export function materializeLevel(seed: LevelSeed): SavedLevel {
  const grade = seed.id <= 4 ? 'X' : seed.id <= 8 ? 'XI' : 'XII';
  const questions: Question[] = seed.questions.map(([prompt, answer, hint, explanation], index) => ({
    id: `lv${seed.id}-q${index + 1}`,
    subject: seed.subject,
    grade,
    topic: seed.topic,
    difficulty: seed.difficulty,
    prompt,
    answer: answer.toUpperCase().replace(/[^A-Z]/g, ''),
    hint,
    explanation,
  }));
  return { ...seed, questions, seedVersion: 1 };
}
