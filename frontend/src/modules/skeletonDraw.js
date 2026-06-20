/**
 * skeletonDraw.js
 * Renders MediaPipe pose landmarks and skeleton connections onto a canvas.
 * Color scheme: cyan for landmarks, violet for bones.
 */

// MediaPipe BlazePose connection pairs [fromIndex, toIndex]
const POSE_CONNECTIONS = [
  // Face
  [0, 1], [1, 2], [2, 3], [3, 7],
  [0, 4], [4, 5], [5, 6], [6, 8],
  [9, 10],
  // Torso
  [11, 12], [11, 23], [12, 24], [23, 24],
  // Left arm
  [11, 13], [13, 15], [15, 17], [15, 19], [15, 21], [17, 19],
  // Right arm
  [12, 14], [14, 16], [16, 18], [16, 20], [16, 22], [18, 20],
  // Left leg
  [23, 25], [25, 27], [27, 29], [27, 31], [29, 31],
  // Right leg
  [24, 26], [26, 28], [28, 30], [28, 32], [30, 32],
];

// Landmark groups for color differentiation
const FACE_LM    = [0,1,2,3,4,5,6,7,8,9,10];
const TORSO_LM   = [11,12,23,24];
const ARMS_LM    = [13,14,15,16,17,18,19,20,21,22];
const LEGS_LM    = [25,26,27,28,29,30,31,32];

const SkeletonDraw = {
  /**
   * Draw skeleton on canvas given normalized landmarks from MediaPipe.
   * @param {HTMLCanvasElement} canvas
   * @param {Array} landmarks - array of {x, y, z, visibility}
   * @param {Object} options
   */
  draw(canvas, landmarks, options = {}) {
    const ctx = canvas.getContext('2d');
    const w = canvas.width;
    const h = canvas.height;

    ctx.clearRect(0, 0, w, h);

    if (!landmarks || landmarks.length === 0) return;

    const {
      lineWidth     = 2.5,
      landmarkSize  = 5,
      showFace      = true,
      minVisibility = 0.3,
    } = options;

    // Helper: convert normalized [0,1] to canvas coords
    const px = (lm) => ({ x: lm.x * w, y: lm.y * h });

    // ── Draw bones (connections) ──────────────────────────────────────────
    ctx.lineWidth = lineWidth;
    ctx.lineCap   = 'round';

    POSE_CONNECTIONS.forEach(([i, j]) => {
      const a = landmarks[i];
      const b = landmarks[j];
      if (!a || !b) return;
      if ((a.visibility ?? 1) < minVisibility || (b.visibility ?? 1) < minVisibility) return;

      // Skip face connections if disabled
      if (!showFace && FACE_LM.includes(i) && FACE_LM.includes(j)) return;

      const pa = px(a);
      const pb = px(b);

      // Gradient stroke from violet to cyan along each bone
      const grad = ctx.createLinearGradient(pa.x, pa.y, pb.x, pb.y);
      grad.addColorStop(0, 'rgba(108, 99, 255, 0.85)');
      grad.addColorStop(1, 'rgba(0, 212, 255, 0.85)');

      ctx.beginPath();
      ctx.moveTo(pa.x, pa.y);
      ctx.lineTo(pb.x, pb.y);
      ctx.strokeStyle = grad;
      ctx.stroke();
    });

    // ── Draw landmarks (joints) ───────────────────────────────────────────
    landmarks.forEach((lm, i) => {
      if (!lm) return;
      if ((lm.visibility ?? 1) < minVisibility) return;
      if (!showFace && FACE_LM.includes(i)) return;

      const { x, y } = px(lm);
      const vis = Math.min(1, lm.visibility ?? 1);
      const r   = landmarkSize * (0.7 + 0.3 * vis);

      // Color by body segment
      let color;
      if (FACE_LM.includes(i))   color = `rgba(255,255,255,${vis * 0.7})`;
      else if (TORSO_LM.includes(i))  color = `rgba(108,99,255,${vis})`;
      else if (ARMS_LM.includes(i))   color = `rgba(0,212,255,${vis})`;
      else                             color = `rgba(0,229,160,${vis})`;

      // Glow effect
      ctx.shadowColor  = color;
      ctx.shadowBlur   = 8;

      // Outer ring
      ctx.beginPath();
      ctx.arc(x, y, r + 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,0.12)`;
      ctx.fill();

      // Filled dot
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();

      ctx.shadowBlur = 0;
    });
  },

  /** Clear the canvas completely. */
  clear(canvas) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  },
};

export default SkeletonDraw;
