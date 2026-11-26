import type {
  CrosswordPuzzle,
  Direction,
  GenerationOptions,
  PlacedWord,
  WordInput,
} from '@/types';

const key = (row: number, col: number) => `${row},${col}`;
const parseKey = (k: string): [number, number] => {
  const [r, c] = k.split(',');
  return [Number(r), Number(c)];
};

/** Menyeragamkan jawaban menjadi huruf A-Z saja. */
export function normalizeAnswer(value: string): string {
  return value
    .normalize('NFKD')
    .toUpperCase()
    .replace(/[^A-Z]/g, '');
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface Occupant {
  id: string;
  direction: Direction;
}

interface DraftPlacement {
  word: WordInput;
  row: number;
  col: number;
  direction: Direction;
}

interface DraftState {
  cells: Map<string, string>;
  occupants: Map<string, Occupant>;
  placements: DraftPlacement[];
}

function checkPlacement(
  state: DraftState,
  word: WordInput,
  row: number,
  col: number,
  direction: Direction,
  requireCrossing: boolean,
): { valid: boolean; crossings: number; addedCells: number } {
  const letters = word.answer;
  let crossings = 0;
  let addedCells = 0;

  for (let i = 0; i < letters.length; i += 1) {
    const r = direction === 'across' ? row : row + i;
    const c = direction === 'across' ? col + i : col;
    const k = key(r, c);
    const existing = state.cells.get(k);
    const occupant = state.occupants.get(k);

    if (existing !== undefined) {
      if (existing !== letters[i]) return { valid: false, crossings: 0, addedCells: 0 };
      if (!occupant || occupant.direction === direction) {
        // Tumpang tindih searah bukan persilangan yang valid.
        return { valid: false, crossings: 0, addedCells: 0 };
      }
      crossings += 1;
    } else {
      addedCells += 1;
    }
  }

  if (requireCrossing && crossings === 0) return { valid: false, crossings: 0, addedCells: 0 };
  if (state.placements.length > 0 && !requireCrossing) {
    // Hindari kata terpisah terlalu jauh saat tidak ada persilangan.
    const box = bounds(state.cells);
    const distance = Math.min(
      Math.abs(row - box.minRow),
      Math.abs(row - box.maxRow),
      Math.abs(col - box.minCol),
      Math.abs(col - box.maxCol),
    );
    if (distance > 2) return { valid: false, crossings: 0, addedCells: 0 };
  }

  return { valid: true, crossings, addedCells };
}

function bounds(cells: Map<string, string>) {
  let minRow = Infinity;
  let maxRow = -Infinity;
  let minCol = Infinity;
  let maxCol = -Infinity;
  for (const k of cells.keys()) {
    const [r, c] = parseKey(k);
    minRow = Math.min(minRow, r);
    maxRow = Math.max(maxRow, r);
    minCol = Math.min(minCol, c);
    maxCol = Math.max(maxCol, c);
  }
  if (minRow === Infinity) return { minRow: 0, maxRow: 0, minCol: 0, maxCol: 0 };
  return { minRow, maxRow, minCol, maxCol };
}

function areaAfter(state: DraftState, word: WordInput, row: number, col: number, direction: Direction) {
  const box = bounds(state.cells);
  const minRow = Math.min(box.minRow, row);
  const maxRow = Math.max(box.maxRow, direction === 'down' ? row + word.answer.length - 1 : row);
  const minCol = Math.min(box.minCol, col);
  const maxCol = Math.max(box.maxCol, direction === 'across' ? col + word.answer.length - 1 : col);
  return (maxRow - minRow + 1) * (maxCol - minCol + 1);
}

function applyPlacement(state: DraftState, placement: DraftPlacement): void {
  const { word, row, col, direction } = placement;
  for (let i = 0; i < word.answer.length; i += 1) {
    const r = direction === 'across' ? row : row + i;
    const c = direction === 'across' ? col + i : col;
    state.cells.set(key(r, c), word.answer[i]!);
    state.occupants.set(key(r, c), { id: word.id, direction });
  }
  state.placements.push(placement);
}

function candidatesFor(
  state: DraftState,
  word: WordInput,
  random: () => number,
): DraftPlacement[] {
  const candidates: DraftPlacement[] = [];
  const seen = new Set<string>();

  if (state.placements.length === 0) {
    candidates.push({ word, row: 0, col: 0, direction: 'across' });
    candidates.push({ word, row: 0, col: 0, direction: 'down' });
  } else {
    for (const [k, letter] of state.cells) {
      const [r, c] = parseKey(k);
      for (let i = 0; i < word.answer.length; i += 1) {
        if (word.answer[i] !== letter) continue;
        const options: Array<[number, number, Direction]> = [
          [r, c - i, 'across'],
          [r - i, c, 'down'],
        ];
        for (const [row, col, direction] of options) {
          const sig = `${row},${col},${direction}`;
          if (seen.has(sig)) continue;
          seen.add(sig);
          if (checkPlacement(state, word, row, col, direction, true).valid) {
            candidates.push({ word, row, col, direction });
          }
        }
      }
    }
  }

  // Tanpa persilangan, kata dinyatakan gagal ditempatkan (editor manual tersedia).

  // Sedikit acakan terkontrol menghasilkan tata letak berbeda tiap percobaan.
  for (let i = candidates.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [candidates[i], candidates[j]] = [candidates[j]!, candidates[i]!];
  }
  return candidates;
}

function scorePlacement(state: DraftState, placement: DraftPlacement): number {
  const { crossings, addedCells } = checkPlacement(
    state,
    placement.word,
    placement.row,
    placement.col,
    placement.direction,
    false,
  );
  const area = areaAfter(state, placement.word, placement.row, placement.col, placement.direction);
  return crossings * 120 - addedCells * 2 - area * 0.35;
}

interface DraftResult {
  state: DraftState;
  unplaced: WordInput[];
  crossings: number;
  area: number;
  score: number;
}

function buildDraft(words: WordInput[], random: () => number): DraftResult {
  const state: DraftState = { cells: new Map(), occupants: new Map(), placements: [] };
  const unplaced: WordInput[] = [];
  let crossings = 0;

  for (const word of words) {
    const candidates = candidatesFor(state, word, random);
    if (candidates.length === 0) {
      unplaced.push(word);
      continue;
    }
    let best = candidates[0]!;
    let bestScore = -Infinity;
    for (const candidate of candidates) {
      const s = scorePlacement(state, candidate);
      if (s > bestScore) {
        bestScore = s;
        best = candidate;
      }
    }
    const check = checkPlacement(state, best.word, best.row, best.col, best.direction, false);
    crossings += check.crossings;
    applyPlacement(state, best);
  }

  const box = bounds(state.cells);
  const area = state.cells.size === 0 ? 0 : (box.maxRow - box.minRow + 1) * (box.maxCol - box.minCol + 1);
  const score = state.placements.length * 1000 + crossings * 50 - area;
  return { state, unplaced, crossings, area, score };
}

function assignNumbers(state: DraftState): PlacedWord[] {
  // Satu nomor dapat dipakai bersama oleh kata mendatar dan menurun yang berawal di sel sama.
  const starts = [...new Set(state.placements.map((p) => key(p.row, p.col)))].sort((a, b) => {
    const [ar, ac] = parseKey(a);
    const [br, bc] = parseKey(b);
    return ar - br || ac - bc;
  });
  const numbers = new Map<string, number>();
  starts.forEach((k, index) => numbers.set(k, index + 1));

  return state.placements.map((placement) => ({
    id: placement.word.id,
    answer: placement.word.answer,
    clue: placement.word.clue,
    number: numbers.get(key(placement.row, placement.col)) ?? 0,
    row: placement.row,
    col: placement.col,
    direction: placement.direction,
  }));
}

function toPuzzle(
  draft: DraftResult,
  options: GenerationOptions,
  sourceWords: WordInput[],
): CrosswordPuzzle {
  const box = bounds(draft.state.cells);
  const width = draft.state.cells.size === 0 ? 0 : box.maxCol - box.minCol + 1;
  const height = draft.state.cells.size === 0 ? 0 : box.maxRow - box.minRow + 1;
  const grid: (string | null)[][] = Array.from({ length: height }, () =>
    Array.from({ length: width }, () => null),
  );
  for (const [k, letter] of draft.state.cells) {
    const [r, c] = parseKey(k);
    grid[r - box.minRow]![c - box.minCol] = letter;
  }

  const placedIds = new Set(draft.state.placements.map((p) => p.word.id));
  return {
    id: options.title ? options.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') : `tts-${Date.now()}`,
    title: options.title ?? 'Teka-teki silang',
    subject: options.subject ?? 'Umum',
    topic: options.topic ?? 'Campuran',
    difficulty: options.difficulty ?? 'sedang',
    width,
    height,
    grid,
    words: assignNumbers(draft.state)
      .map((word) => ({ ...word, row: word.row - box.minRow, col: word.col - box.minCol }))
      .sort((a, b) => a.number - b.number || a.direction.localeCompare(b.direction)),
    unplaced: sourceWords.filter((w) => !placedIds.has(w.id)),
  };
}

/**
 * Membangun TTS dengan beberapa percobaan (multi-restart heuristic).
 * Kata dengan persilangan lebih banyak dan area lebih kecil dipilih.
 */
export function generateCrossword(words: WordInput[], options: GenerationOptions = {}): CrosswordPuzzle {
  const unique = new Map<string, WordInput>();
  for (const word of words) {
    const answer = normalizeAnswer(word.answer);
    if (answer.length < 2) continue;
    if (!unique.has(answer)) unique.set(answer, { ...word, answer, clue: String(word.clue ?? '').trim() || `Petunjuk: ${word.answer}` });
  }

  const ordered = [...unique.values()].sort((a, b) => b.answer.length - a.answer.length);
  const attempts = Math.max(1, Math.min(options.attempts ?? 24, 100));
  const random = mulberry32(options.seed ?? 20261126);
  let best: DraftResult | null = null;

  for (let attempt = 0; attempt < attempts; attempt += 1) {
    const draft = buildDraft(attempt === 0 ? ordered : [...ordered].sort(() => random() - 0.5), random);
    if (!best || draft.score > best.score) best = draft;
  }

  return toPuzzle(best!, options, [...unique.values()]);
}

/** Memeriksa konsistensi seluruh kata terhadap grid. */
export function validatePuzzle(puzzle: CrosswordPuzzle): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (puzzle.height === 0 || puzzle.width === 0) return { valid: puzzle.words.length === 0, errors };

  for (const word of puzzle.words) {
    if (word.row < 0 || word.col < 0 || word.row + (word.direction === 'down' ? word.answer.length - 1 : 0) >= puzzle.height || word.col + (word.direction === 'across' ? word.answer.length - 1 : 0) >= puzzle.width) {
      errors.push(`Kata ${word.answer} keluar dari grid`);
      continue;
    }
    for (let i = 0; i < word.answer.length; i += 1) {
      const r = word.direction === 'across' ? word.row : word.row + i;
      const c = word.direction === 'across' ? word.col + i : word.col;
      if (puzzle.grid[r]?.[c] !== word.answer[i]) {
        errors.push(`Konflik huruf ${word.answer} pada (${r},${c})`);
      }
    }
  }

  const seen = new Set<string>();
  for (const word of puzzle.words) {
    const sig = `${word.row},${word.col},${word.direction}`;
    if (seen.has(sig)) errors.push(`Duplikat posisi awal ${sig}`);
    seen.add(sig);
  }

  const crossings = puzzle.words.reduce((total, word) => {
    let count = 0;
    for (const other of puzzle.words) {
      if (word.id === other.id || word.direction === other.direction) continue;
      for (let i = 0; i < word.answer.length; i += 1) {
        for (let j = 0; j < other.answer.length; j += 1) {
          const r1 = word.direction === 'across' ? word.row : word.row + i;
          const c1 = word.direction === 'across' ? word.col + i : word.col;
          const r2 = other.direction === 'across' ? other.row : other.row + j;
          const c2 = other.direction === 'across' ? other.col + j : other.col;
          if (r1 === r2 && c1 === c2 && word.answer[i] === other.answer[j]) count += 1;
        }
      }
    }
    return total + count;
  }, 0);

  if (puzzle.words.length > 1 && crossings === 0) errors.push('Tidak ada persilangan antar kata');
  return { valid: errors.length === 0, errors };
}

export function listClues(puzzle: CrosswordPuzzle, direction: Direction) {
  return puzzle.words.filter((w) => w.direction === direction).sort((a, b) => a.number - b.number);
}
