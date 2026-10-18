import React from 'react';
import { Point, PitchView } from "./types";

export const getDistance = (p1: Point, p2: Point) => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

export const pointToLineSegmentDistance = (p: Point, v: Point, w: Point) => {
  const l2 = Math.pow(w.x - v.x, 2) + Math.pow(w.y - v.y, 2);
  if (l2 === 0) return getDistance(p, v);
  let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
  t = Math.max(0, Math.min(1, t));
  const projection = { x: v.x + t * (w.x - v.x), y: v.y + t * (w.y - v.y) };
  return getDistance(p, projection);
};

export const generateCurveArrowPath = (points: Point[], style?: string) => {
  if (points.length < 2) return "";
  const start = points[0];
  const end = points[points.length - 1];
  let ctrl = points.length === 3 ? points[1] : null;

  if (!ctrl) {
      const mx = (start.x + end.x) / 2;
      const my = (start.y + end.y) / 2;
      const dx = end.x - start.x;
      const dy = end.y - start.y;
      const len = Math.hypot(dx, dy);
      const off = len * 0.3;
      ctrl = len > 5 ? { x: mx + (dy / len) * off, y: my - (dx / len) * off } : { x: mx, y: my };
  }

  // Calculate angle at the end point using the tangent from ctrl to end
  const headLength = 15;
  const angle = Math.atan2(end.y - ctrl.y, end.x - ctrl.x);
  
  const arrowX1 = end.x - headLength * Math.cos(angle - Math.PI / 6);
  const arrowY1 = end.y - headLength * Math.sin(angle - Math.PI / 6);
  const arrowX2 = end.x - headLength * Math.cos(angle + Math.PI / 6);
  const arrowY2 = end.y - headLength * Math.sin(angle + Math.PI / 6);

  let path = `M ${start.x} ${start.y}`;
  
  if (style === 'dribbling') {
    // Dribbling path approximation for quadratic bezier curve
    const steps = 20;
    for (let i = 1; i <= steps; i++) {
        const t = i / steps;
        const pt = {
            x: (1 - t) * (1 - t) * start.x + 2 * (1 - t) * t * ctrl.x + t * t * end.x,
            y: (1 - t) * (1 - t) * start.y + 2 * (1 - t) * t * ctrl.y + t * t * end.y
        };
        const pt_prev = {
            x: (1 - (t - 1/steps)) * (1 - (t - 1/steps)) * start.x + 2 * (1 - (t - 1/steps)) * (t - 1/steps) * ctrl.x + (t - 1/steps) * (t - 1/steps) * end.x,
            y: (1 - (t - 1/steps)) * (1 - (t - 1/steps)) * start.y + 2 * (1 - (t - 1/steps)) * (t - 1/steps) * ctrl.y + (t - 1/steps) * (t - 1/steps) * end.y
        };
        
        const ptAngle = Math.atan2(pt.y - pt_prev.y, pt.x - pt_prev.x);
        const perpX = -Math.sin(ptAngle);
        const perpY = Math.cos(ptAngle);
        
        if (i % 2 === 1) {
            path += ` Q ${pt_prev.x + perpX * 8} ${pt_prev.y + perpY * 8} ${pt.x} ${pt.y}`;
        } else {
            path += ` Q ${pt_prev.x - perpX * 8} ${pt_prev.y - perpY * 8} ${pt.x} ${pt.y}`;
        }
    }
  } else {
    path += ` Q ${ctrl.x} ${ctrl.y} ${end.x} ${end.y}`;
  }
  
  // Add arrowhead
  path += ` M ${end.x} ${end.y} L ${arrowX1} ${arrowY1} M ${end.x} ${end.y} L ${arrowX2} ${arrowY2}`;
  
  return path;
};

export const generateLinePath = (points: Point[]) => {
  if (points.length < 2) return "";
  return `M ${points[0].x} ${points[0].y} L ${points[points.length - 1].x} ${points[points.length - 1].y}`;
};

