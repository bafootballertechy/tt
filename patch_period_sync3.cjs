const fs = require('fs');
let code = fs.readFileSync('src/components/Workspace/PeriodSyncManager.tsx', 'utf8');

const regex4 = /<div className="text-xs text-gray-400 mb-2">\s*Sync your video timeline with the actual game periods\. This aligns exported events perfectly across different video files\.\s*<\/div>/;

const replacement4 = `<div className="text-xs text-gray-400 mb-2">
                  Sync your video timeline with the actual game periods. This aligns exported events perfectly across different video files.
                </div>
                
                {hasUnsynced && (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-md p-2.5 text-amber-400 text-xs flex items-start gap-2 mb-4">
                        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                        <p>You imported a new video. Please sync the starting times for the following periods to match the new video.</p>
                    </div>
                )}`;

if (regex4.test(code)) {
    code = code.replace(regex4, replacement4);
    fs.writeFileSync('src/components/Workspace/PeriodSyncManager.tsx', code);
    console.log("Success 4");
} else {
    console.log("Failed 4");
}

const regex5 = /<div key=\{period\.id\} className=\{`border rounded-lg p-3 group transition-colors \$\{isEnabled \? 'bg-indigo-900\/10 border-indigo-500\/30' : 'bg-black\/20 border-white\/5'\}`\}>/;

const replacement5 = `<div key={period.id} className={\`border rounded-lg p-3 group transition-colors \${isEnabled ? (currentSync.needsVideoSync ? 'bg-amber-900/10 border-amber-500/50 relative overflow-hidden' : 'bg-indigo-900/10 border-indigo-500/30') : 'bg-black/20 border-white/5'}\`}>
                        {isEnabled && currentSync.needsVideoSync && (
                            <div className="absolute top-0 right-0 left-0 h-0.5 bg-amber-500/50 shadow-[0_0_8px_rgba(245,158,11,0.5)]"></div>
                        )}`;

if (regex5.test(code)) {
    code = code.replace(regex5, replacement5);
    fs.writeFileSync('src/components/Workspace/PeriodSyncManager.tsx', code);
    console.log("Success 5");
} else {
    console.log("Failed 5");
}

