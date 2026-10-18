const fs = require('fs');
let code = fs.readFileSync('src/components/Workspace/Workspace.tsx', 'utf8');

if (!code.includes("import { Logo, Wordmark }")) {
  code = code.replace("import React,", "import { Logo, Wordmark } from '../Logo';\nimport React,");
}

code = code.replace(
  /<div className="text-xl font-extrabold tracking-tight text-white flex items-center mr-2">\s*<span>Tacstem<\/span>\s*<\/div>/g,
  '<div className="flex items-center gap-1 mr-2"><Logo className="w-6 h-6" /><Wordmark className="scale-[0.5] origin-left -ml-2" /></div>'
);

// We should also find purple/pink colors in Workspace.tsx
// It's a huge file, maybe we should just replace purple-500, purple-400, border-purple-500, text-purple-400 with #c6ff1f
// Since #c6ff1f doesn't have tailwind utility classes unless configured, let's use arbitrary variants like bg-[#c6ff1f].

code = code.replace(/text-purple-400/g, 'text-[#c6ff1f]');
code = code.replace(/text-purple-500/g, 'text-[#c6ff1f]');
code = code.replace(/text-purple-300/g, 'text-[#a0d600]');
code = code.replace(/bg-purple-600/g, 'bg-[#c6ff1f]');
code = code.replace(/bg-purple-500/g, 'bg-[#c6ff1f]');
code = code.replace(/bg-purple-400/g, 'bg-[#c6ff1f]');
code = code.replace(/border-purple-500/g, 'border-[#c6ff1f]');
code = code.replace(/border-purple-400/g, 'border-[#c6ff1f]');
code = code.replace(/ring-purple-500/g, 'ring-[#c6ff1f]');

// hover states
code = code.replace(/hover:bg-purple-500/g, 'hover:bg-[#c6ff1f]');
code = code.replace(/hover:text-purple-300/g, 'hover:text-[#c6ff1f]');

fs.writeFileSync('src/components/Workspace/Workspace.tsx', code);
console.log("Patched Workspace.tsx");
