import React, { useState, useRef, useMemo } from 'react';
import { 
  Film, Video, UploadCloud, CheckCircle2, AlertCircle, 
  RefreshCw, X, Search, Sparkles, FolderOpen, Check, 
  Trash2, Layers, ChevronDown, FileVideo, HardDrive, ArrowRight
} from 'lucide-react';
import type { Project, Batch } from '../../types';
import { 
  formatFileSize, 
  autoMatchVideosToProjects 
} from './batchVideoUtils';

export interface BatchVideoRelinkerProps {
  batch: Batch;
  projects: Project[];
  activeProjectId?: string;
  projectBlobs: Map<string, string>;
  onSelectProject?: (projectId: string) => void;
  onRelinkSingle: (project: Project, file: File, handle?: any) => Promise<void> | void;
  onRelinkBatch: (mappings: { projectId: string; file: File; handle?: any }[]) => Promise<void> | void;
  onClose?: () => void;
  isInline?: boolean;
}

export const BatchVideoRelinker: React.FC<BatchVideoRelinkerProps> = ({
  batch,
  projects,
  activeProjectId,
  projectBlobs,
  onSelectProject,
  onRelinkSingle,
  onRelinkBatch,
  onClose,
  isInline = false,
}) => {
  // Staged files available for matching (dragged & dropped or bulk picked)
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  // Manual or automatic assignments: projectId -> File
  const [assignments, setAssignments] = useState<Record<string, File>>({});
  // Match confidence scores: projectId -> score (0..1)
  const [matchScores, setMatchScores] = useState<Record<string, number>>({});
  
  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [filterMode, setFilterMode] = useState<'all' | 'missing' | 'ready'>('all');
  
  // Drag over dropzone state
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Hidden multi-file input
  const bulkFileInputRef = useRef<HTMLInputElement>(null);
  // Hidden single-file input for individual row pick
  const singleFileInputRef = useRef<HTMLInputElement>(null);
  const singleFileTargetProjectId = useRef<string | null>(null);

  // Status counts
  const statusCounts = useMemo(() => {
    let ready = 0;
    let missing = 0;
    projects.forEach(p => {
      if (projectBlobs.has(p.id) || p.fileName === 'live') {
        ready++;
      } else {
        missing++;
      }
    });
    return { ready, missing, total: projects.length };
  }, [projects, projectBlobs]);

  // Total ready-to-apply assignments
  const pendingLinkCount = useMemo(() => {
    return Object.keys(assignments).filter(id => Boolean(assignments[id])).length;
  }, [assignments]);

  // Auto-match whenever staged files change
  const triggerAutoMatch = (files: File[]) => {
    if (!files.length) return;
    const { assignments: newAssignments, scores } = autoMatchVideosToProjects(
      projects, 
      files, 
      projectBlobs
    );
    
    setAssignments(prev => ({
      ...prev,
      ...newAssignments
    }));
    setMatchScores(prev => ({
      ...prev,
      ...scores
    }));
  };

  // Add files to staged list and run auto-match
  const handleAddFiles = (newFiles: File[]) => {
    if (!newFiles.length) return;
    const validVideos = newFiles.filter(f => 
      f.type.startsWith('video/') || /\.(mp4|mov|mkv|webm|avi|m4v|wmv|ts)$/i.test(f.name)
    );

    if (validVideos.length === 0) {
      alert("Please select valid video files (.mp4, .mov, .mkv, .webm, etc.)");
      return;
    }

    setStagedFiles(prev => {
      const existingKey = new Set(prev.map(f => `${f.name}-${f.size}`));
      const unique = validVideos.filter(f => !existingKey.has(`${f.name}-${f.size}`));
      const updated = [...prev, ...unique];
      triggerAutoMatch(updated);
      return updated;
    });
  };

  // Bulk picker handler using File System Access API if supported, or input click
  const handleOpenBulkPicker = async () => {
    if ('showOpenFilePicker' in window) {
      try {
        const handles = await (window as any).showOpenFilePicker({
          types: [{ description: 'Video Files', accept: { 'video/*': [] } }],
          multiple: true
        });
        const files: File[] = [];
        for (const h of handles) {
          const f = await h.getFile();
          files.push(f);
        }
        handleAddFiles(files);
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return;
      }
    }
    bulkFileInputRef.current?.click();
  };

  // Individual picker handler for a single project
  const handleOpenSinglePicker = async (projectId: string) => {
    singleFileTargetProjectId.current = projectId;
    if ('showOpenFilePicker' in window) {
      try {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'Video Files', accept: { 'video/*': [] } }],
          multiple: false
        });
        const file = await handle.getFile();
        handleAssignSingleFile(projectId, file, handle);
        return;
      } catch (e: any) {
        if (e.name === 'AbortError') return;
      }
    }
    singleFileInputRef.current?.click();
  };

  const handleAssignSingleFile = async (projectId: string, file: File, handle?: any) => {
    setStagedFiles(prev => {
      if (!prev.some(f => f.name === file.name && f.size === file.size)) {
        return [file, ...prev];
      }
      return prev;
    });

    setAssignments(prev => ({
      ...prev,
      [projectId]: file
    }));
    setMatchScores(prev => ({
      ...prev,
      [projectId]: 1.0
    }));
  };

  // Apply all matched assignments
  const handleApplyAll = async () => {
    const list: { projectId: string; file: File; handle?: any }[] = [];
    Object.entries(assignments).forEach(([pId, file]) => {
      if (file) {
        list.push({ projectId: pId, file });
      }
    });

    if (list.length === 0) return;

    setIsApplying(true);
    try {
      await onRelinkBatch(list);
      setSuccessToast(`Successfully linked ${list.length} match video${list.length > 1 ? 's' : ''}!`);
      setTimeout(() => {
        setSuccessToast(null);
        if (onClose) onClose();
      }, 1200);
    } catch (e) {
      console.error("Batch relink error:", e);
    } finally {
      setIsApplying(false);
    }
  };

  // Apply single project link
  const handleApplySingle = async (project: Project) => {
    const file = assignments[project.id];
    if (!file) return;

    setIsApplying(true);
    try {
      await onRelinkSingle(project, file);
      setSuccessToast(`Linked video for "${project.name}"`);
      setTimeout(() => setSuccessToast(null), 2000);
    } catch (e) {
      console.error(e);
    } finally {
      setIsApplying(false);
    }
  };

  // Filtered projects
  const filteredProjects = useMemo(() => {
    return projects.filter(p => {
      const hasBlob = projectBlobs.has(p.id) || p.fileName === 'live';
      if (filterMode === 'missing' && hasBlob) return false;
      if (filterMode === 'ready' && !hasBlob) return false;

      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        const matchesName = p.name.toLowerCase().includes(q);
        const matchesFileName = (p.fileName || '').toLowerCase().includes(q);
        const matchedAssigned = assignments[p.id]?.name.toLowerCase().includes(q);
        return matchesName || matchesFileName || matchedAssigned;
      }
      return true;
    });
  }, [projects, projectBlobs, filterMode, searchTerm, assignments]);

  // Drag and drop event handlers
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(true);
  };

  const onDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const filesArray = Array.from(e.dataTransfer.files);
      handleAddFiles(filesArray);
    }
  };

  const renderContent = () => (
    <div 
      className="w-full flex-1 flex flex-col bg-[#0b0c0f] border border-white/10 rounded-2xl shadow-2xl overflow-hidden pointer-events-auto"
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Hidden file pickers */}
      <input 
        ref={bulkFileInputRef}
        type="file"
        multiple
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.length) {
            handleAddFiles(Array.from(e.target.files));
          }
        }}
      />
      <input 
        ref={singleFileInputRef}
        type="file"
        accept="video/*"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0] && singleFileTargetProjectId.current) {
            handleAssignSingleFile(singleFileTargetProjectId.current, e.target.files[0]);
          }
        }}
      />

      {/* Header Banner */}
      <div className="bg-[#121318] border-b border-white/10 p-4 sm:p-5 shrink-0">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-[#c6ff1f]/10 border border-[#c6ff1f]/30 flex items-center justify-center text-[#c6ff1f] shadow-lg shadow-[#c6ff1f]/5 shrink-0">
              <Film className="w-6 h-6" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Match Footage Relinker
                </h2>
                <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-[#c6ff1f]/15 text-[#c6ff1f] border border-[#c6ff1f]/25">
                  Batch: {batch.name}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-1">
                Choose all videos together or match individual footage files for each project below.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs font-mono">
              <span className="flex items-center gap-1.5 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                {statusCounts.ready} Ready
              </span>
              <span className="text-gray-600">/</span>
              <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                {statusCounts.missing} Missing Footage
              </span>
            </div>

            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>
        </div>

        {/* Big Simple Bulk Upload Hero Box */}
        <div className={`mt-4 rounded-xl border-2 border-dashed p-4 transition-all duration-200 flex flex-col sm:flex-row items-center justify-between gap-4 ${
          isDraggingOver 
            ? 'border-[#c6ff1f] bg-[#c6ff1f]/10 shadow-[0_0_25px_rgba(198,255,31,0.2)]' 
            : 'border-white/15 bg-white/[0.02] hover:border-white/25 hover:bg-white/[0.03]'
        }`}>
          <div className="flex items-center gap-3 min-w-0">
            <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors shrink-0 ${
              isDraggingOver ? 'bg-[#c6ff1f] text-black' : 'bg-white/10 text-white'
            }`}>
              <UploadCloud className="w-5 h-5" />
            </div>
            <div>
              <p className="text-sm font-bold text-white">
                {isDraggingOver ? 'Release to Drop Video Files' : 'Option A: Choose All Videos Together (Bulk)'}
              </p>
              <p className="text-xs text-gray-400">
                Drag & drop multiple files, or click button to pick all. Videos auto-match to projects by filename!
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleOpenBulkPicker}
              className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#c6ff1f] hover:bg-[#d4ff4d] text-black font-bold text-xs shadow-lg shadow-[#c6ff1f]/15 transition-all cursor-pointer active:scale-95"
            >
              <FolderOpen className="w-4 h-4" />
              <span>Select All Video Files</span>
            </button>

            {stagedFiles.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  setStagedFiles([]);
                  setAssignments({});
                  setMatchScores({});
                }}
                className="p-2.5 rounded-xl text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                title="Clear all staged files"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Staged file chips */}
        {stagedFiles.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mt-3 pt-2 border-t border-white/5 text-xs">
            <span className="text-[#c6ff1f] font-mono font-bold flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5" />
              {stagedFiles.length} file{stagedFiles.length > 1 ? 's' : ''} staged:
            </span>
            {stagedFiles.map((file, idx) => (
              <span key={idx} className="bg-white/5 border border-white/10 px-2 py-0.5 rounded-md text-[11px] font-mono text-gray-300">
                {file.name} ({formatFileSize(file.size)})
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#0f1015] border-b border-white/5 px-4 py-2.5 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          <span className="text-xs font-semibold text-gray-400 mr-1 hidden sm:inline">Filter:</span>
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterMode === 'all' 
                ? 'bg-white/15 text-white' 
                : 'text-gray-400 hover:text-white bg-transparent'
            }`}
          >
            All Matches ({projects.length})
          </button>
          <button
            onClick={() => setFilterMode('missing')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterMode === 'missing' 
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' 
                : 'text-gray-400 hover:text-amber-300 bg-transparent'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            Needs Footage ({statusCounts.missing})
          </button>
          <button
            onClick={() => setFilterMode('ready')}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold transition-colors shrink-0 ${
              filterMode === 'ready' 
                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                : 'text-gray-400 hover:text-emerald-300 bg-transparent'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Ready ({statusCounts.ready})
          </button>
        </div>

        <div className="relative w-full sm:w-60">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search matches..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-[#181920] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-[#c6ff1f]/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Responsive Matches List (Cards instead of squashed rigid table!) */}
      <div className="flex-1 overflow-y-auto custom-scrollbar p-3 sm:p-5 space-y-3 bg-[#08080a] min-h-0">
        {filteredProjects.length === 0 ? (
          <div className="py-16 text-center text-gray-500 bg-[#101116] border border-white/5 rounded-2xl">
            <Film className="w-10 h-10 mx-auto mb-2 text-gray-600" />
            <p className="text-sm font-semibold text-gray-300">No matches found for current filter.</p>
          </div>
        ) : (
          filteredProjects.map((proj) => {
            const hasBlob = projectBlobs.has(proj.id) || proj.fileName === 'live';
            const isActiveWorkspace = proj.id === activeProjectId;
            const assignedFile = assignments[proj.id];
            const score = matchScores[proj.id];
            const tagCount = proj.data?.tagEvents?.length || 0;

            return (
              <div
                key={proj.id}
                className={`p-4 rounded-xl border transition-all duration-200 ${
                  isActiveWorkspace
                    ? 'bg-[#15161d] border-[#c6ff1f]/40 shadow-lg shadow-[#c6ff1f]/5'
                    : 'bg-[#111218] border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4">
                  {/* Left: Project title & expected file */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-bold text-white tracking-tight">
                        {proj.name}
                      </span>
                      {isActiveWorkspace && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-[#c6ff1f]/20 text-[#c6ff1f] border border-[#c6ff1f]/30">
                          Current Match
                        </span>
                      )}
                      <span className="text-[11px] font-mono text-gray-400 bg-white/5 px-2 py-0.5 rounded">
                        {tagCount} tags
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs mt-1.5 text-gray-400 font-mono">
                      <span className="text-gray-500">Expected Footage:</span>
                      <span className="text-gray-300 bg-black/40 px-2 py-0.5 rounded border border-white/5 truncate max-w-sm" title={proj.fileName}>
                        {proj.fileName || 'No filename recorded'}
                      </span>
                    </div>
                  </div>

                  {/* Center: Status Badge */}
                  <div className="shrink-0">
                    {hasBlob ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        Footage Ready
                      </span>
                    ) : assignedFile ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-[#c6ff1f]/15 text-[#c6ff1f] border border-[#c6ff1f]/30 animate-pulse">
                        <Sparkles className="w-3.5 h-3.5" />
                        File Matched
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
                        <AlertCircle className="w-3.5 h-3.5" />
                        Footage Needed
                      </span>
                    )}
                  </div>
                </div>

                {/* Assignment & Individual Actions Row */}
                <div className="mt-3.5 pt-3 border-t border-white/5 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
                  {/* File Selector / Detected File Pill */}
                  <div className="flex-1 min-w-0">
                    {assignedFile ? (
                      <div className="flex flex-wrap items-center justify-between bg-[#191a24] border border-[#c6ff1f]/30 px-3 py-2 rounded-lg gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <Film className="w-4 h-4 text-[#c6ff1f] shrink-0" />
                          <span className="font-mono text-xs text-white truncate max-w-xs font-medium" title={assignedFile.name}>
                            {assignedFile.name}
                          </span>
                          <span className="text-[10px] font-mono text-gray-400 bg-black/40 px-1.5 py-0.5 rounded">
                            {formatFileSize(assignedFile.size)}
                          </span>
                          {score !== undefined && (
                            <span className="text-[10px] font-mono text-[#c6ff1f] bg-[#c6ff1f]/10 px-1.5 py-0.5 rounded">
                              {Math.round(score * 100)}% match
                            </span>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setAssignments(prev => {
                              const next = { ...prev };
                              delete next[proj.id];
                              return next;
                            });
                          }}
                          className="text-gray-400 hover:text-red-400 text-xs transition-colors shrink-0"
                          title="Remove assignment"
                        >
                          Clear
                        </button>
                      </div>
                    ) : stagedFiles.length > 0 ? (
                      <div className="relative">
                        <select
                          value=""
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val) {
                              const found = stagedFiles.find(f => `${f.name}-${f.size}` === val);
                              if (found) handleAssignSingleFile(proj.id, found);
                            }
                          }}
                          className="w-full bg-[#181922] border border-white/10 hover:border-white/20 rounded-lg px-3 py-2 text-xs text-white appearance-none pr-8 focus:outline-none focus:border-[#c6ff1f]/60 font-mono transition-colors"
                        >
                          <option value="">-- Assign a staged video file to this match --</option>
                          {stagedFiles.map((file) => (
                            <option key={`${file.name}-${file.size}`} value={`${file.name}-${file.size}`}>
                              {file.name} ({formatFileSize(file.size)})
                            </option>
                          ))}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500 italic">
                        {hasBlob ? 'Footage is active in workspace.' : 'No file matched yet. Choose file individually or bulk select above.'}
                      </div>
                    )}
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 shrink-0 self-end md:self-auto">
                    {/* Choose specific file for this project */}
                    <button
                      type="button"
                      onClick={() => handleOpenSinglePicker(proj.id)}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold transition-colors cursor-pointer border border-white/10 active:scale-95"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{hasBlob ? 'Change Video' : 'Choose Video for this Match'}</span>
                    </button>

                    {/* Single link button */}
                    {assignedFile && (
                      <button
                        type="button"
                        onClick={() => handleApplySingle(proj)}
                        disabled={isApplying}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-[#c6ff1f] hover:bg-[#d4ff4d] text-black font-bold text-xs shadow-md shadow-[#c6ff1f]/15 transition-all cursor-pointer disabled:opacity-50 active:scale-95"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Link Video</span>
                      </button>
                    )}

                    {/* Switch to match if ready */}
                    {hasBlob && !isActiveWorkspace && onSelectProject && (
                      <button
                        type="button"
                        onClick={() => onSelectProject(proj.id)}
                        className="flex items-center gap-1 px-3 py-2 rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 text-xs font-semibold border border-emerald-500/20 transition-colors cursor-pointer"
                      >
                        <span>Switch</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Sticky Action Footer */}
      <div className="bg-[#121318] border-t border-white/10 p-4 shrink-0 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="text-xs text-gray-300">
            <span className="font-bold text-[#c6ff1f] text-sm">{pendingLinkCount}</span> of {projects.length} matches ready to link
          </div>
          {pendingLinkCount > 0 && (
            <div className="w-24 h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div 
                className="h-full bg-[#c6ff1f] rounded-full transition-all duration-300"
                style={{ width: `${(pendingLinkCount / projects.length) * 100}%` }}
              />
            </div>
          )}
        </div>

        <div className="flex items-center gap-2.5 w-full sm:w-auto justify-end">
          {onClose && (
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-gray-300 hover:text-white bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium transition-colors cursor-pointer"
            >
              Close
            </button>
          )}

          <button
            type="button"
            onClick={handleApplyAll}
            disabled={pendingLinkCount === 0 || isApplying}
            className={`flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
              pendingLinkCount > 0
                ? 'bg-[#c6ff1f] hover:bg-[#d4ff4d] text-black shadow-lg shadow-[#c6ff1f]/25 hover:scale-[1.02] active:scale-95'
                : 'bg-white/10 text-gray-500 cursor-not-allowed'
            }`}
          >
            {isApplying ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Linking Videos...</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                <span>Save & Link All {pendingLinkCount > 0 ? `(${pendingLinkCount})` : ''} Matched Videos</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Floating Success Toast */}
      {successToast && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 z-50 bg-[#16161c] border border-[#c6ff1f]/40 text-[#c6ff1f] px-5 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 font-medium text-xs backdrop-blur-md animate-in fade-in slide-in-from-bottom-2">
          <CheckCircle2 className="w-4 h-4 text-[#c6ff1f]" />
          <span>{successToast}</span>
        </div>
      )}
    </div>
  );

  if (isInline) {
    return (
      <div className="absolute inset-0 z-40 p-2 sm:p-5 flex items-center justify-center bg-[#070709] overflow-hidden pointer-events-auto select-none">
        <div className="w-full h-full max-w-4xl flex flex-col">
          {renderContent()}
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 backdrop-blur-md p-3 sm:p-6 pointer-events-auto select-none animate-in fade-in">
      <div className="w-full max-w-4xl h-[88vh] flex flex-col">
        {renderContent()}
      </div>
    </div>
  );
};
