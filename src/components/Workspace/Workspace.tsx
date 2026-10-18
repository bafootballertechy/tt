// --- Imports ---
import { Logo, Wordmark } from '../Logo';
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { createRoot } from 'react-dom/client';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence, useDragControls } from 'framer-motion';
import {
  Play, Pause, RotateCcw, RotateCw, Trash2, Upload,
  Maximize, Minimize, Maximize2, Minimize2, ExternalLink, MousePointer2, Circle, Pen,
  MoveUpRight, Hexagon, Radar, GitCommitVertical, Settings2,
  ChevronRight, ChevronLeft, Type, Video, Undo2, Redo2,
  Download, X, AlertTriangle, LogOut, Minus, Layers, Eye, EyeOff,
  SlidersHorizontal, CornerUpRight, Volume2, VolumeX, Flag, User, Flashlight, ZoomIn, Cylinder, Navigation,
  Activity, Spline, Slash, MoreHorizontal, PaintBucket,
  Tags, FolderPlus, Folder, FolderOpen, Film, ListPlus, Filter, Keyboard, Plus, Save, Edit2, Check,
  GripVertical, PlayCircle, StopCircle, Pencil, Trash, PlusCircle, FileUp, FileDown, MessageSquare, Scissors, GripHorizontal,
  SkipBack, SkipForward, ZoomOut, Snowflake, Clock, Timer, LayoutGrid, MoreVertical, Calendar, Disc, Code, Zap,
  ChevronsUp, ChevronsDown, ChevronUp, ChevronDown, Tag, Eraser, Pipette, RefreshCw, HelpCircle, CheckSquare,
  Search, Star, Bell, ArrowRight, ArrowDownAZ, ArrowUpZA, SortDesc, MapPin, Copy,
  ScanEye, FileSpreadsheet, FileVideo
} from 'lucide-react';

// --- Types ---

import type { 
  ToolType, Point, Rect, Particle, Shape, FreezeFrame, 
  ColorPreset, MaskSettings, MaskLayerCache, TimelineMarker, 
  Tag as TagData, TagEvent, ActiveRecording, Playlist, PlaylistClip, PlaylistItem, ProjectData, Project, Batch, Label, LabelEvent, LabelGroup, AdvancedPadItem, SmartConnector, PeriodSync, CodeFile,
  PlayerTagSettings
} from '../../types';

import { saveVideoLocally, loadVideoLocally, saveProjectDataLocally, saveFileHandle, loadFileHandle, listProjectsLocally, deleteProjectLocally } from '../../utils/db';
import { formatTime, getDistance, clamp, getVideoLayout } from '../../utils/math';
import { fadeColor, adjustBrightness, shiftColor, rgbToHsl } from '../../utils/colors';
import { LoginScreen } from '../../components/LoginScreen';

import { INITIAL_COLORS, DEFAULT_TAGS } from './Workspace.constants';
import { safeSetLocalStorage, isValidEvent, parseCSVRow } from './Workspace.utils';
import { ErrorBoundary, ConfirmOverlay } from '../Shared/SharedUI';
import { 
  createParticles, drawArrowHead, drawDashedLine, drawLabel, 
  getShimmerGradient, drawFreehandArrow, drawProArrow, draw3DRing, 
  drawSpotlight, drawLens, drawNameTag, drawCurvedArrow, drawCurvedRun, drawTangentLine, drawText
} from '../../utils/drawing';
import { RecordingTimer } from '../../components/RecordingTimer';
import { WorkspaceModals } from "./Modals/WorkspaceModals";
import { useMasking, MaskingPanel, renderMaskOverlay, renderMaskForeground, renderMaskedSprite } from './Masking';
import {
  PolygonPanel,
  drawPolygon,
  drawPolygonPreview,
  isPointNearPolygon,
  createPolygonShape,
  PolygonSettings,
  DEFAULT_POLYGON_SETTINGS,
  drawRadar,
  drawRadarPreview,
  createRadarShape,
  isPointNearRadar,
  createRadarBurstParticles,
  updateAndDrawRadarParticles,
  RadarParticle,
  getHueAndSatFromColor
} from './Polygon';
import {
  ScannerPanel,
  ScannerSettings,
  DEFAULT_SCANNER_SETTINGS,
  drawScanner,
  drawScannerPreview,
  createScannerShape,
  hitTestScanner,
  getScannerHandles
} from './Scanner';
import { PlayerTagPanel } from './PlayerTag';
import { EventPlaybar } from '../../components/EventPlaybar';
import { AnimationPanel } from '../../components/AnimationPanel';
import { WorkspaceBottomBar } from './WorkspaceBottomBar';
import { AdvancedCodingPad } from './AdvancedCodingPad';
import { PeriodSyncManager } from './PeriodSyncManager';
import { PlaylistPlaybar } from '../Playlist/PlaylistPlaybar';
import { PlaylistClipItem } from '../Playlist/PlaylistClipItem';
import { BatchTabsBar } from '../Batches/BatchTabsBar';
import { BatchVideoRelinker } from '../Batches/BatchVideoRelinker';
import { NormalCodingTemplateModal } from './NormalCodingTemplateModal';
import { CodeFilesModal } from './CodeFiles/CodeFilesModal';
import { CodeFileSaveModal } from './CodeFiles/CodeFileSaveModal';
import { loadAllCodeFiles, saveAllCodeFiles, generateDefaultPadItems, STORAGE_KEY_ACTIVE_CODE_FILE } from '../../utils/codeFiles';
import { WorkspaceSidebar } from './WorkspaceSidebar';
import { LabelsPanel } from './LabelsPanel';
import { 
  getClipEventId, 
  getClipInstanceId, 
  resolveClipTiming, 
  updateClipTrim, 
  resetClipTrim 
} from '../../utils/playlistUtils';
import { ExportVideoModal } from './VideoExport/ExportVideoModal';
import { buildPlaylistExportItems, buildSingleProjectExportItem } from './VideoExport/exportTimeline';
import type { ExportClipItem } from './VideoExport/exportTypes';
import { CustomizePlaylistsModal, PresentationHUD, PresentationConfig } from './Presentation';
import {
  useLiveClock,
  LiveCodingCenterView,
  LiveTimerWidget,
  LivePeriodConfirmModal,
  LiveCodingBottomBar,
  LiveHalfTimeline
} from './LiveCoding';

export const Workspace = ({
    userPlan,
    videoUrl, 
    project, 
    onUpdateProject,
    onUpdateMetadata,
    onClose,
    onForceSync,
    onRelinkVideo,
    batchMode
}: { 
    userPlan: 'free' | 'pro',
    videoUrl: string, 
    project: Project, 
    onUpdateProject: (data: ProjectData, targetId?: string) => void,
    onUpdateMetadata: (name: string, description: string) => void,
    onClose: () => void,
    onForceSync: () => void,
    onRelinkVideo?: (project: Project, isNewVideo: boolean) => void,
    batchMode?: {
        batch: Batch;
        onUpdateBatch: (batch: Batch) => void;
        allBatchProjects: Project[];
        projectBlobs: Map<string, string>;
        onSelectProject: (projectId: string) => void;
        onReloadVideo: (project: Project) => void;
        onRelinkSingleVideo?: (project: Project, file: File, handle?: any) => Promise<void> | void;
        onBatchRelinkVideos?: (mappings: { projectId: string; file: File; handle?: any }[]) => Promise<void> | void;
        onAddGamesToBatch: () => void;
        onOpenStats?: () => void;
        initialPlaylistId?: string;
        initialSeekTime?: number;
        autoPlayPlaylist?: boolean;
    }
}) => {
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [infoForm, setInfoForm] = useState({ name: project.name || '', description: project.description || '' });
  const [showBatchRelinkerModal, setShowBatchRelinkerModal] = useState(false);
  const [exportModalState, setExportModalState] = useState<{
    isOpen: boolean;
    title: string;
    clips: ExportClipItem[];
    defaultWithFreezeFrames: boolean;
    defaultMaskSettings?: MaskSettings;
  }>({
    isOpen: false,
    title: '',
    clips: [],
    defaultWithFreezeFrames: true
  });

  // Refs for seamless cross-project batch playlist playback
  const prevProjectIdRef = useRef<string>(project.id);
  const pendingSeekTimeRef = useRef<number | null>(batchMode?.initialSeekTime !== undefined ? batchMode.initialSeekTime : null);
  const pendingPlayRef = useRef<boolean>(Boolean(batchMode?.autoPlayPlaylist));
  const latestProjectDataRef = useRef<ProjectData>({ ...project.data });

  useEffect(() => {
    setInfoForm({ name: project.name || '', description: project.description || '' });
  }, [project.name, project.description]);

  // Live Match State
  const isLive = videoUrl === 'live';

  // State
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(project.fileName === 'live' ? project.data.liveTime || 0 : 0);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [duration, setDuration] = useState(0);
  const [isVideoBuffering, setIsVideoBuffering] = useState(false);
  const [loadElapsedSec, setLoadElapsedSec] = useState(0);

  useEffect(() => {
    if (duration > 0 || isLive) {
      setLoadElapsedSec(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadElapsedSec(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [duration, isLive]);
  const [playbackRate, setPlaybackRate] = useState(1.0); // Default speed 1x
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(true);
  const [timelineZoom, setTimelineZoom] = useState(1);
  const [isTimelineExpanded, setIsTimelineExpanded] = useState(false);
  const [showTimelineFiltersMenu, setShowTimelineFiltersMenu] = useState(false);
  const [showTimelineFreezeFrames, setShowTimelineFreezeFrames] = useState(true);
  const [showTimelineTags, setShowTimelineTags] = useState(true);
  const [hoveredFreezeFrameId, setHoveredFreezeFrameId] = useState<string | null>(null);
  const [editingAnimationFFId, setEditingAnimationFFId] = useState<string | null>(null);
  const [animationPreviewTime, setAnimationPreviewTime] = useState<number>(0);
  const [isAnimationPreviewPlaying, setIsAnimationPreviewPlaying] = useState<boolean>(false);
  const [animationPanelWidth, setAnimationPanelWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth * 0.60 : 500);
  const [isResizingAnimPanel, setIsResizingAnimPanel] = useState<boolean>(false);
  const [labelsPanelWidth, setLabelsPanelWidth] = useState<number>(260);
  const [isResizingLabelsPanel, setIsResizingLabelsPanel] = useState<boolean>(false);
  
  useEffect(() => {
      const handleMouseMove = (e: MouseEvent) => {
          if (isResizingAnimPanel) {
              const newWidth = document.body.clientWidth - e.clientX;
              setAnimationPanelWidth(Math.max(250, Math.min(newWidth, document.body.clientWidth * 0.7)));
          }
          if (isResizingLabelsPanel) {
              setLabelsPanelWidth(prev => {
                  const newWidth = prev - e.movementX;
                  return Math.max(200, Math.min(newWidth, document.body.clientWidth * 0.5));
              });
          }
      };
      const handleMouseUp = () => {
          setIsResizingAnimPanel(false);
          setIsResizingLabelsPanel(false);
      };
      if (isResizingAnimPanel || isResizingLabelsPanel) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isResizingAnimPanel, isResizingLabelsPanel]);

  // Freeze Frame State
  const [freezeFrames, setFreezeFrames] = useState<FreezeFrame[]>(project.data.freezeFrames);
  const triggeredFreezeFrames = useRef<Set<string>>(new Set());
  const [activeFreezeFrameId, setActiveFreezeFrameId] = useState<string | null>(null); 
  const [countdownValue, setCountdownValue] = useState(0); 
  const countdownInterval = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);

  // Drawing State
  const [tool, setTool] = useState<ToolType>(null);
  const [colors, setColors] = useState<ColorPreset[]>(INITIAL_COLORS);
  const [activeColorId, setActiveColorId] = useState<number>(6); 
  const [toolSize, setToolSize] = useState(5);
  const [ringStrokeWidth, setRingStrokeWidth] = useState(0);
  const [shapes, setShapes] = useState<Shape[]>(project.data.shapes);
  const [undoStack, setUndoStack] = useState<Shape[][]>([]);
  const [redoStack, setRedoStack] = useState<Shape[][]>([]);
  
  // Name Tag State

  // Interaction State
  const [isDrawing, setIsDrawing] = useState(false);
  const [activePoints, setActivePoints] = useState<Point[]>([]); 
  const activePointsRef = useRef<Point[]>([]);
  
  // Sync state to ref (for anything that still sets state)
  useEffect(() => {
      activePointsRef.current = activePoints;
  }, [activePoints]);

  const [currentDragStart, setCurrentDragStart] = useState<Point | null>(null); 
  const mousePosRef = useRef<Point | null>(null); 

  // Arrow Settings
  const [arrowSettings, setArrowSettings] = useState({
      isDashed: false,
      isFreehand: false,
      isCurved: false
  });

  // Player Dragger State
  const [playerMoveState, setPlayerMoveState] = useState<'idle' | 'selecting' | 'moving'>('idle');
  const [playerSelectionRect, setPlayerSelectionRect] = useState<Rect | null>(null); 
  const [capturedSprite, setCapturedSprite] = useState<{ sprite: HTMLCanvasElement, patch: HTMLCanvasElement, box: Rect } | null>(null);
  
  // Move Tool State
  const [selectedShapeId, setSelectedShapeId] = useState<string | null>(null);
  const [draggingHandle, setDraggingHandle] = useState<{shapeId: string, pointIndex?: number, type: 'point' | 'shape' | 'scannerHandle', handleType?: string, offsetX?: number, offsetY?: number} | null>(null);
  
  // Spotlight State
  const [spotlightSettings, setSpotlightSettings] = useState({
    size: 45, intensity: 0.75, rotation: 0.45 
  });

  // Polygon State
  const [polygonSettings, setPolygonSettings] = useState<PolygonSettings>(DEFAULT_POLYGON_SETTINGS);
  const radarParticlesRef = useRef<RadarParticle[]>([]);

  // Field Scanner State
  const [scannerSettings, setScannerSettings] = useState<ScannerSettings>(DEFAULT_SCANNER_SETTINGS);

  // Lens State
  const [lensSettings, setLensSettings] = useState({ size: 75, zoom: 2.0 });
  const [nameTagSettings, setNameTagSettings] = useState<PlayerTagSettings>({ 
      teamA: { 
        name: 'Home', 
        colorId: 5, 
        names: [
          { id: 'h1', number: '31', text: 'Ederson', name: 'Ederson' },
          { id: 'h2', number: '2', text: 'Walker', name: 'Walker' },
          { id: 'h3', number: '3', text: 'Dias', name: 'Dias' },
          { id: 'h4', number: '25', text: 'Akanji', name: 'Akanji' },
          { id: 'h5', number: '24', text: 'Gvardiol', name: 'Gvardiol' },
          { id: 'h6', number: '16', text: 'Rodri', name: 'Rodri' },
          { id: 'h7', number: '17', text: 'De Bruyne', name: 'De Bruyne' },
          { id: 'h8', number: '8', text: 'Kovacic', name: 'Kovacic' },
          { id: 'h9', number: '20', text: 'Bernardo', name: 'Bernardo' },
          { id: 'h10', number: '9', text: 'Haaland', name: 'Haaland' },
          { id: 'h11', number: '47', text: 'Foden', name: 'Foden' },
        ], 
        bulkText: '' 
      },
      teamB: { 
        name: 'Away', 
        colorId: 3, 
        names: [
          { id: 'a1', number: '22', text: 'Raya', name: 'Raya' },
          { id: 'a2', number: '4', text: 'White', name: 'White' },
          { id: 'a3', number: '2', text: 'Saliba', name: 'Saliba' },
          { id: 'a4', number: '6', text: 'Gabriel', name: 'Gabriel' },
          { id: 'a5', number: '12', text: 'Timber', name: 'Timber' },
          { id: 'a6', number: '41', text: 'Rice', name: 'Rice' },
          { id: 'a7', number: '8', text: 'Odegaard', name: 'Odegaard' },
          { id: 'a8', number: '23', text: 'Merino', name: 'Merino' },
          { id: 'a9', number: '7', text: 'Saka', name: 'Saka' },
          { id: 'a10', number: '29', text: 'Havertz', name: 'Havertz' },
          { id: 'a11', number: '11', text: 'Martinelli', name: 'Martinelli' },
        ], 
        bulkText: '' 
      },
      activeTeam: 'A',
      activeId: 'h7', 
      size: 14,
      uppercase: true,
      showNumber: true,
  });
  const [ringSettings, setRingSettings] = useState({ tilt: 65, isFilled: false, size: 36, outlineColor: '#ffffff', secondaryRing: false, secondaryColor: '#ef4444' });
  const [textSettings, setTextSettings] = useState<{
      text: string;
      bgEnabled: boolean;
      colorId: number;
      bgColorId: number;
      fontSize: number;
      animation: 'none' | 'fade' | 'scale' | 'type';
  }>({ text: 'Edit this text', bgEnabled: true, colorId: 5, bgColorId: 9, fontSize: 14, animation: 'type' });

  // Preset Texts State
  const [presetTexts, setPresetTexts] = useState<{id: string, text: string}[]>(project.data.presetTexts || [
      { id: 'p1', text: 'Great Defending!' },
      { id: 'p2', text: 'Offside Review' }
  ]);
  const [presetBulkText, setPresetBulkText] = useState("");
  const [expandedPresetId, setExpandedPresetId] = useState<string | null>(null);
  const [editingPresetId, setEditingPresetId] = useState<string | null>(null);
  const [editingNameId, setEditingNameId] = useState<string | null>(null);

  // Masking Feature
  const {
    maskSettings,
    setMaskSettings,
    maskCache,
    setMaskCache,
    isProcessingMask,
    setIsProcessingMask,
    isPickingColor,
    setIsPickingColor,
    computeMaskingLayers,
    clearMaskCache,
    pickColorAtPoint,
    addColorAtPoint,
    removeColor,
  } = useMasking({
    videoRef,
    isPlaying,
    currentTime,
  });

  // Markers State
  const [markers, setMarkers] = useState<TimelineMarker[]>(project.data.markers);
  const [markerModal, setMarkerModal] = useState<{ isOpen: boolean; x: number; y: number; mode: 'create' | 'edit'; markerId?: string; time?: number; tempLabel: string; tempColor: string; } | null>(null);
  const [hoveredNoteId, setHoveredNoteId] = useState<string | null>(null);

  // --- Tagging & Playlist State ---
  const [labelsEnabled, setLabelsEnabled] = useState(false);
  const [isAdvancedCodingMode, setIsAdvancedCodingMode] = useState(false);
  const [advancedPadItems, setAdvancedPadItems] = useState<AdvancedPadItem[]>(project.data.advancedPadItems || []);
  const [connectors, setConnectors] = useState<SmartConnector[]>(project.data.connectors || []);
  const [isPadQuickTagEnabled, setIsPadQuickTagEnabled] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem('advanced_pad_quick_tag_enabled');
      return saved !== null ? saved === 'true' : true;
    } catch {
      return true;
    }
  });
  const [labelGroups, setLabelGroups] = useState<LabelGroup[]>(project.data.labelGroups || []);
  const [labels, setLabels] = useState<Label[]>(project.data.labels || []);
  const [labelEvents, _setLabelEvents] = useState<LabelEvent[]>(project.data.labelEvents || []);
  const [editingLabelId, setEditingLabelId] = useState<string | null>(null);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState<Partial<Label>>({});
  const [tempGroup, setTempGroup] = useState<Partial<LabelGroup>>({});
  const [draggedGroup, setDraggedGroup] = useState<string | null>(null);
  const [draggedLabel, setDraggedLabel] = useState<string | null>(null);
  const [isLabelsSelectMode, setIsLabelsSelectMode] = useState(false);
  const [selectedLabelIds, setSelectedLabelIds] = useState<Set<string>>(new Set());
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<string>>(new Set());
  const [labelDeleteConfirmation, setLabelDeleteConfirmation] = useState(false);
  
  // Normal Coding Templates & Unified Code Files State (Common for Normal Panel & Advanced Coding Pad)
  const [showNormalTemplateModal, setShowNormalTemplateModal] = useState(false);
  const [currentCodeFileName, setCurrentCodeFileName] = useState<string>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_ACTIVE_CODE_FILE) || 'Standard Match Analysis';
    } catch (e) {
      return 'Standard Match Analysis';
    }
  });
  const [showCodeFilesModal, setShowCodeFilesModal] = useState(false);
  const [showCodeFileSaveModal, setShowCodeFileSaveModal] = useState(false);
  
  // Popped-out coding entity mode ('panel' for Normal Coding Panel, 'pad' for Advanced Coding Pad)
  const [poppedOutCodingMode, setPoppedOutCodingMode] = useState<'panel' | 'pad'>('panel');
  const [showCodingPaneLabels, setShowCodingPaneLabels] = useState(true);

  // Floating Pop-out Window Entities State
  const [isTimerPoppedOut, setIsTimerPoppedOut] = useState(false);
  const [isPadPoppedOut, setIsPadPoppedOut] = useState(false);

  // Drag controls for Framer Motion draggable floating windows
  const timerDragControls = useDragControls();
  const padDragControls = useDragControls();

  // Initial positions & dimensions for floating widgets
  const [timerWidgetPos] = useState({ x: 20, y: 52, w: 260, h: 140 });
  const [padWidgetPos] = useState({ x: 300, y: 52, w: 500, h: 500 });

  // Separate OS Browser Popup Window state (via Portals)
  const [timerExternalWindow, setTimerExternalWindow] = useState<Window | null>(null);
  const [padExternalWindow, setPadExternalWindow] = useState<Window | null>(null);
  const [externalTimerContainer, setExternalTimerContainer] = useState<HTMLElement | null>(null);
  const [externalPadContainer, setExternalPadContainer] = useState<HTMLElement | null>(null);
  const currentNormalTemplateName = currentCodeFileName;
  const setCurrentNormalTemplateName = setCurrentCodeFileName;
  const unifiedFileInputRef = useRef<HTMLInputElement>(null);

  const setLabelEvents = useCallback((action: React.SetStateAction<LabelEvent[]>) => {
      _setLabelEvents(prev => {
          const next = typeof action === 'function' ? (action as any)(prev) : action;
          return next;
      });
  }, []);

  
  const handleLabelClick = (labelId: string) => {
      if (isTaggingMode) {
          // SPECIAL SEMANTIC ASSIGN RELATIONSHIP (Tag-to-Label connection):
          // Clicking the label starts the tag event with that label. Clicking it again ends it with that label.
          const assignConn = connectors.find(c => c.targetId === labelId && c.type === 'assign' && c.enabled);
          if (assignConn && tags.some(t => t.id === assignConn.sourceId)) {
              const tagId = assignConn.sourceId;
              const isCurrentlyRecordingTag = activeRecordings.some(r => r.tagId === tagId);

              if (isCurrentlyRecordingTag) {
                  // Second click on Assign Label -> STOP and SAVE Tag recording
                  const existingRecIndex = activeRecordings.findIndex(r => r.tagId === tagId);
                  if (existingRecIndex >= 0) {
                      const existingRec = activeRecordings[existingRecIndex];
                      let start = existingRec.startTime;
                      let end = currentTime;
                      if (start > end) { [start, end] = [end, start]; }
                      
                      if (isValidEvent(start, end)) {
                          const newEventId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                          const newEvent: TagEvent = {
                              id: newEventId,
                              tagId: tagId,
                              startTime: start,
                              endTime: end,
                              labelIds: existingRec.labelIds || []
                          };
                          setTagEvents(prev => [...prev, newEvent]);
                          showNotification(`Saved: ${tags.find(t => t.id === tagId)?.name || 'Event'} with attached Qualifiers`, '#c6ff1f');
                      } else {
                          showNotification('Invalid event duration', '#ef4444');
                      }
                      
                      // Remove active recording
                      setActiveRecordings(prev => prev.filter((_, idx) => idx !== existingRecIndex));
                      return;
                  }
              } else {
                  // First click on Assign Label -> START Tag recording WITH this Label pre-attached
                  const targetTag = tags.find(t => t.id === tagId);
                  if (targetTag) {
                      const newActiveRecs = [...activeRecordings, { tagId: tagId, startTime: currentTime, labelIds: [labelId] }];
                      setActiveRecordings(newActiveRecs);
                      showNotification(`Started: ${targetTag.name} (linked with label: ${labels.find(l => l.id === labelId)?.name || 'Label'})`, '#c6ff1f');
                      return;
                  }
              }
          }

          let newActiveRecs = activeRecordings.map(r => ({ ...r, labelIds: r.labelIds ? [...r.labelIds] : [] }));
          let newEventsToUpdate = new Map<string, TagEvent>();
          let isActivation = false;
          let createdEventId: string | null = null;
          
          if (newActiveRecs.length > 0) {
              const allHaveLabel = newActiveRecs.every(r => r.labelIds?.includes(labelId));
              if (allHaveLabel) {
                  newActiveRecs.forEach(r => {
                      r.labelIds = r.labelIds?.filter(l => l !== labelId);
                  });
                  isActivation = false;
              } else {
                  newActiveRecs.forEach(r => {
                      if (!r.labelIds) r.labelIds = [];
                      if (!r.labelIds.includes(labelId)) {
                          r.labelIds.push(labelId);
                      }
                  });
                  isActivation = true;
              }
          } else if (selectedEventIds.size > 0) {
              // We assume activation if ANY selected event gets the label added
              let anyAdded = false;
              tagEvents.forEach(evt => {
                  if (selectedEventIds.has(evt.id)) {
                      let updatedEvt = { ...evt, labelIds: evt.labelIds ? [...evt.labelIds] : [] };
                      if (updatedEvt.labelIds.includes(labelId)) {
                          updatedEvt.labelIds = updatedEvt.labelIds.filter(l => l !== labelId);
                      } else {
                          updatedEvt.labelIds.push(labelId);
                          anyAdded = true;
                      }
                      newEventsToUpdate.set(evt.id, updatedEvt);
                  }
              });
              isActivation = anyAdded;
              if (selectedEventIds.size === 1) {
                  createdEventId = Array.from(selectedEventIds)[0];
              }
          } else {
              showNotification('No active recording or selected event to label', '#ef4444');
              return; // Nothing happened
          }
          
          // Connectors
          let additionalNewEvents: TagEvent[] = [];
          const res = executeConnectors(
              labelId, 
              newActiveRecs, 
              Array.from(newEventsToUpdate.values()), 
              createdEventId, 
              isActivation
          );
          newActiveRecs = res.nextActiveRecs;
          additionalNewEvents = res.additionalEvents;
          
          if (res.notification) {
              showNotification(res.notification, '#c6ff1f');
          }
          
          // Apply state
          setActiveRecordings(newActiveRecs);
          if (newEventsToUpdate.size > 0 || additionalNewEvents.length > 0) {
              setTagEvents(prev => {
                  let next = prev.map(evt => newEventsToUpdate.has(evt.id) ? newEventsToUpdate.get(evt.id)! : evt);
                  return [...next, ...additionalNewEvents];
              });
          }
          
      } else {
          setFilterLabelId(current => current === labelId ? null : labelId);
      }
  };


const [tags, setTags] = useState<TagData[]>(project.data.tags);
  const [tagEvents, _setTagEvents] = useState<TagEvent[]>(project.data.tagEvents);
  const tagEventsHistoryRef = useRef<TagEvent[][]>([project.data.tagEvents]);
  const tagEventsHistoryIndexRef = useRef(0);
  const [canUndoEvents, setCanUndoEvents] = useState(false);
  const [canRedoEvents, setCanRedoEvents] = useState(false);

  const setTagEvents = useCallback((action: React.SetStateAction<TagEvent[]>) => {
      _setTagEvents(prev => {
          const next = typeof action === 'function' ? (action as any)(prev) : action;
          const history = tagEventsHistoryRef.current;
          const index = tagEventsHistoryIndexRef.current;
          const newHistory = history.slice(0, index + 1);
          newHistory.push(next);
          if (newHistory.length > 50) newHistory.shift();
          tagEventsHistoryRef.current = newHistory;
          tagEventsHistoryIndexRef.current = newHistory.length - 1;
          setCanUndoEvents(tagEventsHistoryIndexRef.current > 0);
          setCanRedoEvents(tagEventsHistoryIndexRef.current < tagEventsHistoryRef.current.length - 1);
          return next;
      });
  }, []);

  const handleUndoEvents = useCallback(() => {
      if (tagEventsHistoryIndexRef.current > 0) {
          tagEventsHistoryIndexRef.current -= 1;
          _setTagEvents(tagEventsHistoryRef.current[tagEventsHistoryIndexRef.current]);
          setCanUndoEvents(tagEventsHistoryIndexRef.current > 0);
          setCanRedoEvents(tagEventsHistoryIndexRef.current < tagEventsHistoryRef.current.length - 1);
      }
  }, []);

  const handleRedoEvents = useCallback(() => {
      if (tagEventsHistoryIndexRef.current < tagEventsHistoryRef.current.length - 1) {
          tagEventsHistoryIndexRef.current += 1;
          _setTagEvents(tagEventsHistoryRef.current[tagEventsHistoryIndexRef.current]);
          setCanUndoEvents(tagEventsHistoryIndexRef.current > 0);
          setCanRedoEvents(tagEventsHistoryIndexRef.current < tagEventsHistoryRef.current.length - 1);
      }
  }, []);

  const [isTaggingMode, setIsTaggingMode] = useState(false);
  const [activeRecordings, setActiveRecordings] = useState<ActiveRecording[]>([]);
  const activeRecording = activeRecordings.length > 0 ? activeRecordings[activeRecordings.length - 1] : null;
  const setActiveRecording = useCallback((val: ActiveRecording | null | ((prev: ActiveRecording | null) => ActiveRecording | null)) => {
      setActiveRecordings(prev => {
          const current = prev.length > 0 ? prev[prev.length - 1] : null;
          const next = typeof val === 'function' ? val(current) : val;
          if (!next) return [];
          return [next];
      });
  }, []);
  const [eventNotification, setEventNotification] = useState<{
    message: string;
    color: string;
    id: number;
    onUndo?: () => void;
    action?: {
      label: string;
      onClick: () => void;
    };
  } | null>(null);

  const showNotification = useCallback((
    message: string, 
    color: string, 
    onUndo?: () => void, 
    action?: { label: string; onClick: () => void }
  ) => {
      const id = Date.now();
      setEventNotification({ message, color, id, onUndo, action });
      
      const timeout = (onUndo || action) ? 5000 : 2000;
      setTimeout(() => {
          setEventNotification(prev => (prev?.id === id ? null : prev));
      }, timeout);
  }, []);

  const handleTogglePadQuickTag = useCallback(() => {
    setIsPadQuickTagEnabled(prev => {
      const next = !prev;
      try {
        localStorage.setItem('advanced_pad_quick_tag_enabled', String(next));
      } catch (_) {}
      showNotification(
        next 
          ? 'Quick Tag enabled for Coding Pad (lead/lag buffers active)' 
          : 'Quick Tag disabled for Coding Pad (tags record with manual start/stop)',
        next ? '#c6ff1f' : '#f59e0b'
      );
      return next;
    });
  }, [showNotification]);

  // --- Deleted Freeze Frame Undo Notification State ---
  interface DeletedFreezeFrameRecord {
    id: string;
    name: string;
    timestamp: number;
    frame: FreezeFrame;
    shapeIds: string[];
    originalIndex: number;
  }
  const [deletedFFStack, setDeletedFFStack] = useState<DeletedFreezeFrameRecord[]>([]);
  const [ffExpiryTime, setFfExpiryTime] = useState<number | null>(null);
  const [ffRemainingSeconds, setFfRemainingSeconds] = useState<number>(8);
  const [ffProgressPercent, setFfProgressPercent] = useState<number>(100);
  const FF_UNDO_DURATION = 8000; // 8 seconds timeout

  useEffect(() => {
    if (!ffExpiryTime || deletedFFStack.length === 0) {
      setFfRemainingSeconds(8);
      setFfProgressPercent(100);
      return;
    }

    const update = () => {
      const remainingMs = ffExpiryTime - Date.now();
      if (remainingMs <= 0) {
        setDeletedFFStack([]);
        setFfExpiryTime(null);
      } else {
        setFfRemainingSeconds(Math.ceil(remainingMs / 1000));
        setFfProgressPercent(Math.max(0, (remainingMs / FF_UNDO_DURATION) * 100));
      }
    };

    update();
    const interval = setInterval(update, 50);
    return () => clearInterval(interval);
  }, [ffExpiryTime, deletedFFStack.length]);
  const [playlists, setPlaylists] = useState<Playlist[]>(() => {
    if (batchMode && batchMode.batch.playlists && batchMode.batch.playlists.length > 0) {
      return batchMode.batch.playlists;
    }
    if (batchMode) {
      return [{ id: 'bp1', name: 'Batch Highlights', events: [] }];
    }
    return project.data.playlists;
  });

  useEffect(() => {
    if (batchMode && batchMode.batch.playlists) {
      setPlaylists(batchMode.batch.playlists);
    }
  }, [batchMode?.batch?.id, batchMode?.batch?.lastModified]);

  const [activePlaylistId, setActivePlaylistId] = useState<string>(() => {
    if (batchMode?.initialPlaylistId && batchMode.batch.playlists?.some(p => p.id === batchMode.initialPlaylistId)) {
      return batchMode.initialPlaylistId;
    }
    if (batchMode && batchMode.batch.playlists && batchMode.batch.playlists.length > 0) {
      return batchMode.batch.playlists[0].id;
    }
    if (batchMode) {
      return 'bp1';
    }
    return project.data.playlists?.[0]?.id || 'p1';
  });
  const [filterTagId, setFilterTagId] = useState<string | null>(null);
  const [filterLabelId, setFilterLabelId] = useState<string | null>(null);
  const [tagSettingsOpen, setTagSettingsOpen] = useState(false);
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());
  const [selectedEventLogs, setSelectedEventLogs] = useState<Set<string>>(new Set());
  const [playbarEventId, setPlaybarEventId] = useState<string | null>(null);
  const [isMultiSelectAction, setIsMultiSelectAction] = useState(false);
  const [editingTagId, setEditingTagId] = useState<string | null>(null);
  const [tempTag, setTempTag] = useState<Partial<TagData>>({});
  const [csvImportState, setCsvImportState] = useState<{
    isOpen: boolean;
    events: TagEvent[];
    newTags: TagData[];
    newLabels: Label[];
    errors: string[];
  } | null>(null);

  const exportLabelsToJSON = useCallback(() => {
      const data = { labels, labelGroups };
      const jsonContent = JSON.stringify(data, null, 2);
      const blob = new Blob([jsonContent], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `labels_${project.name.replace(/\s+/g, '_')}.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  }, [labels, labelGroups, project.name]);

  // Unified Coding Template Export (Tags + Labels + Groups)
  const exportUnifiedSetupToJSON = useCallback(() => {
      const exportPayload = {
          app: "TacStem Football Analysis",
          format: "TacStem Normal Coding Template",
          version: "3.0",
          exportedAt: new Date().toISOString(),
          name: currentNormalTemplateName || project.name || "Match Coding Template",
          description: "TacStem Unified tags, labels, and groups coding template for football video analysis.",
          tags: tags,
          labels: labels,
          labelGroups: labelGroups || []
      };

      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportPayload, null, 2));
      const downloadAnchorNode = document.createElement('a');
      downloadAnchorNode.setAttribute("href", dataStr);
      const safeName = (currentNormalTemplateName || project.name || 'coding-template').toLowerCase().replace(/[^a-z0-9]+/g, '-');
      downloadAnchorNode.setAttribute("download", `${safeName}-setup.json`);
      document.body.appendChild(downloadAnchorNode);
      downloadAnchorNode.click();
      downloadAnchorNode.remove();
      showNotification('Exported complete coding setup (Tags + Labels JSON)!', '#c6ff1f');
  }, [tags, labels, labelGroups, currentNormalTemplateName, project.name, showNotification]);

  // --- UNIFIED CODE FILES HANDLERS (Common for Normal Panel & Advanced Coding Pad) ---
  const handleApplyCodeFile = useCallback((file: CodeFile, clearEvents: boolean) => {
      if (clearEvents) {
          setTagEvents([]);
          setLabelEvents([]);
          setActiveRecordings([]);
          setSelectedEventIds(new Set());
          setSelectedEventLogs(new Set());
      }

      setTags(file.tags || []);
      setLabels(file.labels || []);
      setLabelGroups(file.labelGroups || []);
      setCurrentCodeFileName(file.name);
      try {
          localStorage.setItem(STORAGE_KEY_ACTIVE_CODE_FILE, file.name);
      } catch (e) {}

      // Pad items sync for Advanced Coding Pad
      let padItemsToSet = file.items;
      if (!padItemsToSet || padItemsToSet.length === 0) {
          padItemsToSet = generateDefaultPadItems(file.tags || [], file.labels || [], file.labelGroups || []);
      }
      setAdvancedPadItems(padItemsToSet);

      // Connectors sync
      if (file.connectors) {
          setConnectors(file.connectors);
      }
  }, [setTags, setLabels, setLabelGroups, setTagEvents, setLabelEvents, setActiveRecordings, setSelectedEventIds, setSelectedEventLogs, setAdvancedPadItems, setConnectors]);

  const handleCreateBlankCodeFile = useCallback((clearEvents: boolean) => {
      if (clearEvents) {
          setTagEvents([]);
          setLabelEvents([]);
          setActiveRecordings([]);
          setSelectedEventIds(new Set());
          setSelectedEventLogs(new Set());
      }

      setTags([]);
      setLabels([]);
      setLabelGroups([]);
      setAdvancedPadItems([]);
      setConnectors([]);
      setCurrentCodeFileName('Untitled Blank File');
      try {
          localStorage.setItem(STORAGE_KEY_ACTIVE_CODE_FILE, 'Untitled Blank File');
      } catch (e) {}
  }, [setTags, setLabels, setLabelGroups, setTagEvents, setLabelEvents, setActiveRecordings, setSelectedEventIds, setSelectedEventLogs, setAdvancedPadItems, setConnectors]);

  const handleSaveCodeFile = useCallback((name: string, isOverwrite: boolean) => {
      const allFiles = loadAllCodeFiles();
      const existingIndex = allFiles.findIndex(f => f.name.toLowerCase() === name.toLowerCase());

      const updatedFile: CodeFile = {
          id: (isOverwrite && existingIndex !== -1) ? allFiles[existingIndex].id : 'custom-' + Date.now(),
          name: name,
          description: (isOverwrite && existingIndex !== -1 && allFiles[existingIndex].description) ? allFiles[existingIndex].description : 'Custom football coding file',
          createdAt: (isOverwrite && existingIndex !== -1 && allFiles[existingIndex].createdAt) ? allFiles[existingIndex].createdAt : new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          isBuiltIn: false,
          tags: tags,
          labels: labels,
          labelGroups: labelGroups || [],
          items: advancedPadItems || [],
          connectors: connectors || []
      };

      let newFilesList: CodeFile[];
      if (existingIndex !== -1 && isOverwrite) {
          newFilesList = [...allFiles];
          newFilesList[existingIndex] = updatedFile;
      } else {
          newFilesList = [updatedFile, ...allFiles.filter(f => f.name.toLowerCase() !== name.toLowerCase())];
      }

      saveAllCodeFiles(newFilesList);
      setCurrentCodeFileName(name);
      try {
          localStorage.setItem(STORAGE_KEY_ACTIVE_CODE_FILE, name);
      } catch (e) {}
      showNotification('Saved Code File: "' + name + '" (Tags, Labels & Pad Layout synchronized)', '#c6ff1f');
  }, [tags, labels, labelGroups, advancedPadItems, connectors, showNotification]);

  // Unified Template Loader & Sync with Normal + Advanced Coding Panels
  const handleApplyNormalTemplate = useCallback((
      template: {
          tags: TagData[];
          labels: Label[];
          labelGroups: LabelGroup[];
          name: string;
      },
      mode: 'replace' | 'merge'
  ) => {
      if (mode === 'replace') {
          setTags(template.tags);
          setLabels(template.labels);
          setLabelGroups(template.labelGroups || []);
          setCurrentNormalTemplateName(template.name);

          // Sync layout to advancedPadItems so Advanced Coding Pad has everything placed immediately
          let nextX = 50;
          let nextY = 50;
          const newItems: AdvancedPadItem[] = [];

          template.tags.forEach(t => {
              newItems.push({
                  id: t.id,
                  type: 'tag',
                  x: nextX,
                  y: nextY,
                  width: 120,
                  height: 40,
                  zIndex: 10
              });
              nextX += 135;
              if (nextX > 750) {
                  nextX = 50;
                  nextY += 55;
              }
          });

          nextX = 50;
          nextY += 70;

          template.labels.forEach(l => {
              newItems.push({
                  id: l.id,
                  type: 'label',
                  x: nextX,
                  y: nextY,
                  width: 120,
                  height: 44,
                  zIndex: 10
              });
              nextX += 135;
              if (nextX > 750) {
                  nextX = 50;
                  nextY += 55;
              }
          });

          setAdvancedPadItems(newItems);
      } else {
          // Merge mode: Add non-duplicate tags and labels
          setTags(prev => {
              const existingIds = new Set(prev.map(t => t.id));
              const existingNames = new Set(prev.map(t => t.name.toLowerCase()));
              const toAdd = template.tags.filter(t => !existingIds.has(t.id) && !existingNames.has(t.name.toLowerCase()));
              return [...prev, ...toAdd];
          });

          setLabels(prev => {
              const existingIds = new Set(prev.map(l => l.id));
              const existingNames = new Set(prev.map(l => l.name.toLowerCase()));
              const toAdd = template.labels.filter(l => !existingIds.has(l.id) && !existingNames.has(l.name.toLowerCase()));
              return [...prev, ...toAdd];
          });

          setLabelGroups(prev => {
              const existingIds = new Set(prev.map(g => g.id));
              const existingNames = new Set(prev.map(g => g.name.toLowerCase()));
              const toAdd = (template.labelGroups || []).filter(g => !existingIds.has(g.id) && !existingNames.has(g.name.toLowerCase()));
              return [...prev, ...toAdd];
          });

          setCurrentNormalTemplateName(prev => prev ? `${prev} + ${template.name}` : template.name);
      }
  }, [setTags, setLabels, setLabelGroups, setAdvancedPadItems]);

  // Unified File Picker Handler
  const handleUnifiedFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
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
              let tplName = file.name.replace(/\.[^/.]+$/, "");

              if (Array.isArray(data)) {
                  parsedTags = data.map((t: any, idx: number) => ({
                      id: String(t.id || `tag-${Date.now()}-${idx}`),
                      name: String(t.name || t.tag_name || t.label || `Tag ${idx + 1}`),
                      color: String(t.color || '#c6ff1f'),
                      shortcut: String(t.shortcut || t.hotkey || ''),
                      leadLagEnabled: Boolean(t.leadLagEnabled),
                      preTime: typeof t.preTime === 'number' ? t.preTime : 10,
                      postTime: typeof t.postTime === 'number' ? t.postTime : 10
                  }));
              } else if (typeof data === 'object' && data !== null) {
                  if (data.name) tplName = data.name;

                  if (Array.isArray(data.tags)) {
                      parsedTags = data.tags.map((t: any, idx: number) => ({
                          id: String(t.id || `tag-${Date.now()}-${idx}`),
                          name: String(t.name || t.tag_name || t.label || `Tag ${idx + 1}`),
                          color: String(t.color || '#c6ff1f'),
                          shortcut: String(t.shortcut || t.hotkey || ''),
                          leadLagEnabled: Boolean(t.leadLagEnabled),
                          preTime: typeof t.preTime === 'number' ? t.preTime : 10,
                          postTime: typeof t.postTime === 'number' ? t.postTime : 10
                      }));
                  } else if (Array.isArray(data.items)) {
                      parsedTags = data.items.filter((it: any) => it.type === 'tag').map((it: any, idx: number) => ({
                          id: String(it.id || `tag-${Date.now()}-${idx}`),
                          name: String(it.content || it.name || `Tag ${idx + 1}`),
                          color: String(it.color || '#c6ff1f'),
                          shortcut: String(it.shortcut || '')
                      }));
                  }

                  if (Array.isArray(data.labels)) {
                      parsedLabels = data.labels.map((l: any, idx: number) => ({
                          id: String(l.id || `lbl-${Date.now()}-${idx}`),
                          name: String(l.name || `Label ${idx + 1}`),
                          groupId: l.groupId ? String(l.groupId) : undefined,
                          shortcut: l.shortcut ? String(l.shortcut) : undefined
                      }));
                  } else if (Array.isArray(data.items)) {
                      parsedLabels = data.items.filter((it: any) => it.type === 'label').map((it: any, idx: number) => ({
                          id: String(it.id || `lbl-${Date.now()}-${idx}`),
                          name: String(it.content || it.name || `Label ${idx + 1}`),
                          groupId: it.groupId ? String(it.groupId) : undefined,
                          shortcut: it.shortcut ? String(it.shortcut) : undefined
                      }));
                  }

                  if (Array.isArray(data.labelGroups)) {
                      parsedGroups = data.labelGroups.map((g: any, idx: number) => ({
                          id: String(g.id || `grp-${Date.now()}-${idx}`),
                          name: String(g.name || `Group ${idx + 1}`)
                      }));
                  }
              }

              if (parsedTags.length === 0 && parsedLabels.length === 0) {
                  showNotification('No tags or labels found in file.', '#ef4444');
                  return;
              }

              handleApplyNormalTemplate({
                  tags: parsedTags.length > 0 ? parsedTags : tags,
                  labels: parsedLabels.length > 0 ? parsedLabels : labels,
                  labelGroups: parsedGroups.length > 0 ? parsedGroups : labelGroups,
                  name: tplName
              }, 'replace');

              showNotification(`Applied coding setup "${tplName}" (${parsedTags.length} tags, ${parsedLabels.length} labels)!`, '#c6ff1f');
          } catch (err) {
              showNotification('Error parsing JSON file. Check file syntax.', '#ef4444');
          }
      };
      reader.readAsText(file);
      if (unifiedFileInputRef.current) unifiedFileInputRef.current.value = '';
  }, [handleApplyNormalTemplate, tags, labels, labelGroups, showNotification]);

  const importLabelsFromJSON = useCallback(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.json';
      input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (event) => {
              try {
                  const text = event.target?.result as string;
                  const data = JSON.parse(text);
                  
                  let labelCount = 0;
                  let tagCount = 0;

                  if (data.labels && Array.isArray(data.labels)) {
                      setLabels(prev => {
                          const existingIds = new Set(prev.map(l => l.id));
                          const newLabels = data.labels.filter((l: any) => !existingIds.has(l.id));
                          labelCount = newLabels.length;
                          return [...prev, ...newLabels];
                      });
                  }
                  
                  if (data.labelGroups && Array.isArray(data.labelGroups)) {
                      setLabelGroups(prev => {
                          const existingIds = new Set(prev.map(g => g.id));
                          const newGroups = data.labelGroups.filter((g: any) => !existingIds.has(g.id));
                          return [...prev, ...newGroups];
                      });
                  }

                  // Also check if file has tags!
                  if (data.tags && Array.isArray(data.tags)) {
                      setTags(prev => {
                          const existingIds = new Set(prev.map(t => t.id));
                          const newTags = data.tags.filter((t: any) => !existingIds.has(t.id));
                          tagCount = newTags.length;
                          return [...prev, ...newTags];
                      });
                  }

                  if (tagCount > 0 && labelCount > 0) {
                      showNotification(`Imported ${labelCount} labels and ${tagCount} tags successfully.`, '#c6ff1f');
                  } else if (labelCount > 0) {
                      showNotification('Labels imported successfully.', '#c6ff1f');
                  } else {
                      showNotification('Imported coding items from file.', '#c6ff1f');
                  }
              } catch (err) {
                  showNotification('Failed to parse JSON file.', '#ef4444');
              }
          };
          reader.readAsText(file);
      };
      input.click();
  }, [showNotification]);
  
  const handleBulkDeleteLabels = () => {
      if (selectedLabelIds.size > 0 || selectedGroupIds.size > 0) {
          setLabelDeleteConfirmation(true);
      }
  };

  const confirmBulkDeleteLabels = () => {
      setLabelGroups(prev => prev.filter(g => !selectedGroupIds.has(g.id)));
      setLabels(prev => prev.filter(l => !selectedLabelIds.has(l.id)).map(l => {
          if (l.groupId && selectedGroupIds.has(l.groupId)) {
              return { ...l, groupId: undefined };
          }
          return l;
      }));
      setSelectedLabelIds(new Set());
      setSelectedGroupIds(new Set());
      setLabelDeleteConfirmation(false);
      setIsLabelsSelectMode(false);
      showNotification('Labels deleted successfully.', '#c6ff1f');
  };

  const exportEventsToCSV = useCallback(() => {
      if (tagEvents.length === 0) {
          showNotification('No events to export.', '#ef4444');
          return;
      }
      
      const rows = [];
      rows.push(['Event ID', 'Tag ID', 'Tag Name', 'Color', 'Shortcut', 'Lead/Lag Enabled', 'Pre Time', 'Post Time', 'Start Time (Video)', 'End Time (Video)', 'Duration', 'Notes', 'Labels', 'Total Tag Count', 'Period', 'Game Time Start', 'Game Time End']);
      
      const tagCounts = new Map<string, number>();
      tagEvents.forEach(e => {
          tagCounts.set(e.tagId, (tagCounts.get(e.tagId) || 0) + 1);
      });

      const periodSyncs = project.data.periodSyncs || [];
      const sortedSyncs = [...periodSyncs].sort((a, b) => a.videoTimeSeconds - b.videoTimeSeconds);

      tagEvents.forEach(e => {
          const t = tags.find(x => x.id === e.tagId);
          const labelNames = (e.labelIds || []).map(id => labels.find(l => l.id === id)?.name).filter(Boolean).join(',');
          
          let periodName = '';
          let gameTimeStart = '';
          let gameTimeEnd = '';
          
          const currentSyncIdx = sortedSyncs.findLastIndex(s => e.startTime >= s.videoTimeSeconds);
          if (currentSyncIdx !== -1) {
              const sync = sortedSyncs[currentSyncIdx];
              periodName = sync.name;
              gameTimeStart = formatTime(e.startTime - sync.videoTimeSeconds);
              gameTimeEnd = formatTime(e.endTime - sync.videoTimeSeconds);
          }
          
          rows.push([
              e.id,
              e.tagId,
              `"${(t?.name || 'Unknown').replace(/"/g, '""')}"`,
              t?.color || '#ffffff',
              `"${(t?.shortcut || '').replace(/"/g, '""')}"`,
              t?.leadLagEnabled ? 'true' : 'false',
              t?.preTime || 0,
              t?.postTime || 0,
              e.startTime.toFixed(3),
              e.endTime.toFixed(3),
              (e.endTime - e.startTime).toFixed(3),
              `"${(e.notes || '').replace(/"/g, '""')}"`,
              `"${labelNames.replace(/"/g, '""')}"`,
              tagCounts.get(e.tagId) || 0,
              `"${periodName}"`,
              gameTimeStart,
              gameTimeEnd
          ]);
      });

      const csvContent = rows.map(e => e.join(",")).join("\n");
      const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `events_${project.name.replace(/\s+/g, '_')}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
  }, [tagEvents, tags, project.name, showNotification]);

  const importEventsFromCSV = useCallback(() => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.csv';
      input.onchange = (e) => {
          const file = (e.target as HTMLInputElement).files?.[0];
          if (!file) return;

          const reader = new FileReader();
          reader.onload = (event) => {
              let text = event.target?.result as string;
              if (!text) return;
              
              if (text.charCodeAt(0) === 0xFEFF) {
                  text = text.slice(1);
              }
              
              const lines = text.split('\n').map(l => l.trim()).filter(line => line.length > 0);
              const errors: string[] = [];
              if (lines.length <= 1) {
                  showNotification("CSV is empty or missing data.", '#ef4444');
                  return;
              }
              
              const header = parseCSVRow(lines[0]).map(s => s.trim());
              const eventIdIdx = header.indexOf('Event ID');
              const nameIdx = header.indexOf('Tag Name');
              const colorIdx = header.indexOf('Color');
              const shortcutIdx = header.indexOf('Shortcut');
              const leadLagIdx = header.indexOf('Lead/Lag Enabled');
              const preTimeIdx = header.indexOf('Pre Time');
              const postTimeIdx = header.indexOf('Post Time');
              const startIdx = header.indexOf('Start Time');
              const endIdx = header.indexOf('End Time');
              const notesIdx = header.indexOf('Notes');
              const labelsIdx = header.indexOf('Labels');
              
              if (nameIdx === -1 || startIdx === -1 || endIdx === -1) {
                  showNotification("CSV must contain 'Tag Name', 'Start Time', and 'End Time'.", '#ef4444');
                  return;
              }

              const parsedEvents: TagEvent[] = [];
              const newlyDiscoveredTags: TagData[] = [];
              const newlyDiscoveredLabels: Label[] = [];

              for (let i = 1; i < lines.length; i++) {
                  const row = parseCSVRow(lines[i]);
                  if (row.length === 0 || row.every(c => !c.trim())) continue;
                  
                  const tagName = row[nameIdx]?.trim();
                  if (!tagName) {
                      errors.push(`Row ${i+1}: Missing Tag Name.`);
                      continue;
                  }
                  
                  let tag = tags.find(t => t.name.toLowerCase() === tagName.toLowerCase()) || newlyDiscoveredTags.find(t => t.name.toLowerCase() === tagName.toLowerCase());
                  
                  if (!tag) {
                      const randColor = colorIdx !== -1 && row[colorIdx]?.trim() ? row[colorIdx].trim() : `#${Math.floor(Math.random()*16777215).toString(16).padStart(6, '0')}`;
                      const shortcutKey = shortcutIdx !== -1 ? row[shortcutIdx]?.trim() : '';
                      const isLeadLag = leadLagIdx !== -1 && row[leadLagIdx]?.trim().toLowerCase() === 'true';
                      const preTime = preTimeIdx !== -1 ? parseFloat(row[preTimeIdx]) || 0 : 0;
                      const postTime = postTimeIdx !== -1 ? parseFloat(row[postTimeIdx]) || 0 : 0;
                      
                      tag = {
                          id: `tag-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                          name: tagName,
                          color: randColor,
                          shortcut: shortcutKey,
                          leadLagEnabled: isLeadLag,
                          preTime,
                          postTime
                      };
                      newlyDiscoveredTags.push(tag);
                  }

                  const startTimeStr = row[startIdx]?.trim();
                  const endTimeStr = row[endIdx]?.trim();
                  const startTime = parseFloat(startTimeStr);
                  const endTime = parseFloat(endTimeStr);
                  const notes = notesIdx !== -1 ? row[notesIdx]?.trim() : '';
                  const importedEventId = eventIdIdx !== -1 && row[eventIdIdx]?.trim() ? row[eventIdIdx].trim() : `evt-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

                  if (isNaN(startTime) || isNaN(endTime)) {
                      errors.push(`Row ${i+1}: Invalid start or end time.`);
                      continue;
                  }
                  
                  const eventLabelIds: string[] = [];
                  if (labelsIdx !== -1 && row[labelsIdx]?.trim()) {
                      const lNames = row[labelsIdx].split(',').map(s => s.trim()).filter(Boolean);
                      for (const lName of lNames) {
                          let label = labels.find(l => l.name.toLowerCase() === lName.toLowerCase()) || newlyDiscoveredLabels.find(l => l.name.toLowerCase() === lName.toLowerCase());
                          if (!label) {
                              label = {
                                  id: `label-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
                                  name: lName
                              };
                              newlyDiscoveredLabels.push(label);
                          }
                          eventLabelIds.push(label.id);
                      }
                  }

                  parsedEvents.push({
                      id: importedEventId,
                      tagId: tag.id,
                      startTime,
                      endTime,
                      notes,
                      labelIds: eventLabelIds.length > 0 ? eventLabelIds : undefined
                  });
              }

              if (parsedEvents.length === 0) {
                  showNotification("No valid events found in CSV.", '#ef4444');
                  return;
              }

              setCsvImportState({
                  isOpen: true,
                  events: parsedEvents,
                  newTags: newlyDiscoveredTags,
                  newLabels: newlyDiscoveredLabels,
                  errors
              });
          };
          reader.readAsText(file);
      };
      input.click();
  }, [tags, showNotification]);

  // Playlist Management State
  const [playlistModal, setPlaylistModal] = useState<{ isOpen: boolean; mode: 'create' | 'edit'; playlistId?: string; tempName: string } | null>(null);
  const [playlistDeleteId, setPlaylistDeleteId] = useState<string | null>(null);
  const [autoplay, setAutoplay] = useState<{ active: boolean; playlistId: string | null; eventIndex: number }>({ active: false, playlistId: null, eventIndex: -1 });
  const [draggingEventIndex, setDraggingEventIndex] = useState<number | null>(null);
  const [showPlaylistPlaybar, setShowPlaylistPlaybar] = useState<boolean>(() => {
    return Boolean(batchMode?.autoPlayPlaylist || batchMode?.initialPlaylistId);
  });
  const [playlistPlaybarIndex, setPlaylistPlaybarIndex] = useState<number>(0);

  // Presentation Mode State
  const [isPresentationMode, setIsPresentationMode] = useState<boolean>(false);
  const [showPresentationCustomizeModal, setShowPresentationCustomizeModal] = useState<boolean>(false);
  const [presentationPlaylistIndex, setPresentationPlaylistIndex] = useState<number>(0);
  const [presentationFinished, setPresentationFinished] = useState<boolean>(false);
  const [presentationTransitionMsg, setPresentationTransitionMsg] = useState<string | null>(null);

  const [presentationConfig, setPresentationConfig] = useState<PresentationConfig>(() => {
    try {
      const saved = localStorage.getItem(`tacstem_presentation_config_${project.id}`);
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    const initialIds = (project.data.playlists || []).map(p => p.id);
    return {
      selectedPlaylistIds: initialIds,
      orderedPlaylistIds: initialIds,
      loop: false,
      pauseBetweenPlaylists: false,
      showDrawings: true
    };
  });

  // Keep presentation playlist IDs in sync if playlists are added/removed
  useEffect(() => {
    setPresentationConfig(prev => {
      const currentIds = new Set(playlists.map(p => p.id));
      const filteredSelected = prev.selectedPlaylistIds.filter(id => currentIds.has(id));
      const filteredOrdered = prev.orderedPlaylistIds.filter(id => currentIds.has(id));
      playlists.forEach(p => {
        if (!filteredOrdered.includes(p.id)) filteredOrdered.push(p.id);
        if (!filteredSelected.includes(p.id)) filteredSelected.push(p.id);
      });
      return {
        ...prev,
        selectedPlaylistIds: filteredSelected,
        orderedPlaylistIds: filteredOrdered
      };
    });
  }, [playlists]);

  // Sidebar Resizing State
  const [sidebarWidth, setSidebarWidth] = useState(240);
  const [eventSectionHeight, setEventSectionHeight] = useState(40);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isResizingSection, setIsResizingSection] = useState(false);

  // Sidebar Tabs & Notes State
  const [activeSidebarTab, setActiveSidebarTab] = useState<'tags' | 'events' | 'notes' | 'playlist'>('tags');
  const [tagPanelDensity, setTagPanelDensity] = useState<'compact' | 'comfortable' | 'list'>('compact');
  const [tagPanelFontSizeMode, setTagPanelFontSizeMode] = useState<'auto' | 'sm' | 'md' | 'lg'>('auto');

  const [notesSubTab, setNotesSubTab] = useState<'timeline' | 'general'>('timeline');
  const [projectNotes, setProjectNotes] = useState(project.data.projectNotes || '');
  const [periodSyncs, setPeriodSyncs] = useState<PeriodSync[]>(project.data.periodSyncs || []);
  const [logDeleteConfirmation, setLogDeleteConfirmation] = useState<string | null>(null);
  const [lastTagActionTimestamp, setLastTagActionTimestamp] = useState<number>(0);

  // Live Match Clock Hook
  const liveClock = useLiveClock({
    isLive,
    currentTime,
    setCurrentTime,
    periodSyncs,
    setPeriodSyncs,
    initialPeriodId: '1st-half',
    onPeriodChange: (_id, name) => {
      showNotification(`Kick-off: ${name}`, '#c6ff1f');
    }
  });

  const handleImportMatchVideo = () => {
    if (onRelinkVideo) {
      onRelinkVideo(project, true);
    } else {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'video/*';
      input.onchange = (e: any) => {
        const file = e.target?.files?.[0];
        if (file) {
          const updatedSyncs = periodSyncs.map(s => ({ ...s, needsVideoSync: true }));
          setPeriodSyncs(updatedSyncs);
          onUpdateProject({
            ...project.data,
            periodSyncs: updatedSyncs
          });
          showNotification(`Video loaded: ${file.name}. Align kickoffs in Period Sync Manager!`, '#c6ff1f');
        }
      };
      input.click();
    }
  };

  useEffect(() => {
    if (isLive) {
      setDuration(Math.max(currentTime + 60, 60));
    }
  }, [currentTime, isLive]);

  // Memoized aggregation of all tag events across batch projects
  const allBatchTagEvents = useMemo(() => {
    if (!batchMode?.allBatchProjects) return tagEvents;
    const map = new Map<string, TagEvent>();
    tagEvents.forEach(e => map.set(e.id, e));
    batchMode.allBatchProjects.forEach(bp => {
      if (bp.id !== project.id) {
        bp.data?.tagEvents?.forEach(e => {
          if (!map.has(e.id)) map.set(e.id, e);
        });
      }
    });
    return Array.from(map.values());
  }, [tagEvents, project.id, batchMode?.allBatchProjects]);

  const allBatchTags = useMemo(() => {
    if (!batchMode?.allBatchProjects) return tags;
    const map = new Map<string, TagData>();
    tags.forEach(t => map.set(t.id, t));
    batchMode.allBatchProjects.forEach(bp => {
      if (bp.id !== project.id) {
        bp.data?.tags?.forEach(t => {
          if (!map.has(t.id)) map.set(t.id, t);
        });
      }
    });
    return Array.from(map.values());
  }, [tags, project.id, batchMode?.allBatchProjects]);

  const allBatchLabels = useMemo(() => {
    if (!batchMode?.allBatchProjects) return labels;
    const map = new Map<string, Label>();
    labels.forEach(l => map.set(l.id, l));
    batchMode.allBatchProjects.forEach(bp => {
      if (bp.id !== project.id) {
        bp.data?.labels?.forEach(l => {
          if (!map.has(l.id)) map.set(l.id, l);
        });
      }
    });
    return Array.from(map.values());
  }, [labels, project.id, batchMode?.allBatchProjects]);

  // Resolves a playlist item's master event and owning project across the batch
  const findEventAcrossBatch = useCallback((eventId: string, item?: PlaylistItem): { event: TagEvent | undefined; project: Project | undefined } => {
    const itemProjectId = typeof item === 'object' ? item.projectId : undefined;

    // 1. If item specifies projectId, search that project first
    if (itemProjectId && batchMode?.allBatchProjects) {
      const matchProj = batchMode.allBatchProjects.find(p => p.id === itemProjectId);
      if (matchProj) {
        if (matchProj.id === project.id) {
          const ev = tagEvents.find(e => e.id === eventId);
          if (ev) return { event: ev, project: matchProj };
        }
        const ev = matchProj.data?.tagEvents?.find(e => e.id === eventId);
        if (ev) return { event: ev, project: matchProj };
      }
    }

    // 2. Search current project
    const currentEv = tagEvents.find(e => e.id === eventId);
    if (currentEv) return { event: currentEv, project };

    // 3. Search across all other projects in batch
    if (batchMode?.allBatchProjects) {
      for (const p of batchMode.allBatchProjects) {
        if (p.id === project.id) continue;
        const ev = p.data?.tagEvents?.find(e => e.id === eventId);
        if (ev) return { event: ev, project: p };
      }
    }

    return { event: undefined, project: undefined };
  }, [tagEvents, project, batchMode?.allBatchProjects]);

  // Unified playlist clip selection and cross-match transition handler
  const handlePlaylistClipSelect = useCallback((clipIndex: number, targetVideoTime?: number, autoPlay?: boolean) => {
    const pl = playlists.find(p => p.id === activePlaylistId);
    if (!pl || !pl.events[clipIndex]) return;

    const item = pl.events[clipIndex];
    const eventId = getClipEventId(item);
    const { event, project: clipProj } = findEventAcrossBatch(eventId, item);
    const timing = resolveClipTiming(item, event);
    const seekTime = targetVideoTime !== undefined ? targetVideoTime : timing.startTime;

    setPlaylistPlaybarIndex(clipIndex);
    if (autoPlay || autoplay.active) {
      setAutoplay({ active: true, playlistId: activePlaylistId, eventIndex: clipIndex });
    }

    if (clipProj && clipProj.id !== project.id && batchMode) {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      pendingSeekTimeRef.current = seekTime;
      pendingPlayRef.current = autoPlay !== undefined ? autoPlay : isPlaying;
      batchMode.onSelectProject(clipProj.id);
    } else {
      if (videoRef.current) {
        videoRef.current.currentTime = seekTime;
        setCurrentTime(seekTime);
        if (autoPlay || (autoPlay === undefined && isPlaying)) {
          videoRef.current.play().catch(e => console.log(e));
          setIsPlaying(true);
        }
      }
    }
  }, [playlists, activePlaylistId, findEventAcrossBatch, batchMode, project.id, isPlaying, autoplay.active]);

  // --- PRESENTATION MODE COMPUTED & HANDLERS ---
  const presentationPlaylists = useMemo(() => {
    const existingMap = new Map(playlists.map(p => [p.id, p]));
    const ordered = presentationConfig.orderedPlaylistIds
      .map(id => existingMap.get(id))
      .filter((p): p is Playlist => Boolean(p && p.events.length > 0));

    const selectedSet = new Set(presentationConfig.selectedPlaylistIds);
    const filtered = ordered.filter(p => selectedSet.has(p.id));

    if (filtered.length === 0) {
      return playlists.filter(p => p.events.length > 0);
    }
    return filtered;
  }, [playlists, presentationConfig.orderedPlaylistIds, presentationConfig.selectedPlaylistIds]);

  const currentPresentationPlaylist = presentationPlaylists[presentationPlaylistIndex] || presentationPlaylists[0];

  const { currentPresentationEvent, currentPresentationTiming } = useMemo(() => {
    if (!currentPresentationPlaylist || currentPresentationPlaylist.events.length === 0) {
      return {
        currentPresentationEvent: undefined,
        currentPresentationTiming: { startTime: 0, endTime: duration, duration: duration }
      };
    }
    const safeClipIdx = Math.max(0, Math.min(playlistPlaybarIndex, currentPresentationPlaylist.events.length - 1));
    const item = currentPresentationPlaylist.events[safeClipIdx];
    const evId = getClipEventId(item);
    const { event } = findEventAcrossBatch(evId, item);
    const timing = resolveClipTiming(item, event);
    return {
      currentPresentationEvent: event,
      currentPresentationTiming: timing
    };
  }, [currentPresentationPlaylist, playlistPlaybarIndex, findEventAcrossBatch, duration]);

  // Synchronized refs for tick animation frame
  const isPresentationModeRef = useRef(isPresentationMode);
  isPresentationModeRef.current = isPresentationMode;

  const presentationPlaylistsRef = useRef(presentationPlaylists);
  presentationPlaylistsRef.current = presentationPlaylists;

  const presentationConfigRef = useRef(presentationConfig);
  presentationConfigRef.current = presentationConfig;

  const presentationPlaylistIndexRef = useRef(presentationPlaylistIndex);
  presentationPlaylistIndexRef.current = presentationPlaylistIndex;

  const handleEnterPresentationMode = useCallback((startFromBeginning: boolean = false) => {
    const nonEmpties = playlists.filter(p => p.events.length > 0);
    if (playlists.length === 0 || nonEmpties.length === 0) {
      setShowPresentationCustomizeModal(true);
      return;
    }

    setIsPresentationMode(true);
    setPresentationFinished(false);

    try {
      if (!document.fullscreenElement && document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(() => {});
      }
    } catch (e) {}

    let targetPlIdx = presentationPlaylistIndex;
    if (startFromBeginning || targetPlIdx >= presentationPlaylists.length || targetPlIdx < 0) {
      targetPlIdx = 0;
      setPresentationPlaylistIndex(0);
    }

    const targetPl = presentationPlaylists[targetPlIdx] || nonEmpties[0];
    if (targetPl && targetPl.events.length > 0) {
      setActivePlaylistId(targetPl.id);
      setPlaylistPlaybarIndex(0);
      setAutoplay({ active: true, playlistId: targetPl.id, eventIndex: 0 });

      const firstItem = targetPl.events[0];
      const eventId = getClipEventId(firstItem);
      const { event, project: clipProj } = findEventAcrossBatch(eventId, firstItem);
      const timing = resolveClipTiming(firstItem, event);

      if (clipProj && clipProj.id !== project.id && batchMode) {
        if (videoRef.current) videoRef.current.pause();
        pendingSeekTimeRef.current = timing.startTime;
        pendingPlayRef.current = false;
        batchMode.onSelectProject(clipProj.id);
      } else if (videoRef.current) {
        videoRef.current.currentTime = timing.startTime;
        setCurrentTime(timing.startTime);
        videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [playlists, presentationPlaylists, presentationPlaylistIndex, findEventAcrossBatch, project.id, batchMode]);

  const handleExitPresentationMode = useCallback(() => {
    setIsPresentationMode(false);
    setShowPresentationCustomizeModal(false);
    try {
      if (document.fullscreenElement && document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
    } catch (e) {}
  }, []);

  const handleSelectPresentationPlaylistIndex = useCallback((index: number) => {
    if (index < 0 || index >= presentationPlaylists.length) return;
    const targetPl = presentationPlaylists[index];
    if (!targetPl || targetPl.events.length === 0) return;

    setPresentationPlaylistIndex(index);
    setActivePlaylistId(targetPl.id);
    setPlaylistPlaybarIndex(0);
    setAutoplay({ active: true, playlistId: targetPl.id, eventIndex: 0 });

    const firstItem = targetPl.events[0];
    const eventId = getClipEventId(firstItem);
    const { event, project: clipProj } = findEventAcrossBatch(eventId, firstItem);
    const timing = resolveClipTiming(firstItem, event);

    if (clipProj && clipProj.id !== project.id && batchMode) {
      if (videoRef.current) videoRef.current.pause();
      pendingSeekTimeRef.current = timing.startTime;
      pendingPlayRef.current = true;
      batchMode.onSelectProject(clipProj.id);
    } else if (videoRef.current) {
      videoRef.current.currentTime = timing.startTime;
      setCurrentTime(timing.startTime);
      videoRef.current.play().catch(e => console.log(e));
      setIsPlaying(true);
    }
  }, [presentationPlaylists, findEventAcrossBatch, project.id, batchMode]);

  const handleNextPresentationClip = useCallback(() => {
    if (!currentPresentationPlaylist || currentPresentationPlaylist.events.length === 0) return;
    const nextClipIdx = playlistPlaybarIndex + 1;
    if (nextClipIdx < currentPresentationPlaylist.events.length) {
      handlePlaylistClipSelect(nextClipIdx, undefined, true);
    } else {
      const nextPlIdx = presentationPlaylistIndex + 1;
      if (nextPlIdx < presentationPlaylists.length) {
        handleSelectPresentationPlaylistIndex(nextPlIdx);
      } else if (presentationConfig.loop && presentationPlaylists.length > 0) {
        handleSelectPresentationPlaylistIndex(0);
      } else {
        setPresentationFinished(true);
        if (videoRef.current) videoRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [currentPresentationPlaylist, playlistPlaybarIndex, presentationPlaylistIndex, presentationPlaylists, presentationConfig.loop, handlePlaylistClipSelect, handleSelectPresentationPlaylistIndex]);

  const handlePrevPresentationClip = useCallback(() => {
    if (!currentPresentationPlaylist || currentPresentationPlaylist.events.length === 0) return;
    const prevClipIdx = playlistPlaybarIndex - 1;
    if (prevClipIdx >= 0) {
      handlePlaylistClipSelect(prevClipIdx, undefined, true);
    } else {
      const prevPlIdx = presentationPlaylistIndex - 1;
      if (prevPlIdx >= 0) {
        const prevPl = presentationPlaylists[prevPlIdx];
        if (prevPl && prevPl.events.length > 0) {
          setPresentationPlaylistIndex(prevPlIdx);
          setActivePlaylistId(prevPl.id);
          const lastClipIdx = prevPl.events.length - 1;
          setPlaylistPlaybarIndex(lastClipIdx);
          setAutoplay({ active: true, playlistId: prevPl.id, eventIndex: lastClipIdx });
          const lastItem = prevPl.events[lastClipIdx];
          const eventId = getClipEventId(lastItem);
          const { event, project: clipProj } = findEventAcrossBatch(eventId, lastItem);
          const timing = resolveClipTiming(lastItem, event);
          if (clipProj && clipProj.id !== project.id && batchMode) {
            if (videoRef.current) videoRef.current.pause();
            pendingSeekTimeRef.current = timing.startTime;
            pendingPlayRef.current = true;
            batchMode.onSelectProject(clipProj.id);
          } else if (videoRef.current) {
            videoRef.current.currentTime = timing.startTime;
            setCurrentTime(timing.startTime);
            videoRef.current.play().catch(e => console.log(e));
            setIsPlaying(true);
          }
        }
      }
    }
  }, [currentPresentationPlaylist, playlistPlaybarIndex, presentationPlaylistIndex, presentationPlaylists, handlePlaylistClipSelect, findEventAcrossBatch, project.id, batchMode]);

  const handleSeekPresentationClip = useCallback((seekTime: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setCurrentTime(seekTime);
    }
  }, []);

  const handleCreateDefaultPlaylist = useCallback(() => {
    const newId = `pl-${Date.now()}`;
    const newEvents: PlaylistItem[] = tagEvents.slice(0, 10).map((te, idx) => ({
      instanceId: `clip-${te.id}-${idx}`,
      eventId: te.id,
      inPoint: te.startTime,
      outPoint: te.endTime
    }));
    const newPl: Playlist = {
      id: newId,
      name: newEvents.length > 0 ? "Match Highlights" : "Presentation Playlist 1",
      events: newEvents
    };
    setPlaylists(prev => [...prev, newPl]);
    setActivePlaylistId(newId);
    setPresentationConfig(prev => {
      const next = {
        ...prev,
        selectedPlaylistIds: [...prev.selectedPlaylistIds, newId],
        orderedPlaylistIds: [...prev.orderedPlaylistIds, newId]
      };
      try {
        localStorage.setItem(`tacstem_presentation_config_${project.id}`, JSON.stringify(next));
      } catch (e) {}
      return next;
    });
    showNotification(`Created "${newPl.name}" with ${newEvents.length} clips`, '#c6ff1f');
  }, [tagEvents, project.id, showNotification]);

  // Presentation Keyboard Navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;

      if (e.key === 'Escape' && isPresentationMode) {
        e.preventDefault();
        if (showPresentationCustomizeModal) {
          setShowPresentationCustomizeModal(false);
        } else {
          handleExitPresentationMode();
        }
      } else if (e.key === ' ' && isPresentationMode && !showPresentationCustomizeModal) {
        e.preventDefault();
        if (videoRef.current) {
          if (videoRef.current.paused) {
            videoRef.current.play().catch(err => console.log(err));
            setIsPlaying(true);
          } else {
            videoRef.current.pause();
            setIsPlaying(false);
          }
        }
      } else if (e.key === 'ArrowLeft' && isPresentationMode && !showPresentationCustomizeModal) {
        e.preventDefault();
        handlePrevPresentationClip();
      } else if (e.key === 'ArrowRight' && isPresentationMode && !showPresentationCustomizeModal) {
        e.preventDefault();
        handleNextPresentationClip();
      } else if ((e.key === 'p' || e.key === 'P') && e.shiftKey) {
        e.preventDefault();
        if (!isPresentationMode) {
          handleEnterPresentationMode();
        } else {
          handleExitPresentationMode();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isPresentationMode, showPresentationCustomizeModal, handlePrevPresentationClip, handleNextPresentationClip, handleEnterPresentationMode, handleExitPresentationMode]);

  // Keep latestProjectDataRef updated for autosave and project transitions
  useEffect(() => {
    latestProjectDataRef.current = {
      shapes, freezeFrames, tags, tagEvents,
      playlists: batchMode ? project.data.playlists : playlists,
      markers, presetTexts, projectNotes, labels, labelEvents, advancedPadItems, connectors, periodSyncs,
      ...(isLive ? { liveTime: currentTime } : {})
    };
  }, [shapes, freezeFrames, tags, tagEvents, playlists, markers, presetTexts, projectNotes, labels, labelEvents, advancedPadItems, connectors, periodSyncs, batchMode, isLive, currentTime, project.data.playlists]);

  // Sync state when project changes in batch mode without unmounting Workspace
  useEffect(() => {
    if (prevProjectIdRef.current === project.id) return;

    // Immediately save unsaved edits from previous project
    if (prevProjectIdRef.current) {
      onUpdateProject(latestProjectDataRef.current, prevProjectIdRef.current);
    }
    prevProjectIdRef.current = project.id;

    // Load states for newly active project
    setShapes(project.data.shapes || []);
    setFreezeFrames(project.data.freezeFrames || []);
    setTags(project.data.tags || DEFAULT_TAGS);
    _setTagEvents(project.data.tagEvents || []);
    setLabels(project.data.labels || []);
    setLabelGroups(project.data.labelGroups || []);
    _setLabelEvents(project.data.labelEvents || []);
    setMarkers(project.data.markers || []);
    setPresetTexts(project.data.presetTexts || [
      { id: '1', text: 'Good pressure' },
      { id: '2', text: 'Compact shape' },
      { id: '3', text: 'Switch play' },
      { id: '4', text: 'Overload' },
      { id: '5', text: 'Counter attack' }
    ]);
    setProjectNotes(project.data.projectNotes || '');
    setPeriodSyncs(project.data.periodSyncs || []);
    setConnectors(project.data.connectors || []);
    setAdvancedPadItems(project.data.advancedPadItems || []);
    setInfoForm({ name: project.name || '', description: project.description || '' });
    tagEventsHistoryRef.current = [project.data.tagEvents || []];
    tagEventsHistoryIndexRef.current = 0;
    setUndoStack([]);
    setRedoStack([]);
    setSelectedEventIds(new Set());
    setSelectedEventLogs(new Set());
    setPlaybarEventId(null);
    setActiveFreezeFrameId(null);
    setIsDrawing(false);

    // If user switched match directly (not seeking a specific clip), reset currentTime
    if (pendingSeekTimeRef.current === null) {
      const initTime = project.fileName === 'live' ? project.data.liveTime || 0 : 0;
      setCurrentTime(initTime);
      if (videoRef.current) {
        videoRef.current.currentTime = initTime;
      }
    }
  }, [project.id]);

  // Handle immediate seek/play when videoUrl changes and video is ready
  useEffect(() => {
    if (
      videoRef.current && 
      pendingSeekTimeRef.current !== null && 
      (videoRef.current.currentSrc === videoUrl || videoRef.current.src === videoUrl) &&
      videoRef.current.readyState >= 1
    ) {
      const seekTo = pendingSeekTimeRef.current;
      pendingSeekTimeRef.current = null;
      videoRef.current.currentTime = seekTo;
      setCurrentTime(seekTo);
      if (pendingPlayRef.current || isPlaying || autoplay.active) {
        pendingPlayRef.current = false;
        setIsPlaying(true);
        videoRef.current.play().catch(e => console.log("Video resume error:", e));
      }
    }
  }, [videoUrl, isPlaying, autoplay.active]);

  const [eventSortMode, setEventSortMode] = useState<'recent' | 'timing'>('recent');
  const [isEventsEditMode, setIsEventsEditMode] = useState(false);
  const [bulkDeleteConfirmation, setBulkDeleteConfirmation] = useState(false);

  // Timeline Editing State
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, eventId: string } | null>(null);
  const [editEventModal, setEditEventModal] = useState<{ isOpen: boolean, eventId: string, startTime: number, endTime: number, notes: string } | null>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState<string | null>(null);
  const [tagDeleteConfirmation, setTagDeleteConfirmation] = useState<string | null>(null);
  const [workspaceAlert, setWorkspaceAlert] = useState<string | null>(null);

  const [isScrubbing, setIsScrubbing] = useState(false);

  // Recording State
  const [isScreenRecording, setIsScreenRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const recordedChunksRef = useRef<BlobPart[]>([]);
  const recordingStateRef = useRef<{ rafId: number; stream: MediaStream } | null>(null);
  const recordingStartTimeRef = useRef<number | null>(null);
  const recordingCustomNameRef = useRef<string | null>(null);
  const exportSettingsRef = useRef<{ active: boolean, playlistId: string | null, withFreezeFrames: boolean, customFileName?: string }>({ active: false, playlistId: null, withFreezeFrames: true });

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        try {
            mediaRecorderRef.current.stop();
        } catch (e) {
            console.warn("MediaRecorder stop warning:", e);
        }
    }
    if (recordingStateRef.current) {
        cancelAnimationFrame(recordingStateRef.current.rafId);
        if (recordingStateRef.current.stream) {
            recordingStateRef.current.stream.getTracks().forEach(track => {
                try { track.stop(); } catch (e) {}
            });
        }
        recordingStateRef.current = null;
    }
    recordingStartTimeRef.current = null;
    setIsScreenRecording(false);
  }, []);

  const toggleScreenRecording = async () => {
    setRecordingError(null);
    if (isScreenRecording) {
      stopRecording();
      return;
    }

    try {
      const video = videoRef.current;
      const overlayCanvas = canvasRef.current;

      if (!video || !overlayCanvas) {
         throw new Error("Video or canvas element not available for recording.");
      }

      // Create a composite canvas tailored to the video's intrinsic dimensions for broadcast quality
      const compCanvas = document.createElement('canvas');
      const vWidth = Math.max(320, video.videoWidth || (video.clientWidth ? Math.round(video.clientWidth * (window.devicePixelRatio || 1)) : 1920));
      const vHeight = Math.max(240, video.videoHeight || (video.clientHeight ? Math.round(video.clientHeight * (window.devicePixelRatio || 1)) : 1080));
      compCanvas.width = vWidth;
      compCanvas.height = vHeight;
      const ctx = compCanvas.getContext('2d', { alpha: false, desynchronized: true }) || compCanvas.getContext('2d');
      if (!ctx) throw new Error("Could not create canvas drawing context.");

      // Draw initial video frame onto compCanvas
      if (video.readyState >= 2) {
        try {
          ctx.drawImage(video, 0, 0, compCanvas.width, compCanvas.height);
        } catch (e) {}
      }

      const stream = (compCanvas.captureStream ? compCanvas.captureStream(60) : (compCanvas as any).mozCaptureStream ? (compCanvas as any).mozCaptureStream(60) : null) as MediaStream | null;
      if (!stream) {
        throw new Error("Canvas stream capture is not supported in this browser.");
      }

      const possibleTypes = [
        'video/webm; codecs=vp9',
        'video/webm; codecs=vp8',
        'video/webm',
        'video/mp4; codecs=avc1.424028',
        'video/mp4',
        ''
      ];

      let recorder: MediaRecorder | null = null;
      let chosenMime = '';

      for (const type of possibleTypes) {
        if (type === '' || (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(type))) {
          try {
            const options: MediaRecorderOptions = {};
            if (type) options.mimeType = type;
            options.videoBitsPerSecond = 25000000; // 25 Mbps high quality
            recorder = new MediaRecorder(stream, options);
            chosenMime = type;
            break;
          } catch (err1) {
            try {
              const options: MediaRecorderOptions = {};
              if (type) options.mimeType = type;
              recorder = new MediaRecorder(stream, options);
              chosenMime = type;
              break;
            } catch (err2) {
              // Try next candidate
            }
          }
        }
      }

      if (!recorder) {
        recorder = new MediaRecorder(stream);
      }

      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          recordedChunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const format = chosenMime || 'video/webm';
        let ext = 'webm';
        if (format.includes('mp4')) ext = 'mp4';
        
        if (recordedChunksRef.current.length === 0) {
          setIsScreenRecording(false);
          return;
        }

        const blob = new Blob(recordedChunksRef.current, { type: format });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        document.body.appendChild(a);
        a.style.display = 'none';
        a.href = url;
        
        const customName = recordingCustomNameRef.current;
        recordingCustomNameRef.current = null;
        const rawBase = customName || project.name || 'telestration-recording';
        const cleanBase = rawBase.replace(/[^a-z0-9_-]/gi, '-').toLowerCase() || 'export-recording';
        a.download = `${cleanBase}-${Date.now()}.${ext}`;
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(url);
          if (a.parentNode) a.parentNode.removeChild(a);
        }, 1000);
        recordedChunksRef.current = [];
        setIsScreenRecording(false);
      };

      // Composite rendering loop
      const drawFrame = (_now: number) => {
         if (!recordingStateRef.current) return;
         recordingStateRef.current.rafId = requestAnimationFrame(drawFrame);
         
         if (video.readyState >= 2) { 
             try {
               ctx.drawImage(video, 0, 0, compCanvas.width, compCanvas.height);
               
               // Draw the overlay canvas
               const layout = getVideoLayout(overlayCanvas, video);
               if (layout.w > 0 && layout.h > 0) {
                   ctx.drawImage(
                      overlayCanvas, 
                      layout.x, layout.y, layout.w, layout.h, 
                      0, 0, compCanvas.width, compCanvas.height
                   );
               }
             } catch (renderErr) {
               // Ignore transient frame draw error
             }
         }
      };

      const initialRaf = requestAnimationFrame(drawFrame);
      recordingStateRef.current = { rafId: initialRaf, stream };

      recordedChunksRef.current = [];
      recordingStartTimeRef.current = Date.now();
      recorder.start(500); // 500ms timeslices for reliable chunk buffering
      mediaRecorderRef.current = recorder;
      setIsScreenRecording(true);
    } catch (err: any) {
      console.error("Error starting canvas recording:", err);
      setRecordingError(err.message || "Failed to start canvas recording.");
      stopRecording();
      throw err;
    }
  };

  // Refs
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ghostCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timelineRef = useRef<HTMLDivElement>(null);
  const timelineContainerRef = useRef<HTMLDivElement>(null);
  const expandedTimelineContainerRef = useRef<HTMLDivElement>(null); 
  const sidebarRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Computed
  const currentColor = colors.find(c => c.id === activeColorId)?.value || '#00eaff';

  // --- Data Sync ---
  // Debounced update to parent
  useEffect(() => {
    const timeout = setTimeout(() => {
        onUpdateProject({
            shapes, freezeFrames, tags, tagEvents, 
            playlists: batchMode ? project.data.playlists : playlists, 
            markers, presetTexts, projectNotes, labels, labelEvents, advancedPadItems, connectors, periodSyncs,
            ...(isLive ? { liveTime: currentTime } : {})
        });
        if (batchMode) {
            batchMode.onUpdateBatch({
                ...batchMode.batch,
                playlists,
                lastModified: Date.now()
            });
        }
    }, 1000);
    return () => clearTimeout(timeout);
  }, [shapes, freezeFrames, tags, tagEvents, playlists, markers, presetTexts, projectNotes, labels, labelEvents, advancedPadItems, connectors, periodSyncs, batchMode]);

  useEffect(() => {
    if (activeFreezeFrameId && isPlaying) {
      const el = document.getElementById(`ff-item-${activeFreezeFrameId}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [activeFreezeFrameId, isPlaying]);

  useEffect(() => {
    if (videoRef.current) videoRef.current.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      videoRef.current.muted = isMuted;
    }
  }, [volume, isMuted]);

  useEffect(() => {
      if (isTimelineExpanded) {
          setTimelineZoom(30);
      } else {
          setTimelineZoom(1);
      }
  }, [isTimelineExpanded]);

  useEffect(() => {
    if (isPlaying) {
      setShapes(prev => prev.filter(s => !!s.freezeFrameId));
      setRedoStack([]);
      setActivePoints([]);
      setIsDrawing(false);
      setCurrentDragStart(null);
      setPlayerMoveState('idle');
      setPlayerSelectionRect(null);
      setCapturedSprite(null);
    }
  }, [isPlaying]);

  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    
    if (!activeFreezeFrameId) {
        if (countdownInterval.current) {
            clearInterval(countdownInterval.current);
            countdownInterval.current = null;
        }
        return;
    }

    const ff = freezeFrames.find(f => f.id === activeFreezeFrameId);
    if (!ff) return;

    const startCountdown = () => {
        if (countdownInterval.current) return;
        setCountdownValue(prev => {
            let remaining = prev > 0 ? prev : ff.duration;
            countdownInterval.current = window.setInterval(() => {
                remaining -= 0.1;
                setCountdownValue(remaining);
                if (remaining <= 0) {
                    if (countdownInterval.current) clearInterval(countdownInterval.current);
                    countdownInterval.current = null;
                    if (videoRef.current) {
                        videoRef.current.play().catch(e => console.log(e));
                        setIsPlaying(true);
                    }
                    setActiveFreezeFrameId(null);
                    setCountdownValue(0);
                }
            }, 100);
            return remaining;
        });
    };

    if (maskSettings.enabled) {
        const isMaskSynced = maskCache.timestamp !== -1 && Math.abs(maskCache.timestamp - ff.timestamp) < 0.15;
        if (maskCache.processedAt > 0 && isMaskSynced) {
            timer = setTimeout(() => {
                startCountdown();
            }, 0);
        }
    } else {
        startCountdown();
    }

    return () => {
        if (timer) clearTimeout(timer);
        // Do NOT clear interval here because we want it to persist across re-renders 
        // that are triggered by maskCache updates, BUT we rely on the 
        // !activeFreezeFrameId branch above to clear it when freeze frame ends.
    };
  }, [activeFreezeFrameId, maskSettings.enabled, maskCache.processedAt, maskCache.timestamp, freezeFrames]);

  // Dynamic Timeline Calculation
  const timelineLanes = useMemo(() => {
      let allEvents = [...tagEvents];
      
      // Inject pseudo-event for live recordings
      if (isTaggingMode && activeRecordings.length > 0) {
          activeRecordings.forEach(rec => {
              const recTag = tags.find(t => t.id === rec.tagId);
              allEvents.push({
                  id: `RECORDING_PSEUDO_${rec.tagId}`,
                  tagId: rec.tagId,
                  startTime: Math.min(rec.startTime, currentTime),
                  endTime: Math.max(rec.startTime, currentTime),
                  notes: `Recording ${recTag?.name || 'Event'}...`
              });
          });
      }

      if (filterTagId) {
          allEvents = allEvents.filter(e => e.tagId === filterTagId);
      }
      if (filterLabelId) {
          allEvents = allEvents.filter(e => e.labelIds && e.labelIds.includes(filterLabelId));
      }
      
      // Sort by start time
      allEvents.sort((a, b) => a.startTime - b.startTime);

      const lanes: TagEvent[][] = [];
      
      allEvents.forEach(event => {
          let placed = false;
          // Try to fit in existing lane
          for (let i = 0; i < lanes.length; i++) {
              const lane = lanes[i];
              const lastEvent = lane[lane.length - 1];
              // 0.05 buffer to prevent visual overlap
              if (event.startTime >= lastEvent.endTime + 0.05) {
                  lane.push(event);
                  placed = true;
                  break;
              }
          }
          // Create new lane
          if (!placed) {
              lanes.push([event]);
          }
      });
      return lanes;
  }, [tagEvents, activeRecordings, currentTime, isTaggingMode, filterTagId, filterLabelId]);

  // ... (Toggle Play, Mute, Zoom, Manual Seek, etc. same as before)
  const togglePlay = () => {
    if (isLive) {
      liveClock.toggleLiveClock();
      return;
    }
    if (editingAnimationFFId) {
        setEditingAnimationFFId(null);
        setIsAnimationPreviewPlaying(false);
    }
    if (countdownInterval.current) {
        clearInterval(countdownInterval.current);
        countdownInterval.current = null;
        setActiveFreezeFrameId(null);
        setCountdownValue(0);
        if (videoRef.current) videoRef.current.play().catch(e => console.log(e));
        setIsPlaying(true);
        return;
    }
    if (showPlaylistPlaybar) {
        const pl = playlists.find(p => p.id === activePlaylistId);
        if (pl && pl.events.length > 0) {
            if (isPlaying) {
                videoRef.current?.pause();
                setIsPlaying(false);
                if (autoplay.active) {
                    setAutoplay({ active: false, playlistId: null, eventIndex: -1 });
                }
            } else {
                const currentItem = pl.events[playlistPlaybarIndex] || pl.events[0];
                const { event: currentEvent, project: currentProj } = findEventAcrossBatch(getClipEventId(currentItem), currentItem);
                const currentTiming = resolveClipTiming(currentItem, currentEvent);
                if (currentProj && currentProj.id !== project.id && batchMode) {
                    handlePlaylistClipSelect(playlistPlaybarIndex, currentTiming.startTime, true);
                    return;
                }
                if (videoRef.current) {
                    // Restrict playback strictly within the clip range
                    if (videoRef.current.currentTime < currentTiming.startTime || videoRef.current.currentTime >= currentTiming.endTime - 0.05) {
                        videoRef.current.currentTime = currentTiming.startTime;
                    }
                    videoRef.current.play().catch(e => console.log(e));
                    setIsPlaying(true);
                    setAutoplay({ active: true, playlistId: activePlaylistId, eventIndex: playlistPlaybarIndex });
                }
            }
            return;
        }
    }
    if (selectedEventIds.size === 1 && !isMultiSelectAction && playbarEventId === Array.from(selectedEventIds)[0]) {
        const trimmingEvt = tagEvents.find(e => e.id === playbarEventId);
        if (trimmingEvt && videoRef.current) {
            if (isPlaying) {
                videoRef.current.pause();
                setIsPlaying(false);
            } else {
                if (videoRef.current.currentTime < trimmingEvt.startTime || videoRef.current.currentTime >= trimmingEvt.endTime - 0.05) {
                    videoRef.current.currentTime = trimmingEvt.startTime;
                }
                videoRef.current.play().catch(e => console.log(e));
                setIsPlaying(true);
            }
            return;
        }
    }
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
        if (autoplay.active) {
            setAutoplay({ active: false, playlistId: null, eventIndex: -1 });
        }
      } else {
        videoRef.current.play().catch(e => console.log(e));
      }
      setIsPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleZoomIn = () => {
      setTimelineZoom(prev => Math.min(100, prev + 5));
  };

  const handleZoomOut = () => {
      setTimelineZoom(prev => Math.max(1, prev - 5));
  };

  useEffect(() => {
      const updateScroll = (container: HTMLDivElement | null) => {
          if (!container) return;
          if (timelineZoom > 1) {
              const scrollWidth = container.scrollWidth;
              const clientWidth = container.clientWidth;
              const progress = currentTime / (duration || 1);
              const center = (progress * scrollWidth) - (clientWidth / 2);
              container.scrollLeft = center;
          } else {
              container.scrollLeft = 0;
          }
      };
      
      updateScroll(timelineContainerRef.current);
      updateScroll(expandedTimelineContainerRef.current);
  }, [currentTime, timelineZoom, duration]);

  const getFilteredEvents = () => {
      let events = [...tagEvents];
      if (filterTagId) {
          events = events.filter(e => e.tagId === filterTagId);
      }
      if (filterLabelId) {
          events = events.filter(e => e.labelIds && e.labelIds.includes(filterLabelId));
      }
      return events.sort((a, b) => a.startTime - b.startTime);
  };

  const getDisplayEvents = () => {
      let events = [...tagEvents];
      if (filterTagId) {
          events = events.filter(e => e.tagId === filterTagId);
      }
      if (filterLabelId) {
          events = events.filter(e => e.labelIds && e.labelIds.includes(filterLabelId));
      }
      if (eventSortMode === 'recent') {
          return events.reverse();
      }
      return events.sort((a, b) => a.startTime - b.startTime);
  };

  const handleManualSeek = (time: number) => {
      if (editingAnimationFFId) {
          setEditingAnimationFFId(null);
          setIsAnimationPreviewPlaying(false);
      }
      let targetTime = time;
      if (showPlaylistPlaybar) {
          const pl = playlists.find(p => p.id === activePlaylistId);
          if (pl && pl.events.length > 0) {
              const currentItem = pl.events[playlistPlaybarIndex] || pl.events[0];
              const { event: currentEvent } = findEventAcrossBatch(getClipEventId(currentItem), currentItem);
              const currentTiming = resolveClipTiming(currentItem, currentEvent);
              targetTime = Math.max(currentTiming.startTime, Math.min(currentTiming.endTime, time));
          }
      } else if (playbarEventId && selectedEventIds.size === 1 && !isMultiSelectAction) {
          const trimmingEvt = tagEvents.find(e => e.id === playbarEventId);
          if (trimmingEvt) {
              targetTime = Math.max(trimmingEvt.startTime, Math.min(trimmingEvt.endTime, time));
          }
      }
      if (videoRef.current) {
          videoRef.current.currentTime = targetTime;
          setCurrentTime(targetTime);
          triggeredFreezeFrames.current.clear();
          if (countdownInterval.current) {
              clearInterval(countdownInterval.current);
              countdownInterval.current = null;
              setActiveFreezeFrameId(null);
              setCountdownValue(0);
              setIsPlaying(false);
          }
      }
  };

  const jumpPrevEvent = () => {
    const events = getFilteredEvents();
    if (!events.length || !videoRef.current) return;
    const now = videoRef.current.currentTime;
    const prev = [...events].reverse().find(e => e.startTime < now - 0.5);
    if (prev) {
        handleManualSeek(prev.startTime);
    } else if (now > 0.5) {
        handleManualSeek(0);
    }
  };

  const jumpNextEvent = () => {
      const events = getFilteredEvents();
      if (!events.length || !videoRef.current) return;
      const now = videoRef.current.currentTime;
      const next = events.find(e => e.startTime > now + 0.5);
      if (next) {
          handleManualSeek(next.startTime);
      }
  };

  const addFreezeFrame = () => {
      const current = videoRef.current?.currentTime || 0;
      const existing = freezeFrames.find(ff => Math.abs(ff.timestamp - current) < 0.5);
      if (!existing) {
          const newFFId = Date.now().toString();

          const newFF: FreezeFrame = {
              id: newFFId,
              timestamp: current,
              duration: 5,
              name: `Frame ${freezeFrames.length + 1}`
          };
          setFreezeFrames(prev => [...prev, newFF]);

          // Attach all current temporary shapes (no freezeFrameId) to this new freeze frame
          setShapes(prev => prev.map(s => {
              if (!s.freezeFrameId) {
                  return { ...s, freezeFrameId: newFFId };
              }
              return s;
          }));
      }
  };

  const deleteFreezeFrame = useCallback((id: string) => {
      const ffToDelete = freezeFrames.find(ff => ff.id === id);
      if (!ffToDelete) return;

      const originalIndex = freezeFrames.findIndex(ff => ff.id === id);
      const affectedShapeIds = shapes.filter(s => s.freezeFrameId === id).map(s => s.id);

      setFreezeFrames(prev => prev.filter(ff => ff.id !== id));
      setShapes(prev => prev.map(s => s.freezeFrameId === id ? { ...s, freezeFrameId: undefined } : s));

      if (activeFreezeFrameId === id) {
          setActiveFreezeFrameId(null);
      }
      if (editingAnimationFFId === id) {
          setEditingAnimationFFId(null);
      }
      // Ensure property panel shows Freeze Frames so the undo banner is immediately visible
      setTool(null);

      const newRecord: DeletedFreezeFrameRecord = {
          id: ffToDelete.id,
          name: ffToDelete.name || `Frame at ${formatTime(ffToDelete.timestamp)}`,
          timestamp: ffToDelete.timestamp,
          frame: { ...ffToDelete },
          shapeIds: affectedShapeIds,
          originalIndex
      };

      setDeletedFFStack(prev => [...prev, newRecord]);
      setFfExpiryTime(Date.now() + FF_UNDO_DURATION);
      setFfRemainingSeconds(Math.ceil(FF_UNDO_DURATION / 1000));
      setFfProgressPercent(100);
  }, [freezeFrames, shapes, activeFreezeFrameId, editingAnimationFFId]);

  const undoDeleteFreezeFrame = useCallback(() => {
      if (deletedFFStack.length === 0) return;

      const lastDeleted = deletedFFStack[deletedFFStack.length - 1];
      const remainingStack = deletedFFStack.slice(0, -1);

      // Restore freeze frame
      setFreezeFrames(prev => {
          if (prev.some(f => f.id === lastDeleted.frame.id)) return prev;
          const next = [...prev];
          if (lastDeleted.originalIndex >= 0 && lastDeleted.originalIndex <= next.length) {
              next.splice(lastDeleted.originalIndex, 0, lastDeleted.frame);
          } else {
              next.push(lastDeleted.frame);
          }
          return next.sort((a, b) => a.timestamp - b.timestamp);
      });

      // Re-link affected shapes
      if (lastDeleted.shapeIds.length > 0) {
          setShapes(prev => prev.map(s => {
              if (lastDeleted.shapeIds.includes(s.id)) {
                  return { ...s, freezeFrameId: lastDeleted.frame.id };
              }
              return s;
          }));
      }

      if (remainingStack.length > 0) {
          setDeletedFFStack(remainingStack);
          setFfExpiryTime(Date.now() + FF_UNDO_DURATION);
          setFfRemainingSeconds(Math.ceil(FF_UNDO_DURATION / 1000));
          setFfProgressPercent(100);
      } else {
          setDeletedFFStack([]);
          setFfExpiryTime(null);
      }
  }, [deletedFFStack]);

  const undoDeleteAllFreezeFrames = useCallback(() => {
      if (deletedFFStack.length === 0) return;

      const framesToRestore = deletedFFStack.map(d => d.frame);
      const allShapeIdsToRelink = new Map<string, string>(); // shapeId -> freezeFrameId
      deletedFFStack.forEach(d => {
          d.shapeIds.forEach(sId => allShapeIdsToRelink.set(sId, d.frame.id));
      });

      setFreezeFrames(prev => {
          const existingIds = new Set(prev.map(f => f.id));
          const additions = framesToRestore.filter(f => !existingIds.has(f.id));
          return [...prev, ...additions].sort((a, b) => a.timestamp - b.timestamp);
      });

      if (allShapeIdsToRelink.size > 0) {
          setShapes(prev => prev.map(s => {
              const targetFFId = allShapeIdsToRelink.get(s.id);
              if (targetFFId) {
                  return { ...s, freezeFrameId: targetFFId };
              }
              return s;
          }));
      }

      setDeletedFFStack([]);
      setFfExpiryTime(null);
  }, [deletedFFStack]);

  const dismissDeletedFFNotification = useCallback(() => {
      setDeletedFFStack([]);
      setFfExpiryTime(null);
  }, []);

  const deletedFFStackRef = useRef<DeletedFreezeFrameRecord[]>([]);
  deletedFFStackRef.current = deletedFFStack;

  const undoDeleteFreezeFrameRef = useRef<() => void>(() => {});
  undoDeleteFreezeFrameRef.current = undoDeleteFreezeFrame;

  const updateFreezeFrameDuration = (id: string, duration: number) => {
      setFreezeFrames(prev => prev.map(ff => ff.id === id ? { ...ff, duration } : ff));
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      let time = videoRef.current.currentTime;
      const prevTime = lastTimeRef.current;
      
      if (time < prevTime - 0.5) {
          triggeredFreezeFrames.current.clear();
      }
      
      setCurrentTime(time);
      lastTimeRef.current = time;
    }
  };

  // High precision monitor for freeze frames and playlist events
  useEffect(() => {
     let animationFrameId: number;
     let lastPolledTime = videoRef.current ? videoRef.current.currentTime : 0;

     const tick = () => {
         if (isPlaying && videoRef.current) {
             let time = videoRef.current.currentTime;
             
             let ff = undefined;
             if (!exportSettingsRef.current.active || exportSettingsRef.current.withFreezeFrames) {
                 if (time > lastPolledTime && (time - lastPolledTime) < 1.0) {
                     const candidates = freezeFrames.filter(
                         f => f.timestamp > lastPolledTime && f.timestamp <= time + 0.05 && !triggeredFreezeFrames.current.has(f.id)
                     );
                     if (candidates.length > 0) {
                         candidates.sort((a, b) => a.timestamp - b.timestamp);
                         ff = candidates[0];
                     }
                 } else {
                     ff = freezeFrames.find(f => Math.abs(f.timestamp - time) < 0.1 && !triggeredFreezeFrames.current.has(f.id)); 
                 }
             }

             if (ff) {
                 videoRef.current.pause();
                 videoRef.current.currentTime = ff.timestamp;
                 time = ff.timestamp;
                 
                 setCurrentTime(time);
                 setIsPlaying(false);
                 lastTimeRef.current = time;
                 lastPolledTime = time;
                 
                 triggeredFreezeFrames.current.add(ff.id);
                 setActiveFreezeFrameId(ff.id);
                 setCountdownValue(ff.duration);
                 if (countdownInterval.current) {
                     clearInterval(countdownInterval.current);
                     countdownInterval.current = null;
                 }
             } else if (showPlaylistPlaybar || (autoplay.active && autoplay.playlistId) || isPresentationModeRef.current) {
                 const targetPlaylistId = autoplay.playlistId || activePlaylistId;
                 const playlist = playlists.find(p => p.id === targetPlaylistId);
                 if (playlist && playlist.events.length > 0) {
                     const activeIndex = (autoplay.active && autoplay.eventIndex >= 0) 
                         ? autoplay.eventIndex 
                         : playlistPlaybarIndex;
                     const safeIndex = Math.max(0, Math.min(activeIndex, playlist.events.length - 1));
                     const currentItem = playlist.events[safeIndex];
                     const currentEventId = getClipEventId(currentItem);
                     const { event: currentEvent, project: currentClipProj } = findEventAcrossBatch(currentEventId, currentItem);
                     const currentTiming = resolveClipTiming(currentItem, currentEvent);

                     // If current clip is from another project and we haven't switched to it yet:
                     if (currentClipProj && currentClipProj.id !== project.id && batchMode) {
                         if (pendingSeekTimeRef.current === null) {
                             if (videoRef.current) {
                                 videoRef.current.pause();
                             }
                             pendingSeekTimeRef.current = currentTiming.startTime;
                             pendingPlayRef.current = true;
                             batchMode.onSelectProject(currentClipProj.id);
                         }
                         lastPolledTime = time;
                         animationFrameId = requestAnimationFrame(tick);
                         return;
                     }

                     // CLAMP BEFORE: Video must only play within the range of playlist videos, not before
                     if (time < currentTiming.startTime - 0.05) {
                         videoRef.current.currentTime = currentTiming.startTime;
                         time = currentTiming.startTime;
                     }

                     // CLAMP AFTER & ADVANCE: Video must only play within the range of playlist videos, not after
                     if (time >= currentTiming.endTime) {
                         const nextIndex = safeIndex + 1;
                         if (nextIndex < playlist.events.length) {
                             const nextItem = playlist.events[nextIndex];
                             const nextEventId = getClipEventId(nextItem);
                             const { event: nextEvent, project: nextClipProj } = findEventAcrossBatch(nextEventId, nextItem);
                             const nextTiming = resolveClipTiming(nextItem, nextEvent);

                             setAutoplay(prev => ({ ...prev, active: true, playlistId: targetPlaylistId, eventIndex: nextIndex }));
                             setPlaylistPlaybarIndex(nextIndex);

                             if (nextClipProj && nextClipProj.id !== project.id && batchMode) {
                                 // Seamlessly transition to the match tab of the next clip!
                                 if (videoRef.current) {
                                     videoRef.current.pause();
                                 }
                                 pendingSeekTimeRef.current = nextTiming.startTime;
                                 pendingPlayRef.current = true;
                                 batchMode.onSelectProject(nextClipProj.id);
                             } else {
                                 videoRef.current.currentTime = nextTiming.startTime;
                                 time = nextTiming.startTime;
                                 if (videoRef.current.paused) videoRef.current.play().catch(e => console.log(e));
                             }
                         } else {
                             // Reached end of current playlist!
                             if (isPresentationModeRef.current) {
                                 const presPlaylists = presentationPlaylistsRef.current;
                                 const curPlIndex = presPlaylists.findIndex(p => p.id === targetPlaylistId);
                                 const presConfig = presentationConfigRef.current;

                                 if (curPlIndex !== -1 && curPlIndex + 1 < presPlaylists.length) {
                                     const nextPl = presPlaylists[curPlIndex + 1];
                                     setPresentationPlaylistIndex(curPlIndex + 1);
                                     setActivePlaylistId(nextPl.id);
                                     setAutoplay({ active: true, playlistId: nextPl.id, eventIndex: 0 });
                                     setPlaylistPlaybarIndex(0);

                                     setPresentationTransitionMsg(`Now Playing: ${nextPl.name}`);
                                     setTimeout(() => setPresentationTransitionMsg(null), 2500);

                                     if (nextPl.events.length > 0) {
                                         const firstItem = nextPl.events[0];
                                         const firstEventId = getClipEventId(firstItem);
                                         const { event: firstEvent, project: firstClipProj } = findEventAcrossBatch(firstEventId, firstItem);
                                         const firstTiming = resolveClipTiming(firstItem, firstEvent);

                                         if (firstClipProj && firstClipProj.id !== project.id && batchMode) {
                                             if (videoRef.current) videoRef.current.pause();
                                             pendingSeekTimeRef.current = firstTiming.startTime;
                                             pendingPlayRef.current = !presConfig.pauseBetweenPlaylists;
                                             batchMode.onSelectProject(firstClipProj.id);
                                         } else {
                                             videoRef.current.currentTime = firstTiming.startTime;
                                             time = firstTiming.startTime;
                                             if (presConfig.pauseBetweenPlaylists) {
                                                 videoRef.current.pause();
                                                 setIsPlaying(false);
                                             } else if (videoRef.current.paused) {
                                                 videoRef.current.play().catch(e => console.log(e));
                                             }
                                         }
                                     }
                                     return;
                                 } else if (curPlIndex !== -1 && presConfig.loop && presPlaylists.length > 0) {
                                     // Loop back to beginning!
                                     const firstPl = presPlaylists[0];
                                     setPresentationPlaylistIndex(0);
                                     setActivePlaylistId(firstPl.id);
                                     setAutoplay({ active: true, playlistId: firstPl.id, eventIndex: 0 });
                                     setPlaylistPlaybarIndex(0);

                                     setPresentationTransitionMsg(`Looping: ${firstPl.name}`);
                                     setTimeout(() => setPresentationTransitionMsg(null), 2500);

                                     if (firstPl.events.length > 0) {
                                         const firstItem = firstPl.events[0];
                                         const firstEventId = getClipEventId(firstItem);
                                         const { event: firstEvent, project: firstClipProj } = findEventAcrossBatch(firstEventId, firstItem);
                                         const firstTiming = resolveClipTiming(firstItem, firstEvent);

                                         if (firstClipProj && firstClipProj.id !== project.id && batchMode) {
                                             if (videoRef.current) videoRef.current.pause();
                                             pendingSeekTimeRef.current = firstTiming.startTime;
                                             pendingPlayRef.current = true;
                                             batchMode.onSelectProject(firstClipProj.id);
                                         } else {
                                             videoRef.current.currentTime = firstTiming.startTime;
                                             time = firstTiming.startTime;
                                             if (videoRef.current.paused) videoRef.current.play().catch(e => console.log(e));
                                         }
                                     }
                                     return;
                                 } else {
                                     // Reached end of entire presentation!
                                     setPresentationFinished(true);
                                     videoRef.current.pause();
                                     videoRef.current.currentTime = currentTiming.endTime;
                                     setIsPlaying(false);
                                     if (autoplay.active) {
                                         setAutoplay({ active: false, playlistId: null, eventIndex: -1 });
                                     }
                                 }
                             } else {
                                 // Reached end of playlist videos: stop immediately, do not play after!
                                 videoRef.current.pause();
                                 videoRef.current.currentTime = currentTiming.endTime;
                                 setIsPlaying(false);
                                 if (autoplay.active) {
                                     setAutoplay({ active: false, playlistId: null, eventIndex: -1 });
                                 }

                                 if (exportSettingsRef.current.active) {
                                     stopRecording();
                                     exportSettingsRef.current = { active: false, playlistId: null, withFreezeFrames: true };
                                 }
                             }
                         }
                     }
                 }
             } else if (playbarEventId && selectedEventIds.size === 1 && !isMultiSelectAction) {
                 const trimmingEvt = tagEvents.find(e => e.id === playbarEventId);
                 if (trimmingEvt) {
                     if (time < trimmingEvt.startTime - 0.05) {
                         videoRef.current.currentTime = trimmingEvt.startTime;
                         time = trimmingEvt.startTime;
                     } else if (time >= trimmingEvt.endTime) {
                         videoRef.current.pause();
                         videoRef.current.currentTime = trimmingEvt.endTime;
                         setIsPlaying(false);
                     }
                 }
             }
             
             lastPolledTime = time;
         }
         animationFrameId = requestAnimationFrame(tick);
     };

     if (isPlaying) {
         animationFrameId = requestAnimationFrame(tick);
     }

     return () => {
         if (animationFrameId) cancelAnimationFrame(animationFrameId);
     };
  }, [isPlaying, freezeFrames, autoplay, playlists, showPlaylistPlaybar, playlistPlaybarIndex, activePlaylistId, tagEvents, playbarEventId, selectedEventIds, isMultiSelectAction, project.id, batchMode]);

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      videoRef.current.playbackRate = playbackRate;
      videoRef.current.muted = isMuted;

      if (pendingSeekTimeRef.current !== null) {
          const seekTo = pendingSeekTimeRef.current;
          pendingSeekTimeRef.current = null;
          videoRef.current.currentTime = seekTo;
          setCurrentTime(seekTo);
          if (pendingPlayRef.current || isPlaying || autoplay.active) {
              pendingPlayRef.current = false;
              setIsPlaying(true);
              videoRef.current.play().catch(e => console.log("Video resume error:", e));
          }
      }
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = parseFloat(e.target.value);
    handleManualSeek(time);
    setMaskCache({ foreground: null, overlay: null, timestamp: -1, processedAt: 0 });
  };

  const calculateTimeFromMouse = useCallback((e: MouseEvent | React.MouseEvent, container: HTMLElement) => {
      const rect = container.getBoundingClientRect();
      const scrollLeft = container.scrollLeft;
      const clickX = e.clientX - rect.left;
      const totalClickX = scrollLeft + clickX;
      let percentage = totalClickX / container.scrollWidth;
      percentage = Math.max(0, Math.min(1, percentage));
      return percentage * (duration || 0);
  }, [duration]);

  const handleScrubStart = (e: React.MouseEvent) => {
      const target = (e.currentTarget as HTMLElement).closest('.overflow-auto, .overflow-hidden') as HTMLDivElement;
      if (!target) return;
      setIsScrubbing(true);
      const time = calculateTimeFromMouse(e, target);
      handleManualSeek(time);
      setMaskCache({ foreground: null, overlay: null, timestamp: -1, processedAt: 0 });
  };

  const handleScrubMove = useCallback((e: MouseEvent) => {
      if (!isScrubbing) return;
      // Use whichever container is visible
      const container = expandedTimelineContainerRef.current || timelineContainerRef.current;
      if (!container) return;
      const time = calculateTimeFromMouse(e, container);
      handleManualSeek(time);
  }, [isScrubbing, calculateTimeFromMouse, handleManualSeek]);

  const handleScrubEnd = useCallback(() => {
      setIsScrubbing(false);
  }, []);

  useEffect(() => {
      if (isScrubbing) {
          window.addEventListener('mousemove', handleScrubMove);
          window.addEventListener('mouseup', handleScrubEnd);
          return () => {
              window.removeEventListener('mousemove', handleScrubMove);
              window.removeEventListener('mouseup', handleScrubEnd);
          };
      }
  }, [isScrubbing, handleScrubMove, handleScrubEnd]);

  // ... (Playlist, Tagging, Marker, Drawing logic - same as before)
  const savePlaylist = () => {
      if (!playlistModal) return;
      if (playlistModal.mode === 'create') {
          const newId = Date.now().toString();
          setPlaylists(prev => [...prev, { id: newId, name: playlistModal.tempName || 'New Playlist', events: [] }]);
          setActivePlaylistId(newId);
      } else if (playlistModal.mode === 'edit' && playlistModal.playlistId) {
          setPlaylists(prev => prev.map(p => p.id === playlistModal.playlistId ? { ...p, name: playlistModal.tempName } : p));
      }
      setPlaylistModal(null);
  };

  const confirmDeletePlaylist = () => {
      if (playlistDeleteId) {
          setPlaylists(prev => prev.filter(p => p.id !== playlistDeleteId));
          if (activePlaylistId === playlistDeleteId) {
              setActivePlaylistId(playlists.find(p => p.id !== playlistDeleteId)?.id || '');
          }
          setPlaylistDeleteId(null);
      }
  };

  const removeEventFromPlaylist = (playlistId: string, eventIndex: number) => {
      setPlaylists(prev => prev.map(p => {
          if (p.id === playlistId) {
              const newEvents = [...p.events];
              newEvents.splice(eventIndex, 1);
              return { ...p, events: newEvents };
          }
          return p;
      }));
  };

  const duplicatePlaylistEvent = (playlistId: string, eventIndex: number) => {
      let playlistName = '';
      setPlaylists(prev => prev.map(p => {
          if (p.id === playlistId) {
              const newEvents = [...p.events];
              const item = newEvents[eventIndex];
              if (item) {
                  const cloned = typeof item === 'object' 
                      ? { ...item, instanceId: `${item.eventId}-${Date.now()}` } 
                      : item;
                  newEvents.splice(eventIndex + 1, 0, cloned);
                  playlistName = p.name;
                  return { ...p, events: newEvents };
              }
          }
          return p;
      }));
      showNotification(`Duplicated clip in "${playlistName || 'Playlist'}"`, '#c6ff1f');
  };

  const handleUpdatePlaylistClipTrim = (playlistId: string, clipIndex: number, newStart: number, newEnd: number) => {
      setPlaylists(prev => prev.map(p => {
          if (p.id === playlistId) {
              const newEvents = [...p.events];
              const currentItem = newEvents[clipIndex];
              if (currentItem) {
                  newEvents[clipIndex] = updateClipTrim(currentItem, newStart, newEnd);
                  return { ...p, events: newEvents };
              }
          }
          return p;
      }));
      showNotification("Trimmed clip for playlist (master event unaffected)", "#c6ff1f");
  };

  const handleResetPlaylistClipTrim = (playlistId: string, clipIndex: number) => {
      setPlaylists(prev => prev.map(p => {
          if (p.id === playlistId) {
              const newEvents = [...p.events];
              const currentItem = newEvents[clipIndex];
              if (currentItem) {
                  newEvents[clipIndex] = resetClipTrim(currentItem);
                  return { ...p, events: newEvents };
              }
          }
          return p;
      }));
      showNotification("Reset clip to original master event duration", "#c6ff1f");
  };

  const reorderPlaylistEvents = (playlistId: string, fromIndex: number, toIndex: number) => {
      setPlaylists(prev => prev.map(p => {
          if (p.id === playlistId) {
              const newEvents = [...p.events];
              const [moved] = newEvents.splice(fromIndex, 1);
              newEvents.splice(toIndex, 0, moved);
              return { ...p, events: newEvents };
          }
          return p;
      }));
  };

  const startRecordExport = async (playlistId?: string, options?: { withFreezeFrames?: boolean; customFileName?: string }) => {
      const targetPlaylistId = playlistId || activePlaylistId;
      const playlist = playlists.find(p => p.id === targetPlaylistId);
      if (!playlist || playlist.events.length === 0) {
          showNotification("No clips found in playlist to record export.", "#ef4444");
          return;
      }

      const withFreezeFrames = options?.withFreezeFrames !== undefined ? options.withFreezeFrames : true;
      const cleanName = (options?.customFileName || playlist.name || `${project.name}-playlist`).replace(/[^\w\s-]/gi, '').trim();
      recordingCustomNameRef.current = cleanName || 'playlist-record-export';

      if (isScreenRecording) {
          stopRecording();
      }
      if (videoRef.current && !videoRef.current.paused) {
          videoRef.current.pause();
          setIsPlaying(false);
      }

      exportSettingsRef.current = { active: true, playlistId: targetPlaylistId, withFreezeFrames, customFileName: cleanName };
      triggeredFreezeFrames.current.clear();
      
      const firstItem = playlist.events[0];
      const { event: firstEvent, project: firstProj } = findEventAcrossBatch(getClipEventId(firstItem), firstItem);
      const firstTiming = resolveClipTiming(firstItem, firstEvent);

      setPlaylistPlaybarIndex(0);
      setShowPlaylistPlaybar(true);
      setAutoplay({ active: true, playlistId: targetPlaylistId, eventIndex: 0 });

      if (firstProj && firstProj.id !== project.id && batchMode) {
          pendingSeekTimeRef.current = firstTiming.startTime;
          pendingPlayRef.current = false;
          batchMode.onSelectProject(firstProj.id);
      } else if (videoRef.current) {
          videoRef.current.currentTime = firstTiming.startTime;
          setCurrentTime(firstTiming.startTime);
      }

      showNotification(`🔴 Initializing Record Export for "${playlist.name}" from ${formatTime(firstTiming.startTime)}...`, '#c6ff1f');

      setTimeout(async () => {
          if (!mediaRecorderRef.current || mediaRecorderRef.current.state !== 'recording') {
              try {
                  await toggleScreenRecording();
              } catch(e) {
                  console.error("Export recorder start error", e);
                  showNotification("Failed to start canvas recorder", "#ef4444");
                  exportSettingsRef.current = { active: false, playlistId: null, withFreezeFrames: true };
                  return;
              }
          }
          if (videoRef.current) {
              videoRef.current.currentTime = firstTiming.startTime;
              setCurrentTime(firstTiming.startTime);
              videoRef.current.play().catch(e => console.log("Record export playback play error:", e));
              setIsPlaying(true);
          }
          showNotification(`🔴 Record Export running: recording "${playlist.name}" to end... (Auto-stops on finish)`, '#c6ff1f');
      }, 400);
  };

  const exportPlaylistVideo = async (playlistId: string, withFreezeFrames: boolean) => {
      const playlist = playlists.find(p => p.id === playlistId);
      if (!playlist || playlist.events.length === 0) return;

      try {
          const { clips, missingProjectNames } = await buildPlaylistExportItems({
              playlist,
              currentProject: project,
              allBatchProjects: batchMode?.allBatchProjects,
              projectBlobs: batchMode?.projectBlobs,
              currentBlobUrl: videoUrl,
              maskSettings,
              options: {
                  resolution: 'original',
                  mode: 'auto',
                  withFreezeFrames,
                  preserveAudio: true,
                  maskSettings
              }
          });

          if (missingProjectNames.length > 0) {
              showNotification(`Warning: missing video for ${missingProjectNames.join(', ')}`, '#ff9900');
          }

          if (clips.length > 0) {
              setExportModalState({
                  isOpen: true,
                  title: playlist.name || 'Playlist Export',
                  clips,
                  defaultWithFreezeFrames: withFreezeFrames,
                  defaultMaskSettings: maskSettings
              });
              return;
          }
      } catch (err) {
          console.warn('Advanced export build failed, falling back to Record Export:', err);
      }

      startRecordExport(playlistId, { withFreezeFrames });
  };

  const startPlaylistAutoplay = (playlistId: string) => {
      const playlist = playlists.find(p => p.id === playlistId);
      if (playlist && playlist.events.length > 0) {
          setShowPlaylistPlaybar(true);
          handlePlaylistClipSelect(0, undefined, true);
      }
  };

  
  const executeConnectors = (
      sourceId: string, 
      currentActiveRecs: ActiveRecording[], 
      newEvents: TagEvent[], 
      createdEventId: string | null,
      isActivation: boolean,
      options?: { ignoreLeadLag?: boolean }
  ) => {
      let nextActiveRecs = currentActiveRecs.map(r => ({ ...r, labelIds: r.labelIds ? [...r.labelIds] : [] }));
      const additionalEvents: TagEvent[] = [];
      const newlySelectedEventIds = new Set<string>();
      let playbarEvtId: string | null = null;
      let notification: string | null = null;
      
      const sourceConnectors = connectors.filter(c => c.sourceId === sourceId && c.enabled);
      const targetConnectors = connectors.filter(c => c.targetId === sourceId && c.enabled);

      if (isActivation) {
          // Process connectors where this item is the SOURCE
          for (const conn of sourceConnectors) {
              const targetIsTag = tags.some(t => t.id === conn.targetId);
              const targetIsLabel = labels.some(l => l.id === conn.targetId);
              
              if (conn.type === 'exclusive') {
                  if (targetIsTag) {
                      const recIdx = nextActiveRecs.findIndex(r => r.tagId === conn.targetId);
                      if (recIdx >= 0) {
                          const targetRec = nextActiveRecs[recIdx];
                          let start = targetRec.startTime;
                          let end = currentTime;
                          if (start > end) { [start, end] = [end, start]; }
                          if (isValidEvent(start, end)) {
                              additionalEvents.push({
                                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                  tagId: targetRec.tagId,
                                  startTime: start,
                                  endTime: end,
                                  labelIds: targetRec.labelIds
                              });
                          }
                          nextActiveRecs.splice(recIdx, 1);
                      }
                  } else if (targetIsLabel) {
                      nextActiveRecs.forEach(r => {
                          if (r.labelIds?.includes(conn.targetId)) {
                              r.labelIds = r.labelIds.filter(id => id !== conn.targetId);
                          }
                      });
                  }
              } 
              else if (conn.type === 'trigger') {
                  if (targetIsTag) {
                      const targetTag = tags.find(t => t.id === conn.targetId);
                      if (targetTag) {
                          const targetShouldLeadLag = !options?.ignoreLeadLag && Boolean(targetTag.leadLagEnabled);
                          if (targetShouldLeadLag) {
                              const pre = targetTag.preTime ?? 10;
                              const post = targetTag.postTime ?? 10;
                              const start = Math.max(0, currentTime - pre);
                              const end = Math.min(duration, currentTime + post);
                              if (isValidEvent(start, end)) {
                                  const evId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                                  additionalEvents.push({
                                      id: evId,
                                      tagId: targetTag.id,
                                      startTime: start,
                                      endTime: end,
                                      notes: ''
                                  });
                                  notification = `Triggered: ${targetTag.name}`;
                              }
                          } else {
                              if (!nextActiveRecs.some(r => r.tagId === targetTag.id)) {
                                  nextActiveRecs.push({ tagId: targetTag.id, startTime: currentTime, labelIds: [] });
                                  notification = `Triggered: ${targetTag.name}`;
                              }
                          }
                      }
                  }
              }
              else if (conn.type === 'assign') {
                  if (targetIsLabel) {
                      if (createdEventId) {
                          const targetEv = newEvents.find(e => e.id === createdEventId) || additionalEvents.find(e => e.id === createdEventId);
                          if (targetEv) {
                              targetEv.labelIds = [...(targetEv.labelIds || []), conn.targetId];
                          }
                      } else {
                          const matchingRec = nextActiveRecs.find(r => r.tagId === sourceId);
                          if (matchingRec) {
                              if (!matchingRec.labelIds) matchingRec.labelIds = [];
                              if (!matchingRec.labelIds.includes(conn.targetId)) {
                                  matchingRec.labelIds.push(conn.targetId);
                              }
                          } else {
                              nextActiveRecs.forEach(r => {
                                  if (!r.labelIds) r.labelIds = [];
                                  if (!r.labelIds.includes(conn.targetId)) {
                                      r.labelIds.push(conn.targetId);
                                  }
                              });
                          }
                      }
                  }
              }
          }

          // Process connectors where this item is the TARGET
          for (const conn of targetConnectors) {
              const sourceIsTag = tags.some(t => t.id === conn.sourceId);
              const sourceIsLabel = labels.some(l => l.id === conn.sourceId);
              
              if (conn.type === 'exclusive' || conn.type === 'defuse') {
                  if (sourceIsTag) {
                      const recIdx = nextActiveRecs.findIndex(r => r.tagId === conn.sourceId);
                      if (recIdx >= 0) {
                          const sourceRec = nextActiveRecs[recIdx];
                          if (conn.type === 'exclusive') {
                              let start = sourceRec.startTime;
                              let end = currentTime;
                              if (start > end) { [start, end] = [end, start]; }
                              if (isValidEvent(start, end)) {
                                  additionalEvents.push({
                                      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                      tagId: sourceRec.tagId,
                                      startTime: start,
                                      endTime: end,
                                      labelIds: sourceRec.labelIds
                                  });
                              }
                          }
                          nextActiveRecs.splice(recIdx, 1);
                      }
                  } else if (sourceIsLabel) {
                      nextActiveRecs.forEach(r => {
                          if (r.labelIds?.includes(conn.sourceId)) {
                              r.labelIds = r.labelIds.filter(id => id !== conn.sourceId);
                          }
                      });
                  }
              }
          }
      } else {
          // Deactivation
          for (const conn of sourceConnectors) {
              const targetIsTag = tags.some(t => t.id === conn.targetId);
              if (conn.type === 'trigger') {
                  if (targetIsTag) {
                      const recIdx = nextActiveRecs.findIndex(r => r.tagId === conn.targetId);
                      if (recIdx >= 0) {
                          const targetRec = nextActiveRecs[recIdx];
                          let start = targetRec.startTime;
                          let end = currentTime;
                          if (start > end) { [start, end] = [end, start]; }
                          if (isValidEvent(start, end)) {
                              additionalEvents.push({
                                  id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                  tagId: targetRec.tagId,
                                  startTime: start,
                                  endTime: end,
                                  labelIds: targetRec.labelIds
                              });
                          }
                          nextActiveRecs.splice(recIdx, 1);
                      }
                  }
              }
          }
      }
      
      return { nextActiveRecs, additionalEvents, newlySelectedEventIds, playbarEvtId, notification };
  };

  const handleTagClick = (tagId: string, options?: { ignoreLeadLag?: boolean }) => {
      const tag = tags.find(t => t.id === tagId);
      if (!tag) return;

      if (isLive) {
          setLastTagActionTimestamp(Date.now());
      }

      if (isTaggingMode) {
          let newEvents: TagEvent[] = [];
          let currentActiveRecs = activeRecordings.map(r => ({ ...r, labelIds: r.labelIds ? [...r.labelIds] : [] }));
          let createdEventId: string | null = null;
          let newlySelectedEventIds = new Set<string>();
          let playbarEvtId: string | null = null;
          let notification: {text: string, color: string} | null = null;
          let isActivation = false;

          // Process the actual click
          const useLeadLag = !options?.ignoreLeadLag && Boolean(tag.leadLagEnabled);
          const currentLiveMatchSec = isLive ? (liveClock.getMatchClockDetails().matchTimeSeconds ?? currentTime) : undefined;

          if (useLeadLag) {
              const pre = tag.preTime ?? 10;
              const post = tag.postTime ?? 10;
              const start = Math.max(0, currentTime - pre);
              const end = Math.min(duration, currentTime + post);
              
              if (isValidEvent(start, end)) {
                  createdEventId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                  const mStart = isLive && currentLiveMatchSec !== undefined ? Math.max(0, currentLiveMatchSec - pre) : undefined;
                  const mEnd = isLive && currentLiveMatchSec !== undefined ? currentLiveMatchSec + post : undefined;
                  newEvents.push({
                      id: createdEventId,
                      tagId: tagId,
                      startTime: start,
                      endTime: end,
                      notes: '',
                      periodId: isLive ? (liveClock.matchPeriod || '1st-half') : undefined,
                      matchStart: mStart,
                      matchEnd: mEnd
                  });
                  notification = { text: `Saved: ${tag.name}`, color: tag.color || '#fff' };
                  isActivation = true;
              } else {
                  showNotification('Invalid event duration', '#ef4444');
                  return;
              }
          } else {
              // Normal manual tagging workflow:
              // First click -> tagging starts for this tag
              // Second click -> tagged event saves for this tag
              // User can start multiple events concurrently without one stopping another!
              const existingRecIndex = currentActiveRecs.findIndex(r => r.tagId === tagId);
              
              if (existingRecIndex >= 0) {
                  // Second click on this tag: stopping and saving this event
                  const existingRec = currentActiveRecs[existingRecIndex];
                  let start = existingRec.startTime;
                  let end = currentTime;
                  if (start > end) { [start, end] = [end, start]; }
                  
                  if (!isValidEvent(start, end)) {
                      showNotification('Invalid event duration', '#ef4444');
                  } else {
                      const newEventId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                      let mStart = existingRec.matchStartTime;
                      let mEnd = currentLiveMatchSec;
                      if (mStart !== undefined && mEnd !== undefined && mStart > mEnd) {
                          [mStart, mEnd] = [mEnd, mStart];
                      }
                      newEvents.push({
                          id: newEventId,
                          tagId: tagId,
                          startTime: start,
                          endTime: end,
                          labelIds: existingRec.labelIds || [],
                          periodId: isLive ? (liveClock.matchPeriod || '1st-half') : undefined,
                          matchStart: mStart,
                          matchEnd: mEnd
                      });
                      notification = { text: `Saved: ${tag.name}`, color: tag.color || '#fff' };
                  }
                  currentActiveRecs.splice(existingRecIndex, 1);
                  isActivation = false; // Finished recording
              } else {
                  // First click on this tag: start new recording for this tag
                  // Any existing active recordings continue running!
                  currentActiveRecs.push({ 
                      tagId, 
                      startTime: currentTime, 
                      labelIds: [],
                      matchStartTime: currentLiveMatchSec
                  });
                  notification = { text: `Started: ${tag.name}`, color: tag.color || '#fff' };
                  isActivation = true; // Started recording
              }
          }

          // Process Connectors
          let finalActiveRecs = currentActiveRecs;
          const res = executeConnectors(tagId, currentActiveRecs, newEvents, createdEventId, isActivation, options);
          finalActiveRecs = res.nextActiveRecs;
          newEvents = [...newEvents, ...res.additionalEvents];
          for (const id of res.newlySelectedEventIds) newlySelectedEventIds.add(id);
          if (res.playbarEvtId) playbarEvtId = res.playbarEvtId;
          if (res.notification) notification = { text: res.notification, color: '#c6ff1f' };

          // Apply state updates
          if (newEvents.length > 0) {
              setTagEvents(prev => [...prev, ...newEvents]);
          }
          setActiveRecordings(finalActiveRecs);
          if (newlySelectedEventIds.size > 0) {
              setSelectedEventIds(newlySelectedEventIds);
          } else if (newEvents.length > 0 && !createdEventId && finalActiveRecs.length === 0) {
              setSelectedEventIds(new Set());
          }
          if (playbarEvtId !== null) {
              setPlaybarEventId(playbarEvtId);
          } else if (finalActiveRecs.length === 0) {
              setPlaybarEventId(null);
          }
          if (notification) {
              showNotification(notification.text, notification.color);
          }

      } else {
          setFilterTagId(current => current === tagId ? null : tagId);
      }
  };


const cancelRecording = useCallback(() => {
      setActiveRecordings([]);
  }, []);

  const addEventsToPlaylist = useCallback((eventIds: string[], targetPlaylistId?: string, forceAllowDuplicates: boolean = false) => {
    if (!eventIds || eventIds.length === 0) {
      showNotification('No events selected to add to playlist', '#f59e0b');
      return;
    }

    let plId = targetPlaylistId || activePlaylistId;
    let target = playlists.find(p => p.id === plId);
    
    if (!target && playlists.length > 0) {
      target = playlists[0];
      plId = target.id;
      setActivePlaylistId(plId);
    }

    if (!target) {
      const newId = Date.now().toString();
      target = { id: newId, name: 'Highlights', events: [] };
      plId = newId;
      setPlaylists([target]);
      setActivePlaylistId(newId);
    }

    const playlistName = target.name;
    let addedCount = 0;
    let skippedDuplicatesCount = 0;

    const formatClipItem = (eventId: string): PlaylistItem => {
      if (batchMode) {
        return {
          instanceId: Date.now().toString() + Math.random().toString(36).substr(2, 5),
          eventId,
          projectId: project.id,
          projectName: project.name,
        };
      }
      return eventId;
    };

    setPlaylists(prev => {
      const exists = prev.some(p => p.id === plId);
      const list = exists ? prev : [...prev, target!];
      const nextPlaylists = list.map(p => {
        if (p.id === plId) {
          if (forceAllowDuplicates) {
            addedCount = eventIds.length;
            const newClips = eventIds.map(formatClipItem);
            return { ...p, events: [...p.events, ...newClips] };
          } else {
            const currentSet = new Set(p.events.map(item => getClipEventId(item)));
            const newUniqueEvents = eventIds.filter(id => !currentSet.has(id));
            addedCount = newUniqueEvents.length;
            skippedDuplicatesCount = eventIds.length - newUniqueEvents.length;
            if (newUniqueEvents.length === 0) {
              return p;
            }
            const newUniqueClips = newUniqueEvents.map(formatClipItem);
            return { ...p, events: [...p.events, ...newUniqueClips] };
          }
        }
        return p;
      });

      if (batchMode) {
        batchMode.onUpdateBatch({
          ...batchMode.batch,
          playlists: nextPlaylists,
          lastModified: Date.now()
        });
      }

      return nextPlaylists;
    });

    if (forceAllowDuplicates) {
      showNotification(`Added ${eventIds.length} event${eventIds.length > 1 ? 's' : ''} (including duplicates) to "${playlistName}"`, '#c6ff1f');
    } else if (addedCount > 0 && skippedDuplicatesCount === 0) {
      showNotification(`Added ${addedCount} event${addedCount > 1 ? 's' : ''} to "${playlistName}"`, '#c6ff1f');
    } else if (addedCount > 0 && skippedDuplicatesCount > 0) {
      showNotification(
        `Added ${addedCount} event${addedCount > 1 ? 's' : ''} (${skippedDuplicatesCount} duplicate${skippedDuplicatesCount > 1 ? 's' : ''} skipped)`,
        '#c6ff1f',
        undefined,
        {
          label: `+ Add ${skippedDuplicatesCount > 1 ? `${skippedDuplicatesCount} Duplicates` : 'Duplicate'}`,
          onClick: () => addEventsToPlaylist(eventIds, plId, true)
        }
      );
    } else {
      showNotification(
        `Selected event${eventIds.length > 1 ? 's are' : ' is'} already in "${playlistName}"`,
        '#3b82f6',
        undefined,
        {
          label: eventIds.length > 1 ? 'Add Duplicates Anyway' : 'Add Duplicate Anyway',
          onClick: () => addEventsToPlaylist(eventIds, plId, true)
        }
      );
    }

    const btn = document.getElementById('save-playlist-btn');
    if (btn) {
      btn.classList.add('bg-green-500');
      setTimeout(() => btn.classList.remove('bg-green-500'), 500);
    }
  }, [playlists, activePlaylistId, showNotification]);

  const addSelectedToPlaylist = useCallback((targetPlaylistId?: string, forceAllowDuplicates: boolean = false) => {
    let ids: string[] = [];
    if (selectedEventIds.size > 0) {
      ids = Array.from(selectedEventIds);
    } else if (selectedEventLogs.size > 0) {
      ids = Array.from(selectedEventLogs);
    } else if (playbarEventId) {
      ids = [playbarEventId];
    } else {
      // Check if there is an event under the playhead at currentTime
      const currentEvt = tagEvents.find(e => currentTime >= e.startTime && currentTime <= e.endTime);
      if (currentEvt) {
        ids = [currentEvt.id];
        setSelectedEventIds(new Set([currentEvt.id]));
        setSelectedEventLogs(new Set([currentEvt.id]));
      }
    }

    if (ids.length === 0) {
      showNotification('No events selected. Click an event on the timeline or in the Events tab to select it.', '#f59e0b');
      return;
    }

    addEventsToPlaylist(ids, targetPlaylistId, forceAllowDuplicates);
  }, [selectedEventIds, selectedEventLogs, playbarEventId, tagEvents, currentTime, showNotification, addEventsToPlaylist]);

  const handleEventContextMenu = (e: React.MouseEvent, eventId: string) => {
    e.preventDefault();
    e.stopPropagation();
    const menuHeight = 80;
    const windowHeight = window.innerHeight;
    let y = e.clientY;
    if (y + menuHeight > windowHeight) {
        y = windowHeight - menuHeight - 10;
    }
    setContextMenu({ x: e.clientX, y: y, eventId });
  };

  const handleEditEvent = () => {
      if (!contextMenu) return;
      const evt = tagEvents.find(e => e.id === contextMenu.eventId);
      if (evt) {
          setEditEventModal({ 
              isOpen: true, 
              eventId: evt.id, 
              startTime: evt.startTime, 
              endTime: evt.endTime,
              notes: evt.notes || '' 
          });
      }
      setContextMenu(null);
  };

  const [confirmUnsavedModal, setConfirmUnsavedModal] = useState<boolean>(false);

  const requestCloseEditEventModal = () => {
      if (!editEventModal) return;
      const originalEvent = tagEvents.find(e => e.id === editEventModal.eventId);
      if (originalEvent && (originalEvent.notes !== editEventModal.notes || originalEvent.startTime !== editEventModal.startTime || originalEvent.endTime !== editEventModal.endTime)) {
          setConfirmUnsavedModal(true);
      } else {
          setEditEventModal(null);
      }
  };

  const saveEditedEvent = () => {
      if (!editEventModal) return;
      let start = editEventModal.startTime;
      let end = editEventModal.endTime;
      if (start > end) {
          const temp = start;
          start = end;
          end = temp;
      }
      if (!isValidEvent(start, end)) {
          showNotification('Invalid event duration', '#ef4444');
          return;
      }

      setTagEvents(prev => prev.map(e => {
          if (e.id === editEventModal.eventId) {
              return {
                  ...e,
                  startTime: start,
                  endTime: end,
                  notes: editEventModal.notes
              };
          }
          return e;
      }));
      setEditEventModal(null);
      setConfirmUnsavedModal(false);
  };

  const deleteTag = (tagId: string) => {
      setTagDeleteConfirmation(tagId);
  };

  const confirmDeleteTag = () => {
      if (tagDeleteConfirmation) {
          const tagId = tagDeleteConfirmation;
          setTags(prev => prev.filter(t => t.id !== tagId));
          setTagEvents(prev => prev.filter(e => e.tagId !== tagId));
          const deletedEventIds = tagEvents.filter(e => e.tagId === tagId).map(e => e.id);
          if (deletedEventIds.length > 0) {
              setPlaylists(prev => prev.map(p => ({
                  ...p,
                  events: p.events.filter(item => !deletedEventIds.includes(getClipEventId(item)))
              })));
          }
          setTagDeleteConfirmation(null);
      }
  };

  const handleDeleteEventRequest = () => {
      if (contextMenu) {
        setDeleteConfirmation(contextMenu.eventId);
        setContextMenu(null);
      } else if (editEventModal) {
        setDeleteConfirmation(editEventModal.eventId);
        setEditEventModal(null);
      }
  };

  const confirmDeleteEvent = () => {
      if (deleteConfirmation) {
          setTagEvents(prev => prev.filter(e => e.id !== deleteConfirmation));
          setPlaylists(prev => prev.map(p => ({
              ...p,
              events: p.events.filter(item => getClipEventId(item) !== deleteConfirmation)
          })));
          setDeleteConfirmation(null);
          
          if (selectedEventIds.has(deleteConfirmation)) {
              const newSet = new Set(selectedEventIds);
              newSet.delete(deleteConfirmation);
              setSelectedEventIds(newSet);
          }
          if (playbarEventId === deleteConfirmation) {
              setPlaybarEventId(null);
          }
      }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement)?.isContentEditable) return;
      const isCtrlOrMeta = e.ctrlKey || e.metaKey;

      // Priority 1: Ctrl+S / Cmd+S - Add selected events to playlist (Shift+Ctrl+S forces duplicates)
      if (isCtrlOrMeta && (e.code === 'KeyS' || e.key.toLowerCase() === 's')) {
          e.preventDefault();
          e.stopPropagation();
          addSelectedToPlaylist(undefined, e.shiftKey);
          return;
      }

      // Priority 2: Ctrl+A / Cmd+A - Select all visible events
      if (isCtrlOrMeta && (e.code === 'KeyA' || e.key.toLowerCase() === 'a') && !e.shiftKey) {
          e.preventDefault();
          e.stopPropagation();
          const visibleEvents = tagEvents.filter(evt => {
              let match = true;
              if (filterTagId && evt.tagId !== filterTagId) match = false;
              if (filterLabelId && (!evt.labelIds || !evt.labelIds.includes(filterLabelId))) match = false;
              return match;
          });
          const allIds = new Set(visibleEvents.map(evt => evt.id));
          setSelectedEventIds(allIds);
          setSelectedEventLogs(allIds);
          setIsMultiSelectAction(true);
          showNotification(`Selected ${visibleEvents.length} event${visibleEvents.length !== 1 ? 's' : ''} (Press Ctrl+S to add to playlist)`, '#c6ff1f');
          return;
      }

      // Single-letter Tag shortcuts: ONLY trigger when no Ctrl/Cmd or Alt modifier is pressed!
      if (!isCtrlOrMeta && !e.altKey) {
          const tag = tags.find(t => t.shortcut && t.shortcut.toLowerCase() === e.key.toLowerCase());
          if (tag) {
              e.preventDefault();
              const ignoreLeadLag = isAdvancedCodingMode && !isPadQuickTagEnabled;
              if (isTaggingMode) {
                  handleTagClick(tag.id, { ignoreLeadLag });
              } else {
                  setIsTaggingMode(true);
                  setTool(null);
                  setSelectedEventIds(new Set());
                  handleTagClick(tag.id, { ignoreLeadLag });
              }
              return;
          }
      }

      if (e.key === 'Escape') {
          if (isTaggingMode) {
              cancelRecording();
              setIsTaggingMode(false);
              return;
          }
          if (selectedEventIds.size > 0 || selectedEventLogs.size > 0 || playbarEventId) {
              setSelectedEventIds(new Set());
              setSelectedEventLogs(new Set());
              setPlaybarEventId(null);
              setIsMultiSelectAction(false);
              return;
          }
      }
      switch (e.code) {
        case 'KeyQ':
          if (e.shiftKey) {
              e.preventDefault();
              setActiveColorId(prevId => {
                  const currentIndex = colors.findIndex(c => c.id === prevId);
                  if (currentIndex === -1) return prevId;
                  const newIndex = currentIndex === 0 ? colors.length - 1 : currentIndex - 1;
                  return colors[newIndex].id;
              });
          }
          break;
        case 'KeyW':
          if (e.shiftKey) {
              e.preventDefault();
              setActiveColorId(prevId => {
                  const currentIndex = colors.findIndex(c => c.id === prevId);
                  if (currentIndex === -1) return prevId;
                  const newIndex = currentIndex === colors.length - 1 ? 0 : currentIndex + 1;
                  return colors[newIndex].id;
              });
          }
          break;
        case 'Space':
          e.preventDefault();
          e.stopPropagation();
          if (editingAnimationFFId) {
              if (videoRef.current && !videoRef.current.paused) {
                  videoRef.current.pause();
              }
              const ff = freezeFrames.find(f => f.id === editingAnimationFFId);
              if (ff) {
                  if (!isAnimationPreviewPlaying && animationPreviewTime >= (ff.duration || 10)) {
                      setAnimationPreviewTime(0);
                  }
                  setIsAnimationPreviewPlaying(prev => !prev);
              }
          } else {
              togglePlay();
          }
          break;
        case 'ArrowLeft':
          e.preventDefault();
          e.stopPropagation();
          if (editingAnimationFFId) {
              setAnimationPreviewTime(prev => Math.max(0, prev - 0.5));
          } else if (videoRef.current) {
              handleManualSeek(Math.max(0, videoRef.current.currentTime - 5));
          }
          break;
        case 'ArrowRight':
          e.preventDefault();
          e.stopPropagation();
          if (editingAnimationFFId) {
              const ff = freezeFrames.find(f => f.id === editingAnimationFFId);
              if (ff) {
                  setAnimationPreviewTime(prev => Math.min(ff.duration || 10, prev + 0.5));
              }
          } else if (videoRef.current) {
              handleManualSeek(Math.min(duration, videoRef.current.currentTime + 5));
          }
          break;
        case 'KeyZ':
          if (isCtrlOrMeta) {
              e.preventDefault();
              if (e.shiftKey) {
                  redo();
              } else if (deletedFFStackRef.current.length > 0) {
                  undoDeleteFreezeFrameRef.current();
              } else {
                  undo();
              }
          }
          break;
        case 'KeyY':
            if (isCtrlOrMeta) {
                e.preventDefault();
                redo();
            }
            break;
        case 'Delete':
        case 'Backspace':
            if (selectedShapeId) {
                e.preventDefault();
                setShapes(prev => prev.filter(s => s.id !== selectedShapeId));
                setSelectedShapeId(null);
                return;
            }
            e.preventDefault();
            if (selectedEventIds.size > 0) {
                 const deleteSet = new Set(selectedEventIds);
                 setTagEvents(prev => prev.filter(e => !deleteSet.has(e.id)));
                 setPlaylists(prev => prev.map(p => ({
                     ...p,
                     events: p.events.filter(item => !deleteSet.has(getClipEventId(item)))
                 })));
                 setSelectedEventIds(new Set());
            } else {
                clearAll();
            }
            break;
        case 'KeyA':
            if (e.shiftKey && !isCtrlOrMeta) {
                e.preventDefault();
                if (tool === 'spotlight') {
                    setSpotlightSettings(prev => ({ ...prev, size: Math.min(prev.size + 5, 150) }));
                } else if (tool === 'lens') {
                    setLensSettings(prev => ({ ...prev, size: Math.min(prev.size + 5, 150) }));
                } else if (tool === 'circle' || tool === 'connected-circle') {
                    setRingSettings(prev => ({ ...prev, size: Math.min(prev.size + 5, 200) }));
                } else if (tool === 'name-tag') {
                    setNameTagSettings(prev => ({ ...prev, size: Math.min(prev.size + 1, 30) }));
                } else if (tool === 'text') {
                    setTextSettings(prev => ({ ...prev, fontSize: Math.min(prev.fontSize + 2, 100) }));
                } else {
                    setToolSize(prev => Math.min(prev + 1, 50));
                }
            } else if (isCtrlOrMeta) {
                e.preventDefault();
                const visibleEvents = tagEvents.filter(evt => {
                    let match = true;
                    if (filterTagId && evt.tagId !== filterTagId) match = false;
                    if (filterLabelId && (!evt.labelIds || !evt.labelIds.includes(filterLabelId))) match = false;
                    return match;
                });
                setSelectedEventIds(new Set(visibleEvents.map(evt => evt.id)));
                setIsMultiSelectAction(true);
            }
            break;
        case 'KeyS':
            if (e.shiftKey && !isCtrlOrMeta) {
                e.preventDefault();
                if (tool === 'spotlight') {
                    setSpotlightSettings(prev => ({ ...prev, size: Math.max(prev.size - 5, 20) }));
                } else if (tool === 'lens') {
                    setLensSettings(prev => ({ ...prev, size: Math.max(prev.size - 5, 40) }));
                } else if (tool === 'circle' || tool === 'connected-circle') {
                    setRingSettings(prev => ({ ...prev, size: Math.max(prev.size - 5, 10) }));
                } else if (tool === 'name-tag') {
                    setNameTagSettings(prev => ({ ...prev, size: Math.max(prev.size - 1, 1) }));
                } else if (tool === 'text') {
                    setTextSettings(prev => ({ ...prev, fontSize: Math.max(prev.fontSize - 2, 8) }));
                } else {
                    setToolSize(prev => Math.max(prev - 1, 1));
                }
            } else if (isCtrlOrMeta) {
                e.preventDefault();
                addSelectedToPlaylist(undefined, e.shiftKey);
            }
            break;
      }
    };
    
    const handleWheel = (e: WheelEvent) => {
        if (e.shiftKey) {
            e.preventDefault();
            setTool(prev => {
                const tools: ToolType[] = ['pen', 'line', 'arrow', 'curved-arrow', 'circle', 'connected-circle', 'spotlight', 'lens', 'player-move', 'name-tag', 'text', 'polygon', 'scanner'];
                const idx = prev ? tools.indexOf(prev) : -1;
                if (e.deltaY > 0) {
                    return tools[(idx + 1) % tools.length];
                } else {
                    return tools[(idx - 1 + tools.length) % tools.length];
                }
            });
        }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('wheel', handleWheel, { passive: false });
    return () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        window.removeEventListener('wheel', handleWheel);
    };
  }, [isPlaying, duration, shapes, redoStack, isTaggingMode, tags, activeRecording, activeRecordings, currentTime, tagEvents, selectedEventIds, selectedEventLogs, activePlaylistId, autoplay, contextMenu, editEventModal, tool, colors, filterTagId, filterLabelId, selectedShapeId, editingAnimationFFId, isAnimationPreviewPlaying, animationPreviewTime, freezeFrames, addSelectedToPlaylist, addEventsToPlaylist, playlists, playbarEventId]); 

  // --- Timeline Markers & Canvas Handlers (Same as before)
  const handleTimelineContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    if (!timelineContainerRef.current || duration === 0) return;
    const container = timelineContainerRef.current;
    const scrollLeft = container.scrollLeft;
    const rect = container.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const totalClickX = scrollLeft + clickX;
    const totalWidth = container.scrollWidth;
    const percentage = Math.max(0, Math.min(1, totalClickX / totalWidth));
    const time = percentage * duration;
    setMarkerModal({ isOpen: true, x: e.clientX, y: e.clientY - 160, mode: 'create', time: time, tempLabel: '', tempColor: '#ef4444' });
  };

  const handleMarkerContextMenu = (e: React.MouseEvent, marker: TimelineMarker) => {
    e.preventDefault();
    e.stopPropagation(); 
    setMarkerModal({ isOpen: true, x: e.clientX, y: e.clientY - 160, mode: 'edit', markerId: marker.id, tempLabel: marker.label, tempColor: marker.color });
  };

  const saveMarker = () => {
    if (!markerModal) return;
    if (markerModal.mode === 'create' && markerModal.time !== undefined) {
        setMarkers(prev => [...prev, { id: Date.now().toString(), time: markerModal.time!, label: markerModal.tempLabel || 'Marker', color: markerModal.tempColor }]);
    } else if (markerModal.mode === 'edit' && markerModal.markerId) {
        setMarkers(prev => prev.map(m => m.id === markerModal.markerId ? { ...m, label: markerModal.tempLabel, color: markerModal.tempColor } : m));
    }
    setMarkerModal(null);
  };

  const deleteMarker = () => {
      if (markerModal?.markerId) {
          setMarkers(prev => prev.filter(m => m.id !== markerModal.markerId));
          setMarkerModal(null);
      }
  };

  const jumpToMarker = (time: number) => {
      handleManualSeek(time);
  };

  const handleEventClick = (e: React.MouseEvent, eventId: string, time: number) => {
    e.stopPropagation();
    handleManualSeek(time);
    if (e.ctrlKey || e.metaKey) {
        setIsMultiSelectAction(true);
        const newSet = new Set(selectedEventIds);
        if (newSet.has(eventId)) newSet.delete(eventId);
        else newSet.add(eventId);
        setSelectedEventIds(newSet);
    } else {
        setIsMultiSelectAction(false);
        if (selectedEventIds.size === 1 && selectedEventIds.has(eventId)) {
            setSelectedEventIds(new Set()); 
            setPlaybarEventId(null);
        } else {
            setSelectedEventIds(new Set([eventId]));
            setPlaybarEventId(eventId);
        }
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
      if ((tool === null || tool === 'move') && selectedEventIds.size > 0 && !isDrawing) {
          setSelectedEventIds(new Set());
          setPlaybarEventId(null);
      }
  };

  const handleEventUpdate = (start: number, end: number) => {
      if (selectedEventIds.size !== 1) return;
      const eventId = Array.from(selectedEventIds)[0];
      setTagEvents(prev => prev.map(e => {
          if (e.id === eventId) return { ...e, startTime: start, endTime: end };
          return e;
      }));
  };

  const handleSidebarResize = useCallback((e: MouseEvent) => {
    if (isResizingSidebar) {
        const newWidth = document.body.clientWidth - e.clientX;
        setSidebarWidth(Math.max(250, Math.min(600, newWidth)));
    }
  }, [isResizingSidebar]);

  const handleSectionResize = useCallback((e: MouseEvent) => {
      if (isResizingSection && sidebarRef.current) {
          const sidebarRect = sidebarRef.current.getBoundingClientRect();
          const relativeY = e.clientY - sidebarRect.top;
          const percentage = (relativeY / sidebarRect.height) * 100;
          setEventSectionHeight(Math.max(10, Math.min(90, percentage)));
      }
  }, [isResizingSection]);

  useEffect(() => {
    if (isResizingSidebar) {
        window.addEventListener('mousemove', handleSidebarResize);
        window.addEventListener('mouseup', () => setIsResizingSidebar(false));
    }
    if (isResizingSection) {
        window.addEventListener('mousemove', handleSectionResize);
        window.addEventListener('mouseup', () => setIsResizingSection(false));
    }
    return () => {
        window.removeEventListener('mousemove', handleSidebarResize);
        window.removeEventListener('mousemove', handleSectionResize);
    };
  }, [isResizingSidebar, isResizingSection, handleSidebarResize, handleSectionResize]);

  // (Masking computation and lifecycle logic is handled by useMasking)

  const captureSprite = (rect: Rect): { sprite: HTMLCanvasElement, patch: HTMLCanvasElement, box: Rect } | null => {
    const video = videoRef.current;
    if (!video) return null;
    const w = Math.ceil(rect.w);
    const h = Math.ceil(rect.h);
    if (w <= 0 || h <= 0) return null;
    let bgX = rect.x + w * 1.5;
    if (bgX + w > video.videoWidth) bgX = rect.x - w * 1.5;
    if (bgX < 0) bgX = 0;
    const bgY = rect.y;
    const cropCanvas = document.createElement('canvas');
    cropCanvas.width = w;
    cropCanvas.height = h;
    const ctx = cropCanvas.getContext('2d');
    const bgCanvas = document.createElement('canvas');
    bgCanvas.width = w;
    bgCanvas.height = h;
    const bgCtx = bgCanvas.getContext('2d');
    if (!ctx || !bgCtx) return null;
    renderMaskedSprite(ctx, video, maskCache.foreground, rect, maskSettings.enabled);
    bgCtx.drawImage(video, bgX, bgY, w, h, 0, 0, w, h);
    return { sprite: cropCanvas, patch: bgCanvas, box: rect };
  };

  const getVideoSpacePoint = (e: React.MouseEvent | MouseEvent): Point => {
    if (!canvasRef.current || !videoRef.current) return { x: 0, y: 0 };
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const dprX = canvas.width / rect.width;
    const dprY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * dprX;
    const y = (e.clientY - rect.top) * dprY;
    const layout = getVideoLayout(canvas, videoRef.current);
    return { x: (x - layout.x) / layout.scale, y: (y - layout.y) / layout.scale };
  };

  const getHitTest = (pt: Point, scale: number) => {
    const activeFF = freezeFrames.find(ff => Math.abs(ff.timestamp - currentTime) < 0.1);
    const visibleShapes = shapes.filter(shape => {
          let isVisible = false;
          if (!shape.freezeFrameId) isVisible = true; 
          else if (editingAnimationFFId === shape.freezeFrameId) { isVisible = true; }
          else if (activeFF && activeFF.id === shape.freezeFrameId && !isPlaying) { isVisible = true; }
          else if (activeFreezeFrameId === shape.freezeFrameId) { isVisible = true; }
          if (!isVisible) return false;
          
          if (shape.freezeFrameId && shape.freezeFrameId === editingAnimationFFId) {
              const activeFFDur = freezeFrames.find(f => f.id === editingAnimationFFId)?.duration ?? 10;
              const elapsed = animationPreviewTime;
              const start = shape.animStart ?? 0;
              const end = shape.animEnd ?? activeFFDur;
              if (elapsed < start || elapsed > end) return false;
          } else if (shape.freezeFrameId && shape.freezeFrameId === activeFreezeFrameId) {
              const activeFFDur = freezeFrames.find(f => f.id === activeFreezeFrameId)?.duration ?? 10;
              const elapsed = activeFFDur - countdownValue;
              const start = shape.animStart ?? 0;
              const end = shape.animEnd ?? activeFFDur;
              if (elapsed < start || elapsed > end) return false;
          }
          return true;
    });

    const threshold = 15 / scale;
    // Reverse visibleShapes to hit the topmost shape
    for (let i = visibleShapes.length - 1; i >= 0; i--) {
        const shape = visibleShapes[i];
        
        // Check points first
        if (shape.type !== 'pen' && !shape.isFreehand) {
            if (shape.type === 'scanner') {
                const scanHit = hitTestScanner(pt, shape, scale);
                if (scanHit.type) {
                    if (scanHit.type === 'body') {
                        return { shapeId: shape.id, type: 'shape' as const, offsetX: pt.x - shape.points[0].x, offsetY: pt.y - shape.points[0].y };
                    } else {
                        return { shapeId: shape.id, type: 'scannerHandle' as const, handleType: scanHit.type, offsetX: pt.x - shape.points[0].x, offsetY: pt.y - shape.points[0].y };
                    }
                }
            }
            // For circle, only check the first point (center), ignore any others that might be left over from old data
            const isCurvedShape = (shape.type === 'curved-arrow' || shape.type === 'curved-run-arrow' || (shape.type === 'arrow' && shape.isCurved));
            const ptsToCheck = shape.type === 'circle' ? [shape.points[0]] : [...shape.points];
            if (isCurvedShape && ptsToCheck.length === 2) {
                const p1 = ptsToCheck[0];
                const p2 = ptsToCheck[1];
                const dx = p2.x - p1.x; const dy = p2.y - p1.y; const dist = Math.hypot(dx, dy);
                const mx = (p1.x + p2.x) / 2; const my = (p1.y + p2.y) / 2;
                const arcHeight = Math.max(20, dist * 0.2);
                const nx = -dy / (dist || 1); const ny = dx / (dist || 1);
                const sign = ny > 0 ? -1 : 1;
                ptsToCheck.push({ x: mx + nx * arcHeight * sign, y: my + ny * arcHeight * sign });
            }
            for (let j = 0; j < ptsToCheck.length; j++) {
                const p = ptsToCheck[j];
                if (!p) continue;
                const dist = Math.sqrt(Math.pow(pt.x - p.x, 2) + Math.pow(pt.y - p.y, 2));
                if (dist <= threshold) {
                    return { shapeId: shape.id, pointIndex: j, type: 'point' as const };
                }
            }
        }
        
        // Then check if it hit the shape body (simplified, bounding box or center check)
        if (shape.points.length > 0) {
            let hitBody = false;
            let offsetX = 0;
            let offsetY = 0;
            
            if (shape.type === 'circle' && shape.points.length >= 1) {
                const r = (shape.ringConfig as any)?.size || (shape.points.length >= 2 ? Math.sqrt(Math.pow(shape.points[0].x - shape.points[1].x, 2) + Math.pow(shape.points[0].y - shape.points[1].y, 2)) : 50);
                const cx = shape.points[0].x;
                const cy = shape.points[0].y;
                const dist = Math.sqrt(Math.pow(pt.x - cx, 2) + Math.pow(pt.y - cy, 2));
                if (dist <= r + threshold) {
                    hitBody = true;
                    offsetX = pt.x - cx;
                    offsetY = pt.y - cy;
                }
            } else if (['pen', 'line', 'arrow', 'curved-arrow', 'curved-run-arrow', 'polygon', 'connected-circle', 'radar'].includes(shape.type as string)) {
                const distToSegment = (p: Point, v: Point, w: Point) => {
                    const l2 = Math.pow(v.x - w.x, 2) + Math.pow(v.y - w.y, 2);
                    if (l2 === 0) return Math.sqrt(Math.pow(p.x - v.x, 2) + Math.pow(p.y - v.y, 2));
                    let t = ((p.x - v.x) * (w.x - v.x) + (p.y - v.y) * (w.y - v.y)) / l2;
                    t = Math.max(0, Math.min(1, t));
                    return Math.sqrt(Math.pow(p.x - (v.x + t * (w.x - v.x)), 2) + Math.pow(p.y - (v.y + t * (w.y - v.y)), 2));
                };
                if ((shape.type === 'arrow' && shape.isCurved) || shape.type === 'curved-arrow' || shape.type === 'curved-run-arrow') {
                    const p1 = shape.points[0];
                    const p2 = shape.points[1] || shape.points[0];
                    let apex = shape.points[2];
                    if (!apex) {
                        const dx = p2.x - p1.x; const dy = p2.y - p1.y; const dist = Math.hypot(dx, dy);
                        const mx = (p1.x + p2.x) / 2; const my = (p1.y + p2.y) / 2;
                        const arcHeight = Math.max(20, dist * 0.2);
                        const nx = -dy / (dist || 1); const ny = dx / (dist || 1);
                        const sign = ny > 0 ? -1 : 1;
                        apex = { x: mx + nx * arcHeight * sign, y: my + ny * arcHeight * sign };
                    }
                    const cpx = 2 * apex.x - 0.5 * p1.x - 0.5 * p2.x;
                    const cpy = 2 * apex.y - 0.5 * p1.y - 0.5 * p2.y;
                    let prevPt = p1;
                    for(let t=0.05; t<=1.01; t+=0.05) {
                        const x = (1-t)*(1-t)*p1.x + 2*(1-t)*t*cpx + t*t*p2.x;
                        const y = (1-t)*(1-t)*p1.y + 2*(1-t)*t*cpy + t*t*p2.y;
                        const curPt = {x, y};
                        if (distToSegment(pt, prevPt, curPt) <= threshold) {
                            hitBody = true;
                            break;
                        }
                        prevPt = curPt;
                    }
                } else if (shape.type === 'radar' || (shape.type === 'polygon' && shape.polygonConfig?.mode === 'radar') || shape.radarConfig) {
                    const r = shape.radarConfig?.radius || 130;
                    const tilt = shape.radarConfig?.tilt ?? 65;
                    hitBody = isPointNearRadar(pt, shape.points[0], r, tilt);
                } else {
                    if (shape.type === 'polygon') {
                        hitBody = isPointNearPolygon(pt, shape.points, threshold, shape.polygonConfig?.fillStyle !== 'none');
                    } else {
                        for (let j = 0; j < shape.points.length - 1; j++) {
                            if (distToSegment(pt, shape.points[j], shape.points[j+1]) <= threshold) {
                                hitBody = true;
                                break;
                            }
                        }
                    }
                }
                if (hitBody) {
                    offsetX = pt.x - shape.points[0].x;
                    offsetY = pt.y - shape.points[0].y;
                }
            } else {
                let minX = shape.points[0].x, maxX = shape.points[0].x, minY = shape.points[0].y, maxY = shape.points[0].y;
                shape.points.forEach(p => { minX = Math.min(minX, p.x); maxX = Math.max(maxX, p.x); minY = Math.min(minY, p.y); maxY = Math.max(maxY, p.y); });
                if (pt.x >= minX - threshold && pt.x <= maxX + threshold && pt.y >= minY - threshold && pt.y <= maxY + threshold) {
                    hitBody = true;
                    offsetX = pt.x - shape.points[0].x;
                    offsetY = pt.y - shape.points[0].y;
                }
            }
            
            if (hitBody) {
                return { shapeId: shape.id, type: 'shape' as const, offsetX, offsetY };
            }
        }
    }
    return null;
  };

  const startDrawing = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    
    if ((isPickingColor || tool === 'masking') && videoRef.current) {
        const point = getVideoSpacePoint(e);
        if (isPickingColor) {
            addColorAtPoint(point);
            setIsPickingColor(false);
            return;
        }
    }

    handleCanvasClick(e);
    if (tool === null) {
        if (selectedShapeId !== null) {
            setSelectedShapeId(null);
            setDraggingHandle(null);
        }
        return;
    }
    if (tool === 'masking') return;
    if (isPlaying) togglePlay();
    if (videoRef.current && !videoRef.current.paused) {
       videoRef.current.pause();
       setIsPlaying(false);
    }
    const startPoint = getVideoSpacePoint(e);
    const canvas = canvasRef.current;
    if (tool === 'eraser') {
        setIsDrawing(true);
        if (canvas && videoRef.current) {
            const layout = getVideoLayout(canvas, videoRef.current);
            eraseShapesNear(startPoint, layout.scale);
        }
        return;
    }
    if (tool === 'move' || tool === 'scanner') {
        if (canvas && videoRef.current) {
            const layout = getVideoLayout(canvas, videoRef.current);
            const hit = getHitTest(startPoint, layout.scale);
            if (hit) {
                const hitShape = shapes.find(s => s.id === hit.shapeId);
                if (tool === 'move' || hitShape?.type === 'scanner') {
                    if (hitShape) {
                        const isCurved = (hitShape.type === 'curved-arrow' || hitShape.type === 'curved-run-arrow' || (hitShape.type === 'arrow' && hitShape.isCurved));
                        if (isCurved && hitShape.points.length === 2) {
                            const p1 = hitShape.points[0];
                            const p2 = hitShape.points[1];
                            const dx = p2.x - p1.x; const dy = p2.y - p1.y; const dist = Math.hypot(dx, dy);
                            const mx = (p1.x + p2.x) / 2; const my = (p1.y + p2.y) / 2;
                            const arcHeight = Math.max(20, dist * 0.2);
                            const nx = -dy / (dist || 1); const ny = dx / (dist || 1);
                            const sign = ny > 0 ? -1 : 1;
                            const p3 = { x: mx + nx * arcHeight * sign, y: my + ny * arcHeight * sign };
                            setShapes(prev => prev.map(s => s.id === hitShape.id ? { ...s, points: [p1, p2, p3] } : s));
                        }
                    }
                    setSelectedShapeId(hit.shapeId);
                    setDraggingHandle(hit);
                    setIsDrawing(true);
                    return;
                }
            } else if (tool === 'move') {
                setSelectedShapeId(null);
                setDraggingHandle(null);
                return;
            }
        }
        if (tool === 'move') return;
    }
    if (tool === 'player-move') {
        if (playerMoveState === 'idle') {
            setPlayerSelectionRect({ x: startPoint.x, y: startPoint.y, w: 0, h: 0 });
            setPlayerMoveState('selecting');
        } else if (playerMoveState === 'moving') {
            finishDrawing(e);
        }
        return;
    }
    if (tool === 'spotlight' || tool === 'lens' || tool === 'name-tag' || tool === 'text') {
         setIsDrawing(true);
         return;
    }
    if (tool === 'connected-circle') {
        setIsDrawing(true);
    } else if (tool === 'circle') {
        setIsDrawing(true);
        setActivePoints([startPoint]);
        activePointsRef.current = [startPoint];
    } else if (tool === 'polygon') {
        if (polygonSettings.mode === 'radar') {
            setIsDrawing(true);
            setActivePoints([startPoint]);
            activePointsRef.current = [startPoint];
        } else {
            setActivePoints(prev => { const res = [...prev, startPoint]; activePointsRef.current = res; return res; });
        }
    } else {
        setIsDrawing(true);
        setActivePoints([startPoint]);
        activePointsRef.current = [startPoint];
    }
  };

  const drawPreview = (e: React.MouseEvent) => {
    if (tool === 'masking') return;
    const currentPoint = getVideoSpacePoint(e);
    mousePosRef.current = currentPoint; 
    if (tool === 'eraser' && isDrawing) {
        const canvas = canvasRef.current;
        if (canvas && videoRef.current) {
            const layout = getVideoLayout(canvas, videoRef.current);
            eraseShapesNear(currentPoint, layout.scale);
        }
        return;
    }
    if ((tool === 'move' || tool === 'scanner') && isDrawing && draggingHandle) {
        if (draggingHandle.type === 'scannerHandle') {
            setShapes(prev => prev.map(s => {
                if (s.id !== draggingHandle.shapeId || !s.scannerConfig) return s;
                const cfg = { ...s.scannerConfig };
                const v = s.points[0];
                if (draggingHandle.handleType === 'vertex') {
                    const dx = currentPoint.x - v.x;
                    const dy = currentPoint.y - v.y;
                    const newV = { x: currentPoint.x, y: currentPoint.y };
                    const p1 = s.points[1]
                        ? { x: s.points[1].x + dx, y: s.points[1].y + dy }
                        : { x: newV.x + Math.cos(cfg.baseAngle ?? 0) * (cfg.length || 150), y: newV.y + Math.sin(cfg.baseAngle ?? 0) * (cfg.length || 150) };
                    return { ...s, points: [newV, p1] };
                } else if (draggingHandle.handleType === 'tip') {
                    const dx = currentPoint.x - v.x;
                    const dy = currentPoint.y - v.y;
                    const newLen = Math.max(30, Math.hypot(dx, dy));
                    const newAngle = Math.atan2(dy, dx);
                    const p1 = { x: v.x + Math.cos(newAngle) * newLen, y: v.y + Math.sin(newAngle) * newLen };
                    return { ...s, points: [v, p1], scannerConfig: { ...cfg, length: Math.round(newLen), baseAngle: newAngle } };
                } else if (draggingHandle.handleType === 'leftHandle' || draggingHandle.handleType === 'rightHandle') {
                    const dx = currentPoint.x - v.x;
                    const dy = currentPoint.y - v.y;
                    const mouseAngle = Math.atan2(dy, dx);
                    let diff = mouseAngle - (cfg.baseAngle ?? 0);
                    while (diff > Math.PI) diff -= Math.PI * 2;
                    while (diff < -Math.PI) diff += Math.PI * 2;
                    const newSweep = Math.max(10, Math.min(180, Math.abs(diff) * 2 * 180 / Math.PI));
                    return { ...s, scannerConfig: { ...cfg, sweepRange: Math.round(newSweep) } };
                }
                return s;
            }));
            return;
        }
        setShapes(prev => prev.map(s => {
            if (s.id !== draggingHandle.shapeId) return s;
            const newPoints = [...s.points];
            const isCurved = (s.type === 'curved-arrow' || s.type === 'curved-run-arrow' || (s.type === 'arrow' && s.isCurved));
            if (isCurved && newPoints.length === 2) {
                const p1 = newPoints[0];
                const p2 = newPoints[1];
                const dx = p2.x - p1.x; const dy = p2.y - p1.y; const dist = Math.hypot(dx, dy);
                const mx = (p1.x + p2.x) / 2; const my = (p1.y + p2.y) / 2;
                const arcHeight = Math.max(20, dist * 0.2);
                const nx = -dy / (dist || 1); const ny = dx / (dist || 1);
                const sign = ny > 0 ? -1 : 1;
                newPoints.push({ x: mx + nx * arcHeight * sign, y: my + ny * arcHeight * sign });
            }

            if (draggingHandle.type === 'point' && draggingHandle.pointIndex !== undefined) {
                const idx = draggingHandle.pointIndex;
                if (isCurved && newPoints.length >= 3) {
                    if (idx === 0) {
                        const deltaX = currentPoint.x - newPoints[0].x;
                        const deltaY = currentPoint.y - newPoints[0].y;
                        newPoints[0] = { ...newPoints[0], x: currentPoint.x, y: currentPoint.y };
                        newPoints[2] = { ...newPoints[2], x: newPoints[2].x + deltaX * 0.5, y: newPoints[2].y + deltaY * 0.5 };
                    } else if (idx === 1) {
                        const deltaX = currentPoint.x - newPoints[1].x;
                        const deltaY = currentPoint.y - newPoints[1].y;
                        newPoints[1] = { ...newPoints[1], x: currentPoint.x, y: currentPoint.y };
                        newPoints[2] = { ...newPoints[2], x: newPoints[2].x + deltaX * 0.5, y: newPoints[2].y + deltaY * 0.5 };
                    } else if (idx === 2) {
                        newPoints[2] = { ...newPoints[2], x: currentPoint.x, y: currentPoint.y };
                    }
                } else {
                    newPoints[idx] = { ...newPoints[idx], x: currentPoint.x, y: currentPoint.y };
                }
            } else if (draggingHandle.type === 'shape') {
                const dx = currentPoint.x - (draggingHandle.offsetX || 0) - newPoints[0].x;
                const dy = currentPoint.y - (draggingHandle.offsetY || 0) - newPoints[0].y;
                for (let i = 0; i < newPoints.length; i++) {
                    newPoints[i] = { ...newPoints[i], x: newPoints[i].x + dx, y: newPoints[i].y + dy };
                }
                if (s.box) {
                    return { ...s, points: newPoints, box: { ...s.box, x: s.box.x + dx, y: s.box.y + dy } };
                }
            }
            return { ...s, points: newPoints };
        }));
        return;
    }
    if (tool === 'player-move') {
        if (playerMoveState === 'selecting' && playerSelectionRect) {
            const w = currentPoint.x - playerSelectionRect.x;
            const h = currentPoint.y - playerSelectionRect.y;
        }
        return;
    }
    if (!isDrawing && tool === 'connected-circle') { return; }
    if (isDrawing && (tool === 'pen' && arrowSettings.isFreehand)) {
        activePointsRef.current.push(currentPoint);
        return;
    }
  };

  const finishDrawing = (e: React.MouseEvent) => {
    if (tool === null || tool === 'masking') return;
    if (tool === 'eraser') {
        setIsDrawing(false);
        return;
    }
    if (draggingHandle) {
        setIsDrawing(false);
        setDraggingHandle(null);
        return;
    }
    if (tool === 'move') {
        setIsDrawing(false);
        setDraggingHandle(null);
        return;
    }
    const currentPoint = getVideoSpacePoint(e);
    const activeFFId = freezeFrames.find(ff => Math.abs(ff.timestamp - currentTime) < 0.1)?.id;
    if (tool === 'player-move') {
        if (playerMoveState === 'selecting' && playerSelectionRect) {
            const w = currentPoint.x - playerSelectionRect.x;
            const h = currentPoint.y - playerSelectionRect.y;
            if (Math.abs(w) < 10 || Math.abs(h) < 10) {
                setPlayerMoveState('idle');
                setPlayerSelectionRect(null);
                return;
            }
            const finalRect: Rect = { x: w > 0 ? playerSelectionRect.x : currentPoint.x, y: h > 0 ? playerSelectionRect.y : currentPoint.y, w: Math.abs(w), h: Math.abs(h) };
            const result = captureSprite(finalRect);
            if (result) {
                setCapturedSprite(result);
                setPlayerMoveState('moving');
            } else {
                setPlayerMoveState('idle');
            }
            setPlayerSelectionRect(null);
        } else if (playerMoveState === 'moving' && capturedSprite) {
            const { box } = capturedSprite;
            const destCenter = currentPoint;
             const newShape: Shape = {
                id: Date.now().toString(), type: 'player-move', points: [ { x: box.x + box.w/2, y: box.y + box.h/2 }, destCenter ], box: box, color: currentColor, strokeWidth: toolSize, img: capturedSprite.sprite, bgImg: capturedSprite.patch, timestamp: Date.now(), freezeFrameId: activeFFId
             };
             addShape(newShape);
             setPlayerMoveState('idle');
             setCapturedSprite(null);
        }
        return;
    }
    if (tool === 'spotlight' && isDrawing) {
        setIsDrawing(false);
        const newShape: Shape = { id: Date.now().toString(), type: 'spotlight', points: [currentPoint], color: '#ffffff', strokeWidth: 1, timestamp: Date.now(), freezeFrameId: activeFFId, spotlightConfig: { size: spotlightSettings.size, intensity: spotlightSettings.intensity, rotation: spotlightSettings.rotation, particles: createParticles(30) } };
        addShape(newShape);
        return;
    }
    if (tool === 'lens' && isDrawing) {
        setIsDrawing(false);
        const newShape: Shape = { id: Date.now().toString(), type: 'lens', points: [currentPoint], color: '#ffffff', strokeWidth: 1, timestamp: Date.now(), freezeFrameId: activeFFId, lensConfig: { radius: lensSettings.size, zoom: lensSettings.zoom } };
        addShape(newShape);
        return;
    }
    if (tool === 'name-tag' && isDrawing) {
        setIsDrawing(false);
        const allNames = [...nameTagSettings.teamA.names, ...nameTagSettings.teamB.names];
        const activeItem = allNames.find(n => n.id === nameTagSettings.activeId);
        const activeNameText = activeItem?.name || activeItem?.text || '';
        const playerNumber = activeItem?.number || '';
        const newShape: Shape = { 
            id: Date.now().toString(), 
            type: 'name-tag', 
            points: [currentPoint], 
            color: currentColor, 
            strokeWidth: nameTagSettings.size, 
            timestamp: Date.now(), 
            freezeFrameId: activeFFId, 
            text: activeNameText,
            playerNumber: playerNumber,
            nameTagConfig: {
                playerNumber: playerNumber,
                uppercase: nameTagSettings.uppercase !== false,
                showNumber: nameTagSettings.showNumber !== false,
            }
        };
        addShape(newShape);
        return;
    }
    if (tool === 'text' && isDrawing) {
        setIsDrawing(false);
        const newShape: Shape = { id: Date.now().toString(), type: 'text', points: [currentPoint], color: colors.find(c => c.id === textSettings.colorId)?.value || '#fff', strokeWidth: 1, timestamp: Date.now(), freezeFrameId: activeFFId, text: textSettings.text, textConfig: { bgEnabled: textSettings.bgEnabled, bgColor: colors.find(c => c.id === textSettings.bgColorId)?.value || '#000', fontSize: textSettings.fontSize, animation: textSettings.animation } };
        addShape(newShape);
        return;
    }
    if (tool === 'connected-circle') {
        if (isDrawing) {
            if (activePoints.length >= 2) {
                const distToStart = getDistance(currentPoint, activePoints[0]);
                if (distToStart < ringSettings.size) { 
                     const newShape: Shape = { id: Date.now().toString(), type: 'connected-circle', points: [...activePoints], color: currentColor, strokeWidth: ringStrokeWidth, timestamp: Date.now(), ringConfig: { ...ringSettings }, isClosed: true, isFilled: ringSettings.isFilled, freezeFrameId: activeFFId };
                    addShape(newShape);
                    setActivePoints([]);
                    setIsDrawing(false);
                    return;
                }
            }
            setActivePoints(prev => [...prev, { x: currentPoint.x, y: currentPoint.y, r: ringSettings.size, timestamp: Date.now() }]);
            setIsDrawing(false);
        }
        return;
    }
    if (tool === 'circle' && isDrawing) {
        setIsDrawing(false);
        const newShape: Shape = { id: Date.now().toString(), type: 'circle', points: [currentPoint], color: currentColor, strokeWidth: ringStrokeWidth, timestamp: Date.now(), ringConfig: { ...ringSettings }, freezeFrameId: activeFFId };
        addShape(newShape);
        setActivePoints([]);
        return;
    }
    if (tool === 'polygon') {
        if (polygonSettings.mode === 'radar' && isDrawing) {
            setIsDrawing(false);
            const startPt = activePointsRef.current[0] || currentPoint;
            const tiltRad = ((polygonSettings.radarTilt ?? 65) * Math.PI) / 180;
            const scaleY = Math.max(0.1, Math.cos(tiltRad));
            const dragDx = currentPoint.x - startPt.x;
            const dragDy = (currentPoint.y - startPt.y) / scaleY;
            const dragDist = Math.hypot(dragDx, dragDy);
            const finalRadius = dragDist > 15 ? Math.round(dragDist) : polygonSettings.radarRadius;

            const newShape = createRadarShape(
                startPt,
                finalRadius,
                currentColor,
                toolSize,
                polygonSettings,
                activeFFId
            );
            addShape(newShape);
            setActivePoints([]);
            activePointsRef.current = [];

            const { h } = getHueAndSatFromColor(currentColor);
            radarParticlesRef.current = [
                ...radarParticlesRef.current,
                ...createRadarBurstParticles(startPt.x, startPt.y, h, 30, polygonSettings.radarTilt ?? 65)
            ];
            return;
        }
        return;
    } 
    if (tool === 'scanner' && isDrawing) {
        setIsDrawing(false);
        const startPt = activePointsRef.current[0] || currentPoint;
        const dragDist = Math.hypot(currentPoint.x - startPt.x, currentPoint.y - startPt.y);
        const targetEndPt = dragDist > 15
            ? currentPoint
            : { x: startPt.x + Math.cos(0) * scannerSettings.length, y: startPt.y + Math.sin(0) * scannerSettings.length };

        const newShape = createScannerShape(
            startPt,
            targetEndPt,
            currentColor,
            toolSize,
            scannerSettings,
            activeFFId
        );
        addShape(newShape);
        setSelectedShapeId(newShape.id);
        setActivePoints([]);
        activePointsRef.current = [];
        return;
    }
    if (isDrawing) {
      setIsDrawing(false);
      let pointsToSave = [activePointsRef.current[0], currentPoint];
      if (tool === 'pen' && arrowSettings.isFreehand) pointsToSave = [...activePointsRef.current];
      
      if ((tool === 'curved-arrow' || tool === 'curved-run-arrow' || (tool === 'arrow' && arrowSettings.isCurved)) && pointsToSave.length === 2) {
          const p1 = pointsToSave[0];
          const p2 = pointsToSave[1];
          const dx = p2.x - p1.x; const dy = p2.y - p1.y; const dist = Math.hypot(dx, dy);
          const mx = (p1.x + p2.x) / 2; const my = (p1.y + p2.y) / 2;
          const arcHeight = Math.max(20, dist * 0.2);
          const nx = -dy / (dist || 1); const ny = dx / (dist || 1);
          const sign = ny > 0 ? -1 : 1;
          const p3 = { x: mx + nx * arcHeight * sign, y: my + ny * arcHeight * sign };
          pointsToSave.push(p3);
      }
      
      let finalType = tool;
      if (tool === 'pen') finalType = arrowSettings.isFreehand ? 'pen' : 'line';

      const newShape: Shape = { id: Date.now().toString(), type: finalType, points: pointsToSave, color: currentColor, strokeWidth: toolSize, isDashed: arrowSettings.isDashed, isFreehand: arrowSettings.isFreehand, isCurved: arrowSettings.isCurved, timestamp: Date.now(), freezeFrameId: activeFFId };
      addShape(newShape);
      setActivePoints([]);
      activePointsRef.current = [];
      setCurrentDragStart(null);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const activeFFId = freezeFrames.find(ff => Math.abs(ff.timestamp - currentTime) < 0.1)?.id;
    if (tool === 'polygon' && polygonSettings.mode !== 'radar' && activePoints.length > 2) {
        const finalPts = [...activePoints];
        if (finalPts.length > 0) finalPts.pop();
        const newShape = createPolygonShape(finalPts, currentColor, toolSize, polygonSettings.fillStyle, activeFFId);
        addShape(newShape);
        setActivePoints([]);
    }
    if (tool === 'connected-circle') {
        if (activePoints.length > 0) {
            const finalPts = [...activePoints];
            if (finalPts.length > 0) finalPts.pop();
            const newShape: Shape = { id: Date.now().toString(), type: 'connected-circle', points: finalPts, color: currentColor, strokeWidth: ringStrokeWidth, timestamp: 0, ringConfig: { ...ringSettings }, isClosed: false, freezeFrameId: activeFFId };
            addShape(newShape);
        }
        setActivePoints([]);
        setIsDrawing(false);
        setCurrentDragStart(null);
    }
  };

  const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      if (activePoints.length > 0 || isDrawing || playerMoveState !== 'idle') {
          setActivePoints([]);
          setIsDrawing(false);
          setPlayerMoveState('idle');
          setPlayerSelectionRect(null);
          setCapturedSprite(null);
          setCurrentDragStart(null);
          renderCanvas(); 
          return;
      }
      if (tool === 'scanner' || tool === 'move') {
          const canvas = canvasRef.current;
          if (canvas && videoRef.current) {
              const layout = getVideoLayout(canvas, videoRef.current);
              const pt = getVideoSpacePoint(e);
              const hit = getHitTest(pt, layout.scale);
              if (hit && shapes.find(s => s.id === hit.shapeId)?.type === 'scanner') {
                  setShapes(prev => prev.filter(s => s.id !== hit.shapeId));
                  if (selectedShapeId === hit.shapeId) setSelectedShapeId(null);
                  return;
              }
          }
      }
  };

  const addShape = (shape: Shape) => {
    setShapes(prev => {
        setUndoStack(u => { const nu = [...u, prev]; return nu.length > 30 ? nu.slice(nu.length - 30) : nu; });
        return [...prev, shape];
    });
    setRedoStack([]); 
  };

  const eraseShapesNear = (pt: Point, scale: number) => {
      const threshold = 20 / scale; // Screen radius of 20px
      const activeFF = freezeFrames.find(ff => Math.abs(ff.timestamp - currentTime) < 0.1);
      
      setShapes(prev => {
          const remaining = prev.filter(shape => {
              // Only consider shapes that are currently visible
              let isVisible = false;
              if (!shape.freezeFrameId) {
                  isVisible = true; // Temporary shapes
              } else if (activeFF && activeFF.id === shape.freezeFrameId && !isPlaying) {
                  isVisible = true; // Attached to current active freeze frame
              } else if (activeFreezeFrameId === shape.freezeFrameId) {
                  isVisible = true;
              }

              if (!isVisible) return true; // Keep shapes that are not currently visible

              if (shape.type === 'scanner') {
                  const hit = hitTestScanner(pt, shape, scale);
                  return hit.type === null;
              }

              if (shape.points.length === 0) return false;
              if (shape.points.length === 1) {
                  if (shape.type === 'radar' || shape.radarConfig) {
                      const r = shape.radarConfig?.radius || 130;
                      const tilt = shape.radarConfig?.tilt ?? 65;
                      return !isPointNearRadar(pt, shape.points[0], r, tilt);
                  }
                  return Math.sqrt(Math.pow(pt.x - shape.points[0].x, 2) + Math.pow(pt.y - shape.points[0].y, 2)) > threshold;
              }
              // Check segments
              for (let i = 0; i < shape.points.length - 1; i++) {
                  const v = shape.points[i];
                  const w = shape.points[i+1];
                  const l2 = (w.x - v.x) ** 2 + (w.y - v.y) ** 2;
                  let t = 0;
                  if (l2 !== 0) {
                      t = ((pt.x - v.x) * (w.x - v.x) + (pt.y - v.y) * (w.y - v.y)) / l2;
                      t = Math.max(0, Math.min(1, t));
                  }
                  const dist = Math.sqrt((pt.x - (v.x + t * (w.x - v.x))) ** 2 + (pt.y - (v.y + t * (w.y - v.y))) ** 2);
                  if (dist <= threshold) return false; // erase
              }
              return true;
          });
          if (remaining.length === prev.length) return prev;
          setUndoStack(u => { const nu = [...u, prev]; return nu.length > 30 ? nu.slice(nu.length - 30) : nu; });
          setRedoStack([]);
          return remaining;
      });
  };

  const undo = () => {
      setUndoStack(prevUndo => {
          if (prevUndo.length === 0) return prevUndo;
          const lastState = prevUndo[prevUndo.length - 1];
          setShapes(currentShapes => {
              setRedoStack(r => { const nr = [...r, currentShapes]; return nr.length > 30 ? nr.slice(nr.length - 30) : nr; });
              return lastState;
          });
          return prevUndo.slice(0, -1);
      });
  };

  const redo = () => {
      setRedoStack(prevRedo => {
          if (prevRedo.length === 0) return prevRedo;
          const nextState = prevRedo[prevRedo.length - 1];
          setShapes(currentShapes => {
              setUndoStack(u => { const nu = [...u, currentShapes]; return nu.length > 30 ? nu.slice(nu.length - 30) : nu; });
              return nextState;
          });
          return prevRedo.slice(0, -1);
      });
  };

  const clearAll = () => {
    const activeFF = freezeFrames.find(ff => Math.abs(ff.timestamp - currentTime) < 0.1);
    const currentFFId = activeFreezeFrameId || (activeFF ? activeFF.id : null);

    setShapes(prev => {
        const remaining = prev.filter(shape => shape.freezeFrameId && shape.freezeFrameId !== currentFFId);
        if (remaining.length === prev.length) return prev;
        setUndoStack(u => { const nu = [...u, prev]; return nu.length > 30 ? nu.slice(nu.length - 30) : nu; });
        setRedoStack([]);
        return remaining;
    });
    setActivePoints([]);
    setIsDrawing(false);
    setCurrentDragStart(null);
    setPlayerMoveState('idle');
    setPlayerSelectionRect(null);
    setCapturedSprite(null);
  };

  const confirmClose = () => {
      onUpdateProject({
          shapes, freezeFrames, tags, tagEvents, 
          playlists: batchMode ? project.data.playlists : playlists,
          markers, presetTexts, projectNotes, labels, labelEvents, advancedPadItems, connectors, periodSyncs,
          ...(isLive ? { liveTime: currentTime } : {})
      });
      if (batchMode) {
          batchMode.onUpdateBatch({
              ...batchMode.batch,
              playlists,
              lastModified: Date.now()
          });
      }
      onClose();
  };

  const drawActiveChain = (ctx: CanvasRenderingContext2D, scale: number) => {
    const activePts = activePointsRef.current;
    if (tool !== 'connected-circle' || activePts.length === 0) return;
    const now = Date.now();
    if (activePts.length > 1) {
      for (let i = 0; i < activePts.length - 1; i++) {
        const c1 = activePts[i];
        const c2 = activePts[i + 1];
        const startTime = c2.timestamp || 0;
        const pulseAge = Math.max(0, now - startTime);
        drawTangentLine(ctx, c1, c2, c1.r || ringSettings.size, c2.r || ringSettings.size, currentColor, 0, 1, pulseAge);
      }
    }
    activePts.forEach(p => {
      draw3DRing(ctx, p.x, p.y, p.r || ringSettings.size, currentColor, ringSettings.tilt, ringStrokeWidth / scale, p.timestamp || now, false, ringSettings);
    });
  };

  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !videoRef.current) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const activePts = activePointsRef.current;
    const video = videoRef.current;
    const layout = getVideoLayout(canvas, video);
    const { x, y, w, h, scale } = layout;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const currentVideoTime = video ? video.currentTime : 0;
    const isMaskSynced = maskCache.timestamp !== -1 && Math.abs(maskCache.timestamp - currentVideoTime) < 0.15;
    
    let ffAlpha = 1;
    let shouldRenderDrawings = true;
    if (!isPlaying && maskSettings.enabled && maskCache.processedAt > 0 && isMaskSynced) {
        const age = Date.now() - maskCache.processedAt;
        const fadeDuration = 800; // 800ms fade in for telestrations
        if (age < fadeDuration) ffAlpha = Math.min(1, age / fadeDuration);
        else ffAlpha = 1;
    } else if (!isPlaying && maskSettings.enabled && (!isMaskSynced || maskCache.processedAt === 0)) {
        ffAlpha = 0; // Don't show shapes until mask is ready
        shouldRenderDrawings = false; 
    }

    if (maskSettings.enabled && !isPlaying && maskSettings.showOverlay && maskCache.overlay && isMaskSynced) {
        renderMaskOverlay(ctx, maskCache.overlay, x, y, w, h);
    }
    
    if (shouldRenderDrawings) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        const activeFF = freezeFrames.find(ff => Math.abs(ff.timestamp - currentVideoTime) < 0.1);
        shapes.forEach(shape => {
            let shouldRender = false;
            if (!shape.freezeFrameId) shouldRender = true; 
            else if (editingAnimationFFId === shape.freezeFrameId) { shouldRender = true; }
            else if (activeFF && activeFF.id === shape.freezeFrameId && !isPlaying) { shouldRender = true; }
            else if (activeFreezeFrameId === shape.freezeFrameId) { shouldRender = true; }
            
            let unifiedProgress: number | undefined = undefined;
            if (shouldRender) {
                if (shape.freezeFrameId && (shape.freezeFrameId === editingAnimationFFId || shape.freezeFrameId === activeFreezeFrameId)) {
                    const activeFFDur = freezeFrames.find(f => f.id === shape.freezeFrameId)?.duration ?? 10;
                    const elapsed = shape.freezeFrameId === editingAnimationFFId ? animationPreviewTime : (activeFFDur - countdownValue);
                    const start = shape.animStart ?? 0;
                    const end = shape.animEnd ?? activeFFDur;
                    if (elapsed < start || elapsed > end) {
                        shouldRender = false;
                    } else {
                        const appearDuration = 0.5;
                        const disappearDuration = 0.5;
                        let ap = 1; let dp = 0;
                        if (elapsed >= start && elapsed <= start + appearDuration) {
                            ap = (elapsed - start) / appearDuration;
                        }
                        if (elapsed >= end - disappearDuration && elapsed <= end) {
                            dp = (elapsed - (end - disappearDuration)) / disappearDuration;
                        }
                        unifiedProgress = ap < 1 ? ap : (1 - dp);
                    }
                }
            }

            if (shouldRender) {
                if (shape.type === 'player-move' || shape.type === 'lens' || shape.type === 'name-tag' || shape.type === 'text') return; 
                const alphaToUse = ffAlpha;
                if (shape.type === 'curved-arrow') drawShapeOnCanvas(shape, scale, 'shadow', alphaToUse, undefined, unifiedProgress);
                else drawShapeOnCanvas(shape, scale, 'full', alphaToUse, undefined, unifiedProgress);
            }
        });
        
        ctx.save();
        ctx.globalAlpha = ffAlpha;
        if (isDrawing && (tool === 'pen' && arrowSettings.isFreehand) && activePts.length > 0) {
            drawShapeOnCanvas({ id: 'active_pen', type: 'pen', points: activePts, color: currentColor, strokeWidth: toolSize, isDashed: arrowSettings.isDashed, isFreehand: arrowSettings.isFreehand, isCurved: arrowSettings.isCurved, timestamp: 0 }, scale, 'full', ffAlpha);
        }
        if (tool === 'connected-circle' && activePts.length > 0) {
            drawActiveChain(ctx, scale);
        }
        ctx.restore();
        
        ctx.restore();
    }
    if (maskSettings.enabled && !isPlaying && maskCache.foreground && isMaskSynced) {
        renderMaskForeground(ctx, maskCache.foreground, x, y, w, h);
    }
    if (shouldRenderDrawings) {
        ctx.save();
        ctx.translate(x, y);
        ctx.scale(scale, scale);
        const activeFF = freezeFrames.find(ff => Math.abs(ff.timestamp - currentVideoTime) < 0.1);
        shapes.forEach(shape => {
            let shouldRender = false;
            if (!shape.freezeFrameId) shouldRender = true; 
            else if (editingAnimationFFId === shape.freezeFrameId) { shouldRender = true; }
            else if (activeFF && activeFF.id === shape.freezeFrameId && !isPlaying) { shouldRender = true; }
            else if (activeFreezeFrameId === shape.freezeFrameId) { shouldRender = true; }
            
            let unifiedProgress: number | undefined = undefined;
            if (shouldRender) {
                if (shape.freezeFrameId && (shape.freezeFrameId === editingAnimationFFId || shape.freezeFrameId === activeFreezeFrameId)) {
                    const activeFFDur = freezeFrames.find(f => f.id === shape.freezeFrameId)?.duration ?? 10;
                    const elapsed = shape.freezeFrameId === editingAnimationFFId ? animationPreviewTime : (activeFFDur - countdownValue);
                    const start = shape.animStart ?? 0;
                    const end = shape.animEnd ?? activeFFDur;
                    if (elapsed < start || elapsed > end) {
                        shouldRender = false;
                    } else {
                        const appearDuration = 0.5;
                        const disappearDuration = 0.5;
                        let ap = 1; let dp = 0;
                        if (elapsed >= start && elapsed <= start + appearDuration) {
                            ap = (elapsed - start) / appearDuration;
                        }
                        if (elapsed >= end - disappearDuration && elapsed <= end) {
                            dp = (elapsed - (end - disappearDuration)) / disappearDuration;
                        }
                        unifiedProgress = ap < 1 ? ap : (1 - dp);
                    }
                }
            }

            if (shouldRender) {
                const alphaToUse = ffAlpha;
                
                if (shape.type === 'curved-arrow') drawShapeOnCanvas(shape, scale, 'body', alphaToUse, undefined, unifiedProgress);
                if (shape.type === 'player-move') drawShapeOnCanvas(shape, scale, 'full', alphaToUse, undefined, unifiedProgress);
                if (shape.type === 'lens' && video) {
                    if (shape.lensConfig && shape.points[0]) {
                        ctx.save();
                        ctx.globalAlpha = ffAlpha;
                        let actualProgress = unifiedProgress !== undefined ? Math.max(0, unifiedProgress) : 1;
                        let effScale = actualProgress < 1 ? Math.max(0.0001, Math.pow(actualProgress, 0.5)) : 1;
                        if (effScale < 1) {
                            ctx.translate(shape.points[0].x, shape.points[0].y);
                            ctx.scale(effScale, effScale);
                            ctx.translate(-shape.points[0].x, -shape.points[0].y);
                        }
                        drawLens(ctx, shape.points[0], shape.lensConfig.radius, shape.lensConfig.zoom, video, scale, shape.timestamp);
                        ctx.restore();
                    }
                }
                if (shape.type === 'name-tag' || shape.type === 'text') {
                    drawShapeOnCanvas(shape, scale, 'full', alphaToUse, undefined, unifiedProgress);
                }
            }
        });
        
        if (tool === 'name-tag' && mousePosRef.current && !isPlaying && !isDrawing && !isScreenRecording) {
            const allNames = [...nameTagSettings.teamA.names, ...nameTagSettings.teamB.names];
            const activeItem = allNames.find(n => n.id === nameTagSettings.activeId);
            const activeNameText = activeItem?.name || activeItem?.text || '';
            const playerNumber = activeItem?.number || '';
            drawNameTag(
                ctx, 
                mousePosRef.current, 
                activeNameText, 
                currentColor, 
                scale, 
                Date.now(), 
                nameTagSettings.size, 
                true,
                undefined,
                playerNumber,
                {
                    uppercase: nameTagSettings.uppercase !== false,
                    showNumber: nameTagSettings.showNumber !== false,
                }
            );
        }

        if (tool === 'text' && mousePosRef.current && !isPlaying && !isDrawing && !isScreenRecording) {
            drawText(ctx, mousePosRef.current, textSettings.text, colors.find(c => c.id === textSettings.colorId)?.value || '#fff', scale, Date.now(), { bgEnabled: textSettings.bgEnabled, bgColor: colors.find(c => c.id === textSettings.bgColorId)?.value || '#000', fontSize: textSettings.fontSize, animation: textSettings.animation }, true);
        }
        
        if (tool === 'move' && !isPlaying) {
            shapes.forEach(shape => {
                let shouldRender = false;
                if (!shape.freezeFrameId) shouldRender = true; 
                else if (editingAnimationFFId === shape.freezeFrameId) { shouldRender = true; }
                else if (activeFF && activeFF.id === shape.freezeFrameId && !isPlaying) { shouldRender = true; }
                else if (activeFreezeFrameId === shape.freezeFrameId) { shouldRender = true; }
                if (shouldRender) {
                    ctx.save();
                    if (shape.id === selectedShapeId) {
                        const isCurved = (shape.type === 'curved-arrow' || shape.type === 'curved-run-arrow' || (shape.type === 'arrow' && shape.isCurved));
                        if (isCurved && shape.points.length >= 2) {
                            const p1 = shape.points[0];
                            const p2 = shape.points[1];
                            const apex = shape.points[2] || {
                                x: (p1.x + p2.x) / 2,
                                y: (p1.y + p2.y) / 2 - Math.hypot(p2.x - p1.x, p2.y - p1.y) * 0.15
                            };

                            ctx.save();
                            // 1. Dashed Chord Baseline connecting start & end
                            ctx.beginPath();
                            ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
                            ctx.lineWidth = 1 / scale;
                            ctx.setLineDash([3 / scale, 3 / scale]);
                            ctx.moveTo(p1.x, p1.y);
                            ctx.lineTo(p2.x, p2.y);
                            ctx.stroke();

                            // 2. Normal Guide from chord midpoint to the on-curve Apex
                            const mx = (p1.x + p2.x) / 2;
                            const my = (p1.y + p2.y) / 2;
                            ctx.beginPath();
                            ctx.strokeStyle = 'rgba(198, 255, 31, 0.45)';
                            ctx.lineWidth = 1 / scale;
                            ctx.setLineDash([2 / scale, 2 / scale]);
                            ctx.moveTo(mx, my);
                            ctx.lineTo(apex.x, apex.y);
                            ctx.stroke();

                            ctx.setLineDash([]);

                            // 3. Start Point Handle (P0)
                            ctx.beginPath();
                            ctx.fillStyle = '#3b82f6';
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 2 / scale;
                            ctx.arc(p1.x, p1.y, 5.5 / scale, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();

                            // 4. End Point Handle (P1)
                            ctx.beginPath();
                            ctx.fillStyle = '#3b82f6';
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 2 / scale;
                            ctx.arc(p2.x, p2.y, 5.5 / scale, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();

                            // 5. On-Curve Controlling Handle (P2) - Centered directly ON the curve path
                            ctx.beginPath();
                            ctx.fillStyle = 'rgba(198, 255, 31, 0.35)';
                            ctx.arc(apex.x, apex.y, 10 / scale, 0, Math.PI * 2);
                            ctx.fill();

                            ctx.beginPath();
                            ctx.fillStyle = '#c6ff1f';
                            ctx.strokeStyle = '#ffffff';
                            ctx.lineWidth = 2 / scale;
                            ctx.arc(apex.x, apex.y, 6 / scale, 0, Math.PI * 2);
                            ctx.fill();
                            ctx.stroke();

                            // Inner accent center dot
                            ctx.beginPath();
                            ctx.fillStyle = '#0a0a0c';
                            ctx.arc(apex.x, apex.y, 2 / scale, 0, Math.PI * 2);
                            ctx.fill();

                            // Subtle on-curve label pill
                            const labelText = "Curve";
                            const fontSize = 8.5 / scale;
                            ctx.font = `600 ${fontSize}px sans-serif`;
                            const textMetrics = ctx.measureText(labelText);
                            const pillW = textMetrics.width + (8 / scale);
                            const pillH = 14 / scale;
                            const pillX = apex.x + (9 / scale);
                            const pillY = apex.y - (7 / scale);
                            
                            ctx.fillStyle = 'rgba(10, 10, 12, 0.85)';
                            ctx.strokeStyle = 'rgba(198, 255, 31, 0.5)';
                            ctx.lineWidth = 1 / scale;
                            if (ctx.roundRect) {
                                ctx.beginPath();
                                ctx.roundRect(pillX, pillY, pillW, pillH, 3 / scale);
                                ctx.fill();
                                ctx.stroke();
                            }
                            ctx.fillStyle = '#c6ff1f';
                            ctx.textBaseline = 'middle';
                            ctx.fillText(labelText, pillX + (4 / scale), pillY + pillH / 2);

                            ctx.restore();
                        } else if (shape.type !== 'pen' && !shape.isFreehand) {
                            const ptsToRender = shape.type === 'circle' ? [shape.points[0]] : shape.points;
                            ptsToRender.forEach((p, i) => {
                                if (!p) return;
                                ctx.beginPath();
                                ctx.fillStyle = '#3b82f6';
                                ctx.strokeStyle = '#ffffff';
                                ctx.lineWidth = 2 / scale;
                                ctx.arc(p.x, p.y, 5 / scale, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.stroke();
                            });
                        }
                    }
                    ctx.restore();
                }
            });
        }
        
        if (radarParticlesRef.current.length > 0) {
            radarParticlesRef.current = updateAndDrawRadarParticles(ctx, radarParticlesRef.current, scale, 1);
        }

        // Ghost Preview has been moved to ghostCanvasRef
        ctx.restore();
    }

    // Draw Watermark
    /* Removed watermark per user request */

    const ghostCanvas = ghostCanvasRef.current;
    const ghostCtx = ghostCanvas ? ghostCanvas.getContext('2d') : null;
    if (ghostCtx && ghostCanvas) {
        ghostCtx.clearRect(0, 0, ghostCanvas.width, ghostCanvas.height);
        
        if (!isPlaying && mousePosRef.current && tool && tool !== 'masking' && tool !== 'player-move' && tool !== 'name-tag' && tool !== 'text') {
            const m = mousePosRef.current;
            ghostCtx.save();
            ghostCtx.translate(x, y);
            ghostCtx.scale(scale, scale);
            ghostCtx.globalAlpha = 0.5 * ffAlpha;
            
            if (tool === 'circle' && !isDrawing) {
                draw3DRing(ghostCtx, m.x, m.y, ringSettings.size, currentColor, ringSettings.tilt, ringStrokeWidth / scale, Date.now(), true, ringSettings);
            } else if (tool === 'connected-circle' && !isDrawing) {
                if (activePts.length > 0) {
                    const lastPt = activePts[activePts.length - 1];
                    drawTangentLine(ghostCtx, lastPt, m, lastPt.r || ringSettings.size, ringSettings.size, currentColor, 0, 1, 0, true, ringSettings.tilt, ringSettings);
                }
                draw3DRing(ghostCtx, m.x, m.y, ringSettings.size, currentColor, ringSettings.tilt, ringStrokeWidth / scale, Date.now(), true, ringSettings);
            } else if (tool === 'spotlight' && !isDrawing) {
                drawSpotlight(ghostCtx, m.x, m.y, spotlightSettings.size, spotlightSettings.intensity, spotlightSettings.rotation, [], Date.now(), true);
            } else if (tool === 'lens' && !isDrawing && video) {
                drawLens(ghostCtx, m, lensSettings.size, lensSettings.zoom, video, scale, Date.now(), true);
            } else if ((tool === 'arrow' || tool === 'curved-arrow' || tool === 'line' || tool === 'pen') && !isDrawing) {
                ghostCtx.beginPath();
                ghostCtx.arc(m.x, m.y, (toolSize / scale) / 2, 0, Math.PI * 2);
                ghostCtx.fillStyle = currentColor;
                ghostCtx.fill();
            } else if (tool === 'polygon') {
                if (polygonSettings.mode === 'radar') {
                    if (isDrawing && activePts.length > 0) {
                        const tiltRad = ((polygonSettings.radarTilt ?? 65) * Math.PI) / 180;
                        const scaleY = Math.max(0.1, Math.cos(tiltRad));
                        const dragDx = m.x - activePts[0].x;
                        const dragDy = (m.y - activePts[0].y) / scaleY;
                        const dragDist = Math.hypot(dragDx, dragDy);
                        const r = dragDist > 15 ? dragDist : polygonSettings.radarRadius;
                        drawRadarPreview(ghostCtx, activePts[0].x, activePts[0].y, r, currentColor, scale, polygonSettings, Date.now(), ffAlpha);
                    } else {
                        drawRadarPreview(ghostCtx, m.x, m.y, polygonSettings.radarRadius, currentColor, scale, polygonSettings, Date.now(), ffAlpha);
                    }
                } else {
                    drawPolygonPreview(ghostCtx, activePts, m, currentColor, toolSize, scale, polygonSettings.fillStyle, ffAlpha);
                }
            } else if (tool === 'scanner') {
                if (isDrawing && activePts.length > 0) {
                    drawScannerPreview(ghostCtx, activePts[0], m, currentColor, scale, scannerSettings, Date.now(), ffAlpha);
                } else {
                    const tipPreview = { x: m.x + Math.cos(0) * scannerSettings.length, y: m.y + Math.sin(0) * scannerSettings.length };
                    drawScannerPreview(ghostCtx, m, tipPreview, currentColor, scale, scannerSettings, Date.now(), ffAlpha);
                }
            } else if ((tool === 'arrow' || tool === 'curved-arrow' || tool === 'line' || tool === 'pen') && isDrawing && activePts.length > 0) {
                const pts = [activePts[0], m];
                let ghostType = tool;
                if (tool === 'pen') ghostType = arrowSettings.isFreehand ? 'pen' : 'line';

                drawShapeOnCanvas({ id: 'ghost', type: ghostType, points: (tool === 'pen' && arrowSettings.isFreehand) ? [...activePts, m] : pts, color: currentColor, strokeWidth: toolSize, timestamp: 0, isDashed: arrowSettings.isDashed, isFreehand: arrowSettings.isFreehand, isCurved: arrowSettings.isCurved }, scale, 'full', 0.5 * ffAlpha, ghostCtx);
            }
            ghostCtx.restore();
        }
    }

  }, [shapes, isDrawing, activePoints, tool, currentColor, toolSize, ringStrokeWidth, maskSettings, maskCache, isPlaying, playerMoveState, ringSettings, arrowSettings, spotlightSettings, polygonSettings, scannerSettings, lensSettings, freezeFrames, activeFreezeFrameId, nameTagSettings, textSettings, colors, editingAnimationFFId, animationPreviewTime, countdownValue, selectedShapeId]);

  useEffect(() => {
    let animationFrameId: number;
    const animate = () => {
        renderCanvas();
        animationFrameId = requestAnimationFrame(animate);
    };
    animate();
    return () => cancelAnimationFrame(animationFrameId);
  }, [renderCanvas]);

  const drawShapeOnCanvas = (shape: Shape, scale: number, renderMode: 'full' | 'shadow' | 'body' = 'full', ffAlpha: number = 1, targetCtx?: CanvasRenderingContext2D, unifiedProgress?: number) => {
    const ctx = targetCtx || canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.save(); 
    if (shape.timestamp > 0 && !shape.freezeFrameId && shape.type !== 'curved-arrow' && shape.type !== 'player-move' && shape.type !== 'spotlight' && shape.type !== 'lens' && shape.type !== 'arrow') {
        const age = Date.now() - shape.timestamp;
        const fadeDuration = 300; 
        if (age < fadeDuration) ctx.globalAlpha = Math.min(1, age / fadeDuration) * ffAlpha;
        else ctx.globalAlpha = ffAlpha;
    } else {
        ctx.globalAlpha = ffAlpha;
    }
    ctx.strokeStyle = shape.color; ctx.lineWidth = shape.strokeWidth / scale; ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.fillStyle = shape.color;
    const { points, type } = shape;
    if (points.length < 1) { ctx.restore(); return; }
    const p1 = points[0];
    const p2 = points[points.length - 1];

    ctx.beginPath();
    
    ctx.save();
    if (unifiedProgress !== undefined) {
        if (type === 'circle') {
            let actualProgress = Math.max(0, unifiedProgress);
            let effScale = actualProgress < 1 ? Math.max(0.0001, Math.pow(actualProgress, 0.5)) : 1;
            if (effScale < 1) {
                let cx = p1.x; let cy = p1.y;
                if ((type as string) === 'connected-circle') {
                    cx = points.reduce((s, p) => s + p.x, 0) / points.length;
                    cy = points.reduce((s, p) => s + p.y, 0) / points.length;
                }
                ctx.translate(cx, cy);
                ctx.scale(effScale, effScale);
                ctx.translate(-cx, -cy);
            }
        }
        if (type === 'spotlight' && unifiedProgress < 1) {
            ctx.beginPath();
            ctx.rect(0, 0, 1920, 1080 * unifiedProgress);
            ctx.clip();
        }
    }

    switch (type) {
        case 'pen': 
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 2;
            if (shape.isDashed) {
                ctx.setLineDash([(shape.strokeWidth / scale) * 2, (shape.strokeWidth / scale) * 1.5]);
            }
            if (points.length < 2) { 
                ctx.beginPath(); 
                ctx.arc(points[0].x, points[0].y, (shape.strokeWidth / scale) / 2, 0, Math.PI * 2); 
                ctx.fill(); 
            } else { 
                ctx.beginPath(); 
                ctx.moveTo(points[0].x, points[0].y); 
                for (let i = 1; i < points.length - 2; i++) { 
                    const xc = (points[i].x + points[i + 1].x) / 2; 
                    const yc = (points[i].y + points[i + 1].y) / 2; 
                    ctx.quadraticCurveTo(points[i].x, points[i].y, xc, yc); 
                } 
                if (points.length > 2) ctx.quadraticCurveTo(points[points.length - 2].x, points[points.length - 2].y, points[points.length - 1].x, points[points.length - 1].y); 
                else ctx.lineTo(points[1].x, points[1].y); 
                ctx.stroke(); 
                
                // Add inner bright stroke
                if (shape.strokeWidth > 3) {
                    ctx.shadowBlur = 0;
                    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                    ctx.lineWidth = (shape.strokeWidth / scale) * 0.3;
                    ctx.stroke();
                }
            } 
            ctx.restore();
            break;
        case 'line': 
            ctx.save();
            ctx.shadowColor = 'rgba(0,0,0,0.5)';
            ctx.shadowBlur = 6;
            ctx.shadowOffsetY = 2;
            if (shape.isDashed) {
                ctx.setLineDash([(shape.strokeWidth / scale) * 2, (shape.strokeWidth / scale) * 1.5]);
            }
            ctx.moveTo(p1.x, p1.y); 
            ctx.lineTo(p2.x, p2.y); 
            ctx.stroke(); 
            
            if (shape.strokeWidth > 3) {
                ctx.shadowBlur = 0;
                ctx.strokeStyle = 'rgba(255,255,255,0.4)';
                ctx.lineWidth = (shape.strokeWidth / scale) * 0.3;
                ctx.stroke();
            }
            ctx.restore();
            break;
        case 'arrow': 
            if (shape.isFreehand) {
                drawFreehandArrow(ctx, points, shape.color, shape.strokeWidth / scale, shape.isDashed || false, shape.timestamp, false, unifiedProgress); 
            } else if (shape.isCurved) {
                drawCurvedRun(ctx, points, shape.color, shape.strokeWidth / scale, shape.isDashed || false, shape.timestamp, false, unifiedProgress);
            } else {
                drawProArrow(ctx, p1, p2, shape.color, shape.strokeWidth / scale, shape.isDashed || false, shape.timestamp, false, unifiedProgress); 
            }
            break;
        case 'curved-arrow':
            drawCurvedArrow(ctx, points, shape.color, shape.strokeWidth / scale, shape.isDashed || false, shape.timestamp, renderMode, unifiedProgress);
            break;
        case 'curved-run-arrow':
            drawCurvedRun(ctx, points, shape.color, shape.strokeWidth / scale, shape.isDashed || false, shape.timestamp, false, unifiedProgress);
            break;
        case 'circle': const radius = (shape.ringConfig as any)?.size || (shape.points.length >= 2 ? getDistance(p1, p2) : 50); draw3DRing(ctx, p1.x, p1.y, radius, shape.color, shape.ringConfig?.tilt ?? 65, shape.strokeWidth / scale, shape.timestamp, false, shape.ringConfig, unifiedProgress); break;
        case 'polygon': 
            if (shape.polygonConfig?.mode === 'radar' || shape.radarConfig) {
                drawRadar(ctx, shape, scale, renderMode, ffAlpha, unifiedProgress);
            } else {
                drawPolygon(ctx, shape, scale, renderMode, ffAlpha, unifiedProgress);
            }
            break;
        case 'radar':
            drawRadar(ctx, shape, scale, renderMode, ffAlpha, unifiedProgress);
            break;
        case 'connected-circle': const now = Date.now(); if (shape.isClosed && shape.isFilled && points.length > 2) { ctx.save(); ctx.beginPath(); ctx.moveTo(points[0].x, points[0].y); points.slice(1).forEach(p => ctx.lineTo(p.x, p.y)); ctx.closePath(); const gradient = ctx.createLinearGradient(points[0].x, points[0].y, points[2]?.x || points[0].x, points[2]?.y || points[0].y); gradient.addColorStop(0, fadeColor(shape.color, 0.4)); gradient.addColorStop(1, fadeColor(shape.color, 0.1)); ctx.fillStyle = gradient; ctx.fill(); ctx.restore(); } if (points.length > 1) { for (let i = 0; i < points.length - 1; i++) { const c1 = points[i]; const c2 = points[i + 1]; const startTime = c2.timestamp || shape.timestamp || 0; const pulseAge = Math.max(0, now - startTime); drawTangentLine(ctx, c1, c2, c1.r || ringSettings.size, c2.r || ringSettings.size, shape.color, 0, unifiedProgress !== undefined ? Math.max(0, unifiedProgress) : 1, pulseAge, false, shape.ringConfig?.tilt ?? 65, shape.ringConfig); } if (shape.isClosed) { const last = points[points.length - 1]; const first = points[0]; const startTime = shape.timestamp || 0; const pulseAge = Math.max(0, now - startTime); drawTangentLine(ctx, last, first, last.r || ringSettings.size, first.r || ringSettings.size, shape.color, 0, unifiedProgress !== undefined ? Math.max(0, unifiedProgress) : 1, pulseAge, false, shape.ringConfig?.tilt ?? 65, shape.ringConfig); } } points.forEach(p => { draw3DRing(ctx, p.x, p.y, p.r || ringSettings.size, shape.color, shape.ringConfig?.tilt ?? 65, shape.strokeWidth / scale, p.timestamp || shape.timestamp, false, shape.ringConfig, unifiedProgress); }); break;
        case 'player-move': 
          if (shape.box && points.length >= 2) { 
            const originCenter = points[0]; 
            const destCenter = points[1]; 
            const { w, h } = shape.box; 
            const isValidImage = (src: any) => src && (src instanceof HTMLImageElement || src instanceof HTMLCanvasElement || src instanceof ImageBitmap || src instanceof HTMLVideoElement || src instanceof OffscreenCanvas);
            if (isValidImage(shape.bgImg)) ctx.drawImage(shape.bgImg as any, shape.box.x, shape.box.y, w, h); 
            const pmDuration = 800;
            const pmProgress = shape.timestamp ? Math.max(0, Math.min(1, (Date.now() - shape.timestamp) / pmDuration)) : 1;
            const currentX = originCenter.x + (destCenter.x - originCenter.x) * pmProgress;
            const currentY = originCenter.y + (destCenter.y - originCenter.y) * pmProgress;
            const currentEnd = { x: currentX, y: currentY };
            ctx.beginPath(); 
            ctx.strokeStyle = shape.color; 
            ctx.lineWidth = shape.strokeWidth / scale; 
            ctx.shadowColor = 'rgba(0,0,0,0.5)'; 
            ctx.shadowBlur = 6; 
            ctx.shadowOffsetY = 4;
            ctx.setLineDash([10, 10]);
            ctx.lineDashOffset = -((Date.now() / 1000) * 40);
            ctx.moveTo(originCenter.x, originCenter.y); 
            ctx.lineTo(currentEnd.x, currentEnd.y); 
            ctx.stroke(); 
            ctx.shadowBlur = 0; 
            ctx.shadowOffsetY = 0; 
            ctx.setLineDash([]);
            if (pmProgress > 0.1) {
              drawArrowHead(ctx, originCenter, currentEnd, (shape.strokeWidth * 4) / scale); 
            }
            if (isValidImage(shape.img)) {
                ctx.save(); 
                ctx.shadowColor = 'rgba(0,0,0,0.8)'; 
                ctx.shadowBlur = 15; 
                ctx.shadowOffsetY = 10; 
                ctx.beginPath(); 
                ctx.ellipse(currentEnd.x, currentEnd.y + h/2.5, w/3, w/8, 0, 0, Math.PI * 2); 
                ctx.fillStyle = 'rgba(0,0,0,0.6)'; 
                ctx.fill(); 
                const bobbing = Math.sin(Date.now() / 200) * 5;
                ctx.drawImage(shape.img as any, currentEnd.x - w/2, currentEnd.y - h/2 + bobbing, w, h); 
                ctx.restore(); 
            }
          } 
          break;
        
        case 'spotlight': 
            ctx.save();
            if (unifiedProgress !== undefined && unifiedProgress < 1) {
                ctx.beginPath();
                ctx.rect(0, 0, 1920, 1080 * unifiedProgress);
                ctx.clip();
            }
            if (shape.spotlightConfig) drawSpotlight(ctx, points[0].x, points[0].y, shape.spotlightConfig.size, shape.spotlightConfig.intensity, shape.spotlightConfig.rotation, shape.spotlightConfig.particles, shape.timestamp); 
            ctx.restore();
            break;

        case 'name-tag': 
            if (shape.text || shape.playerNumber) {
                drawNameTag(
                    ctx, 
                    points[0], 
                    shape.text || '', 
                    shape.color, 
                    scale, 
                    shape.timestamp, 
                    shape.strokeWidth, 
                    false, 
                    unifiedProgress,
                    shape.playerNumber || shape.nameTagConfig?.playerNumber,
                    {
                        uppercase: shape.nameTagConfig?.uppercase !== false,
                        showNumber: shape.nameTagConfig?.showNumber !== false,
                    }
                ); 
            }
            break;
        case 'text': if (shape.text && shape.textConfig) drawText(ctx, points[0], shape.text, shape.color, scale, shape.timestamp, shape.textConfig, false, unifiedProgress); break;
        case 'scanner':
            drawScanner(ctx, shape, scale, renderMode, ffAlpha, unifiedProgress, shape.id === selectedShapeId);
            break;
    }
    ctx.restore();
    ctx.restore();
  };

  useEffect(() => {
    const syncSize = () => {
      const dpr = window.devicePixelRatio || 1;
      if (containerRef.current && canvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        canvasRef.current.width = clientWidth * dpr;
        canvasRef.current.height = clientHeight * dpr;
      }
      if (containerRef.current && ghostCanvasRef.current) {
        const { clientWidth, clientHeight } = containerRef.current;
        ghostCanvasRef.current.width = clientWidth * dpr;
        ghostCanvasRef.current.height = clientHeight * dpr;
      }
    };
    const resizeObserver = new ResizeObserver(syncSize);
    if (containerRef.current) resizeObserver.observe(containerRef.current);
    window.addEventListener('resize', syncSize);
    syncSize();
    return () => {
        window.removeEventListener('resize', syncSize);
        resizeObserver.disconnect();
    };
  }, [videoUrl, isTimelineExpanded, isPresentationMode]);

  const handleColorRightClick = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    const input = document.createElement('input');
    input.type = 'color';
    input.value = colors.find(c => c.id === id)?.value || '#ffffff';
    input.onchange = (ev) => {
      const val = (ev.target as HTMLInputElement).value;
      setColors(prev => prev.map(c => c.id === id ? { ...c, value: val } : c));
    };
    input.click();
  };

  const renderPropertiesPanel = () => {
      const SectionHeader = ({ icon: Icon, title, subtitle, colorClass, bgClass, borderClass }: any) => (
          <div className="flex items-center gap-2 mb-2">
              <div className={`p-1 rounded border shadow-sm ${bgClass} ${borderClass}`}>
                  <Icon className={`w-3 h-3 ${colorClass}`} />
              </div>
              <div>
                  <h3 className="text-[11px] font-bold text-gray-100 tracking-tight leading-none">{title}</h3>
                  <p className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider leading-none mt-0.5">{subtitle}</p>
              </div>
          </div>
      );

      const RangeSlider = ({ label, value, onChange, min, max, step, unit, accentClass }: any) => (
          <div className="space-y-1.5">
              <div className="flex justify-between items-center">
                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
                  <span className="text-[10px] font-mono text-gray-300 bg-[#1a1a1c] px-1.5 py-0.5 rounded border border-[#2a2a2c]">{value}{unit}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} className={`w-full h-1 bg-[#2a2a2c] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full ${accentClass}`} />
          </div>
      );

      const ToggleSwitch = ({ checked, onChange, colorClass }: any) => (
          <button onClick={onChange} className={`w-7 h-4 rounded-full relative transition-colors shrink-0 ${checked ? colorClass : 'bg-[#2a2a2c] hover:bg-[#333]'}`}>
              <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${checked ? 'left-3.5' : 'left-0.5'}`} />
          </button>
      );

      if (tool === null) {
          return (
              <div className="space-y-1.5 animate-in fade-in duration-200">
                  <SectionHeader icon={Snowflake} title="Freeze Frames" subtitle="Persistent Telestrations" colorClass="text-[#c6ff1f]" bgClass="bg-[#c6ff1f]/10" borderClass="border-[#c6ff1f]/20" />
                  
                  {/* In-Property-Panel Undo Notification Banner for Deleted Freeze Frames */}
                  {deletedFFStack.length > 0 && (
                      <div className="relative rounded-lg bg-gradient-to-b from-[#1c1816] to-[#141212] border border-amber-500/40 p-2 shadow-lg overflow-hidden animate-in fade-in slide-in-from-top-1 duration-200">
                          <div className="flex items-start justify-between gap-1.5 mb-1.5">
                              <div className="flex items-center gap-1.5 min-w-0">
                                  <div className="w-4 h-4 rounded bg-red-500/20 border border-red-500/40 flex items-center justify-center shrink-0">
                                      <Snowflake className="w-2.5 h-2.5 text-red-400" />
                                  </div>
                                  <div className="min-w-0">
                                      <div className="flex items-center gap-1">
                                          <span className="text-[10px] font-bold text-gray-200 leading-tight">
                                              {deletedFFStack.length > 1 ? `${deletedFFStack.length} frames deleted` : 'Frame deleted'}
                                          </span>
                                          {deletedFFStack.length > 1 && (
                                              <span className="text-[8px] font-mono font-bold text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1 rounded">
                                                  ×{deletedFFStack.length}
                                              </span>
                                          )}
                                      </div>
                                      <div className="text-[9px] text-gray-400 font-mono truncate">
                                          {deletedFFStack[deletedFFStack.length - 1].name} ({formatTime(deletedFFStack[deletedFFStack.length - 1].timestamp)})
                                      </div>
                                  </div>
                              </div>
                              
                              <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-[9px] font-mono font-bold text-amber-400 bg-black/40 border border-amber-500/30 px-1 py-0.5 rounded flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5 text-amber-400" />
                                      {ffRemainingSeconds}s
                                  </span>
                                  <button 
                                      onClick={dismissDeletedFFNotification} 
                                      className="p-0.5 text-gray-400 hover:text-white rounded hover:bg-white/10 transition-colors"
                                      title="Dismiss"
                                  >
                                      <X className="w-3 h-3" />
                                  </button>
                              </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                              <button
                                  onClick={undoDeleteFreezeFrame}
                                  className="flex-1 py-1 px-2 bg-[#c6ff1f] hover:bg-[#b5ee15] active:bg-[#a3d610] text-black text-[9px] font-bold rounded flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
                                  title="Restore most recently deleted frame (Ctrl+Z)"
                              >
                                  <Undo2 className="w-3 h-3 stroke-[2.5]" />
                                  <span>Undo {deletedFFStack.length > 1 ? 'Last' : ''}</span>
                              </button>
                              {deletedFFStack.length > 1 && (
                                  <button
                                      onClick={undoDeleteAllFreezeFrames}
                                      className="py-1 px-2 bg-amber-400/20 hover:bg-amber-400/30 text-amber-300 border border-amber-400/30 text-[9px] font-bold rounded flex items-center justify-center gap-1 transition-all active:scale-95 shadow-sm"
                                      title={`Restore all ${deletedFFStack.length} deleted freeze frames`}
                                  >
                                      <RotateCcw className="w-2.5 h-2.5" />
                                      <span>All ({deletedFFStack.length})</span>
                                  </button>
                              )}
                          </div>

                          {/* Countdown progress line */}
                          <div className="h-[2px] w-full bg-white/10 rounded-b overflow-hidden absolute bottom-0 left-0 right-0">
                              <div
                                  className="h-full bg-gradient-to-r from-amber-400 to-[#c6ff1f] transition-[width] duration-75 ease-linear"
                                  style={{ width: `${ffProgressPercent}%` }}
                              />
                          </div>
                      </div>
                  )}

                  {activeFreezeFrameId ? (
                      <div className="bg-[#10141f] border border-[#c6ff1f]/30 rounded-lg p-2.5 flex flex-col items-center justify-center space-y-1.5 shadow-inner">
                          <span className="text-[9px] font-bold text-[#c6ff1f] uppercase tracking-widest">Active Freeze</span>
                          <div className="text-3xl font-black text-white font-mono tracking-tighter">{countdownValue.toFixed(1)}s</div>
                          <div className="h-1 w-full bg-[#1e293b] rounded-full overflow-hidden mt-1">
                              <motion.div className="h-full bg-[#c6ff1f]" initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: countdownValue, ease: "linear" }} />
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-1.5">
                          <button onClick={addFreezeFrame} disabled={isPlaying} className="w-full py-1.5 bg-[#c6ff1f]/10 hover:bg-[#c6ff1f]/20 text-[#c6ff1f] border border-[#c6ff1f]/30 hover:border-[#c6ff1f]/50 rounded-md flex items-center justify-center gap-1.5 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all text-[10px] shadow-sm">
                              <PlusCircle className="w-3 h-3" /> Add Freeze Frame
                          </button>
                          <div className="space-y-1.5">
                              {freezeFrames.length === 0 && <div className="text-center py-6 text-gray-500 text-[9px] font-medium italic bg-[#141416] rounded-lg border border-[#222] border-dashed">Pause video to add frames</div>}
                              {(() => {
                                  const sortedFFs = [...freezeFrames].sort((a,b) => a.timestamp - b.timestamp);
                                  const nextFreezeFrameId = isPlaying ? sortedFFs.find(ff => ff.timestamp > currentTime)?.id : null;
                                  const halfDuration = (duration || 0) / 2;
                                  
                                  const renderFF = (ff: FreezeFrame, index: number) => {
                                      const isStuck = !isPlaying && Math.abs(currentTime - ff.timestamp) < 0.05;
                                      const isActive = activeFreezeFrameId === ff.id || isStuck;
                                      const isHovered = hoveredFreezeFrameId === ff.id;
                                      const isNext = isPlaying && ff.id === nextFreezeFrameId;
                                      
                                      let containerClasses = "flex items-center justify-between rounded-md p-1.5 transition-all cursor-pointer relative z-10 ";
                                      if (isActive) {
                                          containerClasses += "bg-amber-500/10 border border-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.3)]";
                                      } else if (isHovered) {
                                          containerClasses += "bg-[#1a1e2b] border border-[#c6ff1f] shadow-[0_0_8px_rgba(59,130,246,0.3)]";
                                      } else if (isNext) {
                                          containerClasses += "bg-[#141416] border border-emerald-500/60 shadow-[0_0_8px_rgba(16,185,129,0.2)] animate-pulse";
                                      } else {
                                          containerClasses += "bg-[#141416] border border-[#262629] hover:border-[#3a3a3f]";
                                      }

                                      let badgeClasses = "w-3.5 h-3.5 rounded flex items-center justify-center text-[8px] font-bold border ";
                                      if (isActive) {
                                          badgeClasses += "bg-amber-500/20 text-amber-400 border-amber-500/30";
                                      } else if (isNext) {
                                          badgeClasses += "bg-emerald-500/20 text-emerald-400 border-emerald-500/30";
                                      } else {
                                          badgeClasses += "bg-[#c6ff1f]/20 text-[#c6ff1f] border-[#c6ff1f]/30";
                                      }

                                      let textClasses = "font-mono text-[9px] font-medium ";
                                      if (isActive) {
                                          textClasses += "text-amber-400";
                                      } else if (isNext) {
                                          textClasses += "text-emerald-400";
                                      } else {
                                          textClasses += "text-[#c6ff1f] hover:text-[#a0d600]";
                                      }

                                      return (
                                          <div key={ff.id} className="relative group/ffitem">
                                              <div 
                                                  id={`ff-item-${ff.id}`}
                                                  className={containerClasses}
                                                  onMouseEnter={() => {
                                                      setHoveredFreezeFrameId(ff.id);
                                                  }}
                                                  onMouseLeave={() => {
                                                      setHoveredFreezeFrameId(null);
                                                  }}
                                                  onClick={() => { handleManualSeek(ff.timestamp); if(videoRef.current) { videoRef.current.pause(); setIsPlaying(false); } }}
                                              >
                                                  <div className="flex items-center gap-1.5">
                                                      <div className={badgeClasses}>
                                                          {index + 1}
                                                      </div>
                                                      <div className={textClasses}>
                                                          {formatTime(ff.timestamp)}
                                                      </div>
                                                  </div>
                                                  
                                                  <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                                                      <div className="flex items-center bg-[#0a0a0c] border border-[#2a2a2c] rounded overflow-hidden shadow-inner opacity-80 hover:opacity-100 transition-opacity">
                                                          <button onClick={() => updateFreezeFrameDuration(ff.id, Math.max(1, ff.duration - 0.5))} className="px-1 py-0.5 hover:bg-[#222] text-gray-400 hover:text-white transition-colors border-r border-[#2a2a2c]"><Minus className="w-2 h-2" /></button>
                                                          <div className="w-6 text-center text-[9px] font-mono font-semibold text-gray-200">{ff.duration}s</div>
                                                          <button onClick={() => updateFreezeFrameDuration(ff.id, Math.min(60, ff.duration + 0.5))} className="px-1 py-0.5 hover:bg-[#222] text-gray-400 hover:text-white transition-colors border-l border-[#2a2a2c]"><Plus className="w-2 h-2" /></button>
                                                      </div>
                                                      <button onClick={(e) => { e.stopPropagation(); if (videoRef.current) { videoRef.current.currentTime = ff.timestamp; videoRef.current.pause(); } setCurrentTime(ff.timestamp); setIsPlaying(false); setAnimationPreviewTime(0); setIsAnimationPreviewPlaying(false); setTimeout(() => setEditingAnimationFFId(ff.id), 0); }} className="p-0.5 text-gray-500 hover:text-[#c6ff1f] hover:bg-[#a0d600]/10 rounded transition-colors" title="Edit Animation Timeline"><LayoutGrid className="w-2.5 h-2.5" /></button>
                                                      <button onClick={(e) => { e.stopPropagation(); deleteFreezeFrame(ff.id); }} className="p-0.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors" title="Delete"><Trash2 className="w-2.5 h-2.5" /></button>
                                                  </div>
                                              </div>
                                          </div>
                                      );
                                  };

                                  const firstHalf = sortedFFs.filter(ff => ff.timestamp <= halfDuration);
                                  const secondHalf = sortedFFs.filter(ff => ff.timestamp > halfDuration);

                                  return (
                                      <div className="space-y-2.5">
                                          {firstHalf.length > 0 && (
                                              <div className="space-y-1.5">
                                                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-1">First Half</div>
                                                  <div className="space-y-1.5">
                                                      {firstHalf.map((ff) => renderFF(ff, sortedFFs.indexOf(ff)))}
                                                  </div>
                                              </div>
                                          )}
                                          {secondHalf.length > 0 && (
                                              <div className="space-y-1.5">
                                                  <div className="text-[9px] font-bold text-gray-500 uppercase tracking-wider px-1">Second Half</div>
                                                  <div className="space-y-1.5">
                                                      {secondHalf.map((ff) => renderFF(ff, sortedFFs.indexOf(ff)))}
                                                  </div>
                                              </div>
                                          )}
                                      </div>
                                  );
                              })()}
                          </div>
                      </div>
                  )}
              </div>
          );
      }

      if (tool === 'masking') {
          return (
              <MaskingPanel
                  maskSettings={maskSettings}
                  setMaskSettings={setMaskSettings}
                  isPickingColor={isPickingColor}
                  setIsPickingColor={setIsPickingColor}
                  isProcessingMask={isProcessingMask}
                  onRemoveColor={removeColor}
              />
          );
      }

      if (tool === 'spotlight') {
          return (
              <div className="space-y-3 animate-in fade-in duration-200">
                  <SectionHeader icon={Flashlight} title="Spotlight" subtitle="Focus Attention" colorClass="text-yellow-400" bgClass="bg-yellow-500/10" borderClass="border-yellow-500/20" />
                  <div className="space-y-4 pt-1">
                      <RangeSlider label="Radius Size" value={spotlightSettings.size} onChange={(e: any) => setSpotlightSettings({...spotlightSettings, size: parseInt(e.target.value)})} min={20} max={150} step={1} unit="px" accentClass="[&::-webkit-slider-thumb]:bg-yellow-500" />
                      <RangeSlider label="Intensity" value={spotlightSettings.intensity} onChange={(e: any) => setSpotlightSettings({...spotlightSettings, intensity: parseFloat(e.target.value)})} min={0.1} max={1} step={0.05} unit="x" accentClass="[&::-webkit-slider-thumb]:bg-yellow-500" />
                      <RangeSlider label="Rotation" value={spotlightSettings.rotation} onChange={(e: any) => setSpotlightSettings({...spotlightSettings, rotation: parseFloat(e.target.value)})} min={0.1} max={1} step={0.05} unit="rad" accentClass="[&::-webkit-slider-thumb]:bg-yellow-500" />
                  </div>
              </div>
          )
      }

      if (tool === 'lens') {
          return (
              <div className="space-y-3 animate-in fade-in duration-200">
                  <SectionHeader icon={ZoomIn} title="Zoom Lens" subtitle="Magnify Details" colorClass="text-cyan-400" bgClass="bg-cyan-500/10" borderClass="border-cyan-500/20" />
                  <div className="space-y-4 pt-1">
                      <RangeSlider label="Radius Size" value={lensSettings.size} onChange={(e: any) => setLensSettings({...lensSettings, size: parseInt(e.target.value)})} min={40} max={150} step={1} unit="px" accentClass="[&::-webkit-slider-thumb]:bg-cyan-500" />
                      <RangeSlider label="Magnification" value={lensSettings.zoom} onChange={(e: any) => setLensSettings({...lensSettings, zoom: parseFloat(e.target.value)})} min={1.5} max={4.0} step={0.1} unit="x" accentClass="[&::-webkit-slider-thumb]:bg-cyan-500" />
                  </div>
              </div>
          )
      }

      if (tool === 'polygon') {
          return (
              <PolygonPanel
                  settings={polygonSettings}
                  onChange={setPolygonSettings}
              />
          );
      }

      if (tool === 'scanner') {
          return (
              <ScannerPanel
                  settings={scannerSettings}
                  onChange={setScannerSettings}
                  activeColorId={activeColorId}
                  colors={colors}
                  onSelectColorId={setActiveColorId}
              />
          );
      }

      if (tool === 'name-tag') {
          return (
              <PlayerTagPanel
                  settings={nameTagSettings}
                  onChange={setNameTagSettings}
                  colors={colors}
                  activeColorId={activeColorId}
                  onSelectColorId={setActiveColorId}
              />
          );
      }

      if (tool === 'text') {
          return (
              <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-200">
                  <SectionHeader icon={Type} title="Text Tool" subtitle="Add text to canvas" colorClass="text-pink-400" bgClass="bg-pink-500/10" borderClass="border-pink-500/20" />
                  
                  <div className="space-y-4">
                      <div className="space-y-1.5">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Text Content</label>
                          <textarea 
                              className="w-full bg-[#141416] border border-[#262629] rounded-lg p-2 text-white text-xs focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 resize-none shadow-inner font-medium transition-all" 
                              rows={2}
                              value={textSettings.text}
                              onChange={(e) => setTextSettings({...textSettings, text: e.target.value})}
                              placeholder="Enter text..."
                          />
                      </div>

                      <div className="space-y-2 pb-3 border-b border-[#262629]">
                          <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Preset Texts</label>
                          
                          <div className="flex gap-1.5 shrink-0">
                              <input type="text" value={presetBulkText} onChange={(e) => setPresetBulkText(e.target.value)} onKeyDown={(e) => {
                                  if (e.key === 'Enter' && presetBulkText.trim()) {
                                      const newTexts = presetBulkText.split(';').map(n => n.trim()).filter(Boolean).map(n => ({ id: Date.now().toString() + Math.random(), text: n }));
                                      setPresetTexts(prev => [...prev, ...newTexts]);
                                      setPresetBulkText('');
                                  }
                              }} className="flex-1 min-w-0 bg-[#0a0a0c] border border-[#262629] rounded-md px-2 py-1 text-[10px] font-medium text-white focus:outline-none focus:border-pink-500 transition-all shadow-inner" placeholder="Add preset (use ; for multiple)" />
                              <button onClick={() => {
                                   if (presetBulkText.trim()) {
                                      const newTexts = presetBulkText.split(';').map(n => n.trim()).filter(Boolean).map(n => ({ id: Date.now().toString() + Math.random(), text: n }));
                                      setPresetTexts(prev => [...prev, ...newTexts]);
                                      setPresetBulkText('');
                                  }
                              }} className="p-1 transition-colors bg-pink-600 hover:bg-pink-500 text-white rounded-md shrink-0 shadow-sm"><Plus className="w-3.5 h-3.5" /></button>
                          </div>

                          <div className="space-y-1 max-h-32 overflow-y-auto pr-1 custom-scrollbar">
                              {presetTexts.map((preset) => (
                                  <div key={preset.id} className={`flex flex-col bg-[#1a1a1c] border rounded-md transition-all ${textSettings.text === preset.text ? 'border-pink-500/50 bg-pink-500/10 shadow-sm' : 'border-[#2a2a2c] hover:border-[#3a3a3f]'}`}>
                                      <div className="flex items-center justify-between p-1.5 cursor-pointer" onClick={() => setTextSettings(prev => ({...prev, text: preset.text}))}>
                                          <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                              {editingPresetId === preset.id ? (
                                                  <input type="text" autoFocus value={preset.text} onClick={e => e.stopPropagation()} onBlur={() => setEditingPresetId(null)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingPresetId(null); }} onChange={e => {
                                                      const val = e.target.value;
                                                      setPresetTexts(prev => prev.map(p => p.id === preset.id ? {...p, text: val} : p));
                                                      if (textSettings.text === preset.text) {
                                                          setTextSettings(prev => ({...prev, text: val}));
                                                      }
                                                  }} className="bg-[#0a0a0c] border border-pink-500/50 rounded px-1 outline-none text-[10px] font-semibold text-white w-full truncate py-0.5" />
                                              ) : (
                                                  <span className="text-[10px] font-semibold text-gray-200 w-full truncate tracking-wide leading-none">{preset.text}</span>
                                              )}
                                          </div>
                                          <div className="flex items-center shrink-0">
                                              <button onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingPresetId(preset.id);
                                              }} className="p-1 ml-0.5 text-gray-500 hover:text-white hover:bg-[#333] rounded transition-colors" title="Edit">
                                                  <Edit2 className="w-3 h-3" />
                                              </button>
                                              <button onClick={(e) => {
                                                  e.stopPropagation();
                                                  setExpandedPresetId(expandedPresetId === preset.id ? null : preset.id);
                                              }} className="p-1 ml-0.5 text-gray-500 hover:text-white hover:bg-[#333] rounded transition-colors" title="Expand">
                                                  {expandedPresetId === preset.id ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                              </button>
                                              <button onClick={(e) => {
                                                  e.stopPropagation();
                                                  setPresetTexts(prev => prev.filter(p => p.id !== preset.id));
                                              }} className="p-1 ml-0.5 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded transition-colors" title="Delete">
                                                  <Trash2 className="w-3 h-3" />
                                              </button>
                                          </div>
                                      </div>
                                      {expandedPresetId === preset.id && (
                                          <div className="p-2 border-t border-[#2a2a2c] bg-[#141416] rounded-b-md">
                                              <textarea
                                                  className="w-full bg-[#0a0a0c] border border-[#2a2a2c] rounded-md p-1.5 text-[10px] font-medium text-gray-300 focus:outline-none focus:border-pink-500 resize-none h-12 shadow-inner"
                                                  value={preset.text}
                                                  onClick={e => e.stopPropagation()}
                                                  onChange={e => {
                                                      const val = e.target.value;
                                                      setPresetTexts(prev => prev.map(p => p.id === preset.id ? {...p, text: val} : p));
                                                      if (textSettings.text === preset.text) {
                                                          setTextSettings(prev => ({...prev, text: val}));
                                                      }
                                                  }}
                                              />
                                          </div>
                                      )}
                                  </div>
                              ))}
                              {presetTexts.length === 0 && <div className="text-[9px] text-center text-gray-500 py-2 italic font-medium border border-dashed border-[#333] rounded-md">No presets</div>}
                          </div>
                      </div>

                      <div className="space-y-4 pb-3 border-b border-[#262629]">
                         <RangeSlider label="Font Size" value={textSettings.fontSize} onChange={(e: any) => setTextSettings({...textSettings, fontSize: parseInt(e.target.value)})} min={8} max={100} step={1} unit="px" accentClass="[&::-webkit-slider-thumb]:bg-pink-500" />
                         
                         <div className="space-y-1.5">
                             <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Animation</label>
                             <div className="flex gap-1 p-0.5 bg-[#141416] rounded-md border border-[#262629]">
                                 {(['none', 'fade', 'scale', 'type'] as const).map(anim => (
                                     <button 
                                       key={anim} 
                                       onClick={() => setTextSettings({...textSettings, animation: anim})}
                                       className={`flex-1 py-1 rounded-[4px] text-[9px] font-bold uppercase tracking-wider transition-all shadow-sm ${textSettings.animation === anim ? 'bg-pink-600 text-white' : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-[#222]'}`}
                                     >
                                         {anim}
                                     </button>
                                 ))}
                             </div>
                         </div>
                      </div>

                      <div className="space-y-3">
                          <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Text Color</label>
                              <div className="flex gap-1.5 flex-wrap">
                                  {colors.map(c => (
                                      <button key={`text-c-${c.id}`} onClick={() => setTextSettings({...textSettings, colorId: c.id})} className={`w-4 h-4 rounded-full border-[1.5px] transition-transform shadow-sm ${textSettings.colorId === c.id ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c.value }} title={c.value} />
                                  ))}
                              </div>
                          </div>

                          <label className="flex items-center justify-between cursor-pointer p-2 bg-[#141416] border border-[#262629] rounded-lg hover:border-[#3a3a3f] transition-all">
                              <span className="text-[10px] font-bold text-gray-200 tracking-wide">Background Solid</span>
                              <ToggleSwitch checked={textSettings.bgEnabled} onChange={() => setTextSettings({...textSettings, bgEnabled: !textSettings.bgEnabled})} colorClass="bg-pink-500" />
                          </label>
                          
                          {textSettings.bgEnabled && (
                              <div className="space-y-1.5 pt-1 animate-in fade-in slide-in-from-top-2">
                                  <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Background Color</label>
                                  <div className="flex gap-1.5 flex-wrap bg-[#141416] p-2 rounded-lg border border-[#262629]">
                                      {colors.map(c => (
                                          <button key={`bg-c-${c.id}`} onClick={() => setTextSettings({...textSettings, bgColorId: c.id})} className={`w-4 h-4 rounded-[4px] border-[1.5px] transition-transform shadow-sm ${textSettings.bgColorId === c.id ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c.value }} title={c.value} />
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          );
      }

      // Default Drawing Tools
      let headerIcon = Pen;
      let headerTitle = "Drawing Tools";
      if (tool === 'pen') { headerIcon = Pen; headerTitle = "Pen Tool"; }
      else if (tool === 'line') { headerIcon = Minus; headerTitle = "Line Tool"; }
      else if (tool === 'arrow') { headerIcon = MoveUpRight; headerTitle = "Arrow Tool"; }
      else if (tool === 'curved-arrow') { headerIcon = CornerUpRight; headerTitle = "Aerial Arrow"; }
      else if (tool === 'circle') { headerIcon = Circle; headerTitle = "Ring Tool"; }
      else if (tool === 'connected-circle') { headerIcon = GitCommitVertical; headerTitle = "Chain Tool"; }

      return (
          <div className="space-y-3 animate-in fade-in duration-200">
              <SectionHeader icon={headerIcon} title={headerTitle} subtitle="Customize Stroke" colorClass="text-[#c6ff1f]" bgClass="bg-[#c6ff1f]/10" borderClass="border-[#c6ff1f]/20" />
              
              <div className="space-y-3">
                  {['circle', 'connected-circle'].includes(tool || '') ? (
                      <RangeSlider label="Stroke Width" value={ringStrokeWidth} onChange={(e: any) => setRingStrokeWidth(parseInt(e.target.value))} min={0} max={2} step={1} unit="px" accentClass="[&::-webkit-slider-thumb]:bg-[#c6ff1f]" />
                  ) : (
                      <RangeSlider label="Tool Size" value={toolSize} onChange={(e: any) => setToolSize(parseInt(e.target.value))} min={1} max={20} step={1} unit="px" accentClass="[&::-webkit-slider-thumb]:bg-[#c6ff1f]" />
                  )}
                  
                  {(tool === 'pen' || tool === 'arrow' || tool === 'curved-arrow') && (
                      <div className="space-y-2 pt-3 border-t border-[#262629]">
                          <label className="flex items-center justify-between cursor-pointer p-2 bg-[#141416] border border-[#262629] rounded-lg hover:border-[#3a3a3f] transition-all">
                              <span className="text-[10px] font-bold text-gray-200 tracking-wide">Dashed Line</span>
                              <ToggleSwitch checked={arrowSettings.isDashed} onChange={() => setArrowSettings({...arrowSettings, isDashed: !arrowSettings.isDashed})} colorClass="bg-[#c6ff1f]" />
                          </label>
                          {tool === 'arrow' && (
                              <label className="flex items-center justify-between cursor-pointer p-2 bg-[#141416] border border-[#262629] rounded-lg hover:border-[#3a3a3f] transition-all">
                                  <span className="text-[10px] font-bold text-gray-200 tracking-wide">Curved Arrow</span>
                                  <ToggleSwitch checked={arrowSettings.isCurved} onChange={() => setArrowSettings({...arrowSettings, isCurved: !arrowSettings.isCurved})} colorClass="bg-[#c6ff1f]" />
                              </label>
                          )}
                          {tool === 'pen' && (
                              <label className="flex items-center justify-between cursor-pointer p-2 bg-[#141416] border border-[#262629] rounded-lg hover:border-[#3a3a3f] transition-all">
                                  <span className="text-[10px] font-bold text-gray-200 tracking-wide">Freehand Mode</span>
                                  <ToggleSwitch checked={arrowSettings.isFreehand} onChange={() => setArrowSettings({...arrowSettings, isFreehand: !arrowSettings.isFreehand})} colorClass="bg-[#c6ff1f]" />
                              </label>
                          )}
                      </div>
                  )}

                  {(tool === 'circle' || tool === 'connected-circle') && (
                      <div className="space-y-3 pt-3 border-t border-[#262629]">
                          <RangeSlider label="Ring Size" value={ringSettings.size} onChange={(e: any) => setRingSettings({...ringSettings, size: parseInt(e.target.value)})} min={10} max={200} step={1} unit="px" accentClass="[&::-webkit-slider-thumb]:bg-[#c6ff1f]" />
                          <RangeSlider label="3D Tilt" value={ringSettings.tilt} onChange={(e: any) => setRingSettings({...ringSettings, tilt: parseInt(e.target.value)})} min={0} max={85} step={1} unit="°" accentClass="[&::-webkit-slider-thumb]:bg-[#c6ff1f]" />
                          
                          <div className="space-y-1.5">
                              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Outline Color</label>
                              <div className="flex gap-1.5 flex-wrap bg-[#141416] p-2 rounded-lg border border-[#262629]">
                                  {['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000'].map(c => (
                                      <button key={c} onClick={() => setRingSettings({...ringSettings, outlineColor: c})} className={`w-5 h-5 rounded-full border-2 transition-transform shadow-sm ${ringSettings.outlineColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c }} />
                                  ))}
                              </div>
                          </div>
                          
                          {tool === 'connected-circle' && (
                              <label className="flex items-center justify-between cursor-pointer p-2 bg-[#141416] border border-[#262629] rounded-lg hover:border-[#3a3a3f] transition-all">
                                  <span className="text-[10px] font-bold text-gray-200 tracking-wide">Filled Shape</span>
                                  <ToggleSwitch checked={ringSettings.isFilled} onChange={() => setRingSettings({...ringSettings, isFilled: !ringSettings.isFilled})} colorClass="bg-[#c6ff1f]" />
                              </label>
                          )}
                          
                          <div className="pt-3 border-t border-[#262629] space-y-2">
                              <label className="flex items-center justify-between cursor-pointer p-2 bg-[#141416] border border-[#262629] rounded-lg hover:border-[#3a3a3f] transition-all">
                                  <span className="text-[10px] font-bold text-gray-200 tracking-wide">Secondary Inner Ring</span>
                                  <ToggleSwitch checked={ringSettings.secondaryRing} onChange={() => setRingSettings({...ringSettings, secondaryRing: !ringSettings.secondaryRing})} colorClass="bg-[#c6ff1f]" />
                              </label>
                              
                              {ringSettings.secondaryRing && (
                                  <div className="space-y-1.5 pl-1 animate-in fade-in slide-in-from-top-2">
                                      <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">Secondary Color</label>
                                      <div className="flex gap-1.5 flex-wrap">
                                          {colors.map(c => (
                                              <button key={c.id} onClick={() => setRingSettings({...ringSettings, secondaryColor: c.value})} className={`w-4 h-4 rounded-full border-2 transition-transform shadow-sm ${ringSettings.secondaryColor === c.value ? 'border-white scale-110' : 'border-transparent hover:scale-105'}`} style={{ backgroundColor: c.value }} />
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  };

  const openExternalWindow = (type: 'timer' | 'pad') => {
    const width = type === 'timer' ? 440 : 680;
    const height = type === 'timer' ? 320 : 640;
    const left = Math.max(0, window.screen.width - width - 60);
    const top = 80;
    
    try {
      const win = window.open(
        'about:blank',
        `Popout_${type}_${Date.now()}`,
        `width=${width},height=${height},left=${left},top=${top},resizable=yes,scrollbars=yes,status=no,toolbar=no,menubar=no`
      );
      
      if (win) {
        win.document.title = type === 'timer' ? 'Live Match Timer' : 'Tactical Tagging Pad';
        win.document.body.style.margin = '0';
        win.document.body.style.backgroundColor = '#0e0e11';
        win.document.body.style.color = '#ffffff';
        win.document.body.style.fontFamily = 'system-ui, -apple-system, sans-serif';
        win.document.body.style.overflow = 'auto';

        const rootDiv = win.document.createElement('div');
        rootDiv.id = 'popout-window-root';
        rootDiv.style.minHeight = '100vh';
        rootDiv.style.display = 'flex';
        rootDiv.style.flexDirection = 'column';
        win.document.body.appendChild(rootDiv);

        // Copy styles to popup window
        Array.from(document.querySelectorAll('style, link[rel="stylesheet"]')).forEach((s) => {
          rootDiv.appendChild(s.cloneNode(true));
        });

        win.addEventListener('beforeunload', () => {
          if (type === 'timer') {
            setTimerExternalWindow(null);
            setExternalTimerContainer(null);
          } else {
            setPadExternalWindow(null);
            setExternalPadContainer(null);
          }
        });

        if (type === 'timer') {
          setTimerExternalWindow(win);
          setExternalTimerContainer(rootDiv);
          setIsTimerPoppedOut(false);
        } else {
          setPadExternalWindow(win);
          setExternalPadContainer(rootDiv);
          setIsPadPoppedOut(false);
        }
        showNotification(`Popped out ${type === 'timer' ? 'Timer' : 'Coding Pad'} to separate browser window!`, '#c6ff1f');
        return;
      }
    } catch (e) {
      console.log("Browser window.open unavailable or blocked, falling back to floating widget overlay:", e);
    }

    // Fallback if popup blocked by iframe policy
    if (type === 'timer') {
      setIsTimerPoppedOut(true);
      showNotification("Timer popped out as draggable, resizable floating window near video!", "#c6ff1f");
    } else {
      setIsPadPoppedOut(true);
      showNotification("Coding Pad popped out as draggable, resizable floating window near video!", "#c6ff1f");
    }
  };

  const renderTimerWidgetContent = () => {
    return (
      <LiveTimerWidget
        clockDetails={liveClock.getMatchClockDetails()}
        clockState={liveClock.matchClockState}
        activePeriodId={liveClock.matchPeriod}
        periods={liveClock.periods}
        maxPeriodIndex={liveClock.maxPeriodIndex}
        periodSyncs={periodSyncs}
        isEditingTimer={liveClock.isEditingTimer}
        editedTimerValue={liveClock.editedTimerValue}
        onSetEditedTimerValue={liveClock.setEditedTimerValue}
        onStartEditing={liveClock.startEditingTimer}
        onCancelEditing={() => liveClock.setIsEditingTimer(false)}
        onSaveEditing={() => liveClock.handleSaveTimer()}
        onResume={liveClock.resumeLiveClock}
        onPause={liveClock.pauseLiveClock}
        onRequestPeriod={liveClock.requestStartLiveClock}
        onAdjustTime={liveClock.nudgeEditedTimer}
      />
    );
  };

  const renderCodingPanelContent = () => {
    // Count active attached labels across recordings
    const attachedCount = activeRecordings.reduce((acc, r) => acc + (r.labelIds?.length || 0), 0);

    const renderLabelButton = (l: Label) => {
      let isActiveLabel = false;
      if (isTaggingMode) {
        if (activeRecordings.length > 0) {
          isActiveLabel = activeRecordings.some((r) => r.labelIds?.includes(l.id));
        } else if (selectedEventIds.size > 0) {
          const selectedEvents = tagEvents.filter((e) => selectedEventIds.has(e.id));
          isActiveLabel = selectedEvents.every((e) => e.labelIds?.includes(l.id));
        }
      } else {
        isActiveLabel = filterLabelId === l.id;
      }

      return (
        <button
          key={l.id}
          type="button"
          onClick={() => handleLabelClick(l.id)}
          className={`px-2.5 py-1 rounded-md text-[10px] font-bold border transition-all flex items-center gap-1.5 cursor-pointer shadow-xs active:scale-95 ${
            isActiveLabel
              ? 'bg-[#c6ff1f]/20 border-[#c6ff1f] text-[#c6ff1f] shadow-[0_0_10px_rgba(198,255,31,0.2)] font-black ring-1 ring-[#c6ff1f]/50'
              : 'bg-[#18181d] hover:bg-[#25252c] border-[#2c2c36] text-gray-300 hover:text-white'
          }`}
          title={`${l.name}${l.shortcut ? ` [Key: ${l.shortcut}]` : ''} • Click to ${isTaggingMode ? 'attach/detach qualifier' : 'filter'}`}
        >
          <span
            className={`w-2 h-2 rounded-full shrink-0 ${
              isActiveLabel ? 'bg-[#c6ff1f] ring-2 ring-[#c6ff1f]/40' : 'bg-indigo-400'
            }`}
            style={{ backgroundColor: isActiveLabel ? '#c6ff1f' : ((l as any).color || undefined) }}
          />
          <span className="truncate max-w-[110px]">{l.name}</span>
          {l.shortcut && (
            <span className="text-[8px] font-mono opacity-70 bg-black/40 px-1 py-0.2 rounded border border-white/10 shrink-0">
              [{l.shortcut}]
            </span>
          )}
          {isActiveLabel && (
            <Check className="w-2.5 h-2.5 text-[#c6ff1f] shrink-0 ml-0.5" />
          )}
        </button>
      );
    };

    return (
      <div className="flex-1 flex flex-col min-h-0 bg-[#0c0c0e] text-white overflow-hidden select-none font-sans">
        {/* Sub-header with Tagging State & Controls - Clean, no settings button, no code file bar */}
        <div className="px-3 py-2 border-b border-[#222] bg-[#141418] flex items-center justify-between shrink-0 gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`text-[10px] font-bold uppercase tracking-wider flex items-center gap-1.5 ${
                isTaggingMode ? 'text-red-400' : 'text-gray-400'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${isTaggingMode ? 'bg-red-500 animate-pulse ring-2 ring-red-500/30' : 'bg-gray-600'}`} />
              {isTaggingMode ? 'Recording Active' : 'Tagging Idle'}
            </span>
            {activeRecordings.length > 0 && (
              <span className="px-1.5 py-0.5 bg-red-500/20 text-red-400 border border-red-500/30 rounded text-[9px] font-mono font-bold animate-pulse">
                {activeRecordings.length} rec
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                const nextMode = !isTaggingMode;
                setIsTaggingMode(nextMode);
                if (!nextMode) setActiveRecordings([]);
              }}
              className={`px-3 py-1 rounded text-[10px] font-bold uppercase transition-all cursor-pointer shadow-sm active:scale-95 ${
                isTaggingMode
                  ? 'bg-red-500 hover:bg-red-600 text-white'
                  : 'bg-[#222] hover:bg-[#333] text-gray-200 hover:text-white border border-[#333]'
              }`}
            >
              {isTaggingMode ? 'Stop Tagging' : 'Start Tagging'}
            </button>
          </div>
        </div>

        {/* Labels & Qualifiers Section (Expandable/Collapsible if user needs it) */}
        <div className="border-b border-[#222] bg-[#111115] shrink-0">
          <div className="px-3 py-1.5 flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setShowCodingPaneLabels(!showCodingPaneLabels)}
              className="flex items-center gap-1.5 text-left text-gray-300 hover:text-white cursor-pointer select-none group"
              title={showCodingPaneLabels ? "Collapse Labels Section" : "Expand Labels Section"}
            >
              <Tag className="w-3.5 h-3.5 text-[#c6ff1f] group-hover:scale-110 transition-transform" />
              <span className="text-[10px] font-bold uppercase tracking-wider text-gray-200">
                Labels & Qualifiers
              </span>
              <span className="px-1.5 py-0.2 bg-[#202026] text-gray-400 rounded text-[8.5px] font-mono font-bold">
                {labels.length}
              </span>
              {attachedCount > 0 && (
                <span className="px-1.5 py-0.2 bg-[#c6ff1f]/15 text-[#c6ff1f] border border-[#c6ff1f]/30 rounded text-[8.5px] font-bold">
                  {attachedCount} attached
                </span>
              )}
              <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${showCodingPaneLabels ? 'rotate-180' : ''}`} />
            </button>

            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => setLabelsEnabled(!labelsEnabled)}
                className={`text-[8.5px] font-bold uppercase px-2 py-0.5 rounded transition-all cursor-pointer ${
                  labelsEnabled
                    ? 'bg-[#c6ff1f]/15 text-[#c6ff1f] border border-[#c6ff1f]/40 shadow-xs'
                    : 'bg-[#18181c] text-gray-500 border border-[#2a2a32] hover:text-gray-400'
                }`}
                title="Toggle Label Mode (Allow attaching labels to recorded events)"
              >
                {labelsEnabled ? 'Labels ON' : 'Labels OFF'}
              </button>
            </div>
          </div>

          {showCodingPaneLabels && (
            <div className="px-3 pt-1 pb-2 bg-[#0e0e12] border-t border-[#1a1a20] max-h-48 overflow-y-auto custom-scrollbar">
              {labels.length === 0 ? (
                <div className="py-2.5 text-center text-[10px] text-gray-500 italic">
                  No labels in this template. Labels created in the sidebar appear here as live qualifiers.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {(() => {
                    const handledLabelIds = new Set<string>();
                    const groupsWithLabels = labelGroups
                      .map(g => ({
                        group: g,
                        labels: labels.filter(l => l.groupId === g.id)
                      }))
                      .filter(g => g.labels.length > 0);

                    groupsWithLabels.forEach(g => g.labels.forEach(l => handledLabelIds.add(l.id)));
                    const ungrouped = labels.filter(l => !handledLabelIds.has(l.id));

                    return (
                      <>
                        {groupsWithLabels.map(({ group, labels: grpLabels }) => (
                          <div key={group.id} className="flex flex-col gap-1">
                            <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                              <span className="w-1.5 h-1.5 rounded-full bg-indigo-400/80" />
                              <span>{group.name}</span>
                            </div>
                            <div className="flex flex-wrap gap-1.5">
                              {grpLabels.map((l) => renderLabelButton(l))}
                            </div>
                          </div>
                        ))}

                        {ungrouped.length > 0 && (
                          <div className="flex flex-col gap-1">
                            {groupsWithLabels.length > 0 && (
                              <div className="text-[8.5px] font-extrabold uppercase tracking-wider text-gray-400 flex items-center gap-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-gray-500" />
                                <span>General</span>
                              </div>
                            )}
                            <div className="flex flex-wrap gap-1.5">
                              {ungrouped.map((l) => renderLabelButton(l))}
                            </div>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Interactive Tags Grid */}
        <div className="flex-1 overflow-y-auto p-2.5 custom-scrollbar">
          <div
            className="grid gap-1.5"
            style={{
              gridTemplateColumns: 'repeat(auto-fill, minmax(95px, 1fr))'
            }}
          >
            {tags.map((tag) => {
              const isActive = isTaggingMode && activeRecordings.some((r) => r.tagId === tag.id);
              const currentRec = activeRecordings.find((r) => r.tagId === tag.id);
              const count = tagEvents.filter((e) => e.tagId === tag.id).length;
              const isFiltered = filterTagId === tag.id;
              return (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => handleTagClick(tag.id)}
                  className={`relative min-h-[44px] py-1.5 px-2 pl-3 rounded-lg border flex items-center justify-between gap-1 transition-all overflow-hidden group text-left cursor-pointer active:scale-95 ${
                    isTaggingMode
                      ? isActive
                        ? 'border-transparent bg-gray-800 scale-95 ring-2 ring-white shadow-lg'
                        : 'border-[#333] bg-[#161618] hover:bg-[#222]'
                      : isFiltered
                      ? 'border-transparent bg-[#222] ring-2 ring-white shadow-md'
                      : 'border-[#2d2d35] bg-[#151518] hover:bg-[#202025]'
                  }`}
                  style={{
                    borderColor: isActive || isFiltered ? tag.color : undefined,
                    boxShadow: isActive ? `0 0 12px ${fadeColor(tag.color, 0.25)}` : undefined
                  }}
                  title={`${tag.name}${tag.shortcut ? ` [Key: ${tag.shortcut}]` : ''} • Click to ${
                    isTaggingMode ? 'record event' : 'filter events'
                  }`}
                >
                  <div className="absolute left-0 top-0 bottom-0 w-[4px]" style={{ backgroundColor: tag.color }} />
                  <div className="flex-1 min-w-0 pr-0.5 flex flex-col justify-center">
                    <span className="font-semibold text-gray-200 text-xs truncate">
                      {tag.name}
                    </span>
                    {isActive && currentRec?.labelIds && currentRec.labelIds.length > 0 && (
                      <span className="text-[8px] text-[#c6ff1f] font-mono truncate">
                        +{currentRec.labelIds.length} label${currentRec.labelIds.length > 1 ? 's' : ''}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0 ml-0.5">
                    {tag.shortcut && (
                      <div
                        className="flex items-center justify-center min-w-[16px] h-[16px] bg-[#2a2a2a] group-hover:bg-[#383838] rounded text-[8.5px] font-bold text-gray-400 group-hover:text-white border border-[#444] px-1 font-mono shadow-xs"
                        title={`Hotkey: ${tag.shortcut}`}
                      >
                        {tag.shortcut}
                      </div>
                    )}
                    {!isTaggingMode && (
                      <span className="text-[9px] text-gray-500 font-mono font-medium px-0.5">
                        {count}
                      </span>
                    )}
                  </div>
                  {isActive && (
                    <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                  )}
                  {isTaggingMode && tag.leadLagEnabled && (
                    <div className="absolute bottom-0.5 right-0.5 opacity-60">
                      <Zap className="w-2.5 h-2.5 text-yellow-500 fill-yellow-500" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Pinned Footer */}
        <div className="p-2 border-t border-[#222] bg-[#0d0d10] flex items-center justify-between text-xs shrink-0">
          <div className="flex items-center gap-1.5 text-gray-400">
            <span className="font-medium text-gray-400 text-[11px]">Logged Events:</span>
            <span className="font-mono font-bold text-[#c6ff1f] text-[11px]">{tagEvents.length}</span>
          </div>
          <button
            type="button"
            onClick={exportEventsToCSV}
            className="px-2 py-0.5 bg-[#1a1a22] hover:bg-[#252530] text-gray-300 hover:text-white rounded text-[9.5px] font-bold flex items-center gap-1 transition-colors border border-white/5 cursor-pointer"
            title="Export CSV of logged events"
          >
            <Download className="w-3 h-3 text-emerald-400" />
            <span>CSV</span>
          </button>
        </div>
      </div>
    );
  };

  return (
    <div className="w-screen h-screen flex flex-col bg-[#0e0e0e] relative overflow-hidden">
      {!isPresentationMode && batchMode && (
        <BatchTabsBar
          batch={batchMode.batch}
          projects={batchMode.allBatchProjects}
          activeProjectId={project.id}
          projectBlobs={batchMode.projectBlobs}
          onSelectProject={batchMode.onSelectProject}
          onReloadVideo={batchMode.onReloadVideo}
          onAddGamesToBatch={batchMode.onAddGamesToBatch}
          onExitBatch={() => setShowCloseConfirm(true)}
          onOpenStats={batchMode.onOpenStats}
          onOpenRelinker={() => setShowBatchRelinkerModal(true)}
        />
      )}
      {/* Top Bar */}
      {!isPresentationMode && (
      <motion.div 
        initial={{ y: -60, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="h-10 bg-[#111] border-b border-[#222] flex items-center justify-between px-3 z-20 shrink-0 gap-3"
      >
        {/* Left: Branding & Project Info */}
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setShowCloseConfirm(true)} className="flex items-center gap-1 px-2 py-1 bg-[#222] hover:bg-[#333] rounded text-gray-400 hover:text-white transition-colors text-[11px] font-bold uppercase tracking-wider">
              <ChevronLeft className="w-3 h-3" /> BACK
          </button>
          <div className="h-4 w-[1px] bg-[#333] mx-1" />
          <div className="flex items-center gap-1 mr-2"><Logo className="w-6 h-6" /><Wordmark className="scale-[0.5] origin-left -ml-2" /></div>
          <button 
              onClick={() => setShowInfoModal(true)} 
              className="flex items-center gap-1.5 px-2 py-1 bg-[#1c1c1f] hover:bg-[#27272c] border border-white/5 hover:border-white/10 rounded-md transition-all text-left group"
              title="Click to view/edit project details & description"
          >
              <span className="text-xs text-gray-200 group-hover:text-white font-semibold truncate max-w-[180px] sm:max-w-[220px]">{project.name}</span>
              <Edit2 className="w-3 h-3 text-gray-500 group-hover:text-[#c6ff1f] transition-colors shrink-0" />
          </button>
          {isLive && (
            <div className="flex items-center gap-1.5 shrink-0">
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-400 text-[10px] sm:text-xs font-bold uppercase tracking-wider shrink-0">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse" />
                <span>LIVE</span>
              </div>
              <span className="text-[10px] sm:text-[11px] px-2 py-0.5 rounded font-mono font-bold bg-white/5 text-gray-300 border border-white/10 shrink-0 hidden sm:inline">
                {liveClock.periods.find(p => p.id === liveClock.matchPeriod)?.name || '1st Half'}
              </span>
            </div>
          )}
          {userPlan === 'free' && (
              <button 
                  onClick={onForceSync}
                  className="flex items-center gap-1.5 px-3 py-1 bg-[#222] border border-[#333] hover:border-[#555] hover:bg-[#333] rounded-full text-xs font-medium text-gray-300 transition-colors"
              >
                  <RefreshCw className="w-3 h-3" /> Sync Cloud
              </button>
          )}
          {!isPlaying && (
              <div className="flex items-center ml-4 gap-4 custom-scrollbar">
                  {(() => {
                      const activeFF = freezeFrames.find(ff => Math.abs(ff.timestamp - currentTime) < 0.1);
                      if (activeFF) {
                          return (
                              <div className="flex items-center gap-2 animate-in fade-in">
                                  <div className="bg-[#c6ff1f]/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold border border-[#c6ff1f]/50 shadow-sm flex items-center gap-2">
                                      <Snowflake className="w-3 h-3 text-[#c6ff1f]" /> ACTIVE FREEZE FRAME
                                  </div>
                                  <button onClick={() => deleteFreezeFrame(activeFF.id)} className="p-1.5 bg-red-600/80 hover:bg-red-600 text-white rounded-full border border-red-500/50 shadow-sm transition-colors" title="Delete Freeze Frame">
                                      <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                              </div>
                          );
                      }
                      if (shapes.some(s => !s.freezeFrameId)) {
                          return (
                              <div className="flex items-center gap-2 animate-in fade-in">
                                  <div className="bg-[#c6ff1f]/90 backdrop-blur-sm text-white px-3 py-1 rounded-full text-xs font-bold border border-[#c6ff1f]/50 shadow-sm flex items-center gap-2">
                                      <AlertTriangle className="w-3 h-3 text-[#c6ff1f]" /> TEMPORARY DRAWING
                                  </div>
                                  <button onClick={addFreezeFrame} className="p-1.5 bg-green-600/80 hover:bg-green-600 text-black rounded-full border border-green-500/50 shadow-sm transition-colors" title="Save as Freeze Frame">
                                      <Snowflake className="w-3.5 h-3.5" />
                                  </button>
                              </div>
                          );
                      }
                      return null;
                  })()}
              </div>
          )}
        </div>

        {/* Action Buttons */}
        {!isLive && (
        <div className="flex items-center gap-1">
             <button onClick={() => { if (deletedFFStack.length > 0) { undoDeleteFreezeFrame(); } else { undo(); } }} className="p-2 hover:bg-[#222] rounded text-gray-300 hover:text-white transition-colors" title={deletedFFStack.length > 0 ? "Undo Delete Freeze Frame (Ctrl+Z)" : "Undo (Ctrl+Z)"}><Undo2 className="w-5 h-5" /></button>
            <button onClick={redo} className="p-2 hover:bg-[#222] rounded text-gray-300 hover:text-white transition-colors" title="Redo (Ctrl+Y)"><Redo2 className="w-5 h-5" /></button>
            <div className="h-4 w-[1px] bg-[#333] mx-2" />
            <button onClick={() => setTool('eraser')} className={`p-2 rounded transition-colors ${tool === 'eraser' ? 'bg-[#c6ff1f] text-black' : 'hover:bg-[#222] text-gray-300 hover:text-white'}`} title="Eraser Tool"><Eraser className="w-5 h-5" /></button>
            <button onClick={clearAll} className="p-2 hover:bg-red-900/30 rounded text-gray-300 hover:text-red-400 transition-colors" title="Clear All (Del)"><Trash2 className="w-5 h-5" /></button>
        </div>
        )}

        <div className="flex-1" />

        <div className="flex items-center gap-2">
            {isLive && (
              <div className="flex items-center gap-1.5 shrink-0">
                {/* Exactly 2 floating toggle buttons across the entire live experience */}
                <button 
                  type="button"
                  onClick={() => {
                    setIsTimerPoppedOut(prev => !prev);
                    if (!isTimerPoppedOut) showNotification("Floating Timer enabled", "#c6ff1f");
                  }} 
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all border cursor-pointer ${
                    isTimerPoppedOut
                      ? 'bg-[#c6ff1f]/20 border-[#c6ff1f] text-[#c6ff1f] shadow-xs'
                      : 'bg-[#1a1a20] hover:bg-[#252530] border-white/10 text-gray-300 hover:text-white'
                  }`}
                  title={isTimerPoppedOut ? "Dock Floating Timer" : "Open Floating Timer overlay"}
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Timer</span>
                </button>
                <button 
                  type="button"
                  onClick={() => {
                    setIsPadPoppedOut(prev => !prev);
                    if (!isPadPoppedOut) {
                      setPoppedOutCodingMode('panel');
                      showNotification("Floating Code Pad enabled", "#818cf8");
                    }
                  }} 
                  className={`flex items-center gap-1 px-2.5 py-1 rounded text-xs font-bold transition-all border cursor-pointer ${
                    isPadPoppedOut
                      ? 'bg-indigo-500/20 border-indigo-400 text-indigo-300 shadow-xs'
                      : 'bg-[#1a1a20] hover:bg-[#252530] border-white/10 text-gray-300 hover:text-white'
                  }`}
                  title={isPadPoppedOut ? "Dock Floating Code Pad" : "Open Floating Code Pad overlay"}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Code Pad</span>
                </button>
                <button
                  type="button"
                  onClick={handleImportMatchVideo}
                  className="flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded text-xs font-bold shadow-sm transition-all active:scale-95 cursor-pointer ml-1"
                  title="Finish match session and import video recording"
                >
                  <FileVideo className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">Finish & Import</span>
                </button>
              </div>
            )}

            {!isLive && (
            <PeriodSyncManager 
                currentTime={currentTime} 
                periodSyncs={periodSyncs}
                setPeriodSyncs={setPeriodSyncs}
                tagEvents={tagEvents}
                setTagEvents={setTagEvents}
            />
            )}
            {!isLive && (
            <button 
                onClick={toggleScreenRecording} 
                className={`flex items-center gap-2 px-4 py-1.5 rounded-full font-bold text-sm tracking-wide transition-all shadow-md border ${isScreenRecording ? 'bg-red-600 hover:bg-red-700 text-white border-red-500 animate-pulse ring-2 ring-red-500/50' : 'bg-[#1a1a1a] hover:bg-[#222] text-gray-300 hover:text-white border-[#333] hover:border-red-500/50 hover:text-red-400'}`}
                title={isScreenRecording ? 'Stop Recording' : 'Record Video Canvas'}
            >
                <div className={`w-2.5 h-2.5 rounded-full ${isScreenRecording ? 'bg-white' : 'bg-red-500'}`} />
                {isScreenRecording ? 'RECORDING' : 'RECORD'}
            </button>
            )}
        </div>

        {/* Right: Colors */}
        {!isLive && (
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-4 custom-scrollbar">
                {colors.map((color) => (
                <button
                    key={color.id}
                    onClick={() => setActiveColorId(color.id)}
                    onContextMenu={(e) => handleColorRightClick(e, color.id)}
                    className={`w-6 h-6 rounded-full border-2 transition-transform hover:scale-110 ${activeColorId === color.id ? 'border-white scale-125' : 'border-transparent ring-1 ring-white/10'}`}
                    style={{ backgroundColor: color.value }}
                    title="Left-click to select, Right-click to edit"
                />
                ))}
            </div>
        </div>
        )}
      </motion.div>
      )}

      <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
        {/* Sidebar Container */}
        {!editingAnimationFFId && !isPresentationMode && (
        <motion.div 
            initial={{ x: -300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className="flex h-full shrink-0 z-30 relative"
        >
            {!isLive && (
            <div className="w-12 bg-[#111] border-r border-[#222] flex flex-col justify-between py-2 z-40 overflow-y-auto no-scrollbar">
                {/* Tools */}
                <div className="flex flex-col items-center gap-1">
                    {[
                    { id: 'move', icon: MousePointer2, label: 'Move / Select' },
                    { id: 'pen', icon: Pen, label: 'Draw' },
                    { id: 'arrow', icon: MoveUpRight, label: 'Arrow' },
                    { id: 'curved-arrow', icon: CornerUpRight, label: 'Aerial Arrow' },
                    { id: 'circle', icon: Circle, label: 'Telestration Ring' },
                    { id: 'connected-circle', icon: GitCommitVertical, label: 'Chain' },
                    { id: 'spotlight', icon: Flashlight, label: 'Spotlight' },
                    { id: 'lens', icon: ZoomIn, label: 'Zoom Lens' },
                    { id: 'player-move', icon: User, label: 'Player Dragger' },
                    { id: 'name-tag', icon: Tag, label: 'Player Tag' },
                    { id: 'text', icon: Type, label: 'Text' },
                    { id: 'polygon', icon: polygonSettings.mode === 'radar' ? Radar : Hexagon, label: polygonSettings.mode === 'radar' ? 'Radar Ring' : 'Polygon' },
                    { id: 'scanner', icon: ScanEye, label: 'Field Scanner' },
                    { id: 'masking', icon: Layers, label: 'Masking / Green Screen' }
                    ].map((item) => (
                        <div key={item.id} className="relative group w-full flex justify-center">
                            <button
                                onClick={() => {
                                    if (item.id === 'masking') {
                                        setTool(tool === 'masking' ? null : 'masking');
                                    } else {
                                        setTool(tool === item.id ? null : item.id as ToolType);
                                    }
                                }}
                                className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                                tool === item.id 
                                    ? 'bg-[#c6ff1f]/20 text-[#c6ff1f] ring-2 ring-[#c6ff1f]/50' 
                                    : 'text-gray-400 hover:bg-[#222] hover:text-white'
                                }`}
                            >
                                <item.icon className={`w-4 h-4 ${tool === item.id ? 'stroke-[2.5px]' : ''}`} />
                            </button>
                             <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 group-hover:scale-100 scale-95 pointer-events-none transition-all duration-200 transform translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl border border-gray-700 flex items-center origin-left">
                                {item.label}
                                <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-8 border-transparent border-r-gray-800"></div>
                            </div>
                        </div>
                    ))}
                </div>
                 <div className="flex flex-col items-center gap-1 pt-2 border-t border-[#222]">
                    <div className="relative group w-full flex justify-center">
                        <button onClick={() => setTool(null)} className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${tool === null ? 'bg-[#c6ff1f]/20 text-[#c6ff1f] ring-2 ring-[#c6ff1f]/50' : 'text-gray-400 hover:bg-[#222] hover:text-white'}`}>
                            <Snowflake className="w-4 h-4" />
                        </button>
                        <div className="absolute left-full ml-3 px-3 py-1.5 bg-gray-800 text-white text-xs font-medium rounded-md opacity-0 group-hover:opacity-100 scale-95 pointer-events-none transition-all duration-200 transform translate-x-[-10px] group-hover:translate-x-0 whitespace-nowrap z-50 shadow-xl border border-gray-700 flex items-center origin-left">
                            Clear Tool & Pause
                            <div className="absolute right-full top-1/2 -translate-y-1/2 -mr-[1px] border-8 border-transparent border-r-gray-800"></div>
                        </div>
                    </div>
                </div>
            </div>
            )}

            {/* Properties Panel */}
            {!isLive && (
            <div className={`${(labelsEnabled || isAdvancedCodingMode) ? 'w-0 border-r-0 px-0' : 'w-[220px]'} bg-[#0c0c0e] border-r border-[#222] overflow-hidden flex flex-col relative z-30 shrink-0 transition-all duration-300`}>
                <div className="h-full w-[220px] overflow-y-auto p-3 custom-scrollbar">
                    {renderPropertiesPanel()}
                </div>
            </div>
            )}
        </motion.div>
        )}

        {/* Main Content Area */}
        <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            className={`flex flex-col min-w-0 bg-[#0a0a0a] relative ${isAdvancedCodingMode ? 'w-full lg:w-[35%] shrink-0 h-[45vh] lg:h-full border-b lg:border-b-0 lg:border-r border-[#222]' : 'flex-1 h-full'}`}
        >
            {editingAnimationFFId && (
                <div className="absolute top-4 left-1/2 -translate-x-1/2 bg-[#c6ff1f]/30 backdrop-blur-md border border-[#c6ff1f]/30 text-white px-6 py-2 rounded-full shadow-2xl z-[100] flex items-center gap-3 animate-in fade-in slide-in-from-top-4">
                    <div className="w-2 h-2 rounded-full bg-[#c6ff1f] animate-pulse" />
                    <span className="font-bold tracking-widest uppercase text-sm text-[#c6ff1f]">Animation Timeline Editor</span>
                </div>
            )}
            
            {isScreenRecording && recordingStartTimeRef.current && (
                <RecordingTimer 
                    startTime={recordingStartTimeRef.current} 
                    label={exportSettingsRef.current.active ? "RECORD EXPORT" : "SCREEN REC"}
                />
            )}
            
            {showInfoModal && (
                <div className="absolute inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
                    <motion.div 
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        className="bg-[#141416] border border-[#2e2e33] rounded-2xl p-6 max-w-lg w-full shadow-2xl relative overflow-hidden"
                    >
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#e4ff7a] to-[#c6ff1f]" />
                        <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2.5">
                                <div className="w-8 h-8 rounded-lg bg-[#c6ff1f]/10 border border-[#c6ff1f]/20 flex items-center justify-center text-[#c6ff1f]">
                                    <Film className="w-4 h-4" />
                                </div>
                                <div>
                                    <h2 className="text-lg font-bold text-white leading-tight">Project Details</h2>
                                    <p className="text-xs text-gray-400">View or update project metadata & tactical notes</p>
                                </div>
                            </div>
                            <button 
                                onClick={() => setShowInfoModal(false)}
                                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Project Name</label>
                                <input 
                                    type="text" 
                                    value={infoForm.name} 
                                    onChange={e => setInfoForm({...infoForm, name: e.target.value})}
                                    className="w-full bg-[#0d0d0f] border border-[#2e2e33] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#c6ff1f] focus:outline-none transition-colors"
                                    placeholder="Enter project name..."
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider mb-1.5">Description & Match Notes</label>
                                <textarea 
                                    value={infoForm.description} 
                                    onChange={e => setInfoForm({...infoForm, description: e.target.value})}
                                    className="w-full bg-[#0d0d0f] border border-[#2e2e33] rounded-xl px-3.5 py-2.5 text-sm text-white focus:border-[#c6ff1f] focus:outline-none transition-colors h-24 resize-none"
                                    placeholder="Add tactical context, team notes, or match information..."
                                />
                            </div>
                            
                            <div className="bg-[#1b1b1e] border border-white/5 rounded-xl p-3 flex items-center justify-between text-xs text-gray-400">
                                <span className="flex items-center gap-1.5 truncate mr-2">
                                    <Video className="w-3.5 h-3.5 text-[#c6ff1f] shrink-0" />
                                    <span className="truncate">{project.fileName === 'live' ? 'Live Stream Session' : (project.fileName || 'Video Source')}</span>
                                </span>
                                <span className="shrink-0 font-mono text-gray-300">
                                    {duration > 0 ? `${formatTime(duration)}` : 'Stream Active'}
                                </span>
                            </div>

                            <div className="pt-2 flex items-center justify-end gap-2.5">
                                <button 
                                    type="button"
                                    onClick={() => setShowInfoModal(false)}
                                    className="px-4 py-2 bg-[#222] hover:bg-[#2c2c31] text-gray-300 rounded-xl text-xs font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button 
                                    type="button"
                                    onClick={() => {
                                        const trimmedName = infoForm.name.trim() || 'Untitled Project';
                                        onUpdateMetadata(trimmedName, infoForm.description);
                                        setShowInfoModal(false);
                                    }}
                                    className="px-5 py-2 bg-[#c6ff1f] hover:bg-[#b0e817] text-black font-semibold rounded-xl text-xs transition-colors flex items-center gap-1.5 shadow-md shadow-[#c6ff1f]/10"
                                >
                                    <Check className="w-3.5 h-3.5" /> Save Changes
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}

            {/* Canvas Container */}
            <div 
                ref={containerRef} 
                className={isPresentationMode 
                    ? "fixed inset-0 z-[100] w-screen h-screen flex items-center justify-center overflow-hidden bg-black select-none" 
                    : "flex-1 relative flex items-center justify-center overflow-hidden bg-black transition-all"
                }
                onMouseDown={(e) => {
                    if (e.target === containerRef.current && (tool === 'move' || tool === null)) {
                        setSelectedShapeId(null);
                        setDraggingHandle(null);
                    }
                }}
            >
                {Boolean(videoUrl) && duration === 0 && !isLive && (
                    <div className="absolute inset-0 z-30 flex items-center justify-center bg-[#0a0a0c]/85 backdrop-blur-md p-4 transition-all duration-300">
                        <div className="flex flex-col items-center bg-[#131316] border border-[#26262b] px-6 py-5 rounded-2xl shadow-2xl max-w-sm w-full text-center relative overflow-hidden animate-in fade-in zoom-in-95">
                            {/* Accent Glow */}
                            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-[#e4ff7a] via-[#c6ff1f] to-[#a0d600]" />
                            
                            <div className="relative w-12 h-12 flex items-center justify-center mb-3">
                                <div className="absolute inset-0 rounded-full border-2 border-[#c6ff1f]/20 animate-ping" />
                                <div className="w-10 h-10 border-2 border-[#2b2b30] border-t-[#c6ff1f] rounded-full animate-spin" />
                                <Film className="w-4 h-4 text-[#c6ff1f] absolute" />
                            </div>

                            <h3 className="text-sm font-bold text-white tracking-tight mb-0.5">
                                Loading Video Stream
                            </h3>
                            <p className="text-xs text-gray-400 truncate max-w-full px-2 mb-3" title={project.fileName}>
                                {project.fileName || 'Analyzing media payload...'}
                            </p>

                            {/* Animated Shimmer Bar */}
                            <div className="w-full h-1 bg-[#222227] rounded-full overflow-hidden mb-2.5 relative">
                                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-[#c6ff1f] to-transparent w-full animate-pulse" />
                            </div>

                            <div className="flex items-center justify-between w-full text-[11px] text-gray-500 font-mono">
                                <span>Decoding frames</span>
                                <span>{loadElapsedSec > 0 ? `${loadElapsedSec}s` : 'Buffering'}</span>
                            </div>

                            {loadElapsedSec >= 5 && (
                                <button
                                    onClick={() => {
                                        if (videoRef.current) {
                                            videoRef.current.play().then(() => {
                                                videoRef.current?.pause();
                                                if (videoRef.current?.duration) setDuration(videoRef.current.duration);
                                            }).catch(() => {});
                                        }
                                    }}
                                    className="mt-3 text-[11px] text-[#c6ff1f] hover:underline cursor-pointer"
                                >
                                    Click to force playback probe
                                </button>
                            )}
                        </div>
                    </div>
                )}
                
                {isVideoBuffering && duration > 0 && !isLive && (
                    <div className="absolute top-4 right-4 z-30 flex items-center gap-2 bg-black/75 backdrop-blur-md border border-white/10 px-3 py-1.5 rounded-full text-xs text-white shadow-xl pointer-events-none animate-in fade-in">
                        <div className="w-3 h-3 border-2 border-[#c6ff1f]/30 border-t-[#c6ff1f] rounded-full animate-spin" />
                        <span className="font-medium text-[11px] text-gray-300">Buffering video...</span>
                    </div>
                )}
                
                {isLive ? (
                    <LiveCodingCenterView
                        projectName={project.name || 'Live Match'}
                        clockDetails={liveClock.getMatchClockDetails()}
                        clockState={liveClock.matchClockState}
                        activePeriodId={liveClock.matchPeriod}
                        periods={liveClock.periods}
                        maxPeriodIndex={liveClock.maxPeriodIndex}
                        isEditingTimer={liveClock.isEditingTimer}
                        editedTimerValue={liveClock.editedTimerValue}
                        onSetEditedTimerValue={liveClock.setEditedTimerValue}
                        onStartEditing={liveClock.startEditingTimer}
                        onCancelEditing={() => liveClock.setIsEditingTimer(false)}
                        onSaveEditing={() => liveClock.handleSaveTimer()}
                        onResume={liveClock.resumeLiveClock}
                        onPause={liveClock.pauseLiveClock}
                        onRequestPeriod={liveClock.requestStartLiveClock}
                        onAdjustTime={liveClock.adjustLiveTime}
                        onNudgeTimer={liveClock.nudgeEditedTimer}
                    />
                ) : !videoUrl ? (
                    batchMode ? (
                        <BatchVideoRelinker
                            batch={batchMode.batch}
                            projects={batchMode.allBatchProjects}
                            activeProjectId={project.id}
                            projectBlobs={batchMode.projectBlobs}
                            onSelectProject={batchMode.onSelectProject}
                            onRelinkSingle={async (proj, file, handle) => {
                                if (batchMode.onRelinkSingleVideo) {
                                    await batchMode.onRelinkSingleVideo(proj, file, handle);
                                } else {
                                    batchMode.onReloadVideo(proj);
                                }
                            }}
                            onRelinkBatch={async (mappings) => {
                                if (batchMode.onBatchRelinkVideos) {
                                    await batchMode.onBatchRelinkVideos(mappings);
                                }
                            }}
                            isInline={true}
                        />
                    ) : (
                        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-[#0d0e12]/95 backdrop-blur-md p-6 text-center select-none">
                            <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-3 shadow-xl">
                                <Video className="w-8 h-8" />
                            </div>
                            <h3 className="text-white font-bold text-base mb-1">
                                Video file not loaded for "{project.name}"
                            </h3>
                            <p className="text-gray-400 text-xs max-w-md mb-3">
                                Select or drag in the video file for this match to analyze footage.
                            </p>
                            {project.fileName && (
                                <p className="font-mono text-[11px] text-gray-400 bg-white/5 px-3 py-1 rounded-lg border border-white/10 mb-4">
                                    Expected: {project.fileName}
                                </p>
                            )}
                            <button
                                onClick={() => {
                                    const fallback = document.createElement('input');
                                    fallback.type = 'file';
                                    fallback.accept = 'video/*';
                                    fallback.onchange = (e: any) => {
                                        if (e.target.files?.[0]) {
                                            const file = e.target.files[0];
                                            saveVideoLocally(project.id, file).catch(console.error);
                                            window.location.reload();
                                        }
                                    };
                                    fallback.click();
                                }}
                                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#c6ff1f] hover:bg-[#d4ff4d] text-black font-bold text-xs shadow-lg shadow-[#c6ff1f]/20 transition-all cursor-pointer"
                            >
                                <RefreshCw className="w-4 h-4" />
                                <span>Select Video File</span>
                            </button>
                        </div>
                    )
                ) : (
                    <video
                        ref={videoRef}
                        src={videoUrl}
                        className="absolute max-w-none max-h-none"
                        style={{ 
                        width: containerRef.current ? '100%' : 'auto',
                        height: '100%',
                        objectFit: 'contain'
                        }}
                        onTimeUpdate={handleTimeUpdate}
                        onLoadedMetadata={handleLoadedMetadata}
                        onWaiting={() => setIsVideoBuffering(true)}
                        onPlaying={() => setIsVideoBuffering(false)}
                        onLoadedData={() => {
                            setIsVideoBuffering(false);
                            if (videoRef.current && (!duration || duration === 0)) {
                                setDuration(videoRef.current.duration);
                            }
                        }}
                        onCanPlay={() => {
                            setIsVideoBuffering(false);
                            if (videoRef.current && (!duration || duration === 0)) {
                                setDuration(videoRef.current.duration);
                            }
                            if (pendingSeekTimeRef.current !== null && videoRef.current) {
                                const seekTo = pendingSeekTimeRef.current;
                                pendingSeekTimeRef.current = null;
                                videoRef.current.currentTime = seekTo;
                                setCurrentTime(seekTo);
                                if (pendingPlayRef.current || isPlaying || autoplay.active) {
                                    pendingPlayRef.current = false;
                                    setIsPlaying(true);
                                    videoRef.current.play().catch(e => console.log("CanPlay resume error:", e));
                                }
                            }
                        }}
                        onSeeked={() => {
                            if (!isPlaying && maskSettings.enabled) {
                                computeMaskingLayers();
                            }
                        }}
                        onEnded={() => setIsPlaying(false)}
                        disablePictureInPicture
                        controls={false}
                        preload="auto"
                        playsInline
                    />
                )}
                <canvas
                    ref={canvasRef}
                    className={`absolute inset-0 z-10 touch-none ${!videoUrl || isLive || isPresentationMode ? 'pointer-events-none' : ''} ${!videoUrl || isLive ? 'opacity-0 hidden' : ''} ${isPickingColor ? 'cursor-crosshair' : (tool === 'masking' ? 'cursor-default' : (tool === 'eraser' ? 'cursor-cell' : (tool ? 'cursor-crosshair' : 'cursor-default')))}`}
                    onMouseDown={startDrawing}
                    onMouseMove={drawPreview}
                    onMouseUp={finishDrawing}
                    onMouseLeave={() => { setIsDrawing(false); mousePosRef.current = null; }}
                    onDoubleClick={handleDoubleClick}
                    onContextMenu={handleContextMenu}
                    onClick={handleCanvasClick}
                    style={{ width: '100%', height: '100%' }}
                />
                
                <canvas
                    ref={ghostCanvasRef}
                    className={`absolute inset-0 z-20 pointer-events-none ${!videoUrl ? 'hidden' : ''}`}
                    style={{ width: '100%', height: '100%' }}
                />

                {/* Event Creation Toast */}
                <AnimatePresence>
                    {eventNotification && (
                        <motion.div 
                            initial={{ opacity: 0, y: -20, x: '-50%' }}
                            animate={{ opacity: 1, y: 0, x: '-50%' }}
                            exit={{ opacity: 0, y: -20, x: '-50%' }}
                            className={`absolute top-16 left-1/2 z-[60] px-4 py-2 rounded-full shadow-2xl flex items-center gap-3 backdrop-blur-md ${eventNotification.onUndo || eventNotification.action ? 'pointer-events-auto' : ''}`}
                            style={{ backgroundColor: fadeColor(eventNotification.color, 0.88), border: `1px solid ${eventNotification.color}` }}
                        >
                            {eventNotification.action ? (
                                <ListPlus className="w-5 h-5 text-white shrink-0" />
                            ) : (
                                <Check className="w-5 h-5 text-white shrink-0" />
                            )}
                            <span className="font-bold text-white text-sm tracking-wide shadow-none">{eventNotification.message}</span>
                            {eventNotification.action && (
                                <>
                                    <div className="w-px h-4 bg-white/30 mx-1" />
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            const action = eventNotification.action;
                                            setEventNotification(null);
                                            action?.onClick();
                                        }}
                                        className="bg-white text-black hover:bg-[#c6ff1f] px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-md flex items-center gap-1 active:scale-95 cursor-pointer"
                                    >
                                        <Plus className="w-3 h-3" />
                                        {eventNotification.action.label}
                                    </button>
                                </>
                            )}
                            {eventNotification.onUndo && (
                                <>
                                    <div className="w-px h-4 bg-white/30 mx-1" />
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            eventNotification.onUndo?.();
                                            setEventNotification(null);
                                        }}
                                        className="text-white hover:text-gray-200 hover:bg-white/10 px-2 py-0.5 rounded text-sm font-bold transition-colors cursor-pointer"
                                    >
                                        Undo
                                    </button>
                                </>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Centralized Hover Insight for Notes */}
                <AnimatePresence>
                    {hoveredNoteId && (() => {
                        const note = markers.find(m => m.id === hoveredNoteId);
                        if (!note) return null;
                        return (
                            <motion.div 
                                initial={{ opacity: 0, scale: 0.9, y: 10 }}
                                animate={{ opacity: 1, scale: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.9, y: 10 }}
                                className="absolute inset-0 z-[60] flex items-center justify-center pointer-events-none"
                            >
                                <div className="bg-black/60 backdrop-blur-md border border-white/10 px-6 py-4 rounded-2xl flex items-start gap-4 shadow-[0_10px_40px_rgba(0,0,0,0.5)] max-w-lg mx-4">
                                    <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ backgroundColor: `${note.color}20` }}>
                                        <MapPin className="w-5 h-5" style={{ color: note.color }} />
                                    </div>
                                    <div>
                                        <div className="text-[11px] uppercase tracking-wider font-bold mb-1" style={{ color: note.color }}>Timeline Note @ {formatTime(note.time)}</div>
                                        <div className="text-gray-100 text-lg leading-relaxed whitespace-pre-wrap">{note.label}</div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })()}
                </AnimatePresence>

                {/* Active Recording Indicator (Minimal & Non-intrusive) */}
                {isTaggingMode && activeRecordings.length > 0 && (
                    <div className="absolute top-2.5 right-3 z-[60] flex flex-col gap-1 items-end pointer-events-none">
                        {activeRecordings.map(rec => {
                            const recTag = tags.find(t => t.id === rec.tagId);
                            const elapsed = Math.max(0, currentTime - rec.startTime);
                            return (
                                <div key={rec.tagId} className="bg-black/65 backdrop-blur-md border border-white/10 text-white/90 px-2 py-0.5 rounded flex items-center gap-1.5 shadow-sm pointer-events-none">
                                    <div className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shrink-0" />
                                    <span className="text-[10px] font-medium tracking-tight truncate max-w-[120px]">{recTag?.name || 'Event'}</span>
                                    <span className="text-[9px] font-mono text-gray-400">{formatTime(elapsed)}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Recording Error Toast */}
                {recordingError && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 z-50 bg-red-900/90 border border-red-500/50 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center justify-between gap-2 max-w-md">
                        <div className="flex items-center gap-3">
                            <Video className="w-5 h-5 text-red-400 shrink-0" />
                            <p className="text-sm">{recordingError}</p>
                        </div>
                        <button onClick={() => setRecordingError(null)} className="p-1 hover:bg-white/10 rounded-lg shrink-0">
                            <span className="sr-only">Close</span>
                            <Plus className="w-4 h-4 rotate-45" />
                        </button>
                    </div>
                )}

                {/* Event Notes Overlay */}
                {selectedEventIds.size === 1 && (() => {
                    const selectedEvent = tagEvents.find(e => e.id === Array.from(selectedEventIds)[0]);
                    const eventTag = selectedEvent ? tags.find(t => t.id === selectedEvent.tagId) : null;
                    if (selectedEvent && selectedEvent.notes) {
                        return (
                            <AnimatePresence>
                                <motion.div 
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 10 }}
                                    className="absolute bottom-0 left-0 right-0 w-full z-40 pointer-events-none"
                                >
                                    <div className="w-full bg-black/40 backdrop-blur-sm text-gray-200 text-lg px-8 py-3 flex items-center justify-center gap-3 font-medium tracking-wide">
                                        {eventTag && (
                                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: eventTag.color }} />
                                        )}
                                        {selectedEvent.notes}
                                    </div>
                                </motion.div>
                            </AnimatePresence>
                        );
                    }
                    return null;
                })()}

                {/* Freeze Frame Active Indicator removed per user request */}

                {/* Presentation Mode Full Screen HUD */}
                {isPresentationMode && (
                    <PresentationHUD
                        currentPlaylist={currentPresentationPlaylist}
                        playlistIndex={presentationPlaylistIndex}
                        totalPlaylists={presentationPlaylists.length}
                        allOrderedPlaylists={presentationPlaylists}
                        currentClipIndex={playlistPlaybarIndex}
                        totalClipsInPlaylist={currentPresentationPlaylist?.events.length || 0}
                        currentEvent={currentPresentationEvent}
                        currentTiming={currentPresentationTiming}
                        currentTime={currentTime}
                        isPlaying={isPlaying}
                        onTogglePlay={togglePlay}
                        onPrevClip={handlePrevPresentationClip}
                        onNextClip={handleNextPresentationClip}
                        onSelectPlaylistIndex={handleSelectPresentationPlaylistIndex}
                        onSeekClip={handleSeekPresentationClip}
                        onOpenCustomize={() => setShowPresentationCustomizeModal(true)}
                        onExitPresentation={handleExitPresentationMode}
                        volume={volume}
                        setVolume={setVolume}
                        isMuted={isMuted}
                        toggleMute={toggleMute}
                        playbackRate={playbackRate}
                        setPlaybackRate={setPlaybackRate}
                        loop={presentationConfig.loop}
                        onToggleLoop={() => {
                            setPresentationConfig(prev => {
                                const next = { ...prev, loop: !prev.loop };
                                try {
                                    localStorage.setItem(`tacstem_presentation_config_${project.id}`, JSON.stringify(next));
                                } catch (e) {}
                                return next;
                            });
                        }}
                        isFinished={presentationFinished}
                        onReplayPresentation={() => handleEnterPresentationMode(true)}
                        transitionMessage={presentationTransitionMsg}
                    />
                )}
            </div>

            {/* TWO LAYER PLAYBAR */}
            {!editingAnimationFFId && !isPresentationMode && (() => {
                const isTrimmingActive = selectedEventIds.size === 1 && !isMultiSelectAction && playbarEventId === Array.from(selectedEventIds)[0] && !showPlaylistPlaybar;
                const isPlaylistPlaybarActive = Boolean(showPlaylistPlaybar && playlists.find(p => p.id === activePlaylistId) && (playlists.find(p => p.id === activePlaylistId)?.events.length || 0) > 0);

                return (
                    <motion.div 
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        transition={{ duration: 0.6, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
                        className={`flex flex-col bg-[#111] border-t border-[#222] relative z-20 shrink-0 transition-all duration-300 ease-[cubic-bezier(0.25,0.1,0.25,1)] ${
                            (isPlaylistPlaybarActive || isTrimmingActive) ? 'h-auto' : (isTimelineExpanded || isLive ? 'h-[260px]' : 'h-auto')
                        }`}
                    >
                        {isPlaylistPlaybarActive ? (
                            <PlaylistPlaybar
                                playlist={playlists.find(p => p.id === activePlaylistId)!}
                                tagEvents={allBatchTagEvents}
                                tags={allBatchTags}
                                labels={allBatchLabels}
                                allBatchProjects={batchMode?.allBatchProjects}
                                currentProjectId={project.id}
                                videoRef={videoRef}
                                currentTime={currentTime}
                                videoDuration={duration}
                                isPlaying={isPlaying}
                                activeClipIndex={playlistPlaybarIndex}
                                onSelectClipIndex={(idx, seekVideoTime) => {
                                    handlePlaylistClipSelect(idx, seekVideoTime);
                                }}
                                onUpdateClipTrim={(clipIndex, newStart, newEnd) => {
                                    handleUpdatePlaylistClipTrim(activePlaylistId, clipIndex, newStart, newEnd);
                                }}
                                onResetClipTrim={(clipIndex) => {
                                    handleResetPlaylistClipTrim(activePlaylistId, clipIndex);
                                }}
                                onTogglePlay={togglePlay}
                                onClose={() => {
                                    setShowPlaylistPlaybar(false);
                                    if (autoplay.active) {
                                        setAutoplay({ active: false, playlistId: null, eventIndex: -1 });
                                    }
                                }}
                            />
                        ) : isTrimmingActive ? (
                            <EventPlaybar 
                                event={tagEvents.find(e => e.id === Array.from(selectedEventIds)[0])!}
                                tag={tags.find(t => t.id === tagEvents.find(e => e.id === Array.from(selectedEventIds)[0])?.tagId)}
                                labels={labels}
                                videoDuration={duration}
                                currentTime={currentTime}
                                freezeFrames={freezeFrames}
                                isPlaying={isPlaying}
                                onTogglePlay={togglePlay}
                                videoRef={videoRef}
                                onUpdate={handleEventUpdate}
                                onClose={() => { setSelectedEventIds(new Set()); setSelectedEventLogs(new Set()); setPlaybarEventId(null); }}
                                onDelete={() => {
                                    const eventId = Array.from(selectedEventIds)[0];
                                    setTagEvents(prev => prev.filter(e => e.id !== eventId));
                                    setPlaylists(prev => prev.map(p => ({
                                        ...p,
                                        events: p.events.filter(item => getClipEventId(item) !== eventId)
                                    })));
                                    setSelectedEventIds(new Set());
                                    setSelectedEventLogs(new Set());
                                    setPlaybarEventId(null);
                                }}
                                onAddToPlaylist={(force) => addSelectedToPlaylist(undefined, force)}
                                activePlaylistName={playlists.find(p => p.id === activePlaylistId)?.name || 'Playlist'}
                            />
                        ) : (
                            <>
                
                {/* Layer 1: Timeline Content */}
                {isLive ? (
                    <LiveHalfTimeline
                        isLive={isLive}
                        currentTime={currentTime}
                        periodSyncs={periodSyncs}
                        setPeriodSyncs={setPeriodSyncs}
                        activePeriodId={liveClock.matchPeriod}
                        periods={liveClock.periods}
                        clockDetails={liveClock.getMatchClockDetails()}
                        clockState={liveClock.matchClockState}
                        tagEvents={tagEvents}
                        setTagEvents={setTagEvents}
                        tags={tags}
                        labels={labels}
                        selectedEventIds={selectedEventIds}
                        setSelectedEventIds={setSelectedEventIds}
                        handleEventClick={handleEventClick}
                        handleEventContextMenu={handleEventContextMenu}
                        timelineZoom={timelineZoom}
                        showTimelineTags={showTimelineTags}
                        markers={markers}
                        setMarkers={setMarkers}
                        onTogglePlay={liveClock.toggleLiveClock}
                        lastTagActionTimestamp={lastTagActionTimestamp}
                    />
                ) : isTimelineExpanded ? (
                    // EXPANDED MULTI-LAYER TIMELINE
                    <div className="flex-1 flex min-h-0 relative group/timeline bg-[#0a0a0a]">
                        {/* Left Sidebar (Track Headers) */}
                        <div className="w-28 bg-[#111] border-r border-[#222] shrink-0 flex flex-col relative z-40 shadow-[4px_0_15px_rgba(0,0,0,0.5)]">
                            {/* Header for sticky ruler alignment */}
                            <div className="h-6 border-b border-white/5 bg-[#111]/80 backdrop-blur-md sticky top-0 shrink-0" />
                            
                            {/* Track rows */}
                            <div className="flex-1 flex flex-col py-2 space-y-1 px-2 relative z-10 pointer-events-none">
                                {showTimelineTags && timelineLanes.map((_, i) => (
                                    <div key={i} className="h-6 flex items-center gap-1.5 text-[10px] font-medium text-gray-300 pointer-events-auto shrink-0">
                                        {i === 0 ? <Video className="w-3 h-3 text-gray-400" /> : <div className="w-3 h-3" />}
                                        <span className="truncate">{i === 0 ? 'Tag Tracks' : `Track ${i + 1}`}</span>
                                    </div>
                                ))}
                                
                                {(!isLive && showTimelineFreezeFrames) && (
                                    <div className="h-6 flex items-center gap-1.5 text-[10px] font-medium text-gray-300 pointer-events-auto shrink-0 border-t border-white/5 pt-1 mt-1">
                                        <Snowflake className="w-3 h-3 text-gray-400" />
                                        <span className="truncate">Freeze Frames</span>
                                    </div>
                                )}

                                <div className="h-6 flex items-center justify-between group pointer-events-auto shrink-0 border-t border-white/5 pt-1 mt-1">
                                    <div className="flex items-center gap-1.5 text-[10px] font-medium text-gray-300 truncate">
                                        <MapPin className="w-3 h-3 text-gray-400" />
                                        <span>Notes</span>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMarkerModal({ isOpen: true, x: 0, y: 0, mode: 'create', time: currentTime, tempLabel: '', tempColor: '#3b82f6' });
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-all shrink-0"
                                    >
                                        <Plus className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        </div>

                         {/* Scrollable Timeline Area */}
                         <div 
                            ref={expandedTimelineContainerRef}
                            className="flex-1 relative overflow-auto bg-[#0a0a0a] scroll-smooth"
                         >
                            <div style={{ width: `${timelineZoom * 100}%`, minWidth: '100%', minHeight: '100%' }} className="relative flex flex-col">
                                
                                {/* Time Ruler (Top) */}
                                <div className="h-6 border-b border-white/5 bg-[#111]/80 backdrop-blur-md sticky top-0 w-full shrink-0 z-30 shadow-sm">
                                     {/* Ticks logic */}
                                     <div className="absolute inset-0 opacity-40 pointer-events-none flex items-end">
                                         {[...Array(Math.floor(Math.max(5, 20 / (timelineZoom > 30 ? 2 : 1)) * timelineZoom))].map((_, i, arr) => {
                                             const pct = (i / (arr.length - 1)) * 100 || 0;
                                             return (
                                                 <div key={i} className="absolute h-full flex flex-col items-center justify-end pb-1 gap-0.5 -translate-x-1/2" style={{ left: `${pct}%` }}>
                                                     <div className="w-[1px] h-1.5 bg-gray-500 rounded-full" />
                                                     <span className="text-[9px] text-gray-500 font-mono tracking-wider font-medium">
                                                        {formatTime((duration / Math.max(1, arr.length - 1)) * i)}
                                                     </span>
                                                 </div>
                                             );
                                         })}
                                     </div>
                                     <div className="absolute inset-0 w-full h-full cursor-ew-resize z-50" onMouseDown={handleScrubStart} onContextMenu={handleTimelineContextMenu} />
                                </div>

                                {/* Dynamic Tracks Area */}
                                <div className="flex-1 relative w-full pb-8 bg-gradient-to-b from-[#0a0a0a] to-[#050505]" onContextMenu={handleTimelineContextMenu}>
                                     {/* Grid Lines */}
                                    <div className="absolute inset-0 opacity-5 pointer-events-none z-0">
                                         {[...Array(Math.floor(Math.max(10, 40 / (timelineZoom > 30 ? 4 : 1)) * timelineZoom))].map((_, i, arr) => {
                                             const pct = (i / (arr.length - 1)) * 100 || 0;
                                             return <div key={i} className="absolute top-0 bottom-0 w-[1px] bg-white -translate-x-1/2 dashed" style={{ left: `${pct}%` }} />;
                                         })}
                                    </div>

                                     {/* Playhead (Spanning all tracks) */}
                                     <motion.div 
                                        className="absolute top-0 bottom-0 z-50 flex items-start justify-center"
                                        style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                                        transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
                                     >
                                        <div 
                                            className="absolute top-0 bottom-0 w-6 cursor-ew-resize -translate-x-1/2 group/playhead"
                                            onMouseDown={(e) => {
                                                e.stopPropagation();
                                                handleScrubStart(e);
                                            }}
                                        >
                                            <div className="absolute top-0 bottom-0 left-1/2 -translate-x-1/2 w-[2px] bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.8)] pointer-events-none" />
                                            <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-4 h-4 bg-red-500 rounded-full shadow-[0_0_12px_rgba(239,68,68,1)] border-[3px] border-[#111] group-hover/playhead:scale-125 transition-transform pointer-events-none" />
                                        </div>
                                     </motion.div>

                                     {/* Dynamic Lanes */}
                                     <div className="absolute top-0 left-0 right-0 py-2 space-y-1 px-1">
                                         {showTimelineTags && timelineLanes.map((lane, laneIndex) => (
                                             <div key={laneIndex} className="relative h-6 w-full z-10 bg-white/5 rounded-full shadow-inner border border-white/5 backdrop-blur-sm shrink-0">
                                                 {lane.map(evt => {
                                                      const tag = tags.find(t => t.id === evt.tagId);
                                                      const startPct = (evt.startTime / (duration || 1)) * 100;
                                                      const widthPct = ((evt.endTime - evt.startTime) / (duration || 1)) * 100;
                                                      const isSelected = selectedEventIds.has(evt.id);
                                                      const isRecording = evt.id === 'RECORDING_PSEUDO';
                                                      
                                                      return (
                                                          <motion.div
                                                              key={evt.id}
                                                              whileHover={{ scaleY: 1.1, scaleX: 1.01, zIndex: 50 }}
                                                              style={{ 
                                                                  left: `${startPct}%`,
                                                                  width: `${Math.max(widthPct, 0.1)}%`,
                                                                  backgroundColor: isSelected ? '#fff' : fadeColor(tag?.color || '#888', 0.85),
                                                                  borderColor: tag?.color || '#888'
                                                              }}
                                                              className={`absolute top-0.5 bottom-0.5 rounded-full cursor-pointer transition-colors flex items-center justify-center overflow-hidden shadow-md border
                                                                ${isSelected ? 'z-40 ring-2 ring-white ring-offset-2 ring-offset-[#0a0a0a]' : 'opacity-90 hover:brightness-125'}
                                                                ${isRecording ? 'animate-pulse border-r-4 border-r-white' : ''}
                                                              `}
                                                              onClick={(e) => !isRecording && handleEventClick(e, evt.id, evt.startTime)}
                                                              onContextMenu={(e) => !isRecording && handleEventContextMenu(e, evt.id)}
                                                          >
                                                              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                                                                   <span className="text-[10px] font-bold text-white truncate px-1 drop-shadow-md select-none z-10 w-full text-center">
                                                                       {tag?.name} {isRecording && '(REC)'}
                                                                   </span>
                                                          </motion.div>
                                                      );
                                                 })}
                                             </div>
                                         ))}

                                          {(!isLive && showTimelineFreezeFrames) && (
                                              <div className="relative h-6 w-full z-10 pointer-events-none shrink-0 border-t border-white/5 pt-1 mt-1 bg-[#0a0a0a]">
                                                  {freezeFrames.sort((a,b) => a.timestamp - b.timestamp).map((ff) => {
                                                      const isStuck = !isPlaying && Math.abs(currentTime - ff.timestamp) < 0.05;
                                                      const isActive = activeFreezeFrameId === ff.id || isStuck;
                                                      return (
                                                          <div key={ff.id}
                                                              className="absolute top-1 bottom-1 w-2 rounded-full cursor-pointer pointer-events-auto transition-all hover:scale-125 z-40 shadow-[0_0_8px_rgba(59,130,246,0.5)] border border-white/20"
                                                              style={{ left: `${(ff.timestamp / (duration || 1)) * 100}%`, backgroundColor: isActive ? "#f59e0b" : "#3b82f6", transform: "translateX(-50%)" }}
                                                              onMouseEnter={() => {
                                                                  setHoveredFreezeFrameId(ff.id);
                                                              }}
                                                              onMouseLeave={() => {
                                                                  setHoveredFreezeFrameId(null);
                                                              }}
                                                              onClick={(e) => { e.stopPropagation(); jumpToMarker(ff.timestamp); }}
                                                          />
                                                      );
                                                  })}
                                              </div>
                                          )}

                                         {/* Markers Row */}
                                         <div className="relative h-6 w-full z-40 pointer-events-none shrink-0 border-t border-white/5 pt-1 mt-1">
                                             {markers.map(marker => (
                                                 <div 
                                                     key={marker.id} 
                                                     className="absolute top-0 bottom-0 w-[2px] pointer-events-none transition-colors"
                                                     style={{ left: `${(marker.time / (duration || 1)) * 100}%`, backgroundColor: `${marker.color}80` }}
                                                 >
                                                     <div 
                                                         className="absolute -top-1 -ml-[11px] pointer-events-auto cursor-pointer transition-transform hover:scale-110 flex items-center justify-center w-6 h-6 rounded-full"
                                                         onClick={(e) => { e.stopPropagation(); jumpToMarker(marker.time); setMarkerModal({ isOpen: true, x: 0, y: 0, mode: 'edit', markerId: marker.id, tempLabel: marker.label, tempColor: marker.color }); }}
                                                         onMouseEnter={() => setHoveredNoteId(marker.id)}
                                                         onMouseLeave={() => setHoveredNoteId(null)}
                                                     >
                                                         <MapPin className="w-5 h-5 drop-shadow-md" style={{ color: marker.color, fill: `${marker.color}30` }} />
                                                     </div>
                                                 </div>
                                             ))}
                                         </div>
                                     </div>
                                </div>
                            </div>
                         </div>
                    </div>
                ) : (
                    // COLLAPSED SIMPLE TIMELINE
                    <div className="h-16 relative w-full group/timeline bg-[#0a0a0a] border-b border-[#222] flex flex-col justify-center px-4 overflow-hidden shadow-inner">
                        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent opacity-0 group-hover/timeline:opacity-100 pointer-events-none transition-opacity duration-500" />
                        
                        {/* Event Trimmer handled at top-level playbar */}

                        {/* Floating Selection Toolbar for Multi-select */}
                        <AnimatePresence>
                            {(selectedEventIds.size > 0 || selectedEventLogs.size > 0) && !(selectedEventIds.size === 1 && !isMultiSelectAction && playbarEventId === Array.from(selectedEventIds)[0]) && (
                                <motion.div
                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                    className="absolute top-1.5 left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 bg-[#181818]/95 backdrop-blur-md px-3 py-1 rounded-full border border-[#333] shadow-2xl text-xs text-white"
                                >
                                    <span className="flex items-center gap-1.5 font-bold text-[#c6ff1f] text-[11px]">
                                        <Check className="w-3.5 h-3.5 text-[#c6ff1f]" />
                                        {Math.max(selectedEventIds.size, selectedEventLogs.size)} event{Math.max(selectedEventIds.size, selectedEventLogs.size) > 1 ? 's' : ''} selected
                                    </span>
                                    <div className="w-[1px] h-3 bg-[#444]" />
                                    <button 
                                        onClick={(e) => addSelectedToPlaylist(undefined, e.shiftKey)}
                                        className="flex items-center gap-1.5 bg-[#c6ff1f] hover:bg-[#a0d600] text-black font-bold px-2.5 py-0.5 rounded-full text-xs transition-all shadow hover:shadow-[0_0_10px_rgba(198,255,31,0.5)]"
                                        title="Add selected events to active playlist (Ctrl+S) • Hold Shift for duplicates"
                                    >
                                        <ListPlus className="w-3.5 h-3.5" />
                                        <span>Add to Playlist</span>
                                        <kbd className="text-[9px] bg-black/25 px-1 py-0.2 rounded font-mono font-normal">Ctrl+S</kbd>
                                    </button>
                                    <button 
                                        onClick={() => {
                                            const visibleEvents = tagEvents.filter(evt => {
                                                let match = true;
                                                if (filterTagId && evt.tagId !== filterTagId) match = false;
                                                if (filterLabelId && (!evt.labelIds || !evt.labelIds.includes(filterLabelId))) match = false;
                                                return match;
                                            });
                                            const allIds = new Set(visibleEvents.map(evt => evt.id));
                                            setSelectedEventIds(allIds);
                                            setSelectedEventLogs(allIds);
                                            setIsMultiSelectAction(true);
                                        }}
                                        className="text-gray-400 hover:text-white px-2 py-0.5 rounded-full hover:bg-white/10 text-[10px] font-medium transition-colors"
                                        title="Select all visible events (Ctrl+A)"
                                    >
                                        Select All
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setSelectedEventIds(new Set());
                                            setSelectedEventLogs(new Set());
                                            setPlaybarEventId(null);
                                            setIsMultiSelectAction(false);
                                        }}
                                        className="text-gray-400 hover:text-white p-0.5 hover:bg-white/10 rounded-full transition-colors"
                                        title="Deselect all (Esc)"
                                    >
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Standard Timeline (Hidden if trimming) */}
                        {!(selectedEventIds.size === 1 && !isMultiSelectAction && playbarEventId === Array.from(selectedEventIds)[0]) && (
                            <div className="relative h-12 w-full flex flex-col justify-end overflow-hidden" ref={timelineContainerRef}>
                                <div className="relative h-full" style={{ width: `${timelineZoom * 100}%` }}>
                                    
                                    {/* YouTube Style Scrubber Line (Safe Zone) */}
                                    <div className="absolute top-0 left-0 w-full h-4 z-50 cursor-ew-resize group/scrubber flex items-center" onMouseDown={handleScrubStart} onContextMenu={handleTimelineContextMenu}>
                                        <div className="relative w-full h-[3px] bg-white/20 group-hover/scrubber:h-1.5 transition-all rounded-full hover:bg-white/30">
                                            <div className="absolute top-0 bottom-0 left-0 bg-red-500 rounded-full" style={{ width: `${(currentTime / (duration || 1)) * 100}%` }} />
                                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full opacity-0 group-hover/scrubber:opacity-100 transition-opacity shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-white/50 pointer-events-none" style={{ left: `calc(${(currentTime / (duration || 1)) * 100}% - 6px)` }} />
                                        </div>
                                    </div>

                                    {/* Events Container */}
                                    <div className="absolute bottom-0 left-0 w-full h-8 bg-[#111] rounded-xl border border-white/10 shadow-inner overflow-hidden">
                                        
                                        {/* Playhead vertical indicator line */}
                                        <motion.div 
                                            className="absolute top-0 bottom-0 w-[2px] bg-red-500/80 z-50 pointer-events-none"
                                            style={{ left: `${(currentTime / (duration || 1)) * 100}%` }}
                                            transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
                                        />

                                        {/* Live Recording Overlay */}
                                        {isTaggingMode && activeRecordings.map(rec => (
                                            <div 
                                                key={rec.tagId}
                                                style={{
                                                    left: `${(Math.min(rec.startTime, currentTime) / (duration || 1)) * 100}%`,
                                                    width: `${(Math.abs(currentTime - rec.startTime) / (duration || 1)) * 100}%`,
                                                    backgroundColor: tags.find(t => t.id === rec.tagId)?.color || 'red'
                                                }}
                                                className="absolute top-0 bottom-0 opacity-30 z-0 pointer-events-none animate-pulse bg-gradient-to-r from-transparent to-current"
                                            />
                                        ))}

                                        {/* Ticks/Grid */}
                                        <div className="absolute inset-0 flex justify-between items-center px-1 opacity-20 pointer-events-none">
                                            {[...Array(40)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-white" />)}
                                        </div>

                                        {/* Events Layer */}
                                        {showTimelineTags && (
                                            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-6 pointer-events-none z-10 px-0.5">
                                                {tagEvents.filter(evt => {
                                                    let match = true;
                                                    if (filterTagId && evt.tagId !== filterTagId) match = false;
                                                    if (filterLabelId && (!evt.labelIds || !evt.labelIds.includes(filterLabelId))) match = false;
                                                    return match;
                                                }).map(evt => {
                                                    const tag = tags.find(t => t.id === evt.tagId);
                                                    const startPct = (evt.startTime / (duration || 1)) * 100;
                                                    const widthPct = ((evt.endTime - evt.startTime) / (duration || 1)) * 100;
                                                    const isSelected = selectedEventIds.has(evt.id);
                                                    
                                                    return (
                                                        <motion.div
                                                            key={evt.id}
                                                            whileHover={{ scaleY: 1.15, scaleX: 1.02, zIndex: 50 }}
                                                            style={{ 
                                                                left: `${startPct}%`,
                                                                width: `${Math.max(widthPct, 0.4)}%`,
                                                                backgroundColor: tag?.color || '#fff'
                                                            }}
                                                            className={`absolute top-0 bottom-0 cursor-pointer pointer-events-auto transition-colors rounded-full group/tagevent shadow-sm border border-black/20
                                                                ${isSelected ? 'ring-2 ring-white z-40 opacity-100 brightness-125' : 'opacity-85 hover:opacity-100 hover:brightness-110'}
                                                            `}
                                                            onClick={(e) => handleEventClick(e, evt.id, evt.startTime)}
                                                            onContextMenu={(e) => handleEventContextMenu(e, evt.id)}
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full pointer-events-none" />
                                                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-black/90 text-white text-[10px] font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/tagevent:opacity-100 pointer-events-none transition-all duration-200 border border-white/10 z-50 shadow-xl backdrop-blur-sm transform translate-y-1 group-hover/tagevent:translate-y-0">
                                                                {tag?.name} {evt.labelIds && evt.labelIds.length > 0 && <span className="text-[#c6ff1f]"> - {evt.labelIds.map(id => labels.find(l => l.id === id)?.name).filter(Boolean).join(', ')}</span>} <span className="text-gray-400 ml-1">({ (evt.endTime - evt.startTime).toFixed(1) }s)</span>
                                                            </div>
                                                        </motion.div>
                                                    );
                                                })}
                                            </div>
                                        )}

                                        {/* Freeze Frames Layer */}
                                        {(!isLive && showTimelineFreezeFrames) && (
                                            <div className="absolute top-0 bottom-0 left-0 w-full pointer-events-none z-30">
                                                {freezeFrames.sort((a,b) => a.timestamp - b.timestamp).map((ff, index) => {
                                                const isStuck = !isPlaying && Math.abs(currentTime - ff.timestamp) < 0.05;
                                                const isActive = activeFreezeFrameId === ff.id || isStuck;
                                                const isHovered = hoveredFreezeFrameId === ff.id && !isActive;
                                                
                                                let markerClass = "absolute top-0 bottom-0 w-0.5 transition-all ";
                                                if (isActive) {
                                                    markerClass += "bg-amber-400 w-1 shadow-[0_0_12px_rgba(245,158,11,1)] z-50";
                                                } else if (isHovered) {
                                                    markerClass += "bg-[#c6ff1f] w-1 shadow-[0_0_12px_rgba(59,130,246,1)] z-50";
                                                } else {
                                                    markerClass += "bg-[#c6ff1f] group/ffmarker shadow-[0_0_8px_rgba(198,255,31,0.8)]";
                                                }

                                                let badgeClass = "w-4 h-4 rounded-full text-white flex items-center justify-center text-[8px] font-bold shadow-md border border-white/20 mb-0.5 ";
                                                if (isActive) {
                                                    badgeClass += "bg-amber-500";
                                                } else if (isHovered) {
                                                    badgeClass += "bg-[#c6ff1f]";
                                                } else {
                                                    badgeClass += "bg-[#c6ff1f]";
                                                }

                                                let iconClass = "w-3 h-3 ";
                                                if (isActive || isHovered) {
                                                    iconClass += "text-white fill-white drop-shadow-[0_0_5px_rgba(255,255,255,0.8)]";
                                                } else {
                                                    iconClass += "text-[#a0d600] fill-[#c6ff1f] drop-shadow-md";
                                                }

                                                return (
                                                    <div 
                                                        key={ff.id} 
                                                        style={{ left: `${(ff.timestamp / (duration || 1)) * 100}%` }} 
                                                        className={`${markerClass} pointer-events-auto cursor-pointer`} 
                                                        onMouseEnter={() => {
                                                            setHoveredFreezeFrameId(ff.id);
                                                        }}
                                                        onMouseLeave={() => {
                                                            setHoveredFreezeFrameId(null);
                                                        }}
                                                        onClick={(e) => { e.stopPropagation(); jumpToMarker(ff.timestamp); }}
                                                    >
                                                        <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all ${isActive || isHovered ? 'scale-125' : ''}`}>
                                                            <div className={badgeClass}>
                                                                {index + 1}
                                                            </div>
                                                            <Snowflake className={iconClass} />
                                                        </div>
                                                    </div>
                                                );
                                            })}
                                        </div>
                                        )}

                                        {/* Markers Layer */}
                                        {showTimelineTags && (
                                            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-8 pointer-events-none z-40">
                                                {markers.map(marker => (
                                                    <div key={marker.id} style={{ left: `${(marker.time / (duration || 1)) * 100}%`, backgroundColor: marker.color }} className="absolute top-0 bottom-0 w-0.5 pointer-events-auto hover:w-1 transition-all cursor-pointer group/marker shadow-md" onClick={(e) => { e.stopPropagation(); jumpToMarker(marker.time); }} onContextMenu={(e) => handleMarkerContextMenu(e, marker)}>
                                                        <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-[#111] shadow-sm" style={{backgroundColor: marker.color}} />
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                        
                                        {/* Removed the background scrubber! Events area is no longer scrubbable */}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Layer 2: Controls - Hidden when trimming event or in playlist mode */}
                {!isTrimmingActive && (
                    isLive ? (
                        <LiveCodingBottomBar
                            clockDetails={liveClock.getMatchClockDetails()}
                            clockState={liveClock.matchClockState}
                            activePeriod={liveClock.activePeriodDef}
                            tagEventsCount={tagEvents.length}
                            timelineZoom={timelineZoom}
                            handleZoomIn={handleZoomIn}
                            handleZoomOut={handleZoomOut}
                            showTimelineFiltersMenu={showTimelineFiltersMenu}
                            setShowTimelineFiltersMenu={setShowTimelineFiltersMenu}
                            showTimelineTags={showTimelineTags}
                            setShowTimelineTags={setShowTimelineTags}
                            onTogglePlay={() => liveClock.toggleLiveClock()}
                            onStartEditing={() => liveClock.setIsEditingTimer(true)}
                            onPopoutTimer={() => {
                                setIsTimerPoppedOut(true);
                                showNotification("Timer popped out into floating resizable window overlay!", "#c6ff1f");
                            }}
                            onPopoutPad={() => {
                                setIsPadPoppedOut(true);
                                showNotification("Coding component popped out into floating resizable window overlay!", "#c6ff1f");
                            }}
                            onImportVideo={handleImportMatchVideo}
                        />
                    ) : (
                        <WorkspaceBottomBar
                            jumpPrevEvent={jumpPrevEvent}
                            jumpNextEvent={jumpNextEvent}
                            handleManualSeek={handleManualSeek}
                            togglePlay={togglePlay}
                            isPlaying={isPlaying}
                            currentTime={currentTime}
                            duration={duration}
                            timelineZoom={timelineZoom}
                            handleZoomIn={handleZoomIn}
                            handleZoomOut={handleZoomOut}
                            playbackRate={playbackRate}
                            setPlaybackRate={setPlaybackRate}
                            showTimelineFiltersMenu={showTimelineFiltersMenu}
                            setShowTimelineFiltersMenu={setShowTimelineFiltersMenu}
                            showTimelineFreezeFrames={showTimelineFreezeFrames}
                            setShowTimelineFreezeFrames={setShowTimelineFreezeFrames}
                            showTimelineTags={showTimelineTags}
                            setShowTimelineTags={setShowTimelineTags}
                            isTimelineExpanded={isTimelineExpanded}
                            setIsTimelineExpanded={setIsTimelineExpanded}
                            isMuted={isMuted}
                            toggleMute={toggleMute}
                            volume={volume}
                            setVolume={setVolume}
                            videoRef={videoRef}
                            setIsMuted={setIsMuted}
                            isLive={isLive}
                        />
                    )
                )}
                            </>
                        )}
                    </motion.div>
                );
            })()}
        </motion.div>

        {/* --- ANIMATION PANEL (RIGHT SIDEBAR REPLACEMENT) --- */}
        {editingAnimationFFId && freezeFrames.find(f => f.id === editingAnimationFFId) && (
            <>
                <div
                    className={`w-1 z-[100] cursor-col-resize transition-colors ${isResizingAnimPanel ? 'bg-[#c6ff1f]' : 'bg-[#222] hover:bg-gray-500'}`}
                    onMouseDown={() => setIsResizingAnimPanel(true)}
                />
                <AnimationPanel
                    width={animationPanelWidth}
                    freezeFrame={freezeFrames.find(f => f.id === editingAnimationFFId)!}
                    shapes={shapes}
                    setShapes={setShapes}
                    onClose={() => { setEditingAnimationFFId(null); setIsAnimationPreviewPlaying(false); }}
                    previewTime={animationPreviewTime}
                    setPreviewTime={setAnimationPreviewTime}
                    isPlaying={isAnimationPreviewPlaying}
                    setIsPlaying={setIsAnimationPreviewPlaying}
                    selectedShapeId={selectedShapeId}
                    setSelectedShapeId={(id) => {
                        setSelectedShapeId(id);
                        if (id) {
                            setTool('move');
                        }
                    }}
                />
            </>
        )}

        
        {/* --- LABELS PANEL --- */}
        {!editingAnimationFFId && !isPresentationMode && (
            <LabelsPanel
                labelsEnabled={labelsEnabled}
                isAdvancedCodingMode={isAdvancedCodingMode}
                labelsPanelWidth={labelsPanelWidth}
                isResizingLabelsPanel={isResizingLabelsPanel}
                setIsResizingLabelsPanel={setIsResizingLabelsPanel}
                isTaggingMode={isTaggingMode}
                isLabelsSelectMode={isLabelsSelectMode}
                setIsLabelsSelectMode={setIsLabelsSelectMode}
                selectedLabelIds={selectedLabelIds}
                setSelectedLabelIds={setSelectedLabelIds}
                selectedGroupIds={selectedGroupIds}
                setSelectedGroupIds={setSelectedGroupIds}
                handleBulkDeleteLabels={handleBulkDeleteLabels}
                setShowNormalTemplateModal={setShowNormalTemplateModal}
                importLabelsFromJSON={importLabelsFromJSON}
                exportUnifiedSetupToJSON={exportUnifiedSetupToJSON}
                labels={labels}
                setLabels={setLabels}
                labelGroups={labelGroups}
                setLabelGroups={setLabelGroups}
                editingLabelId={editingLabelId}
                setEditingLabelId={setEditingLabelId}
                editingGroupId={editingGroupId}
                setEditingGroupId={setEditingGroupId}
                tempLabel={tempLabel}
                setTempLabel={setTempLabel}
                tempGroup={tempGroup}
                setTempGroup={setTempGroup}
                draggedGroup={draggedGroup}
                setDraggedGroup={setDraggedGroup}
                draggedLabel={draggedLabel}
                setDraggedLabel={setDraggedLabel}
                activeRecordings={activeRecordings}
                selectedEventIds={selectedEventIds}
                tagEvents={tagEvents}
                filterLabelId={filterLabelId}
                handleLabelClick={handleLabelClick}
                showNotification={showNotification}
            />
        )}

        {/* --- RIGHT SIDEBAR --- */}
        {!editingAnimationFFId && !isAdvancedCodingMode && !isPresentationMode && (
            <WorkspaceSidebar
                sidebarRef={sidebarRef}
                sidebarWidth={sidebarWidth}
                setIsResizingSidebar={setIsResizingSidebar}
                activeSidebarTab={activeSidebarTab}
                setActiveSidebarTab={setActiveSidebarTab}
                isTaggingMode={isTaggingMode}
                setIsTaggingMode={setIsTaggingMode}
                setActiveRecordings={setActiveRecordings}
                setTool={setTool}
                setSelectedEventIds={setSelectedEventIds}
                labelsEnabled={labelsEnabled}
                setLabelsEnabled={setLabelsEnabled}
                setShowNormalTemplateModal={setShowNormalTemplateModal}
                currentNormalTemplateName={currentNormalTemplateName}
                onOpenCodeFilesModal={() => setShowCodeFilesModal(true)}
                onOpenCodeFileSaveModal={() => setShowCodeFileSaveModal(true)}
                currentCodeFileName={currentCodeFileName}
                onPopoutCodingPanel={() => {
                  setIsPadPoppedOut(true);
                  setPoppedOutCodingMode('panel');
                  showNotification("Coding Panel popped out into a floating resizable window entity near your video!", "#c6ff1f");
                }}
                exportUnifiedSetupToJSON={exportUnifiedSetupToJSON}
                unifiedFileInputRef={unifiedFileInputRef}
                handleUnifiedFileSelect={handleUnifiedFileSelect}
                setIsAdvancedCodingMode={setIsAdvancedCodingMode}
                setTagSettingsOpen={setTagSettingsOpen}
                tagPanelDensity={tagPanelDensity}
                setTagPanelDensity={setTagPanelDensity}
                tagPanelFontSizeMode={tagPanelFontSizeMode}
                setTagPanelFontSizeMode={setTagPanelFontSizeMode}
                tags={tags}
                activeRecordings={activeRecordings}
                tagEvents={tagEvents}
                setTagEvents={setTagEvents}
                filterTagId={filterTagId}
                setFilterTagId={setFilterTagId}
                filterLabelId={filterLabelId}
                setFilterLabelId={setFilterLabelId}
                handleTagClick={handleTagClick}
                importEventsFromCSV={importEventsFromCSV}
                exportEventsToCSV={exportEventsToCSV}
                handleUndoEvents={handleUndoEvents}
                canUndoEvents={canUndoEvents}
                handleRedoEvents={handleRedoEvents}
                canRedoEvents={canRedoEvents}
                selectedEventLogs={selectedEventLogs}
                setSelectedEventLogs={setSelectedEventLogs}
                selectedEventIds={selectedEventIds}
                addEventsToPlaylist={addEventsToPlaylist}
                getDisplayEvents={getDisplayEvents}
                showNotification={showNotification}
                eventSortMode={eventSortMode}
                setEventSortMode={setEventSortMode}
                labels={labels}
                labelGroups={labelGroups}
                handleLabelClick={handleLabelClick}
                bulkDeleteConfirmation={bulkDeleteConfirmation}
                setBulkDeleteConfirmation={setBulkDeleteConfirmation}
                isEventsEditMode={isEventsEditMode}
                setIsEventsEditMode={setIsEventsEditMode}
                logDeleteConfirmation={logDeleteConfirmation}
                setLogDeleteConfirmation={setLogDeleteConfirmation}
                jumpToMarker={jumpToMarker}
                setPlaybarEventId={setPlaybarEventId}
                handleEventContextMenu={handleEventContextMenu}
                notesSubTab={notesSubTab}
                setNotesSubTab={setNotesSubTab}
                setMarkerModal={setMarkerModal}
                currentTime={currentTime}
                markers={markers}
                setMarkers={setMarkers}
                projectNotes={projectNotes}
                setProjectNotes={setProjectNotes}
                playlists={playlists}
                setPlaylistModal={setPlaylistModal}
                activePlaylistId={activePlaylistId}
                setActivePlaylistId={setActivePlaylistId}
                setPlaylistDeleteId={setPlaylistDeleteId}
                showPlaylistPlaybar={showPlaylistPlaybar}
                setShowPlaylistPlaybar={setShowPlaylistPlaybar}
                handlePlaylistClipSelect={handlePlaylistClipSelect}
                autoplay={autoplay}
                setAutoplay={setAutoplay}
                exportPlaylistVideo={exportPlaylistVideo}
                startPlaylistAutoplay={startPlaylistAutoplay}
                allBatchTagEvents={allBatchTagEvents}
                allBatchTags={allBatchTags}
                allBatchLabels={allBatchLabels}
                batchMode={batchMode}
                playlistPlaybarIndex={playlistPlaybarIndex}
                draggingEventIndex={draggingEventIndex}
                setDraggingEventIndex={setDraggingEventIndex}
                findEventAcrossBatch={findEventAcrossBatch}
                duplicatePlaylistEvent={duplicatePlaylistEvent}
                removeEventFromPlaylist={removeEventFromPlaylist}
                handleResetPlaylistClipTrim={handleResetPlaylistClipTrim}
                reorderPlaylistEvents={reorderPlaylistEvents}
                addSelectedToPlaylist={addSelectedToPlaylist}
                onEnterPresentationMode={() => handleEnterPresentationMode()}
            />
        )}

        {/* --- ADVANCED CODING PAD --- */}
        {isAdvancedCodingMode && !editingAnimationFFId && !isPresentationMode && (
            <motion.div 
                initial={{ x: 300, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.6, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                className="flex-1 min-w-0 select-none"
                style={{ userSelect: 'none', WebkitUserSelect: 'none' }}
            >
                <AdvancedCodingPad 
                    tags={tags}
                    labels={labels}
                    labelGroups={labelGroups}
                    setTags={setTags}
                    setLabels={setLabels}
                    setLabelGroups={setLabelGroups}
                    items={advancedPadItems}
                    setItems={setAdvancedPadItems}
                    connectors={connectors}
                    setConnectors={setConnectors}
                    isTaggingMode={isTaggingMode}
                    setIsTaggingMode={setIsTaggingMode}
                    activeRecording={activeRecording}
                    activeRecordings={activeRecordings}
                    onTagClick={(tagId) => handleTagClick(tagId, { ignoreLeadLag: !isPadQuickTagEnabled })}
                    onLabelClick={handleLabelClick}
                    onAddTag={(tag) => setTags(prev => [...prev, tag])}
                    onAddLabel={(label) => setLabels(prev => [...prev, label])}
                    onExit={() => setIsAdvancedCodingMode(false)}
                    onPopout={() => {
                      setIsPadPoppedOut(true);
                      setPoppedOutCodingMode('pad');
                      showNotification("Advanced Coding Pad popped out into a floating resizable window entity near your video!", "#c6ff1f");
                    }}
                    onOpenTagSettings={() => setTagSettingsOpen(true)}
                    showNotification={showNotification}
                    currentCodeFileName={currentCodeFileName}
                    onOpenCodeFilesModal={() => setShowCodeFilesModal(true)}
                    onOpenCodeFileSaveModal={() => setShowCodeFileSaveModal(true)}
                    isQuickTagEnabled={isPadQuickTagEnabled}
                    onToggleQuickTag={handleTogglePadQuickTag}
                    onEditTag={(tagId) => {
                        setEditingTagId(tagId);
                        setTagSettingsOpen(true);
                    }}
                    onEditLabel={(labelId) => {
                        const label = labels.find(l => l.id === labelId);
                        if (label) {
                            setEditingLabelId(labelId);
                            setTempLabel({ name: label.name, shortcut: label.shortcut, exclusive: label.exclusive });
                        }
                    }}
                />
            </motion.div>
        )}
      </div>
      
    {labelDeleteConfirmation && (
        <ConfirmOverlay
            title="Delete Selected"
            message="Are you sure you want to delete the selected labels and groups? This action cannot be undone."
            onConfirm={confirmBulkDeleteLabels}
            onCancel={() => setLabelDeleteConfirmation(false)}
        />
    )}

    {isAdvancedCodingMode && editingLabelId && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50">
            <div className="bg-[#161616] border border-[#c6ff1f] rounded-xl p-4 w-64 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="text-white font-bold text-sm">Edit Label</h3>
                    <button onClick={() => { setEditingLabelId(null); setTempLabel({}); }} className="text-gray-400 hover:text-white"><X className="w-4 h-4" /></button>
                </div>
                <div className="space-y-3">
                    <div>
                        <div className="flex justify-between items-center mb-1">
                            <label className="text-xs text-gray-400 block">Name</label>
                            <span className="text-[10px] text-gray-500">Separate with commas (,)</span>
                        </div>
                        <input 
                            autoFocus 
                            type="text" 
                            value={tempLabel.name || ''} 
                            onChange={e => setTempLabel({...tempLabel, name: e.target.value})} 
                            onKeyDown={e => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    const raw = (tempLabel.name || '').trim();
                                    const names = raw.split(',').map(s => s.trim()).filter(Boolean);
                                    if (names.length > 1) {
                                        const current = labels.find(l => l.id === editingLabelId);
                                        const now = Date.now();
                                        const additional: Label[] = names.slice(1).map((n, i) => ({
                                            id: `label-${now}-${i}-${Math.random().toString(36).substring(2, 6)}`,
                                            name: n,
                                            groupId: current?.groupId
                                        }));
                                        setLabels(prev => prev.map(l => l.id === editingLabelId ? { ...l, ...tempLabel, name: names[0] } as Label : l).concat(additional));
                                        showNotification(`Added ${names.length} labels: ${names.join(', ')}`, '#c6ff1f');
                                    } else if (names.length === 1) {
                                        setLabels(prev => prev.map(l => l.id === editingLabelId ? { ...l, ...tempLabel, name: names[0] } as Label : l));
                                    }
                                    setEditingLabelId(null);
                                    setTempLabel({});
                                }
                            }}
                            className="w-full bg-[#111] border border-[#444] rounded px-2 py-1 text-xs text-white focus:border-[#c6ff1f] outline-none" 
                            placeholder="e.g. Pass, Shot, Goal, Foul" 
                        />
                    </div>
                    <button onClick={() => {
                        const raw = (tempLabel.name || '').trim();
                        const names = raw.split(',').map(s => s.trim()).filter(Boolean);
                        if (names.length > 1) {
                            const current = labels.find(l => l.id === editingLabelId);
                            const now = Date.now();
                            const additional: Label[] = names.slice(1).map((n, i) => ({
                                id: `label-${now}-${i}-${Math.random().toString(36).substring(2, 6)}`,
                                name: n,
                                groupId: current?.groupId
                            }));
                            setLabels(prev => prev.map(l => l.id === editingLabelId ? { ...l, ...tempLabel, name: names[0] } as Label : l).concat(additional));
                            showNotification(`Added ${names.length} labels: ${names.join(', ')}`, '#c6ff1f');
                        } else if (names.length === 1) {
                            setLabels(prev => prev.map(l => l.id === editingLabelId ? { ...l, ...tempLabel, name: names[0] } as Label : l));
                        }
                        setEditingLabelId(null);
                        setTempLabel({});
                    }} className="w-full py-1.5 bg-[#c6ff1f] hover:bg-[#b0e61c] text-black text-xs font-bold rounded mt-2">
                        Save Label(s)
                    </button>
                </div>
            </div>
        </div>
    )}

    <WorkspaceModals 
        tagSettingsOpen={tagSettingsOpen}
        setTagSettingsOpen={setTagSettingsOpen}
        tags={tags}
        setTags={setTags}
        editingTagId={editingTagId}
        setEditingTagId={setEditingTagId}
        tempTag={tempTag}
        setTempTag={setTempTag}
        deleteTag={deleteTag}
        contextMenu={contextMenu}
        setContextMenu={setContextMenu}
        csvImportState={csvImportState}
        setCsvImportState={setCsvImportState}
        labels={labels}
        setLabels={setLabels}
        labelGroups={labelGroups}
        setLabelGroups={setLabelGroups}
        onOpenTemplateManager={() => { setTagSettingsOpen(false); setShowNormalTemplateModal(true); }}
        exportUnifiedSetupToJSON={exportUnifiedSetupToJSON}
        showNotification={showNotification}
        setTagEvents={setTagEvents}
        tagEvents={tagEvents}
        playlists={playlists}
        activePlaylistId={activePlaylistId}
        onAddToPlaylist={(ids, plId, force) => addEventsToPlaylist(ids, plId, force)}
        playlistModal={playlistModal}
        setPlaylistModal={setPlaylistModal}
        savePlaylist={savePlaylist}
        playlistDeleteId={playlistDeleteId}
        setPlaylistDeleteId={setPlaylistDeleteId}
        confirmDeletePlaylist={confirmDeletePlaylist}
        editEventModal={editEventModal}
        setEditEventModal={setEditEventModal}
        currentTime={currentTime}
        requestCloseEditEventModal={requestCloseEditEventModal}
        saveEditedEvent={saveEditedEvent}
        handleDeleteEventRequest={handleDeleteEventRequest}
        deleteConfirmation={deleteConfirmation}
        setDeleteConfirmation={setDeleteConfirmation}
        confirmDeleteEvent={confirmDeleteEvent}
        tagDeleteConfirmation={tagDeleteConfirmation}
        setTagDeleteConfirmation={setTagDeleteConfirmation}
        confirmDeleteTag={confirmDeleteTag}
        workspaceAlert={workspaceAlert}
        setWorkspaceAlert={setWorkspaceAlert}
        markerModal={markerModal}
        setMarkerModal={setMarkerModal}
        saveMarker={saveMarker}
        deleteMarker={deleteMarker}
        showCloseConfirm={showCloseConfirm}
        setShowCloseConfirm={setShowCloseConfirm}
        confirmClose={confirmClose}
        confirmUnsavedModal={confirmUnsavedModal}
        setConfirmUnsavedModal={setConfirmUnsavedModal}
        fileInputRef={fileInputRef}
    />

    <CodeFilesModal
        isOpen={showCodeFilesModal || showNormalTemplateModal}
        onClose={() => {
            setShowCodeFilesModal(false);
            setShowNormalTemplateModal(false);
        }}
        currentFileName={currentCodeFileName}
        existingEventsCount={tagEvents.length}
        currentTags={tags}
        currentLabels={labels}
        currentLabelGroups={labelGroups}
        currentPadItems={advancedPadItems}
        currentConnectors={connectors}
        onApplyCodeFile={handleApplyCodeFile}
        onCreateBlankFile={handleCreateBlankCodeFile}
        showNotification={showNotification}
    />

    <CodeFileSaveModal
        isOpen={showCodeFileSaveModal}
        onClose={() => setShowCodeFileSaveModal(false)}
        currentFileName={currentCodeFileName}
        existingFiles={loadAllCodeFiles()}
        tagsCount={tags.length}
        labelsCount={labels.length}
        padItemsCount={advancedPadItems.length}
        onConfirmSave={handleSaveCodeFile}
    />

    {showBatchRelinkerModal && batchMode && (
      <BatchVideoRelinker
        batch={batchMode.batch}
        projects={batchMode.allBatchProjects}
        activeProjectId={project.id}
        projectBlobs={batchMode.projectBlobs}
        onSelectProject={(pId) => {
          batchMode.onSelectProject(pId);
          setShowBatchRelinkerModal(false);
        }}
        onRelinkSingle={async (proj, file, handle) => {
          if (batchMode.onRelinkSingleVideo) {
            await batchMode.onRelinkSingleVideo(proj, file, handle);
          } else {
            batchMode.onReloadVideo(proj);
          }
        }}
        onRelinkBatch={async (mappings) => {
          if (batchMode.onBatchRelinkVideos) {
            await batchMode.onBatchRelinkVideos(mappings);
          }
        }}
        onClose={() => setShowBatchRelinkerModal(false)}
        isInline={false}
      />
    )}




    {showPresentationCustomizeModal && (
      <CustomizePlaylistsModal
        playlists={playlists}
        config={presentationConfig}
        onSaveConfig={(newConfig, startImmediately) => {
          setPresentationConfig(newConfig);
          try {
            localStorage.setItem(`tacstem_presentation_config_${project.id}`, JSON.stringify(newConfig));
          } catch (e) {}
          setShowPresentationCustomizeModal(false);
          if (startImmediately) {
            handleEnterPresentationMode(true);
          }
        }}
        onClose={() => setShowPresentationCustomizeModal(false)}
        tagEvents={tagEvents}
        tags={tags}
        allBatchProjects={batchMode?.allBatchProjects}
        onCreateDefaultPlaylist={handleCreateDefaultPlaylist}
      />
    )}

    <ExportVideoModal
      isOpen={exportModalState.isOpen}
      onClose={() => setExportModalState(prev => ({ ...prev, isOpen: false }))}
      title={exportModalState.title}
      clips={exportModalState.clips}
      defaultWithFreezeFrames={exportModalState.defaultWithFreezeFrames}
      defaultMaskSettings={exportModalState.defaultMaskSettings}
      onRecordExport={(options) => {
        setExportModalState(prev => ({ ...prev, isOpen: false }));
        startRecordExport(activePlaylistId, {
          withFreezeFrames: options?.withFreezeFrames ?? exportModalState.defaultWithFreezeFrames,
          customFileName: options?.fileName || exportModalState.title
        });
      }}
      onFallbackToScreenRecord={() => {
        setExportModalState(prev => ({ ...prev, isOpen: false }));
        startRecordExport(activePlaylistId, {
          withFreezeFrames: exportModalState.defaultWithFreezeFrames,
          customFileName: exportModalState.title
        });
      }}
    />

    {/* Live Coding Period Transition Confirmation Modal */}
    <LivePeriodConfirmModal
      pendingPeriod={liveClock.pendingNextPeriod}
      onConfirm={liveClock.confirmNextPeriod}
      onCancel={liveClock.cancelNextPeriod}
    />

    {/* Floating Draggable & Resizable Timer Entity */}
    <AnimatePresence>
      {isTimerPoppedOut && !externalTimerContainer && (
        <motion.div
          drag
          dragControls={timerDragControls}
          dragListener={false}
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          className="fixed z-[300] bg-[#101014]/95 backdrop-blur-xl border border-[#c6ff1f]/40 rounded-xl shadow-[0_8px_32px_rgba(0,0,0,0.85)] flex flex-col overflow-hidden resize min-w-[240px] min-h-[125px] max-w-[calc(100vw-24px)] max-h-[90vh]"
          style={{
            left: timerWidgetPos.x,
            top: timerWidgetPos.y,
            width: timerWidgetPos.w,
            height: timerWidgetPos.h
          }}
        >
          {/* Window Title & Drag Handle Header */}
          <div 
            onPointerDown={(e) => timerDragControls.start(e)}
            className="h-8 bg-[#16161b] border-b border-[#25252d] flex items-center justify-between px-2.5 cursor-grab active:cursor-grabbing select-none shrink-0"
          >
            <div className="flex items-center gap-1.5 min-w-0">
              <GripHorizontal className="w-3.5 h-3.5 text-[#c6ff1f] shrink-0" />
              <span className="text-[11px] font-bold text-gray-200 truncate">Match Timer</span>
              <span className="text-[9px] bg-[#c6ff1f]/15 text-[#c6ff1f] border border-[#c6ff1f]/30 px-1 py-0.2 rounded font-mono uppercase font-bold">
                Floating
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => openExternalWindow('timer')}
                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Open in Standalone Browser OS Window"
              >
                <Maximize2 className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => setIsTimerPoppedOut(false)}
                className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Dock Timer back to Workspace"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Window Body */}
          <div className="flex-1 overflow-hidden p-2 flex flex-col justify-center bg-[#0d0d10]">
            {renderTimerWidgetContent()}
          </div>

          {/* Resize handle visual cue */}
          <div className="absolute bottom-1 right-1 w-2.5 h-2.5 border-r border-b border-[#c6ff1f]/50 pointer-events-none rounded-br" />
        </motion.div>
      )}
    </AnimatePresence>

    {/* Floating Draggable & Resizable Coding Pad Entity */}
    <AnimatePresence>
      {isPadPoppedOut && !externalPadContainer && (
        <motion.div
          drag
          dragControls={padDragControls}
          dragListener={false}
          dragMomentum={false}
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          className="fixed z-[300] bg-[#121215]/95 backdrop-blur-xl border border-indigo-500/30 rounded-2xl shadow-2xl flex flex-col overflow-hidden resize min-w-[280px] sm:min-w-[360px] min-h-[300px] max-w-[calc(100vw-24px)] max-h-[88vh]"
          style={{
            left: padWidgetPos.x,
            top: padWidgetPos.y,
            width: padWidgetPos.w,
            height: padWidgetPos.h
          }}
        >
          {/* Window Title & Drag Handle Header */}
          <div 
            onPointerDown={(e) => padDragControls.start(e)}
            className="h-10 bg-[#18181c] border-b border-[#2d2d35] flex items-center justify-between px-3 cursor-grab active:cursor-grabbing select-none shrink-0"
          >
            <div className="flex items-center gap-2 min-w-0">
              <GripHorizontal className="w-4 h-4 text-indigo-400 shrink-0" />
              <div className="flex items-center bg-[#101014] border border-[#2d2d38] rounded-lg p-0.5 shadow-inner">
                <button
                  type="button"
                  onClick={() => setPoppedOutCodingMode('panel')}
                  className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                    poppedOutCodingMode === 'panel'
                      ? 'bg-[#c6ff1f] text-black shadow-xs font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Switch to Normal Coding Panel (Clean tags grid & hotkeys)"
                >
                  <Tag className="w-3 h-3" />
                  <span>Coding Panel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPoppedOutCodingMode('pad')}
                  className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                    poppedOutCodingMode === 'pad'
                      ? 'bg-[#c6ff1f] text-black shadow-xs font-black'
                      : 'text-gray-400 hover:text-white'
                  }`}
                  title="Switch to Interactive Advanced Coding Pad"
                >
                  <Layers className="w-3 h-3" />
                  <span>Advanced Pad</span>
                </button>
              </div>
              <span className="text-[10px] bg-[#c6ff1f]/10 text-[#c6ff1f] border border-[#c6ff1f]/20 px-1.5 py-0.5 rounded font-mono uppercase font-bold hidden sm:inline-block">
                Floating
              </span>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <button
                type="button"
                onClick={() => openExternalWindow('pad')}
                className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-colors cursor-pointer"
                title="Open in Standalone Browser OS Window"
              >
                <Maximize2 className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setIsPadPoppedOut(false)}
                className="p-1 hover:bg-red-500/20 rounded text-gray-400 hover:text-red-400 transition-colors cursor-pointer"
                title="Dock Coding Pad back to Workspace"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Window Body */}
          <div className="flex-1 overflow-hidden flex flex-col bg-[#0d0d10]">
            {poppedOutCodingMode === 'panel' ? (
              renderCodingPanelContent()
            ) : (
              <div className="flex-1 overflow-hidden flex flex-col p-2">
                <AdvancedCodingPad 
                  tags={tags}
                  labels={labels}
                  labelGroups={labelGroups}
                  setTags={setTags}
                  setLabels={setLabels}
                  setLabelGroups={setLabelGroups}
                  items={advancedPadItems}
                  setItems={setAdvancedPadItems}
                  connectors={connectors}
                  setConnectors={setConnectors}
                  isTaggingMode={isTaggingMode}
                  setIsTaggingMode={setIsTaggingMode}
                  activeRecording={activeRecording}
                  activeRecordings={activeRecordings}
                  onTagClick={(tagId) => handleTagClick(tagId, { ignoreLeadLag: !isPadQuickTagEnabled })}
                  onLabelClick={handleLabelClick}
                  onAddTag={(tag) => setTags(prev => [...prev, tag])}
                  onAddLabel={(label) => setLabels(prev => [...prev, label])}
                  onExit={() => setIsPadPoppedOut(false)}
                  showNotification={showNotification}
                  hideCodeFile={true}
                  hideTagSettings={true}
                  isQuickTagEnabled={isPadQuickTagEnabled}
                  onToggleQuickTag={handleTogglePadQuickTag}
                  onEditTag={() => {}}
                  onEditLabel={(labelId) => {
                    const label = labels.find(l => l.id === labelId);
                    if (label) {
                      setEditingLabelId(labelId);
                      setTempLabel({ name: label.name, shortcut: label.shortcut, exclusive: label.exclusive });
                    }
                  }}
                />
              </div>
            )}
          </div>

          {/* Resize handle visual cue */}
          <div className="absolute bottom-1 right-1 w-3 h-3 border-r-2 border-b-2 border-indigo-400/50 pointer-events-none rounded-br" />
        </motion.div>
      )}
    </AnimatePresence>

    {/* Portals for External OS Browser Popouts */}
    {externalTimerContainer && createPortal(
      <div className="flex-1 flex flex-col p-4 bg-[#0e0e11] text-white min-h-screen">
        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-4">
          <span className="text-sm font-bold text-[#c6ff1f] uppercase tracking-wider flex items-center gap-2">
            ⏰ Standalone Match Timer
          </span>
          <button
            onClick={() => {
              if (timerExternalWindow) timerExternalWindow.close();
              setTimerExternalWindow(null);
              setExternalTimerContainer(null);
            }}
            className="px-3 py-1 bg-red-600/80 hover:bg-red-600 rounded text-xs text-white font-bold"
          >
            Close & Return
          </button>
        </div>
        {renderTimerWidgetContent()}
      </div>,
      externalTimerContainer
    )}

    {externalPadContainer && createPortal(
      <div className="flex-1 flex flex-col p-2 bg-[#0e0e11] text-white h-screen">
        <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-2 px-2 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-[#c6ff1f] uppercase tracking-wider flex items-center gap-2">
              🏷️ Standalone Coding Entity
            </span>
            <div className="flex items-center bg-[#101014] border border-[#2d2d38] rounded-lg p-0.5 shadow-inner">
              <button
                type="button"
                onClick={() => setPoppedOutCodingMode('panel')}
                className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                  poppedOutCodingMode === 'panel'
                    ? 'bg-[#c6ff1f] text-black shadow-xs font-black'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Switch to Normal Coding Panel"
              >
                <Tag className="w-3 h-3" />
                <span>Coding Panel</span>
              </button>
              <button
                type="button"
                onClick={() => setPoppedOutCodingMode('pad')}
                className={`px-2 py-0.5 rounded text-[9.5px] font-bold uppercase transition-all flex items-center gap-1 cursor-pointer ${
                  poppedOutCodingMode === 'pad'
                    ? 'bg-[#c6ff1f] text-black shadow-xs font-black'
                    : 'text-gray-400 hover:text-white'
                }`}
                title="Switch to Interactive Advanced Coding Pad"
              >
                <Layers className="w-3 h-3" />
                <span>Advanced Pad</span>
              </button>
            </div>
          </div>
          <button
            onClick={() => {
              if (padExternalWindow) padExternalWindow.close();
              setPadExternalWindow(null);
              setExternalPadContainer(null);
            }}
            className="px-2.5 py-1 bg-red-600/80 hover:bg-red-600 rounded text-xs text-white font-bold cursor-pointer"
          >
            Close & Return
          </button>
        </div>
        <div className="flex-1 overflow-hidden flex flex-col">
          {poppedOutCodingMode === 'panel' ? (
            renderCodingPanelContent()
          ) : (
            <AdvancedCodingPad 
              tags={tags}
              labels={labels}
              labelGroups={labelGroups}
              setTags={setTags}
              setLabels={setLabels}
              setLabelGroups={setLabelGroups}
              items={advancedPadItems}
              setItems={setAdvancedPadItems}
              connectors={connectors}
              setConnectors={setConnectors}
              isTaggingMode={isTaggingMode}
              setIsTaggingMode={setIsTaggingMode}
              activeRecording={activeRecording}
              activeRecordings={activeRecordings}
              onTagClick={(tagId) => handleTagClick(tagId, { ignoreLeadLag: !isPadQuickTagEnabled })}
              onLabelClick={handleLabelClick}
              onAddTag={(tag) => setTags(prev => [...prev, tag])}
              onAddLabel={(label) => setLabels(prev => [...prev, label])}
              onExit={() => {}}
              showNotification={showNotification}
              hideCodeFile={true}
              hideTagSettings={true}
              isQuickTagEnabled={isPadQuickTagEnabled}
              onToggleQuickTag={handleTogglePadQuickTag}
              onEditTag={() => {}}
              onEditLabel={(labelId) => {
                const label = labels.find(l => l.id === labelId);
                if (label) {
                  setEditingLabelId(labelId);
                  setTempLabel({ name: label.name, shortcut: label.shortcut, exclusive: label.exclusive });
                }
              }}
            />
          )}
        </div>
      </div>,
      externalPadContainer
    )}
    </div>
  );
};
