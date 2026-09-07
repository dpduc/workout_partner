/**
 * audioFeedback.js
 * Web Audio API beep sounds for rep counting feedback.
 */

const AudioFeedback = (() => {
  let ctx = null;
  let enabled = true;

  function getCtx() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    // Resume suspended context (browser autoplay policy)
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }

  /**
   * Play a tone at given frequency and duration.
   * @param {number} freq - Hz
   * @param {number} duration - seconds
   * @param {number} [gain=0.3] - volume 0–1
   */
  function tone(freq, duration, gain = 0.3) {
    if (!enabled) return;
    try {
      const c = getCtx();
      const osc = c.createOscillator();
      const amp = c.createGain();

      osc.connect(amp);
      amp.connect(c.destination);

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, c.currentTime);

      amp.gain.setValueAtTime(0, c.currentTime);
      amp.gain.linearRampToValueAtTime(gain, c.currentTime + 0.01);
      amp.gain.exponentialRampToValueAtTime(0.001, c.currentTime + duration);

      osc.start(c.currentTime);
      osc.stop(c.currentTime + duration);
    } catch (e) {
      console.warn('[AudioFeedback] Error playing tone:', e);
    }
  }

  return {
    /** Short beep on each rep (+1) */
    beep() {
      tone(520, 0.08, 0.25);
    },

    /** Double beep on set complete */
    setComplete() {
      tone(660, 0.1, 0.3);
      setTimeout(() => tone(880, 0.15, 0.35), 120);
    },

    /** Error / warning sound */
    warn() {
      tone(220, 0.15, 0.2);
    },

    /** Toggle audio on/off */
    setEnabled(val) {
      enabled = val;
    },

    isEnabled() {
      return enabled;
    },

    /** Must be called from a user gesture to unlock AudioContext */
    unlock() {
      getCtx();
    },
  };
})();

export default AudioFeedback;
