import { useUIStore } from "../store/uiStore";

import React, { useState } from 'react';
import { ToolType, CoinSettings, PitchTemplate } from '../types';
import { TOOL_LABELS } from '../constants';

interface ToolsPanelProps {
  setActiveTool: (t: ToolType) => void;
  setDrawingColor: (c: string) => void;
  setCustomColors: (c: string[]) => void;
  setDrawingStrokeWidth: (w: number) => void;
  setDrawingStrokeStyle: (s: 'solid' | 'dashed' | 'dribbling') => void;
  setDrawingFontFamily: (s: string) => void;
  setDrawingFillStyle: (s: 'none' | 'solid' | 'stripes') => void;
  coinSettings: CoinSettings;
  setCoinSettings: (s: CoinSettings | ((prev: CoinSettings) => CoinSettings)) => void;
  transitionSpeed: number;
  setTransitionSpeed: (s: number) => void;
  stepDuration: number;
  setStepDuration: (s: number) => void;
  stepDelay: number;
  setStepDelay: (s: number) => void;
  hasAnimSteps?: boolean;
  setPitchTemplate: (t: PitchTemplate) => void;
  pitchView: string;
  onPitchViewChange: (view: any) => void;
  aspectRatio: string;
  onAspectRatioChange: (type: '16:9' | '4:3' | 'custom' | 'default') => void;
  onBackgroundUpload: (file: File) => void;
  hasBackgroundImage?: boolean;
  onRemoveBackground?: () => void;
  onClearDrawings: () => void;
  selectedSlideName?: string;
  camera?: any;
  setCamera?: (updates: any) => void;
  isMultiSelect?: boolean;
}

const EQUIPMENT_TOOLS = [
  ToolType.CONE, ToolType.DISC, ToolType.GOAL, ToolType.GOAL_MINI, 
  ToolType.GOAL_SIDE, ToolType.MANNEQUIN, ToolType.LADDER, ToolType.HURDLE, ToolType.POLE
];

