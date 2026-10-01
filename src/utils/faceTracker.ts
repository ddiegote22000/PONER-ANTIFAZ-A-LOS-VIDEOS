import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { FaceLandmarkTrack, ManualKeyframe } from '../types/mask';

export type TrackerEngineState = 'initializing' | 'mediapipe_ready' | 'fallback_active';

export class FaceTrackerManager {
  private landmarker: FaceLandmarker | null = null;
  private nativeDetector: any = null;
  private state: TrackerEngineState = 'initializing';
  private lastVideoTime = -1;
  private smoothedTracks = new Map<number, FaceLandmarkTrack>();

  // Optical template patch tracking for manual single-keyframe anchors
  private patchCanvas: HTMLCanvasElement;
  private patchCtx: CanvasRenderingContext2D | null;
  private referencePatches = new Map<
    number,
    { data: Uint8ClampedArray; width: number; height: number; lastX: number; lastY: number; lastTime: number }
  >();

  constructor() {
    this.patchCanvas = document.createElement('canvas');
    this.patchCanvas.width = 160;
    this.patchCanvas.height = 90;
    this.patchCtx = this.patchCanvas.getContext('2d', { willReadFrequently: true });
  }

  public getState(): TrackerEngineState {
    return this.state;
  }

  public async initialize(onStateChange?: (state: TrackerEngineState) => void): Promise<void> {
    // 1. Check for browser native FaceDetector API as immediate backup
    if (typeof window !== 'undefined' && 'FaceDetector' in window) {
      try {
        const FaceDetectorCtor = (window as any).FaceDetector;
        this.nativeDetector = new FaceDetectorCtor({ maxDetectedFaces: 5, fastMode: true });
      } catch {
        this.nativeDetector = null;
      }
    }

    // 2. Initialize MediaPipe Tasks Vision FaceLandmarker (478 3D Landmarks)
    try {
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
      );
      this.landmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 5,
        minFaceDetectionConfidence: 0.45,
        minFacePresenceConfidence: 0.45,
        minTrackingConfidence: 0.45,
      });
      this.state = 'mediapipe_ready';
      onStateChange?.(this.state);
    } catch {
      this.state = 'fallback_active';
      onStateChange?.(this.state);
    }
  }

  public resetSmoothing() {
    this.smoothedTracks.clear();
    this.referencePatches.clear();
    this.lastVideoTime = -1;
  }

  public captureOpticalPatch(
    video: HTMLVideoElement,
    faceId: number,
    normX: number,
    normY: number
  ) {
    if (!this.patchCtx || video.readyState < 2) return;
    const pw = this.patchCanvas.width;
    const ph = this.patchCanvas.height;
    this.patchCtx.drawImage(video, 0, 0, pw, ph);

    const radius = 8; // 17x17 patch in 160x90 space
    const cx = Math.max(radius, Math.min(pw - radius - 1, Math.round(normX * pw)));
    const cy = Math.max(radius, Math.min(ph - radius - 1, Math.round(normY * ph)));
    const size = radius * 2 + 1;

    try {
      const imgData = this.patchCtx.getImageData(cx - radius, cy - radius, size, size);
      this.referencePatches.set(faceId, {
        data: imgData.data,
        width: size,
        height: size,
        lastX: normX,
        lastY: normY,
        lastTime: video.currentTime,
      });
    } catch {
      // Ignore cross-origin security errors if any
    }
  }

  private trackOpticalPatch(
    video: HTMLVideoElement,
    faceId: number,
    fallbackX: number,
    fallbackY: number
  ): { x: number; y: number } {
    const patch = this.referencePatches.get(faceId);
    if (!patch || !this.patchCtx || video.readyState < 2) {
      return { x: fallbackX, y: fallbackY };
    }

    // If video jumped significantly in time, reset to keyframe anchor
    if (Math.abs(video.currentTime - patch.lastTime) > 0.6) {
      patch.lastX = fallbackX;
      patch.lastY = fallbackY;
      patch.lastTime = video.currentTime;
      return { x: fallbackX, y: fallbackY };
    }

    const pw = this.patchCanvas.width;
    const ph = this.patchCanvas.height;
    try {
      this.patchCtx.drawImage(video, 0, 0, pw, ph);
      const radius = Math.floor(patch.width / 2);
      const searchRange = 7; // pixels in 160x90 space

      const startX = Math.round(patch.lastX * pw);
      const startY = Math.round(patch.lastY * ph);

      let bestX = startX;
      let bestY = startY;
      let bestScore = Infinity;

      const fullFrame = this.patchCtx.getImageData(0, 0, pw, ph).data;

      for (let dy = -searchRange; dy <= searchRange; dy++) {
        for (let dx = -searchRange; dx <= searchRange; dx++) {
          const tx = startX + dx;
          const ty = startY + dy;
          if (tx < radius || tx >= pw - radius || ty < radius || ty >= ph - radius) continue;

          let sad = 0;
          let pIdx = 0;
          for (let py = -radius; py <= radius; py++) {
            const rowOffset = (ty + py) * pw;
            for (let px = -radius; px <= radius; px++) {
              const fIdx = (rowOffset + (tx + px)) * 4;
              sad +=
                Math.abs(fullFrame[fIdx] - patch.data[pIdx]) +
                Math.abs(fullFrame[fIdx + 1] - patch.data[pIdx + 1]) +
                Math.abs(fullFrame[fIdx + 2] - patch.data[pIdx + 2]);
              pIdx += 4;
            }
          }

          // Slight regularization toward previous position to prevent drift
          const distPenalty = (dx * dx + dy * dy) * 18;
          const totalScore = sad + distPenalty;

          if (totalScore < bestScore) {
            bestScore = totalScore;
            bestX = tx;
            bestY = ty;
          }
        }
      }

      patch.lastX = bestX / pw;
      patch.lastY = bestY / ph;
      patch.lastTime = video.currentTime;
      return { x: patch.lastX, y: patch.lastY };
    } catch {
      return { x: fallbackX, y: fallbackY };
    }
  }

  public detectVideoFrame(
    video: HTMLVideoElement,
    timestampMs: number,
    smoothing: number,
    manualKeyframes: ManualKeyframe[]
  ): FaceLandmarkTrack[] {
    const rawTracks: FaceLandmarkTrack[] = [];

    // 1. Run MediaPipe FaceLandmarker if ready and video is playing/loaded
    if (this.landmarker && video.readyState >= 2 && video.videoWidth > 0) {
      try {
        if (timestampMs <= this.lastVideoTime) {
          this.lastVideoTime = timestampMs - 0.1;
        }
        const safeTimestamp = Math.max(this.lastVideoTime + 1, Math.floor(timestampMs));
        this.lastVideoTime = safeTimestamp;

        const result = this.landmarker.detectForVideo(video, safeTimestamp);
        if (result.faceLandmarks && result.faceLandmarks.length > 0) {
          result.faceLandmarks.forEach((landmarks, idx) => {
            // Key MediaPipe indices:
            // Left Eye Outer: 33, Left Eye Inner: 133
            // Right Eye Inner: 362, Right Eye Outer: 263
            // Nose Bridge between eyes: 168
            // Left Temple: 234, Right Temple: 454
            const lOuter = landmarks[33];
            const lInner = landmarks[133];
            const rInner = landmarks[362];
            const rOuter = landmarks[263];
            const bridge = landmarks[168];
            const lTemple = landmarks[234];
            const rTemple = landmarks[454];

            const leftEyeX = (lOuter.x + lInner.x) / 2;
            const leftEyeY = (lOuter.y + lInner.y) / 2;
            const rightEyeX = (rInner.x + rOuter.x) / 2;
            const rightEyeY = (rInner.y + rOuter.y) / 2;

            const centerX = bridge ? bridge.x : (leftEyeX + rightEyeX) / 2;
            const centerY = bridge ? (bridge.y + (leftEyeY + rightEyeY) / 2) / 2 : (leftEyeY + rightEyeY) / 2;

            const dx = rightEyeX - leftEyeX;
            const dy = rightEyeY - leftEyeY;
            const eyeDistance = Math.hypot(dx, dy);
            const angle = Math.atan2(dy, dx);

            const templeDist =
              lTemple && rTemple ? Math.hypot(rTemple.x - lTemple.x, rTemple.y - lTemple.y) : eyeDistance * 2.25;
            const faceWidth = Math.max(templeDist, eyeDistance * 2.15);

            // Estimate horizontal head turn (yaw) from ratio of left/right eye-to-bridge distances
            const leftToBridge = Math.hypot(centerX - leftEyeX, centerY - leftEyeY);
            const rightToBridge = Math.hypot(rightEyeX - centerX, rightEyeY - centerY);
            const yaw = (rightToBridge - leftToBridge) / Math.max(0.001, leftToBridge + rightToBridge);

            rawTracks.push({
              id: idx,
              label: `Rostro ${idx + 1} (IA)`,
              centerX,
              centerY,
              leftEyeX,
              leftEyeY,
              rightEyeX,
              rightEyeY,
              eyeDistance,
              faceWidth,
              angle,
              yaw,
              confidence: 0.96,
              source: 'mediapipe',
            });
          });
        }
      } catch {
        // Fallback to manual / optical tracker if frame timestamp error occurs
      }
    }

    // 2. Merge or interpolate Manual Keyframes (for user-placed anchors or adjustments)
    if (manualKeyframes.length > 0) {
      const currentTime = video.currentTime || 0;
      // Group keyframes by faceId
      const byFace = new Map<number, ManualKeyframe[]>();
      for (const kf of manualKeyframes) {
        const list = byFace.get(kf.faceId) || [];
        list.push(kf);
        byFace.set(kf.faceId, list);
      }

      byFace.forEach((kfs, faceId) => {
        kfs.sort((a, b) => a.timeSec - b.timeSec);
        let interpX = kfs[0].centerX;
        let interpY = kfs[0].centerY;
        let interpW = kfs[0].faceWidth;
        let interpAngle = kfs[0].angle;

        if (kfs.length === 1) {
          // Single keyframe: use optical patch tracking to follow motion automatically!
          const tracked = this.trackOpticalPatch(video, faceId, kfs[0].centerX, kfs[0].centerY);
          interpX = tracked.x;
          interpY = tracked.y;
        } else {
          // Multiple keyframes: smooth timeline interpolation
          if (currentTime <= kfs[0].timeSec) {
            interpX = kfs[0].centerX;
            interpY = kfs[0].centerY;
            interpW = kfs[0].faceWidth;
            interpAngle = kfs[0].angle;
          } else if (currentTime >= kfs[kfs.length - 1].timeSec) {
            const last = kfs[kfs.length - 1];
            interpX = last.centerX;
            interpY = last.centerY;
            interpW = last.faceWidth;
            interpAngle = last.angle;
          } else {
            for (let i = 0; i < kfs.length - 1; i++) {
              const a = kfs[i];
              const b = kfs[i + 1];
              if (currentTime >= a.timeSec && currentTime <= b.timeSec) {
                const span = Math.max(0.001, b.timeSec - a.timeSec);
                const t = (currentTime - a.timeSec) / span;
                // Smoothstep easing
                const st = t * t * (3 - 2 * t);
                interpX = a.centerX + (b.centerX - a.centerX) * st;
                interpY = a.centerY + (b.centerY - a.centerY) * st;
                interpW = a.faceWidth + (b.faceWidth - a.faceWidth) * st;
                interpAngle = a.angle + (b.angle - a.angle) * st;
                break;
              }
            }
          }
        }

        const eyeDistance = interpW * 0.44;
        const cosA = Math.cos(interpAngle);
        const sinA = Math.sin(interpAngle);

        const manualTrack: FaceLandmarkTrack = {
          id: faceId,
          label: `Anclaje Manual #${faceId - 99}`,
          centerX: interpX,
          centerY: interpY,
          leftEyeX: interpX - (eyeDistance / 2) * cosA,
          leftEyeY: interpY - (eyeDistance / 2) * sinA,
          rightEyeX: interpX + (eyeDistance / 2) * cosA,
          rightEyeY: interpY + (eyeDistance / 2) * sinA,
          eyeDistance,
          faceWidth: interpW,
          angle: interpAngle,
          yaw: 0,
          confidence: 1.0,
          source: 'manual_keyframe',
        };

        rawTracks.push(manualTrack);
      });
    }

    return this.applySmoothing(rawTracks, smoothing);
  }

  public applySmoothing(tracks: FaceLandmarkTrack[], smoothingFactor: number): FaceLandmarkTrack[] {
    const alpha = Math.max(0.08, 1 - Math.min(0.92, smoothingFactor));
    const currentIds = new Set<number>();
    const result: FaceLandmarkTrack[] = [];

    for (const track of tracks) {
      currentIds.add(track.id);
      const prev = this.smoothedTracks.get(track.id);
      if (!prev) {
        this.smoothedTracks.set(track.id, { ...track });
        result.push(track);
      } else {
        const smoothed: FaceLandmarkTrack = {
          ...track,
          centerX: prev.centerX + (track.centerX - prev.centerX) * alpha,
          centerY: prev.centerY + (track.centerY - prev.centerY) * alpha,
          leftEyeX: prev.leftEyeX + (track.leftEyeX - prev.leftEyeX) * alpha,
          leftEyeY: prev.leftEyeY + (track.leftEyeY - prev.leftEyeY) * alpha,
          rightEyeX: prev.rightEyeX + (track.rightEyeX - prev.rightEyeX) * alpha,
          rightEyeY: prev.rightEyeY + (track.rightEyeY - prev.rightEyeY) * alpha,
          eyeDistance: prev.eyeDistance + (track.eyeDistance - prev.eyeDistance) * alpha,
          faceWidth: prev.faceWidth + (track.faceWidth - prev.faceWidth) * alpha,
          angle: prev.angle + (track.angle - prev.angle) * alpha,
          yaw: prev.yaw + (track.yaw - prev.yaw) * alpha,
        };
        this.smoothedTracks.set(track.id, smoothed);
        result.push(smoothed);
      }
    }

    // Prune stale tracks
    for (const existingId of this.smoothedTracks.keys()) {
      if (!currentIds.has(existingId)) {
        this.smoothedTracks.delete(existingId);
      }
    }

    return result;
  }
}
