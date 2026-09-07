/**
 * repCounter.js
 * State machine for counting exercise repetitions.
 * Uses MediaPipe Pose landmark indices to compute joint angles and distances.
 *
 * Supported exercises (MVP demo: jumping_jack fully implemented):
 *  - jumping_jack  ✅ Full state machine
 *  - squat         🚧 Scaffold
 *  - push_up       🚧 Scaffold
 *  - plank         🚧 Scaffold (duration-based)
 */

// ── Landmark index constants (MediaPipe BlazePose) ──────────────────────────
const LM = {
  NOSE: 0,
  LEFT_SHOULDER: 11,  RIGHT_SHOULDER: 12,
  LEFT_ELBOW: 13,     RIGHT_ELBOW: 14,
  LEFT_WRIST: 15,     RIGHT_WRIST: 16,
  LEFT_HIP: 23,       RIGHT_HIP: 24,
  LEFT_KNEE: 25,      RIGHT_KNEE: 26,
  LEFT_ANKLE: 27,     RIGHT_ANKLE: 28,
};

// ── Math helpers ─────────────────────────────────────────────────────────────

/**
 * Compute angle at point B formed by A-B-C (degrees).
 */
function angleDeg(a, b, c) {
  const ab = { x: a.x - b.x, y: a.y - b.y };
  const cb = { x: c.x - b.x, y: c.y - b.y };
  const dot = ab.x * cb.x + ab.y * cb.y;
  const mag = Math.sqrt(ab.x ** 2 + ab.y ** 2) * Math.sqrt(cb.x ** 2 + cb.y ** 2);
  if (mag === 0) return 0;
  return (Math.acos(Math.min(1, Math.max(-1, dot / mag))) * 180) / Math.PI;
}

/**
 * Euclidean distance between two landmarks (normalized coords).
 */
function dist(a, b) {
  return Math.sqrt((a.x - b.x) ** 2 + (a.y - b.y) ** 2);
}

/**
 * Check that landmark visibility is above threshold.
 */
function visible(lm, ...indices) {
  return indices.every((i) => lm[i] && (lm[i].visibility ?? 1) > 0.4);
}

// ── Exercise Definitions ─────────────────────────────────────────────────────

const EXERCISES = {
  jumping_jack: {
    id: 'jumping_jack',
    name: 'Jumping Jack',
    icon: '🤸',
    countingType: 'reps',
    difficulty: 'beginner',
    muscles: ['Full Body'],
    description: 'Stand with feet together, arms at sides. Jump while spreading legs and raising arms.',

    /** Returns current pose phase: 'OPEN' | 'CLOSED' | null */
    detectPhase(lm) {
      if (!visible(lm, LM.LEFT_WRIST, LM.LEFT_ELBOW, LM.LEFT_SHOULDER,
                       LM.RIGHT_WRIST, LM.RIGHT_ELBOW, LM.RIGHT_SHOULDER,
                       LM.LEFT_ANKLE, LM.RIGHT_ANKLE, LM.LEFT_HIP, LM.RIGHT_HIP)) {
        return null;
      }

      // Arm angles: wrist-elbow-shoulder
      const leftArmAngle  = angleDeg(lm[LM.LEFT_WRIST],  lm[LM.LEFT_ELBOW],  lm[LM.LEFT_SHOULDER]);
      const rightArmAngle = angleDeg(lm[LM.RIGHT_WRIST], lm[LM.RIGHT_ELBOW], lm[LM.RIGHT_SHOULDER]);

      // Leg spread ratio: ankle distance / hip distance
      const ankleDist = dist(lm[LM.LEFT_ANKLE], lm[LM.RIGHT_ANKLE]);
      const hipDist   = dist(lm[LM.LEFT_HIP],   lm[LM.RIGHT_HIP]);
      const legRatio  = hipDist > 0 ? ankleDist / hipDist : 0;

      // OPEN: arms raised high + legs spread
      if (leftArmAngle > 145 && rightArmAngle > 145 && legRatio > 1.3) return 'OPEN';

      // CLOSED: arms down + legs together
      if (leftArmAngle < 55 && rightArmAngle < 55 && legRatio < 0.8) return 'CLOSED';

      return null; // transitioning
    },
  },

  squat: {
    id: 'squat',
    name: 'Squat',
    icon: '🏋️',
    countingType: 'reps',
    difficulty: 'beginner',
    muscles: ['Quads', 'Glutes', 'Hamstrings'],
    description: 'Stand with feet shoulder-width apart. Lower your body until thighs are parallel to floor.',
    comingSoon: true,

    detectPhase(lm) {
      if (!visible(lm, LM.LEFT_HIP, LM.LEFT_KNEE, LM.LEFT_ANKLE)) return null;
      const kneeAngle = angleDeg(lm[LM.LEFT_HIP], lm[LM.LEFT_KNEE], lm[LM.LEFT_ANKLE]);
      if (kneeAngle < 100) return 'DOWN';
      if (kneeAngle > 155) return 'UP';
      return null;
    },
  },

  push_up: {
    id: 'push_up',
    name: 'Push-up',
    icon: '💪',
    countingType: 'reps',
    difficulty: 'intermediate',
    muscles: ['Chest', 'Triceps', 'Shoulders'],
    description: 'Plank position, lower chest to floor, press back up.',
    comingSoon: true,

    detectPhase(lm) {
      if (!visible(lm, LM.LEFT_SHOULDER, LM.LEFT_ELBOW, LM.LEFT_WRIST)) return null;
      const elbowAngle = angleDeg(lm[LM.LEFT_SHOULDER], lm[LM.LEFT_ELBOW], lm[LM.LEFT_WRIST]);
      if (elbowAngle < 90)  return 'DOWN';
      if (elbowAngle > 155) return 'UP';
      return null;
    },
  },

  plank: {
    id: 'plank',
    name: 'Plank',
    icon: '🧘',
    countingType: 'duration',
    difficulty: 'intermediate',
    muscles: ['Core', 'Shoulders'],
    description: 'Forearm plank position. Keep body straight, hold as long as possible.',
    comingSoon: true,

    detectPhase() { return 'HOLD'; },
  },
};

