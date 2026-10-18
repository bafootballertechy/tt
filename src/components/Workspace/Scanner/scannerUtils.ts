import type { Point, Shape } from '../../../types';
import { fadeColor } from '../../../utils/colors';
import { ScannerConfig, ScannerSettings, SCANNER_TEAMS } from './types';

/**
 * Extracts RGB values from color string or team index
 */
export const getScannerRgb = (
  color?: string,
  teamIndex?: number
): [number, number, number] => {
  if (color && typeof color === 'string') {
    // Check if matches known team hexes
    const matchedTeam = SCANNER_TEAMS.find(
      (t) => t.main.toLowerCase() === color.toLowerCase()
    );
    if (matchedTeam) return matchedTeam.rgb;

    // Hex color #rrggbb or #rgb
    if (color.startsWith('#')) {
      const hex = color.replace('#', '');
      if (hex.length === 3) {
        return [
          parseInt(hex[0] + hex[0], 16),
          parseInt(hex[1] + hex[1], 16),
          parseInt(hex[2] + hex[2], 16),
        ];
      }
      if (hex.length >= 6) {
        return [
          parseInt(hex.slice(0, 2), 16),
          parseInt(hex.slice(2, 4), 16),
          parseInt(hex.slice(4, 6), 16),
        ];
      }
    }

    // rgb(...) or rgba(...)
    const rgbMatch = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (rgbMatch) {
      return [
        parseInt(rgbMatch[1], 10),
        parseInt(rgbMatch[2], 10),
        parseInt(rgbMatch[3], 10),
      ];
    }
  }

  if (typeof teamIndex === 'number' && SCANNER_TEAMS[teamIndex]) {
    return SCANNER_TEAMS[teamIndex].rgb;
  }

  return [198, 255, 31];
};

/**
 * Creates a new Shape configured as a Field Scanner
 */
export const createScannerShape = (
  startPt: Point,
  endPt: Point,
  color: string,
  strokeWidth: number,
  settings: ScannerSettings,
  activeFFId?: string
): Shape => {
  const dx = endPt.x - startPt.x;
  const dy = endPt.y - startPt.y;
  const dragDist = Math.hypot(dx, dy);

  const length = dragDist > 15 ? Math.round(dragDist) : settings.length;
  const baseAngle = dragDist > 15 ? Math.atan2(dy, dx) : 0;

  const tipPt: Point = {
    x: startPt.x + Math.cos(baseAngle) * length,
    y: startPt.y + Math.sin(baseAngle) * length,
  };

  const scannerConfig: ScannerConfig = {
    length,
    baseAngle,
    sweepRange: settings.sweepRange,
    sweepSpeed: settings.sweepSpeed,
    fov: settings.fov,
    sweepPhase: Math.random() * Math.PI * 2,
    jitterSeed: Math.random() * 1000,
    showSweepBounds: false,
    showCenterAxis: false,
    showOriginEye: settings.showOriginEye,
    isPaused: settings.isPaused,
  };

  return {
    id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
    type: 'scanner',
    points: [startPt, tipPt],
    color,
    strokeWidth: strokeWidth || 2,
    timestamp: Date.now(),
    freezeFrameId: activeFFId,
    scannerConfig,
  };
};

/**
 * Calculates handle positions for a scanner shape
 */
export const getScannerHandles = (
  shape: Shape
): {
  vertex: Point;
  tip: Point;
  leftHandle: Point;
  rightHandle: Point;
  baseAngle: number;
  sweepRange: number;
  length: number;
} => {
  const vertex = shape.points[0] || { x: 0, y: 0 };
  const config = shape.scannerConfig || {
    length: 150,
    baseAngle: 0,
    sweepRange: 50,
    sweepSpeed: 1.2,
    fov: 35,
  };

  const length = config.length || 150;
  const baseAngle = config.baseAngle ?? 0;
  const sweepRange = config.sweepRange ?? 50;
  const sweepHalf = ((sweepRange * Math.PI) / 180) / 2;

  const tip: Point = {
    x: vertex.x + Math.cos(baseAngle) * length,
    y: vertex.y + Math.sin(baseAngle) * length,
  };

  const leftHandle: Point = {
    x: vertex.x + Math.cos(baseAngle - sweepHalf) * length,
    y: vertex.y + Math.sin(baseAngle - sweepHalf) * length,
  };

  const rightHandle: Point = {
    x: vertex.x + Math.cos(baseAngle + sweepHalf) * length,
    y: vertex.y + Math.sin(baseAngle + sweepHalf) * length,
  };

  return {
    vertex,
    tip,
    leftHandle,
    rightHandle,
    baseAngle,
    sweepRange,
    length,
  };
};

