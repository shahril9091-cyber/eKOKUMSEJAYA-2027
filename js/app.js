/**
 * js/app.js
 * ---------------------------------------------------------
 * Teras aplikasi: login gate, navigation/router SPA, dan
 * komponen UI yang digunakan semula (toast, modal, confirm).
 * ---------------------------------------------------------
 */

const MODULES = [
  { id: "dashboard", label: "Dashboard", icon: "fa-gauge-high", roles: ["ADMIN"] },
  { id: "attendance", label: "Kehadiran Murid", icon: "fa-clipboard-check", roles: ["ADMIN"] },
  { id: "erph", label: "eRPH Kokurikulum", icon: "fa-file-pen", roles: ["ADMIN"] },
  { id: "reports", label: "Laporan Aktiviti", icon: "fa-chart-column", roles: ["ADMIN"] },
  { id: "summary", label: "Laporan Keseluruhan", icon: "fa-file-lines", roles: ["ADMIN"] },
  { id: "settings", label: "Tetapan", icon: "fa-gear", roles: ["ADMIN"] }
];

const App = (() => {
  let currentModule = "dashboard";

  // =========================================================
  // Bootstrapping
  // =========================================================

  function init() {
    document.getElementById("cfg-school-name").textContent = CONFIG.SCHOOL_NAME;
    document.getElementById("cfg-school-motto").textContent = CONFIG.SCHOOL_MOTTO;
    document.getElementById("cfg-system-name").textContent = CONFIG.SYSTEM_NAME;
    document.getElementById("cfg-system-subtitle").textContent = CONFIG.SYSTEM_SUBTITLE;
    document.getElementById("login-school-name").textContent = CONFIG.SCHOOL_NAME;
    document.getElementById("login-system-name").textContent = CONFIG.SYSTEM_NAME;

    const user = Auth.getCurrentUser();
    if (user) {
      showShell(user);
    } else {
      showLogin();
    }

    bindGlobalEvents();
  }

  function bindGlobalEvents() {
    document.getElementById("login-form").addEventListener("submit", handleLogin);
    document.getElementById("sidebar-toggle").addEventListener("click", toggleSidebar);
    document.getElementById("mobile-menu-btn").addEventListener("click", openMobileSidebar);
    document.getElementById("sidebar-backdrop").addEventListener("click", closeMobileSidebar);
    document.getElementById("logout-btn").addEventListener("click", handleLogout);

    document.getElementById("modal-overlay").addEventListener("click", (e) => {
      if (e.target.id === "modal-overlay") UI.closeModal();
    });

    startClock();
  }

  // ---- Jam & tarikh langsung pada header (seksyen ketepatan/formaliti) ----
  const HARI_MS = ["Ahad", "Isnin", "Selasa", "Rabu", "Khamis", "Jumaat", "Sabtu"];
  const BULAN_MS = ["Januari", "Februari", "Mac", "April", "Mei", "Jun", "Julai", "Ogos", "September", "Oktober", "November", "Disember"];

  function startClock() {
    updateClock();
    setInterval(updateClock, 1000);
  }

  function updateClock() {
    const now = new Date();
    const dateEl = document.getElementById("td-date");
    const timeEl = document.getElementById("td-time");
    if (!dateEl || !timeEl) return;

    dateEl.textContent = `${HARI_MS[now.getDay()]}, ${now.getDate()} ${BULAN_MS[now.getMonth()]} ${now.getFullYear()}`;

    let hours = now.getHours();
    const ampm = hours >= 12 ? "PTG" : "PG";
    hours = hours % 12 || 12;
    const mm = String(now.getMinutes()).padStart(2, "0");
    const ss = String(now.getSeconds()).padStart(2, "0");
    timeEl.textContent = `${String(hours).padStart(2, "0")}:${mm}:${ss} ${ampm}`;
  }

  function handleLogin(e) {
    e.preventDefault();
    const errorEl = document.getElementById("login-error");
    const submitBtn = e.target.querySelector('button[type="submit"]');
    errorEl.style.display = "none";

    let password;
    try {
      password = document.getElementById("login-password").value;
    } catch (err) {
      // Jaring keselamatan: jika struktur borang tidak sepadan dengan kod
      // (cth. campuran fail lama/baharu semasa upload), papar ralat jelas
      // berbanding senyap terus tanpa apa-apa berlaku.
      errorEl.textContent = "Ralat borang log masuk: " + err.message + " — sila muat semula halaman (Ctrl+Shift+R) atau semak fail js/app.js dan index.html sepadan.";
      errorEl.style.display = "block";
      return;
    }

    submitBtn.disabled = true;
    submitBtn.innerHTML = `<div class="spinner"></div> Mengesahkan...`;

    Auth.login(password)
      .then((user) => showShell(user))
      .catch((err) => {
        errorEl.textContent = err.message;
        errorEl.style.display = "block";
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = "Log Masuk";
      });
  }

  function handleLogout() {
    Auth.logout();
    if (typeof Units !== "undefined" && Units.resetSuperadmin) Units.resetSuperadmin();
    document.getElementById("app-shell").style.display = "none";
    showLogin();
  }

  function showLogin() {
    document.getElementById("login-screen").style.display = "flex";
    document.getElementById("app-shell").style.display = "none";
  }

  function showShell(user) {
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("app-shell").style.display = "flex";

    document.getElementById("user-name").textContent = user.name;
    document.getElementById("user-role").textContent = roleLabel(user.role);
    document.getElementById("user-avatar").textContent = Auth.initials(user.name);

    renderSidebarNav(user.role);
    navigateTo(currentModule);
  }

  function roleLabel(role) {
    return { ADMIN: "Admin" }[role] || role;
  }

  // =========================================================
  // Sidebar navigation
  // =========================================================

  function renderSidebarNav(role) {
    const nav = document.getElementById("sidebar-nav");
    nav.innerHTML = "";

    const allowed = MODULES.filter((m) => m.roles.includes(role));
    allowed.forEach((m) => {
      const el = document.createElement("div");
      el.className = "nav-item" + (m.id === currentModule ? " is-active" : "");
      el.dataset.module = m.id;
      el.innerHTML = `<i class="fa-solid ${m.icon}"></i><span>${m.label}</span>`;
      el.addEventListener("click", () => navigateTo(m.id));
      nav.appendChild(el);
    });
  }

  function navigateTo(moduleId) {
    currentModule = moduleId;

    document.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.toggle("is-active", el.dataset.module === moduleId);
    });
    document.querySelectorAll(".module").forEach((el) => {
      el.classList.toggle("is-active", el.id === `module-${moduleId}`);
    });

    const meta = MODULES.find((m) => m.id === moduleId);
    document.getElementById("page-title").textContent = meta ? meta.label : "";
    document.getElementById("page-crumb").textContent = `${CONFIG.SYSTEM_NAME} / ${meta ? meta.label : ""}`;

    closeMobileSidebar();

    // Panggil fungsi render modul jika wujud (mis. Dashboard.render())
    const renderers = {
      dashboard: () => typeof Dashboard !== "undefined" && Dashboard.render(),
      attendance: () => typeof Attendance !== "undefined" && Attendance.render(),
      erph: () => typeof Erph !== "undefined" && Erph.render(),
      reports: () => typeof Reports !== "undefined" && Reports.render(),
      summary: () => typeof Reports !== "undefined" && Reports.renderSummary && Reports.renderSummary(),
      settings: () => typeof Units !== "undefined" && Units.renderSettings && Units.renderSettings()
    };
    if (renderers[moduleId]) renderers[moduleId]();
  }

  function toggleSidebar() {
    document.getElementById("sidebar").classList.toggle("is-collapsed");
  }

  function openMobileSidebar() {
    document.getElementById("sidebar").classList.add("is-open");
    document.getElementById("sidebar-backdrop").classList.add("is-open");
  }

  function closeMobileSidebar() {
    document.getElementById("sidebar").classList.remove("is-open");
    document.getElementById("sidebar-backdrop").classList.remove("is-open");
  }

  return { init, navigateTo };
})();

