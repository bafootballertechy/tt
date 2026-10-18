const fs = require('fs');
let code = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf-8');

// ring and chain default size 36
code = code.replace(
  /const \[ringSettings, setRingSettings\] = useState\(\{ tilt: (\d+), isFilled: (true|false), size: 60, outlineColor: '([^']+)', secondaryRing: (true|false), secondaryColor: '([^']+)' \}\);/,
  `const [ringSettings, setRingSettings] = useState({ tilt: $1, isFilled: $2, size: 36, outlineColor: '$3', secondaryRing: $4, secondaryColor: '$5' });`
);

// animation timeline 40%
code = code.replace(
  /const \[animationPanelWidth, setAnimationPanelWidth\] = useState<number>\(typeof window !== 'undefined' \? window.innerWidth \* 0\.35 : 500\);/,
  `const [animationPanelWidth, setAnimationPanelWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth * 0.40 : 500);`
);

fs.writeFileSync('src/components/Workspace/Workspace.tsx', code);
