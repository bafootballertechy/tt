import { PlaylistItem, PlaylistClip, Playlist, TagEvent } from '../types';

export interface ResolvedClipTiming {
  startTime: number;
  endTime: number;
  duration: number;
  originalStartTime: number;
  originalEndTime: number;
  originalDuration: number;
  isTrimmed: boolean;
  inTrimDelta: number;
  outTrimDelta: number;
  durationDelta: number;
}

export interface PlaylistSegment {
  index: number;
  instanceId: string;
  eventId: string;
  projectId?: string;
  projectName?: string;
  item: PlaylistItem;
  tagEvent?: TagEvent;
  startTime: number;
  endTime: number;
  duration: number;
  originalStartTime: number;
  originalEndTime: number;
  originalDuration: number;
  isTrimmed: boolean;
  durationDelta: number;
  macroStart: number;
  macroEnd: number;
}

/**
 * Extracts the master event ID from a PlaylistItem (whether string or PlaylistClip object)
 */
export function getClipEventId(item: PlaylistItem | undefined | null): string {
  if (!item) return '';
  if (typeof item === 'string') return item;
  return item.eventId || '';
}

/**
 * Gets a stable unique instance ID for a playlist item
 */
export function getClipInstanceId(item: PlaylistItem | undefined | null, fallbackIndex: number): string {
  if (!item) return `clip-${fallbackIndex}`;
  if (typeof item === 'string') return `${item}-${fallbackIndex}`;
  return item.instanceId || `${item.eventId || 'item'}-${fallbackIndex}`;
}

/**
 * Resolves the effective start/end times and calculates delta against the master timeline event
 */
export function resolveClipTiming(
  item: PlaylistItem | undefined | null,
  masterEvent: TagEvent | undefined | null
): ResolvedClipTiming {
  const originalStart = masterEvent ? masterEvent.startTime : 0;
  const originalEnd = masterEvent ? masterEvent.endTime : 0;
  const originalDuration = Math.max(0, originalEnd - originalStart);

  if (!item || typeof item === 'string') {
    return {
      startTime: originalStart,
      endTime: originalEnd,
      duration: originalDuration,
      originalStartTime: originalStart,
      originalEndTime: originalEnd,
      originalDuration,
      isTrimmed: false,
      inTrimDelta: 0,
      outTrimDelta: 0,
      durationDelta: 0
    };
  }

  const startTime = item.inPoint !== undefined ? item.inPoint : originalStart;
  const endTime = item.outPoint !== undefined ? item.outPoint : originalEnd;
  const duration = Math.max(0, endTime - startTime);

  const isTrimmed = Boolean(
    (item.inPoint !== undefined && Math.abs(item.inPoint - originalStart) > 0.05) ||
    (item.outPoint !== undefined && Math.abs(item.outPoint - originalEnd) > 0.05)
  );

  const inTrimDelta = startTime - originalStart;
  const outTrimDelta = endTime - originalEnd;
  const durationDelta = duration - originalDuration;

  return {
    startTime,
    endTime,
    duration,
    originalStartTime: originalStart,
    originalEndTime: originalEnd,
    originalDuration,
    isTrimmed,
    inTrimDelta,
    outTrimDelta,
    durationDelta
  };
}

/**
 * Updates a playlist item's custom trim without affecting the master event
 */
export function updateClipTrim(
  item: PlaylistItem,
  newStart: number,
  newEnd: number,
  instanceId?: string
): PlaylistClip {
  const eventId = getClipEventId(item);
  const stableId = instanceId || (typeof item === 'object' && item.instanceId ? item.instanceId : `${eventId}-${Date.now()}`);
  const existingNotes = typeof item === 'object' ? item.notes : undefined;
  const projectId = typeof item === 'object' ? item.projectId : undefined;
  const projectName = typeof item === 'object' ? item.projectName : undefined;

  return {
    instanceId: stableId,
    eventId,
    projectId,
    projectName,
    inPoint: Math.max(0, Math.min(newStart, newEnd - 0.1)),
    outPoint: Math.max(newStart + 0.1, newEnd),
    notes: existingNotes
  };
}

