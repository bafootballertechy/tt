import React from 'react';
import {
  Play, Pause, Edit2, Check, X
} from 'lucide-react';
import type { MatchPeriodDef, LiveClockState, LiveClockDetails } from './types';

interface LiveCodingCenterViewProps {
  projectName?: string;
  clockDetails: LiveClockDetails;
  clockState: LiveClockState;
  activePeriodId: string | null;
  periods: MatchPeriodDef[];
  maxPeriodIndex: number;
  isEditingTimer: boolean;
  editedTimerValue: string;
  onSetEditedTimerValue: (val: string) => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveEditing: () => void;
  onResume: () => void;
  onPause: () => void;
  onRequestPeriod: (id: string, name: string, index: number) => void;
  onAdjustTime?: (deltaSeconds: number) => void;
  onNudgeTimer?: (deltaSeconds: number) => void;
  // Backward compatibility optional props
  periodSyncs?: any[];
  tags?: any[];
  tagEvents?: any[];
  onTagClick?: (tagId: string) => void;
  onDeleteEvent?: (eventId: string) => void;
  showNotification?: (msg: string, color?: string) => void;
  activePresetId?: string;
  onApplySportPreset?: (presetId: string) => void;
  onPopoutTimer?: () => void;
  onPopoutPad?: () => void;
  onImportVideo?: () => void;
}

