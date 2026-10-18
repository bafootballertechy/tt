import type { Point, Particle, Rect, Shape, FreezeFrame } from '../types';
import { fadeColor, adjustBrightness, shiftColor, getContrastColor } from './colors';

export type AnyCanvasContext = CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D;

export const createParticles = (count: number = 30): Particle[] => {
  const arr: Particle[] = [];
  for (let i = 0; i < count; i++) {
    arr.push({
      initialAngle: Math.random() * Math.PI * 2,
      speed: 0.002 + Math.random() * 0.003
    });
  }
  return arr;
};

export const drawArrowHead = (ctx: CanvasRenderingContext2D, from: Point, to: Point, size: number, isShadow: boolean = false) => {
  const angle = Math.atan2(to.y - from.y, to.x - from.x);
  ctx.beginPath();
  ctx.moveTo(to.x, to.y);
  ctx.lineTo(to.x - size * Math.cos(angle - Math.PI / 6), to.y - size * Math.sin(angle - Math.PI / 6));
  ctx.lineTo(to.x - size * Math.cos(angle + Math.PI / 6), to.y - size * Math.sin(angle + Math.PI / 6));
  ctx.lineTo(to.x, to.y);
  ctx.fill();
};

export const drawDashedLine = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, width: number = 2) => {
  ctx.save();
  ctx.beginPath();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.setLineDash([width * 2, width * 2]);
  ctx.moveTo(p1.x, p1.y);
  ctx.lineTo(p2.x, p2.y);
  ctx.stroke();
  ctx.restore();
};

export const drawLabel = (ctx: any, p: Point, text: string, scale: number) => {
  ctx.save();
  const fontSize = 11 / scale;
  ctx.font = `500 ${fontSize}px Inter, sans-serif`;
  const metrics = ctx.measureText(text);
  const paddingX = 8 / scale;
  const h = 22 / scale;
  const w = metrics.width + paddingX * 2;
  const x = p.x + (15 / scale);
  const y = p.y + (15 / scale);
  const radius = 4 / scale;
  
  ctx.shadowColor = 'rgba(0,0,0,0.2)';
  ctx.shadowBlur = 4 / scale;
  ctx.fillStyle = 'rgba(20, 20, 20, 0.85)';
  ctx.beginPath();
  if (ctx.roundRect) {
      ctx.roundRect(x, y, w, h, radius);
  } else {
      ctx.rect(x, y, w, h);
  }
  ctx.fill();
  
  ctx.strokeStyle = 'rgba(255,255,255,0.2)';
  ctx.lineWidth = 1 / scale;
  ctx.stroke();
  
  ctx.fillStyle = '#fff';
  ctx.textBaseline = 'middle';
  ctx.shadowBlur = 0;
  ctx.fillText(text, x + paddingX, y + h/2 + (1/scale));
  ctx.restore();
};

export const getShimmerGradient = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, isPreview: boolean) => {
    const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
    const shimmerSpeed = 0.001; 
    const shimmerOffset = (Date.now() * shimmerSpeed) % 2; 

    if (isPreview) {
        grad.addColorStop(0, fadeColor(color, 0.2));
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, fadeColor(color, 0.2));
    } else {
        const stop1 = Math.max(0, Math.min(1, shimmerOffset - 0.2));
        const stop2 = Math.max(0, Math.min(1, shimmerOffset));
        const stop3 = Math.max(0, Math.min(1, shimmerOffset + 0.2));
        grad.addColorStop(0, fadeColor(color, 0.6));
        if (stop2 > 0 && stop2 < 1) {
             grad.addColorStop(stop1, color);
             grad.addColorStop(stop2, '#ffffff'); 
             grad.addColorStop(stop3, color);
        } else {
             grad.addColorStop(0.5, color);
        }
        grad.addColorStop(1, fadeColor(color, 0.6));
    }
    return grad;
};

