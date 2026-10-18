import type { Project, Playlist, TagEvent, Shape, FreezeFrame, MaskSettings } from '../../../types';
import { getClipEventId, getClipInstanceId, resolveClipTiming } from '../../../utils/playlistUtils';
import { loadFileHandle, loadVideoLocally } from '../../../utils/db';
import type { ExportClipItem, ExportOptions, CanonicalTimeline, TimelineSegment, ExportSegment } from './exportTypes';

/**
 * Calculates deterministic source-time intervals (clean, modified, freeze) for a single clip.
 */
export function segmentClipTimeline(
  clip: ExportClipItem,
  clipIndex: number,
  clipOutputStart: number,
  options: ExportOptions
): ExportSegment[] {
  const inPoint = Math.max(0, clip.inPoint);
  const outPoint = Math.max(inPoint, clip.outPoint);
  const shapes = clip.shapes || [];
  const freezeFrames = (options.withFreezeFrames ? (clip.freezeFrames || []) : [])
    .filter(ff => ff.timestamp >= inPoint - 0.05 && ff.timestamp <= outPoint + 0.05)
    .sort((a, b) => a.timestamp - b.timestamp);

  // Check for global shapes that span the entire clip (no timestamp and no freezeFrameId)
  const globalShapes = shapes.filter(s => !s.freezeFrameId && typeof s.timestamp !== 'number');

  // Find intervals of timed shapes
  const modifiedIntervals: {
    start: number;
    end: number;
    shapes: Shape[];
    reason: 'telestration' | 'animation' | 'chroma-key';
  }[] = [];

  if (globalShapes.length > 0) {
    modifiedIntervals.push({
      start: inPoint,
      end: outPoint,
      shapes: globalShapes,
      reason: 'telestration'
    });
  }

  const timedShapes = shapes.filter(s => !s.freezeFrameId && typeof s.timestamp === 'number');
  for (const s of timedShapes) {
    const t = s.timestamp as number;
    const spanStart = Math.max(inPoint, t - 0.5);
    const spanEnd = Math.min(outPoint, t + 4.5);
    if (spanEnd > spanStart) {
      modifiedIntervals.push({
        start: spanStart,
        end: spanEnd,
        shapes: [s],
        reason: 'telestration'
      });
    }
  }

  // Merge overlapping or adjacent modified intervals
  modifiedIntervals.sort((a, b) => a.start - b.start);
  const mergedModified: {
    start: number;
    end: number;
    shapes: Shape[];
    reason: 'telestration' | 'animation' | 'chroma-key';
  }[] = [];

  for (const interval of modifiedIntervals) {
    if (mergedModified.length === 0) {
      mergedModified.push({ ...interval });
    } else {
      const last = mergedModified[mergedModified.length - 1];
      if (interval.start <= last.end + 0.1) {
        last.end = Math.max(last.end, interval.end);
        for (const sh of interval.shapes) {
          if (!last.shapes.some(s => s.id === sh.id)) {
            last.shapes.push(sh);
          }
        }
      } else {
        mergedModified.push({ ...interval });
      }
    }
  }

  // Collect all critical partition points along source media timeline
  const criticalPoints = new Set<number>([inPoint, outPoint]);
  for (const m of mergedModified) {
    criticalPoints.add(m.start);
    criticalPoints.add(m.end);
  }
  for (const ff of freezeFrames) {
    const clampedFfTime = Math.min(outPoint, Math.max(inPoint, ff.timestamp));
    criticalPoints.add(clampedFfTime);
  }

  const sortedPoints = Array.from(criticalPoints).sort((a, b) => a - b);
  const resultSegments: ExportSegment[] = [];
  let currentOutputTime = clipOutputStart;

  for (let i = 0; i < sortedPoints.length - 1; i++) {
    const pStart = sortedPoints[i];
    const pEnd = sortedPoints[i + 1];
    if (pEnd <= pStart) continue;

    const spanDuration = pEnd - pStart;
    const midPoint = (pStart + pEnd) / 2;

    const modMatch = mergedModified.find(m => midPoint >= m.start && midPoint <= m.end);

    if (modMatch) {
      resultSegments.push({
        type: 'modified',
        clipIndex,
        sourceStart: pStart,
        sourceEnd: pEnd,
        outputStart: currentOutputTime,
        outputEnd: currentOutputTime + spanDuration,
        duration: spanDuration,
        reason: modMatch.reason,
        shapes: modMatch.shapes
      });
    } else {
      resultSegments.push({
        type: 'clean',
        clipIndex,
        sourceStart: pStart,
        sourceEnd: pEnd,
        outputStart: currentOutputTime,
        outputEnd: currentOutputTime + spanDuration,
        duration: spanDuration,
        shapes: []
      });
    }
    currentOutputTime += spanDuration;

    // Check if any freeze frame is anchored at pEnd
    const matchingFf = freezeFrames.find(ff => Math.abs(ff.timestamp - pEnd) < 0.001);
    if (matchingFf) {
      const ffDuration = Math.max(0.1, matchingFf.duration || 3);
      const ffShapes = shapes.filter(s => s.freezeFrameId === matchingFf.id);
      resultSegments.push({
        type: 'freeze',
        clipIndex,
        sourceStart: pEnd,
        sourceEnd: pEnd,
        outputStart: currentOutputTime,
        outputEnd: currentOutputTime + ffDuration,
        duration: ffDuration,
        freezeFrameId: matchingFf.id,
        activeFreezeFrame: matchingFf,
        shapes: ffShapes,
        reason: 'freeze'
      });
      currentOutputTime += ffDuration;
    }
  }

  // Edge case: if clip duration is 0 or empty points
  if (resultSegments.length === 0 && outPoint > inPoint) {
    resultSegments.push({
      type: shapes.length > 0 ? 'modified' : 'clean',
      clipIndex,
      sourceStart: inPoint,
      sourceEnd: outPoint,
      outputStart: clipOutputStart,
      outputEnd: clipOutputStart + (outPoint - inPoint),
      duration: outPoint - inPoint,
      shapes
    });
  }

  return resultSegments;
}

