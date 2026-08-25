# Sistem Pengurusan Kokurikulum — SK Seri Jaya

SPA (Single Page Application) untuk menguruskan kehadiran, eRPH, dan laporan
aktiviti kokurikulum. Dibina dengan HTML/CSS/JavaScript tulen, disokong oleh
Google Sheets (database) dan Google Apps Script (API), dan dihoskan melalui
GitHub + Vercel.

## Status semasa: LENGKAP — Fasa 1 hingga 8

Sistem telah dibina penuh mengikut kesemua fasa (arkitektur UI, pangkalan
data, API, integrasi frontend-backend, penjanaan PDF, muat naik gambar
Drive, log masuk berasaskan peranan, hingga semakan sintaks akhir).

**Panduan pemasangan lengkap dari A-Z** disediakan berasingan dalam
`Manual_Pemasangan_Kokurikulum_SK_Seri_Jaya.docx` — ikut dokumen tersebut
langkah demi langkah untuk menyediakan Google Sheets, Apps Script, GitHub,
dan Vercel sehingga sistem sedia digunakan sepenuhnya oleh guru.

Log masuk sistem (kongsi tunggal — lihat `apps-script/Settings.gs`):

| Nama Pengguna | Kata Laluan |
|---|---|
| `Admin` | `Adminsksj` |

Kawasan **Tetapan > Superadmin** (untuk mengurus Murid, Guru, Unit/Kelab/Sukan
dan menukar kata laluan) dikunci kata laluan berasingan:

| Kata Laluan Superadmin |
|---|
| `Adminshahril` |

Kedua-dua kata laluan boleh diubah selepas log masuk, melalui Tab
**Tetapan > Superadmin > Kata Laluan**.

## Struktur Fail

```
kokurikulum-sk-seri-jaya/
├── index.html
├── css/
│   ├── style.css        (token reka bentuk, layout, komponen kongsi)
│   ├── dashboard.css    (grid statistik & carta)
│   ├── forms.css        (borang & jadual data)
│   └── responsive.css   (breakpoint mobile/tablet)
├── js/
│   ├── app.js            (router SPA, sidebar, modal, toast)
│   ├── api.js             (lapisan API — dummy & sebenar)
│   ├── auth.js            (log masuk kongsi tunggal + Superadmin)
│   ├── dashboard.js
│   ├── attendance.js
│   ├── erph.js
│   ├── reports.js         (laporan aktiviti + laporan keseluruhan)
│   ├── students.js        (murid + guru — dipaparkan dalam Tetapan > Superadmin)
│   ├── units.js            (unit/kelab/sukan + Tetapan, termasuk Tab Superadmin)
│   └── pdf.js              (jsPDF + html2canvas)
├── assets/
│   ├── logo.png    ← GANTIKAN dengan logo sebenar SK Seri Jaya
│   └── favicon.png
├── config/
│   └── config.js    ← satu tempat untuk URL Apps Script
├── apps-script/     ← kod backend, tampal ke Extensions > Apps Script
│   ├── Config.gs      (nama sheet, header lajur, tetapan Drive)
│   ├── Utils.gs        (helper CRUD generik, initializeDatabase, seedSampleData)
│   ├── Code.gs          (doGet/doPost — router utama Web App)
│   ├── Settings.gs        (log masuk, Superadmin, kata laluan)
│   ├── Students.gs
│   ├── Teachers.gs
│   ├── Units.gs           (termasuk pengiraan agregat ahli/aktiviti/kehadiran)
│   ├── Attendance.gs
│   ├── ERPH.gs
│   ├── Reports.gs           (termasuk getDashboard — endpoint agregat)
│   └── Images.gs             (muat naik Drive)
└── vercel.json
```

Nota: modul Guru diletakkan dalam `students.js` dan modul Tetapan diletakkan
dalam `units.js` — kedua-duanya berkongsi corak table+form yang sama dengan
modul di sebelahnya, jadi digabung dalam satu fail berbanding mengulang kod.
Murid, Guru, dan Unit/Kelab/Sukan tidak lagi menu sidebar berasingan — semua
diurus dalam Tab **Tetapan > Superadmin** (lihat bahagian Log Masuk di atas).

