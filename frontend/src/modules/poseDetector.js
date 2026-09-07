/**
 * poseDetector.js
 * MediaPipe PoseLandmarker wrapper for real-time LIVE_STREAM pose detection.
 * Uses @mediapipe/tasks-vision package.
 */

import {
  PoseLandmarker,
  FilesetResolver,
} from '@mediapipe/tasks-vision';

const MODEL_URL =
  'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/latest/pose_landmarker_full.task';

const PoseDetector = (() => {
  let landmarker = null;
  let animFrameId = null;
  let lastVideoTime = -1;
  let _onResult = null;
  let _running = false;
  let _fpsTracker = { frames: 0, lastTime: performance.now(), fps: 0 };

  /**
   * Initialize the PoseLandmarker. Must be called before start().
   * @param {function} onResult - callback(landmarks: Array, worldLandmarks: Array, fps: number)
   * @returns {Promise<void>}
   */
  async function init(onResult) {
    _onResult = onResult;

    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
    );

    landmarker = await PoseLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath: MODEL_URL,
        delegate: 'GPU', // falls back to CPU automatically
      },
      runningMode: 'VIDEO',
      numPoses: 1,
      minPoseDetectionConfidence: 0.5,
      minPosePresenceConfidence: 0.5,
      minTrackingConfidence: 0.5,
      outputSegmentationMasks: false,
    });

    console.log('[PoseDetector] Landmarker initialized.');
  }

  /** Update FPS counter */
  function trackFps() {
    _fpsTracker.frames++;
    const now = performance.now();
    if (now - _fpsTracker.lastTime >= 1000) {
      _fpsTracker.fps = _fpsTracker.frames;
      _fpsTracker.frames = 0;
      _fpsTracker.lastTime = now;
    }
    return _fpsTracker.fps;
  }

  /**
   * Start the detection loop on a video element.
   * @param {HTMLVideoElement} videoEl
   */
  function start(videoEl) {
    if (!landmarker) {
      console.error('[PoseDetector] Not initialized. Call init() first.');
      return;
    }
    _running = true;

    function detectFrame() {
      if (!_running) return;

      if (videoEl.currentTime !== lastVideoTime && videoEl.readyState >= 2) {
        lastVideoTime = videoEl.currentTime;

        const results = landmarker.detectForVideo(videoEl, performance.now());
        const fps = trackFps();

        if (results.landmarks && results.landmarks.length > 0) {
          _onResult(results.landmarks[0], results.worldLandmarks?.[0] ?? [], fps);
        } else {
          _onResult(null, null, fps);
        }
      }

      animFrameId = requestAnimationFrame(detectFrame);
    }

    animFrameId = requestAnimationFrame(detectFrame);
    console.log('[PoseDetector] Detection loop started.');
  }

  /** Stop the detection loop. */
  function stop() {
    _running = false;
    if (animFrameId) {
      cancelAnimationFrame(animFrameId);
      animFrameId = null;
    }
    console.log('[PoseDetector] Stopped.');
  }

  /** Returns true if landmarker is ready */
  function isReady() {
    return landmarker !== null;
  }

  return { init, start, stop, isReady };
})();

export default PoseDetector;
