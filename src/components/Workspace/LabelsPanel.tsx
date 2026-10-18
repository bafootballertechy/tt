import React, { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Tag,
  Trash2,
  X,
  CheckSquare,
  FolderOpen,
  FileDown,
  FileUp,
  Plus,
  FolderPlus,
  Check,
  GripVertical,
  Edit2
} from 'lucide-react';
import type { Label, LabelGroup, TagEvent, ActiveRecording } from '../../types';

export interface LabelsPanelProps {
  labelsEnabled: boolean;
  isAdvancedCodingMode: boolean;
  labelsPanelWidth: number;
  isResizingLabelsPanel: boolean;
  setIsResizingLabelsPanel: (resizing: boolean) => void;
  isTaggingMode: boolean;
  isLabelsSelectMode: boolean;
  setIsLabelsSelectMode: (mode: boolean) => void;
  selectedLabelIds: Set<string>;
  setSelectedLabelIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedGroupIds: Set<string>;
  setSelectedGroupIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  handleBulkDeleteLabels: () => void;
  setShowNormalTemplateModal: (show: boolean) => void;
  importLabelsFromJSON: () => void;
  exportUnifiedSetupToJSON: () => void;
  labels: Label[];
  setLabels: React.Dispatch<React.SetStateAction<Label[]>>;
  labelGroups: LabelGroup[];
  setLabelGroups: React.Dispatch<React.SetStateAction<LabelGroup[]>>;
  editingLabelId: string | null;
  setEditingLabelId: (id: string | null) => void;
  editingGroupId: string | null;
  setEditingGroupId: (id: string | null) => void;
  tempLabel: Partial<Label>;
  setTempLabel: React.Dispatch<React.SetStateAction<Partial<Label>>>;
  tempGroup: Partial<LabelGroup>;
  setTempGroup: React.Dispatch<React.SetStateAction<Partial<LabelGroup>>>;
  draggedGroup: string | null;
  setDraggedGroup: (id: string | null) => void;
  draggedLabel: string | null;
  setDraggedLabel: (id: string | null) => void;
  activeRecordings: ActiveRecording[];
  selectedEventIds: Set<string>;
  tagEvents: TagEvent[];
  filterLabelId: string | null;
  handleLabelClick: (id: string) => void;
  showNotification: (msg: string, color?: string, onUndo?: () => void) => void;
}

