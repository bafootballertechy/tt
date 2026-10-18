const fs = require('fs');
let content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf-8');

const oldHandleLabelClick = `  const handleLabelClick = (labelId: string) => {
      if (isTaggingMode) {
          let newActiveRec = activeRecording ? { ...activeRecording, labelIds: activeRecording.labelIds ? [...activeRecording.labelIds] : [] } : null;
          let newEventsToUpdate = new Map<string, TagEvent>();
          let isActivation = false;
          let createdEventId: string | null = null;`;

const newHandleLabelClick = `  const handleLabelClick = (labelId: string) => {
      if (isTaggingMode) {
          // If this label is the Target of an active Assign connector from a Tag, clicking it acts as clicking the Tag
          const assignConn = connectors.find(c => c.targetId === labelId && c.type === 'assign' && c.enabled);
          if (assignConn) {
              const sourceIsTag = tags.some(t => t.id === assignConn.sourceId);
              if (sourceIsTag) {
                  handleTagClick(assignConn.sourceId);
                  return;
              }
          }

          let newActiveRec = activeRecording ? { ...activeRecording, labelIds: activeRecording.labelIds ? [...activeRecording.labelIds] : [] } : null;
          let newEventsToUpdate = new Map<string, TagEvent>();
          let isActivation = false;
          let createdEventId: string | null = null;`;

if (!content.includes(oldHandleLabelClick)) {
  console.log("oldHandleLabelClick not found!");
  process.exit(1);
}
content = content.replace(oldHandleLabelClick, newHandleLabelClick);
fs.writeFileSync('src/components/Workspace/Workspace.tsx', content);
