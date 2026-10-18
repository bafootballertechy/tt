import type { Point, Shape, FreezeFrame } from '../../../types';
import { 
  drawArrowHead, draw3DRing, drawSpotlight, drawLens, 
  drawNameTag, drawCurvedArrow, drawCurvedRun, drawProArrow, 
  drawFreehandArrow, drawTangentLine, drawText, AnyCanvasContext 
} from '../../../utils/drawing';
import { fadeColor } from '../../../utils/colors';
import { drawPolygon, drawRadar } from '../Polygon/polygonUtils';
import { drawScanner } from '../Scanner/scannerUtils';

export interface ViewportLayout {
  x: number;
  y: number;
  w: number;
  h: number;
  scale: number;
}

/**
 * Calculates letterbox/pillarbox layout to fit source dimensions into target canvas while preserving aspect ratio.
 */
export function calculateFitLayout(
  targetWidth: number,
  targetHeight: number,
  sourceWidth: number,
  sourceHeight: number
): ViewportLayout {
  if (!sourceWidth || !sourceHeight || !targetWidth || !targetHeight) {
    return { x: 0, y: 0, w: targetWidth, h: targetHeight, scale: 1 };
  }

  const srcRatio = sourceWidth / sourceHeight;
  const targetRatio = targetWidth / targetHeight;

  let w: number;
  let h: number;
  let x: number;
  let y: number;
  let scale: number;

  if (targetRatio > srcRatio) {
    h = targetHeight;
    w = targetHeight * srcRatio;
    x = (targetWidth - w) / 2;
    y = 0;
    scale = h / sourceHeight;
  } else {
    w = targetWidth;
    h = targetWidth / srcRatio;
    x = 0;
    y = (targetHeight - h) / 2;
    scale = w / sourceWidth;
  }

  return { x, y, w, h, scale };
}

export interface ShapeIndex {
  hasAnyVisibleShapes: boolean;
  hasAnimatedShapes: boolean;
  staticShapes: Shape[];
  animatedShapes: Shape[];
  shapesByFreezeFrameId: Map<string, Shape[]>;
  timedShapes: { start: number; end: number; shape: Shape }[];
}

export function isShapeAnimated(shape: Shape): boolean {
  if (shape.type === 'player-move' || shape.type === 'spotlight' || shape.type === 'radar' || shape.type === 'scanner') {
    return true;
  }
  if (shape.isDashed || shape.isFreehand || shape.isCurved) {
    return true;
  }
  if (shape.animStart !== undefined || shape.animEnd !== undefined) {
    return true;
  }
  return false;
}

export function buildShapeIndex(shapes: Shape[] = [], freezeFrames: FreezeFrame[] = []): ShapeIndex {
  const staticShapes: Shape[] = [];
  const animatedShapes: Shape[] = [];
  const shapesByFreezeFrameId = new Map<string, Shape[]>();
  const timedShapes: { start: number; end: number; shape: Shape }[] = [];

  for (const shape of shapes) {
    if (shape.freezeFrameId) {
      const list = shapesByFreezeFrameId.get(shape.freezeFrameId) || [];
      list.push(shape);
      shapesByFreezeFrameId.set(shape.freezeFrameId, list);
      continue;
    }

    if (isShapeAnimated(shape)) {
      animatedShapes.push(shape);
    } else {
      staticShapes.push(shape);
    }

    if (typeof shape.timestamp === 'number') {
      const start = Math.max(0, shape.timestamp - 1);
      const end = shape.timestamp + 5;
      timedShapes.push({ start, end, shape });
    }
  }

  const hasAnyVisibleShapes = shapes.length > 0;
  const hasAnimatedShapes = animatedShapes.length > 0;

  return {
    hasAnyVisibleShapes,
    hasAnimatedShapes,
    staticShapes,
    animatedShapes,
    shapesByFreezeFrameId,
    timedShapes
  };
}

