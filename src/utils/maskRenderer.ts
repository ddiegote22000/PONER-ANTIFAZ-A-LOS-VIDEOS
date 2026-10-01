import { FaceLandmarkTrack, MaskConfig, MaskStyleId, PerFaceOverride } from '../types/mask';

// Helper to build the outer contour path of an antifaz centered at (0,0)
// with half-width `hw` and half-height `hh`
function traceOuterMaskPath(
  ctx: CanvasRenderingContext2D,
  styleId: MaskStyleId,
  hw: number,
  hh: number,
  earHeight: number = 1.0
) {
  ctx.beginPath();

  switch (styleId) {
    case 'catwoman_petite':
    case 'catwoman_lace': {
      // Petite, tight-fitting Catwoman mask with sculpted feline ears and winged cat-eye tips
      const earTipY = -hh * (0.85 + earHeight * 0.58);
      const earInnerX = hw * 0.38;
      const earTipX = hw * 0.66;
      const earOuterX = hw * 0.86;

      // Start at low, sleek center brow dip
      ctx.moveTo(0, -hh * 0.24);
      // Sweep up to right inner ear base
      ctx.quadraticCurveTo(hw * 0.18, -hh * 0.3, earInnerX, -hh * 0.56);
      // Right feline ear inner curve up to pointed tip
      ctx.quadraticCurveTo(hw * 0.5, earTipY * 0.88, earTipX, earTipY);
      // Right feline ear outer curve down to temple
      ctx.quadraticCurveTo(hw * 0.8, earTipY * 0.72, earOuterX, -hh * 0.52);
      // Sharp winged cat-eye outer flick at temple
      ctx.quadraticCurveTo(hw * 0.98, -hh * 0.58, hw * 1.06, -hh * 0.42);
      // Tight, high cheekbone curve underneath the eye
      ctx.bezierCurveTo(hw * 0.94, hh * 0.18, hw * 0.68, hh * 0.62, hw * 0.36, hh * 0.56);
      // Slender contour up toward nose bridge
      ctx.quadraticCurveTo(hw * 0.15, hh * 0.5, hw * 0.08, hh * 0.24);
      // Delicate feline V-point on the nose bridge
      ctx.lineTo(0, hh * 0.44);
      ctx.lineTo(-hw * 0.08, hh * 0.24);
      // Left cheekbone curve
      ctx.quadraticCurveTo(-hw * 0.15, hh * 0.5, -hw * 0.36, hh * 0.56);
      ctx.bezierCurveTo(-hw * 0.68, hh * 0.62, -hw * 0.94, hh * 0.18, -hw * 1.06, -hh * 0.42);
      // Left winged temple flick up to left ear outer base
      ctx.quadraticCurveTo(-hw * 0.98, -hh * 0.58, -earOuterX, -hh * 0.52);
      // Left feline ear outer curve up to pointed tip
      ctx.quadraticCurveTo(-hw * 0.8, earTipY * 0.72, -earTipX, earTipY);
      // Left feline ear inner curve down to brow
      ctx.quadraticCurveTo(-hw * 0.5, earTipY * 0.88, -earInnerX, -hh * 0.56);
      // Back to center brow dip
      ctx.quadraticCurveTo(-hw * 0.18, -hh * 0.3, 0, -hh * 0.24);
      break;
    }

    case 'feline_noir': {
      // Ultra-slim micro cat-eye domino mask with dramatic upturned outer wings
      ctx.moveTo(0, -hh * 0.26);
      ctx.bezierCurveTo(hw * 0.28, -hh * 0.58, hw * 0.72, -hh * 0.78, hw * 1.12, -hh * 0.88);
      ctx.bezierCurveTo(hw * 1.04, -hh * 0.12, hw * 0.86, hh * 0.48, hw * 0.58, hh * 0.56);
      ctx.bezierCurveTo(hw * 0.34, hh * 0.62, hw * 0.16, hh * 0.45, hw * 0.08, hh * 0.22);
      ctx.lineTo(0, hh * 0.36);
      ctx.lineTo(-hw * 0.08, hh * 0.22);
      ctx.bezierCurveTo(-hw * 0.16, hh * 0.45, -hw * 0.34, hh * 0.62, -hw * 0.58, hh * 0.56);
      ctx.bezierCurveTo(-hw * 0.86, hh * 0.48, -hw * 1.04, -hh * 0.12, -hw * 1.12, -hh * 0.88);
      ctx.bezierCurveTo(-hw * 0.72, -hh * 0.78, -hw * 0.28, -hh * 0.58, 0, -hh * 0.26);
      break;
    }

    case 'venetian_gold': {
      // Ornate winged Venetian masquerade contour
      ctx.moveTo(0, -hh * 0.68);
      ctx.bezierCurveTo(hw * 0.35, -hh * 1.18, hw * 0.82, -hh * 1.08, hw * 1.06, -hh * 0.72);
      ctx.bezierCurveTo(hw * 1.12, -hh * 0.25, hw * 1.02, hh * 0.45, hw * 0.86, hh * 0.78);
      ctx.bezierCurveTo(hw * 0.55, hh * 0.98, hw * 0.25, hh * 0.88, hw * 0.11, hh * 0.42);
      ctx.quadraticCurveTo(0, hh * 0.12, -hw * 0.11, hh * 0.42);
      ctx.bezierCurveTo(-hw * 0.25, hh * 0.88, -hw * 0.55, hh * 0.98, -hw * 0.86, hh * 0.78);
      ctx.bezierCurveTo(-hw * 1.02, hh * 0.45, -hw * 1.12, -hh * 0.25, -hw * 1.06, -hh * 0.72);
      ctx.bezierCurveTo(-hw * 0.82, -hh * 1.08, -hw * 0.35, -hh * 1.18, 0, -hh * 0.68);
      break;
    }

    case 'stealth_angular': {
      // Tactical polygonal angular mask
      ctx.moveTo(0, -hh * 0.55);
      ctx.lineTo(hw * 0.38, -hh * 0.95);
      ctx.lineTo(hw * 0.92, -hh * 0.78);
      ctx.lineTo(hw * 1.06, -hh * 0.12);
      ctx.lineTo(hw * 0.88, hh * 0.72);
      ctx.lineTo(hw * 0.42, hh * 0.88);
      ctx.lineTo(hw * 0.12, hh * 0.36);
      ctx.lineTo(0, hh * 0.52);
      ctx.lineTo(-hw * 0.12, hh * 0.36);
      ctx.lineTo(-hw * 0.42, hh * 0.88);
      ctx.lineTo(-hw * 0.88, hh * 0.72);
      ctx.lineTo(-hw * 1.06, -hh * 0.12);
      ctx.lineTo(-hw * 0.92, -hh * 0.78);
      ctx.lineTo(-hw * 0.38, -hh * 0.95);
      ctx.closePath();
      break;
    }

    case 'harlequin_royal': {
      // Jester/Harlequin peaked diamond contour
      ctx.moveTo(0, -hh * 0.98);
      ctx.quadraticCurveTo(hw * 0.25, -hh * 0.65, hw * 0.56, -hh * 0.98);
      ctx.quadraticCurveTo(hw * 0.86, -hh * 0.92, hw * 1.08, -hh * 0.45);
      ctx.quadraticCurveTo(hw * 1.02, hh * 0.35, hw * 0.74, hh * 0.88);
      ctx.quadraticCurveTo(hw * 0.36, hh * 0.85, hw * 0.1, hh * 0.38);
      ctx.lineTo(0, hh * 0.62);
      ctx.lineTo(-hw * 0.1, hh * 0.38);
      ctx.quadraticCurveTo(-hw * 0.36, hh * 0.85, -hw * 0.74, hh * 0.88);
      ctx.quadraticCurveTo(-hw * 1.02, hh * 0.35, -hw * 1.08, -hh * 0.45);
      ctx.quadraticCurveTo(-hw * 0.86, -hh * 0.92, -hw * 0.56, -hh * 0.98);
      ctx.quadraticCurveTo(-hw * 0.25, -hh * 0.65, 0, -hh * 0.98);
      break;
    }

    case 'cyber_visor':
    case 'frosted_glass': {
      // Sleek wrap-around panoramic visor
      const r = hh * 0.65;
      ctx.moveTo(-hw + r, -hh * 0.78);
      ctx.lineTo(hw - r, -hh * 0.78);
      ctx.quadraticCurveTo(hw * 1.05, -hh * 0.78, hw * 1.02, 0);
      ctx.quadraticCurveTo(hw * 0.98, hh * 0.82, hw * 0.52, hh * 0.82);
      ctx.quadraticCurveTo(hw * 0.18, hh * 0.82, hw * 0.08, hh * 0.32);
      ctx.quadraticCurveTo(0, hh * 0.14, -hw * 0.08, hh * 0.32);
      ctx.quadraticCurveTo(-hw * 0.18, hh * 0.82, -hw * 0.52, hh * 0.82);
      ctx.quadraticCurveTo(-hw * 0.98, hh * 0.82, -hw * 1.02, 0);
      ctx.quadraticCurveTo(-hw * 1.05, -hh * 0.78, -hw + r, -hh * 0.78);
      break;
    }

    case 'editorial_censor': {
      const r = Math.min(hw, hh) * 0.12;
      ctx.roundRect(-hw, -hh * 0.68, hw * 2, hh * 1.36, r);
      break;
    }

    case 'domino_classic':
    case 'pixel_mosaic':
    default: {
      // Classic Domino curved silhouette
      ctx.moveTo(0, -hh * 0.42);
      ctx.bezierCurveTo(hw * 0.32, -hh * 0.88, hw * 0.78, -hh * 0.82, hw * 0.98, -hh * 0.32);
      ctx.bezierCurveTo(hw * 1.04, hh * 0.16, hw * 0.9, hh * 0.66, hw * 0.56, hh * 0.74);
      ctx.bezierCurveTo(hw * 0.3, hh * 0.8, hw * 0.16, hh * 0.55, hw * 0.09, hh * 0.28);
      ctx.quadraticCurveTo(0, hh * 0.04, -hw * 0.09, hh * 0.28);
      ctx.bezierCurveTo(-hw * 0.16, hh * 0.55, -hw * 0.3, hh * 0.8, -hw * 0.56, hh * 0.74);
      ctx.bezierCurveTo(-hw * 0.9, hh * 0.66, -hw * 1.04, hh * 0.16, -hw * 0.98, -hh * 0.32);
      ctx.bezierCurveTo(-hw * 0.78, -hh * 0.82, -hw * 0.32, -hh * 0.88, 0, -hh * 0.42);
      break;
    }
  }

  ctx.closePath();
}

