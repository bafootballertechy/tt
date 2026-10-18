const fs = require('fs');
let code = fs.readFileSync('src/components/AnimationPanel.tsx', 'utf-8');
code = code.replace(/w-6 h-8 flex items-center/, 'w-6 h-6 flex items-center');
fs.writeFileSync('src/components/AnimationPanel.tsx', code);