/**
 * Hit test for scanner handles & body
 */
export const hitTestScanner = (
  pt: Point,
  shape: Shape,
  scale: number
): {
  type: 'vertex' | 'tip' | 'leftHandle' | 'rightHandle' | 'body' | null;
  distance: number;
} => {
  if (shape.type !== 'scanner' || !shape.points || shape.points.length < 1) {
    return { type: null, distance: Infinity };
  }

  const { vertex, tip, leftHandle, rightHandle, baseAngle, sweepRange, length } =
    getScannerHandles(shape);

  const handleThreshold = 18 / scale;

  // Check vertex
  const distVertex = Math.hypot(pt.x - vertex.x, pt.y - vertex.y);
  if (distVertex <= handleThreshold) {
    return { type: 'vertex', distance: distVertex };
  }

  // Check tip
  const distTip = Math.hypot(pt.x - tip.x, pt.y - tip.y);
  if (distTip <= handleThreshold) {
    return { type: 'tip', distance: distTip };
  }

  // Check left handle
  const distLeft = Math.hypot(pt.x - leftHandle.x, pt.y - leftHandle.y);
  if (distLeft <= handleThreshold) {
    return { type: 'leftHandle', distance: distLeft };
  }

  // Check right handle
  const distRight = Math.hypot(pt.x - rightHandle.x, pt.y - rightHandle.y);
  if (distRight <= handleThreshold) {
    return { type: 'rightHandle', distance: distRight };
  }

  // Check cone sector body
  const dx = pt.x - vertex.x;
  const dy = pt.y - vertex.y;
  const dist = Math.hypot(dx, dy);

  if (dist <= length + 10 / scale && dist >= 8 / scale) {
    const angle = Math.atan2(dy, dx);
    let diff = angle - baseAngle;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    const fov = ((shape.scannerConfig?.fov || 35) * Math.PI) / 180;
    const sweepHalf = (((sweepRange || 50) * Math.PI) / 180) / 2;
    const sectorTolerance = sweepHalf + fov / 2;

    if (Math.abs(diff) <= sectorTolerance) {
      return { type: 'body', distance: dist };
    }
  }

  return { type: null, distance: Infinity };
};

/**
 * Renders the Field Scanner on Canvas
 */
