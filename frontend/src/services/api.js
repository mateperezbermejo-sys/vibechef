const BASE = '/api';

function getToken() {
  return localStorage.getItem('vibechef_token');
}

function authHeaders() {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error desconocido');
  return data;
}

export const api = {
  auth: {
    register: (email, password) => request('POST', '/auth/register', { email, password }),
    login: (email, password) => request('POST', '/auth/login', { email, password }),
  },
  pantry: {
    log: (ingredients) => request('POST', '/pantry/log', { ingredients }),
    predict: () => request('GET', '/pantry/predict'),
    history: () => request('GET', '/pantry/history'),
  },
  recipes: {
    match: (ingredients, filters) => request('POST', '/recipes/match', { ingredients, filters }),
    all: () => request('GET', '/recipes'),
  },
};
