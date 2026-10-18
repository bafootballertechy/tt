import { MaskSettings, MaskLayerCache, Rect } from '../../../types';

export const DEFAULT_MASK_SETTINGS: MaskSettings = {
  enabled: true,
  sensitivity: 65,
  showOverlay: false,
  keyColor: '#4b8b3b',
  keyColors: ['#4b8b3b'],
  smoothness: 30,
};

export const INITIAL_MASK_CACHE: MaskLayerCache = {
  foreground: null,
  overlay: null,
  timestamp: -1,
  processedAt: 0,
};

export interface MaskBitmapsResult {
  foreground: ImageBitmap | null;
  overlay: ImageBitmap | null;
  timestamp: number;
  processedAt: number;
}

/**
 * Parses hex color to RGB numbers.
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    return {
      r: parseInt(cleanHex[0] + cleanHex[0], 16) || 0,
      g: parseInt(cleanHex[1] + cleanHex[1], 16) || 0,
      b: parseInt(cleanHex[2] + cleanHex[2], 16) || 0,
    };
  }
  if (cleanHex.length === 6) {
    return {
      r: parseInt(cleanHex.slice(0, 2), 16) || 0,
      g: parseInt(cleanHex.slice(2, 4), 16) || 0,
      b: parseInt(cleanHex.slice(4, 6), 16) || 0,
    };
  }
  return null;
}

/**
 * Converts RGB to HSV (Hue in 0-360, Saturation in 0-1, Value in 0-1).
 */
function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const rf = r / 255;
  const gf = g / 255;
  const bf = b / 255;
  const max = Math.max(rf, gf, bf);
  const min = Math.min(rf, gf, bf);
  const d = max - min;

  let h = 0;
  const s = max === 0 ? 0 : d / max;
  const v = max;

  if (d !== 0) {
    switch (max) {
      case rf:
        h = (gf - bf) / d + (gf < bf ? 6 : 0);
        break;
      case gf:
        h = (bf - rf) / d + 2;
        break;
      case bf:
        h = (rf - gf) / d + 4;
        break;
    }
    h *= 60;
  }

  return { h, s, v };
}

/**
 * Computes Chroma Key / Green Screen foreground and overlay bitmaps from a video frame.
 * Uses HSV color-space and Green-Chromaticity gating to ensure players (boots, dark kits,
 * referee jerseys, socks, skin tones) are never accidentally removed as pitch shadows.
 */