// ── RepCounter Class ─────────────────────────────────────────────────────────

export class RepCounter {
  /**
   * @param {string} exerciseId - key from EXERCISES
   */
  constructor(exerciseId = 'jumping_jack') {
    this.exercise = EXERCISES[exerciseId] || EXERCISES.jumping_jack;
    this.reps     = 0;
    this.phase    = 'IDLE'; // IDLE | OPEN | CLOSED | UP | DOWN | HOLD
    this._lastPhase = null;
    this._onRep = null;
  }

  /** Register callback called on each new rep: fn(totalReps) */
  onRep(fn) { this._onRep = fn; }

  /**
   * Process a landmarks array from MediaPipe.
   * @param {Array} landmarks - array of {x,y,z,visibility}
   * @returns {{ reps: number, phase: string, phaseChanged: boolean }}
   */
  process(landmarks) {
    if (!landmarks || landmarks.length < 33) {
      return { reps: this.reps, phase: this.phase, phaseChanged: false };
    }

    const detectedPhase = this.exercise.detectPhase(landmarks);
    let phaseChanged = false;

    if (detectedPhase && detectedPhase !== this._lastPhase) {
      phaseChanged = true;
      this._lastPhase = detectedPhase;
      this.phase = detectedPhase;

      // Count rep on the transition that COMPLETES a full cycle
      this._countRep(detectedPhase);
    } else if (!detectedPhase) {
      // No clear phase detected — stay in last known or IDLE
      if (this.phase === 'IDLE') {
        this._lastPhase = null;
      }
    }

    return { reps: this.reps, phase: this.phase, phaseChanged };
  }

  _countRep(phase) {
    // Jumping Jack: OPEN → CLOSED = 1 rep
    if (this.exercise.id === 'jumping_jack' && phase === 'CLOSED' && this._lastPhase !== 'IDLE') {
      this.reps++;
      if (this._onRep) this._onRep(this.reps);
    }

    // Squat / Push-up: DOWN → UP = 1 rep
    if (['squat', 'push_up'].includes(this.exercise.id) && phase === 'UP') {
      this.reps++;
      if (this._onRep) this._onRep(this.reps);
    }
  }

  reset() {
    this.reps = 0;
    this.phase = 'IDLE';
    this._lastPhase = null;
  }
}

export { EXERCISES };
