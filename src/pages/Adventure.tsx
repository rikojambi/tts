import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lightbulb, Lock, RotateCcw, Star, Target, Trophy } from 'lucide-react';
import { useApp } from '@/app/AppContext';
import { CrosswordGrid } from '@/components/CrosswordGrid';
import { Badge, Card, Modal, ProgressBar, SectionTitle, Stat } from '@/components/ui';
import { useCrosswordGame, type CrosswordCompletion } from '@/hooks/useCrosswordGame';
import { calculateStars } from '@/domain/scoring';
import { isLevelUnlocked } from '@/domain/gamification';
import { listClues } from '@/domain/crossword';
import type { CrosswordPuzzle } from '@/types';

const emptyPuzzle: CrosswordPuzzle = {
  id: 'empty', title: '', subject: '', topic: '', difficulty: 'mudah',
  width: 0, height: 0, grid: [], words: [], unplaced: [],
};

export default function Adventure() {
  const { levels, levelResults, puzzles, saveLevelResult, inventory, usePowerUp } = useApp();
  const [params, setParams] = useSearchParams();
  const levelId = Number(params.get('level')) || 0;
  const level = levels.find((item) => item.id === levelId) ?? null;
  const puzzle = useMemo(
    () => puzzles.find((p) => p.id === `level-${levelId}`) ?? emptyPuzzle,
    [puzzles, levelId],
  );
  const [completion, setCompletion] = useState<CrosswordCompletion | null>(null);
  const [stars, setStars] = useState(0);
  const [notice, setNotice] = useState('');

  const handleComplete = (result: CrosswordCompletion) => {
    setCompletion(result);
    if (level) {
      const earned = calculateStars(result.points, level.targetScore, result.correctWords, result.totalWords);
      setStars(earned);
      void saveLevelResult({
        levelId: level.id, stars: earned, score: result.points,
        correct: result.correctWords, total: result.totalWords,
        durationMs: result.elapsedMs, playedAt: Date.now(),
      }, level);
    }
  };

  const game = useCrosswordGame(puzzle, {
    difficulty: level?.difficulty ?? 'sedang',
    pointsPerWord: 120,
    onComplete: handleComplete,
  });

  useEffect(() => { setCompletion(null); setStars(0); setNotice(''); }, [levelId]);

  const handleHint = async () => {
    if (!inventory.find((item) => item.id === 'hint' && item.qty > 0)) {
      setNotice('Belum punya Petunjuk Ekstra. Beli di Pengaturan → Toko Power-up.');
      return;
    }
    if (await usePowerUp('hint') && !game.useHint()) setNotice('Semua kata sudah terbuka.');
  };

  if (level && puzzle.id !== 'empty') {
    return (
      <div className="space-y-5">
        <SectionTitle title={`Level ${level.id}: ${level.title}`} subtitle={`${level.subject} • ${level.topic}`}
          action={<button type="button" className="btn-secondary" onClick={() => setParams({})}><ArrowLeft size={15} /> Peta petualangan</button>} />
        {notice && <div className="rounded-xl bg-amber-100 p-3 text-sm text-amber-800 dark:bg-amber-500/20 dark:text-amber-200">{notice}</div>}
        <div className="flex flex-wrap gap-2">
          <Badge tone="orange">Target {level.targetScore} poin</Badge><Badge>+{level.xp} XP</Badge>
          <Badge>🪙 {level.coins}</Badge><Badge tone="green">Skor {game.points}</Badge>
          <Badge>{game.solved.length}/{puzzle.words.length} kata</Badge>
        </div>
        <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
          <Card>
            <CrosswordGrid puzzle={puzzle} entries={game.entries} selected={game.selected} onSelect={game.setSelected} onChange={game.changeCell} feedback={game.feedback} />
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button type="button" className="btn-primary" onClick={game.checkSelection}>✓ Cek Kata</button>
              <button type="button" className="btn-secondary" onClick={() => void handleHint()}><Lightbulb size={15} /> Petunjuk</button>
              <button type="button" className="btn-secondary" onClick={game.reset}><RotateCcw size={15} /> Ulangi</button>
            </div>
          </Card>
          <Card>
            <h3 className="mb-3 font-bold">Daftar Petunjuk</h3>
            <CluePanel puzzle={puzzle} solved={game.solved} />
          </Card>
        </div>
        <Modal open={Boolean(completion)} onClose={() => setParams({})} title="Level selesai! 🎉">
          <div className="space-y-3 text-center">
            <div className="text-4xl">{'⭐'.repeat(stars)}</div>
            <div className="text-2xl font-extrabold">{completion?.points} poin</div>
            <p className="text-sm text-slate-500">{completion?.correctWords}/{completion?.totalWords} kata benar</p>
            <div className="max-h-56 space-y-2 overflow-y-auto rounded-xl bg-slate-50 p-3 text-left text-xs dark:bg-slate-800/60">
              {level.questions.map((q) => (
                <p key={q.id}><strong>{q.prompt}</strong><br /><span className="font-bold text-emerald-600">{q.answer}</span> — {q.explanation}</p>
              ))}
            </div>
            <button type="button" className="btn-primary" onClick={() => setParams({})}>Lihat Peta</button>
          </div>
        </Modal>
      </div>
    );
  }

  const cleared = levelResults.filter((r) => r.stars > 0).length;
  const totalStars = levelResults.reduce((sum, r) => sum + r.stars, 0);

  return (
    <div className="space-y-5">
      <SectionTitle title="Adventure Mode" subtitle="20 level lintas mata pelajaran. Selesaikan level untuk membuka level berikutnya." />
      <div className="grid gap-4 sm:grid-cols-3">
        <Stat label="Level selesai" value={`${cleared}/20`} icon={<Trophy size={14} />} />
        <Stat label="Total bintang" value={`${totalStars}/60 ⭐`} icon={<Star size={14} />} />
        <Stat label="Progres" value={`${Math.round(cleared / 20 * 100)}%`} icon={<Target size={14} />} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {levels.map((item) => {
          const unlocked = isLevelUnlocked(item.id, levelResults);
          const result = levelResults.find((r) => r.levelId === item.id);
          const earnedStars = result?.stars ?? 0;
          return (
            <button key={item.id} type="button" disabled={!unlocked}
              onClick={() => setParams({ level: String(item.id) })}
              className={`group rounded-2xl border p-4 text-left transition ${unlocked ? 'border-slate-200 bg-white hover:-translate-y-1 hover:border-adventure-400 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900' : 'border-dashed border-slate-300 opacity-60 dark:border-slate-700'}`}>
              <div className="mb-2 flex items-center justify-between">
                <span className={`grid h-9 w-9 place-items-center rounded-lg font-bold ${unlocked ? 'bg-adventure-500 text-white' : 'bg-slate-200 text-slate-500 dark:bg-slate-800'}`}>
                  {unlocked ? item.id : <Lock size={16} />}
                </span>
                <span className="text-sm">{earnedStars ? '⭐'.repeat(earnedStars) : unlocked ? 'Belum dimainkan' : 'Terkunci'}</span>
              </div>
              <div className="font-bold">{item.title}</div>
              <div className="truncate text-xs text-slate-500">{item.subject}</div>
              <div className="mt-3"><ProgressBar value={earnedStars / 3 * 100} color={earnedStars === 3 ? 'bg-amber-400' : 'bg-adventure-500'} /></div>
              <div className="mt-2 flex justify-between text-[11px] text-slate-500"><span>{item.difficulty}</span><span>{item.xp} XP</span></div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CluePanel({ puzzle, solved }: { puzzle: CrosswordPuzzle; solved: string[] }) {
  const render = (direction: 'across' | 'down') => (
    <ol className="space-y-1.5 text-xs sm:text-sm">
      {listClues(puzzle, direction).map((word) => (
        <li key={word.id} className={`rounded-lg p-2 ${solved.includes(word.id) ? 'bg-emerald-50 text-emerald-700 line-through dark:bg-emerald-500/10 dark:text-emerald-300' : 'bg-slate-50 dark:bg-slate-800/60'}`}>
          <strong>{word.number}.</strong> {word.clue}
        </li>
      ))}
    </ol>
  );
  return (
    <div className="max-h-[520px] space-y-4 overflow-y-auto pr-1">
      <div><h4 className="mb-2 text-xs font-bold uppercase text-slate-500">Mendatar</h4>{render('across')}</div>
      <div><h4 className="mb-2 text-xs font-bold uppercase text-slate-500">Menurun</h4>{render('down')}</div>
    </div>
  );
}