export async function computeMaskingBitmaps(
  video: HTMLVideoElement,
  settings: MaskSettings,
  canvasCache?: { current: HTMLCanvasElement | OffscreenCanvas | null }
): Promise<MaskBitmapsResult | null> {
  if (!video || !settings.enabled || video.seeking) return null;

  const width = video.videoWidth;
  const height = video.videoHeight;
  if (width === 0 || height === 0) return null;

  let canvas = canvasCache?.current;
  if (!canvas) {
    if (typeof OffscreenCanvas !== 'undefined') {
      canvas = new OffscreenCanvas(width, height);
    } else {
      canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
    }
    if (canvasCache) {
      canvasCache.current = canvas;
    }
  } else {
    canvas.width = width;
    canvas.height = height;
  }

  const offCtx = canvas.getContext('2d', { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!offCtx) return null;

  offCtx.drawImage(video, 0, 0, width, height);

  const frameData = offCtx.getImageData(0, 0, width, height);
  const data = frameData.data;
  const foregroundImageData = offCtx.createImageData(width, height);
  const fgData = foregroundImageData.data;
  const overlayImageData = offCtx.createImageData(width, height);
  const ovData = overlayImageData.data;

  // Gather list of sampled pitch colors
  const rawColors = settings.keyColors && settings.keyColors.length > 0
    ? settings.keyColors
    : [settings.keyColor || '#4b8b3b'];

  interface TargetColorInfo {
    r: number;
    g: number;
    b: number;
    h: number;
    s: number;
    v: number;
  }

  const targets: TargetColorInfo[] = [];
  for (const c of rawColors) {
    const rgb = hexToRgb(c);
    if (rgb) {
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      targets.push({ ...rgb, ...hsv });
    }
  }

  if (targets.length === 0) {
    const defaultRgb = { r: 75, g: 139, b: 59 };
    targets.push({ ...defaultRgb, ...rgbToHsv(defaultRgb.r, defaultRgb.g, defaultRgb.b) });
  }

  // Sensitivity configuration: maps slider 1-100 to hue and chromaticity thresholds
  const sensitivity = Math.max(1, Math.min(100, settings.sensitivity || 65));
  // Hue tolerance around sampled pitch colors: [14 deg to 50 deg]
  const hueTolerance = 14 + (sensitivity / 100) * 36;
  // Maximum RGB weighted distance allowed: [45 to 190]
  const rgbDistanceThreshold = 45 + (sensitivity / 100) * 145;
  const numTargets = targets.length;

  let greenCount = 0;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // --- PLAYER PROTECTION RULE 1: Green Dominance / Chromaticity ---
    // Genuine grass (sunny or shadowed) has more green component than blue,
    // and green is at least comparable to or higher than red.
    // Dark boots, black kits, skin tones, referee uniforms, and balls will fail this gate.
    const isChromaticGreen = g >= b + 4 && g >= r * 0.92;

    let isMasked = false;

    if (isChromaticGreen) {
      // Calculate HSV only when green chromaticity passes
      const pixelHsv = rgbToHsv(r, g, b);

      // Pitch grass hues typically lie between 55° (yellow-green) and 175° (blue-green)
      const isPitchHueRange = pixelHsv.h >= 55 && pixelHsv.h <= 175;

      // Grass retains minimum green saturation even in shade (excluding pure gray/black/white)
      const hasGrassSaturation = pixelHsv.s >= 0.12 && pixelHsv.v >= 0.08;

      if (isPitchHueRange && hasGrassSaturation) {
        for (let t = 0; t < numTargets; t++) {
          const target = targets[t];

          // Circular hue difference
          let hueDiff = Math.abs(pixelHsv.h - target.h);
          if (hueDiff > 180) hueDiff = 360 - hueDiff;

          // Hue match check
          if (hueDiff <= hueTolerance) {
            // Weighted perceptual RGB difference
            const rDiff = r - target.r;
            const gDiff = g - target.g;
            const bDiff = b - target.b;
            const dist = Math.abs(rDiff) * 0.8 + Math.abs(gDiff) * 1.0 + Math.abs(bDiff) * 0.8;

            if (dist < rgbDistanceThreshold) {
              isMasked = true;
              break;
            }
          }
        }
      }
    }

    if (isMasked) {
      greenCount++;
      fgData[i + 3] = 0; // transparent foreground (allows telestration behind player)
      ovData[i] = 239;
      ovData[i + 1] = 68;
      ovData[i + 2] = 68;
      ovData[i + 3] = 102;
    } else {
      fgData[i] = r;
      fgData[i + 1] = g;
      fgData[i + 2] = b;
      fgData[i + 3] = 255;
      ovData[i + 3] = 0;
    }
  }

  const isValidGreenScreen = greenCount / (width * height) > 0.001;
  const fgBitmap = isValidGreenScreen ? await createImageBitmap(foregroundImageData) : null;
  const ovBitmap = isValidGreenScreen ? await createImageBitmap(overlayImageData) : null;

  return {
    foreground: fgBitmap,
    overlay: ovBitmap,
    timestamp: video.currentTime,
    processedAt: Date.now(),
  };
}

/**
 * Samples pixel color at specified video coordinates and returns hex string.
 */