export const drawFreehandArrow = (ctx: CanvasRenderingContext2D, points: Point[], color: string, thickness: number, isDashed: boolean, timestamp: number, isPreview: boolean, animProgress?: number) => {
    if (points.length < 2) return;
    
    const pStart = points[0];
    const pEnd = points[points.length - 1];

    // 1. Calculate a stable angle by looking back along the path
    let pPrev = points.length > 1 ? points[points.length - 2] : pStart;
    for (let i = points.length - 2; i >= 0; i--) {
        if (Math.hypot(pEnd.x - points[i].x, pEnd.y - points[i].y) > 15) {
            pPrev = points[i];
            break;
        }
    }
    const angle = Math.atan2(pEnd.y - pPrev.y, pEnd.x - pPrev.x);

    // 2. Head dimensions
    const headSize = Math.max(thickness * 3.5, 16); 
    const headLength = headSize * 0.9;
    const shortenDist = headLength * Math.cos(Math.PI / 6) * 0.85;

    // 3. Collect points for the line body, stopping before the arrowhead
    const pathPoints: Point[] = [];
    for (let i = 0; i < points.length; i++) {
        const dEnd = Math.hypot(pEnd.x - points[i].x, pEnd.y - points[i].y);
        if (dEnd > shortenDist) {
            pathPoints.push(points[i]);
        }
    }
    
    // Fallback if path is very short
    if (pathPoints.length === 0) pathPoints.push(pStart);
    
    // Add the exact explicit cutoff point
    const lineEndX = pEnd.x - Math.cos(angle) * shortenDist;
    const lineEndY = pEnd.y - Math.sin(angle) * shortenDist;
    pathPoints.push({ x: lineEndX, y: lineEndY });

    const makePath = () => {
        if (pathPoints.length === 0) return;
        ctx.moveTo(pathPoints[0].x, pathPoints[0].y);
        for (let i = 1; i < pathPoints.length - 2; i++) {
            const xc = (pathPoints[i].x + pathPoints[i + 1].x) / 2;
            const yc = (pathPoints[i].y + pathPoints[i + 1].y) / 2;
            ctx.quadraticCurveTo(pathPoints[i].x, pathPoints[i].y, xc, yc);
        }
        if (pathPoints.length > 2) {
            ctx.quadraticCurveTo(
                pathPoints[pathPoints.length - 2].x, 
                pathPoints[pathPoints.length - 2].y, 
                pathPoints[pathPoints.length - 1].x, 
                pathPoints[pathPoints.length - 1].y
            );
        } else if (pathPoints.length === 2) {
            ctx.lineTo(pathPoints[1].x, pathPoints[1].y);
        }
    };

    const drawHead = (isShadow: boolean) => {
        const tipX = pEnd.x;
        const tipY = pEnd.y;
        const barb1x = tipX - headLength * Math.cos(angle - Math.PI / 6);
        const barb1y = tipY - headLength * Math.sin(angle - Math.PI / 6);
        const barb2x = tipX - headLength * Math.cos(angle + Math.PI / 6);
        const barb2y = tipY - headLength * Math.sin(angle + Math.PI / 6);
        
        ctx.beginPath();
        ctx.moveTo(barb1x, barb1y);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(barb2x, barb2y);
        ctx.closePath();
        
        if (isShadow) {
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fill();
        } else {
            const grad = ctx.createLinearGradient(barb1x, barb1y, barb2x, barb2y);
            grad.addColorStop(0, adjustBrightness(color, 20));
            grad.addColorStop(0.5, color);
            grad.addColorStop(1, shiftColor(color, -20));
            ctx.fillStyle = grad;
            ctx.fill();
            ctx.strokeStyle = adjustBrightness(color, 40);
            ctx.lineWidth = Math.max(1, thickness * 0.2);
            ctx.stroke();
        }
    };

    // Draw Ground Shadow
    if (!isPreview) {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = thickness;
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = Math.max(4, thickness); 
        ctx.beginPath();
        makePath();
        ctx.stroke();
        
        drawHead(true);
        ctx.restore();
    }

    // Draw Main Body
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = thickness;
    
    ctx.strokeStyle = getShimmerGradient(ctx, pStart, pEnd, color, isPreview);
    if (isDashed) ctx.setLineDash([thickness * 2, thickness * 1.5]);
    if (!isPreview) { ctx.shadowColor = color; ctx.shadowBlur = 12; }
    
    ctx.beginPath();
    makePath();
    ctx.stroke();
    
    // Inner Highlight
    if (!isDashed && thickness > 3) {
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = thickness * 0.3;
      ctx.translate(-thickness * 0.15, -thickness * 0.15); 
      ctx.beginPath();
      makePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.setLineDash([]);
    ctx.shadowBlur = 0;
    drawHead(false);
    ctx.restore();
};

export const drawProArrow = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, thickness: number, isDashed: boolean, timestamp: number, isPreview: boolean = false, animProgress?: number) => {
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const angle = Math.atan2(dy, dx);
    const length = Math.sqrt(dx*dx + dy*dy);
    const duration = 500; 
    const age = isPreview ? duration : (Date.now() - timestamp);
    const progress = animProgress !== undefined ? Math.max(0, animProgress) : Math.max(0, Math.min(1, age / duration));
    if (length < 1) return;
    const currentLength = length * progress;
    const currentEndX = p1.x + Math.cos(angle) * currentLength;
    const currentEndY = p1.y + Math.sin(angle) * currentLength;
    const headSize = Math.max(thickness * 3, 15); 
    const headLength = headSize * 0.9;
    const shortenDist = headLength * Math.cos(Math.PI / 6) * 0.85;
    let lineEndX = currentEndX;
    let lineEndY = currentEndY;
    const hasHead = currentLength > shortenDist || isPreview;
    if (hasHead) {
        lineEndX = currentEndX - Math.cos(angle) * shortenDist;
        lineEndY = currentEndY - Math.sin(angle) * shortenDist;
    }
    
    // Draw Ground Shadow
    if (!isPreview) {
        ctx.save();
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = thickness;
        if (isDashed) {
            ctx.setLineDash([thickness * 2, thickness * 1.5]);
            ctx.lineDashOffset = -((Date.now() / 1000) * 40);
        }
        ctx.strokeStyle = 'rgba(0,0,0,0.4)';
        ctx.shadowColor = 'rgba(0,0,0,0.6)';
        ctx.shadowBlur = 8;
        ctx.shadowOffsetY = Math.max(4, thickness); // Drop shadow down giving height
        ctx.beginPath();
        ctx.moveTo(p1.x, p1.y);
        if (currentLength > 0) { ctx.lineTo(lineEndX, lineEndY); ctx.stroke(); }
        if (hasHead) {
            const tipX = currentEndX;
            const tipY = currentEndY;
            const barb1x = tipX - headLength * Math.cos(angle - Math.PI / 6);
            const barb1y = tipY - headLength * Math.sin(angle - Math.PI / 6);
            const barb2x = tipX - headLength * Math.cos(angle + Math.PI / 6);
            const barb2y = tipY - headLength * Math.sin(angle + Math.PI / 6);
            ctx.setLineDash([]);
            ctx.beginPath();
            ctx.moveTo(barb1x, barb1y);
            ctx.lineTo(tipX, tipY);
            ctx.lineTo(barb2x, barb2y);
            ctx.closePath();
            ctx.fillStyle = 'rgba(0,0,0,0.4)';
            ctx.fill();
        }
        ctx.restore();
    }

    // Draw Main Body
    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.strokeStyle = getShimmerGradient(ctx, p1, {x: currentEndX, y: currentEndY}, color, isPreview);
    ctx.lineWidth = thickness;
    if (isDashed) {
        ctx.setLineDash([thickness * 2, thickness * 1.5]);
        ctx.lineDashOffset = -((Date.now() / 1000) * 40);
    }
    if (!isPreview) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    if (currentLength > 0) { ctx.lineTo(lineEndX, lineEndY); ctx.stroke(); }
    
    // Draw Inner Highlight to give cylindrical depth
    if (!isDashed && currentLength > 0 && thickness > 3) {
      ctx.save();
      ctx.shadowBlur = 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.4)';
      ctx.lineWidth = thickness * 0.3;
      ctx.beginPath();
      // small offset towards top-left to simulate light
      ctx.moveTo(p1.x - Math.sin(angle)*thickness*0.2, p1.y + Math.cos(angle)*thickness*0.2);
      ctx.lineTo(lineEndX - Math.sin(angle)*thickness*0.2, lineEndY + Math.cos(angle)*thickness*0.2);
      ctx.stroke();
      ctx.restore();
    }

    ctx.shadowBlur = 0;
    ctx.setLineDash([]);
    
    if (hasHead) {
        const tipX = currentEndX;
        const tipY = currentEndY;
        const barb1x = tipX - headLength * Math.cos(angle - Math.PI / 6);
        const barb1y = tipY - headLength * Math.sin(angle - Math.PI / 6);
        const barb2x = tipX - headLength * Math.cos(angle + Math.PI / 6);
        const barb2y = tipY - headLength * Math.sin(angle + Math.PI / 6);
        
        ctx.beginPath();
        ctx.moveTo(barb1x, barb1y);
        ctx.lineTo(tipX, tipY);
        ctx.lineTo(barb2x, barb2y);
        ctx.closePath();
        
        // Gradient for arrow head to give it a 3D bevel
        const grad = ctx.createLinearGradient(barb1x, barb1y, barb2x, barb2y);
        grad.addColorStop(0, adjustBrightness(color, 20));
        grad.addColorStop(0.5, color);
        grad.addColorStop(1, shiftColor(color, -20));
        
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.strokeStyle = adjustBrightness(color, 40); 
        ctx.lineWidth = Math.max(1, thickness * 0.2);
        ctx.stroke();
    }
    ctx.restore();
};

