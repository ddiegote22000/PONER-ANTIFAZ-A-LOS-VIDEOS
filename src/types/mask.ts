export type MaskStyleId =
  | 'catwoman_petite'
  | 'catwoman_lace'
  | 'feline_noir'
  | 'domino_classic'
  | 'venetian_gold'
  | 'stealth_angular'
  | 'cyber_visor'
  | 'editorial_censor'
  | 'pixel_mosaic'
  | 'frosted_glass'
  | 'harlequin_royal'
  | 'custom_image';

export type MaskCategory = 'Felino y Sensual' | 'Gala y Antifaz' | 'Héroe y Sigilo' | 'Privacidad y Censura';

export interface MaskPreset {
  id: MaskStyleId;
  name: string;
  category: MaskCategory;
  subtitle: string;
  defaultPrimaryColor: string;
  defaultSecondaryColor: string;
  defaultCoverEyes: boolean;
  defaultScaleWidth: number;
  defaultScaleHeight: number;
}

export interface FaceLandmarkTrack {
  id: number;
  label: string;
  centerX: number; // 0..1 normalized
  centerY: number; // 0..1 normalized
  leftEyeX: number; // 0..1 normalized
  leftEyeY: number; // 0..1 normalized
  rightEyeX: number; // 0..1 normalized
  rightEyeY: number; // 0..1 normalized
  eyeDistance: number; // 0..1 normalized
  faceWidth: number; // 0..1 normalized
  angle: number; // radians
  yaw: number; // -1..1 horizontal perspective
  confidence: number;
  source: 'mediapipe' | 'native' | 'optical_patch' | 'demo_actor' | 'manual_keyframe';
}

export interface PerFaceOverride {
  enabled: boolean;
  styleId?: MaskStyleId;
  primaryColor?: string;
  secondaryColor?: string;
  coverEyes?: boolean;
  scaleMultiplier?: number;
}

export interface ManualKeyframe {
  id: string;
  faceId: number;
  timeSec: number;
  centerX: number;
  centerY: number;
  faceWidth: number;
  angle: number;
}

export interface MaskConfig {
  styleId: MaskStyleId;
  primaryColor: string;
  secondaryColor: string;
  scaleWidth: number;
  scaleHeight: number;
  offsetY: number; // -0.5 to 0.5 relative to faceWidth
  opacity: number; // 0.1 to 1.0
  shadowIntensity: number; // 0 to 1.0
  coverEyes: boolean;
  eyeTintOpacity: number; // 0.2 to 1.0
  smoothing: number; // 0.0 to 0.92
  censorText: string;
  pixelBlockSize: number; // 6 to 32
  showTrackingGuides: boolean;
  customImageUrl: string | null;
  earHeight: number; // 0.4 to 1.6 multiplier for Catwoman feline ears
  eyeSlant: number; // 0.05 to 0.42 radians for feline cat-eye tilt
  glossIntensity: number; // 0 to 1.0 liquid latex specular shine
  showStitches: boolean; // Iconic Catwoman cross-stitch seams
}

export interface CapturedSnapshot {
  id: string;
  dataUrl: string;
  timestampLabel: string;
  facesCount: number;
  maskName: string;
  resolution: string;
  createdAt: string;
}

export interface RecordedVideoClip {
  id: string;
  url: string;
  filename: string;
  durationSec: number;
  maskName: string;
  sizeLabel: string;
  createdAt: string;
  mimeType: string;
}

export type VideoSourceMode = 'demo' | 'upload' | 'webcam';

export type DemoSceneId = 'studio_interview' | 'masquerade_trio' | 'closeup_motion';