export function sampleKeyColorFromVideo(
  video: HTMLVideoElement,
  point: { x: number; y: number }
): string | null {
  try {
    const offCanvas = document.createElement('canvas');
    offCanvas.width = 1;
    offCanvas.height = 1;
    const offCtx = offCanvas.getContext('2d', { willReadFrequently: true });
    if (!offCtx) return null;

    offCtx.drawImage(
      video,
      Math.max(0, Math.floor(point.x)),
      Math.max(0, Math.floor(point.y)),
      1,
      1,
      0,
      0,
      1,
      1
    );
    const pixel = offCtx.getImageData(0, 0, 1, 1).data;
    const hex =
      '#' +
      [pixel[0], pixel[1], pixel[2]]
        .map((x) => x.toString(16).padStart(2, '0'))
        .join('');
    return hex;
  } catch (err) {
    console.error('Error sampling color from video:', err);
    return null;
  }
}

/**
 * Checks whether the current mask timestamp matches current video playback time within tolerance.
 */
export function isMaskSynchronized(
  maskTimestamp: number,
  currentVideoTime: number,
  tolerance = 0.15
): boolean {
  return maskTimestamp !== -1 && Math.abs(maskTimestamp - currentVideoTime) < tolerance;
}

/**
 * Computes telestration shape opacity and rendering permission based on masking state.
 */
export function getMaskTelestrationAlpha(
  isPlaying: boolean,
  settings: MaskSettings,
  cache: MaskLayerCache,
  currentVideoTime: number,
  fadeDuration = 800
): { ffAlpha: number; shouldRenderDrawings: boolean } {
  const synced = isMaskSynchronized(cache.timestamp, currentVideoTime);
  let ffAlpha = 1;
  let shouldRenderDrawings = true;

  if (!isPlaying && settings.enabled && cache.processedAt > 0 && synced) {
    const age = Date.now() - cache.processedAt;
    if (age < fadeDuration) {
      ffAlpha = Math.min(1, age / fadeDuration);
    } else {
      ffAlpha = 1;
    }
  } else if (!isPlaying && settings.enabled && (!synced || cache.processedAt === 0)) {
    ffAlpha = 0; // Don't show shapes until mask is ready
    shouldRenderDrawings = false;
  }

  return { ffAlpha, shouldRenderDrawings };
}

/**
 * Draws mask overlay bitmap over canvas.
 */
export function renderMaskOverlay(
  ctx: CanvasRenderingContext2D,
  overlay: ImageBitmap | null,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  if (overlay) {
    ctx.drawImage(overlay, x, y, w, h);
  }
}

/**
 * Draws mask foreground bitmap over canvas to occlude telestrations behind players.
 */
export function renderMaskForeground(
  ctx: CanvasRenderingContext2D,
  foreground: ImageBitmap | null,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  if (foreground) {
    ctx.drawImage(foreground, x, y, w, h);
  }
}

/**
 * Draws sprite region with mask foreground if enabled, or raw video if disabled.
 */
export function renderMaskedSprite(
  ctx: CanvasRenderingContext2D,
  video: HTMLVideoElement,
  foreground: ImageBitmap | null,
  rect: Rect,
  maskEnabled: boolean
): void {
  const w = Math.ceil(rect.w);
  const h = Math.ceil(rect.h);
  if (maskEnabled && foreground) {
    ctx.drawImage(foreground, rect.x, rect.y, w, h, 0, 0, w, h);
  } else {
    ctx.drawImage(video, rect.x, rect.y, w, h, 0, 0, w, h);
  }
}

/**
 * Computes Chroma Key / Green Screen foreground bitmap from any CanvasImageSource
 * (OffscreenCanvas, HTMLCanvasElement, or ImageBitmap) for video export freeze frames.
 *
 * Runs once per freeze frame (~20-40ms total) and caches the resulting ImageBitmap
 * for GPU-accelerated drawing across all frames of the freeze frame (zero FPS drop).
 */
