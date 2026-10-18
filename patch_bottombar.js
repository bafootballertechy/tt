const fs = require('fs');
let code = fs.readFileSync('src/components/Workspace/WorkspaceBottomBar.tsx', 'utf8');

const target = `{/* Expand Timeline Button */}            <button                 onClick={() => setIsTimelineExpanded(!isTimelineExpanded)}                 className={\`p-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold mr-4 \${isTimelineExpanded ? 'bg-[#c6ff1f] text-black' : 'hover:bg-[#222] text-gray-400'}\`}                title={isTimelineExpanded ? "Collapse Timeline" : "Expand Timeline"}            >                {isTimelineExpanded ? <ChevronsDown className="w-4 h-4" /> : <ChevronsUp className="w-4 h-4" />}                <span>Timeline</span>            </button>            <div className="w-[1px] h-6 bg-[#333] mr-4" />`;

const replacement = `{/* Expand Timeline Button */}
            {!isLive && (
                <>
                    <button 
                        onClick={() => setIsTimelineExpanded(!isTimelineExpanded)} 
                        className={\`p-1.5 rounded-lg transition-colors flex items-center gap-2 text-xs font-bold mr-4 \${isTimelineExpanded ? 'bg-[#c6ff1f] text-black' : 'hover:bg-[#222] text-gray-400'}\`}
                        title={isTimelineExpanded ? "Collapse Timeline" : "Expand Timeline"}
                    >
                        {isTimelineExpanded ? <ChevronsDown className="w-4 h-4" /> : <ChevronsUp className="w-4 h-4" />}
                        <span>Timeline</span>
                    </button>
                    <div className="w-[1px] h-6 bg-[#333] mr-4" />
                </>
            )}`;

// Normalize newlines and spaces to try matching
const regex = /\{\/\*\s*Expand Timeline Button\s*\*\/\}.*?<span>Timeline<\/span>\s*<\/button>\s*<div className="w-\[1px\] h-6 bg-\[#333\] mr-4" \/>/s;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/components/Workspace/WorkspaceBottomBar.tsx', code);
    console.log("Success");
} else {
    console.log("Failed to match regex");
}