/**
 * Resolves the underlying File or Blob for a given project.
 * Uses FileSystemFileHandle if available, falls back to IndexedDB or active Blob URL.
 */
export async function resolveProjectFile(
  project: Project,
  allBatchProjects?: Project[],
  projectBlobs?: Map<string, string>,
  currentBlobUrl?: string
): Promise<File | Blob | null> {
  // 1. Try active File System File Handle
  try {
    const handle = await loadFileHandle(project.id);
    if (handle) {
      const opts = { mode: 'read' as const };
      const perm = await handle.queryPermission(opts);
      if (perm === 'granted') {
        const file = await handle.getFile();
        if (file && file.size > 0) return file;
      }
    }
  } catch (err) {
    console.warn(`FileHandle query failed for project ${project.id}:`, err);
  }

  // 2. Try IndexedDB stored File
  try {
    const file = await loadVideoLocally(project.id);
    if (file && file.size > 0) return file;
  } catch (err) {
    console.warn(`loadVideoLocally failed for project ${project.id}:`, err);
  }

  // 3. Try projectBlobs or current active blob URL
  const blobUrl = projectBlobs?.get(project.id) || (currentBlobUrl && !currentBlobUrl.startsWith('live') ? currentBlobUrl : null);
  if (blobUrl && blobUrl.startsWith('blob:')) {
    try {
      const resp = await fetch(blobUrl);
      if (resp.ok) {
        return await resp.blob();
      }
    } catch (err) {
      console.warn(`Fetch blob URL failed for project ${project.id}:`, err);
    }
  }

  return null;
}

