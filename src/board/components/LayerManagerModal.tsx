import React, { useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { X, Eye, EyeOff, GripVertical } from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Project, Slide, LayerType, PitchTemplate } from '../types';
import { drawBoardToCanvas } from '../canvasRenderer';
import { PITCH_WIDTH, PITCH_HEIGHT } from '../constants';

import { ToolType, Drawing } from '../types';
interface SortableLayerItemProps {
  id: string;
  label: string;
  visible: boolean;
  onToggle: (id: string) => void;
  isSelected: boolean;
  onClick: () => void;
}

const SortableLayerItem: React.FC<SortableLayerItemProps> = ({ id, label, visible, onToggle, isSelected, onClick }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
  } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={onClick}
      className={`flex items-center gap-2 p-1.5 px-2 text-xs rounded-lg border transition-colors cursor-pointer ${isSelected ? 'bg-blue-500/20 border-blue-500/50' : 'bg-slate-800 border-slate-700/50 hover:border-slate-600'} group`}>
      <div 
        {...attributes} 
        {...listeners}
        className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-1 rounded transition-colors"
      >
        <GripVertical size={14} />
      </div>
      <span className="flex-1 font-medium text-slate-200">{label}</span>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onToggle(id); }}
        className={`p-1.5 rounded transition-colors ${visible ? 'text-blue-400 hover:bg-blue-400/10' : 'text-slate-500 hover:bg-slate-700'}`}
      >
        {visible ? <Eye size={14} /> : <EyeOff size={14} />}
      </button>
    </div>
  );
};

interface LayerManagerModalProps {
  project: Project;
  slideId: string;
  onClose: () => void;
  onUpdateSlide: (slideId: string, updates: Partial<Slide>) => void;
}

const LAYER_LABELS: Record<string, string> = {
  HOME: 'Team A (Home)',
  AWAY: 'Team B (Away)',
  EQUIPMENT: 'Equipment',
  DRAWINGS: 'Tools Applied'
};