export interface RenderExportFrameOptions {
  ctx: AnyCanvasContext;
  targetWidth: number;
  targetHeight: number;
  sourceFrame?: CanvasImageSource | null;
  sourceWidth: number;
  sourceHeight: number;
  currentVideoTime: number;
  shapes: Shape[];
  shapeIndex?: ShapeIndex | null;
  activeFreezeFrame?: FreezeFrame | null;
  freezeFrameElapsed?: number; // In seconds (0..freezeFrame.duration)
  nowMs?: number; // Deterministic clock in ms for animated shaders/dashes
  maskForeground?: CanvasImageSource | null;
  cachedStaticOverlay?: CanvasImageSource | null;
}

/**
 * Renders a single composite export frame:
 * 1. Clears target canvas and fills black background (for broadcast letterboxing).
 * 2. Draws the source video frame fitted with correct aspect ratio.
 * 3. Applies viewport transformation (translation & scaling).
 * 4. Renders ground-level telestration shapes (Pass 1).
 * 5. Overlays Chroma Key segmented player layer (players in front of pitch shapes).
 * 6. Renders foreground annotations such as labels and lenses (Pass 2).
 */
export function renderExportFrame(options: RenderExportFrameOptions): ViewportLayout {
  const {
    ctx,
    targetWidth,
    targetHeight,
    sourceFrame,
    sourceWidth,
    sourceHeight,
    currentVideoTime,
    shapes,
    shapeIndex,
    activeFreezeFrame,
    freezeFrameElapsed = 0,
    maskForeground = null,
    cachedStaticOverlay = null,
    nowMs = Math.round(currentVideoTime * 1000)
  } = options;

  // 1. Clear target canvas
  ctx.save();
  ctx.fillStyle = '#000000';
  ctx.fillRect(0, 0, targetWidth, targetHeight);

  // 2. Compute viewport layout
  const layout = calculateFitLayout(targetWidth, targetHeight, sourceWidth, sourceHeight);

  // 3. Draw source frame if provided
  if (sourceFrame) {
    try {
      ctx.drawImage(sourceFrame, layout.x, layout.y, layout.w, layout.h);
    } catch {
      // Graceful fallback if frame drawing fails
    }
  }

  // 4. Render shapes in video coordinate space
  ctx.save();
  ctx.translate(layout.x, layout.y);
  ctx.scale(layout.scale, layout.scale);

  renderTelestrationsOnContext({
    ctx,
    scale: layout.scale,
    currentVideoTime,
    shapes,
    shapeIndex,
    activeFreezeFrame,
    freezeFrameElapsed,
    sourceFrame,
    maskForeground,
    cachedStaticOverlay,
    sourceWidth,
    sourceHeight,
    nowMs
  });

  ctx.restore();
  ctx.restore();

  return layout;
}

export interface StaticOverlayCache {
  canvas: OffscreenCanvas;
  ctx: AnyCanvasContext;
  isRendered: boolean;
}

export function createStaticOverlayCache(width: number, height: number): StaticOverlayCache {
  let canvas: any;
  let ctx: any;
  if (typeof OffscreenCanvas !== 'undefined') {
    canvas = new OffscreenCanvas(Math.max(1, width), Math.max(1, height));
    ctx = canvas.getContext('2d') as AnyCanvasContext;
  } else {
    canvas = { width, height };
    ctx = {
      clearRect() {},
      drawImage() {},
      save() {},
      restore() {},
      translate() {},
      scale() {},
      fillRect() {},
      beginPath() {},
      closePath() {},
      moveTo() {},
      lineTo() {},
      arc() {},
      stroke() {},
      fill() {}
    };
  }
  return { canvas, ctx, isRendered: false };
}

