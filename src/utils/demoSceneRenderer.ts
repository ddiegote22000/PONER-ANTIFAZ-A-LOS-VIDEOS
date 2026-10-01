import { DemoSceneId, FaceLandmarkTrack } from '../types/mask';

interface ActorSpec {
  id: number;
  label: string;
  baseX: number;
  baseY: number;
  baseFaceWidth: number;
  skinTone: string;
  skinShadow: string;
  hairColor: string;
  suitColor: string;
  accentColor: string;
  eyeColor: string;
  freqX: number;
  freqY: number;
  freqTilt: number;
  phase: number;
  hairStyle: 'short_wave' | 'long_editorial' | 'slick_back';
}

const SCENE_ACTORS: Record<DemoSceneId, ActorSpec[]> = {
  studio_interview: [
    {
      id: 0,
      label: 'Rostro 1 · Ponente Izquierdo',
      baseX: 0.33,
      baseY: 0.45,
      baseFaceWidth: 0.175,
      skinTone: '#E8B89A',
      skinShadow: '#C68B6B',
      hairColor: '#18181B',
      suitColor: '#1E293B',
      accentColor: '#E11D48',
      eyeColor: '#3B2F2F',
      freqX: 0.75,
      freqY: 1.1,
      freqTilt: 0.9,
      phase: 0,
      hairStyle: 'short_wave',
    },
    {
      id: 1,
      label: 'Rostro 2 · Ponente Derecho',
      baseX: 0.68,
      baseY: 0.46,
      baseFaceWidth: 0.168,
      skinTone: '#D49B78',
      skinShadow: '#AD7150',
      hairColor: '#27170E',
      suitColor: '#0F172A',
      accentColor: '#38BDF8',
      eyeColor: '#1E3A2F',
      freqX: 0.62,
      freqY: 0.95,
      freqTilt: 0.82,
      phase: 2.1,
      hairStyle: 'long_editorial',
    },
  ],
  masquerade_trio: [
    {
      id: 0,
      label: 'Rostro 1 · Invitado Central',
      baseX: 0.5,
      baseY: 0.44,
      baseFaceWidth: 0.17,
      skinTone: '#F1C6AA',
      skinShadow: '#CFA082',
      hairColor: '#1C1917',
      suitColor: '#31102F',
      accentColor: '#F59E0B',
      eyeColor: '#2563EB',
      freqX: 0.8,
      freqY: 1.2,
      freqTilt: 1.05,
      phase: 0.4,
      hairStyle: 'slick_back',
    },
    {
      id: 1,
      label: 'Rostro 2 · Invitada Izquierda',
      baseX: 0.22,
      baseY: 0.49,
      baseFaceWidth: 0.145,
      skinTone: '#C88A65',
      skinShadow: '#9E6240',
      hairColor: '#090A0F',
      suitColor: '#064E3B',
      accentColor: '#34D399',
      eyeColor: '#292524',
      freqX: 0.55,
      freqY: 0.88,
      freqTilt: 0.74,
      phase: 1.7,
      hairStyle: 'long_editorial',
    },
    {
      id: 2,
      label: 'Rostro 3 · Invitado Derecho',
      baseX: 0.78,
      baseY: 0.48,
      baseFaceWidth: 0.148,
      skinTone: '#E3B191',
      skinShadow: '#BA8566',
      hairColor: '#3F271D',
      suitColor: '#1E1B4B',
      accentColor: '#F43F5E',
      eyeColor: '#365314',
      freqX: 0.68,
      freqY: 1.02,
      freqTilt: 0.92,
      phase: 3.4,
      hairStyle: 'short_wave',
    },
  ],
  closeup_motion: [
    {
      id: 0,
      label: 'Rostro 1 · Primer Plano Dinámico',
      baseX: 0.5,
      baseY: 0.46,
      baseFaceWidth: 0.245,
      skinTone: '#E5B596',
      skinShadow: '#BE8868',
      hairColor: '#141418',
      suitColor: '#18181B',
      accentColor: '#E11D48',
      eyeColor: '#1E293B',
      freqX: 0.95,
      freqY: 1.15,
      freqTilt: 1.25,
      phase: 0.5,
      hairStyle: 'short_wave',
    },
  ],
};

