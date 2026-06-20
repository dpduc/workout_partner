/**
 * history.js — Workout history page
 * Shows list of all sessions, with details and delete option.
 */

import API, { LocalStore } from '../modules/api.js';
import { showToast } from '../components/toast.js';
import { EXERCISES } from '../modules/repCounter.js';

let allSessions = [];
let currentPage = 1;
const PAGE_LIMIT = 15;
let hasMore = true;
let loading = false;

export function HistoryPage() {
  const page = document.createElement('div');
  page.className = 'page';
  page.id = 'page-history';

  page.innerHTML = `
    <div class="page-container">
      <div class="page-header animate-fadein">
        <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:var(--space-4)">
          <div>
            <h1>Workout History</h1>
            <p>All your training sessions</p>
          </div>
          <div style="display:flex; gap:var(--space-3); align-items:center">
            <span id="history-count" class="badge badge-violet">0 sessions</span>
          </div>
        </div>
      </div>

      <div class="history-list" id="history-list">
        <div style="text-align:center; padding:var(--space-16); color:var(--color-text-muted)">
          <div class="spinner" style="margin: 0 auto var(--space-4)"></div>
          Loading history...
        </div>
      </div>

      <div id="load-more-wrapper" style="text-align:center; margin-top:var(--space-8); display:none">
        <button class="btn btn-secondary" id="btn-load-more">
          Load More
        </button>
      </div>
    </div>
  `;

  return page;
}

export async function initHistoryPage() {
  currentPage = 1;
  allSessions = [];
  hasMore = true;

  await _loadSessions();

  document.getElementById('btn-load-more')?.addEventListener('click', async () => {
    currentPage++;
    await _loadSessions(true);
  });
}

async function _loadSessions(append = false) {
  if (loading) return;
  loading = true;

  try {
    let data;
    try {
      data = await API.sessions.list({ page: currentPage, limit: PAGE_LIMIT });
    } catch {
      // Offline fallback
      const all = LocalStore.getSessions();
      const start = (currentPage - 1) * PAGE_LIMIT;
      data = {
        items: all.slice(start, start + PAGE_LIMIT),
        total: all.length,
      };
    }

    const items = data.items ?? data;

    if (!append) allSessions = items;
    else allSessions = [...allSessions, ...items];

    hasMore = items.length === PAGE_LIMIT;

    _renderList();
    document.getElementById('history-count').textContent = `${data.total ?? allSessions.length} sessions`;
    document.getElementById('load-more-wrapper').style.display = hasMore ? 'block' : 'none';

  } catch (err) {
    console.error('[History] Load error:', err);
    showToast('Failed to load history', 'error');
  } finally {
    loading = false;
  }
}

function _renderList() {
  const list = document.getElementById('history-list');

  if (allSessions.length === 0) {
    list.innerHTML = `
      <div class="empty-state animate-fadein">
        <div class="empty-state-icon">📋</div>
        <h3>No workout history yet</h3>
        <p>Complete your first session to see it here</p>
      </div>
    `;
    return;
  }

  list.innerHTML = allSessions.map((session) => _renderSessionCard(session)).join('');

  // Bind delete buttons
  list.querySelectorAll('[data-delete-session]').forEach((btn) => {
    btn.addEventListener('click', () => _deleteSession(btn.dataset.deleteSession));
  });
}

function _renderSessionCard(session) {
  const date  = new Date(session.started_at);
  const dateStr = date.toLocaleDateString('vi-VN', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
  const timeStr = date.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const sets  = session.sets ?? [];
  const totalReps = sets.reduce((a, s) => a + (s.reps ?? 0), 0);
  const dur = _formatDuration(session.total_duration_s ?? 0);

  return `
    <div class="history-item animate-fadein" id="session-${session.id}">
      <div class="history-item-header">
        <div>
          <div class="history-item-date">${dateStr}</div>
          <div style="font-size:0.8rem; color:var(--color-text-muted); margin-top:2px">${timeStr}</div>
        </div>
        <div class="history-item-meta">
          <span class="badge badge-cyan">${totalReps} reps</span>
          <span class="badge badge-violet">${sets.length} sets</span>
          ${dur ? `<span class="badge badge-orange">${dur}</span>` : ''}
        </div>
      </div>

      ${sets.length > 0 ? `
        <div class="history-sets">
          ${sets.map((s) => {
            const exSlug = s.exercise_slug ?? 'jumping_jack';
            const ex = EXERCISES[exSlug];
            return `
              <span class="history-set-pill">
                ${ex?.icon ?? '🏃'} Set ${s.set_number}: ${s.reps} reps · ${_formatTime(s.duration_s ?? 0)}
              </span>
            `;
          }).join('')}
        </div>
      ` : ''}

      ${session.notes ? `<div class="history-notes">"${session.notes}"</div>` : ''}

      <div class="history-actions">
        <button
          class="btn btn-danger btn-sm"
          data-delete-session="${session.id}"
          id="delete-btn-${session.id}"
          aria-label="Delete session"
        >
          🗑 Delete
        </button>
      </div>
    </div>
  `;
}

async function _deleteSession(id) {
  if (!confirm('Delete this workout session? This cannot be undone.')) return;

  try {
    try {
      await API.sessions.delete(id);
    } catch {
      LocalStore.deleteSession(id);
    }

    allSessions = allSessions.filter((s) => s.id !== id);
    document.getElementById(`session-${id}`)?.remove();
    document.getElementById('history-count').textContent = `${allSessions.length} sessions`;

    if (allSessions.length === 0) _renderList();
    showToast('Session deleted', 'info');

  } catch (err) {
    showToast('Failed to delete session', 'error');
  }
}

function _formatDuration(secs) {
  if (!secs) return '';
  const m = Math.floor(secs / 60);
  const h = Math.floor(m / 60);
  if (h > 0) return `${h}h ${m % 60}m`;
  return `${m}m`;
}

function _formatTime(secs) {
  const m = Math.floor(secs / 60);
  const s = secs % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}
