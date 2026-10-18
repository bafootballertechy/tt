const fs = require('fs');
let content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf-8');

const oldHandleTagClick = `          if (isActivation) {
              const res = executeConnectors(tagId, currentActiveRec, newEvents, createdEventId, isActivation);
              finalActiveRec = res.nextActiveRec;
              newEvents = [...newEvents, ...res.additionalEvents];
              for (const id of res.newlySelectedEventIds) newlySelectedEventIds.add(id);
              if (res.playbarEvtId) playbarEvtId = res.playbarEvtId;
              if (res.notification) notification = { text: res.notification, color: '#c6ff1f' };
          }`;

const newHandleTagClick = `          // We now process connectors for both activation and deactivation
          const res = executeConnectors(tagId, currentActiveRec, newEvents, createdEventId, isActivation);
          finalActiveRec = res.nextActiveRec;
          newEvents = [...newEvents, ...res.additionalEvents];
          for (const id of res.newlySelectedEventIds) newlySelectedEventIds.add(id);
          if (res.playbarEvtId) playbarEvtId = res.playbarEvtId;
          if (res.notification) notification = { text: res.notification, color: '#c6ff1f' };`;

if (!content.includes(oldHandleTagClick)) {
  console.log("oldHandleTagClick not found!");
  process.exit(1);
}
content = content.replace(oldHandleTagClick, newHandleTagClick);
fs.writeFileSync('src/components/Workspace/Workspace.tsx', content);
