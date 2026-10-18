import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Timer, X, Clock, PlayCircle, AlertTriangle, Undo2, Redo2 } from 'lucide-react';
import type { PeriodSync, TagEvent } from '../../types';
import { formatTime } from '../../utils/math';

interface PeriodSyncManagerProps {
  currentTime: number;
  periodSyncs: PeriodSync[];
  setPeriodSyncs: (syncs: PeriodSync[]) => void;
  tagEvents: TagEvent[];
  setTagEvents: (events: TagEvent[]) => void;
}

const PERIODS = [
  { id: '1st-half', name: '1st Half Kick-off' },
  { id: '2nd-half', name: '2nd Half Kick-off' },
  { id: 'et-1st', name: 'Extra Time - First Half' },
  { id: 'et-2nd', name: 'Extra Time - Second Half' },
  { id: 'penalties', name: 'Penalties' },
] as const;

const TimeInput = ({ 
  initialTime, 
  onUpdate
}: { 
  initialTime: number;
  onUpdate: (val: string) => boolean;
}) => {
  const [val, setVal] = useState(formatTime(initialTime));
  const [localError, setLocalError] = useState(false);

  useEffect(() => {
    setVal(formatTime(initialTime));
    setLocalError(false);
  }, [initialTime]);

  const handleBlur = () => {
    const success = onUpdate(val);
    if (!success) {
      setLocalError(true);
      setTimeout(() => {
        setVal(formatTime(initialTime));
        setLocalError(false);
      }, 1000);
    } else {
      setLocalError(false);
    }
  };

  return (
    <input
      type="text"
      placeholder="00:00"
      className={`w-full bg-black/40 border ${localError ? 'border-red-500 text-red-400' : 'border-white/10 text-white'} rounded px-2 py-1.5 text-xs text-center focus:outline-none focus:border-indigo-500 font-mono transition-colors`}
      value={val}
      onChange={(e) => {
        setVal(e.target.value);
        setLocalError(false);
      }}
      onBlur={handleBlur}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.currentTarget.blur();
        }
      }}
    />
  );
};

