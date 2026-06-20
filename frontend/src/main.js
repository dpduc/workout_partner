/**
 * main.js — App bootstrap and SPA router
 */

import './style.css';
import { createNavbar } from './components/navbar.js';
import { WorkoutPage,   initWorkoutPage   } from './pages/workout.js';
import { DashboardPage, initDashboardPage } from './pages/dashboard.js';
import { HistoryPage,   initHistoryPage   } from './pages/history.js';

// ── Page registry ─────────────────────────────────────────────────────────────
const PAGES = {
  workout:   { factory: WorkoutPage,   init: initWorkoutPage   },
  dashboard: { factory: DashboardPage, init: initDashboardPage },
  history:   { factory: HistoryPage,   init: initHistoryPage   },
};

let currentPageId = null;
const initializedPages = new Set();

// ── Bootstrap ─────────────────────────────────────────────────────────────────
const app = document.getElementById('app');

// Create navbar
const { element: navEl, setActive } = createNavbar(navigateTo);
app.appendChild(navEl);

// Create page containers (all pre-rendered, shown/hidden via CSS)
Object.entries(PAGES).forEach(([id, { factory }]) => {
  const pageEl = factory();
  pageEl.id = `page-${id}`;
  app.appendChild(pageEl);
});

// Navigate to initial page
navigateTo('workout');

// ── Router ────────────────────────────────────────────────────────────────────
async function navigateTo(pageId) {
  if (pageId === currentPageId) return;

  // Hide all pages
  document.querySelectorAll('.page').forEach((p) => p.classList.remove('active'));

  // Show target page
  const target = document.getElementById(`page-${pageId}`);
  if (!target) return;
  target.classList.add('active');

  // Update navbar
  setActive(pageId);
  currentPageId = pageId;

  // Init page once
  if (!initializedPages.has(pageId)) {
    initializedPages.add(pageId);
    try {
      await PAGES[pageId].init();
    } catch (err) {
      console.error(`[Router] Failed to init page "${pageId}":`, err);
    }
  } else {
    // Re-init data-heavy pages on revisit
    if (pageId === 'dashboard') await initDashboardPage();
    if (pageId === 'history')   await initHistoryPage();
  }
}
