const fs = require('fs');
let code = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf8');

// 1. Initialize currentTime
code = code.replace(
    /const \[currentTime, setCurrentTime\] = useState\(0\);/,
    `const [currentTime, setCurrentTime] = useState(project.fileName === 'live' ? project.data.liveTime || 0 : 0);`
);

// 2. update payload in useEffect
const useEffectRegex = /onUpdateProject\(\{\s*shapes, freezeFrames, tags, tagEvents, playlists, markers, presetTexts, projectNotes, labels, labelEvents, advancedPadItems, connectors, periodSyncs\s*\}\);/g;
const useEffectReplacement = `onUpdateProject({
            shapes, freezeFrames, tags, tagEvents, playlists, markers, presetTexts, projectNotes, labels, labelEvents, advancedPadItems, connectors, periodSyncs,
            ...(isLive ? { liveTime: currentTime } : {})
        });`;

code = code.replace(useEffectRegex, useEffectReplacement);

// 3. update confirmClose
const confirmCloseRegex = /const confirmClose = \(\) => \{\s*onClose\(\);\s*\};/;
const confirmCloseReplacement = `const confirmClose = () => {
      onUpdateProject({
          shapes, freezeFrames, tags, tagEvents, playlists, markers, presetTexts, projectNotes, labels, labelEvents, advancedPadItems, connectors, periodSyncs,
          ...(isLive ? { liveTime: currentTime } : {})
      });
      onClose();
  };`;

code = code.replace(confirmCloseRegex, confirmCloseReplacement);

fs.writeFileSync('src/components/Workspace/Workspace.tsx', code);
console.log("Success");
