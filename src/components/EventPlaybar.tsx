import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Trash2, Snowflake, ListPlus, Play, Pause, Scissors, Check } from 'lucide-react';
import { Tag as TagData, TagEvent, FreezeFrame, Label } from '../types';
import { formatTime } from '../utils/math';
import { fadeColor } from '../utils/colors';

export const EventPlaybar = ({ 
    event, 
    tag, 
    labels = [],
    videoDuration,
    currentTime, 
    freezeFrames = [],
    isPlaying = false,
    onTogglePlay,
    onUpdate, 
    videoRef,
    onClose,
    onDelete,
    onAddToPlaylist,
    activePlaylistName
}: { 
    event: TagEvent; 
    tag?: TagData; 
    labels?: Label[];
    videoDuration: number;
    currentTime: number; 
    freezeFrames?: FreezeFrame[];
    isPlaying?: boolean;
    onTogglePlay?: () => void;
    onUpdate: (start: number, end: number) => void;
    videoRef: React.RefObject<HTMLVideoElement>;
    onClose: () => void;
    onDelete?: () => void;
    onAddToPlaylist?: (force?: boolean) => void;
    activePlaylistName?: string;
}) => {
    const [dragging, setDragging] = useState<'start' | 'end' | null>(null);
    const [draggingPlayhead, setDraggingPlayhead] = useState(false);
    const [tempStart, setTempStart] = useState(event.startTime);
    const [tempEnd, setTempEnd] = useState(event.endTime);
    const [viewWindow, setViewWindow] = useState<{start: number, end: number}>({ start: 0, end: 0 });

    useEffect(() => {
        if (!dragging) {
            setTempStart(event.startTime);
            setTempEnd(event.endTime);
            const padding = 4; 
            const newStart = Math.max(0, event.startTime - padding);
            const newEnd = Math.min(videoDuration, event.endTime + padding);
            setViewWindow({ start: newStart, end: newEnd });
        }
    }, [event.id, event.startTime, event.endTime, videoDuration, dragging]);

    const handleDragStart = (type: 'start' | 'end') => {
        setDragging(type);
    };

    const handleMouseMove = useCallback((e: MouseEvent) => {
        if (!dragging) return;
        const container = document.getElementById('event-trimmer-track');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, offsetX / rect.width));
        const windowDuration = viewWindow.end - viewWindow.start;
        const newTime = viewWindow.start + (pct * windowDuration);
        
        if (dragging === 'start') {
            const clamped = Math.min(newTime, tempEnd - 0.2); 
            const safe = Math.max(0, clamped);
            setTempStart(safe);
            if (videoRef.current && Math.abs(videoRef.current.currentTime - safe) > 0.05) {
                videoRef.current.currentTime = safe;
            }
        } else {
            const clamped = Math.max(newTime, tempStart + 0.2);
            const safe = Math.min(videoDuration, clamped);
            setTempEnd(safe);
            if (videoRef.current && Math.abs(videoRef.current.currentTime - safe) > 0.05) {
                videoRef.current.currentTime = safe;
            }
        }
    }, [dragging, viewWindow, tempStart, tempEnd, videoDuration, videoRef]);

    const handleMouseUp = useCallback(() => {
        if (dragging) {
            onUpdate(tempStart, tempEnd);
            setDragging(null);
        }
    }, [dragging, tempStart, tempEnd, onUpdate]);

    useEffect(() => {
        if (dragging) {
            window.addEventListener('mousemove', handleMouseMove);
            window.addEventListener('mouseup', handleMouseUp);
            return () => {
                window.removeEventListener('mousemove', handleMouseMove);
                window.removeEventListener('mouseup', handleMouseUp);
            };
        }
    }, [dragging, handleMouseMove, handleMouseUp]);

    // Playhead dragging strictly clamped to [tempStart, tempEnd]
    const seekPlayheadAtClientX = useCallback((clientX: number) => {
        const container = document.getElementById('event-trimmer-track');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const offsetX = clientX - rect.left;
        const pct = Math.max(0, Math.min(1, offsetX / rect.width));
        const windowDuration = viewWindow.end - viewWindow.start;
        const rawTime = viewWindow.start + (pct * windowDuration);
        const clamped = Math.max(tempStart, Math.min(tempEnd, rawTime));
        if (videoRef.current) {
            videoRef.current.currentTime = clamped;
        }
    }, [viewWindow, tempStart, tempEnd, videoRef]);

    useEffect(() => {
        if (draggingPlayhead) {
            const onMouseMove = (e: MouseEvent) => {
                seekPlayheadAtClientX(e.clientX);
            };
            const onMouseUp = () => {
                setDraggingPlayhead(false);
            };
            window.addEventListener('mousemove', onMouseMove);
            window.addEventListener('mouseup', onMouseUp);
            return () => {
                window.removeEventListener('mousemove', onMouseMove);
                window.removeEventListener('mouseup', onMouseUp);
            };
        }
    }, [draggingPlayhead, seekPlayheadAtClientX]);

    const handleNudge = (type: 'start' | 'end', delta: number) => {
        if (type === 'start') {
            const newS = Math.max(0, Math.min(tempStart + delta, tempEnd - 0.2));
            setTempStart(newS);
            onUpdate(newS, tempEnd);
            if (videoRef.current) videoRef.current.currentTime = newS;
        } else {
            const newE = Math.max(tempStart + 0.2, Math.min(videoDuration, tempEnd + delta));
            setTempEnd(newE);
            onUpdate(tempStart, newE);
            if (videoRef.current) videoRef.current.currentTime = newE;
        }
    };

    const windowDuration = Math.max(0.01, viewWindow.end - viewWindow.start);
    const startPct = ((tempStart - viewWindow.start) / windowDuration) * 100;
    const durationPct = ((tempEnd - tempStart) / windowDuration) * 100;

    const safeStartPct = Math.max(0, Math.min(100, startPct));
    const safeWidthPct = Math.max(0, Math.min(100 - safeStartPct, durationPct));

    const clampedCurrentTime = Math.max(tempStart, Math.min(tempEnd, currentTime));
    const playheadPct = ((clampedCurrentTime - viewWindow.start) / windowDuration) * 100;
    const showPlayhead = playheadPct >= 0 && playheadPct <= 100;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 15 }}
            transition={{ duration: 0.2 }}
            className="relative w-full z-50 flex flex-col bg-[#0b0c0e]/95 backdrop-blur-xl border-t border-[#2a2c32] shadow-2xl select-none px-4 py-2.5 gap-2 overflow-visible"
        >
            {/* Header: Title, Play/Pause, IN/OUT Readouts & Actions */}
            <div className="flex items-center justify-between flex-wrap gap-2.5">
                {/* Left: Badge, Color Dot, Title, Play/Pause */}
                <div className="flex items-center gap-2.5 min-w-0">
                    <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#3b82f6]/15 border border-[#3b82f6]/40 text-[#60a5fa] text-[10px] font-bold uppercase tracking-wider shrink-0">
                        <Scissors className="w-3 h-3" />
                        <span>Trimmer</span>
                    </div>

                    <span 
                        className="w-2.5 h-2.5 rounded-full shadow-sm shrink-0" 
                        style={{ backgroundColor: tag?.color || '#3b82f6' }} 
                    />

                    <span className="text-xs font-bold text-white tracking-wide truncate max-w-[160px] sm:max-w-[240px]">
                        {tag?.name || 'Event'}
                        {event.labelIds && event.labelIds.length > 0 && (
                            <span className="text-[#c6ff1f] font-normal ml-1.5">
                                ({event.labelIds.map(id => labels.find(l => l.id === id)?.name).filter(Boolean).join(', ')})
                            </span>
                        )}
                    </span>

                    {onTogglePlay && (
                        <button
                            onClick={onTogglePlay}
                            className="p-1 px-2.5 bg-[#c6ff1f] hover:bg-[#b0e817] text-black rounded-full transition-transform active:scale-95 flex items-center gap-1.5 text-xs font-bold shadow-[0_0_10px_rgba(198,255,31,0.35)] shrink-0 ml-1"
                            title={isPlaying ? "Pause Event (Space)" : "Play Event (Space)"}
                        >
                            {isPlaying ? <Pause className="w-3.5 h-3.5 fill-current" /> : <Play className="w-3.5 h-3.5 fill-current ml-0.5" />}
                            <span>{isPlaying ? 'Pause' : 'Play'}</span>
                        </button>
                    )}
                </div>

                {/* Right: IN, DUR, OUT, Add to Playlist, Delete, Done */}
                <div className="flex items-center gap-2.5 flex-wrap">
                    {/* IN point & nudge */}
                    <div className="flex items-center gap-1 bg-[#14161b] px-2 py-0.5 rounded border border-white/5 text-[10px] font-mono">
                        <span className="text-gray-400">IN:</span>
                        <span className="text-white font-bold">{formatTime(tempStart)}</span>
                        <div className="flex items-center gap-0.5 ml-1">
                            <button onClick={() => handleNudge('start', -0.2)} className="px-1 py-0.2 bg-[#1f2127] hover:bg-[#282a31] rounded text-[9px] text-gray-300" title="Expand start -0.2s">-0.2</button>
                            <button onClick={() => handleNudge('start', 0.2)} className="px-1 py-0.2 bg-[#1f2127] hover:bg-[#282a31] rounded text-[9px] text-gray-300" title="Trim start +0.2s">+0.2</button>
                        </div>
                    </div>

                    {/* Duration */}
                    <div className="text-[10px] font-mono text-[#c6ff1f] font-bold px-2 py-0.5 bg-[#14161b] rounded border border-white/5">
                        DUR: {formatTime(tempEnd - tempStart)}
                    </div>

                    {/* OUT point & nudge */}
                    <div className="flex items-center gap-1 bg-[#14161b] px-2 py-0.5 rounded border border-white/5 text-[10px] font-mono">
                        <span className="text-gray-400">OUT:</span>
                        <span className="text-white font-bold">{formatTime(tempEnd)}</span>
                        <div className="flex items-center gap-0.5 ml-1">
                            <button onClick={() => handleNudge('end', -0.2)} className="px-1 py-0.2 bg-[#1f2127] hover:bg-[#282a31] rounded text-[9px] text-gray-300" title="Trim end -0.2s">-0.2</button>
                            <button onClick={() => handleNudge('end', 0.2)} className="px-1 py-0.2 bg-[#1f2127] hover:bg-[#282a31] rounded text-[9px] text-gray-300" title="Expand end +0.2s">+0.2</button>
                        </div>
                    </div>

                    <div className="w-[1px] h-3 bg-white/10 hidden sm:block" />

                    {onAddToPlaylist && (
                        <button 
                            onClick={(e) => onAddToPlaylist(e.shiftKey)}
                            className="flex items-center gap-1.5 px-2.5 py-1 bg-[#c6ff1f]/15 hover:bg-[#c6ff1f] text-[#c6ff1f] hover:text-black rounded-md text-[11px] font-bold border border-[#c6ff1f]/40 transition-all shadow-sm group shrink-0"
                            title={`Add clip to playlist ${activePlaylistName ? `"${activePlaylistName}"` : ''} (Ctrl+S)`}
                        >
                            <ListPlus className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Add to Playlist</span>
                        </button>
                    )}

                    {onDelete && (
                        <button 
                            onClick={onDelete} 
                            className="p-1.5 hover:bg-red-500/20 rounded-md text-gray-400 hover:text-red-400 transition-colors shrink-0" 
                            title="Delete Event"
                        >
                            <Trash2 className="w-3.5 h-3.5" />
                        </button>
                    )}

                    <button 
                        onClick={onClose} 
                        className="flex items-center gap-1.5 px-3 py-1 bg-[#1f2127] hover:bg-[#282a32] text-gray-200 hover:text-white rounded-md text-xs font-semibold border border-white/10 transition-colors shadow-sm shrink-0" 
                        title="Done Trimming"
                    >
                        <Check className="w-3.5 h-3.5 text-[#c6ff1f]" />
                        <span>Done</span>
                    </button>
                </div>
            </div>

            {/* Trimmer Track Container */}
            <div 
                id="event-trimmer-track"
                className="relative h-11 w-full bg-[#121418] rounded-xl border border-white/10 shadow-inner overflow-hidden cursor-crosshair select-none"
            >
                {/* Visual Grid/Ticks */}
                <div className="absolute inset-0 flex justify-between items-center px-1 opacity-15 pointer-events-none">
                     {[...Array(50)].map((_, i) => (
                         <div key={i} className={`w-[1px] ${i % 5 === 0 ? 'h-3 bg-white' : 'h-1.5 bg-gray-500'}`} />
                     ))}
                </div>

                {/* The Event Region */}
                <div 
                    className="absolute top-0 bottom-0 h-full group z-20 cursor-pointer"
                    style={{ 
                        left: `${safeStartPct}%`, 
                        width: `${safeWidthPct}%`,
                        backgroundColor: fadeColor(tag?.color || '#3b82f6', 0.25),
                        borderLeft: `2px solid ${tag?.color || '#3b82f6'}`,
                        borderRight: `2px solid ${tag?.color || '#3b82f6'}`
                    }}
                    onMouseDown={(e) => {
                        seekPlayheadAtClientX(e.clientX);
                        setDraggingPlayhead(true);
                    }}
                >   
                    <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                    
                    {/* Left Handle (IN Point) */}
                    <div 
                        onMouseDown={(e) => { e.stopPropagation(); handleDragStart('start'); }}
                        className="absolute left-0 top-0 bottom-0 w-8 -ml-4 cursor-ew-resize flex items-center justify-center group/handle pointer-events-auto transition-colors z-30"
                        title="Drag to trim IN point"
                    >
                        <div className="w-3.5 h-8 bg-[#1f2127] rounded-md border border-[#c6ff1f] shadow-[0_0_8px_rgba(0,0,0,0.8)] flex items-center justify-center group-hover/handle:scale-110 group-hover/handle:bg-[#2a2c34] transition-all">
                            <div className="w-[2px] h-3.5 bg-[#c6ff1f] rounded-full" />
                        </div>
                    </div>

                    {/* Right Handle (OUT Point) */}
                    <div 
                        onMouseDown={(e) => { e.stopPropagation(); handleDragStart('end'); }}
                        className="absolute right-0 top-0 bottom-0 w-8 -mr-4 cursor-ew-resize flex items-center justify-center group/handle pointer-events-auto transition-colors z-30"
                        title="Drag to trim OUT point"
                    >
                        <div className="w-3.5 h-8 bg-[#1f2127] rounded-md border border-[#c6ff1f] shadow-[0_0_8px_rgba(0,0,0,0.8)] flex items-center justify-center group-hover/handle:scale-110 group-hover/handle:bg-[#2a2c34] transition-all">
                            <div className="w-[2px] h-3.5 bg-[#c6ff1f] rounded-full" />
                        </div>
                    </div>
                    
                    {/* Center Clip Title */}
                    <div className="w-full h-full flex items-center justify-center pointer-events-none px-4">
                         <span className="text-[10px] font-bold text-white tracking-wide truncate bg-black/60 px-2 py-0.5 rounded border border-white/10 shadow-sm">
                            {tag?.name || 'Event'} • {formatTime(tempEnd - tempStart)}
                         </span>
                    </div>
                </div>

                {/* Freeze Frames */}
                <div className="absolute top-0 bottom-0 left-0 w-full pointer-events-none z-30">
                    {freezeFrames.filter(ff => ff.timestamp >= viewWindow.start && ff.timestamp <= viewWindow.end).map(ff => {
                        const ffPct = ((ff.timestamp - viewWindow.start) / windowDuration) * 100;
                        return (
                            <div key={ff.id} style={{ left: `${ffPct}%` }} className="absolute top-0 bottom-0 w-[2px] bg-[#c6ff1f] shadow-[0_0_8px_rgba(198,255,31,0.8)]">
                                <div className="absolute -top-1 left-1/2 -translate-x-1/2">
                                    <Snowflake className="w-2.5 h-2.5 text-[#a0d600] fill-[#c6ff1f] drop-shadow-md" />
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Draggable Playhead (Video Point Indicator) */}
                {showPlayhead && (
                    <div 
                        className="absolute top-0 bottom-0 w-[2px] bg-red-500 z-40 shadow-[0_0_12px_rgba(239,68,68,0.9)] cursor-ew-resize group/playhead"
                        style={{ left: `${playheadPct}%` }}
                    >
                        <div 
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingPlayhead(true);
                            }}
                            className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-xl cursor-grab active:cursor-grabbing group-hover/playhead:scale-125 transition-transform pointer-events-auto"
                            title="Drag video playhead"
                        />
                        <div 
                            onMouseDown={(e) => {
                                e.stopPropagation();
                                setDraggingPlayhead(true);
                            }}
                            className="absolute top-1/2 -translate-y-1/2 left-1/2 -translate-x-1/2 w-3 h-7 bg-red-500 rounded-full shadow-md border border-red-300 cursor-grab active:cursor-grabbing hover:scale-110 transition-transform pointer-events-auto flex items-center justify-center" 
                        >
                            <div className="w-[1px] h-3 bg-white/80 rounded-full" />
                        </div>
                    </div>
                )}
            </div>
        </motion.div>
    );
};
