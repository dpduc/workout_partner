/**
 * api.js
 * HTTP client for the FastAPI backend.
 * Base URL configurable via VITE_API_URL env var.
 */

const BASE = import.meta.env.VITE_API_URL ?? '';

async function request(method, path, body = null) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? `HTTP ${res.status}`);
  }

  if (res.status === 204) return null;
  return res.json();
}

const API = {
  exercises: {
    /** GET /api/exercises */
    list: () => request('GET', '/api/exercises'),
  },

  sessions: {
    /** POST /api/sessions */
    create: (notes = '') => request('POST', '/api/sessions', { notes }),

    /** GET /api/sessions?page=1&limit=20 */
    list: ({ page = 1, limit = 20 } = {}) =>
      request('GET', `/api/sessions?page=${page}&limit=${limit}`),

    /** GET /api/sessions/:id */
    get: (id) => request('GET', `/api/sessions/${id}`),

    /** PATCH /api/sessions/:id */
    update: (id, data) => request('PATCH', `/api/sessions/${id}`, data),

    /** DELETE /api/sessions/:id */
    delete: (id) => request('DELETE', `/api/sessions/${id}`),
  },

  sets: {
    /** POST /api/sessions/:sessionId/sets */
    add: (sessionId, data) =>
      request('POST', `/api/sessions/${sessionId}/sets`, data),

    /** PATCH /api/sets/:id */
    update: (id, data) => request('PATCH', `/api/sets/${id}`, data),

    /** DELETE /api/sets/:id */
    delete: (id) => request('DELETE', `/api/sets/${id}`),
  },

  stats: {
    /** GET /api/stats/summary */
    summary: () => request('GET', '/api/stats/summary'),

    /** GET /api/stats/weekly */
    weekly: () => request('GET', '/api/stats/weekly'),
  },
};

export default API;

// ── Offline fallback store (localStorage) ───────────────────────────────────
// Used when backend is not available (development / offline mode).

export const LocalStore = {
  _key: 'wp_sessions',

  _get() {
    try { return JSON.parse(localStorage.getItem(this._key) ?? '[]'); }
    catch { return []; }
  },

  _save(data) {
    localStorage.setItem(this._key, JSON.stringify(data));
  },

  getSessions() { return this._get(); },

  addSession(session) {
    const sessions = this._get();
    sessions.unshift(session);
    this._save(sessions);
    return session;
  },

  updateSession(id, updates) {
    const sessions = this._get().map((s) => s.id === id ? { ...s, ...updates } : s);
    this._save(sessions);
    return sessions.find((s) => s.id === id);
  },

  deleteSession(id) {
    const sessions = this._get().filter((s) => s.id !== id);
    this._save(sessions);
  },

  getSummary() {
    const sessions = this._get();
    let totalReps = 0;
    let totalDuration = 0;

    sessions.forEach((s) => {
      totalDuration += s.total_duration_s ?? 0;
      (s.sets ?? []).forEach((st) => { totalReps += st.reps ?? 0; });
    });

    // Calculate streak
    const today = new Date(); today.setHours(0,0,0,0);
    let streak = 0;
    const days = new Set(sessions.map((s) => {
      const d = new Date(s.started_at); d.setHours(0,0,0,0);
      return d.getTime();
    }));
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      if (days.has(d.getTime())) streak++;
      else if (i > 0) break;
    }

    return { total_sessions: sessions.length, total_reps: totalReps, total_duration_s: totalDuration, current_streak_days: streak };
  },

  getWeekly() {
    const sessions = this._get();
    const days = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    const data = Array(7).fill(0);
    const today = new Date(); today.setHours(0,0,0,0);

    sessions.forEach((s) => {
      const d = new Date(s.started_at); d.setHours(0,0,0,0);
      const diff = Math.round((today - d) / 86400000);
      if (diff >= 0 && diff < 7) {
        const idx = (today.getDay() - diff + 7) % 7;
        (s.sets ?? []).forEach((st) => { data[idx] += st.reps ?? 0; });
      }
    });

    const labels = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (6 - i));
      return days[d.getDay()];
    });

    const orderedData = Array.from({ length: 7 }, (_, i) => {
      const d = new Date(today); d.setDate(d.getDate() - (6 - i));
      const diff = Math.round((today - d) / 86400000);
      const idx  = (today.getDay() - diff + 7) % 7;
      return data[idx];
    });

    return { labels, datasets: [{ exercise: 'All Exercises', data: orderedData }] };
  },
};
