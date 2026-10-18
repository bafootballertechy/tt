const fs = require('fs');
let code = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf8');

const regex1 = /\{showTimelineFreezeFrames && \(/g;
const replacement1 = `{(!isLive && showTimelineFreezeFrames) && (`;

if (regex1.test(code)) {
    code = code.replace(regex1, replacement1);
    fs.writeFileSync('src/components/Workspace/Workspace.tsx', code);
    console.log("Success");
} else {
    console.log("Failed to match regex");
}