const LayerManagerModal: React.FC<LayerManagerModalProps> = ({
  project,
  slideId,
  onClose,
  onUpdateSlide
}) => {
  const slide = project.slides.find(s => s.id === slideId);
  if (!slide) return null;

  
  const isEq = (type: ToolType) => [ToolType.BALL, ToolType.CONE, ToolType.DISC, ToolType.GOAL, ToolType.GOAL_MINI, ToolType.GOAL_SIDE, ToolType.MANNEQUIN, ToolType.LADDER, ToolType.HURDLE, ToolType.POLE].includes(type);
  const [selectedLayer, setSelectedLayer] = React.useState<string | null>(null);
  const [activeTab, setActiveTab] = React.useState<'layers' | 'animation'>('layers');
  const [stableOrderIds, setStableOrderIds] = React.useState<string[] | null>(null);
  const [editedAnimIds, setEditedAnimIds] = React.useState<Set<string>>(new Set());
  const [multiSelectMode, setMultiSelectMode] = React.useState(false);
  const [selectedAnimIds, setSelectedAnimIds] = React.useState<Set<string>>(new Set());


  const rawLayerOrder = slide.layerOrder || [];
  const layerVis = slide.layerVisibility || { HOME: true, AWAY: true, EQUIPMENT: true, DRAWINGS: true };
  
  const layerOrder: string[] = [];
  const existingDrawingIds = new Set(slide.drawings.filter(d => !isEq(d.type)).map(d => `d_${d.id}`));
  
  rawLayerOrder.forEach(layer => {
      if (['HOME', 'AWAY', 'NEUTRAL', 'EQUIPMENT'].includes(layer)) {
          layerOrder.push(layer);
      } else if (layer === 'DRAWINGS') {
          slide.drawings.forEach(d => {
              if (!isEq(d.type)) {
                  layerOrder.push(`d_${d.id}`);
                  existingDrawingIds.delete(`d_${d.id}`);
              }
          });
      } else if (layer.startsWith('d_') && existingDrawingIds.has(layer)) {
          layerOrder.push(layer);
          existingDrawingIds.delete(layer);
      }
  });

  if (!layerOrder.includes('EQUIPMENT')) layerOrder.push('EQUIPMENT');
  if (!layerOrder.includes('HOME')) layerOrder.push('HOME');
  if (!layerOrder.includes('AWAY')) layerOrder.push('AWAY');

  const missingDrawings = Array.from(existingDrawingIds) as string[];
  const finalLayerOrder: string[] = [...missingDrawings, ...layerOrder];

  
  const drawingCounts: Record<string, number> = {};
  const drawingLabels: Record<string, string> = {};
  slide.drawings.forEach(d => {
      const typeName = d.type.charAt(0).toUpperCase() + d.type.slice(1).toLowerCase().replace('_', ' ');
      drawingCounts[d.type] = (drawingCounts[d.type] || 0) + 1;
      drawingLabels[`d_${d.id}`] = `${typeName} ${drawingCounts[d.type]}`;
  });

  
const getLayerLabel = (id: string) => {
     if (LAYER_LABELS[id]) return LAYER_LABELS[id];
     if (drawingLabels[id]) return drawingLabels[id];
     return id;
  };

  const animationItems: { id: string, label: string, seq: number, type: 'player' | 'drawing' }[] = [];
  const slideIndex = project.slides.findIndex(s => s.id === slideId);
  const prevSlide = slideIndex > 0 ? project.slides[slideIndex - 1] : null;

  Object.entries(slide.positions).forEach(([pid, posValue]) => {
      const pos: any = posValue;
      const prevPos: any = prevSlide?.positions[pid];
      const hasMoved = prevPos && (prevPos.x !== pos.x || prevPos.y !== pos.y || (pos.motionPath && pos.motionPath.length > 0));
      if (hasMoved) {
          let playerTeam = '';
          let player = project.teams.HOME.players.find(p => p.id === pid);
          if (player) playerTeam = 'Home';
          if (!player) {
              player = project.teams.AWAY.players.find(p => p.id === pid);
              if (player) playerTeam = 'Away';
          }
          if (!player) {
              player = project.teams.NEUTRAL?.players.find(p => p.id === pid);
              if (player) playerTeam = 'Neutral';
          }

          const pIdentifier = player?.number ? player.number : (player?.name || pid);
          animationItems.push({
              id: pid,
              label: `Player ${pIdentifier} ${playerTeam}`.trim(),
              seq: pos.animationOrder || 0,
              type: 'player'
          });
      }
  });

  // Group connectors that form a continuous tactical line
  const connectors = slide.drawings.filter(d => d.type === ToolType.CONNECTOR);
  const connectorGroups: Drawing[][] = [];
  const visitedConnectors = new Set<string>();

  connectors.forEach(c => {
      if (visitedConnectors.has(c.id)) return;
      const group: Drawing[] = [];
      const queue = [c];
      visitedConnectors.add(c.id);

      while (queue.length > 0) {
          const current = queue.shift()!;
          group.push(current);

          const cStart = current.props?.startPlayerId;
          const cEnd = current.props?.endPlayerId;

          connectors.forEach(other => {
              if (!visitedConnectors.has(other.id)) {
                  const oStart = other.props?.startPlayerId;
                  const oEnd = other.props?.endPlayerId;
                  if (
                      (cStart && (cStart === oStart || cStart === oEnd)) ||
                      (cEnd && (cEnd === oStart || cEnd === oEnd))
                  ) {
                      visitedConnectors.add(other.id);
                      queue.push(other);
                  }
              }
          });
      }
      connectorGroups.push(group);
  });

  const groupedDrawingIds = new Set<string>();
  connectorGroups.forEach(group => {
      if (group.length > 1) {
          const ids = group.map(d => d.id).join(',');
          group.forEach(d => groupedDrawingIds.add(d.id));
          
          const adj = new Map<string, string[]>();
          group.forEach(d => {
              const u = d.props?.startPlayerId;
              const v = d.props?.endPlayerId;
              if (u && v) {
                  if (!adj.has(u)) adj.set(u, []);
                  if (!adj.has(v)) adj.set(v, []);
                  adj.get(u)!.push(v);
                  adj.get(v)!.push(u);
              }
          });
          
          let startNode: string | undefined = undefined;
          for (const [node, neighbors] of adj.entries()) {
              if (neighbors.length === 1) {
                  startNode = node;
                  break;
              }
          }
          if (!startNode && adj.size > 0) {
              startNode = adj.keys().next().value;
          }
          
          const orderedPlayers: string[] = [];
          if (startNode) {
              const visited = new Set<string>();
              let current: string | undefined = startNode;
              while (current) {
                  orderedPlayers.push(current);
                  visited.add(current);
                  const next = (adj.get(current) || []).find(n => !visited.has(n));
                  current = next;
              }
              for (const node of adj.keys()) {
                  if (!visited.has(node)) orderedPlayers.push(node);
              }
          }

          const playerLabels = orderedPlayers.map(pid => {
             const player = project.teams.HOME.players.find(p => p.id === pid) || 
                            project.teams.AWAY.players.find(p => p.id === pid) || 
                            project.teams.NEUTRAL?.players.find(p => p.id === pid);
             return player ? (player.number || player.name) : '?';
          });
          
          let label = `Tactical Line`;
          if (playerLabels.length > 0) {
              label = `Connect (${playerLabels.join('-')})`;
              if (label.length > 30) {
                 label = `Connect (${playerLabels.slice(0, 4).join('-')}...)`;
              }
          }

          animationItems.push({
              id: ids,
              label: label,
              seq: group[0].animationOrder || 0,
              type: 'drawing'
          });
      }
  });

  slide.drawings.forEach(d => {
      if (!groupedDrawingIds.has(d.id)) {
          let label = getLayerLabel(`d_${d.id}`);
          
          if (d.type === ToolType.CONNECTOR) {
              const u = d.props?.startPlayerId;
              const v = d.props?.endPlayerId;
              const pIds = [];
              if (u) pIds.push(u);
              if (v) pIds.push(v);
              
              const playerLabels = pIds.map(pid => {
                 const player = project.teams.HOME.players.find(p => p.id === pid) || project.teams.AWAY.players.find(p => p.id === pid) || project.teams.NEUTRAL?.players.find(p => p.id === pid);
                 return player ? (player.number || player.name) : '?';
              });
              
              if (playerLabels.length > 0) {
                  label = `Connect (${playerLabels.join('-')})`;
              }
          }

          animationItems.push({
              id: d.id,
              label: label,
              seq: d.animationOrder || 0,
              type: 'drawing'
          });
      }
  });
  
  const updateAnimationOrder = (id: string, type: 'player' | 'drawing', delta: number) => {
      const idsToProcess = selectedAnimIds.has(id) ? Array.from(selectedAnimIds) : [id];
      
      let nextPositions = { ...slide.positions };
      let nextDrawings = [ ...slide.drawings ];
      
      let positionsChanged = false;
      let drawingsChanged = false;

      idsToProcess.forEach(processId => {
          const item = animationItems.find(a => a.id === processId);
          if (!item) return;

          if (item.type === 'player') {
              const pos = nextPositions[item.id];
              if (pos) {
                  const currentSeq = pos.animationOrder || 0;
                  const newSeq = Math.max(0, currentSeq + delta);
                  nextPositions[item.id] = { ...pos, animationOrder: newSeq };
                  positionsChanged = true;
              }
          } else {
              const drawingIds = item.id.split(',');
              nextDrawings = nextDrawings.map(d => 
                  drawingIds.includes(d.id) ? { ...d, animationOrder: Math.max(0, (d.animationOrder || 0) + delta) } : d
              );
              drawingsChanged = true;
          }
      });
      
      if (stableOrderIds === null) {
          setStableOrderIds([...animationItems].sort((a, b) => a.seq - b.seq).map(i => i.id));
      }
      setEditedAnimIds(prev => {
          const next = new Set(prev);
          idsToProcess.forEach(processId => next.add(processId));
          return next;
      });

      const updates: Partial<Slide> = {};
      if (positionsChanged) updates.positions = nextPositions;
      if (drawingsChanged) updates.drawings = nextDrawings;
      
      if (Object.keys(updates).length > 0) {
          onUpdateSlide(slideId, updates);
      }
  };

  const handleSort = () => {
      setStableOrderIds(null);
      setEditedAnimIds(new Set());
  };


const canvasRef = useRef<HTMLCanvasElement>(null);
  const bgImgElement = useRef<HTMLImageElement | null>(null);

  // Load background image if any
  useEffect(() => {
    // We don't have backgroundImage from project directly, assume it's PitchTemplate based
  }, []);

  // Render preview
  useEffect(() => {
    let animationFrameId: number;
    const render = () => {
      if (!canvasRef.current || !slide) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      
      const PREVIEW_WIDTH = 500;
      const renderScale = PREVIEW_WIDTH / PITCH_WIDTH;
      const PREVIEW_HEIGHT = PITCH_HEIGHT * renderScale;

      canvasRef.current.width = PREVIEW_WIDTH;
      canvasRef.current.height = PREVIEW_HEIGHT;

      ctx.clearRect(0, 0, PREVIEW_WIDTH, PREVIEW_HEIGHT);
      
      // Temporary project object to force layer settings for preview
      const previewProject = { ...project };
      const previewSlide = { ...slide, layerOrder, layerVisibility: layerVis };

      
      drawBoardToCanvas(
        ctx,
        previewProject,
        previewSlide,
        null, // previousSlide
        1, // progress
        slide.coinSettings || { shape: 'circle', globalScale: 1, globalTextScale: 1, showName: true, showNumber: true, showPositionLabel: false, orientation: 'normal', trails: { enabled: false, style: 'solid', color: '#fbbf24', opacity: 0.6 }, motionPaths: { enabled: true, color: '#ef4444' } },
        null, // Background image
        project.pitchTemplate || PitchTemplate.THEME_FRESH,
        PITCH_WIDTH,
        PITCH_HEIGHT,
        renderScale,
        null, // editingTextId
        null, // dropTargetPlayerId
        false, // isEditor
        [], // selectedPlayerIds
        null, // editorPreviousSlide
        selectedLayer // pass selectedLayer for highlighting
      );

      
      animationFrameId = requestAnimationFrame(render);
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [project, slide, layerOrder, layerVis]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id) {
      const visualOrder: string[] = [...finalLayerOrder].reverse();
      const oldIndex = visualOrder.indexOf(active.id as string);
      const newIndex = visualOrder.indexOf(over.id as string);
      
      const newVisualOrder = arrayMove(visualOrder, oldIndex, newIndex);
      onUpdateSlide(slideId, { layerOrder: [...newVisualOrder].reverse() });
    }
  };

  const toggleVisibility = (id: string) => {
    onUpdateSlide(slideId, {
      layerVisibility: {
        ...layerVis,
        [id]: layerVis[id] === false ? true : false
      }
    });
  };

  const visualOrder: string[] = [...finalLayerOrder].reverse();

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#0e1422] border border-slate-700/50 rounded-xl shadow-2xl w-full max-w-6xl h-[85vh] overflow-hidden flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-800">
          <h2 className="text-lg font-semibold text-white">Layer Management</h2>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-1 min-h-[400px]">
          {/* Left Side - Preview */}
          <div className="flex-1 p-6 bg-[#080b12] flex items-center justify-center overflow-hidden">
            <div className="relative shadow-2xl rounded-lg overflow-hidden border border-slate-800">
              <canvas ref={canvasRef} className="block max-w-full h-auto" />
            </div>
          </div>

          {/* Right Side - Layer Controls */}
          <div className="w-96 border-l border-slate-800 p-6 flex flex-col gap-4 bg-[#0e1422] overflow-y-auto">
            <div className="flex bg-[#080b12] p-1 rounded-lg border border-slate-800 mb-2">
              <button 
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${activeTab === 'layers' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                onClick={() => {
                  setStableOrderIds(null);
                  setEditedAnimIds(new Set());
                  setActiveTab('layers');
                }}
              >
                Layers
              </button>
              <button 
                className={`flex-1 py-1.5 px-3 text-xs font-medium rounded-md transition-colors ${activeTab === 'animation' ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-800'}`}
                onClick={() => setActiveTab('animation')}
              >
                Animation Sequence
              </button>
            </div>

            {activeTab === 'layers' && (
              <div>
                <p className="text-xs text-slate-500 mb-4">Drag to reorder layers. Top item is drawn last (appears on top).</p>
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={handleDragEnd}
                >
                  <SortableContext items={visualOrder} strategy={verticalListSortingStrategy}>
                    <div className="flex flex-col gap-2">
                      {visualOrder.map(id => (
                        <SortableLayerItem
                          key={id}
                          id={id}
                          label={getLayerLabel(id)}
                          visible={layerVis[id] !== false && (!id.startsWith('d_') || layerVis['DRAWINGS'] !== false)}
                          onToggle={toggleVisibility}
                          isSelected={selectedLayer === id}
                          onClick={() => setSelectedLayer(id)}
                        />
                      ))}
                    </div>
                  </SortableContext>
                </DndContext>
              </div>
            )}

            {activeTab === 'animation' && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-slate-500">Set the animation step for tools and movements. Items with the same step animate together. Step 0 happens first.</p>
                
                <div className="flex items-center justify-between bg-slate-800/50 p-2 rounded-lg border border-slate-700/50">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer select-none">
                    <input 
                      type="checkbox" 
                      checked={multiSelectMode} 
                      onChange={(e) => {
                          setMultiSelectMode(e.target.checked);
                          if (!e.target.checked) setSelectedAnimIds(new Set());
                      }}
                      className="rounded border-slate-600 bg-slate-700/50 text-[#c0fa4a] focus:ring-[#c0fa4a] focus:ring-offset-slate-900"
                    />
                    Multi-select mode
                  </label>
                  
                  {editedAnimIds.size > 0 && (
                    <button 
                      onClick={handleSort}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs font-medium transition-colors shadow-sm"
                    >
                      Sort
                    </button>
                  )}
                </div>
                
                {multiSelectMode && (
                  <p className="text-[10px] text-blue-400 -mt-1 mb-1">
                    Click items to select them. Changing the step of any selected item will update all of them.
                  </p>
                )}

                <div className="flex flex-col gap-2">
                  {animationItems.length === 0 && (
                    <div className="text-sm text-slate-500 italic p-4 text-center border border-slate-800 rounded-lg">
                      No tools or player movements to animate in this slide.
                    </div>
                  )}
                  {[...animationItems].sort((a,b) => {
                      if (stableOrderIds !== null) {
                          const indexA = stableOrderIds.indexOf(a.id);
                          const indexB = stableOrderIds.indexOf(b.id);
                          if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                          if (indexA !== -1) return -1;
                          if (indexB !== -1) return 1;
                      }
                      return a.seq - b.seq;
                  }).map(item => {
                    const isSelectedLayer = item.type === 'drawing' ? item.id.split(',').some(id => selectedLayer === 'd_' + id) : selectedLayer === item.id;
                    const isMultiSelected = selectedAnimIds.has(item.id);
                    const layerId = item.type === 'drawing' ? 'd_' + item.id.split(',')[0] : item.id;
                    
                    const isEdited = editedAnimIds.has(item.id);
                    
                    const baseClass = isMultiSelected 
                        ? 'bg-[#c0fa4a]/10 border-[#c0fa4a]/50 ring-1 ring-[#c0fa4a]/50' 
                        : (isSelectedLayer ? 'bg-blue-500/20 border-blue-500/50' : 'bg-slate-800 border-slate-700/50 hover:border-slate-600');

                    return (
                    <div 
                      key={item.id + item.type}
                      className={`flex items-center gap-2 p-2 px-3 text-xs rounded-lg border transition-colors cursor-pointer ${baseClass} ${isEdited && !isMultiSelected ? 'border-blue-500/50 shadow-[0_0_8px_rgba(59,130,246,0.3)]' : ''}`}
                      onClick={(e) => {
                          if (multiSelectMode || e.ctrlKey || e.metaKey) {
                              const next = new Set(selectedAnimIds);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              setSelectedAnimIds(next);
                          } else {
                              setSelectedLayer(layerId);
                              setSelectedAnimIds(new Set([item.id]));
                          }
                      }}
                    >
                      <div className="flex-1 flex items-center gap-2 overflow-hidden pr-2">
                        {multiSelectMode && (
                          <div className={`w-4 h-4 rounded-sm border flex items-center justify-center transition-colors ${isMultiSelected ? 'bg-[#c0fa4a] border-[#c0fa4a]' : 'bg-slate-700/50 border-slate-600'}`}>
                            {isMultiSelected && <svg className="w-3 h-3 text-[#080b12]" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                          </div>
                        )}
                        <span className="font-medium text-slate-200 truncate">{item.label}</span>
                      </div>
                      <div className="flex items-center gap-1 bg-[#080b12] rounded border border-slate-700 p-0.5" onClick={e => e.stopPropagation()}>
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateAnimationOrder(item.id, item.type, -1); }}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        >-</button>
                        <span className="w-6 text-center font-mono text-slate-200">{item.seq}</span>
                        <button 
                          onClick={(e) => { e.stopPropagation(); updateAnimationOrder(item.id, item.type, 1); }}
                          className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-white hover:bg-slate-700 rounded transition-colors"
                        >+</button>
                      </div>
                    </div>
                  )})}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
};

export default LayerManagerModal;
