# Skema Data CROSSWORD ADVENTURE

## Penyimpanan lokal (IndexedDB via Dexie)

Database: `crossword-adventure`, versi 1. Semua data dibaca/ditulis melalui `src/data/storage.ts`.

| Tabel | Key | Isi utama |
| --- | --- | --- |
| `profile` | `id` (`main`) | `name`, `avatar`, `xp`, `coins`, `streak`, `lastPlayedDate`, `createdAt` |
| `settings` | `key` | `value` (tema, suara, animasi, mode proyektor, PIN guru, sinkronisasi, dll.) |
| `levels` | `id` | 20 level: judul, mapel, topik, kesulitan, targetScore, xp, coins, 10 soal |
| `puzzles` | `id` | TTS level (`level-1` … `level-20`) atau TTS buatan guru |
| `questions` | `id` | Bank soal: prompt, answer, hint, explanation, mapel, kelas, topik, kesulitan |
| `subjects` | `id` | Mata pelajaran + warna |
| `classes` | `id` | Kelas (mis. `XI IPA 1`) + daftar `subjectIds` |
| `groups` | `id` | Kelompok tersimpan + anggota |
| `records` | `id` | Riwayat game: mode, skor, benar/total, durasi, `details` |
| `levelResults` | `id` (`level-{n}`) | Bintang, skor, benar/total, durasi, waktu main |
| `achievements` | `id` | Achievement yang sudah terbuka + `unlockedAt` |
| `inventory` | `id` | Power-up dan jumlah (`qty`) |
| `syncQueue` | auto-increment | Antrean perubahan: `entity`, `entityId`, `operation`, `payload`, `updatedAt` |
| `sessions` | `id` | `code` + `BattleState` terakhir (lokal/host) untuk mode proyektor |

### Bentuk entitas penting

```ts
interface Question {
  id: string; subject: string; grade: string; topic: string;
  difficulty: 'mudah' | 'sedang' | 'sulit';
  prompt: string; answer: string; hint: string; explanation: string;
}

interface CrosswordPuzzle {
  id: string; title: string; subject: string; topic: string;
  difficulty: Difficulty; width: number; height: number;
  grid: (string | null)[][]; words: CrosswordWord[]; unplaced: WordInput[];
}

interface CrosswordWord {
  id: string; number: number; row: number; col: number;
  direction: 'across' | 'down'; answer: string; clue: string;
}

interface BattleState {
  config: BattleConfig; questionIndex: number; groupIndex: number;
  memberCursor: Record<string, number>; turnCount: number;
  events: AnswerEvent[]; startedAt: number; finished: boolean;
}
```

### Aturan sinkronisasi

- Setiap perubahan entitas yang relevan menambah/memperbarui `syncQueue` dengan `updatedAt = Date.now()`.
- `syncNow()` membaca antrean, membandingkan `updatedAt` cloud; bila cloud lebih baru, antrean lokal dilewati (tidak menimpa).
- Setelah `set()` berhasil, entri antrean dihapus dalam satu transaksi Dexie.
- Bila Firebase belum dikonfigurasi/offline/sinkronisasi dimatikan, antrean **tetap disimpan** dan status ditampilkan di header.

---

## Firebase Realtime Database (opsional)

```
/ (root)
├── sessions/{code}
│   ├── code: string                    # 6 karakter, host yang membuat
│   ├── hostId: uid                     # hanya host yang boleh menulis state
│   ├── config: BattleConfig
│   ├── state: BattleState
│   ├── updatedAt: number
│   ├── participants/{uid}: { name, joinedAt }
│   ├── answers/{uid}/{pushId}: AnswerIntent
│   └── validated/{uid}/{pushId}: Hasil validasi Cloud Function (host-only)
├── questionBank/{questionId}
│   └── { prompt, answer, difficulty, updatedAt }   # kunci jawaban server
└── users/{uid}/{entity}/{entityId}
    └── { ...payload, updatedAt }       # salinan cloud milik pengguna
```

### `AnswerIntent`

```ts
interface AnswerIntent {
  questionId: string;
  answer: string;
  durationMs: number;
  timestamp: number;
}
```

Siswa hanya dapat menulis ke `answers/{uid}/…` miliknya. Host membaca semua niat, memverifikasi giliran, menghitung poin dengan modul `src/domain/scoring.ts`, lalu menulis `BattleState` yang baru. Lihat [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md) untuk aturan keamanan dan fungsi validasi server.

---

## Alur seed

`ensureSeeded()` dijalankan sekali saat aplikasi siap:

1. Jika `levels` kosong → materialisasi `levels1to10.ts` + `levels11to20.ts` (200 soal).
2. Untuk setiap level, bangun TTS dari 10 jawaban via `generateCrossword` dengan seed = id level.
3. Simpan `subjects`, `levels`, `puzzles`, `questions`, `profile`, `settings`, `inventory` awal.
4. Perubahan berikutnya tidak menimpa data pengguna karena seed hanya berjalan pada tabel kosong.
