import React from 'react';
import { 
  Layers, ChevronLeft, RefreshCw, Plus, Video, Film, CheckCircle2, 
  AlertCircle, ListPlus, ExternalLink, X, FileVideo, Activity
} from 'lucide-react';
import type { Project, Batch } from '../../types';

interface BatchTabsBarProps {
  batch: Batch;
  projects: Project[];
  activeProjectId: string;
  projectBlobs: Map<string, string>;
  onSelectProject: (projectId: string) => void;
  onReloadVideo: (project: Project) => void;
  onAddGamesToBatch: () => void;
  onExitBatch: () => void;
  onOpenStats?: () => void;
  onOpenRelinker?: () => void;
}

export const BatchTabsBar: React.FC<BatchTabsBarProps> = ({
  batch,
  projects,
  activeProjectId,
  projectBlobs,
  onSelectProject,
  onReloadVideo,
  onAddGamesToBatch,
  onExitBatch,
  onOpenStats,
  onOpenRelinker,
}) => {
  const batchPlaylistCount = batch.playlists?.reduce((acc, pl) => acc + (pl.events?.length || 0), 0) || 0;
  const missingFootageCount = projects.filter(p => !projectBlobs.get(p.id) && p.fileName !== 'live').length;

  return (
    <div className="w-full bg-[#0a0a0d] border-b border-white/10 px-2 py-1 flex items-center justify-between gap-2 select-none shrink-0 z-40">
      {/* Left: Back to Batches & Batch Title Pill */}
      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={onExitBatch}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-medium transition-colors cursor-pointer border border-white/10"
          title="Back to Batches Dashboard"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Batches</span>
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#c6ff1f]/10 border border-[#c6ff1f]/20">
          <Layers className="w-3.5 h-3.5 text-[#c6ff1f]" />
          <span className="text-[11px] font-bold text-white max-w-[140px] truncate" title={batch.name}>
            {batch.name}
          </span>
          <span className="text-[10px] text-[#c6ff1f] font-mono px-1 rounded bg-[#c6ff1f]/20">
            {projects.length} {projects.length === 1 ? 'match' : 'matches'}
          </span>
        </div>
      </div>

      {/* Center: Browser-style Match Tabs */}
      <div className="flex-1 flex items-center gap-1 overflow-x-auto custom-scrollbar py-0.5 px-1 min-w-0">
        {projects.length === 0 ? (
          <div className="text-xs text-white/40 italic px-2">
            No matches added to this batch yet.
          </div>
        ) : (
          projects.map((proj, idx) => {
            const isActive = proj.id === activeProjectId;
            const hasVideo = !!projectBlobs.get(proj.id);
            const tagCount = proj.data?.tagEvents?.length || 0;

            return (
              <div
                key={proj.id}
                onClick={() => onSelectProject(proj.id)}
                className={`group relative flex items-center gap-2 px-3 py-1.5 rounded-t-lg border-t-2 border-x transition-all cursor-pointer shrink-0 max-w-[220px] ${
                  isActive
                    ? 'bg-[#16161b] border-t-[#c6ff1f] border-x-white/15 text-white shadow-lg'
                    : 'bg-[#0f0f13]/60 border-t-transparent border-x-white/5 text-white/60 hover:text-white hover:bg-[#141419]'
                }`}
                title={`Switch to ${proj.name}`}
              >
                {/* Status Dot */}
                <div
                  className={`w-2 h-2 rounded-full shrink-0 ${
                    hasVideo 
                      ? 'bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.6)]' 
                      : 'bg-amber-400 shadow-[0_0_6px_rgba(251,191,36,0.6)] animate-pulse'
                  }`}
                  title={hasVideo ? 'Video is loaded & ready' : 'Video unlinked - click reload to select file'}
                />

                {/* Match Tab Title */}
                <div className="min-w-0 flex-1">
                  <p className={`text-xs truncate leading-none ${isActive ? 'font-bold text-white' : 'font-medium'}`}>
                    {proj.name}
                  </p>
                  <div className="flex items-center gap-1.5 text-[9px] text-white/40 mt-0.5 font-mono">
                    <span className="text-[#c6ff1f] font-semibold">{tagCount} tags</span>
                    <span>•</span>
                    <span className="truncate max-w-[70px]">{proj.fileName || 'No video'}</span>
                  </div>
                </div>

                {/* Reload / Relink Video button on the tab */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (onOpenRelinker) {
                      onOpenRelinker();
                    } else {
                      onReloadVideo(proj);
                    }
                  }}
                  className={`p-1 rounded hover:bg-white/15 transition-colors shrink-0 ${
                    !hasVideo ? 'text-amber-400 hover:text-amber-300' : 'text-white/40 hover:text-white'
                  }`}
                  title={hasVideo ? "Change video file for this match" : "Relink video file for this match"}
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            );
          })
        )}

        {/* Quick Add Match Tab */}
        <button
          onClick={onAddGamesToBatch}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/60 hover:text-white text-xs transition-colors shrink-0 cursor-pointer"
          title="Add or remove matches in this batch"
        >
          <Plus className="w-3.5 h-3.5" />
          <span className="hidden md:inline">Add Match</span>
        </button>
      </div>

      {/* Right: Batch Playlist Stats, Match Footage & Manage */}
      <div className="flex items-center gap-2 shrink-0">
        {onOpenRelinker && (
          <button
            onClick={onOpenRelinker}
            className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-xs font-semibold transition-all cursor-pointer shadow-sm ${
              missingFootageCount > 0
                ? 'bg-amber-500/15 hover:bg-amber-500/25 border-amber-500/35 text-amber-300 animate-pulse'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80 hover:text-white'
            }`}
            title="Open Match Footage Matcher & Relinker Table"
          >
            <Film className={`w-3.5 h-3.5 ${missingFootageCount > 0 ? 'text-amber-400' : 'text-[#c6ff1f]'}`} />
            <span className="hidden md:inline">Match Footage</span>
            {missingFootageCount > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-black">
                {missingFootageCount}
              </span>
            )}
          </button>
        )}

        {onOpenStats && (
          <button
            onClick={onOpenStats}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#c6ff1f]/10 hover:bg-[#c6ff1f]/20 border border-[#c6ff1f]/30 text-[#c6ff1f] text-xs font-semibold transition-all cursor-pointer shadow-sm"
            title="Open Batch Statistics, Tag & Label Insights, and CSV Export"
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Batch Stats</span>
          </button>
        )}

        <div 
          className="hidden sm:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-white/[0.03] border border-white/10 text-xs text-white/70"
          title="Total clips accumulated in Batch Playlist across matches"
        >
          <ListPlus className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-medium">Batch Playlist:</span>
          <span className="text-[11px] font-bold text-emerald-400 font-mono">{batchPlaylistCount} clips</span>
        </div>

        <button
          onClick={onAddGamesToBatch}
          className="text-xs px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white border border-white/10 transition-colors cursor-pointer"
        >
          Manage Matches
        </button>
      </div>
    </div>
  );
};