export const LabelsPanel: React.FC<LabelsPanelProps> = ({
  labelsEnabled,
  isAdvancedCodingMode,
  labelsPanelWidth,
  isResizingLabelsPanel,
  setIsResizingLabelsPanel,
  isTaggingMode,
  isLabelsSelectMode,
  setIsLabelsSelectMode,
  selectedLabelIds,
  setSelectedLabelIds,
  selectedGroupIds,
  setSelectedGroupIds,
  handleBulkDeleteLabels,
  setShowNormalTemplateModal,
  importLabelsFromJSON,
  exportUnifiedSetupToJSON,
  labels,
  setLabels,
  labelGroups,
  setLabelGroups,
  editingLabelId,
  setEditingLabelId,
  editingGroupId,
  setEditingGroupId,
  tempLabel,
  setTempLabel,
  tempGroup,
  setTempGroup,
  draggedGroup,
  setDraggedGroup,
  draggedLabel,
  setDraggedLabel,
  activeRecordings,
  selectedEventIds,
  tagEvents,
  filterLabelId,
  handleLabelClick,
  showNotification
}) => {
  const [batchLabelInput, setBatchLabelInput] = useState('');
  const [batchTargetGroupId, setBatchTargetGroupId] = useState('');
  const [addingToGroupId, setAddingToGroupId] = useState<string | null>(null);
  const [groupInlineInput, setGroupInlineInput] = useState('');
  const [showAddLabelsSection, setShowAddLabelsSection] = useState(false);
  const batchInputRef = useRef<HTMLInputElement>(null);

  const handleAddBatchLabels = (targetGroupId?: string, textOverride?: string) => {
    const raw = (textOverride !== undefined ? textOverride : batchLabelInput).trim();
    const names = raw
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    if (names.length === 0) return;

    const resolvedGroupId = targetGroupId !== undefined ? targetGroupId : (batchTargetGroupId || undefined);
    const now = Date.now();
    const newLabels: Label[] = names.map((name, idx) => ({
      id: `label-${now}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
      name,
      groupId: resolvedGroupId ? resolvedGroupId : undefined,
    }));

    setLabels((prev) => [...prev, ...newLabels]);

    if (textOverride === undefined) {
      setBatchLabelInput('');
    }

    showNotification(
      `Added ${newLabels.length} label${newLabels.length > 1 ? 's' : ''}: ${names.join(', ')}`,
      '#c6ff1f'
    );
  };

  const saveEditedLabel = (label: Label) => {
    const raw = (tempLabel.name !== undefined ? tempLabel.name : label.name).trim();
    const names = raw.split(',').map((s) => s.trim()).filter(Boolean);

    if (names.length === 0) {
      setEditingLabelId(null);
      setTempLabel({});
      return;
    }

    if (names.length === 1) {
      setLabels((prev) =>
        prev.map((l) => (l.id === label.id ? ({ ...l, ...tempLabel, name: names[0] } as Label) : l))
      );
    } else {
      const now = Date.now();
      const additionalLabels: Label[] = names.slice(1).map((n, idx) => ({
        id: `label-${now}-${idx}-${Math.random().toString(36).substring(2, 6)}`,
        name: n,
        groupId: label.groupId,
      }));

      setLabels((prev) =>
        prev
          .map((l) => (l.id === label.id ? ({ ...l, ...tempLabel, name: names[0] } as Label) : l))
          .concat(additionalLabels)
      );
      showNotification(`Added ${names.length} labels: ${names.join(', ')}`, '#c6ff1f');
    }

    setEditingLabelId(null);
    setTempLabel({});
  };

  const renderLabel = (label: Label) => {
    const isEditing = editingLabelId === label.id && !isTaggingMode;

    if (isEditing) {
      return (
        <div
          key={label.id}
          className="col-span-1 bg-[#161616] border border-[#c6ff1f] rounded p-1 flex flex-col gap-1 shadow-lg h-14 justify-center"
        >
          <div className="flex gap-1">
            <input
              autoFocus
              type="text"
              value={tempLabel.name !== undefined ? tempLabel.name : label.name}
              onChange={(e) => setTempLabel({ ...tempLabel, name: e.target.value })}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  saveEditedLabel(label);
                } else if (e.key === 'Escape') {
                  setEditingLabelId(null);
                  setTempLabel({});
                }
              }}
              className="flex-1 w-full bg-[#111] border border-[#444] rounded px-1.5 py-0.5 text-[10px] text-white focus:border-[#c6ff1f] outline-none min-w-0"
              placeholder="Label name (separate with commas)"
            />
          </div>
          <div className="flex justify-end gap-1">
            <button
              onClick={() => {
                setEditingLabelId(null);
                setTempLabel({});
              }}
              className="p-0.5 bg-[#333] hover:bg-[#444] text-white rounded transition-colors"
            >
              <X className="w-3 h-3" />
            </button>
            <button
              onClick={() => saveEditedLabel(label)}
              className="px-1.5 py-0.5 bg-[#c6ff1f] hover:bg-[#c6ff1f] text-black text-[10px] font-medium rounded transition-colors"
            >
              <Check className="w-3 h-3" />
            </button>
          </div>
        </div>
      );
    }

    let isActiveLabel = false;
    if (isTaggingMode) {
      if (activeRecordings.length > 0) {
        isActiveLabel = activeRecordings.some((r) => r.labelIds?.includes(label.id));
      } else if (selectedEventIds.size > 0) {
        const selectedEvents = tagEvents.filter((e) => selectedEventIds.has(e.id));
        isActiveLabel = selectedEvents.every((e) => e.labelIds?.includes(label.id));
      }
    } else {
      isActiveLabel = filterLabelId === label.id;
    }

    const count = tagEvents.filter((e) => e.labelIds?.includes(label.id)).length;

    return (
      <div
        key={label.id}
        draggable={!isTaggingMode && !isLabelsSelectMode}
        onDragStart={(e) => {
          e.dataTransfer.setData('labelId', label.id);
          setDraggedLabel(label.id);
          e.stopPropagation();
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const sourceId = e.dataTransfer.getData('labelId');
          if (sourceId && sourceId !== label.id) {
            setLabels((prev) => {
              const newL = [...prev];
              const sIdx = newL.findIndex((l) => l.id === sourceId);
              const tIdx = newL.findIndex((l) => l.id === label.id);
              if (sIdx >= 0 && tIdx >= 0) {
                const sourceLabel = { ...newL[sIdx], groupId: newL[tIdx].groupId };
                newL.splice(sIdx, 1);
                const adjustedTIdx = sIdx < tIdx ? tIdx - 1 : tIdx;
                newL.splice(adjustedTIdx, 0, sourceLabel);
              }
              return newL;
            });
          }
          setDraggedLabel(null);
        }}
        className={`group relative flex items-center justify-between p-1.5 rounded border transition-colors h-7 ${
          isActiveLabel
            ? 'border-[#c6ff1f] bg-[#c6ff1f]/10'
            : 'border-[#333] bg-[#161616] hover:bg-[#1a1a1a]'
        } ${draggedLabel === label.id ? 'opacity-50' : ''}`}
      >
        {isLabelsSelectMode && (
          <input
            type="checkbox"
            className="mr-1.5 accent-[#ef4444]"
            checked={selectedLabelIds.has(label.id)}
            onChange={(e) => {
              const newSet = new Set(selectedLabelIds);
              if (e.target.checked) newSet.add(label.id);
              else newSet.delete(label.id);
              setSelectedLabelIds(newSet);
            }}
          />
        )}
        {!isTaggingMode && !isLabelsSelectMode && (
          <div className="mr-1 cursor-grab active:cursor-grabbing text-[#333] group-hover:text-gray-500">
            <GripVertical className="w-2.5 h-2.5" />
          </div>
        )}
        <div
          className="flex items-center gap-1.5 overflow-hidden flex-1 cursor-pointer"
          onClick={() => {
            if (isLabelsSelectMode) {
              const newSet = new Set(selectedLabelIds);
              if (newSet.has(label.id)) newSet.delete(label.id);
              else newSet.add(label.id);
              setSelectedLabelIds(newSet);
            } else {
              handleLabelClick(label.id);
            }
          }}
        >
          <span
            className={`text-[10px] font-medium truncate leading-none ${
              isActiveLabel ? 'text-[#c6ff1f]' : 'text-gray-200'
            }`}
          >
            {label.name}
          </span>
        </div>
        {!isTaggingMode && !isLabelsSelectMode ? (
          <div
            className={`flex items-center gap-0.5 shrink-0 pl-1 ${
              isActiveLabel ? 'bg-[#c6ff1f]/20' : 'bg-[#161616] group-hover:bg-[#1a1a1a]'
            }`}
          >
            <span className="text-[9px] text-gray-500 font-mono px-1 group-hover:hidden">{count}</span>
            <div className="hidden group-hover:flex items-center gap-0.5">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setEditingLabelId(label.id);
                  setTempLabel({ name: label.name });
                }}
                className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded"
              >
                <Edit2 className="w-3 h-3" />
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const labelToDelete = label;
                  setLabels((prev) => prev.filter((l) => l.id !== label.id));
                  showNotification(`Deleted label "${label.name}"`, '#ef4444', () => {
                    setLabels((prev) => [...prev, labelToDelete]);
                  });
                }}
                className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/20 rounded"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ) : null}
      </div>
    );
  };

  return (
    <AnimatePresence>
      {labelsEnabled && !isAdvancedCodingMode && (
        <>
          <div
            className={`w-1 z-40 cursor-col-resize transition-colors ${
              isResizingLabelsPanel ? 'bg-[#c6ff1f]' : 'bg-[#222] hover:bg-gray-500'
            }`}
            onMouseDown={() => setIsResizingLabelsPanel(true)}
          />
          <motion.div
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: labelsPanelWidth, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            className="flex flex-col bg-[#0c0c0e] border-l border-[#222] z-30 shrink-0 relative overflow-hidden h-full"
          >
            <div style={{ width: labelsPanelWidth }} className="flex flex-col h-full shrink-0">
              <div className="px-2 py-2 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#161616] flex-wrap gap-2">
                <div className="flex items-center gap-1.5 shrink-0">
                  <Tag className="w-4 h-4 text-[#c6ff1f]" />
                  <span className="text-xs font-bold text-white uppercase tracking-wide">Labels</span>
                </div>
                {!isTaggingMode && (
                  <div className="flex items-center gap-0.5 flex-wrap justify-end">
                    {isLabelsSelectMode ? (
                      <>
                        <button
                          onClick={handleBulkDeleteLabels}
                          disabled={selectedLabelIds.size === 0 && selectedGroupIds.size === 0}
                          className="p-1 text-red-400 hover:text-white hover:bg-red-600/80 rounded transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                          title="Delete Selected"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            setIsLabelsSelectMode(false);
                            setSelectedLabelIds(new Set());
                            setSelectedGroupIds(new Set());
                          }}
                          className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors ml-1"
                          title="Cancel Selection"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => setIsLabelsSelectMode(true)}
                          className="p-1 text-gray-400 hover:text-[#c6ff1f] hover:bg-[#333] rounded transition-colors"
                          title="Select Multiple"
                        >
                          <CheckSquare className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-3 bg-[#333] mx-0.5" />
                        <button
                          onClick={() => setShowNormalTemplateModal(true)}
                          className="p-1 text-[#c6ff1f] hover:text-white hover:bg-[#333] rounded transition-colors"
                          title="Manage All-in-One Coding Templates (Tags + Labels)"
                        >
                          <FolderOpen className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={importLabelsFromJSON}
                          className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
                          title="Import Labels / Setup"
                        >
                          <FileDown className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={exportUnifiedSetupToJSON}
                          className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors"
                          title="Export All-in-One Setup (Tags + Labels)"
                        >
                          <FileUp className="w-3.5 h-3.5" />
                        </button>
                        <div className="w-px h-3 bg-[#333] mx-0.5" />
                        <button
                          onClick={() => {
                            setShowAddLabelsSection((prev) => {
                              const next = !prev;
                              if (next) {
                                setTimeout(() => batchInputRef.current?.focus(), 50);
                              }
                              return next;
                            });
                          }}
                          className={`p-1 rounded transition-colors ${
                            showAddLabelsSection
                              ? 'bg-[#c6ff1f]/20 text-[#c6ff1f]'
                              : 'text-gray-400 hover:text-[#c6ff1f] hover:bg-[#333]'
                          }`}
                          title={showAddLabelsSection ? "Hide Add Labels" : "Add Labels (+)"}
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => {
                            const newId = `group-${Date.now()}`;
                            setLabelGroups((prev) => [...prev, { id: newId, name: 'New Group' }]);
                            setEditingGroupId(newId);
                            setTempGroup({ name: 'New Group' });
                          }}
                          className="p-1 text-gray-400 hover:text-[#c6ff1f] hover:bg-[#333] rounded transition-colors"
                          title="Add Group"
                        >
                          <FolderPlus className="w-3.5 h-3.5" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* QUICK ADD LABELS (COMMA-SEPARATED) */}
              {!isTaggingMode && !isLabelsSelectMode && showAddLabelsSection && (
                <div className="p-2 border-b border-[#222] bg-[#141416] flex flex-col gap-1.5 shrink-0">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1">
                      <Tag className="w-3 h-3 text-[#c6ff1f]" />
                      Add Labels
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[9px] text-gray-400">
                        Separate with commas (<span className="text-[#c6ff1f] font-mono font-bold">,</span>)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowAddLabelsSection(false)}
                        className="p-0.5 text-gray-400 hover:text-white rounded transition-colors"
                        title="Close Add Labels"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  </div>

                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      handleAddBatchLabels();
                    }}
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex gap-1.5">
                      <input
                        ref={batchInputRef}
                        type="text"
                        value={batchLabelInput}
                        onChange={(e) => setBatchLabelInput(e.target.value)}
                        placeholder="e.g. Pass, Shot, Goal, Foul..."
                        className="flex-1 min-w-0 bg-[#1a1a1d] border border-[#333] focus:border-[#c6ff1f] rounded px-2 py-1 text-xs text-white placeholder-gray-500 outline-none transition-colors"
                      />
                      <button
                        type="submit"
                        disabled={!batchLabelInput.trim()}
                        className="px-2.5 py-1 bg-[#c6ff1f] hover:bg-[#b0e61c] text-black font-bold text-xs rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed shrink-0 flex items-center gap-1 shadow-sm"
                        title="Add all comma-separated labels"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add</span>
                      </button>
                    </div>

                    {labelGroups.length > 0 && (
                      <div className="flex items-center justify-between text-[10px] text-gray-400">
                        <span className="text-gray-400 shrink-0">Add to group:</span>
                        <select
                          value={batchTargetGroupId}
                          onChange={(e) => setBatchTargetGroupId(e.target.value)}
                          className="bg-[#1a1a1d] border border-[#333] text-gray-200 rounded px-1.5 py-0.5 text-[10px] outline-none focus:border-[#c6ff1f] max-w-[150px] truncate"
                        >
                          <option value="">(Ungrouped)</option>
                          {labelGroups.map((g) => (
                            <option key={g.id} value={g.id}>
                              {g.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}
                  </form>
                </div>
              )}

              <div className="flex-1 overflow-y-auto p-2 custom-scrollbar">
                <div className="flex flex-col gap-3">
                  {/* GROUPS */}
                  {labelGroups.map((group) => {
                    const groupLabels = labels.filter((l) => l.groupId === group.id);
                    const isEditingGroup = editingGroupId === group.id && !isTaggingMode;

                    return (
                      <div
                        key={group.id}
                        draggable={!isTaggingMode}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('groupId', group.id);
                          setDraggedGroup(group.id);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const sourceGroupId = e.dataTransfer.getData('groupId');
                          const sourceLabelId = e.dataTransfer.getData('labelId');
                          if (sourceGroupId && sourceGroupId !== group.id) {
                            setLabelGroups((prev) => {
                              const newG = [...prev];
                              const sIdx = newG.findIndex((g) => g.id === sourceGroupId);
                              const tIdx = newG.findIndex((g) => g.id === group.id);
                              if (sIdx >= 0 && tIdx >= 0) {
                                const [m] = newG.splice(sIdx, 1);
                                newG.splice(tIdx, 0, m);
                              }
                              return newG;
                            });
                          } else if (sourceLabelId) {
                            setLabels((prev) =>
                              prev.map((l) => (l.id === sourceLabelId ? { ...l, groupId: group.id } : l))
                            );
                          }
                          setDraggedGroup(null);
                        }}
                        className={`flex flex-col gap-1.5 ${draggedGroup === group.id ? 'opacity-50' : ''}`}
                      >
                        <div className="flex items-center justify-between group/grp">
                          {isEditingGroup ? (
                            <div className="flex items-center gap-1 flex-1 bg-[#111] p-1 rounded border border-[#c6ff1f]">
                              <input
                                autoFocus
                                type="text"
                                value={tempGroup.name !== undefined ? tempGroup.name : group.name}
                                onChange={(e) => setTempGroup({ ...tempGroup, name: e.target.value })}
                                className="flex-1 bg-transparent outline-none text-xs text-white"
                              />
                              <button
                                onClick={() => {
                                  setLabelGroups((prev) =>
                                    prev.map((g) =>
                                      g.id === group.id ? ({ ...g, ...tempGroup } as LabelGroup) : g
                                    )
                                  );
                                  setEditingGroupId(null);
                                  setTempGroup({});
                                }}
                                className="text-[#c6ff1f] hover:text-[#a0d600]"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <>
                              <div className="flex items-center gap-1 text-xs font-semibold text-gray-400 uppercase tracking-wider cursor-grab active:cursor-grabbing">
                                {isLabelsSelectMode && (
                                  <input
                                    type="checkbox"
                                    className="mr-1 accent-[#ef4444]"
                                    checked={selectedGroupIds.has(group.id)}
                                    onChange={(e) => {
                                      const newSet = new Set(selectedGroupIds);
                                      if (e.target.checked) newSet.add(group.id);
                                      else newSet.delete(group.id);
                                      setSelectedGroupIds(newSet);
                                    }}
                                  />
                                )}
                                {!isTaggingMode && !isLabelsSelectMode && (
                                  <GripVertical className="w-3 h-3 text-[#333] group-hover/grp:text-gray-500" />
                                )}
                                {group.name}
                              </div>
                              {!isTaggingMode && !isLabelsSelectMode && (
                                <div className="hidden group-hover/grp:flex items-center gap-1">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingGroupId(group.id);
                                      setTempGroup({ name: group.name });
                                    }}
                                    className="text-gray-500 hover:text-white"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      const groupToDelete = group;
                                      const affectedLabels = labels
                                        .filter((l) => l.groupId === group.id)
                                        .map((l) => l.id);

                                      setLabelGroups((prev) => prev.filter((g) => g.id !== group.id));
                                      setLabels((prev) =>
                                        prev.map((l) =>
                                          l.groupId === group.id ? { ...l, groupId: undefined } : l
                                        )
                                      );

                                      showNotification(
                                        `Deleted group "${group.name}"`,
                                        '#ef4444',
                                        () => {
                                          setLabelGroups((prev) => [...prev, groupToDelete]);
                                          setLabels((prev) =>
                                            prev.map((l) =>
                                              affectedLabels.includes(l.id)
                                                ? { ...l, groupId: group.id }
                                                : l
                                            )
                                          );
                                        }
                                      );
                                    }}
                                    className="text-gray-500 hover:text-red-400"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              )}
                            </>
                          )}
                        </div>

                        <div
                          className="grid gap-1.5"
                          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}
                        >
                          {groupLabels.map((label) => renderLabel(label))}
                          {!isTaggingMode && !isLabelsSelectMode && (
                            addingToGroupId === group.id ? (
                              <div className="col-span-full bg-[#18181b] border border-[#c6ff1f] rounded p-1.5 flex items-center gap-1.5 shadow-lg">
                                <input
                                  autoFocus
                                  type="text"
                                  value={groupInlineInput}
                                  onChange={(e) => setGroupInlineInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddBatchLabels(group.id, groupInlineInput);
                                      setAddingToGroupId(null);
                                      setGroupInlineInput('');
                                    } else if (e.key === 'Escape') {
                                      setAddingToGroupId(null);
                                      setGroupInlineInput('');
                                    }
                                  }}
                                  placeholder="Add labels (separate with commas)..."
                                  className="flex-1 bg-[#111] border border-[#444] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#c6ff1f] min-w-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAddBatchLabels(group.id, groupInlineInput);
                                    setAddingToGroupId(null);
                                    setGroupInlineInput('');
                                  }}
                                  disabled={!groupInlineInput.trim()}
                                  className="px-2 py-1 bg-[#c6ff1f] hover:bg-[#b0e61c] text-black font-bold text-[10px] rounded disabled:opacity-30 shrink-0"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingToGroupId(null);
                                    setGroupInlineInput('');
                                  }}
                                  className="p-1 text-gray-400 hover:text-white shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingToGroupId(group.id);
                                  setGroupInlineInput('');
                                }}
                                className="h-7 border border-dashed border-[#333] hover:border-[#c6ff1f] rounded text-gray-500 hover:text-[#c6ff1f] flex items-center justify-center gap-1 text-[10px] px-2 transition-colors"
                                title={`Add labels to "${group.name}" (separate with commas)`}
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Labels</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })}

                  {/* UNGROUPED LABELS */}
                  {(() => {
                    const ungroupedLabels = labels.filter((l) => !l.groupId);
                    if (ungroupedLabels.length === 0 && labelGroups.length > 0 && addingToGroupId !== '__ungrouped__') return null;
                    return (
                      <div
                        className="flex flex-col gap-1.5"
                        onDragOver={(e) => {
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          const sourceLabelId = e.dataTransfer.getData('labelId');
                          if (sourceLabelId) {
                            setLabels((prev) =>
                              prev.map((l) => (l.id === sourceLabelId ? { ...l, groupId: undefined } : l))
                            );
                          }
                        }}
                      >
                        {labelGroups.length > 0 && (
                          <div className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                            Ungrouped
                          </div>
                        )}
                        <div
                          className="grid gap-1.5"
                          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))' }}
                        >
                          {ungroupedLabels.map((label) => renderLabel(label))}
                          {!isTaggingMode && !isLabelsSelectMode && (
                            addingToGroupId === '__ungrouped__' ? (
                              <div className="col-span-full bg-[#18181b] border border-[#c6ff1f] rounded p-1.5 flex items-center gap-1.5 shadow-lg">
                                <input
                                  autoFocus
                                  type="text"
                                  value={groupInlineInput}
                                  onChange={(e) => setGroupInlineInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleAddBatchLabels('', groupInlineInput);
                                      setAddingToGroupId(null);
                                      setGroupInlineInput('');
                                    } else if (e.key === 'Escape') {
                                      setAddingToGroupId(null);
                                      setGroupInlineInput('');
                                    }
                                  }}
                                  placeholder="Add ungrouped labels (separate with commas)..."
                                  className="flex-1 bg-[#111] border border-[#444] rounded px-2 py-1 text-xs text-white outline-none focus:border-[#c6ff1f] min-w-0"
                                />
                                <button
                                  type="button"
                                  onClick={() => {
                                    handleAddBatchLabels('', groupInlineInput);
                                    setAddingToGroupId(null);
                                    setGroupInlineInput('');
                                  }}
                                  disabled={!groupInlineInput.trim()}
                                  className="px-2 py-1 bg-[#c6ff1f] hover:bg-[#b0e61c] text-black font-bold text-[10px] rounded disabled:opacity-30 shrink-0"
                                >
                                  Add
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setAddingToGroupId(null);
                                    setGroupInlineInput('');
                                  }}
                                  className="p-1 text-gray-400 hover:text-white shrink-0"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setAddingToGroupId('__ungrouped__');
                                  setGroupInlineInput('');
                                }}
                                className="h-7 border border-dashed border-[#333] hover:border-[#c6ff1f] rounded text-gray-500 hover:text-[#c6ff1f] flex items-center justify-center gap-1 text-[10px] px-2 transition-colors"
                                title="Add ungrouped labels (separate with commas)"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Add Labels</span>
                              </button>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};
