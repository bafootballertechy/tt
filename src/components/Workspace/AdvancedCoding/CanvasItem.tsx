import React from 'react';
import { Type, Edit2, Trash2 } from 'lucide-react';
import { AdvancedPadItem, Tag as TagData, Label, LabelGroup, SmartConnector } from '../../../types';
import { getLuminance, calculateTagAutoFontSize } from './utils';
import { fadeColor } from '../../../utils/colors';

interface CanvasItemProps {
  item: AdvancedPadItem;
  tags: TagData[];
  labels: Label[];
  labelGroups: LabelGroup[];
  isTaggingMode: boolean;
  isConnectorMode: boolean;
  connectorSourceId: string | null;
  hoveredConnectorId: string | null;
  selectedConnectorId: string | null;
  activeRecording?: { tagId: string; startTime: number; labelIds?: string[] } | null;
  activeRecordings?: { tagId: string; startTime: number; labelIds?: string[] }[];
  flashingTagIds: { [tagId: string]: number };
  selectedItem: string | null;
  draggingItem: string | null;
  resizingItem: string | null;
  connectors: SmartConnector[];
  zoom: number;
  handlePointerDown: (e: React.PointerEvent, item: AdvancedPadItem) => void;
  removeItem: (id: string) => void;
  setCustomizePopup: (popup: { id: string; type: 'tag' | 'label' | 'text'; x: number; y: number } | null) => void;
  setResizingItem: (id: string | null) => void;
}