export const draw3DRing = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, tiltDegrees: number, strokeWidth: number, timestamp: number, isGhost: boolean = false, config: any = {}, unifiedProgress?: number) => {
  if (radius < 1) return;
  const now = Date.now();
  const timeElapsed = isGhost ? now : (now - timestamp);
  
  const outlineColor = typeof config === 'string' ? config : (config?.outlineColor || '#ffffff');
  const secondaryRing = typeof config === 'object' ? config?.secondaryRing : false;
  const secondaryColor = typeof config === 'object' ? (config?.secondaryColor || '#ffffff') : '#ffffff';

  
  let scaleEnt = 1;
  let alphaEnt = 1;
  if (unifiedProgress !== undefined) {
      const p = Math.max(0, Math.min(1, unifiedProgress));
      alphaEnt = p;
      if (p < 0.6) {
          scaleEnt = 0.3 + 0.78 * (p / 0.6);
      } else {
          scaleEnt = 1.08 - 0.08 * ((p - 0.6) / 0.4);
      }
  } else {
      const entSpeed = 500;
      if (!isGhost && timeElapsed < entSpeed) {
          const p = timeElapsed / entSpeed;
          alphaEnt = p;
          if (p < 0.6) {
              scaleEnt = 0.3 + 0.78 * (p / 0.6);
          } else {
              scaleEnt = 1.08 - 0.08 * ((p - 0.6) / 0.4);
          }
      }
  }


  const tiltRad = (tiltDegrees * Math.PI) / 180;
  const scaleY = Math.max(0.1, Math.cos(tiltRad)); 
  
  const outerR1 = radius;
  const innerR1 = radius * 0.65;
  
  const cA = color;
  const cB = shiftColor(color, -20);
  const cC = shiftColor(color, -10);

  const fadeHex = (hex: string, alpha: number) => {
     let hr=parseInt(hex.slice(1,3), 16), hg=parseInt(hex.slice(3,5), 16), hb=parseInt(hex.slice(5,7), 16);
     if (isNaN(hr)) return hex; // fast fallback if color is named
     return `rgba(${hr},${hg},${hb},${alpha})`;
  };

  const donutPathPrimary = () => {
      ctx.beginPath();
      // Primary solid ring
      ctx.arc(0, 0, outerR1, 0, Math.PI * 2);
      ctx.arc(0, 0, innerR1, Math.PI * 2, 0, true);
      ctx.closePath();
  };

  ctx.save();
  ctx.translate(x, y);
  ctx.scale(scaleEnt, scaleEnt * scaleY); 
  ctx.globalAlpha = Math.max(0, Math.min(1, alphaEnt * (isGhost ? 0.7 : 1.0)));

  const depthSize = 4 * (1 - scaleY); // 3D walls

  // Custom outline underlay (3D aware)
  if (strokeWidth > 0 && !isGhost) {
      ctx.save();
      const sOuter = outerR1 + strokeWidth;
      const sInner = Math.max(0.1, innerR1 - strokeWidth);
      const sDepth = depthSize + strokeWidth;
      
      const outlinePath = () => {
          ctx.beginPath();
          ctx.arc(0, 0, sOuter, 0, Math.PI * 2);
          ctx.arc(0, 0, sInner, Math.PI * 2, 0, true);
          ctx.closePath();
      };
      
      ctx.fillStyle = outlineColor;
      if (depthSize > 0.5) {
          const step = Math.max(0.2, scaleY); // Dynamic step based on scale to prevent gaps
          for (let d = sDepth; d >= -strokeWidth; d -= step) {
              ctx.save();
              ctx.translate(0, d / scaleY);
              outlinePath();
              ctx.fill('evenodd');
              ctx.restore();
          }
      } else {
          outlinePath();
          ctx.fill('evenodd');
      }
      ctx.restore();
  }

  // Depth rendering (extrusion)
  if (depthSize > 0.5) {
    ctx.save();
    ctx.fillStyle = fadeHex(shiftColor(color, -40), 0.95);
    ctx.shadowBlur = 0;
    
    // Draw slices to create the cylinder walls
    const step = Math.max(0.2, scaleY);
    for (let d = depthSize; d > 0; d -= step) {
        ctx.save();
        ctx.translate(0, d / scaleY);
        donutPathPrimary();
        ctx.fill('evenodd');
        ctx.restore();
    }
    
    // Bottom edge accent
    ctx.save();
    ctx.translate(0, depthSize / scaleY);
    donutPathPrimary();
    ctx.strokeStyle = fadeHex(shiftColor(color, -60), 0.6);
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  // Outer shadow
  ctx.shadowColor = fadeHex(cA, 0.4);
  ctx.shadowBlur = 12;
  ctx.shadowOffsetY = 0;

  ctx.save();
  try {
      const spinDuration = 2500;
      // We vary spin duration slightly per ring
      const speedVariation = 0.8 + ((timestamp % 1000) / 1000) * 0.6;
      const actualDuration = spinDuration / speedVariation;
      
      const spinOffset1 = (now % actualDuration) / actualDuration;
      
      // Gradient
      const grad1 = ctx.createConicGradient(spinOffset1 * Math.PI * 2, 0, 0);
      grad1.addColorStop(0, cA);
      grad1.addColorStop(0.4, cB);
      grad1.addColorStop(0.7, cC);
      grad1.addColorStop(1, cA);
      
      ctx.fillStyle = grad1;
      donutPathPrimary();
      ctx.fill('evenodd');

  } catch(e) { 
      ctx.fillStyle = cA; 
      donutPathPrimary();
      ctx.fill('evenodd');
  }
  ctx.restore();

  // Highlight stroke at the edges
  ctx.save();
  donutPathPrimary();
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1.5;
  ctx.stroke();
  ctx.restore();

  // Secondary segmented ring
  if (secondaryRing) {
      const gap = radius * 0.08;
      const rSecOuter = innerR1 - gap; 
      const rSecInner = Math.max(0.01, rSecOuter - (radius * 0.18));
      
      const count = 4;
      const gapAngle = Math.PI / 6; // Space between segments
      const segmentAngle = (Math.PI * 2) / count;
      
      // Counter-rotating
      const spinDuration = 6000;
      const speedVariation = 0.8 + ((timestamp % 1000) / 1000) * 0.6;
      const actualDuration = spinDuration / speedVariation;
      const spinOffset2 = (now % actualDuration) / actualDuration;
      const rotation = -spinOffset2 * Math.PI * 2;
      
      const buildSecondaryPath = () => {
          ctx.beginPath();
          for (let i = 0; i < count; i++) {
              const start = rotation + i * segmentAngle + gapAngle/2;
              const end = rotation + (i + 1) * segmentAngle - gapAngle/2;
              ctx.moveTo(Math.cos(start) * rSecOuter, Math.sin(start) * rSecOuter);
              ctx.arc(0, 0, rSecOuter, start, end, false);
              ctx.arc(0, 0, rSecInner, end, start, true);
              ctx.closePath();
          }
      };

      // Extrusion for 3D depth of secondary ring
      if (depthSize > 0.5) {
          ctx.save();
          ctx.fillStyle = fadeHex(shiftColor(secondaryColor, -40), 0.95);
          const step = Math.max(0.2, scaleY);
          for (let d = depthSize; d > 0; d -= step) {
              ctx.save();
              ctx.translate(0, d / scaleY);
              buildSecondaryPath();
              ctx.fill();
              ctx.restore();
          }
          ctx.save();
          ctx.translate(0, depthSize / scaleY);
          buildSecondaryPath();
          ctx.strokeStyle = fadeHex(shiftColor(secondaryColor, -60), 0.6);
          ctx.lineWidth = 1;
          ctx.stroke();
          ctx.restore();
          ctx.restore();
      }

      // Top surface of secondary ring
      ctx.save();
      const gradSec = ctx.createConicGradient(rotation, 0, 0);
      gradSec.addColorStop(0, fadeHex(secondaryColor, 0.9));
      gradSec.addColorStop(0.5, fadeHex(shiftColor(secondaryColor, 30), 1));
      gradSec.addColorStop(1, fadeHex(secondaryColor, 0.9));
      
      ctx.fillStyle = gradSec; 
      buildSecondaryPath();
      ctx.fill();
      
      // Sharp highlights on edges
      ctx.strokeStyle = 'rgba(255,255,255,0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Additional thin rotating sync circle marker inside
      ctx.beginPath();
      ctx.arc(0, 0, Math.max(0.01, rSecInner - radius * 0.05), 0, Math.PI * 2);
      ctx.strokeStyle = fadeHex(secondaryColor, 0.4);
      ctx.lineWidth = 1.5;
      ctx.setLineDash([4, 6]);
      ctx.lineDashOffset = -rotation * rSecInner;
      ctx.stroke();
      
      ctx.restore();
  }

  ctx.restore();
};

export const drawSpotlight = (ctx: CanvasRenderingContext2D, x: number, y: number, size: number, intensity: number, rotation: number, particles: Particle[], timestamp: number, isGhost: boolean = false) => {
    const now = Date.now();
    const alpha = isGhost ? 0.4 : 1.0;
    const beamWidth = size;
    const topY = 0;
    const bottomY = y;

    ctx.save();
    const wipeDuration = 600;
    const wipeProgress = isGhost ? 1 : (timestamp ? Math.min(1, Math.max(0, now - timestamp) / wipeDuration) : 1);
    if (wipeProgress < 1) {
        ctx.beginPath();
        const yMax = bottomY + size * 1.5;
        ctx.rect(-99999, -99999, 199998, 99999 + yMax * wipeProgress);
        ctx.clip();
    }

    ctx.save();
    const grad = ctx.createLinearGradient(x, topY, x, bottomY);
    grad.addColorStop(0, `rgba(255,255,255,0)`);
    grad.addColorStop(0.5, `rgba(255,255,255,${intensity * 0.25 * alpha})`);
    grad.addColorStop(1, `rgba(255,255,255,${0.05 * alpha})`);
    ctx.fillStyle = grad;
    ctx.beginPath(); ctx.moveTo(x - beamWidth / 4, topY); ctx.lineTo(x + beamWidth / 4, topY); ctx.lineTo(x + beamWidth / 2, bottomY); ctx.lineTo(x - beamWidth / 2, bottomY); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.save();
    ctx.translate(x, bottomY);
    ctx.scale(1, rotation); 
    const ringRadius = beamWidth / 2;
    const ringGrad = ctx.createRadialGradient(0, 0, ringRadius * 0.3, 0, 0, ringRadius * 1.3);
    ringGrad.addColorStop(0, `rgba(255,255,255,${0.9 * alpha})`);
    ringGrad.addColorStop(0.6, `rgba(255,255,255,${0.3 * alpha})`);
    ringGrad.addColorStop(1, `rgba(255,255,255,0)`);
    ctx.fillStyle = ringGrad;
    ctx.beginPath(); ctx.arc(0, 0, ringRadius * 1.2, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = `rgba(255,255,255,${0.2 * intensity * alpha})`; 
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, ringRadius, 0, Math.PI * 2); ctx.stroke();
    if (!isGhost) {
        const timeDelta = now - timestamp;
        for (let i = 0; i < particles.length; i++) {
            const p = particles[i];
            const currentAngle = p.initialAngle + (timeDelta * p.speed);
            const px = Math.cos(currentAngle) * ringRadius;
            const py = Math.sin(currentAngle) * ringRadius; 
            const flicker = 0.5 + 0.5 * Math.sin(timeDelta * 0.005 + i);
            ctx.fillStyle = `rgba(255,255,255,${0.6 * flicker})`;
            ctx.beginPath(); ctx.arc(px, py, 2, 0, Math.PI * 2); ctx.fill();
        }
    }
    ctx.restore();
    ctx.restore(); // Restore global wipe clip
};

export const drawTangentLine = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, r1: number, r2: number, color: string, strokeWidth: number, progress: number, pulseAge: number = 0, isGhost: boolean = false, tiltDegrees: number = 65, config: any = {}) => {
    const outlineColor = typeof config === 'string' ? config : (config?.outlineColor || '#ffffff');
    const dx = p2.x - p1.x;
    const dy = p2.y - p1.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    // Prevent backwards extra line when points overlap
    if (dist <= (r1 + r2) * 0.8) return;
    const ux = dx / dist; const uy = dy / dist;
    
    const tiltRad = (tiltDegrees * Math.PI) / 180;
    const scaleY = Math.max(0.1, Math.cos(tiltRad)); 
    const depthSize = 4 * (1 - scaleY); // Reduced 3D walls
    
    // Calculate effective radius of the ellipse in the connecting direction
    const r1Eff = (r1 * scaleY) / Math.sqrt(scaleY * scaleY * ux * ux + uy * uy);
    const r2Eff = (r2 * scaleY) / Math.sqrt(scaleY * scaleY * ux * ux + uy * uy);

    // Connect from edge to edge of the rings
    // inner hole of new ring is r * 0.65. Connect from slightly inside the ring's outer bound
        const connectInset = 0.95;
    let startX = p1.x + ux * (r1Eff * connectInset); let startY = p1.y + uy * (r1Eff * connectInset);
    let endX = p2.x - ux * (r2Eff * connectInset); let endY = p2.y - uy * (r2Eff * connectInset);
    
    if (progress < 1) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        startX = midX - ((midX - startX) * progress);
        startY = midY - ((midY - startY) * progress);
        endX = midX + ((endX - midX) * progress);
        endY = midY + ((endY - midY) * progress);
    }

    
    ctx.save();
    const connThickness = Math.max(2.5, Math.min(r1 * 0.14, 5.5)); // Adjusted connector thickness
    
    const fadeHex = (hex: string, alpha: number) => {
       let hr=parseInt(hex.slice(1,3), 16), hg=parseInt(hex.slice(3,5), 16), hb=parseInt(hex.slice(5,7), 16);
       if (isNaN(hr)) return hex;
       return `rgba(${hr},${hg},${hb},${alpha})`;
    };
    
    // Outline underlay (3D aware)
    if (strokeWidth > 0) {
        ctx.save();
        ctx.strokeStyle = outlineColor;
        ctx.lineWidth = connThickness + strokeWidth * 2;
        ctx.lineCap = 'round';
        const sDepth = Math.max(0, depthSize) + strokeWidth;
        
        if (depthSize > 1) {
            const step = Math.max(0.2, scaleY);
            for (let d = sDepth; d >= -strokeWidth; d -= step) {
                const shiftY = d;
                ctx.beginPath();
                ctx.moveTo(startX, startY + shiftY);
                ctx.lineTo(endX, endY + shiftY);
                ctx.stroke();
            }
        } else {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(endX, endY);
            ctx.stroke();
        }
        ctx.restore();
    }

    ctx.beginPath();
    // Drop shadow for volumetric feel
    ctx.shadowColor = 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = 4;
    ctx.shadowOffsetY = 2;
    
    // Core line
    const grad = ctx.createLinearGradient(startX, startY, endX, endY);
    grad.addColorStop(0, adjustBrightness(color, -10)); 
    grad.addColorStop(0.5, color); 
    grad.addColorStop(1, adjustBrightness(color, -10));
    ctx.strokeStyle = grad;
    ctx.lineWidth = connThickness;
    ctx.lineCap = 'round';
    
    if (pulseAge > 0) {
        const pulse = Math.sin((pulseAge / 500)); 
        ctx.globalAlpha = 0.8 + 0.2 * pulse;
        ctx.shadowColor = fadeColor(color, 0.4);
        ctx.shadowBlur = 6 + 4*pulse;
    }
    
    // Draw 3D depth slices
    if (depthSize > 1) {
        ctx.save();
        ctx.shadowBlur = 0;
        ctx.shadowOffsetY = 0;
        ctx.strokeStyle = fadeHex(shiftColor(color, -40), 0.95);
        
        const step = Math.max(0.2, scaleY);
        for (let d = depthSize; d > 0; d -= step) {
            const shiftY = d;
            ctx.beginPath();
            ctx.moveTo(startX, startY + shiftY);
            ctx.lineTo(endX, endY + shiftY);
            ctx.stroke();
        }
        
        // Bottom edge accent
        ctx.strokeStyle = fadeHex(shiftColor(color, -60), 0.6);
        ctx.beginPath();
        const bottomShiftY = depthSize;
        ctx.moveTo(startX, startY + bottomShiftY);
        ctx.lineTo(endX, endY + bottomShiftY);
        ctx.stroke();
        ctx.restore();
    }

    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();

    // Optional specular reflection right down the middle
    ctx.shadowBlur = 0;
    ctx.shadowOffsetY = 0;
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = connThickness * 0.3;
    ctx.moveTo(startX, startY);
    ctx.lineTo(endX, endY);
    ctx.stroke();
    
    ctx.restore();
};

