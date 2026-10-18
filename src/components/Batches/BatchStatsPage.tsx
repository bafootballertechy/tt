import React, { useState, useMemo, useEffect } from 'react';
import { 
  ChevronLeft, Activity, Download, Play, X, Search, Filter, 
  Clock, Film, Tag, ListPlus, CheckSquare, Square, ArrowUpDown, 
  ChevronDown, ChevronUp, SlidersHorizontal, FileSpreadsheet, 
  ChevronRight, RefreshCw, Check, ArrowRight, Eye, BarChart2,
  Table as TableIcon, Layers, Sparkles, TrendingUp, Grid, 
  Calendar, Info
} from 'lucide-react';
import type { Batch, Project, Playlist, PlaylistClip } from '../../types';
import { formatTime } from '../../utils/math';

export interface BatchStatsPageProps {
  batch: Batch;
  projects: Project[];
  onClose: () => void;
  onOpenBatchAnalysis: (
    batch: Batch, 
    initialProjectId?: string, 
    initialPlaylistId?: string, 
    initialSeekTime?: number, 
    autoPlayPlaylist?: boolean
  ) => void;
  onUpdateBatch: (updatedBatch: Batch) => void;
}

export interface FlatBatchEvent {
  id: string;
  projectId: string;
  projectName: string;
  projectFileName?: string;
  tagId: string;
  tagName: string;
  tagColor: string;
  startTime: number;
  endTime: number;
  duration: number;
  notes: string;
  labelIds: string[];
  labels: { id: string; name: string; groupName?: string }[];
}