export const drawScanner = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | any,
  shape: Shape,
  scale: number,
  renderMode: string = 'full',
  ffAlpha: number = 1,
  unifiedProgress?: number,
  isSelected: boolean = false
): void => {
  if (shape.points.length < 1) return;

  const vertex = shape.points[0];
  const config = shape.scannerConfig || {
    length: 150,
    baseAngle: 0,
    sweepRange: 50,
    sweepSpeed: 1.2,
    fov: 35,
    sweepPhase: 0,
    jitterSeed: 123,
    showSweepBounds: false,
    showCenterAxis: false,
    showOriginEye: true,
    isPaused: false,
  };

  const length = config.length || 150;
  const baseAngle = config.baseAngle ?? 0;
  const sweepRange = config.sweepRange ?? 50;
  const fovVal = config.fov ?? 35;
  const sweepSpeed = config.sweepSpeed ?? 1.2;
  const [r, g, b] = getScannerRgb(shape.color, config.team);

  const sweepHalf = ((sweepRange * Math.PI) / 180) / 2;
  const fovRad = (fovVal * Math.PI) / 180;
  const halfFov = fovRad / 2;

  // Time calculation
  const timeSec = Date.now() / 1000;
  const currentPhase = config.isPaused
    ? config.sweepPhase ?? 0
    : timeSec * 1.5 * sweepSpeed + (config.sweepPhase ?? 0);

  // Eased back-and-forth sweep angle
  const easedPhase = -(Math.cos(currentPhase) - 1) / 2;
  const currentAngle = baseAngle + (easedPhase * 2 - 1) * sweepHalf;

  // Subtle organic eye micro-jitter
  const jitter = Math.sin(timeSec * 3 + (config.jitterSeed ?? 0)) * 0.008;
  const finalAngle = currentAngle + jitter;

  ctx.save();

  // Unified animation entry progress (fade/scale in if animated)
  if (unifiedProgress !== undefined && unifiedProgress < 1) {
    ctx.globalAlpha = Math.max(0, Math.min(1, unifiedProgress)) * ffAlpha;
  } else {
    ctx.globalAlpha = ffAlpha;
  }

  // Active Vision Cone with radial gradient fade at both ends (boundary guides and center aim axis avoided per user preference)
  const grad = ctx.createRadialGradient(
    vertex.x,
    vertex.y,
    0,
    vertex.x,
    vertex.y,
    length
  );
  grad.addColorStop(0.0, `rgba(${r},${g},${b},0.00)`);
  grad.addColorStop(0.1, `rgba(${r},${g},${b},${0.18 * ffAlpha})`);
  grad.addColorStop(0.28, `rgba(${r},${g},${b},${0.32 * ffAlpha})`);
  grad.addColorStop(0.55, `rgba(${r},${g},${b},${0.25 * ffAlpha})`);
  grad.addColorStop(0.78, `rgba(${r},${g},${b},${0.15 * ffAlpha})`);
  grad.addColorStop(0.92, `rgba(${r},${g},${b},${0.05 * ffAlpha})`);
  grad.addColorStop(1.0, `rgba(${r},${g},${b},0.00)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(vertex.x, vertex.y);
  ctx.arc(
    vertex.x,
    vertex.y,
    length,
    finalAngle - halfFov,
    finalAngle + halfFov
  );
  ctx.closePath();
  ctx.fill();

  // 4. Cone lateral ray edges with linear gradient fade at ends
  const edgeGrad = ctx.createLinearGradient(
    vertex.x,
    vertex.y,
    vertex.x + Math.cos(finalAngle) * length,
    vertex.y + Math.sin(finalAngle) * length
  );
  edgeGrad.addColorStop(0.0, `rgba(${r},${g},${b},0.00)`);
  edgeGrad.addColorStop(0.15, `rgba(${r},${g},${b},${0.55 * ffAlpha})`);
  edgeGrad.addColorStop(0.85, `rgba(${r},${g},${b},${0.55 * ffAlpha})`);
  edgeGrad.addColorStop(1.0, `rgba(${r},${g},${b},0.00)`);

  ctx.strokeStyle = edgeGrad;
  ctx.lineWidth = 1.6 / scale;

  ctx.beginPath();
  ctx.moveTo(vertex.x, vertex.y);
  ctx.lineTo(
    vertex.x + Math.cos(finalAngle - halfFov) * length,
    vertex.y + Math.sin(finalAngle - halfFov) * length
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(vertex.x, vertex.y);
  ctx.lineTo(
    vertex.x + Math.cos(finalAngle + halfFov) * length,
    vertex.y + Math.sin(finalAngle + halfFov) * length
  );
  ctx.stroke();

  // 5. Arc perimeter glow along current vision beam
  ctx.strokeStyle = `rgba(${r},${g},${b},${0.4 * ffAlpha})`;
  ctx.lineWidth = 1.2 / scale;
  ctx.beginPath();
  ctx.arc(
    vertex.x,
    vertex.y,
    length * 0.98,
    finalAngle - halfFov,
    finalAngle + halfFov
  );
  ctx.stroke();

  // 6. Player Head / Eye origin turning indicator (very very small subtle pivot)
  if (config.showOriginEye !== false) {
    const eyeRadius = 3.2 / scale;
    const irisRadius = 2.0 / scale;
    const pupilRadius = 1.0 / scale;

    // Head base circle with subtle drop shadow
    ctx.save();
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 3 / scale;
    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, eyeRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#0a0e17';
    ctx.fill();
    ctx.restore();

    // Outer colored ring
    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, eyeRadius, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(${r},${g},${b},0.95)`;
    ctx.lineWidth = 1 / scale;
    ctx.stroke();

    // Inner eye cornea / sclera
    ctx.beginPath();
    ctx.arc(vertex.x, vertex.y, irisRadius, 0, Math.PI * 2);
    ctx.fillStyle = '#f0f4f8';
    ctx.fill();

    // Directional Pupil turning with finalAngle
    const pupilOffset = 0.8 / scale;
    const px = vertex.x + Math.cos(finalAngle) * pupilOffset;
    const py = vertex.y + Math.sin(finalAngle) * pupilOffset;

    ctx.beginPath();
    ctx.arc(px, py, pupilRadius, 0, Math.PI * 2);
    ctx.fillStyle = `rgb(${Math.max(0, r - 30)},${Math.max(0, g - 30)},${Math.max(0, b - 30)})`;
    ctx.fill();

    // Pupil glint
    ctx.beginPath();
    ctx.arc(
      px - 0.3 / scale,
      py - 0.3 / scale,
      0.4 / scale,
      0,
      Math.PI * 2
    );
    ctx.fillStyle = '#ffffff';
    ctx.fill();
  }

  // 7. Interactive handles (when selected or hovered)
  if (isSelected) {
    drawScannerHandles(ctx, shape, scale, r, g, b, baseAngle, sweepHalf, length, vertex, sweepRange);
  }

  ctx.restore();
};

