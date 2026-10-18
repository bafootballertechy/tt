import { describe, it } from 'node:test';
import assert from 'node:assert';
import { buildPlaylistExportItems, buildSingleProjectExportItem, createCanonicalTimeline } from '../exportTimeline';
import { checkFastPathFeasibility } from '../media/remuxPipeline';
import type { Project, Playlist, TagEvent, Shape, FreezeFrame, ExportClipItem } from '../../../../types';

describe('exportTimeline and fast path checks', () => {
  const dummyBlob = new Blob(['dummy video content'], { type: 'video/mp4' });

  const dummyProject: Project = {
    id: 'proj-1',
    name: 'Tactical Analysis Match 1',
    description: 'Full match analysis',
    createdAt: Date.now(),
    lastModified: Date.now(),
    data: {
      shapes: [
        {
          id: 'shape-1',
          type: 'arrow',
          points: [{ x: 10, y: 10 }, { x: 100, y: 100 }],
          color: '#c6ff1f',
          strokeWidth: 4,
          timestamp: 5
        },
        {
          id: 'shape-ff',
          type: 'circle',
          points: [{ x: 50, y: 50 }],
          color: '#ff0055',
          strokeWidth: 4,
          timestamp: 12,
          freezeFrameId: 'ff-1'
        }
      ],
      freezeFrames: [
        {
          id: 'ff-1',
          timestamp: 12,
          duration: 3,
          name: 'Defensive Line Freeze'
        }
      ],
      tags: [
        { id: 'tag-1', name: 'Counter Attack', color: '#c6ff1f', shortcut: 'C' },
        { id: 'tag-2', name: 'High Press', color: '#00eaff', shortcut: 'H' }
      ],
      tagEvents: [
        { id: 'evt-1', tagId: 'tag-1', startTime: 2, endTime: 15 },
        { id: 'evt-2', tagId: 'tag-2', startTime: 20, endTime: 35 }
      ],
      playlists: [],
      markers: []
    }
  };

  it('builds export items for playlist clips with custom in/out trim and freeze frames', async () => {
    const playlist: Playlist = {
      id: 'pl-1',
      name: 'Highlight Reel',
      events: [
        {
          instanceId: 'clip-1',
          eventId: 'evt-1',
          inPoint: 4,
          outPoint: 14 // Intersects ff-1 at 12s
        },
        {
          instanceId: 'clip-2',
          eventId: 'evt-2',
          inPoint: 22,
          outPoint: 30
        }
      ]
    };

    const { clips } = await buildPlaylistExportItems({
      playlist,
      currentProject: dummyProject,
      currentBlobUrl: 'blob:mock-url',
      fallbackSourceFile: dummyBlob,
      options: {
        resolution: 'original',
        mode: 'auto',
        withFreezeFrames: true,
        preserveAudio: true
      }
    });

    assert.strictEqual(clips.length, 2);
    assert.strictEqual(clips[0].inPoint, 4);
    assert.strictEqual(clips[0].outPoint, 14);
    assert.strictEqual(clips[0].freezeFrames.length, 1);
    assert.strictEqual(clips[0].freezeFrames[0].id, 'ff-1');
    assert.strictEqual(clips[1].freezeFrames.length, 0);
  });

  describe('canonical timeline model & A/V sync', () => {
    const sampleClip1: ExportClipItem = {
      instanceId: 'clip-1',
      name: 'Pressing Sequence',
      sourceFile: dummyBlob,
      inPoint: 10,
      outPoint: 20, // 10s source duration
      duration: 10,
      shapes: [],
      freezeFrames: [
        { id: 'ff-a', timestamp: 14, duration: 3, name: 'Freeze at 14s' }
      ]
    };

    const sampleClip2: ExportClipItem = {
      instanceId: 'clip-2',
      name: 'Counter Goal',
      sourceFile: dummyBlob,
      inPoint: 30,
      outPoint: 38, // 8s source duration
      duration: 8,
      shapes: [],
      freezeFrames: []
    };

    it('calculates exact total duration with freeze frames (10s + 3s freeze + 8s = 21s)', () => {
      const timeline = createCanonicalTimeline([sampleClip1, sampleClip2], {
        resolution: 'original',
        mode: 'auto',
        withFreezeFrames: true,
        preserveAudio: true,
        freezeFrameAudioPolicy: 'mute'
      });

      assert.strictEqual(timeline.totalDuration, 21);
      assert.strictEqual(timeline.segments.length, 4); // [clip1 video 10..14, clip1 freeze 3s, clip1 video 14..20, clip2 video 30..38]
    });

    it('maps source media time to output timeline with A/V shift under mute policy', () => {
      const timeline = createCanonicalTimeline([sampleClip1, sampleClip2], {
        resolution: 'original',
        mode: 'auto',
        withFreezeFrames: true,
        preserveAudio: true,
        freezeFrameAudioPolicy: 'mute'
      });

      // Clip 1 pre-freeze (source: 12s -> output: 2s)
      assert.strictEqual(timeline.mapSourceTimeToOutput(0, 12), 2);

      // Clip 1 post-freeze (source: 16s -> output: 4s + 3s freeze + 2s = 9s)
      assert.strictEqual(timeline.mapSourceTimeToOutput(0, 16), 9);

      // Clip 2 (starts at output: 13s, source: 32s -> output: 13 + (32-30) = 15s)
      assert.strictEqual(timeline.mapSourceTimeToOutput(1, 32), 15);
    });

    it('maps continuous commentary timeline without freeze frame audio expansion', () => {
      const timeline = createCanonicalTimeline([sampleClip1, sampleClip2], {
        resolution: 'original',
        mode: 'auto',
        withFreezeFrames: true,
        preserveAudio: true,
        freezeFrameAudioPolicy: 'continuous'
      });

      // Under continuous commentary, source 16s is simply clip 1 start + 6s
      assert.strictEqual(timeline.mapSourceTimeToOutput(0, 16), 6);
    });

    it('maps output time back to source time and freeze frame state', () => {
      const timeline = createCanonicalTimeline([sampleClip1, sampleClip2], {
        resolution: 'original',
        mode: 'auto',
        withFreezeFrames: true,
        preserveAudio: true,
        freezeFrameAudioPolicy: 'mute'
      });

      // Output at 5.5s is inside freeze frame (which runs from 4s to 7s)
      const freezeSample = timeline.mapOutputTimeToSource(5.5);
      assert.strictEqual(freezeSample.isFreeze, true);
      assert.strictEqual(freezeSample.sourceTime, 14);
      assert.strictEqual(freezeSample.freezeElapsed, 1.5);
      assert.strictEqual(freezeSample.freezeFrame?.id, 'ff-a');

      // Output at 8s is post-freeze in clip 1 (4s pre-freeze + 3s freeze + 1s post = source 15s)
      const postFreezeSample = timeline.mapOutputTimeToSource(8);
      assert.strictEqual(postFreezeSample.isFreeze, false);
      assert.strictEqual(postFreezeSample.sourceTime, 15);

      // Output at 14s is in clip 2 (13s clip1 end + 1s = source 31s)
      const clip2Sample = timeline.mapOutputTimeToSource(14);
      assert.strictEqual(clip2Sample.clipIndex, 1);
      assert.strictEqual(clip2Sample.sourceTime, 31);
    });
  });

  describe('fast-path stream remuxing & GOP safety', () => {
    const cleanOriginClip: ExportClipItem = {
      instanceId: 'clean-origin',
      name: 'Unedited stream origin',
      sourceFile: dummyBlob,
      inPoint: 0,
      outPoint: 10,
      duration: 10,
      shapes: [],
      freezeFrames: []
    };

    const cleanNonOriginClip: ExportClipItem = {
      instanceId: 'clean-mid',
      name: 'Arbitrary mid-stream cut',
      sourceFile: dummyBlob,
      inPoint: 8.45,
      outPoint: 18.45,
      duration: 10,
      shapes: [],
      freezeFrames: []
    };

    const media = {
      input: {} as any,
      videoTrack: {} as any,
      audioTrack: {} as any,
      duration: 60,
      width: 1920,
      height: 1080,
      fps: 30,
      codec: 'avc1.640028'
    };

    const options = {
      resolution: 'original' as const,
      mode: 'auto' as const,
      withFreezeFrames: true,
      preserveAudio: true
    };

    it('permits fast path for clean clip starting at stream origin (inPoint <= 0.05s)', () => {
      const result = checkFastPathFeasibility(cleanOriginClip, media, options);
      assert.strictEqual(result.canUseFastPath, true);
    });

    it('rejects fast path for arbitrary mid-stream cut without verified IDR keyframe to prevent GOP corruption', () => {
      const result = checkFastPathFeasibility(cleanNonOriginClip, media, options);
      assert.strictEqual(result.canUseFastPath, false);
      assert(result.reason?.includes('Non-origin cut'));
    });

    it('rejects fast path across multi-clip playlists to enforce rendered track normalization', () => {
      const result = checkFastPathFeasibility({
        clip: cleanOriginClip,
        media,
        options,
        allClips: [cleanOriginClip, cleanOriginClip]
      });
      assert.strictEqual(result.canUseFastPath, false);
      assert(result.reason?.includes('Multi-clip playlists require rendered normalization'));
    });

    it('rejects fast path when clip has shapes or freeze frames', () => {
      const clipWithShape: ExportClipItem = {
        instanceId: 'clip-shapes',
        name: 'Telestration clip',
        sourceFile: dummyBlob,
        inPoint: 0,
        outPoint: 10,
        duration: 10,
        shapes: [{ id: 's1', type: 'pen' as const, points: [{ x: 0, y: 0 }], color: '#fff', strokeWidth: 2, timestamp: 2 }],
        freezeFrames: []
      };

      const result = checkFastPathFeasibility(clipWithShape, media, options);
      assert.strictEqual(result.canUseFastPath, false);
      assert(result.reason?.includes('telestration'));
    });
  });
});

