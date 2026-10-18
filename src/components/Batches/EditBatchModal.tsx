import React, { useState } from 'react';
import { X, Layers, Check } from 'lucide-react';
import type { Batch } from '../../types';

interface EditBatchModalProps {
  isOpen: boolean;
  batch: Batch;
  onClose: () => void;
  onSaveBatch: (updatedBatch: Batch) => void;
}

export const EditBatchModal: React.FC<EditBatchModalProps> = ({
  isOpen,
  batch,
  onClose,
  onSaveBatch,
}) => {
  const [name, setName] = useState(batch.name);
  const [description, setDescription] = useState(batch.description || '');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSaveBatch({
      ...batch,
      name: name.trim(),
      description: description.trim(),
      lastModified: Date.now(),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-[#121217] border border-white/15 rounded-2xl shadow-2xl max-w-md w-full p-6 text-left relative"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-4 pb-3 border-b border-white/10 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c6ff1f]/15 border border-[#c6ff1f]/30 flex items-center justify-center text-[#c6ff1f]">
              <Layers className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white leading-tight">Edit Batch Details</h2>
              <p className="text-[11px] text-white/50">Update batch name and tactical notes</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-semibold text-white/80 block mb-1">
              Batch Name <span className="text-[#c6ff1f]">*</span>
            </label>
            <input
              type="text"
              required
              autoFocus
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
              rows={3}
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full bg-white/[0.04] focus:bg-white/[0.07] border border-white/10 focus:border-[#c6ff1f]/60 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 outline-none resize-none transition-all"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg text-xs text-white/60 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="btn-glow inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-semibold text-black shadow-md shadow-[#c6ff1f]/20 cursor-pointer"
            >
              <Check className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>Save Changes</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
