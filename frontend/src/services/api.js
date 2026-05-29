const BASE = (import.meta.env.VITE_API_URL ?? '') + '/api';

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

async function uploadFile(path, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: authHeaders(),
    body: form,
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
    importPdf: (file) => uploadFile('/recipes/import-pdf', file),
  },
  allergies: {
    get: () => request('GET', '/allergies'),
    add: (ingredient) => request('POST', '/allergies', { ingredient }),
    remove: (ingredient) => request('DELETE', `/allergies/${encodeURIComponent(ingredient)}`),
  },
  corrections: {
    get: () => request('GET', '/corrections'),
    save: (yolo_class, corrected_ingredient) =>
      request('POST', '/corrections', { yolo_class, corrected_ingredient }),
  },
  menus: {
    weekly: (ingredients, filters = []) =>
      request('POST', '/menus/weekly', { ingredients, filters }),
  },
};
