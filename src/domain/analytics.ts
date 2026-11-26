import type { AnswerEvent, GameRecord } from '@/types';

export interface CompetenceStat {
  key: string;
  correct: number;
  total: number;
  accuracy: number;
  avgMs: number;
}

function stat(key: string, events: AnswerEvent[]): CompetenceStat {
  const rows = events.filter((event) => event.answer !== '' || event.correct);
  const correct = rows.filter((event) => event.correct).length;
  return {
    key,
    correct,
    total: rows.length,
    accuracy: rows.length ? correct / rows.length : 0,
    avgMs: rows.length ? Math.round(rows.reduce((sum, e) => sum + e.durationMs, 0) / rows.length) : 0,
  };
}

export function answerAccuracy(events: AnswerEvent[]) {
  const answered = events.filter((event) => event.answer !== '' || event.correct);
  const correct = answered.filter((event) => event.correct).length;
  return {
    correct,
    wrong: answered.length - correct,
    total: answered.length,
    correctPercent: answered.length ? (correct / answered.length) * 100 : 0,
    wrongPercent: answered.length ? ((answered.length - correct) / answered.length) * 100 : 0,
    averageMs: answered.length ? Math.round(answered.reduce((sum, e) => sum + e.durationMs, 0) / answered.length) : 0,
  };
}

export function competenceStats(events: AnswerEvent[], keyOf: (event: AnswerEvent) => string): CompetenceStat[] {
  const keys = [...new Set(events.map(keyOf))];
  return keys.map((key) => stat(key, events.filter((event) => keyOf(event) === key))).sort((a, b) => b.accuracy - a.accuracy);
}

export function hardestQuestions(events: AnswerEvent[], questions: { id: string; prompt: string }[]) {
  return questions
    .map((question) => ({ ...stat(question.prompt, events.filter((e) => e.questionId === question.id)), id: question.id, prompt: question.prompt }))
    .filter((row) => row.total > 0)
    .sort((a, b) => a.accuracy - b.accuracy || b.total - a.total);
}

export function memberContribution(events: AnswerEvent[]) {
  const ids = [...new Set(events.map((e) => e.playerId))];
  return ids
    .map((id) => {
      const rows = events.filter((event) => event.playerId === id);
      return {
        id,
        name: rows[0]?.playerName ?? id,
        ...stat(id, rows),
        points: rows.reduce((sum, event) => sum + event.points, 0),
      };
    })
    .sort((a, b) => b.points - a.points);
}

export function groupComparison(events: AnswerEvent[], groups: { id: string; name: string }[]) {
  return groups
    .map((group) => {
      const rows = events.filter((event) => event.groupId === group.id);
      return {
        id: group.id,
        name: group.name,
        ...stat(group.id, rows),
        points: rows.reduce((sum, event) => sum + event.points, 0),
      };
    })
    .sort((a, b) => b.points - a.points);
}

export function recordSummary(records: GameRecord[]) {
  const correct = records.reduce((sum, r) => sum + r.correct, 0);
  const total = records.reduce((sum, r) => sum + r.total, 0);
  return {
    games: records.length,
    correct,
    total,
    accuracy: total ? (correct / total) * 100 : 0,
    score: records.reduce((sum, r) => sum + r.score, 0),
    averageMs: records.length ? Math.round(records.reduce((sum, r) => sum + r.durationMs, 0) / records.length) : 0,
  };
}
