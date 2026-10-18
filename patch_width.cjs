const fs = require('fs');
let code = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf-8');
code = code.replace(
  /const \[animationPanelWidth, setAnimationPanelWidth\] = useState<number>\(typeof window !== 'undefined' \? window.innerWidth \* 0\.40 : 500\);/,
  `const [animationPanelWidth, setAnimationPanelWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth * 0.60 : 500);`
);
fs.writeFileSync('src/components/Workspace/Workspace.tsx', code);
