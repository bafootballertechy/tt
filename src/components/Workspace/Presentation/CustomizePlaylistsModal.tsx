import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Check, GripVertical, ChevronUp, ChevronDown, 
  Play, RotateCcw, ListFilter, SlidersHorizontal, Plus, 
  Film, Sparkles, CheckSquare, Square, Layers, Clock
} from 'lucide-react';
import { Playlist, TagEvent, Tag as TagData, Project } from '../../../types';
import { formatTime } from '../../../utils/math';
import { getClipEventId, resolveClipTiming } from '../../../utils/playlistUtils';
import { PresentationConfig } from './types';

interface CustomizePlaylistsModalProps {
  playlists: Playlist[];
  config: PresentationConfig;
  onSaveConfig: (newConfig: PresentationConfig, startImmediately?: boolean) => void;
  onClose: () => void;
  tagEvents: TagEvent[];
  tags: TagData[];
  allBatchProjects?: Project[];
  onCreateDefaultPlaylist?: () => void;
}

export const CustomizePlaylistsModal: React.FC<CustomizePlaylistsModalProps> = ({
  playlists,
  config,
  onSaveConfig,
  onClose,
  tagEvents,
  tags,
  allBatchProjects,
  onCreateDefaultPlaylist
}) => {
  // Ordered playlist IDs initialized from config or fallback to playlists order
  const [orderedIds, setOrderedIds] = useState<string[]>(() => {
    const existingIds = new Set(playlists.map(p => p.id));
    const validConfigIds = config.orderedPlaylistIds.filter(id => existingIds.has(id));
    // Append any playlists that were not in config
    playlists.forEach(p => {
      if (!validConfigIds.includes(p.id)) {
        validConfigIds.push(p.id);
      }
    });
    return validConfigIds;
  });

  // Selected playlist IDs
  const [selectedIds, setSelectedIds] = useState<Set<string>>(() => {
    const existingIds = new Set(playlists.map(p => p.id));
    const initialSelected = config.selectedPlaylistIds.filter(id => existingIds.has(id));
    // If none were selected, default to all non-empty playlists, or all playlists
    if (initialSelected.length === 0) {
      const nonEmpty = playlists.filter(p => p.events.length > 0).map(p => p.id);
      return new Set(nonEmpty.length > 0 ? nonEmpty : playlists.map(p => p.id));
    }
    return new Set(initialSelected);
  });

  const [loop, setLoop] = useState<boolean>(config.loop ?? false);
  const [pauseBetween, setPauseBetween] = useState<boolean>(config.pauseBetweenPlaylists ?? false);
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null);

  // Compute stats for each playlist
  const playlistStats = useMemo(() => {
    const statsMap = new Map<string, { duration: number; clipCount: number; tagNames: string[] }>();
    
    // Tag map for names
    const tagMap = new Map<string, TagData>();
    tags.forEach(t => tagMap.set(t.id, t));

    // Event map
    const eventMap = new Map<string, TagEvent>();
    tagEvents.forEach(e => eventMap.set(e.id, e));
    if (allBatchProjects) {
      allBatchProjects.forEach(bp => {
        bp.data?.tagEvents?.forEach(e => {
          if (!eventMap.has(e.id)) eventMap.set(e.id, e);
        });
        bp.data?.tags?.forEach(t => {
          if (!tagMap.has(t.id)) tagMap.set(t.id, t);
        });
      });
    }

    playlists.forEach(pl => {
      let totalDur = 0;
      const uniqueTags = new Set<string>();

      pl.events.forEach(item => {
        const evId = getClipEventId(item);
        const ev = eventMap.get(evId);
        const timing = resolveClipTiming(item, ev);
        totalDur += timing.duration;

        if (ev) {
          const t = tagMap.get(ev.tagId);
          if (t) uniqueTags.add(t.name);
        }
      });

      statsMap.set(pl.id, {
        duration: totalDur,
        clipCount: pl.events.length,
        tagNames: Array.from(uniqueTags).slice(0, 3)
      });
    });

    return statsMap;
  }, [playlists, tagEvents, tags, allBatchProjects]);

  // Overall selection totals
  const totals = useMemo(() => {
    let totalClips = 0;
    let totalDuration = 0;
    selectedIds.forEach(id => {
      const stat = playlistStats.get(id);
      if (stat) {
        totalClips += stat.clipCount;
        totalDuration += stat.duration;
      }
    });
    return {
      selectedCount: selectedIds.size,
      totalClips,
      totalDuration
    };
  }, [selectedIds, playlistStats]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIds(new Set(playlists.map(p => p.id)));
  };

  const handleDeselectAll = () => {
    setSelectedIds(new Set());
  };

  const handleResetOrder = () => {
    setOrderedIds(playlists.map(p => p.id));
  };

  const moveUp = (index: number) => {
    if (index <= 0) return;
    setOrderedIds(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index - 1];
      next[index - 1] = temp;
      return next;
    });
  };

  const moveDown = (index: number) => {
    if (index >= orderedIds.length - 1) return;
    setOrderedIds(prev => {
      const next = [...prev];
      const temp = next[index];
      next[index] = next[index + 1];
      next[index + 1] = temp;
      return next;
    });
  };

  // Drag & drop handlers
  const handleDragStart = (index: number) => {
    setDraggingIdx(index);
  };

  const handleDragOver = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggingIdx === null || draggingIdx === targetIndex) return;
    setOrderedIds(prev => {
      const next = [...prev];
      const dragged = next[draggingIdx];
      next.splice(draggingIdx, 1);
      next.splice(targetIndex, 0, dragged);
      return next;
    });
    setDraggingIdx(targetIndex);
  };

  const handleDragEnd = () => {
    setDraggingIdx(null);
  };

  const buildConfig = (): PresentationConfig => {
    return {
      selectedPlaylistIds: Array.from(selectedIds),
      orderedPlaylistIds: orderedIds,
      loop,
      pauseBetweenPlaylists: pauseBetween,
      showDrawings: config.showDrawings ?? true
    };
  };

  const handleApply = (startImmediately: boolean = false) => {
    onSaveConfig(buildConfig(), startImmediately);
  };

  return (
    <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in select-none">
      <div 
        className="bg-[#14151a] border border-[#2b2e38] rounded-2xl w-full max-w-2xl shadow-[0_20px_60px_rgba(0,0,0,0.8)] flex flex-col max-h-[90vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-[#242731] flex items-center justify-between shrink-0 bg-[#161820]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c6ff1f]/10 border border-[#c6ff1f]/20 flex items-center justify-center text-[#c6ff1f]">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-white font-bold text-base leading-tight">Customize Presentation Playlists</h2>
              <p className="text-gray-400 text-xs mt-0.5">Select and reorder playlists to play them in seamless sequence.</p>
            </div>
          </div>
          <button 
            onClick={onClose} 
            className="w-8 h-8 rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Quick Toolbar */}
        <div className="px-6 py-2.5 bg-[#121317] border-b border-[#22242c] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2">
            <button 
              onClick={handleSelectAll} 
              className="text-gray-300 hover:text-white px-2.5 py-1 rounded bg-[#1e2029] hover:bg-[#282a36] border border-white/5 transition-colors font-medium"
            >
              Select All
            </button>
            <button 
              onClick={handleDeselectAll} 
              className="text-gray-400 hover:text-gray-200 px-2.5 py-1 rounded bg-[#1e2029] hover:bg-[#282a36] border border-white/5 transition-colors"
            >
              Deselect All
            </button>
            <button 
              onClick={handleResetOrder} 
              className="text-gray-400 hover:text-gray-200 px-2.5 py-1 rounded hover:bg-white/5 transition-colors flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Order</span>
            </button>
          </div>

          <div className="text-gray-400 font-mono text-[11px]">
            <span className="text-[#c6ff1f] font-bold">{totals.selectedCount}</span> of {playlists.length} playlists selected
          </div>
        </div>

        {/* Playlists List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5 custom-scrollbar min-h-[220px]">
          {playlists.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400">
              <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-gray-400 mb-3">
                <Film className="w-7 h-7" />
              </div>
              <h3 className="text-white font-semibold text-sm mb-1">No Playlists Found</h3>
              <p className="text-xs text-gray-400 max-w-sm mb-4">
                You can create playlists from tagged events in the sidebar playlist tab or auto-generate one right now.
              </p>
              {onCreateDefaultPlaylist && (
                <button
                  onClick={() => {
                    onCreateDefaultPlaylist();
                  }}
                  className="px-4 py-2 bg-[#c6ff1f] hover:bg-[#b0e817] text-black font-bold text-xs rounded-xl flex items-center gap-2 shadow-lg transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create Highlight Playlist</span>
                </button>
              )}
            </div>
          ) : (
            orderedIds.map((plId, idx) => {
              const playlist = playlists.find(p => p.id === plId);
              if (!playlist) return null;

              const isSelected = selectedIds.has(plId);
              const stats = playlistStats.get(plId) || { duration: 0, clipCount: 0, tagNames: [] };
              
              // Calculate index in presentation sequence among selected items
              const selectedIndex = isSelected 
                ? orderedIds.filter(id => selectedIds.has(id)).indexOf(plId) + 1 
                : null;

              return (
                <div
                  key={plId}
                  draggable
                  onDragStart={() => handleDragStart(idx)}
                  onDragOver={(e) => handleDragOver(e, idx)}
                  onDragEnd={handleDragEnd}
                  className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    isSelected
                      ? 'bg-[#1a1c24] border-[#383d4d] text-white shadow-sm'
                      : 'bg-[#121317]/80 border-[#22242c] text-gray-400 opacity-60 hover:opacity-90'
                  } ${draggingIdx === idx ? 'opacity-30 border-dashed border-[#c6ff1f]' : ''}`}
                >
                  {/* Drag Handle */}
                  <div 
                    className="cursor-grab active:cursor-grabbing text-gray-500 hover:text-gray-300 p-1 -ml-1 touch-none"
                    title="Drag to reorder"
                  >
                    <GripVertical className="w-4 h-4" />
                  </div>

                  {/* Checkbox */}
                  <button
                    type="button"
                    onClick={() => toggleSelect(plId)}
                    className="shrink-0 transition-transform active:scale-90"
                    title={isSelected ? "Exclude from presentation" : "Include in presentation"}
                  >
                    {isSelected ? (
                      <div className="w-5 h-5 rounded-md bg-[#c6ff1f] text-black flex items-center justify-center font-bold">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    ) : (
                      <div className="w-5 h-5 rounded-md border border-gray-600 bg-black/40 hover:border-gray-400" />
                    )}
                  </button>

                  {/* Sequence Position Number */}
                  <div className="w-7 text-center shrink-0">
                    {selectedIndex ? (
                      <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-[#c6ff1f]/15 text-[#c6ff1f] border border-[#c6ff1f]/30">
                        #{selectedIndex}
                      </span>
                    ) : (
                      <span className="text-[11px] font-mono text-gray-600">-</span>
                    )}
                  </div>

                  {/* Playlist Details */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm truncate text-white">
                        {playlist.name}
                      </span>
                      {stats.clipCount === 0 && (
                        <span className="text-[10px] text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded font-medium">
                          Empty
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span>{stats.clipCount} {stats.clipCount === 1 ? 'clip' : 'clips'}</span>
                      <span>·</span>
                      <span className="font-mono">{formatTime(stats.duration)}</span>
                      {stats.tagNames.length > 0 && (
                        <>
                          <span>·</span>
                          <span className="text-gray-500 truncate max-w-[220px]">
                            {stats.tagNames.join(', ')}
                          </span>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Up / Down Controls */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={() => moveUp(idx)}
                      className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                      title="Move Up"
                    >
                      <ChevronUp className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      disabled={idx === orderedIds.length - 1}
                      onClick={() => moveDown(idx)}
                      className="p-1 rounded hover:bg-white/10 text-gray-400 hover:text-white disabled:opacity-20 disabled:hover:bg-transparent transition-colors"
                      title="Move Down"
                    >
                      <ChevronDown className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Playback Settings Options */}
        <div className="px-6 py-3.5 bg-[#121317] border-t border-[#22242c] space-y-2.5">
          <div className="text-[10px] uppercase font-bold tracking-wider text-gray-400">
            Playback Preferences
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#181a22] border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
              <input
                type="checkbox"
                checked={loop}
                onChange={(e) => setLoop(e.target.checked)}
                className="w-4 h-4 rounded text-[#c6ff1f] focus:ring-0 bg-[#222] border-gray-600 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-200">Loop Presentation</span>
                <span className="text-[10px] text-gray-400">Restart from Playlist #1 when finished</span>
              </div>
            </label>

            <label className="flex items-center gap-2.5 p-2 rounded-lg bg-[#181a22] border border-white/5 cursor-pointer hover:border-white/10 transition-colors">
              <input
                type="checkbox"
                checked={pauseBetween}
                onChange={(e) => setPauseBetween(e.target.checked)}
                className="w-4 h-4 rounded text-[#c6ff1f] focus:ring-0 bg-[#222] border-gray-600 cursor-pointer"
              />
              <div className="flex flex-col">
                <span className="text-xs font-semibold text-gray-200">Pause Between Playlists</span>
                <span className="text-[10px] text-gray-400">Wait for click before starting next playlist</span>
              </div>
            </label>
          </div>
        </div>

        {/* Footer Summary & CTAs */}
        <div className="px-6 py-4 bg-[#161820] border-t border-[#242731] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="w-4 h-4 text-gray-500" />
            <span>Total Presentation:</span>
            <span className="text-white font-mono font-bold">
              {formatTime(totals.totalDuration)}
            </span>
            <span className="text-gray-500">({totals.totalClips} clips)</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => handleApply(false)}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-gray-200 bg-[#222530] hover:bg-[#2b2f3d] border border-white/10 transition-colors"
            >
              Save Order
            </button>
            <button
              type="button"
              disabled={totals.selectedCount === 0 || totals.totalClips === 0}
              onClick={() => handleApply(true)}
              className="px-5 py-2 rounded-xl text-xs font-bold text-black bg-[#c6ff1f] hover:bg-[#b0e817] disabled:opacity-40 disabled:hover:bg-[#c6ff1f] shadow-lg shadow-[#c6ff1f]/20 flex items-center gap-1.5 transition-all"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Start Presentation</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
