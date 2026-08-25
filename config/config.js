/**
 * config/config.js
 * ---------------------------------------------------------
 * Satu-satunya tempat untuk menetapkan konfigurasi sistem.
 * Apabila deploy Apps Script Web App, tukar API_URL sahaja.
 * ---------------------------------------------------------
 */

// TODO: MASUKKAN URL GOOGLE APPS SCRIPT DI SINI (selepas deployment Web App)
const CONFIG = {
  API_URL: "https://script.google.com/macros/s/AKfycbyFMdjfyVD1fhPTGe91vGzxwhuG344jWzjBhIwvfisCcy1E5ZDpImZat5YCTgExhItN/exec",
  SCHOOL_NAME: "SK SERI JAYA",
  SCHOOL_MOTTO: "BERILMU • BERTAQWA • ISTIQAMAH",
  SYSTEM_NAME: "SISTEM PENGURUSAN KOKURIKULUM",
  SYSTEM_SUBTITLE: "Pengurusan Data, Kehadiran, Aktiviti dan Pelaporan Kokurikulum",

  // true  = sistem guna data contoh (dummy) — sesuai untuk demo/ujian UI tanpa API.
  // false = sistem menghubungi Apps Script API sebenar melalui API_URL di atas.
  // PENTING: jangan tukar kepada false sebelum API_URL diisi dan Web App
  // sudah di-deploy (lihat README.md, bahagian Setup Google Sheets + Apps Script).
  USE_DUMMY_DATA: true,

  CURRENT_YEAR: 2026,

  CATEGORIES: [
    { id: "UNIT_BERUNIFORM", label: "Unit Beruniform" },
    { id: "KELAB_PERSATUAN", label: "Kelab & Persatuan" },
    { id: "SUKAN_PERMAINAN", label: "Sukan & Permainan" }
  ]
};

