/**
 * workout.js — Main workout page
 * Camera feed + MediaPipe pose detection + rep counting UI
 */

import PoseDetector from '../modules/poseDetector.js';
import { RepCounter, EXERCISES } from '../modules/repCounter.js';
import SkeletonDraw from '../modules/skeletonDraw.js';
import AudioFeedback from '../modules/audioFeedback.js';
import API, { LocalStore } from '../modules/api.js';
import { showToast } from '../components/toast.js';

// ── State ────────────────────────────────────────────────────────────────────
let videoEl = null;
let canvasEl = null;
let stream   = null;

let counter  = new RepCounter('jumping_jack');
let currentExerciseId = 'jumping_jack';

let sessionActive  = false;
let setActive      = false;
let setStartTime   = null;
let sessionStartTime = null;
let sessionId      = null;
let setNumber      = 0;
let completedSets  = [];

let sessionTimerInterval = null;
let setTimerInterval     = null;

let modelLoaded = false;

// ── Build Page HTML ──────────────────────────────────────────────────────────
export function WorkoutPage() {
  const page = document.createElement('div');
  page.className = 'page';
  page.id = 'page-workout';

  page.innerHTML = `
    <div class="workout-layout">

      <!-- Camera Area -->
      <div class="camera-area" id="camera-area">
        <video id="workout-video" autoplay muted playsinline></video>
        <canvas id="workout-canvas"></canvas>

        <!-- Camera overlay - top -->
        <div class="camera-overlay-top">
          <div class="camera-status-badge" id="status-badge">
            <div class="status-dot loading" id="status-dot"></div>
            <span id="status-text">Loading model...</span>
          </div>
          <div class="fps-badge" id="fps-badge">0 FPS</div>
        </div>

        <!-- Camera overlay - bottom -->
        <div class="camera-overlay-bottom" id="camera-overlay-bottom" style="display:none">
          <div class="camera-status-badge animate-blink">
            <div class="status-dot active"></div>
            <span>SET IN PROGRESS</span>
          </div>
        </div>

        <!-- Placeholder when camera not started -->
        <div class="camera-placeholder" id="camera-placeholder">
          <div class="camera-placeholder-icon">📷</div>
          <p>Camera will start when you begin a session</p>
        </div>
      </div>

      <!-- Sidebar -->
      <div class="sidebar-panel" id="sidebar-panel">

        <!-- Rep Counter Display -->
        <div class="counter-display animate-pulse" id="counter-display">
          <div class="counter-label">REPS</div>
          <div class="counter-number" id="rep-count">0</div>
          <div class="counter-phase phase-idle" id="phase-badge">● IDLE</div>
        </div>

        <!-- Set & Session Info -->
        <div class="set-info-row">
          <div class="info-block">
            <div class="info-block-label">Set Timer</div>
            <div class="info-block-value cyan" id="set-timer">0:00</div>
          </div>
          <div class="info-block">
            <div class="info-block-label">Session</div>
            <div class="info-block-value violet" id="session-timer">0:00</div>
          </div>
          <div class="info-block">
            <div class="info-block-label">Sets Done</div>
            <div class="info-block-value" id="sets-done">0</div>
          </div>
          <div class="info-block">
            <div class="info-block-label">Total Reps</div>
            <div class="info-block-value" id="total-reps-info">0</div>
          </div>
        </div>

        <!-- Session Controls -->
        <div style="display:flex; flex-direction:column; gap:10px;">
          <button class="btn btn-primary btn-lg" id="btn-start-session" style="width:100%">
            🚀 Start Session
          </button>
          <div style="display:flex; gap:10px;" id="set-controls" class="hidden">
            <button class="btn btn-success" id="btn-start-set" style="flex:1">
              ▶ Start Set
            </button>
            <button class="btn btn-secondary" id="btn-end-set" style="flex:1" disabled>
              ⏹ End Set
            </button>
          </div>
          <button class="btn btn-danger" id="btn-end-session" style="width:100%; display:none">
            🏁 End Session
          </button>
        </div>

        <!-- Audio Toggle -->
        <div style="display:flex; align-items:center; justify-content:space-between; padding: 8px 0;">
          <span style="font-size:0.85rem; color:var(--color-text-secondary)">🔊 Audio Feedback</span>
          <label class="toggle-switch" style="display:flex;align-items:center;gap:8px;cursor:pointer">
            <input type="checkbox" id="audio-toggle" checked style="accent-color:var(--color-accent-violet)">
            <span style="font-size:0.8rem; color:var(--color-text-muted)">ON</span>
          </label>
        </div>

        <!-- Exercise Selector -->
        <div class="card" style="padding:var(--space-4)">
          <div style="font-size:0.8rem; font-weight:600; color:var(--color-text-muted); letter-spacing:0.1em; text-transform:uppercase; margin-bottom:var(--space-3)">
            Exercise
          </div>
          <div class="exercise-selector" id="exercise-selector">
            ${Object.values(EXERCISES).map((ex) => `
              <div
                class="exercise-option ${ex.id === 'jumping_jack' ? 'selected' : ''} ${ex.comingSoon ? 'disabled' : ''}"
                data-exercise="${ex.id}"
                id="ex-option-${ex.id}"
                role="radio"
                aria-checked="${ex.id === 'jumping_jack'}"
                tabindex="0"
              >
                <span class="exercise-icon">${ex.icon}</span>
                <span class="exercise-name">${ex.name}</span>
                <span class="exercise-tag ${ex.comingSoon ? 'soon' : ''}">${ex.comingSoon ? 'Soon' : 'Ready'}</span>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Completed Sets This Session -->
        <div class="card" style="padding:var(--space-4)" id="sets-history-card" style="display:none">
          <div style="font-size:0.8rem; font-weight:600; color:var(--color-text-muted); letter-spacing:0.1em; text-transform:uppercase; margin-bottom:var(--space-3)">
            Sets Completed
          </div>
          <div class="sets-mini-list" id="sets-mini-list">
            <div style="color:var(--color-text-muted); font-size:0.85rem; text-align:center; padding:var(--space-4)">
              No sets yet
            </div>
          </div>
        </div>

      </div>
    </div>
  `;

  return page;
}

// ── Initialize Page Logic ────────────────────────────────────────────────────
export async function initWorkoutPage() {
  videoEl  = document.getElementById('workout-video');
  canvasEl = document.getElementById('workout-canvas');

  _bindExerciseSelector();
  _bindControls();
  _bindAudioToggle();
  _initResizeObserver();

  // Load MediaPipe model in background
  _loadModel();
}

// ── Model Loading ────────────────────────────────────────────────────────────
async function _loadModel() {
  _setStatus('loading', 'Loading AI model...');

  try {
    await PoseDetector.init(_onPoseResult);
    modelLoaded = true;
    _setStatus('ready', 'Model ready');
    showToast('AI pose model loaded ✓', 'success');
  } catch (err) {
    console.error('[Workout] Failed to load model:', err);
    _setStatus('error', 'Model failed to load');
    showToast('Failed to load AI model. Check your connection.', 'error');
  }
}

// ── Camera ───────────────────────────────────────────────────────────────────
async function _startCamera() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
      audio: false,
    });

    videoEl.srcObject = stream;
    await new Promise((res) => { videoEl.onloadedmetadata = res; });
    await videoEl.play();

    // Hide placeholder
    document.getElementById('camera-placeholder').style.display = 'none';

    // Sync canvas size to video
    _syncCanvasSize();

    // Start detection
    PoseDetector.start(videoEl);
    _setStatus('active', 'Detecting pose');

  } catch (err) {
    console.error('[Workout] Camera error:', err);
    _setStatus('error', 'Camera access denied');
    showToast('Cannot access camera. Please allow camera permission.', 'error');
    throw err;
  }
}

function _stopCamera() {
  PoseDetector.stop();
  if (stream) {
    stream.getTracks().forEach((t) => t.stop());
    stream = null;
  }
  videoEl.srcObject = null;
  SkeletonDraw.clear(canvasEl);
  document.getElementById('camera-placeholder').style.display = 'flex';
  _setStatus('idle', 'Camera off');
}

// ── Pose Result Handler ───────────────────────────────────────────────────────
function _onPoseResult(landmarks, _world, fps) {
  // Update FPS display
  document.getElementById('fps-badge').textContent = `${fps} FPS`;

  // Draw skeleton
  _syncCanvasSize();
  if (landmarks) {
    SkeletonDraw.draw(canvasEl, landmarks, { showFace: false });
  } else {
    SkeletonDraw.clear(canvasEl);
  }

  // Count reps only when set is active
  if (setActive && landmarks) {
    const { reps, phase, phaseChanged } = counter.process(landmarks);
    _updateRepDisplay(reps, phase);
  }
}

// ── Rep Display ───────────────────────────────────────────────────────────────
function _updateRepDisplay(reps, phase) {
  const repEl   = document.getElementById('rep-count');
  const phaseEl = document.getElementById('phase-badge');

  if (repEl.textContent !== String(reps)) {
    repEl.textContent = reps;
    repEl.classList.remove('animate-countpop');
    void repEl.offsetWidth; // trigger reflow
    repEl.classList.add('animate-countpop');
    document.getElementById('total-reps-info').textContent =
      completedSets.reduce((acc, s) => acc + s.reps, 0) + reps;
  }

  // Phase badge
  phaseEl.className = `counter-phase phase-${phase?.toLowerCase() ?? 'idle'}`;
  const phaseLabel = { OPEN: '● OPEN', CLOSED: '● CLOSED', UP: '● UP', DOWN: '● DOWN', IDLE: '● IDLE' };
  phaseEl.textContent = phaseLabel[phase] ?? '● IDLE';
}

// ── Session Controls ──────────────────────────────────────────────────────────
function _bindControls() {
  document.getElementById('btn-start-session').addEventListener('click', _handleStartSession);
  document.getElementById('btn-end-session').addEventListener('click', _handleEndSession);
  document.getElementById('btn-start-set').addEventListener('click', _handleStartSet);
  document.getElementById('btn-end-set').addEventListener('click', _handleEndSet);
}

async function _handleStartSession() {
  AudioFeedback.unlock(); // unlock AudioContext via user gesture

  if (!modelLoaded) {
    showToast('Still loading AI model, please wait...', 'info');
    return;
  }

  try {
    await _startCamera();

    sessionActive = true;
    sessionStartTime = Date.now();
    setNumber = 0;
    completedSets = [];

    // Create session in backend / local store
    try {
      const sess = await API.sessions.create('');
      sessionId = sess.id;
    } catch {
      // Offline fallback
      sessionId = crypto.randomUUID();
      LocalStore.addSession({
        id: sessionId,
        started_at: new Date().toISOString(),
        sets: [],
        total_duration_s: 0,
      });
    }

    // UI transitions
    document.getElementById('btn-start-session').style.display = 'none';
    document.getElementById('set-controls').classList.remove('hidden');
    document.getElementById('set-controls').style.display = 'flex';
    document.getElementById('btn-end-session').style.display = 'block';
    document.getElementById('counter-display').classList.remove('animate-pulse');

    _startSessionTimer();
    _renderSetsList();

    showToast('Session started! 💪', 'success');

  } catch {
    sessionActive = false;
  }
}

async function _handleEndSession() {
  if (!sessionActive) return;

  // End active set first
  if (setActive) await _handleEndSet();

  sessionActive = false;
  _stopCamera();
  _stopSessionTimer();

  const totalDuration = Math.round((Date.now() - sessionStartTime) / 1000);
  const totalReps = completedSets.reduce((a, s) => a + s.reps, 0);

  // Save to backend / local
  try {
    await API.sessions.update(sessionId, { total_duration_s: totalDuration, ended_at: new Date().toISOString() });
  } catch {
    LocalStore.updateSession(sessionId, {
      total_duration_s: totalDuration,
      ended_at: new Date().toISOString(),
      sets: completedSets,
    });
  }

  // Reset UI
  document.getElementById('btn-start-session').style.display = 'block';
  document.getElementById('set-controls').style.display = 'none';
  document.getElementById('btn-end-session').style.display = 'none';
  document.getElementById('camera-overlay-bottom').style.display = 'none';
  document.getElementById('rep-count').textContent = '0';
  document.getElementById('set-timer').textContent = '0:00';
  document.getElementById('session-timer').textContent = '0:00';
  document.getElementById('sets-done').textContent = '0';
  document.getElementById('total-reps-info').textContent = '0';
  document.getElementById('counter-display').classList.add('animate-pulse');
  document.getElementById('phase-badge').className = 'counter-phase phase-idle';
  document.getElementById('phase-badge').textContent = '● IDLE';

  AudioFeedback.setComplete();
  showToast(`Session complete! ${totalReps} total reps in ${_formatTime(totalDuration)} 🎉`, 'success', 5000);
}

function _handleStartSet() {
  if (!sessionActive || setActive) return;

  setActive = true;
  setNumber++;
  setStartTime = Date.now();

  counter = new RepCounter(currentExerciseId);
  counter.onRep((reps) => {
    AudioFeedback.beep();
  });

  document.getElementById('btn-start-set').disabled = true;
  document.getElementById('btn-end-set').disabled = false;
  document.getElementById('camera-overlay-bottom').style.display = 'flex';

  _startSetTimer();
}

async function _handleEndSet() {
  if (!setActive) return;

  setActive = false;
  _stopSetTimer();

  const reps     = counter.reps;
  const duration = Math.round((Date.now() - setStartTime) / 1000);

  const setData = {
    exercise_id: 1, // TODO: map from slug after backend seed
    exercise_slug: currentExerciseId,
    set_number: setNumber,
    reps,
    duration_s: duration,
  };

  completedSets.push(setData);

  // Save set to backend / local
  try {
    await API.sets.add(sessionId, setData);
  } catch {
    LocalStore.updateSession(sessionId, { sets: completedSets });
  }

  // UI
  document.getElementById('sets-done').textContent = completedSets.length;
  document.getElementById('btn-start-set').disabled = false;
  document.getElementById('btn-end-set').disabled = true;
  document.getElementById('camera-overlay-bottom').style.display = 'none';
  document.getElementById('rep-count').textContent = '0';
  document.getElementById('set-timer').textContent = '0:00';
  document.getElementById('phase-badge').className = 'counter-phase phase-idle';
  document.getElementById('phase-badge').textContent = '● IDLE';

  _renderSetsList();
  AudioFeedback.setComplete();
  showToast(`Set ${setNumber} done — ${reps} reps in ${_formatTime(duration)} ✅`, 'success');
}

// ── Exercise Selector ─────────────────────────────────────────────────────────
function _bindExerciseSelector() {
  document.getElementById('exercise-selector').addEventListener('click', (e) => {
    const opt = e.target.closest('.exercise-option');
    if (!opt || opt.classList.contains('disabled')) return;
    if (setActive) { showToast('Cannot change exercise during a set.', 'info'); return; }

    currentExerciseId = opt.dataset.exercise;

    document.querySelectorAll('.exercise-option').forEach((o) => {
      o.classList.toggle('selected', o.dataset.exercise === currentExerciseId);
      o.setAttribute('aria-checked', o.dataset.exercise === currentExerciseId);
    });
  });
}

// ── Audio Toggle ──────────────────────────────────────────────────────────────
function _bindAudioToggle() {
  const toggle = document.getElementById('audio-toggle');
  const label  = toggle.nextElementSibling;
  toggle.addEventListener('change', () => {
    AudioFeedback.setEnabled(toggle.checked);
    label.textContent = toggle.checked ? 'ON' : 'OFF';
  });
}

// ── Timers ────────────────────────────────────────────────────────────────────
function _startSessionTimer() {
  sessionTimerInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - sessionStartTime) / 1000);
    document.getElementById('session-timer').textContent = _formatTime(elapsed);
  }, 1000);
}

function _stopSessionTimer() {
  clearInterval(sessionTimerInterval);
}

function _startSetTimer() {
  setTimerInterval = setInterval(() => {
    const elapsed = Math.round((Date.now() - setStartTime) / 1000);
    document.getElementById('set-timer').textContent = _formatTime(elapsed);
  }, 1000);
}

function _stopSetTimer() {
  clearInterval(setTimerInterval);
}

function _formatTime(secs) {
  const m = Math.floor(secs / 60).toString().padStart(1, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ── Sets List Render ──────────────────────────────────────────────────────────
function _renderSetsList() {
  const list = document.getElementById('sets-mini-list');
  if (completedSets.length === 0) {
    list.innerHTML = `<div style="color:var(--color-text-muted);font-size:0.85rem;text-align:center;padding:var(--space-4)">No sets yet</div>`;
    return;
  }
  list.innerHTML = completedSets.map((s) => `
    <div class="set-mini-item">
      <span class="set-mini-number">Set ${s.set_number}</span>
      <span class="set-mini-reps">${s.reps} reps</span>
      <span class="set-mini-time">${_formatTime(s.duration_s)}</span>
    </div>
  `).join('');
}

// ── Canvas Sync ───────────────────────────────────────────────────────────────
function _syncCanvasSize() {
  if (canvasEl.width !== videoEl.videoWidth || canvasEl.height !== videoEl.videoHeight) {
    canvasEl.width  = videoEl.videoWidth  || canvasEl.offsetWidth;
    canvasEl.height = videoEl.videoHeight || canvasEl.offsetHeight;
  }
}

function _initResizeObserver() {
  new ResizeObserver(_syncCanvasSize).observe(videoEl);
}

// ── Status Badge ──────────────────────────────────────────────────────────────
function _setStatus(state, text) {
  const dot  = document.getElementById('status-dot');
  const span = document.getElementById('status-text');
  dot.className  = `status-dot ${state === 'active' ? 'active' : state === 'loading' ? 'loading' : state === 'error' ? 'error' : ''}`;
  span.textContent = text;
}