export interface BuildTimelineParams {
  playlist: Playlist;
  currentProject: Project;
  allBatchProjects?: Project[];
  projectBlobs?: Map<string, string>;
  currentBlobUrl?: string;
  fallbackSourceFile?: File | Blob;
  maskSettings?: MaskSettings;
  options: ExportOptions;
}

/**
 * Resolves a playlist and its clips into fully prepared ExportClipItem descriptors.
 */
export async function buildPlaylistExportItems(params: BuildTimelineParams): Promise<{
  clips: ExportClipItem[];
  missingProjectNames: string[];
}> {
  const { playlist, currentProject, allBatchProjects = [currentProject], projectBlobs, currentBlobUrl, options } = params;
  const clips: ExportClipItem[] = [];
  const missingProjectNames: string[] = [];
  const fileCache = new Map<string, File | Blob>();

  for (let i = 0; i < playlist.events.length; i++) {
    const item = playlist.events[i];
    const eventId = getClipEventId(item);
    const instanceId = getClipInstanceId(item, i);

    // Identify target project
    const itemProjectId = typeof item === 'object' ? item.projectId : undefined;
    const targetProject =
      (itemProjectId ? allBatchProjects.find(p => p.id === itemProjectId) : null) ||
      allBatchProjects.find(p => p.data?.tagEvents?.some(e => e.id === eventId)) ||
      currentProject;

    // Find master tagEvent
    let tagEvent = targetProject.data?.tagEvents?.find(e => e.id === eventId);
    if (!tagEvent) {
      // Fallback search across all projects
      for (const p of allBatchProjects) {
        const found = p.data?.tagEvents?.find(e => e.id === eventId);
        if (found) {
          tagEvent = found;
          break;
        }
      }
    }

    const timing = resolveClipTiming(item, tagEvent);
    if (timing.duration <= 0.05) continue; // Skip degenerate empty clips

    // Resolve source video file
    let sourceFile = fileCache.get(targetProject.id) || (targetProject.id === currentProject.id ? params.fallbackSourceFile : undefined);
    if (!sourceFile) {
      const resolved = await resolveProjectFile(
        targetProject,
        allBatchProjects,
        projectBlobs,
        targetProject.id === currentProject.id ? currentBlobUrl : undefined
      );

      if (!resolved) {
        if (!missingProjectNames.includes(targetProject.name || 'Unnamed Project')) {
          missingProjectNames.push(targetProject.name || 'Unnamed Project');
        }
        continue;
      }

      sourceFile = resolved;
      fileCache.set(targetProject.id, sourceFile);
    }

    // Resolve tag name or clip title
    const tag = targetProject.data?.tags?.find(t => t.id === tagEvent?.tagId);
    const clipTitle =
      (typeof item === 'object' && item.notes) ||
      tag?.name ||
      `Clip ${i + 1}`;

    // Filter relevant shapes
    // Shapes with freezeFrameId matching freeze frames in this range, OR shapes created during clip time
    const projectFreezeFrames = targetProject.data?.freezeFrames || [];
    const relevantFreezeFrames = options.withFreezeFrames
      ? projectFreezeFrames.filter(
          ff => ff.timestamp >= timing.startTime - 0.1 && ff.timestamp <= timing.endTime + 0.1
        )
      : [];

    const relevantFfIds = new Set(relevantFreezeFrames.map(ff => ff.id));
    const projectShapes = targetProject.data?.shapes || [];

    const relevantShapes = projectShapes.filter(shape => {
      if (shape.freezeFrameId) {
        return relevantFfIds.has(shape.freezeFrameId);
      }
      // Shapes without freezeFrameId are visible if within clip bounds or global
      if (shape.timestamp) {
        return shape.timestamp >= timing.startTime - 0.5 && shape.timestamp <= timing.endTime + 0.5;
      }
      return true;
    });

    const itemMaskSettings =
      targetProject.data?.maskSettings ||
      params.maskSettings ||
      options.maskSettings;

    clips.push({
      instanceId,
      name: clipTitle,
      sourceFile,
      inPoint: timing.startTime,
      outPoint: timing.endTime,
      duration: timing.duration,
      shapes: relevantShapes,
      freezeFrames: relevantFreezeFrames,
      maskSettings: itemMaskSettings
    });
  }

  return { clips, missingProjectNames };
}

