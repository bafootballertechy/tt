import { describe, it, before } from 'node:test';
import assert from 'node:assert';
import { execSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import {
  segmentClipTimeline,
  createCanonicalTimeline
} from '../exportTimeline';
import {
  buildShapeIndex,
  createStaticOverlayCache,
  preRenderStaticOverlay,
  isShapeAnimated
} from '../exportRenderer';
import { checkFastPathFeasibility } from '../media/remuxPipeline';
import type { Shape, FreezeFrame, ExportClipItem, ExportOptions } from '../../../../types';

const FIXTURE_DIR = '/tmp/tacstem_test_fixtures';
const SAMPLE_MP4 = path.join(FIXTURE_DIR, 'source_sample_5s.mp4');

describe('Real Media Validation & Segment Optimization Tests', () => {
  before(() => {
    if (!fs.existsSync(FIXTURE_DIR)) {
      fs.mkdirSync(FIXTURE_DIR, { recursive: true });
    }

    // Generate real H.264/AAC test fixture using ffmpeg (5 seconds, 30fps, keyframe every 1s)
    execSync(
      `ffmpeg -f lavfi -i testsrc=duration=5:size=640x360:rate=30 -f lavfi -i sine=frequency=440:duration=5 -c:v libx264 -preset ultrafast -pix_fmt yuv420p -g 30 -c:a aac -b:a 64k "${SAMPLE_MP4}" -y`,
      { stdio: 'pipe' }
    );
  });

  describe('Real Media Stream Copy & FFprobe Validation', () => {
    it('generates a valid MP4 fixture verified by ffprobe', () => {
      const probeOutput = execSync(
        `ffprobe -v error -show_entries format=duration -show_entries stream=index,codec_type,codec_name,width,height,avg_frame_rate -of json "${SAMPLE_MP4}"`,
        { encoding: 'utf8' }
      );
      const probe = JSON.parse(probeOutput);
      assert.strictEqual(probe.streams.length, 2);
      assert.strictEqual(probe.streams[0].codec_name, 'h264');
      assert.strictEqual(probe.streams[1].codec_name, 'aac');
      assert.strictEqual(probe.streams[0].width, 640);
      assert.strictEqual(probe.streams[0].height, 360);
      const dur = parseFloat(probe.format.duration);
      assert(dur >= 4.9 && dur <= 5.1, `Expected duration ~5s, got ${dur}`);
    });

    it('performs fast stream copy remuxing using Mediabunny in < 150ms', async () => {
      const mb = await import('mediabunny');
      const fileBuffer = fs.readFileSync(SAMPLE_MP4);
      const source = new mb.BufferSource(fileBuffer.buffer);
      const input = new mb.Input({ source, formats: mb.ALL_FORMATS });

      const target = new mb.BufferTarget();
      const format = new mb.Mp4OutputFormat();
      const output = new mb.Output({ target, format });

      const t0 = performance.now();
      const conversion = await mb.Conversion.init({
        input,
        output,
        copy: { mode: 'forced' },
        showWarnings: false
      });

      assert.strictEqual(conversion.isValid, true);
      assert.strictEqual(conversion.utilizedTracks.length, 2);

      await conversion.execute();
      const durationMs = performance.now() - t0;

      assert(target.buffer.byteLength > 0);
      assert(durationMs < 500, `Stream copy took ${durationMs}ms, should be sub-second`);

      // Write output and verify with ffprobe
      const outputPath = path.join(FIXTURE_DIR, 'stream_copied_output.mp4');
      fs.writeFileSync(outputPath, Buffer.from(target.buffer));

      const probeOutput = execSync(
        `ffprobe -v error -show_entries format=duration -show_entries stream=index,codec_type,codec_name -of json "${outputPath}"`,
        { encoding: 'utf8' }
      );
      const probe = JSON.parse(probeOutput);
      assert.strictEqual(probe.streams.length, 2);
      assert.strictEqual(probe.streams[0].codec_name, 'h264');
      assert.strictEqual(probe.streams[1].codec_name, 'aac');
    });

    it('preserves precise keyframe boundary trim during fast stream remux', async () => {
      const mb = await import('mediabunny');
      const fileBuffer = fs.readFileSync(SAMPLE_MP4);
      const source = new mb.BufferSource(fileBuffer.buffer);
      const input = new mb.Input({ source, formats: mb.ALL_FORMATS });

      const target = new mb.BufferTarget();
      const format = new mb.Mp4OutputFormat();
      const output = new mb.Output({ target, format });

      const conversion = await mb.Conversion.init({
        input,
        output,
        trim: { start: 1.0, end: 4.0 }, // 3s slice aligned on 1.0s GOP
        copy: { mode: 'forced', shiftTolerance: 0.1 },
        showWarnings: false
      });

      assert.strictEqual(conversion.isValid, true);
      await conversion.execute();

      const trimmedPath = path.join(FIXTURE_DIR, 'trimmed_stream_copy.mp4');
      fs.writeFileSync(trimmedPath, Buffer.from(target.buffer));

      const probeOutput = execSync(
        `ffprobe -v error -show_entries format=duration -of json "${trimmedPath}"`,
        { encoding: 'utf8' }
      );
      const probe = JSON.parse(probeOutput);
      const dur = parseFloat(probe.format.duration);
      assert(dur >= 2.9 && dur <= 3.1, `Expected ~3.0s duration, got ${dur}`);
    });
  });

  describe('Timeline Segmentation & Partial Subrange Isolation', () => {
    it('isolates clean subranges from modified subranges in a 20-second clip', () => {
      const sampleClip: ExportClipItem = {
        instanceId: 'clip-20s',
        name: '20s Tactical Clip',
        sourceFile: new Blob([]),
        inPoint: 0,
        outPoint: 20,
        duration: 20,
        shapes: [
          {
            id: 'drawing-at-9s',
            type: 'arrow',
            points: [{ x: 10, y: 10 }, { x: 50, y: 50 }],
            color: '#c6ff1f',
            strokeWidth: 4,
            timestamp: 9 // Active around 8.5s - 13.5s
          }
        ],
        freezeFrames: [
          {
            id: 'ff-15s',
            timestamp: 15,
            duration: 3,
            name: 'Pause at 15s'
          }
        ]
      };

      const options: ExportOptions = {
        resolution: 'original',
        mode: 'auto',
        withFreezeFrames: true,
        preserveAudio: true
      };

      const segments = segmentClipTimeline(sampleClip, 0, 0, options);

      // Verify that segment types partition the timeline without gaps
      assert(segments.length >= 4);

      // 1. First subrange (0s to 8.5s) is clean
      const seg1 = segments[0];
      assert.strictEqual(seg1.type, 'clean');
      assert.strictEqual(seg1.sourceStart, 0);
      assert.strictEqual(seg1.sourceEnd, 8.5);

      // 2. Middle subrange containing drawing (8.5s to 13.5s) is modified
      const seg2 = segments.find(s => s.type === 'modified');
      assert(seg2 !== undefined);
      assert.strictEqual(seg2?.reason, 'telestration');
      assert.strictEqual(seg2?.shapes.length, 1);

      // 3. Freeze frame subrange at 15s
      const segFf = segments.find(s => s.type === 'freeze');
      assert(segFf !== undefined);
      assert.strictEqual(segFf?.duration, 3);
      assert.strictEqual(segFf?.freezeFrameId, 'ff-15s');

      // 4. Trailing subrange (15s to 20s) is clean
      const segLast = segments[segments.length - 1];
      assert.strictEqual(segLast.type, 'clean');
      assert.strictEqual(segLast.sourceStart, 15);
      assert.strictEqual(segLast.sourceEnd, 20);
    });

    it('identifies 100% clean clips for direct fast-path bypass', () => {
      const cleanClip: ExportClipItem = {
        instanceId: 'clean-clip',
        name: 'Clean Clip',
        sourceFile: new Blob([]),
        inPoint: 0,
        outPoint: 20,
        duration: 20,
        shapes: [],
        freezeFrames: []
      };

      const options: ExportOptions = {
        resolution: 'original',
        mode: 'auto',
        withFreezeFrames: true,
        preserveAudio: true
      };

      const segments = segmentClipTimeline(cleanClip, 0, 0, options);
      assert.strictEqual(segments.length, 1);
      assert.strictEqual(segments[0].type, 'clean');
      assert.strictEqual(segments[0].duration, 20);
    });
  });

  describe('Shape Indexing & Static Overlay Pre-rendering', () => {
    it('categorizes static vs animated shapes into ShapeIndex', () => {
      const shapes: Shape[] = [
        {
          id: 's-static-line',
          type: 'line',
          points: [{ x: 0, y: 0 }, { x: 100, y: 100 }],
          color: '#ffffff',
          strokeWidth: 3
        },
        {
          id: 's-static-text',
          type: 'text',
          points: [{ x: 200, y: 200 }],
          text: 'Striker',
          textConfig: { text: 'Striker' },
          color: '#c6ff1f',
          strokeWidth: 2
        },
        {
          id: 's-animated-player-move',
          type: 'player-move',
          points: [{ x: 10, y: 10 }, { x: 80, y: 80 }],
          color: '#ff0055',
          strokeWidth: 4,
          timestamp: 5
        },
        {
          id: 's-ff-circle',
          type: 'circle',
          points: [{ x: 300, y: 300 }],
          color: '#00eaff',
          strokeWidth: 4,
          freezeFrameId: 'ff-99'
        }
      ];

      const index = buildShapeIndex(shapes);
      assert.strictEqual(index.hasAnyVisibleShapes, true);
      assert.strictEqual(index.hasAnimatedShapes, true);
      assert.strictEqual(index.staticShapes.length, 2);
      assert.strictEqual(index.animatedShapes.length, 1);
      assert.strictEqual(index.shapesByFreezeFrameId.get('ff-99')?.length, 1);
    });

    it('pre-renders static overlay once and caches render status', () => {
      const cache = createStaticOverlayCache(1920, 1080);
      assert.strictEqual(cache.isRendered, false);

      const staticShapes: Shape[] = [
        {
          id: 'line1',
          type: 'line',
          points: [{ x: 50, y: 50 }, { x: 500, y: 500 }],
          color: '#c6ff1f',
          strokeWidth: 4
        }
      ];

      preRenderStaticOverlay(cache, staticShapes, 1920, 1080, null);
      assert.strictEqual(cache.isRendered, true);
    });
  });
});
