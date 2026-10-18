import React, { useMemo } from 'react';
import { 
  LayoutGrid, Plus, Star, Clock, Trash2, Edit2, Copy, 
  Download, ArrowRight, Layers, FileUp, Sparkles, Shield,
  ChevronRight, Calendar
} from 'lucide-react';
import type { BoardProject } from '../../types';
import { PITCH_TEMPLATES } from './boardProjectUtils';

interface BoardProjectsDashboardViewProps {
  boardProjects: BoardProject[];
  searchTerm: string;
  filterType: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'minimal' | 'expanded';
  onOpenBoardProject: (project: BoardProject) => void;
  onNewBoardProjectClick: () => void;
  onEditBoardProjectClick: (project: BoardProject) => void;
  onDeleteBoardProjectClick: (id: string) => void;
  onToggleBoardProjectFavourite: (project: BoardProject) => void;
  onDuplicateBoardProject: (project: BoardProject) => void;
  onExportBoardProjectJSON: (project: BoardProject) => void;
  onImportBoardProjectJSON?: (file: File) => void;
}

export const BoardProjectsDashboardView: React.FC<BoardProjectsDashboardViewProps> = ({
  boardProjects,
  searchTerm,
  filterType,
  sortBy,
  sortOrder,
  viewMode,
  onOpenBoardProject,
  onNewBoardProjectClick,
  onEditBoardProjectClick,
  onDeleteBoardProjectClick,
  onToggleBoardProjectFavourite,
  onDuplicateBoardProject,
  onExportBoardProjectJSON,
  onImportBoardProjectJSON,
}) => {
  const filteredProjects = useMemo(() => {
    let result = [...boardProjects];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(p => 
        p.name.toLowerCase().includes(q) ||
        (p.description && p.description.toLowerCase().includes(q)) ||
        (p.pitchTemplate && p.pitchTemplate.toLowerCase().includes(q))
      );
    }

    if (filterType === 'recent') {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      result = result.filter(p => p.lastModified >= cutoff);
    } else if (filterType === 'favourites') {
      result = result.filter(p => p.favourite);
    }

    if (sortBy === 'date') {
      result.sort((a, b) => sortOrder === 'desc' ? b.lastModified - a.lastModified : a.lastModified - b.lastModified);
    } else if (sortBy === 'name') {
      result.sort((a, b) => sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));
    } else if (sortBy === 'slides') {
      result.sort((a, b) => {
        const aSlides = a.slideCount || a.data?.slides?.length || 1;
        const bSlides = b.slideCount || b.data?.slides?.length || 1;
        return sortOrder === 'desc' ? bSlides - aSlides : aSlides - bSlides;
      });
    }

    return result;
  }, [boardProjects, searchTerm, filterType, sortBy, sortOrder]);

  const formatTimeAgo = (timestamp: number) => {
    const diff = Date.now() - timestamp;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 30) return `${days}d ago`;
    return new Date(timestamp).toLocaleDateString();
  };

  const getPitchStyle = (templateId?: string) => {
    const found = PITCH_TEMPLATES.find(t => t.id === templateId);
    return found || { name: 'Classic Green', color: '#1a542b', border: '#22c55e' };
  };

  if (filteredProjects.length === 0) {
    return (
      <div className="glass rounded-2xl text-center py-16 px-4 text-white/40 flex flex-col items-center justify-center border border-white/5 mt-2">
        <div className="w-14 h-14 rounded-2xl bg-[#c6ff1f]/10 border border-[#c6ff1f]/20 flex items-center justify-center text-[#c6ff1f] mb-3.5 shadow-lg shadow-[#c6ff1f]/5">
          <LayoutGrid className="w-7 h-7 stroke-[2.2]" />
        </div>
        <p className="text-base font-semibold text-white/80">
          {boardProjects.length === 0 ? 'No Tactical Board Projects Yet' : 'No board projects match your filter'}
        </p>
        <p className="text-xs mt-1 text-white/40 max-w-md">
          {boardProjects.length === 0
            ? 'Create multiple tactical boards for match strategies, defensive set-pieces, attacking phases, and animated player transitions.'
            : 'Try modifying your search term or filter selection.'}
        </p>
        <div className="flex flex-wrap items-center justify-center gap-3 mt-4">
          <button
            onClick={onNewBoardProjectClick}
            className="btn-glow text-black text-xs font-semibold py-2 px-5 rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-[#c6ff1f]/10"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Create Tactical Board</span>
          </button>
          {onImportBoardProjectJSON && (
            <label className="bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold py-2 px-4 rounded-lg flex items-center gap-2 transition-all cursor-pointer border border-white/10">
              <FileUp className="w-3.5 h-3.5" />
              <span>Import Project JSON</span>
              <input
                type="file"
                accept=".json"
                className="hidden"
                onChange={(e) => {
                  if (e.target.files && e.target.files[0]) {
                    onImportBoardProjectJSON(e.target.files[0]);
                    e.target.value = '';
                  }
                }}
              />
            </label>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      {viewMode === 'minimal' ? (
        /* Minimal List View */
        <div className="bg-[#121216]/80 border border-white/[0.07] rounded-xl overflow-hidden shadow-xl backdrop-blur-md">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-[minmax(220px,1fr)_150px_130px_110px_200px] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] text-[11px] font-semibold text-white/40 uppercase tracking-wider items-center">
            <div className="flex items-center gap-2">Board Project</div>
            <div>Pitch & Kits</div>
            <div>Slides & Animation</div>
            <div>Modified</div>
            <div className="text-right pr-1">Actions</div>
          </div>

          {/* Minimal Rows */}
          <div className="divide-y divide-white/[0.04]">
            {filteredProjects.map((project) => {
              const slidesCount = project.slideCount || project.data?.slides?.length || 1;
              const pitchStyle = getPitchStyle(project.pitchTemplate);
              const homeColor = project.homeTeamColor || project.data?.teams?.HOME?.color || '#ef4444';
              const awayColor = project.awayTeamColor || project.data?.teams?.AWAY?.color || '#3b82f6';

              return (
                <div
                  key={project.id}
                  className="project-row px-3.5 sm:px-4 py-2.5 hover:bg-white/[0.02] transition-colors group cursor-pointer"
                  onClick={() => onOpenBoardProject(project)}
                >
                  <div className="grid grid-cols-1 md:grid-cols-[minmax(220px,1fr)_150px_130px_110px_200px] gap-3 items-center">
                    {/* Title & Notes */}
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleBoardProjectFavourite(project);
                        }}
                        className={`star-btn shrink-0 p-1 ${project.favourite ? 'active text-amber-400' : 'text-white/20 hover:text-amber-400'}`}
                        title={project.favourite ? 'Starred' : 'Add to Starred'}
                      >
                        <Star className={`w-3.5 h-3.5 ${project.favourite ? 'fill-current' : ''}`} />
                      </button>

                      <div 
                        className="w-8 h-8 rounded-lg shrink-0 border flex items-center justify-center shadow-inner"
                        style={{ backgroundColor: pitchStyle.color, borderColor: pitchStyle.border }}
                      >
                        <LayoutGrid className="w-4 h-4 text-white/80" />
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <h4 className="text-xs font-semibold text-white truncate group-hover:text-[#c6ff1f] transition-colors">
                            {project.name}
                          </h4>
                          {project.favourite && (
                            <span className="text-[9px] text-amber-400/80 bg-amber-400/10 px-1.5 py-0.2 rounded font-mono hidden sm:inline">
                              ★
                            </span>
                          )}
                        </div>
                        {project.description && (
                          <p className="text-[11px] text-white/40 truncate max-w-sm mt-0.5">
                            {project.description}
                          </p>
                        )}
                      </div>
                    </div>

                    {/* Pitch Theme & Kits */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 rounded-md text-[10px] font-medium bg-white/5 border border-white/10 text-white/80">
                        {pitchStyle.name}
                      </span>
                      <div className="flex items-center gap-1" title="Team kit colors">
                        <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: homeColor }} />
                        <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: awayColor }} />
                      </div>
                    </div>

                    {/* Slides & Animation */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-mono font-medium text-white/70 bg-white/[0.04] px-2 py-0.5 rounded-lg border border-white/5">
                        {slidesCount} {slidesCount === 1 ? 'Slide' : 'Slides'}
                      </span>
                    </div>

                    {/* Modified */}
                    <div className="text-[11px] text-white/40 flex items-center gap-1">
                      <Clock className="w-3 h-3 text-white/30" />
                      <span>{formatTimeAgo(project.lastModified)}</span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => onOpenBoardProject(project)}
                        className="px-2.5 py-1 rounded-lg bg-[#c6ff1f]/15 hover:bg-[#c6ff1f] text-[#c6ff1f] hover:text-black font-semibold text-xs transition-all flex items-center gap-1 cursor-pointer"
                        title="Open in Board Editor"
                      >
                        <span>Open</span>
                        <ArrowRight className="w-3 h-3" />
                      </button>

                      <button
                        onClick={() => onEditBoardProjectClick(project)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                        title="Edit Project Details"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDuplicateBoardProject(project)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                        title="Duplicate Board"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onExportBoardProjectJSON(project)}
                        className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                        title="Export JSON"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteBoardProjectClick(project.id)}
                        className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                        title="Delete Board"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Expanded Cards Grid View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredProjects.map((project) => {
            const slidesCount = project.slideCount || project.data?.slides?.length || 1;
            const pitchStyle = getPitchStyle(project.pitchTemplate);
            const homeColor = project.homeTeamColor || project.data?.teams?.HOME?.color || '#ef4444';
            const awayColor = project.awayTeamColor || project.data?.teams?.AWAY?.color || '#3b82f6';

            return (
              <div
                key={project.id}
                onClick={() => onOpenBoardProject(project)}
                className="project-card glass rounded-2xl p-4 flex flex-col justify-between border border-white/10 hover:border-[#c6ff1f]/40 transition-all cursor-pointer group relative overflow-hidden"
              >
                {/* Top Pitch Preview Representation */}
                <div 
                  className="w-full h-32 rounded-xl mb-3.5 relative overflow-hidden border flex items-center justify-center shadow-inner"
                  style={{ backgroundColor: pitchStyle.color, borderColor: pitchStyle.border }}
                >
                  {/* Subtle Pitch Markings */}
                  <div className="absolute inset-2 border border-white/20 rounded-sm pointer-events-none" />
                  <div className="absolute inset-y-2 left-1/2 w-px bg-white/20 pointer-events-none" />
                  <div className="w-12 h-12 rounded-full border border-white/20 pointer-events-none" />
                  <div className="absolute left-2 top-1/2 -translate-y-1/2 w-6 h-12 border-r border-y border-white/20 pointer-events-none" />
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-12 border-l border-y border-white/20 pointer-events-none" />

                  {/* Badges on Top */}
                  <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                    <span className="bg-black/60 backdrop-blur-md border border-white/20 text-white/90 text-[10px] font-medium px-2 py-0.5 rounded-full">
                      {pitchStyle.name}
                    </span>
                  </div>

                  <div className="absolute top-2.5 right-2.5 flex items-center gap-1.5">
                    <span className="bg-black/60 backdrop-blur-md border border-white/20 text-[#c6ff1f] text-[10px] font-mono font-bold px-2 py-0.5 rounded-full">
                      {slidesCount} {slidesCount === 1 ? 'Slide' : 'Slides'}
                    </span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleBoardProjectFavourite(project);
                      }}
                      className={`p-1 rounded-full bg-black/60 backdrop-blur-md border border-white/20 ${
                        project.favourite ? 'text-amber-400' : 'text-white/40 hover:text-amber-400'
                      }`}
                      title={project.favourite ? 'Starred' : 'Add to Starred'}
                    >
                      <Star className={`w-3.5 h-3.5 ${project.favourite ? 'fill-current' : ''}`} />
                    </button>
                  </div>
                </div>

                {/* Card Info */}
                <div className="mb-3">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <h3 className="text-sm font-bold text-white leading-tight group-hover:text-[#c6ff1f] transition-colors truncate">
                      {project.name}
                    </h3>
                  </div>
                  {project.description ? (
                    <p className="text-xs text-white/50 line-clamp-2 leading-relaxed">
                      {project.description}
                    </p>
                  ) : (
                    <p className="text-xs text-white/30 italic">No notes added</p>
                  )}
                </div>

                {/* Kits & Metadata */}
                <div className="flex items-center justify-between py-2 border-t border-white/[0.07] text-[11px] text-white/40">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10px] uppercase tracking-wider text-white/30 font-semibold">Kits:</span>
                    <div className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: homeColor }} />
                      <span className="w-2.5 h-2.5 rounded-full border border-white/20 shadow-sm" style={{ backgroundColor: awayColor }} />
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-white/30" />
                    <span>{formatTimeAgo(project.lastModified)}</span>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div 
                  className="flex items-center justify-between gap-2 pt-2.5 border-t border-white/[0.07]" 
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onEditBoardProjectClick(project)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                      title="Edit Project"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDuplicateBoardProject(project)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                      title="Duplicate Board"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onExportBoardProjectJSON(project)}
                      className="p-1.5 rounded-lg hover:bg-white/10 text-white/40 hover:text-white transition-colors cursor-pointer"
                      title="Export JSON"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDeleteBoardProjectClick(project.id)}
                      className="p-1.5 rounded-lg hover:bg-red-500/20 text-white/40 hover:text-red-400 transition-colors cursor-pointer"
                      title="Delete Board"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <button
                    onClick={() => onOpenBoardProject(project)}
                    className="btn-glow inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-black text-xs font-bold transition-all shadow-md shadow-[#c6ff1f]/15 cursor-pointer"
                  >
                    <span>Open Board</span>
                    <ArrowRight className="w-3 h-3 stroke-[2.5]" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
