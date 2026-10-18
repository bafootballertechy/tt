import React, { useState, useRef } from 'react';
import { Project, TeamSide, ToolType, PitchTemplate, PlayerVisuals } from './types';
import Board from './components/Board';
import ToolsPanel from './components/ToolsPanel';
import Timeline from './components/Timeline';
import CoinCustomizer from './components/CoinCustomizer';
import LayerManagerModal from './components/LayerManagerModal';
import Header from './components/Header';
import SidebarLeft from './components/SidebarLeft';
import ExportProgressOverlay from './components/ExportProgressOverlay';
import SwapConfirmationModal from './components/SwapConfirmationModal';
import DeleteSlideModal from './components/DeleteSlideModal';

import { useUIStore } from './store/uiStore';
import { useProjectHistory } from './hooks/useProjectHistory';
import { useProjectActions } from './hooks/useProjectActions';
import { useExportAndPlayback } from './hooks/useExportAndPlayback';
import { useBoardResize } from './hooks/useBoardResize';

import { INITIAL_PROJECT } from './constants';

interface TacticalBoardProps {
  onBackToHome?: () => void;
  onNavigateTab?: (tab: 'games' | 'batches' | 'board') => void;
  boardProjectId?: string;
  initialProjectData?: Project;
  onSaveBoardProject?: (updatedProject: Project) => void;
}