export const generateArrowPath = (points: Point[], style?: string) => {
  if (points.length < 2) return "";
  const start = points[0];
  const end = points[points.length - 1];
  
  // Simple straight line for now, could be improved to curve through points
  const headLength = 15;
  const angle = Math.atan2(end.y - start.y, end.x - start.x);
  
  const arrowX1 = end.x - headLength * Math.cos(angle - Math.PI / 6);
  const arrowY1 = end.y - headLength * Math.sin(angle - Math.PI / 6);
  const arrowX2 = end.x - headLength * Math.cos(angle + Math.PI / 6);
  const arrowY2 = end.y - headLength * Math.sin(angle + Math.PI / 6);

  let path = `M ${start.x} ${start.y}`;
  
  if (style === 'dribbling') {
    const dist = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
    const segmentLength = 15;
    const amplitude = 8;
    const steps = Math.floor(dist / segmentLength);
    
    for (let i = 1; i < steps; i++) {
       const t = i / steps;
       const px = start.x + t * (end.x - start.x);
       const py = start.y + t * (end.y - start.y);
       
       // perpendicular vector
       const perpX = -Math.sin(angle);
       const perpY = Math.cos(angle);
       
       const dir = i % 2 === 0 ? 1 : -1;
       const zigX = px + perpX * amplitude * dir;
       const zigY = py + perpY * amplitude * dir;
       
       path += ` L ${zigX} ${zigY}`;
    }
  }

  // M start L end ... arrow head
  return `${path} L ${end.x} ${end.y} M ${end.x} ${end.y} L ${arrowX1} ${arrowY1} M ${end.x} ${end.y} L ${arrowX2} ${arrowY2}`;
};

export const generatePolygonPath = (points: Point[]) => {
  if (points.length === 0) return "";
  const d = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(" ");
  return `${d} Z`; // Close path
};

export const getRelativePointerPosition = (event: React.PointerEvent | PointerEvent, element: HTMLElement): Point => {
  const nativeEvent = ('nativeEvent' in event) ? event.nativeEvent as PointerEvent : event as PointerEvent;
  
  if (nativeEvent.target === element) {
    return {
      x: nativeEvent.offsetX,
      y: nativeEvent.offsetY,
    };
  }

  const rect = element.getBoundingClientRect();
  const scaleX = rect.width / element.offsetWidth || 1;
  const scaleY = rect.height / element.offsetHeight || 1;
  return {
    x: (nativeEvent.clientX - rect.left) / scaleX,
    y: (nativeEvent.clientY - rect.top) / scaleY,
  };
};
export const makeP = (W: number, H: number, view: PitchView = PitchView.HORIZONTAL) => {
  return (u: number, v: number) => {
    if (view === PitchView.PERSPECTIVE) {
      const cx=W/2, topY=H*0.145, botY=H*0.875, pwT=W*0.705, pwB=W*0.80;
      const pw = pwT+(pwB-pwT)*v;
      return { x: cx+(u-0.5)*pw, y: topY+(botY-topY)*v, s: 0.9+0.22*v };
    } else if (view === PitchView.VERTICAL) {
      const PW = 90;
      const drawH = H;
      const drawW = H * (PW / 105);
      const xOff = (W - drawW) / 2;
      // map v=0..1 to the central 68m of the 90m pitch
      const padW = drawW * ((PW - 68) / 2 / PW);
      const coreW = drawW * (68 / PW);
      return { x: xOff + padW + v * coreW, y: (1 - u) * drawH, s: 1 };
    } else if (view === PitchView.HALF) {
      const drawH = H;
      const drawW = H * (68 / 52.5);
      const xOff = (W - drawW) / 2;
      return { x: xOff + v * drawW, y: u * 2 * drawH, s: 1 };
    } else {
      // HORIZONTAL, TRAINING
      return { x: u * W, y: v * H, s: 1 };
    }
  };
};

