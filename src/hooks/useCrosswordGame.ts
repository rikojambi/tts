import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CrosswordPuzzle, Difficulty } from '@/types';
import { calculateAnswerPoints } from '@/domain/scoring';
import type { CellPosition } from '@/components/CrosswordGrid';

export interface CrosswordCompletion {
  correctWords: number;
  totalWords: number;
  elapsedMs: number;
  hintsUsed: number;
  points: number;
}

interface Options {
  difficulty?: Difficulty;
  pointsPerWord?: number;
  timeLimitMs?: number;
  onComplete?: (result: CrosswordCompletion) => void;
  onWordSolved?: (wordId: string, points: number) => void;
}

const key = (row: number, col: number) => `${row},${col}`;

export function useCrosswordGame(puzzle: CrosswordPuzzle, options: Options = {}) {
  const { difficulty = 'sedang', pointsPerWord = 100, timeLimitMs = 120000, onComplete, onWordSolved } = options;
  const [entries, setEntries] = useState<Record<string, string>>({});
  const [selected, setSelected] = useState<CellPosition | null>(null);
  const [solved, setSolved] = useState<string[]>([]);
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const [hintsUsed, setHintsUsed] = useState(0);
  const [elapsedMs, setElapsedMs] = useState(0);
  const [points, setPoints] = useState(0);
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);
  const startedAt = useRef(Date.now());
  const solvedRef = useRef<string[]>([]);
  const completedRef = useRef(false);
  const pointsRef = useRef(0);
  const streakRef = useRef(0);
  const hintsRef = useRef(0);
  const optionsRef = useRef({ difficulty, pointsPerWord, timeLimitMs, onComplete, onWordSolved });
  optionsRef.current = { difficulty, pointsPerWord, timeLimitMs, onComplete, onWordSolved };

  const reset = useCallback(() => {
    setEntries({});
    setSelected(null);
    setSolved([]);
    solvedRef.current = [];
    setFeedback(null);
    setHintsUsed(0);
    hintsRef.current = 0;
    setPoints(0);
    pointsRef.current = 0;
    setStreak(0);
    streakRef.current = 0;
    setFinished(false);
    completedRef.current = false;
    setElapsedMs(0);
    startedAt.current = Date.now();
  }, [puzzle.id]);

  useEffect(() => { reset(); }, [reset]);

  useEffect(() => {
    if (finished) return;
    const timer = window.setInterval(() => setElapsedMs(Date.now() - startedAt.current), 1000);
    return () => window.clearInterval(timer);
  }, [finished]);

  const wordCells = useCallback((wordId: string) => {
    const word = puzzle.words.find((w) => w.id === wordId);
    if (!word) return [];
    return Array.from({ length: word.answer.length }, (_, i) => ({
      row: word.direction === 'across' ? word.row : word.row + i,
      col: word.direction === 'across' ? word.col + i : word.col,
    }));
  }, [puzzle.words]);

  const evaluateWord = useCallback((wordId: string) => {
    const word = puzzle.words.find((w) => w.id === wordId);
    if (!word || solvedRef.current.includes(wordId)) return;
    const cells = wordCells(wordId);
    const typed = cells.map(({ row, col }) => entries[key(row, col)] ?? '').join('');
    if (typed.length !== word.answer.length) return;
    if (typed !== word.answer) {
      setFeedback('wrong');
      streakRef.current = 0;
      setStreak(0);
      return;
    }
    const gained = calculateAnswerPoints({
      correct: true,
      difficulty: optionsRef.current.difficulty,
      durationMs: Date.now() - startedAt.current,
      timeLimitMs: optionsRef.current.timeLimitMs,
      basePoints: optionsRef.current.pointsPerWord,
      streak: streakRef.current,
    });
    const nextPoints = pointsRef.current + gained;
    pointsRef.current = nextPoints;
    streakRef.current += 1;
    solvedRef.current = [...solvedRef.current, wordId];
    setSolved(solvedRef.current);
    setPoints(nextPoints);
    setStreak(streakRef.current);
    setFeedback('correct');
    optionsRef.current.onWordSolved?.(wordId, gained);
    if (solvedRef.current.length === puzzle.words.length && !completedRef.current) {
      completedRef.current = true;
      setFinished(true);
      optionsRef.current.onComplete?.({
        correctWords: solvedRef.current.length,
        totalWords: puzzle.words.length,
        elapsedMs: Date.now() - startedAt.current,
        hintsUsed: hintsRef.current,
        points: nextPoints,
      });
    }
  }, [entries, puzzle.words.length, wordCells]);

  const changeCell = useCallback((row: number, col: number, value: string) => {
    if (finished) return;
    const letter = value.toUpperCase().replace(/[^A-Z]/g, '').slice(-1);
    setEntries((current) => {
      const next = { ...current };
      const k = key(row, col);
      if (letter) next[k] = letter;
      else delete next[k];
      return next;
    });
    setFeedback(null);
  }, [finished]);

  const checkSelection = useCallback(() => {
    if (!selected) return;
    const candidates = puzzle.words.filter((word) => {
      const cells = wordCells(word.id);
      return cells.some((cell) => cell.row === selected.row && cell.col === selected.col);
    });
    candidates.forEach((word) => {
      const cells = wordCells(word.id);
      const typed = cells.map(({ row, col }) => entries[key(row, col)] ?? '').join('');
      if (typed === word.answer) evaluateWord(word.id);
      else if (typed.length === word.answer.length) {
        setFeedback('wrong');
        streakRef.current = 0;
        setStreak(0);
      }
    });
  }, [entries, evaluateWord, puzzle.words, selected, wordCells]);

  const useHint = useCallback(() => {
    const word = puzzle.words.find((w) => !solvedRef.current.includes(w.id));
    if (!word) return false;
    const cell = wordCells(word.id).find(({ row, col }) => !entries[key(row, col)]);
    if (!cell) return false;
    setEntries((current) => ({ ...current, [key(cell.row, cell.col)]: word.answer[wordCells(word.id).indexOf(cell)]! }));
    hintsRef.current += 1;
    setHintsUsed(hintsRef.current);
    return true;
  }, [entries, puzzle.words, wordCells]);

  const solvedCells = useMemo(() => {
    const set = new Set<string>();
    solved.forEach((id) => wordCells(id).forEach((cell) => set.add(key(cell.row, cell.col))));
    return set;
  }, [solved, wordCells]);

  return {
    entries, selected, setSelected, solved, solvedCells, feedback, hintsUsed,
    elapsedMs, points, streak, finished, changeCell, checkSelection, useHint, reset,
  };
}
