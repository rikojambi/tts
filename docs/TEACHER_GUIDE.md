# Panduan Guru CROSSWORD ADVENTURE

Panduan ini membantu guru menyiapkan soal, menjalankan Classroom Battle, memakai proyektor, dan membaca laporan hasil belajar.

## 1. Menyiapkan aplikasi

1. Buka aplikasi (http://localhost:5173 saat development, atau URL deployment).
2. Jika ingin fitur online, pastikan konfigurasi Firebase sudah diisi oleh admin/developer (lihat [`FIREBASE_SETUP.md`](FIREBASE_SETUP.md)). Mode lokal tetap bisa dipakai tanpa Firebase.
3. Buka **Pengaturan** untuk mengisi nama tampilan, memilih tema, dan mengatur waktu/poin default.
4. Buka **Dashboard Guru** dan simpan PIN di bagian **Keamanan Guru**. PIN ini melindungi dashboard dari siswa yang memakai perangkat yang sama.

## 2. Mengelola Bank Soal

**Bank Soal → Soal Baru** atau tombol edit pada soal yang ada.

Setiap soal memiliki:

- **Mata pelajaran**, **Kelas**, **Topik**, **Kesulitan** (mudah/sedang/sulit)
- **Pertanyaan / petunjuk** (minimal 8 karakter)
- **Jawaban** — wajib satu kata, 3–14 huruf, hanya A–Z. Spasi dan tanda baca akan dibuang otomatis.
- **Petunjuk tambahan** dan **Pembahasan** — ditampilkan setelah soal selesai.

Validasi menolak jawaban satu huruf, duplikat, dan teks dengan tag HTML. Gunakan **Import** untuk memasukkan file `.json` atau `.xlsx` (kolom: id, mapel, kelas, topik, kesulitan, pertanyaan, jawaban, petunjuk, pembahasan — baris pertama dianggap header). Gunakan **Excel**/**JSON** untuk mengunduh bank soal.

> Contoh soal baik: “Organ indra pada wajah yang berfungsi untuk melihat.” → `MATA`, petunjuk “Indra penglihatan manusia”, pembahasan menjelaskan fungsi mata.

## 3. Membuat Teka-Teki Silang sendiri

**Create TTS**:

1. Isi judul, mata pelajaran, kelas, topik, dan kesulitan.
2. Tambahkan minimal dua baris pertanyaan + jawaban (tombol **Tambah baris**).
3. Klik **Generate TTS**. Generator mencoba banyak persilangan dan memilih yang terbaik.
4. Jika ada kata yang tidak bisa disilangkan, kata itu muncul di daftar *Gagal ditempatkan*. Klik **Editor Manual** untuk:
   - mengubah ukuran grid (baris/kolom),
   - mengetik huruf langsung ke sel,
   - menambah/menghapus entri kata beserta posisi dan arahnya,
   - menyimpan setelah validasi grid lolos.
5. Gunakan **Unduh JSON** untuk berbagi TTS atau **Simpan** untuk memasukkannya ke bank soal lokal aplikasi.

## 4. Menjalankan Classroom Battle

Buka **Classroom Battle**.

### Mode lokal (satu perangkat / proyektor)

1. Atur jumlah kelompok (2–12), nama kelompok, dan anggota (maks. 6 per kelompok).
2. Pilih mapel, kesulitan, jumlah soal (3–30), waktu per giliran, poin benar, dan penalti lewati.
3. Klik **Mulai Local Pass and Play**.
4. Giliran bergilir antar kelompok; setiap giliran berganti anggota dalam kelompok.
5. Guru mengetik jawaban kelompok dan menekan **Kirim Jawaban**, atau **Lewati** bila waktu habis.
6. Buka **Proyektor** untuk menampilkan soal, papan jawaban, timer, dan leaderboard di layar besar.
7. Klik **Selesai & Laporan** untuk melihat analisis.

### Mode online (beberapa perangkat)

1. Klik **Buat Sesi Online**. Aplikasi membuat kode 6 karakter.
2. Bagikan kode tersebut kepada siswa.
3. Siswa membuka aplikasi di perangkat masing-masing, masuk ke **Classroom Battle**, memasukkan kode + nama, lalu **Gabung**.
4. Siswa mengirim jawaban; host memvalidasi dan memperbarui skor. Siswa **tidak** dapat mengubah skor.
5. Mode proyektor tetap bisa dibuka dari perangkat host dengan kode sesi.

> Tanpa Firebase, tombol **Buat Sesi Online** menampilkan pesan konfigurasi. Mode lokal tetap penuh.

## 5. Membaca laporan

Halaman **Laporan Classroom Battle** menampilkan:

- persentase jawaban benar/salah dan rata-rata waktu;
- peringkat kelompok;
- kontribusi tiap anggota (poin, benar/total giliran);
- soal paling sulit berdasarkan akurasi;
- perbandingan akurasi antar kelompok.

Tombol **Export Jawaban Excel**, **Export Soal Excel**, dan **Export PDF** menghasilkan file nyata yang siap dibagikan atau diarsipkan.

**Dashboard Guru** juga menampilkan akurasi keseluruhan dari semua mode dan daftar soal tersulit dari sesi terakhir.

## 6. Daily Challenge & Adventure

- **Adventure**: 20 level berurutan. Level berikutnya terbuka bila level sebelumnya mendapat minimal 1 bintang. Bintang ditentukan dari target skor dan jumlah kata benar.
- **Daily Challenge**: TTS yang sama untuk semua pemain, berubah tiap hari berdasarkan tanggal. Streak harian memberi bonus XP/koin.

Guru dapat memantau pencapaian siswa lewat **My Progress** di perangkat yang bersangkutan, atau meminta siswa menunjukkan layar achievement/riwayat.

## 7. Tips pengelolaan kelas

- Gunakan **Mode Proyektor** untuk soal & leaderboard, dan perangkat siswa hanya untuk mengirim jawaban.
- Simpan **Backup JSON** dari Dashboard Guru sebelum membersihkan browser atau reinstall.
- Atur **Poin default per jawaban** dan **Waktu default per giliran** sesuai durasi pelajaran.
- Untuk kelas besar, batasi jumlah soal 10–15 agar setiap kelompok tetap mendapat giliran.
- Jika memakai validasi server, isi `questionBank/{questionId}` dengan kunci jawaban agar skor tidak bisa dimanipulasi klien.

## 8. Masalah umum guru

| Siswa tidak bisa gabung | Periksa kode sesi (huruf kapital), Anonymous Auth, dan koneksi |
| Generated TTS ada kata tercecer | Tambah kata kunci yang lebih umum atau gunakan Editor Manual |
| Skor tidak bertambah | Pastikan jawaban ditekan tombol **Kirim Jawaban** dan masih dalam giliran |
| Laporan kosong | Sesi belum diselesaikan; klik **Selesai & Laporan** |
| Dashboard terkunci | PIN guru salah / kosongkan PIN di Pengaturan bila lupa (data lokal) |
