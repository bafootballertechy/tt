import { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import type { PeriodSync } from '../../../types';
import { formatTime } from '../../../utils/math';
import type { MatchPeriodDef, LiveClockState, LiveClockDetails } from './types';
import { DEFAULT_PERIODS, SPORT_PRESETS } from './sportPresets';

interface UseLiveClockProps {
  isLive: boolean;
  currentTime: number;
  setCurrentTime: React.Dispatch<React.SetStateAction<number>>;
  periodSyncs: PeriodSync[];
  setPeriodSyncs: React.Dispatch<React.SetStateAction<PeriodSync[]>>;
  initialPeriodId?: string | null;
  onPeriodChange?: (periodId: string, periodName: string) => void;
}

export function useLiveClock({
  isLive,
  currentTime,
  setCurrentTime,
  periodSyncs,
  setPeriodSyncs,
  initialPeriodId = '1st-half',
  onPeriodChange
}: UseLiveClockProps) {
  const [matchClockState, setMatchClockState] = useState<LiveClockState>('stopped');
  const [matchPeriod, setMatchPeriod] = useState<string | null>(initialPeriodId || '1st-half');
  const [periods, setPeriods] = useState<MatchPeriodDef[]>(DEFAULT_PERIODS);
  const [activePresetId, setActivePresetId] = useState<string>('football');

  const [isEditingTimer, setIsEditingTimer] = useState(false);
  const [editedTimerValue, setEditedTimerValue] = useState('');
  const [pendingNextPeriod, setPendingNextPeriod] = useState<{
    id: string;
    name: string;
    isGoingBack?: boolean;
    fromName?: string;
  } | null>(null);

  const lastLiveTimeRef = useRef<number>(Date.now());
  const liveIntervalRef = useRef<number | null>(null);

  // Stop clock if component unmounts or isLive becomes false
  useEffect(() => {
    return () => {
      if (liveIntervalRef.current) {
        clearInterval(liveIntervalRef.current);
        liveIntervalRef.current = null;
      }
    };
  }, []);

  // Compute maximum period index completed or ongoing
  const maxPeriodIndex = useMemo(() => {
    let maxIdx = -1;
    periodSyncs.forEach(sync => {
      const idx = periods.findIndex(p => p.id === sync.id);
      if (idx > maxIdx) maxIdx = idx;
    });
    return maxIdx;
  }, [periodSyncs, periods]);

  // Active period definition
  const activePeriodDef = useMemo(() => {
    if (!matchPeriod) return null;
    return periods.find(p => p.id === matchPeriod) || null;
  }, [matchPeriod, periods]);

  // Format MM:SS helper
  const formatMinSec = useCallback((s: number) => {
    const m = Math.floor(Math.abs(s) / 60);
    const sec = Math.floor(Math.abs(s) % 60);
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  }, []);

  // Parse MM:SS, HH:MM:SS, 45+x, 90+x, or simple minutes
  const parseMatchTime = useCallback((timeStr: string): number | null => {
    let cleaned = timeStr.trim().replace(/['"m]/g, '');
    if (!cleaned) return null;

    // Support formats like "45:00 + 02:30", "45+2", "90+4", "105+2"
    if (cleaned.includes('+')) {
      const parts = cleaned.split('+');
      if (parts.length === 2) {
        const base = parseMatchTime(parts[0]);
        const extra = parseMatchTime(parts[1]);
        if (base !== null && extra !== null) return base + extra;
      }
    }

    const parts = cleaned.split(':');
    let totalSeconds = 0;
    if (parts.length === 2) {
      totalSeconds = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
    } else if (parts.length === 3) {
      totalSeconds = parseInt(parts[0], 10) * 3600 + parseInt(parts[1], 10) * 60 + parseInt(parts[2], 10);
    } else if (parts.length === 1 && !isNaN(Number(parts[0]))) {
      totalSeconds = parseFloat(parts[0]) * 60; // assumed minutes if single number
    } else {
      return null;
    }
    return isNaN(totalSeconds) ? null : Math.round(totalSeconds);
  }, []);

  // Detailed clock calculation including base time, stoppage time, progress %
  const getMatchClockDetails = useCallback((): LiveClockDetails => {
    if (!matchPeriod || !activePeriodDef) {
      return {
        display: formatTime(currentTime),
        baseTime: formatTime(currentTime),
        stoppageTime: null,
        hasStoppage: false,
        totalSecondsInPeriod: Math.max(0, currentTime),
        periodProgressPercent: 0,
        isOvertime: false,
        matchTimeSeconds: Math.max(0, currentTime),
        periodStartOffset: 0,
        periodNormalDuration: 45 * 60,
        periodId: '1st-half',
        stoppageMinutes: 0,
        compactDisplay: formatTime(currentTime)
      };
    }

    const sync = periodSyncs.find(p => p.id === matchPeriod);
    const periodStartVideoTime = sync ? sync.videoTimeSeconds : 0;
    const elapsed = Math.max(0, currentTime - periodStartVideoTime);

    if (activePeriodDef.normalDuration > 0 && elapsed > activePeriodDef.normalDuration) {
      const extra = elapsed - activePeriodDef.normalDuration;
      const baseMatchTime = activePeriodDef.startOffset + activePeriodDef.normalDuration;
      const baseStr = formatMinSec(baseMatchTime);
      const stoppageStr = `+${formatMinSec(extra)}`;
      const baseMinutes = Math.floor(baseMatchTime / 60);
      const stopMins = Math.floor(extra / 60) + 1;
      const compactDisplay = `${baseMinutes}+${stopMins}'`;

      return {
        display: `${baseStr} ${stoppageStr}`,
        baseTime: baseStr,
        stoppageTime: stoppageStr,
        hasStoppage: true,
        totalSecondsInPeriod: elapsed,
        periodProgressPercent: 100,
        isOvertime: true,
        matchTimeSeconds: baseMatchTime + extra,
        periodStartOffset: activePeriodDef.startOffset,
        periodNormalDuration: activePeriodDef.normalDuration,
        periodId: activePeriodDef.id,
        stoppageMinutes: stopMins,
        compactDisplay
      };
    }

    const matchTime = activePeriodDef.startOffset + elapsed;
    const baseStr = formatMinSec(matchTime);
    const progress = activePeriodDef.normalDuration > 0
      ? Math.min(100, Math.max(0, (elapsed / activePeriodDef.normalDuration) * 100))
      : 0;

    return {
      display: baseStr,
      baseTime: baseStr,
      stoppageTime: null,
      hasStoppage: false,
      totalSecondsInPeriod: elapsed,
      periodProgressPercent: progress,
      isOvertime: false,
      matchTimeSeconds: matchTime,
      periodStartOffset: activePeriodDef.startOffset,
      periodNormalDuration: activePeriodDef.normalDuration,
      periodId: activePeriodDef.id,
      stoppageMinutes: 0,
      compactDisplay: baseStr
    };
  }, [matchPeriod, activePeriodDef, periodSyncs, currentTime, formatMinSec]);

  const getMatchClockDisplay = useCallback((): string => {
    return getMatchClockDetails().display;
  }, [getMatchClockDetails]);

  // Timer loop internal starter
  const startInterval = useCallback(() => {
    if (liveIntervalRef.current) clearInterval(liveIntervalRef.current);
    lastLiveTimeRef.current = Date.now();
    liveIntervalRef.current = window.setInterval(() => {
      setCurrentTime(prev => {
        const now = Date.now();
        const delta = (now - lastLiveTimeRef.current) / 1000;
        lastLiveTimeRef.current = now;
        return prev + delta;
      });
    }, 100);
  }, [setCurrentTime]);

  const stopInterval = useCallback(() => {
    if (liveIntervalRef.current) {
      clearInterval(liveIntervalRef.current);
      liveIntervalRef.current = null;
    }
  }, []);

  const pauseLiveClock = useCallback(() => {
    setMatchClockState('paused');
    stopInterval();
  }, [stopInterval]);

  const resumeLiveClock = useCallback(() => {
    setMatchClockState('running');
    startInterval();
  }, [startInterval]);

  const toggleLiveClock = useCallback(() => {
    if (matchClockState === 'running') {
      pauseLiveClock();
    } else {
      if (!matchPeriod && periods.length > 0) {
        startLiveClock(periods[0].id, periods[0].name);
      } else {
        resumeLiveClock();
      }
    }
  }, [matchClockState, matchPeriod, periods, pauseLiveClock, resumeLiveClock]);

  // Start a specific period
  const startLiveClock = useCallback((periodId: string, periodName: string) => {
    setMatchPeriod(periodId);
    setMatchClockState('running');

    setPeriodSyncs(prev => {
      const newSyncs = prev.filter(s => s.id !== periodId);
      return [
        ...newSyncs,
        { id: periodId as PeriodSync['id'], name: periodName, videoTimeSeconds: currentTime }
      ];
    });

    startInterval();
    if (onPeriodChange) {
      onPeriodChange(periodId, periodName);
    }
  }, [currentTime, setPeriodSyncs, startInterval, onPeriodChange]);

  // Request to start period (ALWAYS shows warning/confirmation before switching)
  const requestStartLiveClock = useCallback((periodId: string, periodName: string, index: number) => {
    if (periodId === matchPeriod) return; // Already on this period

    const currentIndex = periods.findIndex(p => p.id === matchPeriod);
    const fromDef = periods.find(p => p.id === matchPeriod) || periods[0];
    const isGoingBack = currentIndex !== -1 && index < currentIndex;

    setPendingNextPeriod({
      id: periodId,
      name: periodName,
      isGoingBack,
      fromName: fromDef?.name || 'Current Half'
    });
  }, [matchPeriod, periods]);

  // Confirm advancing to next period from modal
  const confirmNextPeriod = useCallback(() => {
    if (pendingNextPeriod) {
      startLiveClock(pendingNextPeriod.id, pendingNextPeriod.name);
      setPendingNextPeriod(null);
    }
  }, [pendingNextPeriod, startLiveClock]);

  const cancelNextPeriod = useCallback(() => {
    setPendingNextPeriod(null);
  }, []);

  // Quick adjust live time by relative seconds (+10, -10, +60, -60)
  const adjustLiveTime = useCallback((deltaSeconds: number) => {
    setCurrentTime(prev => Math.max(0, prev + deltaSeconds));
  }, [setCurrentTime]);

  // Nudge edited timer value while in editing mode
  const nudgeEditedTimer = useCallback((deltaSeconds: number) => {
    let currentParsed = parseMatchTime(editedTimerValue);
    if (currentParsed === null) {
      const details = getMatchClockDetails();
      currentParsed = details.matchTimeSeconds;
    }
    const newTotal = Math.max(0, currentParsed + deltaSeconds);
    const m = Math.floor(newTotal / 60);
    const s = Math.floor(newTotal % 60);
    setEditedTimerValue(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
  }, [editedTimerValue, parseMatchTime, getMatchClockDetails]);

  const startEditingTimer = useCallback(() => {
    const details = getMatchClockDetails();
    if (details.hasStoppage && details.stoppageTime) {
      setEditedTimerValue(`${details.baseTime}+${details.stoppageTime}`);
    } else {
      setEditedTimerValue(details.baseTime);
    }
    setIsEditingTimer(true);
  }, [getMatchClockDetails]);

  // Equate timer directly to user specified match time (e.g. "53:20", "45+2", "90+4", or 3200 seconds)
  const equateMatchTime = useCallback((timeInput: string | number, targetPeriodId?: string): boolean => {
    let parsedSeconds: number | null = null;
    if (typeof timeInput === 'number') {
      parsedSeconds = timeInput;
    } else if (typeof timeInput === 'string') {
      const trimmed = timeInput.trim();
      if (!trimmed) {
        setIsEditingTimer(false);
        return true;
      }
      parsedSeconds = parseMatchTime(trimmed);
    }
    if (parsedSeconds === null || isNaN(parsedSeconds)) {
      setIsEditingTimer(false);
      return false;
    }

    const periodIdToUse = targetPeriodId || matchPeriod || '1st-half';
    const periodDef = periods.find(p => p.id === periodIdToUse) || activePeriodDef;
    if (!periodDef) return false;

    // Elapsed seconds inside this period
    const targetElapsedInPeriod = Math.max(0, parsedSeconds - periodDef.startOffset);
    
    // Find kickoff video time for this period
    const sync = periodSyncs.find(s => s.id === periodIdToUse);
    const kickoffVideoTime = sync ? sync.videoTimeSeconds : 0;

    // Set currentTime so that elapsed match time becomes targetElapsedInPeriod
    // Kickoff sync and previous events remain completely untouched!
    setCurrentTime(kickoffVideoTime + targetElapsedInPeriod);

    if (periodIdToUse !== matchPeriod) {
      setMatchPeriod(periodIdToUse);
    }

    setIsEditingTimer(false);
    setEditedTimerValue('');
    return true;
  }, [matchPeriod, periods, activePeriodDef, periodSyncs, parseMatchTime, setCurrentTime]);

  // Save manually edited time string (handles both string and synthetic event invocations)
  const handleSaveTimer = useCallback((customVal?: string | unknown): boolean => {
    const val = typeof customVal === 'string' ? customVal : editedTimerValue;
    return equateMatchTime(val);
  }, [editedTimerValue, equateMatchTime]);

  // Switch sport preset (e.g. Football -> Futsal / Basketball)
  const applySportPreset = useCallback((presetId: string) => {
    const preset = SPORT_PRESETS.find(p => p.id === presetId);
    if (preset) {
      setActivePresetId(preset.id);
      setPeriods(preset.periods);
    }
  }, []);

  return {
    matchClockState,
    setMatchClockState,
    matchPeriod,
    setMatchPeriod,
    periods,
    setPeriods,
    activePeriodDef,
    maxPeriodIndex,
    activePresetId,
    applySportPreset,

    // Clock displays
    getMatchClockDisplay,
    getMatchClockDetails,
    parseMatchTime,

    // Controls
    startLiveClock,
    pauseLiveClock,
    resumeLiveClock,
    toggleLiveClock,
    adjustLiveTime,
    equateMatchTime,

    // Editing
    isEditingTimer,
    setIsEditingTimer,
    editedTimerValue,
    setEditedTimerValue,
    startEditingTimer,
    nudgeEditedTimer,
    handleSaveTimer,

    // Period confirmation
    pendingNextPeriod,
    setPendingNextPeriod,
    requestStartLiveClock,
    confirmNextPeriod,
    cancelNextPeriod
  };
}
