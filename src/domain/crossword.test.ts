import { describe, expect, it } from 'vitest';
import { generateCrossword, normalizeAnswer, validatePuzzle } from './crossword';
import type { WordInput } from '@/types';

const w = (answer: string, clue = `Petunjuk ${answer}`): WordInput => ({
  id: answer,
  answer,
  clue,
});

describe('normalizeAnswer', () => {
  it('membuang spasi, tanda baca, dan menyeragamkan huruf', () => {
    expect(normalizeAnswer('  air-hidup! ')).toBe('AIRHIDUP');
  });
});

describe('generateCrossword', () => {
  it('menghasilkan grid kosong untuk daftar kata kosong', () => {
    const puzzle = generateCrossword([]);
    expect(puzzle.width).toBe(0);
    expect(puzzle.height).toBe(0);
    expect(puzzle.words).toHaveLength(0);
    expect(validatePuzzle(puzzle).valid).toBe(true);
  });

  it('mengabaikan kata satu huruf dan jawaban duplikat', () => {
    const puzzle = generateCrossword([w('A'), w('BUKU'), w('buku'), w('KUKU')]);
    const answers = puzzle.words.map((word) => word.answer);
    expect(answers.filter((a) => a === 'BUKU')).toHaveLength(1);
    expect(answers).not.toContain('A');
    expect(validatePuzzle(puzzle).valid).toBe(true);
  });

  it('menempatkan kata dan menjaga persilangan huruf tetap konsisten', () => {
    const words = ['MATEMATIKA', 'MATRIKS', 'TRIGONOMETRI', 'STATISTIKA', 'ALJABAR', 'GEOMETRI', 'HIMPUNAN', 'FUNGSI'].map((answer) => w(answer));
    const puzzle = generateCrossword(words, { attempts: 12 });
    expect(puzzle.words.length).toBeGreaterThanOrEqual(7);
    expect(puzzle.unplaced.length).toBeLessThanOrEqual(1);
    expect(validatePuzzle(puzzle).valid).toBe(true);
    expect(puzzle.words.every((word) => word.number > 0)).toBe(true);
  });

  it('menandai kata yang tidak dapat ditempatkan tanpa merusak grid', () => {
    const puzzle = generateCrossword([w('BUKU'), w('QQQQQQQQQQ')], { attempts: 4 });
    expect(validatePuzzle(puzzle).valid).toBe(true);
    expect(puzzle.words.length + puzzle.unplaced.length).toBe(2);
  });

  it('bekerja untuk berbagai jumlah kata', () => {
    const counts = [1, 2, 3, 5, 8, 12];
    for (const count of counts) {
      const words = Array.from({ length: count }, (_, i) => w(['HARIMAU', 'GUNUNG', 'SUNGAI', 'PANTAI', 'HUTAN', 'LAUT', 'BINTANG', 'BULAN', 'MATAHARI', 'AWAN', 'Hujan'.toUpperCase(), 'PETIR'][i]!));
      const puzzle = generateCrossword(words, { attempts: 8 });
      expect(validatePuzzle(puzzle).valid).toBe(true);
      expect(puzzle.words.length).toBeGreaterThan(0);
    }
  });

  it('mendeteksi konflik posisi secara eksplisit', () => {
    const puzzle = generateCrossword([w('BUKU'), w('KUKU')], { attempts: 4 });
    expect(validatePuzzle(puzzle).valid).toBe(true);
    const corrupt = structuredClone(puzzle);
    const rowIndex = corrupt.grid.findIndex((row) => row.some((cell) => cell !== null));
    const colIndex = corrupt.grid[rowIndex]!.findIndex((cell) => cell !== null);
    corrupt.grid[rowIndex]![colIndex] = 'Z';
    expect(validatePuzzle(corrupt).valid).toBe(false);
  });
});
