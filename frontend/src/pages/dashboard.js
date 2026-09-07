/**
 * dashboard.js — Dashboard page
 * Shows stats summary, streak, and weekly rep chart.
 */

import { Chart, registerables } from 'chart.js';
import API, { LocalStore } from '../modules/api.js';

Chart.register(...registerables);

let chartInstance = null;

export function DashboardPage() {
  const page = document.createElement('div');
  page.className = 'page';
  page.id = 'page-dashboard';

  page.innerHTML = `
    <div class="page-container">
      <div class="page-header animate-fadein">
        <h1>Dashboard</h1>
        <p>Your fitness journey at a glance</p>
      </div>

      <!-- Stats Grid -->
      <div class="stats-grid" id="stats-grid">
        ${_statCardSkeleton()}
        ${_statCardSkeleton()}
        ${_statCardSkeleton()}
        ${_statCardSkeleton()}
      </div>

      <!-- Charts Row -->
      <div class="grid-2" style="margin-bottom: var(--space-8)">
        <div class="chart-card animate-fadein" style="animation-delay:0.1s">
          <div class="chart-header">
            <h3 class="chart-title">📈 Weekly Reps</h3>
            <span class="badge badge-violet">Last 7 days</span>
          </div>
          <div class="chart-wrapper">
            <canvas id="weekly-chart"></canvas>
          </div>
        </div>

        <div class="card animate-fadein" style="animation-delay:0.2s">
          <div style="font-size:0.8rem; font-weight:600; color:var(--color-text-muted); letter-spacing:0.1em; text-transform:uppercase; margin-bottom:var(--space-4)">
            🔥 Current Streak
          </div>
          <div class="streak-display">
            <div class="streak-flame">🔥</div>
            <div>
              <div class="streak-count" id="streak-count">0</div>
              <div class="streak-unit">days in a row</div>
            </div>
          </div>
          <div class="divider"></div>
          <div id="streak-message" style="text-align:center; font-size:0.9rem; color:var(--color-text-secondary); padding: var(--space-2)">
            Start your first session today!
          </div>
        </div>
      </div>

      <!-- Recent Sessions -->
      <div class="chart-card animate-fadein" style="animation-delay:0.3s">
        <div class="chart-header">
          <h3 class="chart-title">📋 Recent Sessions</h3>
        </div>
        <div id="recent-sessions-list">
          <div style="text-align:center; padding: var(--space-8); color:var(--color-text-muted)">
            <div class="spinner" style="margin:0 auto var(--space-4)"></div>
            Loading...
          </div>
        </div>
      </div>
    </div>
  `;

  return page;
}

export async function initDashboardPage() {
  await _loadStats();
}

async function _loadStats() {
  try {
    let summary, weekly, sessions;

    // Try backend first, fall back to local store
    try {
      [summary, weekly, sessions] = await Promise.all([
        API.stats.summary(),
        API.stats.weekly(),
        API.sessions.list({ limit: 5 }),
      ]);
    } catch {
      summary  = LocalStore.getSummary();
      weekly   = LocalStore.getWeekly();
      sessions = { items: LocalStore.getSessions().slice(0, 5) };
    }

    _renderStats(summary);
    _renderChart(weekly);
    _renderStreak(summary.current_streak_days);
    _renderRecentSessions(sessions.items ?? sessions);

  } catch (err) {
    console.error('[Dashboard] Failed to load stats:', err);
  }
}

function _renderStats(summary) {
  const grid = document.getElementById('stats-grid');
  grid.innerHTML = `
    <div class="stat-card violet animate-fadein">
      <div class="stat-card-icon">🏃</div>
      <div class="stat-card-value">${summary.total_sessions ?? 0}</div>
      <div class="stat-card-label">Total Sessions</div>
    </div>
    <div class="stat-card cyan animate-fadein" style="animation-delay:0.05s">
      <div class="stat-card-icon">🔁</div>
      <div class="stat-card-value">${(summary.total_reps ?? 0).toLocaleString()}</div>
      <div class="stat-card-label">Total Reps</div>
    </div>
    <div class="stat-card green animate-fadein" style="animation-delay:0.1s">
      <div class="stat-card-icon">⏱️</div>
      <div class="stat-card-value">${_formatDuration(summary.total_duration_s ?? 0)}</div>
      <div class="stat-card-label">Total Time</div>
    </div>
    <div class="stat-card orange animate-fadein" style="animation-delay:0.15s">
      <div class="stat-card-icon">🔥</div>
      <div class="stat-card-value">${summary.current_streak_days ?? 0}</div>
      <div class="stat-card-label">Day Streak</div>
    </div>
  `;
}