/**
 * Builds export items for an entire single project (or single selected range).
 */
export async function buildSingleProjectExportItem(
  project: Project,
  inPoint: number = 0,
  outPoint?: number,
  options?: ExportOptions,
  currentBlobUrl?: string,
  maskSettings?: MaskSettings
): Promise<ExportClipItem | null> {
  const sourceFile = await resolveProjectFile(project, [project], undefined, currentBlobUrl);
  if (!sourceFile) return null;

  const actualOut = outPoint && outPoint > inPoint ? outPoint : 999999;
  const projectFreezeFrames = project.data?.freezeFrames || [];
  const relevantFreezeFrames = (options?.withFreezeFrames ?? true)
    ? projectFreezeFrames.filter(ff => ff.timestamp >= inPoint - 0.1 && ff.timestamp <= actualOut + 0.1)
    : [];

  const relevantFfIds = new Set(relevantFreezeFrames.map(ff => ff.id));
  const relevantShapes = (project.data?.shapes || []).filter(shape => {
    if (shape.freezeFrameId) {
      return relevantFfIds.has(shape.freezeFrameId);
    }
    return true;
  });

  return {
    instanceId: `single-${project.id}-${Date.now()}`,
    name: project.name || 'Video Export',
    sourceFile,
    inPoint,
    outPoint: actualOut,
    duration: Math.max(0, actualOut - inPoint),
    shapes: relevantShapes,
    freezeFrames: relevantFreezeFrames,
    maskSettings: project.data?.maskSettings || maskSettings || options?.maskSettings
  };
}

/**
 * Builds a single canonical timeline shared by both video compositor and audio pipeline.
 * Guarantees mathematical A/V sync, deterministic freeze frame insertion, and safe clip transitions.
 */
