const API = import.meta.env.VITE_API_URL || '/api';

function getToken() {
  return localStorage.getItem('gsl_token');
}

function authHeaders() {
  const h = {};
  const t = getToken();
  if (t) h.Authorization = `Bearer ${t}`;
  return h;
}

export async function api(path, options = {}) {
  const defaultHeaders = options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' };
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: { ...defaultHeaders, ...authHeaders(), ...options.headers },
  });
  if (res.status === 401 && !path.startsWith('/auth/')) {
    localStorage.removeItem('gsl_token');
    localStorage.removeItem('gsl_user');
    window.location.href = '/auth';
    return;
  }
  return res.json();
}

export function apiFileUrl(path) {
  return `${API}/uploads/${path}`;
}

export function getUser() {
  try { return JSON.parse(localStorage.getItem('gsl_user')); }
  catch { return null; }
}

export function setAuth(token, user) {
  localStorage.setItem('gsl_token', token);
  localStorage.setItem('gsl_user', JSON.stringify(user));
}

export function logout() {
  localStorage.removeItem('gsl_token');
  localStorage.removeItem('gsl_user');
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
