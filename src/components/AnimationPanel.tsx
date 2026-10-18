import React, { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { X, Play, Pause, Square, Trash2, Maximize, Clock, ScanEye } from 'lucide-react';
import { Shape, FreezeFrame, ToolType } from '../types';
import { fadeColor } from '../utils/colors';

const TOOL_ICONS: Record<string, React.FC<any>> = {
  'pen': () => <Square className="w-3 h-3" />,
  'arrow': () => <Square className="w-3 h-3" />,
  'line': () => <Square className="w-3 h-3" />,
  'circle': () => <Square className="w-3 h-3" />,
  'polygon': () => <Square className="w-3 h-3" />,
  'scanner': () => <ScanEye className="w-3 h-3" />,
  // fallback
};

export const AnimationPanel = ({
  freezeFrame,
  shapes,
  setShapes,
  onClose,
  previewTime,
  setPreviewTime,
  isPlaying,
  setIsPlaying,
  width,
  selectedShapeId,
  setSelectedShapeId
}: {
  freezeFrame: FreezeFrame;
  shapes: Shape[];
  setShapes: React.Dispatch<React.SetStateAction<Shape[]>>;
  onClose: () => void;
  previewTime: number;
  setPreviewTime: React.Dispatch<React.SetStateAction<number>>;
  isPlaying: boolean;
  setIsPlaying: (p: boolean) => void;
  width?: number;
  selectedShapeId: string | null;
  setSelectedShapeId: (id: string | null) => void;
}) => {
  const duration = freezeFrame.duration || 10;
  const ffShapes = shapes.filter(s => s.freezeFrameId === freezeFrame.id);
  const [dragging, setDragging] = useState<{ id: string, type: 'start' | 'end' | 'move' } | null>(null);
  const [isDraggingPlayhead, setIsDraggingPlayhead] = useState(false);

  useEffect(() => {
    let interval: any;
    if (isPlaying && !isDraggingPlayhead) {
      interval = setInterval(() => {
        setPreviewTime(prev => {
          if (prev >= duration) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 0.1;
        });
      }, 100);
    }
    return () => clearInterval(interval);
  }, [isPlaying, isDraggingPlayhead, duration, setIsPlaying, setPreviewTime]);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (isDraggingPlayhead) {
        const container = document.getElementById('animation-timeline-track');
        if (!container) return;
        const rect = container.getBoundingClientRect();
        const offsetX = e.clientX - rect.left;
        const pct = Math.max(0, Math.min(1, offsetX / rect.width));
        setPreviewTime(pct * duration);
        return;
    }

    if (!dragging) return;
    const container = document.getElementById('animation-timeline-track');
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const offsetX = e.clientX - rect.left;
    const pct = Math.max(0, Math.min(1, offsetX / rect.width));
    const newTime = pct * duration;

    setShapes(prev => prev.map(s => {
      if (s.id !== dragging.id) return s;
      const start = s.animStart ?? 0;
      const end = s.animEnd ?? duration;
      if (dragging.type === 'start') {
         return { ...s, animStart: Math.min(newTime, end - 0.1) };
      } else if (dragging.type === 'end') {
         return { ...s, animEnd: Math.max(newTime, start + 0.1) };
      } else if (dragging.type === 'move') {
         const dur = end - start;
         let nStart = newTime - (dur / 2);
         let nEnd = newTime + (dur / 2);
         if (nStart < 0) { nStart = 0; nEnd = dur; }
         if (nEnd > duration) { nEnd = duration; nStart = duration - dur; }
         return { ...s, animStart: nStart, animEnd: nEnd };
      }
      return s;
    }));
  }, [dragging, isDraggingPlayhead, duration, setShapes, setPreviewTime]);

  const handleMouseUp = useCallback(() => {
    setDragging(null);
    setIsDraggingPlayhead(false);
  }, []);

  useEffect(() => {
    if (dragging || isDraggingPlayhead) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [dragging, isDraggingPlayhead, handleMouseMove, handleMouseUp]);

  const handleSeek = (e: React.MouseEvent) => {
      const container = document.getElementById('animation-timeline-track');
      if (!container) return;
      const rect = container.getBoundingClientRect();
      const offsetX = e.clientX - rect.left;
      const pct = Math.max(0, Math.min(1, offsetX / rect.width));
      setPreviewTime(pct * duration);
      setIsDraggingPlayhead(true);
      setIsPlaying(false);
  };

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      className="h-full bg-[#111] border-l border-[#222] flex flex-col shrink-0 overflow-hidden relative z-50 shadow-2xl"
      style={{ width: width || 360 }}
    >
      <div className="flex flex-col border-b border-[#222] bg-gradient-to-b from-[#1a1a1a] to-[#111]">
        <div className="flex items-center justify-between px-3 py-2">
          <div className="flex items-center gap-2">
              <Clock className="w-3.5 h-3.5 text-[#c6ff1f]" />
              <h3 className="text-xs font-semibold text-gray-200">Animation Timeline</h3>
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors">
              <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="px-3 pb-2 flex items-center justify-between">
            <span className="text-[10px] text-gray-500 font-mono truncate mr-2">[{freezeFrame.name || 'Freeze Frame'}]</span>
            <div className="flex items-center gap-2 shrink-0">
                <div className="text-xs font-mono text-gray-300 w-8 text-right">{previewTime.toFixed(1)}s</div>
                <div className="text-[10px] font-mono text-gray-600 mr-2">/ {duration.toFixed(1)}s</div>
                <button onClick={() => { setIsPlaying(!isPlaying); if(!isPlaying && previewTime >= duration) setPreviewTime(0); }} className="w-6 h-6 flex items-center justify-center bg-[#c6ff1f] hover:bg-[#c6ff1f] text-black rounded-full transition-colors shadow-md">
                    {isPlaying ? <Pause className="w-3 h-3" /> : <Play className="w-3 h-3 ml-0.5" />}
                </button>
            </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 flex flex-col custom-scrollbar">
          <div className="flex-1 flex gap-2 h-full overflow-hidden">
             {/* Left Tool Labels */}
             <div className="w-[100px] shrink-0 flex flex-col gap-2 pt-[24px] border-r border-[#222] pr-1.5">
                 {ffShapes.map((s) => (
                      <div 
                          key={s.id} 
                          className={`h-8 flex items-center gap-2 px-2 text-[10px] rounded cursor-pointer transition-colors ${selectedShapeId === s.id ? 'bg-white/10 text-white' : 'text-gray-400 hover:bg-white/5'}`}
                          onClick={() => setSelectedShapeId(s.id)}
                      >
                          <div className="w-2 h-2 rounded-sm shrink-0" style={{backgroundColor: s.color}}></div>
                          <span className="truncate">{s.type.charAt(0).toUpperCase() + s.type.slice(1)}</span>
                      </div>
                 ))}
                 {ffShapes.length === 0 && <div className="text-[10px] text-gray-500 italic mt-2">No tools.</div>}
             </div>

             {/* Right Track Area */}
             <div className="flex-1 relative flex flex-col" id="animation-timeline-track" onMouseDown={handleSeek}>
                  {/* Time markers header */}
                  <div className="h-4 flex items-end relative border-b border-[#222] mb-2 pointer-events-none pb-0.5">
                      {[...Array(Math.ceil(duration) + 1)].map((_, i) => (
                          <div key={i} className="absolute text-[9px] text-gray-500" style={{ left: `${(i / duration) * 100}%`, transform: 'translateX(-50%)' }}>{i}s</div>
                      ))}
                  </div>
                  {/* Playhead */}
                  <div 
                      className="absolute top-4 bottom-0 w-[1px] bg-red-500 z-50 cursor-ew-resize group" 
                      style={{ left: `${(previewTime / duration) * 100}%` }}
                      onMouseDown={(e) => { e.stopPropagation(); setIsDraggingPlayhead(true); setIsPlaying(false); }}
                  >
                      <div className="absolute -top-1.5 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)] cursor-ew-resize group-hover:scale-125 transition-transform" />
                      <div className="absolute top-0 bottom-0 -left-2 w-4 cursor-ew-resize" />
                  </div>
                  {/* Tracks */}
                  <div className="flex flex-col gap-2 relative z-10 pointer-events-auto flex-1">
                      {ffShapes.map(s => {
                          const start = s.animStart ?? 0;
                          const end = s.animEnd ?? duration;
                          const startPct = (start / duration) * 100;
                          const widthPct = ((end - start) / duration) * 100;
                          const isSelected = selectedShapeId === s.id;
                          
                          return (
                              <div 
                                  key={s.id} 
                                  className={`h-8 relative bg-[#1a1a1a] rounded border overflow-hidden group cursor-pointer transition-colors ${isSelected ? 'border-white/50 bg-[#222]' : 'border-[#333] hover:border-[#444]'}`}
                                  onMouseDown={(e) => { e.stopPropagation(); setSelectedShapeId(s.id); }}
                              >
                                  <div 
                                      className={`absolute top-0 bottom-0 rounded shadow-sm transition-all ${isSelected ? 'border-2' : 'border'}`}
                                      style={{
                                          left: `${startPct}%`,
                                          width: `${widthPct}%`,
                                          backgroundColor: fadeColor(s.color, isSelected ? 0.3 : 0.2),
                                          borderColor: s.color
                                      }}
                                      onMouseDown={(e) => { e.stopPropagation(); setSelectedShapeId(s.id); setDragging({ id: s.id, type: 'move' }); }}
                                  >
                                      {/* Left Handle */}
                                      <div 
                                           className={`absolute left-0 top-0 bottom-0 w-8 -ml-4 cursor-ew-resize flex items-center justify-center z-30 transition-all group/handle ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                          onMouseDown={(e) => { e.stopPropagation(); setSelectedShapeId(s.id); setDragging({ id: s.id, type: 'start' }); }}
                                      >
                                          <div className="w-1.5 h-4 bg-gray-300 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.8)] border border-gray-600 group-hover/handle:bg-white group-hover/handle:scale-110 transition-all" />
                                      </div>
                                      
                                      {/* Right Handle */}
                                      <div 
                                           className={`absolute right-0 top-0 bottom-0 w-8 -mr-4 cursor-ew-resize flex items-center justify-center z-30 transition-all group/handle ${isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'}`}
                                          onMouseDown={(e) => { e.stopPropagation(); setSelectedShapeId(s.id); setDragging({ id: s.id, type: 'end' }); }}
                                      >
                                          <div className="w-1.5 h-4 bg-gray-300 rounded-full shadow-[0_0_4px_rgba(0,0,0,0.8)] border border-gray-600 group-hover/handle:bg-white group-hover/handle:scale-110 transition-all" />
                                      </div>
                                  </div>
                              </div>
                          );
                      })}
                  </div>
             </div>
          </div>
      </div>
    </motion.div>
  );
};