export const PeriodSyncManager: React.FC<PeriodSyncManagerProps> = ({ currentTime, periodSyncs, setPeriodSyncs, tagEvents, setTagEvents }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<{ id: string, name: string, newTime: number, shiftDiff: number, tagCount: number, tags: TagEvent[] } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ id: string, name: string } | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [history, setHistory] = useState<{ periodSyncs: PeriodSync[], tagEvents: TagEvent[] }[]>([]);
  const [future, setFuture] = useState<{ periodSyncs: PeriodSync[], tagEvents: TagEvent[] }[]>([]);

  const handleClose = () => {
    setIsOpen(false);
    setPendingUpdate(null);
    setPendingDelete(null);
    setValidationError(null);
    setHistory([]);
    setFuture([]);
  };

  const saveStateToHistory = () => {
    setHistory(prev => [...prev, { periodSyncs, tagEvents }]);
    setFuture([]);
  };

  const handleUndo = () => {
    if (history.length === 0) return;
    const lastState = history[history.length - 1];
    
    setFuture(prev => [...prev, { periodSyncs, tagEvents }]);
    setHistory(prev => prev.slice(0, -1));
    
    setPeriodSyncs(lastState.periodSyncs);
    setTagEvents(lastState.tagEvents);
  };

  const handleRedo = () => {
    if (future.length === 0) return;
    const nextState = future[future.length - 1];
    
    setHistory(prev => [...prev, { periodSyncs, tagEvents }]);
    setFuture(prev => prev.slice(0, -1));
    
    setPeriodSyncs(nextState.periodSyncs);
    setTagEvents(nextState.tagEvents);
  };

  const handleEnablePeriod = (id: PeriodSync['id'], name: string) => {
    const periodOrder = PERIODS.map(p => p.id);
    const targetIdx = periodOrder.indexOf(id as any);
    
    let minTime = 0;
    for (let i = targetIdx - 1; i >= 0; i--) {
        const prevSync = periodSyncs.find(s => s.id === periodOrder[i]);
        if (prevSync) {
            minTime = prevSync.videoTimeSeconds + 1;
            break;
        }
    }
    
    let maxTime = Infinity;
    for (let i = targetIdx + 1; i < periodOrder.length; i++) {
        const nextSync = periodSyncs.find(s => s.id === periodOrder[i]);
        if (nextSync) {
            maxTime = nextSync.videoTimeSeconds - 1;
            break;
        }
    }

    let safeTime = currentTime;
    if (safeTime < minTime) safeTime = minTime;
    if (safeTime > maxTime) safeTime = maxTime;

    if (minTime > maxTime) {
       setValidationError(`Cannot enable ${name} because there is no time gap between adjacent periods.`);
       return;
    }

    updateSyncTime(id, name, safeTime);
  };

  const handleSetTime = (id: PeriodSync['id'], name: string) => {
    updateSyncTime(id, name, currentTime);
  };

  const handleClearTime = (id: PeriodSync['id']) => {
    const period = PERIODS.find(p => p.id === id);
    if (period) {
      setPendingDelete({ id, name: period.name });
    }
  };

  const confirmClearTime = () => {
    if (pendingDelete) {
      saveStateToHistory();
      const updated = periodSyncs.filter(s => s.id !== pendingDelete.id);
      setPeriodSyncs(updated);
      setValidationError(null);
      setPendingDelete(null);
    }
  };

  const parseManualTime = (val: string): number | null => {
    const cleaned = val.trim().replace('.', ':');
    if (!cleaned) return null;
    
    if (/^\d+$/.test(cleaned)) {
        return parseInt(cleaned, 10) * 60;
    }
    
    const parts = cleaned.split(':').map(Number);
    if (parts.some(isNaN)) return null;
    if (parts.length === 2) return parts[0] * 60 + parts[1];
    if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
    return null;
  };

  const validateChronologicalOrder = (id: string, newTime: number): string | null => {
    const periodOrder = PERIODS.map(p => p.id);
    const targetIdx = periodOrder.indexOf(id as any);
    
    for (let i = 0; i < targetIdx; i++) {
        const prevSync = periodSyncs.find(s => s.id === periodOrder[i]);
        if (prevSync && newTime <= prevSync.videoTimeSeconds) {
            return `${PERIODS.find(p=>p.id===id)?.name} must start after ${PERIODS.find(p=>p.id===periodOrder[i])?.name}.`;
        }
    }
    
    for (let i = targetIdx + 1; i < periodOrder.length; i++) {
        const nextSync = periodSyncs.find(s => s.id === periodOrder[i]);
        if (nextSync && newTime >= nextSync.videoTimeSeconds) {
            return `${PERIODS.find(p=>p.id===id)?.name} must start before ${PERIODS.find(p=>p.id===periodOrder[i])?.name}.`;
        }
    }
    
    return null;
  };

  const handleManualEdit = (id: PeriodSync['id'], name: string, value: string): boolean => {
    const time = parseManualTime(value);
    if (time === null) {
      return false; // Tells TimeInput to revert
    }
    
    return updateSyncTime(id, name, time);
  };

  const updateSyncTime = (id: PeriodSync['id'], name: string, newTime: number): boolean => {
    setValidationError(null);
    const orderError = validateChronologicalOrder(id, newTime);
    if (orderError) {
      setValidationError(orderError);
      return false;
    }

    const existing = periodSyncs.find(s => s.id === id);
    const oldTime = existing ? existing.videoTimeSeconds : null;
    
    const sortedOldSyncs = [...periodSyncs].sort((a, b) => a.videoTimeSeconds - b.videoTimeSeconds);
    const currentIndex = sortedOldSyncs.findIndex(s => s.id === id);
    const nextPeriodTime = currentIndex !== -1 && currentIndex < sortedOldSyncs.length - 1 
                            ? sortedOldSyncs[currentIndex + 1].videoTimeSeconds 
                            : Infinity;

    // Find all tags that belong to this period
    const affectedTags = tagEvents.filter(evt => {
      if (evt.periodId) {
        return evt.periodId === id;
      }
      return oldTime !== null && evt.startTime >= oldTime && evt.startTime < nextPeriodTime;
    });

    if (affectedTags.length > 0 && (oldTime !== null ? oldTime !== newTime : true)) {
       const shiftDiff = oldTime !== null ? (newTime - oldTime) : newTime;
       setPendingUpdate({ id, name, newTime, shiftDiff, tagCount: affectedTags.length, tags: affectedTags });
       return true;
    }
    
    applySyncUpdate({ id, name, newTime, shiftDiff: 0, tagCount: 0, tags: [] }, false);
    return true;
  };

  const applySyncUpdate = (update: { id: string, name: string, newTime: number, shiftDiff: number, tagCount: number, tags: TagEvent[] }, shiftTags: boolean) => {
    saveStateToHistory();
    const existing = periodSyncs.find(s => s.id === update.id);
    let updatedSyncs: PeriodSync[];
    if (existing) {
      updatedSyncs = periodSyncs.map(s => s.id === update.id ? { ...s, videoTimeSeconds: update.newTime, needsVideoSync: false } : s);
    } else {
      updatedSyncs = [...periodSyncs, { id: update.id as PeriodSync['id'], name: update.name, videoTimeSeconds: update.newTime, needsVideoSync: false }];
    }
    setPeriodSyncs(updatedSyncs);
    
    if (shiftTags && update.tags.length > 0) {
       const tagIds = new Set(update.tags.map(t => t.id));
       
       const periodOffsets: Record<string, number> = {
         '1st-half': 0,
         '2nd-half': 2700, // 45m
         'et-1st': 5400,   // 90m
         'et-2nd': 6300,   // 105m
         'penalties': 7200 // 120m
       };
       const periodOffset = periodOffsets[update.id] ?? 0;

       const newTagEvents = tagEvents.map(evt => {
           const isTagInPeriod = evt.periodId ? evt.periodId === update.id : tagIds.has(evt.id);
           if (isTagInPeriod) {
               let newStart: number;
               let newEnd: number;
               const duration = Math.max(1, (evt.matchEnd !== undefined && evt.matchStart !== undefined) ? (evt.matchEnd - evt.matchStart) : (evt.endTime - evt.startTime));

               if (evt.matchStart !== undefined) {
                   const elapsedInHalf = Math.max(0, evt.matchStart - periodOffset);
                   newStart = Math.max(0, update.newTime + elapsedInHalf);
                   newEnd = newStart + duration;
               } else {
                   newStart = Math.max(0, evt.startTime + update.shiftDiff);
                   newEnd = Math.max(0, evt.endTime + update.shiftDiff);
               }

               return {
                   ...evt,
                   startTime: newStart,
                   endTime: newEnd,
                   periodId: update.id
               };
           }
           return evt;
       });
       setTagEvents(newTagEvents);
    }
    
    setPendingUpdate(null);
  };

  const hasUnsynced = periodSyncs.some(s => s.needsVideoSync);
  
  // Auto-open if there are unsynced periods and it hasn't been opened yet
  useEffect(() => {
      if (hasUnsynced && !isOpen) {
          setIsOpen(true);
      }
  }, [hasUnsynced]);

  return (
    <div className="relative">
      <button
        onClick={() => isOpen ? handleClose() : setIsOpen(true)}
        className={`p-2 rounded-lg transition-colors flex items-center gap-2 ${hasUnsynced ? 'bg-amber-500/20 text-amber-400 animate-pulse' : (isOpen ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-white/10 text-gray-400 hover:text-white')}`}
        title="Period Sync Manager"
        aria-label="Period Sync Manager"
      >
        <Timer className="w-5 h-5" />
        {hasUnsynced && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-[#1a1a1a]"></span>
        )}
      </button>

      <AnimatePresence>
        {isOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
              onClick={handleClose}
            />
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full right-0 mt-2 w-96 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
            >
              {pendingDelete && (
                <div className="absolute inset-0 bg-[#1a1a1a]/95 backdrop-blur-sm z-20 flex flex-col items-center justify-center p-6 text-center border-t border-white/10">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
                  <h3 className="text-white font-medium mb-2">Disable Period?</h3>
                  <p className="text-sm text-gray-400 mb-6">
                    Disabling <strong>{pendingDelete.name}</strong> will merge its timeline with the previous period. This could affect the relative positions of existing tags. Are you sure?
                  </p>
                  <div className="flex gap-3 w-full">
                    <button onClick={() => setPendingDelete(null)} className="flex-1 px-4 py-2 bg-white/10 hover:bg-white/20 text-white text-sm rounded-lg transition-colors">Cancel</button>
                    <button onClick={confirmClearTime} className="flex-1 px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-sm rounded-lg transition-colors">Disable</button>
                  </div>
                </div>
              )}

              {pendingUpdate && !pendingDelete && (
                <div className="absolute inset-0 bg-[#1a1a1a]/95 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6 text-center border-t border-white/10">
                  <AlertTriangle className="w-8 h-8 text-amber-500 mb-3" />
                  <h3 className="text-white font-medium mb-2">Align Events with Kick-off?</h3>
                  <p className="text-sm text-gray-300 mb-4 leading-relaxed">
                    Setting kick-off for <strong className="text-white">{pendingUpdate.name}</strong> to <span className="font-mono font-bold text-[#c6ff1f]">{formatTime(pendingUpdate.newTime)}</span> will automatically align <strong className="text-white">{pendingUpdate.tagCount}</strong> tagged event{pendingUpdate.tagCount !== 1 ? 's' : ''} to their exact match moments in this video.
                  </p>
                  <div className="flex flex-col gap-2 w-full">
                    <button onClick={() => applySyncUpdate(pendingUpdate, true)} className="w-full px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-sm rounded-lg transition-all shadow-md active:scale-98">Align & Sync Events</button>
                    <button onClick={() => applySyncUpdate(pendingUpdate, false)} className="w-full px-4 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-xs rounded-lg transition-colors">Update Kick-off Only (Don't Shift Events)</button>
                    <button onClick={() => setPendingUpdate(null)} className="w-full px-4 py-2 bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white text-xs rounded-lg transition-colors">Cancel</button>
                  </div>
                </div>
              )}

              <div className="p-4 border-b border-white/10 bg-white/5 flex items-center justify-between">
                <div className="flex items-center gap-2 text-white">
                  <Clock className="w-4 h-4 text-indigo-400" />
                  <span className="font-medium text-sm">Game Period Sync</span>
                </div>
                <div className="flex items-center gap-1">
                  <button onClick={handleUndo} disabled={history.length === 0} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors" title="Undo">
                    <Undo2 className="w-4 h-4" />
                  </button>
                  <button onClick={handleRedo} disabled={future.length === 0} className="p-1.5 text-gray-400 hover:text-white disabled:opacity-30 transition-colors" title="Redo">
                    <Redo2 className="w-4 h-4" />
                  </button>
                  <div className="w-[1px] h-4 bg-white/10 mx-1"></div>
                  <button onClick={handleClose} className="p-1.5 text-gray-400 hover:text-white transition-colors" title="Close">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="p-4 max-h-[400px] overflow-y-auto space-y-4 relative">
                {validationError && (
                  <div className="bg-red-500/10 border border-red-500/50 rounded-md p-2 text-red-400 text-xs flex items-start gap-1.5">
                    <AlertTriangle className="w-4 h-4 shrink-0" />
                    <span>{validationError}</span>
                  </div>
                )}
                
                <div className="text-xs text-gray-400 mb-2">
                  Sync your video timeline with the actual game periods. This aligns exported events perfectly across different video files.
                </div>
                
                {hasUnsynced && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2.5 text-amber-400 text-xs flex items-start gap-2 mb-4">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>You imported a new video. Please sync the starting times for the following periods to match the new video.</p>
                    </div>
                )}

                {PERIODS.map(period => {
                  const currentSync = periodSyncs.find(s => s.id === period.id);
                  const isEnabled = !!currentSync;
                  
                  return (
                    <div key={period.id} className={`border rounded-lg p-3 group transition-colors ${isEnabled ? (currentSync.needsVideoSync ? 'bg-amber-900/10 border-amber-500/50 relative overflow-hidden' : 'bg-indigo-900/10 border-indigo-500/30') : 'bg-black/20 border-white/5'}`}>
                        {isEnabled && currentSync.needsVideoSync && (
                            <div className="absolute top-0 right-0 left-0 h-0.5 bg-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                        )}
                      <div className="flex items-center justify-between mb-3">
                        <label className="flex items-center gap-2 cursor-pointer">
                          <input 
                            type="checkbox" 
                            checked={isEnabled}
                            onChange={(e) => {
                                if (e.target.checked) {
                                    handleEnablePeriod(period.id, period.name);
                                } else {
                                    handleClearTime(period.id);
                                }
                            }}
                            className="w-3.5 h-3.5 rounded border-gray-600 bg-black/40 text-indigo-500 focus:ring-indigo-500/20 focus:ring-offset-0"
                          />
                          <span className={`text-sm font-medium ${isEnabled ? 'text-white' : 'text-gray-400'}`}>{period.name}</span>
                        </label>
                      </div>
                      
                      {isEnabled && (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
                          <button
                            onClick={() => handleSetTime(period.id, period.name)}
                            className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded px-3 py-1.5 text-xs text-white transition-colors flex items-center justify-center gap-1.5"
                          >
                            <PlayCircle className="w-3.5 h-3.5 text-indigo-400" />
                            Set to Current Time
                          </button>
                          
                          <div className="relative w-24">
                            <TimeInput 
                                initialTime={currentSync.videoTimeSeconds}
                                onUpdate={(val) => handleManualEdit(period.id, period.name, val)}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
