/**
 * api.js
 * Unified data layer for Workout Partner.
 * Routes through:
 * 1. Supabase (if configured & authenticated)
 * 2. FastAPI backend (if running on localhost:8000)
 * 3. LocalStore (localStorage offline fallback)
 */

import { supabase, isSupabaseConfigured } from './supabase.js';
import { auth } from './auth.js';

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

// ── Offline fallback store (localStorage) ───────────────────────────────────
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

  // Helper to sync local sessions to Supabase when user creates/signs into an account
  async syncToSupabase(userId) {
    if (!isSupabaseConfigured || !supabase || !userId) return;
    const local = this.getSessions();
    if (!local.length) return;

    for (const s of local) {
      try {
        const { data: dbSession, error: sErr } = await supabase
          .from('workout_sessions')
          .insert({
            user_id: userId,
            started_at: s.started_at,
            ended_at: s.ended_at,
            total_reps: s.total_reps || (s.sets ?? []).reduce((acc, x) => acc + (x.reps || 0), 0),
            notes: s.notes || '',
          })
          .select()
          .single();

        if (sErr || !dbSession) continue;

        if (s.sets?.length) {
          const setsPayload = s.sets.map((st) => ({
            session_id: dbSession.id,
            user_id: userId,
            exercise_id: st.exercise_slug || String(st.exercise_id),
            set_number: st.set_number,
            reps: st.reps,
            started_at: st.started_at || s.started_at,
            ended_at: st.ended_at || s.ended_at,
          }));
          await supabase.from('workout_sets').insert(setsPayload);
        }
      } catch (e) {
        console.warn('Failed to sync session to Supabase:', e);
      }
    }
  },
};

// ── Unified API Object ───────────────────────────────────────────────────────
const API = {
  exercises: {
    list: async () => {
      try { return await request('GET', '/api/exercises'); }
      catch {
        return [
          { id: 1, slug: 'jumping_jack', name: 'Jumping Jacks', category: 'Cardio' },
          { id: 2, slug: 'squat', name: 'Bodyweight Squats', category: 'Legs' },
          { id: 3, slug: 'pushup', name: 'Push-ups', category: 'Upper Body' },
        ];
      }
    },
  },

  sessions: {
    create: async (notes = '') => {
      const userState = auth.getUserState();
      // 1. If Supabase is available and authenticated
      if (isSupabaseConfigured && supabase && userState.isAuthenticated) {
        try {
          const { data, error } = await supabase
            .from('workout_sessions')
            .insert({
              user_id: userState.user.id,
              notes,
              started_at: new Date().toISOString(),
            })
            .select()
            .single();
          if (!error && data) return data;
        } catch (e) {
          console.warn('Supabase session create failed, trying fallback:', e);
        }
      }

      // 2. Try FastAPI backend
      try {
        return await request('POST', '/api/sessions', { notes });
      } catch {
        // 3. Fall back to LocalStore
        const newSession = {
          id: 'local_' + Date.now(),
          started_at: new Date().toISOString(),
          notes,
          sets: [],
          total_duration_s: 0,
        };
        LocalStore.addSession(newSession);
        return newSession;
      }
    },

    list: async ({ page = 1, limit = 20 } = {}) => {
      const userState = auth.getUserState();
      if (isSupabaseConfigured && supabase && userState.isAuthenticated) {
        try {
          const from = (page - 1) * limit;
          const to = from + limit - 1;
          const { data, count, error } = await supabase
            .from('workout_sessions')
            .select('*, sets:workout_sets(*)', { count: 'exact' })
            .order('started_at', { ascending: false })
            .range(from, to);

          if (!error && data) {
            return {
              items: data.map((d) => ({
                id: d.id,
                started_at: d.started_at,
                ended_at: d.ended_at,
                total_duration_s: d.ended_at ? Math.round((new Date(d.ended_at) - new Date(d.started_at))/1000) : 0,
                notes: d.notes,
                sets: d.sets || [],
              })),
              total: count ?? data.length,
              page,
              limit,
            };
          }
        } catch (e) {
          console.warn('Supabase session list failed, fallback to local:', e);
        }
      }

      // Try backend
      try {
        return await request('GET', `/api/sessions?page=${page}&limit=${limit}`);
      } catch {
        // LocalStore
        const all = LocalStore.getSessions();
        const start = (page - 1) * limit;
        return {
          items: all.slice(start, start + limit),
          total: all.length,
          page,
          limit,
        };
      }
    },

    get: async (id) => {
      try { return await request('GET', `/api/sessions/${id}`); }
      catch {
        return LocalStore.getSessions().find((s) => s.id === id);
      }
    },

    update: async (id, data) => {
      const userState = auth.getUserState();
      if (isSupabaseConfigured && supabase && userState.isAuthenticated && !String(id).startsWith('local_')) {
        try {
          const { error } = await supabase
            .from('workout_sessions')
            .update({
              ended_at: data.ended_at,
              total_reps: data.total_reps,
              notes: data.notes,
            })
            .eq('id', id);
          if (!error) return { id, ...data };
        } catch (e) {
          console.warn('Supabase session update failed:', e);
        }
      }

      try {
        return await request('PATCH', `/api/sessions/${id}`, data);
      } catch {
        return LocalStore.updateSession(id, data);
      }
    },

    delete: async (id) => {
      const userState = auth.getUserState();
      if (isSupabaseConfigured && supabase && userState.isAuthenticated && !String(id).startsWith('local_')) {
        try {
          await supabase.from('workout_sessions').delete().eq('id', id);
        } catch (e) {
          console.warn('Supabase delete failed:', e);
        }
      }

      try {
        return await request('DELETE', `/api/sessions/${id}`);
      } catch {
        LocalStore.deleteSession(id);
      }
    },
  },

  sets: {
    add: async (sessionId, data) => {
      const userState = auth.getUserState();
      if (isSupabaseConfigured && supabase && userState.isAuthenticated && !String(sessionId).startsWith('local_')) {
        try {
          const { data: setRes, error } = await supabase
            .from('workout_sets')
            .insert({
              session_id: sessionId,
              user_id: userState.user.id,
              exercise_id: data.exercise_slug || String(data.exercise_id),
              set_number: data.set_number,
              reps: data.reps,
              started_at: new Date().toISOString(),
              ended_at: new Date().toISOString(),
            })
            .select()
            .single();
          if (!error && setRes) return setRes;
        } catch (e) {
          console.warn('Supabase set insert failed:', e);
        }
      }

      try {
        return await request('POST', `/api/sessions/${sessionId}/sets`, data);
      } catch {
        const session = LocalStore.getSessions().find((s) => s.id === sessionId);
        const currentSets = session?.sets || [];
        currentSets.push(data);
        LocalStore.updateSession(sessionId, { sets: currentSets });
        return data;
      }
    },

    update: async (id, data) => {
      try { return await request('PATCH', `/api/sets/${id}`, data); }
      catch { return data; }
    },

    delete: async (id) => {
      try { return await request('DELETE', `/api/sets/${id}`); }
      catch { return null; }
    },
  },

  stats: {
    summary: async () => {
      try { return await request('GET', '/api/stats/summary'); }
      catch { return LocalStore.getSummary(); }
    },

    weekly: async () => {
      try { return await request('GET', '/api/stats/weekly'); }
      catch { return LocalStore.getWeekly(); }
    },
  },
};

export default API;