function _renderChart(weekly) {
  const canvas = document.getElementById('weekly-chart');
  if (!canvas) return;

  if (chartInstance) {
    chartInstance.destroy();
    chartInstance = null;
  }

  const totalReps = (weekly.datasets?.[0]?.data ?? []).reduce((a, b) => a + b, 0);
  const maxReps   = Math.max(...(weekly.datasets?.[0]?.data ?? [1]));

  chartInstance = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: weekly.labels,
      datasets: [{
        label: 'Reps',
        data: weekly.datasets?.[0]?.data ?? [],
        backgroundColor: weekly.datasets?.[0]?.data?.map((v) => {
          const alpha = maxReps > 0 ? 0.2 + 0.6 * (v / maxReps) : 0.3;
          return `rgba(108,99,255,${alpha})`;
        }) ?? [],
        borderColor: 'rgba(108,99,255,0.8)',
        borderWidth: 2,
        borderRadius: 8,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 600, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: 'rgba(18,18,26,0.95)',
          borderColor: 'rgba(108,99,255,0.4)',
          borderWidth: 1,
          titleColor: '#F0F0FF',
          bodyColor: '#9090B0',
          padding: 12,
          callbacks: {
            label: (ctx) => ` ${ctx.parsed.y} reps`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#9090B0', font: { family: 'Inter', size: 12 } },
          border: { display: false },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#9090B0',
            font: { family: 'Inter', size: 12 },
            stepSize: Math.max(1, Math.ceil(maxReps / 5)),
          },
          border: { display: false },
          beginAtZero: true,
        },
      },
    },
  });
}

function _renderStreak(streak) {
  document.getElementById('streak-count').textContent = streak;
  const msg = document.getElementById('streak-message');

  if (streak === 0) msg.textContent = 'Start your first session today! 💪';
  else if (streak === 1) msg.textContent = "Great start! Come back tomorrow 🌟";
  else if (streak < 7)  msg.textContent = `Keep it up! ${7 - streak} more days for a full week 🎯`;
  else if (streak < 30) msg.textContent = `Amazing ${streak}-day streak! You're unstoppable 🚀`;
  else                  msg.textContent = `Legendary! ${streak} days of dedication 🏆`;
}

function _renderRecentSessions(sessions) {
  const list = document.getElementById('recent-sessions-list');

  if (!sessions || sessions.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <div class="empty-state-icon">🏋️</div>
        <h3>No sessions yet</h3>
        <p>Start your first workout to see stats here</p>
      </div>
    `;
    return;
  }

  list.innerHTML = sessions.map((s) => {
    const date  = new Date(s.started_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const reps  = (s.sets ?? []).reduce((a, st) => a + (st.reps ?? 0), 0);
    const sets  = (s.sets ?? []).length;
    const dur   = _formatDuration(s.total_duration_s ?? 0);
    return `
      <div style="display:flex; justify-content:space-between; align-items:center; padding: var(--space-4) 0; border-bottom: 1px solid var(--color-border);">
        <div>
          <div style="font-weight:600; margin-bottom:4px">${date}</div>
          <div style="font-size:0.8rem; color:var(--color-text-muted)">${sets} sets</div>
        </div>
        <div style="display:flex; gap:var(--space-3); align-items:center">
          <span class="badge badge-cyan">${reps} reps</span>
          <span style="font-size:0.8rem; color:var(--color-text-muted)">${dur}</span>
        </div>
      </div>
    `;
  }).join('');
}

function _statCardSkeleton() {
  return `<div class="stat-card" style="height:130px"><div class="skeleton" style="height:100%; border-radius:var(--radius-md)"></div></div>`;
}

function _formatDuration(secs) {
  if (!secs) return '0m';
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}