/**
 * Draws the interactive handles and angle badge when scanner is selected
 */
export const drawScannerHandles = (
  ctx: CanvasRenderingContext2D,
  shape: Shape,
  scale: number,
  r: number,
  g: number,
  b: number,
  baseAngle: number,
  sweepHalf: number,
  length: number,
  vertex: Point,
  sweepRange: number
): void => {
  const lx = vertex.x + Math.cos(baseAngle - sweepHalf) * length;
  const ly = vertex.y + Math.sin(baseAngle - sweepHalf) * length;

  const rx = vertex.x + Math.cos(baseAngle + sweepHalf) * length;
  const ry = vertex.y + Math.sin(baseAngle + sweepHalf) * length;

  const tx = vertex.x + Math.cos(baseAngle) * length;
  const ty = vertex.y + Math.sin(baseAngle) * length;

  const handleRadius = 6 / scale;
  const glowRadius = 18 / scale;

  // Left handle glow & dot
  const lg = ctx.createRadialGradient(lx, ly, 0, lx, ly, glowRadius);
  lg.addColorStop(0, 'rgba(255, 200, 100, 0.45)');
  lg.addColorStop(1, 'rgba(255, 200, 100, 0)');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.arc(lx, ly, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffc864';
  ctx.beginPath();
  ctx.arc(lx, ly, handleRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5 / scale;
  ctx.stroke();

  // Right handle glow & dot
  const rg = ctx.createRadialGradient(rx, ry, 0, rx, ry, glowRadius);
  rg.addColorStop(0, 'rgba(255, 200, 100, 0.45)');
  rg.addColorStop(1, 'rgba(255, 200, 100, 0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(rx, ry, glowRadius, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#ffc864';
  ctx.beginPath();
  ctx.arc(rx, ry, handleRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5 / scale;
  ctx.stroke();

  // Tip handle (Aim & Reach)
  ctx.fillStyle = '#38bdf8';
  ctx.beginPath();
  ctx.arc(tx, ty, handleRadius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 1.5 / scale;
  ctx.stroke();

  // Vertex handle (Origin)
  ctx.fillStyle = '#c6ff1f';
  ctx.beginPath();
  ctx.arc(vertex.x, vertex.y, handleRadius * 0.85, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 1.5 / scale;
  ctx.stroke();

  // Range angle badge (e.g., 50°)
  const labelDist = length + 22 / scale;
  const labelX = vertex.x + Math.cos(baseAngle) * labelDist;
  const labelY = vertex.y + Math.sin(baseAngle) * labelDist;

  const badgeText = `${Math.round(sweepRange)}°`;
  ctx.font = `bold ${Math.round(11 / scale)}px -apple-system, sans-serif`;
  const textWidth = ctx.measureText(badgeText).width;
  const padX = 6 / scale;
  const padY = 3.5 / scale;

  ctx.fillStyle = 'rgba(15, 20, 32, 0.88)';
  ctx.strokeStyle = 'rgba(255, 200, 100, 0.6)';
  ctx.lineWidth = 1 / scale;

  const boxW = textWidth + padX * 2;
  const boxH = 16 / scale;
  const boxX = labelX - boxW / 2;
  const boxY = labelY - boxH / 2;

  ctx.beginPath();
  ctx.roundRect(boxX, boxY, boxW, boxH, 4 / scale);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = '#ffc864';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(badgeText, labelX, labelY);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';
};

/**
 * Draws dynamic preview while dragging to create a new scanner
 */
export const drawScannerPreview = (
  ctx: CanvasRenderingContext2D,
  startPt: Point,
  currentPt: Point,
  color: string,
  scale: number,
  settings: ScannerSettings,
  now: number,
  ffAlpha: number = 1
): void => {
  const dx = currentPt.x - startPt.x;
  const dy = currentPt.y - startPt.y;
  const length = Math.max(30, Math.hypot(dx, dy));
  const angle = Math.atan2(dy, dx);
  const [r, g, b] = getScannerRgb(color, settings.team);

  const fov = (settings.fov * Math.PI) / 180;
  const halfFov = fov / 2;
  const sweepHalf = ((settings.sweepRange * Math.PI) / 180) / 2;

  ctx.save();
  ctx.globalAlpha = 0.85 * ffAlpha;

  // Radial gradient cone
  const grad = ctx.createRadialGradient(
    startPt.x,
    startPt.y,
    0,
    startPt.x,
    startPt.y,
    length
  );
  grad.addColorStop(0.0, `rgba(${r},${g},${b},0.00)`);
  grad.addColorStop(0.15, `rgba(${r},${g},${b},0.28)`);
  grad.addColorStop(0.85, `rgba(${r},${g},${b},0.15)`);
  grad.addColorStop(1.0, `rgba(${r},${g},${b},0.00)`);

  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.moveTo(startPt.x, startPt.y);
  ctx.arc(startPt.x, startPt.y, length, angle - halfFov, angle + halfFov);
  ctx.closePath();
  ctx.fill();

  // Dashed boundary preview
  ctx.strokeStyle = `rgba(${r},${g},${b},0.65)`;
  ctx.lineWidth = 1.5 / scale;
  ctx.setLineDash([4 / scale, 4 / scale]);

  ctx.beginPath();
  ctx.moveTo(startPt.x, startPt.y);
  ctx.lineTo(
    startPt.x + Math.cos(angle - halfFov) * length,
    startPt.y + Math.sin(angle - halfFov) * length
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(startPt.x, startPt.y);
  ctx.lineTo(
    startPt.x + Math.cos(angle + halfFov) * length,
    startPt.y + Math.sin(angle + halfFov) * length
  );
  ctx.stroke();

  // Sweep range limit lines (fainter)
  ctx.strokeStyle = `rgba(${r},${g},${b},0.3)`;
  ctx.beginPath();
  ctx.moveTo(startPt.x, startPt.y);
  ctx.lineTo(
    startPt.x + Math.cos(angle - sweepHalf) * length,
    startPt.y + Math.sin(angle - sweepHalf) * length
  );
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(startPt.x, startPt.y);
  ctx.lineTo(
    startPt.x + Math.cos(angle + sweepHalf) * length,
    startPt.y + Math.sin(angle + sweepHalf) * length
  );
  ctx.stroke();
  ctx.setLineDash([]);

  // Origin dot
  ctx.beginPath();
  ctx.arc(startPt.x, startPt.y, 7 / scale, 0, Math.PI * 2);
  ctx.fillStyle = `rgb(${r},${g},${b})`;
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2 / scale;
  ctx.stroke();

  // Length and angle label badge
  const label = `${Math.round(length)}px  |  FOV ${settings.fov}°  |  Sweep ${settings.sweepRange}°`;
  ctx.font = `bold ${Math.round(10 / scale)}px -apple-system, sans-serif`;
  ctx.fillStyle = 'rgba(10, 14, 23, 0.9)';
  const tw = ctx.measureText(label).width;
  ctx.fillRect(
    currentPt.x + 12 / scale,
    currentPt.y - 12 / scale,
    tw + 12 / scale,
    18 / scale
  );
  ctx.strokeStyle = `rgba(${r},${g},${b},0.8)`;
  ctx.lineWidth = 1 / scale;
  ctx.strokeRect(
    currentPt.x + 12 / scale,
    currentPt.y - 12 / scale,
    tw + 12 / scale,
    18 / scale
  );
  ctx.fillStyle = '#ffffff';
  ctx.fillText(
    label,
    currentPt.x + 18 / scale,
    currentPt.y + 1 / scale
  );

  ctx.restore();
};
