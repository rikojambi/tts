import { useMemo, useState } from 'react';
import { Check, Clock, Trophy, X } from 'lucide-react';
import { useApp } from '@/app/AppContext';
import { Badge, Card, Modal, ProgressBar, SectionTitle, Stat } from '@/components/ui';
import { buildArenaQuestions } from '@/domain/arena';
import { calculateAnswerPoints } from '@/domain/scoring';
import type { Difficulty } from '@/types';

export default function KnowledgeArena() {
  const { questions, recordGame } = useApp();
  const [subject, setSubject] = useState('Semua');
  const [difficulty, setDifficulty] = useState<Difficulty | 'semua'>('semua');
  const [count, setCount] = useState(10);
  const [seed, setSeed] = useState(7);
  const [started, setStarted] = useState(false);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [answeredAt, setAnsweredAt] = useState(Date.now());

  const items = useMemo(() => buildArenaQuestions(questions, { subject, difficulty, count, seed }), [questions, subject, difficulty, count, seed]);
  const current = items[index];
  const finished = index >= items.length;

  const choose = (optionIndex: number) => {
    if (selected !== null || !current) return;
    setSelected(optionIndex);
    const isCorrect = optionIndex === current.correctIndex;
    if (isCorrect) {
      setCorrect((value) => value + 1);
      setScore((value) => value + calculateAnswerPoints({
        correct: true, difficulty: current.question.difficulty,
        durationMs: Date.now() - answeredAt, timeLimitMs: 30000, basePoints: 100,
      }));
    }
  };

  const next = async () => {
    if (index + 1 >= items.length) {
      await recordGame({
        id: crypto.randomUUID(), mode: 'arena', subject, score, correct, total: items.length,
        durationMs: Date.now() - answeredAt, playedAt: Date.now(),
      }, Math.round(score / 8), Math.round(score / 16));
    }
    setIndex((value) => value + 1);
    setSelected(null);
    setAnsweredAt(Date.now());
  };

  const restart = () => {
    setSeed((value) => value + 1);
    setIndex(0); setSelected(null); setScore(0); setCorrect(0); setAnsweredAt(Date.now());
  };

  if (!started) {
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <SectionTitle title="Knowledge Arena" subtitle="Kuis pilihan ganda lintas mata pelajaran dengan pembahasan langsung." />
        <Card className="space-y-4">
          <div><label className="label">Mata pelajaran</label><select className="input" value={subject} onChange={(e) => setSubject(e.target.value)}><option>Semua</option>{[...new Set(questions.map((q) => q.subject))].map((s) => <option key={s}>{s}</option>)}</select></div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div><label className="label">Kesulitan</label><select className="input" value={difficulty} onChange={(e) => setDifficulty(e.target.value as Difficulty | 'semua')}><option value="semua">Semua</option><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="sulit">Sulit</option></select></div>
            <div><label className="label">Jumlah soal: {count}</label><input className="w-full accent-orange-500" type="range" min={5} max={20} value={count} onChange={(e) => setCount(Number(e.target.value))} /></div>
          </div>
          <p className="text-sm text-slate-500">Bank soal aktif: {questions.length} pertanyaan.</p>
          <button type="button" className="btn-primary w-full" disabled={items.length === 0} onClick={() => setStarted(true)}>Mulai Arena</button>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <SectionTitle title="Knowledge Arena" subtitle={`Soal ${Math.min(index + 1, items.length)}/${items.length}`}
        action={<button type="button" className="btn-secondary" onClick={() => setStarted(false)}>Keluar</button>} />
      <div className="grid grid-cols-3 gap-3">
        <Stat label="Skor" value={score} icon={<Trophy size={14} />} />
        <Stat label="Benar" value={correct} icon={<Check size={14} />} />
        <Stat label="Sisa" value={items.length - index} icon={<Clock size={14} />} />
      </div>
      <ProgressBar value={(index / items.length) * 100} />

      {current && !finished && (
        <Card>
          <div className="mb-3 flex flex-wrap gap-2"><Badge tone="orange">{current.question.subject}</Badge><Badge>{current.question.difficulty}</Badge><Badge>{current.question.topic}</Badge></div>
          <h2 className="text-lg font-bold sm:text-xl">{current.question.prompt}</h2>
          <div className="mt-5 grid gap-2 sm:grid-cols-2">
            {current.options.map((option, optionIndex) => {
              const isRight = optionIndex === current.correctIndex;
              const chosen = selected === optionIndex;
              const style = selected === null ? 'border-slate-200 hover:border-adventure-400 dark:border-slate-700'
                : isRight ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                  : chosen ? 'border-rose-500 bg-rose-50 dark:bg-rose-500/10' : 'border-slate-200 opacity-60';
              return (
                <button key={option} type="button" disabled={selected !== null} onClick={() => choose(optionIndex)}
                  className={`flex items-center justify-between rounded-xl border p-3 text-left text-sm font-semibold ${style}`}>
                  <span>{option}</span>
                  {selected !== null && isRight && <Check size={16} className="text-emerald-500" />}
                  {selected !== null && chosen && !isRight && <X size={16} className="text-rose-500" />}
                </button>
              );
            })}
          </div>
          {selected !== null && (
            <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm dark:bg-slate-800/60">
              <strong>{selected === current.correctIndex ? 'Benar! 🎉' : `Jawaban yang benar: ${current.question.answer}`}</strong>
              <p className="mt-1">{current.question.explanation}</p>
              <button type="button" className="btn-primary mt-3" onClick={() => void next()}>{index + 1 === items.length ? 'Lihat Hasil' : 'Soal Berikutnya'}</button>
            </div>
          )}
        </Card>
      )}

      <Modal open={finished} onClose={() => setStarted(false)} title="Arena selesai!">
        <div className="space-y-3 text-center">
          <div className="text-5xl">🏅</div>
          <div className="text-3xl font-extrabold">{score} poin</div>
          <p className="text-sm text-slate-500">{correct}/{items.length} jawaban benar</p>
          <div className="flex justify-center gap-2"><button type="button" className="btn-primary" onClick={restart}>Lagi</button><button type="button" className="btn-secondary" onClick={() => setStarted(false)}>Keluar</button></div>
        </div>
      </Modal>
    </div>
  );
}
