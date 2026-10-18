import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Play, Pause, SkipBack, SkipForward, X, SlidersHorizontal, 
  RotateCcw, Volume2, VolumeX, Maximize2, Minimize2, 
  ChevronLeft, ChevronRight, Layers, Sparkles, Repeat, Check
} from 'lucide-react';
import { Playlist, TagEvent } from '../../../types';
import { formatTime } from '../../../utils/math';
import { fadeColor } from '../../../utils/colors';

interface PresentationHUDProps {
  currentPlaylist: Playlist | undefined;
  playlistIndex: number;
  totalPlaylists: number;
  allOrderedPlaylists: Playlist[];
  currentClipIndex: number;
  totalClipsInPlaylist: number;
  currentEvent: TagEvent | undefined;
  currentTiming: { startTime: number; endTime: number; duration: number };
  currentTime: number;
  isPlaying: boolean;
  onTogglePlay: () => void;
  onPrevClip: () => void;
  onNextClip: () => void;
  onSelectPlaylistIndex: (index: number) => void;
  onSeekClip: (time: number) => void;
  onOpenCustomize: () => void;
  onExitPresentation: () => void;
  volume: number;
  setVolume: (v: number) => void;
  isMuted: boolean;
  toggleMute: () => void;
  playbackRate: number;
  setPlaybackRate: (rate: number) => void;
  loop: boolean;
  onToggleLoop: () => void;
  isFinished: boolean;
  onReplayPresentation: () => void;
  transitionMessage?: string | null;
}

