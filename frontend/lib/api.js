const API_BASE = '/api';

function getToken() {
  if (typeof window === 'undefined') return null;
  return window.localStorage.getItem('hairflow_token');
}

export function setToken(token) {
  window.localStorage.setItem('hairflow_token', token);
}

export function clearToken() {
  window.localStorage.removeItem('hairflow_token');
}

export function getUser() {
  if (typeof window === 'undefined') return null;
  const raw = window.localStorage.getItem('hairflow_user');
  return raw ? JSON.parse(raw) : null;
}

export function setUser(user) {
  window.localStorage.setItem('hairflow_user', JSON.stringify(user));
}

export async function apiFetch(path, options = {}) {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });

  if (res.status === 401) {
    clearToken();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
    throw new Error('Sessão expirada');
  }

  const text = await res.text();
  const data = text ? JSON.parse(text) : null;

  if (!res.ok) {
    throw new Error(data?.message || 'Erro ao comunicar com o servidor');
  }

  return data;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data?.message || 'Credenciais inválidas');
  }

  setToken(data.accessToken);
  setUser(data.user);
  return data;
}