// Appends anatomical or seductive cat-eye cutouts to the current path (for 'evenodd' fill)
function traceEyeHolesSubpaths(
  ctx: CanvasRenderingContext2D,
  styleId: MaskStyleId,
  eyeOffsetX: number,
  eyeRadiusX: number,
  eyeRadiusY: number,
  eyeSlant: number = 0.24
) {
  if (
    styleId === 'catwoman_petite' ||
    styleId === 'catwoman_lace' ||
    styleId === 'feline_noir'
  ) {
    // Sculpted, seductive almond cat-eye apertures with sharp inner tear duct and upturned outer wing
    const rx = eyeRadiusX * 1.12;
    const ry = eyeRadiusY * 0.92;
    const liftOuter = ry * (0.45 + eyeSlant * 1.35);
    const dipInner = ry * 0.22;

    // Right eye aperture (positive X)
    ctx.moveTo(eyeOffsetX - rx * 0.92, dipInner);
    ctx.bezierCurveTo(
      eyeOffsetX - rx * 0.45,
      -ry * 1.05,
      eyeOffsetX + rx * 0.45,
      -ry * 1.1 - liftOuter * 0.5,
      eyeOffsetX + rx * 1.08,
      -liftOuter
    );
    ctx.bezierCurveTo(
      eyeOffsetX + rx * 0.65,
      ry * 0.92,
      eyeOffsetX - rx * 0.35,
      ry * 0.98,
      eyeOffsetX - rx * 0.92,
      dipInner
    );
    ctx.closePath();

    // Left eye aperture (negative X)
    ctx.moveTo(-eyeOffsetX + rx * 0.92, dipInner);
    ctx.bezierCurveTo(
      -eyeOffsetX + rx * 0.45,
      -ry * 1.05,
      -eyeOffsetX - rx * 0.45,
      -ry * 1.1 - liftOuter * 0.5,
      -eyeOffsetX - rx * 1.08,
      -liftOuter
    );
    ctx.bezierCurveTo(
      -eyeOffsetX - rx * 0.65,
      ry * 0.92,
      -eyeOffsetX + rx * 0.35,
      ry * 0.98,
      -eyeOffsetX + rx * 0.92,
      dipInner
    );
    ctx.closePath();
    return;
  }

  if (styleId === 'stealth_angular') {
    ctx.moveTo(-eyeOffsetX - eyeRadiusX * 1.05, -eyeRadiusY * 0.25);
    ctx.lineTo(-eyeOffsetX - eyeRadiusX * 0.35, -eyeRadiusY * 0.85);
    ctx.lineTo(-eyeOffsetX + eyeRadiusX * 0.85, -eyeRadiusY * 0.35);
    ctx.lineTo(-eyeOffsetX + eyeRadiusX * 0.65, eyeRadiusY * 0.65);
    ctx.lineTo(-eyeOffsetX - eyeRadiusX * 0.65, eyeRadiusY * 0.65);
    ctx.closePath();

    ctx.moveTo(eyeOffsetX + eyeRadiusX * 1.05, -eyeRadiusY * 0.25);
    ctx.lineTo(eyeOffsetX + eyeRadiusX * 0.35, -eyeRadiusY * 0.85);
    ctx.lineTo(eyeOffsetX - eyeRadiusX * 0.85, -eyeRadiusY * 0.35);
    ctx.lineTo(eyeOffsetX - eyeRadiusX * 0.65, eyeRadiusY * 0.65);
    ctx.lineTo(eyeOffsetX + eyeRadiusX * 0.65, eyeRadiusY * 0.65);
    ctx.closePath();
    return;
  }

  const tilt = -0.06;
  ctx.moveTo(-eyeOffsetX + eyeRadiusX, 0);
  ctx.ellipse(-eyeOffsetX, 0, eyeRadiusX, eyeRadiusY, tilt, 0, Math.PI * 2);
  ctx.ellipse(eyeOffsetX, 0, eyeRadiusX, eyeRadiusY, -tilt, 0, Math.PI * 2);
}

