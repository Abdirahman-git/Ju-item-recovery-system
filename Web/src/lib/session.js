const SESSION_KEY = 'userSession';

/** Super Admin email — only this account can use Deleted Records, suspend/delete users, and archive stale items. */
export const SUPER_ADMIN_EMAIL = 'admin2@ju.edu.so';

export function isSuperAdmin(session) {
  const email = String(session?.email || '').trim().toLowerCase();
  return email === SUPER_ADMIN_EMAIL;
}

export function getSession() {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) return null;
    const session = JSON.parse(raw);
    if (!session?.isLoggedIn || session?.role !== 'admin') return null;
    // Phase 3A: admin mutations need adminToken from Backend login
    if (!String(session.adminToken || '').trim()) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return session;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}
