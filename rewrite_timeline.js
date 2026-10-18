import fs from 'fs';

const content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf8');

const targetStart = '{/* Standard Timeline (Hidden if trimming) */}';
const targetEnd = '</div>\n                            </div>\n                        )}\n                    </div>\n                )}\n\n                {/* Layer 2: Controls */}';

const startIndex = content.indexOf(targetStart);
const endIndex = content.indexOf(targetEnd);

if (startIndex === -1 || endIndex === -1) {
    console.error("Boundaries not found! start:", startIndex, "end:", endIndex);
    process.exit(1);
}

const originalBlock = content.substring(startIndex, endIndex + targetEnd.length);

const newBlock = `{/* Standard Timeline (Hidden if trimming) */}
                        {!(selectedEventIds.size === 1 && !isMultiSelectAction) && (
                            <div className="relative h-12 w-full flex flex-col justify-end overflow-hidden" ref={timelineContainerRef}>
                                <div className="relative h-full" style={{ width: \`\${timelineZoom * 100}%\` }}>
                                    
                                    {/* YouTube Style Scrubber Line (Safe Zone) */}
                                    <div className="absolute top-0 left-0 w-full h-4 z-50 cursor-ew-resize group/scrubber flex items-center" onMouseDown={handleScrubStart} onContextMenu={handleTimelineContextMenu}>
                                        <div className="relative w-full h-[3px] bg-white/20 group-hover/scrubber:h-1.5 transition-all rounded-full hover:bg-white/30">
                                            <div className="absolute top-0 bottom-0 left-0 bg-red-500 rounded-full" style={{ width: \`\${(currentTime / (duration || 1)) * 100}%\` }} />
                                            <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-red-500 rounded-full opacity-0 group-hover/scrubber:opacity-100 transition-opacity shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-white/50 pointer-events-none" style={{ left: \`calc(\${(currentTime / (duration || 1)) * 100}% - 6px)\` }} />
                                        </div>
                                    </div>

                                    {/* Events Container */}
                                    <div className="absolute bottom-0 left-0 w-full h-8 bg-[#111] rounded-xl border border-white/10 shadow-inner overflow-hidden">
                                        
                                        {/* Playhead vertical indicator line */}
                                        <motion.div 
                                            className="absolute top-0 bottom-0 w-[2px] bg-red-500/80 z-50 pointer-events-none"
                                            style={{ left: \`\${(currentTime / (duration || 1)) * 100}%\` }}
                                            transition={{ type: 'tween', ease: 'linear', duration: 0.1 }}
                                        />

                                        {/* Live Recording Overlay */}
                                        {isTaggingMode && activeRecording && (
                                            <div 
                                                style={{
                                                    left: \`\${(activeRecording.startTime / (duration || 1)) * 100}%\`,
                                                    width: \`\${((currentTime - activeRecording.startTime) / (duration || 1)) * 100}%\`,
                                                    backgroundColor: tags.find(t => t.id === activeRecording.tagId)?.color || 'red'
                                                }}
                                                className="absolute top-0 bottom-0 opacity-30 z-0 pointer-events-none animate-pulse bg-gradient-to-r from-transparent to-current"
                                            />
                                        )}

                                        {/* Ticks/Grid */}
                                        <div className="absolute inset-0 flex justify-between items-center px-1 opacity-20 pointer-events-none">
                                            {[...Array(40)].map((_, i) => <div key={i} className="w-1 h-1 rounded-full bg-white" />)}
                                        </div>

                                        {/* Events Layer */}
                                        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-6 pointer-events-none z-10 px-0.5">
                                            {tagEvents.filter(e => filterTagId ? e.tagId === filterTagId : true).map(evt => {
                                                const tag = tags.find(t => t.id === evt.tagId);
                                                const startPct = (evt.startTime / (duration || 1)) * 100;
                                                const widthPct = ((evt.endTime - evt.startTime) / (duration || 1)) * 100;
                                                const isSelected = selectedEventIds.has(evt.id);
                                                
                                                return (
                                                    <motion.div
                                                        key={evt.id}
                                                        whileHover={{ scaleY: 1.15, scaleX: 1.02, zIndex: 50 }}
                                                        style={{ 
                                                            left: \`\${startPct}%\`,
                                                            width: \`\${Math.max(widthPct, 0.4)}%\`,
                                                            backgroundColor: tag?.color || '#fff'
                                                        }}
                                                        className={\`absolute top-0 bottom-0 cursor-pointer pointer-events-auto transition-colors rounded-full group/tagevent shadow-sm border border-black/20
                                                            \${isSelected ? 'ring-2 ring-white z-40 opacity-100 brightness-125' : 'opacity-85 hover:opacity-100 hover:brightness-110'}
                                                        \`}
                                                        onClick={(e) => handleEventClick(e, evt.id, evt.startTime)}
                                                        onContextMenu={(e) => handleEventContextMenu(e, evt.id)}
                                                    >
                                                        <div className="absolute inset-0 bg-gradient-to-b from-white/20 to-transparent rounded-full pointer-events-none" />
                                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-black/90 text-white text-[10px] font-medium rounded-lg whitespace-nowrap opacity-0 group-hover/tagevent:opacity-100 pointer-events-none transition-all duration-200 border border-white/10 z-50 shadow-xl backdrop-blur-sm transform translate-y-1 group-hover/tagevent:translate-y-0">
                                                            {tag?.name} <span className="text-gray-400 ml-1">({ (evt.endTime - evt.startTime).toFixed(1) }s)</span>
                                                        </div>
                                                    </motion.div>
                                                );
                                            })}
                                        </div>

                                        {/* Freeze Frames Layer */}
                                        <div className="absolute top-0 bottom-0 left-0 w-full pointer-events-none z-30">
                                            {freezeFrames.map(ff => (
                                                <div key={ff.id} style={{ left: \`\${(ff.timestamp / (duration || 1)) * 100}%\` }} className="absolute top-0 bottom-0 w-0.5 bg-blue-500 group/ffmarker shadow-[0_0_8px_rgba(59,130,246,0.8)]">
                                                    <div className="absolute -top-1.5 left-1/2 -translate-x-1/2"><Snowflake className="w-3 h-3 text-blue-300 fill-blue-500 drop-shadow-md" /></div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Markers Layer */}
                                        <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-8 pointer-events-none z-40">
                                            {markers.map(marker => (
                                                <div key={marker.id} style={{ left: \`\${(marker.time / (duration || 1)) * 100}%\`, backgroundColor: marker.color }} className="absolute top-0 bottom-0 w-0.5 pointer-events-auto hover:w-1 transition-all cursor-pointer group/marker shadow-md" onClick={(e) => { e.stopPropagation(); jumpToMarker(marker.time); }} onContextMenu={(e) => handleMarkerContextMenu(e, marker)}>
                                                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full border border-[#111] shadow-sm" style={{backgroundColor: marker.color}} />
                                                </div>
                                            ))}
                                        </div>
                                        
                                        {/* Removed the background scrubber! Events area is no longer scrubbable */}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Layer 2: Controls */}`;

const newContent = content.substring(0, startIndex) + newBlock + content.substring(endIndex + targetEnd.length);

fs.writeFileSync('src/components/Workspace/Workspace.tsx', newContent);
console.log('Successfully updated timeline!');
