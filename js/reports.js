/**
 * js/reports.js
 * ---------------------------------------------------------
 * Modul Laporan Aktiviti Kokurikulum (3 kategori) dan
 * Laporan Keseluruhan (ringkasan kehadiran bulanan).
 * Jana PDF sebenar (jsPDF + html2canvas) disambungkan Fasa 6.
 * Muat naik gambar (seksyen 9-10) disambungkan di sini —
 * fail ditukar kepada base64 dan dihantar ke Api.uploadImage(),
 * yang menyimpannya ke Google Drive melalui Images.gs.
 * ---------------------------------------------------------
 */

const Reports = (() => {
  let reports = [];
  let units = [];
  let teachers = [];
  let loaded = false;
  let selectedImages = [null, null, null, null]; // { file, caption, previewUrl }

  const CAPTIONS = ["Taklimat Aktiviti", "Aktiviti Berkumpulan", "Pelaksanaan Aktiviti", "Rumusan Aktiviti"];

  async function render() {
    const root = document.getElementById("module-reports");
    if (!loaded) {
      root.innerHTML = `<div class="loading-inline"><div class="spinner spinner-dark"></div>Memuatkan laporan aktiviti...</div>`;
      [reports, units, teachers] = await Promise.all([Api.getReports(), Api.getUnits(), Api.getTeachers()]);
      loaded = true;
    }
    root.innerHTML = template();
    bindEvents();
    renderRows();
  }

  function teacherName_(teacherIdsStr) {    const ids = String(teacherIdsStr || "").split(",").map((s) => s.trim()).filter(Boolean);
    const names = ids.map((id) => (teachers.find((x) => x.teacher_id === id) || {}).name).filter(Boolean);
    return names.length ? names.join(", ") : "-";
  }

  function unitName_(unitId) {
    const u = units.find((x) => x.unit_id === unitId);
    return u ? u.unit_name : "-";
  }

  // Guru Penasihat yang boleh dipilih ditapis ikut guru yang telah
  // ditetapkan sebagai penasihat unit tersebut (Tetapan > Superadmin >
  // Unit/Kelab/Sukan) — bukan senarai SEMUA guru dalam sistem.
  function teacherChecklistHtml_(unitId, selectedIds) {
    const unit = units.find((u) => u.unit_id === unitId);
    const allowedIds = unit && Array.isArray(unit.teacher_ids) ? unit.teacher_ids : [];
    const eligibleTeachers = teachers.filter((t) => allowedIds.includes(t.teacher_id));

    if (!unitId) {
      return `<span class="hint">Sila pilih Unit dahulu untuk memaparkan guru penasihat berdaftar.</span>`;
    }
    if (!eligibleTeachers.length) {
      return `<span class="hint">Tiada guru penasihat ditetapkan untuk unit ini. Tetapkan di Tetapan > Superadmin > Unit/Kelab/Sukan.</span>`;
    }
    return eligibleTeachers.map((t) => `
      <label style="display:flex; align-items:center; gap:8px; padding:5px 0; font-size:13px; cursor:pointer;">
        <input type="checkbox" class="rep-teacher-check" value="${t.teacher_id}" ${selectedIds.includes(t.teacher_id) ? "checked" : ""}>
        ${t.name}
      </label>
    `).join("");
  }

  function template() {
    return `
      <div class="filter-bar">
        <div class="filter-search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" class="input" id="rep-search" placeholder="Cari tajuk aktiviti atau unit..."></div>
        <div class="filter-field"><label>Kategori</label>
          <select class="input" id="rep-filter-category">
            <option value="">Semua Kategori</option>
            ${CONFIG.CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("")}
          </select>
        </div>
        <div class="filter-field"><label>Bulan</label><select class="input"><option>Semua Bulan</option></select></div>
        <button class="btn btn-primary" id="rep-new"><i class="fa-solid fa-plus"></i> Laporan Baharu</button>
      </div>

      <div class="card">
        <div class="card-header"><h3>Senarai Laporan Aktiviti</h3></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Tarikh</th><th>Unit</th><th>Aktiviti</th><th>Kehadiran</th><th>Guru</th><th>Status</th><th>Tindakan</th></tr></thead>
            <tbody id="rep-tbody"></tbody>
          </table>
        </div>
        <div class="card-row-list" id="rep-cardlist"></div>
      </div>
    `;
  }

  function bindEvents() {
    document.getElementById("rep-new").addEventListener("click", () => openForm());
    document.getElementById("rep-filter-category").addEventListener("change", renderRows);
    document.getElementById("rep-search").addEventListener("input", renderRows);
  }

  function renderRows() {
    const catFilter = document.getElementById("rep-filter-category")?.value || "";
    const search = (document.getElementById("rep-search")?.value || "").toLowerCase();
    const filtered = reports.filter((r) =>
      (!catFilter || r.category === catFilter) &&
      (!search || (r.activity_title || "").toLowerCase().includes(search) || unitName_(r.unit_id).toLowerCase().includes(search))
    );
    const tbody = document.getElementById("rep-tbody");
    const cardlist = document.getElementById("rep-cardlist");

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="7">${UI.emptyState("fa-chart-column", "Tiada rekod ditemui", "Sila tambah rekod baharu untuk memulakan pengurusan kokurikulum.")}</td></tr>`;
      cardlist.innerHTML = "";
      return;
    }

    tbody.innerHTML = filtered.map((r) => `
      <tr>
        <td>${r.date}</td>
        <td>${unitName_(r.unit_id)}</td>
        <td>${r.activity_title}</td>
        <td>${r.present}/${r.total_students}</td>
        <td>${teacherName_(r.teacher_ids)}</td>
        <td>${UI.badge(r.status)}</td>
        <td class="row-actions">
          <button class="btn btn-icon btn-outline" data-act="view" data-id="${r.report_id}" title="Lihat"><i class="fa-solid fa-eye"></i></button>
          <button class="btn btn-icon btn-outline" data-act="edit" data-id="${r.report_id}" title="Edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-icon btn-outline" data-act="pdf" data-id="${r.report_id}" title="PDF"><i class="fa-solid fa-file-pdf"></i></button>
          <button class="btn btn-icon btn-danger" data-act="delete" data-id="${r.report_id}" title="Padam"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join("");

    cardlist.innerHTML = filtered.map((r) => `
      <div class="cr-item">
        <div class="cr-top"><span class="cr-title">${r.activity_title}</span>${UI.badge(r.status)}</div>
        <div class="cr-line"><span>Tarikh</span><span>${r.date}</span></div>
        <div class="cr-line"><span>Unit</span><span>${unitName_(r.unit_id)}</span></div>
        <div class="cr-line"><span>Kehadiran</span><span>${r.present}/${r.total_students}</span></div>
        <div class="cr-actions">
          <button class="btn btn-sm btn-outline" data-act="view" data-id="${r.report_id}">Lihat</button>
          <button class="btn btn-sm btn-outline" data-act="pdf" data-id="${r.report_id}">PDF</button>
          <button class="btn btn-sm btn-danger" data-act="delete" data-id="${r.report_id}">Padam</button>
        </div>
      </div>
    `).join("");

    document.querySelectorAll("[data-act]").forEach((btn) => {
      btn.addEventListener("click", () => handleAction(btn.dataset.act, btn.dataset.id));
    });
  }

  function handleAction(act, id) {
    const rec = reports.find((r) => r.report_id === id);
    if (act === "view" || act === "edit") return openForm(rec, act === "view");
    if (act === "pdf") return openPreview(rec);
    if (act === "delete") {
      UI.confirmDialog({
        message: "Adakah anda pasti mahu memadam laporan ini? Tindakan ini tidak boleh dibuat asal.",
        onConfirm: async () => {
          try {
            await Api.deleteReport({ report_id: id });
            UI.toast("Laporan berjaya dipadam.", "success");
            loaded = false;
            render();
          } catch (err) {
            UI.toast("Gagal memadam laporan: " + err.message, "error");
          }
        }
      });
    }
  }

  function openForm(rec = {}, readOnly = false) {
    const isEdit = !!rec.report_id;
    selectedImages = [null, null, null, null];
    const unitOptions = units.map((u) => `<option value="${u.unit_id}" ${rec.unit_id === u.unit_id ? "selected" : ""}>${u.unit_name}</option>`).join("");
    const currentTeacherIds = String(rec.teacher_ids || "").split(",").map((s) => s.trim()).filter(Boolean);
    const mingguOptions = Array.from({ length: 12 }, (_, i) => i + 1)
      .map((m) => `<option value="${m}" ${String(rec.minggu) === String(m) ? "selected" : ""}>Minggu ${m}</option>`).join("");
    const imageSlots = CAPTIONS.map((cap, i) => `
      <div class="image-slot" id="img-slot-${i}" ${readOnly ? "" : `onclick="document.getElementById('img-input-${i}').click()"`} style="${readOnly ? "" : "cursor:pointer;"}">
        <span class="slot-label">Gambar ${i + 1}</span>
        <i class="fa-solid fa-image fa-lg" id="img-icon-${i}"></i>
        <span id="img-hint-${i}">Landscape sahaja</span>
        <input type="text" id="img-caption-${i}" placeholder="Kapsyen" value="${cap}" ${readOnly ? "disabled" : ""} onclick="event.stopPropagation()">
        <input type="file" id="img-input-${i}" accept="image/*" style="display:none;">
      </div>
    `).join("");

    UI.openModal({
      title: readOnly ? "Lihat Laporan Aktiviti" : (isEdit ? "Edit Laporan Aktiviti" : "Laporan Aktiviti Baharu"),
      size: "lg",
      bodyHtml: `
        <form id="rep-form">
          <div class="form-section-title">Maklumat Aktiviti</div>
          <div class="form-grid cols-3">
            <div class="form-field"><label>Tarikh</label><input type="date" class="input" id="rep-date" value="${rec.date || ""}" ${readOnly ? "disabled" : ""}></div>
            <div class="form-field"><label>Hari</label><input type="text" class="input" id="rep-day" value="${rec.day || ""}" ${readOnly ? "disabled" : ""}></div>
            <div class="form-field"><label>Minggu</label>
              <select class="input" id="rep-minggu" ${readOnly ? "disabled" : ""}><option value="">Pilih Minggu</option>${mingguOptions}</select>
            </div>
            <div class="form-field"><label>Masa Mula</label><input type="time" class="input" id="rep-time-start" value="${rec.time_start || ""}" ${readOnly ? "disabled" : ""}></div>
            <div class="form-field"><label>Masa Tamat</label><input type="time" class="input" id="rep-time-end" value="${rec.time_end || ""}" ${readOnly ? "disabled" : ""}></div>
            <div class="form-field"><label>Tempat</label><input type="text" class="input" id="rep-venue" value="${rec.venue || ""}" ${readOnly ? "disabled" : ""}></div>
            <div class="form-field"><label>Kategori</label>
              <select class="input" id="rep-category" ${readOnly ? "disabled" : ""}>${CONFIG.CATEGORIES.map((c) => `<option value="${c.id}" ${rec.category === c.id ? "selected" : ""}>${c.label}</option>`).join("")}</select>
            </div>
            <div class="form-field"><label>Unit</label><select class="input" id="rep-unit" ${readOnly ? "disabled" : ""}>${unitOptions}</select></div>
            <div class="form-field span-2">
              <label>Guru Penasihat (boleh pilih lebih daripada seorang)</label>
              <div id="rep-teacher-checklist" style="max-height:160px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius-sm); padding:8px 12px;">
                ${teacherChecklistHtml_(rec.unit_id, currentTeacherIds)}
              </div>
            </div>
            <div class="form-field"><label>Bilangan Murid</label><input type="number" class="input" id="rep-total" value="${rec.total_students || ""}" ${readOnly ? "disabled" : ""}></div>
            <div class="form-field"><label>Bilangan Hadir</label><input type="number" class="input" id="rep-present" value="${rec.present || ""}" ${readOnly ? "disabled" : ""}></div>
          </div>
          ${readOnly ? "" : `<div class="hint" id="rep-autofill-hint" style="margin-bottom:10px;">Pilih Unit dan Minggu untuk auto-isi Bilangan Murid/Hadir (daripada Kehadiran Murid) dan Objektif/Aktiviti/Hasil (daripada eRPH), jika rekod sepadan wujud.</div>`}

          <div class="form-section-title">Butiran Aktiviti</div>
          <div class="form-field"><label>Tajuk Aktiviti</label><input type="text" class="input" id="rep-title" value="${rec.activity_title || ""}" ${readOnly ? "disabled" : ""}></div>
          <div class="form-field"><label>Objektif</label><textarea class="input" id="rep-objective" ${readOnly ? "disabled" : ""}>${rec.objective || ""}</textarea></div>
          <div class="form-field"><label>Aktiviti yang Dijalankan</label><textarea class="input" id="rep-description" ${readOnly ? "disabled" : ""}>${rec.activity_description || ""}</textarea></div>
          <div class="form-field"><label>Hasil / Pencapaian</label><textarea class="input" id="rep-achievement" ${readOnly ? "disabled" : ""}>${rec.achievement || ""}</textarea></div>
          <div class="form-field"><label>Nilai Murni / Kemahiran</label><input type="text" class="input" id="rep-values" value="${rec.values_skills || ""}" ${readOnly ? "disabled" : ""}></div>

          <div class="form-section-title">Gambar Aktiviti (4 keping, landscape)</div>
          <div class="image-upload-grid">${imageSlots}</div>
          ${readOnly ? "" : `<div class="hint" style="margin-top:8px;">Klik ruang gambar untuk pilih fail. Gunakan gambar landscape — gambar portrait akan dipotong (object-fit: cover) supaya susun atur PDF tidak rosak.</div>`}
        </form>
      `,
      footerHtml: readOnly ? `
        <button class="btn btn-outline" onclick="UI.closeModal()">Tutup</button>
        <button class="btn btn-gold" onclick="Reports.previewFromId('${rec.report_id}')">Jana PDF</button>
      ` : `
        <button class="btn btn-outline" onclick="UI.closeModal()">Tutup</button>
        <button class="btn btn-primary" id="rep-save-btn">Simpan</button>
      `
    });

    if (!readOnly) {
      CAPTIONS.forEach((_, i) => {
        document.getElementById(`img-input-${i}`).addEventListener("change", (e) => handleImagePick(e, i));
      });

      // Hari auto-isi ikut Tarikh (konsisten dengan eRPH)
      document.getElementById("rep-date").addEventListener("change", (e) => {
        if (!e.target.value) return;
        const [y, m, d] = e.target.value.split("-").map(Number);
        const HARI_MS = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
        document.getElementById("rep-day").value = HARI_MS[new Date(y, m - 1, d).getDay()];
      });

      // Unit + Minggu -> auto-isi daripada Kehadiran & eRPH
      document.getElementById("rep-unit").addEventListener("change", handleAutoFillTrigger);
      document.getElementById("rep-minggu").addEventListener("change", handleAutoFillTrigger);

      // Unit dipilih -> tapis semula senarai Guru Penasihat ikut unit tersebut
      document.getElementById("rep-unit").addEventListener("change", (e) => {
        document.getElementById("rep-teacher-checklist").innerHTML = teacherChecklistHtml_(e.target.value, []);
      });

      document.getElementById("rep-save-btn").addEventListener("click", () => handleSave(rec, isEdit));
    }
  }

  async function handleAutoFillTrigger() {
    const unitId = document.getElementById("rep-unit").value;
    const minggu = document.getElementById("rep-minggu").value;
    const hint = document.getElementById("rep-autofill-hint");
    if (!unitId || !minggu) return;

    hint.textContent = "Menyemak data Kehadiran & eRPH untuk unit dan minggu ini...";

    try {
      const [attendanceSummary, erphMatch] = await Promise.all([
        Api.getAttendanceSummary(unitId, minggu),
        Api.getErphByUnitWeek(unitId, minggu)
      ]);

      const filledParts = [];

      if (attendanceSummary && attendanceSummary.found) {
        document.getElementById("rep-total").value = attendanceSummary.total;
        document.getElementById("rep-present").value = attendanceSummary.present;
        filledParts.push("Bilangan Murid/Hadir (daripada Kehadiran Murid)");
      }

      if (erphMatch) {
        if (erphMatch.objective) document.getElementById("rep-objective").value = erphMatch.objective;
        if (erphMatch.activities) document.getElementById("rep-description").value = erphMatch.activities;
        if (erphMatch.reflection) document.getElementById("rep-achievement").value = erphMatch.reflection;
        if (erphMatch.topic && !document.getElementById("rep-title").value) document.getElementById("rep-title").value = erphMatch.topic;
        filledParts.push("Objektif/Aktiviti/Hasil (daripada eRPH)");
      }

      hint.textContent = filledParts.length
        ? `Auto-isi berjaya: ${filledParts.join(" dan ")}. Anda masih boleh sunting semua medan ini.`
        : "Tiada rekod Kehadiran atau eRPH ditemui untuk unit dan minggu ini — sila isi secara manual.";
    } catch (err) {
      hint.textContent = "Gagal menyemak data auto-isi: " + err.message;
    }
  }

  function handleImagePick(e, index) {
    const file = e.target.files[0];
    if (!file) return;

    const img = new Image();
    const previewUrl = URL.createObjectURL(file);
    img.onload = () => {
      // Amaran lembut jika gambar portrait — tetap diterima, object-fit: cover akan uruskan paparan.
      if (img.height > img.width) {
        UI.toast(`Gambar ${index + 1} berorientasi potret — ia akan dipotong (cover) supaya sesuai dengan susun atur PDF.`, "info");
      }
    };
    img.src = previewUrl;

    selectedImages[index] = { file, previewUrl, caption: document.getElementById(`img-caption-${index}`).value };

    const slot = document.getElementById(`img-slot-${index}`);
    document.getElementById(`img-icon-${index}`).style.display = "none";
    document.getElementById(`img-hint-${index}`).style.display = "none";
    const existingPreview = slot.querySelector("img");
    if (existingPreview) existingPreview.remove();
    const previewImg = document.createElement("img");
    previewImg.src = previewUrl;
    slot.insertBefore(previewImg, slot.firstChild);
  }

  function fileToBase64_(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result.split(",")[1]);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  async function handleSave(rec, isEdit) {
    const unitSelect = document.getElementById("rep-unit");
    const payload = {
      report_id: isEdit ? rec.report_id : undefined,
      date: document.getElementById("rep-date").value,
      minggu: document.getElementById("rep-minggu").value,
      day: document.getElementById("rep-day").value,
      time_start: document.getElementById("rep-time-start").value,
      time_end: document.getElementById("rep-time-end").value,
      venue: document.getElementById("rep-venue").value,
      category: document.getElementById("rep-category").value,
      unit_id: unitSelect.value,
      teacher_ids: Array.from(document.querySelectorAll(".rep-teacher-check:checked")).map((el) => el.value),
      activity_title: document.getElementById("rep-title").value,
      objective: document.getElementById("rep-objective").value,
      activity_description: document.getElementById("rep-description").value,
      achievement: document.getElementById("rep-achievement").value,
      values_skills: document.getElementById("rep-values").value,
      total_students: Number(document.getElementById("rep-total").value) || 0,
      present: Number(document.getElementById("rep-present").value) || 0
    };

    if (!payload.date || !payload.unit_id || !payload.activity_title) {
      UI.toast("Sila lengkapkan tarikh, unit dan tajuk aktiviti.", "error");
      return;
    }

    const saveBtn = document.getElementById("rep-save-btn");
    saveBtn.disabled = true;
    saveBtn.innerHTML = `<div class="spinner"></div> Menyimpan...`;

    try {
      const result = await Api.saveActivityReport(payload);
      const reportId = result.report_id || rec.report_id;

      // Muat naik SEMUA gambar dalam SATU panggilan (uploadImagesBulk),
      // bukan satu panggilan berasingan setiap gambar — ini jauh lebih
      // pantas sebab folder Drive hanya dicari/dicipta sekali (lihat
      // nota kelajuan dalam Images.gs).
      const uploads = selectedImages
        .map((img, i) => (img ? { ...img, index: i } : null))
        .filter(Boolean);

      if (uploads.length) {
        saveBtn.innerHTML = `<div class="spinner"></div> Memuat naik gambar...`;
        const imagesPayload = await Promise.all(uploads.map(async (img) => ({
          image_number: img.index + 1,
          filename: img.file.name,
          mime_type: img.file.type,
          base64_data: await fileToBase64_(img.file),
          caption: document.getElementById(`img-caption-${img.index}`)?.value || ""
        })));

        await Api.uploadImagesBulk({
          report_id: reportId,
          category: payload.category,
          year: payload.date.slice(0, 4),
          images: imagesPayload
        });
      }

      UI.closeModal();
      UI.toast("Laporan aktiviti berjaya disimpan.", "success");
      loaded = false;
      render();
    } catch (err) {
      UI.toast("Gagal menyimpan laporan: " + err.message, "error");
      saveBtn.disabled = false;
      saveBtn.innerHTML = "Simpan";
    }
  }

  async function openPreview(rawRec) {
    const rec = {
      ...rawRec,
      unit: unitName_(rawRec.unit_id),
      teacher: teacherName_(rawRec.teacher_ids),
      title: rawRec.activity_title,
      total: rawRec.total_students
    };
    let images = [];
    try {
      images = await Api.getImagesByReport(rec.report_id);
    } catch (e) { /* pratonton tetap boleh dipaparkan tanpa gambar */ }

    const imageSlotsHtml = CAPTIONS.map((c, i) => {
      const img = images[i];
      return `<div class="image-slot">
        <span class="slot-label">Gambar ${i + 1}</span>
        ${img ? `<img src="${img.image_url}" style="width:100%; height:100%; object-fit:cover;">` : `<i class="fa-solid fa-image fa-lg"></i><span>${(img && img.caption) || c}</span>`}
      </div>`;
    }).join("");

    UI.openModal({
      title: "Pratonton Laporan",
      size: "lg",
      bodyHtml: `
        <div style="border:1px solid var(--border); border-radius:8px; padding:22px; background:#fff;">
          <div style="text-align:center; margin-bottom:10px;">
            <div style="font-weight:800; color:var(--navy-900); letter-spacing:0.5px;">SK SERI JAYA</div>
            <div style="font-size:11px; color:var(--gold-500); letter-spacing:0.5px;">BERILMU • BERTAQWA • ISTIQAMAH</div>
            <div style="font-size:13px; font-weight:700; margin-top:8px;">LAPORAN AKTIVITI KOKURIKULUM</div>
          </div>
          <div class="form-grid" style="font-size:12.5px; margin-top:14px;">
            <div><strong>Tarikh:</strong> ${rec.date}</div>
            <div><strong>Unit:</strong> ${rec.unit}</div>
            <div><strong>Guru Penasihat:</strong> ${rec.teacher}</div>
            <div><strong>Kehadiran:</strong> ${rec.present}/${rec.total} (${Math.round((rec.present / rec.total) * 100)}%)</div>
          </div>
          <div style="margin-top:10px;"><strong>Tajuk:</strong> ${rec.title}</div>
          <div class="image-upload-grid" style="margin-top:14px;">
            ${imageSlotsHtml}
          </div>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-outline" onclick="UI.closeModal()">Tutup</button>
        <button class="btn btn-outline">Edit</button>
        <button class="btn btn-primary" id="rep-generate-pdf">Jana PDF</button>
      `
    });
    document.getElementById("rep-generate-pdf").addEventListener("click", async (e) => {
      const btn = e.currentTarget;
      btn.disabled = true;
      btn.innerHTML = `<div class="spinner"></div> Menjana PDF...`;
      try {
        await PdfGenerator.generateActivityReportPdf(rec);
        UI.toast("PDF berjaya dijana.", "success");
      } catch (err) {
        UI.toast("Gagal menjana PDF: " + err.message, "error");
      } finally {
        btn.disabled = false;
        btn.innerHTML = "Jana PDF";
      }
    });
  }

  function previewFromId(id) {
    const rec = reports.find((r) => r.report_id === id);
    if (rec) openPreview(rec);
  }

  // ---- Laporan Keseluruhan (ringkasan kehadiran bulanan) ----
  let summaryRows = [];
  let summaryCategoryFilter = "";
  const unitLabel = { UNIT_BERUNIFORM: "Unit Beruniform", KELAB_PERSATUAN: "Kelab & Persatuan", SUKAN_PERMAINAN: "Sukan & Permainan" };

  async function renderSummary() {
    const root = document.getElementById("module-summary");
    root.innerHTML = `<div class="loading-inline"><div class="spinner spinner-dark"></div>Memuatkan ringkasan...</div>`;
    const dash = await Api.getDashboard();

    summaryRows = Object.entries(dash.unit_breakdown).map(([key, v]) => {
      const hadir = Math.round(v.members * (v.attendance / 100));
      return { key, label: unitLabel[key], members: v.members, hadir, tidakHadir: v.members - hadir, attendance: v.attendance };
    });

    root.innerHTML = `
      <div class="filter-bar">
        <div class="filter-field"><label>Bulan</label><select class="input"><option>Ogos 2026</option></select></div>
        <div class="filter-field"><label>Kategori</label>
          <select class="input" id="sum-filter-category"><option value="">Semua Kategori</option>${CONFIG.CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("")}</select>
        </div>
        <button class="btn btn-outline" id="sum-export-pdf"><i class="fa-solid fa-file-pdf"></i> Export PDF</button>
        <button class="btn btn-outline" id="sum-export-csv"><i class="fa-solid fa-file-csv"></i> Export Excel/CSV</button>
      </div>
      <div class="card">
        <div class="card-header"><h3>Laporan Kehadiran Bulanan</h3></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Unit</th><th>Jumlah Ahli</th><th>Jumlah Hadir (Anggaran)</th><th>Jumlah Tidak Hadir</th><th>Peratus Kehadiran</th></tr></thead>
            <tbody id="sum-tbody"></tbody>
          </table>
        </div>
      </div>
    `;

    document.getElementById("sum-filter-category").addEventListener("change", (e) => {
      summaryCategoryFilter = e.target.value;
      renderSummaryRows();
    });
    document.getElementById("sum-export-pdf").addEventListener("click", handleSummaryExportPdf);
    document.getElementById("sum-export-csv").addEventListener("click", handleSummaryExportCsv);

    renderSummaryRows();
  }

  function renderSummaryRows() {
    const filtered = summaryCategoryFilter ? summaryRows.filter((r) => r.key === summaryCategoryFilter) : summaryRows;
    document.getElementById("sum-tbody").innerHTML = filtered.length ? filtered.map((r) => `
      <tr>
        <td>${r.label}</td>
        <td>${r.members}</td>
        <td>${r.hadir}</td>
        <td>${r.tidakHadir}</td>
        <td>${UI.badge(r.attendance >= 90 ? "HADIR" : "LEWAT")} ${r.attendance}%</td>
      </tr>
    `).join("") : `<tr><td colspan="5">${UI.emptyState("fa-file-lines", "Tiada rekod ditemui", "Tiada data untuk kategori yang dipilih.")}</td></tr>`;
  }

  function getFilteredSummaryRows_() {
    return summaryCategoryFilter ? summaryRows.filter((r) => r.key === summaryCategoryFilter) : summaryRows;
  }

  function handleSummaryExportCsv() {
    const rows = getFilteredSummaryRows_();
    if (!rows.length) {
      UI.toast("Tiada data untuk dieksport.", "error");
      return;
    }
    const header = ["Unit", "Jumlah Ahli", "Jumlah Hadir (Anggaran)", "Jumlah Tidak Hadir", "Peratus Kehadiran (%)"];
    const csvEscape = (val) => `"${String(val).replace(/"/g, '""')}"`;
    const lines = [header.map(csvEscape).join(",")];
    rows.forEach((r) => {
      lines.push([r.label, r.members, r.hadir, r.tidakHadir, r.attendance].map(csvEscape).join(","));
    });
    // BOM supaya Excel baca aksara UTF-8 (huruf besar/kecil, simbol) dengan betul
    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const dateStr = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `Laporan_Kehadiran_Bulanan_${dateStr}.csv`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
    UI.toast("Fail CSV berjaya dimuat turun.", "success");
  }

  async function handleSummaryExportPdf(e) {
    const rows = getFilteredSummaryRows_();
    if (!rows.length) {
      UI.toast("Tiada data untuk dieksport.", "error");
      return;
    }
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-dark"></div> Menjana PDF...`;
    try {
      await PdfGenerator.generateSummaryReportPdf(rows);
      UI.toast("PDF berjaya dijana.", "success");
    } catch (err) {
      UI.toast("Gagal menjana PDF: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-file-pdf"></i> Export PDF`;
    }
  }

  return { render, renderSummary, previewFromId };
})();
