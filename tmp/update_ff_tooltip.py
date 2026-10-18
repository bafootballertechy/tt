with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

# 1. Update renderFF in properties panel
old_render_ff = '''                                      return (
                                          <div key={ff.id} className="relative group/ffitem">
                                              <div className="absolute right-full mr-1 top-1/2 -translate-y-1/2 w-[120px] opacity-0 pointer-events-none group-hover/ffitem:opacity-100 group-hover/ffitem:pointer-events-auto z-50 bg-[#141416] rounded-md border border-[#333] p-1 shadow-2xl transition-opacity">
                                                  {ff.thumbnailDataUrl ? (
                                                      <img src={ff.thumbnailDataUrl} alt={ff.name} className="w-full h-auto rounded-[4px] border border-[#222]" />
                                                  ) : (
                                                      <div className="w-full aspect-video bg-[#0a0a0a] rounded-[4px] flex items-center justify-center text-[9px] text-gray-500 border border-[#222]">No Preview</div>
                                                  )}
                                                  <div className="text-[9px] text-center text-gray-300 mt-1 font-semibold truncate px-1">{ff.name || `Frame ${index + 1}`}</div>
                                              </div>
                                              <div 
                                                  id={`ff-item-${ff.id}`}
                                                  className={containerClasses}
                                                  onMouseEnter={() => setHoveredFreezeFrameId(ff.id)}
                                                  onMouseLeave={() => setHoveredFreezeFrameId(null)}
                                                  onClick={() => { handleManualSeek(ff.timestamp); if(videoRef.current) { videoRef.current.pause(); setIsPlaying(false); } }}
                                              >'''

new_render_ff = '''                                      return (
                                          <div key={ff.id} className="relative group/ffitem">
                                              <div 
                                                  id={`ff-item-${ff.id}`}
                                                  className={containerClasses}
                                                  onMouseEnter={(e) => {
                                                      setHoveredFreezeFrameId(ff.id);
                                                      const rect = e.currentTarget.getBoundingClientRect();
                                                      setHoveredFFInfo({
                                                          ff,
                                                          top: rect.top,
                                                          left: rect.right + 12,
                                                          source: 'sidebar'
                                                      });
                                                  }}
                                                  onMouseLeave={() => {
                                                      setHoveredFreezeFrameId(null);
                                                      setHoveredFFInfo(null);
                                                  }}
                                                  onClick={() => { handleManualSeek(ff.timestamp); if(videoRef.current) { videoRef.current.pause(); setIsPlaying(false); } }}
                                              >'''

if old_render_ff in content:
    content = content.replace(old_render_ff, new_render_ff)
    print('Successfully updated renderFF')
else:
    print('Failed to match renderFF')

# 2. Update expanded timeline markers
old_expanded_marker = '''                                                      return (
                                                          <div key={ff.id} 
                                                              className="absolute top-1 bottom-1 w-2 rounded-full cursor-pointer pointer-events-auto transition-all hover:scale-125 z-40 shadow-[0_0_8px_rgba(59,130,246,0.5)] border border-white/20"
                                                              style={{ left: `${(ff.timestamp / (duration || 1)) * 100}%`, backgroundColor: isActive ? '#f59e0b' : '#3b82f6', transform: 'translateX(-50%)' }}
                                                              onClick={(e) => { e.stopPropagation(); jumpToMarker(ff.timestamp); }}
                                                          />
                                                      );'''

new_expanded_marker = '''                                                      return (
                                                          <div key={ff.id} 
                                                              className="absolute top-1 bottom-1 w-2 rounded-full cursor-pointer pointer-events-auto transition-all hover:scale-125 z-40 shadow-[0_0_8px_rgba(59,130,246,0.5)] border border-white/20"
                                                              style={{ left: `${(ff.timestamp / (duration || 1)) * 100}%`, backgroundColor: isActive ? '#f59e0b' : '#3b82f6', transform: 'translateX(-50%)' }}
                                                              onMouseEnter={(e) => {
                                                                  setHoveredFreezeFrameId(ff.id);
                                                                  const rect = e.currentTarget.getBoundingClientRect();
                                                                  setHoveredFFInfo({
                                                                      ff,
                                                                      top: rect.top,
                                                                      left: rect.left + rect.width / 2,
                                                                      source: 'timeline'
                                                                  });
                                                              }}
                                                              onMouseLeave={() => {
                                                                  setHoveredFreezeFrameId(null);
                                                                  setHoveredFFInfo(null);
                                                              }}
                                                              onClick={(e) => { e.stopPropagation(); jumpToMarker(ff.timestamp); }}
                                                          />
                                                      );'''

if old_expanded_marker in content:
    content = content.replace(old_expanded_marker, new_expanded_marker)
    print('Successfully updated expanded timeline marker')
else:
    print('Failed to match expanded timeline marker')

# 3. Update collapsed timeline marker
old_collapsed_marker = '''                                                 return (
                                                     <div 
                                                         key={ff.id} 
                                                         style={{ left: `${(ff.timestamp / (duration || 1)) * 100}%` }} 
                                                         className={markerClass}
                                                     >
                                                         <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all ${isActive || isHovered ? 'scale-125' : ''}`}>
                                                             <div className={badgeClass}>
                                                                 {index + 1}
                                                             </div>
                                                             <Snowflake className={iconClass} />
                                                         </div>
                                                     </div>
                                                 );'''

