'use strict';

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.database();

const DIFFICULTY_FACTOR = { mudah: 1, sedang: 1.25, sulit: 1.6 };

function normalizeAnswer(value) {
  return String(value || '').toUpperCase().replace(/[^A-Z]/g, '');
}

/** Identik dengan src/domain/scoring.ts agar skor klien dan server cocok. */
function calculatePoints({ correct, difficulty, durationMs, timeLimitMs, basePoints, usedHint = false, streak = 0 }) {
  if (!correct) return 0;
  const base = Math.round(basePoints * (DIFFICULTY_FACTOR[difficulty] || 1));
  const timeRatio = Math.max(0, Math.min(1, 1 - durationMs / Math.max(1, timeLimitMs)));
  const speedBonus = Math.round(base * 0.5 * timeRatio);
  const streakBonus = Math.round(base * Math.min(0.5, Math.max(0, streak * 0.1)));
  const raw = base + speedBonus + streakBonus;
  return Math.max(1, Math.round(raw * (usedHint ? 0.7 : 1)));
}

/**
 * Callable opsional untuk validasi otoritatif Classroom Battle.
 * Klien mengirim niat jawaban; host memanggil fungsi ini sebelum menerapkan BattleState.
 * Kunci jawaban dibaca dari questionBank/{questionId} (hanya server yang menulis).
 */
exports.validateBattleAnswer = functions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Harus masuk dengan akun anonymous.');
  }

  const code = String(data.code || '').toUpperCase();
  const questionId = String(data.questionId || '');
  const durationMs = Number(data.durationMs || 0);
  if (!/^[A-Z2-9]{6}$/.test(code) || !questionId || !Number.isFinite(durationMs)) {
    throw new functions.https.HttpsError('invalid-argument', 'Payload tidak valid.');
  }

  const sessionSnapshot = await db.ref(`sessions/${code}`).once('value');
  const session = sessionSnapshot.val();
  if (!session) throw new functions.https.HttpsError('not-found', 'Sesi tidak ditemukan.');

  const studentUid = String(data.studentUid || context.auth.uid);
  if (!session.participants || !session.participants[studentUid]) {
    throw new functions.https.HttpsError('permission-denied', 'Peserta tidak terdaftar dalam sesi.');
  }

  const state = session.state;
  if (!state || state.finished) {
    throw new functions.https.HttpsError('failed-precondition', 'Permainan sudah selesai.');
  }

  const group = state.config.groups[state.groupIndex];
  const member = group && group.members[state.memberCursor[group.id] || 0];
  if (!member || member.id !== studentUid) {
    throw new functions.https.HttpsError('failed-precondition', 'Bukan giliran peserta ini.');
  }
  const activeQuestionId = state.config.questionIds[state.questionIndex];
  if (activeQuestionId !== questionId) {
    throw new functions.https.HttpsError('failed-precondition', 'Soal tidak sesuai giliran.');
  }

  const questionSnapshot = await db.ref(`questionBank/${questionId}`).once('value');
  const question = questionSnapshot.val();
  if (!question || !question.answer) {
    throw new functions.https.HttpsError('failed-precondition', 'Kunci jawaban tidak tersedia di server.');
  }

  const typed = normalizeAnswer(data.answer);
  if (!typed || typed.length > 24) {
    throw new functions.https.HttpsError('invalid-argument', 'Jawaban harus 1–24 huruf.');
  }

  const correct = typed === normalizeAnswer(question.answer);
  const points = calculatePoints({
    correct,
    difficulty: question.difficulty || 'sedang',
    durationMs: Math.max(0, Math.min(durationMs, state.config.secondsPerTurn * 1000)),
    timeLimitMs: state.config.secondsPerTurn * 1000,
    basePoints: state.config.pointsPerCorrect,
    usedHint: Boolean(data.usedHint),
    streak: Number(data.streak || 0),
  });

  const result = {
    correct,
    points,
    groupId: group.id,
    memberId: member.id,
    questionId,
    gradedAt: admin.database.ServerValue.TIMESTAMP,
  };
  await db.ref(`sessions/${code}/validated/${context.auth.uid}`).push().set(result);
  return result;
});

/**
 * Trigger pembersih: membatasi panjang dan karakter niat jawaban yang ditulis siswa.
 * Berjalan sebagai Admin SDK sehingga tidak terikat aturan klien.
 */
exports.sanitizeAnswerIntent = functions.database
  .ref('/sessions/{code}/answers/{uid}/{answerId}')
  .onCreate(async (snapshot, context) => {
    const value = snapshot.val();
    if (!value || typeof value.answer !== 'string') return null;
    const clean = normalizeAnswer(value.answer).slice(0, 24);
    const durationMs = Math.max(0, Math.min(Number(value.durationMs) || 0, 3600000));
    if (clean === value.answer && durationMs === value.durationMs) return null;
    return snapshot.ref.update({ answer: clean, durationMs });
  });
