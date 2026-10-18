const fs = require('fs');

const content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf-8');
const lines = content.split('\n');

let modalsStart = -1;
let modalsEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('{tagSettingsOpen && (')) {
      modalsStart = i - 1; 
  }
  if (lines[i].includes('    </div>') && i > lines.length - 20) {
      modalsEnd = i;
  }
}

if (modalsStart !== -1 && modalsEnd !== -1) {
    const before = lines.slice(0, modalsStart).join('\n');
    const after = lines.slice(modalsEnd).join('\n');
    
    const props = [
      'tagSettingsOpen', 'setTagSettingsOpen', 'tags', 'setTags',
      'editingTagId', 'setEditingTagId', 'tempTag', 'setTempTag', 'deleteTag',
      'contextMenu', 'setContextMenu',
      'csvImportState', 'setCsvImportState', 'showNotification', 'setTagEvents', 'tagEvents',
      'playlistModal', 'setPlaylistModal', 'savePlaylist',
      'playlistDeleteId', 'setPlaylistDeleteId', 'confirmDeletePlaylist',
      'editEventModal', 'setEditEventModal', 'currentTime', 'requestCloseEditEventModal', 'saveEditedEvent', 'handleDeleteEventRequest',
      'deleteConfirmation', 'setDeleteConfirmation', 'confirmDeleteEvent',
      'tagDeleteConfirmation', 'setTagDeleteConfirmation', 'confirmDeleteTag',
      'workspaceAlert', 'setWorkspaceAlert',
      'markerModal', 'setMarkerModal', 'saveMarker', 'deleteMarker',
      'showCloseConfirm', 'setShowCloseConfirm', 'confirmClose',
      'confirmUnsavedModal', 'setConfirmUnsavedModal', 'fileInputRef'
    ];
    
    const propsStr = props.map(p => p + '={' + p + '}').join('\n        ');
    
    const replace = `
    <WorkspaceModals 
        ${propsStr}
    />
`;

    const newFile = before + replace + after;
    
    fs.writeFileSync('src/components/Workspace/Workspace.tsx', newFile);
    console.log('Replaced modals in Workspace.tsx');
} else {
    console.log('Could not find boundaries.');
}
