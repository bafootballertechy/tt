const fs = require('fs');
let code = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf8');

const regex1 = /const handleScrubStart = \(e: React\.MouseEvent\) => \{\s*if \(\!timelineContainerRef\.current\) return;\s*setIsScrubbing\(true\);\s*const time = calculateTimeFromMouse\(e, timelineContainerRef\.current\);\s*handleManualSeek\(time\);\s*setMaskCache\(\{ foreground: null, overlay: null, timestamp: -1, processedAt: 0 \}\);\s*\};/;
const replacement1 = `const handleScrubStart = (e: React.MouseEvent) => {
      const target = (e.currentTarget as HTMLElement).closest('.overflow-auto, .overflow-hidden') as HTMLDivElement;
      if (!target) return;
      setIsScrubbing(true);
      const time = calculateTimeFromMouse(e, target);
      handleManualSeek(time);
      setMaskCache({ foreground: null, overlay: null, timestamp: -1, processedAt: 0 });
  };`;

const regex2 = /const handleScrubMove = useCallback\(\(e: MouseEvent\) => \{\s*if \(\!isScrubbing \|\| \!timelineContainerRef\.current\) return;\s*const time = calculateTimeFromMouse\(e, timelineContainerRef\.current\);\s*handleManualSeek\(time\);\s*\}, \[isScrubbing, calculateTimeFromMouse, handleManualSeek\]\);/;
const replacement2 = `const handleScrubMove = useCallback((e: MouseEvent) => {
      if (!isScrubbing) return;
      // Use whichever container is visible
      const container = expandedTimelineContainerRef.current || timelineContainerRef.current;
      if (!container) return;
      const time = calculateTimeFromMouse(e, container);
      handleManualSeek(time);
  }, [isScrubbing, calculateTimeFromMouse, handleManualSeek]);`;

if (regex1.test(code) && regex2.test(code)) {
    code = code.replace(regex1, replacement1).replace(regex2, replacement2);
    fs.writeFileSync('src/components/Workspace/Workspace.tsx', code);
    console.log("Success");
} else {
    console.log("Failed to match scrub regexes");
}