export function preRenderStaticOverlay(
  cache: StaticOverlayCache,
  shapes: Shape[],
  sourceWidth: number,
  sourceHeight: number,
  maskForeground?: CanvasImageSource | null
): void {
  const { ctx, canvas } = cache;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const staticShapes = shapes.filter(s => !s.freezeFrameId && !isShapeAnimated(s));
  if (staticShapes.length === 0 && !maskForeground) {
    cache.isRendered = false;
    return;
  }

  // Pass 1: Static shapes ground level
  for (const shape of staticShapes) {
    if (shape.type === 'player-move' || shape.type === 'lens' || shape.type === 'name-tag' || shape.type === 'text') {
      continue;
    }
    drawShapeOnContext(ctx, shape, 1, 'full', 1, undefined, null, 0);
  }

  // Mask foreground
  if (maskForeground && sourceWidth && sourceHeight) {
    try {
      ctx.drawImage(maskForeground, 0, 0, sourceWidth, sourceHeight);
    } catch {
      // ignore
    }
  }

  // Pass 2: Static foreground shapes (name-tag, text)
  for (const shape of staticShapes) {
    if (shape.type === 'name-tag' || shape.type === 'text') {
      drawShapeOnContext(ctx, shape, 1, 'full', 1, undefined, null, 0);
    }
  }

  cache.isRendered = true;
}

export interface RenderTelestrationsOptions {
  ctx: AnyCanvasContext;
  scale: number;
  currentVideoTime: number;
  shapes: Shape[];
  shapeIndex?: ShapeIndex | null;
  activeFreezeFrame?: FreezeFrame | null;
  freezeFrameElapsed?: number;
  sourceFrame?: CanvasImageSource | null;
  maskForeground?: CanvasImageSource | null;
  cachedStaticOverlay?: CanvasImageSource | null;
  sourceWidth?: number;
  sourceHeight?: number;
  nowMs?: number;
}

/**
 * Renders telestration layers onto a transformed context.
 */
