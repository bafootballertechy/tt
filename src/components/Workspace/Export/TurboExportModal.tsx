import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Video, Zap, Check, X, Film, Sparkles, AlertCircle, Cpu, Clock, Layers } from 'lucide-react';
import { EXPORT_PRESETS, getSupportedRecorderMimeType } from '../../../utils/videoExport';

interface TurboExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  playlistName: string;
  clipCount: number;
  totalDurationSeconds: number;
  onStartExport: (config: {
    presetKey: string;
    withFreezeFrames: boolean;
  }) => void;
}

export const TurboExportModal: React.FC<TurboExportModalProps> = ({
  isOpen,
  onClose,
  playlistName,
  clipCount,
  totalDurationSeconds,
  onStartExport
}) => {
  const [selectedPreset, setSelectedPreset] = useState<string>('1080p30');
  const [withFreezeFrames, setWithFreezeFrames] = useState<boolean>(true);

  if (!isOpen) return null;

  const recorderInfo = getSupportedRecorderMimeType();
  const formatText = 'MP4 (H.264)';

  const formatMinSec = (sec: number) => {
    const m = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 15 }}
        className="bg-[#121316] border border-[#2b2d35] rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden relative"
      >
        {/* Top Header Banner */}
        <div className="relative px-6 pt-6 pb-4 border-b border-[#252730] bg-gradient-to-b from-[#1a1c23] to-[#121316]">
          <button
            onClick={onClose}
            className="absolute top-5 right-5 text-gray-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-2.5 mb-1.5">
            <div className="p-2 rounded-xl bg-[#c6ff1f]/15 text-[#c6ff1f] border border-[#c6ff1f]/30">
              <Zap className="w-5 h-5 fill-current" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white tracking-wide">
                Export Playlist Video
              </h3>
              <p className="text-xs text-gray-400">
                High Quality MP4 Video Export
              </p>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-5 select-none">
          {/* Playlist Info Summary */}
          <div className="flex items-center justify-between p-3.5 bg-[#181a20] rounded-xl border border-[#262833] text-xs">
            <div className="flex items-center gap-2 text-gray-300 font-medium">
              <Film className="w-4 h-4 text-[#c6ff1f]" />
              <span className="truncate max-w-[200px]" title={playlistName}>
                {playlistName}
              </span>
            </div>
            <div className="flex items-center gap-3 text-gray-400">
              <span className="bg-[#242630] px-2 py-0.5 rounded text-[11px] text-gray-200">
                {clipCount} {clipCount === 1 ? 'Clip' : 'Clips'}
              </span>
              <div className="flex items-center gap-1 font-mono text-[11px] text-gray-300">
                <Clock className="w-3.5 h-3.5 text-gray-400" />
                ~{formatMinSec(totalDurationSeconds)}
              </div>
            </div>
          </div>

          {/* Quality Presets */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-gray-300 flex items-center justify-between">
              <span>Export Quality & Frame Rate</span>
              <span className="text-[10px] text-[#c6ff1f] font-mono">Guaranteed 60 / 30 FPS</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {Object.entries(EXPORT_PRESETS).map(([key, config]) => {
                const isSelected = selectedPreset === key;
                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => setSelectedPreset(key)}
                    className={`flex flex-col text-left p-3 rounded-xl border transition-all text-xs ${
                      isSelected
                        ? 'bg-[#c6ff1f]/10 border-[#c6ff1f] text-white shadow-[0_0_15px_rgba(198,255,31,0.15)]'
                        : 'bg-[#181a22] border-[#292c38] text-gray-300 hover:border-gray-600 hover:bg-[#1f222c]'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full mb-1">
                      <span className="font-bold text-sm">
                        {config.height}p @ {config.fps} FPS
                      </span>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-[#c6ff1f] text-black flex items-center justify-center">
                          <Check className="w-3 h-3 stroke-[3]" />
                        </div>
                      )}
                    </div>
                    <span className="text-[10px] text-gray-400 line-clamp-1">
                      {key === '1080p60' ? 'Recommended for broadcast telestrations' :
                       key === '1080p30' ? 'Maximum stability on low CPU' :
                       key === '720p60' ? 'Fast rendering & smooth motion' : 'Lightweight fast file'}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Freeze Frames Option */}
          <div
            onClick={() => setWithFreezeFrames(!withFreezeFrames)}
            className="flex items-center justify-between p-3.5 bg-[#181a20] rounded-xl border border-[#262833] cursor-pointer hover:border-gray-600 transition-colors"
          >
            <div className="flex items-center gap-2.5">
              <Layers className="w-4 h-4 text-[#c6ff1f]" />
              <div>
                <div className="text-xs font-semibold text-gray-200">
                  Include Freeze Frames & Annotations
                </div>
                <div className="text-[10px] text-gray-400">
                  Renders paused spotlight, telestration rings, and player tags
                </div>
              </div>
            </div>
            <div
              className={`w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${
                withFreezeFrames ? 'bg-[#c6ff1f]' : 'bg-[#333]'
              }`}
            >
              <div
                className={`w-4 h-4 rounded-full bg-black shadow-md transition-transform ${
                  withFreezeFrames ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </div>
          </div>

          {/* Output Format Notice (Addressing Firefox and MP4) */}
          <div className="p-3 bg-[#13151b] rounded-xl border border-[#242732] space-y-1.5 text-[11px]">
            <div className="flex items-center justify-between text-gray-300">
              <span className="text-gray-400 font-medium">Container & Codec:</span>
              <span className="font-mono text-[#c6ff1f] font-semibold flex items-center gap-1">
                <Check className="w-3 h-3" /> {formatText}
              </span>
            </div>
            <div className="flex items-start gap-1.5 text-gray-400 text-[10px] leading-relaxed">
              <Sparkles className="w-3.5 h-3.5 text-[#c6ff1f] shrink-0 mt-0.5" />
              <span>
                Export always outputs a clean <b className="text-gray-200">.mp4</b> file compatible with Windows, Mac, iOS, Android, QuickTime, and Premiere Pro.
              </span>
            </div>
          </div>

          {/* Turbo Optimization Notice */}
          <div className="p-3 bg-[#c6ff1f]/5 rounded-xl border border-[#c6ff1f]/20 flex items-start gap-2.5 text-[11px] text-gray-300">
            <Cpu className="w-4 h-4 text-[#c6ff1f] shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <div className="font-semibold text-white">Turbo Performance Engine</div>
              <div className="text-[10px] text-gray-400 leading-relaxed">
                Background UI diffing and heavy listeners are suspended during export so 100% of CPU and RAM is allocated to video decoding and smooth 60 FPS recording.
              </div>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 border-t border-[#252730] bg-[#15171d] flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-medium text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onStartExport({
                presetKey: selectedPreset,
                withFreezeFrames
              });
              onClose();
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-[#c6ff1f] text-black hover:bg-[#d5ff4d] shadow-[0_0_20px_rgba(198,255,31,0.25)] transition-all"
          >
            <Zap className="w-4 h-4 fill-black" />
            Start Turbo Export
          </button>
        </div>
      </motion.div>
    </div>
  );
};
