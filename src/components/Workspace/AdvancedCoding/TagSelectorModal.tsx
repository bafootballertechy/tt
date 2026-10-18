import React, { useState } from 'react';
import { Tags, X, Search, Sparkles, Plus, Settings2 } from 'lucide-react';
import { Tag as TagData, AdvancedPadItem } from '../../../types';

interface TagSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  tags: TagData[];
  setTags?: React.Dispatch<React.SetStateAction<TagData[]>>;
  onAddTag?: (tag: TagData) => void;
  items: AdvancedPadItem[];
  addTagToPad: (tag: TagData) => void;
  addAllMissingTagsToPad: () => void;
  onOpenTagSettings?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TagSelectorModal: React.FC<TagSelectorModalProps> = ({
  isOpen,
  onClose,
  tags,
  setTags,
  onAddTag,
  items,
  addTagToPad,
  addAllMissingTagsToPad,
  onOpenTagSettings,
  showToast,
}) => {
  const [tagSearchTerm, setTagSearchTerm] = useState('');
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#c6ff1f');
  const [newTagShortcut, setNewTagShortcut] = useState('');

  if (!isOpen) return null;

  const handleCreateCustomTag = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedName = newTagName.trim();
    if (!trimmedName) {
      showToast("Please enter a tag name.", 'error');
      return;
    }

    const newTagId = `tag-${Date.now()}`;
    const newTag: TagData = {
      id: newTagId,
      name: trimmedName,
      color: newTagColor,
      shortcut: newTagShortcut.trim().toUpperCase().slice(0, 2),
      leadLagEnabled: false,
      preTime: 10,
      postTime: 10
    };

    if (setTags) {
      setTags(prev => [...prev, newTag]);
    } else if (onAddTag) {
      onAddTag(newTag);
    }

    addTagToPad(newTag);
    setNewTagName('');
    setNewTagShortcut('');
  };

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[250] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150" 
      onClick={onClose}
    >
      <div 
        className="bg-[#161616] border border-[#333] rounded-2xl shadow-2xl w-full max-w-xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#111]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c6ff1f]/10 flex items-center justify-center text-[#c6ff1f]">
              <Tags className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Add Tags to Pad</h3>
              <p className="text-[10px] text-gray-400">Click a tag to place it on the pad canvas, or create a new tag</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-[#222] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Search and Action Bar */}
        <div className="p-3 border-b border-[#222] flex items-center justify-between gap-2 bg-[#141414]">
          <div className="flex-1 relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text"
              value={tagSearchTerm}
              onChange={e => setTagSearchTerm(e.target.value)}
              placeholder="Search project tags..."
              className="w-full bg-[#1c1c1c] border border-[#333] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-[#c6ff1f] outline-none"
            />
          </div>
          <button 
            onClick={() => {
              addAllMissingTagsToPad();
              onClose();
            }}
            className="px-3 py-1.5 bg-[#c6ff1f]/10 hover:bg-[#c6ff1f]/20 border border-[#c6ff1f]/30 rounded-lg text-xs font-bold text-[#c6ff1f] flex items-center gap-1.5 transition-colors shrink-0"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Place All Unplaced</span>
          </button>
        </div>

        {/* Tags Grid */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[40vh]">
          <div>
            <div className="text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">
              Project Tags ({tags.length})
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {tags
                .filter(t => !tagSearchTerm.trim() || t.name.toLowerCase().includes(tagSearchTerm.toLowerCase()))
                .map(tag => {
                  const isPlaced = items.some(i => i.id === tag.id);
                  return (
                    <button
                      key={tag.id}
                      onClick={() => {
                        addTagToPad(tag);
                        onClose();
                      }}
                      className={`p-2.5 rounded-xl border text-left transition-all flex flex-col justify-between h-20 group relative overflow-hidden ${
                        isPlaced 
                          ? 'border-[#333] bg-[#111] hover:border-gray-500' 
                          : 'border-[#444] bg-[#1a1a1a] hover:border-[#c6ff1f] hover:scale-[1.02] shadow-sm'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <div className="w-3.5 h-3.5 rounded-full border border-white/20 shadow-xs shrink-0" style={{ backgroundColor: tag.color }} />
                        {tag.shortcut && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#2a2a2a] text-gray-300 border border-[#3a3a3a]">
                            {tag.shortcut}
                          </span>
                        )}
                      </div>
                      <div className="font-bold text-xs text-white truncate group-hover:text-[#c6ff1f] transition-colors">
                        {tag.name}
                      </div>
                      <div className="text-[9px] flex items-center justify-between text-gray-400 mt-1">
                        <span>{tag.leadLagEnabled ? `-${tag.preTime}s/+${tag.postTime}s` : 'Manual'}</span>
                        <span className={`px-1 rounded text-[8px] font-bold ${isPlaced ? 'text-gray-500 bg-[#222]' : 'text-[#c6ff1f] bg-[#c6ff1f]/10'}`}>
                          {isPlaced ? 'Placed' : '+ Place'}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </div>
        </div>

        {/* Create New Tag Section */}
        <form onSubmit={handleCreateCustomTag} className="p-4 border-t border-[#222] bg-[#111] space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <Plus className="w-3.5 h-3.5 text-[#c6ff1f]" />
            <span>Create & Add New Tag</span>
          </div>
          
          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-6 sm:col-span-5">
              <input 
                type="text" 
                value={newTagName} 
                onChange={e => setNewTagName(e.target.value)}
                placeholder="Tag Name (e.g. Counter Attack)"
                className="w-full bg-[#1c1c1c] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-[#c6ff1f] outline-none"
              />
            </div>
            <div className="col-span-3 sm:col-span-2 flex items-center gap-2">
              <input 
                type="color" 
                value={newTagColor} 
                onChange={e => setNewTagColor(e.target.value)}
                className="w-7 h-7 rounded-lg cursor-pointer bg-transparent border-0 p-0"
                title="Tag Color"
              />
              <input 
                type="text" 
                maxLength={2} 
                value={newTagShortcut} 
                onChange={e => setNewTagShortcut(e.target.value.toUpperCase())}
                placeholder="Key"
                className="w-9 text-center bg-[#1c1c1c] border border-[#333] rounded-lg py-1.5 text-xs text-white font-mono uppercase focus:border-[#c6ff1f] outline-none"
                title="Hotkey"
              />
            </div>
            <div className="col-span-3 sm:col-span-5 flex justify-end gap-2">
              <button 
                type="submit"
                disabled={!newTagName.trim()}
                className="px-3 py-1.5 bg-[#c6ff1f] hover:bg-[#b3e61c] text-black text-xs font-bold rounded-lg disabled:opacity-40 transition-colors shadow-sm flex items-center gap-1 shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create & Place</span>
              </button>
            </div>
          </div>
        </form>

        {/* Footer with Code Window link */}
        {onOpenTagSettings && (
          <div className="p-3 border-t border-[#222] bg-[#0c0c0c] flex items-center justify-between text-xs">
            <span className="text-gray-400">Need to batch edit hotkeys or buffer times?</span>
            <button 
              type="button"
              onClick={() => {
                onClose();
                onOpenTagSettings();
              }}
              className="text-[#c6ff1f] hover:underline font-bold flex items-center gap-1"
            >
              <Settings2 className="w-3 h-3" />
              Open Code Window
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
