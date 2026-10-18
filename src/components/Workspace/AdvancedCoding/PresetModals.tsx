import React from 'react';
import { Save, Plus, X, FolderOpen, Check, Edit2, Trash2 } from 'lucide-react';
import { AdvancedPadItem } from '../../../types';

interface PresetModalsProps {
  showSaveChoiceModal: boolean;
  setShowSaveChoiceModal: (show: boolean) => void;
  showSaveModal: boolean;
  setShowSaveModal: (show: boolean) => void;
  presetName: string;
  setPresetName: (name: string) => void;
  currentProjectName: string | null;
  savePreset: (forceOverwrite?: boolean, specificName?: string) => void;
  confirmOverwrite: { name: string; items: AdvancedPadItem[] } | null;
  setConfirmOverwrite: (val: { name: string; items: AdvancedPadItem[] } | null) => void;
  showLoadModal: boolean;
  setShowLoadModal: (show: boolean) => void;
  savedPresets: { name: string; items: AdvancedPadItem[] }[];
  loadPreset: (preset: { name: string; items: AdvancedPadItem[] }) => void;
  renamingProject: { oldName: string; newName: string } | null;
  setRenamingProject: (val: { oldName: string; newName: string } | null) => void;
  executeRename: (e?: React.MouseEvent) => void;
  initiateRename: (name: string, e: React.MouseEvent) => void;
  initiateDelete: (name: string, e: React.MouseEvent) => void;
  confirmDelete: string | null;
  setConfirmDelete: (name: string | null) => void;
  executeDelete: () => void;
}

