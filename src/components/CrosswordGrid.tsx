import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { CrosswordPuzzle, Direction } from '@/types';

export interface CellPosition {
  row: number;
  col: number;
  direction: Direction;
}

interface Props {
  puzzle: CrosswordPuzzle;
  entries: Record<string, string>;
  selected: CellPosition | null;
  onSelect: (position: CellPosition) => void;
  onChange: (row: number, col: number, value: string) => void;
  feedback?: 'correct' | 'wrong' | null;
  readOnly?: boolean;
  large?: boolean;
  showKeyboard?: boolean;
}

const cellKey = (row: number, col: number) => `${row},${col}`;
const LETTERS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');

export function CrosswordGrid({
  puzzle, entries, selected, onSelect, onChange, feedback = null,
  readOnly = false, large = false, showKeyboard = false,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [showVirtualKeyboard, setShowVirtualKeyboard] = useState(showKeyboard);

  const numbers = useMemo(() => {
    const map = new Map<string, number>();
    puzzle.words.forEach((word) => map.set(cellKey(word.row, word.col), word.number));
    return map;
  }, [puzzle.words]);

  const validCells = useMemo(() => {
    const set = new Set<string>();
    puzzle.grid.forEach((row, r) => row.forEach((cell, c) => { if (cell) set.add(cellKey(r, c)); }));
    return set;
  }, [puzzle.grid]);

  const move = (dRow: number, dCol: number) => {
    if (!selected) return;
    let { row, col } = selected;
    for (let step = 0; step < Math.max(puzzle.height, puzzle.width); step += 1) {
      row = (row + dRow + puzzle.height) % puzzle.height;
      col = (col + dCol + puzzle.width) % puzzle.width;
      if (validCells.has(cellKey(row, col))) {
        onSelect({ row, col, direction: selected.direction });
        return;
      }
    }
  };

  useEffect(() => {
    containerRef.current?.focus();
  }, [selected?.row, selected?.col, selected?.direction]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (readOnly) return;
    if (event.key === 'Backspace' || event.key === 'Delete') {
      event.preventDefault();
      if (selected) onChange(selected.row, selected.col, '');
      return;
    }
    if (event.key === 'Tab') {
      event.preventDefault();
      if (selected) onSelect({ ...selected, direction: selected.direction === 'across' ? 'down' : 'across' });
      return;
    }
    const arrows: Record<string, [number, number]> = {
      ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1],
    };
    if (arrows[event.key]) {
      event.preventDefault();
      const [dr, dc] = arrows[event.key]!;
      move(dr, dc);
      return;
    }
    const letter = event.key.toUpperCase();
    if (/^[A-Z]$/.test(letter) && selected) {
      event.preventDefault();
      onChange(selected.row, selected.col, letter);
      const nextRow = selected.direction === 'down' ? selected.row + 1 : selected.row;
      const nextCol = selected.direction === 'across' ? selected.col + 1 : selected.col;
      if (validCells.has(cellKey(nextRow, nextCol))) onSelect({ ...selected, row: nextRow, col: nextCol });
    }
  };

  if (puzzle.width === 0 || puzzle.height === 0) {
    return <div className="card text-center text-sm text-slate-500">Belum ada grid yang dapat ditampilkan.</div>;
  }

  const cellSize = large ? 'min(11vw, 58px)' : 'min(8.2vw, 44px)';

  return (
    <div className="flex flex-col items-center gap-3">
      <div
        ref={containerRef}
        tabIndex={readOnly ? -1 : 0}
        onKeyDown={handleKeyDown}
        className="outline-none"
        style={{ width: `min(100%, ${puzzle.width * (large ? 60 : 46)}px)` }}
        aria-label="Papan teka-teki silang"
      >
        <div
          className="grid gap-[2px] rounded-xl bg-slate-200/70 p-[3px] dark:bg-slate-800"
          style={{ gridTemplateColumns: `repeat(${puzzle.width}, ${cellSize})` }}
        >
          {puzzle.grid.map((row, r) => row.map((cell, c) => {
            const k = cellKey(r, c);
            const isSelected = selected?.row === r && selected?.col === c;
            const value = entries[k] ?? '';
            const classes = [
              'tts-cell',
              cell ? '' : 'tts-cell-empty',
              isSelected ? 'tts-cell-active' : cell && value ? 'tts-cell-filled' : '',
              feedback === 'correct' && cell && value ? 'tts-cell-correct' : '',
              feedback === 'wrong' && cell && value ? 'tts-cell-wrong' : '',
            ].filter(Boolean).join(' ');
            return (
              <button
                type="button"
                key={k}
                disabled={!cell}
                onClick={() => cell && onSelect({ row: r, col: c, direction: selected?.direction ?? 'across' })}
                className={`${classes} cursor-pointer text-lg sm:text-xl disabled:cursor-default`}
                style={{ height: cellSize }}
              >
                {numbers.has(k) && <span className="tts-num">{numbers.get(k)}</span>}
                {value}
              </button>
            );
          }))}
        </div>
      </div>

      {!readOnly && (
        <div className="flex flex-wrap items-center justify-center gap-2">
          <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => setShowVirtualKeyboard((v) => !v)}>
            ⌨️ {showVirtualKeyboard ? 'Sembunyikan' : 'Keyboard'} HP
          </button>
          <button type="button" className="btn-ghost !px-2 !py-1 text-xs" onClick={() => selected && onSelect({ ...selected, direction: selected.direction === 'across' ? 'down' : 'across' })}>
            ⇄ Arah: {selected?.direction === 'down' ? 'Bawah' : 'Samping'}
          </button>
        </div>
      )}

      {showVirtualKeyboard && !readOnly && (
        <div className="grid max-w-md grid-cols-9 gap-1 rounded-xl bg-slate-100 p-2 dark:bg-slate-800">
          {LETTERS.map((letter) => (
            <button key={letter} type="button" className="rounded-md bg-white py-1.5 text-xs font-bold shadow-sm dark:bg-slate-700" onClick={() => selected && onChange(selected.row, selected.col, letter)}>
              {letter}
            </button>
          ))}
          <button type="button" className="col-span-3 rounded-md bg-rose-100 py-1.5 text-xs font-bold text-rose-700 dark:bg-rose-500/20 dark:text-rose-200" onClick={() => selected && onChange(selected.row, selected.col, '')}>
            Hapus
          </button>
        </div>
      )}
    </div>
  );
}