export const drawCurvedRun = (ctx: CanvasRenderingContext2D, points: Point[], color: string, thickness: number, isDashed: boolean, timestamp: number, isPreview: boolean, animProgress?: number) => {
    if (points.length < 2) return;
    const p1 = points[0];
    const p2 = points[1];
    
    let cpx: number, cpy: number;
    if (points.length >= 3) {
        const apex = points[2];
        cpx = 2 * apex.x - 0.5 * p1.x - 0.5 * p2.x;
        cpy = 2 * apex.y - 0.5 * p1.y - 0.5 * p2.y;
    } else {
        const dx = p2.x - p1.x; const dy = p2.y - p1.y; const dist = Math.sqrt(dx*dx + dy*dy);
        const mx = (p1.x + p2.x) / 2; const my = (p1.y + p2.y) / 2;
        const arcHeight = dist * 0.15; 
        const apexX = mx;
        const apexY = my - arcHeight;
        cpx = 2 * apexX - 0.5 * p1.x - 0.5 * p2.x;
        cpy = 2 * apexY - 0.5 * p1.y - 0.5 * p2.y;
    }

    const angle = Math.atan2(p2.y - cpy, p2.x - cpx);
    const headSize = Math.max(thickness * 3, 15);
    const headLength = headSize * 0.9;
    const shortenDist = headLength * Math.cos(Math.PI / 6) * 0.85;
    const lineX = p2.x - Math.cos(angle) * shortenDist;
    const lineY = p2.y - Math.sin(angle) * shortenDist;

    ctx.save();
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.lineWidth = thickness;
    
    if (isDashed) {
        ctx.setLineDash([thickness * 2, thickness * 1.5]);
        ctx.lineDashOffset = -((Date.now() / 1000) * 40);
    }
    
    ctx.strokeStyle = getShimmerGradient(ctx, p1, {x: lineX, y: lineY}, color, isPreview);
    
    if (!isPreview) { 
        // Flat on pitch shadow
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)'; 
        ctx.shadowBlur = Math.max(2, thickness * 0.5); 
        ctx.shadowOffsetY = Math.max(1, thickness * 0.2);
    }
    
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.quadraticCurveTo(cpx, cpy, lineX, lineY);
    ctx.stroke();

    ctx.setLineDash([]);
    
    const barb1x = p2.x - headLength * Math.cos(angle - Math.PI / 6);
    const barb1y = p2.y - headLength * Math.sin(angle - Math.PI / 6);
    const barb2x = p2.x - headLength * Math.cos(angle + Math.PI / 6);
    const barb2y = p2.y - headLength * Math.sin(angle + Math.PI / 6);
    
    ctx.beginPath();
    ctx.moveTo(barb1x, barb1y);
    ctx.lineTo(p2.x, p2.y);
    ctx.lineTo(barb2x, barb2y);
    ctx.closePath();
    
    // Flat color for arrowhead to stay on pitch
    ctx.fillStyle = color;
    ctx.fill();
    
    ctx.restore();
};

