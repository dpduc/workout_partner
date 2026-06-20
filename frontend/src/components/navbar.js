/**
 * navbar.js
 * Top navigation bar component with SPA routing.
 */

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
  `;

  nav.querySelectorAll('.nav-link').forEach((btn) => {
    btn.addEventListener('click', () => {
      const page = btn.dataset.page;
      setActive(page);
      onNavigate(page);
    });
  });

  nav.querySelector('#nav-logo').addEventListener('click', (e) => {
    e.preventDefault();
    setActive('workout');
    onNavigate('workout');
  });

  function setActive(pageId) {
    nav.querySelectorAll('.nav-link').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.page === pageId);
    });
  }

  return { element: nav, setActive };
}
