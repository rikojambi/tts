import { normalizeAnswer } from './crossword';

/** Membuang tag HTML/script dari teks yang dimasukkan pengguna. */
export function sanitizeText(value: string, maxLength = 1000): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/[\u0000-\u001F\u007F]/g, ' ')
    .trim()
    .slice(0, maxLength);
}

export function validateQuestion(input: {
  prompt: string; answer: string; hint: string; explanation: string;
}) {
  const prompt = sanitizeText(input.prompt);
  const hint = sanitizeText(input.hint);
  const explanation = sanitizeText(input.explanation);
  const answer = normalizeAnswer(input.answer);
  const errors: string[] = [];
  if (prompt.length < 8) errors.push('Pertanyaan terlalu pendek (minimal 8 karakter).');
  if (answer.length < 3 || answer.length > 14) errors.push('Jawaban harus 3–14 huruf.');
  if (!hint) errors.push('Petunjuk wajib diisi.');
  if (!explanation) errors.push('Pembahasan wajib diisi.');
  return { valid: errors.length === 0, errors, value: { prompt, answer, hint, explanation } };
}
