import { Slide, Point, Drawing, CompiledAnimation } from './types';

export interface PlayerRenderState {
    id: string;
    x: number;
    y: number;
    rotation: number;
    scale: number;
    alpha: number;
    namePos?: 'top' | 'bottom';
    borderColor?: string;
    showName?: boolean | null;
    showNumber?: boolean | null;
    showPositionLabel?: boolean | null;
}

export interface DrawingRenderState {
    id: string;
    drawing: Drawing;
    animProgress: number;
    alpha: number;
}

export interface RenderState {
    players: PlayerRenderState[];
    drawings: DrawingRenderState[];
    globalAlpha: number;
}

const lerp = (start: number, end: number, t: number) => start + (end - start) * t;

export const getBezierPoint = (pts: Point[], t: number): Point => {
  if (pts.length === 0) return { x: 0, y: 0 };
  if (pts.length === 1) return pts[0];
  const newPts = [];
  for (let i = 0; i < pts.length - 1; i++) {
    newPts.push({
      x: lerp(pts[i].x, pts[i + 1].x, t),
      y: lerp(pts[i].y, pts[i + 1].y, t)
    });
  }
  return getBezierPoint(newPts, t);
};

export const getPlayerMotionPath = (prevPos: Point, currentPos: any) => {
  if (currentPos.motionPath && currentPos.motionPath.length > 0) return currentPos.motionPath;
  if (currentPos.motionPath && currentPos.motionPath.length === 0) return [];
  return [
    { x: lerp(prevPos.x, currentPos.x, 0.33), y: lerp(prevPos.y, currentPos.y, 0.33) },
    { x: lerp(prevPos.x, currentPos.x, 0.66), y: lerp(prevPos.y, currentPos.y, 0.66) }
  ];
};

export class AnimationController {
    compiledAnim: CompiledAnimation;
    currentSlide: Slide;
    previousSlide: Slide | null;
    
    constructor(currentSlide: Slide, previousSlide: Slide | null, compiledAnim: CompiledAnimation) {
        this.currentSlide = currentSlide;
        this.previousSlide = previousSlide;
        this.compiledAnim = compiledAnim;
    }

