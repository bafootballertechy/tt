const fs = require('fs');
const content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf8');
const start = content.indexOf('// COLLAPSED SIMPLE TIMELINE');
const end = content.indexOf('</div>', content.indexOf('{/* End of Collapsed Timeline */}', start)) || content.indexOf('{/* End of Collapsed Timeline', start);
console.log(content.slice(start, start + 3000));
