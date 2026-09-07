/**
 * welcome.js
 * Welcome & Onboarding Landing Page
 * Allows:
 * - Skipping ahead as guest
 * - Sign Up with Name/Alias, Unique ID, Password (8+ chars), Confirm Password, and optional Email
 * - Warning about database limitation / clearing accounts without linked email
 * - Sign In with Unique ID or Email
 */

import { auth } from '../modules/auth.js';
import { isSupabaseConfigured } from '../modules/supabase.js';
import { showToast } from '../components/toast.js';

export function WelcomePage(onNavigate) {
  const page = document.createElement('div');
  page.className = 'page';
  page.id = 'page-welcome';

  page.innerHTML = `
    <div class="welcome-container">
      <!-- Background Ambient Glow -->
      <div class="welcome-glow welcome-glow-1"></div>
      <div class="welcome-glow welcome-glow-2"></div>

      <div class="welcome-content">
        <!-- Hero Header -->
        <div class="welcome-badge">
          <span class="pulse-dot"></span>
          Next-Gen AI Workout Companion
        </div>

        <h1 class="welcome-title">
          Train Smarter with <span class="gradient-text">Real-Time AI</span>
        </h1>

        <p class="welcome-subtitle">
          Camera-powered pose detection, automatic rep counting, and form coaching.
          Zero hardware needed — start instantly.
        </p>

        <!-- Feature Grid -->
        <div class="welcome-features">
          <div class="feature-card">
            <div class="feature-icon">🎯</div>
            <h3>33-Point Pose Tracking</h3>
            <p>Runs 100% on your device with MediaPipe. Total privacy, zero video upload.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🔊</div>
            <h3>Voice Coaching</h3>
            <p>Live audio rep counts, phase cues, and form corrections in real time.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h3>Cloud & Offline Sync</h3>
            <p>Track sets, calculate accuracy, and save history seamlessly.</p>
          </div>
        </div>

        <!-- Call to Action Section -->
        <div class="welcome-actions">
          <button class="btn btn-primary btn-xl" id="btn-welcome-guest">
            ⚡ Try as Guest (Skip Ahead)
          </button>
          <button class="btn btn-secondary btn-xl" id="btn-welcome-auth">
            🔐 Sign In / Create Account
          </button>
        </div>

        <div class="welcome-note">
          No credit card required. Guest mode stores data directly in your browser.
        </div>
      </div>
    </div>

    <!-- Auth Modal -->
    <div class="auth-modal-backdrop" id="auth-modal" style="display: none;">
      <div class="auth-modal-card">
        <button class="auth-modal-close" id="btn-close-auth" aria-label="Close modal">&times;</button>
        
        <div class="auth-modal-header">
          <div class="auth-logo">🏋️</div>
          <h2 id="auth-title">Welcome Back</h2>
          <p id="auth-subtitle">Sign in to sync your workout history to the cloud</p>
        </div>

        <!-- Auth Tabs -->
        <div class="auth-tabs">
          <button class="auth-tab active" id="tab-signin">Sign In</button>
          <button class="auth-tab" id="tab-signup">Create Account</button>
        </div>

        <!-- Auth Form -->
        <form id="auth-form" class="auth-form">
          
          <!-- Sign-up specific: Alias / Name -->
          <div class="form-group" id="group-alias" style="display: none;">
            <label for="auth-alias">Name or Alias <span class="label-required">*</span></label>
            <input type="text" id="auth-alias" placeholder="e.g. Spartan Alex" class="form-input" autocomplete="name">
            <span class="field-hint">How you'll appear on your dashboard</span>
          </div>

          <!-- Sign-up specific: Unique ID -->
          <div class="form-group" id="group-unique-id" style="display: none;">
            <label for="auth-unique-id">Unique Athlete ID <span class="label-required">*</span></label>
            <div class="input-with-prefix">
              <span class="input-prefix">@</span>
              <input type="text" id="auth-unique-id" placeholder="alex99" class="form-input prefixed" autocomplete="username" pattern="[a-zA-Z0-9_-]{3,20}">
            </div>
            <span class="field-hint">Unique handle (3-20 letters, numbers, or dashes)</span>
          </div>

          <!-- Sign-in specific identifier (Unique ID or Email) -->
          <div class="form-group" id="group-identifier">
            <label for="auth-identifier">Unique ID or Email <span class="label-required">*</span></label>
            <input type="text" id="auth-identifier" placeholder="e.g. alex99 or alex@mail.com" class="form-input" autocomplete="username">
          </div>

          <!-- Optional Email field (Sign-up only) -->
          <div class="form-group" id="group-email" style="display: none;">
            <div style="display:flex; justify-content:space-between; align-items:baseline;">
              <label for="auth-email">Email Address <span class="label-optional">(Optional)</span></label>
            </div>
            <input type="email" id="auth-email" placeholder="alex@example.com" class="form-input" autocomplete="email">
            
            <!-- Database Storage Notice Alert -->
            <div class="db-limit-warning">
              <div class="warning-icon">⚠️</div>
              <div class="warning-text">
                <strong>Important Notice:</strong> Our database space is currently limited. Accounts <em>without a linked email</em> may be periodically pruned during cleanup sweeps. Link an email to permanently safeguard your workout streaks and history!
              </div>
            </div>
          </div>

          <!-- Password field -->
          <div class="form-group">
            <label for="auth-password">Password <span class="label-required">*</span></label>
            <input type="password" id="auth-password" placeholder="At least 8 characters" class="form-input" required autocomplete="current-password" minlength="8">
            <span class="field-hint" id="password-hint">Minimum 8 characters</span>
          </div>

          <!-- Confirm Password field (Sign-up only) -->
          <div class="form-group" id="group-confirm-password" style="display: none;">
            <label for="auth-confirm-password">Confirm Password <span class="label-required">*</span></label>
            <input type="password" id="auth-confirm-password" placeholder="Re-enter password" class="form-input" autocomplete="new-password" minlength="8">
          </div>

          <div id="supabase-hint" class="auth-hint" style="display: none;">
            💡 Supabase credentials not set in <code>.env</code> yet. Accounts are created instantly in <strong>Local Storage</strong> and can sync to cloud later!
          </div>

          <button type="submit" class="btn btn-primary btn-lg auth-submit-btn" id="btn-submit-auth">
            Sign In
          </button>
        </form>

        <div class="auth-modal-footer">
          <span>Just exploring? </span>
          <a href="#" id="link-modal-guest">Continue as Guest &rarr;</a>
        </div>
      </div>
    </div>
  `;

  // DOM references
  const btnGuest = page.querySelector('#btn-welcome-guest');
  const btnAuth = page.querySelector('#btn-welcome-auth');
  const modal = page.querySelector('#auth-modal');
  const btnCloseModal = page.querySelector('#btn-close-auth');
  const linkModalGuest = page.querySelector('#link-modal-guest');

  const tabSignIn = page.querySelector('#tab-signin');
  const tabSignUp = page.querySelector('#tab-signup');
  const groupAlias = page.querySelector('#group-alias');
  const groupUniqueId = page.querySelector('#group-unique-id');
  const groupIdentifier = page.querySelector('#group-identifier');
  const groupEmail = page.querySelector('#group-email');
  const groupConfirmPassword = page.querySelector('#group-confirm-password');
  const authTitle = page.querySelector('#auth-title');
  const authSubtitle = page.querySelector('#auth-subtitle');
  const btnSubmit = page.querySelector('#btn-submit-auth');
  const authForm = page.querySelector('#auth-form');
  const hintSupabase = page.querySelector('#supabase-hint');

  let mode = 'signin'; // 'signin' or 'signup'

  if (!isSupabaseConfigured) {
    hintSupabase.style.display = 'block';
  }

  function setMode(newMode) {
    mode = newMode;
    if (mode === 'signin') {
      tabSignIn.classList.add('active');
      tabSignUp.classList.remove('active');
      groupAlias.style.display = 'none';
      groupUniqueId.style.display = 'none';
      groupIdentifier.style.display = 'flex';
      groupEmail.style.display = 'none';
      groupConfirmPassword.style.display = 'none';
      authTitle.textContent = 'Welcome Back';
      authSubtitle.textContent = 'Sign in with your Unique ID or Email';
      btnSubmit.textContent = 'Sign In';
    } else {
      tabSignUp.classList.add('active');
      tabSignIn.classList.remove('active');
      groupAlias.style.display = 'flex';
      groupUniqueId.style.display = 'flex';
      groupIdentifier.style.display = 'none';
      groupEmail.style.display = 'flex';
      groupConfirmPassword.style.display = 'flex';
      authTitle.textContent = 'Create Athlete Account';
      authSubtitle.textContent = 'Set your unique ID and password to get started';
      btnSubmit.textContent = 'Create Account';
    }
  }

  function openModal(defaultMode = 'signin') {
    setMode(defaultMode);
    modal.style.display = 'flex';
  }

  function closeModal() {
    modal.style.display = 'none';
  }

  function handleGuestEntry() {
    auth.setGuestMode();
    showToast('Entered as Guest Athlete! All workouts will be saved locally.', 'info');
    closeModal();
    onNavigate('workout');
  }

  btnGuest.addEventListener('click', handleGuestEntry);
  linkModalGuest.addEventListener('click', (e) => {
    e.preventDefault();
    handleGuestEntry();
  });

  btnAuth.addEventListener('click', () => openModal('signin'));
  btnCloseModal.addEventListener('click', closeModal);
  modal.addEventListener('click', (e) => {
    if (e.target === modal) closeModal();
  });

  tabSignIn.addEventListener('click', () => setMode('signin'));
  tabSignUp.addEventListener('click', () => setMode('signup'));

  authForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const password = page.querySelector('#auth-password').value;

    // Password length validation
    if (password.length < 8) {
      showToast('Password must be at least 8 characters long.', 'warning');
      return;
    }

    btnSubmit.disabled = true;
    const originalText = btnSubmit.textContent;
    btnSubmit.textContent = mode === 'signin' ? 'Signing in...' : 'Creating account...';

    try {
      if (mode === 'signin') {
        const identifier = page.querySelector('#auth-identifier').value.trim();
        if (!identifier) {
          throw new Error('Please enter your Unique ID or Email.');
        }
        await auth.signIn({ identifier, password });
        showToast('Welcome back! Signed in successfully.', 'success');
      } else {
        // Sign up mode
        const alias = page.querySelector('#auth-alias').value.trim();
        const uniqueId = page.querySelector('#auth-unique-id').value.trim().toLowerCase();
        const confirmPassword = page.querySelector('#auth-confirm-password').value;
        const email = page.querySelector('#auth-email').value.trim();

        if (!alias) {
          throw new Error('Please enter a Name or Alias.');
        }
        if (!uniqueId || uniqueId.length < 3) {
          throw new Error('Unique ID must be at least 3 characters.');
        }
        if (!/^[a-z0-9_-]+$/.test(uniqueId)) {
          throw new Error('Unique ID can only contain letters, numbers, hyphens, and underscores.');
        }
        if (password !== confirmPassword) {
          throw new Error('Passwords do not match. Please verify your confirmation.');
        }

        await auth.signUp({ alias, uniqueId, password, email });
        
        if (!email) {
          showToast(`Account created as @${uniqueId}! Note: linking an email later prevents data clearing.`, 'info', 6000);
        } else {
          showToast(`Account created! Welcome, ${alias}.`, 'success');
        }
      }

      closeModal();
      onNavigate('workout');
    } catch (err) {
      console.error('Auth error:', err);
      showToast(err.message || 'Authentication error occurred.', 'error');
    } finally {
      btnSubmit.disabled = false;
      btnSubmit.textContent = originalText;
    }
  });

  return page;
}

export async function initWelcomePage() {
  // Initialization logic if needed
}