export const PresentationHUD: React.FC<PresentationHUDProps> = ({
  currentPlaylist,
  playlistIndex,
  totalPlaylists,
  allOrderedPlaylists,
  currentClipIndex,
  totalClipsInPlaylist,
  currentEvent,
  currentTiming,
  currentTime,
  isPlaying,
  onTogglePlay,
  onPrevClip,
  onNextClip,
  onSelectPlaylistIndex,
  onSeekClip,
  onOpenCustomize,
  onExitPresentation,
  volume,
  setVolume,
  isMuted,
  toggleMute,
  playbackRate,
  setPlaybackRate,
  loop,
  onToggleLoop,
  isFinished,
  onReplayPresentation,
  transitionMessage
}) => {
  const [isIdle, setIsIdle] = useState(false);
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Mouse activity listener to auto-hide HUD after 3.5s during playback
  useEffect(() => {
    const resetIdle = () => {
      setIsIdle(false);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (isPlaying) {
        idleTimerRef.current = setTimeout(() => {
          setIsIdle(true);
        }, 3500);
      }
    };

    window.addEventListener('mousemove', resetIdle);
    window.addEventListener('mousedown', resetIdle);
    window.addEventListener('keydown', resetIdle);

    resetIdle();

    return () => {
      window.removeEventListener('mousemove', resetIdle);
      window.removeEventListener('mousedown', resetIdle);
      window.removeEventListener('keydown', resetIdle);
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
    };
  }, [isPlaying]);

  // Current clip progress calculations
  const clipDuration = Math.max(0.1, currentTiming.duration);
  const clipElapsed = Math.max(0, Math.min(clipDuration, currentTime - currentTiming.startTime));
  const clipProgressPct = Math.min(100, Math.max(0, (clipElapsed / clipDuration) * 100));

  const handleScrubberClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, clickX / rect.width));
    const targetTime = currentTiming.startTime + (ratio * clipDuration);
    onSeekClip(targetTime);
  };

  return (
    <div className="absolute inset-0 z-50 pointer-events-none flex flex-col justify-between select-none">
      {/* Top Floating Bar */}
      <motion.div 
        animate={{ opacity: isIdle && isPlaying ? 0 : 1, y: isIdle && isPlaying ? -20 : 0 }}
        transition={{ duration: 0.25 }}
        className="pointer-events-auto p-4 flex items-center justify-between gap-4 bg-gradient-to-b from-black/85 via-black/40 to-transparent"
      >
        {/* Left: Presentation Info */}
        <div className="flex items-center gap-3">
          {/* Status Badge */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#111]/80 backdrop-blur-md border border-white/10 text-white shadow-lg">
            <span className="w-2 h-2 rounded-full bg-[#c6ff1f] animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-gray-200">
              Presentation
            </span>
          </div>

          {/* Current Playlist & Clip Info */}
          {currentPlaylist && (
            <div className="flex items-center gap-2 text-xs backdrop-blur-md bg-black/60 border border-white/10 px-3 py-1 rounded-xl shadow-lg">
              <span className="text-gray-400 font-mono text-[11px]">
                {playlistIndex + 1}/{totalPlaylists}
              </span>
              <span className="text-white font-semibold truncate max-w-[200px] sm:max-w-[320px]">
                {currentPlaylist.name}
              </span>
              <span className="text-gray-500">·</span>
              <span className="text-[#c6ff1f] font-mono text-[11px]">
                Clip {currentClipIndex + 1} of {totalClipsInPlaylist}
              </span>
            </div>
          )}
        </div>

        {/* Right: Exactly ONE Button to Customize & ONE Button to Exit */}
        <div className="flex items-center gap-2.5">
          {/* Button to Customize */}
          <button
            type="button"
            onClick={onOpenCustomize}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-black/60 hover:bg-[#20232c] text-gray-200 hover:text-white border border-white/15 hover:border-white/30 backdrop-blur-md transition-all text-xs font-semibold shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
            title="Customize playlist order and selection"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#c6ff1f]" />
            <span>Customize</span>
          </button>

          {/* Button to Exit */}
          <button
            type="button"
            onClick={onExitPresentation}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-black/60 hover:bg-red-500/25 text-gray-200 hover:text-red-300 border border-white/15 hover:border-red-500/40 backdrop-blur-md transition-all text-xs font-semibold shadow-lg hover:scale-105 active:scale-95 cursor-pointer"
            title="Exit Presentation Mode (Esc)"
          >
            <X className="w-4 h-4" />
            <span>Exit</span>
          </button>
        </div>
      </motion.div>

      {/* Center Announcements (Transition Toasts & Completion Card) */}
      <div className="flex-1 flex items-center justify-center pointer-events-none p-6">
        <AnimatePresence>
          {transitionMessage && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -10 }}
              className="px-6 py-3 rounded-2xl bg-black/85 backdrop-blur-lg border border-[#c6ff1f]/40 shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-center pointer-events-auto"
            >
              <div className="text-[10px] uppercase font-bold tracking-widest text-[#c6ff1f] mb-0.5">
                Next Playlist
              </div>
              <div className="text-white text-base font-bold">
                {transitionMessage}
              </div>
            </motion.div>
          )}

          {isFinished && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="bg-[#14151a]/95 backdrop-blur-xl border border-[#2e3240] rounded-3xl p-8 max-w-md w-full shadow-[0_20px_70px_rgba(0,0,0,0.9)] text-center pointer-events-auto select-none"
            >
              <div className="w-16 h-16 rounded-2xl bg-[#c6ff1f]/10 border border-[#c6ff1f]/30 flex items-center justify-center text-[#c6ff1f] mx-auto mb-4">
                <Check className="w-8 h-8 stroke-[2.5]" />
              </div>
              <h2 className="text-white font-bold text-xl mb-1">Presentation Complete</h2>
              <p className="text-gray-400 text-xs mb-6">
                All selected playlists and clips have finished playing.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={onReplayPresentation}
                  className="px-5 py-2.5 rounded-xl bg-[#c6ff1f] hover:bg-[#b0e817] text-black font-bold text-xs flex items-center gap-2 shadow-lg shadow-[#c6ff1f]/20 transition-all cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Replay from Start</span>
                </button>
                <button
                  type="button"
                  onClick={onExitPresentation}
                  className="px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-xs border border-white/10 transition-colors cursor-pointer"
                >
                  Exit Presentation
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Floating Controller Bar */}
      <motion.div 
        animate={{ opacity: isIdle && isPlaying ? 0 : 1, y: isIdle && isPlaying ? 20 : 0 }}
        transition={{ duration: 0.25 }}
        className="pointer-events-auto px-4 pb-4 pt-10 bg-gradient-to-t from-black/95 via-black/60 to-transparent flex flex-col gap-3"
      >
        {/* Clip Progress Scrubber */}
        <div className="max-w-4xl w-full mx-auto flex flex-col gap-1.5">
          <div 
            onClick={handleScrubberClick}
            className="group relative h-3 bg-white/15 hover:bg-white/25 rounded-full cursor-pointer flex items-center transition-all px-0.5"
            title="Click to seek within current clip"
          >
            {/* Filled Progress Bar */}
            <div 
              className="h-1.5 group-hover:h-2 bg-[#c6ff1f] rounded-full transition-all relative"
              style={{ width: `${clipProgressPct}%` }}
            >
              <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3.5 h-3.5 bg-white rounded-full shadow-md scale-0 group-hover:scale-100 transition-transform" />
            </div>
          </div>

          {/* Time Displays */}
          <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 px-1">
            <div className="flex items-center gap-2">
              <span className="text-white font-bold">{formatTime(clipElapsed)}</span>
              <span>/</span>
              <span>{formatTime(clipDuration)}</span>
            </div>

            {/* Playlist Quick Jumper */}
            {allOrderedPlaylists.length > 1 && (
              <div className="hidden sm:flex items-center gap-1.5 overflow-x-auto no-scrollbar max-w-md">
                {allOrderedPlaylists.map((pl, idx) => {
                  const isActive = idx === playlistIndex;
                  return (
                    <button
                      key={pl.id}
                      type="button"
                      onClick={() => onSelectPlaylistIndex(idx)}
                      className={`px-2 py-0.5 rounded-full text-[10px] font-medium transition-all truncate max-w-[120px] ${
                        isActive
                          ? 'bg-[#c6ff1f] text-black font-bold shadow-sm'
                          : 'bg-white/10 hover:bg-white/20 text-gray-300'
                      }`}
                    >
                      {idx + 1}. {pl.name}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Central Controls Dock */}
        <div className="max-w-xl w-full mx-auto flex items-center justify-between gap-4 bg-black/70 backdrop-blur-xl border border-white/15 px-5 py-2.5 rounded-2xl shadow-2xl">
          {/* Left: Volume & Speed */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={toggleMute}
              className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-white/10 transition-colors"
              title={isMuted ? "Unmute" : "Mute"}
            >
              {isMuted ? <VolumeX className="w-4 h-4 text-red-400" /> : <Volume2 className="w-4 h-4" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.05"
              value={isMuted ? 0 : volume}
              onChange={(e) => {
                const val = parseFloat(e.target.value);
                setVolume(val);
              }}
              className="w-16 h-1 bg-white/20 rounded-full appearance-none cursor-pointer accent-[#c6ff1f]"
            />
          </div>

          {/* Center: Prev / Play / Next */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onPrevClip}
              className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Previous Clip (Left Arrow)"
            >
              <SkipBack className="w-4 h-4" />
            </button>

            <button
              type="button"
              onClick={onTogglePlay}
              className="w-11 h-11 rounded-full bg-[#c6ff1f] hover:bg-[#b0e817] text-black flex items-center justify-center transition-all shadow-[0_0_20px_rgba(198,255,31,0.4)] hover:scale-105 active:scale-95"
              title={isPlaying ? "Pause (Space)" : "Play (Space)"}
            >
              {isPlaying ? (
                <Pause className="w-5 h-5 fill-current" />
              ) : (
                <Play className="w-5 h-5 fill-current ml-0.5" />
              )}
            </button>

            <button
              type="button"
              onClick={onNextClip}
              className="p-2 rounded-xl text-gray-300 hover:text-white hover:bg-white/10 transition-all active:scale-95"
              title="Next Clip (Right Arrow)"
            >
              <SkipForward className="w-4 h-4" />
            </button>
          </div>

          {/* Right: Loop & Speed Options */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onToggleLoop}
              className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-[11px] font-bold ${
                loop ? 'bg-[#c6ff1f] text-black' : 'text-gray-400 hover:text-white hover:bg-white/10'
              }`}
              title={loop ? "Looping enabled" : "Enable looping"}
            >
              <Repeat className="w-3.5 h-3.5" />
            </button>

            <select
              value={playbackRate}
              onChange={(e) => setPlaybackRate(parseFloat(e.target.value))}
              className="bg-white/10 text-gray-200 text-xs font-mono rounded-lg px-2 py-1 border border-white/10 outline-none cursor-pointer hover:bg-white/15 transition-colors"
            >
              <option value={0.5} className="bg-[#14151a]">0.5x</option>
              <option value={0.75} className="bg-[#14151a]">0.75x</option>
              <option value={1.0} className="bg-[#14151a]">1.0x</option>
              <option value={1.25} className="bg-[#14151a]">1.25x</option>
              <option value={1.5} className="bg-[#14151a]">1.5x</option>
            </select>
          </div>
        </div>
      </motion.div>
    </div>
  );
};