export const drawCurvedArrow = (ctx: CanvasRenderingContext2D, points: Point[], color: string, width: number, isDashed: boolean, timestamp: number, renderMode: 'full' | 'shadow' | 'body' = 'full', animProgress?: number) => {
    const now = Date.now();
    const duration = 600;
    const progress = animProgress !== undefined ? Math.max(0, animProgress) : (timestamp > 0 ? Math.max(0, Math.min(1, (now - timestamp) / duration)) : 1);
    if (points.length < 2) return;
    const p1 = points[0];
    const p2 = points[1];
    
    let cpx: number, cpy: number;
    if (points.length >= 3) {
        const apex = points[2];
        cpx = 2 * apex.x - 0.5 * p1.x - 0.5 * p2.x;
        cpy = 2 * apex.y - 0.5 * p1.y - 0.5 * p2.y;
    } else {
        const dx = p2.x - p1.x; const dy = p2.y - p1.y; const dist = Math.sqrt(dx*dx + dy*dy);
        const mx = (p1.x + p2.x) / 2; const my = (p1.y + p2.y) / 2;
        const arcHeight = dist * 0.15; 
        const apexX = mx;
        const apexY = my - arcHeight;
        cpx = 2 * apexX - 0.5 * p1.x - 0.5 * p2.x;
        cpy = 2 * apexY - 0.5 * p1.y - 0.5 * p2.y;
    }
    const dx = p2.x - p1.x; const dy = p2.y - p1.y; const dist = Math.sqrt(dx*dx + dy*dy);
    if (dist < 2) return;
    
    // Calculate shortened line end
    const angle = Math.atan2(p2.y - cpy, p2.x - cpx);
    const headSize = width * 4.5;
    const headLength = headSize * 0.9;
    const shortenDist = headLength * Math.cos(Math.PI / 6) * 0.85;
    const lineX = p2.x - Math.cos(angle) * shortenDist;
    const lineY = p2.y - Math.sin(angle) * shortenDist;
    
    // Draw Ground Shadow
    if (renderMode === 'full' || renderMode === 'shadow') {
        ctx.save();
        if (isDashed && progress < 1) {
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, dist * progress * 1.5, 0, Math.PI * 2);
            ctx.clip();
        }
        ctx.beginPath(); 
        ctx.strokeStyle = 'rgba(0,0,0,0.4)'; 
        ctx.lineWidth = width; 
        ctx.shadowBlur = Math.max(10, width * 1.5); 
        // No Y offset since it's on the ground directly
        ctx.shadowOffsetY = 0; 
        ctx.shadowColor = 'rgba(0,0,0,0.6)'; 
        ctx.lineCap = 'round';
        const groundAngle = Math.atan2(p2.y - p1.y, p2.x - p1.x);
        const groundLineX = p2.x - Math.cos(groundAngle) * shortenDist;
        const groundLineY = p2.y - Math.sin(groundAngle) * shortenDist;
        if (isDashed) {
            ctx.setLineDash([width * 2, width * 1.5]);
            ctx.lineDashOffset = -((Date.now() / 1000) * 40);
        }
        else { ctx.setLineDash([dist]); ctx.lineDashOffset = dist * (1 - progress); }
        ctx.moveTo(p1.x, p1.y); 
        ctx.lineTo(groundLineX, groundLineY); 
        ctx.stroke();
        
        if (progress > 0.9) { 
            ctx.setLineDash([]); 
            ctx.fillStyle = 'rgba(0,0,0,0.4)'; 
            ctx.shadowBlur = 8; 
            ctx.shadowOffsetY = 0;
            
            // Draw 3D-oriented arrowhead for the shadow, mimicking the main arrow's head shape
            const tipX = p2.x; const tipY = p2.y;
            const barb1x = tipX - headSize * Math.cos(angle - Math.PI / 6);
            const barb1y = tipY - headSize * Math.sin(angle - Math.PI / 6);
            const barb2x = tipX - headSize * Math.cos(angle + Math.PI / 6);
            const barb2y = tipY - headSize * Math.sin(angle + Math.PI / 6);
            
            ctx.beginPath(); 
            ctx.moveTo(barb1x, barb1y); 
            ctx.lineTo(tipX, tipY); 
            ctx.lineTo(barb2x, barb2y); 
            ctx.closePath();
            ctx.fill();
        }
        ctx.restore();
    }
    
    // Draw 3D Body
    if (renderMode === 'full' || renderMode === 'body') {
        ctx.save();
        if (isDashed && progress < 1) {
            ctx.beginPath();
            ctx.arc(p1.x, p1.y, dist * progress * 1.5, 0, Math.PI * 2);
            ctx.clip();
        }
        ctx.strokeStyle = getShimmerGradient(ctx, p1, p2, color, timestamp === 0);
        ctx.lineWidth = width; ctx.lineCap = 'round';
        // Add glow
        if (timestamp === 0) { ctx.shadowColor = color; ctx.shadowBlur = 15; }
        
        const arcLen = dist * 1.2;
        if (isDashed) {
            ctx.setLineDash([width * 2, width * 1.5]);
            ctx.lineDashOffset = -((Date.now() / 1000) * 40);
        }
        else { ctx.setLineDash([arcLen]); ctx.lineDashOffset = arcLen * (1 - progress); }
        ctx.beginPath(); ctx.moveTo(p1.x, p1.y); ctx.quadraticCurveTo(cpx, cpy, lineX, lineY); ctx.stroke();
        
        ctx.shadowBlur = 0;
        
        // Inner highlight
        if (!isDashed && progress > 0.1 && width > 3) {
            ctx.save();
            ctx.strokeStyle = 'rgba(255,255,255,0.4)';
            ctx.lineWidth = width * 0.3;
            ctx.beginPath(); ctx.moveTo(p1.x, p1.y - width * 0.2); ctx.quadraticCurveTo(cpx, cpy - width * 0.2, lineX, lineY - width * 0.2); ctx.stroke();
            ctx.restore();
        }

        if (progress > 0.8) {
            ctx.setLineDash([]);
            const tipX = p2.x; const tipY = p2.y;
            const barb1x = tipX - headSize * Math.cos(angle - Math.PI / 6);
            const barb1y = tipY - headSize * Math.sin(angle - Math.PI / 6);
            const barb2x = tipX - headSize * Math.cos(angle + Math.PI / 6);
            const barb2y = tipY - headSize * Math.sin(angle + Math.PI / 6);
            
            ctx.beginPath(); ctx.moveTo(barb1x, barb1y); ctx.lineTo(tipX, tipY); ctx.lineTo(barb2x, barb2y); ctx.closePath();
            
            // 3D Bevel Gradient for arrow head
            const grad = ctx.createLinearGradient(barb1x, barb1y, barb2x, barb2y);
            grad.addColorStop(0, adjustBrightness(color, 20));
            grad.addColorStop(0.5, color);
            grad.addColorStop(1, shiftColor(color, -20));
            ctx.fillStyle = grad; 
            ctx.fill();
            
            ctx.strokeStyle = adjustBrightness(color, 40); ctx.lineWidth = Math.max(1, width * 0.2); ctx.stroke();
        }
        ctx.restore();
    }
};

