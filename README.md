# KINGSA Slot Undian

Website undian bergaya scrolling slot untuk data nama minimal 1.000 dan maksimal 10.000 peserta.

## Fitur

- Upload file CSV atau TXT.
- Bisa paste nama manual.
- Tombol sample data 1.000 nama.
- Validasi minimal 1.000 dan maksimal 10.000 nama.
- Animasi scrolling slot ringan, tidak menggulung semua 10.000 data secara real-time.
- Random memakai `crypto.getRandomValues()` dari browser.
- Opsi mengeluarkan pemenang dari sisa list undian, sehingga nama yang sudah menang tidak muncul lagi di pengacakan berikutnya.
- Opsi hapus nama duplikat saat import.
- Jumlah pemenang bisa diatur.
- Quick Draw.
- Mode fullscreen untuk LED/proyektor.
- Sound effect.
- Confetti.
- Riwayat pemenang tersimpan di localStorage browser.
- Export pemenang ke CSV.

## Format Data

### TXT

Satu nama per baris:

```txt
Ahmad Fauzi
Budi Santoso
Citra Lestari
```

### CSV

Disarankan memakai header `nama`:

```csv
nama
Ahmad Fauzi
Budi Santoso
Citra Lestari
```

## Cara Buka di Laptop

Paling mudah:

1. Extract ZIP.
2. Buka folder project.
3. Klik dua kali `index.html`.

Untuk mode yang lebih rapi pakai local server:

```bash
npm install
npm run dev
```

Lalu buka alamat lokal yang muncul di terminal.

## Cara Upload ke GitHub

```bash
git init
git add .
git commit -m "Initial KINGSA slot undian"
git branch -M main
git remote add origin https://github.com/USERNAME/NAMA-REPO.git
git push -u origin main
```

## Cara Deploy ke Vercel

1. Masuk ke Vercel.
2. Import repository GitHub.
3. Vercel akan membaca `vercel.json`.
4. Build command: `npm run build`.
5. Output directory: `dist`.
6. Deploy.

## Catatan Penting untuk Acara

- Sebelum acara, upload data peserta dan tes tombol `Mulai Slot` serta `Stop & Pilih`.
- Jangan refresh browser saat slot sedang berjalan.
- Riwayat pemenang tersimpan di browser/laptop yang dipakai.
- Setelah selesai, klik `Export Pemenang CSV` untuk menyimpan hasil.
- Untuk layar besar, gunakan tombol `Mode Fullscreen`.

## Struktur File

```text
kingsa-slot-undian/
├── index.html
├── style.css
├── script.js
├── sample-names-1000.csv
├── package.json
├── build.js
├── vercel.json
└── README.md
```
