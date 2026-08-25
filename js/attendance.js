/**
 * js/attendance.js
 * ---------------------------------------------------------
 * Modul Kehadiran Murid — tanda kehadiran per unit/tarikh/minggu,
 * dengan fungsi "Hadir Semua".
 *
 * Unit dipilih -> senarai murid ditapis ikut keahlian sebenar
 * (MEMBERS, ditetapkan di Tetapan > Superadmin > Murid), dan
 * dropdown Guru ditapis ikut guru penasihat unit tersebut
 * (ditetapkan di Tetapan > Superadmin > Unit/Kelab/Sukan).
 * ---------------------------------------------------------
 */

const Attendance = (() => {
  let units = [];
  let allStudents = [];
  let students = [];
  let marks = {}; // student_id -> status
  let loaded = false;

  const STATUS_OPTIONS = [
    { key: "HADIR", label: "Hadir" },
    { key: "TIDAK_HADIR", label: "Tidak Hadir" },
    { key: "LEWAT", label: "Lewat" },
    { key: "BERSEBAB", label: "Bersebab" }
  ];

  async function render() {
    const root = document.getElementById("module-attendance");
    if (!loaded) {
      root.innerHTML = `<div class="loading-inline"><div class="spinner spinner-dark"></div>Memuatkan modul kehadiran...</div>`;
      [units, allStudents] = await Promise.all([Api.getUnits(), Api.getStudents()]);
      loaded = true;
    }
    students = [];
    marks = {};
    root.innerHTML = template();
    bindEvents();
    renderList();
  }

  function template() {
    const unitOptions = units.map((u) => `<option value="${u.unit_id}">${u.unit_name}</option>`).join("");
    const minggu = Array.from({ length: 12 }, (_, i) => i + 1);
    return `
      <div class="filter-bar">
        <div class="filter-field">
          <label>Kategori</label>
          <select class="input" id="att-category">
            <option value="">Semua Kategori</option>
            ${CONFIG.CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("")}
          </select>
        </div>
        <div class="filter-field">
          <label>Unit</label>
          <select class="input" id="att-unit">
            <option value="">Pilih Unit</option>
            ${unitOptions}
          </select>
        </div>
        <div class="filter-field">
          <label>Minggu</label>
          <select class="input" id="att-minggu">
            <option value="">Pilih Minggu</option>
            ${minggu.map((m) => `<option value="${m}">Minggu ${m}</option>`).join("")}
          </select>
        </div>
        <div class="filter-field">
          <label>Tarikh</label>
          <input type="date" class="input" id="att-date" value="${new Date().toISOString().slice(0, 10)}">
        </div>
        <div class="filter-field">
          <label>Guru</label>
          <select class="input" id="att-teacher">
            <option value="">Pilih unit dahulu</option>
          </select>
        </div>
        <button class="btn btn-gold" id="att-mark-all"><i class="fa-solid fa-check-double"></i> Hadir Semua</button>
      </div>

      <div class="card">
        <div class="card-header">
          <h3>Senarai Murid</h3>
          <button class="btn btn-primary btn-sm" id="att-save"><i class="fa-solid fa-floppy-disk"></i> Simpan Kehadiran</button>
        </div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>#</th><th>Nama Murid</th><th>Kelas</th><th>Status Kehadiran</th><th>Catatan</th></tr></thead>
            <tbody id="att-tbody"></tbody>
          </table>
        </div>
        <div class="card-row-list" id="att-cardlist"></div>
      </div>
    `;
  }

  function bindEvents() {
    document.getElementById("att-unit").addEventListener("change", handleUnitChange);
    document.getElementById("att-mark-all").addEventListener("click", () => {
      students.forEach((s) => (marks[s.student_id] = "HADIR"));
      renderList();
      UI.toast("Semua murid ditanda Hadir.", "success");
    });
    document.getElementById("att-save").addEventListener("click", handleSave);
  }

  async function handleUnitChange() {
    const unitId = document.getElementById("att-unit").value;
    const teacherSelect = document.getElementById("att-teacher");
    marks = {};

    if (!unitId) {
      students = [];
      teacherSelect.innerHTML = `<option value="">Pilih unit dahulu</option>`;
      renderList();
      return;
    }

    // ---- Tapis senarai murid ikut keahlian sebenar unit ini ----
    const membersTbody = document.getElementById("att-tbody");
    membersTbody.innerHTML = UI.loadingRow(5, "Memuatkan ahli unit...");
    const members = await Api.getMembers({ unit_id: unitId });
    const memberIds = new Set(members.filter((m) => m.status !== "DELETED").map((m) => m.student_id));
    students = allStudents.filter((s) => memberIds.has(s.student_id));
    renderList();

    // ---- Tapis dropdown Guru ikut guru penasihat unit ini ----
    const unit = units.find((u) => u.unit_id === unitId);
    const teacherNames = unit && unit.teacher ? unit.teacher.split(",").map((t) => t.trim()).filter(Boolean) : [];
    if (teacherNames.length) {
      teacherSelect.innerHTML = teacherNames.map((name) => `<option value="${name}">${name}</option>`).join("");
    } else {
      teacherSelect.innerHTML = `<option value="">Tiada guru penasihat ditetapkan</option>`;
    }
  }

  async function handleSave() {
    const unitId = document.getElementById("att-unit").value;
    const date = document.getElementById("att-date").value;
    const minggu = document.getElementById("att-minggu").value;
    const category = document.getElementById("att-category").value;
    const teacher = document.getElementById("att-teacher").value;

    if (!unitId || !date) {
      UI.toast("Sila pilih unit dan tarikh sebelum menyimpan.", "error");
      return;
    }
    if (!minggu) {
      UI.toast("Sila pilih minggu (Minggu 1 - 12) sebelum menyimpan.", "error");
      return;
    }

    const records = students
      .filter((s) => marks[s.student_id])
      .map((s) => ({
        murid_id: s.student_id,
        nama_murid: s.name,
        kelas: s.class,
        status: marks[s.student_id],
        catatan: document.getElementById(`att-note-${s.student_id}`)?.value || ""
      }));

    if (!records.length) {
      UI.toast("Sila tandakan kehadiran sekurang-kurangnya seorang murid.", "error");
      return;
    }

    const saveBtn = document.getElementById("att-save");
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<div class="spinner"></div> Menyimpan...`;

    try {
      await Api.saveAttendance({ date, minggu, unit_id: unitId, kategori: category, guru: teacher, records });
      UI.toast("Kehadiran berjaya disimpan.", "success");
    } catch (err) {
      UI.toast("Gagal menyimpan kehadiran: " + err.message, "error");
    } finally {
      saveBtn.disabled = false;
      saveBtn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Simpan Kehadiran`;
    }
  }

  function renderList() {
    const tbody = document.getElementById("att-tbody");
    const cardlist = document.getElementById("att-cardlist");

    if (!students.length) {
      tbody.innerHTML = `<tr><td colspan="5">${UI.emptyState("fa-user-graduate", "Tiada murid ditemui", "Sila pilih unit untuk memaparkan senarai murid yang berdaftar sebagai ahli unit tersebut.")}</td></tr>`;
      cardlist.innerHTML = "";
      return;
    }

    tbody.innerHTML = students.map((s, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${s.name}</td>
        <td>${s.class}</td>
        <td>${statusButtons(s.student_id)}</td>
        <td><input type="text" class="input" id="att-note-${s.student_id}" placeholder="Catatan (jika ada)" style="max-width:180px;"></td>
      </tr>
    `).join("");

    cardlist.innerHTML = students.map((s, i) => `
      <div class="cr-item">
        <div class="cr-top"><span class="cr-title">${i + 1}. ${s.name}</span></div>
        <div class="cr-line"><span>Kelas</span><span>${s.class}</span></div>
        <div style="margin-top:8px;">${statusButtons(s.student_id)}</div>
      </div>
    `).join("");

    bindStatusButtons();
  }

  function statusButtons(studentId) {
    return `
      <div class="status-btn-group" data-student="${studentId}" style="display:flex;gap:6px;flex-wrap:wrap;">
        ${STATUS_OPTIONS.map((opt) => `
          <button type="button" class="btn btn-sm ${marks[studentId] === opt.key ? statusActiveClass(opt.key) : "btn-outline"}" data-status="${opt.key}">${opt.label}</button>
        `).join("")}
      </div>
    `;
  }

  function statusActiveClass(status) {
    return { HADIR: "btn-primary", TIDAK_HADIR: "btn-danger", LEWAT: "btn-gold", BERSEBAB: "btn-outline" }[status];
  }

  function bindStatusButtons() {
    document.querySelectorAll(".status-btn-group").forEach((group) => {
      group.querySelectorAll("button").forEach((btn) => {
        btn.addEventListener("click", () => {
          marks[group.dataset.student] = btn.dataset.status;
          renderList();
        });
      });
    });
  }

  return { render };
})();
