const fs = require('fs');

const content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf-8');
const lines = content.split('\n');

let sidebarStart = 4101;
let sidebarEnd = -1;

for (let i = 4101; i < lines.length; i++) {
  if (lines[i].includes('      <AnimatePresence>')) {
      // The first AnimatePresence after the sidebar is the WorkspaceModals block!
      sidebarEnd = i - 1;
      break;
  }
}

if (sidebarStart !== -1 && sidebarEnd !== -1) {
    const sidebarBlock = lines.slice(sidebarStart - 1, sidebarEnd).join('\n');
    fs.writeFileSync('temp_sidebar.txt', sidebarBlock);
    console.log('Sidebar block found from line ' + sidebarStart + ' to ' + sidebarEnd);
} else {
    console.log('Could not find boundaries.');
}