export const CanvasItem: React.FC<CanvasItemProps> = ({
  item,
  tags,
  labels,
  labelGroups,
  isTaggingMode,
  isConnectorMode,
  connectorSourceId,
  hoveredConnectorId,
  selectedConnectorId,
  activeRecording,
  activeRecordings,
  flashingTagIds,
  selectedItem,
  draggingItem,
  resizingItem,
  connectors,
  zoom,
  handlePointerDown,
  removeItem,
  setCustomizePopup,
  setResizingItem,
}) => {
  const isSelected = selectedItem === item.id && !isTaggingMode;
  const isConnectorSource = connectorSourceId === item.id;
  const isHoveredConnectorItem = hoveredConnectorId && (
    connectors.find(c => c.id === hoveredConnectorId)?.sourceId === item.id || 
    connectors.find(c => c.id === hoveredConnectorId)?.targetId === item.id
  );

  let content: React.ReactNode = null;
  let bgColor = '#222';
  let borderColor = '#333';
  
  if (item.type === 'tag') {
    const tag = tags.find(t => t.id === item.id);
    if (tag) {
      const customBgColor = item.color || tag.color;
      bgColor = customBgColor;
      borderColor = customBgColor;
      const isBright = getLuminance(customBgColor) > 160;
      const isRecordingActive = isTaggingMode && (
        (activeRecordings && activeRecordings.some(r => r.tagId === item.id)) || 
        activeRecording?.tagId === item.id
      );
      const isRecentlyClicked = isTaggingMode && Boolean(flashingTagIds[item.id]);
      const isTagActive = isRecordingActive || isRecentlyClicked;

      const textColor = isTagActive ? 'black' : (isBright ? '#000000' : '#ffffff');
      const subTextColor = isTagActive ? 'black' : (isBright ? 'rgba(0,0,0,0.7)' : 'rgba(255,255,255,0.8)');
      const textShadow = isTagActive || isBright ? 'none' : '0 1px 2px rgba(0,0,0,0.3)';

      // Dynamic auto-adjusted font size or explicit user font size
      const effectiveFontSize = item.fontSize || calculateTagAutoFontSize(tag.name, item.width, item.height);

      content = (
        <div 
          className="w-full h-full flex flex-col items-center justify-center p-1 sm:p-2 text-center relative select-none pointer-events-none overflow-hidden" 
          style={{ backgroundColor: isTagActive ? 'white' : customBgColor, userSelect: 'none', WebkitUserSelect: 'none' }}
        >
          {/* Red round pulsing recording indicator inside the tag when active/tagging */}
          {isTagActive && (
            <div 
              className="absolute top-1.5 right-1.5 flex items-center justify-center pointer-events-none z-20"
              title="Tagging in progress"
            >
              <span className="relative flex h-3 w-3 items-center justify-center">
                {/* Outer pulsing ping wave */}
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-500 opacity-80" />
                {/* Inner solid pulsating red circle with crisp white outline */}
                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-600 border border-white shadow-xs animate-pulse" />
              </span>
            </div>
          )}

          <span 
            className={`font-bold tracking-tight select-none pointer-events-none break-words max-w-full ${isTagActive ? 'px-4' : 'px-1'}`} 
            style={{ 
              color: textColor, 
              textShadow, 
              fontSize: `${effectiveFontSize}px`,
              lineHeight: effectiveFontSize < 10 ? '1.1' : '1.2',
              userSelect: 'none', 
              WebkitUserSelect: 'none',
              wordBreak: 'break-word',
              display: '-webkit-box',
              WebkitLineClamp: item.height < 45 ? 2 : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden'
            }}
            title={tag.name}
          >
            {tag.name}
          </span>
          {tag.shortcut && (
            <span 
              className="absolute top-0.5 left-1 font-mono select-none pointer-events-none font-bold" 
              style={{ 
                color: subTextColor, 
                fontSize: `${Math.max(7, Math.min(10, Math.floor(effectiveFontSize * 0.75)))}px`,
                userSelect: 'none', 
                WebkitUserSelect: 'none' 
              }}
            >
              {tag.shortcut.toUpperCase()}
            </span>
          )}
        </div>
      );
    } else {
      content = <span className="text-gray-500 text-[10px] select-none pointer-events-none">Tag Not Found</span>;
    }
  } else if (item.type === 'label') {
    const label = labels.find(l => l.id === item.id);
    if (label || item.content) {
      const group = label?.groupId ? labelGroups?.find(g => g.id === label.groupId) : null;
      const displayName = label?.name || item.content || 'Label';
      const isBright = item.color ? getLuminance(item.color) > 160 : false;
      const isLabelActive = isTaggingMode && (
        Boolean(activeRecording?.labelIds?.includes(item.id)) ||
        Boolean(activeRecordings?.some(r => r.labelIds?.includes(item.id)))
      );
      const isAssignActive = isTaggingMode && connectors.some(c => 
        c.targetId === item.id && 
        c.type === 'assign' && 
        c.enabled && 
        activeRecordings?.some(r => r.tagId === c.sourceId && r.labelIds?.includes(item.id))
      );
      
      content = (
        <div 
          className={`w-full h-full flex flex-col items-center justify-center border rounded-xl p-1 text-center relative shadow-sm select-none pointer-events-none transition-all ${
            isAssignActive 
              ? 'ring-4 ring-purple-500 shadow-[0_0_20px_rgba(168,85,247,0.85)] scale-105 animate-[pulse_1.8s_infinite]' 
              : (isLabelActive ? 'ring-2 ring-[#c6ff1f] shadow-[0_0_12px_rgba(198,255,31,0.5)]' : '')
          }`}
          style={{ 
            backgroundColor: isAssignActive
              ? 'rgba(168, 85, 247, 0.45)'
              : (isLabelActive 
                ? (item.color ? fadeColor(item.color, 0.6) : 'rgba(198, 255, 31, 0.25)') 
                : (item.color ? fadeColor(item.color, 0.3) : 'rgba(34, 34, 34, 0.6)')),
            borderColor: isAssignActive
              ? '#a855f7'
              : (isLabelActive 
                ? '#c6ff1f' 
                : (item.color ? fadeColor(item.color, 0.5) : '#444')),
            fontSize: item.fontSize ? `${item.fontSize}px` : '12px',
            userSelect: 'none',
            WebkitUserSelect: 'none'
          }}
        >
          {isAssignActive && (
            <div className="absolute -top-2.5 -right-1 bg-purple-600 text-white font-black text-[7px] px-1.5 py-0.5 rounded-full border border-purple-300 shadow-lg tracking-widest flex items-center gap-1 z-20">
              <span className="w-1 h-1 rounded-full bg-white animate-ping" />
              <span>LINK REC</span>
            </div>
          )}
          {group && (
            <span 
              className="text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full mb-0.5 truncate max-w-[95%] border border-white/10"
              style={{
                backgroundColor: isBright ? 'rgba(0,0,0,0.15)' : 'rgba(255,255,255,0.12)',
                color: isBright ? '#222222' : '#a3a3a3'
              }}
            >
              {group.name}
            </span>
          )}
          <span 
            className="font-bold truncate px-1 select-none pointer-events-none" 
            style={{ 
              fontSize: 'inherit', 
              color: isAssignActive ? '#ffffff' : (isLabelActive ? '#c6ff1f' : (isBright ? '#000000' : '#e5e7eb')), 
              userSelect: 'none', 
              WebkitUserSelect: 'none' 
            }}
          >
            {displayName}
          </span>
          {isLabelActive && !isAssignActive && (
            <div className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#c6ff1f] shadow-sm animate-pulse" />
          )}
        </div>
      );
    } else {
      content = <span className="text-gray-500 text-[10px] select-none pointer-events-none">Label Not Found</span>;
    }
  } else if (item.type === 'text') {
    const defaultTextBg = 'rgba(198, 255, 31, 0.15)';
    const itemBg = item.color || defaultTextBg;
    const isBright = getLuminance(itemBg) > 160;
    content = (
      <div 
        className="w-full h-full flex items-center justify-start relative group text-left select-none pointer-events-none px-2.5 py-1.5 rounded border shadow-xs" 
        style={{
          backgroundColor: itemBg,
          fontSize: item.fontSize ? `${item.fontSize}px` : '12px',
          borderColor: item.color ? (item.color.startsWith('rgba') ? 'rgba(255,255,255,0.15)' : item.color) : 'rgba(198, 255, 31, 0.3)',
          boxShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
          color: isBright ? '#000000' : 'white',
          backdropFilter: 'blur(4px)',
          userSelect: 'none',
          WebkitUserSelect: 'none'
        }}
      >
        {/* Hanging String (Wall aesthetic) - attaches to left and right side */}
        <svg className="absolute -top-6 left-0 w-full h-6 overflow-visible pointer-events-none select-none" viewBox="0 0 100 24" preserveAspectRatio="none">
          {/* Left string: attaches from center wall nail (50, 3) to left side of sign (10, 24) */}
          <line x1="50" y1="3" x2="10" y2="24" stroke="#94a3b8" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
          {/* Right string: attaches from center wall nail (50, 3) to right side of sign (90, 24) */}
          <line x1="50" y1="3" x2="90" y2="24" stroke="#94a3b8" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
        </svg>

        {/* Wall Nail pinned at center apex */}
        <div className="absolute -top-6 left-1/2 -translate-x-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-slate-300 border border-slate-700 shadow-md shadow-black/60 pointer-events-none z-10 flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-slate-600" />
        </div>

        {/* Left & Right corner eyelets on sign where the strings attach */}
        <div className="absolute top-1 left-2 w-2.5 h-2.5 rounded-full border border-slate-400 bg-slate-300 pointer-events-none shadow-xs shadow-black/40 flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-slate-700" />
        </div>
        <div className="absolute top-1 right-2 w-2.5 h-2.5 rounded-full border border-slate-400 bg-slate-300 pointer-events-none shadow-xs shadow-black/40 flex items-center justify-center">
          <div className="w-1 h-1 rounded-full bg-slate-700" />
        </div>

        <div className="w-full h-full flex items-center overflow-hidden break-words font-bold tracking-tight select-none pointer-events-none truncate" style={{ userSelect: 'none', WebkitUserSelect: 'none' }}>
          {item.content || 'Double click to edit text'}
        </div>
      </div>
    );
  }

  const isTagItem = item.type === 'tag';
  const isThisTagActive = isTagItem && isTaggingMode && (
    Boolean(activeRecordings?.some(r => r.tagId === item.id)) || 
    activeRecording?.tagId === item.id || 
    Boolean(flashingTagIds[item.id])
  );

  return (
    <div 
      className={`absolute group shadow-lg transition-all duration-200 select-none
        ${isConnectorSource ? 'ring-4 ring-blue-500 ring-offset-2 ring-offset-[#161616] z-50 scale-105' : ''}
        ${!isConnectorSource && isHoveredConnectorItem ? 'ring-2 ring-[#c6ff1f] ring-offset-2 ring-offset-[#161616] z-40' : ''}
        ${isSelected && !isConnectorMode ? 'ring-2 ring-[#c6ff1f] ring-offset-2 ring-offset-[#161616] z-50' : ''}
        ${isThisTagActive ? 'ring-2 ring-red-500 shadow-[0_0_14px_rgba(239,68,68,0.5)] z-40 scale-[1.02]' : ''}
        ${(!isSelected && !isConnectorSource && !isHoveredConnectorItem && !isThisTagActive) ? (isTaggingMode ? 'hover:scale-105 hover:ring-2 hover:ring-white z-10' : (isConnectorMode ? 'hover:ring-2 hover:ring-blue-400 z-10' : 'hover:ring-1 hover:ring-white/30 z-10')) : ''}
        ${item.type === 'tag' ? 'rounded-md overflow-hidden' : ''}`}
      style={{ 
        left: item.x, 
        top: item.y, 
        width: item.width, 
        height: item.height,
        zIndex: isSelected || isConnectorSource ? 50 : (isHoveredConnectorItem ? 40 : (item.zIndex ?? 10)),
        transform: `rotate(${item.rotation || 0}deg) ${isConnectorSource ? 'scale(1.05)' : ''}`,
        transition: draggingItem === item.id ? 'none' : 'box-shadow 0.2s, transform 0.2s',
        cursor: (isTaggingMode || isConnectorMode) ? 'pointer' : (draggingItem === item.id ? 'grabbing' : 'grab'),
        userSelect: 'none',
        WebkitUserSelect: 'none',
        WebkitTouchCallout: 'none'
      }}
      onPointerDown={(e) => handlePointerDown(e, item)}
      onDragStart={(e) => e.preventDefault()}
      onDoubleClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        if (window.getSelection) {
          window.getSelection()?.removeAllRanges();
        }
        if (!isTaggingMode) {
          setCustomizePopup({ id: item.id, type: item.type as any, x: e.clientX, y: e.clientY });
        }
      }}
    >
      {content}
      
      {/* Controls overlay in edit mode */}
      {isSelected && !isTaggingMode && (
        <>
          {/* Floating Item Action Toolbar */}
          <div 
            className="absolute -top-9 left-1/2 -translate-x-1/2 bg-[#18181c] border border-[#3b3b45] rounded-lg shadow-2xl px-1.5 py-0.5 flex items-center gap-1 z-50 select-none backdrop-blur-md"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => {
              e.stopPropagation();
              if (window.getSelection) window.getSelection()?.removeAllRanges();
            }}
          >
            <span className="text-[8.5px] font-extrabold uppercase px-1 py-0.5 bg-[#25252e] text-gray-300 rounded border border-white/10 tracking-wider">
              {item.type}
            </span>

            <div className="w-[1px] h-3 bg-[#333] mx-0.5" />

            {/* Edit / Customize button */}
            <button 
              onClick={(e) => {
                e.stopPropagation();
                const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                setCustomizePopup({ id: item.id, type: item.type as any, x: rect.left, y: rect.bottom + 8 });
              }}
              className="p-1 bg-[#22222a] hover:bg-[#32323e] text-gray-300 hover:text-[#c6ff1f] rounded border border-[#3a3a46] transition-colors shadow-xs"
              title="Open styling & text size options"
            >
              <Edit2 className="w-2.5 h-2.5" />
            </button>

            {/* Delete button */}
            <button 
              onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}
              onPointerDown={(e) => { e.stopPropagation(); e.preventDefault(); }}
              className="p-1 bg-red-500/20 hover:bg-red-500 text-red-300 hover:text-white rounded border border-red-500/30 transition-colors shadow-xs"
              title="Remove from Pad"
            >
              <Trash2 className="w-2.5 h-2.5" />
            </button>
          </div>
          
          {/* Resize border and handle */}
          <div className="absolute inset-0 border border-[#c6ff1f] pointer-events-none select-none" />
          <div 
            className="resize-handle absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-[#161616] border-2 border-[#c6ff1f] rounded-full cursor-nwse-resize shadow-md z-50 hover:scale-125 transition-transform select-none" 
            onPointerDown={(e) => {
              e.stopPropagation();
              e.preventDefault();
              setResizingItem(item.id);
              if (window.getSelection) {
                window.getSelection()?.removeAllRanges();
              }
            }}
          />
        </>
      )}
    </div>
  );
};
