const fs = require('fs');
let content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf-8');

const oldExecuteConnectors = `const executeConnectors = (
      sourceId: string, 
      currentActiveRec: typeof activeRecording, 
      newEvents: TagEvent[], 
      createdEventId: string | null,
      isActivation: boolean
  ) => {
      let nextActiveRec = currentActiveRec ? { ...currentActiveRec, labelIds: currentActiveRec.labelIds ? [...currentActiveRec.labelIds] : [] } : null;
      const additionalEvents: TagEvent[] = [];
      const newlySelectedEventIds = new Set<string>();
      let playbarEvtId = null;
      let notification = null;
      
      if (!isActivation) {
          // Some connectors (like exclusive) might trigger on deactivation? The prompt says "When Source is activated".
          // So we only process on activation.
          return { nextActiveRec, additionalEvents, newlySelectedEventIds, playbarEvtId, notification };
      }

      const activeConnectors = connectors.filter(c => c.sourceId === sourceId && c.enabled);
      
      // Keep track of what to do for each connector
      for (const conn of activeConnectors) {
          const targetIsTag = tags.some(t => t.id === conn.targetId);
          const targetIsLabel = labels.some(l => l.id === conn.targetId);
          
          if (conn.type === 'exclusive') {
              // When Source is activated, Target is automatically deactivated
              if (targetIsTag && nextActiveRec && nextActiveRec.tagId === conn.targetId) {
                  // Stop the active recording of the target
                  let start = nextActiveRec.startTime;
                  let end = currentTime;
                  if (start > end) { [start, end] = [end, start]; }
                  if (isValidEvent(start, end)) {
                      additionalEvents.push({
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                          tagId: nextActiveRec.tagId,
                          startTime: start,
                          endTime: end,
                          labelIds: nextActiveRec.labelIds
                      });
                  }
                  nextActiveRec = null;
              } else if (targetIsLabel && nextActiveRec && nextActiveRec.labelIds?.includes(conn.targetId)) {
                  nextActiveRec.labelIds = nextActiveRec.labelIds.filter(id => id !== conn.targetId);
              }
          } 
          else if (conn.type === 'defuse') {
              // When Source is activated, Target is automatically stopped/deactivated
              // (Similar to exclusive)
              if (targetIsTag && nextActiveRec && nextActiveRec.tagId === conn.targetId) {
                  let start = nextActiveRec.startTime;
                  let end = currentTime;
                  if (start > end) { [start, end] = [end, start]; }
                  if (isValidEvent(start, end)) {
                      additionalEvents.push({
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                          tagId: nextActiveRec.tagId,
                          startTime: start,
                          endTime: end,
                          labelIds: nextActiveRec.labelIds
                      });
                  }
                  nextActiveRec = null;
              } else if (targetIsLabel && nextActiveRec && nextActiveRec.labelIds?.includes(conn.targetId)) {
                  nextActiveRec.labelIds = nextActiveRec.labelIds.filter(id => id !== conn.targetId);
              }
          }
          else if (conn.type === 'trigger') {
              // When Source is activated, Target is automatically activated/created
              if (targetIsTag) {
                  const targetTag = tags.find(t => t.id === conn.targetId);
                  if (targetTag) {
                      if (targetTag.leadLagEnabled) {
                          const pre = targetTag.preTime ?? 10;
                          const post = targetTag.postTime ?? 10;
                          const start = Math.max(0, currentTime - pre);
                          const end = Math.min(duration, currentTime + post);
                          if (isValidEvent(start, end)) {
                              const evId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                              additionalEvents.push({
                                  id: evId,
                                  tagId: targetTag.id,
                                  startTime: start,
                                  endTime: end,
                                  notes: ''
                              });
                              newlySelectedEventIds.add(evId);
                              playbarEvtId = evId;
                              notification = \`Triggered: \${targetTag.name}\`;
                          }
                      } else {
                          // Normal tag start.
                          // If there's already an active recording, stop it first.
                          if (nextActiveRec && nextActiveRec.tagId !== targetTag.id) {
                              let start = nextActiveRec.startTime;
                              let end = currentTime;
                              if (start > end) { [start, end] = [end, start]; }
                              if (isValidEvent(start, end)) {
                                  additionalEvents.push({
                                      id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                      tagId: nextActiveRec.tagId,
                                      startTime: start,
                                      endTime: end,
                                      labelIds: nextActiveRec.labelIds
                                  });
                              }
                          }
                          nextActiveRec = { tagId: targetTag.id, startTime: currentTime, labelIds: [] };
                          notification = \`Triggered: \${targetTag.name}\`;
                      }
                  }
              }
          }
          else if (conn.type === 'assign') {
              // Attach Target as information/metadata to the relevant active or newly-created event
              if (targetIsLabel) {
                  if (createdEventId) {
                      // Modify the newly created event (which might be in newEvents or additionalEvents)
                      const targetEv = newEvents.find(e => e.id === createdEventId) || additionalEvents.find(e => e.id === createdEventId);
                      if (targetEv) {
                          targetEv.labelIds = [...(targetEv.labelIds || []), conn.targetId];
                      }
                  } else if (nextActiveRec) {
                      if (!nextActiveRec.labelIds) nextActiveRec.labelIds = [];
                      if (!nextActiveRec.labelIds.includes(conn.targetId)) {
                          nextActiveRec.labelIds.push(conn.targetId);
                      }
                  }
              }
          }
      }
      
      return { nextActiveRec, additionalEvents, newlySelectedEventIds, playbarEvtId, notification };
  };`;

