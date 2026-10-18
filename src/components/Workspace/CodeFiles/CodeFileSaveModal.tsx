import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, AlertTriangle, X, Check, FilePlus } from 'lucide-react';
import { CodeFile } from '../../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentFileName: string;
  existingFiles: CodeFile[];
  tagsCount: number;
  labelsCount: number;
  padItemsCount: number;
  onConfirmSave: (name: string, isOverwrite: boolean) => void;
}

export const CodeFileSaveModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentFileName,
  existingFiles,
  tagsCount,
  labelsCount,
  padItemsCount,
  onConfirmSave
}) => {
  const [saveMode, setSaveMode] = useState<'overwrite' | 'new'>('overwrite');
  const [customName, setCustomName] = useState(currentFileName || 'My Custom Code File');

  if (!isOpen) return null;

  const matchedFile = existingFiles.find(
    f => f.name.toLowerCase() === currentFileName.toLowerCase()
  );
  const isBuiltIn = Boolean(matchedFile?.isBuiltIn);

  // If matched file is built-in, default to save as new custom file
  const effectiveMode = isBuiltIn ? 'new' : saveMode;

  const handleSave = () => {
    if (effectiveMode === 'overwrite' && matchedFile) {
      onConfirmSave(matchedFile.name, true);
    } else {
      const trimmed = customName.trim();
      if (!trimmed) return;
      onConfirmSave(trimmed, false);
    }
    onClose();
  };

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 bg-black/75 backdrop-blur-sm z-[220] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          transition={{ duration: 0.2 }}
          className="bg-[#141416] border border-[#2e2e38] rounded-xl w-full max-w-md overflow-hidden shadow-2xl text-gray-200"
          onClick={e => e.stopPropagation()}
        >
          {/* Header */}
          <div className="px-5 py-4 border-b border-[#25252c] flex items-center justify-between bg-[#19191e]">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#c6ff1f]/10 text-[#c6ff1f] border border-[#c6ff1f]/20">
                <Save className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-wide">
                  Save / Overwrite Code File
                </h3>
                <p className="text-[11px] text-gray-400">
                  Syncs tags, labels, and Advanced Coding Pad layout
                </p>
              </div>
            </div>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-white p-1 rounded-md hover:bg-[#25252e] transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Content */}
          <div className="p-5 space-y-4">
            {/* Summary card */}
            <div className="bg-[#1a1a20] rounded-lg p-3 border border-[#2c2c36] flex items-center justify-between text-xs">
              <span className="text-gray-400">Current Setup to Save:</span>
              <div className="flex items-center gap-2 font-mono text-[11px]">
                <span className="text-[#c6ff1f] font-bold">{tagsCount} tags</span>
                <span className="text-gray-600">•</span>
                <span className="text-[#00eaff] font-bold">{labelsCount} labels</span>
                <span className="text-gray-600">•</span>
                <span className="text-purple-400 font-bold">{padItemsCount} pad items</span>
              </div>
            </div>

            {/* If existing non-builtin file: choice between Overwrite or Save as New */}
            {!isBuiltIn && matchedFile && (
              <div className="space-y-3">
                {/* Overwrite Warning Banner */}
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/30 rounded-lg flex items-start gap-3 text-amber-300">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400 mt-0.5" />
                  <div className="text-xs space-y-1">
                    <p className="font-bold text-amber-200">
                      Overwrite Warning:
                    </p>
                    <p className="text-amber-300/90 leading-relaxed text-[11.5px]">
                      Saving will <span className="font-bold underline">overwrite</span> the existing saved Code File <span className="text-white font-mono bg-amber-950/60 px-1 py-0.5 rounded">"{matchedFile.name}"</span>. The saved tags, labels, and Advanced Coding Pad layout will be replaced with your current setup.
                    </p>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setSaveMode('overwrite')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      effectiveMode === 'overwrite'
                        ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                        : 'bg-[#1a1a20] border-[#2c2c36] text-gray-400 hover:text-white'
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Overwrite "{matchedFile.name}"</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSaveMode('new')}
                    className={`py-2 px-3 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                      effectiveMode === 'new'
                        ? 'bg-[#c6ff1f]/20 border-[#c6ff1f]/50 text-[#c6ff1f]'
                        : 'bg-[#1a1a20] border-[#2c2c36] text-gray-400 hover:text-white'
                    }`}
                  >
                    <FilePlus className="w-3.5 h-3.5" />
                    <span>Save as New File</span>
                  </button>
                </div>
              </div>
            )}

            {/* If built-in file */}
            {isBuiltIn && (
              <div className="p-3 bg-blue-500/10 border border-blue-500/25 rounded-lg flex items-start gap-2.5 text-blue-300 text-xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-blue-400 mt-0.5" />
                <p className="text-[11.5px] leading-relaxed">
                  <span className="font-bold text-white">"{currentFileName}"</span> is a built-in default Code File. Your changes will be saved as a new custom Code File so you can customize and reuse it anytime.
                </p>
              </div>
            )}

            {/* Input if saving as new or custom */}
            {(effectiveMode === 'new' || isBuiltIn || !matchedFile) && (
              <div className="space-y-1.5 pt-1">
                <label className="text-[11px] font-bold uppercase tracking-wider text-gray-400">
                  New Code File Name
                </label>
                <input
                  type="text"
                  value={customName}
                  onChange={e => setCustomName(e.target.value)}
                  placeholder="e.g. My Team Match Plan"
                  className="w-full px-3 py-2 bg-[#1a1a22] border border-[#333342] focus:border-[#c6ff1f] rounded-lg text-sm text-white placeholder-gray-500 outline-none transition-colors"
                  autoFocus
                />
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-3.5 bg-[#17171d] border-t border-[#25252c] flex items-center justify-end gap-2.5">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 rounded-lg border border-[#333342] text-xs font-semibold text-gray-300 hover:bg-[#22222a] hover:text-white transition-colors"
            >
              Cancel
            </button>

            {effectiveMode === 'overwrite' && matchedFile ? (
              <button
                onClick={handleSave}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-amber-500/20 transition-all"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Confirm Overwrite</span>
              </button>
            ) : (
              <button
                onClick={handleSave}
                disabled={!customName.trim()}
                className="px-4 py-1.5 rounded-lg bg-[#c6ff1f] hover:bg-[#b0e817] disabled:opacity-50 text-black text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-[#c6ff1f]/20 transition-all"
              >
                <Check className="w-3.5 h-3.5" />
                <span>Save Code File</span>
              </button>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
