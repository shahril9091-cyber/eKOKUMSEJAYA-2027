/**
 * js/api.js
 * ---------------------------------------------------------
 * Lapisan API tunggal. Setiap modul memanggil fungsi di sini,
 * bukan terus memanggil fetch() atau google.script.run.
 *
 * FASA 3: fungsi ini kini menghubungi Apps Script API sebenar
 * apabila CONFIG.USE_DUMMY_DATA = false dan CONFIG.API_URL diisi.
 * Jika tidak, ia kekal menggunakan data contoh (dummy) supaya
 * antara muka masih boleh diuji tanpa sambungan internet/API.
 *
 * NOTA CORS: Apps Script Web App tidak boleh menetapkan custom
 * response header, jadi semua permintaan POST WAJIB dihantar
 * dengan Content-Type: text/plain (bukan application/json) untuk
 * mengelak preflight OPTIONS yang tidak dikendalikan oleh Apps
 * Script. Body tetap JSON seperti biasa — hanya header berbeza.
 * ---------------------------------------------------------
 */

const Api = (() => {

  // ---- Simulasi latency rangkaian (mod dummy sahaja) ----
  const delay = (ms = 300) => new Promise((res) => setTimeout(res, ms));

  // =========================================================
  // Panggilan sebenar ke Apps Script Web App
  // =========================================================

  async function callRemoteGet(action, params = {}) {
    const query = new URLSearchParams({ action, ...params }).toString();
    const res = await fetch(`${CONFIG.API_URL}?${query}`, { method: "GET" });
    return parseApiResponse_(res);
  }

  async function callRemotePost(action, payload = {}) {
    const res = await fetch(`${CONFIG.API_URL}?action=${action}`, {
      method: "POST",
      // text/plain sengaja digunakan — lihat nota CORS di atas.
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload)
    });
    return parseApiResponse_(res);
  }

  async function parseApiResponse_(res) {
    if (!res.ok) throw new Error("Ralat rangkaian semasa menghubungi API (HTTP " + res.status + ").");
    const json = await res.json();
    if (!json.success) throw new Error(json.message || "Gagal memproses permintaan.");
    return json.data;
  }

  async function request(action, payload = {}, method = "GET") {
    if (CONFIG.USE_DUMMY_DATA) {
      await delay();
      return dummyResponse(action, payload);
    }
    return method === "GET" ? callRemoteGet(action, payload) : callRemotePost(action, payload);
  }

  // =========================================================
  // Dummy dataset (digunakan apabila USE_DUMMY_DATA = true)
  // =========================================================

  const DUMMY = {
    students: [
      { student_id: "S001", name: "Ahmad Danish bin Rahim", class: "6 Cemerlang", gender: "L", status: "AKTIF" },
      { student_id: "S002", name: "Nur Aisyah binti Zulkifli", class: "6 Cemerlang", gender: "P", status: "AKTIF" },
      { student_id: "S003", name: "Mohd Haziq bin Anuar", class: "5 Bestari", gender: "L", status: "AKTIF" },
      { student_id: "S004", name: "Siti Maryam binti Kamal", class: "5 Bestari", gender: "P", status: "AKTIF" },
      { student_id: "S005", name: "Farid Iman bin Rosli", class: "4 Amanah", gender: "L", status: "AKTIF" },
      { student_id: "S006", name: "Nurul Huda binti Salleh", class: "4 Amanah", gender: "P", status: "AKTIF" },
      { student_id: "S007", name: "Adam Haikal bin Yusof", class: "6 Cemerlang", gender: "L", status: "AKTIF" },
      { student_id: "S008", name: "Balqis Humaira binti Azman", class: "5 Bestari", gender: "P", status: "AKTIF" }
    ],

    teachers: [
      { teacher_id: "T001", name: "En. Zulkarnain b. Ismail", email: "zulkarnain@moe-dl.edu.my", position: "Penyelaras Kokurikulum", status: "AKTIF" },
      { teacher_id: "T002", name: "Pn. Rohaya bt. Ahmad", email: "rohaya@moe-dl.edu.my", position: "Guru Kanan", status: "AKTIF" },
      { teacher_id: "T003", name: "En. Faizal b. Osman", email: "faizal@moe-dl.edu.my", position: "Guru", status: "AKTIF" },
      { teacher_id: "T004", name: "Pn. Suraya bt. Kassim", email: "suraya@moe-dl.edu.my", position: "Guru", status: "AKTIF" }
    ],

    units: [
      { unit_id: "U001", category: "UNIT_BERUNIFORM", unit_name: "Pengakap", teacher: "En. Faizal b. Osman", members: 42, activities: 6, attendance: 91 },
      { unit_id: "U002", category: "UNIT_BERUNIFORM", unit_name: "Bulan Sabit Merah", teacher: "Pn. Suraya bt. Kassim", members: 35, activities: 4, attendance: 88 },
      { unit_id: "U003", category: "UNIT_BERUNIFORM", unit_name: "Puteri Islam", teacher: "Pn. Rohaya bt. Ahmad", members: 30, activities: 5, attendance: 94 },
      { unit_id: "U004", category: "KELAB_PERSATUAN", unit_name: "Kelab Bahasa Arab", teacher: "En. Zulkarnain b. Ismail", members: 26, activities: 5, attendance: 90 },
      { unit_id: "U005", category: "KELAB_PERSATUAN", unit_name: "Kelab STEM", teacher: "En. Faizal b. Osman", members: 33, activities: 7, attendance: 86 },
      { unit_id: "U006", category: "SUKAN_PERMAINAN", unit_name: "Bola Sepak", teacher: "En. Faizal b. Osman", members: 28, activities: 8, attendance: 93 },
      { unit_id: "U007", category: "SUKAN_PERMAINAN", unit_name: "Badminton", teacher: "Pn. Suraya bt. Kassim", members: 24, activities: 6, attendance: 89 }
    ],

    attendance: [
      { attendance_id: "A001", date: "2026-08-18", unit: "Pengakap", category: "UNIT_BERUNIFORM", student: "Ahmad Danish bin Rahim", class: "6 Cemerlang", status: "HADIR", teacher: "En. Faizal" },
      { attendance_id: "A002", date: "2026-08-18", unit: "Pengakap", category: "UNIT_BERUNIFORM", student: "Nur Aisyah binti Zulkifli", class: "6 Cemerlang", status: "HADIR", teacher: "En. Faizal" },
      { attendance_id: "A003", date: "2026-08-18", unit: "Pengakap", category: "UNIT_BERUNIFORM", student: "Adam Haikal bin Yusof", class: "6 Cemerlang", status: "TIDAK_HADIR", teacher: "En. Faizal" },
      { attendance_id: "A004", date: "2026-08-19", unit: "Kelab STEM", category: "KELAB_PERSATUAN", student: "Mohd Haziq bin Anuar", class: "5 Bestari", status: "LEWAT", teacher: "En. Faizal" },
      { attendance_id: "A005", date: "2026-08-19", unit: "Bola Sepak", category: "SUKAN_PERMAINAN", student: "Farid Iman bin Rosli", class: "4 Amanah", status: "HADIR", teacher: "En. Faizal" },
      { attendance_id: "A006", date: "2026-08-20", unit: "Badminton", category: "SUKAN_PERMAINAN", student: "Balqis Humaira binti Azman", class: "5 Bestari", status: "BERSEBAB", teacher: "Pn. Suraya" }
    ],

    reports: [
      { report_id: "R001", date: "2026-08-16", unit: "Pengakap", category: "UNIT_BERUNIFORM", title: "Latihan Ikatan & Simpulan", teacher: "En. Faizal b. Osman", present: 38, total: 42, status: "LENGKAP" },
      { report_id: "R002", date: "2026-08-16", unit: "Kelab STEM", category: "KELAB_PERSATUAN", title: "Eksperimen Roket Air", teacher: "En. Faizal b. Osman", present: 30, total: 33, status: "LENGKAP" },
      { report_id: "R003", date: "2026-08-17", unit: "Bola Sepak", category: "SUKAN_PERMAINAN", title: "Kem Latihan Kemahiran Asas", teacher: "En. Faizal b. Osman", present: 25, total: 28, status: "LENGKAP" },
      { report_id: "R004", date: "2026-08-23", unit: "Badminton", category: "SUKAN_PERMAINAN", title: "Perlawanan Persahabatan", teacher: "Pn. Suraya bt. Kassim", present: 22, total: 24, status: "PENDING" },
      { report_id: "R005", date: "2026-08-23", unit: "Puteri Islam", category: "UNIT_BERUNIFORM", title: "Tazkirah & Gotong-Royong", teacher: "Pn. Rohaya bt. Ahmad", present: 28, total: 30, status: "LENGKAP" }
    ],

    erph: [
      { erph_id: "E001", date: "2026-08-16", unit: "Pengakap", topic: "Latihan Ikatan & Simpulan", teacher: "En. Faizal b. Osman", status: "LENGKAP" },
      { erph_id: "E002", date: "2026-08-23", unit: "Pengakap", topic: "Navigasi Asas & Peta Pandu Arah", teacher: "En. Faizal b. Osman", status: "DRAF" }
    ],

    dashboard: {
      total_students: 8,
      total_teachers: 4,
      total_units: 7,
      total_activities: 41,
      total_attendance_records: 236,
      attendance_rate: 90.5,
      monthly_attendance: {
        labels: ["Mac", "Apr", "Mei", "Jun", "Jul", "Ogo"],
        values: [86, 88, 84, 91, 89, 90]
      },
      category_attendance: {
        labels: ["Unit Beruniform", "Kelab & Persatuan", "Sukan & Permainan"],
        values: [91, 88, 91]
      },
      category_activities: {
        labels: ["Unit Beruniform", "Kelab & Persatuan", "Sukan & Permainan"],
        values: [15, 12, 14]
      },
      unit_breakdown: {
        UNIT_BERUNIFORM: { members: 107, activities: 15, attendance: 91 },
        KELAB_PERSATUAN: { members: 59, activities: 12, attendance: 88 },
        SUKAN_PERMAINAN: { members: 52, activities: 14, attendance: 91 }
      }
    },

    settings: {
      LOGIN_PASSWORD: "Adminsksj",
      SUPERADMIN_PASSWORD: "Adminshahril"
    },

    members: []
  };

  function nextDummyId_(list, idField, prefix) {
    let max = 0;
    list.forEach((item) => {
      const n = parseInt(String(item[idField] || "").replace(prefix, ""), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return prefix + String(max + 1).padStart(3, "0");
  }

  function dummyResponse(action, payload) {
    switch (action) {
      // ---- Log masuk & Superadmin ----
      case "login": {
        if (payload.username !== "Admin" || payload.password !== DUMMY.settings.LOGIN_PASSWORD) {
          throw new Error("Nama pengguna atau kata laluan tidak sah.");
        }
        return { name: "Admin", role: "ADMIN" };
      }
      case "verifySuperadmin": {
        if (payload.password !== DUMMY.settings.SUPERADMIN_PASSWORD) {
          throw new Error("Kata laluan Superadmin tidak sah.");
        }
        return { valid: true };
      }
      case "updateSettings": {
        if (payload.currentSuperadminPassword !== DUMMY.settings.SUPERADMIN_PASSWORD) {
          throw new Error("Kata laluan Superadmin semasa tidak sah.");
        }
        if (payload.newLoginPassword) DUMMY.settings.LOGIN_PASSWORD = payload.newLoginPassword;
        if (payload.newSuperadminPassword) DUMMY.settings.SUPERADMIN_PASSWORD = payload.newSuperadminPassword;
        return { updated: true };
      }

      // ---- Bacaan ----
      case "getStudents": return structuredClone(DUMMY.students);
      case "getTeachers": return structuredClone(DUMMY.teachers);
      case "getUnits": return structuredClone(DUMMY.units);
      case "getAttendance": return structuredClone(DUMMY.attendance);
      case "getReports": return structuredClone(DUMMY.reports);
      case "getErph": return structuredClone(DUMMY.erph);
      case "getErphByUnitWeek": {
        const match = DUMMY.erph.filter((e) => e.unit === payload.unit_id || e.unit_id === payload.unit_id).find((e) => String(e.minggu) === String(payload.minggu));
        return match ? structuredClone(match) : null;
      }
      case "getDashboard": return structuredClone(DUMMY.dashboard);
      case "getImagesByReport": return [];
      case "getImageBase64": return { base64: "", mime_type: "image/jpeg" };
      case "getMembers": return structuredClone(DUMMY.members || []);
      case "getAttendanceSummary": {
        const rows = DUMMY.attendance.filter((a) => (a.unit_id === payload.unit_id || a.unit === payload.unit_id) && String(a.minggu) === String(payload.minggu));
        const total = rows.length;
        const present = rows.filter((r) => r.status === "HADIR").length;
        return { total, present, absent: total - present, found: total > 0 };
      }

      // ---- Murid ----
      case "saveStudent": {
        if (payload.student_id) {
          Object.assign(DUMMY.students.find((s) => s.student_id === payload.student_id) || {}, payload);
          return { student_id: payload.student_id };
        }
        const id = nextDummyId_(DUMMY.students, "student_id", "S");
        const obj = { student_id: id, status: "AKTIF", ...payload };
        DUMMY.students.push(obj);
        return obj;
      }
      case "deleteStudent":
        DUMMY.students = DUMMY.students.filter((s) => s.student_id !== payload.student_id);
        return { deleted: true };
      case "deleteAllStudents": {
        const count = DUMMY.students.length;
        DUMMY.students = [];
        return { deleted_count: count };
      }
      case "saveStudentsBulk": {
        const saved = [];
        const failed = [];
        (payload.students || []).forEach((row, index) => {
          if (!row.name || !row.class || !row.gender) {
            failed.push({ row: index + 1, reason: "Nama, kelas, dan jantina wajib diisi." });
            return;
          }
          const id = nextDummyId_(DUMMY.students, "student_id", "S");
          DUMMY.students.push({ student_id: id, name: row.name, class: row.class, gender: row.gender, status: "AKTIF" });
          saved.push(id);
        });
        return { saved_count: saved.length, failed_count: failed.length, failed };
      }

      // ---- Guru ----
      case "saveTeacher": {
        if (payload.teacher_id) {
          Object.assign(DUMMY.teachers.find((t) => t.teacher_id === payload.teacher_id) || {}, payload);
          return { teacher_id: payload.teacher_id };
        }
        const id = nextDummyId_(DUMMY.teachers, "teacher_id", "T");
        const obj = { teacher_id: id, status: "AKTIF", ...payload };
        DUMMY.teachers.push(obj);
        return obj;
      }
      case "deleteTeacher":
        DUMMY.teachers = DUMMY.teachers.filter((t) => t.teacher_id !== payload.teacher_id);
        return { deleted: true };
      case "deleteAllTeachers": {
        const count = DUMMY.teachers.length;
        DUMMY.teachers = [];
        return { deleted_count: count };
      }
      case "saveTeachersBulk": {
        const saved = [];
        const failed = [];
        (payload.teachers || []).forEach((row, index) => {
          if (!row.name || !row.email || !row.position) {
            failed.push({ row: index + 1, reason: "Nama, e-mel, dan jawatan wajib diisi." });
            return;
          }
          const id = nextDummyId_(DUMMY.teachers, "teacher_id", "T");
          DUMMY.teachers.push({ teacher_id: id, name: row.name, email: row.email, position: row.position, status: "AKTIF" });
          saved.push(id);
        });
        return { saved_count: saved.length, failed_count: failed.length, failed };
      }

      // ---- Unit ----
      case "saveUnit": {
        if (payload.unit_id) {
          Object.assign(DUMMY.units.find((u) => u.unit_id === payload.unit_id) || {}, payload);
          return { unit_id: payload.unit_id };
        }
        const id = nextDummyId_(DUMMY.units, "unit_id", "U");
        const obj = { unit_id: id, members: 0, activities: 0, attendance: 0, ...payload };
        DUMMY.units.push(obj);
        return obj;
      }
      case "deleteUnit":
        DUMMY.units = DUMMY.units.filter((u) => u.unit_id !== payload.unit_id);
        return { deleted: true };
      case "setStudentUnits": {
        DUMMY.members = (DUMMY.members || []).filter((m) => m.student_id !== payload.student_id);
        (payload.unit_ids || []).forEach((unitId) => {
          DUMMY.members.push({ member_id: nextDummyId_(DUMMY.members, "member_id", "M"), student_id: payload.student_id, unit_id: unitId, status: "AKTIF" });
        });
        return { student_id: payload.student_id, unit_ids: payload.unit_ids };
      }

      // ---- Kehadiran ----
      case "saveAttendance": {
        const ids = [];
        (payload.records || []).forEach((rec) => {
          const id = nextDummyId_(DUMMY.attendance, "attendance_id", "A");
          DUMMY.attendance.push({
            attendance_id: id, date: payload.date, unit: payload.unit_id, category: payload.kategori,
            student: rec.nama_murid, class: rec.kelas, status: rec.status, teacher: payload.guru
          });
          ids.push(id);
        });
        return { saved_count: ids.length, attendance_ids: ids };
      }

      // ---- eRPH ----
      case "saveERPH": {
        if (payload.erph_id) {
          Object.assign(DUMMY.erph.find((e) => e.erph_id === payload.erph_id) || {}, payload);
          return { erph_id: payload.erph_id };
        }
        const id = nextDummyId_(DUMMY.erph, "erph_id", "E");
        const obj = { erph_id: id, status: "DRAF", ...payload };
        DUMMY.erph.push(obj);
        return obj;
      }
      case "deleteERPH":
        DUMMY.erph = DUMMY.erph.filter((e) => e.erph_id !== payload.erph_id);
        return { deleted: true };

      // ---- Laporan Aktiviti ----
      case "saveActivityReport": {
        if (payload.report_id) {
          Object.assign(DUMMY.reports.find((r) => r.report_id === payload.report_id) || {}, payload);
          return { report_id: payload.report_id };
        }
        const id = nextDummyId_(DUMMY.reports, "report_id", "R");
        const obj = { report_id: id, status: "LENGKAP", ...payload };
        DUMMY.reports.push(obj);
        return obj;
      }
      case "deleteReport":
        DUMMY.reports = DUMMY.reports.filter((r) => r.report_id !== payload.report_id);
        return { deleted: true };

      case "uploadImage":
        return { image_id: "IMG" + Date.now(), image_url: "", caption: payload.caption || "" };

      default:
        return null;
    }
  }

  return {
    login: (username, password) => request("login", { username, password }, "POST"),
    verifySuperadmin: (password) => request("verifySuperadmin", { password }, "POST"),
    updateSettings: (data) => request("updateSettings", data, "POST"),

    getStudents: () => request("getStudents"),
    getTeachers: () => request("getTeachers"),
    getUnits: () => request("getUnits"),
    getAttendance: (params) => request("getAttendance", params, "GET"),
    getReports: (params) => request("getReports", params, "GET"),
    getErph: (params) => request("getErph", params, "GET"),
    getErphByUnitWeek: (unitId, minggu) => request("getErphByUnitWeek", { unit_id: unitId, minggu }, "GET"),
    getDashboard: () => request("getDashboard"),
    getImagesByReport: (reportId) => request("getImagesByReport", { report_id: reportId }, "GET"),
    getImageBase64: (fileId) => request("getImageBase64", { file_id: fileId }, "GET"),
    getMembers: (params) => request("getMembers", params, "GET"),
    getAttendanceSummary: (unitId, minggu) => request("getAttendanceSummary", { unit_id: unitId, minggu }, "GET"),

    saveStudent: (data) => request("saveStudent", data, "POST"),
    deleteStudent: (data) => request("deleteStudent", data, "POST"),
    saveStudentsBulk: (students) => request("saveStudentsBulk", { students }, "POST"),
    deleteAllStudents: () => request("deleteAllStudents", {}, "POST"),
    saveTeacher: (data) => request("saveTeacher", data, "POST"),
    deleteTeacher: (data) => request("deleteTeacher", data, "POST"),
    saveTeachersBulk: (teachers) => request("saveTeachersBulk", { teachers }, "POST"),
    deleteAllTeachers: () => request("deleteAllTeachers", {}, "POST"),
    setStudentUnits: (studentId, unitIds) => request("setStudentUnits", { student_id: studentId, unit_ids: unitIds }, "POST"),
    saveUnit: (data) => request("saveUnit", data, "POST"),
    deleteUnit: (data) => request("deleteUnit", data, "POST"),
    saveAttendance: (data) => request("saveAttendance", data, "POST"),
    saveERPH: (data) => request("saveERPH", data, "POST"),
    deleteErph: (data) => request("deleteERPH", data, "POST"),
    saveActivityReport: (data) => request("saveActivityReport", data, "POST"),
    deleteReport: (data) => request("deleteReport", data, "POST"),
    uploadImage: (data) => request("uploadImage", data, "POST")
  };
})();