export function renderTelestrationsOnContext(options: RenderTelestrationsOptions): void {
  const {
    ctx,
    scale,
    currentVideoTime,
    shapes,
    shapeIndex,
    activeFreezeFrame,
    freezeFrameElapsed = 0,
    sourceFrame = null,
    maskForeground = null,
    cachedStaticOverlay = null,
    sourceWidth,
    sourceHeight,
    nowMs = Math.round(currentVideoTime * 1000)
  } = options;

  // Fast exit if no shapes and no mask
  if ((!shapes || shapes.length === 0) && !maskForeground && !cachedStaticOverlay) {
    return;
  }

  // If we have a cached static overlay and are not in a freeze frame, draw it directly
  if (cachedStaticOverlay && !activeFreezeFrame) {
    try {
      ctx.drawImage(cachedStaticOverlay, 0, 0);
    } catch {
      // fallback
    }
  }

  // Select relevant shapes for current frame
  let candidateShapes: Shape[];
  if (activeFreezeFrame) {
    if (shapeIndex) {
      candidateShapes = shapeIndex.shapesByFreezeFrameId.get(activeFreezeFrame.id) || [];
    } else {
      candidateShapes = shapes.filter(s => s.freezeFrameId === activeFreezeFrame.id);
    }
  } else if (cachedStaticOverlay && shapeIndex) {
    // Static shapes already drawn into cachedStaticOverlay, only draw animated shapes
    candidateShapes = shapeIndex.animatedShapes;
  } else {
    candidateShapes = shapes;
  }

  if (candidateShapes.length === 0 && !maskForeground && cachedStaticOverlay) {
    return;
  }

  // Two-pass rendering for shadows & overlays (matches Workspace.tsx preview order)
  // Pass 1: Curved-arrow shadows, lines, rings, polygons, etc.
  for (let i = 0; i < candidateShapes.length; i++) {
    const shape = candidateShapes[i];
    const { shouldRender, unifiedProgress, ffAlpha } = evaluateShapeVisibility(
      shape,
      currentVideoTime,
      activeFreezeFrame,
      freezeFrameElapsed
    );

    if (!shouldRender) continue;

    if (shape.type === 'player-move' || shape.type === 'lens' || shape.type === 'name-tag' || shape.type === 'text') {
      continue; // Handled in Pass 2
    }

    if (shape.type === 'curved-arrow') {
      drawShapeOnContext(ctx, shape, scale, 'shadow', ffAlpha, unifiedProgress, sourceFrame, nowMs);
    } else {
      drawShapeOnContext(ctx, shape, scale, 'full', ffAlpha, unifiedProgress, sourceFrame, nowMs);
    }
  }

  // Chroma Key Layering: Draw segmented player foreground over pitch telestrations (if not already baked in static overlay)
  if (!cachedStaticOverlay && maskForeground && sourceWidth && sourceHeight) {
    try {
      ctx.drawImage(maskForeground, 0, 0, sourceWidth, sourceHeight);
    } catch {
      // Graceful fallback
    }
  }

  // Pass 2: Foreground elements (curved-arrow bodies, player-move, lenses, name-tags, text)
  for (let i = 0; i < candidateShapes.length; i++) {
    const shape = candidateShapes[i];
    const { shouldRender, unifiedProgress, ffAlpha } = evaluateShapeVisibility(
      shape,
      currentVideoTime,
      activeFreezeFrame,
      freezeFrameElapsed
    );

    if (!shouldRender) continue;

    if (shape.type === 'curved-arrow') {
      drawShapeOnContext(ctx, shape, scale, 'body', ffAlpha, unifiedProgress, sourceFrame, nowMs);
    } else if (shape.type === 'player-move' || shape.type === 'name-tag' || shape.type === 'text') {
      drawShapeOnContext(ctx, shape, scale, 'full', ffAlpha, unifiedProgress, sourceFrame, nowMs);
    } else if (shape.type === 'lens' && sourceFrame) {
      if (shape.lensConfig && shape.points[0]) {
        ctx.save();
        ctx.globalAlpha = ffAlpha;
        const actualProgress = unifiedProgress !== undefined ? Math.max(0, unifiedProgress) : 1;
        const effScale = actualProgress < 1 ? Math.max(0.0001, Math.pow(actualProgress, 0.5)) : 1;
        if (effScale < 1) {
          ctx.translate(shape.points[0].x, shape.points[0].y);
          ctx.scale(effScale, effScale);
          ctx.translate(-shape.points[0].x, -shape.points[0].y);
        }
        drawLens(ctx, shape.points[0], shape.lensConfig.radius, shape.lensConfig.zoom, sourceFrame, scale, shape.timestamp);
        ctx.restore();
      }
    }
  }
}

/**
 * Determines whether a shape is visible at the current time / freeze frame,
 * and calculates the animation progression (appear / disappear ramp).
 */
export function evaluateShapeVisibility(
  shape: Shape,
  currentVideoTime: number,
  activeFreezeFrame?: FreezeFrame | null,
  freezeFrameElapsed: number = 0
): { shouldRender: boolean; unifiedProgress?: number; ffAlpha: number } {
  let shouldRender = false;
  let unifiedProgress: number | undefined = undefined;
  const ffAlpha = 1;

  if (activeFreezeFrame) {
    // We are currently rendering a freeze frame
    if (shape.freezeFrameId === activeFreezeFrame.id) {
      shouldRender = true;
      const activeFFDur = activeFreezeFrame.duration || 10;
      const elapsed = freezeFrameElapsed;
      const start = shape.animStart ?? 0;
      const end = shape.animEnd ?? activeFFDur;

      if (elapsed < start || elapsed > end) {
        shouldRender = false;
      } else {
        const appearDuration = 0.5;
        const disappearDuration = 0.5;
        let ap = 1;
        let dp = 0;
        if (elapsed >= start && elapsed <= start + appearDuration) {
          ap = (elapsed - start) / appearDuration;
        }
        if (elapsed >= end - disappearDuration && elapsed <= end) {
          dp = (elapsed - (end - disappearDuration)) / disappearDuration;
        }
        unifiedProgress = ap < 1 ? Math.max(0, Math.min(1, ap)) : Math.max(0, Math.min(1, 1 - dp));
      }
    }
  } else {
    // Normal video playback (no freeze frame)
    if (!shape.freezeFrameId) {
      // Shapes without freezeFrameId are visible across the video or near their timestamp
      shouldRender = true;
    }
  }

  return { shouldRender, unifiedProgress, ffAlpha };
}

