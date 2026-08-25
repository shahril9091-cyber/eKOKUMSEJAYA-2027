/**
 * js/units.js
 * ---------------------------------------------------------
 * Modul Unit (Beruniform / Kelab & Persatuan / Sukan), dan
 * Modul Tetapan — yang kini merangkumi Tab Superadmin berkunci
 * kata laluan, tempat Murid, Guru, dan Unit/Kelab/Sukan diurus
 * sepenuhnya (daftar, edit, padam) dalam satu lokasi.
 * ---------------------------------------------------------
 */

const Units = (() => {
  let units = [];
  let teachers = [];
  let loaded = false;
  const catLabel = { UNIT_BERUNIFORM: "Unit Beruniform", KELAB_PERSATUAN: "Kelab & Persatuan", SUKAN_PERMAINAN: "Sukan & Permainan" };
  const catTone = { UNIT_BERUNIFORM: "info", KELAB_PERSATUAN: "warning", SUKAN_PERMAINAN: "success" };

  // ---- Unit / Kelab / Sukan CRUD (dipaparkan di dalam Tab Superadmin) ----

  async function render() {
    const root = document.getElementById("sa-panel-unit");
    if (!root) return;
    if (!loaded) {
      root.innerHTML = `<div class="loading-inline"><div class="spinner spinner-dark"></div>Memuatkan senarai unit...</div>`;
      [units, teachers] = await Promise.all([Api.getUnits(), Api.getTeachers()]);
      loaded = true;
    }
    root.innerHTML = `
      <div class="filter-bar">
        <div class="filter-search"><i class="fa-solid fa-magnifying-glass"></i><input type="text" class="input" id="unit-search" placeholder="Cari nama unit..."></div>
        <div class="filter-field"><label>Kategori</label>
          <select class="input" id="unit-filter-category"><option value="">Semua Kategori</option>${CONFIG.CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("")}</select>
        </div>
        <button class="btn btn-outline" id="unit-delete-all" style="color:var(--danger-600); border-color:var(--danger-100);"><i class="fa-solid fa-trash-can"></i> Padam Semua</button>
        <button class="btn btn-primary" id="unit-new"><i class="fa-solid fa-plus"></i> Tambah Unit</button>
      </div>
      <div class="card">
        <div class="card-header"><h3>Senarai Unit / Kelab / Sukan</h3></div>
        <div class="table-wrap">
          <table class="data-table">
            <thead><tr><th>Nama Unit</th><th>Kategori</th><th>Guru Penasihat</th><th>Jumlah Ahli</th><th>Kehadiran</th><th>Tindakan</th></tr></thead>
            <tbody id="unit-tbody"></tbody>
          </table>
        </div>
        <div class="card-row-list" id="unit-cardlist"></div>
      </div>
    `;
    document.getElementById("unit-new").addEventListener("click", () => openForm());
    document.getElementById("unit-delete-all").addEventListener("click", handleDeleteAll);
    document.getElementById("unit-search").addEventListener("input", renderRows);
    document.getElementById("unit-filter-category").addEventListener("change", renderRows);
    renderRows();
  }

  function handleDeleteAll() {
    if (!units.length) {
      UI.toast("Tiada unit untuk dipadam.", "error");
      return;
    }
    UI.confirmDialog({
      title: "Padam SEMUA Unit/Kelab/Sukan",
      message: `Adakah anda PASTI mahu memadam SEMUA ${units.length} unit/kelab/sukan? Keahlian murid dalam unit-unit ini turut terjejas. Tindakan ini tidak boleh dibuat asal.`,
      confirmLabel: "Ya, Padam Semua",
      onConfirm: async () => {
        try {
          const result = await Api.deleteAllUnits();
          UI.toast(`${result.deleted_count} unit berjaya dipadam.`, "success");
          loaded = false;
          render();
        } catch (err) {
          UI.toast("Gagal memadam semua unit: " + err.message, "error");
        }
      }
    });
  }

  function renderRows() {
    const search = (document.getElementById("unit-search")?.value || "").toLowerCase();
    const catFilter = document.getElementById("unit-filter-category")?.value || "";
    const filtered = units.filter((u) =>
      (!catFilter || u.category === catFilter) &&
      (!search || u.unit_name.toLowerCase().includes(search))
    );

    document.getElementById("unit-tbody").innerHTML = filtered.length ? filtered.map((u) => `
      <tr>
        <td>${u.unit_name}</td>
        <td><span class="badge badge-${catTone[u.category]}">${catLabel[u.category]}</span></td>
        <td>${u.teacher || "-"}</td>
        <td>${u.members || 0}</td>
        <td>${u.attendance || 0}%</td>
        <td class="row-actions">
          <button class="btn btn-icon btn-outline" data-id="${u.unit_id}" data-act="edit"><i class="fa-solid fa-pen"></i></button>
          <button class="btn btn-icon btn-danger" data-id="${u.unit_id}" data-act="delete"><i class="fa-solid fa-trash"></i></button>
        </td>
      </tr>
    `).join("") : `<tr><td colspan="6">${UI.emptyState("fa-people-group", "Tiada rekod ditemui", "Sila tambah rekod baharu untuk memulakan pengurusan kokurikulum.")}</td></tr>`;

    document.getElementById("unit-cardlist").innerHTML = filtered.length ? filtered.map((u) => `
      <div class="cr-item">
        <div class="cr-top"><span class="cr-title">${u.unit_name}</span><span class="badge badge-${catTone[u.category]}">${catLabel[u.category]}</span></div>
        <div class="cr-line"><span>Guru Penasihat</span><span>${u.teacher || "-"}</span></div>
        <div class="cr-line"><span>Jumlah Ahli</span><span>${u.members || 0}</span></div>
        <div class="cr-line"><span>Kehadiran</span><span>${u.attendance || 0}%</span></div>
        <div class="cr-actions">
          <button class="btn btn-sm btn-outline" data-id="${u.unit_id}" data-act="edit">Edit</button>
          <button class="btn btn-sm btn-danger" data-id="${u.unit_id}" data-act="delete">Padam</button>
        </div>
      </div>
    `).join("") : "";

    document.querySelectorAll("#sa-panel-unit [data-act]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const rec = units.find((u) => u.unit_id === btn.dataset.id);
        if (btn.dataset.act === "edit") openForm(rec);
        else UI.confirmDialog({
          message: "Adakah anda pasti mahu memadam unit ini? Tindakan ini tidak boleh dibuat asal.",
          onConfirm: async () => {
            try {
              await Api.deleteUnit({ unit_id: rec.unit_id });
              UI.toast("Unit berjaya dipadam.", "success");
              loaded = false;
              render();
            } catch (err) {
              UI.toast("Gagal memadam unit: " + err.message, "error");
            }
          }
        });
      });
    });
  }

  function openForm(rec = {}) {
    const isEdit = !!rec.unit_id;
    const selectedIds = rec.teacher_ids || [];
    const teacherCheckboxes = teachers.map((t) => `
      <label style="display:flex; align-items:center; gap:8px; padding:6px 0; font-size:13px; cursor:pointer;">
        <input type="checkbox" class="unit-teacher-check" value="${t.teacher_id}" ${selectedIds.includes(t.teacher_id) ? "checked" : ""}>
        ${t.name}
      </label>
    `).join("");
    UI.openModal({
      title: isEdit ? "Edit Unit" : "Tambah Unit",
      bodyHtml: `
        <div class="form-field"><label>Nama Unit</label><input type="text" class="input" id="unit-name" value="${rec.unit_name || ""}"></div>
        <div class="form-field">
          <label>Kategori</label>
          <select class="input" id="unit-category">${CONFIG.CATEGORIES.map((c) => `<option value="${c.id}" ${rec.category === c.id ? "selected" : ""}>${c.label}</option>`).join("")}</select>
        </div>
        <div class="form-field">
          <label>Guru Penasihat (boleh pilih lebih daripada seorang)</label>
          <div style="max-height:220px; overflow-y:auto; border:1px solid var(--border); border-radius:var(--radius-sm); padding:8px 12px;">
            ${teacherCheckboxes || `<span class="hint">Tiada guru dalam sistem lagi — tambah guru dahulu di sub-tab Guru.</span>`}
          </div>
        </div>
      `,
      footerHtml: `<button class="btn btn-outline" onclick="UI.closeModal()">Tutup</button><button class="btn btn-primary" id="unit-save-btn">Simpan</button>`
    });
    document.getElementById("unit-save-btn").addEventListener("click", async () => {
      const teacherIds = Array.from(document.querySelectorAll(".unit-teacher-check:checked")).map((el) => el.value);
      const payload = {
        unit_id: isEdit ? rec.unit_id : undefined,
        unit_name: document.getElementById("unit-name").value,
        category: document.getElementById("unit-category").value,
        teacher_ids: teacherIds
      };
      if (!payload.unit_name) {
        UI.toast("Sila isi nama unit.", "error");
        return;
      }
      try {
        await Api.saveUnit(payload);
        UI.closeModal();
        UI.toast("Unit berjaya disimpan.", "success");
        loaded = false;
        render();
      } catch (err) {
        UI.toast("Gagal menyimpan unit: " + err.message, "error");
      }
    });
  }

  // =========================================================
  // Tetapan — Tab Am + Tab Superadmin (berkunci kata laluan)
  // =========================================================
  //
  // Tab Superadmin ialah tempat TUNGGAL untuk mendaftar dan
  // menguruskan Murid, Guru, dan Unit/Kelab/Sukan (edit, padam,
  // segala-galanya) — dikunci kata laluan Superadmin berasingan
  // daripada log masuk depan. Kunci ini kekal terbuka sepanjang
  // sesi semasa sahaja; log keluar akan menguncinya semula
  // (lihat resetSuperadmin(), dipanggil oleh app.js).

  let superTab = "am";           // "am" | "superadmin"
  let superadminUnlocked = false;
  let dataTab = "murid";         // "murid" | "guru" | "unit" | "password"

  function resetSuperadmin() {
    superadminUnlocked = false;
    superTab = "am";
    dataTab = "murid";
  }

  function renderSettings() {
    const root = document.getElementById("module-settings");
    root.innerHTML = `
      <div class="settings-tabs">
        <button class="settings-tab-btn ${superTab === "am" ? "is-active" : ""}" data-super-tab="am">Tetapan Am</button>
        <button class="settings-tab-btn ${superTab === "superadmin" ? "is-active" : ""}" data-super-tab="superadmin"><i class="fa-solid fa-lock"></i> Tetapan Superadmin</button>
      </div>
      <div id="settings-tab-content"></div>
    `;
    document.querySelectorAll(".settings-tab-btn").forEach((btn) => {
      btn.addEventListener("click", () => {
        superTab = btn.dataset.superTab;
        renderSettings();
      });
    });
    renderActiveSettingsTab();
  }

  function renderActiveSettingsTab() {
    const content = document.getElementById("settings-tab-content");
    if (superTab === "am") {
      content.innerHTML = amTabHtml();
      return;
    }
    // superTab === "superadmin"
    if (!superadminUnlocked) {
      content.innerHTML = passwordGateHtml();
      document.getElementById("sa-unlock-form").addEventListener("submit", handleUnlockSubmit);
      return;
    }
    content.innerHTML = superadminShellHtml();
    bindSuperadminTabs();
    renderActiveDataTab();
  }

  function amTabHtml() {
    return `
      <div class="card" style="margin-bottom:16px;">
        <div class="card-header"><h3>Maklumat Sistem</h3></div>
        <div class="card-body">
          <div class="form-grid">
            <div class="form-field"><label>Nama Sekolah</label><input type="text" class="input" value="${CONFIG.SCHOOL_NAME}" disabled></div>
            <div class="form-field"><label>Motto Sekolah</label><input type="text" class="input" value="${CONFIG.SCHOOL_MOTTO}" disabled></div>
          </div>
          <div class="hint">Medan ini ditetapkan dalam config/config.js.</div>
        </div>
      </div>

      <div class="card" style="margin-bottom:16px;">
        <div class="card-header"><h3>Kategori Kokurikulum</h3></div>
        <div class="card-body">
          <div class="table-wrap">
            <table class="data-table">
              <thead><tr><th>ID Kategori</th><th>Label Paparan</th></tr></thead>
              <tbody>
                ${CONFIG.CATEGORIES.map((c) => `<tr><td>${c.id}</td><td>${c.label}</td></tr>`).join("")}
              </tbody>
            </table>
          </div>
          <div class="hint">Kategori ditetapkan dalam config/config.js (frontend) dan Config.gs (backend).</div>
        </div>
      </div>

      <div class="card">
        <div class="card-header"><h3>Konfigurasi API</h3></div>
        <div class="card-body">
          <div class="form-field">
            <label>Google Apps Script Web App URL</label>
            <input type="text" class="input" value="${CONFIG.API_URL || "(belum ditetapkan)"}" disabled>
          </div>
          <div class="form-field">
            <label>Mod Data</label>
            <input type="text" class="input" value="${CONFIG.USE_DUMMY_DATA ? "Data Contoh (Dummy)" : "API Sebenar"}" disabled>
          </div>
        </div>
      </div>
    `;
  }

  function passwordGateHtml() {
    return `
      <div class="card" style="max-width:420px; margin:20px auto;">
        <div class="card-body" style="text-align:center;">
          <div style="width:52px; height:52px; border-radius:50%; background:var(--info-100); color:var(--royal-600); display:flex; align-items:center; justify-content:center; margin:0 auto 14px; font-size:22px;">
            <i class="fa-solid fa-lock"></i>
          </div>
          <h3 style="margin-bottom:6px;">Kawasan Superadmin</h3>
          <p style="color:var(--text-400); font-size:13px; margin-bottom:18px;">Masukkan kata laluan Superadmin untuk mengurus Murid, Guru, dan Unit/Kelab/Sukan.</p>
          <form id="sa-unlock-form">
            <div class="form-field" style="text-align:left;">
              <input type="password" class="input" id="sa-unlock-password" placeholder="Kata laluan Superadmin" autocomplete="off" required>
            </div>
            <div id="sa-unlock-error" class="login-error" style="display:none;"></div>
            <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center; padding:10px;">Buka Kunci</button>
          </form>
        </div>
      </div>
    `;
  }

  async function handleUnlockSubmit(e) {
    e.preventDefault();
    const password = document.getElementById("sa-unlock-password").value;
    const errorEl = document.getElementById("sa-unlock-error");
    const btn = e.target.querySelector('button[type="submit"]');
    errorEl.style.display = "none";
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner"></div> Mengesahkan...`;

    try {
      await Auth.verifySuperadmin(password);
      superadminUnlocked = true;
      renderActiveSettingsTab();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.style.display = "block";
      btn.disabled = false;
      btn.textContent = "Buka Kunci";
    }
  }

  function superadminShellHtml() {
    const tabs = [
      { id: "murid", label: "Murid", icon: "fa-user-graduate" },
      { id: "guru", label: "Guru", icon: "fa-chalkboard-user" },
      { id: "unit", label: "Unit / Kelab / Sukan", icon: "fa-people-group" },
      { id: "password", label: "Kata Laluan", icon: "fa-key" }
    ];
    return `
      <div class="settings-subtabs">
        ${tabs.map((t) => `<button class="settings-subtab-btn ${dataTab === t.id ? "is-active" : ""}" data-data-tab="${t.id}"><i class="fa-solid ${t.icon}"></i> ${t.label}</button>`).join("")}
        <button class="settings-subtab-btn settings-subtab-lock" id="sa-lock-btn"><i class="fa-solid fa-lock"></i> Kunci Semula</button>
      </div>
      <div id="sa-panel-murid" class="sa-panel"></div>
      <div id="sa-panel-guru" class="sa-panel"></div>
      <div id="sa-panel-unit" class="sa-panel"></div>
      <div id="sa-panel-password" class="sa-panel"></div>
    `;
  }

  function bindSuperadminTabs() {
    document.querySelectorAll(".settings-subtab-btn[data-data-tab]").forEach((btn) => {
      btn.addEventListener("click", () => {
        dataTab = btn.dataset.dataTab;
        document.querySelectorAll(".settings-subtab-btn[data-data-tab]").forEach((b) => b.classList.toggle("is-active", b === btn));
        renderActiveDataTab();
      });
    });
    document.getElementById("sa-lock-btn").addEventListener("click", () => {
      superadminUnlocked = false;
      renderActiveSettingsTab();
    });
  }

  function renderActiveDataTab() {
    document.querySelectorAll(".sa-panel").forEach((el) => (el.style.display = "none"));
    const panel = document.getElementById(`sa-panel-${dataTab}`);
    if (panel) panel.style.display = "block";

    if (dataTab === "murid" && typeof Students !== "undefined") Students.render();
    if (dataTab === "guru" && typeof Teachers !== "undefined") Teachers.render();
    if (dataTab === "unit") render();
    if (dataTab === "password") renderPasswordForm();
  }

  function renderPasswordForm() {
    const panel = document.getElementById("sa-panel-password");
    panel.innerHTML = `
      <div class="card" style="max-width:520px;">
        <div class="card-header"><h3>Ubah Kata Laluan</h3></div>
        <div class="card-body">
          <p class="hint" style="margin-bottom:14px;">Kedua-dua kata laluan boleh diubah di sini. Kata laluan Superadmin SEMASA wajib disahkan dahulu sebelum sebarang perubahan disimpan.</p>
          <div class="form-field"><label>Kata Laluan Superadmin Semasa</label><input type="password" class="input" id="pw-current-super" autocomplete="off"></div>
          <div class="form-section-title">Kata Laluan Baharu (isi hanya yang ingin diubah)</div>
          <div class="form-field"><label>Kata Laluan Log Masuk Baharu (depan)</label><input type="password" class="input" id="pw-new-login" autocomplete="off" placeholder="Biar kosong jika tidak diubah"></div>
          <div class="form-field"><label>Kata Laluan Superadmin Baharu</label><input type="password" class="input" id="pw-new-super" autocomplete="off" placeholder="Biar kosong jika tidak diubah"></div>
          <button class="btn btn-primary" id="pw-save-btn"><i class="fa-solid fa-floppy-disk"></i> Simpan Kata Laluan</button>
        </div>
      </div>
    `;
    document.getElementById("pw-save-btn").addEventListener("click", handlePasswordSave);
  }

  async function handlePasswordSave() {
    const currentSuperadminPassword = document.getElementById("pw-current-super").value;
    const newLoginPassword = document.getElementById("pw-new-login").value;
    const newSuperadminPassword = document.getElementById("pw-new-super").value;

    if (!currentSuperadminPassword) {
      UI.toast("Sila masukkan kata laluan Superadmin semasa.", "error");
      return;
    }
    if (!newLoginPassword && !newSuperadminPassword) {
      UI.toast("Sila isi sekurang-kurangnya satu kata laluan baharu.", "error");
      return;
    }

    const btn = document.getElementById("pw-save-btn");
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner"></div> Menyimpan...`;

    try {
      await Api.updateSettings({ currentSuperadminPassword, newLoginPassword, newSuperadminPassword });
      UI.toast("Kata laluan berjaya dikemas kini.", "success");
      document.getElementById("pw-current-super").value = "";
      document.getElementById("pw-new-login").value = "";
      document.getElementById("pw-new-super").value = "";
    } catch (err) {
      UI.toast("Gagal mengemas kini kata laluan: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-floppy-disk"></i> Simpan Kata Laluan`;
    }
  }

  return { render, renderSettings, resetSuperadmin };
})();
