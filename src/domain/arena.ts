import type { ArenaQuestion, Difficulty, Question } from '@/types';

function shuffle<T>(items: T[], seed: number): T[] {
  const result = [...items];
  let state = seed >>> 0;
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (state * 1664525 + 1013904223) >>> 0;
    const j = state % (i + 1);
    [result[i], result[j]] = [result[j]!, result[i]!];
  }
  return result;
}

export function buildArenaQuestions(
  questions: Question[],
  options: { count?: number; subject?: string; difficulty?: Difficulty | 'semua'; seed?: number } = {},
): ArenaQuestion[] {
  const pool = questions.filter((q) => q.answer.length >= 3 && q.answer.length <= 14 &&
    (options.subject === undefined || options.subject === 'Semua' || q.subject === options.subject) &&
    (options.difficulty === undefined || options.difficulty === 'semua' || q.difficulty === options.difficulty));
  const picked = shuffle(pool, options.seed ?? 7).slice(0, options.count ?? 10);
  const answers = [...new Set(pool.map((q) => q.answer))];

  return picked.map((question, index) => {
    const similar = answers.filter((answer) => answer !== question.answer && Math.abs(answer.length - question.answer.length) <= 2);
    const distractors = shuffle(similar.length >= 3 ? similar : answers.filter((a) => a !== question.answer), options.seed ?? 7 + index)
      .filter((answer) => answer !== question.answer)
      .slice(0, 3);
    const choices = shuffle([question.answer, ...distractors], (options.seed ?? 7) + index * 31);
    return {
      id: `arena-${question.id}`,
      question,
      options: choices,
      correctIndex: choices.indexOf(question.answer),
    };
  });
}
