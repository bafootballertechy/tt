import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, Tag as TagIcon, Plus, X, Layers, MapPin, Check, Eye
} from 'lucide-react';
import type { PeriodSync, Tag, TagEvent, Label, TimelineMarker } from '../../../types';
import type { MatchPeriodDef, LiveClockState, LiveClockDetails } from './types';
import { DEFAULT_PERIODS } from './sportPresets';
import { fadeColor } from '../../../utils/colors';

export type HalfTimelineTab = '1st-half' | '2nd-half' | 'et-1st' | 'et-2nd' | 'penalties' | 'all';

interface LiveHalfTimelineProps {
  isLive: boolean;
  currentTime: number;
  periodSyncs: PeriodSync[];
  setPeriodSyncs: React.Dispatch<React.SetStateAction<PeriodSync[]>>;
  activePeriodId: string | null;
  periods: MatchPeriodDef[];
  clockDetails: LiveClockDetails;
  clockState: LiveClockState;
  tagEvents: TagEvent[];
  setTagEvents: React.Dispatch<React.SetStateAction<TagEvent[]>>;
  tags: Tag[];
  labels: Label[];
  selectedEventIds: Set<string>;
  setSelectedEventIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleEventClick: (e: React.MouseEvent, eventId: string, startTime: number) => void;
  handleEventContextMenu?: (e: React.MouseEvent, eventId: string) => void;
  timelineZoom: number;
  showTimelineTags: boolean;
  markers?: TimelineMarker[];
  setMarkers?: React.Dispatch<React.SetStateAction<TimelineMarker[]>>;
  onTogglePlay: () => void;
  lastTagActionTimestamp?: number;
}