const ToolsPanel: React.FC<ToolsPanelProps> = ({
  coinSettings,
  setCoinSettings,
  transitionSpeed,
  setTransitionSpeed,
  stepDuration,
  setStepDuration,
  stepDelay,
  setStepDelay,
  hasAnimSteps,
  pitchView,
  onPitchViewChange,
  aspectRatio,
  onAspectRatioChange,
  onBackgroundUpload,
  hasBackgroundImage,
  onRemoveBackground,
  onClearDrawings,
  selectedSlideName,
  camera,
  setCamera,
  isMultiSelect
}) => {
  const { activeTool, setActiveTool, drawingColor, setDrawingColor, customColors, setCustomColors, drawingStrokeWidth, setDrawingStrokeWidth, drawingStrokeStyle, setDrawingStrokeStyle, drawingFillStyle, setDrawingFillStyle, drawingFontFamily, setDrawingFontFamily, drawingTextSize, setDrawingTextSize, attachToPlayer, setAttachToPlayer, pitchTemplate, setPitchTemplate } = useUIStore();
  // Group tools for display
  const tools = [
    ToolType.SELECT, 
    ToolType.TEXT, 
    ToolType.PEN, 
    ToolType.ARROW,
    ToolType.CURVE_ARROW,
    ToolType.LINE,
    ToolType.CIRCLE, 
    ToolType.POLYGON, 
    ToolType.CONNECTOR, 
    ToolType.ERASER
  ];

  const handleColorContextMenu = (e: React.MouseEvent, index: number) => {
    e.preventDefault();
    const input = document.getElementById(`color-picker-${index}`) as HTMLInputElement;
    if (input) {
      if (typeof input.showPicker === 'function') {
        input.showPicker();
      } else {
        input.click();
      }
    }
  };

  const handleColorChange = (index: number, newColor: string) => {
    const newColors = [...customColors];
    newColors[index] = newColor;
    setCustomColors(newColors);
    setDrawingColor(newColor);
  };

  const handleBgChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onBackgroundUpload(e.target.files[0]);
      e.target.value = ''; // Reset input so same file can be selected again
    }
  };

  return (
    <div className="w-64 bg-[#0e1422] border-l border-[#1c2438] p-3 text-slate-200 overflow-y-auto h-full scrollbar-panel flex flex-col gap-4 z-10 shadow-[-4px_0_24px_rgba(0,0,0,0.2)]">
      
      {/* Tools */}
      <div className={isMultiSelect ? 'opacity-30 pointer-events-none transition-opacity' : ''}>
        <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Tools</h3>
        <div className="grid grid-cols-2 gap-1.5 mb-3">
          {tools.map(tool => {
            return (
              <button
                key={tool}
                onClick={() => setActiveTool(tool)}
                className={`px-2 py-1.5 rounded-md text-[10px] font-bold tracking-wide text-left transition-colors flex items-center gap-1.5
                  ${activeTool === tool ? 'bg-[#c0fa4a] text-[#080b12] shadow-[0_0_15px_rgba(192,250,74,0.15)]' : 'bg-[#1a233a] border border-[#263351] text-slate-400 hover:bg-[#263351] hover:text-white'}`}
              >
                {TOOL_LABELS[tool]}
              </button>
            );
          })}
        </div>
        
        <button 
           onClick={onClearDrawings}
           className="w-full text-[10px] font-bold tracking-wider uppercase text-[#ef4444] hover:bg-[#ef4444]/10 py-1.5 rounded-md border border-[#ef4444]/30 transition-colors bg-[#ef4444]/5"
        >
           Clear All Drawings
        </button>
      </div>

      {/* Colors */}
      {activeTool !== ToolType.SELECT && (
        <div className={`space-y-4 ${isMultiSelect ? 'opacity-30 pointer-events-none transition-opacity' : ''}`}>
          <div>
             <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Color</h3>
             <div className="flex gap-2 flex-wrap">
               {customColors.map((c, idx) => (
                 <div key={idx} className="relative">
                   <button
                     onClick={() => setDrawingColor(c)}
                     onContextMenu={(e) => handleColorContextMenu(e, idx)}
                     onDoubleClick={(e) => handleColorContextMenu(e, idx)}
                     className={`w-6 h-6 rounded-full transition-transform flex items-center justify-center ${drawingColor === c ? 'ring-2 ring-white ring-offset-2 ring-offset-[#0e1422] scale-110 shadow-lg' : 'hover:scale-110 shadow-sm'}`}
                     style={{ backgroundColor: c }}
                     title="Double-click or Right-click to customize"
                   />
                   <input
                     id={`color-picker-${idx}`}
                     type="color"
                     value={c}
                     onChange={(e) => handleColorChange(idx, e.target.value)}
                     className="absolute opacity-0 pointer-events-none w-0 h-0"
                   />
                 </div>
               ))}
             </div>
          </div>
          
          {activeTool === ToolType.TEXT && (
              <div className="space-y-4">
                  <div>
                      <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Font Family</h3>
                      <select 
                          value={drawingFontFamily}
                          onChange={(e) => setDrawingFontFamily(e.target.value)}
                          className="w-full bg-[#1a233a] border border-[#263351] rounded-md px-2 py-1.5 text-[10px] outline-none focus:border-[#c0fa4a] text-slate-300"
                      >
                          <option value='"Gotham", system-ui, sans-serif'>Gotham (Default)</option>
                          <option value='Arial, sans-serif'>Arial</option>
                          <option value='"Courier New", monospace'>Courier New</option>
                          <option value='Georgia, serif'>Georgia</option>
                          <option value='"Times New Roman", serif'>Times New Roman</option>
                          <option value='Verdana, sans-serif'>Verdana</option>
                          <option value='"Trebuchet MS", sans-serif'>Trebuchet MS</option>
                          <option value='Impact, sans-serif'>Impact</option>
                          <option value='"Comic Sans MS", cursive'>Comic Sans MS</option>
                          <option value='"Lucida Console", monospace'>Lucida Console</option>
                      </select>
                  </div>
                  <div>
                      <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Text Size <span className="text-[#c0fa4a] ml-1">{drawingTextSize}px</span></h3>
                      <input 
                          type="range" 
                          min="12" 
                          max="72" 
                          step="2"
                          value={drawingTextSize}
                          onChange={(e) => setDrawingTextSize(parseInt(e.target.value, 10))}
                          className="w-full accent-[#c0fa4a] h-1.5 bg-[#0e1422] rounded-lg appearance-none cursor-pointer"
                      />
                  </div>
              </div>
          )}

          {[ToolType.PEN, ToolType.ARROW, ToolType.CURVE_ARROW, ToolType.LINE, ToolType.POLYGON, ToolType.CIRCLE, ToolType.CONNECTOR].includes(activeTool) && (
              <div className="space-y-4">
                  <div>
                      <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Stroke Width</h3>
                      <div className="flex bg-[#1a233a] border border-[#263351] rounded-lg p-1 gap-1">
                          {[2.5, 4, 6.5].map((w) => (
                              <button
                                  key={w}
                                  onClick={() => setDrawingStrokeWidth(w)}
                                  className={`flex-1 flex justify-center items-center py-2 rounded-md transition-colors ${drawingStrokeWidth === w ? 'bg-[#263351]' : 'hover:bg-[#263351]/50'}`}
                              >
                                  <div className="rounded-full bg-white" style={{ width: w + 2, height: w + 2 }}></div>
                              </button>
                          ))}
                      </div>
                  </div>
                  <div>
                      <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Line Style</h3>
                      <div className="flex gap-1.5">
                           <button 
                               onClick={() => setDrawingStrokeStyle('solid')}
                               className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md border ${drawingStrokeStyle === 'solid' ? 'bg-[#c0fa4a] border-[#c0fa4a] text-[#080b12]' : 'bg-[#1a233a] border-[#263351] text-slate-400'}`}
                           >
                               Solid
                           </button>
                           <button 
                               onClick={() => setDrawingStrokeStyle('dashed')}
                               className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md border ${drawingStrokeStyle === 'dashed' ? 'bg-[#c0fa4a] border-[#c0fa4a] text-[#080b12]' : 'bg-[#1a233a] border-[#263351] text-slate-400'}`}
                           >
                               Dashed
                           </button>
                           {(activeTool === ToolType.ARROW || activeTool === ToolType.CURVE_ARROW) && (
                             <button 
                                 onClick={() => setDrawingStrokeStyle('dribbling')}
                                 className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md border ${drawingStrokeStyle === 'dribbling' ? 'bg-[#c0fa4a] border-[#c0fa4a] text-[#080b12]' : 'bg-[#1a233a] border-[#263351] text-slate-400'}`}
                             >
                                 Dribbling
                             </button>
                           )}
                      </div>
                  </div>
              </div>
          )}
          
          {[ToolType.PEN, ToolType.ARROW, ToolType.CURVE_ARROW, ToolType.LINE, ToolType.POLYGON, ToolType.CIRCLE].includes(activeTool) && (
              <div>
                  <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Tool Properties</h3>
                  <label className="flex items-center gap-2 cursor-pointer group mb-2">
                     <input 
                        type="checkbox" 
                        className="hidden" 
                        checked={attachToPlayer}
                        onChange={(e) => setAttachToPlayer(e.target.checked)}
                     />
                     <div className={`w-8 h-4 rounded-full transition-colors relative ${attachToPlayer ? 'bg-[#c0fa4a]' : 'bg-[#263351]'}`}>
                         <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${attachToPlayer ? 'translate-x-4' : 'translate-x-0'}`}></div>
                     </div>
                     <span className="text-[10px] text-slate-300 font-medium group-hover:text-white transition-colors">Attach to player</span>
                 </label>
              </div>
          )}
          
          {[ToolType.POLYGON, ToolType.CIRCLE].includes(activeTool) && (
              <div>
                  <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Fill Style</h3>
                  <div className="flex gap-1.5">
                       <button 
                           onClick={() => setDrawingFillStyle('none')}
                           className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md border ${drawingFillStyle === 'none' ? 'bg-[#c0fa4a] border-[#c0fa4a] text-[#080b12]' : 'bg-[#1a233a] border-[#263351] text-slate-400'}`}
                       >
                           None
                       </button>
                       <button 
                           onClick={() => setDrawingFillStyle('solid')}
                           className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md border ${drawingFillStyle === 'solid' ? 'bg-[#c0fa4a] border-[#c0fa4a] text-[#080b12]' : 'bg-[#1a233a] border-[#263351] text-slate-400'}`}
                       >
                           Solid
                       </button>
                       <button 
                           onClick={() => setDrawingFillStyle('stripes')}
                           className={`flex-1 py-1 text-[9px] font-bold uppercase tracking-wider rounded-md border ${drawingFillStyle === 'stripes' ? 'bg-[#c0fa4a] border-[#c0fa4a] text-[#080b12]' : 'bg-[#1a233a] border-[#263351] text-slate-400'}`}
                       >
                           Stripes
                       </button>
                  </div>
              </div>
          )}
        </div>
      )}
      
      {/* Coin Settings */}
      <div>
        <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Player Display</h3>
        <div className="space-y-3 bg-[#1a233a] p-2.5 rounded-lg border border-[#263351]">
          {/* Global Scale */}
          <div>
             <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Global Size <span className="text-[#c0fa4a] ml-1">{coinSettings.globalScale || 1}x</span></span>
             <input 
               type="range" 
               min="0.5" 
               max="2.0" 
               step="0.1"
               value={coinSettings.globalScale || 1}
               onChange={(e) => setCoinSettings({...coinSettings, globalScale: parseFloat(e.target.value)})}
               className="w-full accent-[#c0fa4a] h-1.5 bg-[#0e1422] rounded-lg appearance-none cursor-pointer"
             />
          </div>
          
          {/* Global Text Scale */}
          <div className="pt-3 border-t border-[#263351]">
             <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-2">Name/Number Text Size <span className="text-[#c0fa4a] ml-1">{coinSettings.globalTextScale || 1}x</span></span>
             <input 
               type="range" 
               min="0.5" 
               max="2.0" 
               step="0.1"
               value={coinSettings.globalTextScale || 1}
               onChange={(e) => setCoinSettings({...coinSettings, globalTextScale: parseFloat(e.target.value)})}
               className="w-full accent-[#c0fa4a] h-1.5 bg-[#0e1422] rounded-lg appearance-none cursor-pointer"
             />
          </div>
        </div>
      </div>

      {/* Animation Settings */}
      <div className={isMultiSelect ? 'opacity-30 pointer-events-none transition-opacity' : ''}>
        <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Animation for {selectedSlideName || 'Selected Slide'}</h3>
        <div className="space-y-3 bg-[#1a233a] p-2.5 rounded-lg border border-[#263351]">
             {/* Timing Controls */}
             {hasAnimSteps ? (
                 <div>
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        <span>Step Duration</span>
                        <span className="text-[#c0fa4a]">{stepDuration}s</span>
                    </div>
                    <input 
                        type="range" 
                        min="0.1" 
                        max="5.0" 
                        step="0.1"
                        value={stepDuration}
                        onChange={(e) => setStepDuration(parseFloat(e.target.value))}
                        className="w-full accent-[#c0fa4a] h-1.5 bg-[#0e1422] rounded-lg appearance-none cursor-pointer mb-3"
                    />
                    
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        <span>Step Delay</span>
                        <span className="text-[#c0fa4a]">{stepDelay}s</span>
                    </div>
                    <input 
                        type="range" 
                        min="0.0" 
                        max="3.0" 
                        step="0.1"
                        value={stepDelay}
                        onChange={(e) => setStepDelay(parseFloat(e.target.value))}
                        className="w-full accent-[#c0fa4a] h-1.5 bg-[#0e1422] rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
             ) : (
                 <div>
                    <div className="flex justify-between text-[9px] font-bold uppercase tracking-wider text-slate-400 mb-2">
                        <span>Speed</span>
                        <span className="text-[#c0fa4a]">{transitionSpeed}s</span>
                    </div>
                    <input 
                        type="range" 
                        min="0.1" 
                        max="2.0" 
                        step="0.1"
                        value={transitionSpeed}
                        onChange={(e) => setTransitionSpeed(parseFloat(e.target.value))}
                        className="w-full accent-[#c0fa4a] h-1.5 bg-[#0e1422] rounded-lg appearance-none cursor-pointer"
                    />
                 </div>
             )}

             {/* Motion Paths Toggle */}
             <div className="pt-3 border-t border-[#263351]">
                 <label className="flex items-center gap-2 cursor-pointer group mb-2">
                    <input 
                       type="checkbox" 
                       className="hidden" 
                       checked={coinSettings.trails.enabled}
                       onChange={(e) => setCoinSettings({
                           ...coinSettings, 
                           trails: {...coinSettings.trails, enabled: e.target.checked},
                           motionPaths: {...(coinSettings.motionPaths || { color: coinSettings.trails.color }), enabled: e.target.checked}
                       })}
                    />
                    <div className={`w-8 h-4 rounded-full transition-colors relative ${coinSettings.trails.enabled ? 'bg-[#c0fa4a]' : 'bg-[#263351]'}`}>
                        <div className={`absolute top-0.5 left-0.5 bg-white w-3 h-3 rounded-full transition-transform ${coinSettings.trails.enabled ? 'translate-x-4' : 'translate-x-0'}`}></div>
                    </div>
                    <span className="text-[10px] text-slate-300 font-medium group-hover:text-white transition-colors">Motion Paths (Appears in video)</span>
                </label>
                
                {coinSettings.trails.enabled && (
                    <div className="pl-6 space-y-2 mt-2">
                        <select 
                            value={coinSettings.trails.style}
                            onChange={(e) => setCoinSettings({...coinSettings, trails: {...coinSettings.trails, style: e.target.value as any}})}
                            className="w-full bg-[#0e1422] border border-[#263351] rounded-md px-2 py-1 text-[10px] outline-none focus:border-[#c0fa4a]"
                        >
                            <option value="solid">Solid</option>
                            <option value="dashed">Dashed</option>
                            <option value="dotted">Dotted</option>
                        </select>
                        <div className="pt-2">
                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block mb-1">Thickness</span>
                            <input 
                                type="range" 
                                min="1" 
                                max="10" 
                                step="1"
                                value={coinSettings.trails.thickness || 5}
                                onChange={(e) => setCoinSettings({...coinSettings, trails: {...coinSettings.trails, thickness: parseInt(e.target.value, 10)}})}
                                className="w-full accent-[#c0fa4a] h-1.5 bg-[#0e1422] rounded-lg appearance-none cursor-pointer"
                            />
                        </div>
                    </div>
                )}
             </div>
        </div>
      </div>

      {/* Camera Settings */}
      <div>
        <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Camera</h3>
        <div className="space-y-3 bg-[#1a233a] p-2.5 rounded-lg border border-[#263351]">
          <div>
             <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex justify-between">
                <span>Zoom</span>
                <span className="text-[#c0fa4a]">{(camera?.zoom ?? 1).toFixed(1)}x</span>
             </span>
             <input 
               type="range" 
               min="0.5" 
               max="3.0" 
               step="0.1"
               value={camera?.zoom ?? 1}
               onChange={(e) => setCamera?.({ zoom: parseFloat(e.target.value) })}
               className="w-full accent-[#c0fa4a] h-1.5 bg-[#0e1422] rounded-lg appearance-none cursor-pointer"
             />
          </div>
          <div className="pt-3 border-t border-[#263351]">
             <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex justify-between">
                <span>Pan X</span>
                <span className="text-[#c0fa4a]">{camera?.panX ?? 0}px</span>
             </span>
             <input 
               type="range" 
               min="-500" 
               max="500" 
               step="10"
               value={camera?.panX ?? 0}
               onChange={(e) => setCamera?.({ panX: parseInt(e.target.value, 10) })}
               className="w-full accent-[#c0fa4a] h-1.5 bg-[#0e1422] rounded-lg appearance-none cursor-pointer"
             />
          </div>
          <div className="pt-3 border-t border-[#263351]">
             <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-2 flex justify-between">
                <span>Pan Y</span>
                <span className="text-[#c0fa4a]">{camera?.panY ?? 0}px</span>
             </span>
             <input 
               type="range" 
               min="-500" 
               max="500" 
               step="10"
               value={camera?.panY ?? 0}
               onChange={(e) => setCamera?.({ panY: parseInt(e.target.value, 10) })}
               className="w-full accent-[#c0fa4a] h-1.5 bg-[#0e1422] rounded-lg appearance-none cursor-pointer"
             />
          </div>
          <div className="pt-3 border-t border-[#263351]">
              <button
                  onClick={() => setCamera?.({ zoom: 1, panX: 0, panY: 0, rotateX: 0, rotateY: 0, rotateZ: 0 })}
                  className="w-full px-2 py-1.5 bg-[#263351] hover:bg-[#263351]/80 text-white text-[10px] font-bold uppercase tracking-wider rounded border border-[#1a233a] transition-colors"
              >
                  Reset Camera
              </button>
          </div>
        </div>
      </div>

      {/* Background */}
      <div>
        <h3 className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-2">Pitch</h3>
        
        <div className="space-y-2 mb-2 bg-[#1a233a] p-2.5 rounded-lg border border-[#263351]">
          <div className="mb-2">
             <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Theme</span>
             <select 
                value={pitchTemplate}
                onChange={(e) => setPitchTemplate(e.target.value as PitchTemplate)}
                className="w-full bg-[#0e1422] border border-[#263351] rounded-md px-2 py-1.5 text-[10px] outline-none focus:border-[#c0fa4a] text-slate-300"
             >
                <optgroup label="Pro Turf">
                  <option value={PitchTemplate.THEME_CLASSIC}>Classic Grass</option>
                  <option value={PitchTemplate.THEME_CHECKER}>Emerald Checker</option>
                  <option value={PitchTemplate.THEME_FRESH}>Fresh Cut</option>
                  <option value={PitchTemplate.THEME_DIAGONAL}>Diagonal Turf</option>
                  <option value={PitchTemplate.THEME_WORN}>Worn Grass</option>
                  <option value={PitchTemplate.THEME_RINGS}>Mow Rings</option>
                  <option value={PitchTemplate.THEME_DIAMOND}>Mow Diamond</option>
                  <option value={PitchTemplate.THEME_CONTOUR}>Contour Arcs</option>
                  <option value={PitchTemplate.THEME_HEX}>Hex Tech</option>
                </optgroup>
                <optgroup label="Alternative">
                  <option value={PitchTemplate.THEME_NIGHT}>Night Match</option>
                  <option value={PitchTemplate.THEME_VAPOR}>Neon Vapor</option>
                  <option value={PitchTemplate.THEME_HOLO}>Holo Scan</option>
                  <option value={PitchTemplate.THEME_CHALK}>Chalk Board</option>
                  <option value={PitchTemplate.THEME_BLUEPRINT}>Blueprint</option>
                  <option value={PitchTemplate.THEME_SASH}>Club Sash</option>
                  <option value={PitchTemplate.THEME_MINIMAL}>Minimal Light</option>
                  <option value={PitchTemplate.THEME_WINTER}>Winter Snow</option>
                  <option value={PitchTemplate.THEME_RETRO}>Retro Clay</option>
                </optgroup>
             </select>
          </div>

          {/* Pitch View */}
          <div className="pt-2 border-t border-[#263351]">
             <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Pitch View</span>
             <select 
                value={pitchView}
                onChange={(e) => onPitchViewChange(e.target.value)}
                className="w-full bg-[#0e1422] border border-[#263351] rounded-md px-2 py-1.5 text-[10px] outline-none focus:border-[#c0fa4a] text-slate-300"
             >
                <option value="HORIZONTAL">Horizontal (2D)</option>
                <option value="PERSPECTIVE">Perspective (3D)</option>
                <option value="VERTICAL">Vertical</option>
                <option value="HALF">Half Pitch</option>
                <option value="TRAINING">Training (Blank)</option>
             </select>
          </div>

          {/* Aspect Ratio */}
          <div className="pt-2 border-t border-[#263351]">
             <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 block mb-1">Canvas Ratio</span>
             <select 
                value={aspectRatio}
                onChange={(e) => onAspectRatioChange(e.target.value as any)}
                className="w-full bg-[#0e1422] border border-[#263351] rounded-md px-2 py-1 text-[10px] outline-none focus:border-[#c0fa4a]"
             >
                 <option value="default">Default</option>
                 <option value="16:9">16:9</option>
                 <option value="4:3">4:3</option>
                 <option value="1:1">1:1</option>
                 <option value="9:16">9:16</option>
                 <option value="21:9">21:9</option>
                 {aspectRatio === 'custom' && <option value="custom">Image Ratio</option>}
             </select>
          </div>
        </div>

        <label className="block w-full px-2 py-1.5 bg-[#1a233a] text-slate-300 text-[10px] font-bold uppercase tracking-wider text-center rounded-md border border-dashed border-[#263351] hover:border-[#c0fa4a] hover:text-[#c0fa4a] cursor-pointer transition-colors relative mb-2">
           <span className="relative z-10">Upload Image</span>
           <input type="file" accept="image/*" className="hidden" onChange={handleBgChange} />
        </label>
        
        {hasBackgroundImage && (
          <button 
            onClick={onRemoveBackground}
            className="block w-full px-2 py-1.5 bg-[#ef4444]/10 text-[#ef4444] text-[10px] font-bold uppercase tracking-wider text-center rounded-md border border-dashed border-[#ef4444]/30 hover:bg-[#ef4444]/20 hover:border-[#ef4444] transition-colors relative"
          >
            Remove Image
          </button>
        )}
      </div>

    </div>
  );
};

export default ToolsPanel;
