import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Film, X, Download, AlertTriangle, CheckCircle,
  Sliders, Volume2, VolumeX, Snowflake,
  RefreshCw, StopCircle, Edit3, FileVideo
} from 'lucide-react';
import type { MaskSettings } from '../../../types';
import type {
  ExportOptions,
  ExportResolutionPreset,
  ExportModePreset,
  ExportJobPayload,
  ExportClipItem
} from './exportTypes';
import { useVideoRecorder } from './useVideoRecorder';
import { formatBytes, formatExportTime } from './videoExportUtils';

export interface ExportVideoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  clips: ExportClipItem[];
  defaultWithFreezeFrames?: boolean;
  defaultMaskSettings?: MaskSettings;
  onRecordExport?: (options?: { withFreezeFrames: boolean; fileName?: string }) => void;
  onFallbackToScreenRecord?: () => void;
}

export const ExportVideoModal: React.FC<ExportVideoModalProps> = ({
  isOpen,
  onClose,
  title,
  clips,
  defaultWithFreezeFrames = true,
  defaultMaskSettings,
  onRecordExport,
  onFallbackToScreenRecord
}) => {
  const {
    startExport,
    cancelExport,
    isExporting,
    progress,
    error,
    capabilities,
    completedResult,
    downloadUrl,
    resetState
  } = useVideoRecorder();

  const [fileName, setFileName] = useState<string>(() => {
    const sanitized = (title || 'playlist-export').replace(/[^\w\s-]/gi, '').trim();
    return sanitized || 'playlist-export';
  });
  const [resolution, setResolution] = useState<ExportResolutionPreset>('original');
  const [mode, setMode] = useState<ExportModePreset>('auto');
  const [withFreezeFrames, setWithFreezeFrames] = useState<boolean>(defaultWithFreezeFrames);
  const [preserveAudio, setPreserveAudio] = useState<boolean>(false);
  const [freezeFrameAudioPolicy, setFreezeFrameAudioPolicy] = useState<'mute' | 'continuous'>('mute');
  const [chromaKeyEnabled, setChromaKeyEnabled] = useState<boolean>(
    defaultMaskSettings?.enabled !== false
  );

  // Synchronize initial title and freeze frame settings
  useEffect(() => {
    if (isOpen) {
      const sanitized = (title || 'playlist-export').replace(/[^\w\s-]/gi, '').trim();
      setFileName(sanitized || 'playlist-export');
    }
  }, [isOpen, title]);

  useEffect(() => {
    setWithFreezeFrames(defaultWithFreezeFrames);
  }, [defaultWithFreezeFrames]);

  useEffect(() => {
    if (defaultMaskSettings?.enabled !== undefined) {
      setChromaKeyEnabled(defaultMaskSettings.enabled);
    }
  }, [defaultMaskSettings]);

  // Reset modal state when closed
  const handleClose = () => {
    if (isExporting) {
      if (confirm('An export is currently running. Do you want to cancel it?')) {
        cancelExport();
        resetState();
        onClose();
      }
    } else {
      resetState();
      onClose();
    }
  };

  const handleStartExport = async () => {
    const cleanBase = (fileName.trim() || title || 'playlist-export')
      .replace(/[/\\?%*:|"<>]/g, '-')
      .replace(/\.mp4$/i, '')
      .trim();
    const finalFileName = `${cleanBase || 'export'}.mp4`;

    const options: ExportOptions = {
      resolution,
      mode,
      withFreezeFrames,
      preserveAudio,
      freezeFrameAudioPolicy,
      maskSettings: defaultMaskSettings
        ? { ...defaultMaskSettings, enabled: chromaKeyEnabled }
        : { enabled: chromaKeyEnabled, sensitivity: 65, showOverlay: false, keyColor: '#4b8b3b' },
      customFileName: finalFileName
    };

    const job: ExportJobPayload = {
      jobId: `job-${Date.now()}`,
      title: cleanBase || title,
      clips,
      options
    };

    await startExport(job);
  };

  const totalCalculatedDuration = clips.reduce((acc, clip) => {
    let dur = Math.max(0, clip.outPoint - clip.inPoint);
    if (withFreezeFrames && clip.freezeFrames) {
      clip.freezeFrames.forEach(ff => {
        dur += ff.duration || 0;
      });
    }
    return acc + dur;
  }, 0);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-3 sm:p-4 overflow-y-auto">
        <motion.div
          initial={{ scale: 0.96, opacity: 0, y: 8 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          exit={{ scale: 0.96, opacity: 0, y: 8 }}
          transition={{ duration: 0.15 }}
          className="bg-[#141416] border border-[#2b2b30] rounded-xl w-full max-w-[440px] shadow-2xl overflow-hidden flex flex-col my-auto max-h-[90vh]"
        >
          {/* Header */}
          <div className="p-3.5 sm:p-4 border-b border-[#26262a] flex items-center justify-between bg-[#19191d]">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#c6ff1f]/10 border border-[#c6ff1f]/30 flex items-center justify-center text-[#c6ff1f]">
                <Film className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm tracking-tight leading-tight">Export Video</h3>
                <p className="text-[11px] text-gray-400">Save playlist as MP4</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#26262a] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Warning only if unsupported */}
          {!capabilities.supportsWebCodecs && (
            <div className="px-3.5 pt-3">
              <div className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span>Direct export is limited on this browser. Record Export fallback available.</span>
              </div>
            </div>
          )}

          {/* Main Content */}
          <div className="p-3.5 sm:p-4 space-y-3 overflow-y-auto custom-scrollbar">
            {/* Error Message */}
            {error && (
              <div className="p-2.5 bg-red-500/15 border border-red-500/40 rounded-lg text-red-400 text-xs flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold">Export Failed</div>
                  <div className="text-[11px] text-red-300/90">{error}</div>
                </div>
              </div>
            )}

                {/* Completed Screen */}
            {completedResult && (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center space-y-3">
                <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Export Ready!</h4>
                  <p className="text-xs text-gray-300 mt-1 font-mono">
                    {completedResult.fileName}
                  </p>
                  <p className="text-[11px] text-gray-400 mt-0.5">
                    {formatExportTime(completedResult.durationSeconds)} • {formatBytes(completedResult.fileSizeBytes)}
                  </p>
                  {completedResult.usedFastPath && (
                    <div className="inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full bg-[#c6ff1f]/10 border border-[#c6ff1f]/30 text-[#c6ff1f] text-[10px] font-semibold">
                      ⚡ Lossless Stream Copy (Zero Re-encoding)
                    </div>
                  )}
                  {completedResult.metrics && (
                    <div className="mt-2 text-[10px] font-mono text-gray-400 bg-[#121215] border border-white/5 rounded-lg p-2 text-left space-y-1">
                      <div className="flex justify-between text-gray-300 font-semibold border-b border-white/5 pb-1">
                        <span>Total Processing Time:</span>
                        <span className="text-[#c6ff1f]">{(completedResult.metrics.totalMs / 1000).toFixed(2)}s ({completedResult.metrics.actualExportFps} FPS)</span>
                      </div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-0.5 text-[9px] pt-0.5 text-gray-400">
                        <div>Mux/Finalize: {completedResult.metrics.muxMs + completedResult.metrics.finalizeMs}ms</div>
                        <div>Video Encode: {completedResult.metrics.videoEncodeMs}ms</div>
                        <div>Video Decode: {completedResult.metrics.decodeMs}ms</div>
                        <div>Canvas Render: {completedResult.metrics.renderMs}ms</div>
                      </div>
                      {completedResult.metrics.bottleneck && (
                        <div className="text-[9px] text-gray-400 pt-0.5 border-t border-white/5 truncate">
                          Stage: {completedResult.metrics.bottleneck}
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-center pt-1">
                  {downloadUrl && (
                    <a
                      href={downloadUrl}
                      download={completedResult.fileName}
                      className="flex items-center gap-1.5 px-3.5 py-1.5 bg-[#c6ff1f] text-black font-bold text-xs rounded-lg hover:bg-[#d8ff4d] transition-all shadow-md"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Again
                    </a>
                  )}
                  <button
                    onClick={handleClose}
                    className="px-3.5 py-1.5 bg-[#26262a] text-white text-xs font-semibold rounded-lg hover:bg-[#333] transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}

            {/* Export Progress View */}
            {isExporting && progress && (
              <div className="p-3.5 bg-[#19191d] border border-[#2b2b30] rounded-xl space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-white flex items-center gap-2">
                    <RefreshCw className="w-3.5 h-3.5 text-[#c6ff1f] animate-spin" />
                    {progress.status}
                  </span>
                  <span className="font-mono text-[#c6ff1f] font-bold text-sm">{progress.percent}%</span>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-[#26262a] h-2 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-[#a0e000] to-[#c6ff1f]"
                    animate={{ width: `${progress.percent}%` }}
                    transition={{ ease: 'linear', duration: 0.2 }}
                  />
                </div>

                {/* Compact Stats */}
                <div className="grid grid-cols-3 gap-2 pt-1 text-[10px] font-mono text-gray-400 text-center">
                  <div>
                    <span className="text-[9px] text-gray-500 uppercase block font-sans">Clip</span>
                    <span className="text-gray-200">{progress.currentClipIndex} / {progress.totalClips}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 uppercase block font-sans">Time</span>
                    <span className="text-gray-200">{formatExportTime(progress.processedSeconds)} / {formatExportTime(progress.totalDurationSeconds)}</span>
                  </div>
                  <div>
                    <span className="text-[9px] text-gray-500 uppercase block font-sans">Speed</span>
                    <span className="text-[#c6ff1f]">{progress.fps > 0 ? `${progress.fps} FPS` : '--'}</span>
                  </div>
                </div>

                {/* Cancel Button */}
                <div className="pt-1 text-right">
                  <button
                    onClick={cancelExport}
                    className="px-2.5 py-1 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded-md text-[11px] font-semibold flex items-center gap-1.5 ml-auto transition-colors"
                  >
                    <StopCircle className="w-3 h-3" /> Cancel Export
                  </button>
                </div>
              </div>
            )}

            {/* Configuration Controls (Shown when not exporting and not completed) */}
            {!isExporting && !completedResult && (
              <>
                {/* File Name Field */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                    <Edit3 className="w-3 h-3 text-[#c6ff1f]" /> File Name
                  </label>
                  <div className="flex items-center bg-[#19191d] border border-[#2b2b30] focus-within:border-[#c6ff1f]/70 rounded-lg px-2.5 py-1.5 transition-colors">
                    <FileVideo className="w-3.5 h-3.5 text-gray-500 mr-2 shrink-0" />
                    <input
                      type="text"
                      value={fileName}
                      onChange={e => setFileName(e.target.value)}
                      placeholder="Export file name"
                      className="bg-transparent text-xs text-white placeholder-gray-500 outline-none w-full min-w-0 font-medium"
                    />
                    <span className="text-[10px] font-mono text-gray-400 bg-[#24252a] px-1.5 py-0.5 rounded ml-1.5 shrink-0 border border-white/5">
                      .mp4
                    </span>
                  </div>
                </div>

                {/* Details Summary Strip */}
                <div className="grid grid-cols-3 gap-2 p-2 bg-[#18181c] border border-[#26262b] rounded-lg text-center text-xs">
                  <div>
                    <div className="text-gray-400 text-[9px] uppercase font-semibold">Clips</div>
                    <div className="text-white font-bold text-xs mt-0.5">{clips.length}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[9px] uppercase font-semibold">Duration</div>
                    <div className="text-white font-bold text-xs mt-0.5">{formatExportTime(totalCalculatedDuration)}</div>
                  </div>
                  <div>
                    <div className="text-gray-400 text-[9px] uppercase font-semibold">Format</div>
                    <div className="text-[#c6ff1f] font-bold text-xs mt-0.5">MP4</div>
                  </div>
                </div>

                {/* Export Mode */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                    <Sliders className="w-3 h-3 text-[#c6ff1f]" /> Export Mode
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'auto', label: 'Auto (Fast)', sub: 'Smart remux' },
                      { id: 'fastest', label: 'Fastest', sub: 'Max speed' },
                      { id: 'quality', label: 'Quality', sub: 'Full render' }
                    ].map(m => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => setMode(m.id as ExportModePreset)}
                        className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                          mode === m.id
                            ? 'bg-[#c6ff1f]/10 border-[#c6ff1f] text-white shadow-sm'
                            : 'bg-[#19191d] border-[#2b2b30] text-gray-400 hover:border-gray-500 hover:text-gray-300'
                        }`}
                      >
                        <div className="text-xs font-bold leading-tight">{m.label}</div>
                        <div className="text-[9px] text-gray-500 mt-0.5">{m.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Resolution Presets */}
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-300 flex items-center gap-1.5">
                    <Sliders className="w-3 h-3 text-[#c6ff1f]" /> Resolution
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { id: 'original', label: 'Original', sub: 'Source res' },
                      { id: '1080p', label: '1080p', sub: '1920 × 1080' },
                      { id: '720p', label: '720p', sub: '1280 × 720' }
                    ].map(res => (
                      <button
                        key={res.id}
                        type="button"
                        onClick={() => setResolution(res.id as ExportResolutionPreset)}
                        className={`py-1.5 px-2 rounded-lg border text-center transition-all ${
                          resolution === res.id
                            ? 'bg-[#c6ff1f]/10 border-[#c6ff1f] text-white shadow-sm'
                            : 'bg-[#19191d] border-[#2b2b30] text-gray-400 hover:border-gray-500 hover:text-gray-300'
                        }`}
                      >
                        <div className="text-xs font-bold leading-tight">{res.label}</div>
                        <div className="text-[9px] text-gray-500 mt-0.5">{res.sub}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Toggles: Freeze Frames & Audio */}
                <div className="space-y-1.5 pt-0.5">
                  {/* Freeze Frame Toggle */}
                  <label className="flex items-center justify-between p-2.5 bg-[#19191d] border border-[#2b2b30] rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-6 h-6 rounded bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                        <Snowflake className="w-3.5 h-3.5" />
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">Include Freeze Frames & Drawings</div>
                        <div className="text-[10px] text-gray-400 truncate">Renders animated drawings & pauses</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={withFreezeFrames}
                      onChange={e => setWithFreezeFrames(e.target.checked)}
                      className="w-4 h-4 accent-[#c6ff1f] cursor-pointer shrink-0"
                    />
                  </label>

                  {/* Audio Toggle (Unticked by default) */}
                  <label className="flex items-center justify-between p-2.5 bg-[#19191d] border border-[#2b2b30] rounded-lg cursor-pointer hover:border-gray-600 transition-colors">
                    <div className="flex items-center gap-2 min-w-0 pr-2">
                      <div className="w-6 h-6 rounded bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                        {preserveAudio ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                      </div>
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-white truncate">Preserve Audio Track</div>
                        <div className="text-[10px] text-gray-400 truncate">Include audio matching video cuts</div>
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={preserveAudio}
                      onChange={e => setPreserveAudio(e.target.checked)}
                      className="w-4 h-4 accent-[#c6ff1f] cursor-pointer shrink-0"
                    />
                  </label>

                  {/* Audio policy during freeze frames */}
                  {preserveAudio && withFreezeFrames && (
                    <div className="p-2.5 bg-[#19191d] border border-[#2b2b30] rounded-lg space-y-1.5">
                      <div className="text-[10px] font-semibold text-gray-400">Freeze Frame Audio Behavior</div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => setFreezeFrameAudioPolicy('mute')}
                          className={`py-1.5 px-2 rounded-md border text-center transition-all ${
                            freezeFrameAudioPolicy === 'mute'
                              ? 'bg-[#c6ff1f]/10 border-[#c6ff1f] text-white font-bold'
                              : 'bg-[#141416] border-[#2b2b30] text-gray-400 hover:text-gray-300'
                          }`}
                        >
                          <div className="text-[10px]">Mute During Freeze</div>
                        </button>
                        <button
                          type="button"
                          onClick={() => setFreezeFrameAudioPolicy('continuous')}
                          className={`py-1.5 px-2 rounded-md border text-center transition-all ${
                            freezeFrameAudioPolicy === 'continuous'
                              ? 'bg-[#c6ff1f]/10 border-[#c6ff1f] text-white font-bold'
                              : 'bg-[#141416] border-[#2b2b30] text-gray-400 hover:text-gray-300'
                          }`}
                        >
                          <div className="text-[10px]">Continuous Audio</div>
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>

          {/* Footer Actions */}
          {!completedResult && (
            <div className="p-3 sm:p-3.5 border-t border-[#26262a] bg-[#19191d] flex items-center justify-between gap-2">
              {(onRecordExport || onFallbackToScreenRecord) ? (
                <button
                  type="button"
                  onClick={() => {
                    handleClose();
                    if (onRecordExport) {
                      onRecordExport({ withFreezeFrames, fileName });
                    } else if (onFallbackToScreenRecord) {
                      onFallbackToScreenRecord();
                    }
                  }}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 text-xs font-semibold transition-all hover:scale-102 active:scale-98 group cursor-pointer shadow-xs"
                  title="Record and export playlist playback in real time from start to end with automatic stop on correct timings"
                >
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                  </span>
                  <span>Record Export</span>
                </button>
              ) : <div />}

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isExporting}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-gray-300 hover:bg-[#26262a] transition-colors disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleStartExport}
                  disabled={isExporting || clips.length === 0}
                  className="btn-glow flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isExporting ? (
                    <>
                      <RefreshCw className="w-3 h-3 animate-spin" /> Rendering...
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" /> Start Export
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
