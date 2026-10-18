import type { Point, Shape } from '../../../types';
import { fadeColor, rgbToHsl } from '../../../utils/colors';
import type { PolygonFillStyle, PolygonSettings, RadarConfig, RadarDot } from './types';

/**
 * Extracts HSL values from hex or color string
 */
export const getHueAndSatFromColor = (color: string): { h: number; s: number; l: number } => {
  if (!color || typeof color !== 'string') {
    return { h: 165, s: 100, l: 50 };
  }
  if (color.startsWith('#')) {
    const hex = color.replace('#', '');
    let r = 0, g = 255, b = 200;
    if (hex.length === 3) {
      r = parseInt(hex[0] + hex[0], 16);
      g = parseInt(hex[1] + hex[1], 16);
      b = parseInt(hex[2] + hex[2], 16);
    } else if (hex.length >= 6) {
      r = parseInt(hex.slice(0, 2), 16);
      g = parseInt(hex.slice(2, 4), 16);
      b = parseInt(hex.slice(4, 6), 16);
    }
    const [h, s, l] = rgbToHsl(r, g, b);
    return { h: Math.round(h), s: Math.round(s * 100), l: Math.round(l * 100) };
  }
  return { h: 165, s: 100, l: 50 };
};

/**
 * Generates initial tactical blip dots for radar pulse
 */
export const generateRadarDots = (count: number = 5): RadarDot[] => {
  const dots: RadarDot[] = [];
  for (let i = 0; i < count; i++) {
    dots.push({
      angle: Math.random() * Math.PI * 2,
      distRatio: 0.15 + Math.random() * 0.65,
      size: Math.random() * 2.2 + 1.2,
      blinkSpeed: Math.random() * 0.05 + 0.02,
      blinkOffset: Math.random() * Math.PI * 2,
    });
  }
  return dots;
};

/**
 * Radar Particle for placement bursts
 */
export interface RadarParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  decay: number;
  size: number;
  hue: number;
}

export const createRadarBurstParticles = (
  x: number,
  y: number,
  hue: number,
  count: number = 30,
  tiltDegrees: number = 65
): RadarParticle[] => {
  const tiltRad = (tiltDegrees * Math.PI) / 180;
  const scaleY = Math.max(0.15, Math.cos(tiltRad));
  const particles: RadarParticle[] = [];
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * 2.5 + 0.8;
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * scaleY,
      life: 1,
      decay: Math.random() * 0.018 + 0.009,
      size: Math.random() * 2.8 + 0.8,
      hue,
    });
  }
  return particles;
};