export const drawLens = (ctx: AnyCanvasContext, center: Point, radius: number, zoom: number, video: CanvasImageSource, scale: number, timestamp: number, isGhost: boolean = false) => {
    const radiusVideo = radius / scale;
    const sourceW = (radiusVideo * 2) / zoom;
    const sourceH = sourceW;
    const sourceX = center.x - sourceW / 2;
    const sourceY = center.y - sourceH / 2;
    
    const popDuration = 400; // 400ms for pop
    const age = timestamp ? Date.now() - timestamp : 99999;
    let animScale = 1;
    if (!isGhost && age < popDuration) {
        const t = Math.max(0, Math.min(1, age / popDuration));
        animScale = (1 - Math.pow(1 - t, 3)) + Math.sin(t * Math.PI) * 0.15;
    }
    if (animScale <= 0) return;

    ctx.save();
    if (isGhost) ctx.globalAlpha = 0.8;
    
    // Apply animation scale about the center
    ctx.translate(center.x, center.y);
    ctx.scale(animScale, animScale);
    ctx.translate(-center.x, -center.y);

    ctx.shadowColor = 'rgba(0,0,0,0.5)'; ctx.shadowBlur = 20 / scale; ctx.shadowOffsetY = 10 / scale;
    ctx.beginPath(); ctx.arc(center.x, center.y, radiusVideo, 0, Math.PI * 2); ctx.clip();
    try { ctx.drawImage(video, sourceX, sourceY, sourceW, sourceH, center.x - radiusVideo, center.y - radiusVideo, radiusVideo * 2, radiusVideo * 2); } catch(e) { ctx.fillStyle = '#000'; ctx.fill(); }
    const grad = ctx.createRadialGradient(center.x - radiusVideo*0.3, center.y - radiusVideo*0.3, radiusVideo*0.2, center.x, center.y, radiusVideo);
    grad.addColorStop(0, 'rgba(255,255,255,0.15)'); grad.addColorStop(1, 'rgba(255,255,255,0.02)');
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath(); ctx.arc(center.x, center.y, radiusVideo, 0, Math.PI * 2);
    ctx.shadowColor = 'transparent'; ctx.strokeStyle = '#ffffff'; ctx.lineWidth = 4 / scale; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1 / scale; ctx.stroke();
    ctx.restore();
    
    if (isGhost) {
        ctx.save();
        ctx.translate(center.x, center.y);
        ctx.scale(animScale, animScale);
        ctx.translate(-center.x, -center.y);
        drawLabel(ctx, { x: center.x, y: center.y + radiusVideo }, `${zoom}x`, scale);
        ctx.restore();
    }
};

