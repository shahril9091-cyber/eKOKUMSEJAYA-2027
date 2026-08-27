/**
 * js/dashboard.js
 * ---------------------------------------------------------
 * Modul Dashboard — statistik ringkas, pecahan unit, dan carta.
 * Data diambil melalui Api.getDashboard() (dummy pada Fasa 1,
 * endpoint ?action=getDashboard sebenar pada Fasa 3).
 * ---------------------------------------------------------
 */

const Dashboard = (() => {
  let charts = {};
  let loaded = false;

  async function render() {
    if (loaded) return; // elak fetch berulang setiap kali tab ditukar (lihat #32 Performance)
    const root = document.getElementById("module-dashboard");
    root.innerHTML = `<div class="loading-inline"><div class="spinner spinner-dark"></div>Memuatkan dashboard...</div>`;

    try {
      const data = await Api.getDashboard();
      loaded = true;
      root.innerHTML = template(data);
      drawCharts(data);
    } catch (err) {
      root.innerHTML = UI.emptyState("fa-triangle-exclamation", "Gagal memuatkan dashboard", err.message);
    }
  }

  function template(d) {
    const unitLabel = { UNIT_BERUNIFORM: "Unit Beruniform", KELAB_PERSATUAN: "Kelab & Persatuan", SUKAN_PERMAINAN: "Sukan & Permainan" };
    const unitIcon = { UNIT_BERUNIFORM: "fa-shield-halved", KELAB_PERSATUAN: "fa-book-open", SUKAN_PERMAINAN: "fa-futbol" };

    const unitCards = Object.entries(d.unit_breakdown).map(([key, v]) => `
      <div class="unit-summary-card">
        <div class="usc-head">
          <div class="usc-icon"><i class="fa-solid ${unitIcon[key]}"></i></div>
          <h4>${unitLabel[key]}</h4>
        </div>
        <div class="usc-row"><span class="usc-label">Jumlah Ahli</span><span class="usc-val">${v.members}</span></div>
        <div class="usc-row"><span class="usc-label">Jumlah Aktiviti</span><span class="usc-val">${v.activities}</span></div>
        <div class="usc-row"><span class="usc-label">Peratus Kehadiran</span><span class="usc-val">${v.attendance}%</span></div>
      </div>
    `).join("");

    return `
      <div class="stat-grid">
        ${statCard("fa-user-graduate", "navy", d.total_students, "Jumlah Murid")}
        ${statCard("fa-chalkboard-user", "royal", d.total_teachers, "Jumlah Guru")}
        ${statCard("fa-people-group", "gold", d.total_units, "Jumlah Unit Kokurikulum")}
        ${statCard("fa-calendar-check", "success", d.total_activities, "Jumlah Aktiviti")}
        ${statCard("fa-clipboard-list", "navy", d.total_attendance_records, "Jumlah Rekod Kehadiran")}
        ${statCard("fa-chart-line", "royal", d.attendance_rate + "%", "Peratus Kehadiran Keseluruhan")}
      </div>

      <div class="unit-summary-grid">${unitCards}</div>

      <div class="dash-grid">
        <div class="card chart-panel">
          <canvas id="chart-monthly"></canvas>
        </div>
        <div class="card chart-panel">
          <canvas id="chart-category"></canvas>
        </div>
      </div>

      <div class="card chart-panel" style="height:300px;">
        <canvas id="chart-activities"></canvas>
      </div>
    `;
  }

  function statCard(icon, tone, value, label) {
    return `
      <div class="stat-card">
        <div class="stat-icon tone-${tone}"><i class="fa-solid ${icon}"></i></div>
        <div class="stat-value">${value}</div>
        <div class="stat-label">${label}</div>
      </div>
    `;
  }

  function drawCharts(d) {
    const navy = "#0b1f3a", royal = "#2563c9", gold = "#c99a3a";

    charts.monthly = new Chart(document.getElementById("chart-monthly"), {
      type: "line",
      data: {
        labels: d.monthly_attendance.labels,
        datasets: [{
          label: "Peratus Kehadiran (%)",
          data: d.monthly_attendance.values,
          borderColor: royal,
          backgroundColor: "rgba(37,99,201,0.1)",
          tension: 0.35,
          fill: true,
          pointRadius: 3
        }]
      },
      options: chartOptions("Kehadiran Mengikut Bulan")
    });

    charts.category = new Chart(document.getElementById("chart-category"), {
      type: "doughnut",
      data: {
        labels: d.category_attendance.labels,
        datasets: [{ data: d.category_attendance.values, backgroundColor: [navy, royal, gold] }]
      },
      options: { plugins: { title: { display: true, text: "Kehadiran Mengikut Kategori", font: { size: 13, weight: "700" }, color: navy } }, maintainAspectRatio: false, responsive: true }
    });

    charts.activities = new Chart(document.getElementById("chart-activities"), {
      type: "bar",
      data: {
        labels: d.category_activities.labels,
        datasets: [{ label: "Bilangan Aktiviti", data: d.category_activities.values, backgroundColor: [navy, royal, gold], borderRadius: 6, maxBarThickness: 60 }]
      },
      options: chartOptions("Aktiviti Mengikut Kategori")
    });
  }

  function chartOptions(title) {
    return {
      maintainAspectRatio: false,
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: title, font: { size: 13, weight: "700" }, color: "#0b1f3a" }
      },
      scales: { y: { beginAtZero: true, grid: { color: "#eef1f6" } }, x: { grid: { display: false } } }
    };
  }

  return { render };
})();
