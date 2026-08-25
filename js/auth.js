/**
 * js/auth.js
 * ---------------------------------------------------------
 * Log masuk kongsi tunggal (nama pengguna + kata laluan),
 * disahkan terhadap sheet SETTINGS melalui Api.login().
 * Sesi pengguna disimpan dalam localStorage.
 *
 * Superadmin (Auth.verifySuperadmin) ialah lapisan kebenaran
 * BERASINGAN — tidak disimpan sebagai sesi berterusan, ia
 * disahkan setiap kali Tab Tetapan > Superadmin cuba dibuka
 * dalam sesi semasa (lihat units.js).
 * ---------------------------------------------------------
 */

const Auth = (() => {
  const SESSION_KEY = "kokurikulum_session";

  async function login(username, password) {
    const user = await Api.login(username, password);
    localStorage.setItem(SESSION_KEY, JSON.stringify(user));
    return user;
  }

  function logout() {
    localStorage.removeItem(SESSION_KEY);
  }

  function getCurrentUser() {
    const raw = localStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  }

  function hasRole(...roles) {
    const user = getCurrentUser();
    return !!user && roles.includes(user.role);
  }

  async function verifySuperadmin(password) {
    await Api.verifySuperadmin(password); // throw jika salah
    return true;
  }

  function initials(name) {
    return name
      .split(" ")
      .filter((w) => w.length > 1 && !/^(bin|binti|b\.|bt\.)$/i.test(w))
      .slice(0, 2)
      .map((w) => w[0])
      .join("")
      .toUpperCase();
  }

  return { login, logout, getCurrentUser, hasRole, verifySuperadmin, initials };
})();