export const unmakeP = (W: number, H: number, view: PitchView = PitchView.HORIZONTAL) => {
  return (x: number, y: number) => {
    if (view === PitchView.PERSPECTIVE) {
      const cx=W/2, topY=H*0.145, botY=H*0.875, pwT=W*0.705, pwB=W*0.80;
      const v = (y - topY) / (botY - topY);
      const pw = pwT + (pwB - pwT) * v;
      const u = (x - cx) / pw + 0.5;
      return { u, v };
    } else if (view === PitchView.VERTICAL) {
      const PW = 90;
      const drawH = H;
      const drawW = H * (PW / 105);
      const xOff = (W - drawW) / 2;
      const padW = drawW * ((PW - 68) / 2 / PW);
      const coreW = drawW * (68 / PW);
      return { u: 1 - y / drawH, v: (x - (xOff + padW)) / coreW };
    } else if (view === PitchView.HALF) {
      const drawH = H;
      const drawW = H * (68 / 52.5);
      const xOff = (W - drawW) / 2;
      return { u: y / (2 * drawH), v: (x - xOff) / drawW };
    } else {
      // HORIZONTAL, TRAINING
      return { u: x / W, v: y / H };
    }
  };
};

export const E = (P: any, u: number, v: number, h: number) => {
    const p = P(u, v);
    return { x: p.x, y: p.y - h * p.s, s: p.s };
};

export const LERP = (a: number, b: number, t: number) => a + (b - a) * t;

import { Slide, CompiledAnimation } from './types';

const compiledAnimCache = new WeakMap<Slide, CompiledAnimation>();

export const compileAnimation = (slide: Slide): CompiledAnimation => {
  if (compiledAnimCache.has(slide)) {
    return compiledAnimCache.get(slide)!;
  }

  const camDurationMs = (slide.transitionSpeed || 0.5) * 1000;

  const result: CompiledAnimation = {
    durationMs: camDurationMs,
    camDurationMs,
    hasAnimSteps: false,
    players: {},
    drawings: {}
  };

  let maxSeq = 0;
  Object.entries(slide.positions).forEach(([id, p]) => {
      if (typeof p.animationOrder === 'number' && p.animationOrder > 0) { 
          maxSeq = Math.max(maxSeq, p.animationOrder); 
          result.hasAnimSteps = true; 
      }
  });
  slide.drawings.forEach(d => {
      if (typeof d.animationOrder === 'number' && d.animationOrder > 0) { 
          maxSeq = Math.max(maxSeq, d.animationOrder); 
          result.hasAnimSteps = true; 
      }
  });

  if (result.hasAnimSteps) {
      const numSteps = maxSeq + 1;
      const stepDur = slide.stepDuration ?? 1.0;
      const stepDel = slide.stepDelay ?? 0.0;
      let totalNeeded = numSteps * stepDur + (numSteps - 1) * stepDel;
      if (totalNeeded === 0) totalNeeded = 1.0;
      
      const slideDur = slide.duration || 5.0;
      if (totalNeeded > slideDur) {
          totalNeeded = slideDur; // Cap at slide duration
      }
      
      result.durationMs = camDurationMs + totalNeeded * 1000;
      const scale = totalNeeded === slideDur ? (slideDur / (numSteps * stepDur + (numSteps - 1) * stepDel)) : 1.0;
      
      const actualStepDurMs = stepDur * scale * 1000;
      const actualStepDelMs = stepDel * scale * 1000;

      Object.entries(slide.positions).forEach(([id, p]) => {
          const seq = p.animationOrder || 0;
          const start = camDurationMs + seq * (actualStepDurMs + actualStepDelMs);
          result.players[id] = { startTimeMs: start, endTimeMs: start + actualStepDurMs };
      });

      slide.drawings.forEach(d => {
          const seq = d.animationOrder || 0;
          const start = camDurationMs + seq * (actualStepDurMs + actualStepDelMs);
          result.drawings[d.id] = { startTimeMs: start, endTimeMs: start + actualStepDurMs };
      });
  } else {
      const animDurationMs = camDurationMs;
      result.durationMs = camDurationMs + animDurationMs;
      Object.keys(slide.positions).forEach(id => {
          result.players[id] = { startTimeMs: camDurationMs, endTimeMs: camDurationMs + animDurationMs };
      });
      slide.drawings.forEach(d => {
          result.drawings[d.id] = { startTimeMs: camDurationMs, endTimeMs: camDurationMs + animDurationMs };
      });
  }

  compiledAnimCache.set(slide, result);
  return result;
};
