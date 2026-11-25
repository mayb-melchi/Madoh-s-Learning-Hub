const API = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('egah_token');
}

function authHeaders() {
  const h = {};
  const t = getToken();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export async function api(path, options = {}) {
  const defaultHeaders = options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
  try {
    const res = await fetch(`${API}${path}`, {
      ...options,
      headers: { ...defaultHeaders, ...authHeaders(), ...options.headers },
    });
    if (res.status === 401 && !path.startsWith('/auth/')) {
      localStorage.removeItem('egah_token');
      localStorage.removeItem('egah_user');
      window.location.href = '/auth';
      return;
    }
    const text = await res.text();
    if (!text) return { error: 'Empty response from server' };
    try { return JSON.parse(text); }
    catch { return { error: 'Invalid server response' }; }
  } catch (err) {
    return { error: 'Cannot connect to server' };
  }
}

export function apiFileUrl(fileUrl) {
  return fileUrl || null;
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('egah_user')); }
  catch { return null; }
}

export function setAuth(token, user) {
  localStorage.setItem('egah_token', token);
  localStorage.setItem('egah_user', JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem('egah_token');
  localStorage.removeItem('egah_user');
  window.location.href = '/';
}

export function canManage(user, courseId) {
  if (user?.role === 'lecturer') return true;
  if (courseId && user?.courseRoles?.[courseId] === 'course_rep') return true;
  if (!courseId) {
    const roles = user?.courseRoles || {};
    return Object.values(roles).includes('course_rep');
  }
  return false;
}