// Helper to draw iconic Catwoman cross-stitches along a quadratic curve
function drawCrossStitchesAlongCurve(
  ctx: CanvasRenderingContext2D,
  x0: number,
  y0: number,
  cx: number,
  cy: number,
  x1: number,
  y1: number,
  steps: number,
  stitchSize: number,
  color: string
) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.1, stitchSize * 0.28);
  ctx.lineCap = 'round';

  for (let i = 1; i < steps; i++) {
    const t = i / steps;
    const mt = 1 - t;
    const px = mt * mt * x0 + 2 * mt * t * cx + t * t * x1;
    const py = mt * mt * y0 + 2 * mt * t * cy + t * t * y1;

    // Tangent vector
    const tx = 2 * mt * (cx - x0) + 2 * t * (x1 - cx);
    const ty = 2 * mt * (cy - y0) + 2 * t * (y1 - cy);
    const len = Math.hypot(tx, ty) || 1;
    const nx = -ty / len;
    const ny = tx / len;
    const ux = tx / len;
    const uy = ty / len;

    // Draw X cross stitch
    ctx.beginPath();
    ctx.moveTo(
      px - nx * stitchSize - ux * stitchSize * 0.45,
      py - ny * stitchSize - uy * stitchSize * 0.45
    );
    ctx.lineTo(
      px + nx * stitchSize + ux * stitchSize * 0.45,
      py + ny * stitchSize + uy * stitchSize * 0.45
    );
    ctx.moveTo(
      px - nx * stitchSize + ux * stitchSize * 0.45,
      py - ny * stitchSize + uy * stitchSize * 0.45
    );
    ctx.lineTo(
      px + nx * stitchSize - ux * stitchSize * 0.45,
      py + ny * stitchSize - uy * stitchSize * 0.45
    );
    ctx.stroke();
  }
  ctx.restore();
}

