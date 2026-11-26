import { useMemo, useRef, useState } from 'react';
import ExcelJS from 'exceljs';
import { Download, FileUp, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import { useApp } from '@/app/AppContext';
import { Badge, Card, EmptyState, Modal, SectionTitle } from '@/components/ui';
import { deleteQuestion, saveQuestion } from '@/data/storage';
import { exportQuestionsExcel } from '@/domain/exporters';
import { validateQuestion } from '@/domain/validation';
import type { Difficulty, Question } from '@/types';

const emptyQuestion = (): Question => ({
  id: '', subject: 'Umum', grade: 'X', topic: 'Campuran', difficulty: 'mudah',
  prompt: '', answer: '', hint: '', explanation: '',
});

export default function QuestionLibrary() {
  const { questions, refresh } = useApp();
  const [search, setSearch] = useState('');
  const [subject, setSubject] = useState('Semua');
  const [editing, setEditing] = useState<Question | null>(null);
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const filtered = useMemo(() => questions.filter((q) =>
    (subject === 'Semua' || q.subject === subject) &&
    (q.prompt.toLowerCase().includes(search.toLowerCase()) ||
      q.answer.toLowerCase().includes(search.toLowerCase()) ||
      q.topic.toLowerCase().includes(search.toLowerCase())),
  ), [questions, search, subject]);

  const save = async () => {
    if (!editing) return;
    const result = validateQuestion(editing);
    if (!result.valid) { setError(result.errors.join(' • ')); return; }
    await saveQuestion({
      ...editing,
      id: editing.id || crypto.randomUUID(),
      ...result.value,
    });
    setEditing(null);
    setError('');
    await refresh();
  };

  const remove = async (id: string) => {
    await deleteQuestion(id);
    await refresh();
  };

  const importJson = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as unknown;
      const rows = Array.isArray(data) ? data : (data as { questions?: unknown[] }).questions ?? [];
      let imported = 0;
      for (const raw of rows) {
        const result = validateQuestion(raw as Question);
        if (!result.valid) continue;
        const source = raw as Partial<Question>;
        await saveQuestion({
          id: source.id || crypto.randomUUID(),
          subject: source.subject || 'Umum',
          grade: source.grade || 'X',
          topic: source.topic || 'Campuran',
          difficulty: (['mudah', 'sedang', 'sulit'].includes(source.difficulty ?? '') ? source.difficulty : 'mudah') as Difficulty,
          ...result.value,
        });
        imported += 1;
      }
      setError(`${imported} soal berhasil diimpor.`);
      await refresh();
    } catch {
      setError('File JSON tidak valid.');
    }
  };

  const importExcel = async (file: File) => {
    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await file.arrayBuffer());
      const sheet = workbook.worksheets[0];
      if (!sheet) throw new Error('kosong');
      let imported = 0;
      sheet.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const values = row.values as unknown[];
        const result = validateQuestion({
          prompt: String(values[6] ?? ''), answer: String(values[7] ?? ''),
          hint: String(values[8] ?? ''), explanation: String(values[9] ?? ''),
        });
        if (!result.valid) return;
        void saveQuestion({
          id: String(values[1] ?? crypto.randomUUID()),
          subject: String(values[2] ?? 'Umum'), grade: String(values[3] ?? 'X'),
          topic: String(values[4] ?? 'Campuran'),
          difficulty: (['mudah', 'sedang', 'sulit'].includes(String(values[5])) ? String(values[5]) : 'mudah') as Difficulty,
          ...result.value,
        });
        imported += 1;
      });
      setError(`${imported} soal dari Excel diproses.`);
      await refresh();
    } catch {
      setError('File Excel tidak valid.');
    }
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Bank Soal" subtitle={`${questions.length} pertanyaan tersimpan. Kelola, import, dan export soal tanpa perlu pemrograman.`}
        action={<div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" onClick={() => fileRef.current?.click()}><FileUp size={15} /> Import</button>
          <button type="button" className="btn-primary" onClick={() => { setEditing(emptyQuestion()); setError(''); }}><Plus size={15} /> Soal Baru</button>
        </div>} />
      <input ref={fileRef} type="file" accept=".json,.xlsx" className="hidden" onChange={(e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        void (file.name.endsWith('.json') ? importJson(file) : importExcel(file));
        e.target.value = '';
      }} />
      {error && <div className="rounded-xl bg-blue-50 p-3 text-sm text-blue-700 dark:bg-blue-500/15 dark:text-blue-200">{error}</div>}

      <Card>
        <div className="mb-4 flex flex-wrap gap-2">
          <div className="relative min-w-[220px] flex-1"><Search size={16} className="absolute left-3 top-3 text-slate-400" /><input className="input !pl-9" placeholder="Cari soal, jawaban, atau topik..." value={search} onChange={(e) => setSearch(e.target.value)} /></div>
          <select className="input w-auto" value={subject} onChange={(e) => setSubject(e.target.value)}><option>Semua</option>{[...new Set(questions.map((q) => q.subject))].map((s) => <option key={s}>{s}</option>)}</select>
          <button type="button" className="btn-secondary" onClick={() => void exportQuestionsExcel(questions)}><Download size={15} /> Excel</button>
          <button type="button" className="btn-secondary" onClick={() => {
            const blob = new Blob([JSON.stringify({ questions }, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url; link.download = 'bank-soal.json'; link.click();
            URL.revokeObjectURL(url);
          }}><Download size={15} /> JSON</button>
        </div>

        {filtered.length === 0 ? <EmptyState icon="📚" title="Tidak ada soal" description="Ubah filter atau tambahkan soal baru." /> : (
          <div className="max-h-[65vh] space-y-2 overflow-y-auto">
            {filtered.map((question) => (
              <div key={question.id} className="rounded-xl border border-slate-200 p-3 dark:border-slate-700">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{question.prompt}</div>
                    <div className="mt-1 flex flex-wrap gap-2 text-xs text-slate-500"><Badge>{question.subject}</Badge><Badge>{question.grade}</Badge><Badge tone="green">{question.answer}</Badge><span>{question.topic}</span><span>{question.difficulty}</span></div>
                  </div>
                  <div className="flex gap-1"><button type="button" className="btn-ghost !p-1.5" onClick={() => setEditing(question)}><Pencil size={15} /></button><button type="button" className="btn-ghost !p-1.5 text-rose-500" onClick={() => void remove(question.id)}><Trash2 size={15} /></button></div>
                </div>
                <div className="mt-2 text-xs text-slate-500"><strong>Petunjuk:</strong> {question.hint}</div>
                <div className="text-xs text-slate-500"><strong>Pembahasan:</strong> {question.explanation}</div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Modal open={Boolean(editing)} onClose={() => setEditing(null)} title={editing?.id ? 'Edit Soal' : 'Soal Baru'}>
        {editing && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">Mata pelajaran<input className="input" value={editing.subject} onChange={(e) => setEditing({ ...editing, subject: e.target.value })} /></label>
              <label className="text-sm">Kelas<select className="input" value={editing.grade} onChange={(e) => setEditing({ ...editing, grade: e.target.value })}><option>X</option><option>XI</option><option>XII</option><option>Umum</option></select></label>
              <label className="text-sm">Topik<input className="input" value={editing.topic} onChange={(e) => setEditing({ ...editing, topic: e.target.value })} /></label>
              <label className="text-sm">Kesulitan<select className="input" value={editing.difficulty} onChange={(e) => setEditing({ ...editing, difficulty: e.target.value as Difficulty })}><option value="mudah">Mudah</option><option value="sedang">Sedang</option><option value="sulit">Sulit</option></select></label>
            </div>
            <label className="block text-sm">Pertanyaan<textarea className="input min-h-[80px]" value={editing.prompt} onChange={(e) => setEditing({ ...editing, prompt: e.target.value })} /></label>
            <label className="block text-sm">Jawaban (huruf saja)<input className="input uppercase" value={editing.answer} onChange={(e) => setEditing({ ...editing, answer: e.target.value })} /></label>
            <label className="block text-sm">Petunjuk<textarea className="input min-h-[60px]" value={editing.hint} onChange={(e) => setEditing({ ...editing, hint: e.target.value })} /></label>
            <label className="block text-sm">Pembahasan<textarea className="input min-h-[80px]" value={editing.explanation} onChange={(e) => setEditing({ ...editing, explanation: e.target.value })} /></label>
            {error && <p className="text-xs text-rose-500">{error}</p>}
            <button type="button" className="btn-primary w-full" onClick={() => void save()}>Simpan Soal</button>
          </div>
        )}
      </Modal>
    </div>
  );
}