// =========================================================
// UI — komponen boleh guna semula: toast, modal, confirm
// =========================================================

const UI = (() => {
  function toast(message, type = "info") {
    const stack = document.getElementById("toast-stack");
    const el = document.createElement("div");
    const icons = { success: "fa-circle-check", error: "fa-circle-xmark", info: "fa-circle-info" };
    el.className = `toast toast-${type}`;
    el.innerHTML = `<i class="fa-solid ${icons[type] || icons.info}"></i><span>${message}</span>`;
    stack.appendChild(el);
    setTimeout(() => {
      el.style.opacity = "0";
      el.style.transition = "opacity 0.25s ease";
      setTimeout(() => el.remove(), 250);
    }, 3200);
  }

  function openModal({ title, bodyHtml, footerHtml, size = "" }) {
    const overlay = document.getElementById("modal-overlay");
    overlay.innerHTML = `
      <div class="modal ${size === "lg" ? "modal-lg" : ""}">
        <div class="modal-header">
          <h3>${title}</h3>
          <button class="icon-btn" id="modal-close-btn"><i class="fa-solid fa-xmark"></i></button>
        </div>
        <div class="modal-body">${bodyHtml}</div>
        ${footerHtml ? `<div class="modal-footer">${footerHtml}</div>` : ""}
      </div>
    `;
    overlay.classList.add("is-open");
    document.getElementById("modal-close-btn").addEventListener("click", closeModal);
  }

  function closeModal() {
    document.getElementById("modal-overlay").classList.remove("is-open");
  }

  function confirmDialog({ title = "Sahkan Tindakan", message, confirmLabel = "Padam", onConfirm }) {
    openModal({
      title,
      bodyHtml: `
        <div class="confirm-body">
          <div class="confirm-icon"><i class="fa-solid fa-triangle-exclamation"></i></div>
          <p>${message}</p>
        </div>
      `,
      footerHtml: `
        <button class="btn btn-outline" id="confirm-cancel-btn">Batal</button>
        <button class="btn btn-danger" id="confirm-ok-btn">${confirmLabel}</button>
      `
    });
    document.getElementById("confirm-cancel-btn").addEventListener("click", closeModal);
    document.getElementById("confirm-ok-btn").addEventListener("click", () => {
      closeModal();
      onConfirm && onConfirm();
    });
  }

  function loadingRow(colspan = 6, label = "Memuatkan data...") {
    return `<tr><td colspan="${colspan}"><div class="loading-inline"><div class="spinner spinner-dark"></div>${label}</div></td></tr>`;
  }

  function emptyState(iconClass, title, message) {
    return `
      <div class="empty-state">
        <i class="fa-solid ${iconClass} fa-2x"></i>
        <div class="empty-title">${title}</div>
        <div>${message}</div>
      </div>
    `;
  }

  function badge(status) {
    const map = {
      HADIR: ["success", "Hadir"],
      TIDAK_HADIR: ["danger", "Tidak Hadir"],
      LEWAT: ["warning", "Lewat"],
      BERSEBAB: ["info", "Bersebab"],
      LENGKAP: ["success", "Lengkap"],
      PENDING: ["warning", "Pending"],
      DRAF: ["neutral", "Draf"],
      AKTIF: ["success", "Aktif"]
    };
    const [tone, label] = map[status] || ["neutral", status];
    return `<span class="badge badge-${tone}"><span class="badge-dot"></span>${label}</span>`;
  }

  return { toast, openModal, closeModal, confirmDialog, loadingRow, emptyState, badge };
})();

document.addEventListener("DOMContentLoaded", App.init);

// =========================================================
// Pengesan ralat global — papar sebarang ralat JavaScript yang
// tidak ditangkap terus pada skrin (bukan hanya dalam console),
// supaya masalah seperti fail lama/baharu tidak sepadan dapat
// dikesan dengan pantas tanpa perlu membuka DevTools.
// =========================================================
window.addEventListener("error", (e) => {
  showGlobalErrorBanner_(e.message);
});
window.addEventListener("unhandledrejection", (e) => {
  showGlobalErrorBanner_((e.reason && e.reason.message) || String(e.reason));
});

function showGlobalErrorBanner_(message) {
  let banner = document.getElementById("global-error-banner");
  if (!banner) {
    banner = document.createElement("div");
    banner.id = "global-error-banner";
    banner.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; z-index: 9999;
      background: #c23b3b; color: #fff; font-size: 13px;
      padding: 10px 16px; text-align: center; font-family: sans-serif;
    `;
    document.body.appendChild(banner);
  }
  banner.textContent = "⚠ Ralat sistem: " + message + " — sila muat semula halaman (Ctrl+Shift+R). Jika berterusan, hantar mesej ini kepada pembangun.";
}