const newExecuteConnectors = `const executeConnectors = (
      sourceId: string, 
      currentActiveRec: typeof activeRecording, 
      newEvents: TagEvent[], 
      createdEventId: string | null,
      isActivation: boolean
  ) => {
      let nextActiveRec = currentActiveRec ? { ...currentActiveRec, labelIds: currentActiveRec.labelIds ? [...currentActiveRec.labelIds] : [] } : null;
      const additionalEvents: TagEvent[] = [];
      const newlySelectedEventIds = new Set<string>();
      let playbarEvtId = null;
      let notification = null;
      
      const sourceConnectors = connectors.filter(c => c.sourceId === sourceId && c.enabled);
      const targetConnectors = connectors.filter(c => c.targetId === sourceId && c.enabled);

      if (isActivation) {
          // Process connectors where this item is the SOURCE
          for (const conn of sourceConnectors) {
              const targetIsTag = tags.some(t => t.id === conn.targetId);
              const targetIsLabel = labels.some(l => l.id === conn.targetId);
              
              if (conn.type === 'exclusive') {
                  if (targetIsTag && nextActiveRec && nextActiveRec.tagId === conn.targetId) {
                      let start = nextActiveRec.startTime;
                      let end = currentTime;
                      if (start > end) { [start, end] = [end, start]; }
                      if (isValidEvent(start, end)) {
                          additionalEvents.push({
                              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                              tagId: nextActiveRec.tagId,
                              startTime: start,
                              endTime: end,
                              labelIds: nextActiveRec.labelIds
                          });
                      }
                      nextActiveRec = null;
                  } else if (targetIsLabel && nextActiveRec && nextActiveRec.labelIds?.includes(conn.targetId)) {
                      nextActiveRec.labelIds = nextActiveRec.labelIds.filter(id => id !== conn.targetId);
                  }
              } 
              else if (conn.type === 'trigger') {
                  if (targetIsTag) {
                      const targetTag = tags.find(t => t.id === conn.targetId);
                      if (targetTag) {
                          if (targetTag.leadLagEnabled) {
                              const pre = targetTag.preTime ?? 10;
                              const post = targetTag.postTime ?? 10;
                              const start = Math.max(0, currentTime - pre);
                              const end = Math.min(duration, currentTime + post);
                              if (isValidEvent(start, end)) {
                                  const evId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                                  additionalEvents.push({
                                      id: evId,
                                      tagId: targetTag.id,
                                      startTime: start,
                                      endTime: end,
                                      notes: ''
                                  });
                                  newlySelectedEventIds.add(evId);
                                  playbarEvtId = evId;
                                  notification = \`Triggered: \${targetTag.name}\`;
                              }
                          } else {
                              if (nextActiveRec && nextActiveRec.tagId !== targetTag.id) {
                                  let start = nextActiveRec.startTime;
                                  let end = currentTime;
                                  if (start > end) { [start, end] = [end, start]; }
                                  if (isValidEvent(start, end)) {
                                      additionalEvents.push({
                                          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                                          tagId: nextActiveRec.tagId,
                                          startTime: start,
                                          endTime: end,
                                          labelIds: nextActiveRec.labelIds
                                      });
                                  }
                              }
                              nextActiveRec = { tagId: targetTag.id, startTime: currentTime, labelIds: [] };
                              notification = \`Triggered: \${targetTag.name}\`;
                          }
                      }
                  }
              }
              else if (conn.type === 'assign') {
                  if (targetIsLabel) {
                      if (createdEventId) {
                          const targetEv = newEvents.find(e => e.id === createdEventId) || additionalEvents.find(e => e.id === createdEventId);
                          if (targetEv) {
                              targetEv.labelIds = [...(targetEv.labelIds || []), conn.targetId];
                          }
                      } else if (nextActiveRec) {
                          if (!nextActiveRec.labelIds) nextActiveRec.labelIds = [];
                          if (!nextActiveRec.labelIds.includes(conn.targetId)) {
                              nextActiveRec.labelIds.push(conn.targetId);
                          }
                      }
                  }
              }
          }

          // Process connectors where this item is the TARGET
          for (const conn of targetConnectors) {
              const sourceIsTag = tags.some(t => t.id === conn.sourceId);
              const sourceIsLabel = labels.some(l => l.id === conn.sourceId);
              
              if (conn.type === 'exclusive' || conn.type === 'defuse') {
                  if (sourceIsTag && nextActiveRec && nextActiveRec.tagId === conn.sourceId) {
                      let start = nextActiveRec.startTime;
                      let end = currentTime;
                      if (start > end) { [start, end] = [end, start]; }
                      if (isValidEvent(start, end)) {
                          additionalEvents.push({
                              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                              tagId: nextActiveRec.tagId,
                              startTime: start,
                              endTime: end,
                              labelIds: nextActiveRec.labelIds
                          });
                      }
                      nextActiveRec = null;
                  } else if (sourceIsLabel && nextActiveRec && nextActiveRec.labelIds?.includes(conn.sourceId)) {
                      nextActiveRec.labelIds = nextActiveRec.labelIds.filter(id => id !== conn.sourceId);
                  }
              }
          }
      } else {
          // Deactivation
          for (const conn of sourceConnectors) {
              const targetIsTag = tags.some(t => t.id === conn.targetId);
              if (conn.type === 'trigger') {
                  if (targetIsTag && nextActiveRec && nextActiveRec.tagId === conn.targetId) {
                      let start = nextActiveRec.startTime;
                      let end = currentTime;
                      if (start > end) { [start, end] = [end, start]; }
                      if (isValidEvent(start, end)) {
                          additionalEvents.push({
                              id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                              tagId: nextActiveRec.tagId,
                              startTime: start,
                              endTime: end,
                              labelIds: nextActiveRec.labelIds
                          });
                      }
                      nextActiveRec = null;
                  }
              }
          }
      }
      
      return { nextActiveRec, additionalEvents, newlySelectedEventIds, playbarEvtId, notification };
  };`;

content = content.replace(oldExecuteConnectors, newExecuteConnectors);
fs.writeFileSync('src/components/Workspace/Workspace.tsx', content);
