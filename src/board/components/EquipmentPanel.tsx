import React from 'react';
import { ToolType } from '../types';
import { TOOL_LABELS } from '../constants';

interface EquipmentPanelProps {
  activeTool: ToolType;
  setActiveTool: (tool: ToolType) => void;
  color: string;
  setColor: (color: string) => void;
  scale: number;
  setScale: (scale: number) => void;
  angle: number;
  setAngle: (angle: number) => void;
}

const EQUIPMENT_TOOLS = [
  ToolType.BALL, ToolType.CONE, ToolType.DISC, ToolType.GOAL, ToolType.GOAL_MINI, 
  ToolType.GOAL_SIDE, ToolType.MANNEQUIN, ToolType.LADDER, ToolType.HURDLE, ToolType.POLE
];

const COLORS = ['#ff8a00', '#ffd60a', '#ef4444', '#3b82f6', '#22c55e', '#f8fafc', '#1f2937'];

const EquipmentPanel: React.FC<EquipmentPanelProps> = ({
  activeTool,
  setActiveTool,
  color,
  setColor,
  scale,
  setScale,
  angle,
  setAngle
}) => {
  return (
    <div className="flex flex-col h-full bg-[#0e1422] border-r border-[#1c2438] overflow-y-auto w-56 p-3 gap-4 scrollbar-panel shadow-[4px_0_24px_rgba(0,0,0,0.2)] z-10">
      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Equipment</h2>
        <div className="grid grid-cols-2 gap-1.5">
          {EQUIPMENT_TOOLS.map(tool => (
            <button
              key={tool}
              onClick={() => setActiveTool(tool)}
              className={`px-2 py-1 rounded-md text-[10px] font-bold tracking-wide text-center transition-colors border
                ${activeTool === tool ? 'bg-[#c0fa4a] text-[#080b12] border-[#c0fa4a] shadow-sm' : 'bg-[#1a233a] text-slate-400 border-[#263351] hover:bg-[#263351] hover:text-slate-200'}`}
            >
              {TOOL_LABELS[tool]}
            </button>
          ))}
        </div>
      </div>

      <div>
        <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Color</h2>
        <div className="flex flex-wrap gap-1.5">
          {COLORS.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              className={`w-5 h-5 rounded-full border-2 transition-transform hover:scale-110
                ${color === c ? 'border-white shadow-[0_0_0_3px_rgba(192,250,74,0.45)]' : 'border-white/20'}`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>

      <div>
         <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Placement Angle</h2>
         <div className="flex items-center gap-2 text-xs text-slate-300">
            <button 
                onClick={() => setAngle((angle - 15 + 360) % 360)}
                className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-[#1a233a] border border-[#263351] rounded-md hover:bg-[#263351] hover:text-white transition-colors text-slate-400"
                title="-15°"
            >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="2 4 2 10 8 10"/><path d="M4.5 15a9 9 0 1 0 2.1-9.4L2 10"/></svg>
            </button>
            <input 
                type="range" 
                min="0" 
                max="359" 
                value={angle}
                onChange={e => setAngle(Number(e.target.value))}
                className="flex-1 accent-[#c0fa4a] min-w-0 h-1 bg-[#1a233a] rounded-lg appearance-none cursor-pointer"
            />
            <button 
                onClick={() => setAngle((angle + 15) % 360)}
                className="w-6 h-6 flex-shrink-0 flex items-center justify-center bg-[#1a233a] border border-[#263351] rounded-md hover:bg-[#263351] hover:text-white transition-colors text-slate-400"
                title="+15°"
            >
                <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 4 22 10 16 10"/><path d="M19.5 15a9 9 0 1 1-2.1-9.4L22 10"/></svg>
            </button>
            <span className="min-w-[32px] text-right font-bold text-[#c0fa4a] text-[10px]">{angle}°</span>
         </div>
         <div className="flex flex-wrap gap-1 mt-2">
             {[0, 30, 45, 90, 135, 180, 270].map(deg => (
                 <button
                     key={deg}
                     onClick={() => setAngle(deg)}
                     className={`px-1.5 py-0.5 rounded-md text-[9px] font-bold border transition-colors
                         ${angle === deg ? 'bg-[#c0fa4a]/10 text-[#c0fa4a] border-[#c0fa4a]/50' : 'bg-[#1a233a] text-slate-400 border-[#263351] hover:bg-[#263351] hover:text-white'}`}
                 >
                     {deg}°
                 </button>
             ))}
         </div>
      </div>

      <div>
         <h2 className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Placement Size</h2>
         <div className="flex items-center gap-2 text-xs text-slate-300">
             <input 
                 type="range"
                 min="0.6"
                 max="1.7"
                 step="0.05"
                 value={scale}
                 onChange={e => setScale(Number(e.target.value))}
                 className="flex-1 accent-[#c0fa4a] min-w-0 h-1 bg-[#1a233a] rounded-lg appearance-none cursor-pointer"
             />
             <span className="min-w-[32px] text-right font-bold text-[#c0fa4a] text-[10px]">{Math.round(scale * 100)}%</span>
         </div>
      </div>
    </div>
  );
};

export default EquipmentPanel;
