import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Tags,
  Tag,
  FolderOpen,
  Download,
  Upload,
  Layers,
  Settings2,
  Zap,
  FileSpreadsheet,
  Activity,
  Undo2,
  Redo2,
  ListPlus,
  Trash2,
  Trash,
  X,
  Check,
  Pencil,
  Plus,
  MapPin,
  Folder,
  FolderPlus,
  Scissors,
  StopCircle,
  Video,
  PlayCircle,
  FileCode,
  Save,
  Maximize,
  ExternalLink
} from 'lucide-react';
import type {
  Tag as TagData,
  TagEvent,
  Label,
  LabelGroup,
  ActiveRecording,
  Playlist,
  TimelineMarker,
  ToolType,
  Project,
  PlaylistItem
} from '../../types';
import { formatTime } from '../../utils/math';
import { fadeColor } from '../../utils/colors';
import { PlaylistClipItem } from '../Playlist/PlaylistClipItem';
import { getClipEventId, resolveClipTiming } from '../../utils/playlistUtils';

export interface WorkspaceSidebarProps {
  sidebarRef: React.RefObject<HTMLDivElement | null>;
  sidebarWidth: number;
  setIsResizingSidebar: (resizing: boolean) => void;
  activeSidebarTab: 'tags' | 'events' | 'notes' | 'playlist';
  setActiveSidebarTab: (tab: 'tags' | 'events' | 'notes' | 'playlist') => void;

  // Coding & Tags Tab Props
  isTaggingMode: boolean;
  setIsTaggingMode: (mode: boolean) => void;
  setActiveRecordings: (recordings: ActiveRecording[]) => void;
  setTool: (tool: ToolType) => void;
  setSelectedEventIds: (ids: Set<string>) => void;
  labelsEnabled: boolean;
  setLabelsEnabled: (enabled: boolean) => void;
  setShowNormalTemplateModal: (show: boolean) => void;
  currentNormalTemplateName: string;
  onOpenCodeFilesModal?: () => void;
  onOpenCodeFileSaveModal?: () => void;
  currentCodeFileName?: string;
  onPopoutCodingPanel?: () => void;
  exportUnifiedSetupToJSON: () => void;
  unifiedFileInputRef: React.RefObject<HTMLInputElement | null>;
  handleUnifiedFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void;
  setIsAdvancedCodingMode: (mode: boolean) => void;
  setTagSettingsOpen: (open: boolean) => void;
  tagPanelDensity: 'compact' | 'comfortable' | 'list';
  setTagPanelDensity: (density: 'compact' | 'comfortable' | 'list') => void;
  tagPanelFontSizeMode: 'auto' | 'sm' | 'md' | 'lg';
  setTagPanelFontSizeMode: (mode: 'auto' | 'sm' | 'md' | 'lg') => void;
  tags: TagData[];
  activeRecordings: ActiveRecording[];
  tagEvents: TagEvent[];
  setTagEvents: React.Dispatch<React.SetStateAction<TagEvent[]>>;
  filterTagId: string | null;
  setFilterTagId: (id: string | null) => void;
  filterLabelId: string | null;
  setFilterLabelId: (id: string | null) => void;
  handleTagClick: (tagId: string) => void;
  importEventsFromCSV: () => void;
  exportEventsToCSV: () => void;

  // Events Tab Props
  handleUndoEvents: () => void;
  canUndoEvents: boolean;
  handleRedoEvents: () => void;
  canRedoEvents: boolean;
  selectedEventLogs: Set<string>;
  setSelectedEventLogs: React.Dispatch<React.SetStateAction<Set<string>>>;
  selectedEventIds: Set<string>;
  addEventsToPlaylist: (ids: string[], playlistId?: string, forceDuplicate?: boolean) => void;
  getDisplayEvents: () => TagEvent[];
  showNotification: (msg: string, color?: string, onUndo?: () => void) => void;
  eventSortMode: 'recent' | 'timing';
  setEventSortMode: (mode: 'recent' | 'timing') => void;
  labels: Label[];
  labelGroups?: LabelGroup[];
  handleLabelClick?: (labelId: string) => void;
  bulkDeleteConfirmation: boolean;
  setBulkDeleteConfirmation: (val: boolean) => void;
  isEventsEditMode: boolean;
  setIsEventsEditMode: (val: boolean) => void;
  logDeleteConfirmation: string | null;
  setLogDeleteConfirmation: (id: string | null) => void;
  jumpToMarker: (time: number) => void;
  setPlaybarEventId: (id: string | null) => void;
  handleEventContextMenu: (e: React.MouseEvent, eventId: string) => void;

  // Notes Tab Props
  notesSubTab: 'timeline' | 'general';
  setNotesSubTab: (tab: 'timeline' | 'general') => void;
  setMarkerModal: (modal: any) => void;
  currentTime: number;
  markers: TimelineMarker[];
  setMarkers: React.Dispatch<React.SetStateAction<TimelineMarker[]>>;
  projectNotes: string;
  setProjectNotes: (notes: string) => void;

  // Playlist Tab Props
  playlists: Playlist[];
  setPlaylistModal: (modal: any) => void;
  activePlaylistId: string;
  setActivePlaylistId: (id: string) => void;
  setPlaylistDeleteId: (id: string | null) => void;
  showPlaylistPlaybar: boolean;
  setShowPlaylistPlaybar: (val: boolean) => void;
  handlePlaylistClipSelect: (index: number, startTime?: number, play?: boolean) => void;
  autoplay: { active: boolean; playlistId: string | null; eventIndex: number };
  setAutoplay: (val: any) => void;
  exportPlaylistVideo: (playlistId: string, withFreeze: boolean) => void;
  startPlaylistAutoplay: (playlistId: string) => void;
  allBatchTagEvents: TagEvent[];
  allBatchTags: TagData[];
  allBatchLabels: Label[];
  batchMode?: {
    batch: any;
    allBatchProjects: Project[];
    [key: string]: any;
  };
  playlistPlaybarIndex: number;
  draggingEventIndex: number | null;
  setDraggingEventIndex: (idx: number | null) => void;
  findEventAcrossBatch: (id: string, item?: PlaylistItem) => { event?: TagEvent; project?: Project };
  duplicatePlaylistEvent: (playlistId: string, index: number) => void;
  removeEventFromPlaylist: (playlistId: string, index: number) => void;
  handleResetPlaylistClipTrim: (playlistId: string, index: number) => void;
  reorderPlaylistEvents: (playlistId: string, fromIndex: number, toIndex: number) => void;
  addSelectedToPlaylist: (playlistId?: string, forceDuplicate?: boolean) => void;
  onEnterPresentationMode?: () => void;
}