## Setup Google Sheets + Apps Script

1. Cipta Google Sheet baharu (kosong, boleh namakan "Kokurikulum SK Seri Jaya — Database").
2. Buka **Extensions → Apps Script**.
3. Padam kandungan `Code.gs` default, kemudian cipta 11 fail `.gs` mengikut
   nama dalam folder `apps-script/` di atas, dan tampal kandungan masing-masing.
   (Guna ikon `+` di sebelah "Files" dalam editor Apps Script untuk cipta fail baharu.)
4. Dari dropdown fungsi di bahagian atas editor, pilih **initializeDatabase**, klik **Run**.
   Kali pertama jalan, Google akan minta kebenaran (authorize) — benarkan akses
   Sheets dan Drive.
5. Semak Google Sheet anda — 9 sheet (STUDENTS, TEACHERS, UNITS, MEMBERS,
   ATTENDANCE, ERPH, ACTIVITY_REPORTS, ACTIVITY_IMAGES, SETTINGS) patut
   sudah wujud dengan header. Sheet SETTINGS turut terisi kata laluan lalai
   secara automatik.
6. Pilih fungsi **seedSampleData**, klik **Run**, untuk memasukkan data contoh.
7. **Deploy → New deployment → pilih jenis "Web app"**.
   - Execute as: **Me**
   - Who has access: **Anyone** (atau ikut dasar sekolah)
8. Salin **Web app URL** yang dijana — ini akan digunakan pada langkah Vercel di bawah.

### Nota CORS penting

Apps Script Web App tidak boleh menetapkan custom response header, jadi
apabila Fasa 3 menyambungkan frontend, permintaan **POST** perlu dihantar
dengan `Content-Type: text/plain` (bukan `application/json`) untuk mengelak
pre-flight `OPTIONS` yang tidak dikendalikan oleh Apps Script. Body tetap
JSON seperti biasa — hanya header yang berbeza. Ini sudah dinota dalam
`apps-script/Code.gs`.

## Setup GitHub

1. Cipta repository baharu, contohnya `kokurikulum-sk-seri-jaya`.
2. Muat naik semua fail dalam folder ini.
3. Commit dan push ke branch utama.

## Setup Vercel

1. Log masuk ke Vercel, pilih **Import Project**.
2. Sambungkan repository GitHub di atas.
3. Vercel akan mengesan ia sebagai static site — tiada build command diperlukan.
4. Selepas deploy, buka `config/config.js` dalam repo dan kemas kini:
   ```js
   API_URL: "https://script.google.com/macros/s/XXXXXXXX/exec",
   USE_DUMMY_DATA: false,
   ```
5. Commit perubahan — Vercel akan auto-deploy semula.

## Fasa Yang Telah Disiapkan

| Fasa | Kandungan | Status |
|---|---|---|
| 1 | Architecture & UI Frontend (data dummy) | ✅ |
| 2 | Google Sheets database + Apps Script API | ✅ |
| 3 | Sambungkan frontend dengan API sebenar | ✅ |
| 4 | Modul Kehadiran, eRPH, Laporan Aktiviti (data sebenar) | ✅ |
| 5 | Image upload ke Google Drive | ✅ |
| 6 | Penjana PDF (jsPDF + html2canvas, satu muka surat) | ✅ |
| 7 | Log masuk kongsi tunggal + kawasan Superadmin berkunci kata laluan | ✅ |
| 8 | Semakan sintaks & rujukan DOM | ✅ |

Nota: log masuk depan menggunakan SATU nama pengguna + kata laluan kongsi
(bukan e-mel individu), sesuai untuk kegunaan dalaman sekolah. Kawasan
Tetapan > Superadmin pula dikunci kata laluan berasingan — dua-dua kata
laluan disimpan dalam sheet SETTINGS dan boleh diubah bila-bila masa
melalui antara muka (tiada perlu edit kod).
