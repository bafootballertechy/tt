const fs = require('fs');

let content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf8');

const targetStr = `{/* Layer 1: Timeline Content */}
                {isTimelineExpanded ? (
                    // EXPANDED MULTI-LAYER TIMELINE
                    <div className="flex-1 flex min-h-0 relative group/timeline">
                         {/* Scrollable Timeline Area */}
                         <div 
                            ref={timelineContainerRef}
                            className="flex-1 relative overflow-auto bg-[#0a0a0a] scroll-smooth"
                         >`;

const replacementStr = `{/* Layer 1: Timeline Content */}
                {isTimelineExpanded ? (
                    // EXPANDED MULTI-LAYER TIMELINE
                    <div className="flex-1 flex min-h-0 relative group/timeline bg-[#0a0a0a]">
                        {/* Left Sidebar (Track Headers) */}
                        <div className="w-48 bg-[#111] border-r border-[#222] shrink-0 flex flex-col relative z-40 shadow-[4px_0_15px_rgba(0,0,0,0.5)]">
                            {/* Header for sticky ruler alignment */}
                            <div className="h-8 border-b border-white/5 bg-[#111]/80 backdrop-blur-md sticky top-0 shrink-0" />
                            
                            {/* Track rows */}
                            <div className="flex-1 flex flex-col pt-3 space-y-1.5 px-3">
                                {showTimelineTags && <div className="h-8 flex items-center gap-3 text-xs font-medium text-gray-300">
                                    <Video className="w-4 h-4 text-gray-400" />
                                    <span>Tag Tracks</span>
                                </div>}
                                {showTimelineFreezeFrames && <div className="h-8 flex items-center gap-3 text-xs font-medium text-gray-300">
                                    <Snowflake className="w-4 h-4 text-gray-400" />
                                    <span>Freeze Frames</span>
                                </div>}
                                <div className="h-10 flex items-center justify-between group">
                                    <div className="flex items-center gap-3 text-xs font-medium text-gray-300">
                                        <MapPin className="w-4 h-4 text-gray-400" />
                                        <span>Notes</span>
                                    </div>
                                    <button 
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setMarkerModal({ isOpen: true, x: 0, y: 0, mode: 'create', time: currentTime, tempLabel: '', tempColor: '#3b82f6' });
                                        }}
                                        className="opacity-0 group-hover:opacity-100 p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white transition-all"
                                    >
                                        <Plus className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                         {/* Scrollable Timeline Area */}
                         <div 
                            ref={timelineContainerRef}
                            className="flex-1 relative overflow-auto bg-[#0a0a0a] scroll-smooth"
                         >`;

content = content.replace(targetStr, replacementStr);
fs.writeFileSync('src/components/Workspace/Workspace.tsx', content);
