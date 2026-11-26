import { useState } from 'react';
import { CheckCircle2, Download, Eye, Grid2X2, Plus, RotateCcw, Save, Trash2, Wand2, XCircle } from 'lucide-react';
import { useApp } from '@/app/AppContext';
import { CrosswordGrid } from '@/components/CrosswordGrid';
import { Badge, Card, Modal, SectionTitle } from '@/components/ui';
import { generateCrossword, validatePuzzle, normalizeAnswer } from '@/domain/crossword';
import { savePuzzle } from '@/data/storage';
import type { CrosswordPuzzle, Difficulty, Direction, WordInput } from '@/types';

interface Row { id: string; question: string; answer: string }
const newRow = (): Row => ({ id: crypto.randomUUID(), question: '', answer: '' });

export default function CreateCrossword() {
  const { refresh } = useApp();
  const [subject, setSubject] = useState('Umum');
  const [grade, setGrade] = useState('X');
  const [topic, setTopic] = useState('Campuran');
  const [difficulty, setDifficulty] = useState<Difficulty>('sedang');
  const [title, setTitle] = useState('TTS Buatan Guru');
  const [rows, setRows] = useState<Row[]>([newRow(), newRow(), newRow()]);
  const [puzzle, setPuzzle] = useState<CrosswordPuzzle | null>(null);
  const [validation, setValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  const [editor, setEditor] = useState(false);
  const [notice, setNotice] = useState('');

  const generate = () => {
    const words: WordInput[] = rows
      .filter((row) => row.question.trim() && row.answer.trim())
      .map((row) => ({ id: row.id, answer: normalizeAnswer(row.answer), clue: row.question.trim() }))
      .filter((word) => word.answer.length >= 2);
    if (words.length < 2) {
      setNotice('Isi minimal dua pertanyaan dan jawaban.');
      return;
    }
    const result = generateCrossword(words, { title, subject, topic, difficulty, attempts: 30, seed: Date.now() % 100000 });
    setPuzzle(result);
    setValidation(validatePuzzle(result));
    setNotice(result.unplaced.length ? `${result.unplaced.length} kata tidak dapat disilangkan. Gunakan editor manual.` : 'TTS berhasil dibuat.');
  };

  const downloadJson = () => {
    if (!puzzle) return;
    const blob = new Blob([JSON.stringify(puzzle, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${puzzle.id}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Create Crossword" subtitle="Masukkan pertanyaan dan jawaban; generator akan mencari persilangan terbaik dengan beberapa percobaan." />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card>
          <div className="grid gap-3 sm:grid-cols-2">
            <div><label className="label">Judul</label><input className="input" value={title} onChange={(e) => setTitle(e.target.value)} /></div>
            <div><label className="label">Mata pelajaran</label><input className="input" value={subject} onChange={(e) => setSubject(e.target.value)} /></div>
            <div><label className="label">Kelas</label><select className="input" value={grade} onChange={(e) => setGrade(e.target.value)}><option>X</option><option>XI</option><option>XII</option><option>Umum</option></select></div>
            <div><label className="label">Topik</label><input className="input" value={topic} onChange={(e) => setTopic(e.target.value)} /></div>
            <div><label className="label">Kesulitan</label><select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty)}><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="sulit">Sulit</option></select></div>
          </div>
          <div className="mt-5 flex items-center justify-between">
            <h3 className="font-bold">Daftar Pertanyaan & Jawaban</h3>
            <button type="button" className="btn-ghost !py-1 text-xs" onClick={() => setRows((current) => [...current, newRow()])}><Plus size={14} /> Tambah baris</button>
          </div>
          <div className="mt-3 space-y-3">
            {rows.map((row, index) => (
              <div key={row.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="mb-2 flex justify-between text-xs font-semibold text-slate-500"><span>Soal {index + 1}</span><button type="button" className="text-rose-500" disabled={rows.length <= 2} onClick={() => setRows((current) => current.filter((r) => r.id !== row.id))}><Trash2 size={14} /></button></div>
                <textarea className="input min-h-[64px] resize-y" placeholder="Tulis pertanyaan / petunjuk" value={row.question} onChange={(e) => setRows((current) => current.map((r) => r.id === row.id ? { ...r, question: e.target.value } : r))} />
                <input className="input mt-2 uppercase" placeholder="JAWABAN (tanpa spasi)" value={row.answer} onChange={(e) => setRows((current) => current.map((r) => r.id === row.id ? { ...r, answer: e.target.value } : r))} />
              </div>
            ))}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <button type="button" className="btn-primary" onClick={generate}><Wand2 size={16} /> Generate TTS</button>
            <button type="button" className="btn-secondary" onClick={() => setRows([newRow(), newRow(), newRow()])}><RotateCcw size={15} /> Kosongkan</button>
          </div>
          {notice && <p className="mt-3 text-sm text-slate-500">{notice}</p>}
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 font-bold">Hasil Generator</h3>
            {!puzzle ? <p className="text-sm text-slate-500">Belum ada TTS. Isi formulir lalu klik Generate.</p> : (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2">
                  <Badge tone="green">{puzzle.words.length} kata</Badge>
                  <Badge>{puzzle.width}×{puzzle.height}</Badge>
                  {validation && <Badge tone={validation.valid ? 'green' : 'orange'}>{validation.valid ? <CheckCircle2 size={12} /> : <XCircle size={12} />} {validation.valid ? 'Valid' : 'Ada konflik'}</Badge>}
                </div>
                <div className="overflow-x-auto"><CrosswordGrid puzzle={puzzle} entries={{}} selected={null} onSelect={() => {}} onChange={() => {}} readOnly /></div>
                <div className="max-h-48 space-y-1 overflow-y-auto text-xs">
                  {puzzle.words.map((word) => <div key={word.id}><strong>{word.number}{word.direction === 'across' ? 'A' : 'D'}</strong> — {word.clue} <span className="text-slate-400">({word.answer})</span></div>)}
                </div>
                {puzzle.unplaced.length > 0 && (
                  <div className="rounded-lg bg-amber-50 p-2 text-xs text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">
                    Gagal ditempatkan: {puzzle.unplaced.map((word) => word.answer).join(', ')}.
                    <button type="button" className="ml-2 font-bold underline" onClick={() => setEditor(true)}>Buka editor manual</button>
                  </div>
                )}
                <div className="flex flex-wrap gap-2">
                  <button type="button" className="btn-primary" onClick={() => { setEditor(true); }}><Grid2X2 size={15} /> Editor Manual</button>
                  <button type="button" className="btn-secondary" onClick={downloadJson}><Download size={15} /> Unduh JSON</button>
                  <button type="button" className="btn-secondary" onClick={async () => { await savePuzzle(puzzle); await refresh(); setNotice('TTS tersimpan di bank soal lokal.'); }}><Save size={15} /> Simpan</button>
                </div>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={editor} onClose={() => setEditor(false)} title="Editor TTS Manual">
        {puzzle && <ManualEditor puzzle={puzzle} onSaved={() => { setEditor(false); void refresh(); }} />}
      </Modal>
    </div>
  );
}

function ManualEditor({ puzzle, onSaved }: { puzzle: CrosswordPuzzle; onSaved: () => void }) {
  const [height, setHeight] = useState(Math.max(puzzle.height, 5));
  const [width, setWidth] = useState(Math.max(puzzle.width, 5));
  const [grid, setGrid] = useState<string[][]>(() => Array.from({ length: Math.max(puzzle.height, 5) }, (_, r) =>
    Array.from({ length: Math.max(puzzle.width, 5) }, (_, c) => puzzle.grid[r]?.[c] ?? '')));
  const [words, setWords] = useState(() => puzzle.words.map((w) => ({ answer: w.answer, row: w.row, col: w.col, direction: w.direction })));
  const [newWord, setNewWord] = useState({ answer: '', row: 0, col: 0, direction: 'across' as Direction });
  const [errors, setErrors] = useState<string[]>([]);

  const preview: CrosswordPuzzle = {
    ...puzzle,
    width, height,
    grid: grid.map((row) => row.map((cell) => cell.toUpperCase() || null)),
    words: words.map((word, index) => ({
      id: `manual-${index}`, answer: normalizeAnswer(word.answer), clue: puzzle.words[index]?.clue ?? 'Petunjuk',
      number: index + 1, row: word.row, col: word.col, direction: word.direction,
    })),
  };

  const addWord = () => {
    const answer = normalizeAnswer(newWord.answer);
    if (!answer) return;
    setWords((current) => [...current, { ...newWord, answer }]);
    setNewWord({ answer: '', row: 0, col: 0, direction: 'across' });
  };

  const apply = async () => {
    const result = validatePuzzle(preview);
    setErrors(result.errors);
    if (!result.valid) return;
    await savePuzzle(preview, true);
    onSaved();
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <label className="text-sm">Baris<input className="input" type="number" min={3} max={25} value={height} onChange={(e) => setHeight(Number(e.target.value))} /></label>
        <label className="text-sm">Kolom<input className="input" type="number" min={3} max={25} value={width} onChange={(e) => setWidth(Number(e.target.value))} /></label>
      </div>
      <div className="max-h-80 overflow-auto">
        <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${width}, 36px)` }}>
          {grid.slice(0, height).map((row, r) => row.slice(0, width).map((cell, c) => (
            <input key={`${r},${c}`} className="h-9 w-9 rounded border border-slate-300 text-center uppercase dark:border-slate-600 dark:bg-slate-800"
              maxLength={1} value={cell} onChange={(e) => setGrid((current) => current.map((line, ri) => line.map((value, ci) => ri === r && ci === c ? e.target.value.toUpperCase() : value)))} />
          )))}
        </div>
      </div>
      <div className="space-y-2">
        <h4 className="text-sm font-bold">Daftar kata</h4>
        {words.map((word, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2 text-xs">
            <span className="font-mono">{word.answer}</span>
            <span>baris {word.row}, kolom {word.col}, {word.direction === 'across' ? 'mendatar' : 'menurun'}</span>
            <button type="button" className="text-rose-500" onClick={() => setWords((current) => current.filter((_, i) => i !== index))}>hapus</button>
          </div>
        ))}
        <div className="flex flex-wrap gap-2">
          <input className="input max-w-[140px] uppercase" placeholder="JAWABAN" value={newWord.answer} onChange={(e) => setNewWord((current) => ({ ...current, answer: e.target.value }))} />
          <input className="input w-20" type="number" min={0} placeholder="Baris" value={newWord.row} onChange={(e) => setNewWord((current) => ({ ...current, row: Number(e.target.value) }))} />
          <input className="input w-20" type="number" min={0} placeholder="Kolom" value={newWord.col} onChange={(e) => setNewWord((current) => ({ ...current, col: Number(e.target.value) }))} />
          <select className="input w-28" value={newWord.direction} onChange={(e) => setNewWord((current) => ({ ...current, direction: e.target.value as Direction }))}><option value="across">Mendatar</option><option value="down">Menurun</option></select>
          <button type="button" className="btn-secondary !py-1.5 text-xs" onClick={addWord}><Plus size={13} /> Tambah</button>
        </div>
      </div>
      {errors.length > 0 && <div className="rounded-lg bg-rose-50 p-2 text-xs text-rose-700 dark:bg-rose-500/15 dark:text-rose-200">{errors.join('; ')}</div>}
      <div className="flex gap-2"><button type="button" className="btn-primary" onClick={() => void apply()}><Save size={15} /> Simpan TTS</button><button type="button" className="btn-secondary" onClick={() => setEditorClose()}><Eye size={15} /> Tutup</button></div>
    </div>
  );
  function setEditorClose() { onSaved(); }
}
