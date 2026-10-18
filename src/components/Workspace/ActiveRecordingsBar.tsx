import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, ChevronDown, ChevronUp, Save, Eye, EyeOff } from 'lucide-react';
import { ActiveRecording, Tag as TagData } from '../../types';

interface Props {
  activeRecordings: ActiveRecording[];
  tags: TagData[];
  currentTime: number;
  duration: number;
  onStopAndSave: (tagId: string) => void;
  onStopAndSaveAll: () => void;
  onCancel: (tagId: string) => void;
}

export const ActiveRecordingsBar: React.FC<Props> = ({
  activeRecordings,
  tags,
  currentTime,
  onStopAndSave,
  onStopAndSaveAll,
  onCancel,
}) => {
  const [isMinimized, setIsMinimized] = useState(false);
  const [tick, setTick] = useState(0);

  // Live timer tick every 500ms so elapsed time counters update smoothly
  useEffect(() => {
    const interval = setInterval(() => {
      setTick(t => t + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  if (!activeRecordings || activeRecordings.length === 0) {
    return null;
  }

  const formatElapsed = (startTime: number) => {
    const elapsedSec = Math.max(0, Math.floor(Math.abs(currentTime - startTime)));
    const m = Math.floor(elapsedSec / 60).toString().padStart(2, '0');
    const s = (elapsedSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const totalActive = activeRecordings.length;

  return (
    <div className="absolute top-2 sm:top-3 left-0 right-0 z-[60] flex justify-center items-center pointer-events-none px-2 sm:px-4">
      <AnimatePresence mode="wait">
        {isMinimized ? (
          /* Minimized ultra-compact pill: minimal footprint, video completely unobstructed */
          <motion.button
            key="minimized"
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            onClick={() => setIsMinimized(false)}
            className="pointer-events-auto group bg-black/60 hover:bg-black/85 backdrop-blur-md border border-red-500/40 hover:border-red-400 text-white px-3 py-1 rounded-full shadow-xl flex items-center gap-2 cursor-pointer transition-all select-none"
            title="Expand Active Tagging Bar"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
            </span>
            <span className="font-mono font-bold text-[11px] sm:text-xs tracking-wider text-red-100">
              REC ({totalActive})
            </span>
            <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-white transition-colors" />
          </motion.button>
        ) : (
          /* Expanded responsive floating bar */
          <motion.div
            key="expanded"
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            className="pointer-events-auto max-w-[95%] sm:max-w-[90%] md:max-w-3xl bg-black/70 hover:bg-black/80 backdrop-blur-md border border-white/15 hover:border-white/25 rounded-full p-1 sm:p-1.5 shadow-2xl flex items-center gap-1.5 sm:gap-2 transition-all select-none overflow-x-auto no-scrollbar"
          >
            {/* Pulsing REC indicator badge */}
            <div className="flex items-center gap-1.5 pl-2 pr-1 shrink-0">
              <span className="relative flex h-2.5 w-2.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
              </span>
              <span className="font-bold text-[10px] sm:text-xs tracking-wider uppercase text-red-200">
                REC
              </span>
              {totalActive > 1 && (
                <span className="text-[10px] font-mono px-1.5 py-0.2 bg-red-500/25 border border-red-500/40 rounded-full text-red-200 font-bold">
                  {totalActive}
                </span>
              )}
            </div>

            <div className="w-px h-3.5 bg-white/15 shrink-0" />

            {/* List of active tag chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
              {activeRecordings.map(rec => {
                const tag = tags.find(t => t.id === rec.tagId);
                const tagName = tag?.name || 'Event';
                const tagColor = tag?.color || '#ef4444';
                const elapsed = formatElapsed(rec.startTime);

                return (
                  <div
                    key={rec.tagId}
                    className="flex items-center gap-1.5 bg-white/10 hover:bg-white/15 border border-white/10 rounded-full pl-2 pr-1 py-0.5 sm:py-1 shrink-0 transition-all text-[11px] sm:text-xs"
                    style={{ borderLeftColor: tagColor, borderLeftWidth: '3px' }}
                  >
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: tagColor }} />
                    <span className="font-medium text-gray-100 max-w-[80px] sm:max-w-[120px] truncate" title={tagName}>
                      {tagName}
                    </span>
                    <span className="font-mono text-[10px] sm:text-xs text-amber-300/90 font-semibold px-1">
                      {elapsed}
                    </span>

                    {/* Quick Save button for this individual tag */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onStopAndSave(rec.tagId);
                      }}
                      className="p-1 rounded-full bg-emerald-600/80 hover:bg-emerald-500 text-white transition-all hover:scale-105 active:scale-95"
                      title={`Stop and save "${tagName}"`}
                    >
                      <Check className="w-3 h-3 stroke-[2.5]" />
                    </button>

                    {/* Cancel button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onCancel(rec.tagId);
                      }}
                      className="p-1 rounded-full bg-white/5 hover:bg-red-500/40 text-gray-400 hover:text-white transition-all"
                      title={`Cancel recording for "${tagName}"`}
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Multi-event Save All button */}
            {totalActive > 1 && (
              <>
                <div className="w-px h-3.5 bg-white/15 shrink-0" />
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onStopAndSaveAll();
                  }}
                  className="shrink-0 flex items-center gap-1 bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] sm:text-xs font-bold px-2 sm:px-2.5 py-1 rounded-full shadow transition-all hover:scale-105 active:scale-95 cursor-pointer"
                  title="Stop and save all active events"
                >
                  <Check className="w-3 h-3 stroke-[2.5]" />
                  <span>Save All</span>
                </button>
              </>
            )}

            {/* Minimize button to keep video 100% unobscured */}
            <div className="w-px h-3.5 bg-white/15 shrink-0" />
            <button
              onClick={() => setIsMinimized(true)}
              className="p-1 sm:p-1.5 rounded-full text-gray-400 hover:text-white hover:bg-white/10 transition-colors shrink-0"
              title="Minimize to tiny badge"
            >
              <ChevronUp className="w-3 h-3" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
