import React, { useState } from 'react';
import { X, Check, Search, Activity, Layers, Plus, Trash2 } from 'lucide-react';
import type { Project, Batch } from '../../types';

interface ManageBatchGamesModalProps {
  isOpen: boolean;
  batch: Batch;
  allProjects: Project[];
  onClose: () => void;
  onUpdateBatchGames: (batchId: string, updatedProjectIds: string[]) => void;
}

export const ManageBatchGamesModal: React.FC<ManageBatchGamesModalProps> = ({
  isOpen,
  batch,
  allProjects,
  onClose,
  onUpdateBatchGames,
}) => {
  const [selectedIds, setSelectedIds] = useState<string[]>(batch.projectIds || []);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const toggleGame = (id: string) => {
    setSelectedIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleSave = () => {
    onUpdateBatchGames(batch.id, selectedIds);
    onClose();
  };

  const filteredProjects = allProjects.filter(p => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.fileName && p.fileName.toLowerCase().includes(q));
  });

  // Calculate cumulative stats for selected games
  const selectedGames = allProjects.filter(p => selectedIds.includes(p.id));
  const totalTagsInBatch = selectedGames.reduce((acc, p) => acc + (p.data?.tagEvents?.length || 0), 0);

  return (
    <div 
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div 
        className="bg-[#121217] border border-white/15 rounded-2xl shadow-2xl max-w-lg w-full p-6 text-left relative flex flex-col max-h-[88vh]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#c6ff1f] bg-[#c6ff1f]/10 border border-[#c6ff1f]/20 px-2 py-0.5 rounded-full">
                Manage Batch Games
              </span>
              <span className="text-[11px] text-white/50">• {selectedIds.length} games</span>
            </div>
            <h2 className="text-base font-bold text-white leading-tight">{batch.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Stats Summary Bar */}
        <div className="py-2.5 px-3 bg-white/[0.03] border border-white/10 rounded-xl my-3 flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#c6ff1f]" />
            <span className="text-white/60">Batched Matches:</span>
            <span className="font-bold text-white font-mono">{selectedIds.length}</span>
          </div>
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#c6ff1f]" />
            <span className="text-white/60">Total Cumulative Tags:</span>
            <span className="font-bold text-[#c6ff1f] font-mono">{totalTagsInBatch}</span>
          </div>
        </div>

        {/* Search & Actions */}
        <div className="flex items-center gap-2 mb-2 shrink-0">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              aria-label="Search games"
              placeholder="Search games to add or remove..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full bg-white/[0.04] focus:bg-white/[0.08] border border-white/10 focus:border-[#c6ff1f]/50 rounded-lg pl-9 pr-3 py-1.5 text-xs text-white placeholder:text-white/35 outline-none transition-all"
            />
          </div>
          <button
            type="button"
            onClick={() => setSelectedIds(allProjects.map(p => p.id))}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] border border-white/10 transition-colors shrink-0"
          >
            Select All
          </button>
          <button
            type="button"
            onClick={() => setSelectedIds([])}
            className="px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-[11px] border border-white/10 transition-colors shrink-0"
          >
            Clear
          </button>
        </div>

        {/* Games List */}
        <div className="flex-1 overflow-y-auto space-y-1.5 pr-0.5 custom-scrollbar min-h-0">
          {filteredProjects.length === 0 ? (
            <div className="text-center py-10 text-white/40 text-xs">
              No matching games found.
            </div>
          ) : (
            filteredProjects.map(proj => {
              const isInBatch = selectedIds.includes(proj.id);
              const tagCount = proj.data?.tagEvents?.length || 0;
              return (
                <div
                  key={proj.id}
                  onClick={() => toggleGame(proj.id)}
                  className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all border ${
                    isInBatch
                      ? 'bg-[#c6ff1f]/10 border-[#c6ff1f]/40 shadow-sm shadow-[#c6ff1f]/5'
                      : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.05]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                      isInBatch ? 'bg-[#c6ff1f] border-[#c6ff1f] text-black' : 'border-white/30 bg-black/20'
                    }`}>
                      {isInBatch && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-semibold text-white truncate leading-tight">{proj.name}</p>
                        {isInBatch && (
                          <span className="text-[9px] font-bold text-[#c6ff1f] bg-[#c6ff1f]/15 px-1.5 py-0.2 rounded">In Batch</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-white/40 mt-0.5">
                        <span className="truncate max-w-[150px]">{proj.fileName || 'No video'}</span>
                        <span>•</span>
                        <span className="text-[#c6ff1f] flex items-center gap-0.5">
                          <Activity className="w-2.5 h-2.5" />
                          {tagCount} tags
                        </span>
                      </div>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono text-white/40 shrink-0 ml-2">
                    {new Date(proj.lastModified).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between gap-3 pt-3 border-t border-white/10 mt-3 shrink-0">
          <span className="text-xs text-white/50">
            {selectedIds.length} of {allProjects.length} games selected
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="btn-glow inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-black shadow-md shadow-[#c6ff1f]/20 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save Batch Changes</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