export const LiveHalfTimeline: React.FC<LiveHalfTimelineProps> = ({
  isLive,
  currentTime,
  periodSyncs,
  setPeriodSyncs,
  activePeriodId,
  periods,
  clockDetails,
  clockState,
  tagEvents,
  setTagEvents,
  tags,
  labels,
  selectedEventIds,
  setSelectedEventIds,
  handleEventClick,
  handleEventContextMenu,
  timelineZoom,
  showTimelineTags,
  markers = [],
  setMarkers,
  onTogglePlay,
  lastTagActionTimestamp
}) => {
  // Selected timeline view tab (defaults to current active period)
  const [selectedHalf, setSelectedHalf] = useState<HalfTimelineTab>(
    (activePeriodId as HalfTimelineTab) || '1st-half'
  );
  const [autoFollowClock, setAutoFollowClock] = useState<boolean>(true);

  // Note creation modal state
  const [showNoteModal, setShowNoteModal] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteTimeStr, setNoteTimeStr] = useState('');
  const [noteColor, setNoteColor] = useState('#3b82f6');
  const [hoveredMarkerId, setHoveredMarkerId] = useState<string | null>(null);

  // Only show period tabs for periods that have been officially started/unlocked!
  // Before 1st half ends, ONLY 1st Half is unlocked (2nd half timeline is hidden).
  // After ending 1st half and starting 2nd half, 2nd Half option appears above timeline!
  const unlockedPeriods = useMemo(() => {
    const isPeriodUnlocked = (pId: string) => {
      if (pId === '1st-half') return true;
      return periodSyncs.some(s => s.id === pId);
    };
    return periods.filter(p => isPeriodUnlocked(p.id));
  }, [periods, periodSyncs]);

  // If user tags/codes an event while viewing a different half, instantly snap to active live period!
  const prevTagEventsLenRef = useRef<number>(tagEvents.length);
  const prevTagActionRef = useRef<number>(lastTagActionTimestamp || 0);

  useEffect(() => {
    const hasNewTagEvent = tagEvents.length > prevTagEventsLenRef.current;
    const hasNewTagAction = (lastTagActionTimestamp || 0) > prevTagActionRef.current;

    if (hasNewTagEvent || hasNewTagAction) {
      if (activePeriodId && selectedHalf !== activePeriodId) {
        setSelectedHalf(activePeriodId as HalfTimelineTab);
        setAutoFollowClock(true);
      }
    }

    prevTagEventsLenRef.current = tagEvents.length;
    prevTagActionRef.current = lastTagActionTimestamp || 0;
  }, [tagEvents.length, lastTagActionTimestamp, activePeriodId, selectedHalf]);

  // Keep selected tab in sync if autoFollow is enabled
  useEffect(() => {
    if (autoFollowClock && activePeriodId) {
      setSelectedHalf(activePeriodId as HalfTimelineTab);
    }
  }, [activePeriodId, autoFollowClock]);

  // If currently selected tab is no longer in unlocked periods, fall back to active period
  useEffect(() => {
    if (selectedHalf !== 'all' && !unlockedPeriods.some(p => p.id === selectedHalf)) {
      if (activePeriodId) setSelectedHalf(activePeriodId as HalfTimelineTab);
      else if (unlockedPeriods.length > 0) setSelectedHalf(unlockedPeriods[0].id as HalfTimelineTab);
    }
  }, [unlockedPeriods, selectedHalf, activePeriodId]);

  // Find kickoff video time for a period
  const getPeriodKickoffTime = useCallback((periodId: string): number => {
    const sync = periodSyncs.find(s => s.id === periodId);
    return sync ? sync.videoTimeSeconds : 0;
  }, [periodSyncs]);

  // Determine which period an event belongs to
  const getEventPeriodId = useCallback((event: TagEvent): string => {
    if ((event as any).periodId) return (event as any).periodId;

    const syncPen = periodSyncs.find(s => s.id === 'penalties');
    const syncEt2 = periodSyncs.find(s => s.id === 'et-2nd');
    const syncEt1 = periodSyncs.find(s => s.id === 'et-1st');
    const sync2H = periodSyncs.find(s => s.id === '2nd-half');

    const start = event.startTime;
    if (syncPen && start >= syncPen.videoTimeSeconds) return 'penalties';
    if (syncEt2 && start >= syncEt2.videoTimeSeconds) return 'et-2nd';
    if (syncEt1 && start >= syncEt1.videoTimeSeconds) return 'et-1st';
    if (sync2H && start >= sync2H.videoTimeSeconds) return '2nd-half';
    return '1st-half';
  }, [periodSyncs]);

  // Calculate match time for a video time within a given period
  const calculateMatchTime = useCallback((videoTime: number, periodId: string): number => {
    const periodDef = periods.find(p => p.id === periodId);
    if (!periodDef) return Math.max(0, videoTime);

    const kickoff = getPeriodKickoffTime(periodId);
    const elapsed = Math.max(0, videoTime - kickoff);
    return periodDef.startOffset + elapsed;
  }, [periods, getPeriodKickoffTime]);

  // Current selected half definition
  const currentDef = useMemo(() => {
    if (selectedHalf === 'all') return null;
    return (periods && periods.find(p => p.id === selectedHalf)) || (periods && periods[0]) || DEFAULT_PERIODS[0];
  }, [selectedHalf, periods]);

  // Compute timeline bounds for current selected half
  const timelineBounds = useMemo(() => {
    if (selectedHalf === 'all') {
      const allEventEnds = tagEvents.map(e => {
        const pId = getEventPeriodId(e);
        return calculateMatchTime(e.endTime, pId);
      });
      const maxEvtMatch = allEventEnds.reduce((acc, val) => Math.max(acc, val), 0);
      const activeMatchTime = clockDetails.matchTimeSeconds || calculateMatchTime(currentTime, activePeriodId || '1st-half');

      const hasExtraTime = unlockedPeriods.some(p => p.id.startsWith('et') || p.id === 'penalties');
      const baseEnd = hasExtraTime ? 120 * 60 : (unlockedPeriods.some(p => p.id === '2nd-half') ? 90 * 60 : 45 * 60);
      const maxTime = Math.max(baseEnd, maxEvtMatch, activeMatchTime);
      const end = maxTime > baseEnd ? maxTime + 60 : baseEnd;

      return {
        start: 0,
        end,
        baseEnd,
        stoppageStart: baseEnd,
        isHalf: false
      };
    }

    const def = currentDef || (periods && periods[0]) || DEFAULT_PERIODS[0];
    const start = def.startOffset; // e.g. 0 for 1st half, 2700 (45m) for 2nd half, 5400 for ET1
    const baseEnd = def.startOffset + (def.normalDuration > 0 ? def.normalDuration : 15 * 60);

    // Find any events or current time exceeding baseEnd to dynamically extend stoppage time
    const halfEvents = tagEvents.filter(e => getEventPeriodId(e) === selectedHalf);
    let maxMatchInHalf = baseEnd;

    // If viewing currently active live half, include current live match time
    if (activePeriodId === selectedHalf) {
      const liveMatch = clockDetails.matchTimeSeconds || calculateMatchTime(currentTime, selectedHalf);
      if (liveMatch > baseEnd) {
        maxMatchInHalf = Math.max(maxMatchInHalf, liveMatch);
      }
    }

    halfEvents.forEach(e => {
      const eMatch = calculateMatchTime(e.endTime, selectedHalf);
      if (eMatch > maxMatchInHalf) maxMatchInHalf = eMatch;
    });

    const end = maxMatchInHalf > baseEnd ? maxMatchInHalf + 90 : baseEnd;

    return {
      start,
      end,
      baseEnd,
      stoppageStart: baseEnd,
      isHalf: true
    };
  }, [selectedHalf, currentDef, periods, tagEvents, clockDetails, activePeriodId, unlockedPeriods, currentTime, getEventPeriodId, calculateMatchTime]);

  // Filter events belonging to current view with accurate match times
  const visibleEvents = useMemo(() => {
    if (selectedHalf === 'all') {
      return tagEvents.map(e => {
        const periodId = getEventPeriodId(e);
        const mStart = e.matchStart !== undefined ? e.matchStart : calculateMatchTime(e.startTime, periodId);
        const durationSec = Math.max(1, e.endTime - e.startTime);
        const rawEnd = e.matchEnd !== undefined ? e.matchEnd : calculateMatchTime(e.endTime, periodId);
        const mEnd = rawEnd > mStart ? rawEnd : mStart + durationSec;
        return {
          event: e,
          matchStart: mStart,
          matchEnd: mEnd,
          periodId
        };
      });
    }

    return tagEvents
      .filter(e => getEventPeriodId(e) === selectedHalf)
      .map(e => {
        const mStart = e.matchStart !== undefined ? e.matchStart : calculateMatchTime(e.startTime, selectedHalf);
        const durationSec = Math.max(1, e.endTime - e.startTime);
        const rawEnd = e.matchEnd !== undefined ? e.matchEnd : calculateMatchTime(e.endTime, selectedHalf);
        const mEnd = rawEnd > mStart ? rawEnd : mStart + durationSec;
        return {
          event: e,
          matchStart: mStart,
          matchEnd: mEnd,
          periodId: selectedHalf
        };
      });
  }, [selectedHalf, tagEvents, getEventPeriodId, calculateMatchTime]);

  // Filter notes belonging to current view
  const visibleMarkers = useMemo(() => {
    if (!markers || markers.length === 0) return [];
    if (selectedHalf === 'all') {
      return markers.map(m => {
        const pId = (m as any).periodId;
        const noteMatch = pId ? calculateMatchTime(m.time, pId) : m.time;
        return {
          ...m,
          matchTime: noteMatch
        };
      });
    }

    return markers
      .filter(m => {
        const pId = (m as any).periodId || (m.time >= 2700 ? '2nd-half' : '1st-half');
        return pId === selectedHalf;
      })
      .map(m => {
        const pId = (m as any).periodId;
        const noteMatch = pId ? calculateMatchTime(m.time, selectedHalf) : m.time;
        return {
          ...m,
          matchTime: noteMatch
        };
      });
  }, [markers, selectedHalf, calculateMatchTime]);

  // Current playhead match time position
  const currentMatchTime = useMemo(() => {
    if (selectedHalf === 'all') {
      if (clockDetails.matchTimeSeconds !== undefined && clockDetails.matchTimeSeconds > 0) {
        return clockDetails.matchTimeSeconds;
      }
      return calculateMatchTime(currentTime, activePeriodId || '1st-half');
    }
    // If viewing the currently active live half, calculate live match time
    if (selectedHalf === activePeriodId) {
      return calculateMatchTime(currentTime, selectedHalf);
    }
    // If viewing a previous completed half (e.g. viewing 1st half while match is in 2nd half),
    // show playhead at the end of that completed half
    return timelineBounds.baseEnd;
  }, [selectedHalf, activePeriodId, clockDetails, currentTime, calculateMatchTime, timelineBounds]);

  // Playhead percentage along this half's timeline
  const playheadPercent = useMemo(() => {
    const totalSpan = timelineBounds.end - timelineBounds.start;
    if (totalSpan <= 0) return 0;
    const progress = (currentMatchTime - timelineBounds.start) / totalSpan;
    return Math.max(0, Math.min(100, progress * 100));
  }, [currentMatchTime, timelineBounds]);

  // Format tick display based on match time and half
  const formatTickLabel = useCallback((timeSec: number): string => {
    const m = Math.floor(timeSec / 60);
    const s = Math.floor(timeSec % 60);

    if (selectedHalf === 'all') {
      if (timeSec === 45 * 60) return "HT (45')";
      if (timeSec === 90 * 60) return "FT (90')";
      if (timeSec > 90 * 60) {
        const extraMins = Math.floor((timeSec - 90 * 60) / 60) + 1;
        return `90+${extraMins}'`;
      }
      return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    }

    if (selectedHalf === '1st-half') {
      if (timeSec <= 45 * 60) {
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      const extraMins = Math.floor((timeSec - 45 * 60) / 60) + 1;
      return `45+${extraMins}'`;
    }

    if (selectedHalf === '2nd-half') {
      if (timeSec <= 90 * 60) {
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      const extraMins = Math.floor((timeSec - 90 * 60) / 60) + 1;
      return `90+${extraMins}'`;
    }

    if (selectedHalf === 'et-1st') {
      if (timeSec <= 105 * 60) {
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      const extraMins = Math.floor((timeSec - 105 * 60) / 60) + 1;
      return `105+${extraMins}'`;
    }

    if (selectedHalf === 'et-2nd') {
      if (timeSec <= 120 * 60) {
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
      }
      const extraMins = Math.floor((timeSec - 120 * 60) / 60) + 1;
      return `120+${extraMins}'`;
    }

    if (selectedHalf === 'penalties') {
      const penRound = Math.floor((timeSec - 120 * 60) / 60) + 1;
      return `PEN ${penRound}`;
    }

    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }, [selectedHalf]);

  // Generate ruler tick marks
  const rulerTicks = useMemo(() => {
    const totalSpan = timelineBounds.end - timelineBounds.start;
    if (totalSpan <= 0) return [];

    const ticks: { time: number; pct: number; label: string; isMajor: boolean; isStoppage: boolean }[] = [];
    let step = 300; // 5 mins
    if (selectedHalf === 'all') {
      step = timelineZoom >= 3 ? 120 : (timelineZoom >= 2 ? 300 : 600); // 10m or 5m intervals on full match
    } else {
      if (timelineZoom >= 4) step = 30;
      else if (timelineZoom >= 2) step = 60;
      else if (totalSpan <= 900) step = 60;
    }

    const firstTickTime = Math.ceil(timelineBounds.start / step) * step;

    for (let t = firstTickTime; t <= timelineBounds.end; t += step) {
      const pct = ((t - timelineBounds.start) / totalSpan) * 100;
      const isStoppage = t > timelineBounds.stoppageStart;
      const isMajor = t % 300 === 0 || t === timelineBounds.baseEnd || t === 45 * 60 || t === 90 * 60;

      ticks.push({
        time: t,
        pct,
        label: formatTickLabel(t),
        isMajor,
        isStoppage
      });
    }

    // Ensure landmark ticks exist (45:00, 90:00, baseEnd)
    const landmarks = selectedHalf === 'all' ? [45 * 60, 90 * 60, timelineBounds.baseEnd] : [timelineBounds.baseEnd];
    landmarks.forEach(lMark => {
      if (lMark > timelineBounds.start && lMark <= timelineBounds.end) {
        const basePct = ((lMark - timelineBounds.start) / totalSpan) * 100;
        if (!ticks.some(tk => Math.abs(tk.pct - basePct) < 0.5)) {
          ticks.push({
            time: lMark,
            pct: basePct,
            label: formatTickLabel(lMark),
            isMajor: true,
            isStoppage: false
          });
        }
      }
    });

    return ticks.sort((a, b) => a.time - b.time);
  }, [timelineBounds, selectedHalf, timelineZoom, formatTickLabel]);

  // Handle adding note to current viewed half
  const handleSaveNote = () => {
    if (!noteText.trim()) return;
    if (!setMarkers) return;

    // Default note time to current match time in this half
    let timeInSec = currentMatchTime;
    if (noteTimeStr.trim()) {
      const parts = noteTimeStr.trim().split(':');
      if (parts.length === 2) {
        timeInSec = parseInt(parts[0], 10) * 60 + parseInt(parts[1], 10);
      } else if (parts.length === 1 && !isNaN(Number(parts[0]))) {
        timeInSec = parseFloat(parts[0]) * 60;
      }
    }

    const newMarker: TimelineMarker = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 4),
      time: timeInSec,
      label: noteText.trim(),
      color: noteColor,
      ...(selectedHalf !== 'all' ? { periodId: selectedHalf } : {})
    } as any;

    setMarkers(prev => [...prev, newMarker]);
    setShowNoteModal(false);
    setNoteText('');
    setNoteTimeStr('');
  };

  const isViewingPastHalf = selectedHalf !== 'all' && selectedHalf !== activePeriodId;

  return (
    <div className="flex-1 flex flex-col min-h-0 relative select-none bg-[#0a0a0c] border-t border-[#202026]">
      {/* --- PERIOD SWITCHER TABS BAR --- */}
      {/* 2nd half timeline option appears above timeline ONLY after user ends 1st half */}
      <div className="h-9 bg-[#111115] border-b border-[#22222a] flex items-center justify-between px-3 shrink-0 z-30 overflow-x-auto no-scrollbar gap-2">
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] uppercase font-bold tracking-wider text-gray-500 mr-1 hidden sm:inline flex items-center gap-1">
            <Layers className="w-3 h-3 text-[#c6ff1f]" />
            Timeline:
          </span>

          {unlockedPeriods.map((p) => {
            const isSelected = selectedHalf === p.id;
            const isLiveActive = activePeriodId === p.id;
            const eventCount = tagEvents.filter(e => getEventPeriodId(e) === p.id).length;

            return (
              <button
                key={p.id}
                type="button"
                onClick={() => {
                  setSelectedHalf(p.id as HalfTimelineTab);
                  if (p.id !== activePeriodId) {
                    setAutoFollowClock(false);
                  } else {
                    setAutoFollowClock(true);
                  }
                }}
                className={`relative flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-[#c6ff1f] text-black shadow-md'
                    : 'bg-white/5 hover:bg-white/10 text-gray-300 hover:text-white border border-white/5'
                }`}
                title={`View ${p.name} Timeline`}
              >
                {/* Active Live Pulse Dot */}
                {isLiveActive && (
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-black animate-ping' : 'bg-[#c6ff1f] animate-pulse'}`} />
                )}

                <span>{p.name}</span>

                {/* Event Count Badge */}
                {eventCount > 0 && (
                  <span className={`text-[10px] px-1 py-0.2 rounded-full font-mono font-bold ${
                    isSelected ? 'bg-black/20 text-black' : 'bg-white/10 text-gray-300'
                  }`}>
                    {eventCount}
                  </span>
                )}
              </button>
            );
          })}

          {/* Full Match Tab (Unlocked once more than 1 period exists) */}
          {unlockedPeriods.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setSelectedHalf('all');
                setAutoFollowClock(false);
              }}
              className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                selectedHalf === 'all'
                  ? 'bg-indigo-600 text-white shadow-md'
                  : 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white border border-white/5'
              }`}
              title="Full Match continuous timeline view"
            >
              Full Match
            </button>
          )}
        </div>

        {/* Right: Past Half Review Notice & Add Note Action */}
        <div className="flex items-center gap-2 shrink-0">
          {isViewingPastHalf && (
            <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[10px] font-medium">
              <Eye className="w-3 h-3" />
              <span>Reviewing {currentDef?.name || '1st Half'} (2nd Half is running live)</span>
            </div>
          )}

          {!autoFollowClock && activePeriodId && (
            <button
              type="button"
              onClick={() => {
                setSelectedHalf(activePeriodId as HalfTimelineTab);
                setAutoFollowClock(true);
              }}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-[10px] font-bold hover:bg-emerald-500/25 transition-colors cursor-pointer"
              title="Return to live match timeline"
            >
              <span>Follow Live</span>
            </button>
          )}

          {/* Add Note Button to this half (does NOT affect other halves or timer) */}
          {setMarkers && (
            <button
              type="button"
              onClick={() => {
                setNoteTimeStr(formatTickLabel(currentMatchTime));
                setShowNoteModal(true);
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/10 text-gray-200 text-[11px] font-bold border border-white/10 transition-all cursor-pointer shadow-sm active:scale-95"
              title={`Add note to ${currentDef?.name || 'this half'} timeline`}
            >
              <Plus className="w-3 h-3 text-[#c6ff1f]" />
              <span>Add Note</span>
            </button>
          )}
        </div>
      </div>

      {/* --- TIMELINE AREA (NON-SCRUBBABLE FOR LIVE TIME) --- */}
      <div className="flex-1 flex min-h-0 relative">
        {/* Left Track Headers */}
        <div className="w-24 sm:w-28 bg-[#0e0e11] border-r border-[#22222a] shrink-0 flex flex-col z-20 shadow-lg">
          {/* Header over ruler */}
          <div className="h-7 border-b border-white/5 bg-[#141418] flex items-center px-2 text-[10px] font-bold text-gray-400 uppercase tracking-wider">
            {selectedHalf === '1st-half' ? '1H (0\'-45\')' : selectedHalf === '2nd-half' ? '2H (45\'-90\')' : selectedHalf === 'et-1st' ? 'ET1 (90\'-105\')' : selectedHalf === 'et-2nd' ? 'ET2 (105\'-120\')' : selectedHalf === 'penalties' ? 'Penalties' : 'Match'}
          </div>

          {/* Track Labels */}
          <div className="flex-1 flex flex-col py-2 px-2 gap-2 overflow-hidden">
            <div className="h-7 flex items-center gap-1.5 text-[10px] font-medium text-gray-300 shrink-0">
              <TagIcon className="w-3 h-3 text-[#c6ff1f]" />
              <span className="truncate">Events</span>
            </div>
            <div className="h-7 flex items-center gap-1.5 text-[10px] font-medium text-gray-400 shrink-0 border-t border-white/5 pt-1">
              <MapPin className="w-3 h-3 text-blue-400" />
              <span className="truncate">Notes</span>
            </div>
          </div>
        </div>

        {/* Scrollable Tracks & Dynamic Ruler Container */}
        <div className="flex-1 relative overflow-x-auto overflow-y-hidden bg-[#070709]">
          <div style={{ width: `${timelineZoom * 100}%`, minWidth: '100%' }} className="relative h-full flex flex-col">
            
            {/* --- RULER BAR (VIEW-ONLY, DOES NOT CHANGE LIVE TIME) --- */}
            <div className="h-7 border-b border-white/10 bg-[#121216] sticky top-0 w-full shrink-0 z-30 select-none overflow-hidden">
              {/* Stoppage Time visual background highlight */}
              {timelineBounds.stoppageStart < timelineBounds.end && (
                <div
                  className="absolute top-0 bottom-0 bg-amber-500/10 border-l-2 border-amber-500/40 pointer-events-none"
                  style={{
                    left: `${((timelineBounds.stoppageStart - timelineBounds.start) / (timelineBounds.end - timelineBounds.start)) * 100}%`,
                    right: 0
                  }}
                >
                  <div className="absolute top-0.5 left-1 text-[8.5px] font-bold text-amber-400/80 uppercase font-mono tracking-tight">
                    + Stoppage
                  </div>
                </div>
              )}

              {/* Tick Marks & Labels */}
              <div className="absolute inset-0 pointer-events-none flex items-end">
                {rulerTicks.map((tick, i) => (
                  <div
                    key={i}
                    className="absolute h-full flex flex-col items-center justify-end pb-0.5 -translate-x-1/2"
                    style={{ left: `${tick.pct}%` }}
                  >
                    <div
                      className={`w-[1px] ${
                        tick.isMajor
                          ? tick.isStoppage ? 'h-3 bg-amber-400' : 'h-3 bg-gray-300'
                          : 'h-1.5 bg-gray-600'
                      }`}
                    />
                    {tick.isMajor && (
                      <span
                        className={`text-[9px] font-mono tracking-tighter font-bold select-none ${
                          tick.isStoppage ? 'text-amber-400 drop-shadow' : 'text-gray-300'
                        }`}
                      >
                        {tick.label}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* --- TRACKS AREA --- */}
            <div className="flex-1 relative w-full overflow-hidden">
              {/* Grid Background Lines */}
              <div className="absolute inset-0 pointer-events-none opacity-10">
                {rulerTicks.filter(t => t.isMajor).map((t, idx) => (
                  <div
                    key={idx}
                    className="absolute top-0 bottom-0 w-[1px] bg-white -translate-x-1/2 dashed"
                    style={{ left: `${t.pct}%` }}
                  />
                ))}
              </div>

              {/* Period Divider Lines for Full Match View (Half-time 45' and Full-time 90') */}
              {selectedHalf === 'all' && (
                <>
                  {/* Half-Time (45') Divider */}
                  {timelineBounds.end >= 45 * 60 && (
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-15 flex flex-col items-center"
                      style={{ left: `${((45 * 60 - timelineBounds.start) / (timelineBounds.end - timelineBounds.start)) * 100}%` }}
                    >
                      <div className="w-[1px] h-full bg-[#c6ff1f]/30 border-l border-dashed border-[#c6ff1f]/50" />
                      <div className="absolute top-1 -translate-x-1/2 px-1 py-0.2 rounded bg-black/80 border border-[#c6ff1f]/40 text-[#c6ff1f] font-mono font-bold text-[8px] tracking-tight">
                        HT 45'
                      </div>
                    </div>
                  )}

                  {/* Full-Time (90') Divider */}
                  {timelineBounds.end >= 90 * 60 && (
                    <div
                      className="absolute top-0 bottom-0 pointer-events-none z-15 flex flex-col items-center"
                      style={{ left: `${((90 * 60 - timelineBounds.start) / (timelineBounds.end - timelineBounds.start)) * 100}%` }}
                    >
                      <div className="w-[1px] h-full bg-amber-400/30 border-l border-dashed border-amber-400/50" />
                      <div className="absolute top-1 -translate-x-1/2 px-1 py-0.2 rounded bg-black/80 border border-amber-400/40 text-amber-400 font-mono font-bold text-[8px] tracking-tight">
                        FT 90'
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Event Lane */}
              <div className="absolute top-2 left-0 right-0 h-8 px-1 z-10">
                <div className="relative w-full h-full bg-white/5 rounded-lg border border-white/5 backdrop-blur-sm overflow-hidden">
                  {visibleEvents.map(({ event: evt, matchStart, matchEnd }) => {
                    const tag = tags.find(t => t.id === evt.tagId);
                    const totalSpan = timelineBounds.end - timelineBounds.start;
                    const startPct = totalSpan > 0 ? ((matchStart - timelineBounds.start) / totalSpan) * 100 : 0;
                    const widthPct = totalSpan > 0 ? Math.max(0.4, ((matchEnd - matchStart) / totalSpan) * 100) : 1;
                    const isSelected = selectedEventIds.has(evt.id);

                    return (
                      <motion.div
                        key={evt.id}
                        whileHover={{ scaleY: 1.15, zIndex: 40 }}
                        style={{
                          left: `${startPct}%`,
                          width: `${widthPct}%`,
                          backgroundColor: isSelected ? '#ffffff' : fadeColor(tag?.color || '#3b82f6', 0.85),
                          borderColor: tag?.color || '#3b82f6'
                        }}
                        className={`absolute top-0.5 bottom-0.5 rounded cursor-pointer transition-colors border shadow-md flex items-center justify-center overflow-hidden group/event ${
                          isSelected ? 'ring-2 ring-white ring-offset-1 ring-offset-black z-40' : 'hover:brightness-125'
                        }`}
                        onClick={e => {
                          e.stopPropagation();
                          handleEventClick(e, evt.id, evt.startTime);
                        }}
                        onContextMenu={e => {
                          if (handleEventContextMenu) {
                            e.stopPropagation();
                            handleEventContextMenu(e, evt.id);
                          }
                        }}
                      >
                        <span className="text-[9.5px] font-bold text-white truncate px-1 drop-shadow select-none">
                          {tag?.name}
                        </span>

                        {/* Tooltip on Hover */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-0.5 bg-black/90 border border-white/10 text-white text-[10px] font-mono rounded shadow-xl pointer-events-none whitespace-nowrap opacity-0 group-hover/event:opacity-100 transition-opacity z-50">
                          {tag?.name} ({formatTickLabel(matchStart)} - {formatTickLabel(matchEnd)})
                          {evt.notes ? ` • Note: ${evt.notes}` : ''}
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              {/* Notes Lane */}
              <div className="absolute top-12 left-0 right-0 h-6 px-1 z-20">
                <div className="relative w-full h-full">
                  {visibleMarkers.map(marker => {
                    const totalSpan = timelineBounds.end - timelineBounds.start;
                    const markerMatchTime = (marker as any).matchTime ?? marker.time;
                    const pct = totalSpan > 0 ? ((markerMatchTime - timelineBounds.start) / totalSpan) * 100 : 0;
                    if (pct < 0 || pct > 100) return null;

                    return (
                      <div
                        key={marker.id}
                        style={{ left: `${pct}%` }}
                        className="absolute top-0 bottom-0 w-[2px] pointer-events-auto cursor-pointer group/marker"
                        onMouseEnter={() => setHoveredMarkerId(marker.id)}
                        onMouseLeave={() => setHoveredMarkerId(null)}
                      >
                        <div
                          className="absolute -top-1 -ml-2.5 w-5 h-5 rounded-full flex items-center justify-center shadow-md transition-transform hover:scale-125"
                          style={{ backgroundColor: marker.color || '#3b82f6' }}
                        >
                          <MapPin className="w-3 h-3 text-white" />
                        </div>

                        {/* Hover Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2 py-1 bg-black/95 border border-white/15 text-white text-[10px] rounded-lg shadow-xl pointer-events-none whitespace-nowrap opacity-0 group-hover/marker:opacity-100 transition-opacity z-50">
                          <div className="font-bold text-[#c6ff1f]">{formatTickLabel(markerMatchTime)}</div>
                          <div>{marker.label}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* --- PLAYHEAD (FOLLOWS MATCH TIMER IN REAL TIME) --- */}
              {(!isViewingPastHalf || selectedHalf === activePeriodId) && (
                <motion.div
                  className="absolute top-0 bottom-0 z-50 flex items-start justify-center pointer-events-none"
                  style={{ left: `${playheadPercent}%` }}
                  transition={{ type: 'tween', ease: 'linear', duration: 0.05 }}
                >
                  <div className="absolute top-0 bottom-0 w-[2px] bg-red-500 shadow-[0_0_12px_rgba(239,68,68,1)]" />
                  <div className="absolute -top-6 -translate-x-1/2 bg-red-600 text-white font-mono font-bold text-[10px] px-1.5 py-0.5 rounded shadow-lg border border-white/20 flex items-center gap-1 select-none pointer-events-none">
                    <span>{formatTickLabel(currentMatchTime)}</span>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* --- ADD NOTE MODAL --- */}
      <AnimatePresence>
        {showNoteModal && (
          <div className="fixed inset-0 z-[500] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="bg-[#151518] border border-[#303038] rounded-2xl shadow-2xl p-5 w-full max-w-sm flex flex-col gap-4"
            >
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#c6ff1f]" />
                  <h3 className="text-white font-bold text-sm">
                    Add Note to {currentDef?.name || 'Timeline'}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="p-1 hover:bg-white/10 rounded-lg text-gray-400 hover:text-white transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="flex flex-col gap-3">
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400 block mb-1">
                    Note Description
                  </label>
                  <textarea
                    autoFocus
                    rows={3}
                    placeholder="e.g. High pressing worked effectively, switch to back 3"
                    value={noteText}
                    onChange={e => setNoteText(e.target.value)}
                    className="w-full bg-black/70 border border-white/15 focus:border-[#c6ff1f] rounded-xl p-3 text-xs text-white outline-none shadow-inner resize-none transition-colors"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                      Time (MM:SS)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 23:45"
                      value={noteTimeStr}
                      onChange={e => setNoteTimeStr(e.target.value)}
                      className="w-full bg-black/70 border border-white/15 rounded-lg px-2.5 py-1.5 text-xs font-mono text-white outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 block mb-1">
                      Pin Color
                    </label>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      {['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'].map(c => (
                        <button
                          key={c}
                          type="button"
                          onClick={() => setNoteColor(c)}
                          style={{ backgroundColor: c }}
                          className={`w-6 h-6 rounded-full transition-transform cursor-pointer ${
                            noteColor === c ? 'ring-2 ring-white scale-110' : 'opacity-70 hover:opacity-100'
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setShowNoteModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveNote}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#c6ff1f] hover:bg-[#b0e619] text-black shadow-lg shadow-[#c6ff1f]/20 transition-all cursor-pointer"
                >
                  Save Note
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