export function drawFaceMask(
  ctx: CanvasRenderingContext2D,
  face: FaceLandmarkTrack,
  canvasWidth: number,
  canvasHeight: number,
  config: MaskConfig,
  override?: PerFaceOverride,
  sourceVideoOrCanvas?: CanvasImageSource,
  customImage?: HTMLImageElement | null
) {
  if (override && !override.enabled) return;

  const styleId = override?.styleId ?? config.styleId;
  const primaryColor = override?.primaryColor ?? config.primaryColor;
  const secondaryColor = override?.secondaryColor ?? config.secondaryColor;
  const coverEyes = override?.coverEyes ?? config.coverEyes;
  const scaleMultiplier = override?.scaleMultiplier ?? 1;

  const earHeight = config.earHeight ?? 1.05;
  const eyeSlant = config.eyeSlant ?? 0.24;
  const glossIntensity = config.glossIntensity ?? 0.88;
  const showStitches = config.showStitches ?? true;

  const cx = face.centerX * canvasWidth;
  const cy = (face.centerY + config.offsetY * face.faceWidth) * canvasHeight;

  const isPetiteFeline =
    styleId === 'catwoman_petite' || styleId === 'catwoman_lace' || styleId === 'feline_noir';

  // Compact, tight-fitting proportions for petite feline masks
  const widthFactor = isPetiteFeline ? 1.02 : 1.12;
  const heightFactor = isPetiteFeline ? 0.38 : 0.42;

  const baseWidth = face.faceWidth * canvasWidth * widthFactor * config.scaleWidth * scaleMultiplier;
  const baseHeight = baseWidth * heightFactor * config.scaleHeight;

  const hw = baseWidth / 2;
  const hh = baseHeight / 2;

  const eyeDistPx = Math.max(face.eyeDistance * canvasWidth, baseWidth * 0.44);
  const eyeOffsetX = eyeDistPx / 2;
  const eyeRadiusX = Math.min(hw * 0.31, eyeDistPx * 0.36);
  const eyeRadiusY = hh * (isPetiteFeline ? 0.42 : 0.36);

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(face.angle);

  // Subtle 3D horizontal yaw foreshortening
  const yawScaleX = 1 - Math.min(0.25, Math.abs(face.yaw || 0) * 0.22);
  ctx.scale(yawScaleX, 1);

  ctx.globalAlpha = config.opacity;

  // 1. Custom uploaded PNG/SVG mask
  if (styleId === 'custom_image' && customImage && customImage.complete && customImage.naturalWidth > 0) {
    if (config.shadowIntensity > 0) {
      ctx.shadowColor = `rgba(0, 0, 0, ${config.shadowIntensity * 0.85})`;
      ctx.shadowBlur = hh * 0.45;
      ctx.shadowOffsetY = hh * 0.15;
    }
    ctx.drawImage(customImage, -hw, -hh, hw * 2, hh * 2);
    ctx.restore();
    return;
  }

  // 2. Dynamic Pixel Mosaic Antifaz
  if (styleId === 'pixel_mosaic' && sourceVideoOrCanvas) {
    traceOuterMaskPath(ctx, 'domino_classic', hw, hh, earHeight);
    ctx.save();
    ctx.clip();

    const block = Math.max(6, Math.round(config.pixelBlockSize));
    const startX = -hw;
    const startY = -hh;
    for (let y = startY; y < hh; y += block) {
      for (let x = startX; x < hw; x += block) {
        const nx = Math.floor((x + hw) / block);
        const ny = Math.floor((y + hh) / block);
        const hash = Math.sin(nx * 12.9898 + ny * 78.233 + Math.floor(face.centerX * 25)) * 43758.5453;
        const frac = hash - Math.floor(hash);
        const lum = Math.floor(25 + frac * 65);
        ctx.fillStyle = (nx + ny) % 3 === 0 ? primaryColor : `rgb(${lum}, ${lum + 6}, ${lum + 14})`;
        ctx.fillRect(x, y, block - 0.5, block - 0.5);
      }
    }
    ctx.restore();

    traceOuterMaskPath(ctx, 'domino_classic', hw, hh, earHeight);
    ctx.lineWidth = Math.max(1.5, hh * 0.04);
    ctx.strokeStyle = secondaryColor;
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 3. Frosted Glass Privacy Visor
  if (styleId === 'frosted_glass') {
    if (config.shadowIntensity > 0) {
      ctx.shadowColor = `rgba(0, 0, 0, ${config.shadowIntensity * 0.65})`;
      ctx.shadowBlur = hh * 0.4;
      ctx.shadowOffsetY = hh * 0.14;
    }

    traceOuterMaskPath(ctx, 'frosted_glass', hw, hh, earHeight);
    const glassGrad = ctx.createLinearGradient(-hw, -hh, hw, hh);
    glassGrad.addColorStop(0, 'rgba(226, 232, 240, 0.84)');
    glassGrad.addColorStop(0.5, 'rgba(148, 163, 184, 0.78)');
    glassGrad.addColorStop(1, 'rgba(51, 65, 85, 0.88)');
    ctx.fillStyle = glassGrad;
    ctx.fill();

    ctx.save();
    traceOuterMaskPath(ctx, 'frosted_glass', hw, hh, earHeight);
    ctx.clip();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.26)';
    ctx.beginPath();
    ctx.moveTo(-hw * 0.65, -hh);
    ctx.lineTo(-hw * 0.25, -hh);
    ctx.lineTo(-hw * 0.55, hh);
    ctx.lineTo(-hw * 0.95, hh);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    traceOuterMaskPath(ctx, 'frosted_glass', hw, hh, earHeight);
    ctx.lineWidth = Math.max(2, hh * 0.05);
    ctx.strokeStyle = secondaryColor;
    ctx.stroke();
    ctx.restore();
    return;
  }

  // 4. Sculpted Antifaces (Catwoman Petite Latex, Catwoman Lace, Feline Noir, Domino, Venetian, etc.)
  if (config.shadowIntensity > 0) {
    ctx.shadowColor = `rgba(0, 0, 0, ${config.shadowIntensity * 0.9})`;
    ctx.shadowBlur = hh * 0.48;
    ctx.shadowOffsetY = hh * 0.16;
  }

  const forceSolidNoHoles = styleId === 'editorial_censor' || styleId === 'cyber_visor';
  if (coverEyes && !forceSolidNoHoles) {
    ctx.save();
    ctx.beginPath();
    traceEyeHolesSubpaths(ctx, styleId, eyeOffsetX, eyeRadiusX * 1.06, eyeRadiusY * 1.06, eyeSlant);
    const lensGrad = ctx.createLinearGradient(0, -eyeRadiusY, 0, eyeRadiusY);
    lensGrad.addColorStop(0, `rgba(9, 10, 15, ${config.eyeTintOpacity})`);
    lensGrad.addColorStop(0.5, secondaryColor + '55');
    lensGrad.addColorStop(1, `rgba(5, 5, 10, ${config.eyeTintOpacity})`);
    ctx.fillStyle = lensGrad;
    ctx.fill();
    ctx.restore();
  }

  // Main Mask Body Fill
  traceOuterMaskPath(ctx, styleId, hw, hh, earHeight);
  if (!forceSolidNoHoles) {
    traceEyeHolesSubpaths(ctx, styleId, eyeOffsetX, eyeRadiusX, eyeRadiusY, eyeSlant);
  }

  if (styleId === 'catwoman_lace') {
    // Semi-translucent sensual black Chantilly lace base
    ctx.fillStyle = primaryColor + 'CC';
    ctx.fill('evenodd');
  } else {
    const bodyGrad = ctx.createLinearGradient(-hw, -hh * 1.3, hw, hh);
    bodyGrad.addColorStop(0, primaryColor);
    bodyGrad.addColorStop(0.55, primaryColor);
    bodyGrad.addColorStop(1, '#040508');
    ctx.fillStyle = bodyGrad;
    ctx.fill('evenodd');
  }

  // Reset shadow for surface shaders & details
  ctx.shadowColor = 'transparent';
  ctx.shadowBlur = 0;
  ctx.shadowOffsetY = 0;

  // --- SPECIAL RENDERING FOR CATWOMAN PETITE LATEX & CATWOMAN LACE & FELINE NOIR ---
  if (styleId === 'catwoman_petite' || styleId === 'catwoman_lace' || styleId === 'feline_noir') {
    const earTipY = -hh * (0.85 + earHeight * 0.58);

    // A. Lace mesh pattern if 'catwoman_lace'
    if (styleId === 'catwoman_lace') {
      ctx.save();
      traceOuterMaskPath(ctx, styleId, hw, hh, earHeight);
      traceEyeHolesSubpaths(ctx, styleId, eyeOffsetX, eyeRadiusX, eyeRadiusY, eyeSlant);
      ctx.clip('evenodd');

      // Delicate diagonal diamond Chantilly fishnet mesh
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.16)';
      ctx.lineWidth = Math.max(0.8, hh * 0.02);
      const step = Math.max(5, hh * 0.16);
      for (let d = -hw * 2; d <= hw * 2; d += step) {
        ctx.beginPath();
        ctx.moveTo(d, -hh * 1.8);
        ctx.lineTo(d + hh * 2.2, hh * 1.2);
        ctx.moveTo(d, hh * 1.2);
        ctx.lineTo(d + hh * 2.2, -hh * 1.8);
        ctx.stroke();
      }

      // Micro floral lace nodes at intersections
      ctx.fillStyle = secondaryColor + '88';
      for (let x = -hw * 0.9; x <= hw * 0.9; x += step * 1.5) {
        for (let y = -hh * 1.1; y <= hh * 0.5; y += step * 1.5) {
          ctx.beginPath();
          ctx.arc(x, y, Math.max(1, hh * 0.025), 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.restore();
    }

    // B. Sculpted Inner Feline Ear Triangles (for catwoman_petite & catwoman_lace)
    if (styleId === 'catwoman_petite' || styleId === 'catwoman_lace') {
      [-1, 1].forEach((dir) => {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(dir * hw * 0.44, -hh * 0.56);
        ctx.quadraticCurveTo(dir * hw * 0.54, earTipY * 0.82, dir * hw * 0.65, earTipY * 0.9);
        ctx.quadraticCurveTo(dir * hw * 0.75, earTipY * 0.68, dir * hw * 0.78, -hh * 0.52);
        ctx.closePath();

        const earGrad = ctx.createLinearGradient(0, earTipY, 0, -hh * 0.45);
        earGrad.addColorStop(0, secondaryColor + 'AA');
        earGrad.addColorStop(1, 'rgba(0, 0, 0, 0.65)');
        ctx.fillStyle = earGrad;
        ctx.fill();
        ctx.restore();
      });
    }

    // C. High-Gloss Liquid Latex Specular Reflections (controlled by glossIntensity)
    if (glossIntensity > 0.05) {
      ctx.save();
      traceOuterMaskPath(ctx, styleId, hw, hh, earHeight);
      traceEyeHolesSubpaths(ctx, styleId, eyeOffsetX, eyeRadiusX, eyeRadiusY, eyeSlant);
      ctx.clip('evenodd');

      // Upper brow & feline ear liquid-latex sheen ribbon
      const sheenAlpha = glossIntensity * (styleId === 'catwoman_lace' ? 0.22 : 0.52);
      const latexGrad = ctx.createLinearGradient(0, earTipY, 0, hh * 0.2);
      latexGrad.addColorStop(0, `rgba(255, 255, 255, ${sheenAlpha * 0.9})`);
      latexGrad.addColorStop(0.38, `rgba(255, 255, 255, ${sheenAlpha})`);
      latexGrad.addColorStop(0.55, 'rgba(255, 255, 255, 0.02)');
      latexGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');

      ctx.fillStyle = latexGrad;
      ctx.beginPath();
      ctx.ellipse(0, -hh * 0.38, hw * 0.95, hh * 0.52, 0, 0, Math.PI * 2);
      ctx.fill();

      // Curved patent-leather specular catchlights under the cheekbones
      ctx.strokeStyle = `rgba(255, 255, 255, ${sheenAlpha * 0.78})`;
      ctx.lineWidth = Math.max(1.5, hh * 0.055);
      ctx.lineCap = 'round';

      [-1, 1].forEach((dir) => {
        ctx.beginPath();
        ctx.moveTo(dir * hw * 0.28, hh * 0.44);
        ctx.quadraticCurveTo(dir * hw * 0.62, hh * 0.48, dir * hw * 0.88, hh * 0.05);
        ctx.stroke();

        // Ear rim specular highlight
        if (styleId !== 'feline_noir') {
          ctx.beginPath();
          ctx.moveTo(dir * hw * 0.42, -hh * 0.58);
          ctx.quadraticCurveTo(dir * hw * 0.52, earTipY * 0.85, dir * hw * 0.64, earTipY * 0.94);
          ctx.stroke();
        }
      });

      ctx.restore();
    }

    // D. Seductive Winged Eyeliner Contour & Lash Flick around Eye Cutouts
    ctx.save();
    ctx.lineWidth = Math.max(1.6, hh * 0.048);
    ctx.strokeStyle = secondaryColor;
    ctx.beginPath();
    traceEyeHolesSubpaths(ctx, styleId, eyeOffsetX, eyeRadiusX * 1.02, eyeRadiusY * 1.02, eyeSlant);
    ctx.stroke();

    // Outer contour rim
    traceOuterMaskPath(ctx, styleId, hw, hh, earHeight);
    ctx.lineWidth = Math.max(1.4, hh * 0.042);
    ctx.strokeStyle =
      styleId === 'catwoman_lace' ? secondaryColor + 'CC' : 'rgba(255, 255, 255, 0.24)';
    ctx.stroke();
    ctx.restore();

    // E. Iconic Catwoman Cross-Stitching (Selina Kyle Couture Seams)
    if (showStitches && styleId === 'catwoman_petite') {
      const stitchColor = secondaryColor;
      const stitchSz = Math.max(2.2, hh * 0.055);

      // Center nose-bridge to brow vertical seam stitches
      drawCrossStitchesAlongCurve(
        ctx,
        0,
        -hh * 0.22,
        0,
        hh * 0.1,
        0,
        hh * 0.4,
        4,
        stitchSz * 0.85,
        stitchColor
      );

      // Left brow to ear tip seam stitches
      drawCrossStitchesAlongCurve(
        ctx,
        -hw * 0.15,
        -hh * 0.32,
        -hw * 0.45,
        -hh * 0.62,
        -hw * 0.65,
        earTipY * 0.92,
        6,
        stitchSz,
        stitchColor
      );

      // Right cheekbone seam stitches
      drawCrossStitchesAlongCurve(
        ctx,
        hw * 0.24,
        hh * 0.48,
        hw * 0.65,
        hh * 0.52,
        hw * 0.98,
        -hh * 0.28,
        6,
        stitchSz,
        stitchColor
      );
    }

    // F. Temple Diamond Rivets for Feline Noir
    if (styleId === 'feline_noir') {
      ctx.fillStyle = '#FFFFFF';
      [-1, 1].forEach((dir) => {
        ctx.beginPath();
        ctx.arc(dir * hw * 0.92, -hh * 0.58, Math.max(2, hh * 0.05), 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(dir * hw * 0.82, -hh * 0.46, Math.max(1.5, hh * 0.038), 0, Math.PI * 2);
        ctx.fill();
      });
    }
  } else if (styleId === 'harlequin_royal') {
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, -hh * 1.2, hw * 1.3, hh * 2.4);
    ctx.clip();

    traceOuterMaskPath(ctx, styleId, hw, hh, earHeight);
    traceEyeHolesSubpaths(ctx, styleId, eyeOffsetX, eyeRadiusX, eyeRadiusY, eyeSlant);
    ctx.fillStyle = secondaryColor;
    ctx.fill('evenodd');
    ctx.restore();
  } else if (styleId === 'venetian_gold') {
    ctx.lineWidth = Math.max(2, hh * 0.065);
    ctx.strokeStyle = secondaryColor;
    traceOuterMaskPath(ctx, styleId, hw, hh, earHeight);
    ctx.stroke();

    ctx.lineWidth = Math.max(1, hh * 0.03);
    ctx.beginPath();
    traceEyeHolesSubpaths(ctx, styleId, eyeOffsetX, eyeRadiusX * 1.12, eyeRadiusY * 1.15, eyeSlant);
    ctx.stroke();

    ctx.fillStyle = secondaryColor;
    ctx.beginPath();
    ctx.moveTo(0, -hh * 0.58);
    ctx.lineTo(hw * 0.06, -hh * 0.34);
    ctx.lineTo(0, -hh * 0.1);
    ctx.lineTo(-hw * 0.06, -hh * 0.34);
    ctx.closePath();
    ctx.fill();
  } else if (styleId === 'stealth_angular') {
    ctx.lineWidth = Math.max(1.5, hh * 0.045);
    ctx.strokeStyle = secondaryColor;
    traceOuterMaskPath(ctx, styleId, hw, hh, earHeight);
    ctx.stroke();

    ctx.beginPath();
    traceEyeHolesSubpaths(ctx, styleId, eyeOffsetX, eyeRadiusX, eyeRadiusY, eyeSlant);
    ctx.stroke();
  } else if (styleId === 'cyber_visor') {
    ctx.save();
    traceOuterMaskPath(ctx, styleId, hw, hh, earHeight);
    ctx.clip();

    const laserGrad = ctx.createLinearGradient(-hw, 0, hw, 0);
    laserGrad.addColorStop(0, 'transparent');
    laserGrad.addColorStop(0.15, secondaryColor);
    laserGrad.addColorStop(0.5, '#FFFFFF');
    laserGrad.addColorStop(0.85, secondaryColor);
    laserGrad.addColorStop(1, 'transparent');

    ctx.fillStyle = laserGrad;
    ctx.fillRect(-hw * 0.92, -hh * 0.12, hw * 1.84, hh * 0.22);
    ctx.restore();

    traceOuterMaskPath(ctx, styleId, hw, hh, earHeight);
    ctx.lineWidth = Math.max(2, hh * 0.055);
    ctx.strokeStyle = secondaryColor;
    ctx.stroke();
  } else if (styleId === 'editorial_censor') {
    ctx.fillStyle = secondaryColor;
    ctx.fillRect(-hw, -hh * 0.68, hw * 2, Math.max(2, hh * 0.08));

    if (config.censorText.trim().length > 0) {
      ctx.fillStyle = '#FFFFFF';
      const fontSize = Math.max(9, Math.min(26, hh * 0.48));
      ctx.font = `600 ${fontSize}px "JetBrains Mono", monospace`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(config.censorText.toUpperCase(), 0, hh * 0.04, hw * 1.82);
    }
  } else if (styleId === 'domino_classic') {
    ctx.lineWidth = Math.max(1.5, hh * 0.04);
    ctx.strokeStyle = secondaryColor;
    traceOuterMaskPath(ctx, styleId, hw, hh, earHeight);
    ctx.stroke();

    ctx.lineWidth = Math.max(1.2, hh * 0.03);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.beginPath();
    traceEyeHolesSubpaths(ctx, styleId, eyeOffsetX, eyeRadiusX * 1.04, eyeRadiusY * 1.04, eyeSlant);
    ctx.stroke();
  }

  // Optional tracking guide overlay
  if (config.showTrackingGuides) {
    ctx.strokeStyle = '#10B981';
    ctx.lineWidth = 1.25;
    ctx.setLineDash([4, 4]);
    ctx.strokeRect(-hw, -hh, hw * 2, hh * 2);
    ctx.setLineDash([]);

    [-eyeOffsetX, eyeOffsetX].forEach((ex) => {
      ctx.beginPath();
      ctx.arc(ex, 0, 4, 0, Math.PI * 2);
      ctx.fillStyle = '#10B981';
      ctx.fill();
    });
  }

  ctx.restore();
}