export const DEMO_SCENES: {
  id: DemoSceneId;
  title: string;
  subtitle: string;
  facesCount: number;
}[] = [
  {
    id: 'studio_interview',
    title: 'Entrevista en Estudio',
    subtitle: '2 rostros en diálogo con giro e inclinación natural',
    facesCount: 2,
  },
  {
    id: 'masquerade_trio',
    title: 'Recepción Nocturna',
    subtitle: '3 rostros simultáneos a distintas profundidades',
    facesCount: 3,
  },
  {
    id: 'closeup_motion',
    title: 'Primer Plano Dinámico',
    subtitle: '1 rostro en acercamiento con rotación pronunciada',
    facesCount: 1,
  },
];

export function renderDemoSceneFrame(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  timeSec: number,
  sceneId: DemoSceneId
): FaceLandmarkTrack[] {
  ctx.save();

  // 1. Studio / Cinema Backdrop
  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  if (sceneId === 'studio_interview') {
    bgGrad.addColorStop(0, '#0F172A');
    bgGrad.addColorStop(0.5, '#1E293B');
    bgGrad.addColorStop(1, '#090D16');
  } else if (sceneId === 'masquerade_trio') {
    bgGrad.addColorStop(0, '#1A0B1C');
    bgGrad.addColorStop(0.5, '#1F1638');
    bgGrad.addColorStop(1, '#090A10');
  } else {
    bgGrad.addColorStop(0, '#111827');
    bgGrad.addColorStop(0.5, '#1F2937');
    bgGrad.addColorStop(1, '#090A0F');
  }
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  // Subtle architectural studio lighting panels in background
  ctx.fillStyle = 'rgba(255, 255, 255, 0.025)';
  for (let i = 0; i < 5; i++) {
    const panelX = width * (0.1 + i * 0.2) + Math.sin(timeSec * 0.25 + i) * 8;
    ctx.fillRect(panelX, height * 0.08, width * 0.08, height * 0.84);
  }

  // Soft warm key light bokeh
  const bokehGrad = ctx.createRadialGradient(
    width * 0.5,
    height * 0.28,
    width * 0.05,
    width * 0.5,
    height * 0.4,
    width * 0.65
  );
  bokehGrad.addColorStop(0, 'rgba(225, 29, 72, 0.09)');
  bokehGrad.addColorStop(0.6, 'rgba(56, 189, 248, 0.04)');
  bokehGrad.addColorStop(1, 'transparent');
  ctx.fillStyle = bokehGrad;
  ctx.fillRect(0, 0, width, height);

  const actors = SCENE_ACTORS[sceneId] || SCENE_ACTORS.studio_interview;
  const tracks: FaceLandmarkTrack[] = [];

  for (const actor of actors) {
    // Smooth organic head motion
    const moveX = Math.sin(timeSec * actor.freqX + actor.phase) * 0.032;
    const moveY = Math.cos(timeSec * actor.freqY + actor.phase) * 0.018;
    const scalePulse = 1 + Math.sin(timeSec * 0.6 + actor.phase) * 0.045;
    const angle = Math.sin(timeSec * actor.freqTilt + actor.phase) * 0.14; // Head tilt in radians
    const yaw = Math.sin(timeSec * (actor.freqX * 0.85) + actor.phase); // -1..1 horizontal head turn

    const cx = (actor.baseX + moveX) * width;
    const cy = (actor.baseY + moveY) * height;
    const fw = actor.baseFaceWidth * scalePulse * width;
    const fh = fw * 1.32;

    ctx.save();
    ctx.translate(cx, cy);

    // Draw shoulders and tailored jacket (slightly less rotated than head)
    ctx.save();
    ctx.rotate(angle * 0.25);
    ctx.fillStyle = actor.suitColor;
    ctx.beginPath();
    ctx.ellipse(0, fh * 1.18, fw * 1.28, fh * 0.68, 0, Math.PI, Math.PI * 2);
    ctx.fill();

    // Collar & shirt V-neck
    ctx.fillStyle = '#F8FAFC';
    ctx.beginPath();
    ctx.moveTo(-fw * 0.26, fh * 0.62);
    ctx.lineTo(fw * 0.26, fh * 0.62);
    ctx.lineTo(0, fh * 1.12);
    ctx.closePath();
    ctx.fill();

    // Tie / Lapel accent
    ctx.fillStyle = actor.accentColor;
    ctx.beginPath();
    ctx.moveTo(-fw * 0.06, fh * 0.72);
    ctx.lineTo(fw * 0.06, fh * 0.72);
    ctx.lineTo(fw * 0.09, fh * 1.12);
    ctx.lineTo(-fw * 0.09, fh * 1.12);
    ctx.closePath();
    ctx.fill();

    // Neck column
    ctx.fillStyle = actor.skinShadow;
    ctx.beginPath();
    ctx.roundRect(-fw * 0.24, fh * 0.35, fw * 0.48, fh * 0.42, fw * 0.1);
    ctx.fill();
    ctx.restore();

    // Rotate for head movement
    ctx.rotate(angle);

    // Back hair volume for long_editorial style
    if (actor.hairStyle === 'long_editorial') {
      ctx.fillStyle = actor.hairColor;
      ctx.beginPath();
      ctx.ellipse(0, fh * 0.1, fw * 0.68, fh * 0.68, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Ears
    ctx.fillStyle = actor.skinShadow;
    ctx.beginPath();
    ctx.ellipse(-fw * 0.52, 0, fw * 0.08, fh * 0.14, -0.1, 0, Math.PI * 2);
    ctx.ellipse(fw * 0.52, 0, fw * 0.08, fh * 0.14, 0.1, 0, Math.PI * 2);
    ctx.fill();

    // Head contour with natural studio shading
    const faceGrad = ctx.createRadialGradient(
      -fw * 0.12 + yaw * fw * 0.08,
      -fh * 0.12,
      fw * 0.1,
      0,
      0,
      fw * 0.68
    );
    faceGrad.addColorStop(0, actor.skinTone);
    faceGrad.addColorStop(0.78, actor.skinTone);
    faceGrad.addColorStop(1, actor.skinShadow);

    ctx.fillStyle = faceGrad;
    ctx.beginPath();
    ctx.ellipse(0, 0, fw * 0.5, fh * 0.54, 0, 0, Math.PI * 2);
    ctx.fill();

    // Eyebrows
    const eyeY = -fh * 0.05;
    const eyeSpan = fw * 0.44;
    const leftEyeLocalX = -eyeSpan / 2 + yaw * fw * 0.035;
    const rightEyeLocalX = eyeSpan / 2 + yaw * fw * 0.035;

    ctx.strokeStyle = actor.hairColor;
    ctx.lineWidth = Math.max(3, fw * 0.035);
    ctx.lineCap = 'round';

    const browLift = Math.sin(timeSec * 1.8 + actor.phase) * fh * 0.012;
    // Left brow
    ctx.beginPath();
    ctx.quadraticCurveTo(
      leftEyeLocalX,
      eyeY - fh * 0.11 - browLift,
      leftEyeLocalX + fw * 0.11,
      eyeY - fh * 0.075
    );
    ctx.moveTo(leftEyeLocalX - fw * 0.12, eyeY - fh * 0.07);
    ctx.quadraticCurveTo(
      leftEyeLocalX,
      eyeY - fh * 0.115 - browLift,
      leftEyeLocalX + fw * 0.11,
      eyeY - fh * 0.075
    );
    ctx.stroke();

    // Right brow
    ctx.beginPath();
    ctx.moveTo(rightEyeLocalX - fw * 0.11, eyeY - fh * 0.075);
    ctx.quadraticCurveTo(
      rightEyeLocalX,
      eyeY - fh * 0.115 - browLift,
      rightEyeLocalX + fw * 0.12,
      eyeY - fh * 0.07
    );
    ctx.stroke();

    // Natural periodic blinking
    const blinkCycle = (timeSec * 0.9 + actor.phase) % 4.2;
    const isBlinking = blinkCycle > 3.95 && blinkCycle < 4.12;
    const eyeOpenRatio = isBlinking ? 0.12 : 1.0;

    // Eyes (Sclera, Iris, Pupil, Catchlight)
    [leftEyeLocalX, rightEyeLocalX].forEach((ex) => {
      ctx.save();
      ctx.translate(ex, eyeY);

      // Sclera
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.ellipse(0, 0, fw * 0.095, fh * 0.042 * eyeOpenRatio, 0, 0, Math.PI * 2);
      ctx.fill();

      if (!isBlinking) {
        // Iris
        const gazeX = yaw * fw * 0.018;
        ctx.fillStyle = actor.eyeColor;
        ctx.beginPath();
        ctx.arc(gazeX, 0, fw * 0.042, 0, Math.PI * 2);
        ctx.fill();

        // Pupil
        ctx.fillStyle = '#090A0F';
        ctx.beginPath();
        ctx.arc(gazeX, 0, fw * 0.02, 0, Math.PI * 2);
        ctx.fill();

        // Studio catchlight
        ctx.fillStyle = '#FFFFFF';
        ctx.beginPath();
        ctx.arc(gazeX - fw * 0.012, -fh * 0.012, fw * 0.01, 0, Math.PI * 2);
        ctx.fill();
      }

      // Upper lash line
      ctx.strokeStyle = '#18181B';
      ctx.lineWidth = Math.max(1.5, fw * 0.018);
      ctx.beginPath();
      ctx.ellipse(0, 0, fw * 0.098, fh * 0.043 * eyeOpenRatio, 0, Math.PI, Math.PI * 2);
      ctx.stroke();

      ctx.restore();
    });

    // Nose bridge & tip
    const noseOffsetX = yaw * fw * 0.045;
    ctx.strokeStyle = actor.skinShadow;
    ctx.lineWidth = Math.max(2, fw * 0.022);
    ctx.beginPath();
    ctx.moveTo(noseOffsetX * 0.4, eyeY + fh * 0.02);
    ctx.lineTo(noseOffsetX, fh * 0.16);
    ctx.lineTo(noseOffsetX - fw * 0.04, fh * 0.18);
    ctx.stroke();

    // Expressive speaking/smiling mouth
    const talkOpen = Math.max(0, Math.sin(timeSec * 5.2 + actor.phase * 2)) * fh * 0.028;
    ctx.fillStyle = '#9F4248';
    ctx.beginPath();
    ctx.ellipse(
      noseOffsetX * 0.3,
      fh * 0.31,
      fw * 0.13,
      fh * 0.022 + talkOpen,
      0,
      0,
      Math.PI * 2
    );
    ctx.fill();

    // Hair crown
    ctx.fillStyle = actor.hairColor;
    ctx.beginPath();
    ctx.ellipse(0, -fh * 0.38, fw * 0.52, fh * 0.24, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-fw * 0.36, -fh * 0.26, fw * 0.18, 0, Math.PI * 2);
    ctx.arc(fw * 0.36, -fh * 0.26, fw * 0.18, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();

    // Compute world-space coordinates for the actor's eye bridge so the antifaz locks onto the eyes
    const cosA = Math.cos(angle);
    const sinA = Math.sin(angle);
    const midLocalX = (leftEyeLocalX + rightEyeLocalX) / 2;
    const midLocalY = eyeY;

    const worldEyeCenterX = cx + (midLocalX * cosA - midLocalY * sinA);
    const worldEyeCenterY = cy + (midLocalX * sinA + midLocalY * cosA);

    const worldLeftEyeX = cx + (leftEyeLocalX * cosA - eyeY * sinA);
    const worldLeftEyeY = cy + (leftEyeLocalX * sinA + eyeY * cosA);
    const worldRightEyeX = cx + (rightEyeLocalX * cosA - eyeY * sinA);
    const worldRightEyeY = cy + (rightEyeLocalX * sinA + eyeY * cosA);

    tracks.push({
      id: actor.id,
      label: actor.label,
      centerX: worldEyeCenterX / width,
      centerY: worldEyeCenterY / height,
      leftEyeX: worldLeftEyeX / width,
      leftEyeY: worldLeftEyeY / height,
      rightEyeX: worldRightEyeX / width,
      rightEyeY: worldRightEyeY / height,
      eyeDistance: eyeSpan / width,
      faceWidth: fw / width,
      angle,
      yaw: yaw * 0.5,
      confidence: 0.99,
      source: 'demo_actor',
    });
  }

  ctx.restore();
  return tracks;
}
