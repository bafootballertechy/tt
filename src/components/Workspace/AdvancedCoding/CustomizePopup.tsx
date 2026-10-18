import React from 'react';
import { X, Pipette, Settings2, Plus, Minus, Folder } from 'lucide-react';
import { AdvancedPadItem, Tag as TagData, Label, LabelGroup } from '../../../types';
import { getLuminance, calculateTagAutoFontSize } from './utils';

interface CustomizePopupProps {
  customizePopup: { id: string; type: 'tag' | 'label' | 'text'; x: number; y: number } | null;
  onClose: () => void;
  items: AdvancedPadItem[];
  setItems: React.Dispatch<React.SetStateAction<AdvancedPadItem[]>>;
  tags: TagData[];
  labels: Label[];
  setLabels?: React.Dispatch<React.SetStateAction<Label[]>>;
  labelGroups: LabelGroup[];
  onEditTag: (tagId: string) => void;
  handleResetItemFontSize: (itemId: string) => void;
  handleAdjustItemFontSize: (itemId: string, delta: number) => void;
  handleSetAllTagsFontSize: (size: number | undefined) => void;
}

export const CustomizePopup: React.FC<CustomizePopupProps> = ({
  customizePopup,
  onClose,
  items,
  setItems,
  tags,
  labels,
  setLabels,
  labelGroups,
  onEditTag,
  handleResetItemFontSize,
  handleAdjustItemFontSize,
  handleSetAllTagsFontSize,
}) => {
  if (!customizePopup) return null;

  const curItem = items.find(i => i.id === customizePopup.id);

  return (
    <div 
      className="customize-popup fixed bg-[#222] border border-[#333] rounded-lg shadow-2xl p-4 z-[100] w-72 select-text"
      style={{ 
        left: Math.min(customizePopup.x, window.innerWidth - 300), 
        top: Math.min(customizePopup.y, window.innerHeight - 340), 
        userSelect: 'text', 
        WebkitUserSelect: 'text' 
      }}
      onClick={(e) => e.stopPropagation()}
      onPointerDown={(e) => e.stopPropagation()}
    >
      <div className="flex justify-between items-center mb-3">
        <div className="text-xs text-gray-400 font-bold uppercase">Customize {customizePopup.type}</div>
        <button onClick={onClose} className="text-gray-500 hover:text-white">
          <X className="w-4 h-4" />
        </button>
      </div>

      {customizePopup.type === 'tag' ? (
        (() => {
          const tag = tags.find(t => t.id === customizePopup.id);
          const effectiveSize = curItem?.fontSize || (tag ? calculateTagAutoFontSize(tag.name, curItem?.width || 120, curItem?.height || 40) : 13);

          return (
            <>
              <div className="mb-3 p-2 bg-[#18181a] border border-[#2e2e34] rounded">
                <div className="text-[10px] text-gray-400 uppercase tracking-wider font-bold mb-1">Tag Info</div>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white text-sm truncate max-w-[170px]" title={tag?.name}>
                    {tag?.name || 'Tag'}
                  </span>
                  <span className="font-mono text-xs text-gray-300 bg-[#252525] px-1.5 py-0.5 rounded border border-[#333] font-bold">
                    {tag?.shortcut || 'No key'}
                  </span>
                </div>
              </div>

              {/* Text Size Control */}
              <div className="mb-4">
                <div className="flex justify-between items-center mb-1 text-xs text-gray-300">
                  <span className="font-bold">Text Size</span>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[#c6ff1f] font-mono font-bold">
                      {curItem?.fontSize ? `${curItem.fontSize}px` : `Auto (${effectiveSize}px)`}
                    </span>
                    {curItem?.fontSize && (
                      <button
                        onClick={() => handleResetItemFontSize(customizePopup.id)}
                        className="text-[8.5px] px-1.5 py-0.5 bg-[#333] hover:bg-[#444] text-gray-200 rounded font-bold"
                        title="Reset to dynamic auto-fit text size"
                      >
                        Reset Auto
                      </button>
                    )}
                  </div>
                </div>

                {/* Quick reduce / increase buttons */}
                <div className="grid grid-cols-4 gap-1 mb-2">
                  <button
                    onClick={() => handleAdjustItemFontSize(customizePopup.id, -2)}
                    className="py-1 bg-[#1a1a20] hover:bg-[#2b2b36] border border-[#3a3a46] rounded text-[10px] font-bold text-gray-200 hover:text-white transition-colors"
                    title="Reduce font size by 2px"
                  >
                    -2px
                  </button>
                  <button
                    onClick={() => handleAdjustItemFontSize(customizePopup.id, -1)}
                    className="py-1 bg-[#1a1a20] hover:bg-[#2b2b36] border border-[#3a3a46] rounded text-[10px] font-bold text-gray-200 hover:text-white transition-colors flex items-center justify-center gap-0.5"
                    title="Reduce font size by 1px (A-)"
                  >
                    <Minus className="w-2.5 h-2.5" /> 1px
                  </button>
                  <button
                    onClick={() => handleAdjustItemFontSize(customizePopup.id, 1)}
                    className="py-1 bg-[#1a1a20] hover:bg-[#2b2b36] border border-[#3a3a46] rounded text-[10px] font-bold text-gray-200 hover:text-white transition-colors flex items-center justify-center gap-0.5"
                    title="Increase font size by 1px (A+)"
                  >
                    <Plus className="w-2.5 h-2.5" /> 1px
                  </button>
                  <button
                    onClick={() => handleAdjustItemFontSize(customizePopup.id, 2)}
                    className="py-1 bg-[#1a1a20] hover:bg-[#2b2b36] border border-[#3a3a46] rounded text-[10px] font-bold text-gray-200 hover:text-white transition-colors"
                    title="Increase font size by 2px"
                  >
                    +2px
                  </button>
                </div>

                <input 
                  type="range" 
                  min="6" 
                  max="40" 
                  value={curItem?.fontSize || effectiveSize}
                  onChange={(e) => {
                    const size = parseInt(e.target.value);
                    setItems(items.map(it => it.id === customizePopup.id ? { ...it, fontSize: size } : it));
                  }}
                  className="w-full accent-[#c6ff1f] cursor-pointer"
                />

                {/* Apply to all tags button */}
                <div className="mt-2">
                  <button
                    onClick={() => {
                      const size = curItem?.fontSize || effectiveSize;
                      handleSetAllTagsFontSize(size);
                    }}
                    className="text-[9px] text-gray-300 hover:text-[#c6ff1f] bg-[#1a1a20] hover:bg-[#262630] border border-[#333] px-2 py-1 rounded transition-colors w-full"
                  >
                    Apply this text size ({curItem?.fontSize || effectiveSize}px) to all tags
                  </button>
                </div>
              </div>

              {/* Button Color Override */}
              <div className="mb-4">
                <label className="text-xs text-gray-300 flex justify-between items-center mb-2">
                  <span>Button Color Override</span>
                  <button 
                    onClick={() => setItems(items.map(it => it.id === customizePopup.id ? { ...it, color: undefined } : it))}
                    className="text-[9px] text-gray-400 hover:text-white underline cursor-pointer"
                  >
                    Use Tag Color
                  </button>
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#a855f7', '#ec4899', '#ffffff', '#111111'].map(c => (
                    <button 
                      key={c}
                      className={`w-5 h-5 rounded-full border border-[#444] hover:scale-110 transition-transform ${curItem?.color === c ? 'ring-2 ring-white scale-110' : ''}`}
                      style={{ backgroundColor: c }}
                      onClick={() => {
                        setItems(items.map(it => it.id === customizePopup.id ? { ...it, color: c } : it));
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Link to Master Tag Settings */}
              <div className="pt-2 border-t border-[#333]">
                <button
                  onClick={() => {
                    onClose();
                    onEditTag(customizePopup.id);
                  }}
                  className="w-full py-1.5 px-2 bg-[#252528] hover:bg-[#35353d] border border-[#3a3a44] rounded text-xs text-gray-200 hover:text-white font-medium flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Settings2 className="w-3.5 h-3.5 text-[#c6ff1f]" />
                  <span>Edit Tag Hotkey & Lead/Lag</span>
                </button>
              </div>
            </>
          );
        })()
      ) : (
        <>
          <div className="mb-4">
            <label className="text-xs text-gray-300 block mb-1">Text / Name</label>
            <input 
              type="text" 
              value={
                customizePopup.type === 'label'
                  ? (labels.find(l => l.id === customizePopup.id)?.name ?? items.find(i => i.id === customizePopup.id)?.content ?? '')
                  : (items.find(i => i.id === customizePopup.id)?.content || '')
              }
              onChange={(e) => {
                const val = e.target.value;
                setItems(items.map(it => it.id === customizePopup.id ? { ...it, content: val } : it));
                if (customizePopup.type === 'label' && setLabels) {
                  setLabels(prev => prev.map(l => l.id === customizePopup.id ? { ...l, name: val } : l));
                }
              }}
              className="w-full bg-[#111] border border-[#333] rounded px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#c6ff1f]"
              placeholder="Enter text..."
            />
          </div>

          {customizePopup.type === 'label' && (
            <div className="mb-4">
              <label className="text-xs text-gray-300 block mb-1 flex items-center justify-between">
                <span>Group (Normal Coding Sync)</span>
                <Folder className="w-3 h-3 text-[#c6ff1f]" />
              </label>
              <select 
                value={labels.find(l => l.id === customizePopup.id)?.groupId || ''}
                onChange={(e) => {
                  const newGId = e.target.value || undefined;
                  if (setLabels) {
                    setLabels(prev => prev.map(l => l.id === customizePopup.id ? { ...l, groupId: newGId } : l));
                  }
                }}
                className="w-full bg-[#111] border border-[#333] rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-[#c6ff1f]"
              >
                <option value="">(Ungrouped)</option>
                {labelGroups?.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
          )}
          
          <div className="mb-4">
            <label className="text-xs text-gray-300 block mb-1 flex justify-between">
              <span>Text Size</span>
              <span className="text-[#c6ff1f]">{items.find(i => i.id === customizePopup.id)?.fontSize || 14}px</span>
            </label>
            <input 
              type="range" 
              min="4" 
              max="72" 
              value={items.find(i => i.id === customizePopup.id)?.fontSize || 14}
              onChange={(e) => {
                const size = parseInt(e.target.value);
                setItems(items.map(it => it.id === customizePopup.id ? { ...it, fontSize: size } : it));
              }}
              className="w-full accent-[#c6ff1f]"
            />
          </div>
          
          <div>
            <label className="text-xs text-gray-300 flex justify-between items-center mb-2">
              <span>Background Color</span>
              <label className="text-[10px] text-gray-400 hover:text-white cursor-pointer flex items-center gap-1 bg-[#333] px-2 py-1 rounded">
                <Pipette className="w-3 h-3" /> Custom
                <input 
                  type="color" 
                  className="hidden" 
                  value={items.find(i => i.id === customizePopup.id)?.color || '#c6ff1f'}
                  onChange={(e) => {
                    setItems(items.map(it => it.id === customizePopup.id ? { ...it, color: e.target.value } : it));
                  }}
                />
              </label>
            </label>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <button 
                className={`w-6 h-6 rounded-full border border-[#444] hover:scale-110 transition-transform relative overflow-hidden bg-[url('data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSIyMCIgaGVpZ2h0PSIyMCI+PGxpbmUgeDE9IjAiIHkxPSIyMCIgeDI9IjIwIiB5Mj0iMCIgc3Ryb2tlPSJyZWQiIHN0cm9rZS13aWR0aD0iMiIvPjwvc3ZnPg==')]`}
                title="Transparent"
                onClick={() => setItems(items.map(it => it.id === customizePopup.id ? { ...it, color: '' } : it))}
              />
              {[
                { color: 'rgba(198, 255, 31, 0.15)', label: 'Lime Template Tint' },
                { color: 'rgba(0, 234, 255, 0.15)', label: 'Cyan Template Tint' },
                { color: 'rgba(168, 85, 247, 0.15)', label: 'Purple Tint' },
                { color: 'rgba(249, 115, 22, 0.15)', label: 'Orange Tint' },
                { color: 'rgba(34, 197, 94, 0.15)', label: 'Green Tint' },
                { color: 'rgba(239, 68, 68, 0.15)', label: 'Red Tint' },
                { color: 'rgba(255, 255, 255, 0.12)', label: 'Glass Neutral' },
                { color: '#c6ff1f', label: 'Solid Lime' },
                { color: '#3b82f6', label: 'Solid Blue' },
                { color: '#22c55e', label: 'Solid Green' },
                { color: '#ef4444', label: 'Solid Red' },
                { color: '#f97316', label: 'Solid Orange' },
                { color: '#eab308', label: 'Solid Yellow' },
                { color: '#a855f7', label: 'Solid Purple' },
                { color: '#ec4899', label: 'Solid Pink' },
                { color: '#222222', label: 'Solid Dark' },
                { color: '#ffffff', label: 'Solid White' }
              ].map(({ color, label }) => (
                <button 
                  key={color}
                  title={label}
                  className={`w-6 h-6 rounded-full border border-[#444] hover:scale-110 transition-transform ${items.find(i => i.id === customizePopup.id)?.color === color ? 'ring-2 ring-white' : ''}`}
                  style={{ backgroundColor: color }}
                  onClick={() => {
                    setItems(items.map(it => it.id === customizePopup.id ? { ...it, color } : it));
                  }}
                />
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
