const fs = require('fs');
const content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf8');
const lines = content.split('\n');
let start = lines.findIndex(l => l.includes('/* Track rows */'));
let end = lines.findIndex(l => l.includes('{/* Active Recording Toast */}'));
console.log(lines.slice(start, end).join('\n'));
