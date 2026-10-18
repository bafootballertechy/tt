import { describe, it } from 'node:test';
import assert from 'node:assert';
import { 
  calculateFitLayout, 
  evaluateShapeVisibility, 
  renderExportFrame, 
  drawShapeOnContext 
} from '../exportRenderer';
import type { Shape, FreezeFrame } from '../../../../types';

// Mock CanvasRenderingContext2D / OffscreenCanvasRenderingContext2D for headless testing
function createMockContext() {
  const operations: string[] = [];
  const stateStack: any[] = [];
  let currentTransform = { x: 0, y: 0, sx: 1, sy: 1 };

  return {
    operations,
    stateStack,
    currentTransform,
    save() {
      operations.push('save');
      stateStack.push({ ...currentTransform });
    },
    restore() {
      operations.push('restore');
      if (stateStack.length > 0) {
        currentTransform = stateStack.pop();
      }
    },
    translate(x: number, y: number) {
      operations.push(`translate(${x},${y})`);
      currentTransform.x += x;
      currentTransform.y += y;
    },
    scale(sx: number, sy: number) {
      operations.push(`scale(${sx},${sy})`);
      currentTransform.sx *= sx;
      currentTransform.sy *= sy;
    },
    fillRect(x: number, y: number, w: number, h: number) {
      operations.push(`fillRect(${x},${y},${w},${h})`);
    },
    drawImage(...args: any[]) {
      operations.push(`drawImage(${args.length} args)`);
    },
    beginPath() { operations.push('beginPath'); },
    closePath() { operations.push('closePath'); },
    moveTo(x: number, y: number) { operations.push(`moveTo(${x},${y})`); },
    lineTo(x: number, y: number) { operations.push(`lineTo(${x},${y})`); },
    arc(...args: any[]) { operations.push(`arc(${args.slice(0, 3).join(',')})`); },
    stroke() { operations.push('stroke'); },
    fill() { operations.push('fill'); },
    setLineDash(d: number[]) { operations.push(`setLineDash([${d.join(',')}])`); },
    createLinearGradient() {
      return { addColorStop() {} };
    },
    createRadialGradient() {
      return { addColorStop() {} };
    },
    measureText(text: string) {
      return { width: text.length * 8 };
    },
    fillText(text: string, x: number, y: number) {
      operations.push(`fillText("${text}",${x},${y})`);
    },
    roundRect(x: number, y: number, w: number, h: number, r: number) {
      operations.push(`roundRect(${x},${y},${w},${h},${r})`);
    },
    clip() { operations.push('clip'); },
    rect(x: number, y: number, w: number, h: number) {
      operations.push(`rect(${x},${y},${w},${h})`);
    },
    ellipse(...args: any[]) { operations.push(`ellipse(${args.slice(0, 3).join(',')})`); },
    quadraticCurveTo(cx: number, cy: number, x: number, y: number) {
      operations.push(`quadraticCurveTo(${cx},${cy},${x},${y})`);
    },
    globalAlpha: 1,
    strokeStyle: '#000000',
    fillStyle: '#000000',
    lineWidth: 1,
    lineCap: 'butt',
    lineJoin: 'miter',
    lineDashOffset: 0,
    shadowColor: 'transparent',
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    font: '10px sans-serif',
    textBaseline: 'alphabetic',
    textAlign: 'start'
  } as any;
}

