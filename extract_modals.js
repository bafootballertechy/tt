const fs = require('fs');

const content = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf-8');
const lines = content.split('\n');

let modalsStart = -1;
let modalsEnd = -1;

for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('      {/* Setup / Onboarding Modal */}')) {
      modalsStart = i;
  }
  if (lines[i].includes('    </div>')) {
      modalsEnd = i;
  }
}

if (modalsStart !== -1 && modalsEnd !== -1) {
    const modalsBlock = lines.slice(modalsStart, modalsEnd).join('\n');
    fs.writeFileSync('temp_modals.txt', modalsBlock);
    console.log('Modals block found from line ' + modalsStart + ' to ' + modalsEnd);
} else {
    console.log('Could not find boundaries.');
}