export const BatchStatsPage: React.FC<BatchStatsPageProps> = ({
  batch,
  projects,
  onClose,
  onOpenBatchAnalysis,
  onUpdateBatch,
}) => {
  // Navigation Tabs: 4 Rich Analytical Views
  const [activeTab, setActiveTab] = useState<'overview' | 'comparison' | 'matrix' | 'explorer'>('overview');

  // Search & Filters in Explorer
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMatchFilter, setSelectedMatchFilter] = useState<string>('all');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string>('all');
  const [selectedLabelFilter, setSelectedLabelFilter] = useState<string>('all');
  
  // Sorting in Explorer
  const [sortBy, setSortBy] = useState<'time' | 'duration' | 'match' | 'tag'>('time');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Pagination for Mass Data in Explorer
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState<number>(50);

  // Multi-Selection State (Set of event IDs)
  const [selectedEventIds, setSelectedEventIds] = useState<Set<string>>(new Set());

  // Matrix and Comparison filters
  const [comparisonSearch, setComparisonSearch] = useState('');
  const [selectedTagForDetail, setSelectedTagForDetail] = useState<string | null>(null);

  // Playlist Modal State
  const [isPlaylistModalOpen, setIsPlaylistModalOpen] = useState(false);
  const [playlistModalMode, setPlaylistModalMode] = useState<'new' | 'existing'>('new');
  const [newPlaylistName, setNewPlaylistName] = useState('');
  const [selectedExistingPlaylistId, setSelectedExistingPlaylistId] = useState('');

  // CSV Dropdown & Toast Notification
  const [showCsvDropdown, setShowCsvDropdown] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // 1. Resolve projects belonging to this batch
  const batchProjects = useMemo(() => {
    return projects.filter(p => batch.projectIds?.includes(p.id));
  }, [projects, batch.projectIds]);

  // 2. Flatten all events across all batch projects with memoization
  const allEvents = useMemo<FlatBatchEvent[]>(() => {
    const list: FlatBatchEvent[] = [];

    batchProjects.forEach(proj => {
      const data = proj.data || {};
      const projTags = data.tags || [];
      const projLabels = data.labels || [];
      const projGroups = data.labelGroups || [];
      const tagEvents = data.tagEvents || [];

      tagEvents.forEach(evt => {
        const foundTag = projTags.find(t => t.id === evt.tagId);
        const tagName = foundTag?.name || 'Unlabeled Tag';
        const tagColor = foundTag?.color || '#3b82f6';
        const duration = Math.max(0, (evt.endTime || 0) - (evt.startTime || 0));

        const eventLabels: { id: string; name: string; groupName?: string }[] = [];
        if (evt.labelIds && evt.labelIds.length > 0) {
          evt.labelIds.forEach(lid => {
            const l = projLabels.find(x => x.id === lid);
            if (l) {
              const grp = projGroups.find(g => g.id === l.groupId);
              eventLabels.push({
                id: l.id,
                name: l.name,
                groupName: grp?.name
              });
            }
          });
        }

        list.push({
          id: evt.id,
          projectId: proj.id,
          projectName: proj.name,
          projectFileName: proj.fileName,
          tagId: evt.tagId,
          tagName,
          tagColor,
          startTime: evt.startTime,
          endTime: evt.endTime,
          duration,
          notes: evt.notes || '',
          labelIds: evt.labelIds || [],
          labels: eventLabels
        });
      });
    });

    return list;
  }, [batchProjects]);

  // 3. Aggregate Tag Statistics
  const tagStats = useMemo(() => {
    const map = new Map<string, {
      name: string;
      color: string;
      totalCount: number;
      totalDuration: number;
      matchCounts: Record<string, number>;
      associatedLabels: Map<string, number>;
    }>();

    allEvents.forEach(evt => {
      let stat = map.get(evt.tagName);
      if (!stat) {
        stat = {
          name: evt.tagName,
          color: evt.tagColor,
          totalCount: 0,
          totalDuration: 0,
          matchCounts: {},
          associatedLabels: new Map()
        };
        map.set(evt.tagName, stat);
      }
      stat.totalCount += 1;
      stat.totalDuration += evt.duration;
      stat.matchCounts[evt.projectId] = (stat.matchCounts[evt.projectId] || 0) + 1;

      evt.labels.forEach(l => {
        stat.associatedLabels.set(l.name, (stat.associatedLabels.get(l.name) || 0) + 1);
      });
    });

    const totalEventsCount = allEvents.length || 1;
    return Array.from(map.values())
      .map(s => ({
        ...s,
        avgDuration: s.totalCount > 0 ? s.totalDuration / s.totalCount : 0,
        percentage: (s.totalCount / totalEventsCount) * 100,
        matchesPresentCount: Object.keys(s.matchCounts).length
      }))
      .sort((a, b) => b.totalCount - a.totalCount);
  }, [allEvents]);

  // 4. Aggregate Label Statistics
  const labelStats = useMemo(() => {
    const map = new Map<string, {
      name: string;
      groupName?: string;
      totalCount: number;
      matchCounts: Record<string, number>;
      associatedTags: Map<string, number>;
    }>();

    allEvents.forEach(evt => {
      evt.labels.forEach(l => {
        let stat = map.get(l.name);
        if (!stat) {
          stat = {
            name: l.name,
            groupName: l.groupName,
            totalCount: 0,
            matchCounts: {},
            associatedTags: new Map()
          };
          map.set(l.name, stat);
        }
        stat.totalCount += 1;
        stat.matchCounts[evt.projectId] = (stat.matchCounts[evt.projectId] || 0) + 1;
        stat.associatedTags.set(evt.tagName, (stat.associatedTags.get(evt.tagName) || 0) + 1);
      });
    });

    return Array.from(map.values()).sort((a, b) => b.totalCount - a.totalCount);
  }, [allEvents]);

  // 5. Total Metrics
  const totalDurationSeconds = useMemo(() => {
    return allEvents.reduce((acc, e) => acc + e.duration, 0);
  }, [allEvents]);

  const avgEventsPerMatch = useMemo(() => {
    if (batchProjects.length === 0) return '0.0';
    return (allEvents.length / batchProjects.length).toFixed(1);
  }, [allEvents.length, batchProjects.length]);

  // Unique list of tags and labels for dropdowns
  const uniqueTagNames = useMemo(() => {
    return Array.from(new Set(allEvents.map(e => e.tagName))).sort();
  }, [allEvents]);

  const uniqueLabelNames = useMemo(() => {
    const set = new Set<string>();
    allEvents.forEach(e => e.labels.forEach(l => set.add(l.name)));
    return Array.from(set).sort();
  }, [allEvents]);

  // 6. Filter & Sort Events for Explorer Table
  const filteredEvents = useMemo(() => {
    let result = allEvents;

    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase().trim();
      result = result.filter(e => 
        e.tagName.toLowerCase().includes(q) ||
        e.projectName.toLowerCase().includes(q) ||
        e.notes.toLowerCase().includes(q) ||
        e.labels.some(l => l.name.toLowerCase().includes(q) || (l.groupName && l.groupName.toLowerCase().includes(q)))
      );
    }

    if (selectedMatchFilter !== 'all') {
      result = result.filter(e => e.projectId === selectedMatchFilter);
    }

    if (selectedTagFilter !== 'all') {
      result = result.filter(e => e.tagName === selectedTagFilter);
    }

    if (selectedLabelFilter !== 'all') {
      result = result.filter(e => e.labels.some(l => l.name === selectedLabelFilter));
    }

    // Sort
    return [...result].sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'time') {
        cmp = a.startTime - b.startTime;
      } else if (sortBy === 'duration') {
        cmp = a.duration - b.duration;
      } else if (sortBy === 'match') {
        cmp = a.projectName.localeCompare(b.projectName);
      } else if (sortBy === 'tag') {
        cmp = a.tagName.localeCompare(b.tagName);
      }
      return sortOrder === 'asc' ? cmp : -cmp;
    });
  }, [allEvents, searchTerm, selectedMatchFilter, selectedTagFilter, selectedLabelFilter, sortBy, sortOrder]);

  // Reset pagination on filter change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedMatchFilter, selectedTagFilter, selectedLabelFilter, pageSize]);

  // Paginated Events for high performance
  const totalPages = Math.max(1, Math.ceil(filteredEvents.length / pageSize));
  const paginatedEvents = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredEvents.slice(start, start + pageSize);
  }, [filteredEvents, currentPage, pageSize]);

  // Tag x Match Comparison Data
  const filteredComparisonTags = useMemo(() => {
    if (!comparisonSearch.trim()) return tagStats;
    const q = comparisonSearch.toLowerCase().trim();
    return tagStats.filter(t => t.name.toLowerCase().includes(q));
  }, [tagStats, comparisonSearch]);

  // Tag x Label Matrix Data
  const matrixData = useMemo(() => {
    const topTags = tagStats.slice(0, 15);
    const topLabels = labelStats.slice(0, 20);

    const matrix: Record<string, Record<string, number>> = {};
    topTags.forEach(t => {
      matrix[t.name] = {};
      topLabels.forEach(l => {
        matrix[t.name][l.name] = 0;
      });
    });

    allEvents.forEach(evt => {
      if (matrix[evt.tagName]) {
        evt.labels.forEach(l => {
          if (matrix[evt.tagName][l.name] !== undefined) {
            matrix[evt.tagName][l.name] += 1;
          }
        });
      }
    });

    return { topTags, topLabels, matrix };
  }, [tagStats, labelStats, allEvents]);

  // Selection handlers
  const handleToggleSelectAllPage = () => {
    const pageIds = paginatedEvents.map(e => e.id);
    const allPageSelected = pageIds.every(id => selectedEventIds.has(id));

    setSelectedEventIds(prev => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageIds.forEach(id => next.delete(id));
      } else {
        pageIds.forEach(id => next.add(id));
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedEventIds.size === filteredEvents.length) {
      setSelectedEventIds(new Set());
    } else {
      setSelectedEventIds(new Set(filteredEvents.map(e => e.id)));
    }
  };

  const handleToggleEventSelect = (eventId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedEventIds(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) next.delete(eventId);
      else next.add(eventId);
      return next;
    });
  };

  // CSV Export utility
  const triggerCSVDownload = (filename: string, rows: (string | number)[][]) => {
    const csvContent = rows.map(row => 
      row.map(cell => {
        const str = cell === null || cell === undefined ? '' : String(cell);
        if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    ).join('\r\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast(`Exported ${filename}`);
  };

  const handleExportCSV = (type: 'all' | 'filtered' | 'selected' | 'tag_summary' | 'comparison') => {
    setShowCsvDropdown(false);
    const sanitizedBatchName = batch.name.replace(/[^a-zA-Z0-9_-]/g, '_');

    if (type === 'tag_summary') {
      const headers = ['Tag Name', 'Color', 'Total Occurrences', 'Total Duration (sec)', 'Avg Duration (sec)', 'Share (%)', 'Matches Present'];
      const rows = tagStats.map(t => [
        t.name,
        t.color,
        t.totalCount,
        t.totalDuration.toFixed(2),
        t.avgDuration.toFixed(2),
        t.percentage.toFixed(1) + '%',
        t.matchesPresentCount
      ]);
      triggerCSVDownload(`Batch_${sanitizedBatchName}_Tag_Summary.csv`, [headers, ...rows]);
      return;
    }

    if (type === 'comparison') {
      const headers = ['Tag Name', ...batchProjects.map(p => p.name), 'Total Count'];
      const rows = tagStats.map(t => [
        t.name,
        ...batchProjects.map(p => t.matchCounts[p.id] || 0),
        t.totalCount
      ]);
      triggerCSVDownload(`Batch_${sanitizedBatchName}_Match_Comparison.csv`, [headers, ...rows]);
      return;
    }

    let targetList = allEvents;
    if (type === 'filtered') targetList = filteredEvents;
    if (type === 'selected') targetList = allEvents.filter(e => selectedEventIds.has(e.id));

    if (targetList.length === 0) {
      showToast('No events to export');
      return;
    }

    const headers = [
      'Match Name', 'Match ID', 'Event ID', 'Tag Name', 'Tag Color', 
      'Labels', 'Start Time (sec)', 'End Time (sec)', 'Timecode Range', 'Duration (sec)', 'Notes'
    ];

    const rows = targetList.map(e => [
      e.projectName,
      e.projectId,
      e.id,
      e.tagName,
      e.tagColor,
      e.labels.map(l => l.name).join('; '),
      e.startTime.toFixed(2),
      e.endTime.toFixed(2),
      `${formatTime(e.startTime)} - ${formatTime(e.endTime)}`,
      e.duration.toFixed(2),
      e.notes
    ]);

    const filename = type === 'selected'
      ? `Batch_${sanitizedBatchName}_Selected_${targetList.length}_Events.csv`
      : `Batch_${sanitizedBatchName}_${targetList.length}_Events.csv`;

    triggerCSVDownload(filename, [headers, ...rows]);
  };

  // Watch Single Event
  const handleWatchSingleEvent = (evt: FlatBatchEvent) => {
    onOpenBatchAnalysis(batch, evt.projectId, undefined, evt.startTime, true);
  };

  // Watch All Events for a specific Tag
  const handleWatchTagClips = (tagName: string) => {
    const tagClips = allEvents.filter(e => e.tagName === tagName);
    if (tagClips.length === 0) return;

    const newClips: PlaylistClip[] = tagClips.map((e, idx) => ({
      instanceId: `clip-${e.id}-${Date.now()}-${idx}`,
      eventId: e.id,
      projectId: e.projectId,
      projectName: e.projectName,
      inPoint: e.startTime,
      outPoint: e.endTime,
      notes: e.notes
    }));

    const playlistId = 'bp-tag-' + Date.now();
    const newPlaylist: Playlist = {
      id: playlistId,
      name: `${tagName} (${newClips.length} events)`,
      events: newClips
    };

    const updatedBatch: Batch = {
      ...batch,
      playlists: [newPlaylist, ...(batch.playlists || [])],
      lastModified: Date.now()
    };

    onUpdateBatch(updatedBatch);
    const firstClip = newClips[0];
    onOpenBatchAnalysis(updatedBatch, firstClip.projectId, playlistId, firstClip.inPoint, true);
  };

  // Quick Drilldown from Matrix or Overview into Explorer
  const handleDrilldownToExplorer = (tag?: string, label?: string) => {
    if (tag) setSelectedTagFilter(tag);
    if (label) setSelectedLabelFilter(label);
    setActiveTab('explorer');
  };

  // Open Playlist Modal
  const handleOpenPlaylistModal = () => {
    if (selectedEventIds.size === 0) {
      showToast('Select one or more events first');
      return;
    }
    setNewPlaylistName(`Batch Selection (${selectedEventIds.size} events)`);
    if (batch.playlists && batch.playlists.length > 0) {
      setSelectedExistingPlaylistId(batch.playlists[0].id);
    }
    setIsPlaylistModalOpen(true);
  };

  // Confirm Playlist (Save / Watch Now)
  const handleConfirmPlaylist = (launchAnalysis: boolean) => {
    const selectedList = allEvents.filter(e => selectedEventIds.has(e.id));
    if (selectedList.length === 0) return;

    const newClips: PlaylistClip[] = selectedList.map((e, idx) => ({
      instanceId: `clip-${e.id}-${Date.now()}-${idx}`,
      eventId: e.id,
      projectId: e.projectId,
      projectName: e.projectName,
      inPoint: e.startTime,
      outPoint: e.endTime,
      notes: e.notes
    }));

    let updatedPlaylists = [...(batch.playlists || [])];
    let targetPlaylistId = '';

    if (playlistModalMode === 'new' || updatedPlaylists.length === 0) {
      const pName = newPlaylistName.trim() || `Selection (${newClips.length} clips)`;
      targetPlaylistId = 'bp-' + Date.now();
      const newPlaylist: Playlist = {
        id: targetPlaylistId,
        name: pName,
        events: newClips
      };
      updatedPlaylists = [newPlaylist, ...updatedPlaylists];
    } else {
      targetPlaylistId = selectedExistingPlaylistId || updatedPlaylists[0].id;
      updatedPlaylists = updatedPlaylists.map(pl => {
        if (pl.id === targetPlaylistId) {
          return {
            ...pl,
            events: [...pl.events, ...newClips]
          };
        }
        return pl;
      });
    }

    const updatedBatch: Batch = {
      ...batch,
      playlists: updatedPlaylists,
      lastModified: Date.now()
    };

    onUpdateBatch(updatedBatch);
    setIsPlaylistModalOpen(false);

    if (launchAnalysis) {
      const firstClip = newClips[0];
      onOpenBatchAnalysis(
        updatedBatch,
        firstClip.projectId,
        targetPlaylistId,
        firstClip.inPoint,
        true
      );
    } else {
      showToast(`Added ${newClips.length} events to playlist!`);
      setSelectedEventIds(new Set());
    }
  };

  // Instant Watch Selected
  const handleWatchSelectedDirectly = () => {
    if (selectedEventIds.size === 0) return;
    const selectedList = allEvents.filter(e => selectedEventIds.has(e.id));
    if (selectedList.length === 0) return;

    const newClips: PlaylistClip[] = selectedList.map((e, idx) => ({
      instanceId: `clip-${e.id}-${Date.now()}-${idx}`,
      eventId: e.id,
      projectId: e.projectId,
      projectName: e.projectName,
      inPoint: e.startTime,
      outPoint: e.endTime,
      notes: e.notes
    }));

    const playlistId = 'bp-quick-' + Date.now();
    const newPlaylist: Playlist = {
      id: playlistId,
      name: `Batch Watch (${selectedList.length} events)`,
      events: newClips
    };

    const updatedBatch: Batch = {
      ...batch,
      playlists: [newPlaylist, ...(batch.playlists || [])],
      lastModified: Date.now()
    };

    onUpdateBatch(updatedBatch);
    const firstClip = newClips[0];
    onOpenBatchAnalysis(updatedBatch, firstClip.projectId, playlistId, firstClip.inPoint, true);
  };

  const isAllPageSelected = paginatedEvents.length > 0 && paginatedEvents.every(e => selectedEventIds.has(e.id));

  return (
    <div className="h-screen w-screen bg-[#0c0c10] text-white flex flex-col font-sans select-none overflow-hidden">
      {/* 1. Header Toolbar */}
      <header className="h-14 bg-[#111116] border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0 z-30">
        {/* Left: Navigation & Batch Meta */}
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer shrink-0"
            title="Return to Batches Dashboard"
          >
            <ChevronLeft className="w-4 h-4" />
            <span>Batches</span>
          </button>

          <div className="h-4 w-px bg-white/10 shrink-0" />

          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-lg bg-[#c6ff1f]/10 border border-[#c6ff1f]/20 flex items-center justify-center shrink-0">
              <Activity className="w-4 h-4 text-[#c6ff1f]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md" title={batch.name}>
                  {batch.name}
                </h1>
                <span className="text-[10px] font-mono text-[#c6ff1f] bg-[#c6ff1f]/10 border border-[#c6ff1f]/20 px-2 py-0.5 rounded-full font-bold shrink-0">
                  {batchProjects.length} {batchProjects.length === 1 ? 'game' : 'games'}
                </span>
                <span className="text-[10px] font-mono text-white/50 bg-white/5 border border-white/10 px-2 py-0.5 rounded-full font-medium shrink-0 hidden md:inline">
                  {allEvents.length} events logged
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* CSV Export Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowCsvDropdown(prev => !prev)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors cursor-pointer"
              title="Export batch data as CSV"
            >
              <Download className="w-3.5 h-3.5 text-[#c6ff1f]" />
              <span className="hidden sm:inline">Export CSV</span>
              <ChevronDown className="w-3 h-3 text-white/40" />
            </button>

            {showCsvDropdown && (
              <div 
                className="absolute right-0 mt-1.5 w-64 bg-[#16161c] border border-white/15 rounded-xl shadow-2xl py-1.5 z-50 divide-y divide-white/5 animate-in fade-in zoom-in-95 duration-100"
                onMouseLeave={() => setShowCsvDropdown(false)}
              >
                <div className="px-3 py-1 text-[10px] font-bold text-white/40 uppercase tracking-wider">
                  Export Options
                </div>
                <button
                  onClick={() => handleExportCSV('all')}
                  className="w-full text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <FileSpreadsheet className="w-3.5 h-3.5 text-[#c6ff1f]" />
                    <span>All Events CSV</span>
                  </span>
                  <span className="text-[10px] font-mono text-white/40">{allEvents.length}</span>
                </button>

                <button
                  onClick={() => handleExportCSV('filtered')}
                  className="w-full text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Filter className="w-3.5 h-3.5 text-blue-400" />
                    <span>Current Filtered View</span>
                  </span>
                  <span className="text-[10px] font-mono text-white/40">{filteredEvents.length}</span>
                </button>

                {selectedEventIds.size > 0 && (
                  <button
                    onClick={() => handleExportCSV('selected')}
                    className="w-full text-left px-3 py-2 text-xs text-[#c6ff1f] hover:bg-[#c6ff1f]/10 flex items-center justify-between cursor-pointer font-semibold"
                  >
                    <span className="flex items-center gap-2">
                      <CheckSquare className="w-3.5 h-3.5 text-[#c6ff1f]" />
                      <span>Export Selected Events</span>
                    </span>
                    <span className="text-[10px] font-mono">{selectedEventIds.size}</span>
                  </button>
                )}

                <button
                  onClick={() => handleExportCSV('tag_summary')}
                  className="w-full text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <Tag className="w-3.5 h-3.5 text-amber-400" />
                    <span>Tag Frequency Summary</span>
                  </span>
                  <span className="text-[10px] font-mono text-white/40">{tagStats.length}</span>
                </button>

                <button
                  onClick={() => handleExportCSV('comparison')}
                  className="w-full text-left px-3 py-2 text-xs text-white/80 hover:text-white hover:bg-white/5 flex items-center justify-between cursor-pointer"
                >
                  <span className="flex items-center gap-2">
                    <TableIcon className="w-3.5 h-3.5 text-purple-400" />
                    <span>Cross-Match Matrix CSV</span>
                  </span>
                  <span className="text-[10px] font-mono text-white/40">{batchProjects.length} games</span>
                </button>
              </div>
            )}
          </div>

          {/* Open Batch Workspace CTA */}
          <button
            onClick={() => onOpenBatchAnalysis(batch)}
            className="btn-glow flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold bg-[#c6ff1f] hover:bg-[#d4ff4d] text-[#0a0a0c] shadow-lg shadow-[#c6ff1f]/25 hover:shadow-[#c6ff1f]/40 border border-[#c6ff1f]/40 cursor-pointer transition-all active:scale-95"
            title="Open Interactive Video Workspace for this Batch"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span className="hidden sm:inline">Open Batch Analysis</span>
            <span className="sm:hidden">Analysis</span>
          </button>
        </div>
      </header>

      {/* 2. Executive KPI Summary Ribbon */}
      <section className="bg-[#0f0f14] border-b border-white/[0.08] px-4 sm:px-6 py-2.5 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 shrink-0">
        <div className="bg-[#14141a] border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider block">Matches</span>
            <span className="text-base font-bold font-mono text-white tabular-nums">{batchProjects.length}</span>
          </div>
          <Film className="w-4 h-4 text-[#c6ff1f]/70" />
        </div>

        <div className="bg-[#14141a] border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider block">Total Events</span>
            <span className="text-base font-bold font-mono text-white tabular-nums">{allEvents.length}</span>
          </div>
          <Activity className="w-4 h-4 text-[#c6ff1f]" />
        </div>

        <div className="bg-[#14141a] border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider block">Distinct Tags</span>
            <span className="text-base font-bold font-mono text-white tabular-nums">{tagStats.length}</span>
          </div>
          <Tag className="w-4 h-4 text-blue-400" />
        </div>

        <div className="bg-[#14141a] border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider block">Distinct Labels</span>
            <span className="text-base font-bold font-mono text-white tabular-nums">{labelStats.length}</span>
          </div>
          <SlidersHorizontal className="w-4 h-4 text-purple-400" />
        </div>

        <div className="bg-[#14141a] border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider block">Tagged Duration</span>
            <span className="text-base font-bold font-mono text-white tabular-nums">{formatTime(totalDurationSeconds)}</span>
          </div>
          <Clock className="w-4 h-4 text-amber-400" />
        </div>

        <div className="bg-[#14141a] border border-white/5 rounded-xl px-3 py-2 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-medium text-white/40 uppercase tracking-wider block">Avg / Match</span>
            <span className="text-base font-bold font-mono text-white tabular-nums">{avgEventsPerMatch}</span>
          </div>
          <TrendingUp className="w-4 h-4 text-emerald-400" />
        </div>
      </section>

      {/* 3. Sub-Navigation Tabs */}
      <div className="bg-[#121217] border-b border-white/[0.08] px-4 sm:px-6 flex items-center justify-between gap-4 shrink-0">
        <nav className="flex items-center gap-1 py-1.5 overflow-x-auto custom-scrollbar">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#c6ff1f] text-black shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart2 className="w-3.5 h-3.5" />
            <span>Tag Frequency & Analytics</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'overview' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'
            }`}>
              {tagStats.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('comparison')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'comparison'
                ? 'bg-[#c6ff1f] text-black shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <TableIcon className="w-3.5 h-3.5" />
            <span>Cross-Match Comparison</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'comparison' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'
            }`}>
              {batchProjects.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('matrix')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'matrix'
                ? 'bg-[#c6ff1f] text-black shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Grid className="w-3.5 h-3.5" />
            <span>Tag × Label Matrix</span>
          </button>

          <button
            onClick={() => setActiveTab('explorer')}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'explorer'
                ? 'bg-[#c6ff1f] text-black shadow-sm'
                : 'text-white/60 hover:text-white hover:bg-white/5'
            }`}
          >
            <Film className="w-3.5 h-3.5" />
            <span>Event Explorer & Playlist</span>
            <span className={`text-[10px] font-mono px-1.5 py-0.2 rounded-full font-bold ${
              activeTab === 'explorer' ? 'bg-black/20 text-black' : 'bg-white/10 text-white/60'
            }`}>
              {allEvents.length}
            </span>
          </button>
        </nav>

        {/* Batch Playlist Counter Indicator */}
        {batch.playlists && batch.playlists.length > 0 && (
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-white/50">
            <ListPlus className="w-3.5 h-3.5 text-emerald-400" />
            <span>{batch.playlists.length} batch playlists</span>
          </div>
        )}
      </div>

      {/* 4. Tab Content Area */}
      <div className="flex-1 overflow-hidden relative">
        {/* ======================================================== */}
        {/* TAB 1: TAG FREQUENCY & ANALYTICS OVERVIEW                */}
        {/* ======================================================== */}
        {activeTab === 'overview' && (
          <div className="h-full overflow-y-auto custom-scrollbar p-4 sm:p-6 space-y-6">
            <div className="max-w-7xl mx-auto space-y-6">
              
              {/* Tags Grid with Proportional Distribution */}
              <div className="bg-[#121217] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <BarChart2 className="w-4 h-4 text-[#c6ff1f]" />
                      <span>Cumulative Tag Distribution</span>
                    </h2>
                    <p className="text-xs text-white/40 mt-0.5">
                      Frequency, total playtime, and match presence across all {batchProjects.length} matches.
                    </p>
                  </div>
                  <div className="text-xs font-mono text-white/50">
                    Showing {tagStats.length} active tags
                  </div>
                </div>

                {tagStats.length === 0 ? (
                  <div className="py-12 text-center text-white/40">
                    <Activity className="w-8 h-8 text-white/20 mx-auto mb-2" />
                    <p className="font-semibold text-white/60">No tags recorded in this batch</p>
                    <p className="text-xs">Add games with tagged events to view deep statistics.</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {tagStats.map(stat => (
                      <div
                        key={stat.name}
                        className="bg-[#16161c] border border-white/5 hover:border-white/15 rounded-xl p-3.5 transition-all space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: stat.color }} />
                            <span className="text-xs font-bold text-white truncate">{stat.name}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="text-xs font-bold font-mono text-[#c6ff1f] bg-[#c6ff1f]/10 px-2 py-0.5 rounded-md">
                              {stat.totalCount} {stat.totalCount === 1 ? 'event' : 'events'}
                            </span>
                            <span className="text-[11px] font-mono text-white/40">
                              {stat.percentage.toFixed(1)}%
                            </span>
                          </div>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${Math.max(2, stat.percentage)}%`, backgroundColor: stat.color }}
                          />
                        </div>

                        {/* Metrics & Actions */}
                        <div className="flex items-center justify-between text-[11px] text-white/50 pt-1 border-t border-white/5 flex-wrap gap-2">
                          <div className="flex items-center gap-3">
                            <span title="Total duration of this tag across all games">
                              Duration: <strong className="text-white/80 font-mono">{formatTime(stat.totalDuration)}</strong>
                            </span>
                            <span title="Average event length">
                              Avg: <strong className="text-white/80 font-mono">{stat.avgDuration.toFixed(1)}s</strong>
                            </span>
                            <span title="Number of matches containing this tag">
                              Matches: <strong className="text-white/80 font-mono">{stat.matchesPresentCount}/{batchProjects.length}</strong>
                            </span>
                          </div>

                          <div className="flex items-center gap-2 ml-auto">
                            <button
                              onClick={() => handleDrilldownToExplorer(stat.name)}
                              className="text-[11px] text-[#c6ff1f] hover:underline font-semibold cursor-pointer"
                            >
                              Explore events →
                            </button>
                            <button
                              onClick={() => handleWatchTagClips(stat.name)}
                              className="p-1 rounded bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition-colors cursor-pointer"
                              title={`Watch all ${stat.totalCount} clips of ${stat.name}`}
                            >
                              <Play className="w-3 h-3 fill-current" />
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Top Labels Summary Breakdown */}
              <div className="bg-[#121217] border border-white/[0.08] rounded-2xl p-5 shadow-xl space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="text-sm font-bold text-white flex items-center gap-2">
                      <SlidersHorizontal className="w-4 h-4 text-purple-400" />
                      <span>Tactical Label Frequency</span>
                    </h2>
                    <p className="text-xs text-white/40 mt-0.5">
                      Most frequent attributes and tactical descriptors applied across batch events.
                    </p>
                  </div>
                  <span className="text-xs font-mono text-white/50">
                    {labelStats.length} labels indexed
                  </span>
                </div>

                {labelStats.length === 0 ? (
                  <p className="text-xs text-white/30 italic py-2">No labels assigned to events yet.</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5">
                    {labelStats.slice(0, 24).map(l => (
                      <div
                        key={l.name}
                        onClick={() => handleDrilldownToExplorer(undefined, l.name)}
                        className="bg-[#16161c] hover:bg-white/[0.04] border border-white/5 hover:border-purple-500/30 rounded-xl p-2.5 transition-all cursor-pointer flex items-center justify-between gap-2"
                      >
                        <div className="min-w-0">
                          {l.groupName && (
                            <span className="text-[9px] uppercase tracking-wider text-purple-300/60 font-semibold block truncate">
                              {l.groupName}
                            </span>
                          )}
                          <span className="text-xs font-semibold text-white/90 truncate block">
                            {l.name}
                          </span>
                        </div>
                        <span className="text-xs font-mono font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded shrink-0">
                          {l.totalCount}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 2: CROSS-MATCH COMPARISON TABLE                      */}
        {/* ======================================================== */}
        {activeTab === 'comparison' && (
          <div className="h-full flex flex-col bg-[#0c0c10]">
            {/* Filter toolbar */}
            <div className="p-3 border-b border-white/[0.08] bg-[#121217] flex items-center justify-between gap-3 shrink-0">
              <div className="relative w-72">
                <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={comparisonSearch}
                  onChange={(e) => setComparisonSearch(e.target.value)}
                  placeholder="Filter comparison tags..."
                  className="w-full bg-[#181820] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c6ff1f]/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExportCSV('comparison')}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-[#c6ff1f]" />
                  <span>Export Comparison CSV</span>
                </button>
              </div>
            </div>

            {/* Matrix Comparison Table */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-[#141419] border-b border-white/[0.08] text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-4 sticky left-0 z-20 bg-[#141419] min-w-[180px]">Tag Category</th>
                    {batchProjects.map(proj => (
                      <th key={proj.id} className="py-2.5 px-3 text-center min-w-[140px]" title={proj.name}>
                        <div className="flex items-center justify-center gap-1 truncate">
                          <Film className="w-3 h-3 text-[#c6ff1f] shrink-0" />
                          <span className="truncate">{proj.name}</span>
                        </div>
                      </th>
                    ))}
                    <th className="py-2.5 px-4 text-center font-bold text-white min-w-[100px]">Total Events</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.04]">
                  {filteredComparisonTags.length === 0 ? (
                    <tr>
                      <td colSpan={batchProjects.length + 2} className="py-12 text-center text-white/40">
                        No tags found matching query
                      </td>
                    </tr>
                  ) : (
                    filteredComparisonTags.map(tag => {
                      const counts = batchProjects.map(p => tag.matchCounts[p.id] || 0);
                      const maxCountInRow = Math.max(...counts);

                      return (
                        <tr key={tag.name} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-2 px-4 sticky left-0 bg-[#0c0c10] border-r border-white/5">
                            <div className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                              <span className="font-semibold text-white truncate">{tag.name}</span>
                            </div>
                          </td>

                          {batchProjects.map(p => {
                            const count = tag.matchCounts[p.id] || 0;
                            const isMax = count === maxCountInRow && count > 0;

                            return (
                              <td key={p.id} className="py-2 px-3 text-center">
                                <span className={`font-mono text-xs px-2 py-0.5 rounded ${
                                  isMax 
                                    ? 'bg-[#c6ff1f]/15 text-[#c6ff1f] font-bold border border-[#c6ff1f]/30' 
                                    : count > 0 
                                      ? 'text-white/80' 
                                      : 'text-white/20'
                                }`}>
                                  {count}
                                </span>
                              </td>
                            );
                          })}

                          <td className="py-2 px-4 text-center font-mono font-bold text-white bg-white/[0.01]">
                            {tag.totalCount}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 3: TAG × LABEL CO-OCCURRENCE MATRIX                  */}
        {/* ======================================================== */}
        {activeTab === 'matrix' && (
          <div className="h-full flex flex-col bg-[#0c0c10]">
            <div className="p-3 border-b border-white/[0.08] bg-[#121217] flex items-center justify-between text-xs text-white/60 shrink-0">
              <div className="flex items-center gap-2">
                <Grid className="w-4 h-4 text-purple-400" />
                <span>Cross-Tabulation Matrix: Click any cell to jump to matching events in Event Explorer.</span>
              </div>
            </div>

            <div className="flex-1 overflow-auto custom-scrollbar p-4">
              <div className="inline-block min-w-full align-middle">
                <table className="border-collapse text-xs">
                  <thead>
                    <tr>
                      <th className="p-2 border border-white/10 bg-[#16161c] text-white/50 text-left sticky left-0 z-20">
                        Tag \ Label
                      </th>
                      {matrixData.topLabels.map(l => (
                        <th 
                          key={l.name} 
                          className="p-2 border border-white/10 bg-[#16161c] text-white/70 font-semibold min-w-[80px] text-center"
                          title={l.groupName ? `${l.groupName}: ${l.name}` : l.name}
                        >
                          <div className="truncate max-w-[90px]">{l.name}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>

                  <tbody>
                    {matrixData.topTags.map(tag => (
                      <tr key={tag.name}>
                        <td className="p-2 border border-white/10 bg-[#141419] font-medium text-white sticky left-0 z-10 whitespace-nowrap">
                          <div className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: tag.color }} />
                            <span>{tag.name}</span>
                          </div>
                        </td>

                        {matrixData.topLabels.map(label => {
                          const count = matrixData.matrix[tag.name]?.[label.name] || 0;
                          return (
                            <td
                              key={label.name}
                              onClick={() => {
                                if (count > 0) {
                                  handleDrilldownToExplorer(tag.name, label.name);
                                }
                              }}
                              className={`p-2 border border-white/10 text-center font-mono transition-colors ${
                                count > 0 
                                  ? 'bg-purple-500/10 hover:bg-purple-500/30 text-purple-200 cursor-pointer font-bold' 
                                  : 'text-white/10'
                              }`}
                              title={count > 0 ? `${count} events with ${tag.name} + ${label.name}` : undefined}
                            >
                              {count > 0 ? count : '·'}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ======================================================== */}
        {/* TAB 4: HIGH-VOLUME EVENT EXPLORER & PLAYLIST STUDIO      */}
        {/* ======================================================== */}
        {activeTab === 'explorer' && (
          <div className="h-full flex flex-col bg-[#0c0c10] overflow-hidden">
            {/* Filter Controls Bar */}
            <div className="p-3 border-b border-white/[0.08] bg-[#121217] flex items-center justify-between gap-3 flex-wrap shrink-0">
              <div className="flex items-center gap-2 flex-1 min-w-[200px] max-w-xl">
                {/* Search Input */}
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-white/40 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search notes, tags, matches, or labels..."
                    className="w-full bg-[#181820] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-white/30 focus:outline-none focus:border-[#c6ff1f]/50"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Match Filter Dropdown */}
                <select
                  value={selectedMatchFilter}
                  onChange={(e) => setSelectedMatchFilter(e.target.value)}
                  className="bg-[#181820] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/90 focus:outline-none focus:border-[#c6ff1f]/50 cursor-pointer max-w-[150px]"
                >
                  <option value="all">All Matches ({batchProjects.length})</option>
                  {batchProjects.map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>

                {/* Tag Filter Dropdown */}
                <select
                  value={selectedTagFilter}
                  onChange={(e) => setSelectedTagFilter(e.target.value)}
                  className="bg-[#181820] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/90 focus:outline-none focus:border-[#c6ff1f]/50 cursor-pointer max-w-[150px]"
                >
                  <option value="all">All Tags ({uniqueTagNames.length})</option>
                  {uniqueTagNames.map(tagName => (
                    <option key={tagName} value={tagName}>{tagName}</option>
                  ))}
                </select>

                {/* Label Filter Dropdown */}
                <select
                  value={selectedLabelFilter}
                  onChange={(e) => setSelectedLabelFilter(e.target.value)}
                  className="bg-[#181820] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white/90 focus:outline-none focus:border-[#c6ff1f]/50 cursor-pointer max-w-[130px]"
                >
                  <option value="all">All Labels</option>
                  {uniqueLabelNames.map(labelName => (
                    <option key={labelName} value={labelName}>{labelName}</option>
                  ))}
                </select>
              </div>

              {/* Page Size & Reset Filter */}
              <div className="flex items-center gap-3 text-xs text-white/60">
                {(searchTerm || selectedMatchFilter !== 'all' || selectedTagFilter !== 'all' || selectedLabelFilter !== 'all') && (
                  <button
                    onClick={() => {
                      setSearchTerm('');
                      setSelectedMatchFilter('all');
                      setSelectedTagFilter('all');
                      setSelectedLabelFilter('all');
                    }}
                    className="text-[#c6ff1f] hover:underline font-semibold cursor-pointer"
                  >
                    Reset Filters
                  </button>
                )}

                <div className="flex items-center gap-1.5">
                  <span className="text-[11px] text-white/40">Rows:</span>
                  <select
                    value={pageSize}
                    onChange={(e) => setPageSize(Number(e.target.value))}
                    className="bg-[#181820] border border-white/10 rounded px-2 py-1 text-xs text-white/90 focus:outline-none cursor-pointer"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={250}>250</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Contextual Multi-Selection Sticky Bar */}
            {selectedEventIds.size > 0 && (
              <div className="px-4 py-2 bg-[#181824] border-b border-[#c6ff1f]/30 flex items-center justify-between gap-3 shrink-0 animate-in fade-in duration-150 flex-wrap">
                <div className="flex items-center gap-3 text-xs">
                  <span className="font-bold text-[#c6ff1f] font-mono">
                    {selectedEventIds.size} event{selectedEventIds.size === 1 ? '' : 's'} selected
                  </span>
                  <button
                    onClick={handleSelectAllFiltered}
                    className="text-white/60 hover:text-white underline text-[11px] cursor-pointer"
                  >
                    {selectedEventIds.size === filteredEvents.length ? 'Deselect all' : `Select all ${filteredEvents.length} filtered`}
                  </button>
                  <button
                    onClick={() => setSelectedEventIds(new Set())}
                    className="text-white/40 hover:text-white text-[11px] cursor-pointer"
                  >
                    Clear
                  </button>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleWatchSelectedDirectly}
                    className="btn-glow flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold bg-[#c6ff1f] hover:bg-[#d4ff4d] text-[#0a0a0c] shadow-sm shadow-[#c6ff1f]/20 cursor-pointer transition-all active:scale-95"
                    title="Play selected events sequentially in Batch Workspace"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch Selected</span>
                  </button>

                  <button
                    onClick={handleOpenPlaylistModal}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/15 text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                    title="Save selection as a named playlist on this batch"
                  >
                    <ListPlus className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Save to Playlist...</span>
                  </button>

                  <button
                    onClick={() => handleExportCSV('selected')}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 hover:text-white text-xs font-semibold border border-white/10 transition-colors cursor-pointer"
                    title="Export only selected rows as CSV"
                  >
                    <Download className="w-3 h-3 text-[#c6ff1f]" />
                    <span>CSV</span>
                  </button>
                </div>
              </div>
            )}

            {/* Paginated Data Grid */}
            <div className="flex-1 overflow-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-[#141419] border-b border-white/[0.08] text-[11px] font-semibold text-white/50 uppercase tracking-wider">
                  <tr>
                    <th className="py-2.5 px-3 w-10 text-center">
                      <button
                        onClick={handleToggleSelectAllPage}
                        className="text-white/40 hover:text-white cursor-pointer"
                        title={isAllPageSelected ? 'Deselect page' : 'Select page'}
                      >
                        {isAllPageSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#c6ff1f]" />
                        ) : (
                          <Square className="w-4 h-4" />
                        )}
                      </button>
                    </th>
                    <th 
                      className="py-2.5 px-3 cursor-pointer hover:text-white"
                      onClick={() => { setSortBy('match'); setSortOrder(p => p === 'asc' ? 'desc' : 'asc'); }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Match</span>
                        <ArrowUpDown className="w-3 h-3 text-white/30" />
                      </div>
                    </th>
                    <th 
                      className="py-2.5 px-3 cursor-pointer hover:text-white"
                      onClick={() => { setSortBy('tag'); setSortOrder(p => p === 'asc' ? 'desc' : 'asc'); }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Tag</span>
                        <ArrowUpDown className="w-3 h-3 text-white/30" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3">Labels</th>
                    <th 
                      className="py-2.5 px-3 cursor-pointer hover:text-white"
                      onClick={() => { setSortBy('time'); setSortOrder(p => p === 'asc' ? 'desc' : 'asc'); }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Timecode</span>
                        <ArrowUpDown className="w-3 h-3 text-white/30" />
                      </div>
                    </th>
                    <th 
                      className="py-2.5 px-3 cursor-pointer hover:text-white"
                      onClick={() => { setSortBy('duration'); setSortOrder(p => p === 'asc' ? 'desc' : 'asc'); }}
                    >
                      <div className="flex items-center gap-1">
                        <span>Duration</span>
                        <ArrowUpDown className="w-3 h-3 text-white/30" />
                      </div>
                    </th>
                    <th className="py-2.5 px-3">Notes</th>
                    <th className="py-2.5 px-3 text-right">Watch</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-white/[0.04]">
                  {paginatedEvents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-16 text-center text-white/40">
                        <div className="flex flex-col items-center justify-center gap-2">
                          <Activity className="w-8 h-8 text-white/20" />
                          <p className="font-semibold text-white/70 text-sm">No events match the current criteria</p>
                          <p className="text-xs text-white/40">Try loosening search terms or clearing tag filters.</p>
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginatedEvents.map(evt => {
                      const isSelected = selectedEventIds.has(evt.id);

                      return (
                        <tr
                          key={`${evt.projectId}-${evt.id}`}
                          onClick={() => handleToggleEventSelect(evt.id)}
                          className={`group transition-colors cursor-pointer ${
                            isSelected ? 'bg-[#c6ff1f]/[0.08] hover:bg-[#c6ff1f]/[0.12]' : 'hover:bg-white/[0.02]'
                          }`}
                        >
                          <td className="py-2 px-3 text-center" onClick={(e) => handleToggleEventSelect(evt.id, e)}>
                            <button className="text-white/40 hover:text-white">
                              {isSelected ? (
                                <CheckSquare className="w-4 h-4 text-[#c6ff1f]" />
                              ) : (
                                <Square className="w-4 h-4 text-white/30 group-hover:text-white/60" />
                              )}
                            </button>
                          </td>

                          <td className="py-2 px-3 max-w-[160px]">
                            <div className="flex items-center gap-1.5 truncate" title={evt.projectName}>
                              <Film className="w-3 h-3 text-[#c6ff1f] shrink-0" />
                              <span className="font-medium text-white/90 truncate">{evt.projectName}</span>
                            </div>
                          </td>

                          <td className="py-2 px-3">
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-semibold text-white shrink-0"
                              style={{
                                backgroundColor: `${evt.tagColor}25`,
                                border: `1px solid ${evt.tagColor}50`
                              }}
                            >
                              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: evt.tagColor }} />
                              <span>{evt.tagName}</span>
                            </span>
                          </td>

                          <td className="py-2 px-3 max-w-[200px]">
                            {evt.labels.length > 0 ? (
                              <div className="flex items-center gap-1 flex-wrap">
                                {evt.labels.slice(0, 3).map(l => (
                                  <span
                                    key={l.id}
                                    className="text-[10px] px-1.5 py-0.2 rounded bg-white/5 border border-white/10 text-white/80 truncate max-w-[90px]"
                                    title={l.groupName ? `${l.groupName}: ${l.name}` : l.name}
                                  >
                                    {l.name}
                                  </span>
                                ))}
                                {evt.labels.length > 3 && (
                                  <span className="text-[10px] text-white/40 font-mono">
                                    +{evt.labels.length - 3}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span className="text-white/20 text-[10px]">—</span>
                            )}
                          </td>

                          <td className="py-2 px-3 font-mono text-white/70 whitespace-nowrap text-[11px]">
                            {formatTime(evt.startTime)} - {formatTime(evt.endTime)}
                          </td>

                          <td className="py-2 px-3 font-mono text-white/50 whitespace-nowrap text-[11px]">
                            {evt.duration.toFixed(1)}s
                          </td>

                          <td className="py-2 px-3 max-w-[180px] truncate text-white/60 text-[11px]" title={evt.notes}>
                            {evt.notes || <span className="text-white/20 italic">No notes</span>}
                          </td>

                          <td className="py-2 px-3 text-right">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleWatchSingleEvent(evt);
                              }}
                              className="inline-flex items-center gap-1 px-2 py-1 rounded bg-[#c6ff1f]/10 hover:bg-[#c6ff1f]/25 border border-[#c6ff1f]/30 text-[#c6ff1f] text-[10px] font-bold transition-all cursor-pointer"
                              title={`Watch this clip in ${evt.projectName}`}
                            >
                              <Play className="w-2.5 h-2.5 fill-current" />
                              <span>Play</span>
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls Footer */}
            <footer className="h-12 bg-[#121217] border-t border-white/[0.08] px-4 flex items-center justify-between text-xs text-white/60 shrink-0">
              <div>
                Showing <strong className="text-white font-mono">{filteredEvents.length > 0 ? (currentPage - 1) * pageSize + 1 : 0}</strong> -{' '}
                <strong className="text-white font-mono">{Math.min(filteredEvents.length, currentPage * pageSize)}</strong> of{' '}
                <strong className="text-white font-mono">{filteredEvents.length}</strong> events
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(1)}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
                >
                  First
                </button>
                <button
                  disabled={currentPage <= 1}
                  onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
                >
                  Prev
                </button>
                <span className="px-2 text-white/40 font-mono">
                  {currentPage} / {totalPages}
                </span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                  className="px-2.5 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
                >
                  Next
                </button>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => setCurrentPage(totalPages)}
                  className="px-2 py-1 rounded bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed text-xs font-semibold cursor-pointer"
                >
                  Last
                </button>
              </div>
            </footer>
          </div>
        )}
      </div>

      {/* 5. Save to Playlist Modal */}
      {isPlaylistModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#141419] border border-white/15 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ListPlus className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">Save Batch Playlist</h3>
              </div>
              <button
                onClick={() => setIsPlaylistModalOpen(false)}
                className="text-white/40 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs text-white/60">
              Save <span className="text-[#c6ff1f] font-mono font-bold">{selectedEventIds.size} selected events</span> across matches into a playlist for video analysis.
            </p>

            <div className="space-y-3">
              <div className="flex items-center gap-2 p-1 bg-white/5 rounded-lg border border-white/5">
                <button
                  type="button"
                  onClick={() => setPlaylistModalMode('new')}
                  className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                    playlistModalMode === 'new' ? 'bg-[#c6ff1f] text-black shadow-sm' : 'text-white/60 hover:text-white'
                  }`}
                >
                  New Playlist
                </button>
                {batch.playlists && batch.playlists.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPlaylistModalMode('existing')}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded transition-colors ${
                      playlistModalMode === 'existing' ? 'bg-[#c6ff1f] text-black shadow-sm' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Add to Existing
                  </button>
                )}
              </div>

              {playlistModalMode === 'new' ? (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/60">Playlist Name</label>
                  <input
                    type="text"
                    value={newPlaylistName}
                    onChange={(e) => setNewPlaylistName(e.target.value)}
                    placeholder="e.g., Set Pieces, Transitions Review"
                    className="w-full bg-[#1b1b22] border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c6ff1f]"
                    autoFocus
                  />
                </div>
              ) : (
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-white/60">Select Existing Playlist</label>
                  <select
                    value={selectedExistingPlaylistId}
                    onChange={(e) => setSelectedExistingPlaylistId(e.target.value)}
                    className="w-full bg-[#1b1b22] border border-white/15 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-[#c6ff1f]"
                  >
                    {batch.playlists?.map(pl => (
                      <option key={pl.id} value={pl.id}>
                        {pl.name} ({pl.events?.length || 0} clips)
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-white/10">
              <button
                type="button"
                onClick={() => setIsPlaylistModalOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-white/70 text-xs font-semibold"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={() => handleConfirmPlaylist(false)}
                className="px-3.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white text-xs font-semibold border border-white/10 transition-colors"
              >
                Save
              </button>

              <button
                type="button"
                onClick={() => handleConfirmPlaylist(true)}
                className="btn-glow flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold bg-[#c6ff1f] hover:bg-[#d4ff4d] text-[#0a0a0c] shadow-md shadow-[#c6ff1f]/20 cursor-pointer transition-all active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Save & Watch Now</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
          <div className="bg-[#16161c] text-white px-4 py-2.5 rounded-xl border border-[#c6ff1f]/40 shadow-2xl flex items-center gap-2.5 text-xs font-medium">
            <div className="w-2 h-2 rounded-full bg-[#c6ff1f] animate-pulse" />
            <span>{toastMessage}</span>
          </div>
        </div>
      )}
    </div>
  );
};
