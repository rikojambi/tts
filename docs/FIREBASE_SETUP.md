# Panduan Firebase CROSSWORD ADVENTURE

Firebase **opsional**. Tanpa Firebase, seluruh fitur lokal (Adventure, Quick Play, generator, bank soal, laporan) tetap bekerja. Firebase diperlukan hanya untuk:

- Classroom Battle online antar perangkat;
- sinkronisasi cloud opsional;
- validasi jawaban otoritatif via Cloud Functions.

---

## 1. Buat project Firebase

1. Buka <https://console.firebase.google.com/> → **Add project** → nama mis. `crossword-adventure`.
2. Aktifkan **Google Analytics** sesuai kebutuhan (tidak wajib).
3. Di menu **Build → Authentication**, klik **Get started**, lalu aktifkan **Anonymous** sebagai *sign-in method*.
4. Di menu **Build → Realtime Database**, buat database di region terdekat (mis. `asia-southeast1`). Mulai dalam mode **locked**; aturan akan di-deploy dari file `database.rules.json`.
5. Buka **Project settings → General → Your apps**, pilih app web `</>`, daftarkan nama `Crossword Adventure`, lalu salin `firebaseConfig`.

## 2. Isi konfigurasi lokal

```powershell
copy .env.example .env.local
```

Edit `.env.local` dengan nilai dari console:

```dotenv
VITE_FIREBASE_API_KEY=AIza...
VITE_FIREBASE_AUTH_DOMAIN=crossword-adventure.firebaseapp.com
VITE_FIREBASE_DATABASE_URL=https://crossword-adventure-default-rtdb.asia-southeast1.firebasedatabase.app
VITE_FIREBASE_PROJECT_ID=crossword-adventure
VITE_FIREBASE_STORAGE_BUCKET=crossword-adventure.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=1234567890
VITE_FIREBASE_APP_ID=1:1234567890:web:abc...
```

> `.env.local` tidak boleh di-commit ke repository. Variabel berubah saat build; jalankan ulang `npm run dev` atau `npm run build` setelah mengubahnya.

Indikator di header aplikasi akan berubah dari **Lokal** menjadi **online** bila semua variabel terisi dan perangkat terhubung.

## 3. Set project ID & deploy aturan

```powershell
npm install -g firebase-tools
firebase login
firebase use --add
# pilih project Firebase Anda, alias: default
```

Edit `.firebaserc` agar `projects.default` berisi project ID sebenarnya (file contoh memakai placeholder).

```powershell
firebase deploy --only database
```

Aturan yang dipakai adalah `database.rules.json`. Ringkasan izin:

| Path | Baca | Tulis |
| --- | --- | --- |
| `sessions/{code}` | semua user login | pembuat (host) saat membuat sesi |
| `sessions/{code}/config`, `state`, `updatedAt` | user login | host saja |
| `sessions/{code}/participants/{uid}` | user login | uid yang bersangkutan |
| `sessions/{code}/answers/{uid}/{id}` | user login | uid yang bersangkutan, sekali tulis |
| `sessions/{code}/validated/...` | host saja | Cloud Functions |
| `questionBank/{id}` | user login | server saja |
| `users/{uid}/...` | uid yang bersangkutan | uid yang bersangkutan |

Semua entitas `users/...` wajib memiliki `updatedAt` berupa angka. Panjang jawaban dibatasi 1–24 karakter dan durasi 0–3.600.000 ms.

## 4. Cloud Functions (validasi server)

Folder `functions/` berisi dua fungsi:

- `validateBattleAnswer` — callable. Memeriksa auth, kepesertaan, giliran, kesesuaian soal, lalu membandingkan jawaban dengan `questionBank/{questionId}` dan menghitung poin dengan rumus yang sama seperti klien. Hasil ditulis ke `sessions/{code}/validated/{hostUid}/...`.
- `sanitizeAnswerIntent` — trigger `onCreate` yang menormalkan huruf dan membatasi panjang jawaban serta durasi.

Langkah deploy:

```powershell
cd functions
npm install
cd ..
firebase deploy --only functions
```

Untuk memakai validasi server, unggah kunci jawaban ke `questionBank/{questionId}` menggunakan Firebase Console atau Admin SDK, lalu panggil `validateBattleAnswer` dari host sebelum `submitBattleAnswer`. Klien saat ini memvalidasi secara lokal; fungsi disediakan sebagai lapisan pengerasan opsional.

> Emulator lokal: `firebase emulators:start --only functions,database` (setelah `cd functions && npm install`).

## 5. Menguji alur online

1. Buka aplikasi di dua perangkat/browser berbeda.
2. Di perangkat guru: **Classroom Battle → Buat Sesi Online**. Catat kode 6 karakter.
3. Di perangkat siswa: masukkan kode + nama → **Gabung**.
4. Host menjawab/melihat giliran; siswa mengirim jawaban; skor berubah di leaderboard host.
5. Buka `/projector` di perangkat guru untuk tampilan layar besar.

## 6. Keamanan & privasi

- Autentikasi memakai **anonymous sign-in**; tidak ada data pribadi wajib.
- Siswa tidak dapat menulis `state` atau `config` sesi — hanya host.
- Siswa tidak dapat membaca data `users/...` milik orang lain.
- Kunci jawaban hanya ada di `questionBank` (server-side) dan di bank soal lokal perangkat; rules melarang klien menulisnya.
- PIN guru adalah pengaman lokal untuk Dashboard Guru; bukan pengganti akun Firebase. Untuk kebutuhan sekolah, pertimbangkan menggantinya dengan akun guru + custom claims.

## 7. Pemecahan masalah

| Gejala | Penyebab & solusi |
| --- | --- |
| Indikator tetap **Lokal** | Salah satu variabel `.env.local` kosong / nama salah; restart dev server |
| `permission-denied` saat gabung | Anonymous Auth belum diaktifkan atau rules belum di-deploy |
| `Firebase belum dikonfigurasi` di Battle | Variabel env tidak terbaca saat build produksi; isi sebelum `npm run build` |
| Siswa tidak muncul di participant | Kode sesi salah huruf (kode memakai huruf kapital) atau koneksi terputus |
| Fungsi gagal `questionBank missing` | Unggah soal + kunci jawaban ke RTDB atau nonaktifkan validasi server |
