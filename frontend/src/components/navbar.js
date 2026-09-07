/**
 * navbar.js
 * Top navigation bar component with SPA routing and Auth status chip.
 */

import { auth } from '../modules/auth.js';

const NAV_ITEMS = [
  { id: 'workout',   label: 'Workout',   icon: '🏃' },
  { id: 'dashboard', label: 'Dashboard', icon: '📊' },
  { id: 'history',   label: 'History',   icon: '📋' },
];

export function createNavbar(onNavigate) {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Main navigation');

  nav.innerHTML = `
    <a class="navbar-logo" href="#" id="nav-logo" aria-label="Workout Partner Home">
      <div class="navbar-logo-icon">🏋️</div>
      <span>Workout Partner</span>
    </a>

    <div class="navbar-nav" role="menubar">
      ${NAV_ITEMS.map(({ id, label, icon }) => `
        <button
          class="nav-link"
          id="nav-${id}"
          role="menuitem"
          data-page="${id}"
          aria-label="Navigate to ${label}"
        >
          <span aria-hidden="true">${icon}</span>
          ${label}
        </button>
      `).join('')}
    </div>

    <!-- User / Auth Profile Chip -->
    <div class="navbar-user-chip" id="user-chip-container">
      <button class="user-chip-btn" id="btn-user-profile" title="Account / Profile">
        <span class="user-avatar" id="nav-user-avatar">👤</span>
        <span class="user-name" id="nav-user-name">Guest</span>
        <span class="user-badge" id="nav-user-badge">Local</span>
      </button>

      <div class="user-dropdown-menu" id="user-dropdown" style="display: none;">
        <div class="user-dropdown-header">
          <div class="dropdown-title" id="dropdown-user-title">Guest Athlete</div>
          <div class="dropdown-subtitle" id="dropdown-user-subtitle">Workouts stored locally</div>
        </div>
        <div class="dropdown-divider"></div>
        <button class="dropdown-item" id="btn-dropdown-auth">
          <span>🔐</span> <span id="dropdown-auth-label">Sign In / Cloud Sync</span>
        </button>
        <button class="dropdown-item" id="btn-dropdown-logout" style="display: none;">
          <span>🚪</span> <span>Sign Out</span>
        </button>
      </div>
    </div>
  `;

  // Page routing clicks
  nav.querySelectorAll('.nav-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      setActive(page);
      onNavigate(page);
    });
  });

  nav.querySelector('#nav-logo').addEventListener('click', (e) => {
    e.preventDefault();
    const userState = auth.getUserState();
    if (userState.isLoggedIn) {
      setActive('workout');
      onNavigate('workout');
    } else {
      setActive('welcome');
      onNavigate('welcome');
    }
  });

  // User Profile Dropdown logic
  const chipBtn = nav.querySelector('#btn-user-profile');
  const dropdown = nav.querySelector('#user-dropdown');
  const btnDropdownAuth = nav.querySelector('#btn-dropdown-auth');
  const btnDropdownLogout = nav.querySelector('#btn-dropdown-logout');

  chipBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
  });

  document.addEventListener('click', () => {
    dropdown.style.display = 'none';
  });

  btnDropdownAuth.addEventListener('click', () => {
    dropdown.style.display = 'none';
    setActive('welcome');
    onNavigate('welcome');
  });

  btnDropdownLogout.addEventListener('click', async () => {
    dropdown.style.display = 'none';
    await auth.signOut();
    setActive('welcome');
    onNavigate('welcome');
  });

  // Subscribe to auth state updates
  auth.subscribe((state) => {
    const avatarEl = nav.querySelector('#nav-user-avatar');
    const nameEl = nav.querySelector('#nav-user-name');
    const badgeEl = nav.querySelector('#nav-user-badge');
    const titleEl = nav.querySelector('#dropdown-user-title');
    const subTitleEl = nav.querySelector('#dropdown-user-subtitle');
    const authLabel = nav.querySelector('#dropdown-auth-label');

    if (state.isAuthenticated || state.isLoggedIn) {
      avatarEl.textContent = state.isAuthenticated ? '⚡' : '👤';
      nameEl.textContent = state.alias || state.displayName;
      badgeEl.textContent = state.isAuthenticated ? 'Cloud' : 'Local';
      badgeEl.className = state.isAuthenticated ? 'user-badge cloud' : 'user-badge local';
      
      const handle = state.uniqueId ? `@${state.uniqueId}` : '';
      titleEl.textContent = `${state.alias || state.displayName} ${handle}`;

      if (state.hasLinkedEmail) {
        subTitleEl.innerHTML = `<span>📧 ${state.email}</span>`;
      } else if (state.isGuest) {
        subTitleEl.textContent = 'Guest mode (stored locally)';
      } else {
        subTitleEl.innerHTML = `<span style="color:var(--color-warning);">⚠️ No email linked (Cleanup risk)</span>`;
      }

      authLabel.textContent = 'Switch Account';
      btnDropdownLogout.style.display = 'flex';
    } else {
      avatarEl.textContent = '👋';
      nameEl.textContent = 'Welcome';
      badgeEl.textContent = 'Guest';
      badgeEl.className = 'user-badge local';
      titleEl.textContent = 'Welcome to Workout Partner';
      subTitleEl.textContent = 'Get started today';
      authLabel.textContent = 'Sign In / Sign Up';
      btnDropdownLogout.style.display = 'none';
    }
  });

  function setActive(pageId) {
    nav.querySelectorAll('.nav-link').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });
  }

  function setVisible(visible) {
    nav.style.display = visible ? 'flex' : 'none';
  }

  return { element: nav, setActive, setVisible };
}
