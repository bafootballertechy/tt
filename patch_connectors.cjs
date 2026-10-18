const fs = require('fs');
let code = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf8');

// We need to inject connector execution logic.
// We can intercept `handleTagClick` and `handleLabelClick` by creating wrappers or rewriting them.
// Let's rewrite `handleTagClick` and `handleLabelClick`.

// First, find handleTagClick = (tagId: string) => { ... }
const tagClickStart = code.indexOf('const handleTagClick = (tagId: string) => {');
const tagClickEnd = code.indexOf('const cancelRecording = useCallback(() => {');

// Find handleLabelClick = (labelId: string) => { ... }
const labelClickStart = code.indexOf('const handleLabelClick = (labelId: string) => {');
const labelClickEnd = code.indexOf('const [tags, setTags] = useState<TagData[]>(project.data.tags);');

const newClickLogic = `
  const executeConnectors = (
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
  };

  const handleTagClick = (tagId: string) => {
      const tag = tags.find(t => t.id === tagId);
      if (!tag) return;

      if (isTaggingMode) {
          let newEvents: TagEvent[] = [];
          let currentActiveRec = activeRecording ? { ...activeRecording } : null;
          let createdEventId: string | null = null;
          let newlySelectedEventIds = new Set<string>();
          let playbarEvtId: string | null = null;
          let notification: {text: string, color: string} | null = null;
          let isActivation = false;

          // Process the actual click
          if (tag.leadLagEnabled) {
              const pre = tag.preTime ?? 10;
              const post = tag.postTime ?? 10;
              const start = Math.max(0, currentTime - pre);
              const end = Math.min(duration, currentTime + post);
              
              if (isValidEvent(start, end)) {
                  createdEventId = Date.now().toString() + Math.random().toString(36).substr(2, 5);
                  newEvents.push({
                      id: createdEventId,
                      tagId: tagId,
                      startTime: start,
                      endTime: end,
                      notes: ''
                  });
                  newlySelectedEventIds.add(createdEventId);
                  playbarEvtId = createdEventId;
                  notification = { text: \`Saved: \${tag.name}\`, color: tag.color || '#fff' };
                  isActivation = true;
              } else {
                  showNotification('Invalid event duration', '#ef4444');
                  return;
              }
          } else {
              if (currentActiveRec) {
                  let start = currentActiveRec.startTime;
                  let end = currentTime;
                  if (start > end) { [start, end] = [end, start]; }
                  
                  if (!isValidEvent(start, end)) {
                      showNotification('Invalid event duration', '#ef4444');
                      currentActiveRec = null;
                  } else if (currentActiveRec.tagId === tagId) {
                      // Stopping current recording
                      newEvents.push({
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                          tagId: tagId,
                          startTime: start,
                          endTime: end,
                          labelIds: currentActiveRec.labelIds
                      });
                      currentActiveRec = null;
                      notification = { text: \`Saved: \${tag.name}\`, color: tag.color || '#fff' };
                      isActivation = false; // It's a stop
                  } else {
                      // Stop current, start new
                      newEvents.push({
                          id: Date.now().toString() + Math.random().toString(36).substr(2, 5),
                          tagId: currentActiveRec.tagId,
                          startTime: start,
                          endTime: end,
                          labelIds: currentActiveRec.labelIds
                      });
                      currentActiveRec = { tagId, startTime: currentTime, labelIds: [] };
                      notification = { text: \`Started: \${tag.name}\`, color: tag.color || '#fff' };
                      isActivation = true;
                  }
              } else {
                  // Start new recording
                  currentActiveRec = { tagId, startTime: currentTime, labelIds: [] };
                  notification = { text: \`Started: \${tag.name}\`, color: tag.color || '#fff' };
                  isActivation = true;
              }
          }

          // Process Connectors
          let finalActiveRec = currentActiveRec;
          
          if (isActivation) {
              const res = executeConnectors(tagId, currentActiveRec, newEvents, createdEventId, isActivation);
              finalActiveRec = res.nextActiveRec;
              newEvents = [...newEvents, ...res.additionalEvents];
              for (const id of res.newlySelectedEventIds) newlySelectedEventIds.add(id);
              if (res.playbarEvtId) playbarEvtId = res.playbarEvtId;
              if (res.notification) notification = { text: res.notification, color: '#c6ff1f' };
          }

          // Apply state updates
          if (newEvents.length > 0) {
              setTagEvents(prev => [...prev, ...newEvents]);
          }
          setActiveRecording(finalActiveRec);
          if (newlySelectedEventIds.size > 0) {
              setSelectedEventIds(newlySelectedEventIds);
          } else if (newEvents.length > 0 && !createdEventId && currentActiveRec === null) {
              setSelectedEventIds(new Set());
          }
          if (playbarEvtId !== null) {
              setPlaybarEventId(playbarEvtId);
          } else if (currentActiveRec === null) {
              setPlaybarEventId(null);
          }
          if (notification) {
              showNotification(notification.text, notification.color);
          }

      } else {
          setFilterTagId(current => current === tagId ? null : tagId);
      }
  };
`

const newLabelClickLogic = `
  const handleLabelClick = (labelId: string) => {
      if (isTaggingMode) {
          let newActiveRec = activeRecording ? { ...activeRecording, labelIds: activeRecording.labelIds ? [...activeRecording.labelIds] : [] } : null;
          let newEventsToUpdate = new Map<string, TagEvent>();
          let isActivation = false;
          let createdEventId: string | null = null;
          
          if (newActiveRec) {
              if (newActiveRec.labelIds.includes(labelId)) {
                  newActiveRec.labelIds = newActiveRec.labelIds.filter(l => l !== labelId);
              } else {
                  newActiveRec.labelIds.push(labelId);
                  isActivation = true;
              }
          } else if (selectedEventIds.size > 0) {
              // We assume activation if ANY selected event gets the label added
              let anyAdded = false;
              tagEvents.forEach(evt => {
                  if (selectedEventIds.has(evt.id)) {
                      let updatedEvt = { ...evt, labelIds: evt.labelIds ? [...evt.labelIds] : [] };
                      if (updatedEvt.labelIds.includes(labelId)) {
                          updatedEvt.labelIds = updatedEvt.labelIds.filter(l => l !== labelId);
                      } else {
                          updatedEvt.labelIds.push(labelId);
                          anyAdded = true;
                      }
                      newEventsToUpdate.set(evt.id, updatedEvt);
                  }
              });
              isActivation = anyAdded;
              if (selectedEventIds.size === 1) {
                  createdEventId = Array.from(selectedEventIds)[0];
              }
          } else {
              showNotification('No active recording or selected event to label', '#ef4444');
              return; // Nothing happened
          }
          
          // Connectors
          let additionalNewEvents: TagEvent[] = [];
          if (isActivation) {
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
          }
          
          // Apply state
          setActiveRecording(newActiveRec);
          if (newEventsToUpdate.size > 0 || additionalNewEvents.length > 0) {
              setTagEvents(prev => {
                  let next = prev.map(evt => newEventsToUpdate.has(evt.id) ? newEventsToUpdate.get(evt.id)! : evt);
                  return [...next, ...additionalNewEvents];
              });
          }
          
      } else {
          setFilterLabelId(current => current === labelId ? null : labelId);
      }
  };
`

const part1 = code.slice(0, labelClickStart);
const part2 = code.slice(labelClickEnd, tagClickStart);
const part3 = code.slice(tagClickEnd);

code = part1 + newLabelClickLogic + '\n\n' + part2 + newClickLogic + '\n\n' + part3;

fs.writeFileSync('src/components/Workspace/Workspace.tsx', code);
