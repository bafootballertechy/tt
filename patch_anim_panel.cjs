const fs = require('fs');
let code = fs.readFileSync('src/components/AnimationPanel.tsx', 'utf-8');

// Improve spacing: w-[60px] -> w-[100px]
code = code.replace(/w-\[60px\]/g, 'w-[100px]');
code = code.replace(/gap-1\.5/g, 'gap-2');
code = code.replace(/h-6/g, 'h-8'); // taller tracks
code = code.replace(/pt-\[18px\]/g, 'pt-[24px]'); // align with taller time markers header if needed
code = code.replace(/mb-1\.5/g, 'mb-2');

fs.writeFileSync('src/components/AnimationPanel.tsx', code);