export const PresetModals: React.FC<PresetModalsProps> = ({
  showSaveChoiceModal,
  setShowSaveChoiceModal,
  showSaveModal,
  setShowSaveModal,
  presetName,
  setPresetName,
  currentProjectName,
  savePreset,
  confirmOverwrite,
  setConfirmOverwrite,
  showLoadModal,
  setShowLoadModal,
  savedPresets,
  loadPreset,
  renamingProject,
  setRenamingProject,
  executeRename,
  initiateRename,
  initiateDelete,
  confirmDelete,
  setConfirmDelete,
  executeDelete,
}) => {
  return (
    <>
      {/* Save Choice Modal */}
      {showSaveChoiceModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-[#333] rounded-xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-[#c6ff1f]/10 flex items-center justify-center shrink-0">
                <Save className="w-5 h-5 text-[#c6ff1f]" />
              </div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Save Options</h3>
            </div>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              You are currently working on <strong className="text-white">"{currentProjectName}"</strong>. Do you want to overwrite it, or save this as a new file?
            </p>
            <div className="flex flex-col gap-3">
              <button 
                onClick={() => savePreset(true, currentProjectName!)} 
                className="w-full px-4 py-3 bg-[#222] hover:bg-[#333] border border-[#444] text-white text-sm font-bold rounded flex items-center justify-center gap-2 transition-colors"
              >
                <Save className="w-4 h-4" /> Overwrite "{currentProjectName}"
              </button>
              <button 
                onClick={() => {
                  setShowSaveChoiceModal(false);
                  setPresetName('');
                  setShowSaveModal(true);
                }} 
                className="w-full px-4 py-3 bg-[#c6ff1f] hover:bg-[#b3e61c] text-black text-sm font-bold rounded flex items-center justify-center gap-2 transition-colors"
              >
                <Plus className="w-4 h-4" /> Save as New File
              </button>
              <button 
                onClick={() => setShowSaveChoiceModal(false)} 
                className="mt-2 text-xs font-bold text-gray-500 hover:text-white"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save Modal */}
      {showSaveModal && !confirmOverwrite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-[#333] rounded-xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Save Pad File</h3>
              <button onClick={() => setShowSaveModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="mb-4">
              <label className="text-xs text-gray-400 block mb-1">Pad File Name</label>
              <input 
                type="text" 
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="w-full bg-[#111] border border-[#333] rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-[#c6ff1f]"
                placeholder="My Awesome Layout"
                autoFocus
                onKeyDown={e => { if (e.key === 'Enter') savePreset(false); }}
              />
            </div>
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowSaveModal(false)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white">Cancel</button>
              <button onClick={() => savePreset(false)} disabled={!presetName.trim()} className="px-4 py-2 bg-[#c6ff1f] hover:bg-[#b3e61c] text-black text-xs font-bold rounded disabled:opacity-50">Save File</button>
            </div>
          </div>
        </div>
      )}

      {/* Overwrite Confirmation */}
      {confirmOverwrite && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[210] flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-orange-500/50 rounded-xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4 text-orange-500">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0">
                <Save className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Overwrite File?</h3>
            </div>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              A pad file named <strong className="text-white">"{confirmOverwrite.name}"</strong> already exists. Do you want to overwrite it with your current layout?
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmOverwrite(null)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white bg-[#222] hover:bg-[#333] rounded">Cancel</button>
              <button onClick={() => savePreset(true)} className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold rounded">Overwrite</button>
            </div>
          </div>
        </div>
      )}

      {/* Load Modal */}
      {showLoadModal && !confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4" onClick={() => setShowLoadModal(false)}>
          <div className="bg-[#161616] border border-[#333] rounded-xl w-full max-w-md p-6 shadow-2xl flex flex-col max-h-[80vh]" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-4 shrink-0">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <FolderOpen className="w-4 h-4 text-[#c6ff1f]" /> Load Pad File
              </h3>
              <button onClick={() => setShowLoadModal(false)} className="text-gray-500 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="flex-1 overflow-auto min-h-0 space-y-2">
              {savedPresets.length === 0 ? (
                <div className="text-center py-8 text-gray-500 text-sm">No saved pads found.</div>
              ) : (
                savedPresets.map(preset => (
                  <div 
                    key={preset.name} 
                    onClick={() => loadPreset(preset)} 
                    className="flex items-center justify-between p-3 bg-[#111] border border-[#222] hover:border-[#c6ff1f]/50 rounded-lg cursor-pointer group transition-colors"
                  >
                    {renamingProject?.oldName === preset.name ? (
                      <div className="flex-1 flex items-center gap-2 mr-2" onClick={e => e.stopPropagation()}>
                        <input 
                          type="text" 
                          value={renamingProject.newName}
                          onChange={e => setRenamingProject({ ...renamingProject, newName: e.target.value })}
                          className="flex-1 bg-[#222] border border-[#444] rounded px-2 py-1 text-sm text-white focus:outline-none focus:border-[#c6ff1f]"
                          autoFocus
                          onKeyDown={e => { 
                            if (e.key === 'Enter') executeRename(e as any); 
                            if (e.key === 'Escape') setRenamingProject(null); 
                          }}
                        />
                        <button onClick={executeRename as any} className="text-[#c6ff1f] hover:text-[#b3e61c] p-1">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={(e) => { e.stopPropagation(); setRenamingProject(null); }} className="text-gray-500 hover:text-white p-1">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col">
                          <span className="text-sm font-medium text-white flex items-center gap-2">
                            {preset.name}
                            {currentProjectName === preset.name && (
                              <span className="text-[10px] bg-[#c6ff1f]/20 text-[#c6ff1f] px-1.5 py-0.5 rounded font-bold uppercase">Current</span>
                            )}
                          </span>
                          <span className="text-xs text-gray-500">{preset.items.length} items</span>
                        </div>
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              initiateRename(preset.name, e);
                            }}
                            className="text-gray-500 hover:text-white p-2 rounded hover:bg-[#222]"
                            title="Rename Pad"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              initiateDelete(preset.name, e);
                            }}
                            className="text-gray-500 hover:text-red-500 p-2 rounded hover:bg-[#222]"
                            title="Delete Pad"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[210] flex items-center justify-center p-4">
          <div className="bg-[#161616] border border-red-500/50 rounded-xl w-full max-w-sm p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4 text-red-500">
              <div className="w-10 h-10 rounded-full bg-red-500/10 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold uppercase tracking-wider">Delete File?</h3>
            </div>
            <p className="text-sm text-gray-300 mb-6 leading-relaxed">
              Are you sure you want to permanently delete the pad file <strong className="text-white">"{confirmDelete}"</strong>? This cannot be undone.
            </p>
            <div className="flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-xs font-bold text-gray-400 hover:text-white bg-[#222] hover:bg-[#333] rounded">Cancel</button>
              <button onClick={executeDelete} className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white text-xs font-bold rounded">Delete</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
