import React from 'react';
import { GripVertical, Play, Copy, X, Scissors, MessageSquare, Film } from 'lucide-react';
import { Tag as TagData, TagEvent, Label, PlaylistItem, Project } from '../../types';
import { formatTime } from '../../utils/math';
import { resolveClipTiming, getClipEventId } from '../../utils/playlistUtils';

interface PlaylistClipItemProps {
  item: PlaylistItem;
  index: number;
  tagEvents: TagEvent[];
  tags: TagData[];
  labels?: Label[];
  allBatchProjects?: Project[];
  isSelected: boolean;
  isPlaying: boolean;
  isDragging: boolean;
  onSelect: (e: React.MouseEvent, eventId: string, startTime: number) => void;
  onOpenInTrimmer?: (index: number) => void;
  onPlayClip: (startTime: number, index: number) => void;
  onDuplicate: (index: number) => void;
  onRemove: (index: number) => void;
  onResetTrim?: (index: number) => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent, index: number) => void;
}

export const PlaylistClipItem: React.FC<PlaylistClipItemProps> = ({
  item,
  index,
  tagEvents,
  tags,
  labels = [],
  allBatchProjects,
  isSelected,
  isPlaying,
  isDragging,
  onSelect,
  onOpenInTrimmer,
  onPlayClip,
  onDuplicate,
  onRemove,
  onDragStart,
  onDragOver,
  onDrop,
}) => {
  const eventId = getClipEventId(item);
  let masterEvent = tagEvents.find(e => e.id === eventId);
  let resolvedTags = tags;
  let resolvedLabels = labels;
  let clipProjectName: string | undefined = typeof item !== 'string' ? item.projectName : undefined;

  // If not found in current match's events, search across all projects in the batch!
  if (!masterEvent && typeof item !== 'string' && item.projectId && allBatchProjects) {
    const originProject = allBatchProjects.find(p => p.id === item.projectId);
    if (originProject) {
      if (!clipProjectName) clipProjectName = originProject.name;
      masterEvent = originProject.data?.tagEvents?.find(e => e.id === eventId);
      if (originProject.data?.tags) resolvedTags = originProject.data.tags;
      if (originProject.data?.labels) resolvedLabels = originProject.data.labels;
    }
  }

  // Fallback search in allBatchProjects even if projectId wasn't recorded
  if (!masterEvent && allBatchProjects) {
    for (const p of allBatchProjects) {
      const found = p.data?.tagEvents?.find(e => e.id === eventId);
      if (found) {
        masterEvent = found;
        if (!clipProjectName) clipProjectName = p.name;
        if (p.data?.tags) resolvedTags = p.data.tags;
        if (p.data?.labels) resolvedLabels = p.data.labels;
        break;
      }
    }
  }

  const tag = masterEvent ? resolvedTags.find(t => t.id === masterEvent.tagId) : undefined;
  const timing = resolveClipTiming(item, masterEvent);

  if (!masterEvent) return null;

  const deltaFormatted = timing.durationDelta > 0 
    ? `+${timing.durationDelta.toFixed(1)}s`
    : `${timing.durationDelta.toFixed(1)}s`;

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={onDragOver}
      onDrop={(e) => onDrop(e, index)}
      onClick={(e) => onSelect(e, masterEvent!.id, timing.startTime)}
      className={`group relative flex flex-col justify-center px-2 py-1.5 rounded-lg border transition-all cursor-pointer select-none ${
        isPlaying
          ? 'bg-[#182012] border-[#c6ff1f] shadow-[0_0_10px_rgba(198,255,31,0.25)]'
          : isSelected
          ? 'bg-[#1c1c1f] border-[#c6ff1f]/60'
          : 'bg-[#131416] hover:bg-[#1a1b1f] border-[#24252a] hover:border-[#383a44]'
      } ${isDragging ? 'opacity-30 border-dashed border-gray-500' : ''}`}
    >
      {/* Optional Batch Match Header Pill */}
      {clipProjectName && (
        <div className="flex items-center gap-1 mb-1 pl-4">
          <span className="inline-flex items-center gap-1 text-[8.5px] font-semibold text-cyan-300 bg-cyan-950/60 border border-cyan-800/40 px-1.5 py-0.2 rounded max-w-[170px] truncate" title={`From Match: ${clipProjectName}`}>
            <Film className="w-2.5 h-2.5 shrink-0 text-cyan-400" />
            <span className="truncate">{clipProjectName}</span>
          </span>
        </div>
      )}

      {/* Top Row: Grip, Tag color dot, Tag Name, Scissors icon if trimmed, Labels, Index */}
      <div className="flex items-center gap-1.5 min-w-0">
        <div 
          className="cursor-grab text-gray-500 hover:text-gray-300 transition-colors shrink-0 p-0.5" 
          title="Drag to reorder clip"
        >
          <GripVertical className="w-3 h-3" />
        </div>

        <span
          className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
          style={{ backgroundColor: tag?.color || '#3b82f6' }}
        />

        {/* Clip Title & Trim Icon */}
        <div className="flex items-center gap-1 min-w-0 flex-1 overflow-hidden">
          <span className="text-[11px] font-bold text-white truncate" title={tag?.name || 'Clip'}>
            {tag?.name || 'Clip'}
          </span>

          {timing.isTrimmed && (
            <span 
              className="inline-flex items-center text-amber-400 shrink-0 ml-0.5" 
              title={`Trimmed (${deltaFormatted}) • [${formatTime(timing.startTime)} - ${formatTime(timing.endTime)}]`}
            >
              <Scissors className="w-3 h-3 text-amber-400 drop-shadow-sm" />
            </span>
          )}

          {masterEvent.labelIds && masterEvent.labelIds.length > 0 && (
            <span className="text-[#c6ff1f] text-[9px] font-medium truncate opacity-90 shrink min-w-0">
              • {masterEvent.labelIds.map(id => resolvedLabels.find(l => l.id === id)?.name).filter(Boolean).join(', ')}
            </span>
          )}
        </div>

        {/* Clip Index (fades on hover to avoid overlap with action buttons) */}
        <span className="text-[9px] font-mono text-gray-500 shrink-0 group-hover:opacity-0 transition-opacity ml-1">
          #{index + 1}
        </span>
      </div>

      {/* Sub Row: Timing & Duration */}
      <div className="flex items-center justify-between pl-5 pr-1 mt-0.5 text-[9px] font-mono text-gray-400">
        <span className="truncate">
          {formatTime(timing.startTime)} - {formatTime(timing.endTime)}
        </span>
        <span className="text-gray-300 font-semibold shrink-0 group-hover:opacity-0 transition-opacity ml-1">
          {formatTime(timing.duration)}
        </span>
      </div>

      {/* Hover Action Bar - Overlays cleanly on hover without crushing the title */}
      <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover:flex items-center gap-0.5 bg-[#141518]/95 backdrop-blur-md px-1 py-0.5 rounded border border-white/10 shadow-xl z-20">
        <button
          onClick={(e) => {
            e.stopPropagation();
            onPlayClip(timing.startTime, index);
          }}
          className="p-1 text-gray-300 hover:text-white rounded hover:bg-white/10 transition-colors"
          title="Play this clip"
        >
          <Play className="w-3 h-3 fill-current" />
        </button>

        {onOpenInTrimmer && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenInTrimmer(index);
            }}
            className="p-1 text-gray-300 hover:text-[#c6ff1f] rounded hover:bg-[#c6ff1f]/10 transition-colors"
            title="Open in Playlist Trimmer"
          >
            <Scissors className="w-3 h-3" />
          </button>
        )}

        <button
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate(index);
          }}
          className="p-1 text-gray-300 hover:text-[#c6ff1f] rounded hover:bg-[#c6ff1f]/10 transition-colors"
          title="Duplicate clip"
        >
          <Copy className="w-3 h-3" />
        </button>

        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(index);
          }}
          className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-red-500/10 transition-colors"
          title="Remove clip"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {masterEvent.notes && (
        <div className="flex items-start gap-1 text-[8px] text-gray-400 pl-5 border-l border-[#333] ml-1 mt-0.5">
          <MessageSquare className="w-2 h-2 mt-0.5 shrink-0 text-gray-500" />
          <span className="italic truncate">{masterEvent.notes}</span>
        </div>
      )}
    </div>
  );
};
