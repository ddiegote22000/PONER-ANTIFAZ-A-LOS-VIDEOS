import React, { useCallback, useEffect, useRef, useState } from 'react';
import confetti from 'canvas-confetti';
import {
  Camera,
  Check,
  Crosshair,
  Download,
  Eye,
  EyeOff,
  Film,
  Layers,
  Maximize2,
  Pause,
  Play,
  Plus,
  RefreshCw,
  RotateCcw,
  Scissors,
  Sliders,
  Sparkles,
  Square,
  Trash2,
  Upload,
  UserCheck,
  Users,
  Video,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  CapturedSnapshot,
  DemoSceneId,
  FaceLandmarkTrack,
  ManualKeyframe,
  MaskCategory,
  MaskConfig,
  MaskStyleId,
  PerFaceOverride,
  RecordedVideoClip,
  VideoSourceMode,
} from './types/mask';
import { COLOR_SWATCHES, DEFAULT_MASK_CONFIG, MASK_PRESETS } from './utils/maskPresets';
import { drawFaceMask } from './utils/maskRenderer';
import { DEMO_SCENES, renderDemoSceneFrame } from './utils/demoSceneRenderer';
import { FaceTrackerManager, TrackerEngineState } from './utils/faceTracker';
import { MaskPreviewThumbnail } from './components/MaskPreviewThumbnail';

