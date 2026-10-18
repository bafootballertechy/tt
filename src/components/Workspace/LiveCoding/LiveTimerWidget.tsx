import React from 'react';
import { Play, Pause, Edit2, Check, X, RotateCcw } from 'lucide-react';
import type { PeriodSync } from '../../../types';
import type { MatchPeriodDef, LiveClockState, LiveClockDetails } from './types';

interface LiveTimerWidgetProps {
  clockDetails: LiveClockDetails;
  clockState: LiveClockState;
  activePeriodId: string | null;
  periods: MatchPeriodDef[];
  maxPeriodIndex: number;
  periodSyncs: PeriodSync[];
  isEditingTimer: boolean;
  editedTimerValue: string;
  onSetEditedTimerValue: (val: string) => void;
  onStartEditing: () => void;
  onCancelEditing: () => void;
  onSaveEditing: () => void;
  onResume: () => void;
  onPause: () => void;
  onRequestPeriod: (id: string, name: string, index: number) => void;
  onAdjustTime?: (delta: number) => void;
}

export const LiveTimerWidget: React.FC<LiveTimerWidgetProps> = ({
  clockDetails,
  clockState,
  activePeriodId,
  periods,
  maxPeriodIndex,
  periodSyncs,
  isEditingTimer,
  editedTimerValue,
  onSetEditedTimerValue,
  onStartEditing,
  onCancelEditing,
  onSaveEditing,
  onResume,
  onPause,
  onRequestPeriod,
  onAdjustTime
}) => {
  const activePeriod = periods.find(p => p.id === activePeriodId);

  return (
    <div className="flex flex-col justify-between w-full h-full select-none gap-2 p-1 font-sans">
      {/* Top: Active Period & Status */}
      <div className="flex items-center justify-between w-full px-1">
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
          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-300">
            {activePeriod?.name || 'Football Match'}
          </span>
        </div>

        {clockDetails.hasStoppage && (
          <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
            +{clockDetails.stoppageTime}
          </span>
        )}
      </div>

      {/* Clock Display */}
      <div className="flex flex-col items-center justify-center my-auto w-full px-1 gap-1.5">
        {isEditingTimer ? (
          <div className="flex flex-col items-center gap-1.5 w-full">
            <div className="flex items-center gap-1.5 w-full justify-center">
              <input
                type="text"
                autoFocus
                value={editedTimerValue}
                onChange={e => onSetEditedTimerValue(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') onSaveEditing();
                  if (e.key === 'Escape') onCancelEditing();
                }}
                className="bg-black/80 border border-[#c6ff1f] text-[#c6ff1f] font-mono text-xl font-black tracking-tight tabular-nums text-center w-28 outline-none rounded-lg py-1 shadow-inner"
                placeholder="MM:SS"
              />
              <button
                type="button"
                onClick={() => onSaveEditing()}
                className="p-1.5 bg-[#c6ff1f] hover:bg-[#b0e619] text-black font-bold rounded-lg transition-colors cursor-pointer active:scale-95"
                title="Save Time"
              >
                <Check className="w-3.5 h-3.5 stroke-[3]" />
              </button>
              <button
                type="button"
                onClick={onCancelEditing}
                className="p-1.5 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors cursor-pointer active:scale-95"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Quick Nudge Buttons ONLY during timer editing */}
            {onAdjustTime && (
              <div className="flex items-center gap-1 font-mono text-[10px]">
                <button
                  type="button"
                  onClick={() => onAdjustTime(-10)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-gray-300 border border-white/10"
                >
                  -10s
                </button>
                <button
                  type="button"
                  onClick={() => onAdjustTime(10)}
                  className="px-2 py-0.5 rounded bg-white/5 hover:bg-white/15 text-[#c6ff1f] border border-[#c6ff1f]/30 font-bold"
                >
                  +10s
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-center gap-2">
            <div className="flex items-baseline gap-1.5">
              <span className="text-[#c6ff1f] font-mono text-3xl sm:text-4xl font-black tracking-tighter tabular-nums drop-shadow-[0_0_15px_rgba(198,255,31,0.3)]">
                {clockDetails.baseTime}
              </span>
              {clockDetails.stoppageTime && (
                <span className="text-amber-400 font-mono text-xl font-bold tracking-tight">
                  {clockDetails.stoppageTime}
                </span>
              )}
            </div>

            <button
              type="button"
              onClick={onStartEditing}
              className="p-1.5 bg-white/5 hover:bg-white/15 rounded-lg text-gray-300 hover:text-white transition-all cursor-pointer border border-white/5 shadow-xs"
              title="Edit Match Time"
            >
              <Edit2 className="w-3.5 h-3.5 text-[#c6ff1f]" />
            </button>
          </div>
        )}
      </div>

      {/* Progress Bar in Regulation */}
      {activePeriod && activePeriod.normalDuration > 0 && (
        <div className="w-full h-1 bg-white/10 rounded-full overflow-hidden shrink-0">
          <div
            className={`h-full transition-all duration-300 ${clockDetails.isOvertime ? 'bg-amber-400' : 'bg-[#c6ff1f]'}`}
            style={{ width: `${clockDetails.periodProgressPercent}%` }}
          />
        </div>
      )}

      {/* Controls & Period Selector Bar */}
      <div className="flex items-center justify-between gap-1.5 pt-1.5 border-t border-white/5 shrink-0">
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={clockState === 'running' ? onPause : onResume}
            className={`w-7 h-7 rounded-full flex items-center justify-center transition-all cursor-pointer shadow-sm ${
              clockState === 'running'
                ? 'bg-white/20 hover:bg-white/30 text-white'
                : 'bg-[#c6ff1f] hover:bg-[#b0e619] text-black font-bold'
            }`}
            title={clockState === 'running' ? 'Pause Match Clock' : 'Start / Resume Clock'}
          >
            {clockState === 'running' ? (
              <Pause className="w-3 h-3 fill-current" />
            ) : (
              <Play className="w-3 h-3 fill-current ml-0.5" />
            )}
          </button>
        </div>

        {/* Period Selector Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
          {periods.map((p, index) => {
            const isCurrent = activePeriodId === p.id;
            const isAvailable = index >= maxPeriodIndex || maxPeriodIndex === -1;

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
                className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider transition-all border shrink-0 ${
                  isCurrent
                    ? 'bg-[#c6ff1f] text-black border-[#c6ff1f] font-black'
                    : isAvailable
                    ? 'bg-[#18181c] border-[#2c2c34] text-gray-300 hover:text-white hover:bg-[#25252c] cursor-pointer'
                    : 'bg-[#0f0f12] border-transparent text-gray-600 cursor-not-allowed'
                }`}
                title={p.name}
              >
                {p.shortLabel || p.name}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