export function createCanonicalTimeline(
  clips: ExportClipItem[],
  options: ExportOptions
): CanonicalTimeline {
  const segments: TimelineSegment[] = [];
  const clipBounds: { outputStart: number; outputEnd: number }[] = [];
  let currentOutputTime = 0;
  const audioPolicy = options.freezeFrameAudioPolicy || 'mute';

  const exportSegments: ExportSegment[] = [];

  for (let clipIdx = 0; clipIdx < clips.length; clipIdx++) {
    const clip = clips[clipIdx];
    const clipStartOutput = currentOutputTime;
    const inPoint = Math.max(0, clip.inPoint);
    const outPoint = Math.max(inPoint, clip.outPoint);

    const clipExportSegs = segmentClipTimeline(clip, clipIdx, clipStartOutput, options);
    exportSegments.push(...clipExportSegs);

    // Filter and sort freeze frames within this clip's time range
    const validFreezeFrames = (options.withFreezeFrames ? (clip.freezeFrames || []) : [])
      .filter(ff => ff.timestamp >= inPoint - 0.05 && ff.timestamp <= outPoint + 0.05)
      .sort((a, b) => a.timestamp - b.timestamp);

    let currentSourceTime = inPoint;

    for (const ff of validFreezeFrames) {
      // 1. Video segment preceding the freeze frame
      const clampedFfTime = Math.min(outPoint, Math.max(inPoint, ff.timestamp));
      if (clampedFfTime > currentSourceTime) {
        const segDuration = clampedFfTime - currentSourceTime;
        segments.push({
          type: 'video',
          clipIndex: clipIdx,
          sourceStart: currentSourceTime,
          sourceEnd: clampedFfTime,
          outputStart: currentOutputTime,
          outputEnd: currentOutputTime + segDuration,
          duration: segDuration
        });
        currentOutputTime += segDuration;
        currentSourceTime = clampedFfTime;
      }

      // 2. Synthetic Freeze Frame segment
      const ffDuration = Math.max(0.1, ff.duration || 3);
      segments.push({
        type: 'freeze',
        clipIndex: clipIdx,
        sourceStart: clampedFfTime,
        sourceEnd: clampedFfTime,
        outputStart: currentOutputTime,
        outputEnd: currentOutputTime + ffDuration,
        duration: ffDuration,
        freezeFrameId: ff.id,
        activeFreezeFrame: ff
      });
      currentOutputTime += ffDuration;
    }

    // 3. Trailing video segment after last freeze frame (or whole clip if no freeze frames)
    if (outPoint > currentSourceTime) {
      const remainingDuration = outPoint - currentSourceTime;
      segments.push({
        type: 'video',
        clipIndex: clipIdx,
        sourceStart: currentSourceTime,
        sourceEnd: outPoint,
        outputStart: currentOutputTime,
        outputEnd: currentOutputTime + remainingDuration,
        duration: remainingDuration
      });
      currentOutputTime += remainingDuration;
    }

    clipBounds.push({
      outputStart: clipStartOutput,
      outputEnd: currentOutputTime
    });
  }

  const totalDuration = currentOutputTime;

  // Map source media time for a specific clip to the corresponding output timeline time
  const mapSourceTimeToOutput = (clipIndex: number, sourceTime: number): number => {
    const clip = clips[clipIndex];
    if (!clip) return 0;
    const bounds = clipBounds[clipIndex];
    if (!bounds) return 0;

    const clipSegments = segments.filter(s => s.clipIndex === clipIndex);
    if (clipSegments.length === 0) return bounds.outputStart;

    if (sourceTime <= clip.inPoint) return bounds.outputStart;
    if (sourceTime >= clip.outPoint) return bounds.outputEnd;

    if (audioPolicy === 'continuous') {
      // Continuous audio runs concurrently without freeze-frame expansion
      return bounds.outputStart + Math.max(0, sourceTime - clip.inPoint);
    }

    // 'mute' policy: Find matching video segment or shift after freeze frames
    let accumulatedFreeze = 0;
    for (const seg of clipSegments) {
      if (seg.type === 'freeze') {
        if (sourceTime >= seg.sourceStart) {
          accumulatedFreeze += seg.duration;
        }
      }
    }

    return bounds.outputStart + (sourceTime - clip.inPoint) + accumulatedFreeze;
  };

  // Map output timeline time back to source media time, active freeze frame, and elapsed freeze duration
  const mapOutputTimeToSource = (outputTime: number) => {
    const clampedOutput = Math.max(0, Math.min(totalDuration, outputTime));
    const segment =
      segments.find(s => clampedOutput >= s.outputStart && clampedOutput < s.outputEnd) ||
      segments[segments.length - 1];

    if (!segment) {
      return {
        clipIndex: 0,
        sourceTime: 0,
        isFreeze: false,
        freezeElapsed: 0
      };
    }

    if (segment.type === 'freeze') {
      const freezeElapsed = clampedOutput - segment.outputStart;
      return {
        clipIndex: segment.clipIndex,
        sourceTime: segment.sourceStart,
        isFreeze: true,
        freezeFrame: segment.activeFreezeFrame,
        freezeElapsed
      };
    }

    const elapsedInSeg = clampedOutput - segment.outputStart;
    return {
      clipIndex: segment.clipIndex,
      sourceTime: segment.sourceStart + elapsedInSeg,
      isFreeze: false,
      freezeElapsed: 0
    };
  };

  const getClipOutputBounds = (clipIndex: number) => {
    return clipBounds[clipIndex] || { outputStart: 0, outputEnd: 0 };
  };

  return {
    segments,
    exportSegments,
    totalDuration,
    mapSourceTimeToOutput,
    mapOutputTimeToSource,
    getClipOutputBounds
  };
}