export const getSidebarTagStyle = (
  name: string,
  density: 'compact' | 'comfortable' | 'list',
  fontMode: 'auto' | 'sm' | 'md' | 'lg'
) => {
  if (fontMode === 'sm') {
    return { fontSize: '8px', lineHeight: '1.08', letterSpacing: '-0.02em', lineClamp: 2 };
  }
  if (fontMode === 'md') {
    return { fontSize: '9.5px', lineHeight: '1.15', letterSpacing: 'normal', lineClamp: 2 };
  }
  if (fontMode === 'lg') {
    return { fontSize: '11px', lineHeight: '1.2', letterSpacing: 'normal', lineClamp: 2 };
  }
  // Auto-fit calculation based on tag name length and grid layout density:
  const len = name.length;
  if (density === 'list') {
    if (len > 30) return { fontSize: '9px', lineHeight: '1.15', letterSpacing: '-0.01em', lineClamp: 2 };
    if (len > 20) return { fontSize: '10px', lineHeight: '1.2', letterSpacing: 'normal', lineClamp: 2 };
    return { fontSize: '11.5px', lineHeight: '1.25', letterSpacing: 'normal', lineClamp: 1 };
  } else if (density === 'comfortable') {
    if (len > 24) return { fontSize: '7.5px', lineHeight: '1.05', letterSpacing: '-0.025em', lineClamp: 2 };
    if (len > 16) return { fontSize: '8.5px', lineHeight: '1.1', letterSpacing: '-0.015em', lineClamp: 2 };
    if (len > 10) return { fontSize: '9.5px', lineHeight: '1.15', letterSpacing: 'normal', lineClamp: 2 };
    return { fontSize: '10.5px', lineHeight: '1.2', letterSpacing: 'normal', lineClamp: 2 };
  } else {
    // 'compact' mode (~82-85px min)
    if (len > 20) return { fontSize: '7px', lineHeight: '1.0', letterSpacing: '-0.03em', lineClamp: 2 };
    if (len > 14) return { fontSize: '7.5px', lineHeight: '1.05', letterSpacing: '-0.02em', lineClamp: 2 };
    if (len > 9) return { fontSize: '8.5px', lineHeight: '1.1', letterSpacing: '-0.01em', lineClamp: 2 };
    if (len > 6) return { fontSize: '9.5px', lineHeight: '1.15', letterSpacing: 'normal', lineClamp: 2 };
    return { fontSize: '10.5px', lineHeight: '1.2', letterSpacing: 'normal', lineClamp: 2 };
  }
};

