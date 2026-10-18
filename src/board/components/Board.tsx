import { useUIStore } from "../store/uiStore";

import React, { useRef, useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { Project, TeamSide, ToolType, Point, Drawing, CoinSettings, Slide, PitchTemplate, PlayerPosition, PitchView } from '../types';
import { PITCH_WIDTH, PITCH_HEIGHT } from '../constants';
import { generateArrowPath, generatePolygonPath, getRelativePointerPosition, pointToLineSegmentDistance, unmakeP, makeP } from '../utils';
import { drawBoardToCanvas } from '../canvasRenderer';
import { buildTokenOutlinePath } from '../tokenRenderers';
import { getPlayerMotionPath, getBezierPoint } from '../animationController';
import { compileAnimation } from '../utils';

function getConnectorChain(startDrawingId: string, drawings: Drawing[]): string[] {
    const connectors = drawings.filter(d => d.type === ToolType.CONNECTOR && d.props?.startPlayerId && d.props?.endPlayerId);
    const startConnector = connectors.find(d => d.id === startDrawingId);
    if (!startConnector) return [startDrawingId];

    const visited = new Set<string>();
    const stack = [startConnector];
    
    while (stack.length > 0) {
        const curr = stack.pop()!;
        if (visited.has(curr.id)) continue;
        visited.add(curr.id);
        
        const p1 = curr.props?.startPlayerId;
        const p2 = curr.props?.endPlayerId;
        
        for (const conn of connectors) {
            if (visited.has(conn.id)) continue;
            if (conn.props?.startPlayerId === p1 || conn.props?.startPlayerId === p2 ||
                conn.props?.endPlayerId === p1 || conn.props?.endPlayerId === p2) {
                stack.push(conn);
            }
        }
    }
    
    return Array.from(visited);
}

interface BoardProps {
  project: Project;
  activeTool: ToolType;
  drawingColor: string;
  customColors?: string[];
  drawingStrokeWidth?: number;
  drawingStrokeStyle?: 'solid' | 'dashed' | 'dribbling';
  drawingFillStyle?: 'none' | 'solid' | 'stripes';
  drawingFontFamily?: string;
  equipmentScale?: number;
  equipmentAngle?: number;
  coinSettings: CoinSettings;
  backgroundImage: string | null;
  pitchTemplate: PitchTemplate;
  previousSlide: Slide | null;
  boardScale: number;
  onUpdatePositions: (updates: {id: string, pos: Partial<PlayerPosition>}[], isDragging?: boolean) => void;
  onSwapPositions?: (playerAId: string, playerBId: string, originalPosA: Point) => void;
  onAddDrawing: (drawing: Drawing) => void;
  onUpdateDrawing?: (drawingId: string, updater: (d: Drawing) => Drawing, isDragging?: boolean) => void;
  onUpdateDrawings?: (updates: {id: string, updater: (d: Drawing) => Drawing}[], isDragging?: boolean) => void;
  onEditPlayer: (playerIds: string[]) => void;
  onDelete: (id: string, type: 'player' | 'drawing') => void;
  onOpenLayerManager?: () => void;
  isPlaying?: boolean;
}

const Board: React.FC<BoardProps> = ({
  project,
  coinSettings,
  previousSlide,
  boardScale,
  onUpdatePositions,
  onSwapPositions,
  onAddDrawing,
  onUpdateDrawing,
  onUpdateDrawings,
  onEditPlayer,
  onDelete,
  onOpenLayerManager,
  isPlaying
}) => {
  const { activeTool, drawingColor, customColors, drawingStrokeWidth, drawingStrokeStyle, drawingFillStyle, drawingFontFamily, drawingTextSize, equipmentScale, equipmentAngle, backgroundImage, pitchTemplate, attachToPlayer } = useUIStore();
  const boardRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hoverPos, setHoverPos] = useState<Point | null>(null);
  const [currentPoints, setCurrentPoints] = useState<Point[]>([]);
  const [draggingPlayerId, setDraggingPlayerId] = useState<string | null>(null);
  const [dragStartPositions, setDragStartPositions] = useState<{[id: string]: Point}>({});
  const [dragStartPointerPos, setDragStartPointerPos] = useState<Point | null>(null);
  const [selectionBoxStart, setSelectionBoxStart] = useState<Point | null>(null);
  const [selectionBoxEnd, setSelectionBoxEnd] = useState<Point | null>(null);
  const [dragStartDrawingPoints, setDragStartDrawingPoints] = useState<{[id: string]: Point[]}>({});
  const [draggingDrawingId, setDraggingDrawingId] = useState<string | null>(null);
  const [draggingVertexIndex, setDraggingVertexIndex] = useState<number | null>(null);
  const [draggingMotionPath, setDraggingMotionPath] = useState<{ playerId: string, pointIndex: number } | null>(null);
  const [selectedDrawingIds, setSelectedDrawingIds] = useState<string[]>([]);
  const [selectedPlayerIds, setSelectedPlayerIds] = useState<string[]>([]);
  const [editingTextId, setEditingTextId] = useState<string | null>(null);
  const [polyPoints, setPolyPoints] = useState<Point[]>([]);
  const [polyPreviewPos, setPolyPreviewPos] = useState<Point | null>(null);
  const [connectorStartPlayerId, setConnectorStartPlayerId] = useState<string | null>(null);
  const [connectorPreviewPos, setConnectorPreviewPos] = useState<Point | null>(null);
  const [contextMenu, setContextMenu] = useState<{ x: number, y: number, boardPos: Point, playerId?: string, pointIndex?: number, isCurve?: boolean, drawingId?: string } | null>(null);
  const [attachedAnimationId, setAttachedAnimationId] = useState<string | null>(null);

  const dragHistoryPushedRef = useRef(false);

  const prevSlideIdRef = useRef(project.currentSlideId);

  const P_WIDTH = project.pitchWidth || PITCH_WIDTH;
  const P_HEIGHT = project.pitchHeight || PITCH_HEIGHT;

  const getMappedPointerPosition = (e: React.PointerEvent) => {
    const rawPos = getRelativePointerPosition(e, e.currentTarget as HTMLElement);
    const unproj = unmakeP(P_WIDTH, P_HEIGHT, project.pitchView);
    const { u, v } = unproj(rawPos.x, rawPos.y);
    return { x: u * P_WIDTH, y: v * P_HEIGHT };
  };

  useEffect(() => {
    setConnectorStartPlayerId(null);
    setConnectorPreviewPos(null);
  }, [activeTool]);
  
  // Base coin size
  const BASE_COIN_SIZE = 22.4;
  const globalScale = coinSettings.globalScale || 1;

  const currentSlide = project.slides.find(s => s.id === project.currentSlideId);
  if (!currentSlide) return null;

  // Keyboard listeners for Delete
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;

      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedPlayerIds.length > 0) {
          selectedPlayerIds.forEach(id => onDelete(id, 'player'));
          setSelectedPlayerIds([]);
        } else if (selectedDrawingIds.length > 0) {
          selectedDrawingIds.forEach(id => onDelete(id, 'drawing'));
          setSelectedDrawingIds([]);
        }
      } else if (e.key === 'r' || e.key === 'R') {
         if (selectedDrawingIds.length > 0 && onUpdateDrawing) {
             selectedDrawingIds.forEach(id => {
               onUpdateDrawing(id, d => ({
                   ...d,
                   props: { ...d.props, rotation: ((d.props?.rotation || 0) + (e.shiftKey ? -15 : 15)) % 360 }
               }));
             });
         }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedPlayerIds, selectedDrawingIds, onDelete]);


  const [bgImgElement, setBgImgElement] = useState<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const transitionStateRef = useRef({ startTime: 0, duration: 0, isAnimating: false });
  const [prevSlide, setPrevSlide] = useState<Slide | null>(previousSlide);
  
  const isMultiSelected = project.selectedSlideIds && project.selectedSlideIds.length > 1;

  useEffect(() => {
    if (backgroundImage) {
      const img = new Image();
      img.onload = () => setBgImgElement(img);
      img.src = backgroundImage;
    } else {
      setBgImgElement(null);
    }
  }, [backgroundImage]);

  const prevIsPlayingRef = useRef(isPlaying);

  useEffect(() => {
    const isPlayingStarted = isPlaying && !prevIsPlayingRef.current;
    if (project.currentSlideId !== prevSlideIdRef.current || isPlayingStarted) {
      const oldSlide = (isPlayingStarted && project.currentSlideId === project.slides[0]?.id) ? null : (project.slides.find(s => s.id === prevSlideIdRef.current) || null);
      setPrevSlide(oldSlide);
      prevSlideIdRef.current = project.currentSlideId;
      setSelectedPlayerIds([]);
      setSelectedDrawingIds([]);
      setDraggingPlayerId(null);
      setDraggingDrawingId(null);
      setContextMenu(null);
         
      const currentSlideTemp = project.slides.find(s => s.id === project.currentSlideId);
         
      let duration = (currentSlideTemp?.transitionSpeed || 0.5) * 1000;
         
      if (currentSlideTemp) {
          const compiled = compileAnimation(currentSlideTemp);
             
          duration = compiled.durationMs;
      }
         
      if (duration === 0) {
         transitionStateRef.current = { startTime: 0, duration: 0, isAnimating: false };
         setPrevSlide(null);
      } else {
         transitionStateRef.current = {
            startTime: performance.now(),
            duration,
            isAnimating: true
         };
      }
    }
    prevIsPlayingRef.current = isPlaying;
  }, [project.currentSlideId, project.transitionSpeed, project.slides, isPlaying]);

  useEffect(() => {
    let animationFrameId: number;

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      if (!canvasRef.current || !currentSlide) return;
      const ctx = canvasRef.current.getContext('2d');
      if (!ctx) return;
      
      const renderScale = (window.devicePixelRatio || 1) * boardScale * (currentSlide.camera?.zoom || 1);
      const P_WIDTH = project.pitchWidth || PITCH_WIDTH;
      const P_HEIGHT = project.pitchHeight || PITCH_HEIGHT;
      
      if (canvasRef.current.width !== P_WIDTH * renderScale || canvasRef.current.height !== P_HEIGHT * renderScale) {
          canvasRef.current.width = P_WIDTH * renderScale;
          canvasRef.current.height = P_HEIGHT * renderScale;
      }

      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      
      // Create a temporary clone of the current slide to add preview drawings and highlights
      const slideToRender = { ...currentSlide, drawings: [...currentSlide.drawings], positions: { ...currentSlide.positions } };

      selectedPlayerIds.forEach(id => {
          if (slideToRender.positions[id]) {
              slideToRender.positions[id] = { ...slideToRender.positions[id], borderColor: '#facc15' };
          }
      });
      
      if (isDrawing && activeTool !== ToolType.POLYGON && activeTool !== ToolType.CONNECTOR) {
          slideToRender.drawings.push({
              id: 'preview',
              type: activeTool,
              points: currentPoints,
              color: drawingColor,
              props: { strokeStyle: drawingStrokeStyle, fillStyle: drawingFillStyle }
          });
      }
      
      if (activeTool === ToolType.CONNECTOR && connectorStartPlayerId && connectorPreviewPos) {
          slideToRender.drawings.push({
              id: 'preview-conn',
              type: ToolType.CONNECTOR,
              points: [],
              color: drawingColor,
              props: { startPlayerId: connectorStartPlayerId, endPlayerId: 'preview-pos', strokeStyle: drawingStrokeStyle }
          });
          // Add a fake position for the preview connector
          slideToRender.positions = { ...slideToRender.positions, 'preview-pos': { x: connectorPreviewPos.x, y: connectorPreviewPos.y } as any };
      }

      if (activeTool === ToolType.POLYGON && polyPoints.length > 0) {
          slideToRender.drawings.push({
              id: 'preview-poly',
              type: ToolType.POLYGON,
              points: polyPreviewPos ? [...polyPoints, polyPreviewPos] : [...polyPoints],
              color: drawingColor,
              props: { strokeStyle: drawingStrokeStyle, fillStyle: drawingFillStyle }
          });
      }

      if (isPointItem(activeTool) && hoverPos && !isDrawing) {
          slideToRender.drawings.push({
              id: 'ghost',
              type: activeTool,
              points: [hoverPos],
              color: drawingColor,
              props: { scale: equipmentScale, rotation: equipmentAngle }
          });
      }
      
      let currentProgress = 1;
      if (transitionStateRef.current.isAnimating) {
         const elapsed = performance.now() - transitionStateRef.current.startTime;
         if (elapsed < transitionStateRef.current.duration) {
             currentProgress = elapsed / transitionStateRef.current.duration;
         } else {
             currentProgress = 1;
             transitionStateRef.current.isAnimating = false;
             setTimeout(() => setPrevSlide(null), 0);
         }
      }
      
      try {
        drawBoardToCanvas(
          ctx,
          project,
          slideToRender,
          prevSlide,
          currentProgress,
          coinSettings,
          bgImgElement,
          pitchTemplate,
          P_WIDTH,
          P_HEIGHT,
          renderScale,
          editingTextId,
          null,
          true, // isEditor
          selectedPlayerIds, // pass selected players for motion path control points
          previousSlide, // editorPreviousSlide
          activeTool === ToolType.SELECT ? (selectedDrawingIds.length === 1 ? selectedDrawingIds[0] : null) : null
        );
        
        if (attachedAnimationId && slideToRender.positions[attachedAnimationId]) {
            const logicalPos = slideToRender.positions[attachedAnimationId];
            
            // Find player shape and rotation
            let shape = coinSettings.shape || 'coins';
            Object.values(TeamSide).forEach(side => {
               const team = project.teams[side];
               if (team) {
                   const p = team.players.find(p => p.id === attachedAnimationId);
                   if (p && team.settings && team.settings.shape) {
                       shape = team.settings.shape;
                   }
               }
            });
            
            const pScale = (logicalPos.scale || 1) * coinSettings.globalScale;
            const r = (32 * pScale) / 2; // BASE_COIN_SIZE / 2
            const visualOffset = (coinSettings.orientation === 'inverted' ? 180 : coinSettings.orientation === 'vertical' ? -90 : 0);
            const rotation = (logicalPos.rotation || 0) + visualOffset;
            
            const P = makeP(P_WIDTH, P_HEIGHT, project.pitchView);
            const proj = P(logicalPos.x / P_WIDTH, logicalPos.y / P_HEIGHT);
            
            ctx.save();
            ctx.scale(renderScale, renderScale);
            ctx.translate(proj.x, proj.y);
            
            // Scale and orient identically to the player token
            ctx.scale(proj.s, proj.s);
            
            const standardShapes = ['circle', 'semicircle', 'crescent', 'jersey'];
            const keepRotation = shape === 'tactic' || standardShapes.includes(shape);
            if (keepRotation) {
                ctx.rotate((rotation * Math.PI) / 180);
            }
            
            // Generate the outline path
            buildTokenOutlinePath(ctx, shape, r * 1.15); // slightly larger than the coin
            
            // Animate 0 to 360 using a conic gradient
            const t = (performance.now() % 1500) / 1500;
            
            if (typeof (ctx as any).createConicGradient === 'function') {
                const grad = (ctx as any).createConicGradient(-Math.PI/2, 0, 0);
                grad.addColorStop(0, 'rgba(59, 130, 246, 0)');
                if (t > 0.15) grad.addColorStop(t - 0.15, 'rgba(59, 130, 246, 0)');
                grad.addColorStop(t, 'rgba(59, 130, 246, 1)');
                if (t < 0.999) grad.addColorStop(t + 0.001, 'rgba(59, 130, 246, 0)');
                grad.addColorStop(1, 'rgba(59, 130, 246, 0)');
                ctx.strokeStyle = grad;
            } else {
                ctx.strokeStyle = '#3b82f6';
            }

            ctx.lineWidth = 4;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            
            ctx.shadowColor = 'rgba(59, 130, 246, 0.8)';
            ctx.shadowBlur = 10;
            
            ctx.fillStyle = 'rgba(59, 130, 246, 0.15)';
            ctx.fill();
            ctx.stroke();
            ctx.restore();
        }
        
        if (activeTool === ToolType.ERASER) {
            const P = makeP(P_WIDTH, P_HEIGHT, project.pitchView);
            
            ctx.save();
            ctx.scale(renderScale, renderScale);
            
            if (hoverPos) {
               const proj = P(hoverPos.x / P_WIDTH, hoverPos.y / P_HEIGHT);
               ctx.beginPath();
               ctx.arc(proj.x, proj.y, 15 * proj.s, 0, Math.PI * 2);
               ctx.fillStyle = 'rgba(239, 68, 68, 0.2)';
               ctx.fill();
               ctx.strokeStyle = 'rgba(239, 68, 68, 0.8)';
               ctx.lineWidth = 2;
               ctx.stroke();
            }

            ctx.restore();
        }
        
        if (selectionBoxStart && selectionBoxEnd) {
            ctx.save();
            ctx.strokeStyle = '#3b82f6';
            ctx.fillStyle = 'rgba(59, 130, 246, 0.2)';
            ctx.lineWidth = 1.5 * renderScale;
            const minX = Math.min(selectionBoxStart.x, selectionBoxEnd.x) * renderScale;
            const minY = Math.min(selectionBoxStart.y, selectionBoxEnd.y) * renderScale;
            const width = Math.abs(selectionBoxEnd.x - selectionBoxStart.x) * renderScale;
            const height = Math.abs(selectionBoxEnd.y - selectionBoxStart.y) * renderScale;
            ctx.fillRect(minX, minY, width, height);
            ctx.strokeRect(minX, minY, width, height);
            ctx.restore();
        }
      } catch (err) {
        console.error("Error drawing to canvas:", err);
      }
    };

    animationFrameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animationFrameId);
  }, [project, currentSlide, previousSlide, prevSlide, coinSettings, bgImgElement, pitchTemplate, isDrawing, currentPoints, activeTool, drawingColor, connectorStartPlayerId, connectorPreviewPos, polyPoints, polyPreviewPos, hoverPos, equipmentScale, equipmentAngle, drawingStrokeStyle, drawingFillStyle, drawingFontFamily, editingTextId, selectedPlayerIds, selectionBoxStart, selectionBoxEnd]);

  const getPlayerAtPosition = (pos: Point, excludeId?: string) => {
      const allPlayers = [
        ...project.teams[TeamSide.HOME].players,
        ...project.teams[TeamSide.AWAY].players,
        ...(project.teams[TeamSide.NEUTRAL] ? project.teams[TeamSide.NEUTRAL].players : [])
      ];

      for (const player of allPlayers) {
        if (excludeId && player.id === excludeId) continue;
        if (currentSlide.positions[player.id]) {
            const pPos = currentSlide.positions[player.id];
            const scale = (pPos.scale || 1) * globalScale;
            // Hit radius slightly larger than visual radius for usability
            const radius = (BASE_COIN_SIZE / 2) * scale; 
            const dist = Math.sqrt(Math.pow(pos.x - pPos.x, 2) + Math.pow(pos.y - pPos.y, 2));
            if (dist < Math.max(20, radius)) { 
                return player.id;
            }
        }
      }
      return null;
  };

  const isPointItem = (type: ToolType) => [
    ToolType.BALL, ToolType.CONE, ToolType.DISC, ToolType.GOAL,
    ToolType.GOAL_MINI, ToolType.GOAL_SIDE, ToolType.MANNEQUIN,
    ToolType.LADDER, ToolType.HURDLE, ToolType.POLE
  ].includes(type);

  const getPointItemRadius = (type: ToolType) => {
    switch (type) {
        case ToolType.GOAL: return 60;
        case ToolType.LADDER: return 70;
        case ToolType.GOAL_MINI: return 40;
        case ToolType.GOAL_SIDE: return 35;
        case ToolType.MANNEQUIN: return 30;
        case ToolType.BALL: return 12;
        default: return 20;
    }
  };

  const eraseDrawingAt = (pos: Point) => {
    const currentSlide = project.slides.find(s => s.id === project.currentSlideId);
    if (!currentSlide) return;
    for (let i = currentSlide.drawings.length - 1; i >= 0; i--) {
      const d = currentSlide.drawings[i];
      let found = false;
      if (d.type === ToolType.CIRCLE) {
        const start = d.points[0];
        const end = d.points[d.points.length - 1];
        if (start && end) {
            const r = Math.hypot(end.x - start.x, end.y - start.y);
            const dist = Math.hypot(pos.x - start.x, pos.y - start.y);
            if (Math.abs(dist - r) < 15 || dist < r) {
                found = true;
            }
        }
      } else if (d.type === ToolType.CONNECTOR) {
        const p1 = currentSlide.positions[d.props?.startPlayerId];
        const p2 = currentSlide.positions[d.props?.endPlayerId];
        if (p1 && p2 && pointToLineSegmentDistance(pos, p1, p2) < 15) {
           found = true;
        }
      } else if (d.type === ToolType.TEXT) {
        const p = d.points[0];
        const textLen = (d.text || '').length * 16;
        if (pos.x >= p.x - 10 && pos.x <= p.x + textLen + 10 && pos.y >= p.y - 30 && pos.y <= p.y + 10) {
           found = true;
        }
      } else if (isPointItem(d.type)) {
        const p = d.points[0];
        const radius = getPointItemRadius(d.type);
        if (p && Math.hypot(p.x - pos.x, p.y - pos.y) < radius) {
           found = true;
        }
      } else {
        // PEN, LINE, ARROW, CURVE_ARROW, POLYGON
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        for (const p of d.points) {
            if (p.x < minX) minX = p.x;
            if (p.x > maxX) maxX = p.x;
            if (p.y < minY) minY = p.y;
            if (p.y > maxY) maxY = p.y;
        }
        if (pos.x >= minX - 15 && pos.x <= maxX + 15 && pos.y >= minY - 15 && pos.y <= maxY + 15) {
            for (let j = 0; j < d.points.length - 1; j++) {
                const p1 = d.points[j];
                const p2 = d.points[j+1];
                if (pointToLineSegmentDistance(pos, p1, p2) < 15) {
                    found = true;
                    break;
                }
            }
        }
        if (!found && d.type === ToolType.POLYGON && d.points.length > 2) {
            const p1 = d.points[d.points.length - 1];
            const p2 = d.points[0];
            if (pointToLineSegmentDistance(pos, p1, p2) < 15) {
                found = true;
            }
        }
        // Fallback for single-point PEN or other weirdness
        if (!found && d.points.length === 1) {
            if (Math.hypot(d.points[0].x - pos.x, d.points[0].y - pos.y) < 15) {
                found = true;
            }
        }
      }
      if (found) {
        onDelete(d.id, 'drawing');
        break;
      }
    }
  };

  // Handle pointer down (Start drawing or Start dragging)
  const handlePointerDown = (e: React.PointerEvent) => {
    if (contextMenu) setContextMenu(null);
    if (e.button === 2) return; // Ignore right click
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    dragHistoryPushedRef.current = false;

    const pos = getMappedPointerPosition(e);

    if (activeTool === ToolType.SELECT) {
      // Check motion path control points first
      if (previousSlide) {
        for (const playerId of selectedPlayerIds) {
          const currentPos = currentSlide.positions[playerId];
          const prevPos = previousSlide.positions[playerId];
          if (currentPos && prevPos && (currentPos.x !== prevPos.x || currentPos.y !== prevPos.y)) {
             const cps = getPlayerMotionPath(prevPos, currentPos);
             for (let i = 0; i < cps.length; i++) {
               if (Math.hypot(cps[i].x - pos.x, cps[i].y - pos.y) < 15) {
                 setDraggingMotionPath({ playerId, pointIndex: i });
                 return; // Stop here, we are dragging a control point
               }
             }
          }
        }
      }

      const foundPlayerId = getPlayerAtPosition(pos);
      
      if (foundPlayerId) {
        setDraggingPlayerId(foundPlayerId);
        setDragStartPointerPos(pos);
        
        // Multi-select logic
        let newSelected = [...selectedPlayerIds];
        if (e.ctrlKey || e.metaKey || e.shiftKey) {
            if (newSelected.includes(foundPlayerId)) {
                // Deselect if already selected and ctrl is held
                newSelected = newSelected.filter(id => id !== foundPlayerId);
            } else {
                // Add to selection
                newSelected.push(foundPlayerId);
            }
        } else {
            // Normal click: if clicking an UNSELECTED item, clear selection and select it
            // if clicking a SELECTED item, leave the selection as is to allow dragging all (or just it)
            if (!newSelected.includes(foundPlayerId)) {
                newSelected = [foundPlayerId];
            }
        }
        
        setSelectedPlayerIds(newSelected);
        
        // Save initial positions of all selected players for group dragging
        const initialPositions: {[id: string]: Point} = {};
        newSelected.forEach(id => {
            if (currentSlide.positions[id]) {
                initialPositions[id] = { ...currentSlide.positions[id] };
            }
        });
        setDragStartPositions(initialPositions);
        
        setSelectedDrawingIds([]);
      } else {
        // Deselect if clicking empty space
        setDraggingPlayerId(null);
        
        // Try selecting a drawing
        const currentSlide = project.slides.find(s => s.id === project.currentSlideId);
        let clickedDrawingId = null;
        let clickedVertexIndex: number | null = null;
        if (currentSlide) {
            // Priority 1: Check vertices of the CURRENTLY SELECTED drawings
            if (selectedDrawingIds.length === 1) {
                const selectedD = currentSlide.drawings.find(d => d.id === selectedDrawingIds[0]);
                if (selectedD) {
                    for (let j = 0; j < selectedD.points.length; j++) {
                        const p = selectedD.points[j];
                        if (Math.hypot(p.x - pos.x, p.y - pos.y) < 15) {
                            clickedDrawingId = selectedD.id;
                            clickedVertexIndex = j;
                            break;
                        }
                    }
                    if (!clickedDrawingId && selectedD.type === ToolType.CIRCLE && selectedD.points.length >= 2) {
                        const start = selectedD.points[0];
                        const end = selectedD.points[selectedD.points.length - 1];
                        // If they click the edge of the circle (radius line)
                        const r = Math.hypot(end.x - start.x, end.y - start.y);
                        const dist = Math.hypot(pos.x - start.x, pos.y - start.y);
                        if (Math.abs(dist - r) < 15) {
                            clickedDrawingId = selectedD.id;
                            clickedVertexIndex = 1; // Drag the edge point
                        }
                    }
                }
            }

            // Priority 2: Check other drawings if no vertex clicked
            if (!clickedDrawingId) {
                for (let i = currentSlide.drawings.length - 1; i >= 0; i--) {
                    const d = currentSlide.drawings[i];
                    
                    // Check vertices
                    let foundVertex = false;
                    for (let j = 0; j < d.points.length; j++) {
                        const p = d.points[j];
                        if (Math.hypot(p.x - pos.x, p.y - pos.y) < 15) {
                            clickedDrawingId = d.id;
                            clickedVertexIndex = j;
                            foundVertex = true;
                            break;
                        }
                    }
                    if (foundVertex) break;

                    // Check body
                    if (d.type === ToolType.CIRCLE) {
                        const start = d.points[0];
                        const end = d.points[d.points.length - 1];
                        if (start && end) {
                            const r = Math.hypot(end.x - start.x, end.y - start.y);
                            const dist = Math.hypot(pos.x - start.x, pos.y - start.y);
                            if (Math.abs(dist - r) < 15 || dist < r) {
                                clickedDrawingId = d.id;
                                clickedVertexIndex = null;
                                break;
                            }
                        }
                    } else if (d.type === ToolType.CONNECTOR) {
                        const p1 = currentSlide.positions[d.props?.startPlayerId];
                        const p2 = currentSlide.positions[d.props?.endPlayerId];
                        if (p1 && p2 && pointToLineSegmentDistance(pos, p1, p2) < 15) {
                            clickedDrawingId = d.id;
                            clickedVertexIndex = null;
                            break;
                        }
                    } else if (d.type === ToolType.TEXT) {
                        const p = d.points[0];
                        const textLen = (d.text || '').length * 16;
                        if (pos.x >= p.x - 10 && pos.x <= p.x + textLen + 10 && pos.y >= p.y - 30 && pos.y <= p.y + 10) {
                            clickedDrawingId = d.id;
                            clickedVertexIndex = null;
                            break;
                        }
                    } else if (isPointItem(d.type)) {
                        const p = d.points[0];
                        const radius = getPointItemRadius(d.type);
                        if (p && Math.hypot(p.x - pos.x, p.y - pos.y) < radius) {
                            clickedDrawingId = d.id;
                            clickedVertexIndex = null;
                            break;
                        }
                    } else if (d.type === ToolType.LINE || d.type === ToolType.ARROW || d.type === ToolType.CURVE_ARROW || d.type === ToolType.PEN || d.type === ToolType.POLYGON) {
                        for (let j = 0; j < d.points.length - 1; j++) {
                            const p1 = d.points[j];
                            const p2 = d.points[j+1];
                            if (pointToLineSegmentDistance(pos, p1, p2) < 15) {
                                clickedDrawingId = d.id;
                                clickedVertexIndex = null;
                                break;
                            }
                        }
                        if (d.type === ToolType.POLYGON && !clickedDrawingId && d.points.length > 2) {
                            const p1 = d.points[d.points.length - 1];
                            const p2 = d.points[0];
                            if (pointToLineSegmentDistance(pos, p1, p2) < 15) {
                                clickedDrawingId = d.id;
                                clickedVertexIndex = null;
                                break;
                            }
                        }
                        if (clickedDrawingId) break;
                    }
                }
            }
        }

        let newSelectedDrawings = [...selectedDrawingIds];
        if (clickedDrawingId) {
            if (e.ctrlKey || e.metaKey || e.shiftKey) {
                if (newSelectedDrawings.includes(clickedDrawingId)) {
                    newSelectedDrawings = newSelectedDrawings.filter(id => id !== clickedDrawingId);
                } else {
                    newSelectedDrawings.push(clickedDrawingId);
                }
            } else {
                if (!newSelectedDrawings.includes(clickedDrawingId)) {
                    newSelectedDrawings = [clickedDrawingId];
                }
            }
        } else {
            newSelectedDrawings = [];
        }
        
        setSelectedDrawingIds(newSelectedDrawings);
        
        if (clickedDrawingId) {
            setDraggingDrawingId(clickedDrawingId);
            setDraggingVertexIndex(clickedVertexIndex);
            setDragStartPointerPos(pos);
            const initialDrawingPoints: {[id: string]: Point[]} = {};
            newSelectedDrawings.forEach(id => {
                const d = currentSlide?.drawings.find(dr => dr.id === id);
                if (d) initialDrawingPoints[id] = [...d.points];
            });
            setDragStartDrawingPoints(initialDrawingPoints);
            setSelectedPlayerIds([]); // clear players if a drawing was clicked
        } else {
            setSelectedPlayerIds([]); // clear players if empty space was clicked
            setSelectionBoxStart(pos);
            setSelectionBoxEnd(pos);
        }
      }
    } else if (activeTool === ToolType.ERASER) {
      setIsDrawing(true);
      eraseDrawingAt(pos);
    } else if (activeTool === ToolType.POLYGON) {
      const targetPlayerId = attachToPlayer ? getPlayerAtPosition(pos) : null;
      const newPos = targetPlayerId ? { ...pos, attachedToPlayerId: targetPlayerId } : pos;
      setPolyPoints(prev => [...prev, newPos]);
      setPolyPreviewPos(newPos);
      if (targetPlayerId) {
          setAttachedAnimationId(targetPlayerId);
          setTimeout(() => setAttachedAnimationId(null), 1000);
      }
    } else if (activeTool === ToolType.CONNECTOR) {
      const foundPlayerId = getPlayerAtPosition(pos);
      if (foundPlayerId) {
         if (!connectorStartPlayerId) {
             setConnectorStartPlayerId(foundPlayerId);
             setConnectorPreviewPos(pos);
         } else if (connectorStartPlayerId !== foundPlayerId) {
             const newDrawing: Drawing = {
                id: Date.now().toString(),
                type: ToolType.CONNECTOR,
                points: [],
                color: drawingColor,
                props: { startPlayerId: connectorStartPlayerId, endPlayerId: foundPlayerId, strokeStyle: drawingStrokeStyle }
             };
             onAddDrawing(newDrawing);
             setConnectorStartPlayerId(null);
             setConnectorPreviewPos(null);
         } else {
             setConnectorStartPlayerId(null);
             setConnectorPreviewPos(null);
         }
      } else {
         setConnectorStartPlayerId(null);
         setConnectorPreviewPos(null);
      }
    } else if (activeTool === ToolType.TEXT) {
      const newDrawing: Drawing = {
        id: Date.now().toString(),
        type: ToolType.TEXT,
        points: [pos],
        color: drawingColor,
        text: 'Text',
        props: { fontFamily: drawingFontFamily, fontSize: drawingTextSize }
      };
      onAddDrawing(newDrawing);
      setEditingTextId(newDrawing.id);
      setSelectedPlayerIds([]);
      setSelectedDrawingIds([newDrawing.id]);
    } else if (isPointItem(activeTool)) {
      const newDrawing: Drawing = {
        id: Date.now().toString(),
        type: activeTool,
        points: [pos],
        color: drawingColor,
        props: { scale: equipmentScale, rotation: equipmentAngle, attachToPlayer }
      };
      
      const targetPlayerId = attachToPlayer ? getPlayerAtPosition(pos) : null;
      if (targetPlayerId) {
          newDrawing.points[0] = { ...pos, attachedToPlayerId: targetPlayerId };
          setAttachedAnimationId(targetPlayerId);
          setTimeout(() => setAttachedAnimationId(null), 1000);
      }
      
      onAddDrawing(newDrawing);
      setSelectedPlayerIds([]);
      setSelectedDrawingIds([newDrawing.id]);
    } else {
      let newPos: Point = pos;
      let targetPlayerId = null;
      if (attachToPlayer && (activeTool === ToolType.LINE || activeTool === ToolType.ARROW || activeTool === ToolType.CURVE_ARROW || activeTool === ToolType.CIRCLE)) {
          targetPlayerId = getPlayerAtPosition(pos);
          if (targetPlayerId) {
              newPos = { ...pos, attachedToPlayerId: targetPlayerId };
          }
      }
      setIsDrawing(true);
      setCurrentPoints([newPos]);
      setSelectedPlayerIds([]);
      setSelectedDrawingIds([]);
      
      if (targetPlayerId) {
          setAttachedAnimationId(targetPlayerId);
          setTimeout(() => setAttachedAnimationId(null), 1000);
      }
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const pos = getMappedPointerPosition(e);
    
    if (activeTool === ToolType.ERASER || (!isDrawing && !draggingPlayerId && !draggingDrawingId && !draggingMotionPath)) {
        setHoverPos(pos);
    } else {
        setHoverPos(null);
    }

    if (activeTool === ToolType.SELECT && draggingMotionPath && previousSlide) {
      const clampedX = Math.max(0, Math.min(P_WIDTH, pos.x));
      const clampedY = Math.max(0, Math.min(P_HEIGHT, pos.y));
      const currentPos = currentSlide.positions[draggingMotionPath.playerId];
      const prevPos = previousSlide.positions[draggingMotionPath.playerId];
      if (currentPos && prevPos) {
         const cps = getPlayerMotionPath(prevPos, currentPos);
         const newCps = [...cps];
         newCps[draggingMotionPath.pointIndex] = { x: clampedX, y: clampedY };
         onUpdatePositions([{id: draggingMotionPath.playerId, pos: { ...currentPos, motionPath: newCps }}], dragHistoryPushedRef.current);
         dragHistoryPushedRef.current = true;
      }
    } else if (activeTool === ToolType.SELECT && selectionBoxStart) {
      setSelectionBoxEnd(pos);
      const minX = Math.min(selectionBoxStart.x, pos.x);
      const maxX = Math.max(selectionBoxStart.x, pos.x);
      const minY = Math.min(selectionBoxStart.y, pos.y);
      const maxY = Math.max(selectionBoxStart.y, pos.y);
      
      const newSelected: string[] = [];
      const allPlayers = [
        ...project.teams[TeamSide.HOME].players,
        ...project.teams[TeamSide.AWAY].players,
        ...(project.teams[TeamSide.NEUTRAL] ? project.teams[TeamSide.NEUTRAL].players : [])
      ];
      
      for (const player of allPlayers) {
        const pPos = currentSlide.positions[player.id];
        if (pPos) {
            if (pPos.x >= minX && pPos.x <= maxX && pPos.y >= minY && pPos.y <= maxY) {
                newSelected.push(player.id);
            }
        }
      }
      setSelectedPlayerIds(newSelected);
      
      const newSelectedDrawings: string[] = [];
      for (const d of currentSlide.drawings) {
          if (d.points.length > 0) {
              const p = d.points[0]; // simplistic check using the first point
              if (p.x >= minX && p.x <= maxX && p.y >= minY && p.y <= maxY) {
                  newSelectedDrawings.push(d.id);
              }
          }
      }
      setSelectedDrawingIds(newSelectedDrawings);
    } else if (activeTool === ToolType.SELECT && draggingPlayerId && dragStartPointerPos) {
      const deltaX = pos.x - dragStartPointerPos.x;
      const deltaY = pos.y - dragStartPointerPos.y;
      
      const updates = selectedPlayerIds.map(id => {
          const startPos = dragStartPositions[id];
          if (startPos) {
              return {
                  id,
                  pos: {
                      x: Math.max(0, Math.min(P_WIDTH, startPos.x + deltaX)),
                      y: Math.max(0, Math.min(P_HEIGHT, startPos.y + deltaY))
                  }
              };
          }
          return null;
      }).filter(Boolean) as {id: string, pos: Partial<PlayerPosition>}[];
      
      onUpdatePositions(updates, dragHistoryPushedRef.current);
      dragHistoryPushedRef.current = true;
    } else if (activeTool === ToolType.SELECT && draggingDrawingId && draggingVertexIndex !== null && onUpdateDrawing) {
      const clampedX = Math.max(0, Math.min(P_WIDTH, pos.x));
      const clampedY = Math.max(0, Math.min(P_HEIGHT, pos.y));
      onUpdateDrawing(draggingDrawingId, (d) => {
         const newPoints = [...d.points];
         newPoints[draggingVertexIndex] = { x: clampedX, y: clampedY };
         // If it's a polygon and we move the first or last point, and they are essentially the same point, move both
         if (d.type === ToolType.POLYGON) {
             const firstPt = d.points[0];
             const lastPt = d.points[d.points.length - 1];
             if (Math.hypot(firstPt.x - lastPt.x, firstPt.y - lastPt.y) < 2) {
                 if (draggingVertexIndex === 0) {
                     newPoints[newPoints.length - 1] = { x: clampedX, y: clampedY };
                 } else if (draggingVertexIndex === newPoints.length - 1) {
                     newPoints[0] = { x: clampedX, y: clampedY };
                 }
             }
         }
         return { ...d, points: newPoints };
      }, dragHistoryPushedRef.current);
      dragHistoryPushedRef.current = true;
    } else if (activeTool === ToolType.SELECT && draggingDrawingId && draggingVertexIndex === null && dragStartPointerPos) {
      const deltaX = pos.x - dragStartPointerPos.x;
      const deltaY = pos.y - dragStartPointerPos.y;
      
      // Try to use onUpdateDrawings if available
      const anyProp = onUpdateDrawings || onUpdateDrawing;
      if (anyProp && selectedDrawingIds.length > 0) {
          const updates = selectedDrawingIds.map(id => {
              return {
                  id,
                  updater: (d: Drawing) => {
                      const startPoints = dragStartDrawingPoints[id];
                      if (!startPoints) return d;
                      const newPoints = startPoints.map(p => ({
                          x: Math.max(0, Math.min(P_WIDTH, p.x + deltaX)),
                          y: Math.max(0, Math.min(P_HEIGHT, p.y + deltaY))
                      }));
                      return { ...d, points: newPoints };
                  }
              };
          });
          
          if (onUpdateDrawings) {
              onUpdateDrawings(updates, dragHistoryPushedRef.current);
          } else if (onUpdateDrawing) {
              // fallback if for some reason it's not provided
              updates.forEach(upd => onUpdateDrawing(upd.id, upd.updater, dragHistoryPushedRef.current));
          }
          dragHistoryPushedRef.current = true;
      }
    } else if (activeTool === ToolType.ERASER && isDrawing) {
      eraseDrawingAt(pos);
    } else if (activeTool === ToolType.POLYGON && polyPoints.length > 0) {
      setPolyPreviewPos(pos);
    } else if (activeTool === ToolType.CONNECTOR && connectorStartPlayerId) {
      setConnectorPreviewPos(pos);
    } else if (isDrawing) {
      setCurrentPoints(prev => [...prev, pos]);
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    const pos = getMappedPointerPosition(e);

    if (activeTool === ToolType.SELECT) {
      // Finalize drag by triggering a normal history push with current position
      if (draggingPlayerId) {
         if (dragStartPointerPos) {
             const deltaX = pos.x - dragStartPointerPos.x;
             const deltaY = pos.y - dragStartPointerPos.y;
             
             const updates = selectedPlayerIds.map(id => {
                 const startPos = dragStartPositions[id];
                 if (startPos) {
                     return {
                         id,
                         pos: {
                             x: Math.max(0, Math.min(P_WIDTH, startPos.x + deltaX)),
                             y: Math.max(0, Math.min(P_HEIGHT, startPos.y + deltaY))
                         }
                     };
                 }
                 return null;
             }).filter(Boolean) as {id: string, pos: Partial<PlayerPosition>}[];
             
             if (updates.length > 0) {
                 if (dragHistoryPushedRef.current) {
                     onUpdatePositions(updates, true);
                 }
             }
         }
         setDragStartPositions({});
         setDragStartPointerPos(null);
      } else if (selectionBoxStart) {
         setSelectionBoxStart(null);
         setSelectionBoxEnd(null);
      } else if (draggingDrawingId) {
         const targetDrawing = currentSlide.drawings.find(dr => dr.id === draggingDrawingId);
         const targetPlayerId = (draggingVertexIndex !== null && targetDrawing && !isPointItem(targetDrawing.type)) ? getPlayerAtPosition(pos) : null;
         if (draggingVertexIndex !== null && onUpdateDrawing && targetPlayerId) {
             onUpdateDrawing(draggingDrawingId, (d) => {
                 if (d.props?.attachToPlayer === false) {
                     return d;
                 }
                 const newPoints = [...d.points];
                 const pPos = currentSlide.positions[targetPlayerId];
                 newPoints[draggingVertexIndex] = { ...newPoints[draggingVertexIndex], attachedToPlayerId: targetPlayerId, x: pPos.x, y: pPos.y };
                 if (d.type === ToolType.POLYGON) {
                     const firstPt = d.points[0];
                     const lastPt = d.points[d.points.length - 1];
                     if (Math.hypot(firstPt.x - lastPt.x, firstPt.y - lastPt.y) < 2) {
                         if (draggingVertexIndex === 0) {
                             newPoints[newPoints.length - 1] = { ...newPoints[newPoints.length - 1], attachedToPlayerId: targetPlayerId, x: pPos.x, y: pPos.y };
                         } else if (draggingVertexIndex === newPoints.length - 1) {
                             newPoints[0] = { ...newPoints[0], attachedToPlayerId: targetPlayerId, x: pPos.x, y: pPos.y };
                         }
                     }
                 }
                 return { ...d, points: newPoints };
             }, dragHistoryPushedRef.current ? true : false);
             
             const d = currentSlide.drawings.find(dr => dr.id === draggingDrawingId);
             if (d?.props?.attachToPlayer !== false) {
                 setAttachedAnimationId(targetPlayerId);
                 setTimeout(() => setAttachedAnimationId(null), 1000);
             }
         } else if (draggingVertexIndex !== null && onUpdateDrawing) {
             onUpdateDrawing(draggingDrawingId, (d) => {
                 const newPoints = [...d.points];
                 delete newPoints[draggingVertexIndex].attachedToPlayerId;
                 if (d.type === ToolType.POLYGON) {
                     const firstPt = d.points[0];
                     const lastPt = d.points[d.points.length - 1];
                     if (Math.hypot(firstPt.x - lastPt.x, firstPt.y - lastPt.y) < 2) {
                         if (draggingVertexIndex === 0) {
                             delete newPoints[newPoints.length - 1].attachedToPlayerId;
                         } else if (draggingVertexIndex === newPoints.length - 1) {
                             delete newPoints[0].attachedToPlayerId;
                         }
                     }
                 }
                 return { ...d, points: newPoints };
             }, dragHistoryPushedRef.current ? true : false);
         } else if (onUpdateDrawings && selectedDrawingIds.length > 0) {
             if (dragHistoryPushedRef.current) {
                 const updates = selectedDrawingIds.map(id => ({ id, updater: (d_: Drawing) => d_ }));
                 onUpdateDrawings(updates, true);
             }
         } else if (onUpdateDrawing) {
             if (dragHistoryPushedRef.current) {
                 const d = currentSlide.drawings.find(dr => dr.id === draggingDrawingId);
                 if (d) onUpdateDrawing(draggingDrawingId, d_ => d_, true);
             }
         }
      } else if (draggingMotionPath) {
         // Finalize motion path drag
         const currentPos = currentSlide.positions[draggingMotionPath.playerId];
         if (currentPos && dragHistoryPushedRef.current) {
             onUpdatePositions([{id: draggingMotionPath.playerId, pos: currentPos}], true);
         }
      }
      
      setDraggingMotionPath(null);
      setDraggingPlayerId(null);
      setDraggingDrawingId(null);
      setDraggingVertexIndex(null);
    } else if (activeTool === ToolType.ERASER && isDrawing) {
      setIsDrawing(false);
    } else if (isDrawing) {
      setIsDrawing(false);
      if (currentPoints.length > 1 || activeTool === ToolType.CIRCLE) {
        let finalPoints = currentPoints;
        let lastPt = currentPoints[currentPoints.length - 1];
        
        if (attachToPlayer && (activeTool === ToolType.LINE || activeTool === ToolType.ARROW || activeTool === ToolType.CURVE_ARROW || activeTool === ToolType.CIRCLE)) {
            const targetPlayerId = getPlayerAtPosition(lastPt);
            if (targetPlayerId) {
                lastPt = { ...lastPt, attachedToPlayerId: targetPlayerId };
                setAttachedAnimationId(targetPlayerId);
                setTimeout(() => setAttachedAnimationId(null), 1000);
            }
        }

        if (activeTool === ToolType.CURVE_ARROW) {
           const p0 = currentPoints[0];
           const p1 = lastPt;
           const mx = (p0.x + p1.x) / 2;
           const my = (p0.y + p1.y) / 2;
           const dx = p1.x - p0.x;
           const dy = p1.y - p0.y;
           const len = Math.hypot(dx, dy);
           const off = len * 0.3;
           const ctrl = len > 5 ? { x: mx + (dy / len) * off, y: my - (dx / len) * off } : { x: mx, y: my };
           finalPoints = [p0, ctrl, p1];
        } else if (activeTool === ToolType.ARROW || activeTool === ToolType.LINE || activeTool === ToolType.CIRCLE) {
           finalPoints = [currentPoints[0], lastPt];
        } else {
           finalPoints = [...currentPoints.slice(0, -1), lastPt];
        }

        const newDrawing: Drawing = {
          id: Date.now().toString(),
          type: activeTool,
          points: finalPoints,
          color: drawingColor,
          props: { strokeStyle: drawingStrokeStyle, fillStyle: drawingFillStyle, strokeWidth: drawingStrokeWidth, fontFamily: drawingFontFamily, attachToPlayer }
        };
        onAddDrawing(newDrawing);
      }
      setCurrentPoints([]);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    const pos = getMappedPointerPosition(e as unknown as React.PointerEvent);
    
    if (activeTool === ToolType.POLYGON) {
      if (polyPoints.length > 2) {
        const finalPoints = [...polyPoints];
        if (finalPoints.length > 1) {
          const p1 = finalPoints[finalPoints.length - 1];
          const p2 = finalPoints[finalPoints.length - 2];
          if (Math.hypot(p1.x - p2.x, p1.y - p2.y) < 10) {
            finalPoints.pop();
          }
        }
        
        if (finalPoints.length > 2) {
          onAddDrawing({
            id: Date.now().toString(),
            type: ToolType.POLYGON,
            points: finalPoints,
            color: drawingColor,
            props: { strokeStyle: drawingStrokeStyle, fillStyle: drawingFillStyle }
          });
        }
        setPolyPoints([]);
        setPolyPreviewPos(null);
      }
    } else if (activeTool === ToolType.SELECT) {
       const foundPlayerId = getPlayerAtPosition(pos);
       if (foundPlayerId) {
           if (selectedPlayerIds.includes(foundPlayerId) && selectedPlayerIds.length > 1) {
               onEditPlayer(selectedPlayerIds);
           } else {
               onEditPlayer([foundPlayerId]);
           }
       } else {
           const currentSlide = project.slides.find(s => s.id === project.currentSlideId);
           let foundText = false;
           if (currentSlide) {
               // First check drawings at this position
               for (let i = currentSlide.drawings.length - 1; i >= 0; i--) {
                   const d = currentSlide.drawings[i];
                   if (d.type === ToolType.TEXT) {
                       const p = d.points[0];
                       const textLen = (d.text || '').length * 16;
                       if (pos.x >= p.x - 10 && pos.x <= p.x + textLen + 10 && pos.y >= p.y - 30 && pos.y <= p.y + 10) {
                           setEditingTextId(d.id);
                           foundText = true;
                           return; // stop execution
                       }
                   }
               }
           }
           
           if (!foundText && onOpenLayerManager) {
               onOpenLayerManager();
           }
       }
    }
  };

  // Render Drawings

  const centerY = P_HEIGHT / 2;

  const getTemplateStyle = () => {
    // We can just rely on canvasRenderer to draw the background, but the parent
    // div needs a placeholder or we can just make it transparent.
    return {
      background: 'transparent',
      lineColor: 'rgba(255, 255, 255, 0.4)',
      stripeColor: 'rgba(255, 255, 255, 0.02)',
      shadow: 'inset 0 0 100px rgba(0,0,0,0.8)'
    };
  };

  const templateStyle = getTemplateStyle();
  const camera = currentSlide.camera || { rotateX: 0, rotateY: 0, rotateZ: 0, zoom: 1 };

  return (
    <div 
      className="relative outline-none select-none touch-none flex items-center justify-center"
      tabIndex={0}
      style={{ 
        width: P_WIDTH, 
        height: P_HEIGHT,
        perspective: '1200px'
      }}
    >
      <div
        ref={boardRef}
        className="absolute inset-0 shadow-2xl"
        style={{
          background: templateStyle.background,
          boxShadow: templateStyle.shadow,
          transformStyle: 'preserve-3d',
          transform: `translate(${-(camera.panX || 0)}px, ${-(camera.panY || 0)}px) scale(${camera.zoom}) rotateX(${camera.rotateX}deg) rotateZ(${camera.rotateZ}deg)`,
          transition: draggingPlayerId ? 'none' : `transform ${currentSlide.transitionSpeed ?? 0.5}s ease-in-out`
        }}
      >
        {/* Interaction Overlay - Captures all pointer events accurately in local 3D space */}
        <div 
           className="absolute inset-0 z-50 touch-none"
           style={{ 
              cursor: activeTool === ToolType.ERASER 
                  ? 'none'
                  : activeTool === ToolType.SELECT 
                  ? (draggingPlayerId ? 'grabbing' : (hoverPos && getPlayerAtPosition(hoverPos) ? 'grab' : 'default')) 
                  : 'crosshair' 
           }}
           onPointerDown={handlePointerDown}
           onPointerMove={handlePointerMove}
           onPointerUp={handlePointerUp}
           onPointerLeave={(e) => {
               setHoverPos(null);
               if (isDrawing && activeTool !== ToolType.POLYGON) {
                 handlePointerUp(e);
               }
           }}
           onDoubleClick={handleDoubleClick}
           onContextMenu={(e) => {
             e.preventDefault();
             const pos = getMappedPointerPosition(e);
             
             // Global disconnect logic: Right click on player always disconnects first
             const foundPlayerId = getPlayerAtPosition(pos);
             if (foundPlayerId) {
                 let disconnected = false;
                 if (onUpdateDrawings) {
                     const updates: {id: string, updater: (d: Drawing) => Drawing}[] = [];
                     currentSlide.drawings.forEach(d => {
                         if (d.points.some(p => p.attachedToPlayerId === foundPlayerId)) {
                             updates.push({
                                 id: d.id,
                                 updater: (d_: Drawing) => ({
                                     ...d_,
                                     points: d_.points.map(p => p.attachedToPlayerId === foundPlayerId ? { x: p.x, y: p.y } : p)
                                 })
                             });
                         }
                     });
                     if (updates.length > 0) {
                         onUpdateDrawings(updates, false);
                         disconnected = true;
                         setAttachedAnimationId(foundPlayerId);
                         setTimeout(() => setAttachedAnimationId(null), 1000);
                     }
                 }
                 if (disconnected) return;
             }

             if (activeTool === ToolType.POLYGON && polyPoints.length > 0) {
               setPolyPoints([]);
               setPolyPreviewPos(null);
               return;
             }
             if (activeTool === ToolType.SELECT) {
                
                // First check if right clicking on a motion path of a selected player
                if (selectedPlayerIds.length > 0 && previousSlide) {
                  for (const playerId of selectedPlayerIds) {
                    const currentPos = currentSlide.positions[playerId];
                    const prevPos = previousSlide.positions[playerId];
                    if (currentPos && prevPos && (currentPos.x !== prevPos.x || currentPos.y !== prevPos.y)) {
                       const cps = getPlayerMotionPath(prevPos, currentPos);
                       const bezierPoints = [prevPos, ...cps, currentPos];
                       
                       // Check if clicked on a control point
                       let foundCpIndex = -1;
                       for (let i = 0; i < cps.length; i++) {
                         if (Math.hypot(cps[i].x - pos.x, cps[i].y - pos.y) < 15) {
                           foundCpIndex = i;
                           break;
                         }
                       }
                       if (foundCpIndex !== -1) {
                         setContextMenu({ x: Math.min(e.clientX, window.innerWidth - 140), y: Math.min(e.clientY, window.innerHeight - 120), boardPos: pos, playerId, pointIndex: foundCpIndex });
                         return;
                       }
                       
                       // Check if clicked near the path
                       let isNearPath = false;
                       let lastPt = getBezierPoint(bezierPoints, 0);
                        for (let i = 1; i <= 100; i++) {
                          const pt = getBezierPoint(bezierPoints, i / 100);
                          if (pointToLineSegmentDistance(pos, lastPt, pt) < 20) {
                            isNearPath = true;
                            break;
                          }
                          lastPt = pt;
                        }
                       
                       if (isNearPath) {
                         setContextMenu({ x: Math.min(e.clientX, window.innerWidth - 140), y: Math.min(e.clientY, window.innerHeight - 120), boardPos: pos, playerId, isCurve: true });
                         return;
                       }
                    }
                  }
                }

                // Disconnect logic was moved to top of onContextMenu.
                // If it reaches here, no disconnection happened, so open edit menu.
                if (foundPlayerId) {
                    if (selectedPlayerIds.includes(foundPlayerId) && selectedPlayerIds.length > 1) {
                        onEditPlayer(selectedPlayerIds);
                    } else {
                        onEditPlayer([foundPlayerId]);
                    }
                    return;
                }

                // Check if right-clicked on a drawing
                for (let i = currentSlide.drawings.length - 1; i >= 0; i--) {
                  const d = currentSlide.drawings[i];
                  let foundDrawing = false;
                  if (d.type === ToolType.CONNECTOR) {
                    const p1 = currentSlide.positions[d.props?.startPlayerId];
                    const p2 = currentSlide.positions[d.props?.endPlayerId];
                    if (p1 && p2 && pointToLineSegmentDistance(pos, p1, p2) < 15) {
                       foundDrawing = true;
                    }
                  } else if (d.type === ToolType.PEN || d.type === ToolType.LINE || d.type === ToolType.ARROW || d.type === ToolType.CURVE_ARROW || d.type === ToolType.POLYGON || d.type === ToolType.CIRCLE) {
                    let lastPt = d.points[0];
                    for (let j = 1; j < d.points.length; j++) {
                      if (pointToLineSegmentDistance(pos, lastPt, d.points[j]) < 10) {
                         foundDrawing = true;
                         break;
                      }
                      lastPt = d.points[j];
                    }
                  } else if (isPointItem(d.type)) {
                    const radius = getPointItemRadius(d.type);
                    if (d.points[0] && Math.hypot(d.points[0].x - pos.x, d.points[0].y - pos.y) < radius) {
                       foundDrawing = true;
                    }
                  } else if (d.type === ToolType.TEXT) {
                     if (d.points[0] && Math.hypot(d.points[0].x - pos.x, d.points[0].y - pos.y) < 30) {
                        foundDrawing = true;
                     }
                  } else {
                    for (const p of d.points) {
                      if (Math.hypot(p.x - pos.x, p.y - pos.y) < 15) {
                         foundDrawing = true;
                         break;
                      }
                    }
                  }
                  
                  if (foundDrawing) {
                    setContextMenu({ x: Math.min(e.clientX, window.innerWidth - 200), y: Math.min(e.clientY, window.innerHeight - 200), boardPos: pos, drawingId: d.id });
                    return;
                  }
                }
             }
           }}
        />

        {/* Canvas Renderer replaces old DOM rendering */}
        <canvas
          ref={canvasRef}
          className="absolute inset-0 z-0"
          style={{ width: P_WIDTH, height: P_HEIGHT }}
          width={P_WIDTH * ((window.devicePixelRatio || 1) * boardScale * (camera.zoom || 1))}
          height={P_HEIGHT * ((window.devicePixelRatio || 1) * boardScale * (camera.zoom || 1))}
        />

        {isMultiSelected && (
           <div className="absolute inset-0 bg-[#080b12]/60 backdrop-blur-[2px] z-50 flex items-center justify-center pointer-events-none rounded-2xl overflow-hidden">
              <div className="flex flex-col items-center gap-4 bg-[#0e1422] p-8 rounded-2xl border border-[#263351] shadow-2xl">
                 <div className="w-16 h-16 rounded-full bg-[#263351]/50 flex items-center justify-center">
                    <svg className="w-8 h-8 text-[#8e9ab2]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                 </div>
                 <div className="text-center">
                    <h3 className="text-white font-bold text-lg">Multi-Slide Editing Active</h3>
                    <p className="text-slate-400 text-sm mt-1 max-w-[250px]">
                       Field editing is locked. You can only adjust global settings.
                    </p>
                 </div>
              </div>
           </div>
        )}

        {editingTextId && (() => {
           const d = currentSlide.drawings.find(x => x.id === editingTextId);
           if (!d || d.type !== ToolType.TEXT || !d.points[0]) return null;
           const P = makeP(P_WIDTH, P_HEIGHT, project.pitchView);
           const p = P(d.points[0].x / P_WIDTH, d.points[0].y / P_HEIGHT);
           return (
               <div
                   className="absolute z-[60]"
                   style={{
                       left: p.x,
                       top: p.y - (d.props?.fontSize || 28), // adjust for baseline
                       pointerEvents: 'auto',
                   }}
                   onPointerDown={e => e.stopPropagation()}
               >
                   <textarea
                       ref={el => {
                           if (el && !el.dataset.focused) {
                               el.dataset.focused = 'true';
                               setTimeout(() => {
                                   el.focus({ preventScroll: true });
                                   el.setSelectionRange(el.value.length, el.value.length);
                               }, 50);
                           }
                           if (el) {
                               el.style.height = '0px';
                               el.style.height = Math.max(el.scrollHeight, (d.props?.fontSize || 28) * 1.2) + 'px';
                           }
                       }}
                       value={d.text || ''}
                       onChange={e => {
                           if (onUpdateDrawing) {
                               onUpdateDrawing(d.id, old => ({ ...old, text: e.target.value }), true);
                           }
                       }}
                       onBlur={() => {
                           setEditingTextId(null);
                           if (!d.text?.trim() && onUpdateDrawing) {
                               onDelete(d.id, 'drawing');
                           } else if (onUpdateDrawing) {
                               // Push final state to history
                               onUpdateDrawing(d.id, old => ({ ...old, text: d.text }), false);
                           }
                       }}
                       onKeyDown={e => {
                           if (e.key === 'Enter' && !e.shiftKey) {
                               e.preventDefault();
                               setEditingTextId(null);
                               if (!d.text?.trim()) {
                                   onDelete(d.id, 'drawing');
                               } else if (onUpdateDrawing) {
                                   onUpdateDrawing(d.id, old => ({ ...old, text: d.text }), false);
                               }
                           }
                       }}
                       className="bg-transparent outline-none border border-dashed border-white/50 resize-none overflow-hidden block"
                       style={{
                           color: d.color,
                           fontSize: `${d.props?.fontSize || 28}px`,
                           fontWeight: 'bold',
                           fontFamily: d.props?.fontFamily || '"Plus Jakarta Sans", system-ui, sans-serif',
                           minWidth: '50px',
                           padding: 0,
                           margin: 0,
                           lineHeight: '1.2'
                       }}
                   />
                   <div className="absolute top-full left-0 mt-1.5 flex items-center gap-2 text-[9px] text-white/50 bg-[#0e1422]/80 px-2 py-1 rounded shadow-lg pointer-events-none whitespace-nowrap backdrop-blur border border-white/5 select-none">
                       <span className="flex items-center gap-1.5"><kbd className="font-sans font-bold bg-white/10 px-1 py-px rounded text-white/80">Enter</kbd> to save</span>
                       <span className="flex items-center gap-1.5"><kbd className="font-sans font-bold bg-white/10 px-1 py-px rounded text-white/80">Shift + Enter</kbd> for new line</span>
                   </div>
               </div>
           )
        })()}
      </div>
      
      {contextMenu && createPortal(
        <div 
          className="fixed z-[9999] bg-[#0e1422] border border-[#263351] shadow-xl rounded-md py-1 min-w-[120px] text-xs text-white"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onPointerDown={(e) => e.stopPropagation()}
          onContextMenu={(e) => e.preventDefault()}
        >
          {contextMenu.drawingId ? (
            (() => {
                const d = currentSlide.drawings.find(x => x.id === contextMenu.drawingId);
                if (!d) return null;
                const fonts = [
                    '"Gotham", system-ui, sans-serif',
                    'Arial, sans-serif',
                    '"Courier New", monospace',
                    'Georgia, serif',
                    '"Times New Roman", serif',
                    'Verdana, sans-serif',
                    '"Trebuchet MS", sans-serif',
                    'Impact, sans-serif',
                    '"Comic Sans MS", cursive',
                    '"Lucida Console", monospace'
                ];
                return (
                    <div className="px-2 py-1 space-y-2 w-[160px]">
                        <div className="text-[10px] uppercase font-bold text-slate-400 mb-1 tracking-wider">Properties</div>
                        
                        <div className="flex flex-wrap gap-1 mb-2">
                            {customColors.map((c, idx) => (
                                <button
                                   key={idx}
                                   className="w-5 h-5 rounded border border-black/20 hover:scale-110 transition-transform"
                                   style={{ backgroundColor: c, outline: d.color === c ? '2px solid #c0fa4a' : 'none', outlineOffset: '1px' }}
                                   onClick={() => {
                                       if (d.type === ToolType.CONNECTOR && onUpdateDrawings) {
                                            const chainIds = getConnectorChain(d.id, currentSlide.drawings);
                                            onUpdateDrawings(chainIds.map(id => ({ id, updater: old => ({ ...old, color: c }) })), false);
                                       } else if (onUpdateDrawing) {
                                           onUpdateDrawing(d.id, old => ({ ...old, color: c }), false);
                                       }
                                   }}
                                />
                            ))}
                        </div>
                        
                        {d.type === ToolType.TEXT && (
                           <div>
                               <div className="text-[10px] text-slate-400 mb-1">Font</div>
                               <select 
                                  value={d.props?.fontFamily || fonts[0]}
                                  onChange={(e) => {
                                      if (onUpdateDrawing) {
                                          onUpdateDrawing(d.id, old => ({ ...old, props: { ...old.props, fontFamily: e.target.value } }), false);
                                      }
                                  }}
                                  className="w-full bg-[#1a233a] border border-[#263351] rounded text-[10px] p-1.5 outline-none text-slate-200 mb-2"
                               >
                                  {fonts.map((f, i) => <option key={i} value={f}>{f.split(',')[0].replace(/"/g, '')}</option>)}
                               </select>
                               
                               <div className="text-[10px] text-slate-400 mb-1 flex justify-between">
                                  <span>Size</span>
                                  <span className="text-[#c0fa4a]">{d.props?.fontSize || 28}px</span>
                               </div>
                               <input 
                                  type="range" 
                                  min="12" 
                                  max="72" 
                                  step="2"
                                  value={d.props?.fontSize || 28}
                                  onChange={(e) => {
                                      if (onUpdateDrawing) {
                                          onUpdateDrawing(d.id, old => ({ ...old, props: { ...old.props, fontSize: parseInt(e.target.value, 10) } }), false);
                                      }
                                  }}
                                  className="w-full accent-[#c0fa4a] h-1.5 bg-[#1a233a] rounded-lg appearance-none cursor-pointer"
                               />
                           </div>
                        )}
                        
                        {(d.type === ToolType.LINE || d.type === ToolType.ARROW || d.type === ToolType.CURVE_ARROW || d.type === ToolType.CONNECTOR) && (
                           <div>
                               <div className="text-[10px] text-slate-400 mb-1">Style</div>
                               <select
                                  value={d.props?.strokeStyle || 'solid'}
                                  onChange={(e) => {
                                      if (d.type === ToolType.CONNECTOR && onUpdateDrawings) {
                                          const chainIds = getConnectorChain(d.id, currentSlide.drawings);
                                          onUpdateDrawings(chainIds.map(id => ({ id, updater: old => ({ ...old, props: { ...old.props, strokeStyle: e.target.value } }) })), false);
                                      } else if (onUpdateDrawing) {
                                          onUpdateDrawing(d.id, old => ({ ...old, props: { ...old.props, strokeStyle: e.target.value } }), false);
                                      }
                                  }}
                                  className="w-full bg-[#1a233a] border border-[#263351] rounded text-[10px] p-1.5 outline-none text-slate-200"
                               >
                                  <option value="solid">Solid Line</option>
                                  <option value="dashed">Dashed Line</option>
                               </select>
                           </div>
                        )}
                        
                        {(d.type === ToolType.POLYGON || d.type === ToolType.CIRCLE) && (
                           <div>
                               <div className="text-[10px] text-slate-400 mb-1">Fill</div>
                               <select
                                  value={d.props?.fillStyle || ''}
                                  onChange={(e) => {
                                      if (onUpdateDrawing) {
                                          onUpdateDrawing(d.id, old => ({ ...old, props: { ...old.props, fillStyle: e.target.value } }), false);
                                      }
                                  }}
                                  className="w-full bg-[#1a233a] border border-[#263351] rounded text-[10px] p-1.5 outline-none text-slate-200"
                               >
                                  <option value="">Default Fill</option>
                                  <option value="none">No Fill</option>
                                  <option value="solid">Solid Fill</option>
                                  <option value="stripes">Stripes Fill</option>
                               </select>
                           </div>
                        )}
                        
                        {(isPointItem(d.type)) && (
                           <div>
                               <div className="text-[10px] text-slate-400 mb-1">Scale</div>
                               <input
                                  type="range"
                                  min="0.5" max="3" step="0.1"
                                  value={d.props?.scale || 1}
                                  onChange={(e) => {
                                      if (onUpdateDrawing) {
                                          onUpdateDrawing(d.id, old => ({ ...old, props: { ...old.props, scale: parseFloat(e.target.value) } }), false);
                                      }
                                  }}
                                  className="w-full accent-[#c0fa4a]"
                               />
                           </div>
                        )}
                        
                        {([ToolType.PEN, ToolType.ARROW, ToolType.CURVE_ARROW, ToolType.LINE, ToolType.POLYGON, ToolType.CIRCLE].includes(d.type) || isPointItem(d.type)) && (
                           <div className="pt-2">
                               <label className="flex items-center gap-2 cursor-pointer group">
                                   <input 
                                      type="checkbox" 
                                      className="hidden" 
                                      checked={d.props?.attachToPlayer !== false}
                                      onChange={(e) => {
                                          if (onUpdateDrawing) {
                                              onUpdateDrawing(d.id, old => ({ ...old, props: { ...old.props, attachToPlayer: e.target.checked } }), false);
                                          }
                                      }}
                                   />
                                   <div className={`w-8 h-4 rounded-full transition-colors relative ${d.props?.attachToPlayer !== false ? 'bg-[#c0fa4a]' : 'bg-[#263351]'}`}>
                                       <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${d.props?.attachToPlayer !== false ? 'translate-x-4' : 'translate-x-0'}`}></div>
                                   </div>
                                   <span className="text-[10px] text-slate-300 font-medium group-hover:text-white transition-colors">Attach to player</span>
                               </label>
                           </div>
                        )}
                        
                        <div className="pt-2 border-t border-[#263351] mt-2">
                            <button
                               className="w-full text-left px-2 py-1.5 text-[#ef4444] hover:bg-[#ef4444]/20 rounded text-[10px] font-bold"
                               onClick={() => {
                                   onDelete(d.id, 'drawing');
                                   setContextMenu(null);
                               }}
                            >
                               Delete Object
                            </button>
                        </div>
                    </div>
                );
            })()
          ) : (
            <>
              {contextMenu.pointIndex !== undefined && (
                 <button 
                   className="w-full text-left px-3 py-1.5 hover:bg-[#263351] text-slate-200"
                   onClick={() => {
                      if (!contextMenu.playerId) return;
                      const currentPos = currentSlide.positions[contextMenu.playerId];
                      const prevPos = previousSlide?.positions[contextMenu.playerId];
                      if (currentPos && prevPos) {
                         const cps = getPlayerMotionPath(prevPos, currentPos);
                         const newCps = [...cps];
                         newCps.splice(contextMenu.pointIndex!, 1);
                         onUpdatePositions([{id: contextMenu.playerId, pos: { ...currentPos, motionPath: newCps }}], false);
                      }
                      setContextMenu(null);
                   }}
                 >
                   Delete Point
                 </button>
              )}
              {contextMenu.isCurve && (
                 <button 
                   className="w-full text-left px-3 py-1.5 hover:bg-[#263351] text-slate-200 flex items-center justify-between"
                   onClick={() => {
                      if (!contextMenu.playerId) return;
                      const currentPos = currentSlide.positions[contextMenu.playerId];
                      const prevPos = previousSlide?.positions[contextMenu.playerId];
                      if (currentPos && prevPos) {
                         const cps = getPlayerMotionPath(prevPos, currentPos);
                         const newCps = [...cps, contextMenu.boardPos];
                         // Sort by distance to start point so the curve doesn't twist back on itself
                         newCps.sort((a, b) => Math.hypot(a.x - prevPos.x, a.y - prevPos.y) - Math.hypot(b.x - prevPos.x, b.y - prevPos.y));
                         onUpdatePositions([{id: contextMenu.playerId, pos: { ...currentPos, motionPath: newCps }}], false);
                      }
                      setContextMenu(null);
                   }}
                 >
                   <span>Add Point</span>
                   <span className="text-[#c0fa4a] text-lg leading-none">+</span>
                 </button>
              )}
              {contextMenu.playerId && (
                 <button 
                   className="w-full text-left px-3 py-1.5 hover:bg-[#263351] text-[#ef4444]"
                   onClick={() => {
                      if (!contextMenu.playerId) return;
                      const currentPos = currentSlide.positions[contextMenu.playerId];
                      onUpdatePositions([{id: contextMenu.playerId, pos: { ...currentPos, motionPath: [] }}], false);
                      setContextMenu(null);
                   }}
                 >
                   Make Straight
                 </button>
              )}
            </>
          )}
        </div>,
        document.body
      )}
    </div>
  );
};

export default Board;
