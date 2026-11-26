import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Clock, Lightbulb, RotateCcw, Sparkles } from 'lucide-react';
import { useApp } from '@/app/AppContext';
import { CrosswordGrid } from '@/components/CrosswordGrid';
import { Badge, Card, Modal, SectionTitle } from '@/components/ui';
import { useCrosswordGame } from '@/hooks/useCrosswordGame';
import { puzzleFromQuestions } from '@/domain/puzzleFactory';
import { listClues } from '@/domain/crossword';
import type { CrosswordCompletion } from '@/hooks/useCrosswordGame';
import type { Difficulty } from '@/types';

export default function QuickPlay() {
  const { questions, inventory, usePowerUp, recordGame } = useApp();
  const [subject, setSubject] = useState('Semua');
  const [difficulty, setDifficulty] = useState<Difficulty | 'semua'>('semua');
  const [count, setCount] = useState(8);
  const [seed, setSeed] = useState(1);
  const [started, setStarted] = useState(false);
  const [completion, setCompletion] = useState<CrosswordCompletion | null>(null);
  const [reward, setReward] = useState<{ xp: number; coins: number } | null>(null);
  const [notice, setNotice] = useState('');

  const pool = useMemo(() => questions.filter((q) =>
    (subject === 'Semua' || q.subject === subject) &&
    (difficulty === 'semua' || q.difficulty === difficulty),
  ), [questions, subject, difficulty]);

  const puzzle = useMemo(() => puzzleFromQuestions(pool, {
    title: 'Quick Play',
    subject,
    difficulty: difficulty === 'semua' ? 'sedang' : difficulty,
    count,
    seed,
  }), [pool, subject, difficulty, count, seed]);

  const handleComplete = async (result: CrosswordCompletion) => {
    setCompletion(result);
    const xp = Math.round(result.points / 6);
    const coins = Math.round(result.points / 12);
    setReward({ xp, coins });
    await recordGame({
      id: crypto.randomUUID(),
      mode: 'quick',
      subject,
      score: result.points,
      correct: result.correctWords,
      total: result.totalWords,
      durationMs: result.elapsedMs,
      playedAt: Date.now(),
      details: { hintsUsed: result.hintsUsed, difficulty },
    }, xp, coins);
  };

  const game = useCrosswordGame(puzzle, { difficulty: difficulty === 'semua' ? 'sedang' : difficulty, onComplete: handleComplete });

  const handleHint = async () => {
    if (!inventory.find((item) => item.id === 'hint' && item.qty > 0)) {
      setNotice('Belum punya Petunjuk Ekstra. Beli di Pengaturan → Toko Power-up.');
      return;
    }
    if (await usePowerUp('hint')) game.useHint();
  };

  const restart = () => {
    setSeed((value) => value + 1);
    setCompletion(null);
    setReward(null);
    game.reset();
  };

  const subjects = ['Semua', ...new Set(questions.map((q) => q.subject))].sort();

  if (!started) {
    return (
      <div className="space-y-5">
        <SectionTitle title="Quick Play" subtitle="Pilih cakupan soal, lalu selesaikan TTS secepat mungkin." />
        <Card className="mx-auto max-w-2xl">
          <div className="space-y-4">
            <div>
              <label className="label">Mata pelajaran</label>
              <select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}>
                {subjects.map((item) => <option key={item}>{item}</option>)}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Kesulitan</label>
                <select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | 'semua')}>
                  <option value="semua">Semua</option><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="sulit">Sulit</option>
                </select>
              </div>
              <div>
                <label className="label">Jumlah kata: {count}</label>
                <input className="w-full accent-orange-500" type="range" min={4} max={14} value={count} onChange={(e) => setCount(Number(e.target.value))} />
              </div>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
              Tersedia <strong>{pool.length}</strong> soal sesuai filter. Generator akan memilih {count} kata dan mencari persilangan terbaik.
            </div>
            <button type="button" className="btn-primary w-full" disabled={pool.length < 3} onClick={() => setStarted(true)}>
              <Sparkles size={16} /> Mulai Permainan
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <SectionTitle
        title="Quick Play"
        subtitle="Ketik jawaban di grid. Tekan tombol cek untuk memverifikasi kata."
        action={<button type="button" className="btn-secondary" onClick={() => setStarted(false)}><RotateCcw size={15} /> Pengaturan</button>}
      />

      {notice && <div className="rounded-xl bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">{notice}</div>}

      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <div className="mb-4 flex flex-wrap items-center justify-center gap-2">
            <Badge tone="orange">Skor {game.points}</Badge>
            <Badge><Clock size={12} /> {Math.floor(game.elapsedMs / 60000)}:{String(Math.floor(game.elapsedMs / 1000) % 60).padStart(2, '0')}</Badge>
            <Badge tone="green">{game.solved.length}/{puzzle.words.length} kata</Badge>
            {puzzle.unplaced.length > 0 && <Badge>{puzzle.unplaced.length} kata tanpa persilangan</Badge>}
          </div>
          <CrosswordGrid puzzle={puzzle} entries={game.entries} selected={game.selected} onSelect={game.setSelected} onChange={game.changeCell} feedback={game.feedback} />
          <div className="mt-5 flex flex-wrap justify-center gap-2">
            <button type="button" className="btn-primary" onClick={game.checkSelection}>✓ Cek Kata</button>
            <button type="button" className="btn-secondary" onClick={() => void handleHint()}><Lightbulb size={15} /> Petunjuk</button>
            <button type="button" className="btn-secondary" onClick={restart}><RotateCcw size={15} /> Ulangi</button>
          </div>
        </Card>

        <div className="space-y-4">
          <Card>
            <h3 className="mb-3 font-bold">Petunjuk Mendatar</h3>
            <Clues words={listClues(puzzle, 'across')} solved={game.solved} />
            <h3 className="mb-3 mt-5 font-bold">Petunjuk Menurun</h3>
            <Clues words={listClues(puzzle, 'down')} solved={game.solved} />
          </Card>
          <Card className="text-sm text-slate-500">
            <Link to="/settings" className="font-semibold text-adventure-500">Beli power-up di Pengaturan</Link> untuk membuka petunjuk ekstra dan XP dobel.
          </Card>
        </div>
      </div>

      <Modal open={Boolean(completion)} onClose={() => setCompletion(null)} title="Permainan selesai! 🎉">
        <div className="space-y-3 text-center">
          <div className="text-5xl">🏆</div>
          <div className="text-3xl font-extrabold text-adventure-500">{completion?.points ?? 0} poin</div>
          <p className="text-sm text-slate-500">{completion?.correctWords} dari {completion?.totalWords} kata terselesaikan</p>
          <div className="flex justify-center gap-2"><Badge tone="orange">+{reward?.xp ?? 0} XP</Badge><Badge>+{reward?.coins ?? 0} koin</Badge></div>
          <div className="flex justify-center gap-2 pt-2"><button type="button" className="btn-primary" onClick={restart}>Main Lagi</button><Link to="/leaderboard" className="btn-secondary">Leaderboard</Link></div>
        </div>
      </Modal>
    </div>
  );
}

function Clues({ words, solved }: { words: ReturnType<typeof listClues>; solved: string[] }) {
  return (
    <ol className="space-y-2 text-sm">
      {words.map((word) => (
        <li key={word.id} className={`flex gap-2 rounded-lg p-2 ${solved.includes(word.id) ? 'bg-emerald-50 text-emerald-700 line-through dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
          <span className="font-bold">{word.number}.</span><span>{word.clue}</span>
        </li>
      ))}
    </ol>
  );
}
