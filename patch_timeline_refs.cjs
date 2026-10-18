const fs = require('fs');
let code = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf8');

// 1. Add new ref
code = code.replace(
    /const timelineContainerRef = useRef<HTMLDivElement>\(null\);/,
    `const timelineContainerRef = useRef<HTMLDivElement>(null);\n  const expandedTimelineContainerRef = useRef<HTMLDivElement>(null);`
);

// 2. Apply to expanded timeline
code = code.replace(
    /\{\/\* Scrollable Timeline Area \*\/\}\s*<div\s*ref=\{timelineContainerRef\}\s*className="flex-1 relative overflow-auto bg-\[#0a0a0a\] scroll-smooth"/,
    `{/* Scrollable Timeline Area */}
                         <div 
                            ref={expandedTimelineContainerRef}
                            className="flex-1 relative overflow-auto bg-[#0a0a0a] scroll-smooth"`
);

// 3. Update useEffect
const useEffectRegex = /useEffect\(\(\) => \{\s*if \(timelineContainerRef\.current\) \{\s*const container = timelineContainerRef\.current;\s*if \(timelineZoom > 1\) \{\s*const scrollWidth = container\.scrollWidth;\s*const clientWidth = container\.clientWidth;\s*const progress = currentTime \/ \(duration \|\| 1\);\s*const center = \(progress \* scrollWidth\) - \(clientWidth \/ 2\);\s*container\.scrollLeft = center;\s*\} else \{\s*container\.scrollLeft = 0;\s*\}\s*\}\s*\}, \[currentTime, timelineZoom, duration\]\);/;

const useEffectReplacement = `useEffect(() => {
      const updateScroll = (container: HTMLDivElement | null) => {
          if (!container) return;
          if (timelineZoom > 1) {
              const scrollWidth = container.scrollWidth;
              const clientWidth = container.clientWidth;
              const progress = currentTime / (duration || 1);
              const center = (progress * scrollWidth) - (clientWidth / 2);
              container.scrollLeft = center;
          } else {
              container.scrollLeft = 0;
          }
      };
      
      updateScroll(timelineContainerRef.current);
      updateScroll(expandedTimelineContainerRef.current);
  }, [currentTime, timelineZoom, duration]);`;

if (useEffectRegex.test(code)) {
    code = code.replace(useEffectRegex, useEffectReplacement);
    fs.writeFileSync('src/components/Workspace/Workspace.tsx', code);
    console.log("Success");
} else {
    console.log("Failed to match useEffect");
}