new_collapsed_marker = '''                                                 return (
                                                     <div 
                                                         key={ff.id} 
                                                         style={{ left: `${(ff.timestamp / (duration || 1)) * 100}%` }} 
                                                         className={`${markerClass} pointer-events-auto cursor-pointer`}
                                                         onMouseEnter={(e) => {
                                                             setHoveredFreezeFrameId(ff.id);
                                                             const rect = e.currentTarget.getBoundingClientRect();
                                                             setHoveredFFInfo({
                                                                 ff,
                                                                 top: rect.top,
                                                                 left: rect.left + 8,
                                                                 source: 'timeline'
                                                             });
                                                         }}
                                                         onMouseLeave={() => {
                                                             setHoveredFreezeFrameId(null);
                                                             setHoveredFFInfo(null);
                                                         }}
                                                         onClick={(e) => { e.stopPropagation(); jumpToMarker(ff.timestamp); }}
                                                     >
                                                         <div className={`absolute -top-3 left-1/2 -translate-x-1/2 flex flex-col items-center transition-all ${isActive || isHovered ? 'scale-125' : ''}`}>
                                                             <div className={badgeClass}>
                                                                 {index + 1}
                                                             </div>
                                                             <Snowflake className={iconClass} />
                                                         </div>
                                                     </div>
                                                 );'''

if old_collapsed_marker in content:
    content = content.replace(old_collapsed_marker, new_collapsed_marker)
    print('Successfully updated collapsed timeline marker')
else:
    print('Failed to match collapsed timeline marker')

# 4. Add floating hoveredFFInfo preview card before ExportVideoModal
tooltip_card = """
    {/* Floating Freeze Frame Thumbnail Preview Tooltip (Always Visible, Unclipped) */}
    {hoveredFFInfo && (
      <div 
        style={{
          position: 'fixed',
          top: hoveredFFInfo.source === 'sidebar' 
            ? Math.max(12, Math.min(window.innerHeight - 240, hoveredFFInfo.top - 20))
            : Math.max(12, hoveredFFInfo.top - 190),
          left: hoveredFFInfo.source === 'sidebar' 
            ? hoveredFFInfo.left 
            : Math.max(12, Math.min(window.innerWidth - 240, hoveredFFInfo.left - 110)),
          zIndex: 99999,
          pointerEvents: 'none'
        }}
        className="w-[220px] bg-[#141418]/95 backdrop-blur-md rounded-xl border border-[#333] p-2.5 shadow-[0_12px_36px_rgba(0,0,0,0.85)] ring-1 ring-white/10 animate-in fade-in zoom-in-95 duration-150 select-none"
      >
        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-black border border-[#222] shadow-inner mb-2 flex items-center justify-center">
          {hoveredFFInfo.ff.thumbnailDataUrl ? (
            <img 
              src={hoveredFFInfo.ff.thumbnailDataUrl} 
              alt={hoveredFFInfo.ff.name} 
              className="w-full h-full object-cover rounded-lg" 
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center text-gray-500 text-[10px] gap-1 bg-[#0a0a0c]">
              <Snowflake className="w-5 h-5 text-gray-600" />
              <span>No Preview Available</span>
            </div>
          )}
          <div className="absolute top-1.5 right-1.5 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-[#c6ff1f] border border-white/15 shadow-sm">
            {hoveredFFInfo.ff.duration}s
          </div>
          <div className="absolute bottom-1.5 left-1.5 bg-black/75 backdrop-blur-sm px-1.5 py-0.5 rounded text-[9px] font-mono font-bold text-white border border-white/15 shadow-sm flex items-center gap-1">
            <Clock className="w-2.5 h-2.5 text-[#c6ff1f]" />
            {formatTime(hoveredFFInfo.ff.timestamp)}
          </div>
        </div>
        <div className="flex items-center justify-between px-0.5">
          <div className="text-[11px] font-bold text-gray-100 truncate pr-2">
            {hoveredFFInfo.ff.name || 'Freeze Frame'}
          </div>
          <span className="text-[9px] text-[#c6ff1f] font-mono font-semibold uppercase tracking-wider bg-[#c6ff1f]/10 border border-[#c6ff1f]/30 px-1 py-0.2 rounded shrink-0">
            Frame
          </span>
        </div>
        {(() => {
          const count = shapes.filter(s => s.freezeFrameId === hoveredFFInfo.ff.id).length;
          return (
            <div className="text-[9px] text-gray-400 mt-1.5 flex items-center justify-between border-t border-[#26262a] pt-1.5">
              <span>{count} annotation{count === 1 ? '' : 's'}</span>
              <span className="text-gray-500 font-medium">Click to seek</span>
            </div>
          );
        })()}
      </div>
    )}
"""

export_modal_closing = '    <ExportVideoModal'
if export_modal_closing in content:
    content = content.replace(export_modal_closing, tooltip_card + '\n    <ExportVideoModal')
    print('Successfully added floating thumbnail tooltip card')
else:
    print('Failed to find ExportVideoModal closing')

with open('src/components/Workspace/Workspace.tsx', 'w') as f:
    f.write(content)
