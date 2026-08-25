/**
 * js/erph.js
 * ---------------------------------------------------------
 * Modul eRPH Kokurikulum — senarai, cipta/edit, dan duplicate.
 *
 * - Hari auto-isi daripada Tarikh yang dipilih.
 * - Guru Pembimbing kini dropdown, ditarik terus daripada
 *   senarai Guru (Tetapan > Superadmin), bukan taip manual.
 * - Minggu (1-12) disertakan supaya Laporan Aktiviti boleh
 *   auto-isi Objektif/Aktiviti/Hasil daripada eRPH unit+minggu
 *   yang sama (lihat reports.js).
 * - Masa Mula & Masa Tamat (bukan satu medan "Masa" sahaja).
 * - Nama Unit dipaparkan melalui carian unit_id -> unit_name
 *   (rekod sebenar daripada API hanya menyimpan unit_id, bukan
 *   nama terus) — mengelak "undefined" pada jadual/borang.
 * ---------------------------------------------------------
 */

const Erph = (() => {
  let records = [];
  let units = [];
  let teachers = [];
  let loaded = false;

  const HARI_MS = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];

  async function render() {
    const root = document.getElementById("module-erph");
    if (!loaded) {
      root.innerHTML = `<div class="loading-inline"><div class="spinner spinner-dark"></div>Memuatkan eRPH...</div>`;
      [records, units, teachers] = await Promise.all([Api.getErph(), Api.getUnits(), Api.getTeachers()]);
      loaded = true;
    }
    root.innerHTML = template();
    bindEvents();
  }

  function template() {
    return `
      <div class="filter-bar">
        <div class="filter-search">
          <i class="fa-solid fa-magnifying-glass"></i>
          <input type="text" class="input" placeholder="Cari mengikut tajuk atau unit...">
        </div>
        <div class="filter-field"><label>Unit</label><select class="input"><option>Semua Unit</option></select></div>
        <div class="filter-field"><label>Bulan</label><select class="input"><option>Semua Bulan</option></select></div>
        <button class="btn btn-primary" id="erph-new"><i class="fa-solid fa-plus"></i> eRPH Baharu</button>
      </div>

      <div class="card">
        <div class="card-header"><h3>Senarai eRPH</h3></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Tarikh</th><th>Minggu</th><th>Unit</th><th>Tajuk</th><th>Guru Pembimbing</th><th>Status</th><th>Tindakan</th></tr></thead>
            <tbody id="erph-tbody"></tbody>
          </table>
        </div>
        <div class="card-row-list" id="erph-cardlist"></div>
      </div>
    `;
  }

  function bindEvents() {
    document.getElementById("erph-new").addEventListener("click", () => openForm());
    renderRows();
  }

  function teacherName_(teacherId) {
    const t = teachers.find((x) => x.teacher_id === teacherId);
    return t ? t.name : "-";
  }

  function unitName_(unitId) {
    const u = units.find((x) => x.unit_id === unitId);
    return u ? u.unit_name : "-";
  }

  function renderRows() {
    const tbody = document.getElementById("erph-tbody");
    const cardlist = document.getElementById("erph-cardlist");

    if (!records.length) {
      tbody.innerHTML = `<tr><td colspan="7">${UI.emptyState("fa-file-pen", "Tiada rekod ditemui", "Sila tambah rekod baharu untuk memulakan pengurusan kokurikulum.")}</td></tr>`;
      cardlist.innerHTML = "";
      return;
    }

    tbody.innerHTML = records.map((r) => `
      <tr>
        <td>${r.date}</td>
        <td>${r.minggu ? "Minggu " + r.minggu : "-"}</td>
        <td>${unitName_(r.unit_id)}</td>
        <td>${r.topic}</td>
        <td>${teacherName_(r.teacher_id)}</td>
        <td>${UI.badge(r.status)}</td>
        <td class="row-actions">
          <button class="btn btn-icon btn-outline" data-act="edit" data-id="${r.erph_id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-icon btn-outline" data-act="duplicate" data-id="${r.erph_id}" title="Duplicate"><i class="fa-regular fa-copy"></i></button>
          <button class="btn btn-icon btn-outline" data-act="pdf" data-id="${r.erph_id}" title="Jana PDF"><i class="fa-solid fa-file-pdf"></i></button>
          <button class="btn btn-icon btn-danger" data-act="delete" data-id="${r.erph_id}" title="Padam"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join("");

    cardlist.innerHTML = records.map((r) => `
      <div class="cr-item">
        <div class="cr-top"><span class="cr-title">${r.topic}</span>${UI.badge(r.status)}</div>
        <div class="cr-line"><span>Tarikh</span><span>${r.date}${r.minggu ? " (Minggu " + r.minggu + ")" : ""}</span></div>
        <div class="cr-line"><span>Unit</span><span>${unitName_(r.unit_id)}</span></div>
        <div class="cr-line"><span>Guru</span><span>${teacherName_(r.teacher_id)}</span></div>
        <div class="cr-actions">
          <button class="btn btn-sm btn-outline" data-act="edit" data-id="${r.erph_id}">Edit</button>
          <button class="btn btn-sm btn-outline" data-act="duplicate" data-id="${r.erph_id}">Duplicate</button>
          <button class="btn btn-sm btn-danger" data-act="delete" data-id="${r.erph_id}">Padam</button>
        </div>
      </div>
    `).join("");

    document.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => handleAction(btn.dataset.act, btn.dataset.id));
    });
  }

  function handleAction(act, id) {
    const rec = records.find((r) => r.erph_id === id);
    if (act === "edit") return openForm(rec);
    if (act === "duplicate") return openForm({ ...rec, erph_id: null, topic: rec.topic + " (Salinan)" });
    if (act === "pdf") return handlePdf(rec);
    if (act === "delete") {
      UI.confirmDialog({
        message: "Adakah anda pasti mahu memadam eRPH ini? Tindakan ini tidak boleh dibuat asal.",
        onConfirm: async () => {
          try {
            await Api.deleteErph({ erph_id: id });
            UI.toast("eRPH berjaya dipadam.", "success");
            loaded = false;
            render();
          } catch (err) {
            UI.toast("Gagal memadam eRPH: " + err.message, "error");
          }
        }
      });
    }
  }

  async function handlePdf(rec) {
    UI.toast("Menjana PDF...", "info");
    try {
      await PdfGenerator.generateErphPdf({ ...rec, unit: unitName_(rec.unit_id), teacher: teacherName_(rec.teacher_id) });
      UI.toast("PDF eRPH berjaya dijana.", "success");
    } catch (err) {
      UI.toast("Gagal menjana PDF: " + err.message, "error");
    }
  }

  function openForm(rec = {}) {
    const isEdit = !!rec.erph_id;
    const unitOptions = units.map((u) => `<option value="${u.unit_id}" ${rec.unit_id === u.unit_id ? "selected" : ""}>${u.unit_name}</option>`).join("");
    const teacherOptions = teachers.map((t) => `<option value="${t.teacher_id}" ${rec.teacher_id === t.teacher_id ? "selected" : ""}>${t.name}</option>`).join("");
    const mingguOptions = Array.from({ length: 12 }, (_, i) => i + 1)
      .map((m) => `<option value="${m}" ${String(rec.minggu) === String(m) ? "selected" : ""}>Minggu ${m}</option>`).join("");

    UI.openModal({
      title: isEdit ? "Edit eRPH" : "eRPH Baharu",
      size: "lg",
      bodyHtml: `
        <form id="erph-form">
          <div class="form-section-title">Maklumat Aktiviti</div>
          <div class="form-grid cols-3">
            <div class="form-field"><label>Tarikh</label><input type="date" class="input" id="erph-date" value="${rec.date || ""}"></div>
            <div class="form-field"><label>Hari</label><input type="text" class="input" id="erph-day" placeholder="Auto-isi ikut tarikh" value="${rec.day || ""}" readonly></div>
            <div class="form-field"><label>Minggu</label><select class="input" id="erph-minggu"><option value="">Pilih Minggu</option>${mingguOptions}</select></div>
            <div class="form-field"><label>Masa Mula</label><input type="time" class="input" id="erph-time-start" value="${rec.time_start || ""}"></div>
            <div class="form-field"><label>Masa Tamat</label><input type="time" class="input" id="erph-time-end" value="${rec.time_end || ""}"></div>
            <div class="form-field"><label>Kategori</label>
              <select class="input" id="erph-category">${CONFIG.CATEGORIES.map((c) => `<option value="${c.id}" ${rec.category === c.id ? "selected" : ""}>${c.label}</option>`).join("")}</select>
            </div>
            <div class="form-field"><label>Unit</label><select class="input" id="erph-unit">${unitOptions}</select></div>
            <div class="form-field span-2"><label>Guru Pembimbing</label><select class="input" id="erph-teacher"><option value="">Pilih Guru</option>${teacherOptions}</select></div>
          </div>
          <div class="form-section-title">Butiran eRPH</div>
          <div class="form-field"><label>Tajuk / Aktiviti</label><input type="text" class="input" id="erph-topic" value="${rec.topic || ""}"></div>
          <div class="form-field"><label>Objektif</label><textarea class="input" id="erph-objective">${rec.objective || ""}</textarea></div>
          <div class="form-field"><label>Aktiviti / Langkah</label><textarea class="input" id="erph-activities">${rec.activities || ""}</textarea></div>
          <div class="form-grid">
            <div class="form-field"><label>Nilai / Kemahiran</label><input type="text" class="input" id="erph-values" value="${rec.values || ""}"></div>
            <div class="form-field"><label>Bahan / Peralatan</label><input type="text" class="input" id="erph-materials" value="${rec.materials || ""}"></div>
          </div>
          <div class="form-field"><label>Refleksi</label><textarea class="input" id="erph-reflection">${rec.reflection || ""}</textarea></div>
          <div class="form-field"><label>Catatan</label><textarea class="input" id="erph-remarks">${rec.remarks || ""}</textarea></div>
        </form>
      `,
      footerHtml: `
        <button class="btn btn-outline" onclick="UI.closeModal()">Tutup</button>
        <button class="btn btn-primary" id="erph-save-btn">Simpan</button>
      `
    });

    document.getElementById("erph-date").addEventListener("change", (e) => {
      if (!e.target.value) return;
      // Elak isu zon masa: bina Date daripada komponen tarikh terus (bukan parse string terus).
      const [y, m, d] = e.target.value.split("-").map(Number);
      const dateObj = new Date(y, m - 1, d);
      document.getElementById("erph-day").value = HARI_MS[dateObj.getDay()];
    });
    // Auto-isi serta-merta jika tarikh sudah ada (rekod edit) tetapi Hari masih kosong
    if (rec.date && !rec.day) {
      const [y, m, d] = rec.date.split("-").map(Number);
      document.getElementById("erph-day").value = HARI_MS[new Date(y, m - 1, d).getDay()];
    }

    document.getElementById("erph-save-btn").addEventListener("click", () => handleSave(rec, isEdit));
  }

  async function handleSave(rec, isEdit) {
    const unitSelect = document.getElementById("erph-unit");

    const payload = {
      erph_id: isEdit ? rec.erph_id : undefined,
      date: document.getElementById("erph-date").value,
      day: document.getElementById("erph-day").value,
      minggu: document.getElementById("erph-minggu").value,
      time_start: document.getElementById("erph-time-start").value,
      time_end: document.getElementById("erph-time-end").value,
      category: document.getElementById("erph-category").value,
      unit_id: unitSelect.value,
      teacher_id: document.getElementById("erph-teacher").value,
      topic: document.getElementById("erph-topic").value,
      objective: document.getElementById("erph-objective").value,
      activities: document.getElementById("erph-activities").value,
      values: document.getElementById("erph-values").value,
      materials: document.getElementById("erph-materials").value,
      reflection: document.getElementById("erph-reflection").value,
      remarks: document.getElementById("erph-remarks").value
    };

    if (!payload.date || !payload.unit_id || !payload.topic) {
      UI.toast("Sila lengkapkan tarikh, unit dan tajuk.", "error");
      return;
    }

    const saveBtn = document.getElementById("erph-save-btn");
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<div class="spinner"></div> Menyimpan...`;

    try {
      await Api.saveERPH(payload);
      UI.closeModal();
      UI.toast("eRPH berjaya disimpan.", "success");
      loaded = false; // paksa muat semula supaya senarai terkini
      render();
    } catch (err) {
      UI.toast("Gagal menyimpan eRPH: " + err.message, "error");
      saveBtn.disabled = false;
      saveBtn.innerHTML = "Simpan";
    }
  }

  return { render };
})();
