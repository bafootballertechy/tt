import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play, Pause, RotateCcw, RotateCw, Trash2, Upload,
  Maximize, Minimize, MousePointer2, Circle, Pen,
  MoveUpRight, Hexagon, GitCommitVertical, Settings2,
  ChevronRight, ChevronLeft, Type, Video, Undo2, Redo2,
  Download, X, AlertTriangle, LogOut, Minus, Layers, Eye, EyeOff,
  SlidersHorizontal, CornerUpRight, Volume2, VolumeX, Flag, User, Flashlight, ZoomIn, Cylinder,
  Activity, Spline, Slash, MoreHorizontal, PaintBucket,
  Tags, FolderPlus, Folder, FolderOpen, Film, ListPlus, Filter, Keyboard, Plus, Save, Edit2, Check,
  GripVertical, PlayCircle, StopCircle, Pencil, Trash, PlusCircle, FileUp, FileDown, MessageSquare, Scissors, GripHorizontal,
  SkipBack, SkipForward, ZoomOut, Snowflake, Clock, Timer, LayoutGrid, MoreVertical, Calendar, Disc, Code, Zap,
  ChevronsUp, ChevronsDown, ChevronUp, ChevronDown, Tag, Eraser, Pipette, RefreshCw, HelpCircle,
  Search, Star, Bell, ArrowRight, ArrowDownAZ, ArrowUpZA, SortDesc,
  SquarePen, FileVideo, ArrowLeftRight, Radio, UploadCloud, List,
  Copy, FileText, ExternalLink
} from 'lucide-react';

import type { ProjectData, Project, Batch, BoardProject } from './types';
import { 
  saveVideoLocally, saveProjectDataLocally, saveFileHandle, listProjectsLocally, 
  deleteProjectLocally, loadFileHandle, loadVideoLocally,
  saveBatchLocally, listBatchesLocally, deleteBatchLocally,
  saveBoardProjectLocally, listBoardProjectsLocally, deleteBoardProjectLocally,
  getAllStoredVideoIds, requestPersistentStorage
} from './utils/db';
import { Logo, Wordmark } from './components/Logo';
import { LoginScreen } from './components/LoginScreen';
import { NewProjectModal } from './components/NewProjectModal';
import { NewBatchModal } from './components/Batches/NewBatchModal';
import { ManageBatchGamesModal } from './components/Batches/ManageBatchGamesModal';
import { EditBatchModal } from './components/Batches/EditBatchModal';
import { BatchesDashboardView } from './components/Batches/BatchesDashboardView';
import { BatchStatsPage } from './components/Batches/BatchStatsPage';
import TacticalBoard from './board/TacticalBoard';
import { BoardProjectsDashboardView } from './components/Board/BoardProjectsDashboardView';
import { NewBoardProjectModal } from './components/Board/NewBoardProjectModal';
import { EditBoardProjectModal } from './components/Board/EditBoardProjectModal';
import { createDefaultBoardProject } from './components/Board/boardProjectUtils';

import { ErrorBoundary, StorageWarning, LoadingProjectOverlay, TutorialOverlay, ConfirmOverlay } from './components/Shared/SharedUI';
import { PWAInstallButton } from './components/Shared/PWAInstallButton';
import { BrowserRecommendationBanner } from './components/Shared/BrowserRecommendationBanner';
import { Workspace } from './components/Workspace/Workspace';
import { DEFAULT_TAGS } from './components/Workspace/Workspace.constants';

const loginAsGuest = () => {
    localStorage.setItem('tacstemGuest', 'true');
    window.location.reload();
};

