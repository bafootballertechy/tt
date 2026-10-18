import React, { useState } from 'react';
import { X, Layers, Plus, Check, Search, Film, Calendar, Activity } from 'lucide-react';
import type { Project, Batch } from '../../types';

interface NewBatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  projects: Project[];
  onCreateBatch: (batchData: { name: string; description: string; projectIds: string[] }) => void;
}

export const NewBatchModal: React.FC<NewBatchModalProps> = ({
  isOpen,
  onClose,
  projects,
  onCreateBatch,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  if (!isOpen) return null;

  const toggleSelectProject = (id: string) => {
    setSelectedProjectIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedProjectIds(filteredProjects.map(p => p.id));
  };

  const clearAll = () => {
    setSelectedProjectIds([]);
  };

  const filteredProjects = projects.filter(p => {
    if (!searchTerm.trim()) return true;
    const q = searchTerm.toLowerCase();
    return p.name.toLowerCase().includes(q) || (p.fileName && p.fileName.toLowerCase().includes(q));
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onCreateBatch({
      name: name.trim(),
      description: description.trim(),
      projectIds: selectedProjectIds,
    });

    setName('');
    setDescription('');
    setSelectedProjectIds([]);
    onClose();
  };

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
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c6ff1f]/15 border border-[#c6ff1f]/30 flex items-center justify-center text-[#c6ff1f]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Create Game Batch</h2>
              <p className="text-[11px] text-white/50">Bundle multiple matches into a single project for cross-match analysis & playlist creation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto py-3 space-y-3.5 pr-0.5 custom-scrollbar">
          <div>
            <label className="text-xs font-semibold text-white/80 block mb-1">
              Batch Name <span className="text-[#c6ff1f]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              placeholder="e.g. 2026 Club Season, Opponent Scouting, Away Matches"
              value={name}
              onChange={e => setName(e.target.value)}
              className="w-full bg-white/[0.04] focus:bg-white/[0.07] border border-white/10 focus:border-[#c6ff1f]/60 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none transition-all"
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-white/80 block mb-1">
              Description / Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Focus on defensive transitions and set-piece performance across Q1 fixtures..."
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white/[0.04] focus:bg-white/[0.07] border border-white/10 focus:border-[#c6ff1f]/60 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none resize-none transition-all"
            />
          </div>

          {/* Select Games Section */}
          <div className="pt-1">
            <div className="flex items-center justify-between gap-2 mb-2">
              <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                <span>Select Games to Include</span>
                <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-[#c6ff1f]/20 text-[#c6ff1f] font-bold">
                  {selectedProjectIds.length} selected
                </span>
              </label>
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  Select All
                </button>
                <span className="text-white/20">•</span>
                <button
                  type="button"
                  onClick={clearAll}
                  className="text-white/50 hover:text-white transition-colors"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Filter */}
            <div className="relative mb-2">
              <Search className="w-3 h-3 text-white/40 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                placeholder="Search games by name or file..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full bg-white/[0.03] border border-white/10 rounded-lg pl-7 pr-3 py-1 text-[11px] text-white placeholder:text-white/30 outline-none focus:border-[#c6ff1f]/40"
              />
            </div>

            {/* Game List */}
            <div className="max-h-48 overflow-y-auto space-y-1 bg-white/[0.02] border border-white/10 rounded-xl p-1.5 custom-scrollbar">
              {filteredProjects.length === 0 ? (
                <div className="text-center py-6 text-white/40 text-xs">
                  {projects.length === 0 ? 'No games created yet. Create a game project first.' : 'No matching games found.'}
                </div>
              ) : (
                filteredProjects.map(project => {
                  const isChecked = selectedProjectIds.includes(project.id);
                  const tagCount = project.data?.tagEvents?.length || 0;
                  return (
                    <div
                      key={project.id}
                      onClick={() => toggleSelectProject(project.id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer transition-all border ${
                        isChecked 
                          ? 'bg-[#c6ff1f]/10 border-[#c6ff1f]/40 text-white' 
                          : 'bg-white/[0.02] border-white/5 text-white/70 hover:bg-white/[0.05] hover:text-white'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors shrink-0 ${
                          isChecked ? 'bg-[#c6ff1f] border-[#c6ff1f] text-black' : 'border-white/30 bg-black/20'
                        }`}>
                          {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold truncate leading-tight">{project.name}</p>
                          <div className="flex items-center gap-2 text-[10px] text-white/40 mt-0.5">
                            <span className="truncate max-w-[140px]">{project.fileName || 'No video'}</span>
                            <span>•</span>
                            <span className="flex items-center gap-0.5 text-[#c6ff1f]">
                              <Activity className="w-2.5 h-2.5" />
                              {tagCount} tags
                            </span>
                          </div>
                        </div>
                      </div>

                      <span className="text-[10px] text-white/40 font-mono shrink-0 ml-2">
                        {new Date(project.lastModified).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10 mt-auto shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="btn-glow inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-black disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#c6ff1f]/20 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Batch</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
