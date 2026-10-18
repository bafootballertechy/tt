const fs = require('fs');
let code = fs.readFileSync('src/components/Workspace/PeriodSyncManager.tsx', 'utf8');

const regex3 = /return \(\s*<div className="relative">\s*<button\s*onClick=\{\(\) => isOpen \? handleClose\(\) : setIsOpen\(true\)\}\s*className=\{`p-2 rounded-lg transition-colors flex items-center gap-2 \$\{isOpen \? 'bg-indigo-500\/20 text-indigo-400' : 'hover:bg-white\/10 text-gray-400 hover:text-white'\}`\}\s*title="Period Sync Manager"\s*aria-label="Period Sync Manager"\s*>\s*<Timer className="w-5 h-5" \/>\s*<\/button>/;

const replacement3 = `const hasUnsynced = periodSyncs.some(s => s.needsVideoSync);
  
  // Auto-open if there are unsynced periods and it hasn't been opened yet
  useEffect(() => {
      if (hasUnsynced && !isOpen) {
          setIsOpen(true);
      }
  }, [hasUnsynced]);

  return (
    <div className="relative">
      <button
        onClick={() => isOpen ? handleClose() : setIsOpen(true)}
        className={\`p-2 rounded-lg transition-colors flex items-center gap-2 \${hasUnsynced ? 'bg-amber-500/20 text-amber-400 animate-pulse' : (isOpen ? 'bg-indigo-500/20 text-indigo-400' : 'hover:bg-white/10 text-gray-400 hover:text-white')}\`}
        title="Period Sync Manager"
        aria-label="Period Sync Manager"
      >
        <Timer className="w-5 h-5" />
        {hasUnsynced && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-amber-500 rounded-full border-2 border-[#1a1a1a]"></span>
        )}
      </button>`;

if (regex3.test(code)) {
    code = code.replace(regex3, replacement3);
    
    // Add useEffect to imports if missing
    if (code.includes("import React, { useState }")) {
        code = code.replace("import React, { useState }", "import React, { useState, useEffect }");
    }
    
    fs.writeFileSync('src/components/Workspace/PeriodSyncManager.tsx', code);
    console.log("Success");
} else {
    console.log("Failed to match regex3");
}