export const drawNameTag = (
    ctx: CanvasRenderingContext2D,
    point: Point,
    text: string,
    color: string,
    scale: number,
    timestamp: number,
    fontSize: number = 14,
    isGhost: boolean = false,
    unifiedProgress?: number,
    playerNumber?: string,
    options?: {
        style?: 'broadcast' | 'minimal' | 'badge';
        uppercase?: boolean;
        showNumber?: boolean;
    }
) => {
    ctx.save();
    const now = Date.now();
    const age = timestamp ? now - timestamp : 99999;
    
    // Animation
    const animDuration = 400;
    let animProgress = 1;
    if (unifiedProgress !== undefined) {
        animProgress = Math.max(0, Math.min(1, unifiedProgress));
    } else {
        animProgress = isGhost ? 1 : Math.max(0, Math.min(1, Math.max(0, age) / animDuration));
    }

    // Determine jersey number and player name
    let num = (playerNumber !== undefined && playerNumber !== null) ? String(playerNumber).trim() : '';
    let name = (text || '').trim();
    
    // Auto-extract number if not explicitly supplied, e.g. "#10 Messi" or "17. De Bruyne"
    if (!num && name) {
        const match = name.match(/^(?:#?\[?(\d{1,3})\]?[\.\-\:\s]\s*)(.*)$/);
        if (match) {
            num = match[1];
            name = match[2].trim();
        }
    }

    const showNumber = options?.showNumber !== false && num.length > 0;
    const isUppercase = options?.uppercase !== false; // Broadcast convention default
    const displayName = isUppercase ? name.toUpperCase() : name;

    // Smooth positioning
    ctx.translate(point.x, point.y);
    
    if (isGhost) {
        ctx.globalAlpha = 0.88;
    }

    // Calculate dimensions
    const safeSize = Math.max(1, fontSize);
    const nameFontSize = safeSize / scale;
    const numFontSize = Math.max(1 / scale, (safeSize * 0.95) / scale);
    const paddingX = Math.max(2 / scale, (safeSize * 0.6) / scale);
    const paddingY = Math.max(1 / scale, (safeSize * 0.35) / scale);
    const boxHeight = Math.max(4 / scale, nameFontSize + paddingY * 2);

    ctx.font = `bold ${nameFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
    const nameMetrics = ctx.measureText(displayName || 'PLAYER');
    const nameWidth = nameMetrics.width;

    let numBoxWidth = 0;
    if (showNumber) {
        ctx.font = `900 ${numFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        const numMetrics = ctx.measureText(num);
        numBoxWidth = Math.max(boxHeight * 0.95, numMetrics.width + (6 / scale));
    }

    const nameBoxWidth = nameWidth + paddingX * 2;
    const totalBoxWidth = numBoxWidth + nameBoxWidth;
    
    const triangleHeight = Math.max(2 / scale, boxHeight * 0.36);
    const triangleWidth = Math.max(3 / scale, boxHeight * 0.52);
    
    const boxX = -totalBoxWidth / 2;
    const boxY = -triangleHeight - boxHeight;
    
    if (animProgress < 1 && !isGhost) {
        ctx.beginPath();
        // Wiping from start to end (left to right)
        ctx.rect(boxX, boxY, totalBoxWidth * animProgress, boxHeight + triangleHeight + 10);
        ctx.clip();
    }

    // Draw 3D Downward Pointer pointing to the player's ground point
    ctx.beginPath();
    ctx.moveTo(0, 0); // Bottom point at player location
    ctx.lineTo(-triangleWidth / 2, -triangleHeight); // Top left
    ctx.lineTo(triangleWidth / 2, -triangleHeight); // Top right
    ctx.closePath();
    ctx.fillStyle = color;
    ctx.fill();
    
    // Shadow side of the triangle for 3D broadcast depth
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(triangleWidth / 2, -triangleHeight);
    ctx.lineTo(0, -triangleHeight);
    ctx.closePath();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.fill();
    
    // Draw Main Outer Capsule / Card with Shadow
    ctx.save();
    ctx.beginPath();
    const cornerRadius = Math.min(boxHeight / 2, Math.max(1, 3 / scale));
    ctx.roundRect(boxX, boxY, totalBoxWidth, boxHeight, cornerRadius);
    ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
    ctx.shadowBlur = Math.max(2 / scale, 10 / scale);
    ctx.shadowOffsetY = Math.max(1 / scale, 3 / scale);
    ctx.fillStyle = 'rgba(12, 14, 18, 0.95)';
    ctx.fill();
    
    // Clip contents to rounded card
    ctx.shadowColor = 'transparent';
    ctx.clip();
    
    if (showNumber) {
        // --- Broadcast Left Block: Jersey Number ---
        ctx.fillStyle = color;
        ctx.fillRect(boxX, boxY, numBoxWidth, boxHeight);

        // Subtle gradient highlight on number badge
        const numGrad = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight);
        numGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        numGrad.addColorStop(0.4, 'rgba(255, 255, 255, 0.05)');
        numGrad.addColorStop(1, 'rgba(0, 0, 0, 0.25)');
        ctx.fillStyle = numGrad;
        ctx.fillRect(boxX, boxY, numBoxWidth, boxHeight);

        // Number Text with high contrast
        ctx.fillStyle = getContrastColor(color);
        ctx.font = `900 ${numFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(num, boxX + numBoxWidth / 2, boxY + boxHeight / 2 + (0.5 / scale));

        // Hairline divider between number and name
        ctx.fillStyle = 'rgba(0, 0, 0, 0.35)';
        ctx.fillRect(boxX + numBoxWidth - (1 / scale), boxY, 1 / scale, boxHeight);

        // --- Broadcast Right Block: Player Name ---
        const nameStartX = boxX + numBoxWidth;

        // Bottom team accent stripe (Broadcast lower-third signature)
        ctx.fillStyle = color;
        const stripeH = Math.max(2 / scale, (boxHeight * 0.12));
        ctx.fillRect(nameStartX, boxY + boxHeight - stripeH, nameBoxWidth, stripeH);

        // Subtle team ambient tint at right
        const ambientGrad = ctx.createLinearGradient(nameStartX, boxY, nameStartX + nameBoxWidth, boxY);
        ambientGrad.addColorStop(0, fadeColor(color, 0.15));
        ambientGrad.addColorStop(0.3, 'rgba(255, 255, 255, 0.02)');
        ambientGrad.addColorStop(1, 'rgba(0, 0, 0, 0.2)');
        ctx.fillStyle = ambientGrad;
        ctx.fillRect(nameStartX, boxY, nameBoxWidth, boxHeight);

        // Player Name text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${nameFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(displayName, nameStartX + nameBoxWidth / 2, boxY + boxHeight / 2 - (stripeH * 0.3));
    } else {
        // --- Broadcast Style without Number ---
        // Left team accent bar
        const stripWidth = Math.max(4 / scale, (fontSize * 0.4) / scale);
        ctx.fillStyle = color;
        ctx.fillRect(boxX, boxY, stripWidth, boxHeight);

        // Bottom team accent stripe
        const stripeH = Math.max(2 / scale, (boxHeight * 0.12));
        ctx.fillRect(boxX, boxY + boxHeight - stripeH, totalBoxWidth, stripeH);

        // Player Name text
        ctx.fillStyle = '#ffffff';
        ctx.font = `bold ${nameFontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`;
        ctx.textBaseline = 'middle';
        ctx.textAlign = 'center';
        ctx.fillText(displayName, boxX + (totalBoxWidth + stripWidth) / 2, boxY + boxHeight / 2 - (stripeH * 0.3));
    }

    // Top Gloss Highlight across entire tag
    const topGloss = ctx.createLinearGradient(boxX, boxY, boxX, boxY + boxHeight * 0.45);
    topGloss.addColorStop(0, 'rgba(255, 255, 255, 0.2)');
    topGloss.addColorStop(1, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = topGloss;
    ctx.fillRect(boxX, boxY, totalBoxWidth, boxHeight * 0.45);

    ctx.restore();

    // Small anchor dot at player ground contact point
    if (isGhost) {
        ctx.beginPath();
        ctx.arc(0, 0, 3 / scale, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
        ctx.lineWidth = 1 / scale;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
    }
    
    ctx.restore();
};

export const drawText = (ctx: CanvasRenderingContext2D, point: Point, text: string, color: string, scale: number, timestamp: number, config: any, isGhost: boolean = false, unifiedProgress?: number) => {
    ctx.save();
    const now = Date.now();
    const age = timestamp ? now - timestamp : 99999;
    
    const animationType = config?.animation || 'fade';
    
    // Animation durations (slowed down)
    const fadeDuration = 800;
    const scaleDuration = 600;
    const typeDurationPerChar = 50; 
    
    let displayText = text;
    let alpha = 1;
    let scaleAnim = 1;
    
    if (!isGhost) {
        if (unifiedProgress !== undefined) {
            const progress = Math.max(0, Math.min(1, unifiedProgress));
            const charCount = Math.floor(text.length * progress);
            displayText = text.substring(0, charCount);
            alpha = progress < 1 ? Math.max(0, progress) : 1;
            // Add a little pop effect at the end of the reveal for extra juice, or just simple scale
            scaleAnim = progress < 0.2 ? 0.8 + progress : 1; 
        } else {
            if (animationType === 'type') {
                const charCount = Math.floor(Math.max(0, age) / typeDurationPerChar);
                displayText = text.substring(0, Math.min(text.length, charCount));
            }
            if (animationType === 'fade') {
                alpha = Math.min(1, Math.max(0, age) / fadeDuration);
            } else if (animationType === 'scale') {
                const animProgress = Math.min(1, Math.max(0, age) / scaleDuration);
                const easeOutBack = (x: number) => {
                    const c1 = 1.70158;
                    return 1 + (c1 + 1) * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
                };
                scaleAnim = easeOutBack(animProgress);
                alpha = Math.min(1, animProgress * 2); // quick fade in
            } else if (animationType === 'type') {
                alpha = 1;
                scaleAnim = 1;
            } else {
                alpha = 1;
                scaleAnim = 1;
            }
        }
    }
    
    if (alpha <= 0 || scaleAnim <= 0) {
        ctx.restore();
        return;
    }
    
    ctx.globalAlpha = alpha;
    ctx.translate(point.x, point.y);
    ctx.scale(scaleAnim, scaleAnim);
    
    const fontSize = config?.fontSize || 14;
    ctx.font = `bold ${fontSize / scale}px sans-serif`;
    
    // Measure full text to keep box size and alignment stable during typing
    const fullLines = text.split('\n');
    let maxFullLineWidth = 0;
    fullLines.forEach(line => {
        const metrics = ctx.measureText(line);
        maxFullLineWidth = Math.max(maxFullLineWidth, metrics.width);
    });
    
    const paddingX = fontSize / scale;
    const paddingY = (fontSize * 0.4) / scale;
    const lineHeight = (fontSize * 1.2) / scale;
    const boxHeight = (fullLines.length * lineHeight) + paddingY * 2;
    const boxWidth = maxFullLineWidth + paddingX * 2;
    
    const boxX = -boxWidth / 2;
    const boxY = -boxHeight / 2;
    
    if (config?.bgEnabled && text.length > 0) {
        ctx.save();
        ctx.beginPath();
        if (ctx.roundRect) {
            ctx.roundRect(boxX, boxY, boxWidth, boxHeight, 6 / scale);
        } else {
            ctx.rect(boxX, boxY, boxWidth, boxHeight);
        }
        ctx.fillStyle = config?.bgColor || 'rgba(0,0,0,0.8)';
        ctx.shadowColor = 'rgba(0, 0, 0, 0.4)';
        ctx.shadowBlur = 10 / scale;
        ctx.shadowOffsetY = 4 / scale;
        ctx.fill();
        ctx.restore();
    }
    
    ctx.fillStyle = color;
    ctx.textAlign = 'left';  // Use left alignment to keep text from jittering center-outward
    ctx.textBaseline = 'middle';
    
    if (!config?.bgEnabled) {
        ctx.shadowColor = 'rgba(0,0,0,0.8)';
        ctx.shadowBlur = 6 / scale;
        ctx.shadowOffsetX = 1 / scale;
        ctx.shadowOffsetY = 1 / scale;
    }
    
    const startY = boxY + paddingY + (lineHeight / 2);
    
    // Split display text into lines. To keep left-alignment or center alignment visually stable,
    // we need to process the full lines and then substring within those lines.
    let remainingChars = displayText.length;
    
    fullLines.forEach((fullLine, index) => {
        if (remainingChars <= 0) return;
        const lineToDraw = fullLine.substring(0, remainingChars);
        remainingChars -= fullLine.length + 1; // +1 for the newline char
        
        // Calculate the starting X coordinate so that the full line would be centered
        const fullMetrics = ctx.measureText(fullLine);
        const startX = -fullMetrics.width / 2;
        
        ctx.fillText(lineToDraw, startX, startY + (index * lineHeight));
    });
    
    ctx.restore();
};

export {
    drawPolygon,
    drawPolygonPreview,
    isPointNearPolygon,
    isPointInPolygon,
    createPolygonShape,
    drawRadar,
    drawRadarPreview,
    createRadarShape,
    isPointNearRadar
} from '../components/Workspace/Polygon';


