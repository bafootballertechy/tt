import React from 'react';
import { ScanEye } from 'lucide-react';
import type { ScannerSettings } from './types';

export interface ScannerPanelProps {
  settings: ScannerSettings;
  onChange:
    | React.Dispatch<React.SetStateAction<ScannerSettings>>
    | ((settings: ScannerSettings) => void);
  activeColorId?: number;
  colors?: Array<{ id: number; value: string }>;
  onSelectColorId?: (id: number) => void;
  // Optional backward compatibility
  selectedShape?: any;
  onUpdateSelectedShape?: any;
  onDeleteSelectedShape?: any;
  onClearAllScanners?: any;
}

export const ScannerPanel: React.FC<ScannerPanelProps> = ({
  settings,
  onChange,
  activeColorId,
  colors,
  onSelectColorId,
}) => {
  const updateField = <K extends keyof ScannerSettings>(
    key: K,
    val: ScannerSettings[K]
  ) => {
    if (typeof onChange === 'function') {
      (onChange as any)((prev: any) => {
        const base = typeof prev === 'object' && prev !== null ? prev : settings;
        return { ...base, [key]: val };
      });
    }
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 rounded border shadow-sm bg-[#c6ff1f]/10 border-[#c6ff1f]/20">
          <ScanEye className="w-3 h-3 text-[#c6ff1f]" />
        </div>
        <div>
          <h3 className="text-[11px] font-bold text-gray-100 tracking-tight leading-none">
            Scanner
          </h3>
          <p className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider leading-none mt-0.5">
            Player Vision
          </p>
        </div>
      </div>

      {/* Sliders */}
      <div className="space-y-3 pt-1">
        {/* Field of View (FOV) */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              Field of View (FOV)
            </label>
            <span className="text-[10px] font-mono text-gray-300 bg-[#1a1a1c] px-1.5 py-0.5 rounded border border-[#2a2a2c]">
              {Math.round(settings.fov ?? 35)}°
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={80}
            step={1}
            value={Math.round(settings.fov ?? 35)}
            onChange={(e) => updateField('fov', parseInt(e.target.value, 10))}
            className="w-full h-1 bg-[#2a2a2c] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c6ff1f]"
          />
        </div>

        {/* Sweep Arc */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              Sweep Arc
            </label>
            <span className="text-[10px] font-mono text-gray-300 bg-[#1a1a1c] px-1.5 py-0.5 rounded border border-[#2a2a2c]">
              {Math.round(settings.sweepRange ?? 50)}°
            </span>
          </div>
          <input
            type="range"
            min={15}
            max={160}
            step={1}
            value={Math.round(settings.sweepRange ?? 50)}
            onChange={(e) => updateField('sweepRange', parseInt(e.target.value, 10))}
            className="w-full h-1 bg-[#2a2a2c] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c6ff1f]"
          />
        </div>

        {/* Sweep Speed */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              Sweep Speed
            </label>
            <span className="text-[10px] font-mono text-gray-300 bg-[#1a1a1c] px-1.5 py-0.5 rounded border border-[#2a2a2c]">
              {(settings.sweepSpeed ?? 1.2).toFixed(1)}x
            </span>
          </div>
          <input
            type="range"
            min={0.3}
            max={3.0}
            step={0.1}
            value={settings.sweepSpeed ?? 1.2}
            onChange={(e) => updateField('sweepSpeed', parseFloat(e.target.value))}
            className="w-full h-1 bg-[#2a2a2c] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c6ff1f]"
          />
        </div>
      </div>

      {/* Vision Color Selection (using top bar colors) */}
      {colors && colors.length > 0 && (
        <div className="space-y-1.5 pt-2 border-t border-[#262629]">
          <div className="flex justify-between items-center">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              Vision Color
            </label>
            <span className="text-[9px] font-mono text-gray-400">
              {colors.find(c => c.id === activeColorId)?.value || ''}
            </span>
          </div>
          <div className="flex items-center gap-1.5 flex-wrap bg-[#141416] p-1.5 rounded-lg border border-[#262629]">
            {colors.map((c) => {
              const isSelected = activeColorId === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => onSelectColorId && onSelectColorId(c.id)}
                  className={`w-4 h-4 rounded-full border-[1.5px] transition-transform shadow-sm ${
                    isSelected
                      ? 'border-white scale-110 shadow-md ring-1 ring-white/50'
                      : 'border-transparent hover:scale-105 opacity-60 hover:opacity-100'
                  }`}
                  style={{ backgroundColor: c.value }}
                  title={c.value}
                />
              );
            })}
          </div>
        </div>
      )}

      {/* Animate Sweep Toggle */}
      <div className="pt-2 border-t border-[#262629]">
        <label className="flex items-center justify-between cursor-pointer p-2 bg-[#141416] border border-[#262629] rounded-lg hover:border-[#3a3a3f] transition-all">
          <span className="text-[10px] font-bold text-gray-200 tracking-wide">
            Animate Sweep
          </span>
          <button
            type="button"
            onClick={() => updateField('isPaused', !settings.isPaused)}
            className={`w-7 h-4 rounded-full relative transition-colors shrink-0 ${
              !settings.isPaused ? 'bg-[#c6ff1f]' : 'bg-[#2a2a2c] hover:bg-[#333]'
            }`}
          >
            <div
              className={`absolute top-0.5 w-3 h-3 rounded-full transition-all shadow-sm ${
                !settings.isPaused ? 'left-3.5 bg-black' : 'left-0.5 bg-white'
              }`}
            />
          </button>
        </label>
      </div>
    </div>
  );
};
