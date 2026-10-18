import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  FileCode,
  FolderOpen,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  AlertTriangle,
  Download,
  Upload,
  Search,
  Layers,
  LayoutGrid,
  Tag as TagIcon,
  Zap,
  Sliders,
  Maximize2,
  ZoomIn,
  ZoomOut,
  Link as LinkIcon
} from 'lucide-react';
import { Tag as TagData, Label, LabelGroup, AdvancedPadItem, SmartConnector, CodeFile } from '../../../types';
import {
  loadAllCodeFiles,
  saveAllCodeFiles,
  generateDefaultPadItems,
  buildCodeFileExportPayload
} from '../../../utils/codeFiles';
import { fadeColor } from '../../../utils/colors';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  currentFileName: string;
  existingEventsCount: number;
  currentTags: TagData[];
  currentLabels: Label[];
  currentLabelGroups?: LabelGroup[];
  currentPadItems?: AdvancedPadItem[];
  currentConnectors?: SmartConnector[];
  onApplyCodeFile: (file: CodeFile, clearEvents: boolean) => void;
  onCreateBlankFile: (clearEvents: boolean) => void;
  showNotification?: (text: string, color?: string) => void;
}

const getLuminance = (hex: string) => {
  if (!hex) return 0;
  const c = hex.startsWith('#') ? hex.substring(1) : hex;
  if (c.length !== 6 && c.length !== 3) return 0;
  let r: number, g: number, b: number;
  if (c.length === 3) {
    r = parseInt(c[0] + c[0], 16);
    g = parseInt(c[1] + c[1], 16);
    b = parseInt(c[2] + c[2], 16);
  } else {
    r = parseInt(c.substring(0, 2), 16);
    g = parseInt(c.substring(2, 4), 16);
    b = parseInt(c.substring(4, 6), 16);
  }
  return 0.299 * r + 0.587 * g + 0.114 * b;
};