/**
 * Renders an individual shape on the target 2D canvas context.
 * Reuses the canonical drawing utilities from `src/utils/drawing.ts`,
 * `Polygon/polygonUtils.ts`, and `Scanner/scannerUtils.ts`.
 */
export function drawShapeOnContext(
  ctx: AnyCanvasContext,
  shape: Shape,
  scale: number,
  renderMode: 'full' | 'shadow' | 'body' = 'full',
  ffAlpha: number = 1,
  unifiedProgress?: number,
  sourceFrame?: CanvasImageSource | null,
  nowMs: number = Date.now()
): void {
  ctx.save();

  ctx.globalAlpha = ffAlpha;
  ctx.strokeStyle = shape.color;
  ctx.lineWidth = shape.strokeWidth / scale;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.fillStyle = shape.color;

  const { points, type } = shape;
  if (!points || points.length < 1) {
    ctx.restore();
    return;
  }

  const p1 = points[0];
  const p2 = points[points.length - 1];

  ctx.save();
  if (unifiedProgress !== undefined) {
    if (type === 'circle') {
      const actualProgress = Math.max(0, unifiedProgress);
      const effScale = actualProgress < 1 ? Math.max(0.0001, Math.pow(actualProgress, 0.5)) : 1;
      if (effScale < 1) {
        ctx.translate(p1.x, p1.y);
        ctx.scale(effScale, effScale);
        ctx.translate(-p1.x, -p1.y);
      }
    } else if (type === 'spotlight' && unifiedProgress < 1) {
      ctx.beginPath();
      ctx.rect(0, 0, 10000, 10000 * unifiedProgress);
      ctx.clip();
    }
  }

  const ringDefaultSize = 65;
  const ringTilt = shape.ringConfig?.tilt ?? 65;

  switch (type) {
    case 'pen': {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      if (shape.isDashed) {
        ctx.setLineDash([(shape.strokeWidth / scale) * 2, (shape.strokeWidth / scale) * 1.5]);
      }
      if (points.length < 2) {
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, (shape.strokeWidth / scale) / 2, 0, Math.PI * 2);
        ctx.fill();
      } else {
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        for (let i = 1; i < points.length - 2; i++) {
          const xc = (points[i].x + points[i + 1].x) / 2;
          const yc = (points[i].y + points[i + 1].y) / 2;
          ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc);
        }
        if (points.length > 2) {
          ctx.quadraticCurveTo(
            points[points.length - 2].x,
            points[points.length - 2].y,
            points[points.length - 1].x,
            points[points.length - 1].y
          );
        } else {
          ctx.lineTo(points[1].x, points[1].y);
        }
        ctx.stroke();

        if (shape.strokeWidth > 3) {
          ctx.shadowBlur = 0;
          ctx.strokeStyle = 'rgba(255,255,255,0.4)';
          ctx.lineWidth = (shape.strokeWidth / scale) * 0.3;
          ctx.stroke();
        }
      }
      ctx.restore();
      break;
    }

    case 'line': {
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 6;
      ctx.shadowOffsetY = 2;
      if (shape.isDashed) {
        ctx.setLineDash([(shape.strokeWidth / scale) * 2, (shape.strokeWidth / scale) * 1.5]);
      }
      ctx.beginPath();
      ctx.moveTo(p1.x, p1.y);
      ctx.lineTo(p2.x, p2.y);
      ctx.stroke();

      if (shape.strokeWidth > 3) {
        ctx.shadowBlur = 0;
        ctx.strokeStyle = 'rgba(255,255,255,0.4)';
        ctx.lineWidth = (shape.strokeWidth / scale) * 0.3;
        ctx.stroke();
      }
      ctx.restore();
      break;
    }

    case 'arrow': {
      if (shape.isFreehand) {
        drawFreehandArrow(
          ctx,
          points,
          shape.color,
          shape.strokeWidth / scale,
          shape.isDashed || false,
          shape.timestamp,
          false,
          unifiedProgress
        );
      } else if (shape.isCurved) {
        drawCurvedRun(
          ctx,
          points,
          shape.color,
          shape.strokeWidth / scale,
          shape.isDashed || false,
          shape.timestamp,
          false,
          unifiedProgress
        );
      } else {
        drawProArrow(
          ctx,
          p1,
          p2,
          shape.color,
          shape.strokeWidth / scale,
          shape.isDashed || false,
          shape.timestamp,
          false,
          unifiedProgress
        );
      }
      break;
    }

    case 'curved-arrow': {
      drawCurvedArrow(
        ctx,
        points,
        shape.color,
        shape.strokeWidth / scale,
        shape.isDashed || false,
        shape.timestamp,
        renderMode,
        unifiedProgress
      );
      break;
    }

    case 'curved-run-arrow': {
      drawCurvedRun(
        ctx,
        points,
        shape.color,
        shape.strokeWidth / scale,
        shape.isDashed || false,
        shape.timestamp,
        false,
        unifiedProgress
      );
      break;
    }

    case 'circle': {
      const radius =
        shape.ringConfig?.size ||
        (shape.points.length >= 2 ? Math.hypot(p2.x - p1.x, p2.y - p1.y) : ringDefaultSize);
      draw3DRing(
        ctx,
        p1.x,
        p1.y,
        radius,
        shape.color,
        ringTilt,
        shape.strokeWidth / scale,
        shape.timestamp || nowMs,
        false,
        shape.ringConfig,
        unifiedProgress
      );
      break;
    }

    case 'polygon': {
      if (shape.polygonConfig?.mode === 'radar' || shape.radarConfig) {
        drawRadar(ctx, shape, scale, renderMode, ffAlpha, unifiedProgress);
      } else {
        drawPolygon(ctx, shape, scale, renderMode, ffAlpha, unifiedProgress);
      }
      break;
    }

    case 'radar': {
      drawRadar(ctx, shape, scale, renderMode, ffAlpha, unifiedProgress);
      break;
    }

    case 'connected-circle': {
      if (shape.isClosed && shape.isFilled && points.length > 2) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.closePath();
        const gradient = ctx.createLinearGradient(
          points[0].x,
          points[0].y,
          points[2]?.x || points[0].x,
          points[2]?.y || points[0].y
        );
        gradient.addColorStop(0, fadeColor(shape.color, 0.4));
        gradient.addColorStop(1, fadeColor(shape.color, 0.1));
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
      }

      if (points.length > 1) {
        for (let i = 0; i < points.length - 1; i++) {
          const c1 = points[i];
          const c2 = points[i + 1];
          const startTime = c2.timestamp || shape.timestamp || 0;
          const pulseAge = Math.max(0, nowMs - startTime);
          drawTangentLine(
            ctx,
            c1,
            c2,
            c1.r || ringDefaultSize,
            c2.r || ringDefaultSize,
            shape.color,
            0,
            unifiedProgress !== undefined ? Math.max(0, unifiedProgress) : 1,
            pulseAge,
            false,
            ringTilt,
            shape.ringConfig
          );
        }
        if (shape.isClosed) {
          const last = points[points.length - 1];
          const first = points[0];
          const startTime = shape.timestamp || 0;
          const pulseAge = Math.max(0, nowMs - startTime);
          drawTangentLine(
            ctx,
            last,
            first,
            last.r || ringDefaultSize,
            first.r || ringDefaultSize,
            shape.color,
            0,
            unifiedProgress !== undefined ? Math.max(0, unifiedProgress) : 1,
            pulseAge,
            false,
            ringTilt,
            shape.ringConfig
          );
        }
      }

      points.forEach(p => {
        draw3DRing(
          ctx,
          p.x,
          p.y,
          p.r || ringDefaultSize,
          shape.color,
          ringTilt,
          shape.strokeWidth / scale,
          p.timestamp || shape.timestamp || nowMs,
          false,
          shape.ringConfig,
          unifiedProgress
        );
      });
      break;
    }

    case 'player-move': {
      if (shape.box && points.length >= 2) {
        const originCenter = points[0];
        const destCenter = points[1];
        const { w, h } = shape.box;
        if (shape.bgImg) {
          try {
            ctx.drawImage(shape.bgImg as any, shape.box.x, shape.box.y, w, h);
          } catch {
            // ignore
          }
        }
        const pmDuration = 800;
        const pmProgress = shape.timestamp ? Math.max(0, Math.min(1, (nowMs - shape.timestamp) / pmDuration)) : 1;
        const currentX = originCenter.x + (destCenter.x - originCenter.x) * pmProgress;
        const currentY = originCenter.y + (destCenter.y - originCenter.y) * pmProgress;
        const currentEnd = { x: currentX, y: currentY };

        ctx.beginPath();
        ctx.strokeStyle = shape.color;
        ctx.lineWidth = shape.strokeWidth / scale;
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 6;
        ctx.shadowOffsetY = 4;
        ctx.setLineDash([10, 10]);
        ctx.lineDashOffset = -((nowMs / 1000) * 40);
        ctx.moveTo(originCenter.x, originCenter.y);
        ctx.lineTo(currentEnd.x, currentEnd.y);
        ctx.stroke();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.setLineDash([]);

        if (pmProgress > 0.1) {
          drawArrowHead(ctx, originCenter, currentEnd, (shape.strokeWidth * 4) / scale);
        }

        if (shape.img) {
          ctx.save();
          ctx.shadowColor = 'rgba(0,0,0,0.8)';
          ctx.shadowBlur = 15;
          ctx.shadowOffsetY = 10;
          ctx.beginPath();
          ctx.ellipse(currentEnd.x, currentEnd.y + h / 2.5, w / 3, w / 8, 0, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(0,0,0,0.6)';
          ctx.fill();
          const bobbing = Math.sin(nowMs / 200) * 5;
          try {
            ctx.drawImage(shape.img as any, currentEnd.x - w / 2, currentEnd.y - h / 2 + bobbing, w, h);
          } catch {
            // ignore
          }
          ctx.restore();
        }
      }
      break;
    }

    case 'spotlight': {
      if (shape.spotlightConfig) {
        drawSpotlight(
          ctx,
          points[0].x,
          points[0].y,
          shape.spotlightConfig.size,
          shape.spotlightConfig.intensity,
          shape.spotlightConfig.rotation,
          shape.spotlightConfig.particles,
          shape.timestamp || nowMs
        );
      }
      break;
    }

    case 'name-tag': {
      if (shape.text || shape.playerNumber) {
        drawNameTag(
          ctx,
          points[0],
          shape.text || '',
          shape.color,
          scale,
          shape.timestamp || nowMs,
          shape.strokeWidth,
          false,
          unifiedProgress,
          shape.playerNumber || shape.nameTagConfig?.playerNumber,
          {
            uppercase: shape.nameTagConfig?.uppercase !== false,
            showNumber: shape.nameTagConfig?.showNumber !== false
          }
        );
      }
      break;
    }

    case 'text': {
      if (shape.text && shape.textConfig) {
        drawText(
          ctx,
          points[0],
          shape.text,
          shape.color,
          scale,
          shape.timestamp || nowMs,
          shape.textConfig,
          false,
          unifiedProgress
        );
      }
      break;
    }

    case 'scanner': {
      drawScanner(ctx, shape, scale, renderMode, ffAlpha, unifiedProgress, false);
      break;
    }
  }

  ctx.restore();
  ctx.restore();
}