export const updateAndDrawRadarParticles = (
  ctx: CanvasRenderingContext2D,
  particles: RadarParticle[],
  scale: number,
  dt: number = 1
): RadarParticle[] => {
  const remaining: RadarParticle[] = [];
  for (const p of particles) {
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= p.decay * dt;
    p.vx *= 0.99;
    p.vy *= 0.99;
    if (p.life > 0) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, Math.max(1, (p.size * p.life) / scale), 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 70%, ${p.life * 0.8})`;
      ctx.shadowColor = `hsla(${p.hue}, 100%, 75%, 0.8)`;
      ctx.shadowBlur = 6 / scale;
      ctx.fill();
      ctx.restore();
      remaining.push(p);
    }
  }
  return remaining;
};

/**
 * Checks if point is within radar ellipse on ground
 */
export const isPointNearRadar = (
  pt: Point,
  center: Point,
  radius: number,
  tiltDegrees: number = 65
): boolean => {
  const tiltRad = (tiltDegrees * Math.PI) / 180;
  const scaleY = Math.max(0.1, Math.cos(tiltRad));
  const dx = (pt.x - center.x) / radius;
  const dy = (pt.y - center.y) / (radius * scaleY);
  return dx * dx + dy * dy <= 1.15;
};

/**
 * Calculates shortest distance from point p to line segment (v, w)
 */
export const distToSegment = (p: Point, v: Point, w: Point): number => {
  const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
  if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  return Math.sqrt(
    Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) +
    Math.pow(p.y - (v.y + t * (w.y - v.y)), 2)
  );
};

/**
 * Ray-casting algorithm to test if a point is inside a polygon
 */
export const isPointInPolygon = (pt: Point, polygon: Point[]): boolean => {
  if (polygon.length < 3) return false;
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i].x;
    const yi = polygon[i].y;
    const xj = polygon[j].x;
    const yj = polygon[j].y;
    const intersect =
      yi > pt.y !== yj > pt.y &&
      pt.x < ((xj - xi) * (pt.y - yi)) / (yj - yi) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
};

/**
 * Hit test for polygon: checks if point is near any edge (including closing edge)
 * or inside the body if the polygon is filled.
 */
export const isPointNearPolygon = (
  pt: Point,
  points: Point[],
  threshold: number,
  isFilled: boolean = true
): boolean => {
  if (!points || points.length === 0) return false;

  // Check edges
  for (let j = 0; j < points.length - 1; j++) {
    if (distToSegment(pt, points[j], points[j + 1]) <= threshold) {
      return true;
    }
  }

  // Check closing edge if at least 3 points
  if (points.length > 2) {
    if (distToSegment(pt, points[points.length - 1], points[0]) <= threshold) {
      return true;
    }
  }

  // Check if inside polygon body if filled
  if (isFilled && points.length > 2) {
    if (isPointInPolygon(pt, points)) {
      return true;
    }
  }

  return false;
};

/**
 * Renders a polygon shape onto the target 2D canvas context
 */
export const drawPolygon = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | any,
  shape: Shape,
  scale: number,
  _renderMode: 'full' | 'shadow' | 'body' = 'full',
  _ffAlpha: number = 1,
  unifiedProgress?: number
) => {
  const { points } = shape;
  if (!points || points.length < 1) return;

  const polyNow = Date.now();
  const polyDuration = 600;
  let polyProgress = shape.timestamp
    ? Math.max(0, Math.min(1, (polyNow - shape.timestamp) / polyDuration))
    : 1;

  if (unifiedProgress !== undefined) {
    polyProgress = Math.max(0, Math.min(1, unifiedProgress));
  }

  ctx.save();

  // Entrance animation clip circle
  if (polyProgress < 1) {
    let minX = points[0].x;
    let maxX = points[0].x;
    let minY = points[0].y;
    let maxY = points[0].y;
    points.forEach((p) => {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    });
    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;
    const r = Math.sqrt(Math.pow(maxX - minX, 2) + Math.pow(maxY - minY, 2));
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(0.0001, r * polyProgress), 0, Math.PI * 2);
    ctx.clip();
  }

  if (shape.isDashed) {
    ctx.setLineDash([10, 10]);
    ctx.lineDashOffset = -((polyNow / 1000) * 40);
  }

  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));

  if (shape.isClosed) {
    ctx.closePath();
    ctx.save();
    const fillStyle: PolygonFillStyle = shape.polygonConfig?.fillStyle || 'fill';

    if (fillStyle === 'fill') {
      const gradient = ctx.createLinearGradient(
        points[0].x,
        points[0].y,
        points[1]?.x || points[0].x,
        points[1]?.y || points[0].y
      );
      const areaPulse = 0.5 + 0.5 * Math.sin(polyNow / 400);
      gradient.addColorStop(0, fadeColor(shape.color, 0.2 + 0.3 * areaPulse));
      gradient.addColorStop(1, fadeColor(shape.color, 0.1));
      ctx.fillStyle = gradient;
      ctx.shadowColor = shape.color;
      ctx.shadowBlur = 10;
      ctx.fill();
    } else if (fillStyle === 'stripe') {
      const minX = Math.min(...points.map((p) => p.x));
      const maxX = Math.max(...points.map((p) => p.x));
      const minY = Math.min(...points.map((p) => p.y));
      const maxY = Math.max(...points.map((p) => p.y));
      ctx.clip();
      ctx.beginPath();
      const spacing = 12 / scale;
      const offset = (polyNow / 20) % spacing;
      const maxLen = maxX - minX + (maxY - minY);
      for (let i = -maxLen; i < maxLen * 2; i += spacing) {
        ctx.moveTo(minX, minY + i + offset);
        ctx.lineTo(maxX, minY + i + (maxX - minX) + offset);
      }
      ctx.strokeStyle = fadeColor(shape.color, 0.4);
      ctx.lineWidth = 2 / scale;
      ctx.stroke();
    }
    ctx.restore();

    // Re-create path for outline
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
  }

  // Outline stroke
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 5;
  ctx.shadowOffsetY = 3;
  ctx.stroke();
  ctx.restore();

  // Edge light pulse along boundary
  if (shape.isClosed && points.length > 1) {
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineWidth = (shape.strokeWidth / scale) * 1.5;
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.shadowColor = 'rgba(255,255,255,0.5)';
    ctx.shadowBlur = 5;
    let perimeter = 0;
    for (let i = 0; i < points.length; i++) {
      const p1 = points[i];
      const p2 = points[(i + 1) % points.length];
      perimeter += Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
    }
    ctx.setLineDash([30 / scale, Math.max(100, perimeter)]);
    ctx.lineDashOffset = -((polyNow * 0.45) % Math.max(100, perimeter));
    ctx.stroke();
    ctx.restore();
  }

  // Vertex marker dots
  ctx.save();
  if (shape.isClosed) {
    points.forEach((p) => {
      ctx.beginPath();
      ctx.fillStyle = shape.color;
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 4;
      ctx.shadowOffsetY = 2;
      ctx.arc(p.x, p.y, Math.max(3, 4 / scale), 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.lineWidth = 2 / scale;
      ctx.strokeStyle = '#ffffff';
      ctx.stroke();
    });
  }
  ctx.restore();

  ctx.restore();
};

/**
 * Draws real-time preview of the polygon being created
 */
export const drawPolygonPreview = (
  ctx: CanvasRenderingContext2D,
  activePoints: Point[],
  mousePos: Point,
  color: string,
  strokeWidth: number,
  scale: number,
  fillStyle: PolygonFillStyle = 'fill',
  ffAlpha: number = 1
) => {
  ctx.save();
  ctx.globalAlpha = 0.7 * ffAlpha;

  // If no points yet, render cursor dot
  if (activePoints.length === 0) {
    ctx.beginPath();
    ctx.arc(mousePos.x, mousePos.y, strokeWidth / scale / 2, 0, Math.PI * 2);
    ctx.fillStyle = color;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4;
    ctx.fill();
    ctx.restore();
    return;
  }

  const allPreviewPoints = [...activePoints, mousePos];

  // Draw semi-transparent filled area preview
  if (allPreviewPoints.length >= 3 && fillStyle !== 'none') {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(allPreviewPoints[0].x, allPreviewPoints[0].y);
    allPreviewPoints.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
    ctx.closePath();
    ctx.fillStyle = fadeColor(color, fillStyle === 'stripe' ? 0.12 : 0.2);
    ctx.fill();
    ctx.restore();
  }

  // Draw solid lines connecting active points + mouse position
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = strokeWidth / scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,0.5)';
  ctx.shadowBlur = 4;
  ctx.moveTo(activePoints[0].x, activePoints[0].y);
  activePoints.slice(1).forEach((p) => ctx.lineTo(p.x, p.y));
  ctx.lineTo(mousePos.x, mousePos.y);
  ctx.stroke();

  // If 2 or more points, show closing preview guideline to the first point
  if (activePoints.length >= 2) {
    ctx.save();
    ctx.beginPath();
    ctx.setLineDash([4 / scale, 4 / scale]);
    ctx.strokeStyle = fadeColor(color, 0.5);
    ctx.lineWidth = Math.max(1, (strokeWidth / scale) * 0.7);
    ctx.moveTo(mousePos.x, mousePos.y);
    ctx.lineTo(activePoints[0].x, activePoints[0].y);
    ctx.stroke();
    ctx.restore();
  }

  // Check if hovering near start point (closing snap indicator)
  const distToStart = Math.hypot(
    mousePos.x - activePoints[0].x,
    mousePos.y - activePoints[0].y
  );
  const snapThreshold = 18 / scale;
  const isNearStart = activePoints.length >= 3 && distToStart <= snapThreshold;

  // Draw vertex markers for placed points
  activePoints.forEach((p, idx) => {
    ctx.save();
    ctx.beginPath();
    const isFirst = idx === 0;
    const radius = isFirst && isNearStart ? 7 / scale : 4 / scale;
    ctx.arc(p.x, p.y, Math.max(3, radius), 0, Math.PI * 2);
    ctx.fillStyle = isFirst && isNearStart ? '#c6ff1f' : color;
    ctx.fill();
    ctx.lineWidth = 1.5 / scale;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();

    if (isFirst && isNearStart) {
      // Glow pulse around start point when snapping to close
      ctx.beginPath();
      ctx.arc(p.x, p.y, 12 / scale, 0, Math.PI * 2);
      ctx.strokeStyle = '#c6ff1f';
      ctx.lineWidth = 2 / scale;
      ctx.setLineDash([3 / scale, 3 / scale]);
      ctx.stroke();
    }
    ctx.restore();
  });

  ctx.restore();
};

/**
 * Creates a new polygon Shape instance
 */
export const createPolygonShape = (
  points: Point[],
  color: string,
  strokeWidth: number,
  fillStyle: PolygonFillStyle = 'fill',
  activeFFId?: string
): Shape => ({
  id: Date.now().toString(),
  type: 'polygon',
  points,
  color,
  strokeWidth,
  isClosed: true,
  timestamp: Date.now(),
  freezeFrameId: activeFFId,
  polygonConfig: { fillStyle },
});

/**
 * Renders an animated tactical radar ring on canvas
 */
export const drawRadar = (
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D | any,
  shape: Shape,
  scale: number,
  _renderMode: 'full' | 'shadow' | 'body' = 'full',
  ffAlpha: number = 1,
  unifiedProgress?: number
) => {
  const center = shape.points[0];
  if (!center) return;

  const now = Date.now();
  const birth = shape.timestamp || now;
  const radarDuration = 500;
  let progress = Math.max(0, Math.min(1, (now - birth) / radarDuration));
  if (unifiedProgress !== undefined) {
    progress = Math.max(0, Math.min(1, unifiedProgress));
  }
  const globalAlpha = progress * ffAlpha;
  if (globalAlpha <= 0) return;

  const config: RadarConfig = shape.radarConfig || {
    radius: 130,
    tilt: 65,
    fillOpacity: 0.38,
    sweepSpeed: 0.025,
    showBlips: true,
    showCrosshair: true,
    showGlow: true,
    showRings: true,
  };

  const maxRadius = Math.max(15, config.radius || 130);
  const tiltDegrees = config.tilt ?? 65;
  const tiltRad = (tiltDegrees * Math.PI) / 180;
  const scaleY = Math.max(0.1, Math.cos(tiltRad));
  const { h } = getHueAndSatFromColor(shape.color);

  ctx.save();
  ctx.globalAlpha = globalAlpha;
  ctx.translate(center.x, center.y);

  // Lay flat on ground plane with 3D tilt perspective for all ground elements
  ctx.save();
  ctx.scale(1, scaleY);

  // Entrance scaling animation
  if (progress < 1) {
    const scaleFactor = 0.8 + 0.2 * progress;
    ctx.scale(scaleFactor, scaleFactor);
  }

  // 1. Outer ambient glow
  if (config.showGlow !== false) {
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius * 1.25);
    glowGrad.addColorStop(0, `hsla(${h}, 100%, 60%, ${0.12 * globalAlpha})`);
    glowGrad.addColorStop(0.5, `hsla(${h}, 100%, 50%, ${0.04 * globalAlpha})`);
    glowGrad.addColorStop(1, `hsla(${h}, 100%, 50%, 0)`);
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, maxRadius * 1.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // 2. Tactical interior disk fill (user requested: more fill opacity!)
  const fillOpacity = config.fillOpacity ?? 0.38;
  const fillAlpha = fillOpacity * globalAlpha;
  if (fillAlpha > 0.01) {
    const innerFill = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
    innerFill.addColorStop(0, `hsla(${h}, 95%, 62%, ${fillAlpha * 0.95})`);
    innerFill.addColorStop(0.4, `hsla(${h}, 90%, 54%, ${fillAlpha * 0.72})`);
    innerFill.addColorStop(0.75, `hsla(${h}, 85%, 48%, ${fillAlpha * 0.48})`);
    innerFill.addColorStop(1, `hsla(${h}, 80%, 42%, ${fillAlpha * 0.22})`);
    ctx.beginPath();
    ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerFill;
    ctx.fill();
  }

  // 3. Static concentric range rings (4 rings)
  for (let i = 1; i <= 4; i++) {
    const r = (maxRadius / 4) * i;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${h}, 85%, 55%, ${0.22 * globalAlpha})`;
    ctx.lineWidth = Math.max(0.6, 0.8 / scale);
    ctx.stroke();
  }

  // Distance range calibration text
  ctx.save();
  ctx.font = `600 ${Math.max(6.5, 7.5 / scale)}px 'JetBrains Mono', monospace, sans-serif`;
  ctx.fillStyle = `hsla(${h}, 90%, 75%, ${0.6 * globalAlpha})`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'bottom';
  for (let i = 1; i <= 4; i++) {
    const distVal = (maxRadius * 0.05 * i).toFixed(0);
    const rx = (maxRadius / 4) * i;
    ctx.fillText(`${distVal}m`, rx + (3 / scale), -2 / scale);
  }
  ctx.restore();

  // 4. Crosshair lines & tactical ticks
  if (config.showCrosshair !== false) {
    ctx.strokeStyle = `hsla(${h}, 70%, 50%, ${0.22 * globalAlpha})`;
    ctx.lineWidth = Math.max(0.5, 0.6 / scale);
    ctx.beginPath();
    ctx.moveTo(-maxRadius, 0);
    ctx.lineTo(maxRadius, 0);
    ctx.moveTo(0, -maxRadius);
    ctx.lineTo(0, maxRadius);
    ctx.stroke();

    // Subtle tactical ticks
    const tickStep = maxRadius / 4;
    const tickSize = Math.max(2, 3 / scale);
    ctx.beginPath();
    for (let k = 1; k < 4; k++) {
      const d = tickStep * k;
      ctx.moveTo(d, -tickSize);
      ctx.lineTo(d, tickSize);
      ctx.moveTo(-d, -tickSize);
      ctx.lineTo(-d, tickSize);
      ctx.moveTo(-tickSize, d);
      ctx.lineTo(tickSize, d);
      ctx.moveTo(-tickSize, -d);
      ctx.lineTo(tickSize, -d);
    }
    ctx.strokeStyle = `hsla(${h}, 75%, 55%, ${0.3 * globalAlpha})`;
    ctx.stroke();
  }

  // 5. Dynamic expanding waves & ripple wavefronts inside (more waves!)
  if (config.showRings !== false) {
    const waveCount = 5; // Multi-wave sonar ripple
    const waveCycle = 2000; // ms for expansion wave cycle
    for (let i = 0; i < waveCount; i++) {
      const phase = ((now - birth + i * (waveCycle / waveCount)) % waveCycle) / waveCycle;
      const waveRadius = phase * maxRadius;
      const waveAlpha = Math.max(0, 1 - phase);
      if (waveRadius > 2 && waveRadius < maxRadius) {
        // Wave ripple body aura (gradient wave crest expanding outward)
        const waveBand = Math.min(waveRadius, maxRadius * 0.22);
        const waveGrad = ctx.createRadialGradient(
          0, 0, Math.max(0, waveRadius - waveBand),
          0, 0, waveRadius
        );
        waveGrad.addColorStop(0, `hsla(${h}, 100%, 65%, 0)`);
        waveGrad.addColorStop(0.65, `hsla(${h}, 100%, 68%, ${waveAlpha * 0.22 * globalAlpha})`);
        waveGrad.addColorStop(1, `hsla(${h}, 100%, 78%, ${waveAlpha * 0.55 * globalAlpha})`);
        ctx.beginPath();
        ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
        ctx.fillStyle = waveGrad;
        ctx.fill();

        // Outer glowing wave stroke
        ctx.beginPath();
        ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${h}, 100%, 70%, ${waveAlpha * 0.35 * globalAlpha})`;
        ctx.lineWidth = Math.max(2.5, 4.5 / scale);
        ctx.stroke();

        // Crisp bright wavefront core ring
        ctx.beginPath();
        ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${h}, 100%, 85%, ${waveAlpha * 0.9 * globalAlpha})`;
        ctx.lineWidth = Math.max(1, 1.6 / scale);
        ctx.stroke();
      }
    }
  }

  // 6. Radar sweep cone
  const sweepSpeed = config.sweepSpeed ?? 0.025;
  const sweepAngle = ((now - birth) * sweepSpeed * 0.12) % (Math.PI * 2);

  try {
    const sweepGrad = ctx.createConicGradient(sweepAngle, 0, 0);
    sweepGrad.addColorStop(0, `hsla(${h}, 100%, 60%, ${0.35 * globalAlpha})`);
    sweepGrad.addColorStop(0.08, `hsla(${h}, 100%, 55%, ${0.1 * globalAlpha})`);
    sweepGrad.addColorStop(0.16, `hsla(${h}, 100%, 50%, 0)`);
    sweepGrad.addColorStop(1, `hsla(${h}, 100%, 50%, 0)`);

    ctx.beginPath();
    ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = sweepGrad;
    ctx.fill();
  } catch (e) {
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, maxRadius, sweepAngle - 0.4, sweepAngle);
    ctx.closePath();
    ctx.fillStyle = `hsla(${h}, 100%, 60%, ${0.2 * globalAlpha})`;
    ctx.fill();
    ctx.restore();
  }

  // 7. Sweep line with glow & leading plasma spark
  const lineX = Math.cos(sweepAngle) * maxRadius;
  const lineY = Math.sin(sweepAngle) * maxRadius;

  // Sweep line halo
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(lineX, lineY);
  ctx.strokeStyle = `hsla(${h}, 100%, 75%, ${0.35 * globalAlpha})`;
  ctx.lineWidth = Math.max(2, 4 / scale);
  ctx.stroke();

  // Sweep line core
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(lineX, lineY);
  ctx.strokeStyle = `hsla(${h}, 100%, 85%, ${0.9 * globalAlpha})`;
  ctx.lineWidth = Math.max(1, 1.5 / scale);
  ctx.stroke();

  // Leading plasma spark at outer rim
  ctx.beginPath();
  ctx.arc(lineX, lineY, Math.max(2.5, 3.5 / scale), 0, Math.PI * 2);
  ctx.fillStyle = `hsla(${h}, 100%, 95%, ${0.95 * globalAlpha})`;
  ctx.fill();
  ctx.beginPath();
  ctx.arc(lineX, lineY, Math.max(6, 8 / scale), 0, Math.PI * 2);
  ctx.fillStyle = `hsla(${h}, 100%, 75%, ${0.25 * globalAlpha})`;
  ctx.fill();

  // 8. Tactical blip dots with Target Reticles
  if (config.showBlips !== false) {
    const dots = config.dots && config.dots.length > 0 ? config.dots : generateRadarDots(5);
    dots.forEach((dot, index) => {
      const dist = dot.distRatio * maxRadius;
      const angleDiff = ((sweepAngle % (Math.PI * 2)) - dot.angle + Math.PI * 4) % (Math.PI * 2);
      const brightness = angleDiff < 1.2 ? Math.max(0, 1 - angleDiff / 1.2) : 0;
      const blink = (Math.sin(now * dot.blinkSpeed + dot.blinkOffset) + 1) / 2;
      const dotAlpha = (brightness * 0.8 + blink * 0.2) * globalAlpha;

      const dx = Math.cos(dot.angle) * dist;
      const dy = Math.sin(dot.angle) * dist;

      if (dotAlpha > 0.04) {
        const dSize = Math.max(1.2, dot.size / scale);

        // Blip outer halo
        ctx.beginPath();
        ctx.arc(dx, dy, dSize * 3, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${h}, 100%, 70%, ${dotAlpha * 0.25})`;
        ctx.fill();

        // Blip core
        ctx.beginPath();
        ctx.arc(dx, dy, dSize, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${h}, 100%, 85%, ${dotAlpha})`;
        ctx.fill();

        // Target Lock-On Reticle when illuminated by sweep
        if (brightness > 0.15) {
          const reticleSize = Math.max(5, 7.5 / scale);
          const bLen = reticleSize * 0.45;
          ctx.save();
          ctx.strokeStyle = `hsla(${h}, 100%, 85%, ${brightness * 0.85 * globalAlpha})`;
          ctx.lineWidth = Math.max(0.8, 1.2 / scale);

          // Top-left
          ctx.beginPath();
          ctx.moveTo(dx - reticleSize, dy - reticleSize + bLen);
          ctx.lineTo(dx - reticleSize, dy - reticleSize);
          ctx.lineTo(dx - reticleSize + bLen, dy - reticleSize);
          ctx.stroke();

          // Top-right
          ctx.beginPath();
          ctx.moveTo(dx + reticleSize - bLen, dy - reticleSize);
          ctx.lineTo(dx + reticleSize, dy - reticleSize);
          ctx.lineTo(dx + reticleSize, dy - reticleSize + bLen);
          ctx.stroke();

          // Bottom-left
          ctx.beginPath();
          ctx.moveTo(dx - reticleSize, dy + reticleSize - bLen);
          ctx.lineTo(dx - reticleSize, dy + reticleSize);
          ctx.lineTo(dx - reticleSize + bLen, dy + reticleSize);
          ctx.stroke();

          // Bottom-right
          ctx.beginPath();
          ctx.moveTo(dx + reticleSize - bLen, dy + reticleSize);
          ctx.lineTo(dx + reticleSize, dy + reticleSize);
          ctx.lineTo(dx + reticleSize, dy + reticleSize - bLen);
          ctx.stroke();

          // Telemetry Readout for target
          if (brightness > 0.3) {
            ctx.font = `700 ${Math.max(6, 7 / scale)}px 'JetBrains Mono', monospace, sans-serif`;
            ctx.fillStyle = `hsla(${h}, 100%, 92%, ${brightness * globalAlpha})`;
            ctx.textAlign = 'left';
            ctx.textBaseline = 'top';
            ctx.fillText(`PL-0${index + 1}`, dx + reticleSize + (3 / scale), dy - reticleSize);
            ctx.fillText(`${(dist * 0.1).toFixed(1)}m`, dx + reticleSize + (3 / scale), dy - reticleSize + (7.5 / scale));
          }
          ctx.restore();
        }
      }
    });
  }

  // 9. Outer border ring
  ctx.beginPath();
  ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `hsla(${h}, 90%, 62%, ${0.55 * globalAlpha})`;
  ctx.lineWidth = Math.max(1.2, 1.8 / scale);
  ctx.stroke();

  // 10. Center pulsing tactical dot
  const centerPulse = (Math.sin(now * 0.005) + 1) / 2;
  const centerSize = Math.max(2.5, (3 + centerPulse * 2) / scale);

  ctx.beginPath();
  ctx.arc(0, 0, centerSize * 2.8, 0, Math.PI * 2);
  ctx.fillStyle = `hsla(${h}, 100%, 70%, ${0.25 * globalAlpha})`;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(0, 0, centerSize, 0, Math.PI * 2);
  ctx.fillStyle = `hsla(${h}, 100%, 85%, ${0.95 * globalAlpha})`;
  ctx.fill();

  ctx.restore(); // Restore 3D tilt
  ctx.restore(); // Restore translate & globalAlpha
};

