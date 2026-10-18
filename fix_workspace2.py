with open("src/components/Workspace/Workspace.tsx", "r") as f:
    text = f.read()

# Fix event listener cleanup
old_effect = """      if (isResizingAnimPanel || isResizingLabelsPanel) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
    
  }, [isResizingAnimPanel, isResizingLabelsPanel]);"""

new_effect = """      if (isResizingAnimPanel || isResizingLabelsPanel) {
          window.addEventListener('mousemove', handleMouseMove);
          window.addEventListener('mouseup', handleMouseUp);
      }
      return () => {
          window.removeEventListener('mousemove', handleMouseMove);
          window.removeEventListener('mouseup', handleMouseUp);
      };
  }, [isResizingAnimPanel, isResizingLabelsPanel]);"""

text = text.replace(old_effect, new_effect)

# Update header
old_header = """                        <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#161616]">
                            <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-purple-400" /><span className="text-xs font-bold text-white uppercase tracking-wide">Labels</span></div>
                            {!isTaggingMode && (
                                <button onClick={() => {
                                    const newId = `group-${Date.now()}`;
                                    setLabelGroups(prev => [...prev, { id: newId, name: 'New Group' }]);
                                    setEditingGroupId(newId);
                                    setTempGroup({ name: 'New Group' });
                                }} className="p-1 text-gray-400 hover:text-white rounded" title="Add Group">
                                    <FolderPlus className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                        
                        {/* Top of label panel: Add Label Component (only if not tagging mode) */}
                        {!isTaggingMode && (
                            <div className="p-2 border-b border-[#222]">
                                <button onClick={() => {
                                    const newId = `label-${Date.now()}`;
                                    setLabels(prev => [...prev, { id: newId, name: 'New Label', groupId: undefined }]);
                                    setEditingLabelId(newId);
                                    setTempLabel({ name: 'New Label' });
                                }} className="w-full py-1.5 border border-dashed border-[#444] rounded text-gray-500 hover:text-white hover:border-purple-500 hover:bg-purple-500/5 flex items-center justify-center gap-1.5 text-xs font-medium transition-all">
                                    <Plus className="w-3.5 h-3.5" /> Add Label
                                </button>
                            </div>
                        )}"""

new_header = """                        <div className="px-3 py-2 border-b border-[#222] flex items-center justify-between shrink-0 bg-[#161616]">
                            <div className="flex items-center gap-2"><Tag className="w-4 h-4 text-purple-400" /><span className="text-xs font-bold text-white uppercase tracking-wide">Labels</span></div>
                            {!isTaggingMode && (
                                <div className="flex items-center gap-1">
                                    <button onClick={() => {
                                        const newId = `label-${Date.now()}`;
                                        setLabels(prev => [...prev, { id: newId, name: 'New Label', groupId: undefined }]);
                                        setEditingLabelId(newId);
                                        setTempLabel({ name: 'New Label' });
                                    }} className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors" title="Add Label">
                                        <Plus className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => {
                                        const newId = `group-${Date.now()}`;
                                        setLabelGroups(prev => [...prev, { id: newId, name: 'New Group' }]);
                                        setEditingGroupId(newId);
                                        setTempGroup({ name: 'New Group' });
                                    }} className="p-1 text-gray-400 hover:text-white hover:bg-[#333] rounded transition-colors" title="Add Group">
                                        <FolderPlus className="w-4 h-4" />
                                    </button>
                                </div>
                            )}
                        </div>"""

text = text.replace(old_header, new_header)

with open("src/components/Workspace/Workspace.tsx", "w") as f:
    f.write(text)