export const CodeFilesModal: React.FC<Props> = ({
  isOpen,
  onClose,
  currentFileName,
  existingEventsCount,
  onApplyCodeFile,
  onCreateBlankFile,
  showNotification
}) => {
  const [codeFiles, setCodeFiles] = useState<CodeFile[]>([]);
  const [selectedFileId, setSelectedFileId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState<'pad' | 'list'>('pad');
  const [padZoom, setPadZoom] = useState<number>(0.9);

  // Confirmation dialogs
  const [confirmLoadWithEventsFile, setConfirmLoadWithEventsFile] = useState<CodeFile | null>(null);
  const [confirmBlankWithEvents, setConfirmBlankWithEvents] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const padViewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      const files = loadAllCodeFiles();
      setCodeFiles(files);
      const active = files.find(f => f.name.toLowerCase() === currentFileName.toLowerCase());
      if (active) {
        setSelectedFileId(active.id);
      } else if (files.length > 0) {
        setSelectedFileId(files[0].id);
      }
    }
  }, [isOpen, currentFileName]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;
      if (e.key === 'Escape') {
        if (confirmLoadWithEventsFile) setConfirmLoadWithEventsFile(null);
        else if (confirmBlankWithEvents) setConfirmBlankWithEvents(false);
        else if (deleteConfirmId) setDeleteConfirmId(null);
        else if (renamingId) setRenamingId(null);
        else onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, confirmLoadWithEventsFile, confirmBlankWithEvents, deleteConfirmId, renamingId, onClose]);

  const selectedFile = useMemo(() => {
    return codeFiles.find(f => f.id === selectedFileId) || codeFiles[0] || null;
  }, [codeFiles, selectedFileId]);

  const filteredFiles = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return codeFiles;
    return codeFiles.filter(f =>
      f.name.toLowerCase().includes(q) ||
      (f.description && f.description.toLowerCase().includes(q))
    );
  }, [codeFiles, searchQuery]);

  // Resolve exact pad items for the selected file
  const previewItems: AdvancedPadItem[] = useMemo(() => {
    if (!selectedFile) return [];
    if (selectedFile.items && selectedFile.items.length > 0) {
      return selectedFile.items;
    }
    return generateDefaultPadItems(
      selectedFile.tags || [],
      selectedFile.labels || [],
      selectedFile.labelGroups || []
    );
  }, [selectedFile]);

  // Connectors
  const previewConnectors: SmartConnector[] = useMemo(() => {
    if (!selectedFile) return [];
    return selectedFile.connectors || [];
  }, [selectedFile]);

  // Auto-fit zoom calculation
  const autoFitZoom = useCallback(() => {
    if (!padViewportRef.current || previewItems.length === 0) {
      setPadZoom(0.85);
      return;
    }
    const container = padViewportRef.current;
    const maxX = Math.max(820, ...previewItems.map(i => i.x + (i.width || 130) + 40));
    const maxY = Math.max(500, ...previewItems.map(i => i.y + (i.height || 44) + 40));

    const availW = container.clientWidth - 40;
    const availH = container.clientHeight - 40;

    if (availW <= 0 || availH <= 0) return;
    const scaleX = availW / maxX;
    const scaleY = availH / maxY;
    const scale = Math.min(scaleX, scaleY, 1.1);
    setPadZoom(Math.max(0.45, Math.min(1.2, parseFloat(scale.toFixed(2)))));
  }, [previewItems]);

  useEffect(() => {
    if (isOpen && viewMode === 'pad' && selectedFile) {
      const timer = setTimeout(autoFitZoom, 60);
      return () => clearTimeout(timer);
    }
  }, [isOpen, selectedFile?.id, viewMode, autoFitZoom]);

  if (!isOpen) return null;

  // Single Action Handlers
  const handleInitiateLoad = (file: CodeFile) => {
    if (existingEventsCount > 0) {
      setConfirmLoadWithEventsFile(file);
    } else {
      onApplyCodeFile(file, false);
      if (showNotification) showNotification(`Loaded Code File: "${file.name}"`, '#c6ff1f');
      onClose();
    }
  };

  const handleConfirmLoadWithEvents = () => {
    if (!confirmLoadWithEventsFile) return;
    onApplyCodeFile(confirmLoadWithEventsFile, true);
    if (showNotification) {
      showNotification(`Loaded "${confirmLoadWithEventsFile.name}" (Events reset)`, '#c6ff1f');
    }
    setConfirmLoadWithEventsFile(null);
    onClose();
  };

  const handleInitiateCreateBlank = () => {
    if (existingEventsCount > 0) {
      setConfirmBlankWithEvents(true);
    } else {
      onCreateBlankFile(false);
      if (showNotification) showNotification('Created Blank Code File', '#c6ff1f');
      onClose();
    }
  };

  const handleConfirmBlankWithEvents = () => {
    onCreateBlankFile(true);
    if (showNotification) showNotification('Created Blank Code File (Events reset)', '#c6ff1f');
    setConfirmBlankWithEvents(false);
    onClose();
  };

  const handleDeleteFile = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = codeFiles.filter(f => f.id !== id);
    setCodeFiles(updated);
    saveAllCodeFiles(updated);
    setDeleteConfirmId(null);
    if (selectedFileId === id) {
      setSelectedFileId(updated[0]?.id || '');
    }
    if (showNotification) showNotification('Code File deleted', '#ef4444');
  };

  const handleSaveRename = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const trimmed = renameValue.trim();
    if (!trimmed) {
      setRenamingId(null);
      return;
    }
    const updated = codeFiles.map(f => {
      if (f.id === id) {
        return { ...f, name: trimmed, updatedAt: new Date().toISOString() };
      }
      return f;
    });
    setCodeFiles(updated);
    saveAllCodeFiles(updated);
    setRenamingId(null);
    if (showNotification) showNotification(`Renamed to "${trimmed}"`, '#c6ff1f');
  };

  const handleExportFile = (file: CodeFile, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const payload = buildCodeFileExportPayload(file);
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(payload, null, 2));
    const dlAnchor = document.createElement('a');
    dlAnchor.setAttribute('href', dataStr);
    const safeName = file.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    dlAnchor.setAttribute('download', `${safeName}-codefile.json`);
    document.body.appendChild(dlAnchor);
    dlAnchor.click();
    dlAnchor.remove();
    if (showNotification) showNotification(`Exported Code File "${file.name}"`, '#c6ff1f');
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        let parsedTags: TagData[] = [];
        let parsedLabels: Label[] = [];
        let parsedGroups: LabelGroup[] = [];
        let parsedItems: AdvancedPadItem[] = [];
        let parsedConnectors: SmartConnector[] = [];
        let fileName = file.name.replace(/\.[^/.]+$/, '');

        if (data.name) fileName = data.name;
        if (Array.isArray(data.tags)) parsedTags = data.tags;
        else if (Array.isArray(data)) parsedTags = data;

        if (Array.isArray(data.labels)) parsedLabels = data.labels;
        if (Array.isArray(data.labelGroups)) parsedGroups = data.labelGroups;
        if (Array.isArray(data.items)) parsedItems = data.items;
        if (Array.isArray(data.connectors)) parsedConnectors = data.connectors;

        if (parsedItems.length === 0 && (parsedTags.length > 0 || parsedLabels.length > 0)) {
          parsedItems = generateDefaultPadItems(parsedTags, parsedLabels, parsedGroups);
        }

        const newFile: CodeFile = {
          id: `custom-${Date.now()}`,
          name: fileName,
          description: data.description || 'Imported Code File',
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isBuiltIn: false,
          tags: parsedTags,
          labels: parsedLabels,
          labelGroups: parsedGroups,
          items: parsedItems,
          connectors: parsedConnectors
        };

        const updated = [newFile, ...codeFiles];
        setCodeFiles(updated);
        saveAllCodeFiles(updated);
        setSelectedFileId(newFile.id);
        if (showNotification) showNotification(`Imported "${newFile.name}"!`, '#c6ff1f');
      } catch {
        if (showNotification) showNotification('Failed to parse JSON file.', '#ef4444');
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const isSelectedActiveInWorkspace = selectedFile && selectedFile.name.toLowerCase() === currentFileName.toLowerCase();

  // Canvas bounds
  const canvasWidth = Math.max(860, ...previewItems.map(it => it.x + (it.width || 130) + 60));
  const canvasHeight = Math.max(520, ...previewItems.map(it => it.y + (it.height || 44) + 60));

  return (
    <div className="fixed inset-0 z-[220] flex items-center justify-center p-2 sm:p-4 md:p-6 bg-black/80 backdrop-blur-md select-none animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="w-full max-w-5xl xl:max-w-6xl h-[640px] max-h-[92vh] bg-[#111115] border border-[#262632] rounded-2xl flex flex-col shadow-2xl overflow-hidden text-gray-200"
        onClick={e => e.stopPropagation()}
      >
        {/* --- MODAL HEADER --- */}
        <div className="h-12 px-4 bg-[#16161c] border-b border-[#22222d] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#c6ff1f]/10 border border-[#c6ff1f]/30 flex items-center justify-center text-[#c6ff1f] shrink-0">
              <FileCode className="w-3.5 h-3.5" />
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-bold text-white uppercase tracking-wide">Code Files</h2>
                <span className="text-[9px] px-1.5 py-0.2 bg-[#22222e] text-gray-400 rounded font-mono font-bold">
                  {codeFiles.length} files
                </span>
              </div>
              <span className="text-[10px] text-gray-400 truncate">
                Active in workspace: <strong className="text-[#c6ff1f]">{currentFileName}</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* New Blank Button */}
            <button
              onClick={handleInitiateCreateBlank}
              className="px-2.5 py-1 bg-[#20202a] hover:bg-[#2c2c3a] text-gray-200 hover:text-white border border-[#2e2e3e] rounded-lg text-[10.5px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Create a new blank Code File"
            >
              <Plus className="w-3 h-3 text-[#c6ff1f]" />
              <span className="hidden sm:inline">New Blank</span>
            </button>

            {/* Import Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-2.5 py-1 bg-[#20202a] hover:bg-[#2c2c3a] text-gray-300 hover:text-white border border-[#2e2e3e] rounded-lg text-[10.5px] font-medium flex items-center gap-1 transition-colors cursor-pointer"
              title="Import JSON Code File"
            >
              <Upload className="w-3 h-3 text-[#00eaff]" />
              <span className="hidden sm:inline">Import</span>
            </button>
            <input type="file" ref={fileInputRef} onChange={handleImportFile} accept=".json" className="hidden" />

            <div className="w-[1px] h-4 bg-[#2e2e3e] mx-0.5" />

            <button
              onClick={onClose}
              className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-[#22222e] transition-colors cursor-pointer"
              title="Close (ESC)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* --- MAIN 2-COLUMN BODY --- */}
        <div className="flex-1 flex overflow-hidden min-h-0">
          {/* LEFT SIDEBAR: COMPACT FILES LIST */}
          <div className="w-68 sm:w-76 border-r border-[#20202b] bg-[#0d0d11] flex flex-col shrink-0 min-h-0">
            {/* Search Input */}
            <div className="p-2 border-b border-[#1c1c26]">
              <div className="relative">
                <Search className="w-3 h-3 text-gray-500 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filter code files..."
                  className="w-full pl-7 pr-2.5 py-1 bg-[#14141a] border border-[#232330] rounded-md text-[11px] text-white placeholder-gray-500 outline-none focus:border-[#c6ff1f] transition-colors"
                />
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1 custom-scrollbar min-h-0">
              {filteredFiles.map(file => {
                const isSelected = selectedFile?.id === file.id;
                const isActive = file.name.toLowerCase() === currentFileName.toLowerCase();

                return (
                  <div
                    key={file.id}
                    onClick={() => setSelectedFileId(file.id)}
                    className={`p-2 rounded-lg border transition-all cursor-pointer relative group ${
                      isSelected
                        ? 'bg-[#1b1b24] border-[#c6ff1f]/60 shadow-sm ring-1 ring-[#c6ff1f]/20'
                        : 'bg-[#121217] border-[#1c1c24] hover:bg-[#161620] hover:border-[#2a2a38]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div className="min-w-0 flex-1">
                        {renamingId === file.id ? (
                          <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                            <input
                              type="text"
                              value={renameValue}
                              onChange={e => setRenameValue(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleSaveRename(file.id);
                                if (e.key === 'Escape') setRenamingId(null);
                              }}
                              className="px-1.5 py-0.5 bg-[#20202c] border border-[#c6ff1f] rounded text-[11px] text-white outline-none w-full font-bold"
                              autoFocus
                            />
                            <button
                              onClick={(e) => handleSaveRename(file.id, e)}
                              className="p-1 bg-[#c6ff1f] text-black rounded hover:bg-[#b0e817]"
                            >
                              <Check className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setRenamingId(null); }}
                              className="p-1 bg-[#2b2b38] text-gray-300 rounded hover:text-white"
                            >
                              <X className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-white' : 'text-gray-200'}`}>
                              {file.name}
                            </span>
                            {isActive && (
                              <span className="text-[7.5px] px-1 py-0.2 rounded bg-[#c6ff1f]/15 text-[#c6ff1f] font-mono uppercase font-black shrink-0 border border-[#c6ff1f]/30">
                                Active
                              </span>
                            )}
                          </div>
                        )}

                        {file.description && (
                          <p className="text-[9.5px] text-gray-400 line-clamp-1 mt-0.5 leading-tight">
                            {file.description}
                          </p>
                        )}

                        <div className="flex items-center gap-1.5 mt-1 text-[8.5px] text-gray-400 font-mono">
                          <span className="text-[#c6ff1f] font-semibold">{file.tags?.length || 0} tags</span>
                          <span>•</span>
                          <span className="text-[#00eaff] font-semibold">{file.labels?.length || 0} labels</span>
                          {file.isBuiltIn && (
                            <>
                              <span>•</span>
                              <span className="text-gray-400 uppercase font-semibold">Preset</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* File Card Actions */}
                      <div className="flex items-center gap-0.5 shrink-0 opacity-70 group-hover:opacity-100 transition-opacity">
                        {!file.isBuiltIn && (
                          <>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setRenamingId(file.id);
                                setRenameValue(file.name);
                              }}
                              className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#252532] transition-colors"
                              title="Rename file"
                            >
                              <Edit2 className="w-2.5 h-2.5" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setDeleteConfirmId(file.id);
                              }}
                              className="p-1 text-gray-400 hover:text-red-400 rounded hover:bg-[#252532] transition-colors"
                              title="Delete file"
                            >
                              <Trash2 className="w-2.5 h-2.5" />
                            </button>
                          </>
                        )}
                        <button
                          onClick={(e) => handleExportFile(file, e)}
                          className="p-1 text-gray-400 hover:text-[#c6ff1f] rounded hover:bg-[#252532] transition-colors"
                          title="Export JSON"
                        >
                          <Download className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    </div>

                    {/* Inline Delete Confirmation */}
                    {deleteConfirmId === file.id && (
                      <div
                        className="mt-1.5 p-1.5 bg-red-950/70 border border-red-500/40 rounded text-xs space-y-1"
                        onClick={e => e.stopPropagation()}
                      >
                        <p className="text-[10px] text-red-200 font-semibold">Delete this saved code file?</p>
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={(e) => handleDeleteFile(file.id, e)}
                            className="px-2 py-0.5 bg-red-600 hover:bg-red-500 text-white rounded text-[9px] font-bold"
                          >
                            Delete
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setDeleteConfirmId(null); }}
                            className="px-2 py-0.5 bg-[#2b2b38] hover:bg-[#38384a] text-gray-300 rounded text-[9px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {filteredFiles.length === 0 && (
                <div className="py-8 text-center text-gray-500 text-[11px]">
                  No matching code files.
                </div>
              )}
            </div>
          </div>

          {/* RIGHT AREA: REAL CODING PAD LAYOUT PREVIEW & SINGLE LOAD ACTION */}
          <div className="flex-1 flex flex-col bg-[#121217] overflow-hidden min-h-0">
            {selectedFile ? (
              <>
                {/* Preview Header & Controls */}
                <div className="px-3.5 py-2 bg-[#16161d] border-b border-[#20202c] flex items-center justify-between gap-2 shrink-0">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="text-xs font-bold text-white truncate" title={selectedFile.name}>
                        {selectedFile.name}
                      </h3>
                      {isSelectedActiveInWorkspace && (
                        <span className="text-[8px] px-1.5 py-0.2 rounded bg-[#c6ff1f]/15 text-[#c6ff1f] font-mono uppercase font-black shrink-0 border border-[#c6ff1f]/30">
                          Active in Workspace
                        </span>
                      )}
                    </div>
                    {selectedFile.description && (
                      <p className="text-[10px] text-gray-400 line-clamp-1 mt-0.5">
                        {selectedFile.description}
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {/* View Switcher: Coding Pad (Default) vs Matrix List */}
                    <div className="flex items-center bg-[#1c1c26] rounded-md p-0.5 border border-[#2b2b38] text-[9.5px]">
                      <button
                        onClick={() => setViewMode('pad')}
                        className={`px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1 ${
                          viewMode === 'pad' ? 'bg-[#c6ff1f] text-black shadow-xs' : 'text-gray-400 hover:text-white'
                        }`}
                        title="Coding Pad Canvas Layout as loaded in Workspace"
                      >
                        <Layers className="w-2.5 h-2.5" />
                        <span>Pad Layout</span>
                      </button>
                      <button
                        onClick={() => setViewMode('list')}
                        className={`px-2 py-0.5 rounded font-bold transition-all flex items-center gap-1 ${
                          viewMode === 'list' ? 'bg-[#c6ff1f] text-black shadow-xs' : 'text-gray-400 hover:text-white'
                        }`}
                        title="Tags & Labels List View"
                      >
                        <LayoutGrid className="w-2.5 h-2.5" />
                        <span>List</span>
                      </button>
                    </div>

                    {/* Pad Zoom Controls (only in Pad mode) */}
                    {viewMode === 'pad' && (
                      <div className="flex items-center bg-[#1a1a24] border border-[#2b2b3a] rounded p-0.5">
                        <button
                          onClick={() => setPadZoom(z => Math.max(0.4, parseFloat((z - 0.1).toFixed(2))))}
                          className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#252536] transition-colors"
                          title="Zoom Out"
                        >
                          <ZoomOut className="w-2.5 h-2.5" />
                        </button>
                        <span className="px-1 text-[8.5px] font-mono text-gray-400 font-bold">
                          {Math.round(padZoom * 100)}%
                        </span>
                        <button
                          onClick={() => setPadZoom(z => Math.min(1.5, parseFloat((z + 0.1).toFixed(2))))}
                          className="p-1 text-gray-400 hover:text-white rounded hover:bg-[#252536] transition-colors"
                          title="Zoom In"
                        >
                          <ZoomIn className="w-2.5 h-2.5" />
                        </button>
                        <button
                          onClick={autoFitZoom}
                          className="p-1 text-gray-400 hover:text-[#c6ff1f] rounded hover:bg-[#252536] transition-colors border-l border-[#2b2b3a] ml-0.5 pl-1"
                          title="Fit to Container"
                        >
                          <Maximize2 className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                {/* --- PREVIEW VIEWPORT: EXACT CODING PAD CANVAS DESIGN (NON-CLICKABLE) --- */}
                <div 
                  ref={padViewportRef}
                  className="flex-1 overflow-auto bg-[#0a0a0e] relative custom-scrollbar select-none"
                >
                  {viewMode === 'pad' ? (
                    <div 
                      className="relative min-h-full min-w-full p-6 flex items-start justify-start overflow-auto"
                      style={{
                        width: `${canvasWidth * padZoom + 40}px`,
                        height: `${canvasHeight * padZoom + 40}px`
                      }}
                    >
                      {/* Background Grid Pattern imitating the real Coding Pad canvas */}
                      <div
                        className="absolute inset-0 pointer-events-none opacity-[0.05]"
                        style={{
                          backgroundImage: 'linear-gradient(rgba(255,255,255,0.8) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.8) 1px, transparent 1px)',
                          backgroundSize: `${20 * padZoom}px ${20 * padZoom}px`
                        }}
                      />

                      {/* Scaled Canvas Container */}
                      <div
                        className="origin-top-left relative select-none pointer-events-none"
                        style={{
                          transform: `scale(${padZoom})`,
                          width: `${canvasWidth}px`,
                          height: `${canvasHeight}px`
                        }}
                      >
                        {/* Connectors SVG Layer */}
                        {previewConnectors.length > 0 && (
                          <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                            <defs>
                              <marker id="pv-arrowhead" markerWidth="8" markerHeight="6" refX="7" refY="3" orient="auto">
                                <polygon points="0 0, 8 3, 0 6" fill="#888" />
                              </marker>
                              <marker id="pv-arrowhead-start" markerWidth="8" markerHeight="6" refX="1" refY="3" orient="auto-start-reverse">
                                <polygon points="0 0, 8 3, 0 6" fill="#888" />
                              </marker>
                            </defs>
                            {previewConnectors.map(conn => {
                              if (!conn.enabled) return null;
                              const source = previewItems.find(i => i.id === conn.sourceId);
                              const target = previewItems.find(i => i.id === conn.targetId);
                              if (!source || !target) return null;

                              const sx = source.x + (source.width || 130) / 2;
                              const sy = source.y + (source.height || 42) / 2;
                              const tx = target.x + (target.width || 130) / 2;
                              const ty = target.y + (target.height || 42) / 2;

                              return (
                                <line
                                  key={conn.id}
                                  x1={sx}
                                  y1={sy}
                                  x2={tx}
                                  y2={ty}
                                  stroke={conn.type === 'defuse' ? '#ef4444' : '#777'}
                                  strokeWidth={1.5}
                                  strokeDasharray={conn.type === 'assign' ? '4,4' : undefined}
                                  markerEnd={conn.type === 'trigger' || conn.type === 'exclusive' ? 'url(#pv-arrowhead)' : undefined}
                                  markerStart={conn.type === 'exclusive' ? 'url(#pv-arrowhead-start)' : undefined}
                                  opacity={0.7}
                                />
                              );
                            })}
                          </svg>
                        )}

                        {/* Real Pad Items Rendering (Identical Design to Advanced Coding Pad) */}
                        {previewItems.map(item => {
                          if (item.type === 'tag') {
                            const tag = selectedFile.tags?.find(t => t.id === item.id);
                            if (!tag) return null;

                            const tagColor = item.color || tag.color || '#c6ff1f';
                            const customBgColor = tagColor;
                            const isBright = getLuminance(tagColor) > 160;
                            const textColor = isBright ? '#000000' : '#ffffff';
                            const subTextColor = isBright ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.85)';
                            const effectiveFontSize = item.fontSize || 12;

                            return (
                              <div
                                key={item.id}
                                style={{
                                  left: item.x,
                                  top: item.y,
                                  width: item.width || 130,
                                  height: item.height || 42,
                                  zIndex: item.zIndex ?? 10,
                                  transform: `rotate(${item.rotation || 0}deg)`
                                }}
                                className="absolute rounded-lg overflow-hidden shadow-lg border border-white/10 select-none"
                              >
                                <div
                                  className="w-full h-full flex flex-col items-center justify-center p-1 text-center relative"
                                  style={{ backgroundColor: customBgColor }}
                                >
                                  {/* Hotkey in top-left */}
                                  {tag.shortcut && (
                                    <span
                                      className="absolute top-0.5 left-1 font-mono font-bold"
                                      style={{
                                        color: subTextColor,
                                        fontSize: `${Math.max(7, Math.min(10, Math.floor(effectiveFontSize * 0.75)))}px`
                                      }}
                                    >
                                      {tag.shortcut.toUpperCase()}
                                    </span>
                                  )}

                                  {/* Tag Name */}
                                  <span
                                    className="font-bold tracking-tight break-words px-1 max-w-full"
                                    style={{
                                      color: textColor,
                                      fontSize: `${effectiveFontSize}px`,
                                      lineHeight: effectiveFontSize < 10 ? '1.1' : '1.2'
                                    }}
                                  >
                                    {tag.name}
                                  </span>

                                  {/* Lead / Lag indicator badge */}
                                  {tag.leadLagEnabled && (
                                    <span
                                      className="absolute bottom-0.5 right-1 text-[7.5px] font-mono opacity-85 flex items-center gap-0.5"
                                      style={{ color: subTextColor }}
                                    >
                                      <Zap className="w-2 h-2 text-yellow-300 fill-yellow-300" />
                                      <span>-{tag.preTime || 10}s/+{tag.postTime || 10}s</span>
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          }

                          if (item.type === 'label') {
                            const label = selectedFile.labels?.find(l => l.id === item.id);
                            const group = label?.groupId ? selectedFile.labelGroups?.find(g => g.id === label.groupId) : null;
                            const displayName = label?.name || item.content || 'Label';
                            const isBright = item.color ? getLuminance(item.color) > 160 : false;
                            const effectiveFontSize = item.fontSize || 11;

                            return (
                              <div
                                key={item.id}
                                style={{
                                  left: item.x,
                                  top: item.y,
                                  width: item.width || 120,
                                  height: item.height || 44,
                                  zIndex: item.zIndex ?? 5,
                                  transform: `rotate(${item.rotation || 0}deg)`
                                }}
                                className="absolute rounded-xl overflow-hidden shadow-sm border border-[#444] select-none"
                              >
                                <div
                                  className="w-full h-full flex flex-col items-center justify-center p-1 text-center relative"
                                  style={{
                                    backgroundColor: item.color ? fadeColor(item.color, 0.3) : 'rgba(34, 34, 34, 0.75)',
                                    borderColor: item.color ? fadeColor(item.color, 0.5) : '#444'
                                  }}
                                >
                                  {group && (
                                    <span
                                      className="text-[7.5px] font-bold uppercase tracking-wider px-1.5 py-0.2 rounded-full mb-0.5 truncate max-w-[95%] border border-white/10"
                                      style={{
                                        backgroundColor: isBright ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)',
                                        color: isBright ? '#222' : '#a3a3a3'
                                      }}
                                    >
                                      {group.name}
                                    </span>
                                  )}
                                  <span
                                    className="font-bold truncate px-1 text-gray-200"
                                    style={{ fontSize: `${effectiveFontSize}px` }}
                                  >
                                    {displayName}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          if (item.type === 'text') {
                            const isBright = item.color ? getLuminance(item.color) > 160 : false;
                            return (
                              <div
                                key={item.id}
                                style={{
                                  left: item.x,
                                  top: item.y,
                                  width: item.width || 160,
                                  height: item.height || 36,
                                  zIndex: item.zIndex ?? 1,
                                  transform: `rotate(${item.rotation || 0}deg)`
                                }}
                                className="absolute flex items-center justify-center px-2 py-1 select-none"
                              >
                                <div
                                  className="w-full h-full flex items-center justify-center rounded-lg border border-dashed text-center shadow-xs"
                                  style={{
                                    borderColor: 'rgba(255,255,255,0.2)',
                                    backgroundColor: item.color || 'rgba(255,255,255,0.06)',
                                    color: isBright ? '#000000' : 'white',
                                    fontSize: item.fontSize ? `${item.fontSize}px` : '12px'
                                  }}
                                >
                                  <span className="font-extrabold uppercase tracking-wider truncate px-1">
                                    {item.content || 'Header'}
                                  </span>
                                </div>
                              </div>
                            );
                          }

                          return null;
                        })}
                      </div>
                    </div>
                  ) : (
                    /* Matrix List View */
                    <div className="p-4 space-y-4 bg-[#0e0e12]">
                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <TagIcon className="w-3.5 h-3.5 text-[#c6ff1f]" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-200">
                            Tags ({selectedFile.tags?.length || 0})
                          </span>
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-1.5">
                          {(selectedFile.tags || []).map(tag => (
                            <div
                              key={tag.id}
                              className="relative py-1.5 px-2.5 pl-3 rounded-md border border-[#22222e] bg-[#15151c] flex items-center justify-between gap-1 overflow-hidden"
                            >
                              <div className="absolute left-0 top-0 bottom-0 w-[3.5px]" style={{ backgroundColor: tag.color || '#c6ff1f' }} />
                              <span className="text-[11px] font-semibold text-gray-200 truncate" title={tag.name}>
                                {tag.name}
                              </span>
                              <div className="flex items-center gap-1 shrink-0">
                                {tag.leadLagEnabled && (
                                  <span className="text-[8.5px] text-yellow-400 font-mono flex items-center">
                                    <Zap className="w-2.5 h-2.5" />
                                  </span>
                                )}
                                {tag.shortcut && (
                                  <span className="px-1.5 py-0.2 bg-[#20202c] border border-[#333346] rounded text-[8.5px] font-mono font-bold text-gray-400">
                                    {tag.shortcut.toUpperCase()}
                                  </span>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="flex items-center gap-1.5 mb-2">
                          <Sliders className="w-3.5 h-3.5 text-[#00eaff]" />
                          <span className="text-[11px] font-bold uppercase tracking-wider text-gray-200">
                            Labels ({selectedFile.labels?.length || 0})
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {(selectedFile.labels || []).map(l => (
                            <span
                              key={l.id}
                              className="px-2.5 py-1 rounded-lg bg-[#161622] border border-[#262638] text-[10px] font-medium text-gray-300"
                            >
                              {l.name}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* --- MODAL FOOTER: EXACTLY ONE PRIMARY ACTION BUTTON --- */}
                <div className="h-13 px-4 bg-[#14141a] border-t border-[#20202c] flex items-center justify-between gap-2 shrink-0">
                  <div className="flex items-center gap-1.5 text-[10.5px] min-w-0">
                    {existingEventsCount > 0 ? (
                      <span className="text-amber-400 font-semibold flex items-center gap-1 truncate">
                        <AlertTriangle className="w-3 h-3 shrink-0" />
                        <span className="truncate">Loading will replace {existingEventsCount} timeline events</span>
                      </span>
                    ) : (
                      <span className="text-gray-400 flex items-center gap-1 truncate font-mono text-[10px]">
                        <Check className="w-3 h-3 text-emerald-400 shrink-0" />
                        <span>Exact Coding Pad preview · Ready to load into workspace</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={onClose}
                      className="px-3 py-1.5 rounded-lg border border-[#2d2d38] text-[11px] font-semibold text-gray-300 hover:bg-[#202028] hover:text-white transition-colors cursor-pointer"
                    >
                      Cancel
                    </button>

                    {/* ONLY ONE PROMINENT LOAD BUTTON */}
                    <button
                      onClick={() => handleInitiateLoad(selectedFile)}
                      className={`px-4 py-1.5 rounded-lg text-[11px] font-bold flex items-center gap-1.5 shadow-md transition-all cursor-pointer ${
                        existingEventsCount > 0
                          ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                          : 'bg-[#c6ff1f] hover:bg-[#b0e817] text-black shadow-[#c6ff1f]/20'
                      }`}
                      title="Load this Code File and its Coding Pad into Workspace"
                    >
                      <FolderOpen className="w-3.5 h-3.5" />
                      <span>{isSelectedActiveInWorkspace ? 'Re-Apply to Workspace' : 'Load Into Workspace'}</span>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-gray-500 text-xs gap-1.5">
                <FileCode className="w-6 h-6 opacity-30" />
                <span>Select a code file from the left to view its pad layout.</span>
              </div>
            )}
          </div>
        </div>

        {/* --- CONFIRMATION MODAL: OVERWRITE EVENTS --- */}
        {confirmLoadWithEventsFile && (
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[240] flex items-center justify-center p-4"
            onClick={() => setConfirmLoadWithEventsFile(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#15151c] border border-amber-500/50 rounded-xl w-full max-w-sm p-5 shadow-2xl space-y-3.5 text-gray-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wide">
                    Replace Tagged Events?
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    You have <strong className="text-amber-400 font-mono font-bold">{existingEventsCount} events</strong> on the timeline.
                  </p>
                </div>
              </div>

              <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-lg text-left text-[11px] text-red-200 leading-relaxed">
                Loading <strong className="text-white">&quot;{confirmLoadWithEventsFile.name}&quot;</strong> will replace your coding matrix and clear timeline events.
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setConfirmLoadWithEventsFile(null)}
                  className="py-1.5 rounded-lg border border-[#333342] text-[11px] font-semibold text-gray-300 hover:bg-[#252530] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmLoadWithEvents}
                  className="py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold shadow-md transition-all flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Yes, Overwrite & Load</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* --- CONFIRMATION MODAL: CREATE BLANK WITH EVENTS --- */}
        {confirmBlankWithEvents && (
          <div
            className="fixed inset-0 bg-black/85 backdrop-blur-md z-[240] flex items-center justify-center p-4"
            onClick={() => setConfirmBlankWithEvents(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#15151c] border border-amber-500/50 rounded-xl w-full max-w-sm p-5 shadow-2xl space-y-3.5 text-gray-200"
              onClick={e => e.stopPropagation()}
            >
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-white uppercase tracking-wide">
                    Create Blank Code File?
                  </h3>
                  <p className="text-[10px] text-gray-400">
                    You have <strong className="text-amber-400 font-mono font-bold">{existingEventsCount} events</strong> on the timeline.
                  </p>
                </div>
              </div>

              <div className="p-2.5 bg-red-950/40 border border-red-500/30 rounded-lg text-left text-[11px] text-red-200 leading-relaxed">
                Starting a blank file will clear your current tags, labels, and timeline events.
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  onClick={() => setConfirmBlankWithEvents(false)}
                  className="py-1.5 rounded-lg border border-[#333342] text-[11px] font-semibold text-gray-300 hover:bg-[#252530] transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmBlankWithEvents}
                  className="py-1.5 rounded-lg bg-red-600 hover:bg-red-500 text-white text-[11px] font-bold shadow-md transition-all flex items-center justify-center gap-1"
                >
                  <Trash2 className="w-3 h-3" />
                  <span>Yes, Create Blank</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
