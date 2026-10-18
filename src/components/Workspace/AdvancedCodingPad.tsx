import React, { useState, useRef, useEffect } from 'react';
import { 
  Layers, Plus, Type, ZoomIn, ZoomOut, Trash2, Edit2, Check, Video, Tags, 
  X, Save, FolderOpen, Download, Upload, Link, Settings2, Power, 
  PowerOff, Zap, HelpCircle, Info, Folder, Pencil, FileCode, ExternalLink, Sparkles
} from 'lucide-react';
import { Tag as TagData, Label, LabelGroup, AdvancedPadItem, SmartConnector } from '../../types';
import { generateDefaultPadItems, CODE_FILE_AI_INSTRUCTIONS } from '../../utils/codeFiles';

// Refactored Sub-Components
import { getLuminance, calculateTagAutoFontSize } from './AdvancedCoding/utils';
import { GuideModal } from './AdvancedCoding/GuideModal';
import { ConnectorsManagerModal } from './AdvancedCoding/ConnectorsManagerModal';
import { ConnectorMenuModal } from './AdvancedCoding/ConnectorMenuModal';
import { TagSelectorModal } from './AdvancedCoding/TagSelectorModal';
import { LabelSelectorModal } from './AdvancedCoding/LabelSelectorModal';
import { CustomizePopup } from './AdvancedCoding/CustomizePopup';
import { PresetModals } from './AdvancedCoding/PresetModals';
import { CanvasItem } from './AdvancedCoding/CanvasItem';

interface Props {
  tags: TagData[];
  labels: Label[];
  labelGroups?: LabelGroup[];
  setLabelGroups?: React.Dispatch<React.SetStateAction<LabelGroup[]>>;
  setTags?: React.Dispatch<React.SetStateAction<TagData[]>>;
  setLabels?: React.Dispatch<React.SetStateAction<Label[]>>;
  items: AdvancedPadItem[];
  setItems: React.Dispatch<React.SetStateAction<AdvancedPadItem[]>>;
  connectors: SmartConnector[];
  setConnectors: React.Dispatch<React.SetStateAction<SmartConnector[]>>;
  isTaggingMode: boolean;
  setIsTaggingMode: (mode: boolean) => void;
  activeRecording?: { tagId: string, startTime: number, labelIds?: string[] } | null;
  activeRecordings?: { tagId: string, startTime: number, labelIds?: string[] }[];
  onTagClick: (tagId: string) => void;
  onLabelClick: (labelId: string) => void;
  onAddTag?: (tag: TagData) => void;
  onAddLabel?: (label: Label) => void;
  onExit: () => void;
  onEditTag: (tagId: string) => void;
  onEditLabel: (labelId: string) => void;
  onOpenTagSettings?: () => void;
  showNotification?: (text: string, color?: string) => void;
  currentCodeFileName?: string;
  onOpenCodeFilesModal?: () => void;
  onOpenCodeFileSaveModal?: () => void;
  isQuickTagEnabled?: boolean;
  onToggleQuickTag?: () => void;
  onPopout?: () => void;
  hideCodeFile?: boolean;
  hideTagSettings?: boolean;
}