const TacticalBoard: React.FC<TacticalBoardProps> = ({ 
  onBackToHome, 
  onNavigateTab,
  boardProjectId,
  initialProjectData,
  onSaveBoardProject
}) => {
  const {
    activeLeftTab, setActiveLeftTab,
    activeTool, setActiveTool,
    drawingColor, setDrawingColor,
    customColors, setCustomColors,
    drawingStrokeWidth, setDrawingStrokeWidth,
    drawingStrokeStyle, setDrawingStrokeStyle,
    drawingFillStyle, setDrawingFillStyle,
    drawingFontFamily, setDrawingFontFamily,
    equipmentAngle, setEquipmentAngle,
    equipmentScale, setEquipmentScale,
    pitchTemplate, setPitchTemplate,
    showPanels, setShowPanels,
    backgroundImage, setBackgroundImage
  } = useUIStore();
  
  const [editingPlayerIds, setEditingPlayerIds] = useState<string[]>([]);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showLayerManager, setShowLayerManager] = useState(false);
  const [showNewProjectConfirm, setShowNewProjectConfirm] = useState(false);

  const [isPlaying, setIsPlayingState] = useState(false);
  const [isRecording, setIsRecordingState] = useState(false);

  const {
    historyState, setHistoryState, baseProject, isDbLoaded, saveError, handleUndo, handleRedo, updateProject
  } = useProjectHistory(isPlaying, isRecording, boardProjectId, initialProjectData, onSaveBoardProject);

  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Avoid triggering when typing in inputs
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement || (e.target as HTMLElement).isContentEditable) return;

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        // Select all slides
        e.preventDefault();
        updateProject(p => { p.selectedSlideIds = p.slides.map(s => s.id); }, true);
      } else if (e.key === 'Escape') {
        // Deselect all and only keep current
        if (baseProject?.selectedSlideIds && baseProject.selectedSlideIds.length > 1) {
           e.preventDefault();
           updateProject(p => { p.selectedSlideIds = [p.currentSlideId]; }, true);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [baseProject, setHistoryState]);

  const {
    confirmStartNew, handleUpdateTeam, handleUpdatePlayer, handleDeployPlayer, handleAddPlayer, handleReorderPlayers, handleApplyFormation,
    handleUpdatePositions, handleSwapPositions, confirmSwap, cancelSwap, pendingSwap, handleUpdateVisuals, handleAddDrawing, handleUpdateDrawing,
    handleUpdateDrawings, handleClearDrawings, handleDeleteItem, handleAddSlide, handleDuplicateSlide, handleDeleteSlide, slideToDelete, setSlideToDelete, confirmDeleteSlide,
    handleUpdateSlideDuration, handleReorderSlides, handleUpdateStepDuration, handleUpdateStepDelay, handleUpdateTransitionSpeed,
    handleAspectRatioChange, handlePitchViewChange
  } = useProjectActions(baseProject, updateProject, setHistoryState, setBackgroundImage);

  const currentSlideData = baseProject?.slides.find(s => s.id === baseProject.currentSlideId);
  const currentSlideHasAnimSteps = currentSlideData?.positions ? Object.values(currentSlideData.positions).some(p => (p as any).animationOrder > 0) || (currentSlideData.drawings || []).some(d => (d as any).animationOrder > 0) : false;

  const coinSettings = currentSlideData?.coinSettings || {
    showName: true, showNumber: true, showPositionLabel: false, shape: 'circle', globalScale: 1, globalTextScale: 1, globalNamePos: 'bottom', orientation: 'normal',
    trails: { enabled: false, style: 'solid', color: '#fbbf24', opacity: 0.6 },
    motionPaths: { enabled: true, color: '#ef4444' }
  };

  const {
    isPlaying: hookIsPlaying, setIsPlaying: setHookIsPlaying, playbackSlideId,
    isRecording: hookIsRecording, exportProgress, exportQuality, setExportQuality, exportFps, setExportFps, exportFormat, setExportFormat,
    startRecording, stopRecording, handleExportImage
  } = useExportAndPlayback(baseProject, coinSettings, backgroundImage, pitchTemplate, historyState.list, historyState.index);

  // Sync state between hooks
  React.useEffect(() => setIsPlayingState(hookIsPlaying), [hookIsPlaying]);
  React.useEffect(() => setIsRecordingState(hookIsRecording), [hookIsRecording]);

  const project = playbackSlideId ? {
      ...baseProject,
      currentSlideId: playbackSlideId,
      selectedSlideIds: [playbackSlideId]
  } : baseProject;

  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const boardScale = useBoardResize(canvasContainerRef, project.pitchWidth, project.pitchHeight, project.pitchView, isFullscreen);

  if (!isDbLoaded) {
    return (
      <div className="flex flex-col h-screen bg-[#080b12] text-slate-100 font-sans items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#1c2438] border-t-[#c0fa4a] rounded-full animate-spin mb-4"></div>
        <p className="text-slate-400 font-medium">Loading Tactical Board...</p>
      </div>
    );
  }

  const handleUpdateCoinSettings = (updates: any) => {
    updateProject(p => {
      const selectedIds = p.selectedSlideIds?.length ? p.selectedSlideIds : [p.currentSlideId];
      selectedIds.forEach(id => {
        const slide = p.slides.find(s => s.id === id);
        if (slide) slide.coinSettings = typeof updates === 'function' ? updates(slide.coinSettings || coinSettings) : { ...(slide.coinSettings || coinSettings), ...updates };
      });
    });
  };

  const currentSlideIndex = project.slides.findIndex(s => s.id === project.currentSlideId);
  const previousSlide = currentSlideIndex > 0 ? project.slides[currentSlideIndex - 1] : null;

  return (
    <div className="flex flex-col h-screen bg-[#080b12] text-slate-100 font-sans overflow-hidden">
      {!isFullscreen && (
        <Header 
          projectName={project.name || ''}
          onUpdateProjectName={(name) => updateProject(p => { p.name = name; })}
          saveError={saveError} historyIndex={historyState.index} historyLength={historyState.list.length}
          exportFormat={exportFormat} setExportFormat={setExportFormat} exportQuality={exportQuality} setExportQuality={setExportQuality} exportFps={exportFps} setExportFps={setExportFps} isRecording={isRecording}
          onStartNew={() => setShowNewProjectConfirm(true)}
          onExportJSON={() => {
            const data = JSON.stringify(historyState.list[historyState.index]);
            const blob = new Blob([data], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url;
            const safeName = (project.name || 'tactico-project').replace(/[^a-z0-9]/gi, '_').toLowerCase();
            a.download = `${safeName}-${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
          }}
          onImportJSON={(e) => {
             const file = e.target.files?.[0];
             if (!file) return;
             const reader = new FileReader();
             reader.onload = (e) => {
                try {
                   const parsed = JSON.parse(e.target?.result as string);
                   setHistoryState({ list: [parsed], index: 0 });
                   setBackgroundImage(null);
                } catch (err) { alert("Failed to parse project file."); }
             };
             reader.readAsText(file); e.target.value = '';
          }}
          onExportImage={handleExportImage}
          onUndo={handleUndo} onRedo={handleRedo} onFullscreen={() => setIsFullscreen(true)}
          onStartRecording={startRecording} onStopRecording={stopRecording}
          showPanels={showPanels} onTogglePanels={() => setShowPanels(!showPanels)}
          onBackToHome={onBackToHome}
        />
      )}

      <div className="flex flex-1 overflow-hidden relative">
        {!isFullscreen && showPanels && (
          <SidebarLeft 
            activeLeftTab={activeLeftTab} setActiveLeftTab={setActiveLeftTab} project={project} currentSlide={currentSlideData}
            activeTool={activeTool} setActiveTool={setActiveTool} drawingColor={drawingColor} setDrawingColor={setDrawingColor}
            equipmentAngle={equipmentAngle} setEquipmentAngle={setEquipmentAngle} equipmentScale={equipmentScale} setEquipmentScale={setEquipmentScale}
            onUpdateTeam={handleUpdateTeam}
            onUpdateTeamSettings={(side, updates) => {
               updateProject(p => {
                  const selectedIds = p.selectedSlideIds?.length ? p.selectedSlideIds : [p.currentSlideId];
                  selectedIds.forEach(id => {
                     const slide = p.slides.find(s => s.id === id);
                     if (slide) { if (!slide.teamSettings) slide.teamSettings = {}; slide.teamSettings[side] = { ...(slide.teamSettings[side] || p.teams[side].settings), ...updates }; }
                  });
               });
            }}
            onUpdatePlayer={handleUpdatePlayer} onDeployPlayer={handleDeployPlayer} onApplyFormation={handleApplyFormation}
            onReorderPlayers={handleReorderPlayers} onAddPlayer={handleAddPlayer}
          />
        )}

        <div className={`flex-1 bg-[#080b12] flex items-center justify-center relative overflow-hidden p-4 ${isFullscreen ? 'fixed inset-y-0 left-0 right-64 z-[200]' : ''}`} ref={canvasContainerRef}>
           <div id="tactical-board" className="shadow-[0_0_50px_rgba(0,0,0,0.5)] rounded-lg overflow-hidden ring-1 ring-[#1c2438]" style={{ transform: `scale(${boardScale})`, transformOrigin: 'center', width: project.pitchWidth || 1000, height: project.pitchHeight || 650 }}>
              <Board 
                project={project} activeTool={activeTool} drawingColor={drawingColor} customColors={customColors}
                drawingStrokeWidth={drawingStrokeWidth} drawingStrokeStyle={drawingStrokeStyle} drawingFillStyle={drawingFillStyle} drawingFontFamily={drawingFontFamily}
                equipmentScale={equipmentScale} equipmentAngle={equipmentAngle} coinSettings={coinSettings}
                backgroundImage={backgroundImage} pitchTemplate={pitchTemplate} previousSlide={previousSlide} boardScale={boardScale}
                onUpdatePositions={handleUpdatePositions} onSwapPositions={handleSwapPositions}
                onAddDrawing={handleAddDrawing} onUpdateDrawing={handleUpdateDrawing} onUpdateDrawings={handleUpdateDrawings}
                onEditPlayer={setEditingPlayerIds} onDelete={handleDeleteItem}
                isPlaying={isPlaying}
              />
           </div>

           {isFullscreen && (
               <>
                  <div className="absolute left-6 top-1/2 -translate-y-1/2 flex flex-col gap-3 z-50 max-h-[80vh] overflow-y-auto overflow-x-hidden p-2 scrollbar-none">
                      <button onClick={() => setHookIsPlaying(!isPlaying)} className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 backdrop-blur-md border shadow-lg hover:scale-110 origin-left ${isPlaying ? 'bg-[#ef4444]/90 text-white border-[#ef4444]' : 'bg-[#c0fa4a]/90 text-black border-[#c0fa4a]'}`} title={isPlaying ? "Stop Animation" : "Play Animation"}>
                          {isPlaying ? <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M6 6h12v12H6z"/></svg> : <svg className="w-6 h-6 ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>}
                      </button>
                      <div className="w-8 h-px bg-white/20 mx-auto my-0.5 rounded-full"></div>
                      {project.slides.map((slide, idx) => (
                          <button key={slide.id} onClick={() => {
                                 updateProject(p => { p.currentSlideId = slide.id; p.selectedSlideIds = [slide.id]; }, true);
                             }}
                             className={`w-12 h-12 shrink-0 rounded-xl flex items-center justify-center font-bold text-lg transition-all duration-200 backdrop-blur-md border shadow-lg hover:scale-110 origin-left ${project.currentSlideId === slide.id ? 'bg-[#c0fa4a]/90 text-black border-[#c0fa4a]' : 'bg-black/40 text-white border-white/20 hover:bg-black/60'}`}
                          >
                             {idx + 1}
                          </button>
                      ))}
                      <button onClick={() => handleDuplicateSlide(project.currentSlideId)} className="w-12 h-12 shrink-0 rounded-xl flex items-center justify-center transition-all duration-200 backdrop-blur-md border border-white/20 bg-black/40 text-white shadow-lg hover:scale-110 origin-left hover:bg-black/60 hover:border-white/40">
                          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" /></svg>
                      </button>
                  </div>

                  <div className="absolute right-6 top-1/2 -translate-y-1/2 flex items-start gap-4 z-50">
                      <button onClick={() => setIsFullscreen(false)} className="bg-black/40 hover:bg-black/60 text-white p-3 rounded-xl backdrop-blur-md transition-all z-50 border border-white/10 shadow-lg hover:scale-110 flex items-center justify-center w-12 h-12" title="Exit Full Screen">
                         <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                      <div className="flex flex-col gap-4">
                          <div className="flex flex-col gap-2 bg-black/40 backdrop-blur-md p-2 rounded-xl border border-white/20 shadow-lg">
                             {[
                               {type: ToolType.SELECT, icon: "M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122", name: "Select"},
                               {type: ToolType.PEN, icon: "M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z", name: "Pen"},
                               {type: ToolType.ARROW, icon: "M14 5l7 7m0 0l-7 7m7-7H3", name: "Arrow"},
                               {type: ToolType.CIRCLE, icon: "M21 12a9 9 0 11-18 0 9 9 0 0118 0z", name: "Circle"},
                               {type: ToolType.POLYGON, icon: "M12 2l8.66 5v10L12 22l-8.66-5V7L12 2z", name: "Polygon"},
                               {type: ToolType.CONNECTOR, icon: "M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1", name: "Connect"},
                               {type: ToolType.TEXT, icon: "M4 7V4h16v3M9 20h6M12 4v16", name: "Text"},
                               {type: ToolType.ERASER, icon: "M2.586 15.414l5.829 5.828a2 2 0 002.828 0l8.757-8.757a2 2 0 000-2.828l-5.829-5.828a2 2 0 00-2.828 0L2.586 12.586a2 2 0 000 2.828z M12 20h9", name: "Eraser"}
                             ].map(t => (
                               <button key={t.type} onClick={() => setActiveTool(t.type as ToolType)} className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all duration-200 hover:scale-110 ${activeTool === t.type ? 'bg-[#c0fa4a]/90 text-black' : 'text-white hover:bg-white/20'}`} title={t.name}>
                                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} /></svg>
                               </button>
                             ))}
                          </div>
                          {activeTool !== ToolType.SELECT && (
                              <div className="flex flex-col gap-3 bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/20 shadow-lg">
                                 {customColors.map((c, idx) => (
                                     <button key={idx} onClick={() => setDrawingColor(c)} className={`w-6 h-6 shrink-0 rounded-full mx-auto transition-all duration-200 hover:scale-125 ${drawingColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#1a1a1a] scale-110' : ''}`} style={{ backgroundColor: c }} />
                                 ))}
                              </div>
                          )}
                      </div>
                  </div>
               </>
           )}
        </div>

        {!isFullscreen && showPanels && (
        <div className="h-full bg-[#080b12] border-l border-[#1c2438]">
           <ToolsPanel 
              activeTool={activeTool} setActiveTool={setActiveTool} drawingColor={drawingColor} setDrawingColor={setDrawingColor}
              customColors={customColors} setCustomColors={setCustomColors} drawingStrokeWidth={drawingStrokeWidth} setDrawingStrokeWidth={setDrawingStrokeWidth}
              drawingStrokeStyle={drawingStrokeStyle} setDrawingStrokeStyle={setDrawingStrokeStyle} drawingFillStyle={drawingFillStyle} setDrawingFillStyle={setDrawingFillStyle}
              drawingFontFamily={drawingFontFamily} setDrawingFontFamily={setDrawingFontFamily} coinSettings={coinSettings} setCoinSettings={handleUpdateCoinSettings}
              transitionSpeed={currentSlideData?.transitionSpeed ?? 0.5} setTransitionSpeed={handleUpdateTransitionSpeed}
              stepDuration={currentSlideData?.stepDuration ?? 1.0} setStepDuration={handleUpdateStepDuration}
              stepDelay={currentSlideData?.stepDelay ?? 0.0} setStepDelay={handleUpdateStepDelay}
              hasAnimSteps={currentSlideHasAnimSteps} pitchTemplate={pitchTemplate} setPitchTemplate={setPitchTemplate}
              pitchView={project.pitchView || 'HORIZONTAL'} onPitchViewChange={handlePitchViewChange}
              aspectRatio={project.aspectRatio || 'default'} onAspectRatioChange={handleAspectRatioChange}
              camera={currentSlideData?.camera}
              setCamera={(updates: any) => {
                updateProject(p => {
                  const selectedIds = p.selectedSlideIds?.length ? p.selectedSlideIds : [p.currentSlideId];
                  selectedIds.forEach(id => {
                    const slide = p.slides.find(s => s.id === id);
                    if (slide) {
                      if (!slide.camera) {
                        slide.camera = { rotateX: 0, rotateY: 0, rotateZ: 0, zoom: 1, panX: 0, panY: 0 };
                      }
                      slide.camera = { ...slide.camera, ...updates };
                    }
                  });
                });
              }}
              onBackgroundUpload={(f) => {
                 const reader = new FileReader();
                 reader.onload = (e) => {
                   const dataUrl = e.target?.result as string; setBackgroundImage(dataUrl);
                   const img = new Image();
                   img.onload = () => { const w = img.width; const h = img.height; if (w > 0 && h > 0) handleAspectRatioChange('custom', (project.pitchWidth || 1000) * (h / w)); };
                   img.src = dataUrl;
                 };
                 reader.readAsDataURL(f);
              }}
              hasBackgroundImage={!!backgroundImage} onRemoveBackground={() => { setBackgroundImage(null); handleAspectRatioChange('default'); }}
              onClearDrawings={handleClearDrawings} selectedSlideName={currentSlideData?.name || ''}
              isMultiSelect={project.selectedSlideIds && project.selectedSlideIds.length > 1}
           />
        </div>
        )}
      </div>

      {!isFullscreen && (
      <Timeline 
        onDoubleClickSlide={() => setShowLayerManager(true)} 
        slides={project.slides} currentSlideId={project.currentSlideId} selectedSlideIds={project.selectedSlideIds || [project.currentSlideId]}
        onSelectSlide={(id, multi) => {
             updateProject(p => {
                if (multi) {
                  const currentSelected = p.selectedSlideIds || [p.currentSlideId];
                  if (currentSelected.includes(id)) {
                     p.selectedSlideIds = currentSelected.filter((sid: string) => sid !== id);
                     if (p.selectedSlideIds.length === 0) {
                      p.selectedSlideIds = [id];
                      p.currentSlideId = id;
                    } else if (p.currentSlideId === id) {
                      p.currentSlideId = p.selectedSlideIds[p.selectedSlideIds.length - 1];
                    }
                  } else {
                     p.selectedSlideIds = [...currentSelected, id];
                     p.currentSlideId = id;
                  }
                } else {
                  p.currentSlideId = id;
                  p.selectedSlideIds = [id];
                }
             }, true);
        }}
        onClearSelection={() => {
             updateProject(p => { p.selectedSlideIds = [p.currentSlideId]; }, true);
        }}
        onAddSlide={handleAddSlide} onDuplicateSlide={handleDuplicateSlide} onDeleteSlide={handleDeleteSlide}
        onUpdateDuration={handleUpdateSlideDuration} onReorderSlides={handleReorderSlides}
        onPlay={() => setHookIsPlaying(!isPlaying)} isPlaying={isPlaying}
      />
      )}

      {editingPlayerIds.length > 0 && (
         <CoinCustomizer 
            playerId={editingPlayerIds[0]} 
            playerName={(() => {
               if (editingPlayerIds.length === 0) return "";
               if (editingPlayerIds.length > 1) return `${editingPlayerIds.length} Selected Players`;
               const id = editingPlayerIds[0];
               const p = [...project.teams[TeamSide.HOME].players, ...project.teams[TeamSide.AWAY].players].find(x => x.id === id);
               return p ? p.name : "";
            })()}
            visuals={(() => {
               if (editingPlayerIds.length === 0) return {};
               const slide = project.slides.find(s => s.id === project.currentSlideId);
               return slide?.positions[editingPlayerIds[0]] || {};
            })()}
            onUpdate={(updates) => { editingPlayerIds.forEach(id => handleUpdateVisuals(id, updates)); }}
            onClose={() => setEditingPlayerIds([])}
         />
      )}

      <DeleteSlideModal slideToDelete={slideToDelete} onConfirm={confirmDeleteSlide} onCancel={() => setSlideToDelete(null)} />
      <SwapConfirmationModal pendingSwap={pendingSwap} project={project} onConfirm={confirmSwap} onCancel={cancelSwap} />
      <ExportProgressOverlay isRecording={isRecording} exportProgress={exportProgress} onCancel={stopRecording} />

      {showNewProjectConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-sm shadow-2xl flex flex-col">
            <h2 className="text-lg font-bold text-white mb-2 text-red-400">Start New Project?</h2>
            <p className="text-slate-400 mb-6 text-sm">Are you sure you want to start a new project? All unsaved changes in the current workspace will be permanently lost.</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setShowNewProjectConfirm(false)} className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium rounded-lg border border-slate-600 transition-colors">Cancel</button>
              <button onClick={() => { confirmStartNew(); setShowNewProjectConfirm(false); }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-lg transition-colors">Start New Project</button>
            </div>
          </div>
        </div>
      )}
      {showLayerManager && (
        <LayerManagerModal
          project={project} slideId={project.currentSlideId} onClose={() => setShowLayerManager(false)}
          onUpdateSlide={(id, updates) => {
             updateProject(p => { const slide = p.slides.find(s => s.id === id); if (slide) Object.assign(slide, updates); }, true);
          }}
        />
      )}
    </div>
  );
};

export default TacticalBoard;
export { TacticalBoard };