export async function computeFrameChromaKeyForeground(
  source: CanvasImageSource,
  width: number,
  height: number,
  settings?: MaskSettings
): Promise<ImageBitmap | CanvasImageSource | null> {
  const activeSettings = settings || DEFAULT_MASK_SETTINGS;
  if (!activeSettings.enabled || width <= 0 || height <= 0) {
    return null;
  }

  let canvas: OffscreenCanvas | HTMLCanvasElement;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(width, height);
  } else if (typeof document !== 'undefined') {
    canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
  } else {
    return null;
  }

  const offCtx = canvas.getContext('2d', { willReadFrequently: true }) as
    | CanvasRenderingContext2D
    | OffscreenCanvasRenderingContext2D
    | null;
  if (!offCtx) return null;

  try {
    offCtx.drawImage(source, 0, 0, width, height);
  } catch {
    return null;
  }

  const frameData = offCtx.getImageData(0, 0, width, height);
  const data = frameData.data;
  const foregroundImageData = offCtx.createImageData(width, height);
  const fgData = foregroundImageData.data;

  // Gather list of sampled pitch colors
  const rawColors =
    activeSettings.keyColors && activeSettings.keyColors.length > 0
      ? activeSettings.keyColors
      : [activeSettings.keyColor || '#4b8b3b'];

  interface TargetColorInfo {
    r: number;
    g: number;
    b: number;
    h: number;
    s: number;
    v: number;
  }

  const targets: TargetColorInfo[] = [];
  for (const c of rawColors) {
    const rgb = hexToRgb(c);
    if (rgb) {
      const hsv = rgbToHsv(rgb.r, rgb.g, rgb.b);
      targets.push({ ...rgb, ...hsv });
    }
  }

  if (targets.length === 0) {
    const defaultRgb = { r: 75, g: 139, b: 59 };
    targets.push({ ...defaultRgb, ...rgbToHsv(defaultRgb.r, defaultRgb.g, defaultRgb.b) });
  }

  const sensitivity = Math.max(1, Math.min(100, activeSettings.sensitivity || 65));
  const hueTolerance = 14 + (sensitivity / 100) * 36;
  const rgbDistanceThreshold = 45 + (sensitivity / 100) * 145;
  const numTargets = targets.length;

  let greenCount = 0;
  const len = data.length;

  for (let i = 0; i < len; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // Green Dominance gating
    const isChromaticGreen = g >= b + 4 && g >= r * 0.92;
    let isMasked = false;

    if (isChromaticGreen) {
      const pixelHsv = rgbToHsv(r, g, b);
      const isPitchHueRange = pixelHsv.h >= 55 && pixelHsv.h <= 175;
      const hasGrassSaturation = pixelHsv.s >= 0.12 && pixelHsv.v >= 0.08;

      if (isPitchHueRange && hasGrassSaturation) {
        for (let t = 0; t < numTargets; t++) {
          const target = targets[t];
          let hueDiff = Math.abs(pixelHsv.h - target.h);
          if (hueDiff > 180) hueDiff = 360 - hueDiff;

          if (hueDiff <= hueTolerance) {
            const rDiff = r - target.r;
            const gDiff = g - target.g;
            const bDiff = b - target.b;
            const dist = Math.abs(rDiff) * 0.8 + Math.abs(gDiff) * 1.0 + Math.abs(bDiff) * 0.8;

            if (dist < rgbDistanceThreshold) {
              isMasked = true;
              break;
            }
          }
        }
      }
    }

    if (isMasked) {
      greenCount++;
      fgData[i + 3] = 0; // Transparent pitch (reveals ground telestrations)
    } else {
      fgData[i] = r;
      fgData[i + 1] = g;
      fgData[i + 2] = b;
      fgData[i + 3] = 255; // Opaque player / referee / ball / pitch line markings
    }
  }

  const isValidGreenScreen = greenCount / (width * height) > 0.001;
  if (!isValidGreenScreen) return null;

  if (typeof createImageBitmap !== 'undefined') {
    try {
      return await createImageBitmap(foregroundImageData);
    } catch {
      // Fallback below
    }
  }

  // Fallback to OffscreenCanvas
  offCtx.putImageData(foregroundImageData, 0, 0);
  return canvas;
}