/**
 * Draws real-time interactive preview of radar pulse under cursor
 */
export const drawRadarPreview = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  radius: number,
  color: string,
  scale: number,
  settings: PolygonSettings,
  now: number = Date.now(),
  ffAlpha: number = 1
) => {
  const maxRadius = Math.max(15, radius || settings.radarRadius || 130);
  const tiltDegrees = settings.radarTilt ?? 65;
  const tiltRad = (tiltDegrees * Math.PI) / 180;
  const scaleY = Math.max(0.1, Math.cos(tiltRad));
  const { h } = getHueAndSatFromColor(color);
  const globalAlpha = 0.85 * ffAlpha;

  ctx.save();
  ctx.globalAlpha = globalAlpha;
  ctx.translate(x, y);

  ctx.save();
  ctx.scale(1, scaleY);

  // Outer glow
  if (settings.radarShowGlow) {
    const glowGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius * 1.25);
    glowGrad.addColorStop(0, `hsla(${h}, 100%, 60%, ${0.1 * globalAlpha})`);
    glowGrad.addColorStop(0.5, `hsla(${h}, 100%, 50%, ${0.03 * globalAlpha})`);
    glowGrad.addColorStop(1, `hsla(${h}, 100%, 50%, 0)`);
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(0, 0, maxRadius * 1.25, 0, Math.PI * 2);
    ctx.fill();
  }

  // Tactical interior disk fill (more fill opacity!)
  const fillOpacity = settings.radarFillOpacity ?? 0.38;
  const fillAlpha = fillOpacity * globalAlpha;
  if (fillAlpha > 0.01) {
    const innerFill = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
    innerFill.addColorStop(0, `hsla(${h}, 95%, 62%, ${fillAlpha * 0.95})`);
    innerFill.addColorStop(0.4, `hsla(${h}, 90%, 54%, ${fillAlpha * 0.72})`);
    innerFill.addColorStop(0.75, `hsla(${h}, 85%, 48%, ${fillAlpha * 0.48})`);
    innerFill.addColorStop(1, `hsla(${h}, 80%, 42%, ${fillAlpha * 0.22})`);
    ctx.beginPath();
    ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = innerFill;
    ctx.fill();
  }

  // Concentric static rings (4 rings)
  for (let i = 1; i <= 4; i++) {
    const r = (maxRadius / 4) * i;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.strokeStyle = `hsla(${h}, 85%, 55%, ${0.2 * globalAlpha})`;
    ctx.lineWidth = Math.max(0.6, 0.8 / scale);
    ctx.stroke();
  }

  // Crosshairs
  if (settings.radarShowCrosshair) {
    ctx.strokeStyle = `hsla(${h}, 70%, 50%, ${0.18 * globalAlpha})`;
    ctx.lineWidth = Math.max(0.5, 0.6 / scale);
    ctx.beginPath();
    ctx.moveTo(-maxRadius, 0);
    ctx.lineTo(maxRadius, 0);
    ctx.moveTo(0, -maxRadius);
    ctx.lineTo(0, maxRadius);
    ctx.stroke();
  }

  // Dynamic expanding pulse waves inside (5 waves!)
  if (settings.radarShowRings) {
    const waveCount = 5;
    const waveCycle = 2000;
    for (let i = 0; i < waveCount; i++) {
      const phase = ((now + i * (waveCycle / waveCount)) % waveCycle) / waveCycle;
      const waveRadius = phase * maxRadius;
      const waveAlpha = Math.max(0, 1 - phase);
      if (waveRadius > 2 && waveRadius < maxRadius) {
        // Wave ripple body aura
        const waveBand = Math.min(waveRadius, maxRadius * 0.22);
        const waveGrad = ctx.createRadialGradient(
          0, 0, Math.max(0, waveRadius - waveBand),
          0, 0, waveRadius
        );
        waveGrad.addColorStop(0, `hsla(${h}, 100%, 65%, 0)`);
        waveGrad.addColorStop(0.65, `hsla(${h}, 100%, 68%, ${waveAlpha * 0.2 * globalAlpha})`);
        waveGrad.addColorStop(1, `hsla(${h}, 100%, 78%, ${waveAlpha * 0.5 * globalAlpha})`);
        ctx.beginPath();
        ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
        ctx.fillStyle = waveGrad;
        ctx.fill();

        // Outer wave stroke
        ctx.beginPath();
        ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${h}, 100%, 70%, ${waveAlpha * 0.3 * globalAlpha})`;
        ctx.lineWidth = Math.max(2, 4 / scale);
        ctx.stroke();

        // Wavefront core
        ctx.beginPath();
        ctx.arc(0, 0, waveRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `hsla(${h}, 100%, 85%, ${waveAlpha * 0.85 * globalAlpha})`;
        ctx.lineWidth = Math.max(1, 1.6 / scale);
        ctx.stroke();
      }
    }
  }

  // Sweep
  const sweepAngle = (now * settings.radarSweepSpeed * 0.12) % (Math.PI * 2);
  try {
    const sweepGrad = ctx.createConicGradient(sweepAngle, 0, 0);
    sweepGrad.addColorStop(0, `hsla(${h}, 100%, 60%, ${0.35 * globalAlpha})`);
    sweepGrad.addColorStop(0.08, `hsla(${h}, 100%, 55%, ${0.1 * globalAlpha})`);
    sweepGrad.addColorStop(0.16, `hsla(${h}, 100%, 50%, 0)`);
    sweepGrad.addColorStop(1, `hsla(${h}, 100%, 50%, 0)`);

    ctx.beginPath();
    ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
    ctx.fillStyle = sweepGrad;
    ctx.fill();
  } catch (e) {}

  // Sweep line
  const lineX = Math.cos(sweepAngle) * maxRadius;
  const lineY = Math.sin(sweepAngle) * maxRadius;
  ctx.beginPath();
  ctx.moveTo(0, 0);
  ctx.lineTo(lineX, lineY);
  ctx.strokeStyle = `hsla(${h}, 100%, 80%, ${0.75 * globalAlpha})`;
  ctx.lineWidth = Math.max(1, 1.5 / scale);
  ctx.stroke();

  // Outer border ring
  ctx.beginPath();
  ctx.arc(0, 0, maxRadius, 0, Math.PI * 2);
  ctx.strokeStyle = `hsla(${h}, 85%, 60%, ${0.55 * globalAlpha})`;
  ctx.lineWidth = Math.max(1.2, 1.8 / scale);
  ctx.stroke();

  // Center pulsing dot
  const centerPulse = (Math.sin(now * 0.005) + 1) / 2;
  const centerSize = Math.max(2.5, (3 + centerPulse * 2) / scale);
  ctx.beginPath();
  ctx.arc(0, 0, centerSize, 0, Math.PI * 2);
  ctx.fillStyle = `hsla(${h}, 100%, 85%, ${0.95 * globalAlpha})`;
  ctx.fill();

  ctx.restore(); // Restore tilt
  ctx.restore(); // Restore translate
};

/**
 * Creates a new radar Shape instance
 */
export const createRadarShape = (
  center: Point,
  radius: number,
  color: string,
  strokeWidth: number,
  settings: PolygonSettings,
  activeFFId?: string
): Shape => ({
  id: Date.now().toString(),
  type: 'radar',
  points: [{ x: center.x, y: center.y }],
  color,
  strokeWidth,
  timestamp: Date.now(),
  freezeFrameId: activeFFId,
  radarConfig: {
    radius,
    tilt: settings.radarTilt ?? 65,
    fillOpacity: settings.radarFillOpacity ?? 0.38,
    sweepSpeed: settings.radarSweepSpeed,
    showBlips: settings.radarShowBlips,
    showCrosshair: settings.radarShowCrosshair,
    showGlow: settings.radarShowGlow,
    showRings: settings.radarShowRings,
    showBroadcastHud: false,
    showCompass: false,
    showPillar: false,
    dots: generateRadarDots(5),
  },
  polygonConfig: {
    mode: 'radar',
    fillStyle: settings.fillStyle,
  },
});

