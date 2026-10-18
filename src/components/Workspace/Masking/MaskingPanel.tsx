import React from 'react';
import { Layers, Pipette, Eye, EyeOff, Activity, Trash2 } from 'lucide-react';
import { MaskSettings } from '../../../types';

export interface MaskingPanelProps {
  maskSettings: MaskSettings;
  setMaskSettings: React.Dispatch<React.SetStateAction<MaskSettings>>;
  isPickingColor: boolean;
  setIsPickingColor: (picking: boolean | ((prev: boolean) => boolean)) => void;
  isProcessingMask: boolean;
  onRemoveColor?: (color: string) => void;
}

export const MaskingPanel: React.FC<MaskingPanelProps> = ({
  maskSettings,
  setMaskSettings,
  isPickingColor,
  setIsPickingColor,
  isProcessingMask,
  onRemoveColor,
}) => {
  const colorList: string[] =
    maskSettings.keyColors && maskSettings.keyColors.length > 0
      ? maskSettings.keyColors
      : [maskSettings.keyColor || '#4b8b3b'];

  const handleRemoveColor = (colorToRemove: string) => {
    if (onRemoveColor) {
      onRemoveColor(colorToRemove);
    } else {
      const filtered = colorList.filter((c) => c.toLowerCase() !== colorToRemove.toLowerCase());
      const nextList = filtered.length > 0 ? filtered : ['#4b8b3b'];
      setMaskSettings((prev) => ({
        ...prev,
        keyColors: nextList,
        keyColor: nextList[0],
      }));
    }
  };

  const handleSelectColorAsPrimary = (color: string) => {
    setMaskSettings((prev) => ({
      ...prev,
      keyColor: color,
    }));
  };

  return (
    <div className="space-y-3 animate-in fade-in duration-200">
      {/* Section Header */}
      <div className="flex items-center gap-2 mb-2">
        <div className="p-1 rounded border shadow-sm bg-green-500/10 border-green-500/20">
          <Layers className="w-3 h-3 text-green-400" />
        </div>
        <div>
          <h3 className="text-[11px] font-bold text-gray-100 tracking-tight leading-none">
            Chroma Key
          </h3>
          <p className="text-[8px] text-gray-500 font-semibold uppercase tracking-wider leading-none mt-0.5">
            Green Screen & Pitch Masking
          </p>
        </div>
      </div>

      {/* Enable Effect Toggle */}
      <div className="flex items-center justify-between p-2 bg-[#141416] border border-[#262629] rounded-lg shadow-sm">
        <span className="text-[10px] font-bold text-gray-300 uppercase tracking-wide">
          Enable Effect
        </span>
        <button
          type="button"
          onClick={() => setMaskSettings((prev) => ({ ...prev, enabled: !prev.enabled }))}
          className={`w-7 h-4 rounded-full relative transition-colors shrink-0 ${
            maskSettings.enabled ? 'bg-green-500' : 'bg-[#2a2a2c] hover:bg-[#333]'
          }`}
          aria-label="Toggle Chroma Key Effect"
        >
          <div
            className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${
              maskSettings.enabled ? 'left-3.5' : 'left-0.5'
            }`}
          />
        </button>
      </div>

      {/* Controls when Enabled */}
      {maskSettings.enabled && (
        <div className="space-y-3 animate-in fade-in slide-in-from-top-2 pt-1">
          {/* Pitch Color Samples (Multi-Color Keying for Bright & Shadow Areas) */}
          <div className="space-y-2 bg-[#141416] border border-[#262629] rounded-lg p-2.5 shadow-sm">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-[9px] font-bold text-gray-300 uppercase tracking-wider block">
                  Sampled Pitch Colors
                </label>
                <span className="text-[8px] text-gray-500">
                  Sunlit & stadium shadow swatches ({colorList.length}/6)
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPickingColor((prev) => !prev)}
                className={`px-2 py-1 rounded transition-all flex items-center gap-1 text-[9px] font-bold shadow-sm ${
                  isPickingColor
                    ? 'bg-[#c6ff1f] text-black ring-1 ring-[#c6ff1f]'
                    : 'bg-[#222] text-gray-200 hover:text-white hover:bg-[#2c2c30] border border-[#333]'
                }`}
                title="Click anywhere on video pitch or shadow to sample"
              >
                <Pipette className="w-2.5 h-2.5" />
                {isPickingColor ? 'Pick on Video' : 'Add Sample'}
              </button>
            </div>

            {/* Color Swatch Badges */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {colorList.map((color, idx) => {
                const isSelected = maskSettings.keyColor?.toLowerCase() === color.toLowerCase();
                return (
                  <div
                    key={`${color}-${idx}`}
                    className={`group flex items-center gap-1.5 px-2 py-1 rounded-md text-[9px] font-mono border transition-all ${
                      isSelected
                        ? 'border-green-500/80 bg-green-500/10 text-white shadow-sm'
                        : 'border-[#2c2c30] bg-[#1a1a1c] text-gray-400 hover:border-gray-500'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => handleSelectColorAsPrimary(color)}
                      className="flex items-center gap-1.5 focus:outline-none"
                      title="Set as active swatch"
                    >
                      <span
                        className="w-3 h-3 rounded-full border border-black/40 shadow-inner shrink-0"
                        style={{ backgroundColor: color }}
                      />
                      <span>{color.toUpperCase()}</span>
                    </button>
                    {colorList.length > 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveColor(color);
                        }}
                        className="opacity-40 group-hover:opacity-100 hover:text-red-400 transition-opacity ml-0.5 p-0.5"
                        title="Remove color swatch"
                        aria-label={`Remove color ${color}`}
                      >
                        <Trash2 className="w-2.5 h-2.5" />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Hue Sensitivity Slider */}
          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <div>
                <label className="text-[9px] font-bold text-gray-400 uppercase tracking-wider block">
                  Hue Sensitivity
                </label>
                <span className="text-[8px] text-gray-500">
                  Tolerance around each sampled pitch swatch
                </span>
              </div>
              <span className="text-[10px] font-mono text-gray-300 bg-[#1a1a1c] px-1.5 py-0.5 rounded border border-[#2a2a2c]">
                {maskSettings.sensitivity}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={100}
              step={1}
              value={maskSettings.sensitivity}
              onChange={(e) =>
                setMaskSettings((prev) => ({
                  ...prev,
                  sensitivity: parseInt(e.target.value, 10),
                }))
              }
              className="w-full h-1 bg-[#2a2a2c] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-green-500"
            />
          </div>

          {/* Show Debug Overlay Toggle */}
          <label className="flex items-center justify-between cursor-pointer p-2 bg-[#141416] border border-[#262629] rounded-lg hover:border-[#3a3a3f] transition-all">
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-bold text-gray-200 tracking-wide">
                Show Debug Overlay (Pitch Mask)
              </span>
              {maskSettings.showOverlay ? (
                <Eye className="w-3 h-3 text-green-400" />
              ) : (
                <EyeOff className="w-3 h-3 text-gray-600" />
              )}
            </div>
            <div
              onClick={(e) => {
                e.preventDefault();
                setMaskSettings((prev) => ({
                  ...prev,
                  showOverlay: !prev.showOverlay,
                }));
              }}
              className={`w-7 h-4 rounded-full relative transition-colors shrink-0 ${
                maskSettings.showOverlay ? 'bg-green-500' : 'bg-[#2a2a2c] hover:bg-[#333]'
              }`}
            >
              <div
                className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all shadow-sm ${
                  maskSettings.showOverlay ? 'left-3.5' : 'left-0.5'
                }`}
              />
            </div>
          </label>

          {/* Processing Indicator */}
          {isProcessingMask && (
            <div className="text-[9px] text-yellow-500 font-semibold uppercase tracking-wider animate-pulse flex items-center gap-1.5 justify-center p-1.5 bg-yellow-500/10 rounded-md border border-yellow-500/20">
              <Activity className="w-3 h-3" /> Processing Pitch Mask
            </div>
          )}
        </div>
      )}
    </div>
  );
};
