import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, ZoomIn, ZoomOut, Filter, ChevronUp, Tag, FileVideo
} from 'lucide-react';
import type { LiveClockDetails, LiveClockState, MatchPeriodDef } from './types';

interface LiveCodingBottomBarProps {
  clockDetails: LiveClockDetails;
  clockState: LiveClockState;
  activePeriod: MatchPeriodDef | null;
  tagEventsCount: number;
  timelineZoom: number;
  handleZoomIn: () => void;
  handleZoomOut: () => void;
  showTimelineFiltersMenu: boolean;
  setShowTimelineFiltersMenu: (show: boolean) => void;
  showTimelineTags: boolean;
  setShowTimelineTags: (show: boolean) => void;
  onTogglePlay: () => void;
  onImportVideo: () => void;
  onStartEditing?: () => void;
  // Optional backward compat props
  onPopoutTimer?: () => void;
  onPopoutPad?: () => void;
}

export const LiveCodingBottomBar: React.FC<LiveCodingBottomBarProps> = ({
  clockDetails,
  clockState,
  activePeriod,
  tagEventsCount,
  timelineZoom,
  handleZoomIn,
  handleZoomOut,
  showTimelineFiltersMenu,
  setShowTimelineFiltersMenu,
  showTimelineTags,
  setShowTimelineTags,
  onTogglePlay,
  onImportVideo,
  onStartEditing
}) => {
  return (
    <div className="min-h-[44px] flex flex-wrap items-center justify-between gap-2 py-1.5 px-3 bg-[#0d0d10] shrink-0 border-t border-[#202026] overflow-visible w-full relative z-[60]">
      {/* Left: Live Match Status & Clock */}
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-red-500/15 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          <span>Live</span>
        </div>

        <button
          type="button"
          onClick={onTogglePlay}
          className={`p-1.5 rounded-full transition-all shadow-sm cursor-pointer ${
            clockState === 'running'
              ? 'bg-white/10 hover:bg-white/20 text-white'
              : 'bg-[#c6ff1f] hover:bg-[#b0e619] text-black font-bold'
          }`}
          title={clockState === 'running' ? 'Pause Match Clock' : 'Start / Resume Match Clock'}
        >
          {clockState === 'running' ? (
            <Pause className="w-3.5 h-3.5 fill-current" />
          ) : (
            <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
          )}
        </button>

        <div
          className={`flex items-baseline gap-1 font-mono ${onStartEditing ? 'cursor-pointer hover:opacity-80 transition-opacity' : ''}`}
          onClick={onStartEditing}
          title="Click to Equate Match Time"
        >
          <span className="text-[#c6ff1f] font-bold text-sm sm:text-base tabular-nums">
            {clockDetails.baseTime}
          </span>
          {clockDetails.stoppageTime && (
            <span className="text-amber-400 font-bold text-xs">
              {clockDetails.stoppageTime}
            </span>
          )}
        </div>

        <span className="text-[10px] font-semibold text-gray-400 bg-white/5 px-2 py-0.5 rounded border border-white/5 hidden sm:inline">
          {activePeriod?.name || '1st Half'}
        </span>
      </div>

      {/* Middle: Events Counter */}
      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white/5 rounded-md border border-white/5 text-xs text-gray-300">
          <Tag className="w-3 h-3 text-[#c6ff1f]" />
          <span className="font-bold text-white font-mono text-[11px]">{tagEventsCount}</span>
          <span className="text-gray-400 text-[10px]">events</span>
        </div>
      </div>

      {/* Right: Zoom, Filters, & Import Video Action */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Zoom Controls */}
        <div className="flex items-center gap-0.5 shrink-0">
          <button
            type="button"
            onClick={handleZoomOut}
            disabled={timelineZoom <= 1}
            className="p-1 hover:bg-[#222] rounded-md text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
            title="Zoom Out Timeline"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <span className="text-[11px] font-mono w-7 text-center text-gray-400">
            {timelineZoom}x
          </span>
          <button
            type="button"
            onClick={handleZoomIn}
            disabled={timelineZoom >= 100}
            className="p-1 hover:bg-[#222] rounded-md text-gray-400 hover:text-white disabled:opacity-30 cursor-pointer"
            title="Zoom In Timeline"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Timeline Filters */}
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={() => setShowTimelineFiltersMenu(!showTimelineFiltersMenu)}
            className={`p-1.5 rounded-md transition-colors flex items-center gap-1 text-xs font-bold cursor-pointer ${
              showTimelineFiltersMenu ? 'bg-[#333] text-white' : 'hover:bg-[#222] text-gray-400'
            }`}
            title="Timeline Tag Visibility"
          >
            <Filter className="w-3.5 h-3.5" />
            <ChevronUp className="w-3 h-3 hidden sm:block" />
          </button>

          <AnimatePresence>
            {showTimelineFiltersMenu && (
              <motion.div
                initial={{ opacity: 0, y: 10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 10, scale: 0.95 }}
                transition={{ duration: 0.15 }}
                className="absolute bottom-full right-0 mb-2 w-48 bg-[#141416] border border-[#333] rounded-xl shadow-2xl overflow-hidden z-50 p-2"
              >
                <div className="text-[10px] uppercase font-bold text-gray-500 mb-2 px-2 pt-1">
                  Live Timeline Tracks
                </div>
                <label className="flex items-center justify-between p-2 hover:bg-[#222] rounded-lg cursor-pointer transition-colors group">
                  <span className="text-xs text-gray-300 font-medium flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-emerald-400" />
                    Tag Tracks
                  </span>
                  <div className={`w-7 h-4 rounded-full transition-colors relative ${showTimelineTags ? 'bg-emerald-600' : 'bg-[#333]'}`}>
                    <div className={`absolute top-0.5 bottom-0.5 w-3 bg-white rounded-full transition-all shadow-sm ${showTimelineTags ? 'right-0.5' : 'left-0.5'}`} />
                  </div>
                  <input
                    type="checkbox"
                    className="hidden"
                    checked={showTimelineTags}
                    onChange={() => setShowTimelineTags(!showTimelineTags)}
                  />
                </label>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="w-px h-4 bg-white/10 hidden sm:block" />

        {/* Finish / Import Video Button */}
        <button
          type="button"
          onClick={onImportVideo}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-600/90 hover:bg-emerald-600 text-white text-xs font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
          title="Import recorded match video to align and finalize project"
        >
          <FileVideo className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Finish & Import</span>
        </button>
      </div>
    </div>
  );
};