export const LiveCodingCenterView: React.FC<LiveCodingCenterViewProps> = ({
  projectName,
  clockDetails,
  clockState,
  activePeriodId,
  periods,
  maxPeriodIndex,
  isEditingTimer,
  editedTimerValue,
  onSetEditedTimerValue,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onResume,
  onPause,
  onRequestPeriod,
  onAdjustTime,
  onNudgeTimer
}) => {
  const activePeriod = periods.find(p => p.id === activePeriodId) || periods[0];

  // Helper to nudge current edited string value by delta seconds
  const handleNudge = (deltaSeconds: number) => {
    if (onNudgeTimer) {
      onNudgeTimer(deltaSeconds);
      return;
    }
    // Fallback internal nudge calculation
    let currentSeconds = clockDetails.matchTimeSeconds;
    const cleaned = (editedTimerValue || '').trim().replace(/['"m]/g, '');
    if (cleaned) {
      if (cleaned.includes('+')) {
        const parts = cleaned.split('+');
        const m1 = parseInt(parts[0], 10) || 0;
        const m2 = parseInt(parts[1], 10) || 0;
        currentSeconds = m1 * 60 + (parts[1].includes(':') ? (parseInt(parts[1].split(':')[0], 10) * 60 + parseInt(parts[1].split(':')[1], 10)) : m2 * 60);
      } else if (cleaned.includes(':')) {
        const parts = cleaned.split(':');
        currentSeconds = (parseInt(parts[0], 10) || 0) * 60 + (parseInt(parts[1], 10) || 0);
      } else if (!isNaN(Number(cleaned))) {
        currentSeconds = parseFloat(cleaned) * 60;
      }
    }
    const newTotal = Math.max(0, currentSeconds + deltaSeconds);
    const m = Math.floor(newTotal / 60);
    const s = Math.floor(newTotal % 60);
    onSetEditedTimerValue(`${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`);
  };

  return (
    <div className="w-full h-full flex flex-col items-center justify-center bg-[#09090b] p-3 sm:p-5 overflow-y-auto select-none">
      {/* Background Tactical Grid Lines */}
      <div className="absolute inset-0 opacity-[0.025] pointer-events-none bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:24px_24px]" />

      {/* Compact Dedicated Match Timer Card */}
      <div className="relative z-10 w-full max-w-lg bg-[#111116]/95 border border-[#22222d] rounded-2xl p-4 sm:p-5 shadow-[0_8px_32px_rgba(0,0,0,0.6)] backdrop-blur-md flex flex-col items-center my-auto">
        {/* Header: Active Period & Compact Period Selector Chips */}
        <div className="flex flex-wrap items-center justify-between gap-2 w-full mb-1.5">
          <div className="flex items-center gap-1.5">
            <span
              className={`w-2 h-2 rounded-full ${
                clockState === 'running'
                  ? 'bg-[#c6ff1f] animate-pulse shadow-[0_0_8px_#c6ff1f]'
                  : clockState === 'paused'
                  ? 'bg-amber-400'
                  : 'bg-gray-500'
              }`}
            />
            <span className="text-[11px] sm:text-xs uppercase tracking-wider font-bold text-gray-300">
              {activePeriod?.name || 'Football Match'}
            </span>
          </div>

          {/* Period Selector Chips (1H, 2H, ET1, ET2, PEN) */}
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {periods.map((p, index) => {
              const isCurrent = activePeriodId === p.id;
              const isAvailable = index >= maxPeriodIndex || maxPeriodIndex === -1;
              const isPast = index < maxPeriodIndex;

              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => {
                    if (isAvailable && !isCurrent) {
                      onRequestPeriod(p.id, p.name, index);
                    }
                  }}
                  disabled={!isAvailable && !isCurrent}
                  className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase transition-all border shrink-0 ${
                    isCurrent
                      ? 'bg-[#c6ff1f] text-black border-[#c6ff1f] font-black shadow-xs'
                      : isAvailable
                      ? 'bg-[#181820] border-[#292936] text-gray-300 hover:text-white hover:bg-[#232330] cursor-pointer'
                      : 'bg-[#0e0e12] border-transparent text-gray-600 cursor-not-allowed'
                  }`}
                  title={p.name}
                >
                  <span>{p.shortLabel || p.name}</span>
                  {isPast && <span className="ml-0.5 text-emerald-400">✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Regulation Duration Progress Line */}
        {activePeriod && activePeriod.normalDuration > 0 && (
          <div className="w-full h-1 bg-[#1b1b24] rounded-full overflow-hidden mb-3 border border-white/5">
            <div
              className={`h-full transition-all duration-300 ${
                clockDetails.isOvertime
                  ? 'bg-amber-400'
                  : 'bg-gradient-to-r from-[#c6ff1f] to-emerald-400'
              }`}
              style={{ width: `${clockDetails.periodProgressPercent}%` }}
            />
          </div>
        )}

        {/* Center: Digital Clock Display & Editing View */}
        <div className="flex flex-col items-center justify-center my-2 sm:my-3 w-full gap-2">
          {isEditingTimer ? (
            <div className="flex flex-col items-center gap-2.5 w-full">
              {/* Input + Save + Cancel */}
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  autoFocus
                  value={editedTimerValue}
                  onChange={e => onSetEditedTimerValue(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') onSaveEditing();
                    if (e.key === 'Escape') onCancelEditing();
                  }}
                  className="bg-black/90 border-2 border-[#c6ff1f] text-[#c6ff1f] font-mono text-2xl sm:text-3xl font-black tracking-tight tabular-nums text-center w-48 outline-none rounded-xl py-1 shadow-[0_0_15px_rgba(198,255,31,0.2)]"
                  placeholder="e.g. 53:20 or 45+2"
                />
                <button
                  type="button"
                  onClick={() => onSaveEditing()}
                  className="p-2 bg-[#c6ff1f] hover:bg-[#b5eb1b] text-black font-bold rounded-xl transition-all shadow-md cursor-pointer active:scale-95"
                  title="Save Time (Enter)"
                >
                  <Check className="w-5 h-5 stroke-[3]" />
                </button>
                <button
                  type="button"
                  onClick={onCancelEditing}
                  className="p-2 bg-gray-800 hover:bg-gray-700 text-white rounded-xl transition-all cursor-pointer active:scale-95"
                  title="Cancel (Esc)"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Quick Nudge Buttons (+10s, -10s, +1m, -1m) - ONLY visible during timer editing */}
              <div className="flex items-center justify-center gap-1.5 font-mono text-xs">
                <button
                  type="button"
                  onClick={() => handleNudge(-60)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 active:scale-95 transition-all cursor-pointer"
                  title="Minus 1 Minute"
                >
                  -1m
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(-10)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white border border-white/10 active:scale-95 transition-all cursor-pointer"
                  title="Minus 10 Seconds"
                >
                  -10s
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(10)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[#c6ff1f] border border-[#c6ff1f]/30 active:scale-95 transition-all cursor-pointer font-bold"
                  title="Plus 10 Seconds"
                >
                  +10s
                </button>
                <button
                  type="button"
                  onClick={() => handleNudge(60)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/15 text-[#c6ff1f] border border-[#c6ff1f]/30 active:scale-95 transition-all cursor-pointer font-bold"
                  title="Plus 1 Minute"
                >
                  +1m
                </button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2">
              <div className="flex items-baseline gap-2">
                <span className="text-[#c6ff1f] font-mono text-4xl sm:text-5xl font-black tracking-tight tabular-nums drop-shadow-[0_0_20px_rgba(198,255,31,0.25)] leading-none">
                  {clockDetails.baseTime}
                </span>

                {clockDetails.stoppageTime && (
                  <span className="text-amber-400 font-mono text-xl sm:text-2xl font-bold tracking-tight">
                    +{clockDetails.stoppageTime}
                  </span>
                )}
              </div>

              <button
                type="button"
                onClick={onStartEditing}
                className="p-2 bg-white/5 hover:bg-white/15 text-gray-300 hover:text-white rounded-xl transition-all cursor-pointer border border-white/5 shadow-xs"
                title="Edit Match Time"
              >
                <Edit2 className="w-4 h-4 text-[#c6ff1f]" />
              </button>
            </div>
          )}
        </div>

        {/* Bottom Controls Row: Play/Pause */}
        <div className="flex items-center justify-center w-full pt-2 border-t border-white/5">
          {/* Primary Play / Pause Toggle Button */}
          <button
            type="button"
            onClick={clockState === 'running' ? onPause : onResume}
            className={`w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 active:scale-95 transition-all shadow-md cursor-pointer ${
              clockState === 'running'
                ? 'bg-white/15 hover:bg-white/25 text-white border border-white/20'
                : 'bg-[#c6ff1f] hover:bg-[#b0e619] text-black font-bold shadow-[0_0_20px_rgba(198,255,31,0.3)]'
            }`}
            title={clockState === 'running' ? 'Pause Match Clock (Space)' : 'Start / Resume Clock (Space)'}
          >
            {clockState === 'running' ? (
              <Pause className="w-5 h-5 fill-current" />
            ) : (
              <Play className="w-5 h-5 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Hotkey Guide */}
        <span className="text-[10px] font-mono text-gray-500 mt-2 text-center">
          Space to Play/Pause · Edit to adjust time or ±10s
        </span>
      </div>
    </div>
  );
};
