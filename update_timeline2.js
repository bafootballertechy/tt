const fs = require('fs');

let content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf8');

// 1. Update Left Sidebar
const sidebarTarget = `{/* Track rows */}
                            <div className="flex-1 flex flex-col py-3 space-y-1.5 px-3">
                                {showTimelineTags && <div className="h-8 flex items-center gap-3 text-xs font-medium text-gray-300">
                                    <Video className="w-4 h-4 text-gray-400" />
                                    <span>Tag Tracks</span>
                                </div>}
                                <div className="h-10 flex items-center justify-between group mt-2 border-t border-white/5 pt-2">
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
                            </div>`;

const sidebarReplacement = `{/* Track rows */}
                            <div className="flex-1 flex flex-col py-3 space-y-1.5 px-3 relative z-10 pointer-events-none">
                                {showTimelineTags && timelineLanes.map((_, i) => (
                                    <div key={i} className="h-8 flex items-center gap-3 text-xs font-medium text-gray-300 pointer-events-auto">
                                        {i === 0 ? <Video className="w-4 h-4 text-gray-400" /> : <div className="w-4 h-4" />}
                                        <span>{i === 0 ? 'Tag Tracks' : \`Track \${i + 1}\`}</span>
                                    </div>
                                ))}
                                
                                {showTimelineFreezeFrames && (
                                    <div className="h-10 flex items-center justify-between group mt-2 border-t border-white/5 pt-2 pointer-events-auto">
                                        <div className="flex items-center gap-3 text-xs font-medium text-gray-300">
                                            <Snowflake className="w-4 h-4 text-gray-400" />
                                            <span>Freeze Frames</span>
                                        </div>
                                    </div>
                                )}

                                <div className="h-10 flex items-center justify-between group mt-2 border-t border-white/5 pt-2 pointer-events-auto">
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
                            </div>`;

content = content.replace(sidebarTarget, sidebarReplacement);
fs.writeFileSync('src/components/Workspace/Workspace.tsx', content);
