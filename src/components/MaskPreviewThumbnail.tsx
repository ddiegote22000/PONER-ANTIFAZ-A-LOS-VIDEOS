import React, { useEffect, useRef } from 'react';
import { MaskConfig, MaskPreset } from '../types/mask';
import { drawFaceMask } from '../utils/maskRenderer';

interface MaskPreviewThumbnailProps {
  preset: MaskPreset;
  isSelected: boolean;
  activePrimaryColor?: string;
  activeSecondaryColor?: string;
}

export const MaskPreviewThumbnail: React.FC<MaskPreviewThumbnailProps> = ({
  preset,
  isSelected,
  activePrimaryColor,
  activeSecondaryColor,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);

    // Subtle dark studio vignette backdrop
    const bg = ctx.createRadialGradient(width / 2, height / 2, 6, width / 2, height / 2, width * 0.65);
    bg.addColorStop(0, isSelected ? '#1E293B' : '#131A29');
    bg.addColorStop(1, '#090A0F');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, width, height);

    // Subtle stylized mannequin face silhouette behind the antifaz
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.08)';
    ctx.lineWidth = 1.25;
    ctx.beginPath();
    ctx.ellipse(width / 2, height / 2 + 4, width * 0.31, height * 0.44, 0, 0, Math.PI * 2);
    ctx.stroke();

    // Faint anatomical eyes behind the mask so eye cutouts are clearly visible
    [-width * 0.12, width * 0.12].forEach((offsetX) => {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.beginPath();
      ctx.ellipse(width / 2 + offsetX, height / 2, 8, 4.2, 0, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = 'rgba(225, 29, 72, 0.45)';
      ctx.beginPath();
      ctx.arc(width / 2 + offsetX, height / 2, 3.2, 0, Math.PI * 2);
      ctx.fill();
    });

    const previewConfig: MaskConfig = {
      styleId: preset.id,
      primaryColor: isSelected && activePrimaryColor ? activePrimaryColor : preset.defaultPrimaryColor,
      secondaryColor:
        isSelected && activeSecondaryColor ? activeSecondaryColor : preset.defaultSecondaryColor,
      scaleWidth: preset.defaultScaleWidth,
      scaleHeight: preset.defaultScaleHeight,
      offsetY: 0,
      opacity: 0.98,
      shadowIntensity: 0.6,
      coverEyes: preset.defaultCoverEyes,
      eyeTintOpacity: 0.85,
      smoothing: 0.5,
      censorText: 'CONFIDENCIAL',
      pixelBlockSize: 8,
      showTrackingGuides: false,
      customImageUrl: null,
      earHeight: 1.05,
      eyeSlant: 0.24,
      glossIntensity: 0.88,
      showStitches: true,
    };

    drawFaceMask(
      ctx,
      {
        id: 0,
        label: 'Preview',
        centerX: 0.5,
        centerY: 0.56,
        leftEyeX: 0.38,
        leftEyeY: 0.56,
        rightEyeX: 0.62,
        rightEyeY: 0.56,
        eyeDistance: 0.24,
        faceWidth: 0.54,
        angle: -0.02,
        yaw: 0,
        confidence: 1,
        source: 'demo_actor',
      },
      width,
      height,
      previewConfig,
      undefined,
      canvas
    );
  }, [preset, isSelected, activePrimaryColor, activeSecondaryColor]);

  return (
    <canvas
      ref={canvasRef}
      width={180}
      height={96}
      className="w-full h-20 rounded-lg border border-slate-800/80 block"
    />
  );
};
