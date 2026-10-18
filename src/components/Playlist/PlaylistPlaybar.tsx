import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, X, Scissors, RotateCcw, 
  ListPlus, Layers
} from 'lucide-react';
import { Playlist, TagEvent, Tag as TagData, Label } from '../../types';
import { formatTime } from '../../utils/math';
import { fadeColor } from '../../utils/colors';
import { 
  calculatePlaylistSequence, 
  getVideoTimeFromMacroTime, 
  getMacroTimeFromVideoTime,
  PlaylistSegment 
} from '../../utils/playlistUtils';

interface PlaylistPlaybarProps {
  playlist: Playlist;
  tagEvents: TagEvent[];
  tags: TagData[];
  labels?: Label[];
  allBatchProjects?: any[];
  currentProjectId?: string;
  videoRef: React.RefObject<HTMLVideoElement>;
  currentTime: number;
  videoDuration: number;
  isPlaying: boolean;
  activeClipIndex: number;
  onSelectClipIndex: (index: number, seekVideoTime?: number) => void;
  onUpdateClipTrim: (clipIndex: number, newStart: number, newEnd: number) => void;
  onResetClipTrim: (clipIndex: number) => void;
  onTogglePlay: () => void;
  onClose: () => void;
}

export const PlaylistPlaybar: React.FC<PlaylistPlaybarProps> = ({
  playlist,
  tagEvents,
  tags,
  labels = [],
  allBatchProjects,
  currentProjectId,
  videoRef,
  currentTime,
  videoDuration,
  isPlaying,
  activeClipIndex,
  onSelectClipIndex,
  onUpdateClipTrim,
  onResetClipTrim,
  onTogglePlay,
  onClose,
}) => {
  const [isDraggingMacro, setIsDraggingMacro] = useState(false);
  const [draggingMicro, setDraggingMicro] = useState<'start' | 'end' | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);
  const [tempStart, setTempStart] = useState<number>(0);
  const [tempEnd, setTempEnd] = useState<number>(0);
  const [microWindow, setMicroWindow] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  const macroTrackRef = useRef<HTMLDivElement>(null);

  // Compute contiguous macro timeline across all batch projects
  const { totalDuration, segments } = useMemo(() => {
    return calculatePlaylistSequence(playlist, tagEvents, allBatchProjects);
  }, [playlist, tagEvents, allBatchProjects]);

  // Safe active segment
  const activeSegment: PlaylistSegment | undefined = segments[activeClipIndex] || segments[0];

  // Sync tempStart/tempEnd when active clip changes or stops dragging
  useEffect(() => {
    if (!draggingMicro && activeSegment) {
      setTempStart(activeSegment.startTime);
      setTempEnd(activeSegment.endTime);

      // Add context padding (3.5s before, 3.5s after)
      const padding = 3.5;
      const minBound = Math.max(0, Math.min(activeSegment.startTime, activeSegment.originalStartTime) - padding);
      const maxBound = Math.min(videoDuration, Math.max(activeSegment.endTime, activeSegment.originalEndTime) + padding);
      setMicroWindow({ start: minBound, end: maxBound });
    }
  }, [activeClipIndex, activeSegment?.startTime, activeSegment?.endTime, draggingMicro, videoDuration]);

  // Clamped current video time within the active clip range [tempStart, tempEnd]
  const clampedVideoTime = useMemo(() => {
    if (!activeSegment) return currentTime;
    return Math.max(tempStart, Math.min(tempEnd, currentTime));
  }, [activeSegment, tempStart, tempEnd, currentTime]);

  // Calculate current macro playhead time
  const currentMacroTime = useMemo(() => {
    return getMacroTimeFromVideoTime(clampedVideoTime, activeClipIndex, segments);
  }, [clampedVideoTime, activeClipIndex, segments]);

  // --- MACRO TRACK SCRUBBING & DRAGGING ---
  const seekMacroAtClientX = useCallback((clientX: number) => {
    if (!macroTrackRef.current || totalDuration <= 0) return;
    const track = macroTrackRef.current.getBoundingClientRect();
    const clickX = clientX - track.left;
    const pct = Math.max(0, Math.min(1, clickX / track.width));
    const targetMacroTime = pct * totalDuration;

    const { videoTime, clipIndex } = getVideoTimeFromMacroTime(targetMacroTime, segments);
    const targetSeg = segments[clipIndex];
    onSelectClipIndex(clipIndex, videoTime);
    if (videoRef.current && (!targetSeg?.projectId || targetSeg.projectId === currentProjectId)) {
      videoRef.current.currentTime = videoTime;
    }
  }, [totalDuration, segments, onSelectClipIndex, videoRef, currentProjectId]);

  const handleMacroMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDraggingMacro(true);
    seekMacroAtClientX(e.clientX);
  };

  useEffect(() => {
    if (isDraggingMacro) {
      const onMouseMove = (e: MouseEvent) => {
        seekMacroAtClientX(e.clientX);
      };
      const onMouseUp = () => {
        setIsDraggingMacro(false);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [isDraggingMacro, seekMacroAtClientX]);

  // --- MICRO TRIMMER HANDLE DRAGGING ---
  const handleMicroMouseMove = useCallback((e: MouseEvent) => {
    if (!draggingMicro || !activeSegment) return;
    const container = document.getElementById('playlist-micro-trimmer-track');
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, offsetX / rect.width));
    const windowDuration = microWindow.end - microWindow.start;
    const newTime = microWindow.start + (pct * windowDuration);

    if (draggingMicro === 'start') {
      const clamped = Math.min(newTime, tempEnd - 0.2);
      const safeStart = Math.max(0, clamped);
      setTempStart(safeStart);
      if (videoRef.current && Math.abs(videoRef.current.currentTime - safeStart) > 0.05) {
        videoRef.current.currentTime = safeStart;
      }
    } else {
      const clamped = Math.max(newTime, tempStart + 0.2);
      const safeEnd = Math.min(videoDuration, clamped);
      setTempEnd(safeEnd);
      if (videoRef.current && Math.abs(videoRef.current.currentTime - safeEnd) > 0.05) {
        videoRef.current.currentTime = safeEnd;
      }
    }
  }, [draggingMicro, microWindow, tempStart, tempEnd, videoDuration, videoRef, activeSegment]);

  const handleMicroMouseUp = useCallback(() => {
    if (draggingMicro) {
      onUpdateClipTrim(activeClipIndex, tempStart, tempEnd);
      setDraggingMicro(null);
    }
  }, [draggingMicro, activeClipIndex, tempStart, tempEnd, onUpdateClipTrim]);

  useEffect(() => {
    if (draggingMicro) {
      window.addEventListener('mousemove', handleMicroMouseMove);
      window.addEventListener('mouseup', handleMicroMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMicroMouseMove);
        window.removeEventListener('mouseup', handleMicroMouseUp);
      };
    }
  }, [draggingMicro, handleMicroMouseMove, handleMicroMouseUp]);

  // --- MICRO PLAYHEAD (VIDEO POINT) DRAGGING (Strictly clamped to [tempStart, tempEnd]) ---
  const seekMicroPlayheadAtClientX = useCallback((clientX: number) => {
    const container = document.getElementById('playlist-micro-trimmer-track');
    if (!container || !activeSegment) return;
    const rect = container.getBoundingClientRect();
    const offsetX = clientX - rect.left;
    const pct = Math.max(0, Math.min(1, offsetX / rect.width));
    const windowDuration = microWindow.end - microWindow.start;
    const rawTime = microWindow.start + (pct * windowDuration);
    // User can control video point dragge strictly within the range of playlist videos, not before and after!
    const clamped = Math.max(tempStart, Math.min(tempEnd, rawTime));
    if (videoRef.current) {
      videoRef.current.currentTime = clamped;
    }
  }, [activeSegment, microWindow, tempStart, tempEnd, videoRef]);

  useEffect(() => {
    if (isDraggingPlayhead) {
      const onMouseMove = (e: MouseEvent) => {
        seekMicroPlayheadAtClientX(e.clientX);
      };
      const onMouseUp = () => {
        setIsDraggingPlayhead(false);
      };
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onMouseUp);
      return () => {
        window.removeEventListener('mousemove', onMouseMove);
        window.removeEventListener('mouseup', onMouseUp);
      };
    }
  }, [isDraggingPlayhead, seekMicroPlayheadAtClientX]);

  // Nudge start or end
  const handleNudge = (type: 'start' | 'end', delta: number) => {
    if (!activeSegment) return;
    if (type === 'start') {
      const newS = Math.max(0, Math.min(tempStart + delta, tempEnd - 0.2));
      setTempStart(newS);
      onUpdateClipTrim(activeClipIndex, newS, tempEnd);
      if (videoRef.current) videoRef.current.currentTime = newS;
    } else {
      const newE = Math.max(tempStart + 0.2, Math.min(videoDuration, tempEnd + delta));
      setTempEnd(newE);
      onUpdateClipTrim(activeClipIndex, tempStart, newE);
      if (videoRef.current) videoRef.current.currentTime = newE;
    }
  };

  // Calculations for Micro Trimmer percentages
  const microDuration = Math.max(0.01, microWindow.end - microWindow.start);
  const activeStartPct = Math.max(0, Math.min(100, ((tempStart - microWindow.start) / microDuration) * 100));
  const activeWidthPct = Math.max(0, Math.min(100 - activeStartPct, ((tempEnd - tempStart) / microDuration) * 100));

  // Ghost master event calculations
  const origStartPct = activeSegment 
    ? Math.max(0, Math.min(100, ((activeSegment.originalStartTime - microWindow.start) / microDuration) * 100))
    : 0;
  const origWidthPct = activeSegment
    ? Math.max(0, Math.min(100 - origStartPct, ((activeSegment.originalEndTime - activeSegment.originalStartTime) / microDuration) * 100))
    : 0;

  // Micro playhead position (strictly clamped to [tempStart, tempEnd])
  const microPlayheadPct = ((clampedVideoTime - microWindow.start) / microDuration) * 100;
  const showMicroPlayhead = microPlayheadPct >= 0 && microPlayheadPct <= 100;

  // Jump to clip
  const jumpPrev = () => {
    if (activeClipIndex > 0) {
      const nextIndex = activeClipIndex - 1;
      const targetSeg = segments[nextIndex];
      const targetTime = targetSeg?.startTime;
      onSelectClipIndex(nextIndex, targetTime);
      if (videoRef.current && targetSeg && (!targetSeg.projectId || targetSeg.projectId === currentProjectId)) {
        videoRef.current.currentTime = targetSeg.startTime;
      }
    }
  };

  const jumpNext = () => {
    if (activeClipIndex < segments.length - 1) {
      const nextIndex = activeClipIndex + 1;
      const targetSeg = segments[nextIndex];
      const targetTime = targetSeg?.startTime;
      onSelectClipIndex(nextIndex, targetTime);
      if (videoRef.current && targetSeg && (!targetSeg.projectId || targetSeg.projectId === currentProjectId)) {
        videoRef.current.currentTime = targetSeg.startTime;
      }
    }
  };

  const activeTag = activeSegment?.tagEvent ? tags.find(t => t.id === activeSegment.tagEvent?.tagId) : undefined;
  const activeLabels = activeSegment?.tagEvent?.labelIds?.map(id => labels.find(l => l.id === id)?.name).filter(Boolean) || [];

  return (
    <motion.div 
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 15 }}
      transition={{ duration: 0.2 }}
      className="relative w-full z-50 flex flex-col bg-[#0b0c0e]/95 backdrop-blur-xl border-t border-[#2a2c32] shadow-2xl select-none"
    >
      {/* Top Header Controls: Playlist Info, Clip Selection, Play Controls & Exit */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-[#1f2127] flex-wrap gap-2">
        {/* Left: Playlist & Active Clip Metadata */}
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#c6ff1f]/15 border border-[#c6ff1f]/40 text-[#c6ff1f] text-[10px] font-bold uppercase tracking-wider shrink-0">
            <ListPlus className="w-3 h-3" />
            <span>Playlist Mode</span>
          </div>

          <span className="text-gray-400 text-xs font-semibold truncate hidden sm:inline">
            {playlist.name}
          </span>

          <span className="text-gray-600 text-xs">•</span>

          {/* Active Clip Title */}
          <div className="flex items-center gap-1.5 min-w-0">
            <span 
              className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: activeTag?.color || '#3b82f6' }}
            />
            <span className="text-xs font-bold text-white truncate flex items-center gap-1.5">
              <span>#{activeClipIndex + 1} {activeTag?.name || 'Clip'}</span>
              {activeSegment?.projectName && (
                <span className="text-[10px] font-semibold text-cyan-300 bg-cyan-950/70 border border-cyan-700/50 px-1.5 py-0.5 rounded font-mono truncate max-w-[140px]" title={`Match: ${activeSegment.projectName}`}>
                  {activeSegment.projectName}
                </span>
              )}
              {activeLabels.length > 0 && (
                <span className="text-[#c6ff1f] font-normal">
                  ({activeLabels.join(', ')})
                </span>
              )}
            </span>
          </div>

          {/* Trimmed Badge + Reset to Master (only on playlist bar) */}
          {activeSegment?.isTrimmed ? (
            <div className="flex items-center gap-1 shrink-0 ml-1">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm animate-pulse">
                <Scissors className="w-3 h-3" />
                <span>Trimmed ({activeSegment.durationDelta > 0 ? `+${activeSegment.durationDelta.toFixed(1)}s` : `${activeSegment.durationDelta.toFixed(1)}s`})</span>
              </span>
              <button
                onClick={() => onResetClipTrim(activeClipIndex)}
                className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] text-gray-300 hover:text-white bg-[#1e2025] hover:bg-[#282a31] border border-white/10 transition-colors"
                title={`Revert to original master event duration (${formatTime(activeSegment.originalDuration)})`}
              >
                <RotateCcw className="w-2.5 h-2.5" />
                <span className="hidden md:inline">Reset to Master</span>
              </button>
            </div>
          ) : (
            <span className="text-[10px] text-gray-500 font-mono hidden md:inline">
              (Master Duration)
            </span>
          )}
        </div>

        {/* Center: Playback & Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={jumpPrev}
            disabled={activeClipIndex <= 0}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#1f2127] disabled:opacity-30 transition-colors"
            title="Previous Clip (Q)"
          >
            <SkipBack className="w-4 h-4" />
          </button>

          <button
            onClick={onTogglePlay}
            className="p-1.5 bg-[#c6ff1f] hover:bg-[#a5db0f] text-black rounded-full transition-transform active:scale-95 shadow-[0_0_10px_rgba(198,255,31,0.4)] flex items-center justify-center"
            title={isPlaying ? "Pause Reel (Space)" : "Play Reel (Space)"}
          >
            {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
          </button>

          <button
            onClick={jumpNext}
            disabled={activeClipIndex >= segments.length - 1}
            className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-[#1f2127] disabled:opacity-30 transition-colors"
            title="Next Clip (E)"
          >
            <SkipForward className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Sequence Time Readout & Return to Master */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-[11px] font-mono text-gray-300 bg-[#16181d] px-2.5 py-1 rounded-md border border-white/5 flex items-center gap-2">
            <span className="text-gray-400 text-[10px]">REEL:</span>
            <span className="text-[#c6ff1f] font-bold">{formatTime(currentMacroTime)}</span>
            <span className="text-gray-500">/ {formatTime(totalDuration)}</span>
            <span className="text-gray-400 text-[10px] border-l border-white/10 pl-2">
              {activeClipIndex + 1} of {segments.length}
            </span>
          </div>

          <button
            onClick={onClose}
            className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-[#1f2127] hover:bg-[#282a32] text-gray-300 hover:text-white text-xs font-medium border border-white/10 transition-colors"
            title="Exit Playlist Mode and return to Master Timeline"
          >
            <X className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Return to Timeline</span>
          </button>
        </div>
      </div>

      {/* TIER 1: MACRO SEQUENCE BAR (Total Playlist contiguous reel) */}
      <div className="px-4 pt-2.5 pb-1 flex flex-col gap-1">
        <div className="flex items-center justify-between text-[10px] text-gray-400 font-mono">
          <span className="flex items-center gap-1 font-semibold text-gray-300">
            <Layers className="w-3 h-3 text-[#c6ff1f]" />
            Playlist Sequence (Total Reel: {formatTime(totalDuration)})
          </span>
          <span className="text-gray-400 text-[9px]">
            Drag video point to scrub sequence • Click any block to jump
          </span>
        </div>

        <div 
          ref={macroTrackRef}
          onMouseDown={handleMacroMouseDown}
          className="relative h-7 w-full bg-[#121418] rounded-lg border border-white/10 flex overflow-hidden cursor-pointer shadow-inner group select-none"
        >
          {segments.map((seg, idx) => {
            const widthPct = totalDuration > 0 ? (seg.duration / totalDuration) * 100 : 0;
            const tag = seg.tagEvent ? tags.find(t => t.id === seg.tagEvent?.tagId) : undefined;
            const isSegActive = idx === activeClipIndex;

            return (
              <div
                key={seg.instanceId}
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectClipIndex(idx, seg.startTime);
                  if (videoRef.current && (!seg.projectId || seg.projectId === currentProjectId)) {
                    videoRef.current.currentTime = seg.startTime;
                  }
                }}
                style={{
                  width: `${widthPct}%`,
                  backgroundColor: fadeColor(tag?.color || '#3b82f6', isSegActive ? 0.45 : 0.2),
                  borderRight: idx < segments.length - 1 ? '1px solid rgba(255,255,255,0.15)' : 'none',
                }}
                className={`relative h-full flex items-center justify-between px-1.5 transition-all text-left overflow-hidden ${
                  isSegActive 
                    ? 'ring-2 ring-[#c6ff1f] z-10 shadow-[inset_0_0_8px_rgba(198,255,31,0.3)]' 
                    : 'hover:brightness-125'
                }`}
                title={`Clip #${idx + 1}: ${tag?.name || 'Clip'} (${formatTime(seg.duration)})${seg.projectName ? ` • ${seg.projectName}` : ''}${seg.isTrimmed ? ' [Trimmed]' : ''}`}
              >
                <div className="flex items-center gap-1 min-w-0 pointer-events-none">
                  <span className="text-[10px] font-bold text-white truncate">
                    {idx + 1}. {tag?.name || 'Clip'}
                  </span>
                  {seg.projectName && (
                    <span className="text-[8px] px-1 py-0.2 rounded bg-black/60 text-cyan-200 border border-cyan-500/30 font-mono shrink-0 hidden sm:inline">
                      {seg.projectName}
                    </span>
                  )}
                  {seg.isTrimmed && (
                    <Scissors className="w-2.5 h-2.5 text-amber-300 shrink-0" />
                  )}
                </div>
                <span className="text-[9px] font-mono text-gray-300 opacity-70 shrink-0 ml-1 pointer-events-none">
                  {formatTime(seg.duration)}
                </span>
              </div>
            );
          })}

          {/* Macro Playhead (Draggable) */}
          {totalDuration > 0 && (
            <div 
              className="absolute top-0 bottom-0 w-[2px] bg-[#c6ff1f] shadow-[0_0_10px_rgba(198,255,31,1)] z-30 cursor-ew-resize group/macroplayhead"
              style={{ left: `${Math.max(0, Math.min(100, (currentMacroTime / totalDuration) * 100))}%` }}
            >
              <div 
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDraggingMacro(true);
                }}
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-[#c6ff1f] border-2 border-black shadow-lg cursor-grab active:cursor-grabbing hover:scale-125 transition-transform" 
                title="Drag video playhead across playlist"
              />
            </div>
          )}
        </div>
      </div>

      {/* TIER 2: MICRO CLIP TRIMMER (Precision zoom on currently selected clip) */}
      <div className="px-4 pt-1.5 pb-3 flex flex-col gap-1.5">
        {/* Micro Header: Timestamps, Nudges, In/Out info */}
        <div className="flex items-center justify-between text-[11px] font-mono flex-wrap gap-2">
          <div className="flex items-center gap-2">
            <span className="text-gray-400 text-[10px] font-sans font-bold uppercase tracking-wider">
              Clip Trimmer:
            </span>
            <div className="flex items-center gap-1 bg-[#14161b] px-2 py-0.5 rounded border border-white/5">
              <span className="text-gray-400">IN:</span>
              <span className="text-white font-bold">{formatTime(tempStart)}</span>
              {activeSegment?.isTrimmed && (
                <span className="text-amber-400 text-[9px] ml-1">
                  (Orig: {formatTime(activeSegment.originalStartTime)})
                </span>
              )}
            </div>
            
            {/* Nudge Buttons for In Point */}
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => handleNudge('start', -0.2)}
                className="px-1 py-0.5 bg-[#1f2127] hover:bg-[#2a2c34] text-[9px] text-gray-300 rounded"
                title="Expand start -0.2s"
              >
                -0.2s
              </button>
              <button 
                onClick={() => handleNudge('start', 0.2)}
                className="px-1 py-0.5 bg-[#1f2127] hover:bg-[#2a2c34] text-[9px] text-gray-300 rounded"
                title="Trim start +0.2s"
              >
                +0.2s
              </button>
            </div>
          </div>

          {/* Center Duration Readout with Delta */}
          <div className="flex items-center gap-1.5">
            <span className="text-gray-400">DURATION:</span>
            <span className="text-[#c6ff1f] font-bold text-xs">{formatTime(tempEnd - tempStart)}</span>
            {activeSegment?.isTrimmed && (
              <span className="text-amber-300 text-[10px]">
                [{activeSegment.durationDelta > 0 ? `+${activeSegment.durationDelta.toFixed(1)}s` : `${activeSegment.durationDelta.toFixed(1)}s`}]
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Nudge Buttons for Out Point */}
            <div className="flex items-center gap-0.5">
              <button 
                onClick={() => handleNudge('end', -0.2)}
                className="px-1 py-0.5 bg-[#1f2127] hover:bg-[#2a2c34] text-[9px] text-gray-300 rounded"
                title="Trim end -0.2s"
              >
                -0.2s
              </button>
              <button 
                onClick={() => handleNudge('end', 0.2)}
                className="px-1 py-0.5 bg-[#1f2127] hover:bg-[#2a2c34] text-[9px] text-gray-300 rounded"
                title="Expand end +0.2s"
              >
                +0.2s
              </button>
            </div>

            <div className="flex items-center gap-1 bg-[#14161b] px-2 py-0.5 rounded border border-white/5">
              <span className="text-gray-400">OUT:</span>
              <span className="text-white font-bold">{formatTime(tempEnd)}</span>
              {activeSegment?.isTrimmed && (
                <span className="text-amber-400 text-[9px] ml-1">
                  (Orig: {formatTime(activeSegment.originalEndTime)})
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Micro Track Container */}
        <div 
          id="playlist-micro-trimmer-track"
          className="relative h-11 w-full bg-[#121418] rounded-xl border border-white/10 shadow-inner overflow-hidden cursor-crosshair select-none"
        >
          {/* Subtle ruler grid ticks */}
          <div className="absolute inset-0 flex justify-between items-center px-1 opacity-15 pointer-events-none">
            {[...Array(50)].map((_, i) => (
              <div key={i} className={`w-[1px] ${i % 5 === 0 ? 'h-3 bg-white' : 'h-1.5 bg-gray-500'}`} />
            ))}
          </div>

          {/* GHOST MASTER EVENT RANGE (Faint dashed reference zone) */}
          {activeSegment && (
            <div
              className="absolute top-0 bottom-0 h-full pointer-events-none z-10 border-y border-dashed border-white/20 bg-white/[0.03]"
              style={{
                left: `${origStartPct}%`,
                width: `${origWidthPct}%`
              }}
              title={`Original Master Event: ${formatTime(activeSegment.originalStartTime)} - ${formatTime(activeSegment.originalEndTime)}`}
            >
              <div className="absolute top-0 left-0 bottom-0 w-[2px] bg-white/40" />
              <div className="absolute top-0 right-0 bottom-0 w-[2px] bg-white/40" />
              <div className="absolute top-1 left-2 text-[9px] text-white/40 font-mono pointer-events-none">
                Master Bounds [{formatTime(activeSegment.originalDuration)}]
              </div>
            </div>
          )}

          {/* ACTIVE TRIMMED CLIP REGION - Click/Drag scrubs video point strictly within [tempStart, tempEnd] */}
          <div
            className="absolute top-0 bottom-0 h-full z-20 cursor-pointer"
            style={{
              left: `${activeStartPct}%`,
              width: `${activeWidthPct}%`,
              backgroundColor: fadeColor(activeTag?.color || '#3b82f6', 0.3),
              borderLeft: `2px solid ${activeTag?.color || '#3b82f6'}`,
              borderRight: `2px solid ${activeTag?.color || '#3b82f6'}`
            }}
            onMouseDown={(e) => {
              seekMicroPlayheadAtClientX(e.clientX);
              setIsDraggingPlayhead(true);
            }}
          >
            {/* Shimmer gradient */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/15 to-transparent pointer-events-none" />

            {/* Left Drag Handle (IN Point) */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingMicro('start');
              }}
              className="absolute left-0 top-0 bottom-0 w-8 -ml-4 cursor-ew-resize flex items-center justify-center pointer-events-auto z-30 group/handle"
              title="Drag to trim IN point (non-destructive for playlist)"
            >
              <div className="w-3.5 h-8 bg-[#1f2127] rounded-md border border-[#c6ff1f] shadow-[0_0_8px_rgba(0,0,0,0.8)] flex items-center justify-center group-hover/handle:scale-110 group-hover/handle:bg-[#2a2c34] transition-all">
                <div className="w-[2px] h-3.5 bg-[#c6ff1f] rounded-full" />
              </div>
            </div>

            {/* Right Drag Handle (OUT Point) */}
            <div
              onMouseDown={(e) => {
                e.stopPropagation();
                setDraggingMicro('end');
              }}
              className="absolute right-0 top-0 bottom-0 w-8 -mr-4 cursor-ew-resize flex items-center justify-center pointer-events-auto z-30 group/handle"
              title="Drag to trim OUT point (non-destructive for playlist)"
            >
              <div className="w-3.5 h-8 bg-[#1f2127] rounded-md border border-[#c6ff1f] shadow-[0_0_8px_rgba(0,0,0,0.8)] flex items-center justify-center group-hover/handle:scale-110 group-hover/handle:bg-[#2a2c34] transition-all">
                <div className="w-[2px] h-3.5 bg-[#c6ff1f] rounded-full" />
              </div>
            </div>

            {/* Clip Title Overlay inside the trimmed region */}
            <div className="w-full h-full flex items-center justify-center pointer-events-none px-4">
              <span className="text-[10px] font-bold text-white tracking-wide truncate bg-black/60 px-2 py-0.5 rounded border border-white/10 shadow-sm">
                {activeTag?.name || 'Clip'} • {formatTime(tempEnd - tempStart)}
              </span>
            </div>
          </div>

          {/* Micro Playhead (Draggable Video Point - strictly clamped to clip range) */}
          {showMicroPlayhead && (
            <div
              className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-40 shadow-[0_0_12px_rgba(239,68,68,0.9)] cursor-ew-resize group/microplayhead"
              style={{ left: `${microPlayheadPct}%` }}
            >
              <div 
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDraggingPlayhead(true);
                }}
                className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-xl cursor-grab active:cursor-grabbing group-hover/microplayhead:scale-125 transition-transform" 
                title="Drag video point within clip bounds"
              />
              <div 
                onMouseDown={(e) => {
                  e.stopPropagation();
                  setIsDraggingPlayhead(true);
                }}
                className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-3 h-7 bg-red-500 rounded-full shadow-md border border-red-300 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform flex items-center justify-center"
              >
                <div className="w-[1px] h-3 bg-white/80 rounded-full" />
              </div>
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};
