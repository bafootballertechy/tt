import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
    SkipBack, SkipForward, RotateCcw, RotateCw, Play, Pause, 
    ZoomOut, ZoomIn, Filter, ChevronUp, Snowflake, Tag, 
    ChevronsDown, ChevronsUp, VolumeX, Volume2
} from 'lucide-react';
import { formatTime } from '../../utils/math';

interface WorkspaceBottomBarProps {
    jumpPrevEvent: () => void;
    jumpNextEvent: () => void;
    handleManualSeek: (time: number) => void;
    togglePlay: () => void;
    isPlaying: boolean;
    currentTime: number;
    duration: number;
    timelineZoom: number;
    handleZoomIn: () => void;
    handleZoomOut: () => void;
    playbackRate: number;
    setPlaybackRate: (rate: number) => void;
    showTimelineFiltersMenu: boolean;
    setShowTimelineFiltersMenu: (show: boolean) => void;
    showTimelineFreezeFrames: boolean;
    setShowTimelineFreezeFrames: (show: boolean) => void;
    showTimelineTags: boolean;
    setShowTimelineTags: (show: boolean) => void;
    isTimelineExpanded: boolean;
    setIsTimelineExpanded: (exp: boolean) => void;
    isMuted: boolean;
    toggleMute: () => void;
    volume: number;
    setVolume: (v: number) => void;
    videoRef: React.RefObject<HTMLVideoElement>;
    setIsMuted: (muted: boolean) => void;
    isLive?: boolean;
}