export const WorkspaceSidebar: React.FC<WorkspaceSidebarProps> = ({
  sidebarRef,
  sidebarWidth,
  setIsResizingSidebar,
  activeSidebarTab,
  setActiveSidebarTab,
  isTaggingMode,
  setIsTaggingMode,
  setActiveRecordings,
  setTool,
  setSelectedEventIds,
  labelsEnabled,
  setLabelsEnabled,
  setShowNormalTemplateModal,
  currentNormalTemplateName,
  onOpenCodeFilesModal,
  onOpenCodeFileSaveModal,
  currentCodeFileName,
  onPopoutCodingPanel,
  exportUnifiedSetupToJSON,
  unifiedFileInputRef,
  handleUnifiedFileSelect,
  setIsAdvancedCodingMode,
  setTagSettingsOpen,
  tagPanelDensity,
  setTagPanelDensity,
  tagPanelFontSizeMode,
  setTagPanelFontSizeMode,
  tags,
  activeRecordings,
  tagEvents,
  setTagEvents,
  filterTagId,
  setFilterTagId,
  filterLabelId,
  setFilterLabelId,
  handleTagClick,
  importEventsFromCSV,
  exportEventsToCSV,
  handleUndoEvents,
  canUndoEvents,
  handleRedoEvents,
  canRedoEvents,
  selectedEventLogs,
  setSelectedEventLogs,
  selectedEventIds,
  addEventsToPlaylist,
  getDisplayEvents,
  showNotification,
  eventSortMode,
  setEventSortMode,
  labels,
  labelGroups = [],
  handleLabelClick,
  bulkDeleteConfirmation,
  setBulkDeleteConfirmation,
  isEventsEditMode,
  setIsEventsEditMode,
  logDeleteConfirmation,
  setLogDeleteConfirmation,
  jumpToMarker,
  setPlaybarEventId,
  handleEventContextMenu,
  notesSubTab,
  setNotesSubTab,
  setMarkerModal,
  currentTime,
  markers,
  setMarkers,
  projectNotes,
  setProjectNotes,
  playlists,
  setPlaylistModal,
  activePlaylistId,
  setActivePlaylistId,
  setPlaylistDeleteId,
  showPlaylistPlaybar,
  setShowPlaylistPlaybar,
  handlePlaylistClipSelect,
  autoplay,
  setAutoplay,
  exportPlaylistVideo,
  startPlaylistAutoplay,
  allBatchTagEvents,
  allBatchTags,
  allBatchLabels,
  batchMode,
  playlistPlaybarIndex,
  draggingEventIndex,
  setDraggingEventIndex,
  findEventAcrossBatch,
  duplicatePlaylistEvent,
  removeEventFromPlaylist,
  handleResetPlaylistClipTrim,
  reorderPlaylistEvents,
  addSelectedToPlaylist,
  onEnterPresentationMode
}) => {
  return (
    <motion.div
      initial={{ x: 300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
      ref={sidebarRef}
      className="flex flex-col bg-[#111] border-l border-[#222] z-30 shrink-0 relative"
      style={{ width: sidebarWidth }}
    >
      <div
        className="absolute top-0 bottom-0 -left-1 w-2 cursor-ew-resize hover:bg-[#a0d600]/50 transition-colors z-50"
        onMouseDown={() => setIsResizingSidebar(true)}
      />

      {/* Main Tabs */}
      <div className="flex border-b border-[#222] shrink-0 bg-[#0a0a0a]">
        <button
          onClick={() => setActiveSidebarTab('tags')}
          className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
            activeSidebarTab === 'tags'
              ? 'text-[#c6ff1f] bg-[#161616] border-t border-t-[#c6ff1f]'
              : 'text-gray-500 hover:bg-[#111]'
          }`}
        >
          Tags
        </button>
        <button
          onClick={() => setActiveSidebarTab('events')}
          className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
            activeSidebarTab === 'events'
              ? 'text-[#c6ff1f] bg-[#161616] border-t border-t-[#c6ff1f]'
              : 'text-gray-500 hover:bg-[#111]'
          }`}
        >
          Events
        </button>
        <button
          onClick={() => setActiveSidebarTab('notes')}
          className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
            activeSidebarTab === 'notes'
              ? 'text-[#c6ff1f] bg-[#161616] border-t border-t-[#c6ff1f]'
              : 'text-gray-500 hover:bg-[#111]'
          }`}
        >
          Notes
        </button>
        <button
          onClick={() => setActiveSidebarTab('playlist')}
          className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider ${
            activeSidebarTab === 'playlist'
              ? 'text-[#c6ff1f] bg-[#161616] border-t border-t-[#c6ff1f]'
              : 'text-gray-500 hover:bg-[#111]'
          }`}
        >
          Playlist
        </button>
      </div>

      <div className="flex-1 overflow-hidden flex flex-col relative bg-[#111]">
        {/* --- CODING / TAGS PANEL TAB --- */}
        {activeSidebarTab === 'tags' && (
          <div className="flex flex-col h-full">
            {/* Compact Tagging Header */}
            <div className="px-2 py-1.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Tags className="w-3.5 h-3.5 text-[#c6ff1f]" />
                <span className="text-[11px] font-bold text-white">Event Tagging</span>
              </div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    isTaggingMode ? 'text-red-500 animate-pulse' : 'text-gray-500'
                  }`}
                >
                  {isTaggingMode ? 'REC' : 'OFF'}
                </span>
                <button
                  onClick={() => {
                    const nextMode = !isTaggingMode;
                    setIsTaggingMode(nextMode);
                    setActiveRecordings([]);
                    if (nextMode) {
                      setTool(null);
                      setSelectedEventIds(new Set());
                    }
                  }}
                  className={`w-7 h-4 rounded-full relative transition-colors ${
                    isTaggingMode ? 'bg-red-500' : 'bg-gray-700'
                  }`}
                >
                  <motion.div
                    className="w-2.5 h-2.5 bg-white rounded-full absolute top-0.5"
                    animate={{ left: isTaggingMode ? 'calc(100% - 12px)' : '2px' }}
                  />
                </button>
              </div>
            </div>

            {/* Labels Toggle */}
            <div className="px-2 py-1.5 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#0a0a0a]">
              <div className="flex items-center gap-1.5 min-w-0">
                <Tag className="w-3.5 h-3.5 text-[#c6ff1f] shrink-0" />
                <span className="text-[11px] font-bold text-white truncate">Labels</span>
                <span className="px-1.5 py-0.2 bg-[#1a1a20] text-gray-400 rounded text-[8.5px] font-mono font-bold shrink-0">
                  {labels.length}
                </span>
                {(() => {
                  const attachedCount = activeRecordings.reduce((acc, r) => acc + (r.labelIds?.length || 0), 0);
                  if (attachedCount > 0) {
                    return (
                      <span className="px-1.5 py-0.2 bg-[#c6ff1f]/15 text-[#c6ff1f] border border-[#c6ff1f]/30 rounded text-[8.5px] font-bold animate-pulse shrink-0">
                        {attachedCount} rec
                      </span>
                    );
                  }
                  return null;
                })()}
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <span
                  className={`text-[9px] font-bold uppercase tracking-wider ${
                    labelsEnabled ? 'text-[#c6ff1f]' : 'text-gray-500'
                  }`}
                >
                  {labelsEnabled ? 'ON' : 'OFF'}
                </span>
                <button
                  type="button"
                  onClick={() => setLabelsEnabled(!labelsEnabled)}
                  className={`w-7 h-4 rounded-full relative transition-colors cursor-pointer ${
                    labelsEnabled ? 'bg-[#c6ff1f]' : 'bg-gray-700'
                  }`}
                  title="Toggle Labels panel"
                >
                  <motion.div
                    className="w-2.5 h-2.5 bg-white rounded-full absolute top-0.5"
                    animate={{ left: labelsEnabled ? 'calc(100% - 12px)' : '2px' }}
                  />
                </button>
              </div>
            </div>

            {/* Unified Code File Bar */}
            <div className="px-2 py-1.5 bg-[#141416] border-b border-[#222] flex items-center justify-between gap-1.5 shrink-0">
              <button
                onClick={onOpenCodeFilesModal || (() => setShowNormalTemplateModal(true))}
                className="flex items-center gap-1.5 min-w-0 text-left hover:bg-[#1c1c22] p-1 rounded-md transition-colors group cursor-pointer flex-1"
                title="Open Code Files & Presets (Tags, Labels & Pad Layout)"
              >
                <div className="w-5 h-5 rounded bg-[#c6ff1f]/10 border border-[#c6ff1f]/30 flex items-center justify-center text-[#c6ff1f] shrink-0 group-hover:scale-105 transition-transform">
                  <FileCode className="w-3 h-3" />
                </div>
                <div className="flex flex-col min-w-0">
                  <span className="text-[7.5px] font-extrabold uppercase tracking-wider text-gray-400 leading-none">
                    Code File
                  </span>
                  <span
                    className="text-[10px] font-bold text-white truncate max-w-[130px] leading-tight group-hover:text-[#c6ff1f] transition-colors"
                    title={currentCodeFileName || currentNormalTemplateName}
                  >
                    {currentCodeFileName || currentNormalTemplateName}
                  </span>
                </div>
              </button>

              <div className="flex items-center gap-1.5 shrink-0">
                {/* Save / Overwrite Button */}
                <button
                  onClick={onOpenCodeFileSaveModal || exportUnifiedSetupToJSON}
                  className="px-2 py-1 bg-[#c6ff1f]/10 hover:bg-[#c6ff1f]/25 text-[#c6ff1f] border border-[#c6ff1f]/30 hover:border-[#c6ff1f]/60 rounded text-[9px] font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                  title="Save or Overwrite Code File"
                >
                  <Save className="w-2.5 h-2.5" />
                  <span>Save</span>
                </button>
              </div>
            </div>

            {/* Hidden File Input for Unified Coding Template */}
            <input
              type="file"
              ref={unifiedFileInputRef as any}
              onChange={handleUnifiedFileSelect}
              accept=".json"
              className="hidden"
            />

            {/* Quick Action: Open Coding Pad, Pop out & Tag Settings */}
            <div className="p-1 sm:p-1.5 bg-[#101012] border-b border-[#222] flex items-center justify-between gap-1 sm:gap-1.5 shrink-0">
              <button
                onClick={() => setIsAdvancedCodingMode(true)}
                className="flex-1 min-w-fit py-1 px-1.5 bg-[#c6ff1f]/10 hover:bg-[#c6ff1f]/20 border border-[#c6ff1f]/30 hover:border-[#c6ff1f]/60 rounded text-[9.5px] font-bold tracking-tight text-[#c6ff1f] flex items-center justify-center gap-1 transition-all shadow-xs group cursor-pointer"
                title="Open Interactive Coding Pad Canvas"
              >
                <Layers className="w-3 h-3 shrink-0 group-hover:scale-105 transition-transform" />
                <span className="whitespace-nowrap leading-none select-none">Open Pad</span>
              </button>
              {onPopoutCodingPanel && (
                <button
                  type="button"
                  onClick={onPopoutCodingPanel}
                  className="py-1 px-2 bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/30 hover:border-indigo-500/60 rounded text-indigo-400 hover:text-white flex items-center justify-center transition-all shrink-0 cursor-pointer shadow-xs group"
                  title="Pop out Coding Panel into a floating resizable window entity near your video"
                >
                  <ExternalLink className="w-3.5 h-3.5 shrink-0 text-indigo-400 group-hover:scale-110 transition-transform" />
                </button>
              )}
              <button
                onClick={() => setTagSettingsOpen(true)}
                className="py-1 px-1.5 bg-[#1e1e24] hover:bg-[#282830] border border-[#2e2e3a] rounded text-[9.5px] font-medium text-gray-300 hover:text-white flex items-center justify-center gap-1 transition-colors shrink-0 min-w-fit cursor-pointer"
                title="Open Code Window & Tag Settings"
              >
                <Settings2 className="w-3 h-3 shrink-0 text-gray-400" />
                <span className="whitespace-nowrap leading-none select-none">Settings</span>
              </button>
            </div>

            {/* Responsive Tags Grid */}
            <div className="flex-1 overflow-y-auto p-1.5 custom-scrollbar">
              <div
                className="grid gap-1.5"
                style={{
                  gridTemplateColumns: 'repeat(auto-fill, minmax(82px, 1fr))'
                }}
              >
                {tags.map((tag) => {
                  const isActive = isTaggingMode && activeRecordings.some((r) => r.tagId === tag.id);
                  const count = tagEvents.filter((e) => e.tagId === tag.id).length;
                  const isFiltered = filterTagId === tag.id;
                  const tagStyle = getSidebarTagStyle(tag.name, 'compact', 'auto');
                  return (
                    <button
                      key={tag.id}
                      onClick={() => handleTagClick(tag.id)}
                      className={`relative min-h-[36px] sm:min-h-[38px] h-auto py-1 px-1.5 pl-2.5 rounded border flex items-center justify-between gap-1 transition-all overflow-hidden group text-left ${
                        isTaggingMode
                          ? isActive
                            ? 'border-transparent bg-gray-800 scale-95 ring-1 ring-white'
                            : 'border-[#333] bg-[#161616] hover:bg-[#222]'
                          : isFiltered
                          ? 'border-transparent bg-[#222] ring-1 ring-white'
                          : 'border-[#333] bg-[#161616] hover:bg-[#222]'
                      }`}
                      style={{
                        borderColor: isActive || isFiltered ? tag.color : undefined,
                        boxShadow: isActive ? `0 0 10px ${fadeColor(tag.color, 0.2)}` : undefined
                      }}
                      title={`${tag.name}${tag.shortcut ? ` [Key: ${tag.shortcut}]` : ''} • Click to ${
                        isTaggingMode ? 'record event' : 'filter events'
                      }`}
                    >
                      <div className="absolute left-0 top-0 bottom-0 w-[3.5px]" style={{ backgroundColor: tag.color }} />
                      <div className="flex-1 min-w-0 pr-0.5 flex flex-col justify-center">
                        <span
                          className="font-medium text-gray-200 select-none"
                          style={{
                            fontSize: tagStyle.fontSize,
                            lineHeight: tagStyle.lineHeight,
                            letterSpacing: tagStyle.letterSpacing,
                            wordBreak: 'break-word',
                            display: '-webkit-box',
                            WebkitLineClamp: tagStyle.lineClamp,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                          }}
                        >
                          {tag.name}
                        </span>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 ml-0.5">
                        {tag.shortcut && (
                          <div
                            className="flex items-center justify-center min-w-[15px] h-[15px] bg-[#2a2a2a] group-hover:bg-[#383838] rounded-sm text-[8px] sm:text-[8.5px] font-bold text-gray-400 group-hover:text-white border border-[#444] px-0.5 font-mono shadow-xs"
                            title={`Hotkey: ${tag.shortcut}`}
                          >
                            {tag.shortcut}
                          </div>
                        )}
                        {!isTaggingMode && (
                          <span
                            className="text-[8.5px] text-gray-500 font-mono font-medium px-0.5"
                            title={`${count} logged events`}
                          >
                            {count}
                          </span>
                        )}
                      </div>
                      {isActive && (
                        <div className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                      )}
                      {isTaggingMode && tag.leadLagEnabled && (
                        <div className="absolute bottom-0.5 right-0.5 opacity-50">
                          <Zap className="w-2 h-2 text-yellow-500 fill-yellow-500" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Pinned Footer for Events Data CSV */}
            <div className="p-2 border-t border-[#222] bg-[#0c0c0e] flex items-center justify-between gap-1.5 shrink-0 select-none">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[9.5px] font-bold text-gray-200 leading-tight">Events Data</span>
                  <span className="text-[8px] text-gray-500 font-mono leading-none">
                    {tagEvents.length} logged {tagEvents.length === 1 ? 'event' : 'events'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={importEventsFromCSV}
                  className="px-2 py-1 bg-[#1a1a22] hover:bg-[#262635] text-gray-300 hover:text-white rounded text-[9.5px] font-medium border border-[#2d2d38] transition-colors flex items-center gap-1 shadow-xs"
                  title="Import logged event timestamps and notes from CSV spreadsheet"
                >
                  <Upload className="w-3 h-3 text-gray-400" />
                  <span>Import CSV</span>
                </button>
                <button
                  onClick={exportEventsToCSV}
                  className="px-2 py-1 bg-[#16231c] hover:bg-[#1f3328] text-emerald-300 hover:text-emerald-200 rounded text-[9.5px] font-bold border border-emerald-800/40 transition-colors flex items-center gap-1 shadow-xs"
                  title="Export all logged events (timestamps, tags, labels, notes) to CSV spreadsheet"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- EVENTS TAB --- */}
        {activeSidebarTab === 'events' && (
          <div className="flex flex-col h-full">
            <div className="px-2 py-1.5 border-b border-[#222] flex flex-wrap items-center justify-between gap-1 shrink-0">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-white">Events ({tagEvents.length})</span>
              </div>
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  onClick={handleUndoEvents}
                  disabled={!canUndoEvents}
                  className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                  title="Undo Logging"
                >
                  <Undo2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleRedoEvents}
                  disabled={!canRedoEvents}
                  className="text-gray-400 hover:text-white disabled:opacity-30 transition-colors"
                  title="Redo Logging"
                >
                  <Redo2 className="w-3.5 h-3.5" />
                </button>
                <div className="w-[1px] h-3 bg-[#333] mx-0.5 hidden sm:block"></div>
                <button
                  onClick={(e) => {
                    const force = e.shiftKey;
                    if (selectedEventLogs.size > 0) {
                      addEventsToPlaylist(Array.from(selectedEventLogs), undefined, force);
                    } else if (selectedEventIds.size > 0) {
                      addEventsToPlaylist(Array.from(selectedEventIds), undefined, force);
                    } else {
                      const displayEvts = getDisplayEvents();
                      if (displayEvts.length > 0) {
                        addEventsToPlaylist(
                          displayEvts.map((e) => e.id),
                          undefined,
                          force
                        );
                      } else {
                        showNotification('No events to add to playlist', '#f59e0b');
                      }
                    }
                  }}
                  className="flex items-center gap-1 bg-[#1e293b] hover:bg-[#334155] text-[#c6ff1f] px-1.5 py-0.5 rounded text-[9px] font-bold border border-[#334155] transition-colors"
                  title="Add selected (or all filtered) events to playlist (Ctrl+S) • Hold Shift for duplicates"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>+ Playlist</span>
                </button>
                <div className="w-[1px] h-3 bg-[#333] mx-0.5 hidden sm:block"></div>
                <select
                  value={eventSortMode}
                  onChange={(e) => setEventSortMode(e.target.value as 'recent' | 'timing')}
                  className="bg-[#222] border border-[#333] text-[9px] text-gray-300 rounded outline-none w-[55px] px-1 py-0.5"
                >
                  <option value="recent">Recent</option>
                  <option value="timing">Timing</option>
                </select>
                <select
                  value={filterTagId || ''}
                  onChange={(e) => setFilterTagId(e.target.value || null)}
                  className="bg-[#222] border border-[#333] text-[9px] text-gray-300 rounded outline-none w-[55px] px-1 py-0.5"
                >
                  <option value="">All Tags</option>
                  {tags.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <select
                  value={filterLabelId || ''}
                  onChange={(e) => setFilterLabelId(e.target.value || null)}
                  className="bg-[#222] border border-[#333] text-[9px] text-gray-300 rounded outline-none w-[55px] px-1 py-0.5"
                >
                  <option value="">All Lbls</option>
                  {labels.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.name}
                    </option>
                  ))}
                </select>

                {bulkDeleteConfirmation ? (
                  <div className="flex items-center gap-1 bg-[#161616] px-1 rounded shadow-lg border border-[#333]">
                    <button
                      onClick={() => {
                        if (selectedEventLogs.size > 0) {
                          setTagEvents((prev) => prev.filter((e) => !selectedEventLogs.has(e.id)));
                        } else {
                          setTagEvents([]);
                        }
                        setSelectedEventLogs(new Set());
                        setIsEventsEditMode(false);
                        setBulkDeleteConfirmation(false);
                      }}
                      className="text-green-400 hover:text-green-300 p-0.5"
                      title="Confirm Delete"
                    >
                      <Check className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => setBulkDeleteConfirmation(false)}
                      className="text-red-400 hover:text-red-300 p-0.5"
                      title="Cancel"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : isEventsEditMode ? (
                  <>
                    <button
                      onClick={() => setBulkDeleteConfirmation(true)}
                      className="text-red-400 hover:text-red-300 transition-colors bg-red-900/30 px-1.5 py-0.5 rounded flex items-center gap-1"
                      title={selectedEventLogs.size > 0 ? 'Delete Selected' : 'Clear All Events'}
                    >
                      <Trash2 className="w-3 h-3" />
                      <span className="text-[9px] font-bold">
                        {selectedEventLogs.size > 0 ? selectedEventLogs.size : 'All'}
                      </span>
                    </button>
                    <button
                      onClick={() => {
                        setSelectedEventLogs(new Set());
                        setIsEventsEditMode(false);
                      }}
                      className="text-gray-400 hover:text-white transition-colors"
                      title="Cancel Edit"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setIsEventsEditMode(true)}
                    className="text-gray-500 hover:text-red-400 transition-colors"
                    title="Delete Events"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-1.5 custom-scrollbar space-y-1">
              {getDisplayEvents().map((evt) => {
                const tag = tags.find((t) => t.id === evt.tagId);
                const isSelected = selectedEventLogs.has(evt.id);
                const isConfirming = logDeleteConfirmation === evt.id;
                return (
                  <div
                    key={evt.id}
                    className={`flex items-center gap-1.5 p-1.5 rounded border group cursor-pointer transition-colors ${
                      selectedEventLogs.has(evt.id) || selectedEventIds.has(evt.id)
                        ? 'bg-[#c6ff1f]/20 border-[#c6ff1f]/30'
                        : 'bg-[#161616] hover:bg-[#222] border-transparent hover:border-[#333]'
                    }`}
                    onClick={(e) => {
                      if (isEventsEditMode || e.ctrlKey || e.metaKey || e.shiftKey) {
                        e.stopPropagation();
                        const newSet = new Set(selectedEventLogs);
                        if (newSet.has(evt.id)) newSet.delete(evt.id);
                        else newSet.add(evt.id);
                        setSelectedEventLogs(newSet);
                        setSelectedEventIds(new Set(newSet));
                        if (!isEventsEditMode) setIsEventsEditMode(true);
                      } else {
                        jumpToMarker(evt.startTime);
                        setSelectedEventIds(new Set([evt.id]));
                        setSelectedEventLogs(new Set([evt.id]));
                        setPlaybarEventId(evt.id);
                      }
                    }}
                    onContextMenu={(e) => handleEventContextMenu(e, evt.id)}
                  >
                    {isEventsEditMode && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          const newSet = new Set(selectedEventLogs);
                          if (e.target.checked) newSet.add(evt.id);
                          else newSet.delete(evt.id);
                          setSelectedEventLogs(newSet);
                        }}
                        className="w-2.5 h-2.5 shrink-0 rounded border-[#444] bg-[#222] cursor-pointer"
                        onClick={(e) => e.stopPropagation()}
                      />
                    )}
                    <div
                      className="w-[3px] self-stretch min-h-[16px] rounded-full shrink-0"
                      style={{ backgroundColor: tag?.color }}
                    />

                    <div className="flex-1 min-w-0 flex flex-wrap items-center gap-x-1.5 gap-y-0.5">
                      <span className="text-[10px] font-medium text-gray-300 truncate max-w-[80px] shrink-0">
                        {tag?.name}{' '}
                        {evt.labelIds && evt.labelIds.length > 0 && (
                          <span className="text-[#c6ff1f] font-normal">
                            {' '}
                            -{' '}
                            {evt.labelIds
                              .map((id) => labels.find((l) => l.id === id)?.name)
                              .filter(Boolean)
                              .join(', ')}
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-1 text-[9px] text-gray-500 font-mono shrink-0">
                        <span>
                          {new Date(evt.startTime * 1000).toISOString().substr(14, 5)} -{' '}
                          {new Date(evt.endTime * 1000).toISOString().substr(14, 5)}
                        </span>
                        <span className="text-gray-600 bg-[#222] px-1 rounded text-[8px]">
                          {(evt.endTime - evt.startTime).toFixed(1)}s
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end shrink-0 ml-auto relative gap-1">
                      {!isEventsEditMode && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            addEventsToPlaylist([evt.id], undefined, e.shiftKey);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-[#c6ff1f] p-0.5 transition-opacity"
                          title="Add to Playlist (Ctrl+S) • Hold Shift for duplicate"
                        >
                          <ListPlus className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {isConfirming ? (
                        <div className="flex items-center gap-1 bg-[#161616] px-1 rounded shadow-lg z-10 border border-[#333] absolute right-0">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTagEvents((prev) => prev.filter((x) => x.id !== evt.id));
                              setLogDeleteConfirmation(null);
                            }}
                            className="text-green-400 hover:text-green-300 p-0.5"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLogDeleteConfirmation(null);
                            }}
                            className="text-red-400 hover:text-red-300 p-0.5"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        !isEventsEditMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setLogDeleteConfirmation(evt.id);
                            }}
                            className="opacity-0 group-hover:opacity-100 text-gray-500 hover:text-red-400 p-0.5 transition-opacity"
                            title="Delete"
                          >
                            <Trash className="w-3 h-3" />
                          </button>
                        )
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pinned Footer for Events Data CSV in Events Tab */}
            <div className="p-2 border-t border-[#222] bg-[#0c0c0e] flex items-center justify-between gap-1.5 shrink-0 select-none">
              <div className="flex items-center gap-1.5 min-w-0">
                <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <div className="flex flex-col min-w-0">
                  <span className="text-[9.5px] font-bold text-gray-200 leading-tight">Events Data</span>
                  <span className="text-[8px] text-gray-500 font-mono leading-none">
                    {tagEvents.length} logged {tagEvents.length === 1 ? 'event' : 'events'}
                  </span>
                </div>
              </div>
              <div className="flex items-center gap-1 shrink-0">
                <button
                  onClick={importEventsFromCSV}
                  className="px-2 py-1 bg-[#1a1a22] hover:bg-[#262635] text-gray-300 hover:text-white rounded text-[9.5px] font-medium border border-[#2d2d38] transition-colors flex items-center gap-1 shadow-xs"
                  title="Import logged event timestamps and notes from CSV spreadsheet"
                >
                  <Upload className="w-3 h-3 text-gray-400" />
                  <span>Import CSV</span>
                </button>
                <button
                  onClick={exportEventsToCSV}
                  className="px-2 py-1 bg-[#16231c] hover:bg-[#1f3328] text-emerald-300 hover:text-emerald-200 rounded text-[9.5px] font-bold border border-emerald-800/40 transition-colors flex items-center gap-1 shadow-xs"
                  title="Export all logged events (timestamps, tags, labels, notes) to CSV spreadsheet"
                >
                  <Download className="w-3 h-3 text-emerald-400" />
                  <span>Export CSV</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* --- NOTES TAB --- */}
        {activeSidebarTab === 'notes' && (
          <div className="flex-1 flex flex-col min-h-0 bg-[#0a0a0a]">
            {/* Sub-tabs for Notes */}
            <div className="flex border-b border-[#222] shrink-0 p-1 bg-[#111]">
              <button
                onClick={() => setNotesSubTab('timeline')}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                  notesSubTab === 'timeline'
                    ? 'bg-[#222] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                Timeline
              </button>
              <button
                onClick={() => setNotesSubTab('general')}
                className={`flex-1 py-1.5 text-[10px] font-bold uppercase tracking-wider rounded transition-colors ${
                  notesSubTab === 'general'
                    ? 'bg-[#222] text-white shadow-sm'
                    : 'text-gray-500 hover:text-gray-300 hover:bg-white/5'
                }`}
              >
                General
              </button>
            </div>

            {notesSubTab === 'timeline' ? (
              <>
                <div className="p-3 border-b border-[#222] flex items-center justify-between shrink-0">
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-gray-400" /> Timeline Notes
                  </span>
                  <button
                    onClick={() =>
                      setMarkerModal({
                        isOpen: true,
                        x: 0,
                        y: 0,
                        mode: 'create',
                        time: currentTime,
                        tempLabel: '',
                        tempColor: '#3b82f6'
                      })
                    }
                    className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors"
                    title="Add Note at Playhead"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex-1 p-3 overflow-y-auto custom-scrollbar space-y-3">
                  {[...markers]
                    .sort((a, b) => a.time - b.time)
                    .map((note) => (
                      <div
                        key={note.id}
                        className="group relative bg-[#111] border border-[#222] hover:border-[#333] rounded-lg p-3 transition-colors shadow-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-2.5 h-2.5 rounded-full shadow-inner"
                              style={{ backgroundColor: note.color }}
                            />
                            <button
                              onClick={() => jumpToMarker(note.time)}
                              className="text-xs font-mono text-[#c6ff1f] hover:text-[#a0d600] hover:underline transition-all"
                            >
                              @{formatTime(note.time)}
                            </button>
                          </div>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button
                              onClick={() =>
                                setMarkerModal({
                                  isOpen: true,
                                  x: 0,
                                  y: 0,
                                  mode: 'edit',
                                  markerId: note.id,
                                  tempLabel: note.label,
                                  tempColor: note.color
                                })
                              }
                              className="p-1 text-gray-400 hover:text-white hover:bg-white/10 rounded transition-colors"
                              title="Edit Note"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setMarkers((prev) => prev.filter((m) => m.id !== note.id));
                              }}
                              className="p-1 text-gray-400 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors"
                              title="Delete Note"
                            >
                              <Trash className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{note.label}</p>
                      </div>
                    ))}
                  {markers.length === 0 && (
                    <div className="text-center py-8">
                      <MapPin className="w-8 h-8 text-gray-600 mx-auto mb-2" />
                      <p className="text-sm text-gray-500">No notes yet.</p>
                      <p className="text-xs text-gray-600 mt-1">Click the + to add a note.</p>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <div className="flex-1 flex flex-col p-3">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-semibold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                    <Pencil className="w-4 h-4 text-gray-400" /> Project Notes
                  </span>
                </div>
                <textarea
                  value={projectNotes}
                  onChange={(e) => setProjectNotes(e.target.value)}
                  placeholder="Write general thoughts, to-dos, or context for this project..."
                  className="flex-1 w-full bg-[#111] border border-[#222] rounded-lg text-gray-200 text-sm p-4 outline-none resize-none custom-scrollbar placeholder-gray-600 focus:border-[#c6ff1f]/50 transition-colors shadow-inner leading-relaxed"
                />
              </div>
            )}
          </div>
        )}

        {/* --- PLAYLIST TAB --- */}
        {activeSidebarTab === 'playlist' && (
          <div className="flex flex-col h-full">
            {/* Playlists Header */}
            <div className="px-2 py-1.5 border-b border-[#222] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ListPlus className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-[11px] font-bold text-white">Playlists</span>
              </div>
              <div className="flex items-center gap-1.5">
                {onEnterPresentationMode && (
                  <button
                    onClick={onEnterPresentationMode}
                    className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#c6ff1f]/10 hover:bg-[#c6ff1f]/20 text-[#c6ff1f] border border-[#c6ff1f]/30 text-[10px] font-bold transition-all shadow-sm active:scale-95 cursor-pointer"
                    title="Present Playlists in Full Screen"
                  >
                    <Maximize className="w-3 h-3" />
                    <span>Present</span>
                  </button>
                )}
                <button
                  onClick={() => setPlaylistModal({ isOpen: true, mode: 'create', tempName: '' })}
                  className="text-gray-400 hover:text-white transition-colors p-1 rounded hover:bg-white/10"
                  title="New Playlist"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto flex flex-col min-h-0">
              <div className="p-1.5 space-y-0.5 shrink-0 max-h-[140px] overflow-y-auto custom-scrollbar border-b border-[#222]">
                {playlists.map((pl) => (
                  <div key={pl.id} className="group relative">
                    <button
                      onClick={() => setActivePlaylistId(pl.id)}
                      className={`w-full flex items-center gap-1.5 px-1.5 py-1 rounded text-[10px] transition-colors pr-6 ${
                        activePlaylistId === pl.id
                          ? 'bg-[#222] text-white'
                          : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1a]'
                      }`}
                    >
                      <Folder
                        className={`w-3.5 h-3.5 ${
                          activePlaylistId === pl.id ? 'text-[#c6ff1f] fill-[#c6ff1f]/20' : ''
                        }`}
                      />
                      <span className="flex-1 text-left truncate">{pl.name}</span>
                      <span className="text-[9px] text-gray-600">{pl.events.length}</span>
                    </button>
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-[#222] rounded p-0.5 shadow">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistModal({
                            isOpen: true,
                            mode: 'edit',
                            playlistId: pl.id,
                            tempName: pl.name
                          });
                        }}
                        className="p-0.5 hover:bg-[#333] rounded text-gray-400 hover:text-white"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setPlaylistDeleteId(pl.id);
                        }}
                        className="p-0.5 hover:bg-red-900/30 rounded text-gray-400 hover:text-red-400"
                      >
                        <Trash className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-1.5 bg-[#141414] shrink-0 flex items-center justify-between border-b border-[#222]">
                <div className="flex items-center gap-1.5 overflow-hidden">
                  <Folder className="w-3 h-3 text-[#c6ff1f]" />
                  <span className="text-[10px] font-bold text-gray-300 truncate max-w-[70px]">
                    {playlists.find((p) => p.id === activePlaylistId)?.name}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => {
                      const newShow = !showPlaylistPlaybar;
                      setShowPlaylistPlaybar(newShow);
                      if (newShow) {
                        const activePl = playlists.find((p) => p.id === activePlaylistId);
                        if (activePl && activePl.events.length > 0) {
                          handlePlaylistClipSelect(0, undefined, false);
                        }
                      }
                    }}
                    disabled={!playlists.find((p) => p.id === activePlaylistId)?.events.length}
                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold border transition-colors disabled:opacity-50 ${
                      showPlaylistPlaybar
                        ? 'bg-[#c6ff1f] text-black border-[#c6ff1f]'
                        : 'bg-[#222] hover:bg-[#333] text-gray-300 border-[#333]'
                    }`}
                    title="Open/Close dedicated Playlist Playbar & Trimmer"
                  >
                    <Scissors className="w-3 h-3" />
                    <span className="hidden sm:inline">Playbar</span>
                  </button>
                  {autoplay.active && autoplay.playlistId === activePlaylistId ? (
                    <button
                      onClick={() => setAutoplay({ active: false, playlistId: null, eventIndex: -1 })}
                      className="flex items-center gap-1 px-1.5 py-0.5 bg-red-500/20 text-red-400 hover:bg-red-500/30 rounded text-[9px] font-bold"
                    >
                      <StopCircle className="w-3 h-3" /> Stop
                    </button>
                  ) : (
                    <>
                      <div className="relative group/export flex gap-0.5">
                        <button
                          onClick={() => exportPlaylistVideo(activePlaylistId, true)}
                          disabled={!playlists.find((p) => p.id === activePlaylistId)?.events.length}
                          className="flex items-center gap-1 px-1.5 py-0.5 bg-[#c6ff1f]/20 text-[#c6ff1f] hover:bg-[#c6ff1f]/30 rounded text-[9px] font-bold disabled:opacity-50 transition-colors"
                          title="Export Playlist Video (MP4 / Turbo Mode)"
                        >
                          <Video className="w-3 h-3" /> Exp
                        </button>
                        <div className="absolute top-full right-0 mt-1 min-w-[130px] bg-[#222] border border-[#444] rounded shadow-2xl opacity-0 invisible group-hover/export:opacity-100 group-hover:visible group-hover/export:visible transition-all z-50 flex flex-col overflow-hidden">
                          <button
                            onClick={() => exportPlaylistVideo(activePlaylistId, true)}
                            className="px-2 py-1.5 text-[10px] text-left text-gray-300 hover:bg-[#333] hover:text-white border-b border-[#333]"
                          >
                            With Freeze
                          </button>
                          <button
                            onClick={() => exportPlaylistVideo(activePlaylistId, false)}
                            className="px-2 py-1.5 text-[10px] text-left text-gray-300 hover:bg-[#333] hover:text-white"
                          >
                            No Freeze
                          </button>
                        </div>
                      </div>
                      <button
                        onClick={() => startPlaylistAutoplay(activePlaylistId)}
                        disabled={!playlists.find((p) => p.id === activePlaylistId)?.events.length}
                        className="flex items-center gap-1 px-1.5 py-0.5 bg-[#c6ff1f]/20 text-[#c6ff1f] hover:bg-[#a0d600]/30 rounded text-[9px] font-bold disabled:opacity-50"
                      >
                        <PlayCircle className="w-3 h-3" /> Play
                      </button>
                    </>
                  )}
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-1.5 space-y-1 bg-[#0a0a0a] custom-scrollbar">
                {playlists
                  .find((p) => p.id === activePlaylistId)
                  ?.events.map((item, i) => {
                    const eventId = getClipEventId(item);
                    const isPlayingEvent =
                      (autoplay.active &&
                        autoplay.playlistId === activePlaylistId &&
                        autoplay.eventIndex === i) ||
                      (showPlaylistPlaybar && playlistPlaybarIndex === i);
                    return (
                      <PlaylistClipItem
                        key={i}
                        item={item}
                        index={i}
                        tagEvents={allBatchTagEvents}
                        tags={allBatchTags}
                        labels={allBatchLabels}
                        allBatchProjects={batchMode?.allBatchProjects}
                        isSelected={selectedEventIds.has(eventId)}
                        isPlaying={isPlayingEvent}
                        isDragging={draggingEventIndex === i}
                        onSelect={(_e, _id, startTime) => {
                          setShowPlaylistPlaybar(true);
                          handlePlaylistClipSelect(i, startTime, false);
                        }}
                        onOpenInTrimmer={(index) => {
                          setShowPlaylistPlaybar(true);
                          const clipItem = playlists.find((p) => p.id === activePlaylistId)?.events[index];
                          const { event: evt } = findEventAcrossBatch(getClipEventId(clipItem), clipItem);
                          const timing = resolveClipTiming(clipItem, evt);
                          handlePlaylistClipSelect(index, timing.startTime, false);
                        }}
                        onPlayClip={(startTime, index) => {
                          setShowPlaylistPlaybar(true);
                          handlePlaylistClipSelect(index, startTime, true);
                        }}
                        onDuplicate={(index) => duplicatePlaylistEvent(activePlaylistId, index)}
                        onRemove={(index) => removeEventFromPlaylist(activePlaylistId, index)}
                        onResetTrim={(index) => handleResetPlaylistClipTrim(activePlaylistId, index)}
                        onDragStart={(e, index) => {
                          e.dataTransfer.setData('text/plain', index.toString());
                          e.dataTransfer.effectAllowed = 'move';
                          setDraggingEventIndex(index);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e, index) => {
                          e.preventDefault();
                          const fromIndex = parseInt(e.dataTransfer.getData('text/plain'));
                          if (!isNaN(fromIndex) && fromIndex !== index) {
                            reorderPlaylistEvents(activePlaylistId, fromIndex, index);
                          }
                          setDraggingEventIndex(null);
                        }}
                      />
                    );
                  })}
              </div>

              <div className="p-1.5 border-t border-[#222] flex gap-1 shrink-0 bg-[#111]">
                <button
                  id="save-playlist-btn"
                  onClick={(e) => addSelectedToPlaylist(undefined, e.shiftKey)}
                  className={`flex-1 text-[10px] font-bold py-1.5 rounded flex items-center justify-center gap-1.5 transition-all border ${
                    selectedEventIds.size > 0 || selectedEventLogs.size > 0
                      ? 'bg-[#c6ff1f] text-black border-[#c6ff1f] hover:bg-[#a0d600] shadow-[0_0_10px_rgba(198,255,31,0.3)]'
                      : 'bg-[#222] hover:bg-[#333] text-gray-300 border-[#333]'
                  }`}
                  title="Add selected events to active playlist (Ctrl+S) • Hold Shift for duplicates"
                >
                  <ListPlus className="w-3.5 h-3.5" />
                  <span>
                    {selectedEventIds.size > 0 || selectedEventLogs.size > 0
                      ? `Add Selected (${Math.max(selectedEventIds.size, selectedEventLogs.size)})`
                      : 'Add Selected (Ctrl+S)'}
                  </span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
};
