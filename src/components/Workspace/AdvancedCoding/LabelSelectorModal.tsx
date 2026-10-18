import React, { useState } from 'react';
import { Folder, X, Search, Sparkles, Plus, FolderPlus } from 'lucide-react';
import { Label, LabelGroup, AdvancedPadItem } from '../../../types';

interface LabelSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  labels: Label[];
  labelGroups: LabelGroup[];
  setLabelGroups?: React.Dispatch<React.SetStateAction<LabelGroup[]>>;
  setLabels?: React.Dispatch<React.SetStateAction<Label[]>>;
  onAddLabel?: (label: Label) => void;
  items: AdvancedPadItem[];
  addLabelToPad: (label: Label) => void;
  addEntireGroupToPad: (group: { id: string; name: string }) => void;
  addAllMissingLabelsToPad: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const LabelSelectorModal: React.FC<LabelSelectorModalProps> = ({
  isOpen,
  onClose,
  labels,
  labelGroups,
  setLabelGroups,
  setLabels,
  onAddLabel,
  items,
  addLabelToPad,
  addEntireGroupToPad,
  addAllMissingLabelsToPad,
  showToast,
}) => {
  const [labelSearchTerm, setLabelSearchTerm] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState<string>('all');
  const [newCustomLabelName, setNewCustomLabelName] = useState('');
  const [newCustomLabelGroupId, setNewCustomLabelGroupId] = useState('');
  const [newCustomGroupName, setNewCustomGroupName] = useState('');
  const [isAddingNewGroup, setIsAddingNewGroup] = useState(false);

  if (!isOpen) return null;

  const handleCreateCustomLabel = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const trimmedInput = newCustomLabelName.trim();
    if (!trimmedInput) {
      showToast("Please enter a label name.", 'error');
      return;
    }

    const labelNames = trimmedInput.split(',').map(s => s.trim()).filter(Boolean);
    if (labelNames.length === 0) {
      showToast("Please enter a label name.", 'error');
      return;
    }

    let finalGroupId: string | undefined = newCustomLabelGroupId || undefined;

    if (isAddingNewGroup && newCustomGroupName.trim()) {
      const newGrpId = `group-${Date.now()}`;
      const newGrp: LabelGroup = { id: newGrpId, name: newCustomGroupName.trim() };
      if (setLabelGroups) {
        setLabelGroups(prev => [...prev, newGrp]);
      }
      finalGroupId = newGrpId;
    }

    const now = Date.now();
    const newLabels: Label[] = labelNames.map((name, idx) => ({
      id: `label-${now}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      groupId: finalGroupId
    }));

    if (setLabels) {
      setLabels(prev => [...prev, ...newLabels]);
    } else if (onAddLabel) {
      newLabels.forEach(l => onAddLabel(l));
    }

    // Place on the pad automatically
    newLabels.forEach((l) => {
      addLabelToPad(l);
    });

    setNewCustomLabelName('');
    setNewCustomGroupName('');
    setIsAddingNewGroup(false);
    onClose();
  };

  const groupsToDisplay = [
    ...labelGroups.filter(g => selectedGroupFilter === 'all' || selectedGroupFilter === g.id),
    ...(selectedGroupFilter === 'all' || selectedGroupFilter === 'ungrouped' ? [{ id: 'ungrouped', name: 'Ungrouped Labels' }] : [])
  ];

  const filteredGroups = groupsToDisplay.map(group => {
    const groupLabels = group.id === 'ungrouped'
      ? labels.filter(l => !l.groupId)
      : labels.filter(l => l.groupId === group.id);
    
    const matchingLabels = groupLabels.filter(l => 
      !labelSearchTerm.trim() || 
      l.name.toLowerCase().includes(labelSearchTerm.toLowerCase()) ||
      group.name.toLowerCase().includes(labelSearchTerm.toLowerCase())
    );

    return { group, labels: matchingLabels, totalCount: groupLabels.length };
  }).filter(item => item.labels.length > 0 || (!labelSearchTerm.trim() && item.totalCount > 0));

  return (
    <div 
      className="fixed inset-0 bg-black/70 backdrop-blur-xs z-[250] flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-150" 
      onClick={onClose}
    >
      <div 
        className="bg-[#161616] border border-[#333] rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-150" 
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 border-b border-[#222] flex items-center justify-between bg-[#111]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#c6ff1f]/10 flex items-center justify-center text-[#c6ff1f]">
              <Folder className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white tracking-wide uppercase">Group Labels (Normal Coding Sync)</h3>
              <p className="text-[10px] text-gray-400">Place individual labels or place entire groups onto the pad canvas</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="p-1 rounded-lg hover:bg-[#222] text-gray-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter and Action Bar */}
        <div className="p-3 border-b border-[#222] flex flex-wrap items-center justify-between gap-2 bg-[#141414]">
          <div className="flex-1 min-w-[200px] relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500" />
            <input 
              type="text"
              value={labelSearchTerm}
              onChange={e => setLabelSearchTerm(e.target.value)}
              placeholder="Search labels or groups..."
              className="w-full bg-[#1c1c1c] border border-[#333] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-[#c6ff1f] outline-none"
            />
          </div>
          <div className="flex items-center gap-2">
            <select 
              value={selectedGroupFilter}
              onChange={e => setSelectedGroupFilter(e.target.value)}
              className="bg-[#1c1c1c] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-gray-300 focus:border-[#c6ff1f] outline-none"
            >
              <option value="all">All Groups</option>
              {labelGroups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
              <option value="ungrouped">Ungrouped</option>
            </select>
            <button 
              onClick={() => {
                addAllMissingLabelsToPad();
                onClose();
              }}
              className="px-3 py-1.5 bg-[#c6ff1f]/10 hover:bg-[#c6ff1f]/20 border border-[#c6ff1f]/30 rounded-lg text-xs font-bold text-[#c6ff1f] flex items-center gap-1.5 transition-colors shrink-0"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Place All Unplaced</span>
            </button>
          </div>
        </div>

        {/* Groups & Labels List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[45vh] custom-scrollbar">
          {filteredGroups.length === 0 ? (
            <div className="text-center py-8 text-gray-500 text-xs">
              No group labels found matching your search. Create one below!
            </div>
          ) : (
            filteredGroups.map(({ group, labels: grpLabels }) => (
              <div key={group.id} className="p-3 bg-[#111] border border-[#222] rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Folder className="w-3.5 h-3.5 text-[#c6ff1f]" />
                    <span className="text-xs font-bold text-white uppercase tracking-wider">
                      {group.name}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">({grpLabels.length})</span>
                  </div>
                  <button 
                    onClick={() => {
                      addEntireGroupToPad(group);
                      onClose();
                    }}
                    className="px-2.5 py-1 bg-[#222] hover:bg-[#333] border border-[#3a3a3a] hover:border-[#c6ff1f]/50 rounded text-[10px] font-bold text-gray-300 hover:text-[#c6ff1f] flex items-center gap-1.5 transition-colors shadow-xs"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Place Entire Group</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {grpLabels.map(label => {
                    const isPlaced = items.some(i => i.id === label.id);
                    return (
                      <button
                        key={label.id}
                        onClick={() => {
                          addLabelToPad(label);
                          onClose();
                        }}
                        className={`p-2 rounded-lg border text-left transition-all flex items-center justify-between group ${
                          isPlaced 
                            ? 'border-[#333] bg-[#161616] hover:border-gray-500' 
                            : 'border-[#3a3a3a] bg-[#1a1a1a] hover:border-[#c6ff1f] hover:scale-[1.01]'
                        }`}
                      >
                        <div className="truncate mr-2">
                          <div className="text-xs font-medium text-white group-hover:text-[#c6ff1f] truncate">{label.name}</div>
                          <div className="text-[9px] text-gray-500 truncate">{group.name}</div>
                        </div>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded shrink-0 ${isPlaced ? 'text-gray-500 bg-[#222]' : 'text-[#c6ff1f] bg-[#c6ff1f]/10'}`}>
                          {isPlaced ? 'Placed' : '+ Place'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Create New Label & Group Form */}
        <form onSubmit={handleCreateCustomLabel} className="p-4 border-t border-[#222] bg-[#111] space-y-3">
          <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
            <FolderPlus className="w-3.5 h-3.5 text-[#c6ff1f]" />
            <span>Create New Label & Group (Syncs to Project)</span>
          </div>

          <div className="grid grid-cols-12 gap-2 items-center">
            <div className="col-span-12 sm:col-span-5">
              <input 
                type="text" 
                value={newCustomLabelName} 
                onChange={e => setNewCustomLabelName(e.target.value)}
                placeholder="Labels (e.g. Goal, On Target, Woodwork)"
                className="w-full bg-[#1c1c1c] border border-[#333] rounded-lg px-3 py-1.5 text-xs text-white placeholder-gray-500 focus:border-[#c6ff1f] outline-none"
              />
            </div>

            <div className="col-span-12 sm:col-span-4">
              {!isAddingNewGroup ? (
                <div className="flex items-center gap-1.5">
                  <select 
                    value={newCustomLabelGroupId}
                    onChange={e => {
                      if (e.target.value === '__NEW__') {
                        setIsAddingNewGroup(true);
                        setNewCustomLabelGroupId('');
                      } else {
                        setNewCustomLabelGroupId(e.target.value);
                      }
                    }}
                    className="w-full bg-[#1c1c1c] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs text-white focus:border-[#c6ff1f] outline-none"
                  >
                    <option value="">(Ungrouped)</option>
                    {labelGroups.map(g => (
                      <option key={g.id} value={g.id}>{g.name}</option>
                    ))}
                    <option value="__NEW__">+ New Group...</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input 
                    type="text" 
                    value={newCustomGroupName} 
                    onChange={e => setNewCustomGroupName(e.target.value)}
                    placeholder="New Group Name"
                    className="w-full bg-[#1c1c1c] border border-[#c6ff1f] rounded-lg px-2.5 py-1.5 text-xs text-white outline-none"
                    autoFocus
                  />
                  <button 
                    type="button"
                    onClick={() => setIsAddingNewGroup(false)}
                    className="p-1 text-gray-400 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            <div className="col-span-12 sm:col-span-3 flex justify-end">
              <button 
                type="submit"
                disabled={!newCustomLabelName.trim()}
                className="w-full sm:w-auto px-3 py-1.5 bg-[#c6ff1f] hover:bg-[#b3e61c] text-black text-xs font-bold rounded-lg disabled:opacity-40 transition-colors shadow-sm flex items-center justify-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Create & Place</span>
              </button>
            </div>

            <div className="col-span-12 text-[10px] text-gray-400">
              Tip: Separate multiple labels with commas (e.g. <span className="text-[#c6ff1f]">Goal, On Target, Header</span>) to create and place all of them at once.
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