export const WorkspaceBottomBar: React.FC<WorkspaceBottomBarProps> = ({
    jumpPrevEvent, jumpNextEvent, handleManualSeek, togglePlay, isPlaying,
    currentTime, duration, timelineZoom, handleZoomIn, handleZoomOut,
    playbackRate, setPlaybackRate, showTimelineFiltersMenu, setShowTimelineFiltersMenu,
    showTimelineFreezeFrames, setShowTimelineFreezeFrames, showTimelineTags, setShowTimelineTags,
    isTimelineExpanded, setIsTimelineExpanded, isMuted, toggleMute, volume, setVolume,
    videoRef, setIsMuted, isLive
}) => {
    return (
        <div className="min-h-[48px] flex flex-wrap items-center gap-2 py-2 px-2 bg-[#111] shrink-0 border-t border-[#222] overflow-visible w-full relative z-[60]">
            {/* Playback Controls */}
            {!isLive && (
            <div className="flex items-center gap-2 sm:gap-4 shrink-0">
                <button onClick={jumpPrevEvent} className="p-1.5 hover:bg-[#222] rounded-full text-white"><SkipBack className="w-4 h-4" /></button>
                <button onClick={() => { if(videoRef.current) handleManualSeek(videoRef.current.currentTime - 5); }} className="p-1.5 hover:bg-[#222] rounded-full text-white"><RotateCcw className="w-4 h-4" /></button>
                <button onClick={togglePlay} className="p-2 bg-white text-black rounded-full hover:bg-gray-200 transition-colors mx-1">
                    {isPlaying ? <Pause className="w-4 h-4 fill-current" /> : <Play className="w-4 h-4 fill-current ml-0.5" />}
                </button>
                <button onClick={() => { if(videoRef.current) handleManualSeek(videoRef.current.currentTime + 5); }} className="p-1.5 hover:bg-[#222] rounded-full text-white"><RotateCw className="w-4 h-4" /></button>
                <button onClick={jumpNextEvent} className="p-1.5 hover:bg-[#222] rounded-full text-white"><SkipForward className="w-4 h-4" /></button>
            </div>
            )}
            
            {!isLive && (
                <>
                    <div className="flex flex-col items-center text-[10px] text-gray-400 font-mono w-16 sm:w-20 shrink-0">
                        <span className="text-white font-bold">{formatTime(currentTime)}</span>
                        <span>/ {formatTime(duration)}</span>
                    </div>
                    <div className="w-[1px] h-6 bg-[#333] hidden sm:block" />
                </>
            )}

            {/* Zoom & Speed */}
            <div className="flex flex-wrap items-center gap-2 sm:gap-4 shrink-0">
                <div className="flex items-center gap-1 shrink-0">
                    <button onClick={handleZoomOut} disabled={timelineZoom <= 1} className="p-1.5 hover:bg-[#222] rounded-full text-gray-300 disabled:opacity-50"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xs font-mono w-8 sm:w-10 text-center text-gray-500">{timelineZoom}x</span>
                    <button onClick={handleZoomIn} disabled={timelineZoom >= 100} className="p-1.5 hover:bg-[#222] rounded-full text-gray-300 disabled:opacity-50"><ZoomIn className="w-4 h-4" /></button>
                </div>
                
                {!isLive && (
                    <div className="flex items-center gap-2 bg-[#1a1a1a] rounded-full px-2 py-1 border border-[#333] shrink-0">
                        <span className="text-[10px] text-gray-400 hidden lg:inline">Speed</span>
                        <input 
                            type="range" min="0.1" max="4.0" step="0.1" value={playbackRate} 
                            onChange={(e) => setPlaybackRate(parseFloat(e.target.value))} 
                            className="w-12 sm:w-16 h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c6ff1f]"
                        />
                        <span className="text-[10px] font-mono w-6">{playbackRate.toFixed(1)}x</span>
                    </div>
                )}
            </div>

            <div className="flex-1 min-w-[20px]" />

            {/* Timeline Filters */}
            <div className="relative mr-1 sm:mr-2 shrink-0">
                <button 
                    onClick={() => setShowTimelineFiltersMenu(!showTimelineFiltersMenu)}
                    className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-bold ${showTimelineFiltersMenu ? 'bg-[#333] text-white' : 'hover:bg-[#222] text-gray-400'}`}
                    title="Timeline Filters"
                >
                    <Filter className="w-4 h-4" />
                    <ChevronUp className="w-3 h-3 hidden sm:block" />
                </button>
                
                <AnimatePresence>
                    {showTimelineFiltersMenu && (
                        <motion.div 
                            initial={{ opacity: 0, y: 10, scale: 0.95 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: 10, scale: 0.95 }}
                            transition={{ duration: 0.15 }}
                            className="absolute bottom-full right-0 mb-2 w-52 bg-[#141416] border border-[#333] rounded-xl shadow-2xl overflow-hidden z-50 p-2"
                        >
                            <div className="text-[10px] uppercase font-bold text-gray-500 mb-2 px-2 pt-1">Show in Timeline</div>
                            <div className="space-y-1">
                                {!isLive && (
                                    <label className="flex items-center justify-between p-2 hover:bg-[#222] rounded-lg cursor-pointer transition-colors group">
                                        <span className="text-xs text-gray-300 font-medium flex items-center gap-2">
                                            <Snowflake className="w-3.5 h-3.5 text-[#c6ff1f]" />
                                            Freeze Frames
                                        </span>
                                        <div className={`w-7 h-4 rounded-full transition-colors relative ${showTimelineFreezeFrames ? 'bg-[#c6ff1f]' : 'bg-[#333]'}`}>
                                            <div className={`absolute top-0.5 bottom-0.5 w-3 bg-white rounded-full transition-all shadow-sm ${showTimelineFreezeFrames ? 'right-0.5' : 'left-0.5'}`} />
                                        </div>
                                        <input type="checkbox" className="hidden" checked={showTimelineFreezeFrames} onChange={() => setShowTimelineFreezeFrames(!showTimelineFreezeFrames)} />
                                    </label>
                                )}
                                <label className="flex items-center justify-between p-2 hover:bg-[#222] rounded-lg cursor-pointer transition-colors group">
                                    <span className="text-xs text-gray-300 font-medium flex items-center gap-2">
                                        <Tag className="w-3.5 h-3.5 text-emerald-400" />
                                        Tagged Events
                                    </span>
                                    <div className={`w-7 h-4 rounded-full transition-colors relative ${showTimelineTags ? 'bg-emerald-600' : 'bg-[#333]'}`}>
                                        <div className={`absolute top-0.5 bottom-0.5 w-3 bg-white rounded-full transition-all shadow-sm ${showTimelineTags ? 'right-0.5' : 'left-0.5'}`} />
                                    </div>
                                    <input type="checkbox" className="hidden" checked={showTimelineTags} onChange={() => setShowTimelineTags(!showTimelineTags)} />
                                </label>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Expand Timeline Button */}
            {!isLive && (
                <>
                    <button 
                        onClick={() => setIsTimelineExpanded(!isTimelineExpanded)} 
                        className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 sm:gap-2 text-xs font-bold mr-1 sm:mr-4 shrink-0 ${isTimelineExpanded ? 'bg-[#c6ff1f] text-black' : 'hover:bg-[#222] text-gray-400'}`}
                        title={isTimelineExpanded ? "Collapse Timeline" : "Expand Timeline"}
                    >
                        {isTimelineExpanded ? <ChevronsDown className="w-4 h-4" /> : <ChevronsUp className="w-4 h-4" />}
                        <span className="hidden xl:inline">Timeline</span>
                    </button>
                    <div className="w-[1px] h-6 bg-[#333] mr-1 sm:mr-4 hidden lg:block" />
                </>
            )}

            {/* Volume */}
            {!isLive && (
                <div className="flex items-center gap-2 group relative w-20 sm:w-24 shrink-0">
                    <button onClick={toggleMute} className="p-1.5 hover:bg-[#222] rounded-full text-gray-300">
                        {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                    </button>
                    <div className="flex-1">
                        <input
                            type="range" min="0" max="1" step="0.05" value={isMuted ? 0 : volume}
                            onChange={(e) => { setVolume(parseFloat(e.target.value)); if (isMuted && parseFloat(e.target.value) > 0) setIsMuted(false); }}
                            className="w-full h-1 bg-[#333] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-gray-400 group-hover:[&::-webkit-slider-thumb]:bg-[#c6ff1f]"
                        />
                    </div>
                </div>
            )}
        </div>
    );
};
