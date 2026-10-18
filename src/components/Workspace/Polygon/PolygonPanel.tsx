import React from 'react';
import {
  Hexagon,
  Radar,
  Square,
  SlidersHorizontal,
  Ban,
  Waves,
  Crosshair,
  Activity,
  Zap,
} from 'lucide-react';
import type { PolygonSettings, PolygonFillStyle, PolygonToolMode } from './types';

export interface PolygonPanelProps {
  settings: PolygonSettings;
  onChange: React.Dispatch<React.SetStateAction<PolygonSettings>> | ((settings: PolygonSettings) => void);
}

export const PolygonPanel: React.FC<PolygonPanelProps> = ({ settings, onChange }) => {
  const mode: PolygonToolMode = settings.mode || 'polygon';

  const updateSetting = <K extends keyof PolygonSettings>(key: K, value: PolygonSettings[K]) => {
    if (typeof onChange === 'function') {
      (onChange as any)((prev: any) => {
        const base = typeof prev === 'object' && prev !== null ? prev : settings;
        return { ...base, [key]: value };
      });
    }
  };

  const fillOptions: { id: PolygonFillStyle; label: string; icon: React.ReactNode; desc: string }[] = [
    {
      id: 'none',
      label: 'Outline',
      icon: <Ban className="w-3 h-3" />,
      desc: 'Transparent interior',
    },
    {
      id: 'fill',
      label: 'Solid Fill',
      icon: <Square className="w-3 h-3 fill-current" />,
      desc: 'Soft gradient glow',
    },
    {
      id: 'stripe',
      label: 'Striped',
      icon: <SlidersHorizontal className="w-3 h-3" />,
      desc: 'Tactical diagonal hatch',
    },
  ];

  const speedPresets = [
    { label: 'Slow', value: 0.015 },
    { label: 'Normal', value: 0.025 },
    { label: 'Fast', value: 0.04 },
  ];

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Tool Selector Tabs: Polygon vs Radar Ring */}
      <div className="space-y-1">
        <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
          Tool Mode
        </label>
        <div className="flex bg-[#121214] border border-[#262629] rounded-lg p-0.5 gap-1 shadow-inner">
          <button
            type="button"
            onClick={() => updateSetting('mode', 'polygon')}
            className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'polygon'
                ? 'bg-[#26262a] text-white shadow-sm ring-1 ring-[#c6ff1f]/30 border border-[#38383e]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1d]'
            }`}
            title="Polygon Zone Tool"
          >
            <Hexagon
              className={`w-3.5 h-3.5 transition-colors ${
                mode === 'polygon' ? 'text-[#c6ff1f]' : 'text-gray-500'
              }`}
            />
            <span>Polygon</span>
          </button>

          <button
            type="button"
            onClick={() => updateSetting('mode', 'radar')}
            className={`flex-1 py-1.5 px-2 rounded-md text-[10px] font-bold flex items-center justify-center gap-1.5 transition-all ${
              mode === 'radar'
                ? 'bg-[#26262a] text-white shadow-sm ring-1 ring-[#c6ff1f]/30 border border-[#38383e]'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#1a1a1d]'
            }`}
            title="Radar Ring Tactical Scanner"
          >
            <Radar
              className={`w-3.5 h-3.5 transition-colors ${
                mode === 'radar' ? 'text-[#c6ff1f]' : 'text-gray-500'
              }`}
            />
            <span>Radar Ring</span>
          </button>
        </div>
      </div>

      {/* Mode 1: Polygon Properties */}
      {mode === 'polygon' && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-150">
          {/* Section Header */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded border shadow-sm bg-[#c6ff1f]/10 border-[#c6ff1f]/20">
              <Hexagon className="w-3 h-3 text-[#c6ff1f]" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold text-gray-100 tracking-tight leading-none">
                Polygon Zone
              </h3>
              <p className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider leading-none mt-0.5">
                Shape Properties
              </p>
            </div>
          </div>

          {/* Fill Style Section */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
              Fill Style
            </label>
            <div className="flex bg-[#141416] border border-[#262629] rounded-lg p-0.5 gap-0.5">
              {fillOptions.map(({ id, label, icon }) => {
                const isActive = settings.fillStyle === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => updateSetting('fillStyle', id)}
                    className={`flex-1 py-1 px-1.5 rounded-[4px] text-[10px] font-semibold flex items-center justify-center gap-1 transition-all ${
                      isActive
                        ? 'bg-[#2a2a2c] text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1c]'
                    }`}
                    title={label}
                  >
                    <span className={isActive ? 'text-[#c6ff1f]' : 'text-gray-500'}>{icon}</span>
                    <span className="capitalize">{label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Mode 2: Radar Ring Properties */}
      {mode === 'radar' && (
        <div className="space-y-3 pt-1 animate-in fade-in duration-150">
          {/* Section Header */}
          <div className="flex items-center gap-2">
            <div className="p-1 rounded border shadow-sm bg-[#c6ff1f]/10 border-[#c6ff1f]/20">
              <Radar className="w-3 h-3 text-[#c6ff1f]" />
            </div>
            <div>
              <h3 className="text-[11px] font-bold text-gray-100 tracking-tight leading-none">
                Radar Ring
              </h3>
              <p className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider leading-none mt-0.5">
                Tactical Scanner & Waves
              </p>
            </div>
          </div>

          {/* Radius Size Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                Radar Radius
              </label>
              <span className="text-[10px] font-mono text-gray-300 bg-[#1a1a1c] px-1.5 py-0.5 rounded border border-[#2a2a2c]">
                {settings.radarRadius ?? 130}px
              </span>
            </div>
            <input
              type="range"
              min={40}
              max={250}
              step={5}
              value={settings.radarRadius ?? 130}
              onChange={(e) => updateSetting('radarRadius', parseInt(e.target.value, 10))}
              className="w-full h-1 bg-[#2a2a2c] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c6ff1f]"
            />
          </div>

          {/* Fill Opacity Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                Fill Opacity
              </label>
              <span className="text-[10px] font-mono text-[#c6ff1f] bg-[#1a1a1c] px-1.5 py-0.5 rounded border border-[#2a2a2c]">
                {Math.round((settings.radarFillOpacity ?? 0.38) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={10}
              max={90}
              step={5}
              value={Math.round((settings.radarFillOpacity ?? 0.38) * 100)}
              onChange={(e) => updateSetting('radarFillOpacity', parseInt(e.target.value, 10) / 100)}
              className="w-full h-1 bg-[#2a2a2c] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c6ff1f]"
            />
          </div>

          {/* 3D Ground Tilt Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                3D Tilt (Ground Plane)
              </label>
              <span className="text-[10px] font-mono text-gray-300 bg-[#1a1a1c] px-1.5 py-0.5 rounded border border-[#2a2a2c]">
                {settings.radarTilt ?? 65}°
              </span>
            </div>
            <input
              type="range"
              min={0}
              max={85}
              step={1}
              value={settings.radarTilt ?? 65}
              onChange={(e) => updateSetting('radarTilt', parseInt(e.target.value, 10))}
              className="w-full h-1 bg-[#2a2a2c] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#c6ff1f]"
            />
          </div>

          {/* Sweep Speed Presets */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider">
                Sweep Speed
              </label>
              <span className="text-[9px] font-mono text-gray-400">
                {settings.radarSweepSpeed <= 0.018
                  ? 'Slow'
                  : settings.radarSweepSpeed >= 0.035
                  ? 'Fast'
                  : 'Normal'}
              </span>
            </div>
            <div className="flex bg-[#141416] border border-[#262629] rounded-lg p-0.5 gap-0.5">
              {speedPresets.map(({ label, value }) => {
                const isActive = Math.abs((settings.radarSweepSpeed ?? 0.025) - value) < 0.005;
                return (
                  <button
                    key={label}
                    type="button"
                    onClick={() => updateSetting('radarSweepSpeed', value)}
                    className={`flex-1 py-1 px-1.5 rounded-[4px] text-[10px] font-semibold transition-all ${
                      isActive
                        ? 'bg-[#2a2a2c] text-white shadow-sm'
                        : 'text-gray-500 hover:text-gray-300 hover:bg-[#1a1a1c]'
                    }`}
                  >
                    <span className={isActive ? 'text-[#c6ff1f]' : ''}>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Tactical Elements Toggles */}
          <div className="space-y-1.5">
            <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
              Radar Elements
            </label>
            <div className="grid grid-cols-2 gap-1.5">
              {/* Expanding Pulse Waves */}
              <button
                type="button"
                onClick={() => updateSetting('radarShowRings', !settings.radarShowRings)}
                className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-all ${
                  settings.radarShowRings
                    ? 'bg-[#18181c] border-[#c6ff1f]/30 text-white'
                    : 'bg-[#121214] border-[#222225] text-gray-500 hover:border-[#333]'
                }`}
              >
                <Waves
                  className={`w-3 h-3 shrink-0 ${
                    settings.radarShowRings ? 'text-[#c6ff1f]' : 'text-gray-600'
                  }`}
                />
                <span className="text-[9.5px] font-medium leading-tight">Pulse Waves</span>
              </button>

              {/* Target Blips */}
              <button
                type="button"
                onClick={() => updateSetting('radarShowBlips', !settings.radarShowBlips)}
                className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-all ${
                  settings.radarShowBlips
                    ? 'bg-[#18181c] border-[#c6ff1f]/30 text-white'
                    : 'bg-[#121214] border-[#222225] text-gray-500 hover:border-[#333]'
                }`}
              >
                <Activity
                  className={`w-3 h-3 shrink-0 ${
                    settings.radarShowBlips ? 'text-[#c6ff1f]' : 'text-gray-600'
                  }`}
                />
                <span className="text-[9.5px] font-medium leading-tight">Blip Dots</span>
              </button>

              {/* Crosshair Grid */}
              <button
                type="button"
                onClick={() => updateSetting('radarShowCrosshair', !settings.radarShowCrosshair)}
                className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-all ${
                  settings.radarShowCrosshair
                    ? 'bg-[#18181c] border-[#c6ff1f]/30 text-white'
                    : 'bg-[#121214] border-[#222225] text-gray-500 hover:border-[#333]'
                }`}
              >
                <Crosshair
                  className={`w-3 h-3 shrink-0 ${
                    settings.radarShowCrosshair ? 'text-[#c6ff1f]' : 'text-gray-600'
                  }`}
                />
                <span className="text-[9.5px] font-medium leading-tight">Crosshair</span>
              </button>

              {/* Tactical Glow */}
              <button
                type="button"
                onClick={() => updateSetting('radarShowGlow', !settings.radarShowGlow)}
                className={`flex items-center gap-1.5 p-1.5 rounded-lg border text-left transition-all ${
                  settings.radarShowGlow
                    ? 'bg-[#18181c] border-[#c6ff1f]/30 text-white'
                    : 'bg-[#121214] border-[#222225] text-gray-500 hover:border-[#333]'
                }`}
              >
                <Zap
                  className={`w-3 h-3 shrink-0 ${
                    settings.radarShowGlow ? 'text-[#c6ff1f]' : 'text-gray-600'
                  }`}
                />
                <span className="text-[9.5px] font-medium leading-tight">Outer Glow</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
