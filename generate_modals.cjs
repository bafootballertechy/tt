const fs = require('fs');

const content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf-8');
const modalsContent = fs.readFileSync('temp_modals.txt', 'utf-8');

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

let modalComp = `import React, { useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Code, X, Plus, Trash2, Edit2, Hexagon, AlertTriangle } from 'lucide-react';
import { Tag as TagData, TagEvent, Playlist, TimelineMarker } from '../../../types';

export const WorkspaceModals = (props: any) => {
    const {
        ${props.join(',\n        ')}
    } = props;
    
    return (
        <>
${modalsContent}
        </>
    );
};
`;

fs.writeFileSync('src/components/Workspace/Modals/WorkspaceModals.tsx', modalComp);
console.log('Created WorkspaceModals.tsx');
