import fs from 'fs';
const content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf8');

const startIdx = content.indexOf('const renderPropertiesPanel = () => {');
const endIdx = content.indexOf('  return (\n    <div className="w-screen h-screen flex flex-col bg-[#0e0e0e] relative overflow-hidden">');

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not find boundaries');
  process.exit(1);
}

const newPanelCode = `const renderPropertiesPanel = () => {
      const SectionHeader = ({ icon: Icon, title, subtitle, colorClass, bgClass, borderClass }: any) => (
          <div className="flex items-center gap-3 mb-6">
              <div className={\`p-2.5 rounded-xl border shadow-sm \${bgClass} \${borderClass}\`}>
                  <Icon className={\`w-5 h-5 \${colorClass}\`} />
              </div>
              <div>
                  <h3 className="text-sm font-bold text-gray-100 tracking-tight">{title}</h3>
                  <p className="text-[10px] text-gray-500 font-medium uppercase tracking-wider">{subtitle}</p>
              </div>
          </div>
      );

      const RangeSlider = ({ label, value, onChange, min, max, step, unit, accentClass }: any) => (
          <div className="space-y-2.5">
              <div className="flex justify-between items-end">
                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
                  <span className="text-xs font-mono text-gray-300 bg-[#1a1a1c] px-2 py-0.5 rounded border border-[#2a2a2c]">{value}{unit}</span>
              </div>
              <input type="range" min={min} max={max} step={step} value={value} onChange={onChange} className={\`w-full h-1.5 bg-[#2a2a2c] rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:rounded-full \${accentClass}\`} />
          </div>
      );

      const ToggleSwitch = ({ checked, onChange, colorClass }: any) => (
          <button onClick={onChange} className={\`w-10 h-5 rounded-full relative transition-colors shrink-0 \${checked ? colorClass : 'bg-[#2a2a2c] hover:bg-[#333]'}\`}>
              <div className={\`absolute top-1 w-3 h-3 bg-white rounded-full transition-all shadow-sm \${checked ? 'left-6' : 'left-1'}\`} />
          </button>
      );

      if (tool === null) {
          return (
              <div className="space-y-4 animate-in fade-in duration-200">
                  <SectionHeader icon={Snowflake} title="Freeze Frames" subtitle="Persistent Telestrations" colorClass="text-blue-400" bgClass="bg-blue-500/10" borderClass="border-blue-500/20" />
                  
                  {activeFreezeFrameId ? (
                      <div className="bg-[#10141f] border border-blue-500/30 rounded-xl p-5 flex flex-col items-center justify-center space-y-3 shadow-inner">
                          <span className="text-[10px] font-bold text-blue-400 uppercase tracking-widest">Active Freeze</span>
                          <div className="text-4xl font-black text-white font-mono tracking-tighter">{countdownValue.toFixed(1)}s</div>
                          <div className="h-1.5 w-full bg-[#1e293b] rounded-full overflow-hidden mt-2">
                              <motion.div className="h-full bg-blue-500" initial={{ width: "100%" }} animate={{ width: "0%" }} transition={{ duration: countdownValue, ease: "linear" }} />
                          </div>
                      </div>
                  ) : (
                      <div className="space-y-4">
                          <button onClick={addFreezeFrame} disabled={isPlaying} className="w-full py-2 bg-blue-600/10 hover:bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:border-blue-500/50 rounded-lg flex items-center justify-center gap-2 font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all text-xs shadow-sm">
                              <PlusCircle className="w-3.5 h-3.5" /> Add Freeze Frame
                          </button>
                          <div className="space-y-2.5 mt-2">
                              {freezeFrames.length === 0 && <div className="text-center py-10 text-gray-500 text-xs font-medium italic bg-[#141416] rounded-xl border border-[#222] border-dashed">Pause video to add frames</div>}
                              {freezeFrames.sort((a,b) => a.timestamp - b.timestamp).map(ff => (
                                  <div key={ff.id} className="bg-[#141416] border border-[#262629] rounded-xl p-3.5 group hover:border-[#3a3a3f] transition-all shadow-sm hover:shadow-md">
                                      <div className="flex items-center justify-between mb-3">
                                          <div className="flex items-center gap-2 text-blue-400 font-mono text-xs font-medium cursor-pointer hover:text-blue-300" onClick={() => { handleManualSeek(ff.timestamp); if(videoRef.current) { videoRef.current.pause(); setIsPlaying(false); } }}>
                                              <Clock className="w-3.5 h-3.5 opacity-70" /> {formatTime(ff.timestamp)}
                                          </div>
                                          <button onClick={() => deleteFreezeFrame(ff.id)} className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                                      </div>
                                      
                                      <div className="flex items-center justify-between mt-2 pt-3 border-t border-[#1e1e20]">
                                          <div className="flex items-center gap-1.5 text-[10px] text-gray-400 uppercase font-bold tracking-wider">
                                             <Timer className="w-3 h-3" /> Duration
                                          </div>
                                          <div className="flex items-center bg-[#0a0a0c] border border-[#2a2a2c] rounded-md overflow-hidden shadow-inner">
                                              <button onClick={() => updateFreezeFrameDuration(ff.id, Math.max(1, ff.duration - 0.5))} className="px-2 py-1 hover:bg-[#222] text-gray-400 hover:text-white transition-colors border-r border-[#2a2a2c]"><Minus className="w-3 h-3" /></button>
                                              <div className="w-12 text-center text-xs font-mono font-semibold text-gray-200">{ff.duration}s</div>
                                              <button onClick={() => updateFreezeFrameDuration(ff.id, Math.min(60, ff.duration + 0.5))} className="px-2 py-1 hover:bg-[#222] text-gray-400 hover:text-white transition-colors border-l border-[#2a2a2c]"><Plus className="w-3 h-3" /></button>
                                          </div>
                                      </div>
                                  </div>
                              ))}
                          </div>
                      </div>
                  )}
              </div>
          );
      }

      if (tool === 'masking') {
          return (
              <div className="space-y-4 animate-in fade-in duration-200">
                  <SectionHeader icon={Layers} title="Chroma Key" subtitle="Green Screen Masking" colorClass="text-green-400" bgClass="bg-green-500/10" borderClass="border-green-500/20" />
                  
                  <div className="flex items-center justify-between p-3.5 bg-[#141416] border border-[#262629] rounded-xl shadow-sm">
                      <span className="text-xs font-bold text-gray-300 uppercase tracking-wide">Enable Effect</span>
                      <ToggleSwitch checked={maskSettings.enabled} onChange={() => setMaskSettings({...maskSettings, enabled: !maskSettings.enabled})} colorClass="bg-green-500" />
                  </div>
                  
                  {maskSettings.enabled && (
                      <div className="space-y-5 animate-in fade-in slide-in-from-top-2 pt-2">
                          <RangeSlider label="Hue Sensitivity" value={maskSettings.sensitivity} onChange={(e: any) => setMaskSettings({...maskSettings, sensitivity: parseInt(e.target.value)})} min={1} max={100} step={1} unit="" accentClass="[&::-webkit-slider-thumb]:bg-green-500" />
                          <RangeSlider label="Shadow Tolerance" value={maskSettings.shadowTolerance} onChange={(e: any) => setMaskSettings({...maskSettings, shadowTolerance: parseInt(e.target.value)})} min={0} max={100} step={1} unit="" accentClass="[&::-webkit-slider-thumb]:bg-green-500" />
                          
                          <div className="space-y-2.5">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Pitch Color</label>
                              <div className="flex items-center gap-3 bg-[#141416] border border-[#262629] rounded-xl p-2 shadow-sm">
                                <input type="color" value={maskSettings.keyColor} onChange={(e) => setMaskSettings({...maskSettings, keyColor: e.target.value})} className="w-10 h-10 rounded-lg cursor-pointer border-2 border-[#333] p-0 bg-transparent shrink-0" />
                                <button 
                                  onClick={() => setIsPickingColor(!isPickingColor)}
                                  className={\`p-2.5 rounded-lg transition-colors flex-1 flex items-center justify-center gap-2 text-xs font-semibold \${isPickingColor ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-[#222] text-gray-300 hover:text-white hover:bg-[#2a2a2c]'}\`}
                                >
                                  <Pipette className="w-4 h-4" />
                                  {isPickingColor ? 'Picking...' : 'Pick Color'}
                                </button>
                              </div>
                          </div>
                          
                          <label className="flex items-center justify-between cursor-pointer p-3 bg-[#141416] border border-[#262629] rounded-xl hover:border-[#3a3a3f] transition-all">
                              <div className="flex items-center gap-2">
                                <span className="text-xs font-bold text-gray-200 tracking-wide">Show Debug Overlay</span>
                                {maskSettings.showOverlay ? <Eye className="w-3.5 h-3.5 text-green-400" /> : <EyeOff className="w-3.5 h-3.5 text-gray-600" />}
                              </div>
                              <ToggleSwitch checked={maskSettings.showOverlay} onChange={() => setMaskSettings({...maskSettings, showOverlay: !maskSettings.showOverlay})} colorClass="bg-green-500" />
                          </label>
                          
                          {isProcessingMask && <div className="text-[10px] text-yellow-500 font-semibold uppercase tracking-wider animate-pulse flex items-center gap-2 justify-center p-2 bg-yellow-500/10 rounded-lg border border-yellow-500/20"><Activity className="w-3.5 h-3.5" /> Processing frames</div>}
                      </div>
                  )}
              </div>
          );
      }

      if (tool === 'spotlight') {
          return (
              <div className="space-y-4 animate-in fade-in duration-200">
                  <SectionHeader icon={Flashlight} title="Spotlight" subtitle="Focus Attention" colorClass="text-yellow-400" bgClass="bg-yellow-500/10" borderClass="border-yellow-500/20" />
                  <div className="space-y-6 pt-2">
                      <RangeSlider label="Radius Size" value={spotlightSettings.size} onChange={(e: any) => setSpotlightSettings({...spotlightSettings, size: parseInt(e.target.value)})} min={20} max={150} step={1} unit="px" accentClass="[&::-webkit-slider-thumb]:bg-yellow-500" />
                      <RangeSlider label="Intensity" value={spotlightSettings.intensity} onChange={(e: any) => setSpotlightSettings({...spotlightSettings, intensity: parseFloat(e.target.value)})} min={0.1} max={1} step={0.05} unit="x" accentClass="[&::-webkit-slider-thumb]:bg-yellow-500" />
                      <RangeSlider label="Rotation" value={spotlightSettings.rotation} onChange={(e: any) => setSpotlightSettings({...spotlightSettings, rotation: parseFloat(e.target.value)})} min={0.1} max={1} step={0.05} unit="rad" accentClass="[&::-webkit-slider-thumb]:bg-yellow-500" />
                  </div>
              </div>
          )
      }

      if (tool === 'lens') {
          return (
              <div className="space-y-4 animate-in fade-in duration-200">
                  <SectionHeader icon={ZoomIn} title="Zoom Lens" subtitle="Magnify Details" colorClass="text-cyan-400" bgClass="bg-cyan-500/10" borderClass="border-cyan-500/20" />
                  <div className="space-y-6 pt-2">
                      <RangeSlider label="Radius Size" value={lensSettings.size} onChange={(e: any) => setLensSettings({...lensSettings, size: parseInt(e.target.value)})} min={40} max={150} step={1} unit="px" accentClass="[&::-webkit-slider-thumb]:bg-cyan-500" />
                      <RangeSlider label="Magnification" value={lensSettings.zoom} onChange={(e: any) => setLensSettings({...lensSettings, zoom: parseFloat(e.target.value)})} min={1.5} max={4.0} step={0.1} unit="x" accentClass="[&::-webkit-slider-thumb]:bg-cyan-500" />
                  </div>
              </div>
          )
      }

      if (tool === 'name-tag') {
          const renderTeamRoster = (team: 'teamA' | 'teamB', label: string) => {
              const teamData = nameTagSettings[team];
              return (
                  <div className="flex flex-col flex-1 min-h-0 space-y-3 mb-4 p-3.5 bg-[#141416] rounded-xl border border-[#262629] shadow-sm">
                      <div className="flex justify-between items-center shrink-0">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">{label}</label>
                          <div className="flex items-center gap-1.5">
                              {colors.map(c => (
                                  <button key={c.id} onClick={() => {
                                      setNameTagSettings(prev => ({...prev, [team]: {...prev[team], colorId: c.id}}));
                                      if (nameTagSettings.activeTeam === (team === 'teamA' ? 'A' : 'B')) setActiveColorId(c.id);
                                  }} className={\`w-4 h-4 rounded-full border-2 transition-transform \${teamData.colorId === c.id ? 'border-white scale-110 shadow-md' : 'border-transparent'}\`} style={{ backgroundColor: c.value }} title={c.value} />
                              ))}
                          </div>
                      </div>
                      
                      <div className="flex gap-2 shrink-0">
                          <input type="text" value={teamData.bulkText} onChange={(e) => setNameTagSettings(prev => ({...prev, [team]: {...prev[team], bulkText: e.target.value}}))} onKeyDown={(e) => {
                              if (e.key === 'Enter' && teamData.bulkText.trim()) {
                                  const newNames = teamData.bulkText.split(',').map(n => n.trim()).filter(Boolean).map(n => ({ id: Date.now().toString() + Math.random(), text: n }));
                                  setNameTagSettings(prev => ({...prev, [team]: {...prev[team], names: [...prev[team].names, ...newNames], bulkText: ''}}));
                              }
                          }} className="flex-1 min-w-0 bg-[#0a0a0c] border border-[#262629] rounded-lg px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/50 transition-all shadow-inner" placeholder="Add names (comma separated)" />
                          <button onClick={() => {
                               if (teamData.bulkText.trim()) {
                                  const newNames = teamData.bulkText.split(',').map(n => n.trim()).filter(Boolean).map(n => ({ id: Date.now().toString() + Math.random(), text: n }));
                                  setNameTagSettings(prev => ({...prev, [team]: {...prev[team], names: [...prev[team].names, ...newNames], bulkText: ''}}));
                              }
                          }} className="p-2 transition-colors bg-blue-600 hover:bg-blue-500 text-white rounded-lg shrink-0 shadow-sm"><Plus className="w-4 h-4" /></button>
                      </div>
                      
                      <div className="space-y-1.5 flex-1 overflow-y-auto pr-1 custom-scrollbar">
                         {teamData.names.map((name, idx) => (
                             <div key={name.id} draggable onDragStart={(e) => { e.dataTransfer.setData('text/plain', JSON.stringify({id: name.id, team})); }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => {
                                 e.preventDefault();
                                 try {
                                     const dragged = JSON.parse(e.dataTransfer.getData('text/plain'));
                                     if (dragged.team !== team || dragged.id === name.id) return;
                                     setNameTagSettings(prev => {
                                         const names = [...prev[team].names];
                                         const dragIdx = names.findIndex(n => n.id === dragged.id);
                                         const dropIdx = idx;
                                         if (dragIdx < 0 || dropIdx < 0) return prev;
                                         const [moved] = names.splice(dragIdx, 1);
                                         names.splice(dropIdx, 0, moved);
                                         return { ...prev, [team]: { ...prev[team], names }};
                                     });
                                 } catch(err) {}
                             }} className={\`flex items-center justify-between p-2 rounded-lg cursor-grab active:cursor-grabbing transition-all \${nameTagSettings.activeId === name.id ? 'bg-blue-500/15 border border-blue-500/40 shadow-sm' : 'bg-[#1a1a1c] hover:bg-[#222] border border-[#2a2a2c]'}\`} onClick={() => { setNameTagSettings(prev => ({...prev, activeTeam: team === 'teamA' ? 'A' : 'B', activeId: name.id})); setActiveColorId(teamData.colorId); }}>
                                 <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                     <div className={\`w-2 h-2 rounded-full shrink-0 \${nameTagSettings.activeId === name.id ? 'bg-blue-400 shadow-[0_0_8px_rgba(96,165,250,0.6)]' : 'bg-[#444]'}\`} />
                                     {editingNameId === name.id ? (
                                         <input type="text" autoFocus value={name.text} onClick={e => e.stopPropagation()} onBlur={() => setEditingNameId(null)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingNameId(null); }} onChange={e => {
                                             const val = e.target.value;
                                             setNameTagSettings(prev => {
                                                 const names = prev[team].names.map(n => n.id === name.id ? {...n, text: val} : n);
                                                 return {...prev, [team]: {...prev[team], names}};
                                             });
                                         }} className="bg-[#0a0a0c] border border-blue-500/50 rounded px-1 outline-none text-xs font-semibold text-white w-full truncate" />
                                     ) : (
                                         <span className="text-xs font-semibold text-gray-200 w-full truncate cursor-pointer tracking-wide">{name.text}</span>
                                     )}
                                 </div>
                                 <div className="flex items-center shrink-0">
                                     <button onClick={(e) => {
                                         e.stopPropagation();
                                         setEditingNameId(name.id);
                                     }} className="p-1.5 ml-1 text-gray-500 hover:text-white hover:bg-[#333] rounded-md transition-colors" title="Edit">
                                         <Edit2 className="w-3.5 h-3.5" />
                                     </button>
                                     <button onClick={(e) => {
                                         e.stopPropagation();
                                         const newNames = teamData.names.filter(n => n.id !== name.id);
                                         setNameTagSettings(prev => ({
                                             ...prev, [team]: {...prev[team], names: newNames},
                                             activeId: prev.activeId === name.id ? (newNames[0]?.id || null) : prev.activeId
                                         }));
                                     }} className="p-1.5 ml-1 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded-md transition-colors" title="Delete">
                                         <Trash2 className="w-3.5 h-3.5" />
                                     </button>
                                 </div>
                             </div>
                         ))}
                         {teamData.names.length === 0 && <div className="text-[10px] text-center text-gray-500 py-4 italic font-medium">Empty Roster</div>}
                      </div>
                  </div>
              );
          };

          return (
              <div className="flex flex-col h-full space-y-4 animate-in fade-in duration-200 pb-4">
                  <div className="shrink-0 space-y-6">
                      <SectionHeader icon={Tag} title="Player Tag" subtitle="Broadcast-style Name" colorClass="text-indigo-400" bgClass="bg-indigo-500/10" borderClass="border-indigo-500/20" />
                      <RangeSlider label="Tag Size" value={nameTagSettings.size} onChange={(e: any) => setNameTagSettings(prev => ({...prev, size: parseInt(e.target.value)}))} min={10} max={40} step={1} unit="px" accentClass="[&::-webkit-slider-thumb]:bg-indigo-500" />
                  </div>
                  
                  <div className="flex-1 min-h-0 flex flex-col pt-2 border-t border-[#262629]">
                      {renderTeamRoster('teamA', 'Home Team')}
                      {renderTeamRoster('teamB', 'Away Team')}
                  </div>
              </div>
          )
      }

      if (tool === 'text') {
          return (
              <div className="flex flex-col h-full space-y-6 animate-in fade-in duration-200">
                  <SectionHeader icon={Type} title="Text Tool" subtitle="Add text to canvas" colorClass="text-pink-400" bgClass="bg-pink-500/10" borderClass="border-pink-500/20" />
                  
                  <div className="space-y-6">
                      <div className="space-y-2.5">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Text Content</label>
                          <textarea 
                              className="w-full bg-[#141416] border border-[#262629] rounded-xl p-3 text-white text-sm focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500/50 resize-none shadow-inner font-medium transition-all" 
                              rows={3}
                              value={textSettings.text}
                              onChange={(e) => setTextSettings({...textSettings, text: e.target.value})}
                              placeholder="Enter text..."
                          />
                      </div>

                      <div className="space-y-3 pb-5 border-b border-[#262629]">
                          <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Preset Texts</label>
                          
                          <div className="flex gap-2 shrink-0">
                              <input type="text" value={presetBulkText} onChange={(e) => setPresetBulkText(e.target.value)} onKeyDown={(e) => {
                                  if (e.key === 'Enter' && presetBulkText.trim()) {
                                      const newTexts = presetBulkText.split(';').map(n => n.trim()).filter(Boolean).map(n => ({ id: Date.now().toString() + Math.random(), text: n }));
                                      setPresetTexts(prev => [...prev, ...newTexts]);
                                      setPresetBulkText('');
                                  }
                              }} className="flex-1 min-w-0 bg-[#0a0a0c] border border-[#262629] rounded-lg px-3 py-2 text-xs font-medium text-white focus:outline-none focus:border-pink-500 transition-all shadow-inner" placeholder="Add preset (use ; for multiple)" />
                              <button onClick={() => {
                                   if (presetBulkText.trim()) {
                                      const newTexts = presetBulkText.split(';').map(n => n.trim()).filter(Boolean).map(n => ({ id: Date.now().toString() + Math.random(), text: n }));
                                      setPresetTexts(prev => [...prev, ...newTexts]);
                                      setPresetBulkText('');
                                  }
                              }} className="p-2 transition-colors bg-pink-600 hover:bg-pink-500 text-white rounded-lg shrink-0 shadow-sm"><Plus className="w-4 h-4" /></button>
                          </div>

                          <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1 custom-scrollbar">
                              {presetTexts.map((preset) => (
                                  <div key={preset.id} className={\`flex flex-col bg-[#1a1a1c] border rounded-lg transition-all \${textSettings.text === preset.text ? 'border-pink-500/50 bg-pink-500/10 shadow-sm' : 'border-[#2a2a2c] hover:border-[#3a3a3f]'}\`}>
                                      <div className="flex items-center justify-between p-2 cursor-pointer" onClick={() => setTextSettings(prev => ({...prev, text: preset.text}))}>
                                          <div className="flex items-center gap-2.5 flex-1 min-w-0">
                                              {editingPresetId === preset.id ? (
                                                  <input type="text" autoFocus value={preset.text} onClick={e => e.stopPropagation()} onBlur={() => setEditingPresetId(null)} onKeyDown={(e) => { if (e.key === 'Enter') setEditingPresetId(null); }} onChange={e => {
                                                      const val = e.target.value;
                                                      setPresetTexts(prev => prev.map(p => p.id === preset.id ? {...p, text: val} : p));
                                                      if (textSettings.text === preset.text) {
                                                          setTextSettings(prev => ({...prev, text: val}));
                                                      }
                                                  }} className="bg-[#0a0a0c] border border-pink-500/50 rounded px-1 outline-none text-xs font-semibold text-white w-full truncate" />
                                              ) : (
                                                  <span className="text-xs font-semibold text-gray-200 w-full truncate tracking-wide">{preset.text}</span>
                                              )}
                                          </div>
                                          <div className="flex items-center shrink-0">
                                              <button onClick={(e) => {
                                                  e.stopPropagation();
                                                  setEditingPresetId(preset.id);
                                              }} className="p-1.5 ml-1 text-gray-500 hover:text-white hover:bg-[#333] rounded-md transition-colors" title="Edit">
                                                  <Edit2 className="w-3.5 h-3.5" />
                                              </button>
                                              <button onClick={(e) => {
                                                  e.stopPropagation();
                                                  setExpandedPresetId(expandedPresetId === preset.id ? null : preset.id);
                                              }} className="p-1.5 ml-1 text-gray-500 hover:text-white hover:bg-[#333] rounded-md transition-colors" title="Expand">
                                                  {expandedPresetId === preset.id ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                                              </button>
                                              <button onClick={(e) => {
                                                  e.stopPropagation();
                                                  setPresetTexts(prev => prev.filter(p => p.id !== preset.id));
                                              }} className="p-1.5 ml-1 text-gray-500 hover:text-red-400 hover:bg-red-900/30 rounded-md transition-colors" title="Delete">
                                                  <Trash2 className="w-3.5 h-3.5" />
                                              </button>
                                          </div>
                                      </div>
                                      {expandedPresetId === preset.id && (
                                          <div className="p-3 border-t border-[#2a2a2c] bg-[#141416] rounded-b-lg">
                                              <textarea
                                                  className="w-full bg-[#0a0a0c] border border-[#2a2a2c] rounded-lg p-2.5 text-xs font-medium text-gray-300 focus:outline-none focus:border-pink-500 resize-none h-16 shadow-inner"
                                                  value={preset.text}
                                                  onClick={e => e.stopPropagation()}
                                                  onChange={e => {
                                                      const val = e.target.value;
                                                      setPresetTexts(prev => prev.map(p => p.id === preset.id ? {...p, text: val} : p));
                                                      if (textSettings.text === preset.text) {
                                                          setTextSettings(prev => ({...prev, text: val}));
                                                      }
                                                  }}
                                              />
                                          </div>
                                      )}
                                  </div>
                              ))}
                              {presetTexts.length === 0 && <div className="text-[10px] text-center text-gray-500 py-4 italic font-medium border border-dashed border-[#333] rounded-lg">No presets</div>}
                          </div>
                      </div>

                      <div className="space-y-6 pb-5 border-b border-[#262629]">
                         <RangeSlider label="Font Size" value={textSettings.fontSize} onChange={(e: any) => setTextSettings({...textSettings, fontSize: parseInt(e.target.value)})} min={8} max={100} step={1} unit="px" accentClass="[&::-webkit-slider-thumb]:bg-pink-500" />
                         
                         <div className="space-y-2.5">
                             <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Animation</label>
                             <div className="flex gap-1.5 p-1 bg-[#141416] rounded-lg border border-[#262629]">
                                 {(['none', 'fade', 'scale', 'type'] as const).map(anim => (
                                     <button 
                                       key={anim} 
                                       onClick={() => setTextSettings({...textSettings, animation: anim})}
                                       className={\`flex-1 py-1.5 rounded-md text-[10px] font-bold uppercase tracking-wider transition-all shadow-sm \${textSettings.animation === anim ? 'bg-pink-600 text-white' : 'bg-transparent text-gray-500 hover:text-gray-300 hover:bg-[#222]'}\`}
                                     >
                                         {anim}
                                     </button>
                                 ))}
                             </div>
                         </div>
                      </div>

                      <div className="space-y-4">
                          <div className="space-y-2.5">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Text Color</label>
                              <div className="flex gap-2 flex-wrap">
                                  {colors.map(c => (
                                      <button key={\`text-c-\${c.id}\`} onClick={() => setTextSettings({...textSettings, colorId: c.id})} className={\`w-8 h-8 rounded-full border-2 transition-transform shadow-sm \${textSettings.colorId === c.id ? 'border-white scale-110' : 'border-transparent hover:scale-105'}\`} style={{ backgroundColor: c.value }} title={c.value} />
                                  ))}
                              </div>
                          </div>

                          <label className="flex items-center justify-between cursor-pointer p-3 bg-[#141416] border border-[#262629] rounded-xl hover:border-[#3a3a3f] transition-all">
                              <span className="text-xs font-bold text-gray-200 tracking-wide">Background Solid</span>
                              <ToggleSwitch checked={textSettings.bgEnabled} onChange={() => setTextSettings({...textSettings, bgEnabled: !textSettings.bgEnabled})} colorClass="bg-pink-500" />
                          </label>
                          
                          {textSettings.bgEnabled && (
                              <div className="space-y-2.5 pt-1 animate-in fade-in slide-in-from-top-2">
                                  <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Background Color</label>
                                  <div className="flex gap-2 flex-wrap bg-[#141416] p-3 rounded-xl border border-[#262629]">
                                      {colors.map(c => (
                                          <button key={\`bg-c-\${c.id}\`} onClick={() => setTextSettings({...textSettings, bgColorId: c.id})} className={\`w-7 h-7 rounded-md border-2 transition-transform shadow-sm \${textSettings.bgColorId === c.id ? 'border-white scale-110' : 'border-transparent hover:scale-105'}\`} style={{ backgroundColor: c.value }} title={c.value} />
                                      ))}
                                  </div>
                              </div>
                          )}
                      </div>
                  </div>
              </div>
          );
      }

      // Default Drawing Tools
      return (
          <div className="space-y-6 animate-in fade-in duration-200">
              <SectionHeader icon={Pen} title="Drawing Tools" subtitle="Customize Stroke" colorClass="text-purple-400" bgClass="bg-purple-500/10" borderClass="border-purple-500/20" />
              
              <div className="space-y-6">
                  {['circle', 'connected-circle'].includes(tool || '') ? (
                      <RangeSlider label="Stroke Width" value={ringStrokeWidth} onChange={(e: any) => setRingStrokeWidth(parseInt(e.target.value))} min={0} max={2} step={1} unit="px" accentClass="[&::-webkit-slider-thumb]:bg-purple-500" />
                  ) : (
                      <RangeSlider label="Tool Size" value={toolSize} onChange={(e: any) => setToolSize(parseInt(e.target.value))} min={1} max={20} step={1} unit="px" accentClass="[&::-webkit-slider-thumb]:bg-purple-500" />
                  )}
                  
                  {(tool === 'pen' || tool === 'arrow') && (
                      <div className="space-y-3 pt-5 border-t border-[#262629]">
                          <label className="flex items-center justify-between cursor-pointer p-3 bg-[#141416] border border-[#262629] rounded-xl hover:border-[#3a3a3f] transition-all">
                              <span className="text-xs font-bold text-gray-200 tracking-wide">Dashed Line</span>
                              <ToggleSwitch checked={arrowSettings.isDashed} onChange={() => setArrowSettings({...arrowSettings, isDashed: !arrowSettings.isDashed})} colorClass="bg-purple-500" />
                          </label>
                          <label className="flex items-center justify-between cursor-pointer p-3 bg-[#141416] border border-[#262629] rounded-xl hover:border-[#3a3a3f] transition-all">
                              <span className="text-xs font-bold text-gray-200 tracking-wide">Freehand Mode</span>
                              <ToggleSwitch checked={arrowSettings.isFreehand} onChange={() => setArrowSettings({...arrowSettings, isFreehand: !arrowSettings.isFreehand, isCurved: !arrowSettings.isFreehand ? false : arrowSettings.isCurved, isCurvedRun: !arrowSettings.isFreehand ? false : arrowSettings.isCurvedRun})} colorClass="bg-purple-500" />
                          </label>
                          {tool === 'arrow' && (
                              <>
                                  <label className="flex items-center justify-between cursor-pointer p-3 bg-[#141416] border border-[#262629] rounded-xl hover:border-[#3a3a3f] transition-all">
                                      <span className="text-xs font-bold text-gray-200 tracking-wide">Ariel Arrow</span>
                                      <ToggleSwitch checked={arrowSettings.isCurved} onChange={() => setArrowSettings({...arrowSettings, isCurved: !arrowSettings.isCurved, isFreehand: !arrowSettings.isCurved ? false : arrowSettings.isFreehand, isCurvedRun: !arrowSettings.isCurved ? false : arrowSettings.isCurvedRun})} colorClass="bg-purple-500" />
                                  </label>
                                  <label className="flex items-center justify-between cursor-pointer p-3 bg-[#141416] border border-[#262629] rounded-xl hover:border-[#3a3a3f] transition-all">
                                      <span className="text-xs font-bold text-gray-200 tracking-wide">Curved Run</span>
                                      <ToggleSwitch checked={arrowSettings.isCurvedRun} onChange={() => setArrowSettings({...arrowSettings, isCurvedRun: !arrowSettings.isCurvedRun, isCurved: !arrowSettings.isCurvedRun ? false : arrowSettings.isCurved, isFreehand: !arrowSettings.isCurvedRun ? false : arrowSettings.isFreehand})} colorClass="bg-purple-500" />
                                  </label>
                              </>
                          )}
                      </div>
                  )}

                  {(tool === 'circle' || tool === 'connected-circle') && (
                      <div className="space-y-6 pt-5 border-t border-[#262629]">
                          <RangeSlider label="Ring Size" value={ringSettings.size} onChange={(e: any) => setRingSettings({...ringSettings, size: parseInt(e.target.value)})} min={10} max={200} step={1} unit="px" accentClass="[&::-webkit-slider-thumb]:bg-purple-500" />
                          <RangeSlider label="3D Tilt" value={ringSettings.tilt} onChange={(e: any) => setRingSettings({...ringSettings, tilt: parseInt(e.target.value)})} min={0} max={85} step={1} unit="°" accentClass="[&::-webkit-slider-thumb]:bg-purple-500" />
                          
                          <div className="space-y-2.5">
                              <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Outline Color</label>
                              <div className="flex gap-2 flex-wrap bg-[#141416] p-3 rounded-xl border border-[#262629]">
                                  {['#ffffff', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff', '#000000'].map(c => (
                                      <button key={c} onClick={() => setRingSettings({...ringSettings, outlineColor: c})} className={\`w-7 h-7 rounded-full border-2 transition-transform shadow-sm \${ringSettings.outlineColor === c ? 'border-white scale-110' : 'border-transparent hover:scale-105'}\`} style={{ backgroundColor: c }} />
                                  ))}
                              </div>
                          </div>
                          
                          {tool === 'connected-circle' && (
                              <label className="flex items-center justify-between cursor-pointer p-3 bg-[#141416] border border-[#262629] rounded-xl hover:border-[#3a3a3f] transition-all">
                                  <span className="text-xs font-bold text-gray-200 tracking-wide">Filled Shape</span>
                                  <ToggleSwitch checked={ringSettings.isFilled} onChange={() => setRingSettings({...ringSettings, isFilled: !ringSettings.isFilled})} colorClass="bg-purple-500" />
                              </label>
                          )}
                          
                          <div className="pt-5 border-t border-[#262629] space-y-4">
                              <label className="flex items-center justify-between cursor-pointer p-3 bg-[#141416] border border-[#262629] rounded-xl hover:border-[#3a3a3f] transition-all">
                                  <span className="text-xs font-bold text-gray-200 tracking-wide">Secondary Inner Ring</span>
                                  <ToggleSwitch checked={ringSettings.secondaryRing} onChange={() => setRingSettings({...ringSettings, secondaryRing: !ringSettings.secondaryRing})} colorClass="bg-purple-500" />
                              </label>
                              
                              {ringSettings.secondaryRing && (
                                  <div className="space-y-2.5 pl-2 animate-in fade-in slide-in-from-top-2">
                                      <label className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Secondary Color</label>
                                      <div className="flex gap-2 flex-wrap">
                                          {colors.map(c => (
                                              <button key={c.id} onClick={() => setRingSettings({...ringSettings, secondaryColor: c.value})} className={\`w-6 h-6 rounded-full border-2 transition-transform shadow-sm \${ringSettings.secondaryColor === c.value ? 'border-white scale-110' : 'border-transparent hover:scale-105'}\`} style={{ backgroundColor: c.value }} />
                                          ))}
                                      </div>
                                  </div>
                              )}
                          </div>
                      </div>
                  )}
              </div>
          </div>
      );
  };`;

const newContent = content.slice(0, startIdx) + newPanelCode + '\n\n' + content.slice(endIdx);
fs.writeFileSync('src/components/Workspace/Workspace.tsx', newContent);