export default function App() {
  // Video source & playback states
  const [sourceMode, setSourceMode] = useState<VideoSourceMode>('demo');
  const [demoSceneId, setDemoSceneId] = useState<DemoSceneId>('studio_interview');
  const [uploadedVideoUrl, setUploadedVideoUrl] = useState<string | null>(null);
  const [uploadedVideoName, setUploadedVideoName] = useState<string>('');
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [isMuted, setIsMuted] = useState<boolean>(true);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(18);
  const [videoDimensions, setVideoDimensions] = useState<{ width: number; height: number }>({
    width: 1280,
    height: 720,
  });
  const [webcamError, setWebcamError] = useState<string | null>(null);

  // Mask configuration & per-face overrides
  const [maskConfig, setMaskConfig] = useState<MaskConfig>(DEFAULT_MASK_CONFIG);
  const [categoryFilter, setCategoryFilter] = useState<'Todos' | MaskCategory>('Todos');
  const [inspectorTab, setInspectorTab] = useState<'catalog' | 'adjustments' | 'tracking'>('catalog');
  const [selectedFaceId, setSelectedFaceId] = useState<number | 'all'>('all');
  const [perFaceOverrides, setPerFaceOverrides] = useState<Record<number, PerFaceOverride>>({});

  // Tracking & interactive canvas states
  const [trackerState, setTrackerState] = useState<TrackerEngineState>('initializing');
  const [detectedFaces, setDetectedFaces] = useState<FaceLandmarkTrack[]>([]);
  const [fps, setFps] = useState<number>(60);
  const [manualKeyframes, setManualKeyframes] = useState<ManualKeyframe[]>([]);
  const [isInteractiveAnchorMode, setIsInteractiveAnchorMode] = useState<boolean>(false);
  const [draggingFaceId, setDraggingFaceId] = useState<number | null>(null);

  // Before/After split comparison curtain (0..100, null when inactive)
  const [compareSplitPercent, setCompareSplitPercent] = useState<number | null>(null);

  // Recording & Snapshot states
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [recordingSeconds, setRecordingSeconds] = useState<number>(0);
  const [recordedClips, setRecordedClips] = useState<RecordedVideoClip[]>([]);
  const [snapshots, setSnapshots] = useState<CapturedSnapshot[]>([]);
  const [lightboxSnapshot, setLightboxSnapshot] = useState<CapturedSnapshot | null>(null);

  // DOM & Engine Refs
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const unmaskedCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const customMaskInputRef = useRef<HTMLInputElement | null>(null);
  const customMaskImageRef = useRef<HTMLImageElement | null>(null);
  const trackerRef = useRef<FaceTrackerManager | null>(null);

  // Animation loop refs
  const demoTimeRef = useRef<number>(0);
  const lastFramePerfRef = useRef<number>(performance.now());
  const fpsCounterRef = useRef<{ frames: number; lastCheck: number }>({
    frames: 0,
    lastCheck: performance.now(),
  });
  const latestTracksRef = useRef<FaceLandmarkTrack[]>([]);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartTimeRef = useRef<number>(0);

  // Initialize MediaPipe FaceLandmarker on mount
  useEffect(() => {
    const manager = new FaceTrackerManager();
    trackerRef.current = manager;
    manager.initialize((newState) => {
      setTrackerState(newState);
    });
    return () => {
      stopWebcamStream();
    };
  }, []);

  // Load custom mask image when URL changes
  useEffect(() => {
    if (!maskConfig.customImageUrl) {
      customMaskImageRef.current = null;
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.src = maskConfig.customImageUrl;
    img.onload = () => {
      customMaskImageRef.current = img;
    };
  }, [maskConfig.customImageUrl]);

  const stopWebcamStream = () => {
    const video = videoRef.current;
    if (video && video.srcObject) {
      const stream = video.srcObject as MediaStream;
      stream.getTracks().forEach((t) => t.stop());
      video.srcObject = null;
    }
  };

  // Switch between Demo, Uploaded Video, and Live Webcam
  const handleSwitchSourceMode = async (mode: VideoSourceMode) => {
    setWebcamError(null);
    if (mode === 'webcam') {
      try {
        stopWebcamStream();
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: 'user' },
          audio: false,
        });
        const video = videoRef.current;
        if (video) {
          video.src = '';
          video.srcObject = stream;
          await video.play();
          setVideoDimensions({
            width: video.videoWidth || 1280,
            height: video.videoHeight || 720,
          });
        }
        trackerRef.current?.resetSmoothing();
        setSourceMode('webcam');
        setIsPlaying(true);
      } catch {
        setWebcamError(
          'No se pudo acceder a la cámara web. Verifica los permisos del navegador o utiliza una escena demo / sube un archivo de video.'
        );
      }
      return;
    }

    stopWebcamStream();
    trackerRef.current?.resetSmoothing();

    if (mode === 'upload') {
      if (!uploadedVideoUrl) {
        fileInputRef.current?.click();
        return;
      }
      const video = videoRef.current;
      if (video) {
        video.srcObject = null;
        video.src = uploadedVideoUrl;
        video.loop = true;
        video.play().catch(() => {});
        setIsPlaying(true);
      }
      setSourceMode('upload');
      return;
    }

    // Demo mode
    const video = videoRef.current;
    if (video) {
      video.pause();
      video.src = '';
    }
    setVideoDimensions({ width: 1280, height: 720 });
    setDuration(18);
    setSourceMode('demo');
    setIsPlaying(true);
  };

  // Handle video file upload
  const handleVideoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (uploadedVideoUrl) {
      URL.revokeObjectURL(uploadedVideoUrl);
    }

    const url = URL.createObjectURL(file);
    setUploadedVideoUrl(url);
    setUploadedVideoName(file.name);
    setManualKeyframes([]);
    setPerFaceOverrides({});
    setSelectedFaceId('all');
    setWebcamError(null);

    stopWebcamStream();
    trackerRef.current?.resetSmoothing();

    const video = videoRef.current;
    if (video) {
      video.srcObject = null;
      video.src = url;
      video.loop = true;
      video.muted = isMuted;
      video.onloadedmetadata = () => {
        const w = video.videoWidth || 1280;
        const h = video.videoHeight || 720;
        setVideoDimensions({ width: w, height: h });
        setDuration(video.duration || 10);
        setCurrentTime(0);
        video.play().catch(() => {});
        setIsPlaying(true);
      };
    }
    setSourceMode('upload');
  };

  // Handle custom PNG/SVG mask upload
  const handleCustomMaskUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setMaskConfig((prev) => ({
      ...prev,
      styleId: 'custom_image',
      customImageUrl: url,
    }));
  };

  // Select a preset mask
  const handleSelectPreset = (styleId: MaskStyleId) => {
    const preset = MASK_PRESETS.find((p) => p.id === styleId);
    if (!preset) return;

    if (selectedFaceId === 'all') {
      setMaskConfig((prev) => ({
        ...prev,
        styleId: preset.id,
        primaryColor: preset.defaultPrimaryColor,
        secondaryColor: preset.defaultSecondaryColor,
        coverEyes: preset.defaultCoverEyes,
        scaleWidth: preset.defaultScaleWidth,
        scaleHeight: preset.defaultScaleHeight,
      }));
    } else {
      setPerFaceOverrides((prev) => ({
        ...prev,
        [selectedFaceId]: {
          ...(prev[selectedFaceId] || { enabled: true }),
          styleId: preset.id,
          primaryColor: preset.defaultPrimaryColor,
          secondaryColor: preset.defaultSecondaryColor,
          coverEyes: preset.defaultCoverEyes,
        },
      }));
    }

    if (styleId === 'custom_image' && !maskConfig.customImageUrl) {
      customMaskInputRef.current?.click();
    }
  };

  // Toggle play/pause
  const togglePlayPause = () => {
    if (sourceMode === 'demo') {
      setIsPlaying((prev) => !prev);
      return;
    }
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play().catch(() => {});
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  };

  // Seek timeline
  const handleSeek = (newTime: number) => {
    setCurrentTime(newTime);
    if (sourceMode === 'demo') {
      demoTimeRef.current = newTime;
    } else if (videoRef.current && sourceMode === 'upload') {
      videoRef.current.currentTime = newTime;
    }
  };

  // Main 60 FPS Render & Face Tracking Loop
  useEffect(() => {
    let animationFrameId: number;

    const renderLoop = (now: number) => {
      const dt = Math.min(0.1, (now - lastFramePerfRef.current) / 1000);
      lastFramePerfRef.current = now;

      // Measure FPS
      fpsCounterRef.current.frames += 1;
      if (now - fpsCounterRef.current.lastCheck >= 600) {
        const currentFps = Math.round(
          (fpsCounterRef.current.frames * 1000) / (now - fpsCounterRef.current.lastCheck)
        );
        setFps(Math.min(60, Math.max(1, currentFps)));
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.lastCheck = now;
      }

      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (canvas && ctx) {
        const cw = canvas.width;
        const ch = canvas.height;

        // Ensure offscreen unmasked canvas matches size for Before/After comparison or pixel sampling
        if (!unmaskedCanvasRef.current) {
          unmaskedCanvasRef.current = document.createElement('canvas');
        }
        const rawCanvas = unmaskedCanvasRef.current;
        if (rawCanvas.width !== cw || rawCanvas.height !== ch) {
          rawCanvas.width = cw;
          rawCanvas.height = ch;
        }
        const rawCtx = rawCanvas.getContext('2d');

        let tracks: FaceLandmarkTrack[] = [];

        if (sourceMode === 'demo') {
          if (isPlaying) {
            demoTimeRef.current = (demoTimeRef.current + dt) % 18;
            setCurrentTime(demoTimeRef.current);
          }
          if (rawCtx) {
            const rawDemoTracks = renderDemoSceneFrame(
              rawCtx,
              cw,
              ch,
              demoTimeRef.current,
              demoSceneId
            );
            // Also merge any manual keyframes placed on demo scene
            const manualTracks: FaceLandmarkTrack[] = manualKeyframes.map((kf) => ({
              id: kf.faceId,
              label: `Anclaje Manual #${kf.faceId - 99}`,
              centerX: kf.centerX,
              centerY: kf.centerY,
              leftEyeX: kf.centerX - kf.faceWidth * 0.22,
              leftEyeY: kf.centerY,
              rightEyeX: kf.centerX + kf.faceWidth * 0.22,
              rightEyeY: kf.centerY,
              eyeDistance: kf.faceWidth * 0.44,
              faceWidth: kf.faceWidth,
              angle: kf.angle,
              yaw: 0,
              confidence: 1,
              source: 'manual_keyframe',
            }));

            tracks =
              trackerRef.current?.applySmoothing(
                [...rawDemoTracks, ...manualTracks],
                maskConfig.smoothing
              ) ?? rawDemoTracks;

            ctx.drawImage(rawCanvas, 0, 0);
          }
        } else {
          // Upload or Webcam mode
          const video = videoRef.current;
          if (video && video.readyState >= 2) {
            if (sourceMode === 'upload') {
              setCurrentTime(video.currentTime);
            }
            if (rawCtx) {
              if (sourceMode === 'webcam') {
                // Mirror webcam horizontally for natural user experience
                rawCtx.save();
                rawCtx.translate(cw, 0);
                rawCtx.scale(-1, 1);
                rawCtx.drawImage(video, 0, 0, cw, ch);
                rawCtx.restore();
              } else {
                rawCtx.drawImage(video, 0, 0, cw, ch);
              }
              ctx.drawImage(rawCanvas, 0, 0);
            }

            if (trackerRef.current) {
              const detected = trackerRef.current.detectVideoFrame(
                video,
                now,
                maskConfig.smoothing,
                manualKeyframes
              );
              // If webcam is mirrored, mirror the X coordinates of MediaPipe tracks
              tracks =
                sourceMode === 'webcam'
                  ? detected.map((t) =>
                      t.source === 'mediapipe'
                        ? {
                            ...t,
                            centerX: 1 - t.centerX,
                            leftEyeX: 1 - t.rightEyeX,
                            rightEyeX: 1 - t.leftEyeX,
                            angle: -t.angle,
                            yaw: -t.yaw,
                          }
                        : t
                    )
                  : detected;
            }
          }
        }

        latestTracksRef.current = tracks;
        // Update React state periodically or when face count changes
        setDetectedFaces((prev) => {
          if (prev.length !== tracks.length) return tracks;
          return tracks;
        });

        // Draw antifaz on every tracked face
        for (const face of tracks) {
          const override = perFaceOverrides[face.id];
          drawFaceMask(
            ctx,
            face,
            cw,
            ch,
            maskConfig,
            override,
            rawCanvas,
            customMaskImageRef.current
          );

          // If interactive anchor mode is active, draw subtle interactive grab ring
          if (isInteractiveAnchorMode) {
            const fx = face.centerX * cw;
            const fy = face.centerY * ch;
            ctx.save();
            ctx.beginPath();
            ctx.arc(fx, fy, 12, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(225, 29, 72, 0.85)';
            ctx.fill();
            ctx.lineWidth = 2;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
            ctx.restore();
          }
        }

        // If Before/After comparison split curtain is active, draw original unmasked frame on left side
        if (compareSplitPercent !== null && rawCtx) {
          const splitX = (compareSplitPercent / 100) * cw;
          ctx.save();
          ctx.beginPath();
          ctx.rect(0, 0, splitX, ch);
          ctx.clip();
          ctx.drawImage(rawCanvas, 0, 0);
          ctx.restore();

          // Divider line
          ctx.save();
          ctx.strokeStyle = '#E11D48';
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(splitX, 0);
          ctx.lineTo(splitX, ch);
          ctx.stroke();

          // Labels
          ctx.font = '600 12px "Plus Jakarta Sans", sans-serif';
          ctx.fillStyle = 'rgba(9, 10, 15, 0.78)';
          ctx.fillRect(Math.max(12, splitX - 96), 16, 84, 24);
          ctx.fillRect(Math.min(cw - 108, splitX + 12), 16, 96, 24);
          ctx.fillStyle = '#FFFFFF';
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.fillText('ORIGINAL', Math.max(54, splitX - 54), 28);
          ctx.fillText('CON ANTIFAZ', Math.min(cw - 60, splitX + 60), 28);
          ctx.restore();
        }
      }

      animationFrameId = requestAnimationFrame(renderLoop);
    };

    animationFrameId = requestAnimationFrame(renderLoop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [
    sourceMode,
    demoSceneId,
    isPlaying,
    maskConfig,
    perFaceOverrides,
    manualKeyframes,
    isInteractiveAnchorMode,
    compareSplitPercent,
  ]);

  // Interactive Canvas Mouse / Pointer Handlers (for adding or dragging manual mask anchors)
  const getNormalizedCanvasCoords = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0.5, y: 0.5 };
    const rect = canvas.getBoundingClientRect();
    const x = Math.max(0.02, Math.min(0.98, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.02, Math.min(0.98, (e.clientY - rect.top) / rect.height));
    return { x, y };
  };

  const handleCanvasPointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isInteractiveAnchorMode) return;
    const { x, y } = getNormalizedCanvasCoords(e);

    // Check if clicking near an existing manual keyframe face
    const existingManual = latestTracksRef.current.find(
      (t) => t.source === 'manual_keyframe' && Math.hypot(t.centerX - x, t.centerY - y) < 0.08
    );

    if (existingManual) {
      setDraggingFaceId(existingManual.id);
      return;
    }

    // Otherwise create a new manual keyframe anchor at click location
    const newFaceId = 100 + manualKeyframes.length;
    const tSec = sourceMode === 'upload' ? videoRef.current?.currentTime || 0 : currentTime;
    const newKf: ManualKeyframe = {
      id: `kf_${Date.now()}`,
      faceId: newFaceId,
      timeSec: tSec,
      centerX: x,
      centerY: y,
      faceWidth: 0.18,
      angle: 0,
    };

    if (sourceMode === 'upload' && videoRef.current) {
      trackerRef.current?.captureOpticalPatch(videoRef.current, newFaceId, x, y);
    }

    setManualKeyframes((prev) => [...prev, newKf]);
    setDraggingFaceId(newFaceId);
  };

  const handleCanvasPointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingFaceId === null) return;
    const { x, y } = getNormalizedCanvasCoords(e);
    const tSec = sourceMode === 'upload' ? videoRef.current?.currentTime || 0 : currentTime;

    setManualKeyframes((prev) => {
      const existingIdx = prev.findIndex(
        (k) => k.faceId === draggingFaceId && Math.abs(k.timeSec - tSec) < 0.5
      );
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx] = { ...updated[existingIdx], centerX: x, centerY: y };
        return updated;
      }
      return [
        ...prev,
        {
          id: `kf_${Date.now()}`,
          faceId: draggingFaceId,
          timeSec: tSec,
          centerX: x,
          centerY: y,
          faceWidth: prev.find((k) => k.faceId === draggingFaceId)?.faceWidth ?? 0.18,
          angle: prev.find((k) => k.faceId === draggingFaceId)?.angle ?? 0,
        },
      ];
    });

    if (sourceMode === 'upload' && videoRef.current) {
      trackerRef.current?.captureOpticalPatch(videoRef.current, draggingFaceId, x, y);
    }
  };

  const handleCanvasPointerUp = () => {
    setDraggingFaceId(null);
  };

  // Capture HD Snapshot PNG
  const handleCaptureSnapshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    const activePreset =
      MASK_PRESETS.find((p) => p.id === maskConfig.styleId) || MASK_PRESETS[0];

    const snap: CapturedSnapshot = {
      id: `snap_${Date.now()}`,
      dataUrl,
      timestampLabel: formatTimecode(currentTime),
      facesCount: latestTracksRef.current.length,
      maskName: activePreset.name,
      resolution: `${canvas.width}×${canvas.height}`,
      createdAt: new Date().toLocaleTimeString('es-ES', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      }),
    };
    setSnapshots((prev) => [snap, ...prev]);
  }, [currentTime, maskConfig.styleId]);

  // Start / Stop Real Video Recording from Canvas Stream
  const handleToggleRecording = () => {
    if (isRecording) {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop();
      }
      if (recordingTimerRef.current) {
        window.clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }
      setIsRecording(false);
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;

    try {
      const stream = canvas.captureStream(30);

      // Determine supported MIME type
      const mimeTypes = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm',
        'video/mp4',
      ];
      const selectedMime =
        mimeTypes.find((type) => MediaRecorder.isTypeSupported(type)) || 'video/webm';

      recordedChunksRef.current = [];
      const recorder = new MediaRecorder(stream, {
        mimeType: selectedMime,
        videoBitsPerSecond: 5_000_000,
      });

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) {
          recordedChunksRef.current.push(ev.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: selectedMime });
        const url = URL.createObjectURL(blob);
        const elapsed = Math.max(
          1,
          Math.round(( performance.now() - recordingStartTimeRef.current ) / 1000)
        );
        const ext = selectedMime.includes('mp4') ? 'mp4' : 'webm';
        const activePreset =
          MASK_PRESETS.find((p) => p.id === maskConfig.styleId) || MASK_PRESETS[0];

        const newClip: RecordedVideoClip = {
          id: `clip_${Date.now()}`,
          url,
          filename: `antifaz-video-${Date.now()}.${ext}`,
          durationSec: elapsed,
          maskName: activePreset.name,
          sizeLabel: `${(blob.size / (1024 * 1024)).toFixed(2)} MB`,
          createdAt: new Date().toLocaleTimeString('es-ES', {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
          }),
          mimeType: selectedMime,
        };

        setRecordedClips((prev) => [newClip, ...prev]);
        confetti({
          particleCount: 45,
          spread: 60,
          origin: { y: 0.75 },
        });
      };

      recordingStartTimeRef.current = performance.now();
      setRecordingSeconds(0);
      recorder.start(200);
      mediaRecorderRef.current = recorder;
      setIsRecording(true);

      recordingTimerRef.current = window.setInterval(() => {
        setRecordingSeconds((prev) => prev + 1);
      }, 1000);
    } catch {
      // Fallback: capture snapshot if MediaRecorder is unsupported
      handleCaptureSnapshot();
    }
  };

  const formatTimecode = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const secs = Math.floor(sec % 60);
    const ms = Math.floor((sec % 1) * 100);
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(2, '0')}`;
  };

  const filteredPresets =
    categoryFilter === 'Todos'
      ? MASK_PRESETS
      : MASK_PRESETS.filter((p) => p.category === categoryFilter);

  const activePresetObj =
    MASK_PRESETS.find((p) => p.id === maskConfig.styleId) || MASK_PRESETS[0];

  return (
    <div className="min-h-screen bg-[#090A0F] text-[#F3F4F6] flex flex-col">
      {/* Hidden File Inputs */}
      <input
        ref={fileInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime,video/*"
        onChange={handleVideoFileUpload}
        className="hidden"
      />
      <input
        ref={customMaskInputRef}
        type="file"
        accept="image/png,image/svg+xml,image/webp,image/*"
        onChange={handleCustomMaskUpload}
        className="hidden"
      />

      {/* Hidden <video> element feeding the processing canvas */}
      <video
        ref={videoRef}
        playsInline
        muted={isMuted}
        crossOrigin="anonymous"
        className="hidden"
      />

      {/* Top Bar Contract: Strictly 3 zones (Brand wordmark | 4 nav links | 2 primary actions) */}
      <header className="flex items-center justify-between px-6 py-3.5 border-b border-slate-800/80 bg-[#090A0F]/95 sticky top-0 z-30">
        <a
          href="#estudio"
          className="font-display text-lg font-bold tracking-tight text-white whitespace-nowrap"
        >
          Antifaz Studio
        </a>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-400">
          <a
            href="#estudio"
            onClick={() => setInspectorTab('catalog')}
            className="hover:text-white transition-colors whitespace-nowrap"
          >
            Estudio en Vivo
          </a>
          <a
            href="#inspector"
            onClick={() => setInspectorTab('catalog')}
            className="hover:text-white transition-colors whitespace-nowrap"
          >
            Catálogo de Antifaces
          </a>
          <a
            href="#inspector"
            onClick={() => setInspectorTab('tracking')}
            className="hover:text-white transition-colors whitespace-nowrap"
          >
            Seguimiento Facial
          </a>
          <a
            href="#boveda"
            className="hover:text-white transition-colors whitespace-nowrap"
          >
            Exportaciones ({recordedClips.length + snapshots.length})
          </a>
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="px-4 py-2 text-xs font-semibold text-slate-200 bg-slate-900 border border-slate-700/80 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer"
          >
            <Upload className="w-3.5 h-3.5" />
            Subir Video
          </button>

          <button
            type="button"
            onClick={handleToggleRecording}
            className={`px-4 py-2 text-xs font-semibold text-white rounded-lg transition-colors whitespace-nowrap flex items-center gap-2 cursor-pointer ${
              isRecording
                ? 'bg-amber-600 hover:bg-amber-500'
                : 'bg-[#E11D48] hover:bg-[#BE123C]'
            }`}
          >
            {isRecording ? (
              <>
                <Square className="w-3.5 h-3.5 fill-current" />
                Detener ({recordingSeconds}s)
              </>
            ) : (
              <>
                <Video className="w-3.5 h-3.5" />
                Grabar Video
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Studio Container (1440px max-w desktop presence) */}
      <main
        id="estudio"
        className="flex-1 w-full max-w-[1440px] mx-auto px-4 sm:px-6 py-6 flex flex-col gap-8"
      >
        {/* Top Context Strip: Source Selector + Clean Unboxed Telemetry Metadata */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
          <div className="flex flex-wrap items-center gap-3">
            {/* Functional Segmented Source Mode Control */}
            <div className="flex items-center gap-1 p-1 bg-[#111827] border border-slate-800/90 rounded-lg">
              <button
                type="button"
                onClick={() => handleSwitchSourceMode('demo')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  sourceMode === 'demo'
                    ? 'bg-[#E11D48] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Film className="w-3.5 h-3.5" />
                Escenas Demo
              </button>
              <button
                type="button"
                onClick={() => handleSwitchSourceMode('upload')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  sourceMode === 'upload'
                    ? 'bg-[#E11D48] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Upload className="w-3.5 h-3.5" />
                {uploadedVideoName ? 'Archivo Cargado' : 'Subir MP4 / WebM'}
              </button>
              <button
                type="button"
                onClick={() => handleSwitchSourceMode('webcam')}
                className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                  sourceMode === 'webcam'
                    ? 'bg-[#E11D48] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                Cámara en Vivo
              </button>
            </div>

            {/* Demo Scene Switcher when in Demo Mode */}
            {sourceMode === 'demo' && (
              <div className="flex items-center gap-1 p-1 bg-[#111827] border border-slate-800/90 rounded-lg">
                {DEMO_SCENES.map((scene) => (
                  <button
                    key={scene.id}
                    type="button"
                    onClick={() => {
                      setDemoSceneId(scene.id);
                      setSelectedFaceId('all');
                    }}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                      demoSceneId === scene.id
                        ? 'bg-slate-800 text-white'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {scene.title} ({scene.facesCount})
                  </button>
                ))}
              </div>
            )}

            {sourceMode === 'upload' && uploadedVideoName && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="text-xs text-slate-400 hover:text-white underline underline-offset-4 cursor-pointer truncate max-w-[220px]"
              >
                Cambiar: {uploadedVideoName}
              </button>
            )}
          </div>

          {/* Zero-Pill Unboxed Metadata with typographic separators */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
            <span className="text-slate-200 font-medium">
              {detectedFaces.length}{' '}
              {detectedFaces.length === 1 ? 'rostro activo' : 'rostros activos'}
            </span>
            <span aria-hidden="true">·</span>
            <span>
              {videoDimensions.width}×{videoDimensions.height} px
            </span>
            <span aria-hidden="true">·</span>
            <span>{fps} FPS</span>
            <span aria-hidden="true">·</span>
            <span>
              {trackerState === 'mediapipe_ready'
                ? 'Malla Facial IA 478 pts'
                : 'Seguimiento Óptico + Anclaje'}
            </span>
          </div>
        </div>

        {webcamError && (
          <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-800/70 flex items-center justify-between gap-4 text-xs text-rose-200">
            <span>{webcamError}</span>
            <button
              type="button"
              onClick={() => setWebcamError(null)}
              className="text-rose-300 hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* Primary 12-Column Studio Grid: 8 Cols Video Canvas Stage + 4 Cols Inspector */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 8 Columns: Dominant Visual Anchor (Video Stage + Timeline + Per-Face Strip) */}
          <div className="lg:col-span-8 flex flex-col gap-4">
            {/* Video Canvas Container */}
            <div className="relative rounded-xl overflow-hidden bg-[#050608] border border-slate-800/90">
              <canvas
                ref={canvasRef}
                width={videoDimensions.width}
                height={videoDimensions.height}
                onPointerDown={handleCanvasPointerDown}
                onPointerMove={handleCanvasPointerMove}
                onPointerUp={handleCanvasPointerUp}
                className={`w-full aspect-video block object-contain bg-[#050608] ${
                  isInteractiveAnchorMode ? 'cursor-crosshair' : 'cursor-default'
                }`}
              />

              {/* Subtle Top-Left Recording or Interactive Mode Overlay */}
              {(isRecording || isInteractiveAnchorMode) && (
                <div className="absolute top-3 left-3 flex items-center gap-3 px-3 py-1.5 rounded-lg bg-black/75 border border-slate-800 text-xs">
                  {isRecording && (
                    <span className="text-rose-400 font-mono tabular-nums font-semibold flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      GRABANDO SALIDA · {formatTimecode(recordingSeconds)}
                    </span>
                  )}
                  {isInteractiveAnchorMode && (
                    <span className="text-amber-300 font-medium">
                      Haz clic sobre cualquier rostro en el video para fijar o arrastrar un antifaz
                    </span>
                  )}
                </div>
              )}

              {/* Quick Canvas Floating Toolbar (Bottom-Right over Scrim) */}
              <div className="absolute bottom-3 right-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsInteractiveAnchorMode((prev) => !prev)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border cursor-pointer whitespace-nowrap ${
                    isInteractiveAnchorMode
                      ? 'bg-[#E11D48] text-white border-[#E11D48]'
                      : 'bg-black/75 text-slate-200 border-slate-700/80 hover:bg-black/90'
                  }`}
                >
                  <Crosshair className="w-3.5 h-3.5" />
                  {isInteractiveAnchorMode ? 'Anclaje Manual Activo' : 'Anclar Rostro con Clic'}
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setCompareSplitPercent((prev) => (prev === null ? 50 : null))
                  }
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors flex items-center gap-1.5 border cursor-pointer whitespace-nowrap ${
                    compareSplitPercent !== null
                      ? 'bg-slate-100 text-slate-900 border-white'
                      : 'bg-black/75 text-slate-200 border-slate-700/80 hover:bg-black/90'
                  }`}
                >
                  <Scissors className="w-3.5 h-3.5" />
                  Comparar Antes / Después
                </button>

                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium bg-black/75 text-slate-200 border border-slate-700/80 hover:bg-black/90 transition-colors flex items-center gap-1.5 cursor-pointer whitespace-nowrap"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Capturar Fotograma
                </button>
              </div>
            </div>

            {/* Split Comparison Slider Bar (when active) */}
            {compareSplitPercent !== null && (
              <div className="px-4 py-2.5 bg-[#111827] border border-slate-800/90 rounded-xl flex items-center gap-4">
                <span className="text-xs font-medium text-slate-300 whitespace-nowrap">
                  Cortina Comparativa Antes / Después:
                </span>
                <input
                  type="range"
                  min={5}
                  max={95}
                  value={compareSplitPercent}
                  onChange={(e) => setCompareSplitPercent(Number(e.target.value))}
                  className="flex-1"
                />
                <span className="text-xs font-mono tabular-nums text-slate-400 w-10 text-right">
                  {compareSplitPercent}%
                </span>
              </div>
            )}

            {/* Video Transport & Scrubber Bar */}
            <div className="p-4 bg-[#111827] border border-slate-800/90 rounded-xl flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-2.5">
                  <button
                    type="button"
                    onClick={togglePlayPause}
                    disabled={sourceMode === 'webcam'}
                    className="w-10 h-10 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] disabled:opacity-40 text-white flex items-center justify-center transition-colors cursor-pointer"
                    aria-label={isPlaying ? 'Pausar' : 'Reproducir'}
                  >
                    {isPlaying ? (
                      <Pause className="w-4 h-4 fill-current" />
                    ) : (
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => handleSeek(0)}
                    disabled={sourceMode === 'webcam'}
                    className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 disabled:opacity-40 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                    aria-label="Reiniciar video"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>

                  {sourceMode === 'upload' && (
                    <button
                      type="button"
                      onClick={() => {
                        const nextMuted = !isMuted;
                        setIsMuted(nextMuted);
                        if (videoRef.current) {
                          videoRef.current.muted = nextMuted;
                        }
                      }}
                      className="w-10 h-10 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 flex items-center justify-center transition-colors cursor-pointer"
                      aria-label={isMuted ? 'Activar sonido' : 'Silenciar'}
                    >
                      {isMuted ? (
                        <VolumeX className="w-4 h-4" />
                      ) : (
                        <Volume2 className="w-4 h-4" />
                      )}
                    </button>
                  )}

                  <div className="pl-2 flex items-center gap-2 text-xs font-mono tabular-nums text-slate-300">
                    <span className="text-white font-semibold">
                      {formatTimecode(currentTime)}
                    </span>
                    <span className="text-slate-600">/</span>
                    <span className="text-slate-400">
                      {sourceMode === 'webcam' ? 'EN VIVO' : formatTimecode(duration)}
                    </span>
                  </div>
                </div>

                {/* Right side of Transport: Active Antifaz readout & eye mode quick toggle */}
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() =>
                      setMaskConfig((prev) => ({ ...prev, coverEyes: !prev.coverEyes }))
                    }
                    className="px-3.5 py-2 rounded-lg bg-slate-900 border border-slate-800 hover:border-slate-700 text-xs font-medium text-slate-200 flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
                  >
                    {maskConfig.coverEyes ? (
                      <>
                        <EyeOff className="w-3.5 h-3.5 text-[#E11D48]" />
                        Ojos Cubiertos (Lente Oscura)
                      </>
                    ) : (
                      <>
                        <Eye className="w-3.5 h-3.5 text-emerald-400" />
                        Ojos Visibles (Recorte Antifaz)
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Timeline Scrubber */}
              {sourceMode !== 'webcam' && (
                <div className="relative flex items-center gap-3 pt-1">
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0.1, duration)}
                    step={0.02}
                    value={Math.min(currentTime, duration)}
                    onChange={(e) => handleSeek(Number(e.target.value))}
                    className="w-full"
                  />
                </div>
              )}
            </div>

            {/* Per-Face Multi-Target Selector & Individual Mask Assignment Bar */}
            <div className="p-4 bg-[#111827] border border-slate-800/90 rounded-xl flex flex-col gap-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 text-[#E11D48]" />
                  <h2 className="text-sm font-semibold text-white">
                    Control por Rostro Detectado en Escena
                  </h2>
                </div>
                <span className="text-xs text-slate-400">
                  Puedes aplicar el mismo antifaz a todos o personalizar/ocultar cada persona por separado
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setSelectedFaceId('all')}
                  className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors flex items-center gap-2 cursor-pointer whitespace-nowrap border ${
                    selectedFaceId === 'all'
                      ? 'bg-[#E11D48] text-white border-[#E11D48]'
                      : 'bg-slate-900 text-slate-300 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  Todos los Rostros ({detectedFaces.length})
                </button>

                {detectedFaces.map((face) => {
                  const override = perFaceOverrides[face.id] || { enabled: true };
                  const isFaceSelected = selectedFaceId === face.id;
                  return (
                    <div
                      key={face.id}
                      className={`flex items-center rounded-lg border text-xs transition-colors ${
                        isFaceSelected
                          ? 'bg-slate-800 border-[#E11D48] text-white'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedFaceId(face.id)}
                        className="px-3 py-2 font-medium cursor-pointer whitespace-nowrap flex items-center gap-2"
                      >
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{
                            backgroundColor:
                              override.primaryColor || maskConfig.primaryColor,
                            border: `1px solid ${
                              override.secondaryColor || maskConfig.secondaryColor
                            }`,
                          }}
                        />
                        {face.label}
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setPerFaceOverrides((prev) => ({
                            ...prev,
                            [face.id]: {
                              ...(prev[face.id] || { enabled: true }),
                              enabled: !override.enabled,
                            },
                          }))
                        }
                        title={
                          override.enabled
                            ? 'Ocultar antifaz en este rostro'
                            : 'Mostrar antifaz en este rostro'
                        }
                        className={`px-2.5 py-2 border-l border-slate-800 hover:text-white cursor-pointer ${
                          override.enabled ? 'text-emerald-400' : 'text-slate-500'
                        }`}
                      >
                        {override.enabled ? (
                          <Eye className="w-3.5 h-3.5" />
                        ) : (
                          <EyeOff className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Right 4 Columns: Studio Inspector (Catalog, Geometry/Color, Keyframes) */}
          <aside
            id="inspector"
            className="lg:col-span-4 bg-[#111827] border border-slate-800/90 rounded-xl p-5 flex flex-col gap-5"
          >
            {/* Inspector Segmented Navigation Tabs */}
            <div className="grid grid-cols-3 gap-1 p-1 bg-[#090A0F] border border-slate-800/80 rounded-lg">
              <button
                type="button"
                onClick={() => setInspectorTab('catalog')}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
                  inspectorTab === 'catalog'
                    ? 'bg-[#1E293B] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                Antifaces
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('adjustments')}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
                  inspectorTab === 'adjustments'
                    ? 'bg-[#1E293B] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                Ajustes y Color
              </button>
              <button
                type="button"
                onClick={() => setInspectorTab('tracking')}
                className={`py-2 px-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap flex items-center justify-center gap-1.5 cursor-pointer ${
                  inspectorTab === 'tracking'
                    ? 'bg-[#1E293B] text-white'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                Anclajes ({manualKeyframes.length})
              </button>
            </div>

            {/* Target indicator banner */}
            <div className="flex items-center justify-between text-xs text-slate-400 pb-3 border-b border-slate-800/80">
              <span>
                Editando:{' '}
                <strong className="text-white">
                  {selectedFaceId === 'all'
                    ? 'Todos los rostros'
                    : `Rostro #${Number(selectedFaceId) + 1}`}
                </strong>
              </span>
              {selectedFaceId !== 'all' && (
                <button
                  type="button"
                  onClick={() => {
                    setPerFaceOverrides((prev) => {
                      const next = { ...prev };
                      delete next[selectedFaceId];
                      return next;
                    });
                    setSelectedFaceId('all');
                  }}
                  className="text-rose-400 hover:text-rose-300 underline cursor-pointer"
                >
                  Restaurar global
                </button>
              )}
            </div>

            {/* TAB 1: MASK CATALOG */}
            {inspectorTab === 'catalog' && (
              <div className="flex flex-col gap-4">
                {/* Category Filter Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      'Todos',
                      'Felino y Sensual',
                      'Gala y Antifaz',
                      'Héroe y Sigilo',
                      'Privacidad y Censura',
                    ] as const
                  ).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategoryFilter(cat)}
                      className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors cursor-pointer whitespace-nowrap ${
                        categoryFilter === cat
                          ? 'bg-[#E11D48] text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {/* Quick Feline Customization Bar when Catwoman / Feline mask is active */}
                {(maskConfig.styleId === 'catwoman_petite' ||
                  maskConfig.styleId === 'catwoman_lace' ||
                  maskConfig.styleId === 'feline_noir') && (
                  <div className="p-3.5 rounded-xl bg-[#090A0F] border border-slate-800/90 flex flex-col gap-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-semibold text-white">
                        Ajuste Rápido · Silueta Gatúbela Petite
                      </span>
                      {maskConfig.styleId === 'catwoman_petite' && (
                        <button
                          type="button"
                          onClick={() =>
                            setMaskConfig((prev) => ({
                              ...prev,
                              showStitches: !prev.showStitches,
                            }))
                          }
                          className={`px-2.5 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer ${
                            maskConfig.showStitches
                              ? 'bg-[#E11D48]/20 border-[#E11D48] text-rose-200'
                              : 'bg-slate-900 border-slate-800 text-slate-400'
                          }`}
                        >
                          {maskConfig.showStitches ? 'Costuras: Sí' : 'Látex Liso'}
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3 text-[11px]">
                      <label className="flex flex-col gap-1 text-slate-300">
                        <div className="flex justify-between">
                          <span>Orejas Felinas</span>
                          <span className="font-mono tabular-nums text-white">
                            {Math.round(maskConfig.earHeight * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.4}
                          max={1.6}
                          step={0.05}
                          value={maskConfig.earHeight}
                          onChange={(e) =>
                            setMaskConfig((prev) => ({
                              ...prev,
                              earHeight: Number(e.target.value),
                            }))
                          }
                        />
                      </label>

                      <label className="flex flex-col gap-1 text-slate-300">
                        <div className="flex justify-between">
                          <span>Mirada Rasgada</span>
                          <span className="font-mono tabular-nums text-white">
                            {Math.round((maskConfig.eyeSlant * 180) / Math.PI)}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.05}
                          max={0.42}
                          step={0.02}
                          value={maskConfig.eyeSlant}
                          onChange={(e) =>
                            setMaskConfig((prev) => ({
                              ...prev,
                              eyeSlant: Number(e.target.value),
                            }))
                          }
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* 2-Column Grid of Live Canvas Mask Thumbnails */}
                <div className="grid grid-cols-2 gap-3 max-h-[460px] overflow-y-auto pr-1">
                  {filteredPresets.map((preset) => {
                    const currentActiveStyle =
                      selectedFaceId === 'all'
                        ? maskConfig.styleId
                        : perFaceOverrides[selectedFaceId]?.styleId ?? maskConfig.styleId;
                    const isSelected = currentActiveStyle === preset.id;

                    return (
                      <button
                        key={preset.id}
                        type="button"
                        onClick={() => handleSelectPreset(preset.id)}
                        className={`text-left p-2.5 rounded-xl border transition-colors flex flex-col gap-2 cursor-pointer ${
                          isSelected
                            ? 'bg-slate-900/95 border-[#E11D48]'
                            : 'bg-[#090A0F]/70 border-slate-800/80 hover:border-slate-700'
                        }`}
                      >
                        <MaskPreviewThumbnail
                          preset={preset}
                          isSelected={isSelected}
                          activePrimaryColor={maskConfig.primaryColor}
                          activeSecondaryColor={maskConfig.secondaryColor}
                        />
                        <div className="flex items-start justify-between gap-1">
                          <span className="text-xs font-semibold text-white leading-snug">
                            {preset.name}
                          </span>
                          {isSelected && (
                            <Check className="w-3.5 h-3.5 text-[#E11D48] shrink-0 mt-0.5" />
                          )}
                        </div>
                        <span className="text-[11px] text-slate-400 line-clamp-2 leading-relaxed">
                          {preset.subtitle}
                        </span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom PNG/SVG Upload Button if custom_image is active */}
                {maskConfig.styleId === 'custom_image' && (
                  <div className="p-3.5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2.5">
                    <span className="text-xs font-medium text-slate-200">
                      Imagen de Antifaz Personalizado (PNG / SVG transparente)
                    </span>
                    <button
                      type="button"
                      onClick={() => customMaskInputRef.current?.click()}
                      className="w-full py-2 px-3 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold flex items-center justify-center gap-2 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Seleccionar Imagen PNG / SVG
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: GEOMETRY, COLOR & LENSES */}
            {inspectorTab === 'adjustments' && (
              <div className="flex flex-col gap-5">
                {/* Curated Color Swatches */}
                <div className="flex flex-col gap-2.5">
                  <span className="text-xs font-semibold text-slate-200">
                    Paleta de Acabado y Filigrana
                  </span>
                  <div className="grid grid-cols-4 gap-2">
                    {COLOR_SWATCHES.map((swatch) => (
                      <button
                        key={swatch.name}
                        type="button"
                        onClick={() => {
                          if (selectedFaceId === 'all') {
                            setMaskConfig((prev) => ({
                              ...prev,
                              primaryColor: swatch.primary,
                              secondaryColor: swatch.secondary,
                            }));
                          } else {
                            setPerFaceOverrides((prev) => ({
                              ...prev,
                              [selectedFaceId]: {
                                ...(prev[selectedFaceId] || { enabled: true }),
                                primaryColor: swatch.primary,
                                secondaryColor: swatch.secondary,
                              },
                            }));
                          }
                        }}
                        className="p-2 rounded-lg bg-[#090A0F] border border-slate-800 hover:border-slate-600 flex flex-col items-center gap-1.5 cursor-pointer"
                      >
                        <div className="flex items-center">
                          <span
                            className="w-4 h-4 rounded-full border border-white/20"
                            style={{ backgroundColor: swatch.primary }}
                          />
                          <span
                            className="w-4 h-4 rounded-full -ml-1.5 border border-white/20"
                            style={{ backgroundColor: swatch.secondary }}
                          />
                        </div>
                        <span className="text-[11px] text-slate-300 truncate w-full text-center">
                          {swatch.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  {/* Custom Color Pickers */}
                  <div className="grid grid-cols-2 gap-3 pt-2">
                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#090A0F] border border-slate-800 text-xs text-slate-300 cursor-pointer">
                      <span>Base</span>
                      <input
                        type="color"
                        value={maskConfig.primaryColor}
                        onChange={(e) =>
                          setMaskConfig((prev) => ({ ...prev, primaryColor: e.target.value }))
                        }
                        className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                      />
                    </label>
                    <label className="flex items-center justify-between p-2.5 rounded-lg bg-[#090A0F] border border-slate-800 text-xs text-slate-300 cursor-pointer">
                      <span>Borde / Detalle</span>
                      <input
                        type="color"
                        value={maskConfig.secondaryColor}
                        onChange={(e) =>
                          setMaskConfig((prev) => ({ ...prev, secondaryColor: e.target.value }))
                        }
                        className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                      />
                    </label>
                  </div>
                </div>

                {/* Conditional Stamp Input for Editorial Censor */}
                {maskConfig.styleId === 'editorial_censor' && (
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-medium text-slate-300">
                      Texto de Sello sobre Franja (opcional)
                    </label>
                    <input
                      type="text"
                      maxLength={22}
                      value={maskConfig.censorText}
                      onChange={(e) =>
                        setMaskConfig((prev) => ({ ...prev, censorText: e.target.value }))
                      }
                      placeholder="CONFIDENCIAL / ANÓNIMO"
                      className="px-3 py-2 rounded-lg bg-[#090A0F] border border-slate-800 text-xs font-mono text-white focus:outline-none focus:border-[#E11D48]"
                    />
                  </div>
                )}

                {/* Conditional Pixel Size Slider for Dynamic Pixel Mosaic */}
                {maskConfig.styleId === 'pixel_mosaic' && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Tamaño de Mosaico Píxel</span>
                      <span className="font-mono tabular-nums text-white">
                        {maskConfig.pixelBlockSize} px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={6}
                      max={28}
                      step={1}
                      value={maskConfig.pixelBlockSize}
                      onChange={(e) =>
                        setMaskConfig((prev) => ({
                          ...prev,
                          pixelBlockSize: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                )}

                {/* Precision Geometry Sliders */}
                <div className="flex flex-col gap-4 pt-2 border-t border-slate-800/80">
                  {(maskConfig.styleId === 'catwoman_petite' ||
                    maskConfig.styleId === 'catwoman_lace' ||
                    maskConfig.styleId === 'feline_noir') && (
                    <>
                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">Brillo Látex / Charol</span>
                          <span className="font-mono tabular-nums text-white">
                            {Math.round(maskConfig.glossIntensity * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0}
                          max={1.0}
                          step={0.04}
                          value={maskConfig.glossIntensity}
                          onChange={(e) =>
                            setMaskConfig((prev) => ({
                              ...prev,
                              glossIntensity: Number(e.target.value),
                            }))
                          }
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">Altura de Orejas Gatúbela</span>
                          <span className="font-mono tabular-nums text-white">
                            {Math.round(maskConfig.earHeight * 100)}%
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.4}
                          max={1.6}
                          step={0.04}
                          value={maskConfig.earHeight}
                          onChange={(e) =>
                            setMaskConfig((prev) => ({
                              ...prev,
                              earHeight: Number(e.target.value),
                            }))
                          }
                        />
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-300">Ángulo Cat-Eye (Mirada Felina)</span>
                          <span className="font-mono tabular-nums text-white">
                            {Math.round((maskConfig.eyeSlant * 180) / Math.PI)}°
                          </span>
                        </div>
                        <input
                          type="range"
                          min={0.05}
                          max={0.42}
                          step={0.02}
                          value={maskConfig.eyeSlant}
                          onChange={(e) =>
                            setMaskConfig((prev) => ({
                              ...prev,
                              eyeSlant: Number(e.target.value),
                            }))
                          }
                        />
                      </div>
                    </>
                  )}

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Ancho del Antifaz</span>
                      <span className="font-mono tabular-nums text-white">
                        {Math.round(maskConfig.scaleWidth * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.6}
                      max={2.0}
                      step={0.02}
                      value={maskConfig.scaleWidth}
                      onChange={(e) =>
                        setMaskConfig((prev) => ({
                          ...prev,
                          scaleWidth: Number(e.target.value),
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Altura del Antifaz</span>
                      <span className="font-mono tabular-nums text-white">
                        {Math.round(maskConfig.scaleHeight * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.6}
                      max={2.0}
                      step={0.02}
                      value={maskConfig.scaleHeight}
                      onChange={(e) =>
                        setMaskConfig((prev) => ({
                          ...prev,
                          scaleHeight: Number(e.target.value),
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Desplazamiento Vertical</span>
                      <span className="font-mono tabular-nums text-white">
                        {Math.round(maskConfig.offsetY * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={-0.25}
                      max={0.25}
                      step={0.01}
                      value={maskConfig.offsetY}
                      onChange={(e) =>
                        setMaskConfig((prev) => ({
                          ...prev,
                          offsetY: Number(e.target.value),
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Opacidad de la Máscara</span>
                      <span className="font-mono tabular-nums text-white">
                        {Math.round(maskConfig.opacity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0.2}
                      max={1.0}
                      step={0.02}
                      value={maskConfig.opacity}
                      onChange={(e) =>
                        setMaskConfig((prev) => ({
                          ...prev,
                          opacity: Number(e.target.value),
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Sombra Proyectada sobre Piel</span>
                      <span className="font-mono tabular-nums text-white">
                        {Math.round(maskConfig.shadowIntensity * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={1.0}
                      step={0.05}
                      value={maskConfig.shadowIntensity}
                      onChange={(e) =>
                        setMaskConfig((prev) => ({
                          ...prev,
                          shadowIntensity: Number(e.target.value),
                        }))
                      }
                    />
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-300">Suavizado de Seguimiento</span>
                      <span className="font-mono tabular-nums text-white">
                        {Math.round(maskConfig.smoothing * 100)}%
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={0.9}
                      step={0.02}
                      value={maskConfig.smoothing}
                      onChange={(e) =>
                        setMaskConfig((prev) => ({
                          ...prev,
                          smoothing: Number(e.target.value),
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Reset button */}
                <button
                  type="button"
                  onClick={() => setMaskConfig(DEFAULT_MASK_CONFIG)}
                  className="py-2 px-3 rounded-lg bg-[#090A0F] border border-slate-800 hover:border-slate-700 text-xs text-slate-300 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Restablecer Parámetros Originales
                </button>
              </div>
            )}

            {/* TAB 3: TRACKING & MANUAL KEYFRAMES */}
            {inspectorTab === 'tracking' && (
              <div className="flex flex-col gap-4">
                <div className="p-3.5 rounded-xl bg-[#090A0F] border border-slate-800/90 flex flex-col gap-2">
                  <span className="text-xs font-semibold text-white">
                    Motor Híbrido de Seguimiento Ocular
                  </span>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    El motor detecta automáticamente hasta 5 rostros calculando la distancia interpupilar y el ángulo de inclinación de la cabeza. Si un rostro está de perfil o deseas añadir un antifaz extra, activa el anclaje manual.
                  </p>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() =>
                        setMaskConfig((prev) => ({
                          ...prev,
                          showTrackingGuides: !prev.showTrackingGuides,
                        }))
                      }
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                        maskConfig.showTrackingGuides
                          ? 'bg-emerald-950/60 border-emerald-500 text-emerald-300'
                          : 'bg-slate-900 border-slate-800 text-slate-300'
                      }`}
                    >
                      {maskConfig.showTrackingGuides
                        ? 'Ocultar Guías Oculares'
                        : 'Mostrar Guías Oculares'}
                    </button>
                  </div>
                </div>

                {/* Add Manual Keyframe Button */}
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200">
                    Anclajes Manuales ({manualKeyframes.length})
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const newFaceId = 100 + manualKeyframes.length;
                      const tSec =
                        sourceMode === 'upload'
                          ? videoRef.current?.currentTime || 0
                          : currentTime;
                      setManualKeyframes((prev) => [
                        ...prev,
                        {
                          id: `kf_${Date.now()}`,
                          faceId: newFaceId,
                          timeSec: tSec,
                          centerX: 0.5,
                          centerY: 0.45,
                          faceWidth: 0.18,
                          angle: 0,
                        },
                      ]);
                      setIsInteractiveAnchorMode(true);
                    }}
                    className="px-3 py-1.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-medium flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Añadir Antifaz Manual
                  </button>
                </div>

                {manualKeyframes.length === 0 ? (
                  <div className="p-6 rounded-xl bg-[#090A0F]/60 border border-slate-800/80 text-center flex flex-col items-center gap-2">
                    <Crosshair className="w-6 h-6 text-slate-500" />
                    <span className="text-xs font-medium text-slate-300">
                      Sin anclajes manuales adicionales
                    </span>
                    <span className="text-[11px] text-slate-500">
                      Pulsa «Anclar Rostro con Clic» sobre el video para fijar un antifaz en cualquier coordenada y seguir su movimiento.
                    </span>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2.5 max-h-[300px] overflow-y-auto pr-1">
                    {manualKeyframes.map((kf, idx) => (
                      <div
                        key={kf.id}
                        className="p-3 rounded-lg bg-[#090A0F] border border-slate-800 flex flex-col gap-2.5"
                      >
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-white">
                            Anclaje #{idx + 1} ·{' '}
                            <span className="font-mono text-slate-400">
                              {formatTimecode(kf.timeSec)}
                            </span>
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              setManualKeyframes((prev) =>
                                prev.filter((item) => item.id !== kf.id)
                              )
                            }
                            className="text-slate-500 hover:text-rose-400 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3 text-[11px]">
                          <label className="flex flex-col gap-1 text-slate-400">
                            <span>Escala: {Math.round(kf.faceWidth * 500)}%</span>
                            <input
                              type="range"
                              min={0.08}
                              max={0.45}
                              step={0.01}
                              value={kf.faceWidth}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setManualKeyframes((prev) =>
                                  prev.map((item) =>
                                    item.id === kf.id ? { ...item, faceWidth: val } : item
                                  )
                                );
                              }}
                            />
                          </label>
                          <label className="flex flex-col gap-1 text-slate-400">
                            <span>Rotación: {Math.round((kf.angle * 180) / Math.PI)}°</span>
                            <input
                              type="range"
                              min={-0.8}
                              max={0.8}
                              step={0.02}
                              value={kf.angle}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                setManualKeyframes((prev) =>
                                  prev.map((item) =>
                                    item.id === kf.id ? { ...item, angle: val } : item
                                  )
                                );
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </aside>
        </div>

        {/* Bottom Vault: Recorded Video Clips & Captured HD Snapshots */}
        <section
          id="boveda"
          className="pt-6 border-t border-slate-800/80 flex flex-col gap-5"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="font-display text-xl font-bold text-white">
                Bóveda de Videos Procesados y Fotogramas HD
              </h2>
              <p className="text-xs text-slate-400">
                Descarga directamente tus grabaciones de video con antifaz integrado o inspecciona las capturas de alta resolución.
              </p>
            </div>
            <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-400">
              <span>{recordedClips.length} videos grabados</span>
              <span aria-hidden="true">·</span>
              <span>{snapshots.length} capturas PNG</span>
            </div>
          </div>

          {recordedClips.length === 0 && snapshots.length === 0 ? (
            <div className="p-8 rounded-xl bg-[#111827] border border-slate-800/80 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex flex-col gap-1">
                <span className="text-sm font-semibold text-white">
                  Aún no has exportado ningún clip ni captura en esta sesión
                </span>
                <span className="text-xs text-slate-400">
                  Pulsa «Grabar Video» en la barra superior para capturar el video con el antifaz en movimiento, o «Capturar Fotograma» sobre el lienzo.
                </span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <button
                  type="button"
                  onClick={handleCaptureSnapshot}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                >
                  Capturar Fotograma Ahora
                </button>
                <button
                  type="button"
                  onClick={handleToggleRecording}
                  className="px-4 py-2 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-xs font-semibold text-white cursor-pointer whitespace-nowrap"
                >
                  Iniciar Grabación de Video
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {/* Recorded Video Clips */}
              {recordedClips.map((clip) => (
                <div
                  key={clip.id}
                  className="p-4 rounded-xl bg-[#111827] border border-slate-800/90 flex flex-col gap-3"
                >
                  <video
                    src={clip.url}
                    controls
                    playsInline
                    className="w-full aspect-video rounded-lg bg-black object-contain"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      Video · {clip.maskName}
                    </span>
                    <a
                      href={clip.url}
                      download={clip.filename}
                      className="px-3 py-1.5 rounded-lg bg-[#E11D48] hover:bg-[#BE123C] text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      Descargar
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono tabular-nums">
                    <span>{clip.durationSec}s</span>
                    <span aria-hidden="true">·</span>
                    <span>{clip.sizeLabel}</span>
                    <span aria-hidden="true">·</span>
                    <span>{clip.createdAt}</span>
                  </div>
                </div>
              ))}

              {/* Captured PNG Snapshots */}
              {snapshots.map((snap) => (
                <div
                  key={snap.id}
                  className="p-4 rounded-xl bg-[#111827] border border-slate-800/90 flex flex-col gap-3"
                >
                  <div className="relative group overflow-hidden rounded-lg bg-black aspect-video">
                    <img
                      src={snap.dataUrl}
                      alt={snap.maskName}
                      className="w-full h-full object-contain block"
                    />
                    <button
                      type="button"
                      onClick={() => setLightboxSnapshot(snap)}
                      className="absolute top-2 right-2 p-2 rounded-lg bg-black/75 text-white opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                      aria-label="Ampliar captura"
                    >
                      <Maximize2 className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-white truncate">
                      Captura · {snap.maskName}
                    </span>
                    <a
                      href={snap.dataUrl}
                      download={`antifaz-captura-${snap.id}.png`}
                      className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold flex items-center gap-1.5 whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" />
                      PNG
                    </a>
                  </div>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono tabular-nums">
                    <span>{snap.resolution}</span>
                    <span aria-hidden="true">·</span>
                    <span>{snap.facesCount} rostros</span>
                    <span aria-hidden="true">·</span>
                    <span>{snap.timestampLabel}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* Lightbox Modal for Fullscreen Snapshot Inspection */}
      {lightboxSnapshot && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6"
          onClick={() => setLightboxSnapshot(null)}
        >
          <div
            className="max-w-5xl w-full bg-[#111827] border border-slate-800 rounded-2xl p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-xs font-mono tabular-nums text-slate-300">
                <span className="text-sm font-sans font-semibold text-white">
                  {lightboxSnapshot.maskName}
                </span>
                <span aria-hidden="true">·</span>
                <span>{lightboxSnapshot.resolution}</span>
                <span aria-hidden="true">·</span>
                <span>{lightboxSnapshot.facesCount} rostros</span>
              </div>
              <button
                type="button"
                onClick={() => setLightboxSnapshot(null)}
                className="p-1.5 rounded-lg bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <img
              src={lightboxSnapshot.dataUrl}
              alt={lightboxSnapshot.maskName}
              className="w-full max-h-[75vh] object-contain rounded-lg bg-black"
            />
          </div>
        </div>
      )}
    </div>
  );
}