describe('exportRenderer', () => {
  describe('aspect-ratio handling & coordinate scaling (calculateFitLayout)', () => {
    it('preserves 16:9 aspect ratio in 16:9 canvas at original 1080p', () => {
      const layout = calculateFitLayout(1920, 1080, 1920, 1080);
      assert.strictEqual(layout.x, 0);
      assert.strictEqual(layout.y, 0);
      assert.strictEqual(layout.w, 1920);
      assert.strictEqual(layout.h, 1080);
      assert.strictEqual(layout.scale, 1);
    });

    it('scales down 1080p source to 720p output correctly', () => {
      const layout = calculateFitLayout(1280, 720, 1920, 1080);
      assert.strictEqual(layout.x, 0);
      assert.strictEqual(layout.y, 0);
      assert.strictEqual(layout.w, 1280);
      assert.strictEqual(layout.h, 720);
      assert.strictEqual(Math.round(layout.scale * 1000), Math.round((1280 / 1920) * 1000));
    });

    it('pillarboxes 4:3 source into 16:9 canvas', () => {
      const layout = calculateFitLayout(1920, 1080, 1440, 1080);
      assert.strictEqual(layout.h, 1080);
      assert.strictEqual(layout.w, 1440);
      assert.strictEqual(layout.x, (1920 - 1440) / 2);
      assert.strictEqual(layout.y, 0);
      assert.strictEqual(layout.scale, 1);
    });

    it('letterboxes 21:9 source into 16:9 canvas', () => {
      const layout = calculateFitLayout(1920, 1080, 2560, 1080);
      assert.strictEqual(layout.w, 1920);
      assert.strictEqual(layout.x, 0);
      assert(layout.y > 0);
      assert(layout.h < 1080);
    });
  });

  describe('shape visibility & freeze-frame animation progress (evaluateShapeVisibility)', () => {
    const ff: FreezeFrame = {
      id: 'ff-1',
      timestamp: 12.5,
      duration: 5
    };

    it('shows non-freeze-frame shape during normal playback', () => {
      const shape: Shape = {
        id: 's-1',
        type: 'arrow',
        points: [{ x: 100, y: 100 }, { x: 200, y: 200 }],
        color: '#c6ff1f',
        strokeWidth: 4,
        timestamp: 10
      };

      const result = evaluateShapeVisibility(shape, 10.5, null, 0);
      assert.strictEqual(result.shouldRender, true);
    });

    it('hides freeze-frame shape during normal playback', () => {
      const shape: Shape = {
        id: 's-ff',
        type: 'circle',
        points: [{ x: 300, y: 300 }],
        color: '#ff0055',
        strokeWidth: 4,
        timestamp: 12.5,
        freezeFrameId: 'ff-1'
      };

      const result = evaluateShapeVisibility(shape, 12.5, null, 0);
      assert.strictEqual(result.shouldRender, false);
    });

    it('shows freeze-frame shape when that freeze frame is active and within anim bounds', () => {
      const shape: Shape = {
        id: 's-ff',
        type: 'circle',
        points: [{ x: 300, y: 300 }],
        color: '#ff0055',
        strokeWidth: 4,
        timestamp: 12.5,
        freezeFrameId: 'ff-1',
        animStart: 1.0,
        animEnd: 4.0
      };

      // Before animStart
      const before = evaluateShapeVisibility(shape, 12.5, ff, 0.5);
      assert.strictEqual(before.shouldRender, false);

      // During appear ramp (1.0 to 1.5, elapsed = 1.25 -> ap = 0.5)
      const rampUp = evaluateShapeVisibility(shape, 12.5, ff, 1.25);
      assert.strictEqual(rampUp.shouldRender, true);
      assert.strictEqual(Math.round((rampUp.unifiedProgress ?? 0) * 100) / 100, 0.5);

      // Fully visible middle (2.5s)
      const full = evaluateShapeVisibility(shape, 12.5, ff, 2.5);
      assert.strictEqual(full.shouldRender, true);
      assert.strictEqual(full.unifiedProgress, 1);

      // Disappear ramp (3.5 to 4.0, elapsed = 3.75 -> 1 - dp = 0.5)
      const rampDown = evaluateShapeVisibility(shape, 12.5, ff, 3.75);
      assert.strictEqual(rampDown.shouldRender, true);
      assert.strictEqual(Math.round((rampDown.unifiedProgress ?? 0) * 100) / 100, 0.5);

      // After animEnd (4.5s)
      const after = evaluateShapeVisibility(shape, 12.5, ff, 4.5);
      assert.strictEqual(after.shouldRender, false);
    });

    it('shows freeze-frame shape with full visibility throughout when no anim keyframes are set', () => {
      const shape: Shape = {
        id: 's-ff-static',
        type: 'arrow',
        points: [{ x: 100, y: 100 }, { x: 200, y: 200 }],
        color: '#ffcc00',
        strokeWidth: 4,
        timestamp: 12.5,
        freezeFrameId: 'ff-1'
      };

      // At start (elapsed = 0)
      const atStart = evaluateShapeVisibility(shape, 12.5, ff, 0);
      assert.strictEqual(atStart.shouldRender, true);
      assert.strictEqual(atStart.unifiedProgress, 1);

      // In middle
      const inMiddle = evaluateShapeVisibility(shape, 12.5, ff, 2.5);
      assert.strictEqual(inMiddle.shouldRender, true);
      assert.strictEqual(inMiddle.unifiedProgress, 1);
    });

    it('shows unassigned shape during freeze frame to match Workspace preview', () => {
      const shape: Shape = {
        id: 's-unassigned',
        type: 'circle',
        points: [{ x: 500, y: 500 }],
        color: '#00ff88',
        strokeWidth: 3,
        timestamp: 12.5
      };

      const result = evaluateShapeVisibility(shape, 12.5, ff, 1.0);
      assert.strictEqual(result.shouldRender, true);
      assert.strictEqual(result.unifiedProgress, 1);
    });
  });

  describe('drawing shapes onto context (drawShapeOnContext & renderExportFrame)', () => {
    it('renders static line shape without error and applies styling', () => {
      const ctx = createMockContext();
      const lineShape: Shape = {
        id: 'line-1',
        type: 'line',
        points: [{ x: 50, y: 50 }, { x: 250, y: 150 }],
        color: '#00eaff',
        strokeWidth: 5,
        timestamp: 5
      };

      drawShapeOnContext(ctx, lineShape, 1, 'full', 1, undefined, null, 5000);
      assert(ctx.operations.includes('moveTo(50,50)'));
      assert(ctx.operations.includes('lineTo(250,150)'));
      assert(ctx.operations.includes('stroke'));
    });

    it('renders 3D ring circle shape and respects scale', () => {
      const ctx = createMockContext();
      const circleShape: Shape = {
        id: 'circle-1',
        type: 'circle',
        points: [{ x: 500, y: 400 }],
        ringConfig: { size: 80, tilt: 60 },
        color: '#c6ff1f',
        strokeWidth: 4,
        timestamp: 5
      };

      drawShapeOnContext(ctx, circleShape, 2, 'full', 1, 1, null, 5000);
      assert(ctx.operations.length > 0);
    });

    it('renders complete frame composite at custom resolution', () => {
      const ctx = createMockContext();
      const shapes: Shape[] = [
        {
          id: 's1',
          type: 'line',
          points: [{ x: 10, y: 10 }, { x: 100, y: 100 }],
          color: '#ffffff',
          strokeWidth: 2,
          timestamp: 1
        }
      ];

      const layout = renderExportFrame({
        ctx,
        targetWidth: 1280,
        targetHeight: 720,
        sourceWidth: 1920,
        sourceHeight: 1080,
        currentVideoTime: 1.5,
        shapes
      });

      assert.strictEqual(layout.w, 1280);
      assert.strictEqual(layout.h, 720);
      assert(ctx.operations.includes('fillRect(0,0,1280,720)'));
      assert(ctx.operations.some((op: string) => op.startsWith('scale(')));
    });

    it('renders Chroma Key mask foreground over pitch shapes and under annotations', () => {
      const ctx = createMockContext();
      const mockMaskForeground = {} as any;
      const shapes: Shape[] = [
        {
          id: 's_ring',
          type: 'circle',
          points: [{ x: 500, y: 500 }],
          ringConfig: { size: 50, tilt: 50 },
          color: '#ffff00',
          strokeWidth: 3,
          freezeFrameId: 'ff1'
        },
        {
          id: 's_text',
          type: 'text',
          points: [{ x: 500, y: 400 }],
          text: 'Player 9',
          textConfig: { text: 'Player 9' },
          color: '#ffffff',
          strokeWidth: 2,
          freezeFrameId: 'ff1'
        }
      ];

      const activeFreezeFrame: FreezeFrame = {
        id: 'ff1',
        timestamp: 10,
        duration: 3
      };

      renderExportFrame({
        ctx,
        targetWidth: 1920,
        targetHeight: 1080,
        sourceWidth: 1920,
        sourceHeight: 1080,
        currentVideoTime: 10,
        shapes,
        activeFreezeFrame,
        freezeFrameElapsed: 0.5,
        maskForeground: mockMaskForeground
      });

      // drawImage should be called for the mask foreground
      assert(ctx.operations.includes('drawImage(5 args)'));
      // fillText should be called for the text annotation
      assert(ctx.operations.some((op: string) => op.includes('fillText("Player 9"')));
    });
  });
});
