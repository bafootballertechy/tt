const fs = require('fs');
const content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf-8');
console.log(content.includes("else if (conn.type === 'defuse')"));
