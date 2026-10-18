import React, { useMemo } from 'react';
import { 
  Layers, Plus, Star, Film, Activity, Calendar, ArrowRight, 
  Settings2, Trash2, Edit2, Check, Clock, ChevronDown, 
  ChevronUp, Folder, FolderPlus, ListPlus, ExternalLink 
} from 'lucide-react';
import type { Batch, Project } from '../../types';

interface BatchesDashboardViewProps {
  batches: Batch[];
  projects: Project[];
  searchTerm: string;
  filterType: string;
  sortBy: string;
  sortOrder: 'asc' | 'desc';
  viewMode: 'minimal' | 'expanded';
  onOpenBatch: (batch: Batch) => void;
  onOpenBatchStats?: (batch: Batch) => void;
  onNewBatchClick: () => void;
  onManageGamesClick: (batch: Batch) => void;
  onEditBatchClick: (batch: Batch) => void;
  onDeleteBatchClick: (batchId: string) => void;
  onToggleBatchFavourite: (batch: Batch) => void;
}

export const BatchesDashboardView: React.FC<BatchesDashboardViewProps> = ({
  batches,
  projects,
  searchTerm,
  filterType,
  sortBy,
  sortOrder,
  viewMode,
  onOpenBatch,
  onOpenBatchStats,
  onNewBatchClick,
  onManageGamesClick,
  onEditBatchClick,
  onDeleteBatchClick,
  onToggleBatchFavourite,
}) => {
  const filteredBatches = useMemo(() => {
    let result = [...batches];

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(b => {
        const matchesName = b.name.toLowerCase().includes(q);
        const matchesDesc = b.description && b.description.toLowerCase().includes(q);
        // Also match if any included project matches the search!
        const matchesGame = b.projectIds?.some(pid => {
          const p = projects.find(x => x.id === pid);
          return p && (p.name.toLowerCase().includes(q) || (p.fileName && p.fileName.toLowerCase().includes(q)));
        });
        return matchesName || matchesDesc || matchesGame;
      });
    }

    if (filterType === 'recent') {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      result = result.filter(b => b.lastModified >= cutoff);
    } else if (filterType === 'favourites') {
      result = result.filter(b => b.favourite);
    }

    if (sortBy === 'date') {
      result.sort((a, b) => sortOrder === 'desc' ? b.lastModified - a.lastModified : a.lastModified - b.lastModified);
    } else if (sortBy === 'name') {
      result.sort((a, b) => sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));
    }

    return result;
  }, [batches, projects, searchTerm, filterType, sortBy, sortOrder]);

  if (filteredBatches.length === 0) {
    return (
      <div className="glass rounded-2xl text-center py-16 px-4 text-white/40 flex flex-col items-center justify-center border border-white/5 mt-2">
        <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-[#c6ff1f] mb-3.5">
          <Layers className="w-7 h-7" />
        </div>
        <p className="text-base font-semibold text-white/80">
          {batches.length === 0 ? 'No Game Batches Created Yet' : 'No batches match your filter'}
        </p>
        <p className="text-xs mt-1 text-white/40 max-w-md">
          {batches.length === 0
            ? 'Group multiple matches into a Batch (e.g. season games, opponent analysis, or player scouting) to analyze across matches and build multi-match playlists.'
            : 'Try modifying your search term or filter selection.'}
        </p>
        <button
          onClick={onNewBatchClick}
          className="mt-4 btn-glow text-black text-xs font-semibold py-2 px-5 rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-[#c6ff1f]/10"
        >
          <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
          <span>Create New Batch</span>
        </button>
      </div>
    );
  }

  return (
    <div>
      {viewMode === 'minimal' ? (
        /* Minimal List View */
        <div className="bg-[#121216]/80 border border-white/[0.07] rounded-xl overflow-hidden shadow-xl backdrop-blur-md divide-y divide-white/[0.04]">
          {/* Table Header */}
          <div className="hidden md:grid md:grid-cols-[minmax(200px,1fr)_220px_100px_240px] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] text-[11px] font-semibold text-white/40 uppercase tracking-wider items-center">
            <div className="flex items-center gap-2">Batch / Projects</div>
            <div>Cumulative Tag Stats</div>
            <div>Modified</div>
            <div className="text-right pr-1">Actions</div>
          </div>

          {filteredBatches.map(batch => {
            const batchProjects = projects.filter(p => batch.projectIds?.includes(p.id));
            let totalTags = 0;
            const tagCounts = new Map<string, { count: number; name: string; color: string }>();

            batchProjects.forEach(proj => {
              const evts = proj.data?.tagEvents || [];
              const tags = proj.data?.tags || [];
              totalTags += evts.length;
              evts.forEach(e => {
                const t = tags.find(x => x.id === e.tagId);
                const name = t?.name || 'Tag';
                const color = t?.color || '#3b82f6';
                const curr = tagCounts.get(e.tagId);
                if (curr) curr.count += 1;
                else tagCounts.set(e.tagId, { count: 1, name, color });
              });
            });

            const topTags = Array.from(tagCounts.values()).sort((a, b) => b.count - a.count).slice(0, 4);

            return (
              <div
                key={batch.id}
                className="grid grid-cols-1 md:grid-cols-[minmax(200px,1fr)_220px_100px_240px] gap-3 p-3.5 sm:px-4 items-center hover:bg-white/[0.02] transition-colors"
              >
                {/* Col 1: Title, Favourite & Games Chips */}
                <div className="flex items-start gap-2.5 min-w-0">
                  <button
                    onClick={() => onToggleBatchFavourite(batch)}
                    className={`mt-0.5 transition-colors p-1 rounded hover:bg-white/5 shrink-0 cursor-pointer ${
                      batch.favourite ? 'text-amber-400' : 'text-white/20 hover:text-white/60'
                    }`}
                    title={batch.favourite ? 'Remove from starred' : 'Add to starred'}
                  >
                    <Star className={`w-3.5 h-3.5 ${batch.favourite ? 'fill-current' : ''}`} />
                  </button>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3
                        onClick={() => onOpenBatch(batch)}
                        className="text-xs font-bold text-white hover:text-[#c6ff1f] cursor-pointer transition-colors truncate"
                      >
                        {batch.name}
                      </h3>
                      <span className="text-[10px] font-mono text-[#c6ff1f] bg-[#c6ff1f]/10 border border-[#c6ff1f]/20 px-1.5 py-0.2 rounded-full font-bold">
                        {batchProjects.length} {batchProjects.length === 1 ? 'game' : 'games'}
                      </span>
                    </div>

                    {batch.description && (
                      <p className="text-[11px] text-white/50 truncate mt-0.5">{batch.description}</p>
                    )}

                    {/* Games badges */}
                    <div className="flex items-center gap-1 mt-1.5 flex-wrap">
                      {batchProjects.slice(0, 3).map(p => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1 text-[9px] text-white/60 bg-white/5 border border-white/10 px-1.5 py-0.5 rounded truncate max-w-[120px]"
                          title={p.name}
                        >
                          <Film className="w-2.5 h-2.5 text-[#c6ff1f] shrink-0" />
                          <span className="truncate">{p.name}</span>
                        </span>
                      ))}
                      {batchProjects.length > 3 && (
                        <span className="text-[9px] text-white/40 font-mono">
                          +{batchProjects.length - 3} more
                        </span>
                      )}
                      <button
                        onClick={() => onManageGamesClick(batch)}
                        className="text-[9px] text-[#c6ff1f] hover:underline font-semibold ml-1 cursor-pointer"
                      >
                        [+/- Games]
                      </button>
                    </div>
                  </div>
                </div>

                {/* Col 2: Cumulative Tag Stats */}
                <div 
                  onClick={(e) => { e.stopPropagation(); onOpenBatchStats?.(batch); }}
                  className="min-w-0 p-1.5 rounded-lg hover:bg-white/[0.04] transition-colors cursor-pointer group/col2"
                  title="Click to view Batch Stats Page"
                >
                  <div className="flex items-center gap-1.5 mb-1 text-[10px] text-white/50 group-hover/col2:text-white/80 transition-colors">
                    <Activity className="w-3 h-3 text-[#c6ff1f]" />
                    <span className="font-bold text-white font-mono">{totalTags}</span>
                    <span>total events</span>
                    <span className="text-[9px] text-[#c6ff1f] opacity-0 group-hover/col2:opacity-100 transition-opacity ml-1">View Stats →</span>
                  </div>
                  {topTags.length > 0 ? (
                    <div className="flex items-center gap-1 flex-wrap">
                      {topTags.map((t, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 text-[9px] bg-white/[0.03] border border-white/5 px-1.5 py-0.5 rounded text-white/80"
                        >
                          <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: t.color }} />
                          <span className="truncate max-w-[70px]">{t.name}</span>
                          <span className="font-mono font-bold text-[#c6ff1f]">{t.count}</span>
                        </span>
                      ))}
                    </div>
                  ) : (
                    <span className="text-[10px] text-white/30 italic">No tags logged yet</span>
                  )}
                </div>

                {/* Col 3: Date */}
                <div className="text-[11px] text-white/40 font-mono whitespace-nowrap">
                  {new Date(batch.lastModified).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>

                {/* Col 4: Actions */}
                <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                  <button
                    onClick={(e) => { e.stopPropagation(); onManageGamesClick(batch); }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-colors cursor-pointer"
                    title="Add or remove games from this batch"
                  >
                    <Settings2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); onEditBatchClick(batch); }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/60 hover:text-white text-xs transition-colors cursor-pointer"
                    title="Edit batch name and description"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteBatchClick(batch.id); }}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-red-500/20 text-white/40 hover:text-red-400 text-xs transition-colors cursor-pointer"
                    title="Delete batch"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenBatchStats?.(batch); }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#c6ff1f] bg-[#c6ff1f]/10 hover:bg-[#c6ff1f]/20 border border-[#c6ff1f]/30 transition-colors cursor-pointer ml-1 shadow-sm"
                    title="View Batch Stats Page with tag and label breakdown and CSV export"
                  >
                    <Activity className="w-3 h-3" />
                    <span className="hidden sm:inline">Stats</span>
                  </button>

                  <button
                    onClick={(e) => { e.stopPropagation(); onOpenBatch(batch); }}
                    className="btn-glow inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-black shadow-sm shadow-[#c6ff1f]/20 cursor-pointer ml-1"
                  >
                    <span>Analyze</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Expanded Cards Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredBatches.map(batch => {
            const batchProjects = projects.filter(p => batch.projectIds?.includes(p.id));
            let totalTags = 0;
            const tagCounts = new Map<string, { count: number; name: string; color: string }>();

            batchProjects.forEach(proj => {
              const evts = proj.data?.tagEvents || [];
              const tags = proj.data?.tags || [];
              totalTags += evts.length;
              evts.forEach(e => {
                const t = tags.find(x => x.id === e.tagId);
                const name = t?.name || 'Tag';
                const color = t?.color || '#3b82f6';
                const curr = tagCounts.get(e.tagId);
                if (curr) curr.count += 1;
                else tagCounts.set(e.tagId, { count: 1, name, color });
              });
            });

            const sortedTags = Array.from(tagCounts.values()).sort((a, b) => b.count - a.count);
            const topTags = sortedTags.slice(0, 6);

            return (
              <div
                key={batch.id}
                className="bg-[#121217]/90 border border-white/10 hover:border-[#c6ff1f]/40 rounded-2xl p-5 shadow-xl transition-all duration-200 flex flex-col justify-between group hover:shadow-2xl hover:shadow-[#c6ff1f]/5"
              >
                {/* Top Section */}
                <div>
                  {/* Badge & Star */}
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <div className="flex items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#c6ff1f] bg-[#c6ff1f]/10 border border-[#c6ff1f]/20 px-2 py-0.5 rounded-full">
                        <Layers className="w-3 h-3" /> Batch
                      </span>
                      <span className="text-[10px] font-mono text-white/50 bg-white/5 px-2 py-0.5 rounded-full border border-white/5">
                        {batchProjects.length} {batchProjects.length === 1 ? 'game' : 'games'}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => onToggleBatchFavourite(batch)}
                        className={`p-1 rounded-lg hover:bg-white/10 transition-colors ${
                          batch.favourite ? 'text-amber-400' : 'text-white/20 hover:text-white/60'
                        }`}
                        title={batch.favourite ? 'Remove from starred' : 'Add to starred'}
                      >
                        <Star className={`w-4 h-4 ${batch.favourite ? 'fill-current' : ''}`} />
                      </button>

                      <button
                        onClick={() => onEditBatchClick(batch)}
                        className="p-1 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors"
                        title="Edit batch name & description"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => onDeleteBatchClick(batch.id)}
                        className="p-1 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                        title="Delete batch"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Batch Title */}
                  <h3
                    onClick={() => onOpenBatch(batch)}
                    className="text-base font-bold text-white hover:text-[#c6ff1f] cursor-pointer transition-colors leading-tight mb-1"
                  >
                    {batch.name}
                  </h3>

                  {batch.description ? (
                    <p className="text-xs text-white/60 leading-relaxed mb-3 line-clamp-2">
                      {batch.description}
                    </p>
                  ) : (
                    <p className="text-xs text-white/30 italic mb-3">No description provided</p>
                  )}

                  {/* Included Games List */}
                  <div className="mb-4">
                    <div className="flex items-center justify-between text-[10px] text-white/50 mb-1.5 font-semibold uppercase tracking-wider">
                      <span>Batched Games</span>
                      <button
                        onClick={() => onManageGamesClick(batch)}
                        className="text-[#c6ff1f] hover:underline normal-case tracking-normal font-semibold cursor-pointer"
                      >
                        Manage Games
                      </button>
                    </div>

                    <div className="space-y-1 max-h-24 overflow-y-auto custom-scrollbar pr-0.5">
                      {batchProjects.length === 0 ? (
                        <div className="text-[11px] text-white/30 italic py-1">
                          No games added yet. Click 'Manage Games' to add games.
                        </div>
                      ) : (
                        batchProjects.map(proj => (
                          <div
                            key={proj.id}
                            className="flex items-center justify-between px-2 py-1 rounded-lg bg-white/[0.03] border border-white/5 text-xs text-white/80"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <Film className="w-3 h-3 text-[#c6ff1f] shrink-0" />
                              <span className="truncate text-[11px]">{proj.name}</span>
                            </div>
                            <span className="text-[10px] font-mono text-white/40 shrink-0 ml-1">
                              {proj.data?.tagEvents?.length || 0} tags
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Stats of Tags Section */}
                  <div 
                    onClick={(e) => { e.stopPropagation(); onOpenBatchStats?.(batch); }}
                    className="p-3 bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 hover:border-[#c6ff1f]/30 rounded-xl mb-4 transition-all cursor-pointer group/stats"
                    title="Click to view full Batch Stats Page"
                  >
                    <div className="flex items-center justify-between text-xs mb-2">
                      <span className="text-white/50 group-hover/stats:text-white font-semibold text-[10px] uppercase tracking-wider flex items-center gap-1 transition-colors">
                        <Activity className="w-3 h-3 text-[#c6ff1f]" /> Cumulative Tag Stats
                      </span>
                      <span className="text-xs font-bold text-[#c6ff1f] font-mono group-hover/stats:underline">{totalTags} tags →</span>
                    </div>

                    {topTags.length > 0 ? (
                      <div className="grid grid-cols-2 gap-1.5">
                        {topTags.map((t, idx) => (
                          <div
                            key={idx}
                            className="flex items-center justify-between px-2 py-1 rounded bg-black/30 border border-white/5 text-[10px]"
                          >
                            <div className="flex items-center gap-1.5 truncate">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
                              <span className="truncate text-white/80">{t.name}</span>
                            </div>
                            <span className="font-mono font-bold text-[#c6ff1f] ml-1">{t.count}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-[10px] text-white/30 italic py-1 text-center">
                        No tags logged across games in this batch yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Footer Section */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between gap-2 mt-auto">
                  <span className="text-[10px] font-mono text-white/40">
                    Modified: {new Date(batch.lastModified).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenBatchStats?.(batch); }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold text-[#c6ff1f] bg-[#c6ff1f]/10 hover:bg-[#c6ff1f]/20 border border-[#c6ff1f]/30 transition-colors cursor-pointer"
                      title="Open dedicated Batch Stats Page"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Stats Page</span>
                    </button>

                    <button
                      onClick={(e) => { e.stopPropagation(); onOpenBatch(batch); }}
                      className="btn-glow inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold text-black shadow-md shadow-[#c6ff1f]/20 cursor-pointer"
                    >
                      <span>Analyze</span>
                      <ArrowRight className="w-3.5 h-3.5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
