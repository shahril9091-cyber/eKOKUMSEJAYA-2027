/**
 * js/students.js
 * ---------------------------------------------------------
 * Modul Murid dan Modul Guru / Pengurusan (kedua-duanya
 * data "orang" — dikekalkan dalam satu fail berbanding
 * dipisah supaya tidak mengulang kod table+form yang sama).
 *
 * Murid kini boleh ditetapkan keahlian Unit/Kelab/Sukan terus
 * dalam borang (checkbox, sokong berbilang unit sekaligus).
 * ---------------------------------------------------------
 */

const Students = (() => {
  let students = [];
  let units = [];
  let loaded = false;

  async function render() {
    const root = document.getElementById("sa-panel-murid");
    if (!root) return;
    if (!loaded) {
      root.innerHTML = `<div class="loading-inline"><div class="spinner spinner-dark"></div>Memuatkan senarai murid...</div>`;
      [students, units] = await Promise.all([Api.getStudents(), Api.getUnits()]);
      loaded = true;
    }
    root.innerHTML = `
      <div class="filter-bar">
        <div class="filter-search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" class="input" id="stu-search" placeholder="Cari nama murid..."></div>
        <div class="filter-field"><label>Kelas</label><select class="input"><option>Semua Kelas</option></select></div>
        <button class="btn btn-outline" id="stu-bulk"><i class="fa-solid fa-layer-group"></i> Tambah Pukal</button>
        <button class="btn btn-outline" id="stu-delete-all" style="color:var(--danger-600); border-color:var(--danger-100);"><i class="fa-solid fa-trash-can"></i> Padam Semua</button>
        <button class="btn btn-primary" id="stu-new"><i class="fa-solid fa-plus"></i> Tambah Murid</button>
      </div>
      <div class="card">
        <div class="card-header"><h3>Senarai Murid</h3></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Nama</th><th>Kelas</th><th>Jantina</th><th>Status</th><th>Tindakan</th></tr></thead>
            <tbody id="stu-tbody"></tbody>
          </table>
        </div>
        <div class="card-row-list" id="stu-cardlist"></div>
      </div>
    `;
    document.getElementById("stu-new").addEventListener("click", () => openForm());
    document.getElementById("stu-bulk").addEventListener("click", () => openBulkForm());
    document.getElementById("stu-delete-all").addEventListener("click", handleDeleteAll);
    document.getElementById("stu-search").addEventListener("input", (e) => renderRows(e.target.value));
    renderRows();
  }

  function renderRows(search = "") {
    const filtered = students.filter((s) => s.name.toLowerCase().includes(search.toLowerCase()));
    const tbody = document.getElementById("stu-tbody");
    const cardlist = document.getElementById("stu-cardlist");

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6">${UI.emptyState("fa-user-graduate", "Tiada rekod ditemui", "Sila tambah rekod baharu untuk memulakan pengurusan kokurikulum.")}</td></tr>`;
      cardlist.innerHTML = "";
      return;
    }

    tbody.innerHTML = filtered.map((s) => `
      <tr>
        <td>${s.student_id}</td><td>${s.name}</td><td>${s.class}</td><td>${s.gender}</td><td>${UI.badge(s.status)}</td>
        <td class="row-actions">
          <button class="btn btn-icon btn-outline" data-id="${s.student_id}" data-act="edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-icon btn-danger" data-id="${s.student_id}" data-act="delete"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join("");

    cardlist.innerHTML = filtered.map((s) => `
      <div class="cr-item">
        <div class="cr-top"><span class="cr-title">${s.name}</span>${UI.badge(s.status)}</div>
        <div class="cr-line"><span>Kelas</span><span>${s.class}</span></div>
        <div class="cr-line"><span>Jantina</span><span>${s.gender}</span></div>
        <div class="cr-actions">
          <button class="btn btn-sm btn-outline" data-id="${s.student_id}" data-act="edit">Edit</button>
          <button class="btn btn-sm btn-danger" data-id="${s.student_id}" data-act="delete">Padam</button>
        </div>
      </div>
    `).join("");

    document.querySelectorAll("#sa-panel-murid [data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rec = students.find((s) => s.student_id === btn.dataset.id);
        if (btn.dataset.act === "edit") openForm(rec);
        else UI.confirmDialog({
          message: "Adakah anda pasti mahu memadam murid ini? Tindakan ini tidak boleh dibuat asal.",
          onConfirm: async () => {
            try {
              await Api.deleteStudent({ student_id: rec.student_id });
              UI.toast("Murid berjaya dipadam.", "success");
              loaded = false;
              render();
            } catch (err) {
              UI.toast("Gagal memadam murid: " + err.message, "error");
            }
          }
        });
      });
    });
  }

  function handleDeleteAll() {
    if (!students.length) {
      UI.toast("Tiada murid untuk dipadam.", "error");
      return;
    }
    UI.confirmDialog({
      title: "Padam SEMUA Murid",
      message: `Adakah anda PASTI mahu memadam SEMUA ${students.length} rekod murid? Tindakan ini tidak boleh dibuat asal.`,
      confirmLabel: "Ya, Padam Semua",
      onConfirm: async () => {
        try {
          const result = await Api.deleteAllStudents();
          UI.toast(`${result.deleted_count} murid berjaya dipadam.`, "success");
          loaded = false;
          render();
        } catch (err) {
          UI.toast("Gagal memadam semua murid: " + err.message, "error");
        }
      }
    });
  }

  const CAT_LABEL = { UNIT_BERUNIFORM: "Unit Beruniform", KELAB_PERSATUAN: "Kelab & Persatuan", SUKAN_PERMAINAN: "Sukan & Permainan" };

  async function openForm(rec = {}) {
    const isEdit = !!rec.student_id;
    let currentUnitIds = [];
    if (isEdit) {
      try {
        const members = await Api.getMembers({ student_id: rec.student_id });
        currentUnitIds = members.filter((m) => m.status !== "DELETED").map((m) => m.unit_id);
      } catch (e) { /* biar kosong jika gagal — murid masih boleh diedit */ }
    }

    const unitsByCategory = {};
    Object.keys(CAT_LABEL).forEach((cat) => (unitsByCategory[cat] = units.filter((u) => u.category === cat)));

    const membershipHtml = Object.keys(CAT_LABEL).map((cat) => `
      <div style="margin-bottom:10px;">
        <div style="font-size:11.5px; font-weight:700; color:var(--text-400); text-transform:uppercase; margin-bottom:4px;">${CAT_LABEL[cat]}</div>
        ${unitsByCategory[cat].length ? unitsByCategory[cat].map((u) => `
          <label style="display:flex; align-items:center; gap:8px; padding:4px 0; font-size:13px; cursor:pointer;">
            <input type="checkbox" class="stu-unit-check" value="${u.unit_id}" ${currentUnitIds.includes(u.unit_id) ? "checked" : ""}>
            ${u.unit_name}
          </label>
        `).join("") : `<span class="hint">Tiada unit dalam kategori ini</span>`}
      </div>
    `).join("");

    UI.openModal({
      title: isEdit ? "Edit Murid" : "Tambah Murid",
      bodyHtml: `
        <div class="form-field"><label>Nama Penuh</label><input type="text" class="input" id="stu-name" value="${rec.name || ""}"></div>
        <div class="form-grid">
          <div class="form-field"><label>Kelas</label><input type="text" class="input" id="stu-class" value="${rec.class || ""}"></div>
          <div class="form-field"><label>Jantina</label>
            <select class="input" id="stu-gender"><option ${rec.gender === "L" ? "selected" : ""}>L</option><option ${rec.gender === "P" ? "selected" : ""}>P</option></select>
          </div>
        </div>
        <div class="form-field">
          <label>Keahlian Unit / Kelab / Sukan</label>
          <div style="max-height:240px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius-sm); padding:8px 12px;">
            ${membershipHtml}
          </div>
          <div class="hint">Boleh pilih lebih daripada satu unit merentasi kategori berbeza.</div>
        </div>
      `,
      footerHtml: `<button class="btn btn-outline" onclick="UI.closeModal()">Tutup</button><button class="btn btn-primary" id="stu-save-btn">Simpan</button>`
    });
    document.getElementById("stu-save-btn").addEventListener("click", async () => {
      const payload = {
        student_id: isEdit ? rec.student_id : undefined,
        name: document.getElementById("stu-name").value,
        class: document.getElementById("stu-class").value,
        gender: document.getElementById("stu-gender").value
      };
      if (!payload.name || !payload.class) {
        UI.toast("Sila lengkapkan nama dan kelas.", "error");
        return;
      }
      const btn = document.getElementById("stu-save-btn");
      btn.disabled = true;
      btn.innerHTML = `<div class="spinner"></div> Menyimpan...`;
      try {
        const result = await Api.saveStudent(payload);
        const studentId = (result && result.student_id) || rec.student_id;
        const unitIds = Array.from(document.querySelectorAll(".stu-unit-check:checked")).map((el) => el.value);
        if (studentId) {
          await Api.setStudentUnits(studentId, unitIds);
        }
        UI.closeModal();
        UI.toast("Data murid berjaya disimpan.", "success");
        loaded = false;
        render();
      } catch (err) {
        UI.toast("Gagal menyimpan murid: " + err.message, "error");
        btn.disabled = false;
        btn.innerHTML = "Simpan";
      }
    });
  }

  function openBulkForm() {
    UI.openModal({
      title: "Tambah Murid Secara Pukal",
      size: "lg",
      bodyHtml: `
        <p class="hint" style="margin-bottom:10px;">Satu murid setiap baris, dipisahkan koma, mengikut format: <strong>Nama, Kelas, Jantina (L/P)</strong></p>
        <textarea class="input" id="stu-bulk-text" rows="10" style="font-family:Consolas,monospace; font-size:12.5px;" placeholder="Ahmad Danish bin Rahim, 6 Cemerlang, L
Nur Aisyah binti Zulkifli, 6 Cemerlang, P
Mohd Haziq bin Anuar, 5 Bestari, L"></textarea>
        <div class="hint" style="margin-top:8px;">Salin terus daripada Excel/Google Sheets (3 lajur: Nama, Kelas, Jantina) dan tampal terus di sini — sistem terima format tampalan Excel asal (tiada perlu tambah koma). Keahlian unit boleh ditetapkan kemudian melalui butang "Ahli" pada senarai Unit/Kelab/Sukan.</div>
        <div id="stu-bulk-result" style="margin-top:12px;"></div>
      `,
      footerHtml: `<button class="btn btn-outline" onclick="UI.closeModal()">Tutup</button><button class="btn btn-primary" id="stu-bulk-save-btn"><i class="fa-solid fa-upload"></i> Muat Naik</button>`
    });
    document.getElementById("stu-bulk-save-btn").addEventListener("click", handleBulkSave);
  }

  function parseBulkRows_(text, fieldNames) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(/\t|,/).map((p) => p.trim());
        const obj = {};
        fieldNames.forEach((f, i) => (obj[f] = parts[i] || ""));
        return obj;
      });
  }

  async function handleBulkSave() {
    const text = document.getElementById("stu-bulk-text").value;
    const rows = parseBulkRows_(text, ["name", "class", "gender"]).map((r) => ({
      ...r,
      gender: r.gender.toUpperCase()
    }));

    if (!rows.length) {
      UI.toast("Sila tampal sekurang-kurangnya satu baris murid.", "error");
      return;
    }

    const btn = document.getElementById("stu-bulk-save-btn");
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner"></div> Memuat naik...`;

    try {
      const result = await Api.saveStudentsBulk(rows);
      const resultEl = document.getElementById("stu-bulk-result");
      resultEl.innerHTML = `
        <div class="badge badge-success" style="margin-right:6px;">${result.saved_count} berjaya</div>
        ${result.failed_count ? `<div class="badge badge-danger">${result.failed_count} gagal</div>` : ""}
        ${result.failed_count ? `<ul style="margin-top:8px; font-size:12px; color:var(--text-600);">${result.failed.map((f) => `<li>Baris ${f.row}: ${f.reason}</li>`).join("")}</ul>` : ""}
      `;
      UI.toast(`${result.saved_count} murid berjaya ditambah.`, "success");
      loaded = false;
      if (result.saved_count > 0) render();
    } catch (err) {
      UI.toast("Gagal memuat naik: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-upload"></i> Muat Naik`;
    }
  }

  return { render };
})();

const Teachers = (() => {
  let teachers = [];
  let loaded = false;

  async function render() {
    const root = document.getElementById("sa-panel-guru");
    if (!root) return;
    if (!loaded) {
      root.innerHTML = `<div class="loading-inline"><div class="spinner spinner-dark"></div>Memuatkan senarai guru...</div>`;
      teachers = await Api.getTeachers();
      loaded = true;
    }
    root.innerHTML = `
      <div class="filter-bar">
        <div class="filter-search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" class="input" id="tch-search" placeholder="Cari nama guru..."></div>
        <button class="btn btn-outline" id="tch-bulk"><i class="fa-solid fa-layer-group"></i> Tambah Pukal</button>
        <button class="btn btn-outline" id="tch-delete-all" style="color:var(--danger-600); border-color:var(--danger-100);"><i class="fa-solid fa-trash-can"></i> Padam Semua</button>
        <button class="btn btn-primary" id="tch-new"><i class="fa-solid fa-plus"></i> Tambah Guru</button>
      </div>
      <div class="card">
        <div class="card-header"><h3>Senarai Guru</h3></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>ID</th><th>Nama</th><th>E-mel</th><th>Jawatan</th><th>Status</th><th>Tindakan</th></tr></thead>
            <tbody id="tch-tbody"></tbody>
          </table>
        </div>
        <div class="card-row-list" id="tch-cardlist"></div>
      </div>
    `;
    document.getElementById("tch-new").addEventListener("click", () => openForm());
    document.getElementById("tch-bulk").addEventListener("click", () => openBulkForm());
    document.getElementById("tch-delete-all").addEventListener("click", handleDeleteAll);
    document.getElementById("tch-search").addEventListener("input", (e) => renderRows(e.target.value));
    renderRows();
  }

  function renderRows(search = "") {
    const filtered = teachers.filter((t) => t.name.toLowerCase().includes(search.toLowerCase()));
    const tbody = document.getElementById("tch-tbody");
    const cardlist = document.getElementById("tch-cardlist");

    if (!filtered.length) {
      tbody.innerHTML = `<tr><td colspan="6">${UI.emptyState("fa-chalkboard-user", "Tiada rekod ditemui", "Sila tambah rekod baharu untuk memulakan pengurusan kokurikulum.")}</td></tr>`;
      cardlist.innerHTML = "";
      return;
    }

    tbody.innerHTML = filtered.map((t) => `
      <tr>
        <td>${t.teacher_id}</td><td>${t.name}</td><td>${t.email}</td><td>${t.position}</td><td>${UI.badge(t.status)}</td>
        <td class="row-actions">
          <button class="btn btn-icon btn-outline" data-id="${t.teacher_id}" data-act="edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-icon btn-danger" data-id="${t.teacher_id}" data-act="delete"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join("");

    cardlist.innerHTML = filtered.map((t) => `
      <div class="cr-item">
        <div class="cr-top"><span class="cr-title">${t.name}</span>${UI.badge(t.status)}</div>
        <div class="cr-line"><span>E-mel</span><span>${t.email}</span></div>
        <div class="cr-line"><span>Jawatan</span><span>${t.position}</span></div>
        <div class="cr-actions">
          <button class="btn btn-sm btn-outline" data-id="${t.teacher_id}" data-act="edit">Edit</button>
          <button class="btn btn-sm btn-danger" data-id="${t.teacher_id}" data-act="delete">Padam</button>
        </div>
      </div>
    `).join("");

    document.querySelectorAll("#sa-panel-guru [data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rec = teachers.find((t) => t.teacher_id === btn.dataset.id);
        if (btn.dataset.act === "edit") openForm(rec);
        else UI.confirmDialog({
          message: "Adakah anda pasti mahu memadam guru ini? Tindakan ini tidak boleh dibuat asal.",
          onConfirm: async () => {
            try {
              await Api.deleteTeacher({ teacher_id: rec.teacher_id });
              UI.toast("Guru berjaya dipadam.", "success");
              loaded = false;
              render();
            } catch (err) {
              UI.toast("Gagal memadam guru: " + err.message, "error");
            }
          }
        });
      });
    });
  }

  function handleDeleteAll() {
    if (!teachers.length) {
      UI.toast("Tiada guru untuk dipadam.", "error");
      return;
    }
    UI.confirmDialog({
      title: "Padam SEMUA Guru",
      message: `Adakah anda PASTI mahu memadam SEMUA ${teachers.length} rekod guru? Tindakan ini tidak boleh dibuat asal.`,
      confirmLabel: "Ya, Padam Semua",
      onConfirm: async () => {
        try {
          const result = await Api.deleteAllTeachers();
          UI.toast(`${result.deleted_count} guru berjaya dipadam.`, "success");
          loaded = false;
          render();
        } catch (err) {
          UI.toast("Gagal memadam semua guru: " + err.message, "error");
        }
      }
    });
  }

  function openForm(rec = {}) {
    const isEdit = !!rec.teacher_id;
    UI.openModal({
      title: isEdit ? "Edit Guru" : "Tambah Guru",
      bodyHtml: `
        <div class="form-field"><label>Nama Penuh</label><input type="text" class="input" id="tch-name" value="${rec.name || ""}"></div>
        <div class="form-field"><label>E-mel</label><input type="email" class="input" id="tch-email" value="${rec.email || ""}"></div>
        <div class="form-field"><label>Jawatan</label><input type="text" class="input" id="tch-position" value="${rec.position || ""}"></div>
      `,
      footerHtml: `<button class="btn btn-outline" onclick="UI.closeModal()">Tutup</button><button class="btn btn-primary" id="tch-save-btn">Simpan</button>`
    });
    document.getElementById("tch-save-btn").addEventListener("click", async () => {
      const payload = {
        teacher_id: isEdit ? rec.teacher_id : undefined,
        name: document.getElementById("tch-name").value,
        email: document.getElementById("tch-email").value,
        position: document.getElementById("tch-position").value
      };
      if (!payload.name || !payload.email || !payload.position) {
        UI.toast("Sila lengkapkan semua medan.", "error");
        return;
      }
      try {
        await Api.saveTeacher(payload);
        UI.closeModal();
        UI.toast("Data guru berjaya disimpan.", "success");
        loaded = false;
        render();
      } catch (err) {
        UI.toast("Gagal menyimpan guru: " + err.message, "error");
      }
    });
  }

  function openBulkForm() {
    UI.openModal({
      title: "Tambah Guru Secara Pukal",
      size: "lg",
      bodyHtml: `
        <p class="hint" style="margin-bottom:10px;">Satu guru setiap baris, dipisahkan koma, mengikut format: <strong>Nama, E-mel, Jawatan</strong></p>
        <textarea class="input" id="tch-bulk-text" rows="10" style="font-family:Consolas,monospace; font-size:12.5px;" placeholder="En. Ahmad bin Ali, ahmad@moe-dl.edu.my, Guru
Pn. Siti binti Osman, siti@moe-dl.edu.my, Guru Kanan"></textarea>
        <div class="hint" style="margin-top:8px;">Salin terus daripada Excel/Google Sheets (3 lajur: Nama, E-mel, Jawatan) dan tampal terus di sini — sistem terima format tampalan Excel asal (tiada perlu tambah koma).</div>
        <div id="tch-bulk-result" style="margin-top:12px;"></div>
      `,
      footerHtml: `<button class="btn btn-outline" onclick="UI.closeModal()">Tutup</button><button class="btn btn-primary" id="tch-bulk-save-btn"><i class="fa-solid fa-upload"></i> Muat Naik</button>`
    });
    document.getElementById("tch-bulk-save-btn").addEventListener("click", handleBulkSave);
  }

  function parseBulkRows_(text, fieldNames) {
    return text
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line.length > 0)
      .map((line) => {
        const parts = line.split(/\t|,/).map((p) => p.trim());
        const obj = {};
        fieldNames.forEach((f, i) => (obj[f] = parts[i] || ""));
        return obj;
      });
  }

  async function handleBulkSave() {
    const text = document.getElementById("tch-bulk-text").value;
    const rows = parseBulkRows_(text, ["name", "email", "position"]);

    if (!rows.length) {
      UI.toast("Sila tampal sekurang-kurangnya satu baris guru.", "error");
      return;
    }

    const btn = document.getElementById("tch-bulk-save-btn");
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner"></div> Memuat naik...`;

    try {
      const result = await Api.saveTeachersBulk(rows);
      const resultEl = document.getElementById("tch-bulk-result");
      resultEl.innerHTML = `
        <div class="badge badge-success" style="margin-right:6px;">${result.saved_count} berjaya</div>
        ${result.failed_count ? `<div class="badge badge-danger">${result.failed_count} gagal</div>` : ""}
        ${result.failed_count ? `<ul style="margin-top:8px; font-size:12px; color:var(--text-600);">${result.failed.map((f) => `<li>Baris ${f.row}: ${f.reason}</li>`).join("")}</ul>` : ""}
      `;
      UI.toast(`${result.saved_count} guru berjaya ditambah.`, "success");
      loaded = false;
      if (result.saved_count > 0) render();
    } catch (err) {
      UI.toast("Gagal memuat naik: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-upload"></i> Muat Naik`;
    }
  }

  return { render };
})();