export const AdvancedCodingPad = ({
  tags,
  labels,
  labelGroups = [],
  setLabelGroups,
  setTags,
  setLabels,
  items,
  setItems,
  connectors,
  setConnectors,
  isTaggingMode,
  setIsTaggingMode,
  activeRecording,
  activeRecordings = [],
  onTagClick,
  onLabelClick,
  onAddTag,
  onAddLabel,
  onExit,
  onEditTag,
  onEditLabel,
  onOpenTagSettings,
  showNotification,
  currentCodeFileName,
  onOpenCodeFilesModal,
  onOpenCodeFileSaveModal,
  isQuickTagEnabled,
  onToggleQuickTag,
  onPopout,
  hideCodeFile,
  hideTagSettings = false
}: Props) => {
  const [zoom, setZoom] = useState(0.85);
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Quick Tag Mode Toggle state (with fallback to localStorage)
  const [internalQuickTag, setInternalQuickTag] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('advanced_pad_quick_tag_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });

  // Momentary visual pulse feedback when tags are clicked in tagging mode
  const [flashingTagIds, setFlashingTagIds] = useState<{ [tagId: string]: number }>({});

  const isQuickTagActive = isQuickTagEnabled !== undefined ? isQuickTagEnabled : internalQuickTag;

  const handleToggleQuickTag = () => {
    if (onToggleQuickTag) {
      onToggleQuickTag();
    } else {
      setInternalQuickTag(prev => {
        const next = !prev;
        try {
          localStorage.setItem('advanced_pad_quick_tag_enabled', String(next));
        } catch (_) {}
        showToast(
          next 
            ? 'Quick Tag enabled for Coding Pad (lead/lag buffers active)' 
            : 'Quick Tag disabled for Coding Pad (tags record with manual start/stop)',
          next ? 'success' : 'info'
        );
        return next;
      });
    }
  };

  // Modals for Selector views & Guide
  const [showTagSelectorModal, setShowTagSelectorModal] = useState(false);
  const [showLabelSelectorModal, setShowLabelSelectorModal] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string, type: 'success' | 'error' | 'info' } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToastMessage({ text, type });
    if (showNotification) showNotification(text, type === 'success' ? '#c6ff1f' : type === 'error' ? '#ef4444' : '#3b82f6');
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Auto-sync items if pad is empty but tags/labels exist in active setup
  useEffect(() => {
    if (items.length === 0 && (tags.length > 0 || labels.length > 0)) {
      const generated = generateDefaultPadItems(tags, labels, labelGroups);
      if (generated.length > 0) {
        setItems(generated);
      }
    }
  }, [items.length, tags, labels, labelGroups, setItems]);

  const handleSyncLayoutToFile = () => {
    const generated = generateDefaultPadItems(tags, labels, labelGroups);
    setItems(generated);
    showToast(`Synchronized coding pad layout with active Code File (${tags.length} tags, ${labels.length} labels)`, 'success');
  };

  // Helper to add an existing tag to the pad
  const addTagToPad = (tag: TagData) => {
    const count = items.length;
    const nextX = 50 + (count % 6) * 140;
    const nextY = 60 + Math.floor(count / 6) * 60;
    
    const existingOnPad = items.some(i => i.id === tag.id);
    const itemId = existingOnPad ? `${tag.id}-${Date.now()}` : tag.id;

    const newItem: AdvancedPadItem = {
      id: itemId,
      type: 'tag',
      x: nextX,
      y: nextY,
      width: 120,
      height: 40,
      zIndex: 10
    };
    
    setItems(prev => [...prev, newItem]);
    showToast(`Added "${tag.name}" to the coding pad!`, 'success');
  };

  // Place all unplaced tags
  const addAllMissingTagsToPad = () => {
    const unplacedTags = tags.filter(t => !items.some(i => i.id === t.id));
    if (unplacedTags.length === 0) {
      showToast("All project tags are already placed on the pad!", 'info');
      return;
    }

    let nextX = 50;
    let nextY = items.length > 0 ? Math.max(...items.map(i => i.y + i.height)) + 20 : 60;
    const newItems: AdvancedPadItem[] = unplacedTags.map(t => {
      const it: AdvancedPadItem = {
        id: t.id,
        type: 'tag',
        x: nextX,
        y: nextY,
        width: 120,
        height: 40,
        zIndex: 10
      };
      nextX += 140;
      if (nextX > 750) {
        nextX = 50;
        nextY += 60;
      }
      return it;
    });

    setItems(prev => [...prev, ...newItems]);
    showToast(`Placed ${unplacedTags.length} tags on the coding pad!`, 'success');
    setShowTagSelectorModal(false);
  };

  // Helper to add an existing label to the pad
  const addLabelToPad = (label: Label) => {
    const count = items.length;
    const nextX = 50 + (count % 6) * 140;
    const nextY = 60 + Math.floor(count / 6) * 60;
    const existingOnPad = items.some(i => i.id === label.id);
    const itemId = existingOnPad ? `${label.id}-${Date.now()}` : label.id;

    const newItem: AdvancedPadItem = {
      id: itemId,
      type: 'label',
      x: nextX,
      y: nextY,
      width: 120,
      height: 44,
      zIndex: 10
    };

    setItems(prev => [...prev, newItem]);
    showToast(`Added label "${label.name}" to coding pad!`, 'success');
  };

  // Helper to place an entire group of labels onto the pad with a group header
  const addEntireGroupToPad = (group: { id: string; name: string }) => {
    const groupLabels = group.id === 'ungrouped'
      ? labels.filter(l => !l.groupId)
      : labels.filter(l => l.groupId === group.id);

    if (groupLabels.length === 0) {
      showToast(`No labels found in group "${group.name}".`, 'info');
      return;
    }

    const startY = items.length > 0 ? Math.max(...items.map(i => i.y + i.height)) + 30 : 60;
    let currX = 50;
    let currY = startY;

    const groupHeaderItem: AdvancedPadItem = {
      id: `header-grp-${group.id}-${Date.now()}`,
      type: 'text',
      x: currX,
      y: currY,
      width: 160,
      height: 34,
      content: `📁 ${group.name.toUpperCase()}`,
      color: 'rgba(198, 255, 31, 0.15)',
      fontSize: 12,
      zIndex: 10
    };

    currY += 48;

    const newItems: AdvancedPadItem[] = groupLabels.map((label, idx) => {
      const it: AdvancedPadItem = {
        id: items.some(i => i.id === label.id) ? `${label.id}-${Date.now()}-${idx}` : label.id,
        type: 'label',
        x: currX,
        y: currY,
        width: 120,
        height: 44,
        zIndex: 10
      };
      currX += 135;
      if (currX > 750) {
        currX = 50;
        currY += 52;
      }
      return it;
    });

    setItems(prev => [...prev, groupHeaderItem, ...newItems]);
    showToast(`Placed group "${group.name}" with ${groupLabels.length} labels on pad!`, 'success');
  };

  // Helper to place all unplaced labels
  const addAllMissingLabelsToPad = () => {
    const unplacedLabels = labels.filter(l => !items.some(i => i.id === l.id));
    if (unplacedLabels.length === 0) {
      showToast("All project labels are already placed on the pad!", 'info');
      return;
    }

    let nextX = 50;
    let nextY = items.length > 0 ? Math.max(...items.map(i => i.y + i.height)) + 20 : 60;
    const newItems: AdvancedPadItem[] = unplacedLabels.map(l => {
      const it: AdvancedPadItem = {
        id: l.id,
        type: 'label',
        x: nextX,
        y: nextY,
        width: 120,
        height: 44,
        zIndex: 10
      };
      nextX += 135;
      if (nextX > 750) {
        nextX = 50;
        nextY += 52;
      }
      return it;
    });

    setItems(prev => [...prev, ...newItems]);
    showToast(`Placed ${unplacedLabels.length} labels on the coding pad!`, 'success');
    setShowLabelSelectorModal(false);
  };

  // Connector state
  const [isConnectorMode, setIsConnectorMode] = useState(false);
  const [connectorSourceId, setConnectorSourceId] = useState<string | null>(null);
  const [showConnectorMenu, setShowConnectorMenu] = useState<{sourceId: string, targetId: string, x: number, y: number} | null>(null);
  const [showConnectorsOnPad, setShowConnectorsOnPad] = useState(true);
  const [showConnectorsManager, setShowConnectorsManager] = useState(false);
  const [hoveredConnectorId, setHoveredConnectorId] = useState<string | null>(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [connectorToolbar, setConnectorToolbar] = useState<{id: string, x: number, y: number} | null>(null);
  
  // Sync tags and labels on mount
  useEffect(() => {
    let newItems = [...items];
    let changed = false;
    let nextX = 50;
    let nextY = 50;
    
    tags.forEach(t => {
      if (!newItems.some(i => i.id === t.id)) {
        newItems.push({ id: t.id, type: 'tag', x: nextX, y: nextY, width: 120, height: 40 });
        nextX += 130;
        if (nextX > 500) { nextX = 50; nextY += 50; }
        changed = true;
      }
    });
    
    labels.forEach(l => {
      if (!newItems.some(i => i.id === l.id)) {
        newItems.push({ id: l.id, type: 'label', x: nextX, y: nextY, width: 120, height: 40 });
        nextX += 130;
        if (nextX > 500) { nextX = 50; nextY += 50; }
        changed = true;
      }
    });

    if (changed) setItems(newItems);
  }, [tags, labels]);

  // Dragging state
  const [draggingItem, setDraggingItem] = useState<string | null>(null);
  const [resizingItem, setResizingItem] = useState<string | null>(null);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });
  const [selectedItem, setSelectedItem] = useState<string | null>(null);

  const [customizePopup, setCustomizePopup] = useState<{ id: string; type: 'tag' | 'label' | 'text'; x: number; y: number } | null>(null);

  // Pad file preset state
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showLoadModal, setShowLoadModal] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [savedPresets, setSavedPresets] = useState<{name: string, items: AdvancedPadItem[]}[]>([]);
  const [currentProjectName, setCurrentProjectName] = useState<string | null>(null);

  // Modals for caution/renaming
  const [confirmOverwrite, setConfirmOverwrite] = useState<{name: string, items: AdvancedPadItem[]} | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [renamingProject, setRenamingProject] = useState<{oldName: string, newName: string} | null>(null);
  const [showSaveChoiceModal, setShowSaveChoiceModal] = useState(false);

  useEffect(() => {
    const loaded = localStorage.getItem('advancedPadPresets');
    if (loaded) {
      try {
        setSavedPresets(JSON.parse(loaded));
      } catch (e) {}
    }
  }, []);

  const handleSaveClick = () => {
    if (currentProjectName) {
      setShowSaveChoiceModal(true);
    } else {
      setPresetName('');
      setShowSaveModal(true);
    }
  };

  const savePreset = (forceOverwrite = false, specificName?: string) => {
    const nameToSave = (specificName || presetName).trim();
    if (!nameToSave) return;
    
    const existing = savedPresets.find(p => p.name.toLowerCase() === nameToSave.toLowerCase());

    if (existing && !forceOverwrite) {
      setConfirmOverwrite({ name: nameToSave, items });
      return;
    }

    const newPresets = [...savedPresets.filter(p => p.name.toLowerCase() !== nameToSave.toLowerCase()), { name: nameToSave, items }];
    setSavedPresets(newPresets);
    localStorage.setItem('advancedPadPresets', JSON.stringify(newPresets));
    setCurrentProjectName(nameToSave);
    setPresetName('');
    setShowSaveModal(false);
    setShowSaveChoiceModal(false);
    setConfirmOverwrite(null);
  };

  const loadPreset = (preset: {name: string, items: AdvancedPadItem[]}) => {
    setItems(preset.items);
    setCurrentProjectName(preset.name);
    setShowLoadModal(false);
  };
  
  const initiateDelete = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConfirmDelete(name);
  };

  const executeDelete = () => {
    if (!confirmDelete) return;
    const newPresets = savedPresets.filter(p => p.name !== confirmDelete);
    setSavedPresets(newPresets);
    localStorage.setItem('advancedPadPresets', JSON.stringify(newPresets));
    if (currentProjectName === confirmDelete) setCurrentProjectName(null);
    setConfirmDelete(null);
  };

  const initiateRename = (name: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingProject({ oldName: name, newName: name });
  };

  const executeRename = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!renamingProject || !renamingProject.newName.trim()) {
      setRenamingProject(null);
      return;
    }
    
    const oldName = renamingProject.oldName;
    const newName = renamingProject.newName.trim();
    
    if (oldName !== newName && savedPresets.some(p => p.name.toLowerCase() === newName.toLowerCase())) {
        showToast("A pad file with this name already exists.", 'error');
        return;
    }

    const newPresets = savedPresets.map(p => p.name === oldName ? { ...p, name: newName } : p);
    setSavedPresets(newPresets);
    localStorage.setItem('advancedPadPresets', JSON.stringify(newPresets));
    if (currentProjectName === oldName) setCurrentProjectName(newName);
    setRenamingProject(null);
  };

  const exportPad = () => {
    const exportPayload = {
      app: "TacStem Football Analysis",
      format: "TacStem Advanced Coding Pad",
      version: "3.0",
      exportedAt: new Date().toISOString(),
      _ai_instructions: CODE_FILE_AI_INSTRUCTIONS,
      name: currentProjectName || 'Untitled Pad',
      tags: tags,
      labels: labels,
      labelGroups: labelGroups,
      items: items,
      connectors: connectors
    };

    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
    const downloadAnchorNode = document.createElement('a');
    downloadAnchorNode.setAttribute("href", dataStr);
    downloadAnchorNode.setAttribute("download", (currentProjectName || 'tacstem-coding-pad').toLowerCase().replace(/\s+/g, '-') + ".json");
    document.body.appendChild(downloadAnchorNode);
    downloadAnchorNode.click();
    downloadAnchorNode.remove();
    showToast("Pad layout exported to JSON!", 'success');
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const raw = event.target?.result as string;
        const data = JSON.parse(raw);
        
        let importedTags: TagData[] = [];
        let importedLabels: Label[] = [];
        let importedItems: AdvancedPadItem[] = [];
        let importedConnectors: SmartConnector[] = [];
        let importedName = '';

        if (Array.isArray(data)) {
            importedTags = data.map((t: any, idx: number) => ({
                id: String(t.id || `tag-${Date.now()}-${idx}`),
                name: String(t.name || t.tag_name || t.label || `Tag ${idx + 1}`),
                color: String(t.color || '#c6ff1f'),
                shortcut: String(t.shortcut || t.hotkey || ''),
                leadLagEnabled: Boolean(t.leadLagEnabled),
                preTime: typeof t.preTime === 'number' ? t.preTime : 10,
                postTime: typeof t.postTime === 'number' ? t.postTime : 10
            }));
        } else if (typeof data === 'object' && data !== null) {
            importedName = data.name || '';
            
            if (Array.isArray(data.tags)) {
                importedTags = data.tags.map((t: any, idx: number) => ({
                    id: String(t.id || `tag-${Date.now()}-${idx}`),
                    name: String(t.name || t.tag_name || t.label || `Tag ${idx + 1}`),
                    color: String(t.color || '#c6ff1f'),
                    shortcut: String(t.shortcut || t.hotkey || ''),
                    leadLagEnabled: Boolean(t.leadLagEnabled),
                    preTime: typeof t.preTime === 'number' ? t.preTime : 10,
                    postTime: typeof t.postTime === 'number' ? t.postTime : 10
                }));
            }

            if (Array.isArray(data.labels)) {
                importedLabels = data.labels.map((l: any, idx: number) => ({
                    id: String(l.id || `label-${Date.now()}-${idx}`),
                    name: String(l.name || `Label ${idx + 1}`),
                    color: l.color ? String(l.color) : undefined,
                    shortcut: l.shortcut ? String(l.shortcut) : undefined
                }));
            }

            if (Array.isArray(data.items)) {
                importedItems = data.items.map((it: any, idx: number) => ({
                    id: String(it.id || `item-${Date.now()}-${idx}`),
                    type: it.type || 'tag',
                    x: typeof it.x === 'number' ? it.x : 50 + (idx % 5) * 140,
                    y: typeof it.y === 'number' ? it.y : 50 + Math.floor(idx / 5) * 60,
                    width: typeof it.width === 'number' ? it.width : 120,
                    height: typeof it.height === 'number' ? it.height : 40,
                    content: it.content,
                    color: it.color,
                    fontSize: it.fontSize,
                    rotation: it.rotation,
                    zIndex: it.zIndex
                }));
            }

            if (Array.isArray(data.connectors)) {
                importedConnectors = data.connectors.map((c: any, idx: number) => ({
                    id: String(c.id || `conn-${Date.now()}-${idx}`),
                    sourceId: String(c.sourceId),
                    targetId: String(c.targetId),
                    type: c.type || 'exclusive',
                    enabled: c.enabled !== false
                }));
            }
        }

        importedItems.forEach((it, idx) => {
            if (it.type === 'tag' && !importedTags.some(t => t.id === it.id) && !tags.some(t => t.id === it.id)) {
                importedTags.push({
                    id: it.id,
                    name: it.content || `Tag ${idx + 1}`,
                    color: it.color || '#c6ff1f',
                    shortcut: ''
                });
            } else if (it.type === 'label' && !importedLabels.some(l => l.id === it.id) && !labels.some(l => l.id === it.id)) {
                importedLabels.push({
                    id: it.id,
                    name: it.content || `Label ${idx + 1}`,
                    color: it.color
                });
            }
        });

        if (importedTags.length > 0) {
            if (setTags) {
                setTags(prevTags => {
                    const tagMap = new Map(prevTags.map(t => [t.id, t]));
                    importedTags.forEach(t => tagMap.set(t.id, t));
                    return Array.from(tagMap.values());
                });
            } else if (onAddTag) {
                importedTags.forEach(t => {
                    if (!tags.some(x => x.id === t.id)) onAddTag(t);
                });
            }
        }

        if (importedLabels.length > 0) {
            if (setLabels) {
                setLabels(prevLabels => {
                    const labelMap = new Map(prevLabels.map(l => [l.id, l]));
                    importedLabels.forEach(l => labelMap.set(l.id, l));
                    return Array.from(labelMap.values());
                });
            } else if (onAddLabel) {
                importedLabels.forEach(l => {
                    if (!labels.some(x => x.id === l.id)) onAddLabel(l);
                });
            }
        }

        if (importedItems.length === 0 && importedTags.length > 0) {
            let nextX = 50;
            let nextY = 50;
            const newGeneratedItems: AdvancedPadItem[] = importedTags.map((t) => {
                const item: AdvancedPadItem = {
                    id: t.id,
                    type: 'tag',
                    x: nextX,
                    y: nextY,
                    width: 120,
                    height: 40
                };
                nextX += 140;
                if (nextX > 700) {
                    nextX = 50;
                    nextY += 60;
                }
                return item;
            });
            setItems(prev => [...prev, ...newGeneratedItems]);
        } else if (importedItems.length > 0) {
            setItems(importedItems);
        }

        if (importedConnectors.length > 0) {
            setConnectors(importedConnectors);
        }

        if (importedName) {
            setCurrentProjectName(importedName);
        }

        showToast(`Imported ${importedTags.length} tags successfully!`, 'success');

      } catch (err) {
        showToast("Invalid JSON file format.", 'error');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  useEffect(() => {
    const hideMenu = (e: globalThis.MouseEvent) => {
        if (!(e.target as Element).closest('.customize-popup')) {
            setCustomizePopup(null);
        }
    };
    window.addEventListener('mousedown', hideMenu);
    return () => window.removeEventListener('mousedown', hideMenu);
  }, []);

  useEffect(() => {
    if (!draggingItem && !resizingItem) return;
    
    const handleGlobalPointerMove = (e: PointerEvent) => {
      if (!containerRef.current || !wrapperRef.current) return;
      
      if (draggingItem || resizingItem) {
        e.preventDefault();
        if (window.getSelection) {
          window.getSelection()?.removeAllRanges();
        }
      }

      if (draggingItem) {
        const containerRect = containerRef.current.getBoundingClientRect();
        const newX = (e.clientX - containerRect.left) / zoom - dragOffset.x;
        const newY = (e.clientY - containerRect.top) / zoom - dragOffset.y;
        
        setItems(prev => prev.map(it => {
          if (it.id === draggingItem) {
             return { ...it, x: Math.max(0, newX), y: Math.max(0, newY) };
          }
          return it;
        }));
      } else if (resizingItem) {
        setItems(prev => prev.map(it => {
          if (it.id === resizingItem) {
            const containerRect = containerRef.current!.getBoundingClientRect();
            const newWidth = Math.max(30, (e.clientX - containerRect.left - it.x * zoom) / zoom);
            const newHeight = Math.max(20, (e.clientY - containerRect.top - it.y * zoom) / zoom);
            return { ...it, width: newWidth, height: newHeight };
          }
          return it;
        }));
      }
    };
    
    const handleGlobalPointerUp = () => {
      setDraggingItem(null);
      setResizingItem(null);
    };

    window.addEventListener('pointermove', handleGlobalPointerMove);
    window.addEventListener('pointerup', handleGlobalPointerUp);
    
    return () => {
      window.removeEventListener('pointermove', handleGlobalPointerMove);
      window.removeEventListener('pointerup', handleGlobalPointerUp);
    };
  }, [draggingItem, resizingItem, dragOffset, zoom]);

  const handlePointerDown = (e: React.PointerEvent, item: AdvancedPadItem) => {
    if (e.button !== undefined && e.button !== 0) return;

    e.preventDefault();
    if (window.getSelection) {
      window.getSelection()?.removeAllRanges();
    }

    if (isTaggingMode) {
      e.stopPropagation();
      if (item.type === 'tag') {
        setFlashingTagIds(prev => ({ ...prev, [item.id]: Date.now() }));
        setTimeout(() => {
          setFlashingTagIds(prev => {
            const next = { ...prev };
            delete next[item.id];
            return next;
          });
        }, 700);

        onTagClick(item.id);
      } else if (item.type === 'label') {
        onLabelClick(item.id);
      }
      return;
    }

    if (isConnectorMode) {
        e.stopPropagation();
        if (connectorSourceId) {
            if (connectorSourceId !== item.id) {
                setShowConnectorMenu({
                    sourceId: connectorSourceId,
                    targetId: item.id,
                    x: e.clientX,
                    y: e.clientY
                });
            }
            setConnectorSourceId(null);
        } else {
            setConnectorSourceId(item.id);
        }
        return;
    }
    
    e.stopPropagation();
    setSelectedItem(item.id);
    
    const target = e.target as HTMLElement;
    if (target.closest('.resize-handle')) {
        setResizingItem(item.id);
        return;
    }

    const containerRect = containerRef.current!.getBoundingClientRect();
    setDraggingItem(item.id);
    setDragOffset({
      x: (e.clientX - containerRect.left) / zoom - item.x,
      y: (e.clientY - containerRect.top) / zoom - item.y
    });
  };

  const addNewItem = (type: 'tag' | 'label' | 'text', id?: string) => {
    let newItemId = id || `item-${Date.now()}`;
    if (!id && type === 'tag') {
        const availableTag = tags.find(t => !items.some(i => i.id === t.id));
        if (availableTag) {
            newItemId = availableTag.id;
        } else {
            newItemId = `tag-${Date.now()}`;
            if (onAddTag) {
                onAddTag({ id: newItemId, name: 'New Tag', color: '#c6ff1f', shortcut: '' });
            }
        }
    } else if (!id && type === 'label') {
        const availableLabel = labels.find(l => !items.some(i => i.id === l.id));
        if (availableLabel) {
            newItemId = availableLabel.id;
        } else {
            newItemId = `label-${Date.now()}`;
            if (onAddLabel) {
                onAddLabel({ id: newItemId, name: 'New Label' });
            }
        }
    }

    const newItem: AdvancedPadItem = {
      id: newItemId,
      type,
      x: 50,
      y: 50,
      width: type === 'text' ? 150 : (type === 'label' ? 120 : 120),
      height: type === 'text' ? 34 : (type === 'label' ? 44 : 40),
      content: type === 'text' ? '📁 SECTION HEADER' : undefined,
      color: type === 'text' ? 'rgba(198, 255, 31, 0.15)' : undefined,
      fontSize: type === 'text' ? 12 : undefined,
      zIndex: 10
    };
    setItems([...items, newItem]);
  };

  const removeItem = (id: string) => {
    setItems(items.filter(i => i.id !== id));
    if (selectedItem === id) setSelectedItem(null);
  };

  const handleContainerClick = (e: React.MouseEvent) => {
      if (e.target === containerRef.current) {
          setSelectedItem(null);
      }
  };

  const handleAdjustItemFontSize = (itemId: string, delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const tag = item.type === 'tag' ? tags.find(t => t.id === item.id) : null;
      const currentSize = item.fontSize || (tag ? calculateTagAutoFontSize(tag.name, item.width, item.height) : 13);
      const newSize = Math.max(6, Math.min(48, currentSize + delta));
      return { ...item, fontSize: newSize };
    }));
  };

  const handleResetItemFontSize = (itemId: string) => {
    setItems(prev => prev.map(item => {
      if (item.id !== itemId) return item;
      const copy = { ...item };
      delete copy.fontSize;
      return copy;
    }));
    showToast('Reset text size to auto-fit', 'info');
  };

  const handleAdjustAllTagsFontSize = (delta: number) => {
    setItems(prev => prev.map(item => {
      if (item.type !== 'tag') return item;
      const tag = tags.find(t => t.id === item.id);
      const currentSize = item.fontSize || (tag ? calculateTagAutoFontSize(tag.name, item.width, item.height) : 13);
      const newSize = Math.max(6, Math.min(48, currentSize + delta));
      return { ...item, fontSize: newSize };
    }));
    showToast(`Adjusted text size on all tags (${delta > 0 ? '+1px' : '-1px'})`, 'success');
  };

  const handleSetAllTagsFontSize = (size: number | undefined) => {
    setItems(prev => prev.map(item => {
      if (item.type !== 'tag') return item;
      if (size === undefined) {
        const copy = { ...item };
        delete copy.fontSize;
        return copy;
      }
      return { ...item, fontSize: size };
    }));
    showToast(size ? `Set all tags text size to ${size}px` : 'Reset all tags to auto-fit text size', 'success');
  };

  return (
    <div 
      className="flex-1 flex flex-col h-full bg-[#161616] border-l border-[#222] select-none"
      style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
    >
      {/* Top Bar Compact Header */}
      <div className="flex flex-col border-b border-[#222] bg-[#111] shrink-0 select-none">
        {/* ROW 1: System Title, Mode Switcher, Quick Tag Toggle, Code File & Exit */}
        <div className="h-8 px-2.5 bg-[#111] border-b border-[#1f1f23] flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 shrink-0">
            <div className="flex items-center gap-1.5 text-white">
              <Layers className="w-3.5 h-3.5 text-[#c6ff1f] shrink-0" />
              <span className="text-[10px] font-bold tracking-wider uppercase whitespace-nowrap">
                Coding Pad
              </span>
              {currentProjectName && (
                <span className="text-gray-400 text-[9.5px] font-normal capitalize truncate max-w-[100px] hidden md:inline-block">
                  / {currentProjectName}
                </span>
              )}
            </div>

            <div className="w-[1px] h-3.5 bg-[#2a2a2a] mx-0.5 shrink-0" />

            {/* Mode Switcher Pill */}
            <div className="flex items-center bg-[#18181c] border border-[#2e2e36] rounded p-0.5 shadow-inner shrink-0">
              <button
                type="button"
                onClick={() => { setIsTaggingMode(true); setIsConnectorMode(false); }}
                className={`h-5 flex items-center gap-1 px-2 rounded text-[9px] font-bold uppercase tracking-wide transition-all ${
                  isTaggingMode
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30 shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Video className="w-2.5 h-2.5 text-red-400" />
                <span>Tagging</span>
              </button>
              <button
                type="button"
                onClick={() => { setIsTaggingMode(false); setIsConnectorMode(false); }}
                className={`h-5 flex items-center gap-1 px-2 rounded text-[9px] font-bold uppercase tracking-wide transition-all ${
                  !isTaggingMode
                    ? 'bg-[#c6ff1f]/20 text-[#c6ff1f] border border-[#c6ff1f]/30 shadow-xs'
                    : 'text-gray-400 hover:text-gray-200'
                }`}
              >
                <Edit2 className="w-2.5 h-2.5 text-[#c6ff1f]" />
                <span>Layout</span>
              </button>
            </div>

            <div className="w-[1px] h-3.5 bg-[#2a2a2a] mx-0.5 shrink-0" />

            {/* Quick Tag Toggle */}
            <button
              type="button"
              onClick={handleToggleQuickTag}
              className={`h-6 px-2 rounded text-[9.5px] font-bold uppercase flex items-center gap-1.5 border transition-all cursor-pointer shrink-0 ${
                isQuickTagActive
                  ? 'bg-[#c6ff1f]/15 border-[#c6ff1f]/40 text-[#c6ff1f] hover:bg-[#c6ff1f]/25 shadow-xs'
                  : 'bg-[#18181c] border-[#2e2e36] text-gray-400 hover:text-gray-200 hover:border-gray-500'
              }`}
            >
              <Zap className={`w-3 h-3 ${isQuickTagActive ? 'text-[#c6ff1f] fill-[#c6ff1f]/20' : 'text-gray-500'}`} />
              <span className="hidden sm:inline">Quick Tag</span>
              <span className={`px-1 py-0.2 rounded text-[8px] font-black uppercase ${
                isQuickTagActive ? 'bg-[#c6ff1f] text-black shadow-xs' : 'bg-[#2a2a2a] text-gray-400'
              }`}>
                {isQuickTagActive ? 'ON' : 'OFF'}
              </span>
            </button>
          </div>

          {/* Right: Code File & Exit */}
          <div className="flex items-center gap-1.5 shrink-0">
            {!hideCodeFile && (
              onOpenCodeFilesModal ? (
                <div className="flex items-center gap-1 shrink-0">
                  <div 
                    className="flex items-center gap-1 px-2 h-6 bg-[#16161e] border border-[#2c2c38] rounded text-[9px] shrink-0" 
                    title={currentCodeFileName || 'Code File'}
                  >
                    <FileCode className="w-2.5 h-2.5 text-[#c6ff1f] shrink-0" />
                    <span className="font-bold text-white max-w-[90px] sm:max-w-[120px] truncate">
                      {currentCodeFileName || 'Code File'}
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={onOpenCodeFilesModal}
                    className="h-6 px-1.5 bg-[#18181c] hover:bg-[#c6ff1f] text-gray-300 hover:text-black rounded text-[9px] font-bold flex items-center gap-1 border border-[#2e2e36] transition-all cursor-pointer"
                  >
                    <Pencil className="w-2.5 h-2.5 text-[#c6ff1f]" />
                    <span className="hidden sm:inline">Files</span>
                  </button>

                  <button
                    type="button"
                    onClick={onOpenCodeFileSaveModal || handleSaveClick}
                    className="h-6 px-2 bg-[#c6ff1f]/10 text-[#c6ff1f] hover:bg-[#c6ff1f]/20 rounded text-[9px] font-bold flex items-center gap-1 border border-[#c6ff1f]/30 transition-all cursor-pointer"
                  >
                    <Save className="w-2.5 h-2.5" />
                    <span>Save</span>
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowLoadModal(true)}
                    className="h-6 px-1.5 bg-[#18181c] hover:bg-[#252528] border border-[#2e2e36] rounded text-[9px] text-gray-300 hover:text-white flex items-center gap-1 cursor-pointer"
                  >
                    <FolderOpen className="w-2.5 h-2.5" />
                    <span>Load</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveClick}
                    className="h-6 px-2 bg-[#c6ff1f]/10 text-[#c6ff1f] hover:bg-[#c6ff1f]/20 border border-[#c6ff1f]/30 rounded text-[9px] font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Save className="w-2.5 h-2.5" />
                    <span>Save</span>
                  </button>
                </div>
              )
            )}

            {onPopout && (
              <button
                type="button"
                onClick={onPopout}
                className="h-6 px-2 bg-indigo-500/15 hover:bg-indigo-600 text-indigo-400 hover:text-white border border-indigo-500/30 text-[9px] font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
                title="Pop out into a floating, resizable window near your video"
              >
                <ExternalLink className="w-2.5 h-2.5" />
                <span className="hidden sm:inline">Pop Out</span>
              </button>
            )}

            <div className="w-[1px] h-3.5 bg-[#2a2a2a] mx-0.5 shrink-0" />

            <button
              type="button"
              onClick={onExit}
              className="h-6 px-2 bg-red-500/15 text-red-400 hover:bg-red-600 hover:text-white border border-red-500/30 text-[9px] font-bold uppercase tracking-wider rounded transition-colors flex items-center gap-1 shadow-xs cursor-pointer shrink-0"
            >
              <PowerOff className="w-2.5 h-2.5" />
              <span>Exit</span>
            </button>
          </div>
        </div>

        {/* ROW 2: Tools Bar / Canvas Actions */}
        <div className="h-7.5 px-2.5 bg-[#141416] flex items-center justify-between gap-1.5">
          {!isTaggingMode ? (
            <>
              {/* Left: Add Elements & Connector Tools */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowTagSelectorModal(true)}
                  className="h-5.5 px-2 bg-[#1c1c22] hover:bg-[#282832] border border-[#2e2e38] hover:border-[#c6ff1f]/50 rounded text-[9px] font-bold text-white flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                >
                  <Tags className="w-2.5 h-2.5 text-[#c6ff1f]" />
                  <span>+ Tag</span>
                </button>
                <button
                  type="button"
                  onClick={() => setShowLabelSelectorModal(true)}
                  className="h-5.5 px-2 bg-[#1c1c22] hover:bg-[#282832] border border-[#2e2e38] hover:border-[#c6ff1f]/50 rounded text-[9px] font-bold text-white flex items-center gap-1 transition-colors shadow-xs cursor-pointer"
                >
                  <Folder className="w-2.5 h-2.5 text-[#c6ff1f]" />
                  <span>+ Label</span>
                </button>
                <button
                  type="button"
                  onClick={() => addNewItem('text')}
                  className="h-5.5 px-1.5 bg-[#1c1c22] hover:bg-[#282832] border border-[#2e2e38] rounded text-[9px] font-bold text-gray-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Type className="w-2.5 h-2.5 text-gray-400" />
                  <span>Text</span>
                </button>

                <div className="w-[1px] h-3 bg-[#2a2a2a] mx-0.5 shrink-0" />

                <button
                  type="button"
                  onClick={() => { setIsConnectorMode(!isConnectorMode); setConnectorSourceId(null); }}
                  className={`h-5.5 px-2 rounded text-[9px] font-bold flex items-center gap-1 border transition-all cursor-pointer ${
                    isConnectorMode
                      ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 shadow-xs'
                      : 'bg-[#1c1c22] border-[#2e2e38] text-gray-300 hover:bg-[#282832] hover:text-white'
                  }`}
                >
                  <Link className="w-2.5 h-2.5 text-blue-400" />
                  <span>{isConnectorMode ? 'Cancel' : 'Connect'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowConnectorsManager(true)}
                  className="h-5.5 px-1.5 rounded text-[9px] font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-[#222] border border-transparent hover:border-[#333] transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <Settings2 className="w-2.5 h-2.5" />
                  <span>Connectors</span>
                </button>

                <div className="w-[1px] h-3 bg-[#2a2a2a] mx-0.5 shrink-0" />

                <button
                  type="button"
                  onClick={handleSyncLayoutToFile}
                  className="h-5.5 px-2 bg-[#1c1c22] hover:bg-[#282832] border border-[#2e2e38] hover:border-[#c6ff1f]/50 rounded text-[9px] font-bold text-gray-300 hover:text-[#c6ff1f] transition-colors flex items-center gap-1 cursor-pointer"
                  title="Imitate & sync all tags, labels and groups from the active Code File onto the pad canvas"
                >
                  <Sparkles className="w-2.5 h-2.5 text-[#c6ff1f]" />
                  <span>Sync from File</span>
                </button>
              </div>

              {/* Right: Zoom & Utilities */}
              <div className="flex items-center gap-1 shrink-0">
                <div className="flex items-center bg-[#1c1c22] border border-[#2e2e38] rounded h-5.5 p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setZoom(prev => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
                    className="h-4.5 w-4.5 flex items-center justify-center hover:bg-[#282832] rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(prev => (Math.abs(prev - 0.85) < 0.01 ? 1 : 0.85))}
                    className="px-1 text-[8.5px] font-mono text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Click to reset zoom (85% / 100%)"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(prev => Math.min(2, Number((prev + 0.1).toFixed(2))))}
                    className="h-4.5 w-4.5 flex items-center justify-center hover:bg-[#282832] rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-2.5 h-2.5" />
                  </button>
                </div>

                <div className="w-[1px] h-3 bg-[#2a2a2a] mx-0.5 shrink-0" />

                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-5.5 px-1.5 bg-[#1c1c22] hover:bg-[#282832] border border-[#2e2e38] rounded text-[9px] text-gray-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Upload className="w-2.5 h-2.5 text-gray-400" />
                  <span className="hidden sm:inline">Import</span>
                  <input type="file" accept=".json" className="hidden" ref={fileInputRef} onChange={handleImport} />
                </button>
                <button
                  type="button"
                  onClick={exportPad}
                  className="h-5.5 px-1.5 bg-[#1c1c22] hover:bg-[#282832] border border-[#2e2e38] rounded text-[9px] text-gray-300 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-2.5 h-2.5 text-gray-400" />
                  <span className="hidden sm:inline">Export</span>
                </button>

                <div className="w-[1px] h-3 bg-[#2a2a2a] mx-0.5 shrink-0" />

                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  className="h-5.5 px-1.5 bg-[#1c1c22] hover:bg-[#282832] border border-[#2e2e38] rounded text-[9px] text-gray-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-2.5 h-2.5 text-[#c6ff1f]" />
                  <span>Guide</span>
                </button>

                {!hideTagSettings && onOpenTagSettings && (
                  <button
                    type="button"
                    onClick={onOpenTagSettings}
                    className="h-5.5 px-1.5 bg-[#1c1c22] hover:bg-[#282832] border border-[#2e2e38] rounded text-[9px] text-gray-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                  >
                    <Settings2 className="w-2.5 h-2.5 text-gray-400" />
                    <span>Tags</span>
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              {/* Left: Tagging status */}
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400 font-bold text-[9px] uppercase tracking-wider">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                  <span>Tagging Mode</span>
                </div>
                <span className="text-gray-500 text-[9px] hidden sm:inline">
                  • Click pad tags to record events • Press hotkeys to tag
                </span>
              </div>

              {/* Right: Tagging controls */}
              <div className="flex items-center gap-1 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowConnectorsManager(true)}
                  className="h-5.5 px-2 rounded text-[9px] font-bold uppercase tracking-wider text-gray-400 hover:text-white hover:bg-[#222] border border-transparent hover:border-[#333] transition-colors flex items-center gap-1"
                >
                  <Settings2 className="w-2.5 h-2.5" />
                  <span>Connectors</span>
                </button>

                <div className="w-[1px] h-3 bg-[#2a2a2a] mx-0.5 shrink-0" />

                <div className="flex items-center bg-[#1c1c22] border border-[#2e2e38] rounded h-5.5 p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => setZoom(prev => Math.max(0.4, Number((prev - 0.1).toFixed(2))))}
                    className="h-4.5 w-4.5 flex items-center justify-center hover:bg-[#282832] rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-2.5 h-2.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(prev => (Math.abs(prev - 0.85) < 0.01 ? 1 : 0.85))}
                    className="px-1 text-[8.5px] font-mono text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Click to reset zoom (85% / 100%)"
                  >
                    {Math.round(zoom * 100)}%
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom(prev => Math.min(2, Number((prev + 0.1).toFixed(2))))}
                    className="h-4.5 w-4.5 flex items-center justify-center hover:bg-[#282832] rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-2.5 h-2.5" />
                  </button>
                </div>

                <div className="w-[1px] h-3 bg-[#2a2a2a] mx-0.5 shrink-0" />

                <button
                  type="button"
                  onClick={() => setShowGuideModal(true)}
                  className="h-5.5 px-2 bg-[#1c1c22] hover:bg-[#282832] border border-[#2e2e38] rounded text-[9px] text-gray-300 hover:text-white flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <HelpCircle className="w-2.5 h-2.5 text-[#c6ff1f]" />
                  <span>Guide</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Toast Notification Banner */}
      {toastMessage && (
          <div className={`px-3 py-1.5 text-xs font-semibold flex items-center justify-between transition-all shrink-0 z-50 ${
              toastMessage.type === 'error' ? 'bg-red-500/20 text-red-300 border-b border-red-500/30' :
              toastMessage.type === 'success' ? 'bg-[#c6ff1f]/20 text-[#c6ff1f] border-b border-[#c6ff1f]/30' :
              'bg-blue-500/20 text-blue-300 border-b border-blue-500/30'
          }`}>
              <div className="flex items-center gap-2">
                  {toastMessage.type === 'success' && <Check className="w-3.5 h-3.5" />}
                  {toastMessage.type === 'error' && <X className="w-3.5 h-3.5" />}
                  {toastMessage.type === 'info' && <Info className="w-3.5 h-3.5" />}
                  <span>{toastMessage.text}</span>
              </div>
              <button onClick={() => setToastMessage(null)} className="text-gray-400 hover:text-white"><X className="w-3 h-3" /></button>
          </div>
      )}

      {/* Canvas Area */}
      <div className="flex-1 relative overflow-hidden bg-gradient-to-br from-[#161616] to-[#0a0a0a] select-none">
          {!isTaggingMode && (
              <>
                  <div className="absolute inset-0 pointer-events-none opacity-[0.03] z-0" 
                       style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)', backgroundSize: `${20 * zoom}px ${20 * zoom}px` }} />
                  <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_40px_rgba(0,0,0,0.8)] z-0" />
                  <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#c6ff1f]/10 border border-[#c6ff1f]/30 text-[#c6ff1f] px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-sm pointer-events-none z-10 flex items-center gap-2 shadow-lg">
                      <Edit2 className="w-3 h-3" /> Layout Mode Active
                  </div>
              </>
          )}
          
          {isTaggingMode && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-red-500/10 border border-red-500/30 text-red-500 px-4 py-1.5 rounded-full text-xs font-bold tracking-widest uppercase backdrop-blur-sm pointer-events-none z-10 flex items-center gap-2 shadow-lg">
                  <Video className="w-3 h-3" /> Tagging Mode Active
              </div>
          )}

          {/* Scrollable Viewport */}
          <div 
            ref={wrapperRef}
            className="absolute inset-0 overflow-auto select-none [&::-webkit-scrollbar]:w-3 [&::-webkit-scrollbar]:h-3 [&::-webkit-scrollbar-track]:bg-[#111]/50 [&::-webkit-scrollbar-thumb]:bg-[#333] [&::-webkit-scrollbar-thumb:hover]:bg-[#555] [&::-webkit-scrollbar-corner]:bg-[#111]"
            onClick={handleContainerClick}
            onPointerDown={(e) => {
              if (e.target === wrapperRef.current || e.target === containerRef.current) {
                if (window.getSelection) {
                  window.getSelection()?.removeAllRanges();
                }
              }
            }}
            style={{ cursor: isTaggingMode ? 'default' : (draggingItem ? 'grabbing' : 'grab'), userSelect: 'none', WebkitUserSelect: 'none' }}
          >
              {/* Scaled Container Spacer */}
              <div style={{ width: `${Math.max(1200, ...items.map(it => it.x + it.width + 200)) * zoom}px`, height: `${Math.max(800, ...items.map(it => it.y + it.height + 200)) * zoom}px` }}>
                  {/* Actual Transform Container */}
                  <div 
                     ref={containerRef}
                     className="origin-top-left select-none"
                     style={{ 
                         transform: `scale(${zoom})`,
                         width: `${Math.max(1200, ...items.map(it => it.x + it.width + 200))}px`,
                         height: `${Math.max(800, ...items.map(it => it.y + it.height + 200))}px`,
                         userSelect: 'none',
                         WebkitUserSelect: 'none'
                     }}
                  >
              {/* Connectors SVG Layer */}
              {showConnectorsOnPad && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                      <defs>
                          <marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                              <polygon points="0 0, 10 3.5, 0 7" fill="#888" />
                          </marker>
                          <marker id="arrowhead-start" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto-start-reverse">
                              <polygon points="0 0, 10 3.5, 0 7" fill="#888" />
                          </marker>
                          <marker id="arrowhead-active" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto">
                              <polygon points="0 0, 10 3.5, 0 7" fill="#c6ff1f" />
                          </marker>
                          <marker id="arrowhead-start-active" markerWidth="10" markerHeight="7" refX="1" refY="3.5" orient="auto-start-reverse">
                              <polygon points="0 0, 10 3.5, 0 7" fill="#c6ff1f" />
                          </marker>
                          <marker id="stopend" markerWidth="10" markerHeight="10" refX="5" refY="5" orient="auto">
                              <line x1="5" y1="0" x2="5" y2="10" stroke="#ef4444" strokeWidth="2" />
                          </marker>
                      </defs>
                      {connectors.map(conn => {
                          if (!conn.enabled) return null;
                          const source = items.find(i => i.id === conn.sourceId);
                          const target = items.find(i => i.id === conn.targetId);
                          if (!source || !target) return null;

                          const sx = source.x + source.width / 2;
                          const sy = source.y + source.height / 2;
                          const tx = target.x + target.width / 2;
                          const ty = target.y + target.height / 2;

                          const dx = tx - sx;
                          const dy = ty - sy;
                          const length = Math.sqrt(dx*dx + dy*dy);
                          if (length === 0) return null;

                          // Target intersection
                          const hwT = target.width / 2;
                          const hhT = target.height / 2;
                          const tTarget = Math.min(
                              Math.abs(dx) > 0 ? hwT / Math.abs(dx) : Infinity,
                              Math.abs(dy) > 0 ? hhT / Math.abs(dy) : Infinity
                          );
                          const paddingTarget = 14; // pixels to clear the arrow head
                          const txt = tx - (dx * tTarget) - (dx / length) * paddingTarget;
                          const tyt = ty - (dy * tTarget) - (dy / length) * paddingTarget;

                          // Source intersection
                          const hwS = source.width / 2;
                          const hhS = source.height / 2;
                          const tSource = Math.min(
                              Math.abs(dx) > 0 ? hwS / Math.abs(dx) : Infinity,
                              Math.abs(dy) > 0 ? hhS / Math.abs(dy) : Infinity
                          );
                          const paddingSource = conn.type === 'exclusive' ? 14 : 0;
                          const sxt = sx + (dx * tSource) + (dx / length) * paddingSource;
                          const syt = sy + (dy * tSource) + (dy / length) * paddingSource;

                          let stroke = '#666';
                          let strokeWidth = 2;
                          let markerEnd = '';
                          let markerStart = '';
                          let strokeDasharray = '';
                          
                          if (conn.type === 'trigger') {
                              markerEnd = 'url(#arrowhead)';
                          } else if (conn.type === 'defuse') {
                              markerEnd = 'url(#stopend)';
                              stroke = '#ef4444';
                          } else if (conn.type === 'exclusive') {
                              markerEnd = 'url(#arrowhead)';
                              markerStart = 'url(#arrowhead-start)';
                          } else if (conn.type === 'assign') {
                              strokeDasharray = '5,5';
                              stroke = '#a855f7';
                              markerEnd = 'url(#arrowhead)';
                          }
                          
                          const isActive = hoveredConnectorId === conn.id || selectedConnectorId === conn.id;
                          if (isActive) {
                              stroke = '#c6ff1f';
                              strokeWidth = 3;
                              if (conn.type === 'trigger' || conn.type === 'exclusive') {
                                  markerEnd = 'url(#arrowhead-active)';
                              }
                              if (conn.type === 'exclusive') {
                                  markerStart = 'url(#arrowhead-start-active)';
                              }
                          }

                          return (
                              <g 
                                key={conn.id} 
                                className="pointer-events-auto cursor-pointer"
                                onMouseEnter={() => setHoveredConnectorId(conn.id)}
                                onMouseLeave={() => setHoveredConnectorId(null)}
                                onClick={(e) => {
                                    e.stopPropagation();
                                    if (isConnectorMode) {
                                        setSelectedConnectorId(conn.id);
                                        const containerRect = containerRef.current!.getBoundingClientRect();
                                        setConnectorToolbar({
                                            id: conn.id,
                                            x: (e.clientX - containerRect.left) / zoom,
                                            y: (e.clientY - containerRect.top) / zoom
                                        });
                                    }
                                }}
                              >
                                  {/* Invisible wider area for hover */}
                                  <line x1={sxt} y1={syt} x2={txt} y2={tyt} stroke="transparent" strokeWidth="15" />
                                  <line 
                                      x1={sxt} y1={syt} x2={txt} y2={tyt} 
                                      stroke={stroke} 
                                      strokeWidth={strokeWidth} 
                                      strokeDasharray={strokeDasharray}
                                      markerEnd={markerEnd}
                                      markerStart={markerStart}
                                  />
                              </g>
                          );
                      })}
                  </svg>
              )}

              {items.map(item => (
                <CanvasItem 
                  key={item.id}
                  item={item}
                  tags={tags}
                  labels={labels}
                  labelGroups={labelGroups}
                  isTaggingMode={isTaggingMode}
                  isConnectorMode={isConnectorMode}
                  connectorSourceId={connectorSourceId}
                  hoveredConnectorId={hoveredConnectorId}
                  selectedConnectorId={selectedConnectorId}
                  activeRecording={activeRecording}
                  activeRecordings={activeRecordings}
                  flashingTagIds={flashingTagIds}
                  selectedItem={selectedItem}
                  draggingItem={draggingItem}
                  resizingItem={resizingItem}
                  connectors={connectors}
                  zoom={zoom}
                  handlePointerDown={handlePointerDown}
                  removeItem={removeItem}
                  setCustomizePopup={setCustomizePopup}
                  setResizingItem={setResizingItem}
                />
              ))}
                  </div>
              </div>
          </div>
      </div>

      {/* Guide Modal */}
      <GuideModal 
        isOpen={showGuideModal}
        onClose={() => setShowGuideModal(false)}
      />

      {/* Connectors Manager Modal */}
      <ConnectorsManagerModal 
        isOpen={showConnectorsManager}
        onClose={() => setShowConnectorsManager(false)}
        connectors={connectors}
        setConnectors={setConnectors}
        items={items}
        tags={tags}
        labels={labels}
        showConnectorsOnPad={showConnectorsOnPad}
        setShowConnectorsOnPad={setShowConnectorsOnPad}
      />

      {/* Connector Create Menu Modal */}
      <ConnectorMenuModal 
        showConnectorMenu={showConnectorMenu}
        onClose={() => setShowConnectorMenu(null)}
        items={items}
        tags={tags}
        labels={labels}
        connectors={connectors}
        setConnectors={setConnectors}
        showToast={showToast}
      />

      {/* Tag Selector Modal */}
      <TagSelectorModal 
        isOpen={showTagSelectorModal}
        onClose={() => setShowTagSelectorModal(false)}
        tags={tags}
        setTags={setTags}
        onAddTag={onAddTag}
        items={items}
        addTagToPad={addTagToPad}
        addAllMissingTagsToPad={addAllMissingTagsToPad}
        onOpenTagSettings={onOpenTagSettings}
        showToast={showToast}
      />

      {/* Label Selector Modal */}
      <LabelSelectorModal 
        isOpen={showLabelSelectorModal}
        onClose={() => setShowLabelSelectorModal(false)}
        labels={labels}
        labelGroups={labelGroups}
        setLabelGroups={setLabelGroups}
        setLabels={setLabels}
        onAddLabel={onAddLabel}
        items={items}
        addLabelToPad={addLabelToPad}
        addEntireGroupToPad={addEntireGroupToPad}
        addAllMissingLabelsToPad={addAllMissingLabelsToPad}
        showToast={showToast}
      />

      {/* Customize Style Popup */}
      <CustomizePopup 
        customizePopup={customizePopup}
        onClose={() => setCustomizePopup(null)}
        items={items}
        setItems={setItems}
        tags={tags}
        labels={labels}
        setLabels={setLabels}
        labelGroups={labelGroups}
        onEditTag={onEditTag}
        handleResetItemFontSize={handleResetItemFontSize}
        handleAdjustItemFontSize={handleAdjustItemFontSize}
        handleSetAllTagsFontSize={handleSetAllTagsFontSize}
      />

      {/* Preset Storage Modals */}
      <PresetModals 
        showSaveChoiceModal={showSaveChoiceModal}
        setShowSaveChoiceModal={setShowSaveChoiceModal}
        showSaveModal={showSaveModal}
        setShowSaveModal={setShowSaveModal}
        presetName={presetName}
        setPresetName={setPresetName}
        currentProjectName={currentProjectName}
        savePreset={savePreset}
        confirmOverwrite={confirmOverwrite}
        setConfirmOverwrite={setConfirmOverwrite}
        showLoadModal={showLoadModal}
        setShowLoadModal={setShowLoadModal}
        savedPresets={savedPresets}
        loadPreset={loadPreset}
        renamingProject={renamingProject}
        setRenamingProject={setRenamingProject}
        executeRename={executeRename}
        initiateRename={initiateRename}
        initiateDelete={initiateDelete}
        confirmDelete={confirmDelete}
        setConfirmDelete={setConfirmDelete}
        executeDelete={executeDelete}
      />

      {/* Connector Toolbar popup */}
      {connectorToolbar && (
          <div 
              className="absolute bg-[#222] border border-[#333] rounded-lg shadow-2xl p-2 z-[100] flex gap-2"
              style={{ left: Math.min(connectorToolbar.x * zoom, containerRef.current?.offsetWidth || 0), top: Math.min(connectorToolbar.y * zoom, containerRef.current?.offsetHeight || 0) }}
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
          >
              <button 
                  onClick={() => {
                      setConnectors(connectors.map(c => c.id === connectorToolbar.id ? {...c, enabled: !c.enabled} : c));
                  }} 
                  className="px-2 py-1 text-xs text-gray-300 hover:text-white bg-[#111] hover:bg-[#333] rounded flex items-center gap-1"
              >
                  {connectors.find(c => c.id === connectorToolbar.id)?.enabled ? <PowerOff className="w-3 h-3 text-yellow-500"/> : <Power className="w-3 h-3 text-green-500"/>}
                  {connectors.find(c => c.id === connectorToolbar.id)?.enabled ? 'Disable' : 'Enable'}
              </button>
              <button 
                  onClick={() => {
                      setConnectors(connectors.filter(c => c.id !== connectorToolbar.id));
                      setConnectorToolbar(null);
                      setSelectedConnectorId(null);
                  }} 
                  className="px-2 py-1 text-xs text-red-400 hover:text-red-300 bg-[#111] hover:bg-[#333] rounded flex items-center gap-1"
              >
                  <Trash2 className="w-3 h-3"/> Delete
              </button>
              <button onClick={() => {setConnectorToolbar(null); setSelectedConnectorId(null);}} className="p-1 text-gray-500 hover:text-white"><X className="w-4 h-4" /></button>
          </div>
      )}
    </div>
  );
};