/**
 * Resets a playlist item's trim back to master event bounds
 */
export function resetClipTrim(item: PlaylistItem): PlaylistItem {
  const eventId = getClipEventId(item);
  if (typeof item === 'string') return item;
  return {
    instanceId: item.instanceId,
    eventId,
    projectId: item.projectId,
    projectName: item.projectName,
    notes: item.notes
  };
}

/**
 * Computes contiguous macro-timeline coordinates for all clips in a playlist
 */
export function calculatePlaylistSequence(
  playlist: Playlist | undefined | null,
  tagEvents: TagEvent[],
  allBatchProjects?: any[]
): { totalDuration: number; segments: PlaylistSegment[] } {
  if (!playlist || !playlist.events || playlist.events.length === 0) {
    return { totalDuration: 0, segments: [] };
  }

  let accumulatedTime = 0;
  const segments: PlaylistSegment[] = [];

  playlist.events.forEach((item, index) => {
    const eventId = getClipEventId(item);
    let tagEvent = tagEvents.find(e => e.id === eventId);
    let projectId = typeof item === 'object' ? item.projectId : undefined;
    let projectName = typeof item === 'object' ? item.projectName : undefined;

    // Fallback to search allBatchProjects if tagEvent or project metadata is missing
    if (allBatchProjects && (!tagEvent || !projectId || !projectName)) {
      if (projectId) {
        const p = allBatchProjects.find(bp => bp.id === projectId);
        if (p) {
          if (!tagEvent) tagEvent = p.data?.tagEvents?.find((e: any) => e.id === eventId);
          if (!projectName) projectName = p.name;
        }
      }
      if (!tagEvent) {
        for (const p of allBatchProjects) {
          const found = p.data?.tagEvents?.find((e: any) => e.id === eventId);
          if (found) {
            tagEvent = found;
            if (!projectId) projectId = p.id;
            if (!projectName) projectName = p.name;
            break;
          }
        }
      }
    }

    const resolved = resolveClipTiming(item, tagEvent);
    const duration = resolved.duration;

    const macroStart = accumulatedTime;
    const macroEnd = accumulatedTime + duration;
    accumulatedTime = macroEnd;

    segments.push({
      index,
      instanceId: getClipInstanceId(item, index),
      eventId,
      projectId,
      projectName,
      item,
      tagEvent,
      startTime: resolved.startTime,
      endTime: resolved.endTime,
      duration,
      originalStartTime: resolved.originalStartTime,
      originalEndTime: resolved.originalEndTime,
      originalDuration: resolved.originalDuration,
      isTrimmed: resolved.isTrimmed,
      durationDelta: resolved.durationDelta,
      macroStart,
      macroEnd
    });
  });

  return { totalDuration: accumulatedTime, segments };
}

/**
 * Translates current master video time into macro-timeline time
 */
export function getMacroTimeFromVideoTime(
  videoTime: number,
  activeClipIndex: number,
  segments: PlaylistSegment[]
): number {
  if (!segments.length || activeClipIndex < 0 || activeClipIndex >= segments.length) {
    return 0;
  }
  const currentSegment = segments[activeClipIndex];
  const clipProgress = Math.max(0, Math.min(currentSegment.duration, videoTime - currentSegment.startTime));
  return currentSegment.macroStart + clipProgress;
}

/**
 * Translates macro-timeline time into target video time and clip index
 */
export function getVideoTimeFromMacroTime(
  macroTime: number,
  segments: PlaylistSegment[]
): { videoTime: number; clipIndex: number } {
  if (!segments.length) return { videoTime: 0, clipIndex: 0 };

  const clampedMacro = Math.max(0, Math.min(macroTime, segments[segments.length - 1].macroEnd));
  
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i];
    if (clampedMacro >= seg.macroStart && (clampedMacro < seg.macroEnd || i === segments.length - 1)) {
      const offset = clampedMacro - seg.macroStart;
      return {
        videoTime: seg.startTime + offset,
        clipIndex: i
      };
    }
  }

  return { videoTime: segments[0].startTime, clipIndex: 0 };
}
