import { useState } from 'react';
import { INITIAL_PROJECT, INITIAL_PLAYER_POSITIONS, PITCH_WIDTH, PITCH_HEIGHT, FORMATIONS } from '../constants';
import { Project, TeamSide, ToolType, Point, Drawing, Slide, PlayerRole, PlayerPosition, PlayerVisuals } from '../types';

export const useProjectActions = (
  project: Project,
  updateProject: (fn: (p: Project) => void, replaceHistory?: boolean) => void,
  setHistoryState: any,
  setBackgroundImage: (bg: string | null) => void
) => {

  const [pendingSwap, setPendingSwap] = useState<{
      type: 'roster' | 'board';
      playerAId?: string;
      playerBId?: string;
      side?: TeamSide;
      oldIndex?: number;
      newIndex?: number;
      originalPosA?: Point;
  } | null>(null);
  
  const [slideToDelete, setSlideToDelete] = useState<string[] | null>(null);

  const confirmStartNew = () => {
    setHistoryState({ list: [JSON.parse(JSON.stringify(INITIAL_PROJECT))], index: 0 });
    setBackgroundImage(null);
  };

  const handleUpdateTeam = (side: TeamSide, updates: any) => {
    updateProject(p => { p.teams[side] = { ...p.teams[side], ...updates }; });
  };

  const handleUpdatePlayer = (side: TeamSide, playerId: string, updates: any) => {
    updateProject(p => {
      const playerIndex = p.teams[side].players.findIndex(pl => pl.id === playerId);
      if (playerIndex !== -1) p.teams[side].players[playerIndex] = { ...p.teams[side].players[playerIndex], ...updates };
    });
  };

  const handleDeployPlayer = (side: TeamSide, playerId: string) => {
    updateProject(p => {
      const selectedIds = p.selectedSlideIds?.length ? p.selectedSlideIds : [p.currentSlideId];
      const primarySlide = p.slides.find(s => s.id === p.currentSlideId);
      if (!primarySlide) return;
      const shouldBeOnField = !primarySlide.positions[playerId];

      selectedIds.forEach(id => {
        const slide = p.slides.find(s => s.id === id);
        if (slide) {
          if (shouldBeOnField) {
            if (!slide.positions[playerId]) {
              const player = p.teams[side].players.find(pl => pl.id === playerId);
              if (player?.lastPos) {
                 slide.positions[playerId] = { ...player.lastPos };
              } else {
                 const offset = Math.random() * 50;
                 const defaultRotation = side === TeamSide.HOME ? 90 : 270;
                 slide.positions[playerId] = {
                    x: INITIAL_PLAYER_POSITIONS[side]?.x !== undefined ? INITIAL_PLAYER_POSITIONS[side].x + offset : 400 + offset,
                    y: (p.pitchHeight || PITCH_HEIGHT) / 2 + offset,
                    rotation: defaultRotation
                 };
              }
            }
          } else {
            delete slide.positions[playerId];
          }
        }
      });
    });
  };

  const handleAddPlayer = (side: TeamSide) => {
    updateProject(p => {
      const newPlayerId = `${side}-pool-${Date.now()}`;
      const newIndex = p.teams[side].players.length + 1;
      p.teams[side].players.push({
        id: newPlayerId, number: newIndex.toString(), name: `Player ${newIndex}`, positionLabel: '', role: PlayerRole.MAIN, isOnField: false,
      });
    });
  };

  const handleReorderPlayers = (side: TeamSide, oldIndex: number, newIndex: number) => {
    setPendingSwap({ type: 'roster', side, oldIndex, newIndex });
  };

  const executeSwapRoster = (side: TeamSide, oldIndex: number, newIndex: number) => {
    updateProject(p => {
      const teamPlayers = p.teams[side].players;
      if (oldIndex === newIndex || oldIndex < 0 || newIndex < 0 || newIndex >= teamPlayers.length) return;
      
      const playerA = teamPlayers[oldIndex];
      const playerB = teamPlayers[newIndex];
      teamPlayers[oldIndex] = playerB;
      teamPlayers[newIndex] = playerA;
      
      const tempIsOnField = playerA.isOnField;
      const tempRole = playerA.role;
      playerA.isOnField = playerB.isOnField;
      playerA.role = playerB.role;
      playerB.isOnField = tempIsOnField;
      playerB.role = tempRole;

      const selectedIds = p.selectedSlideIds?.length ? p.selectedSlideIds : [p.currentSlideId];
      selectedIds.forEach(slideId => {
         const slide = p.slides.find(s => s.id === slideId);
         if (slide) {
            const posA = slide.positions[playerA.id];
            const posB = slide.positions[playerB.id];
            if (posA || posB) {
               const newPosA = posB ? { ...posB } : undefined;
               const newPosB = posA ? { ...posA } : undefined;
               if (newPosA) slide.positions[playerA.id] = newPosA; else delete slide.positions[playerA.id];
               if (newPosB) slide.positions[playerB.id] = newPosB; else delete slide.positions[playerB.id];
            }
         }
      });
    });
  };

  const handleApplyFormation = (side: TeamSide, formationName: string) => {
    const formationPoints = FORMATIONS[formationName];
    if (!formationPoints) return;
    updateProject(p => {
      const currentSlide = p.slides.find(s => s.id === p.currentSlideId);
      if (!currentSlide) return;
      const teamPlayers = p.teams[side].players.filter(pl => pl.role === PlayerRole.MAIN);
      const defaultRotation = side === TeamSide.HOME ? 90 : 270;
      teamPlayers.forEach((player, index) => {
        if (index < formationPoints.length) {
          player.isOnField = true;
          let pos = { ...formationPoints[index] };
          if (side === TeamSide.AWAY) pos.x = PITCH_WIDTH - pos.x;
          const currentH = p.pitchHeight || PITCH_HEIGHT;
          pos.y = pos.y * (currentH / 550);
          const existing = currentSlide.positions[player.id];
          currentSlide.positions[player.id] = { ...pos, rotation: existing?.rotation ?? defaultRotation, scale: existing?.scale || 1, borderColor: existing?.borderColor, namePos: existing?.namePos };
          player.lastPos = { x: pos.x, y: pos.y, rotation: existing?.rotation ?? defaultRotation };
        }
      });
    });
  };

  const handleUpdatePositions = (updates: {id: string, pos: Partial<PlayerPosition>}[], isDragging?: boolean) => {
    updateProject(p => {
      const slide = p.slides.find(s => s.id === p.currentSlideId);
      if (slide) {
        updates.forEach(({id, pos}) => {
          const oldPos = slide.positions[id];
          const dx = pos.x !== undefined ? pos.x - (oldPos?.x || 0) : 0;
          const dy = pos.y !== undefined ? pos.y - (oldPos?.y || 0) : 0;

          slide.positions[id] = { ...slide.positions[id], ...pos };
          [p.teams[TeamSide.HOME], p.teams[TeamSide.AWAY], p.teams[TeamSide.NEUTRAL]].forEach(team => {
               if (team) {
                   const player = team.players.find(pl => pl.id === id);
                   if (player) player.lastPos = { ...player.lastPos, ...pos };
               }
          });
          if (dx !== 0 || dy !== 0) {
              slide.drawings.forEach(d => {
                  let circleCenterMoved = false;
                  d.points.forEach((pt, i) => {
                      if (pt.attachedToPlayerId === id) {
                          if (pos.x !== undefined) pt.x += dx;
                          if (pos.y !== undefined) pt.y += dy;
                          if (d.type === ToolType.CIRCLE && i === 0) circleCenterMoved = true;
                      }
                  });
                  if (circleCenterMoved && d.points.length >= 2 && d.points[1].attachedToPlayerId !== id) {
                      d.points[1].x += dx; d.points[1].y += dy;
                  }
              });
          }
        });
      }
    }, isDragging);
  };

  const handleSwapPositions = (playerAId: string, playerBId: string, originalPosA: Point) => {
    updateProject(p => {
      const slide = p.slides.find(s => s.id === p.currentSlideId);
      if (slide && slide.positions[playerAId]) slide.positions[playerAId] = { ...slide.positions[playerAId], x: originalPosA.x, y: originalPosA.y };
    }, true);
    setPendingSwap({ type: 'board', playerAId, playerBId, originalPosA });
  };

  const executeSwapBoard = (playerAId: string, playerBId: string, originalPosA: Point) => {
    updateProject(p => {
      const slide = p.slides.find(s => s.id === p.currentSlideId);
      if (slide) {
        const posA = originalPosA;
        const posB = slide.positions[playerBId];
        if (posA && posB) {
            slide.positions[playerAId] = { ...slide.positions[playerAId], x: posB.x, y: posB.y };
            slide.positions[playerBId] = { ...posB, x: posA.x, y: posA.y };
            [p.teams[TeamSide.HOME], p.teams[TeamSide.AWAY], p.teams[TeamSide.NEUTRAL]].forEach(team => {
                 if (team) {
                     const pA = team.players.find(pl => pl.id === playerAId);
                     if (pA) pA.lastPos = { ...pA.lastPos, x: posB.x, y: posB.y };
                     const pB = team.players.find(pl => pl.id === playerBId);
                     if (pB) pB.lastPos = { ...pB.lastPos, x: posA.x, y: posA.y };
                 }
            });
        }
      }
    });
  };

  const confirmSwap = () => {
     if (!pendingSwap) return;
     if (pendingSwap.type === 'board' && pendingSwap.playerAId && pendingSwap.playerBId && pendingSwap.originalPosA) {
         executeSwapBoard(pendingSwap.playerAId, pendingSwap.playerBId, pendingSwap.originalPosA);
     } else if (pendingSwap.type === 'roster' && pendingSwap.side && pendingSwap.oldIndex !== undefined && pendingSwap.newIndex !== undefined) {
         executeSwapRoster(pendingSwap.side, pendingSwap.oldIndex, pendingSwap.newIndex);
     }
     setPendingSwap(null);
  };
  
  const cancelSwap = () => setPendingSwap(null);

  const handleUpdateVisuals = (playerId: string, visuals: PlayerVisuals) => {
     updateProject(p => {
        const slide = p.slides.find(s => s.id === p.currentSlideId);
        if (slide && slide.positions[playerId]) {
           slide.positions[playerId] = { ...slide.positions[playerId], ...visuals };
           [p.teams[TeamSide.HOME], p.teams[TeamSide.AWAY], p.teams[TeamSide.NEUTRAL]].forEach(team => {
                if (team) {
                    const player = team.players.find(pl => pl.id === playerId);
                    if (player) player.lastPos = { ...player.lastPos, ...visuals } as any;
                }
           });
        }
     });
  };

  const handleAddDrawing = (drawing: Drawing) => {
    updateProject(p => {
      const slide = p.slides.find(s => s.id === p.currentSlideId);
      if (slide) {
        const existingIndex = slide.drawings.findIndex(d => d.id === drawing.id);
        if (existingIndex !== -1) slide.drawings[existingIndex] = drawing;
        else slide.drawings.push(drawing);
      }
    });
  };

  const handleUpdateDrawing = (drawingId: string, updater: (d: Drawing) => Drawing, isDragging?: boolean) => {
    updateProject(p => {
      const slide = p.slides.find(s => s.id === p.currentSlideId);
      if (slide) {
        const index = slide.drawings.findIndex(d => d.id === drawingId);
        if (index !== -1) slide.drawings[index] = updater(slide.drawings[index]);
      }
    }, isDragging);
  };

  const handleUpdateDrawings = (updates: {id: string, updater: (d: Drawing) => Drawing}[], isDragging?: boolean) => {
    updateProject(p => {
      const slide = p.slides.find(s => s.id === p.currentSlideId);
      if (slide) {
        for (const update of updates) {
          const index = slide.drawings.findIndex(d => d.id === update.id);
          if (index !== -1) slide.drawings[index] = update.updater(slide.drawings[index]);
        }
      }
    }, isDragging);
  };

  const handleClearDrawings = () => {
    updateProject(p => {
        const slide = p.slides.find(s => s.id === p.currentSlideId);
        if (slide) {
            slide.drawings = slide.drawings.filter(d => 
                [ToolType.BALL, ToolType.CONE, ToolType.DISC, ToolType.GOAL, ToolType.GOAL_MINI, ToolType.GOAL_SIDE, ToolType.MANNEQUIN, ToolType.LADDER, ToolType.HURDLE, ToolType.POLE].includes(d.type)
            );
        }
    });
  };

  const handleDeleteItem = (id: string, type: 'player' | 'drawing') => {
    updateProject(p => {
        const selectedIds = p.selectedSlideIds?.length ? p.selectedSlideIds : [p.currentSlideId];
        selectedIds.forEach(slideId => {
            const slide = p.slides.find(s => s.id === slideId);
            if (!slide) return;
            if (type === 'drawing') slide.drawings = slide.drawings.filter(d => d.id !== id);
            else if (type === 'player') delete slide.positions[id];
        });
    });
  };

  const handleAddSlide = () => {
    updateProject(p => {
      const currentSlide = p.slides.find(s => s.id === p.currentSlideId);
      const carryOverDrawings = currentSlide 
        ? currentSlide.drawings.filter(d => [ToolType.BALL, ToolType.CONE, ToolType.DISC, ToolType.GOAL, ToolType.GOAL_MINI, ToolType.GOAL_SIDE, ToolType.MANNEQUIN, ToolType.LADDER, ToolType.HURDLE, ToolType.POLE].includes(d.type))
        : [];
      const newDrawings = JSON.parse(JSON.stringify(carryOverDrawings));
      const newSlide: Slide = {
        id: `slide-${Date.now()}`, name: `Slide ${p.slides.length + 1}`, duration: 5,
        positions: currentSlide ? JSON.parse(JSON.stringify(currentSlide.positions)) : {},
        drawings: newDrawings, 
        camera: currentSlide?.camera ? { ...currentSlide.camera } : { rotateX: 0, rotateY: 0, rotateZ: 0, zoom: 1 }
      };
      Object.values(newSlide.positions).forEach((pos: any) => { if (pos.motionPath) delete pos.motionPath; });
      p.slides.push(newSlide);
      p.currentSlideId = newSlide.id;
      p.selectedSlideIds = [newSlide.id];
    });
  };

  const handleDuplicateSlide = (id: string) => {
    updateProject(p => {
       const selectedIds = p.selectedSlideIds?.length ? p.selectedSlideIds : [id];
       // Only duplicate multiple if the clicked slide is actually among the selected ones
       const idsToDuplicate = selectedIds.includes(id) ? selectedIds : [id];
       
       const indices = idsToDuplicate.map(sid => p.slides.findIndex(s => s.id === sid)).filter(idx => idx !== -1).sort((a, b) => a - b);
       
       if (indices.length > 0) {
          const newSlides: Slide[] = [];
          const newSlideIds: string[] = [];
          
          indices.forEach(idx => {
              const toDup = p.slides[idx];
              const newSlide = JSON.parse(JSON.stringify(toDup));
              newSlide.id = `slide-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
              newSlide.name = `${toDup.name} Copy`;
              if (newSlide.positions) {
                  Object.values(newSlide.positions).forEach((pos: any) => { if (pos.motionPath) delete pos.motionPath; });
              }
              newSlides.push(newSlide);
              newSlideIds.push(newSlide.id);
          });
          
          const insertIdx = indices[indices.length - 1] + 1;
          p.slides.splice(insertIdx, 0, ...newSlides);
          
          p.currentSlideId = newSlideIds[0];
          p.selectedSlideIds = newSlideIds;
       }
    });
  };

  const confirmDeleteSlide = () => {
    if (!slideToDelete || slideToDelete.length === 0) return;
    updateProject(p => {
      if (p.slides.length <= slideToDelete.length) {
        // Prevent deleting all slides, leave at least one. Or just clear the first one?
        // Let's just refuse to delete ALL slides, or if we do, create a new one.
        if (p.slides.length === slideToDelete.length) {
          slideToDelete.pop(); // save one
          if (slideToDelete.length === 0) return;
        }
      }
      
      const slidesToRemove = new Set(slideToDelete);
      
      p.slides = p.slides.filter(s => !slidesToRemove.has(s.id));
      
      if (slidesToRemove.has(p.currentSlideId)) {
        p.currentSlideId = p.slides[p.slides.length - 1].id; // default to last available
      }
      p.selectedSlideIds = [p.currentSlideId];
    });
    setSlideToDelete(null);
  };

  const handleUpdateSlideDuration = (id: string, duration: number) => {
      updateProject(p => {
          const slide = p.slides.find(s => s.id === id);
          if (slide) slide.duration = Math.max(0.5, duration);
      });
  };
  
  const handleReorderSlides = (oldIndex: number, newIndex: number) => {
    updateProject(p => {
       if (oldIndex === newIndex || oldIndex < 0 || newIndex < 0 || newIndex >= p.slides.length) return;
       const [movedSlide] = p.slides.splice(oldIndex, 1);
       p.slides.splice(newIndex, 0, movedSlide);
    });
  };

  const handleUpdateStepDuration = (duration: number) => {
      updateProject(p => {
          const selectedIds = p.selectedSlideIds?.length ? p.selectedSlideIds : [p.currentSlideId];
          selectedIds.forEach(id => {
            const slide = p.slides.find(s => s.id === id);
            if (slide) slide.stepDuration = duration;
          });
      });
  };

  const handleUpdateStepDelay = (delay: number) => {
      updateProject(p => {
          const selectedIds = p.selectedSlideIds?.length ? p.selectedSlideIds : [p.currentSlideId];
          selectedIds.forEach(id => {
            const slide = p.slides.find(s => s.id === id);
            if (slide) slide.stepDelay = delay;
          });
      });
  };

  const handleUpdateTransitionSpeed = (speed: number) => {
      updateProject(p => {
          const selectedIds = p.selectedSlideIds?.length ? p.selectedSlideIds : [p.currentSlideId];
          selectedIds.forEach(id => {
            const slide = p.slides.find(s => s.id === id);
            if (slide) slide.transitionSpeed = speed;
          });
      });
  };

  const handleAspectRatioChange = (ratioType: '16:9' | '4:3' | '1:1' | '9:16' | '21:9' | 'custom' | 'default', customHeight?: number) => {
    updateProject(p => {
      const oldWidth = p.pitchWidth || PITCH_WIDTH;
      const oldHeight = p.pitchHeight || PITCH_HEIGHT;
      let newHeight = oldHeight;
      if (ratioType === '16:9') newHeight = oldWidth * (9 / 16);
      else if (ratioType === '4:3') newHeight = oldWidth * (3 / 4);
      else if (ratioType === '1:1') newHeight = oldWidth;
      else if (ratioType === '9:16') newHeight = oldWidth * (16 / 9);
      else if (ratioType === '21:9') newHeight = oldWidth * (9 / 21);
      else if (ratioType === 'default') newHeight = PITCH_HEIGHT;
      else if (customHeight) newHeight = customHeight;
      
      if (newHeight === oldHeight) return;
      
      const ratioY = newHeight / oldHeight;
      p.pitchHeight = newHeight;
      p.aspectRatio = ratioType;
      
      p.slides.forEach(slide => {
        Object.values(slide.positions).forEach(pos => { pos.y = pos.y * ratioY; });
        slide.drawings.forEach(drawing => {
          drawing.points.forEach(pt => { pt.y = pt.y * ratioY; });
        });
      });
    });
  };

  const handlePitchViewChange = (view: any) => {
    updateProject(p => { p.pitchView = view; });
  };

  return {
    confirmStartNew,
    handleUpdateTeam,
    handleUpdatePlayer,
    handleDeployPlayer,
    handleAddPlayer,
    handleReorderPlayers,
    handleApplyFormation,
    handleUpdatePositions,
    handleSwapPositions,
    confirmSwap,
    cancelSwap,
    pendingSwap,
    handleUpdateVisuals,
    handleAddDrawing,
    handleUpdateDrawing,
    handleUpdateDrawings,
    handleClearDrawings,
    handleDeleteItem,
    handleAddSlide,
    handleDuplicateSlide,
    handleDeleteSlide: (id: string) => {
      const selected = project.selectedSlideIds || [project.currentSlideId];
      if (selected.includes(id) && selected.length > 1) {
        setSlideToDelete(selected);
      } else {
        setSlideToDelete([id]);
      }
    },
    slideToDelete,
    setSlideToDelete,
    confirmDeleteSlide,
    handleUpdateSlideDuration,
    handleReorderSlides,
    handleUpdateStepDuration,
    handleUpdateStepDelay,
    handleUpdateTransitionSpeed,
    handleAspectRatioChange,
    handlePitchViewChange
  };
};
