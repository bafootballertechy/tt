const fs = require('fs');
let code = fs.readFileSync('src/components/Workspace/WorkspaceBottomBar.tsx', 'utf8');

const regex = /<label className="flex items-center justify-between p-2 hover:bg-\[#222\] rounded-lg cursor-pointer transition-colors group">\s*<span className="text-xs text-gray-300 font-medium flex items-center gap-2">\s*<Snowflake className="w-3.5 h-3.5 text-\[#c6ff1f\]" \/>\s*Freeze Frames\s*<\/span>\s*<div className=\{`w-7 h-4 rounded-full transition-colors relative \$\{showTimelineFreezeFrames \? 'bg-\[#c6ff1f\]' : 'bg-\[#333\]'\}`\}>\s*<div className=\{`absolute top-0.5 bottom-0.5 w-3 bg-white rounded-full transition-all shadow-sm \$\{showTimelineFreezeFrames \? 'right-0.5' : 'left-0.5'\}`\} \/>\s*<\/div>\s*<input type="checkbox" className="hidden" checked=\{showTimelineFreezeFrames\} onChange=\{\(\) => setShowTimelineFreezeFrames\(\!showTimelineFreezeFrames\)\} \/>\s*<\/label>/s;

const replacement = `{!isLive && (
                                    <label className="flex items-center justify-between p-2 hover:bg-[#222] rounded-lg cursor-pointer transition-colors group">
                                        <span className="text-xs text-gray-300 font-medium flex items-center gap-2">
                                            <Snowflake className="w-3.5 h-3.5 text-[#c6ff1f]" />
                                            Freeze Frames
                                        </span>
                                        <div className={\`w-7 h-4 rounded-full transition-colors relative \${showTimelineFreezeFrames ? 'bg-[#c6ff1f]' : 'bg-[#333]'}\`}>
                                            <div className={\`absolute top-0.5 bottom-0.5 w-3 bg-white rounded-full transition-all shadow-sm \${showTimelineFreezeFrames ? 'right-0.5' : 'left-0.5'}\`} />
                                        </div>
                                        <input type="checkbox" className="hidden" checked={showTimelineFreezeFrames} onChange={() => setShowTimelineFreezeFrames(!showTimelineFreezeFrames)} />
                                    </label>
                                )}`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/Workspace/WorkspaceBottomBar.tsx', code);
    console.log("Success");
} else {
    console.log("Failed to match regex");
}
