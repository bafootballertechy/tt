import React, { useState } from 'react';
import { X, LayoutGrid, Sparkles } from 'lucide-react';
import { createDefaultBoardProject } from './boardProjectUtils';
import type { BoardProject } from '../../types';

interface NewBoardProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreateBoardProject: (project: BoardProject) => void;
}

export const NewBoardProjectModal: React.FC<NewBoardProjectModalProps> = ({
  isOpen,
  onClose,
  onCreateBoardProject,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const finalName = name.trim() || `Tactical Board #${Math.floor(Math.random() * 900 + 100)}`;
    const newProject = createDefaultBoardProject(
      finalName,
      description
    );
    onCreateBoardProject(newProject);
    setName('');
    setDescription('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div 
        className="bg-[#121217] border border-white/15 rounded-2xl shadow-2xl max-w-md w-full p-6 text-left relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#c6ff1f]/10 border border-[#c6ff1f]/20 flex items-center justify-center text-[#c6ff1f] shadow-inner">
              <LayoutGrid className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">New Board Project</h2>
              <p className="text-xs text-white/50 mt-0.5">Create a tactical workspace to build out your tactics</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
            title="Close dialog"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body - Only Title & Description */}
        <form onSubmit={handleSubmit} className="space-y-4 pt-4">
          {/* Project Title */}
          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1.5">
              Project Title <span className="text-[#c6ff1f]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Build-up vs 4-4-2, Corner Routine"
              className="w-full bg-white/[0.04] focus:bg-white/[0.07] border border-white/15 focus:border-[#c6ff1f]/70 rounded-xl px-3.5 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none transition-all shadow-inner"
            />
          </div>

          {/* Description */}
          <div>
            <label className="text-xs font-semibold text-white/70 block mb-1.5">
              Description <span className="text-white/30 font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Add key objectives, coaching notes, or tactical instructions..."
              className="w-full bg-white/[0.04] focus:bg-white/[0.07] border border-white/15 focus:border-[#c6ff1f]/70 rounded-xl px-3.5 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none transition-all resize-none shadow-inner"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-white/70 hover:text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-glow px-5 py-2 rounded-xl text-black text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#c6ff1f]/20 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Create Project</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