const logout = () => {
    localStorage.removeItem('tacstemGuest');
    window.location.reload();
};
export default function App() {
  const [user, setUser] = useState<any>({ uid: 'guest', displayName: 'Guest User' });
  const [userPlan, setUserPlan] = useState<'free' | 'pro'>('pro');
  const [authLoading, setAuthLoading] = useState(true);
  const [view, setView] = useState<'home' | 'workspace'>('home');
  const [projects, setProjects] = useState<Project[]>([]);
  const [activeProject, setActiveProject] = useState<Project | null>(null);

  // Batches state
  const [dashboardTab, setDashboardTab] = useState<'games' | 'batches' | 'board'>('games');
  const [batches, setBatches] = useState<Batch[]>([]);
  const [activeBatch, setActiveBatch] = useState<Batch | null>(null);
  const [activeBatchStats, setActiveBatchStats] = useState<Batch | null>(null);
  const [batchModeConfig, setBatchModeConfig] = useState<{
    initialPlaylistId?: string;
    initialSeekTime?: number;
    autoPlayPlaylist?: boolean;
  } | null>(null);
  const [isNewBatchModalOpen, setIsNewBatchModalOpen] = useState(false);
  const [managingGamesBatch, setManagingGamesBatch] = useState<Batch | null>(null);
  const [editingBatch, setEditingBatch] = useState<Batch | null>(null);
  
  // Tactical Board Projects state
  const [boardProjects, setBoardProjects] = useState<BoardProject[]>([]);
  const [activeBoardProject, setActiveBoardProject] = useState<BoardProject | null>(null);
  const [isNewBoardProjectModalOpen, setIsNewBoardProjectModalOpen] = useState(false);
  const [editingBoardProject, setEditingBoardProject] = useState<BoardProject | null>(null);
  
  // Transient blob store for current session
  const [projectBlobs, setProjectBlobs] = useState<Map<string, string>>(new Map());
  // Set of project IDs whose video files exist locally in IndexedDB storage
  const [storedVideoIds, setStoredVideoIds] = useState<Set<string>>(new Set());
  const [loadingProjectId, setLoadingProjectId] = useState<string | null>(null);
  const [missingVideoProject, setMissingVideoProject] = useState<Project | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // New Project Modal & Drag-Drop State
  const [isNewProjectModalOpen, setIsNewProjectModalOpen] = useState(false);
  const [droppedFile, setDroppedFile] = useState<File | null>(null);
  const [isDashboardDragOver, setIsDashboardDragOver] = useState(false);

  // Editing state for projects
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<{name: string, description: string}>({ name: '', description: '' });
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showTutorial, setShowTutorial] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState<{ message: string, onConfirm: () => void } | null>(null);
  const [pendingPermissionHandle, setPendingPermissionHandle] = useState<{ handle: any, project: Project } | null>(null);

  // Dashboard state
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all'); // 'all', 'recent', 'favourites'
  const [sortBy, setSortBy] = useState('date'); // 'date', 'name', 'status'
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [toast, setToast] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'minimal' | 'expanded'>(() => {
      try {
          const saved = localStorage.getItem('tacstemDashboardViewMode');
          if (saved === 'minimal' || saved === 'expanded') return saved;
      } catch (e) {
          // ignore
      }
      return 'minimal'; // Default to minimal as requested by user!
  });

  const handleSetViewMode = (mode: 'minimal' | 'expanded') => {
      setViewMode(mode);
      try {
          localStorage.setItem('tacstemDashboardViewMode', mode);
      } catch (e) {
          // ignore
      }
  };

  // Full text view & expansion states
  const [expandedCardDescIds, setExpandedCardDescIds] = useState<Set<string>>(new Set());
  const [expandedCardTitleIds, setExpandedCardTitleIds] = useState<Set<string>>(new Set());
  const [detailModalProject, setDetailModalProject] = useState<Project | null>(null);
  const [copiedProjectId, setCopiedProjectId] = useState<string | null>(null);

  const toggleDescExpand = (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setExpandedCardDescIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const toggleTitleExpand = (id: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      setExpandedCardTitleIds(prev => {
          const next = new Set(prev);
          if (next.has(id)) next.delete(id);
          else next.add(id);
          return next;
      });
  };

  const handleCopyText = (text: string, projectId: string, e?: React.MouseEvent) => {
      if (e) e.stopPropagation();
      if (navigator.clipboard) {
          navigator.clipboard.writeText(text);
          setCopiedProjectId(projectId);
          setTimeout(() => {
              setCopiedProjectId(null);
          }, 2000);
      }
  };

  const filterCounts = useMemo(() => {
      const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
      if (dashboardTab === 'batches') {
          return {
              all: batches.length,
              recent: batches.filter(b => b.lastModified >= cutoff).length,
              favourites: batches.filter(b => b.favourite).length
          };
      }
      if (dashboardTab === 'board') {
          return {
              all: boardProjects.length,
              recent: boardProjects.filter(b => b.lastModified >= cutoff).length,
              favourites: boardProjects.filter(b => b.favourite).length
          };
      }
      return {
          all: projects.length,
          recent: projects.filter(p => p.lastModified >= cutoff).length,
          favourites: projects.filter(p => p.favourite).length
      };
  }, [dashboardTab, batches, boardProjects, projects]);

  const toggleFavourite = async (p: Project) => {
      const updatedProject = { ...p, favourite: !p.favourite, lastModified: Date.now() };
      setProjects(prev => prev.map(x => x.id === p.id ? updatedProject : x));
      await saveProjectDataLocally(p.id, updatedProject);
  };

  const filteredProjects = useMemo(() => {
      let result = [...projects];
      if (searchTerm.trim()) {
          const q = searchTerm.toLowerCase().trim();
          result = result.filter(p => 
              p.name.toLowerCase().includes(q) || 
              (p.description && p.description.toLowerCase().includes(q)) ||
              (p.fileName && p.fileName.toLowerCase().includes(q))
          );
      }
      if (filterType === 'recent') {
          const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
          result = result.filter(p => p.lastModified >= cutoff);
      } else if (filterType === 'favourites') {
          result = result.filter(p => p.favourite);
      }

      if (sortBy === 'date') {
          result.sort((a, b) => sortOrder === 'desc' ? b.lastModified - a.lastModified : a.lastModified - b.lastModified);
      } else if (sortBy === 'name') {
          result.sort((a, b) => sortOrder === 'desc' ? b.name.localeCompare(a.name) : a.name.localeCompare(b.name));
      }
      return result;
  }, [projects, searchTerm, filterType, sortBy, sortOrder]);

  useEffect(() => {
      const hasSeenTutorial = localStorage.getItem('tacstemTutorialSeen');
      if (!hasSeenTutorial) {
          setShowTutorial(true);
      }
  }, []);

  const closeTutorial = () => {
      setShowTutorial(false);
      localStorage.setItem('tacstemTutorialSeen', 'true');
  };

  useEffect(() => {
      // Request browser persistent storage for offline & PWA stability
      requestPersistentStorage().catch(console.warn);

      // Ensure guest session flag is set
      try {
          localStorage.setItem('tacstemGuest', 'true');
      } catch (e) {}

      // Immediately query all videos stored locally in IndexedDB
      getAllStoredVideoIds().then(storedIds => {
          setStoredVideoIds(new Set(storedIds));
      }).catch(console.error);

      // Load all stored projects unconditionally
      listProjectsLocally().then(loadedProjs => {
          const formattedProjs = loadedProjs.map((p: any) => ({
             id: p.id,
             name: p.name,
             description: p.description,
             createdAt: p.createdAt || Date.now(),
             lastModified: p.lastModified || Date.now(),
             fileName: p.fileName,
             ownerId: p.ownerId || 'guest',
             data: (() => {
                 const d = p.data || {};
                 if (d.playlists) {
                     d.playlists = d.playlists.map((pl: any) => ({
                         ...pl,
                         events: pl.events.map((e: any) => typeof e === 'string' ? e : e.id).filter(Boolean)
                     }));
                 }
                 return d;
             })()
          }));
          const sorted = formattedProjs.sort((a,b) => b.lastModified - a.lastModified);
          setProjects(sorted);

          // Background eager pre-warm for the top 3 most recent projects for 0ms load
          setTimeout(async () => {
              for (const proj of sorted.slice(0, 3)) {
                  if (proj.fileName !== 'live') {
                      try {
                          const f = await loadVideoLocally(proj.id);
                          if (f) {
                              const url = URL.createObjectURL(f);
                              setProjectBlobs(prev => {
                                  if (prev.has(proj.id)) return prev;
                                  return new Map(prev).set(proj.id, url);
                              });
                              setStoredVideoIds(prev => new Set(prev).add(proj.id));
                          }
                      } catch (e) {
                          // ignore
                      }
                  }
              }
          }, 300);
      }).catch(console.error);

      listBatchesLocally().then(loadedBatches => {
          setBatches(loadedBatches || []);
      }).catch(console.error);

      listBoardProjectsLocally().then(loadedBoardProjs => {
          if (loadedBoardProjs && loadedBoardProjs.length > 0) {
              setBoardProjects(loadedBoardProjs.sort((a,b) => b.lastModified - a.lastModified));
          } else {
              const starter = createDefaultBoardProject('Tactical Board #1', 'Blank tactical workspace');
              saveBoardProjectLocally(starter);
              setBoardProjects([starter]);
          }
      }).catch(console.error);

      setAuthLoading(false);
  }, []);

  const createProject = (file: File, metadata?: { name?: string; description?: string }, fileHandle?: any) => {
      if (!user) {
          setUser({ uid: 'guest', displayName: 'Guest User' });
      }
      
      if (userPlan === 'free' && projects.length >= 3) {
          setErrorMessage("Free plan limit reached! You can only create up to 3 projects. Please contact us to upgrade to the Pro plan.");
          return;
      }
      
      const newId = Date.now().toString();
      const url = URL.createObjectURL(file);
      
      const cleanName = (metadata?.name && metadata.name.trim()) 
          ? metadata.name.trim() 
          : file.name.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, ' ') || 'Untitled Project';

      const newProject: Project = {
          id: newId,
          name: cleanName,
          description: metadata?.description?.trim() || '',
          createdAt: Date.now(),
          lastModified: Date.now(),
          fileName: file.name,
          data: {
              shapes: [],
              freezeFrames: [],
              tags: DEFAULT_TAGS,
              tagEvents: [],
              playlists: [{ id: 'p1', name: 'Highlights', events: [] }, { id: 'p2', name: 'Defense', events: [] }],
              markers: []
          }
      };
      
      // Update UI instantly - 0ms delay!
      setProjects(prev => [newProject, ...prev]);
      setProjectBlobs(prev => new Map(prev).set(newId, url));
      setActiveProject(newProject);
      setView('workspace');
      setIsNewProjectModalOpen(false);
      setDroppedFile(null);
      setToast(`Project "${cleanName}" loaded!`);

      // Persist in background without blocking UI thread
      (async () => {
          try {
              await saveVideoLocally(newId, file);
              setStoredVideoIds(prev => new Set(prev).add(newId));
              if (fileHandle) {
                  await saveFileHandle(newId, fileHandle);
              }
              await saveProjectDataLocally(newId, newProject);
          } catch (err) {
              console.warn("Background storage save error:", err);
          }
      })();
  };

  const handleNewLiveProjectClick = async () => {
      if (!user) {
          setErrorMessage("Please sign in to create projects.");
          return;
      }
      
      if (userPlan === 'free' && projects.length >= 3) {
          setErrorMessage("Free plan limit reached! You can only create up to 3 projects. Please contact us to upgrade to the Pro plan.");
          return;
      }
      
      const newId = Date.now().toString();
      
      const newProject: Project = {
          id: newId,
          name: 'Live Match - ' + new Date().toLocaleDateString('en-GB'),
          description: 'Live coding session',
          createdAt: Date.now(),
          lastModified: Date.now(),
          fileName: 'live',
          data: {
              shapes: [],
              freezeFrames: [],
              tags: DEFAULT_TAGS,
              tagEvents: [],
              playlists: [{ id: 'p1', name: 'Highlights', events: [] }, { id: 'p2', name: 'Defense', events: [] }],
              markers: []
          }
      };
      
      setProjects(prev => [newProject, ...prev]);
      setProjectBlobs(prev => new Map(prev).set(newId, "live"));
      setActiveProject(newProject);
      setView('workspace');

      saveProjectDataLocally(newId, newProject).catch(console.error);
  };

  const handleNewProjectClick = () => {
      setIsNewProjectModalOpen(true);
  };

  const handleRelinkVideoClick = async (project: Project, isNewVideo: boolean) => {
      const fallbackInput = document.createElement('input');
      fallbackInput.type = 'file';
      fallbackInput.accept = 'video/*';
      fallbackInput.onchange = async (e: any) => {
          if (e.target.files?.[0]) {
              const file = e.target.files[0];
              const url = URL.createObjectURL(file);
              setProjectBlobs(prev => new Map(prev).set(project.id, url));
              
              let updatedProject = project;
              if (isNewVideo) {
                  const wasLive = project.fileName === 'live';
                  updatedProject = { ...project, fileName: file.name, lastModified: Date.now() };
                  
                  if (wasLive && updatedProject.data && updatedProject.data.periodSyncs) {
                      updatedProject.data.periodSyncs = updatedProject.data.periodSyncs.map(ps => ({
                          ...ps,
                          needsVideoSync: true
                      }));
                  }
                  saveProjectDataLocally(updatedProject.id, updatedProject).catch(console.error);
              }
              setActiveProject(updatedProject);
              setView('workspace');
              setMissingVideoProject(null);

              // Background save to local storage
              saveVideoLocally(project.id, file).catch(console.error);
              setStoredVideoIds(prev => new Set(prev).add(project.id));
          }
      };

      if (!('showOpenFilePicker' in window)) {
          fallbackInput.click();
          return;
      }
      try {
          const [handle] = await (window as any).showOpenFilePicker({
              types: [{ description: 'Video Files', accept: { 'video/*': [] } }],
              multiple: false
          });
          const file = await handle.getFile();
          const url = URL.createObjectURL(file);
          
          setProjectBlobs(prev => new Map(prev).set(project.id, url));
          
          let updatedProject = project;
          if (isNewVideo) {
              const wasLive = project.fileName === 'live';
              updatedProject = { ...project, fileName: file.name, lastModified: Date.now() };
              
              if (wasLive && updatedProject.data && updatedProject.data.periodSyncs) {
                  updatedProject.data.periodSyncs = updatedProject.data.periodSyncs.map(ps => ({
                      ...ps,
                      needsVideoSync: true
                  }));
              }
              saveProjectDataLocally(updatedProject.id, updatedProject).catch(console.error);
          }
          
          setActiveProject(updatedProject);
          setView('workspace');
          setMissingVideoProject(null);

          // Save video and handle in background
          saveVideoLocally(project.id, file).catch(console.error);
          setStoredVideoIds(prev => new Set(prev).add(project.id));
          saveFileHandle(project.id, handle).catch(console.error);
      } catch (e: any) {
          if (e.name === 'SecurityError' || e.message?.includes('cross-origin')) {
              fallbackInput.click();
          } else if (e.name !== 'AbortError') {
              console.error(e);
          }
      }
  };

  const deleteProjectAction = async (id: string) => {
      setConfirmDialog({
          message: 'Are you sure you want to delete this project? This action cannot be undone.',
          onConfirm: async () => {
              await deleteProjectLocally(id);
              setStoredVideoIds(prev => {
                  const next = new Set(prev);
                  next.delete(id);
                  return next;
              });
              setProjects(prev => prev.filter(p => p.id !== id));
              setProjectBlobs(prev => {
                  const newMap = new Map(prev);
                  const url = newMap.get(id);
                  if (url && typeof url === 'string') URL.revokeObjectURL(url);
                  newMap.delete(id);
                  return newMap;
              });
              setConfirmDialog(null);
          }
      });
  };

  const startEditingProject = (p: Project) => {
      setEditingProjectId(p.id);
      setEditForm({ name: p.name, description: p.description });
  };

  const saveEditingProject = async () => {
      if (editingProjectId) {
          const p = projects.find(x => x.id === editingProjectId);
          if (p) {
              const updatedProject = { ...p, name: editForm.name, description: editForm.description, lastModified: Date.now() };
              await saveProjectDataLocally(p.id, updatedProject);
              setProjects(prev => prev.map(x => x.id === editingProjectId ? updatedProject : x));
          }
          setEditingProjectId(null);
      }
  };

  const updateProjectData = (id: string, data: ProjectData) => {
      const p = projects.find(x => x.id === id);
      if (p) {
          const updatedProject = { ...p, data, lastModified: Date.now() };
          setProjects(prev => prev.map(x => x.id === id ? updatedProject : x));
          setActiveProject(prev => prev && prev.id === id ? updatedProject : prev);
          
          saveProjectDataLocally(id, updatedProject).catch(console.error);
      }
  };

  const updateProjectMetadata = (id: string, name: string, description: string) => {
      const p = projects.find(x => x.id === id);
      if (p) {
          const updatedProject = { ...p, name, description, lastModified: Date.now() };
          setProjects(prev => prev.map(x => x.id === id ? updatedProject : x));
          setActiveProject(prev => prev && prev.id === id ? updatedProject : prev);
          
          saveProjectDataLocally(id, updatedProject).catch(console.error);
      }
  };

  const ensureProjectBlob = async (project: Project): Promise<string | null> => {
      let blobUrl = projectBlobs.get(project.id);
      if (blobUrl) return blobUrl;

      if (project.fileName === 'live') {
          blobUrl = "live";
          setProjectBlobs(prev => new Map(prev).set(project.id, blobUrl!));
          return blobUrl;
      }

      // 1. FAST PATH: Check IndexedDB storage directly (instant, offline, zero permissions)
      try {
          const file = await loadVideoLocally(project.id);
          if (file) {
              blobUrl = URL.createObjectURL(file);
              setProjectBlobs(prev => new Map(prev).set(project.id, blobUrl!));
              setStoredVideoIds(prev => new Set(prev).add(project.id));
              return blobUrl;
          }
      } catch (e) {
          console.warn("IndexedDB video check failed:", e);
      }

      // 2. Secondary path: Check saved file handle if already granted
      try {
          const handle = await loadFileHandle(project.id);
          if (handle) {
              const opts = { mode: 'read' as const };
              const perm = await handle.queryPermission(opts);
              if (perm === 'granted') {
                  const file = await handle.getFile();
                  blobUrl = URL.createObjectURL(file);
                  setProjectBlobs(prev => new Map(prev).set(project.id, blobUrl!));
                  // Save into IndexedDB so all future loads are instant without handle
                  saveVideoLocally(project.id, file).catch(console.error);
                  setStoredVideoIds(prev => new Set(prev).add(project.id));
                  return blobUrl;
              }
          }
      } catch (e: any) {
          console.warn("File handle access failed:", e);
      }

      return null;
  };

  const openProject = async (project: Project) => {
      setLoadingProjectId(project.id);
      try {
          let blobUrl = await ensureProjectBlob(project);
          
          if (!blobUrl && project.fileName !== 'live') {
              const handle = await loadFileHandle(project.id);
              if (handle) {
                  try {
                      // We are inside an active user click gesture, can request permission directly
                      const opts = { mode: 'read' as const };
                      const perm = await handle.requestPermission(opts);
                      if (perm === 'granted') {
                          const file = await handle.getFile();
                          blobUrl = URL.createObjectURL(file);
                          setProjectBlobs(prev => new Map(prev).set(project.id, blobUrl!));
                          saveVideoLocally(project.id, file).catch(console.error);
                          setStoredVideoIds(prev => new Set(prev).add(project.id));
                      } else {
                          setPendingPermissionHandle({ handle, project });
                          return;
                      }
                  } catch (e) {
                      console.warn("Handle permission prompt error:", e);
                  }
              }
          }

          if (blobUrl) {
              setActiveBatch(null);
              setActiveProject(project);
              setView('workspace');
          } else {
              setMissingVideoProject(project);
          }
      } finally {
          setLoadingProjectId(null);
      }
  };

  const openBatchAnalysis = async (
      batch: Batch,
      initialProjectId?: string,
      initialPlaylistId?: string,
      initialSeekTime?: number,
      autoPlayPlaylist: boolean = false
  ) => {
      if (!batch.projectIds || batch.projectIds.length === 0) {
          setManagingGamesBatch(batch);
          setToast("This batch has no games yet. Add games to start analysis.");
          return;
      }

      const targetProj = initialProjectId 
          ? (projects.find(p => p.id === initialProjectId) || projects.find(p => batch.projectIds.includes(p.id)))
          : projects.find(p => batch.projectIds.includes(p.id));

      if (!targetProj) {
          setManagingGamesBatch(batch);
          setToast("Games in this batch could not be found. Please manage games.");
          return;
      }

      setLoadingProjectId(targetProj.id);
      try {
          // Eagerly resolve and load video blobs for ALL projects in this batch!
          const batchProjects = projects.filter(p => batch.projectIds.includes(p.id));
          const updatedBlobs = new Map(projectBlobs);

          for (const proj of batchProjects) {
              if (!updatedBlobs.has(proj.id)) {
                  let blob: string | null = null;
                  if (proj.fileName === 'live') {
                      blob = 'live';
                  } else {
                      const file = await loadVideoLocally(proj.id);
                      if (file) {
                          blob = URL.createObjectURL(file);
                      } else {
                          const handle = await loadFileHandle(proj.id);
                          if (handle) {
                              try {
                                  const perm = await handle.queryPermission({ mode: 'read' as const });
                                  if (perm === 'granted') {
                                      const f = await handle.getFile();
                                      blob = URL.createObjectURL(f);
                                      saveVideoLocally(proj.id, f).catch(console.error);
                                  }
                              } catch (e) {
                                  console.warn("Handle permission query failed for", proj.name, e);
                              }
                          }
                      }
                  }
                  if (blob) {
                      updatedBlobs.set(proj.id, blob);
                  }
              }
          }

          setProjectBlobs(updatedBlobs);

          let targetBlob = updatedBlobs.get(targetProj.id);
          if (!targetBlob && targetProj.fileName !== 'live') {
              const handle = await loadFileHandle(targetProj.id);
              if (handle) {
                  try {
                      const perm = await handle.queryPermission({ mode: 'read' as const });
                      if (perm !== 'granted') {
                          setPendingPermissionHandle({ handle, project: targetProj });
                          return;
                      }
                  } catch (e) {
                      console.warn(e);
                  }
              }
          }

          setActiveBatch(batch);
          setActiveProject(targetProj);
          setBatchModeConfig({
              initialPlaylistId,
              initialSeekTime,
              autoPlayPlaylist
          });
          setActiveBatchStats(null);
          setView('workspace');
      } finally {
          setLoadingProjectId(null);
      }
  };

  const handleCreateBatch = async (batchData: { name: string; description: string; projectIds: string[] }) => {
      const newBatch: Batch = {
          id: 'batch-' + Date.now().toString(),
          name: batchData.name,
          description: batchData.description,
          createdAt: Date.now(),
          lastModified: Date.now(),
          projectIds: batchData.projectIds,
          favourite: false,
          playlists: [{ id: 'bp1', name: 'Batch Highlights', events: [] }]
      };

      setBatches(prev => [newBatch, ...prev]);
      await saveBatchLocally(newBatch);
      setToast(`Batch "${newBatch.name}" created!`);
  };

  const handleUpdateBatchGames = async (batchId: string, updatedProjectIds: string[]) => {
      const batch = batches.find(b => b.id === batchId);
      if (!batch) return;
      const updated: Batch = {
          ...batch,
          projectIds: updatedProjectIds,
          lastModified: Date.now()
      };
      setBatches(prev => prev.map(b => b.id === batchId ? updated : b));
      if (activeBatch && activeBatch.id === batchId) {
          setActiveBatch(updated);
          // Eagerly preload video blobs for any new projects in batch
          updatedProjectIds.forEach(id => {
              const p = projects.find(x => x.id === id);
              if (p && !projectBlobs.has(p.id)) {
                  ensureProjectBlob(p).catch(console.warn);
              }
          });
      }
      await saveBatchLocally(updated);
      setToast(`Batch "${updated.name}" updated!`);
  };

  const handleDeleteBatch = async (batchId: string) => {
      setConfirmDialog({
          message: 'Are you sure you want to delete this batch? Individual game projects will NOT be deleted.',
          onConfirm: async () => {
              await deleteBatchLocally(batchId);
              setBatches(prev => prev.filter(b => b.id !== batchId));
              if (activeBatch && activeBatch.id === batchId) {
                  setActiveBatch(null);
              }
              setConfirmDialog(null);
              setToast('Batch deleted.');
          }
      });
  };

  const handleToggleBatchFavourite = async (batch: Batch) => {
      const updated: Batch = {
          ...batch,
          favourite: !batch.favourite,
          lastModified: Date.now()
      };
      setBatches(prev => prev.map(b => b.id === batch.id ? updated : b));
      if (activeBatch && activeBatch.id === batch.id) {
          setActiveBatch(updated);
      }
      await saveBatchLocally(updated);
  };

  const handleSaveBatchDetails = async (updatedBatch: Batch) => {
      setBatches(prev => prev.map(b => b.id === updatedBatch.id ? updatedBatch : b));
      if (activeBatch && activeBatch.id === updatedBatch.id) {
          setActiveBatch(updatedBatch);
      }
      await saveBatchLocally(updatedBatch);
      setEditingBatch(null);
      setToast('Batch details updated.');
  };

  // --- Tactical Board Projects Handlers ---

  const handleCreateBoardProject = async (newBoardProject: BoardProject) => {
      await saveBoardProjectLocally(newBoardProject);
      setBoardProjects(prev => [newBoardProject, ...prev]);
      setToast(`Created board "${newBoardProject.name}"`);
  };

  const handleSaveBoardProjectDetails = async (updated: BoardProject) => {
      await saveBoardProjectLocally(updated);
      setBoardProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      if (activeBoardProject && activeBoardProject.id === updated.id) {
          setActiveBoardProject(updated);
      }
      setToast('Board project updated.');
  };

  const handleDeleteBoardProject = async (id: string) => {
      setConfirmDialog({
          message: 'Are you sure you want to delete this tactical board project? All slides and animations will be permanently removed.',
          onConfirm: async () => {
              await deleteBoardProjectLocally(id);
              setBoardProjects(prev => prev.filter(p => p.id !== id));
              if (activeBoardProject && activeBoardProject.id === id) {
                  setActiveBoardProject(null);
              }
              setConfirmDialog(null);
              setToast('Board project deleted.');
          }
      });
  };

  const handleToggleBoardProjectFavourite = async (project: BoardProject) => {
      const updated = { ...project, favourite: !project.favourite, lastModified: Date.now() };
      setBoardProjects(prev => prev.map(p => p.id === project.id ? updated : p));
      if (activeBoardProject && activeBoardProject.id === project.id) {
          setActiveBoardProject(updated);
      }
      await saveBoardProjectLocally(updated);
  };

  const handleDuplicateBoardProject = async (project: BoardProject) => {
      const clonedId = 'board_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
      const clonedData = JSON.parse(JSON.stringify(project.data || {}));
      clonedData.name = `${project.name} (Copy)`;
      const duplicated: BoardProject = {
          ...project,
          id: clonedId,
          name: `${project.name} (Copy)`,
          createdAt: Date.now(),
          lastModified: Date.now(),
          favourite: false,
          data: clonedData,
      };
      await saveBoardProjectLocally(duplicated);
      setBoardProjects(prev => [duplicated, ...prev]);
      setToast(`Duplicated "${project.name}"`);
  };

  const handleExportBoardProjectJSON = (project: BoardProject) => {
      const dataToExport = project.data || project;
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const safeName = (project.name || 'board-project').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      a.download = `${safeName}-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setToast('Board project JSON exported.');
  };

  const handleImportBoardProjectJSON = (file: File) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
          try {
              const parsed = JSON.parse(e.target?.result as string);
              const importedName = parsed.name || file.name.replace(/\.json$/i, '');
              const newId = 'board_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8);
              const newBoardProj: BoardProject = {
                  id: newId,
                  name: importedName,
                  description: 'Imported from JSON',
                  createdAt: Date.now(),
                  lastModified: Date.now(),
                  favourite: false,
                  slideCount: parsed.slides?.length || 1,
                  data: parsed,
              };
              await saveBoardProjectLocally(newBoardProj);
              setBoardProjects(prev => [newBoardProj, ...prev]);
              setToast(`Imported "${importedName}"`);
          } catch (err) {
              setErrorMessage('Failed to parse board project JSON file.');
          }
      };
      reader.readAsText(file);
  };

  const handleUpdateBoardProjectData = async (updatedProjectData: any) => {
      if (!activeBoardProject) return;
      const updated: BoardProject = {
          ...activeBoardProject,
          name: updatedProjectData.name || activeBoardProject.name,
          slideCount: updatedProjectData.slides?.length || 1,
          lastModified: Date.now(),
          data: updatedProjectData,
      };
      setActiveBoardProject(updated);
      setBoardProjects(prev => prev.map(p => p.id === updated.id ? updated : p));
      await saveBoardProjectLocally(updated);
  };

  const handleGrantPermission = async () => {
      if (!pendingPermissionHandle) return;
      try {
          const opts = { mode: 'read' as const };
          const perm = await pendingPermissionHandle.handle.requestPermission(opts);
          if (perm === 'granted') {
              const file = await pendingPermissionHandle.handle.getFile();
              const url = URL.createObjectURL(file);
              setProjectBlobs(prev => new Map(prev).set(pendingPermissionHandle.project.id, url));
              saveVideoLocally(pendingPermissionHandle.project.id, file).catch(console.error);
              setStoredVideoIds(prev => new Set(prev).add(pendingPermissionHandle.project.id));
              setActiveProject(pendingPermissionHandle.project);
              setView('workspace');
              setMissingVideoProject(null);
          }
      } catch (e) {
          console.error("Permission request failed:", e);
      } finally {
          setPendingPermissionHandle(null);
      }
  };

  if (authLoading) {
      return (
          <div className="w-screen h-screen bg-[#0a0a0a] text-white flex items-center justify-center">
              <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#c6ff1f]"></div>
          </div>
      );
  }

  if (!user) {
      return (
          <>
              <LoginScreen onLogin={loginAsGuest} />
              <BrowserRecommendationBanner />
          </>
      );
  }

  // --- Batch Stats Page ---
  if (activeBatchStats) {
      return (
          <>
              <ErrorBoundary onReset={() => setActiveBatchStats(null)}>
                  <BatchStatsPage
                      batch={activeBatchStats}
                      projects={projects}
                      onClose={() => {
                          setActiveBatchStats(null);
                      }}
                      onOpenBatchAnalysis={(batch, initialProjectId, initialPlaylistId, initialSeekTime, autoPlayPlaylist) => {
                          setActiveBatchStats(null);
                          openBatchAnalysis(batch, initialProjectId, initialPlaylistId, initialSeekTime, autoPlayPlaylist);
                      }}
                      onUpdateBatch={(updatedBatch) => {
                          setBatches(prev => prev.map(b => b.id === updatedBatch.id ? updatedBatch : b));
                          if (activeBatch && activeBatch.id === updatedBatch.id) {
                              setActiveBatch(updatedBatch);
                          }
                          if (activeBatchStats && activeBatchStats.id === updatedBatch.id) {
                              setActiveBatchStats(updatedBatch);
                          }
                          saveBatchLocally(updatedBatch).catch(console.error);
                      }}
                  />
              </ErrorBoundary>
              <BrowserRecommendationBanner />
          </>
      );
  }

  // --- Active Tactical Board Editor View ---
  if (activeBoardProject) {
      return (
          <>
              <ErrorBoundary onReset={() => setActiveBoardProject(null)}>
                  <TacticalBoard
                      boardProjectId={activeBoardProject.id}
                      initialProjectData={activeBoardProject.data}
                      onBackToHome={() => setActiveBoardProject(null)}
                      onNavigateTab={(tab) => {
                          setActiveBoardProject(null);
                          setDashboardTab(tab);
                      }}
                      onSaveBoardProject={handleUpdateBoardProjectData}
                  />
              </ErrorBoundary>
              <BrowserRecommendationBanner />
          </>
      );
  }

  // --- Home Screen ---
  if (view === 'home') {
      return (
          <>
          <style>{`
            /* Dashboard CSS */
            .orb { position: fixed; border-radius: 50%; filter: blur(75px); pointer-events: none; z-index: 0; opacity: 0.65; }
            .orb-1 { width: 380px; height: 380px; background: radial-gradient(circle, rgba(198, 255, 31, 0.14), transparent 70%); top: -8%; right: -3%; }
            .orb-2 { width: 320px; height: 320px; background: radial-gradient(circle, rgba(198, 255, 31, 0.10), transparent 70%); bottom: -8%; left: -3%; }
            .glass { background: rgba(255, 255, 255, 0.035); backdrop-filter: blur(12px) saturate(1.2); -webkit-backdrop-filter: blur(12px) saturate(1.2); border: 1px solid rgba(255, 255, 255, 0.06); box-shadow: 0 20px 50px -15px rgba(0, 0, 0, 0.7); }
            .project-card { transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1); }
            .project-card:hover { transform: translateY(-3px); border-color: rgba(198, 255, 31, 0.3); box-shadow: 0 16px 36px -10px rgba(0,0,0,0.65), 0 0 24px rgba(198, 255, 31, 0.05); }
            .project-row { transition: all 0.15s ease-in-out; }
            .project-row:hover { background: rgba(255, 255, 255, 0.035); }
            .star-btn { transition: all 0.2s ease; color: rgba(255,255,255,0.25); }
            .star-btn:hover { transform: scale(1.15); color: #fbbf24; }
            .star-btn.active { color: #fbbf24; }
            .btn-glow { position: relative; transition: all 0.2s ease; background: #c6ff1f; color: #0a0a0c; font-weight: 600; }
            .btn-glow:hover { background: #d4ff4d; box-shadow: 0 0 25px rgba(198, 255, 31, 0.35); transform: translateY(-1px); }
            .btn-glow:active { transform: scale(0.98); }
            .toast { animation: slideUp 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            @keyframes slideUp { 0% { opacity: 0; transform: translate(-50%, 16px); } 100% { opacity: 1; transform: translate(-50%, 0); } }
          `}</style>
          
          <div className="orb orb-1"></div>
          <div className="orb orb-2"></div>

          {showTutorial && <TutorialOverlay onClose={closeTutorial} />}
          {confirmDialog && <ConfirmOverlay message={confirmDialog.message} onConfirm={confirmDialog.onConfirm} onCancel={() => setConfirmDialog(null)} />}
          {errorMessage && (
              <div className="fixed top-3 left-1/2 -translate-x-1/2 z-[100] bg-red-950/90 border border-red-500/80 text-white px-5 py-3 rounded-xl shadow-2xl flex items-start gap-3 max-w-md backdrop-blur-md">
                  <AlertTriangle className="w-5 h-5 shrink-0 text-red-400 mt-0.5" />
                  <div className="flex-1">
                      <h3 className="font-bold text-xs uppercase tracking-wider text-red-300">Notice</h3>
                      <p className="text-xs text-red-200 mt-0.5">{errorMessage}</p>
                  </div>
                  <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-white transition-colors">
                      <X className="w-4 h-4" />
                  </button>
              </div>
          )}
          <StorageWarning />
          {missingVideoProject && (
              <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="bg-[#121216] p-6 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full">
                      <h3 className="text-lg font-bold text-white mb-2">Video File Missing</h3>
                      <p className="text-gray-400 text-xs mb-4">The video file "{missingVideoProject.fileName || 'Unknown'}" could not be found. How would you like to proceed?</p>
                      <div className="space-y-2.5">
                          <button onClick={() => handleRelinkVideoClick(missingVideoProject, false)} className="block w-full text-center px-4 py-2.5 bg-[#c6ff1f] hover:bg-[#b0e817] text-black font-semibold rounded-lg cursor-pointer transition-colors text-xs">
                              Relink Original Video
                          </button>
                          <button onClick={() => handleRelinkVideoClick(missingVideoProject, true)} className="block w-full text-center px-4 py-2.5 bg-white/5 hover:bg-white/10 border border-white/10 text-gray-200 rounded-lg cursor-pointer transition-colors text-xs font-medium">
                              Select New Video
                          </button>
                          <button onClick={() => setMissingVideoProject(null)} className="w-full px-4 py-2 bg-transparent text-gray-400 hover:text-white rounded-lg transition-colors text-xs">
                              Return to Dashboard
                          </button>
                      </div>
                  </div>
              </div>
          )}
          {pendingPermissionHandle && (
              <div className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
                  <div className="bg-[#121216] p-6 rounded-2xl border border-white/10 shadow-2xl max-w-md w-full">
                      <h3 className="text-lg font-bold text-white mb-2">Security Permission Required</h3>
                      <p className="text-gray-400 text-xs mb-4">
                        To protect your privacy, your browser requires you to grant permission before accessing your local video file "{pendingPermissionHandle.project.fileName}".
                      </p>
                      <div className="space-y-2.5">
                          <button onClick={handleGrantPermission} className="block w-full text-center px-4 py-2.5 bg-[#c6ff1f] hover:bg-[#b0e817] text-black font-semibold rounded-lg cursor-pointer transition-colors text-xs">
                              Grant Access
                          </button>
                          <button onClick={() => setPendingPermissionHandle(null)} className="w-full px-4 py-2 bg-transparent text-gray-400 hover:text-white rounded-lg transition-colors text-xs">
                              Cancel
                          </button>
                      </div>
                  </div>
              </div>
          )}
          <LoadingProjectOverlay isLoading={!!loadingProjectId} onCancel={() => setLoadingProjectId(null)} />
          
          <NewProjectModal
              isOpen={isNewProjectModalOpen}
              initialFile={droppedFile}
              onClose={() => {
                  setIsNewProjectModalOpen(false);
                  setDroppedFile(null);
              }}
              onCreateProject={(file, metadata, handle) => createProject(file, metadata, handle)}
              onStartLiveProject={() => handleNewLiveProjectClick()}
          />

          <NewBatchModal
              isOpen={isNewBatchModalOpen}
              onClose={() => setIsNewBatchModalOpen(false)}
              projects={projects}
              onCreateBatch={handleCreateBatch}
          />

          {managingGamesBatch && (
              <ManageBatchGamesModal
                  isOpen={!!managingGamesBatch}
                  batch={managingGamesBatch}
                  allProjects={projects}
                  onClose={() => setManagingGamesBatch(null)}
                  onUpdateBatchGames={handleUpdateBatchGames}
              />
          )}

          {editingBatch && (
              <EditBatchModal
                  isOpen={!!editingBatch}
                  batch={editingBatch}
                  onClose={() => setEditingBatch(null)}
                  onSaveBatch={handleSaveBatchDetails}
              />
          )}

          <NewBoardProjectModal
              isOpen={isNewBoardProjectModalOpen}
              onClose={() => setIsNewBoardProjectModalOpen(false)}
              onCreateBoardProject={handleCreateBoardProject}
          />

          {editingBoardProject && (
              <EditBoardProjectModal
                  isOpen={!!editingBoardProject}
                  project={editingBoardProject}
                  onClose={() => setEditingBoardProject(null)}
                  onSave={handleSaveBoardProjectDetails}
              />
          )}

          {detailModalProject && (
              <div 
                  className="fixed inset-0 z-[105] bg-black/80 backdrop-blur-md flex items-center justify-center p-4"
                  onClick={() => setDetailModalProject(null)}
              >
                  <div 
                      className="bg-[#121217] border border-white/15 rounded-2xl shadow-2xl max-w-xl w-full p-6 text-left relative flex flex-col max-h-[88vh]"
                      onClick={(e) => e.stopPropagation()}
                  >
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4 pb-4 border-b border-white/10">
                          <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#c6ff1f] bg-[#c6ff1f]/10 border border-[#c6ff1f]/20 px-2 py-0.5 rounded-full">
                                      Project Details
                                  </span>
                                  {detailModalProject.favourite && (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/20">
                                          <Star className="w-2.5 h-2.5 fill-current" /> Starred
                                      </span>
                                  )}
                                  {detailModalProject.fileName === 'live' && (
                                      <span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-400/10 px-2 py-0.5 rounded-full border border-red-400/20">
                                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" /> Live Session
                                      </span>
                                  )}
                              </div>
                              <h2 className="text-lg font-bold text-white leading-tight break-words select-text">
                                  {detailModalProject.name}
                              </h2>
                          </div>
                          <button
                              onClick={() => setDetailModalProject(null)}
                              className="p-1.5 rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
                              title="Close dialog"
                          >
                              <X className="w-5 h-5" />
                          </button>
                      </div>

                      {/* Scrollable Body */}
                      <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                          {/* Full Description / Tactical Notes */}
                          <div>
                              <div className="flex items-center justify-between mb-2">
                                  <label className="text-xs font-semibold uppercase tracking-wider text-white/50 flex items-center gap-1.5">
                                      <FileText className="w-3.5 h-3.5 text-[#c6ff1f]" />
                                      <span>Full Description & Tactical Notes</span>
                                  </label>
                                  {detailModalProject.description && (
                                      <button
                                          onClick={(e) => handleCopyText(detailModalProject.description, detailModalProject.id, e)}
                                          className="inline-flex items-center gap-1.5 text-xs text-white/60 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 border border-white/10 transition-colors cursor-pointer"
                                      >
                                          {copiedProjectId === detailModalProject.id ? (
                                              <>
                                                  <Check className="w-3.5 h-3.5 text-[#c6ff1f]" />
                                                  <span className="text-[#c6ff1f] font-medium">Copied</span>
                                              </>
                                          ) : (
                                              <>
                                                  <Copy className="w-3.5 h-3.5" />
                                                  <span>Copy text</span>
                                              </>
                                          )}
                                      </button>
                                  )}
                              </div>

                              {detailModalProject.description ? (
                                  <div className="bg-white/[0.03] border border-white/10 rounded-xl p-4 text-sm text-gray-200 leading-relaxed whitespace-pre-wrap break-words select-text max-h-64 overflow-y-auto shadow-inner">
                                      {detailModalProject.description}
                                  </div>
                              ) : (
                                  <div className="bg-white/[0.02] border border-dashed border-white/10 rounded-xl p-4 text-xs text-white/40 italic text-center">
                                      No description provided for this project.
                                  </div>
                              )}
                          </div>

                          {/* Analysis Metadata & Stats Grid */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                  <span className="text-[10px] text-white/40 block mb-1">Source Video</span>
                                  <p className="text-xs font-medium text-white truncate" title={detailModalProject.fileName || 'None'}>
                                      {detailModalProject.fileName || 'None'}
                                  </p>
                              </div>
                              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                  <span className="text-[10px] text-white/40 block mb-1">Last Modified</span>
                                  <p className="text-xs font-medium text-white">
                                      {new Date(detailModalProject.lastModified).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                  </p>
                              </div>
                              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                  <span className="text-[10px] text-white/40 block mb-1">Tag Events</span>
                                  <p className="text-xs font-medium text-[#c6ff1f] flex items-center gap-1">
                                      <Activity className="w-3 h-3" />
                                      <span>{detailModalProject.data?.tagEvents?.length || 0}</span>
                                  </p>
                              </div>
                              <div className="bg-white/[0.02] border border-white/5 rounded-xl p-3">
                                  <span className="text-[10px] text-white/40 block mb-1">Tactical Shapes</span>
                                  <p className="text-xs font-medium text-cyan-400 flex items-center gap-1">
                                      <Hexagon className="w-3 h-3" />
                                      <span>{detailModalProject.data?.shapes?.length || 0}</span>
                                  </p>
                              </div>
                          </div>
                      </div>

                      {/* Modal Actions Footer */}
                      <div className="flex items-center justify-between gap-3 pt-4 border-t border-white/10 mt-auto">
                          <button
                              onClick={() => {
                                  const target = detailModalProject;
                                  setDetailModalProject(null);
                                  startEditingProject(target);
                              }}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-colors cursor-pointer"
                          >
                              <SquarePen className="w-3.5 h-3.5" />
                              <span>Edit Details</span>
                          </button>

                          <div className="flex items-center gap-2">
                              <button
                                  onClick={() => setDetailModalProject(null)}
                                  className="px-3.5 py-2 rounded-lg bg-transparent text-white/60 hover:text-white text-xs transition-colors cursor-pointer"
                              >
                                  Close
                              </button>
                              <button
                                  onClick={() => {
                                      const target = detailModalProject;
                                      setDetailModalProject(null);
                                      openProject(target);
                                  }}
                                  className="btn-glow inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs text-black font-semibold shadow-md shadow-[#c6ff1f]/20 cursor-pointer"
                              >
                                  <span>Open Project</span>
                                  <ArrowRight className="w-3.5 h-3.5" />
                              </button>
                          </div>
                      </div>
                  </div>
              </div>
          )}

          {isDashboardDragOver && (
              <div className="fixed inset-0 z-[110] bg-black/85 backdrop-blur-md flex flex-col items-center justify-center pointer-events-none border-2 border-dashed border-[#c6ff1f] m-6 rounded-3xl animate-in fade-in">
                  <div className="w-16 h-16 rounded-2xl bg-[#c6ff1f]/20 border border-[#c6ff1f]/40 flex items-center justify-center text-[#c6ff1f] mb-3 animate-bounce">
                      <UploadCloud className="w-8 h-8" />
                  </div>
                  <h3 className="text-xl font-bold text-white tracking-tight">Drop Match Video Here</h3>
                  <p className="text-gray-400 text-xs mt-1 max-w-xs text-center">Release to automatically create project and load tactical workspace</p>
              </div>
          )}

          <div 
              className="relative z-10 w-screen h-screen bg-transparent overflow-y-auto flex flex-col"
              onDragOver={(e) => {
                  e.preventDefault();
                  setIsDashboardDragOver(true);
              }}
              onDragLeave={(e) => {
                  if (!e.relatedTarget || (e.relatedTarget as HTMLElement).nodeName === 'HTML') {
                      setIsDashboardDragOver(false);
                  }
              }}
              onDrop={(e) => {
                  e.preventDefault();
                  setIsDashboardDragOver(false);
                  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                      const file = e.dataTransfer.files[0];
                      if (file.type.startsWith('video/') || file.name.match(/\.(mp4|mov|webm|mkv|m4v|ts)$/i)) {
                          setDroppedFile(file);
                          setIsNewProjectModalOpen(true);
                      }
                  }
              }}
          >
              {/* --- Compact, Modern Dashboard Header --- */}
              <header className="sticky top-0 z-30 w-full bg-[#0d0d10]/90 backdrop-blur-xl border-b border-white/[0.07] px-4 sm:px-8 py-2.5 shrink-0">
                  <div className="max-w-7xl mx-auto flex items-center justify-between gap-3 sm:gap-6">
                      
                      {/* Left: Brand & Modern Switches */}
                      <div className="flex items-center gap-3 shrink-0">
                          <div className="flex items-center gap-2">
                              <Logo className="w-7 h-7" />
                              <Wordmark className="scale-[0.62] origin-left -ml-2" />
                          </div>

                          {/* Modern Switches: Games & Batches */}
                          <div className="flex items-center bg-white/[0.04] p-0.5 rounded-xl border border-white/10 shadow-inner ml-0.5 sm:ml-1">
                              <button
                                  type="button"
                                  onClick={() => setDashboardTab('games')}
                                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                      dashboardTab === 'games'
                                          ? 'bg-[#c6ff1f] text-black shadow-md shadow-[#c6ff1f]/20 font-bold'
                                          : 'text-white/60 hover:text-white hover:bg-white/5'
                                  }`}
                                  title="Individual Match Projects"
                              >
                                  <Film className="w-3.5 h-3.5" />
                                  <span>Games</span>
                                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                                      dashboardTab === 'games' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/50'
                                  }`}>
                                      {projects.length}
                                  </span>
                              </button>
                              <button
                                  type="button"
                                  onClick={() => setDashboardTab('batches')}
                                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                      dashboardTab === 'batches'
                                          ? 'bg-[#c6ff1f] text-black shadow-md shadow-[#c6ff1f]/20 font-bold'
                                          : 'text-white/60 hover:text-white hover:bg-white/5'
                                  }`}
                                  title="Multi-game Batches Projects"
                              >
                                  <Layers className="w-3.5 h-3.5" />
                                  <span>Batches</span>
                                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                                      dashboardTab === 'batches' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/50'
                                  }`}>
                                      {batches.length}
                                  </span>
                              </button>
                              <button
                                  type="button"
                                  onClick={() => setDashboardTab('board')}
                                  className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                      dashboardTab === 'board'
                                          ? 'bg-[#c6ff1f] text-black shadow-md shadow-[#c6ff1f]/20 font-bold'
                                          : 'text-white/60 hover:text-white hover:bg-white/5'
                                  }`}
                                  title="Tactical Board & Animation Projects"
                              >
                                  <LayoutGrid className="w-3.5 h-3.5" />
                                  <span>Board</span>
                                  <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
                                      dashboardTab === 'board' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/50'
                                  }`}>
                                      {boardProjects.length}
                                  </span>
                              </button>
                          </div>

                          {userPlan === 'pro' && (
                              <div className="hidden lg:inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#c6ff1f]/10 border border-[#c6ff1f]/20 text-[10px] font-bold text-[#c6ff1f] uppercase tracking-wide">
                                  <span>✦</span> PRO
                              </div>
                          )}
                      </div>

                      {/* Center: Search Bar */}
                      <div className="flex-1 max-w-sm mx-2">
                          <div className="relative flex items-center">
                              <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                              <input
                                  type="text"
                                  aria-label="Search projects, batches, or board tactics"
                                  title="Search projects, batches, or board tactics"
                                  placeholder={
                                      dashboardTab === 'batches'
                                          ? "Search batches by name, notes or games..."
                                          : dashboardTab === 'board'
                                          ? "Search board projects by name, notes or formation..."
                                          : "Search projects by name, description or file..."
                                  }
                                  value={searchTerm}
                                  onChange={(e) => setSearchTerm(e.target.value)}
                                  className="w-full bg-white/[0.04] hover:bg-white/[0.06] focus:bg-white/[0.08] border border-white/[0.08] focus:border-[#c6ff1f]/50 rounded-lg pl-9 pr-8 py-1.5 text-xs text-white placeholder:text-white/35 focus:outline-none transition-all"
                              />
                              {searchTerm && (
                                  <button 
                                      onClick={() => setSearchTerm('')} 
                                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white transition-colors"
                                      title="Clear search"
                                  >
                                      <X className="w-3.5 h-3.5" />
                                  </button>
                              )}
                          </div>
                      </div>

                      {/* Right: Actions & Profile */}
                      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
                          {dashboardTab === 'games' ? (
                              <>
                                  <button
                                      onClick={handleNewLiveProjectClick}
                                      className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-all"
                                      title="Live coding session without initial video"
                                  >
                                      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                      <span>Live Match</span>
                                  </button>

                                  <button
                                      onClick={handleNewProjectClick}
                                      className="btn-glow inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs cursor-pointer shadow-sm shadow-[#c6ff1f]/20"
                                  >
                                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>New Project</span>
                                  </button>
                              </>
                          ) : dashboardTab === 'batches' ? (
                              <button
                                  onClick={() => setIsNewBatchModalOpen(true)}
                                  className="btn-glow inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs cursor-pointer shadow-sm shadow-[#c6ff1f]/20"
                              >
                                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                  <span>New Batch</span>
                              </button>
                          ) : (
                              <div className="flex items-center gap-2">
                                  <label className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 text-white/80 hover:text-white text-xs font-medium transition-all cursor-pointer" title="Import Board JSON">
                                      <FileUp className="w-3.5 h-3.5" />
                                      <span>Import JSON</span>
                                      <input
                                          type="file"
                                          accept=".json"
                                          className="hidden"
                                          onChange={(e) => {
                                              if (e.target.files && e.target.files[0]) {
                                                  handleImportBoardProjectJSON(e.target.files[0]);
                                                  e.target.value = '';
                                              }
                                          }}
                                      />
                                  </label>
                                  <button
                                      onClick={() => setIsNewBoardProjectModalOpen(true)}
                                      className="btn-glow inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs cursor-pointer shadow-sm shadow-[#c6ff1f]/20"
                                  >
                                      <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                                      <span>New Board</span>
                                  </button>
                              </div>
                          )}

                          <input id="new-project-file-input" type="file" accept="video/*" className="hidden" onChange={(e) => e.target.files?.[0] && createProject(e.target.files[0])} />

                          <div className="h-4 w-px bg-white/10 mx-0.5 hidden sm:block" />

                          <PWAInstallButton />

                          <button
                              onClick={() => setShowTutorial(true)}
                              className="text-white/40 hover:text-white/80 transition-colors p-1.5 rounded-md hover:bg-white/5"
                              title="Help & Shortcuts"
                          >
                              <HelpCircle className="w-4 h-4" />
                          </button>

                          {/* Profile Avatar & Dropdown */}
                          <div className="relative group cursor-pointer">
                              <div className="w-7 h-7 rounded-full p-0.5 bg-gradient-to-tr from-[#c6ff1f] to-emerald-400">
                                  <div className="w-full h-full rounded-full bg-[#16161a] flex items-center justify-center text-xs font-bold text-[#c6ff1f]">
                                      {user?.photoURL ? (
                                          <img src={user.photoURL} alt="Profile" className="w-full h-full rounded-full object-cover" />
                                      ) : (
                                          <User className="w-3.5 h-3.5 text-[#c6ff1f]" />
                                      )}
                                  </div>
                              </div>
                              <div className="absolute right-0 top-full mt-2 bg-[#17171c] border border-white/10 rounded-xl shadow-2xl py-1.5 w-44 hidden group-hover:block z-50">
                                  <div className="px-3 py-1.5 border-b border-white/5">
                                      <p className="text-xs font-semibold text-white truncate">{user?.displayName || 'User'}</p>
                                      <p className="text-[10px] text-white/40 capitalize">{userPlan} Plan</p>
                                  </div>
                                  <button
                                      onClick={logout}
                                      className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 flex items-center gap-2 transition-colors"
                                  >
                                      <LogOut className="w-3.5 h-3.5" /> Sign Out
                                  </button>
                              </div>
                          </div>
                      </div>

                  </div>
              </header>

              {/* --- Dashboard Body --- */}
              <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-8 pt-3 sm:pt-4 pb-12">
                  
                  {/* --- Tight Subheader & Controls Bar --- */}
                  <div className="flex flex-wrap items-center justify-between gap-3 mb-3.5 sm:mb-4">
                      {/* Left: Filters */}
                      <div className="flex items-center gap-1.5">
                          {(['all', 'recent', 'favourites'] as const).map(type => {
                              const count = filterCounts[type];
                              const active = filterType === type;
                              const label = type === 'all' ? 'All' : type === 'recent' ? 'Recent' : 'Starred';
                              return (
                                  <button
                                      key={type}
                                      onClick={() => setFilterType(type)}
                                      className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-all ${
                                          active 
                                              ? 'bg-[#c6ff1f]/15 border-[#c6ff1f]/35 text-[#c6ff1f] shadow-sm shadow-[#c6ff1f]/5' 
                                              : 'bg-white/[0.02] border-white/[0.06] text-white/50 hover:text-white/80 hover:bg-white/[0.04]'
                                      }`}
                                  >
                                      {type === 'favourites' && <Star className={`w-3 h-3 ${active ? 'fill-current' : ''}`} />}
                                      <span>{label}</span>
                                      <span className={`text-[10px] font-mono px-1 rounded ${active ? 'bg-[#c6ff1f]/20 text-[#c6ff1f]' : 'bg-white/5 text-white/40'}`}>
                                          {count}
                                      </span>
                                  </button>
                              );
                          })}
                      </div>

                      {/* Right: Sort & Minimal View Toggle Setting */}
                      <div className="flex items-center gap-2 sm:gap-3">
                          {/* Sort */}
                          <div className="flex items-center bg-white/[0.03] border border-white/[0.07] rounded-lg px-2.5 py-0.5 text-xs text-white/50">
                              <span className="text-[11px] text-white/30 mr-1.5 hidden sm:inline">Sort:</span>
                              <select
                                  className="bg-transparent border-none outline-none text-white/70 text-xs font-medium cursor-pointer py-1"
                                  value={sortBy}
                                  onChange={(e) => setSortBy(e.target.value)}
                              >
                                  <option value="date" className="bg-[#17171c]">Last Modified</option>
                                  <option value="name" className="bg-[#17171c]">Project Name</option>
                              </select>
                              <button
                                  onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                                  className="text-white/40 hover:text-white/80 transition-colors p-0.5 ml-1 rounded hover:bg-white/5"
                                  title={sortOrder === 'desc' ? 'Descending' : 'Ascending'}
                              >
                                  {sortOrder === 'desc' ? <ArrowDownAZ className="w-3.5 h-3.5" /> : <ArrowUpZA className="w-3.5 h-3.5" />}
                              </button>
                          </div>

                          {/* View Mode Setting Toggle (Minimal vs Expanded) */}
                          <div className="flex items-center bg-white/[0.03] border border-white/[0.08] rounded-lg p-0.5 text-xs" title="Project list display mode">
                              <button
                                  onClick={() => handleSetViewMode('minimal')}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                      viewMode === 'minimal'
                                          ? 'bg-[#c6ff1f] text-black font-semibold shadow-sm'
                                          : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                                  }`}
                                  title="Minimal compact list"
                              >
                                  <List className="w-3.5 h-3.5" />
                                  <span>Minimal</span>
                              </button>
                              <button
                                  onClick={() => handleSetViewMode('expanded')}
                                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
                                      viewMode === 'expanded'
                                          ? 'bg-[#c6ff1f] text-black font-semibold shadow-sm'
                                          : 'text-white/50 hover:text-white hover:bg-white/[0.04]'
                                  }`}
                                  title="Expanded cards grid"
                              >
                                  <LayoutGrid className="w-3.5 h-3.5" />
                                  <span>Expanded</span>
                              </button>
                          </div>
                      </div>
                  </div>

                  {/* --- Projects, Batches, or Board Projects Container --- */}
                  {dashboardTab === 'batches' ? (
                      <BatchesDashboardView
                          batches={batches}
                          projects={projects}
                          searchTerm={searchTerm}
                          filterType={filterType}
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                          viewMode={viewMode}
                          onOpenBatch={openBatchAnalysis}
                          onOpenBatchStats={(b) => setActiveBatchStats(b)}
                          onNewBatchClick={() => setIsNewBatchModalOpen(true)}
                          onManageGamesClick={(b) => setManagingGamesBatch(b)}
                          onEditBatchClick={(b) => setEditingBatch(b)}
                          onDeleteBatchClick={handleDeleteBatch}
                          onToggleBatchFavourite={handleToggleBatchFavourite}
                      />
                  ) : dashboardTab === 'board' ? (
                      <BoardProjectsDashboardView
                          boardProjects={boardProjects}
                          searchTerm={searchTerm}
                          filterType={filterType}
                          sortBy={sortBy}
                          sortOrder={sortOrder}
                          viewMode={viewMode}
                          onOpenBoardProject={(project) => setActiveBoardProject(project)}
                          onNewBoardProjectClick={() => setIsNewBoardProjectModalOpen(true)}
                          onEditBoardProjectClick={(project) => setEditingBoardProject(project)}
                          onDeleteBoardProjectClick={handleDeleteBoardProject}
                          onToggleBoardProjectFavourite={handleToggleBoardProjectFavourite}
                          onDuplicateBoardProject={handleDuplicateBoardProject}
                          onExportBoardProjectJSON={handleExportBoardProjectJSON}
                          onImportBoardProjectJSON={handleImportBoardProjectJSON}
                      />
                  ) : filteredProjects.length === 0 ? (
                      <div className="glass rounded-2xl text-center py-16 px-4 text-white/40 flex flex-col items-center justify-center border border-white/5 mt-2">
                          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mb-3.5">
                              <Film className="w-7 h-7" />
                          </div>
                          <p className="text-base font-semibold text-white/80">No projects match your filter</p>
                          <p className="text-xs mt-1 text-white/40 max-w-sm">Drop a match video file anywhere on this screen or create a new project</p>
                          <button 
                              onClick={() => setIsNewProjectModalOpen(true)}
                              className="mt-4 btn-glow text-black text-xs font-semibold py-2 px-5 rounded-lg flex items-center gap-2 transition-all cursor-pointer shadow-md shadow-[#c6ff1f]/10"
                          >
                              <Plus className="w-3.5 h-3.5" /> Create New Project
                          </button>
                      </div>
                  ) : viewMode === 'minimal' ? (
                      /* --- Minimal List View --- */
                      <div className="bg-[#121216]/80 border border-white/[0.07] rounded-xl overflow-hidden shadow-xl backdrop-blur-md">
                          {/* Minimal Table Header */}
                          <div className="hidden md:grid md:grid-cols-[minmax(200px,1fr)_140px_150px_110px_190px] gap-3 px-4 py-2.5 bg-white/[0.02] border-b border-white/[0.06] text-[11px] font-semibold text-white/40 uppercase tracking-wider items-center">
                              <div className="flex items-center gap-2">Project</div>
                              <div>Source / Media</div>
                              <div>Analysis Data</div>
                              <div>Modified</div>
                              <div className="text-right pr-1">Actions</div>
                          </div>

                          {/* Minimal Rows */}
                          <div className="divide-y divide-white/[0.04]">
                              {filteredProjects.map((project) => {
                                  const hasSource = projectBlobs.has(project.id) || project.fileName === 'live' || storedVideoIds.has(project.id);
                                  const isEditing = editingProjectId === project.id;
                                  const isLive = project.fileName === 'live';
                                  const tagCount = project.data?.tagEvents?.length || 0;
                                  const shapeCount = project.data?.shapes?.length || 0;

                                  if (isEditing) {
                                      return (
                                          <div key={project.id} className="p-3 bg-[#181820] border-l-2 border-[#c6ff1f] space-y-2">
                                              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                                  <div>
                                                      <label className="text-[10px] text-white/40 block mb-0.5">Project Name</label>
                                                      <input
                                                          className="w-full bg-[#0e0e12] border border-white/20 rounded px-2.5 py-1 text-xs text-white focus:outline-none focus:border-[#c6ff1f]"
                                                          value={editForm.name}
                                                          onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                                                          placeholder="Project Name"
                                                          autoFocus
                                                      />
                                                  </div>
                                                  <div>
                                                      <label className="text-[10px] text-white/40 block mb-0.5">Description (optional)</label>
                                                      <input
                                                          className="w-full bg-[#0e0e12] border border-white/20 rounded px-2.5 py-1 text-xs text-gray-300 focus:outline-none focus:border-[#c6ff1f]"
                                                          value={editForm.description}
                                                          onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                                                          placeholder="Tactical details, opposition, etc."
                                                      />
                                                  </div>
                                              </div>
                                              <div className="flex justify-end gap-2 pt-1">
                                                  <button
                                                      onClick={() => setEditingProjectId(null)}
                                                      className="px-3 py-1 bg-white/10 hover:bg-white/15 text-white rounded text-xs transition-colors"
                                                  >
                                                      Cancel
                                                  </button>
                                                  <button
                                                      onClick={saveEditingProject}
                                                      className="px-3 py-1 bg-[#c6ff1f] hover:bg-[#b0e817] text-black font-semibold rounded text-xs transition-colors"
                                                  >
                                                      Save Changes
                                                  </button>
                                              </div>
                                          </div>
                                      );
                                  }

                                  return (
                                      <div
                                          key={project.id}
                                          className="project-row px-3.5 sm:px-4 py-2.5 hover:bg-white/[0.02] transition-colors group"
                                      >
                                          {/* Mobile View (< md) */}
                                          <div className="flex flex-col gap-2 md:hidden">
                                              <div className="flex items-center justify-between gap-2">
                                                  <div className="flex items-center gap-2 min-w-0">
                                                      <button
                                                          onClick={() => toggleFavourite(project)}
                                                          className={`star-btn p-0.5 shrink-0 ${project.favourite ? 'active' : ''}`}
                                                          title={project.favourite ? 'Remove star' : 'Star project'}
                                                      >
                                                          <Star className={`w-3.5 h-3.5 ${project.favourite ? 'fill-amber-400 text-amber-400' : ''}`} />
                                                      </button>
                                                      <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                                          isLive ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'bg-[#c6ff1f]/10 text-[#c6ff1f] border border-[#c6ff1f]/20'
                                                      }`}>
                                                          {isLive ? <Radio className="w-3 h-3 animate-pulse" /> : <Film className="w-3 h-3" />}
                                                      </div>
                                                      <button
                                                          onClick={() => openProject(project)}
                                                          className="text-white hover:text-[#c6ff1f] font-semibold text-xs truncate text-left"
                                                      >
                                                          {project.name}
                                                      </button>
                                                  </div>
                                                  <span className="text-[10px] text-white/40 font-mono shrink-0 whitespace-nowrap">
                                                      {new Date(project.lastModified).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                                                  </span>
                                              </div>
                                              {project.description && (
                                                  <p className="text-[11px] text-white/40 line-clamp-1 pl-6">
                                                      {project.description}
                                                  </p>
                                              )}
                                              <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/[0.04]">
                                                  <div className="flex items-center gap-1.5 flex-wrap">
                                                      {isLive ? (
                                                          <span className="inline-flex items-center gap-1 text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                                              <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" /> Live
                                                          </span>
                                                      ) : hasSource ? (
                                                          <span className="inline-flex items-center gap-1 text-[9px] text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20 max-w-[110px] truncate">
                                                              <span className="w-1 h-1 rounded-full bg-emerald-400 shrink-0" />
                                                              <span className="truncate">{project.fileName || 'Video'}</span>
                                                          </span>
                                                      ) : (
                                                          <span className="inline-flex items-center gap-1 text-[9px] text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                                                              Needs Relink
                                                          </span>
                                                      )}
                                                      <span className="inline-flex items-center gap-1 text-[9px] bg-white/[0.04] px-1.5 py-0.5 rounded text-white/60">
                                                          <Activity className="w-2.5 h-2.5 text-[#c6ff1f]" /> {tagCount}
                                                      </span>
                                                      <span className="inline-flex items-center gap-1 text-[9px] bg-white/[0.04] px-1.5 py-0.5 rounded text-white/60">
                                                          <Hexagon className="w-2.5 h-2.5 text-cyan-400" /> {shapeCount}
                                                      </span>
                                                  </div>
                                                  <div className="flex items-center gap-1 shrink-0">
                                                      <button onClick={() => startEditingProject(project)} className="p-1 text-white/50 hover:text-white" title="Edit">
                                                          <SquarePen className="w-3.5 h-3.5" />
                                                      </button>
                                                      <button onClick={() => deleteProjectAction(project.id)} className="p-1 text-red-400/60 hover:text-red-400" title="Delete">
                                                          <Trash className="w-3.5 h-3.5" />
                                                      </button>
                                                      {hasSource ? (
                                                          <button onClick={() => openProject(project)} className="px-2.5 py-1 bg-[#c6ff1f] text-black text-xs font-semibold rounded flex items-center gap-1">
                                                              Open
                                                          </button>
                                                      ) : (
                                                          <button onClick={() => handleRelinkVideoClick(project, false)} className="px-2 py-1 bg-white/10 text-white text-xs font-medium rounded">
                                                              Relink
                                                          </button>
                                                      )}
                                                  </div>
                                              </div>
                                          </div>

                                          {/* Desktop View (md:) */}
                                          <div className="hidden md:grid md:grid-cols-[minmax(200px,1fr)_140px_150px_110px_190px] gap-3 items-center">
                                              {/* Name, Star, Icon */}
                                              <div className="flex items-center gap-2.5 min-w-0">
                                                  <button
                                                      onClick={() => toggleFavourite(project)}
                                                      className={`star-btn p-0.5 shrink-0 ${project.favourite ? 'active' : ''}`}
                                                      title={project.favourite ? 'Remove star' : 'Star project'}
                                                  >
                                                      <Star className={`w-3.5 h-3.5 ${project.favourite ? 'fill-amber-400 text-amber-400' : ''}`} />
                                                  </button>

                                                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                                      isLive ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'bg-[#c6ff1f]/10 text-[#c6ff1f] border border-[#c6ff1f]/20'
                                                  }`}>
                                                      {isLive ? <Radio className="w-3 h-3 animate-pulse" /> : <Film className="w-3 h-3" />}
                                                  </div>

                                                  <div className="min-w-0 flex-1">
                                                      <div className="flex items-center gap-2">
                                                          <button
                                                              onClick={() => openProject(project)}
                                                              className="text-white hover:text-[#c6ff1f] font-medium text-xs truncate text-left transition-colors cursor-pointer"
                                                              title={project.name}
                                                          >
                                                              {project.name}
                                                          </button>
                                                      </div>
                                                      {project.description && (
                                                          <div className="mt-0.5">
                                                              <p 
                                                                  onClick={(e) => { e.stopPropagation(); toggleDescExpand(project.id); }}
                                                                  className={`text-[11px] select-text transition-all cursor-pointer ${
                                                                      expandedCardDescIds.has(project.id)
                                                                          ? 'whitespace-pre-wrap break-words text-gray-100 bg-white/[0.04] p-2 rounded-md border border-white/10 mt-1 shadow-inner' 
                                                                          : 'text-white/40 hover:text-white/80 truncate'
                                                                  }`}
                                                                  title={expandedCardDescIds.has(project.id) ? "Click to collapse" : "Click to view full text"}
                                                              >
                                                                  {project.description}
                                                              </p>
                                                              {project.description.length > 50 && (
                                                                  <div className="flex items-center gap-2 mt-0.5">
                                                                      <button
                                                                          type="button"
                                                                          onClick={(e) => toggleDescExpand(project.id, e)}
                                                                          className="inline-flex items-center gap-1 text-[10px] font-medium text-[#c6ff1f]/80 hover:text-[#c6ff1f] transition-colors cursor-pointer"
                                                                      >
                                                                          {expandedCardDescIds.has(project.id) ? (
                                                                              <><span>Show less</span><ChevronUp className="w-2.5 h-2.5" /></>
                                                                          ) : (
                                                                              <><span>View full text</span><ChevronDown className="w-2.5 h-2.5" /></>
                                                                          )}
                                                                      </button>
                                                                      <button
                                                                          type="button"
                                                                          onClick={(e) => { e.stopPropagation(); setDetailModalProject(project); }}
                                                                          className="inline-flex items-center gap-1 text-[10px] text-white/40 hover:text-white transition-colors cursor-pointer"
                                                                          title="View full project details"
                                                                      >
                                                                          <FileText className="w-2.5 h-2.5" />
                                                                          <span>Details</span>
                                                                      </button>
                                                                  </div>
                                                              )}
                                                          </div>
                                                      )}
                                                  </div>
                                              </div>

                                              {/* Media / Source status */}
                                              <div className="flex items-center gap-1.5 text-xs min-w-0">
                                                  {isLive ? (
                                                      <span className="inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20 font-medium whitespace-nowrap">
                                                          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                                                          Live Session
                                                      </span>
                                                  ) : hasSource ? (
                                                      <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 font-medium truncate max-w-[135px]" title={project.fileName}>
                                                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0" />
                                                          <span className="truncate">{project.fileName || 'Video Ready'}</span>
                                                      </span>
                                                  ) : (
                                                      <span className="inline-flex items-center gap-1 text-[10px] text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 font-medium whitespace-nowrap">
                                                          <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                                                          Needs Relink
                                                      </span>
                                                  )}
                                              </div>

                                              {/* Analysis Data Stats */}
                                              <div className="flex items-center gap-1.5 text-xs text-white/50 min-w-0 whitespace-nowrap">
                                                  <span className="inline-flex items-center gap-1 text-[10px] bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded shrink-0" title={`${tagCount} Tag Events`}>
                                                      <Activity className="w-3 h-3 text-[#c6ff1f] shrink-0" />
                                                      <span>{tagCount} tags</span>
                                                  </span>
                                                  <span className="inline-flex items-center gap-1 text-[10px] bg-white/[0.04] border border-white/[0.06] px-1.5 py-0.5 rounded shrink-0" title={`${shapeCount} Shapes`}>
                                                      <Hexagon className="w-3 h-3 text-cyan-400 shrink-0" />
                                                      <span>{shapeCount} shapes</span>
                                                  </span>
                                              </div>

                                              {/* Date */}
                                              <div className="text-[11px] text-white/40 whitespace-nowrap font-mono">
                                                  {new Date(project.lastModified).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                                              </div>

                                              {/* Actions */}
                                              <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                                  <button
                                                      onClick={() => startEditingProject(project)}
                                                      className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                                      title="Edit Project Details"
                                                  >
                                                      <SquarePen className="w-3.5 h-3.5" />
                                                  </button>

                                                  <button
                                                      onClick={() => handleRelinkVideoClick(project, true)}
                                                      className="p-1.5 text-white/40 hover:text-white rounded-lg hover:bg-white/5 transition-colors cursor-pointer"
                                                      title={isLive ? 'Import Match Video' : 'Replace Video'}
                                                  >
                                                      {isLive ? <FileVideo className="w-3.5 h-3.5" /> : <ArrowLeftRight className="w-3.5 h-3.5" />}
                                                  </button>

                                                  <button
                                                      onClick={() => deleteProjectAction(project.id)}
                                                      className="p-1.5 text-red-400/60 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors cursor-pointer"
                                                      title="Delete Project"
                                                  >
                                                      <Trash className="w-3.5 h-3.5" />
                                                  </button>

                                                  {hasSource ? (
                                                      <button
                                                          onClick={() => openProject(project)}
                                                          disabled={loadingProjectId === project.id}
                                                          className="ml-1 px-3 py-1.5 bg-[#c6ff1f] hover:bg-[#b0e817] text-black text-xs font-semibold rounded-lg flex items-center gap-1 transition-all active:scale-95 shadow-sm shadow-[#c6ff1f]/15 cursor-pointer shrink-0"
                                                      >
                                                          {loadingProjectId === project.id ? (
                                                              <div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                                                          ) : (
                                                              <>Open <ArrowRight className="w-3 h-3" /></>
                                                          )}
                                                      </button>
                                                  ) : (
                                                      <label className="ml-1 px-2.5 py-1.5 bg-white/10 hover:bg-white/15 text-white text-xs font-medium rounded-lg flex items-center gap-1 transition-all cursor-pointer shrink-0">
                                                          Relink
                                                          <input
                                                              type="file"
                                                              accept="video/*"
                                                              className="hidden"
                                                              onChange={(e) => {
                                                                  if (e.target.files?.[0]) {
                                                                      const url = URL.createObjectURL(e.target.files[0]);
                                                                      setProjectBlobs(prev => new Map(prev).set(project.id, url));
                                                                  }
                                                              }}
                                                          />
                                                      </label>
                                                  )}
                                              </div>
                                          </div>
                                      </div>
                                  );
                              })}
                          </div>
                      </div>
                  ) : (
                      /* --- Expanded Cards View --- */
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
                          {filteredProjects.map((project, idx) => {
                              const hasSource = projectBlobs.has(project.id) || project.fileName === 'live' || storedVideoIds.has(project.id);
                              const isEditing = editingProjectId === project.id;
                              const isLive = project.fileName === 'live';
                              
                              return (
                                  <div key={project.id} className="project-card glass rounded-xl p-4 border border-white/5 flex flex-col group relative" style={{ animationDelay: `${idx * 40}ms` }}>
                                      
                                      <div className="flex justify-between items-start mb-2 relative z-0 pr-6">
                                          {isEditing ? (
                                              <input 
                                                  className="bg-[#111] border border-[#333] rounded px-2 py-1 text-sm font-bold text-white focus:outline-none focus:border-[#c6ff1f] w-full mb-1"
                                                  value={editForm.name}
                                                  onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                                                  placeholder="Project Name"
                                                  autoFocus
                                              />
                                          ) : (
                                              <div className="flex items-center gap-2 min-w-0">
                                                  <div className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${
                                                      isLive ? 'bg-red-500/15 text-red-400 border border-red-500/25' : 'bg-[#c6ff1f]/10 text-[#c6ff1f] border border-[#c6ff1f]/20'
                                                  }`}>
                                                      {isLive ? <Radio className="w-3 h-3 animate-pulse" /> : <Film className="w-3 h-3" />}
                                                  </div>
                                                  <h3 
                                                      onClick={() => toggleTitleExpand(project.id)}
                                                       className={`text-white font-semibold text-sm leading-snug tracking-tight hover:text-[#c6ff1f] transition-all cursor-pointer select-text ${
                                                           expandedCardTitleIds.has(project.id) ? 'break-words text-[#c6ff1f]' : 'line-clamp-2'
                                                       }`}
                                                      title={expandedCardTitleIds.has(project.id) ? "Click to collapse title" : (project.name.length > 28 ? "Click to view full title" : project.name)}
                                                  >
                                                      {project.name}
                                                  </h3>
                                              </div>
                                          )}
                                          {!isEditing && (
                                              <button
                                                  className={`star-btn ${project.favourite ? 'active' : ''} absolute right-0 top-0 shrink-0`}
                                                  onClick={() => toggleFavourite(project)}
                                                  title="Toggle favourite"
                                              >
                                                  <Star className={`w-4 h-4 ${project.favourite ? 'fill-amber-400 text-amber-400' : ''}`} />
                                              </button>
                                          )}
                                      </div>
                                      
                                      {!isEditing && project.description && (
                                          <p 
                                              onClick={() => toggleDescExpand(project.id)}
                                               className={`text-gray-300 hover:text-white text-xs mb-2 leading-relaxed select-text transition-all cursor-pointer group/desc ${
                                                   expandedCardDescIds.has(project.id)
                                                       ? 'whitespace-pre-wrap break-words text-gray-100 bg-white/[0.04] p-3 rounded-lg border border-white/10 shadow-inner max-h-56 overflow-y-auto'
                                                       : 'line-clamp-2'
                                               }`}
                                              title={expandedCardDescIds.has(project.id) ? "Click to collapse" : "Click to view full text"}
                                          >
                                              {project.description}
                                          </p>
                                      )}
                                      {!isEditing && project.description && (
                                          <div className="flex items-center justify-between -mt-1 mb-2.5 text-[11px]">
                                              <button
                                                  type="button"
                                                  onClick={(e) => toggleDescExpand(project.id, e)}
                                                  className="inline-flex items-center gap-1 font-medium text-[#c6ff1f] hover:text-[#d4ff4d] transition-colors cursor-pointer py-0.5"
                                                  title={expandedCardDescIds.has(project.id) ? "Collapse description" : "Expand to view full text"}
                                              >
                                                  {expandedCardDescIds.has(project.id) ? (
                                                      <>
                                                          <ChevronUp className="w-3 h-3" />
                                                          <span>Show less</span>
                                                      </>
                                                  ) : (
                                                      <>
                                                          <ChevronDown className="w-3 h-3" />
                                                          <span>View full text</span>
                                                      </>
                                                  )}
                                              </button>
                                              <div className="flex items-center gap-2">
                                                  {expandedCardDescIds.has(project.id) && (
                                                      <button
                                                          type="button"
                                                          onClick={(e) => handleCopyText(project.description, project.id, e)}
                                                          className="inline-flex items-center gap-1 text-white/50 hover:text-white transition-colors cursor-pointer py-0.5 text-[10px]"
                                                          title="Copy full description text"
                                                      >
                                                          {copiedProjectId === project.id ? (
                                                              <>
                                                                  <Check className="w-3 h-3 text-[#c6ff1f]" />
                                                                  <span className="text-[#c6ff1f]">Copied</span>
                                                              </>
                                                          ) : (
                                                              <>
                                                                  <Copy className="w-3 h-3" />
                                                                  <span>Copy</span>
                                                              </>
                                                          )}
                                                      </button>
                                                  )}
                                                  <button
                                                      type="button"
                                                      onClick={(e) => { e.stopPropagation(); setDetailModalProject(project); }}
                                                      className="inline-flex items-center gap-1 text-white/40 hover:text-white transition-colors cursor-pointer py-0.5 text-[10px]"
                                                      title="View full project details"
                                                  >
                                                      <FileText className="w-3 h-3" />
                                                      <span>Details</span>
                                                  </button>
                                              </div>
                                          </div>
                                      )}
                                      
                                      <div className="flex items-center gap-2 text-white/30 text-[11px] mb-2.5">
                                          <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {new Date(project.lastModified).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                                          {isLive && (
                                              <span className="ml-auto inline-flex items-center gap-1 text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.2 rounded border border-red-500/20 font-medium">
                                                  <span className="w-1 h-1 rounded-full bg-red-400 animate-pulse" /> Live
                                              </span>
                                          )}
                                      </div>
                                      
                                      <div className="flex items-center gap-2 text-white/50 text-xs mb-3">
                                          <span className="inline-flex items-center gap-1 bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded text-[11px]"><Activity className="w-3 h-3 text-[#c6ff1f]" /> {project.data.tagEvents.length} tags</span>
                                          <span className="inline-flex items-center gap-1 bg-white/[0.03] border border-white/[0.05] px-1.5 py-0.5 rounded text-[11px]"><Hexagon className="w-3 h-3 text-cyan-400" /> {project.data.shapes.length} shapes</span>
                                      </div>

                                      {isEditing ? (
                                          <div className="mt-auto flex flex-col gap-2">
                                              <textarea 
                                                  className="w-full bg-[#111] border border-[#333] rounded p-2 text-xs text-gray-300 focus:outline-none focus:border-[#c6ff1f] resize-none h-14 mb-1"
                                                  placeholder="Add description..."
                                                  value={editForm.description}
                                                  onChange={(e) => setEditForm({...editForm, description: e.target.value})}
                                              />
                                              <div className="flex gap-2 w-full">
                                                  <button onClick={() => setEditingProjectId(null)} className="flex-1 py-1 bg-gray-700 hover:bg-gray-600 text-white rounded text-xs font-medium">Cancel</button>
                                                  <button onClick={saveEditingProject} className="flex-1 py-1 bg-[#c6ff1f] hover:bg-[#b0e817] text-black font-semibold rounded text-xs">Save</button>
                                              </div>
                                          </div>
                                      ) : (
                                          <div className="mt-auto flex flex-col gap-2.5">
                                              <div className="flex items-center gap-2">
                                                  {hasSource ? (
                                                      <button
                                                          className="btn-glow flex-1 text-black text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm shadow-[#c6ff1f]/15"
                                                          disabled={loadingProjectId === project.id}
                                                          onClick={() => openProject(project)}
                                                      >
                                                          {loadingProjectId === project.id ? (
                                                              <><div className="w-3 h-3 border-2 border-black/30 border-t-black rounded-full animate-spin" /> Loading...</>
                                                          ) : (
                                                              <>Open Project <ArrowRight className="w-3 h-3" /></>
                                                          )}
                                                      </button>
                                                  ) : (
                                                      <label className="flex-1 text-center text-white text-xs font-semibold py-1.5 px-3 rounded-lg flex items-center justify-center gap-1.5 transition-all bg-white/10 hover:bg-white/20 cursor-pointer">
                                                          Reload Video
                                                          <input 
                                                              type="file" 
                                                              accept="video/*" 
                                                              className="hidden" 
                                                              onChange={(e) => {
                                                                  if (e.target.files?.[0]) {
                                                                      const url = URL.createObjectURL(e.target.files[0]);
                                                                      setProjectBlobs(prev => new Map(prev).set(project.id, url));
                                                                  }
                                                              }}
                                                          />
                                                      </label>
                                                  )}
                                              </div>
                                              
                                              <div className="flex items-center justify-between border-t border-white/5 pt-2">
                                                  <div className="flex items-center gap-2">
                                                      <button onClick={() => startEditingProject(project)} className="text-gray-400 hover:text-white flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer" title="Edit Info">
                                                          <SquarePen className="w-3 h-3" /> Edit
                                                      </button>
                                                      <button onClick={() => setDetailModalProject(project)} className="text-gray-400 hover:text-white flex items-center gap-1 text-[11px] font-medium transition-colors cursor-pointer" title="Full Project Details">
                                                          <FileText className="w-3 h-3" /> Details
                                                      </button>
                                                  </div>
                                                  <button onClick={() => handleRelinkVideoClick(project, true)} className="text-gray-400 hover:text-white flex items-center gap-1 text-[11px] font-medium transition-colors" title={project.fileName === 'live' ? 'Import Video' : 'Change Video'}>
                                                      {project.fileName === 'live' ? <FileVideo className="w-3 h-3" /> : <ArrowLeftRight className="w-3 h-3" />} 
                                                      {project.fileName === 'live' ? 'Import Video' : 'Replace'}
                                                  </button>
                                                  <button onClick={() => deleteProjectAction(project.id)} className="text-red-400/70 hover:text-red-400 flex items-center gap-1 text-[11px] font-medium transition-colors" title="Delete">
                                                      <Trash className="w-3 h-3" /> Delete
                                                  </button>
                                              </div>
                                          </div>
                                      )}
                                  </div>
                              );
                          })}
                      </div>
                  )}

                  {toast && (
                      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 toast">
                          <div className="glass rounded-xl px-5 py-2.5 flex items-center gap-2.5 border border-[#c6ff1f]/30 shadow-2xl shadow-[#c6ff1f]/10">
                              <div className="w-2 h-2 rounded-full bg-[#c6ff1f] animate-pulse"></div>
                              <span className="text-white font-medium text-xs">{toast}</span>
                              <button onClick={() => setToast(null)} className="text-white/30 hover:text-white/70 transition-colors ml-1.5 text-xs"><X className="w-3.5 h-3.5" /></button>
                          </div>
                      </div>
                  )}

                  <BrowserRecommendationBanner />
              </main>
          </div>
          </>
      );
  }

  // --- Workspace ---
  const projectBlob = activeProject ? projectBlobs.get(activeProject.id) : null;
  // If activeProject is set, keep workspace mounted during batch mode even if a tab's video is being linked
  if (!activeProject || (!projectBlob && !activeBatch)) return null;

  return (
    <ErrorBoundary onReset={() => {
        setActiveBatch(null);
        setView('home');
    }}>
        <StorageWarning />
        <Workspace 
            key={activeBatch ? `${activeBatch.id}-${batchModeConfig?.initialPlaylistId || ''}-${batchModeConfig?.initialSeekTime || ''}` : activeProject.id}
            userPlan={userPlan}
            videoUrl={projectBlob || ''} 
            project={activeProject}
            onUpdateProject={(data, targetId) => updateProjectData(targetId || activeProject.id, data)}
            onUpdateMetadata={(name, desc) => updateProjectMetadata(activeProject.id, name, desc)}
            onRelinkVideo={(proj, isNew) => handleRelinkVideoClick(proj, isNew)}
            onForceSync={() => {
                if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
                const p = projects.find(x => x.id === activeProject.id);
                if (p) {
                    saveProjectDataLocally(p.id, p).catch(console.error);
                    setErrorMessage("Synced with Cloud Successfully!");
                }
            }}
            onClose={() => {
                if (syncTimeoutRef.current) {
                    clearTimeout(syncTimeoutRef.current);
                    const p = projects.find(x => x.id === activeProject.id);
                    if (p) saveProjectDataLocally(p.id, p).catch(console.error);
                }
                setActiveBatch(null);
                setView('home');
            }} 
            batchMode={activeBatch ? {
                batch: activeBatch,
                onUpdateBatch: (updatedBatch) => {
                    setActiveBatch(updatedBatch);
                    setBatches(prev => prev.map(b => b.id === updatedBatch.id ? updatedBatch : b));
                    saveBatchLocally(updatedBatch).catch(console.error);
                },
                allBatchProjects: projects.filter(p => activeBatch.projectIds?.includes(p.id)),
                projectBlobs: projectBlobs,
                onSelectProject: async (targetProjectId) => {
                    const targetProj = projects.find(p => p.id === targetProjectId);
                    if (!targetProj) return;
                    let blob = projectBlobs.get(targetProjectId);
                    if (!blob) {
                        blob = await ensureProjectBlob(targetProj);
                    }
                    if (blob) {
                        setProjectBlobs(prev => {
                            const next = new Map(prev);
                            next.set(targetProjectId, blob!);
                            return next;
                        });
                    }
                    setActiveProject(targetProj);
                },
                onReloadVideo: (targetProj) => {
                    handleRelinkVideoClick(targetProj, false);
                },
                onRelinkSingleVideo: async (targetProj: Project, file: File, handle?: any) => {
                    const url = URL.createObjectURL(file);
                    setProjectBlobs(prev => new Map(prev).set(targetProj.id, url));
                    setStoredVideoIds(prev => new Set(prev).add(targetProj.id));
                    const updated = { ...targetProj, fileName: file.name, lastModified: Date.now() };
                    setProjects(prev => prev.map(p => p.id === targetProj.id ? updated : p));
                    if (activeProject && activeProject.id === targetProj.id) {
                        setActiveProject(updated);
                    }
                    saveVideoLocally(targetProj.id, file).catch(console.error);
                    if (handle) saveFileHandle(targetProj.id, handle).catch(console.error);
                    saveProjectDataLocally(targetProj.id, updated).catch(console.error);
                    setToast(`Relinked video for "${targetProj.name}"`);
                },
                onBatchRelinkVideos: async (mappings: { projectId: string; file: File; handle?: any }[]) => {
                    const updatedBlobs = new Map(projectBlobs);
                    let currentProjects = [...projects];

                    for (const { projectId, file, handle } of mappings) {
                        const url = URL.createObjectURL(file);
                        updatedBlobs.set(projectId, url);

                        const idx = currentProjects.findIndex(p => p.id === projectId);
                        if (idx !== -1) {
                            const updatedProj = { ...currentProjects[idx], fileName: file.name, lastModified: Date.now() };
                            currentProjects[idx] = updatedProj;
                            saveProjectDataLocally(projectId, updatedProj).catch(console.error);
                        }
                        saveVideoLocally(projectId, file).catch(console.error);
                        if (handle) saveFileHandle(projectId, handle).catch(console.error);
                    }

                    setStoredVideoIds(prev => new Set([...prev, ...mappings.map(m => m.projectId)]));
                    setProjectBlobs(updatedBlobs);
                    setProjects(currentProjects);
                    if (activeProject) {
                        const cur = currentProjects.find(p => p.id === activeProject.id);
                        if (cur) setActiveProject(cur);
                    }
                    setToast(`Linked ${mappings.length} match video${mappings.length > 1 ? 's' : ''} successfully!`);
                },
                onAddGamesToBatch: () => {
                    setManagingGamesBatch(activeBatch);
                },
                onOpenStats: () => {
                    setActiveBatchStats(activeBatch);
                },
                initialPlaylistId: batchModeConfig?.initialPlaylistId,
                initialSeekTime: batchModeConfig?.initialSeekTime,
                autoPlayPlaylist: batchModeConfig?.autoPlayPlaylist
            } : undefined}
        />
        <BrowserRecommendationBanner />
    </ErrorBoundary>
  );
};

