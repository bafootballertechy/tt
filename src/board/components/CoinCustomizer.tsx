
import React from 'react';
import { PlayerVisuals } from '../types';

interface CoinCustomizerProps {
  playerId: string;
  playerName: string;
  visuals: PlayerVisuals;
  onUpdate: (updates: PlayerVisuals) => void;
  onClose: () => void;
}

const CoinCustomizer: React.FC<CoinCustomizerProps> = ({
  playerId,
  playerName,
  visuals,
  onUpdate,
  onClose
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#080b12]/70 backdrop-blur-sm" onClick={onClose}>
      <div 
        className="bg-[#0e1422] border border-[#1c2438] p-6 rounded-xl shadow-[0_0_40px_rgba(0,0,0,0.5)] w-80 text-slate-200"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-6">
          <h3 className="font-bold text-lg text-white">Edit {playerName}</h3>
          <button onClick={onClose} className="text-slate-500 hover:text-[#ef4444] transition-colors text-xl leading-none">&times;</button>
        </div>

        <div className="space-y-4">
          {/* Rotation */}
          <div>
            <label className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Rotation
              <span className="text-[#c0fa4a]">{visuals.rotation || 0}°</span>
            </label>
            <input 
              type="range" 
              min="0" 
              max="360" 
              value={visuals.rotation || 0}
              onChange={(e) => onUpdate({ ...visuals, rotation: parseInt(e.target.value) })}
              className="w-full accent-[#c0fa4a] h-1.5 bg-[#1a233a] rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Size */}
          <div>
            <label className="flex justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Size (Scale)
              <span className="text-[#c0fa4a]">{visuals.scale || 1}x</span>
            </label>
            <input 
              type="range" 
              min="0.5" 
              max="2" 
              step="0.1"
              value={visuals.scale || 1}
              onChange={(e) => onUpdate({ ...visuals, scale: parseFloat(e.target.value) })}
              className="w-full accent-[#c0fa4a] h-1.5 bg-[#1a233a] rounded-lg appearance-none cursor-pointer"
            />
          </div>

          {/* Border Color */}
          <div className="flex justify-between items-center pt-2">
             <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Border Color</label>
             <div className="flex items-center gap-3">
               <button 
                 onClick={() => onUpdate({ ...visuals, borderColor: undefined })}
                 className="text-[10px] underline text-slate-500 hover:text-white transition-colors"
               >
                 Clear
               </button>
               <input 
                 type="color" 
                 value={visuals.borderColor || '#ffffff'}
                 onChange={(e) => onUpdate({ ...visuals, borderColor: e.target.value })}
                 className="w-8 h-8 rounded-sm border border-[#263351] cursor-pointer bg-transparent overflow-hidden"
               />
             </div>
          </div>

          {/* Name Position */}
          <div className="flex justify-between items-center pt-2">
             <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Name Position</label>
             <div className="flex bg-[#1a233a] rounded-md p-1 border border-[#263351]">
               <button
                 onClick={() => onUpdate({ ...visuals, namePos: 'top' })}
                 className={`px-3 py-1 text-[10px] font-bold tracking-wider rounded-md transition-colors ${visuals.namePos === 'top' ? 'bg-[#c0fa4a] text-[#080b12]' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 TOP
               </button>
               <button
                 onClick={() => onUpdate({ ...visuals, namePos: 'bottom' })}
                 className={`px-3 py-1 text-[10px] font-bold tracking-wider rounded-md transition-colors ${visuals.namePos !== 'top' ? 'bg-[#c0fa4a] text-[#080b12]' : 'text-slate-400 hover:text-slate-200'}`}
               >
                 BOTTOM
               </button>
             </div>
          </div>

          {/* Display Overrides */}
          <div className="pt-4 border-t border-[#1c2438] space-y-3">
             <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">Display Overrides</div>
             
             {[
               { key: 'showName', label: 'Show Name' },
               { key: 'showNumber', label: 'Show Number' },
               { key: 'showPositionLabel', label: 'Show Position' }
             ].map(({ key, label }) => (
               <div key={key} className="flex justify-between items-center">
                 <label className="text-[11px] text-slate-300">{label}</label>
                 <div className="flex bg-[#1a233a] rounded-md p-0.5 border border-[#263351]">
                   <button
                     onClick={() => onUpdate({ ...visuals, [key]: true })}
                     className={`px-2 py-1 text-[9px] font-bold tracking-wider rounded transition-colors ${visuals[key as keyof PlayerVisuals] === true ? 'bg-[#c0fa4a] text-[#080b12]' : 'text-slate-400 hover:text-slate-200'}`}
                   >
                     SHOW
                   </button>
                   <button
                     onClick={() => onUpdate({ ...visuals, [key]: false })}
                     className={`px-2 py-1 text-[9px] font-bold tracking-wider rounded transition-colors ${visuals[key as keyof PlayerVisuals] === false ? 'bg-[#ef4444] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                   >
                     HIDE
                   </button>
                   <button
                     onClick={() => {
                        const newVisuals = { ...visuals };
                        delete newVisuals[key as keyof PlayerVisuals];
                        onUpdate(newVisuals);
                     }}
                     className={`px-2 py-1 text-[9px] font-bold tracking-wider rounded transition-colors ${visuals[key as keyof PlayerVisuals] === undefined || visuals[key as keyof PlayerVisuals] === null ? 'bg-[#3b82f6] text-white' : 'text-slate-400 hover:text-slate-200'}`}
                   >
                     DEFAULT
                   </button>
                 </div>
               </div>
             ))}
          </div>
        </div>

        <div className="mt-8 pt-4 border-t border-[#1c2438] flex justify-end">
           <button 
             onClick={onClose}
             className="px-6 py-2 bg-[#c0fa4a] hover:bg-[#aee638] text-[#080b12] rounded-md text-sm font-bold tracking-wide transition-colors shadow-[0_0_15px_rgba(192,250,74,0.2)]"
           >
             Done
           </button>
        </div>
      </div>
    </div>
  );
};

export default CoinCustomizer;
