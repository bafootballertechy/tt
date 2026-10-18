const fs = require('fs');
let content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf-8');

const oldHandleLabelClick = `          if (isActivation) {
              const res = executeConnectors(
                  labelId, 
                  newActiveRec, 
                  Array.from(newEventsToUpdate.values()), 
                  createdEventId, 
                  true
              );
              newActiveRec = res.nextActiveRec;
              additionalNewEvents = res.additionalEvents;
              
              if (res.notification) {
                  showNotification(res.notification, '#c6ff1f');
              }
          }`;

const newHandleLabelClick = `          const res = executeConnectors(
              labelId, 
              newActiveRec, 
              Array.from(newEventsToUpdate.values()), 
              createdEventId, 
              isActivation
          );
          newActiveRec = res.nextActiveRec;
          additionalNewEvents = res.additionalEvents;
          
          if (res.notification) {
              showNotification(res.notification, '#c6ff1f');
          }`;

if (!content.includes(oldHandleLabelClick)) {
  console.log("oldHandleLabelClick not found!");
  process.exit(1);
}
content = content.replace(oldHandleLabelClick, newHandleLabelClick);
fs.writeFileSync('src/components/Workspace/Workspace.tsx', content);