    getRenderState(timeMs: number): RenderState {
        const { durationMs, camDurationMs } = this.compiledAnim;
        const progress = durationMs > 0 ? timeMs / durationMs : 1;
        
        // globalAlpha is 1 for most things, but fading out old drawings
        const state: RenderState = {
            players: [],
            drawings: [],
            globalAlpha: 1
        };

        const getStepProgressObj = (id: string, type: 'players' | 'drawings') => {
            const anim = this.compiledAnim[type][id];
            if (!anim) {
                // Fallback if not recorded: animates after cam
                if (durationMs <= camDurationMs) return 1;
                if (timeMs <= camDurationMs) return 0;
                if (timeMs >= durationMs) return 1;
                return (timeMs - camDurationMs) / (durationMs - camDurationMs);
            }
            if (timeMs >= anim.endTimeMs) return 1;
            if (timeMs <= anim.startTimeMs) return 0;
            if (anim.endTimeMs === anim.startTimeMs) return 1;
            return (timeMs - anim.startTimeMs) / (anim.endTimeMs - anim.startTimeMs);
        };

        Object.keys(this.currentSlide.positions).forEach(playerId => {
            const currentPos = this.currentSlide.positions[playerId];
            const prevPos = this.previousSlide?.positions[playerId];

            let pProgress = getStepProgressObj(playerId, 'players');
            
            let x = currentPos.x;
            let y = currentPos.y;
            let rotation = currentPos.rotation || 0;
            let scale = currentPos.scale || 1;

            if (prevPos) {
                const ease = pProgress < 0.5 ? 4 * pProgress * pProgress * pProgress : 1 - Math.pow(-2 * pProgress + 2, 3) / 2;
                const cps = getPlayerMotionPath(prevPos, currentPos);
                const bezierPoints = [prevPos, ...cps, currentPos];
                const bezierPos = getBezierPoint(bezierPoints, ease);
                x = bezierPos.x;
                y = bezierPos.y;
                rotation = lerp(prevPos.rotation || 0, currentPos.rotation || 0, ease);
            }

            state.players.push({
                id: playerId,
                x, y, rotation, scale,
                namePos: currentPos.namePos,
                borderColor: currentPos.borderColor,
                showName: currentPos.showName,
                showNumber: currentPos.showNumber,
                showPositionLabel: currentPos.showPositionLabel,
                alpha: 1
            });
        });

        const prevDrawingsMap = new Map(this.previousSlide?.drawings.map(d => [d.id, d]) || []);
        const currDrawingsMap = new Map(this.currentSlide.drawings.map(d => [d.id, d]));

        // First, add previous drawings that are fading out (behind new/current ones)
        if (this.previousSlide) {
            this.previousSlide.drawings.forEach(prev => {
                if (!currDrawingsMap.has(prev.id)) {
                    if (camDurationMs > 0 && timeMs <= camDurationMs) {
                        const alpha = 1 - (timeMs / camDurationMs);
                        state.drawings.push({
                            id: prev.id,
                            drawing: prev,
                            animProgress: 1,
                            alpha
                        });
                    }
                }
            });
        }

        // Then add all current drawings in their correct z-order
        this.currentSlide.drawings.forEach(curr => {
            if (prevDrawingsMap.has(curr.id)) {
                const prev = prevDrawingsMap.get(curr.id)!;
                // Exists in both slides, check if they changed
                const isIdentical = prev.type === curr.type && 
                                    prev.points.length === curr.points.length &&
                                    prev.points.every((p, i) => Math.abs(p.x - curr.points[i].x) < 0.001 && Math.abs(p.y - curr.points[i].y) < 0.001) &&
                                    JSON.stringify(prev.props || {}) === JSON.stringify(curr.props || {}) &&
                                    prev.color === curr.color &&
                                    prev.text === curr.text;

                if (isIdentical) {
                    state.drawings.push({
                        id: curr.id,
                        drawing: curr,
                        animProgress: 1,
                        alpha: 1
                    });
                } else {
                    const animProgress = getStepProgressObj(curr.id, 'drawings');
                    
                    if (prev.type === curr.type && prev.points.length === curr.points.length) {
                        // Interpolate
                        const ease = animProgress < 0.5 ? 4 * animProgress * animProgress * animProgress : 1 - Math.pow(-2 * animProgress + 2, 3) / 2;
                        const interpolatedPoints = prev.points.map((p, i) => ({
                            x: lerp(p.x, curr.points[i].x, ease),
                            y: lerp(p.y, curr.points[i].y, ease),
                            attachedToPlayerId: curr.points[i].attachedToPlayerId
                        }));
                        
                        const interpolatedProps = { ...curr.props };
                        if (prev.props && curr.props) {
                            for (const key of Object.keys(curr.props)) {
                                if (typeof prev.props[key] === 'number' && typeof curr.props[key] === 'number') {
                                    interpolatedProps[key] = lerp(prev.props[key], curr.props[key], ease);
                                }
                            }
                        }
                        
                        state.drawings.push({
                            id: curr.id,
                            drawing: {
                                ...curr,
                                points: interpolatedPoints,
                                props: interpolatedProps,
                                color: ease < 0.5 ? prev.color : curr.color,
                                text: ease < 0.5 ? prev.text : curr.text
                            },
                            animProgress: 1, // Full draw progress, we're just transforming the shape
                            alpha: 1
                        });
                    } else {
                        // Cross-fade
                        if (animProgress < 1) {
                            state.drawings.push({
                                id: prev.id + '_fadeout',
                                drawing: prev,
                                animProgress: 1,
                                alpha: 1 - animProgress
                            });
                        }
                        if (animProgress > 0) {
                            state.drawings.push({
                                id: curr.id,
                                drawing: curr,
                                animProgress: 1, // Draw it fully, just fade in
                                alpha: animProgress
                            });
                        }
                    }
                }
            } else {
                // New drawing, animate in
                const animProgress = getStepProgressObj(curr.id, 'drawings');
                if (animProgress > 0) {
                    state.drawings.push({
                        id: curr.id,
                        drawing: curr,
                        animProgress,
                        alpha: 1
                    });
                }
            }
        });

        return state;
    }
}
