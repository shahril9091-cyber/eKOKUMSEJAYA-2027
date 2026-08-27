/**
 * js/analysis.js
 * ---------------------------------------------------------
 * Modul Analisis Keseluruhan — menggantikan Laporan Keseluruhan
 * lama. Papar jadual kehadiran SETIAP MURID merentasi SETIAP
 * MINGGU bagi satu Unit/Kelab/Sukan yang dipilih, dan boleh
 * dicetak sebagai PDF A4 POTRET untuk kegunaan guru.
 * ---------------------------------------------------------
 */

const Analysis = (() => {
  let allUnits = [];
  let units = [];
  let allStudents = [];
  let currentUnitName = "";
  let currentWeeks = [];
  let currentWeekDates = {};
  let currentRows = [];
  let loaded = false;

  async function render() {
    const root = document.getElementById("module-analysis");
    if (!loaded) {
      root.innerHTML = `<div class="loading-inline"><div class="spinner spinner-dark"></div>Memuatkan Analisis Keseluruhan...</div>`;
      [allUnits, allStudents] = await Promise.all([Api.getUnits(), Api.getStudents()]);
      units = allUnits;
      loaded = true;
    }
    root.innerHTML = template();
    bindEvents();
  }

  function template() {
    return `
      <div class="filter-bar">
        <div class="filter-field">
          <label>Kategori</label>
          <select class="input" id="an-category">
            <option value="">Semua Kategori</option>
            ${CONFIG.CATEGORIES.map((c) => `<option value="${c.id}">${c.label}</option>`).join("")}
          </select>
        </div>
        <div class="filter-field">
          <label>Unit</label>
          <select class="input" id="an-unit">
            <option value="">Pilih Unit</option>
            ${units.map((u) => `<option value="${u.unit_id}">${u.unit_name}</option>`).join("")}
          </select>
        </div>
        <button class="btn btn-outline" id="an-print-pdf" disabled><i class="fa-solid fa-print"></i> Cetak PDF (Potret)</button>
      </div>

      <div class="card">
        <div class="card-header"><h3>Analisis Kehadiran Mengikut Minggu</h3></div>
        <div id="an-content">
          ${UI.emptyState("fa-table-cells", "Pilih Unit", "Sila pilih Unit/Kelab/Sukan untuk memaparkan analisis kehadiran setiap murid mengikut minggu.")}
        </div>
      </div>
    `;
  }

  function bindEvents() {
    document.getElementById("an-category").addEventListener("change", handleCategoryChange);
    document.getElementById("an-unit").addEventListener("change", handleUnitChange);
    document.getElementById("an-print-pdf").addEventListener("click", handlePrintPdf);
  }

  function handleCategoryChange() {
    const category = document.getElementById("an-category").value;
    units = category ? allUnits.filter((u) => u.category === category) : allUnits;
    document.getElementById("an-unit").innerHTML = `<option value="">Pilih Unit</option>${units.map((u) => `<option value="${u.unit_id}">${u.unit_name}</option>`).join("")}`;
    resetContent_();
  }

  function resetContent_() {
    document.getElementById("an-content").innerHTML = UI.emptyState("fa-table-cells", "Pilih Unit", "Sila pilih Unit/Kelab/Sukan untuk memaparkan analisis kehadiran setiap murid mengikut minggu.");
    document.getElementById("an-print-pdf").disabled = true;
    currentRows = [];
    currentWeeks = [];
  }

  async function handleUnitChange() {
    const unitId = document.getElementById("an-unit").value;
    const contentEl = document.getElementById("an-content");

    if (!unitId) {
      resetContent_();
      return;
    }

    contentEl.innerHTML = `<div class="loading-inline"><div class="spinner spinner-dark"></div>Memuatkan data kehadiran...</div>`;

    try {
      const unit = allUnits.find((u) => u.unit_id === unitId);
      currentUnitName = unit ? unit.unit_name : "-";

      const [members, attendance] = await Promise.all([
        Api.getMembers({ unit_id: unitId }),
        Api.getAttendance({ unit_id: unitId })
      ]);

      const memberIds = new Set(members.filter((m) => m.status !== "DELETED").map((m) => m.student_id));
      const students = allStudents.filter((s) => memberIds.has(s.student_id));

      // Minggu yang dipaparkan = hanya minggu yang benar-benar ada rekod
      // untuk unit ini, disusun menaik (elak 12 lajur kosong tak berguna).
      const weeksWithData = Array.from(new Set(attendance.map((r) => r.minggu).filter(Boolean)))
        .map(Number).sort((a, b) => a - b);

      // Tarikh bagi setiap minggu (ambil daripada rekod kehadiran unit ini,
      // supaya guru senang nampak bila perjumpaan minggu tersebut berlaku).
      const weekDates = {};
      attendance.forEach((r) => {
        const w = Number(r.minggu);
        if (w && !weekDates[w] && r.date) weekDates[w] = r.date;
      });

      if (!students.length) {
        contentEl.innerHTML = UI.emptyState("fa-user-graduate", "Tiada ahli", "Unit ini belum mempunyai murid berdaftar. Tetapkan keahlian di Tetapan > Superadmin > Murid.");
        document.getElementById("an-print-pdf").disabled = true;
        return;
      }
      if (!weeksWithData.length) {
        contentEl.innerHTML = UI.emptyState("fa-calendar-xmark", "Tiada rekod kehadiran", "Belum ada kehadiran direkodkan untuk unit ini pada mana-mana minggu.");
        document.getElementById("an-print-pdf").disabled = true;
        return;
      }

      // Bina peta murid_id -> { minggu: status }
      const rows = students.map((s) => {
        const byWeek = {};
        attendance.filter((r) => r.murid_id === s.student_id).forEach((r) => {
          byWeek[Number(r.minggu)] = r.status;
        });
        return { name: s.name, kelas: s.class, byWeek };
      });

      currentWeeks = weeksWithData;
      currentWeekDates = weekDates;
      currentRows = rows;
      document.getElementById("an-print-pdf").disabled = false;
      renderTable_(weeksWithData, weekDates, rows);
    } catch (err) {
      contentEl.innerHTML = UI.emptyState("fa-triangle-exclamation", "Gagal memuatkan analisis", err.message);
      document.getElementById("an-print-pdf").disabled = true;
    }
  }

  function symbolFor_(status) {
    if (status === "HADIR") return { icon: "✓", tone: "success" };
    if (status === "TIDAK_HADIR") return { icon: "✕", tone: "danger" };
    if (status === "LEWAT") return { icon: "L", tone: "warning" };
    if (status === "BERSEBAB") return { icon: "B", tone: "info" };
    return { icon: "-", tone: "neutral" };
  }

  function formatTarikhMY_(isoDate) {
    if (!isoDate) return "";
    const [y, m, d] = String(isoDate).split("-");
    return `${d}/${m}`;
  }

  function renderTable_(weeks, weekDates, rows) {
    const contentEl = document.getElementById("an-content");
    contentEl.innerHTML = `
      <div class="table-wrap">
        <table class="data-table">
          <thead>
            <tr>
              <th>#</th><th>Nama Murid</th><th>Kelas</th>
              ${weeks.map((w) => `<th style="text-align:center;">Minggu ${w}${weekDates[w] ? `<br><span style="font-weight:400; font-size:10.5px; color:var(--text-400);">${formatTarikhMY_(weekDates[w])}</span>` : ""}</th>`).join("")}
            </tr>
          </thead>
          <tbody>
            ${rows.map((r, i) => `
              <tr>
                <td>${i + 1}</td>
                <td>${r.name}</td>
                <td>${r.kelas}</td>
                ${weeks.map((w) => {
                  const sym = symbolFor_(r.byWeek[w]);
                  return `<td style="text-align:center;"><span class="badge badge-${sym.tone}">${sym.icon}</span></td>`;
                }).join("")}
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
      <div class="hint" style="padding:12px 18px;">Petunjuk: ✓ Hadir &nbsp; ✕ Tidak Hadir &nbsp; L Lewat &nbsp; B Bersebab &nbsp; - Tiada rekod</div>
    `;
  }

  async function handlePrintPdf(e) {
    if (!currentRows.length) {
      UI.toast("Tiada data untuk dicetak.", "error");
      return;
    }
    const btn = e.currentTarget;
    btn.disabled = true;
    btn.innerHTML = `<div class="spinner spinner-dark"></div> Menjana PDF...`;
    try {
      await PdfGenerator.generateAnalysisPdf(currentUnitName, currentWeeks, currentWeekDates, currentRows);
      UI.toast("PDF Analisis berjaya dijana.", "success");
    } catch (err) {
      UI.toast("Gagal menjana PDF: " + err.message, "error");
    } finally {
      btn.disabled = false;
      btn.innerHTML = `<i class="fa-solid fa-print"></i> Cetak PDF (Potret)`;
    }
  }

  return { render };
})();
