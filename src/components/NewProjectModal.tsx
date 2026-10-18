import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Film, UploadCloud, X, ArrowRight, Check, 
  Clock, Monitor, FileVideo, AlertCircle, RefreshCw, Radio, Loader2
} from 'lucide-react';
import { formatTime } from '../utils/math';

interface NewProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateProject: (file: File, metadata: { name: string; description: string }, fileHandle?: any) => void;
  onStartLiveProject: () => void;
  initialFile?: File | null;
}

export const NewProjectModal: React.FC<NewProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateProject,
  onStartLiveProject,
  initialFile = null
}) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileHandle, setFileHandle] = useState<any>(null);
  const [videoPreviewUrl, setVideoPreviewUrl] = useState<string | null>(null);
  const [videoMetadata, setVideoMetadata] = useState<{
    duration: number;
    width: number;
    height: number;
    sizeFormatted: string;
  } | null>(null);

  const [projectName, setProjectName] = useState('');
  const [hasManuallyEditedName, setHasManuallyEditedName] = useState(false);
  const [projectDescription, setProjectDescription] = useState('');
  const [isExtractingMetadata, setIsExtractingMetadata] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isStarting, setIsStarting] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoPreviewRef = useRef<HTMLVideoElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);

  // Initialize or reset when modal opens
  useEffect(() => {
    if (isOpen) {
      const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
      setProjectName(`Match Analysis - ${today}`);
      setHasManuallyEditedName(false);
      setProjectDescription('');
      setValidationError(null);
      setIsStarting(false);

      if (initialFile) {
        processSelectedFile(initialFile);
      } else {
        setSelectedFile(null);
        setFileHandle(null);
        setVideoPreviewUrl(null);
        setVideoMetadata(null);
        setIsExtractingMetadata(false);
      }

      // Focus name input on open
      setTimeout(() => {
        nameInputRef.current?.select();
      }, 100);
    } else {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
        setVideoPreviewUrl(null);
      }
    }
  }, [isOpen, initialFile]);

  // Clean up object URL when unmounting
  useEffect(() => {
    return () => {
      if (videoPreviewUrl) {
        URL.revokeObjectURL(videoPreviewUrl);
      }
    };
  }, [videoPreviewUrl]);

  // Keyboard shortcut listener (Escape to close)
  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const cleanFileName = (filename: string): string => {
    const base = filename.replace(/\.[^/.]+$/, "");
    return base.replace(/[-_]+/g, ' ').trim();
  };

  const processSelectedFile = (file: File, handle?: any) => {
    if (!file.type.startsWith('video/') && !file.name.match(/\.(mp4|mov|webm|mkv|m4v|avi|ts|mts)$/i)) {
      setValidationError('Unsupported format. Please select an MP4, MOV, WebM, or MKV video.');
      return;
    }

    setValidationError(null);
    setSelectedFile(file);
    if (handle) setFileHandle(handle);

    const cleaned = cleanFileName(file.name);
    if (!hasManuallyEditedName && cleaned) {
      setProjectName(cleaned);
    }

    const url = URL.createObjectURL(file);
    if (videoPreviewUrl) {
      URL.revokeObjectURL(videoPreviewUrl);
    }
    setVideoPreviewUrl(url);

    // Fast metadata extraction with progress indicator
    setIsExtractingMetadata(true);
    const tempVideo = document.createElement('video');
    tempVideo.preload = 'metadata';
    tempVideo.src = url;

    let resolved = false;
    const finish = () => {
      if (resolved) return;
      resolved = true;
      setVideoMetadata({
        duration: tempVideo.duration || 0,
        width: tempVideo.videoWidth || 0,
        height: tempVideo.videoHeight || 0,
        sizeFormatted: formatFileSize(file.size)
      });
      setIsExtractingMetadata(false);
      tempVideo.src = '';
      tempVideo.load();
    };

    tempVideo.onloadedmetadata = finish;
    tempVideo.onerror = () => {
      if (resolved) return;
      resolved = true;
      setVideoMetadata({
        duration: 0,
        width: 0,
        height: 0,
        sizeFormatted: formatFileSize(file.size)
      });
      setIsExtractingMetadata(false);
    };

    // Failsafe timeout
    setTimeout(finish, 2000);
  };

  const handleNativePicker = async () => {
    try {
      if ('showOpenFilePicker' in window) {
        try {
          const [handle] = await (window as any).showOpenFilePicker({
            types: [{ description: 'Video Files', accept: { 'video/*': ['.mp4', '.mov', '.webm', '.mkv', '.m4v'] } }],
            multiple: false
          });
          const file = await handle.getFile();
          processSelectedFile(file, handle);
          return;
        } catch (e: any) {
          if (e.name === 'AbortError') return;
        }
      }
      fileInputRef.current?.click();
    } catch {
      fileInputRef.current?.click();
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      setValidationError('Please select or drop a video file.');
      return;
    }

    setIsStarting(true);
    const finalName = projectName.trim() || cleanFileName(selectedFile.name) || 'Untitled Analysis';

    // Transition smoothly
    setTimeout(() => {
      onCreateProject(selectedFile, {
        name: finalName,
        description: projectDescription.trim()
      }, fileHandle);
    }, 50);
  };

  const QUICK_TAGS = ['1st Half', '2nd Half', 'Tactics', 'Set Pieces', 'Scout'];

  const addTag = (tag: string) => {
    setProjectDescription(prev => {
      const trimmed = prev.trim();
      if (!trimmed) return `[${tag}] `;
      if (trimmed.includes(`[${tag}]`)) return trimmed;
      return `${trimmed} · [${tag}]`;
    });
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[120] flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 8 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 8 }}
          transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
          className="bg-[#131316] border border-[#26262a] rounded-2xl w-full max-w-[460px] shadow-2xl overflow-hidden my-auto flex flex-col text-white max-h-[92vh]"
        >
          {/* Top Lime Accent line */}
          <div className="h-1 w-full bg-gradient-to-r from-[#e4ff7a] via-[#c6ff1f] to-[#a0d600]" />

          {/* Compact Header */}
          <div className="px-5 py-3.5 border-b border-[#222226] flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#c6ff1f]/10 border border-[#c6ff1f]/20 flex items-center justify-center text-[#c6ff1f]">
                <Film className="w-3.5 h-3.5" />
              </div>
              <h2 className="text-sm font-bold text-white tracking-tight">
                New Video Project
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-md text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Compact Scrollable Form */}
          <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-y-auto">
            <div className="p-4 sm:p-5 space-y-4">
              {validationError && (
                <div className="bg-red-950/50 border border-red-500/40 rounded-xl px-3 py-2 flex items-center gap-2 text-red-200 text-xs">
                  <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
                  <span className="truncate">{validationError}</span>
                </div>
              )}

              {/* Video Source: Compact Dropzone or Loaded Media Strip */}
              <div>
                <div className="flex items-center justify-between mb-1.5 text-xs">
                  <span className="font-semibold text-gray-300">Video Footage</span>
                  {selectedFile && !isExtractingMetadata && (
                    <span className="text-[11px] text-emerald-400 flex items-center gap-1 font-medium">
                      <Check className="w-3 h-3" /> Ready
                    </span>
                  )}
                </div>

                {!selectedFile ? (
                  <div
                    onDrop={handleDrop}
                    onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
                    onDragLeave={() => setIsDragOver(false)}
                    onClick={handleNativePicker}
                    className={`border border-dashed rounded-xl py-5 px-4 text-center transition-all cursor-pointer group flex flex-col items-center justify-center ${
                      isDragOver
                        ? 'border-[#c6ff1f] bg-[#c6ff1f]/10'
                        : 'border-[#2d2d33] hover:border-[#c6ff1f]/60 bg-[#18181c] hover:bg-[#1c1c21]'
                    }`}
                  >
                    <div className="w-9 h-9 rounded-xl bg-[#232328] group-hover:bg-[#c6ff1f]/15 border border-white/5 flex items-center justify-center text-gray-400 group-hover:text-[#c6ff1f] mb-2 transition-colors">
                      <UploadCloud className="w-4 h-4" />
                    </div>
                    <p className="text-xs font-medium text-white mb-0.5">
                      Drop video file or <span className="text-[#c6ff1f] underline underline-offset-2">Browse</span>
                    </p>
                    <p className="text-[11px] text-gray-400">
                      MP4, MOV, WebM, MKV
                    </p>
                  </div>
                ) : isExtractingMetadata ? (
                  /* Video Loading / Analyzing State */
                  <div className="bg-[#18181c] border border-[#2d2d33] rounded-xl p-3.5 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#232328] flex items-center justify-center text-[#c6ff1f] shrink-0">
                      <Loader2 className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-white truncate max-w-[240px]">
                          {selectedFile.name}
                        </span>
                        <span className="text-[10px] text-[#c6ff1f] font-mono animate-pulse">
                          Reading track...
                        </span>
                      </div>
                      {/* Animated Shimmer Progress Bar */}
                      <div className="w-full h-1 bg-[#28282e] rounded-full overflow-hidden relative">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c6ff1f] to-transparent w-full animate-shimmer" />
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Loaded Media Strip - Compact, Pro & Responsive */
                  <div className="bg-[#18181c] border border-[#2c2c31] rounded-xl p-2.5 flex items-center gap-3">
                    {/* 16:9 Thumbnail Mini Preview */}
                    <div className="w-16 h-11 bg-black rounded-lg overflow-hidden relative shrink-0 border border-white/10 flex items-center justify-center">
                      {videoPreviewUrl ? (
                        <video
                          ref={videoPreviewRef}
                          src={videoPreviewUrl}
                          className="w-full h-full object-cover"
                          muted
                          playsInline
                          onLoadedData={() => {
                            if (videoPreviewRef.current) {
                              videoPreviewRef.current.currentTime = 1;
                            }
                          }}
                        />
                      ) : (
                        <FileVideo className="w-4 h-4 text-gray-400" />
                      )}
                      <div className="absolute inset-0 bg-black/20" />
                      <div className="absolute bottom-0.5 right-0.5 bg-black/80 px-1 rounded text-[8px] font-mono text-white">
                        {videoMetadata?.duration ? formatTime(videoMetadata.duration) : '--:--'}
                      </div>
                    </div>

                    {/* File Specs */}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-white truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </p>
                      <p className="text-[11px] text-gray-400 truncate mt-0.5">
                        <span>{videoMetadata?.sizeFormatted || formatFileSize(selectedFile.size)}</span>
                        {videoMetadata?.width ? (
                          <>
                            <span className="mx-1.5 opacity-40">·</span>
                            <span>{videoMetadata.width}×{videoMetadata.height}</span>
                          </>
                        ) : null}
                      </p>
                    </div>

                    {/* Change Action */}
                    <button
                      type="button"
                      onClick={handleNativePicker}
                      className="px-2.5 py-1 text-[11px] font-medium rounded-lg bg-[#25252a] hover:bg-[#303037] text-gray-300 hover:text-white transition-colors shrink-0"
                    >
                      Change
                    </button>
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="video/*,.mkv,.ts"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files?.[0]) {
                      processSelectedFile(e.target.files[0]);
                    }
                  }}
                />
              </div>

              {/* Project Title Field */}
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1">
                  Project Title
                </label>
                <input
                  ref={nameInputRef}
                  type="text"
                  value={projectName}
                  onChange={(e) => {
                    setProjectName(e.target.value);
                    setHasManuallyEditedName(true);
                  }}
                  className="w-full bg-[#18181c] border border-[#2b2b30] focus:border-[#c6ff1f] focus:ring-1 focus:ring-[#c6ff1f] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all"
                  placeholder="e.g. Tactical Review - 1st Half"
                  required
                />
              </div>

              {/* Description / Notes Field */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-gray-300">
                    Notes & Tactical Brief
                  </label>
                  <span className="text-[10px] text-gray-500">Optional</span>
                </div>
                <textarea
                  value={projectDescription}
                  onChange={(e) => setProjectDescription(e.target.value)}
                  className="w-full bg-[#18181c] border border-[#2b2b30] focus:border-[#c6ff1f] focus:ring-1 focus:ring-[#c6ff1f] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 outline-none transition-all h-14 resize-none"
                  placeholder="Add opponent, game phase, or tactical focus..."
                />

                {/* Quick Add Chips */}
                <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                  {QUICK_TAGS.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => addTag(tag)}
                      className="text-[10px] px-2 py-0.5 rounded-md bg-[#1f1f24] hover:bg-[#282830] text-gray-400 hover:text-white transition-colors"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Alternative: Live coding link */}
              <div className="pt-1 flex items-center justify-center">
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onStartLiveProject();
                  }}
                  className="text-[11px] text-gray-400 hover:text-[#c6ff1f] transition-colors flex items-center gap-1.5 group px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5"
                >
                  <Radio className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
                  <span>Or start Live Coding with Tab Video Capture (Code & Record Game)</span>
                </button>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="px-5 py-3 bg-[#0f0f12] border-t border-[#222226] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                disabled={isStarting}
                className="px-4 py-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/5 text-xs font-medium transition-colors"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={!selectedFile || isExtractingMetadata || isStarting}
                className={`px-5 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 shadow-md ${
                  selectedFile && !isExtractingMetadata && !isStarting
                    ? 'bg-[#c6ff1f] hover:bg-[#b0e817] text-black shadow-[#c6ff1f]/20 cursor-pointer active:scale-95'
                    : 'bg-[#222226] text-gray-500 cursor-not-allowed opacity-60'
                }`}
              >
                {isStarting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Opening Workspace...
                  </>
                ) : isExtractingMetadata ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Analyzing Video...
                  </>
                ) : (
                  <>
                    Start Analysis
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
