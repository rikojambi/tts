import ExcelJS from 'exceljs';
import { jsPDF } from 'jspdf';
import type { AnswerEvent, GameRecord, Question } from '@/types';

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportQuestionsExcel(questions: Question[], filename = 'bank-soal.xlsx'): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Bank Soal');
  sheet.columns = [
    { header: 'ID', key: 'id', width: 18 },
    { header: 'Mata Pelajaran', key: 'subject', width: 22 },
    { header: 'Kelas', key: 'grade', width: 10 },
    { header: 'Topik', key: 'topic', width: 24 },
    { header: 'Kesulitan', key: 'difficulty', width: 12 },
    { header: 'Pertanyaan', key: 'prompt', width: 60 },
    { header: 'Jawaban', key: 'answer', width: 20 },
    { header: 'Petunjuk', key: 'hint', width: 40 },
    { header: 'Pembahasan', key: 'explanation', width: 60 },
  ];
  questions.forEach((q) => sheet.addRow(q));
  sheet.getRow(1).font = { bold: true };
  sheet.autoFilter = { from: 'A1', to: 'I1' };
  const buffer = await workbook.xlsx.writeBuffer();
  download(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

export async function exportResultsExcel(records: GameRecord[], events: AnswerEvent[], filename = 'hasil-belajar.xlsx'): Promise<void> {
  const workbook = new ExcelJS.Workbook();
  const summary = workbook.addWorksheet('Ringkasan');
  summary.columns = [
    { header: 'Waktu', key: 'time', width: 22 },
    { header: 'Mode', key: 'mode', width: 14 },
    { header: 'Mata Pelajaran', key: 'subject', width: 22 },
    { header: 'Skor', key: 'score', width: 12 },
    { header: 'Benar', key: 'correct', width: 10 },
    { header: 'Total', key: 'total', width: 10 },
    { header: 'Durasi (detik)', key: 'duration', width: 16 },
  ];
  records.forEach((r) => summary.addRow({
    time: new Date(r.playedAt).toLocaleString('id-ID'),
    mode: r.mode,
    subject: r.subject,
    score: r.score,
    correct: r.correct,
    total: r.total,
    duration: Math.round(r.durationMs / 1000),
  }));
  summary.getRow(1).font = { bold: true };

  const detail = workbook.addWorksheet('Jawaban Siswa');
  detail.columns = [
    { header: 'Waktu', key: 'time', width: 22 },
    { header: 'Kelompok', key: 'group', width: 22 },
    { header: 'Siswa', key: 'student', width: 22 },
    { header: 'Soal', key: 'question', width: 36 },
    { header: 'Jawaban', key: 'answer', width: 18 },
    { header: 'Benar', key: 'correct', width: 10 },
    { header: 'Durasi (detik)', key: 'duration', width: 16 },
    { header: 'Poin', key: 'points', width: 10 },
  ];
  events.forEach((e) => detail.addRow({
    time: new Date(e.timestamp).toLocaleString('id-ID'),
    group: e.groupId,
    student: e.playerName,
    question: e.questionId,
    answer: e.answer,
    correct: e.correct ? 'Ya' : 'Tidak',
    duration: Math.round(e.durationMs / 1000),
    points: e.points,
  }));
  detail.getRow(1).font = { bold: true };

  const buffer = await workbook.xlsx.writeBuffer();
  download(new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }), filename);
}

export interface PdfReportInput {
  title: string;
  subtitle?: string;
  lines: string[];
}

export function exportReportPdf(input: PdfReportInput, filename = 'laporan.pdf'): void {
  const doc = new jsPDF();
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.text(input.title, 14, 20);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  if (input.subtitle) doc.text(input.subtitle, 14, 28);
  let y = 38;
  input.lines.forEach((line) => {
    const chunks = doc.splitTextToSize(line, 180) as string[];
    chunks.forEach((chunk: string) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      doc.text(chunk, 14, y);
      y += 6;
    });
    y += 2;
  });
  doc.save(filename);
}
