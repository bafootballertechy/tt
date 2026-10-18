const fs = require('fs');
let code = fs.readFileSync('src/components/Shared/SharedUI.tsx', 'utf8');

if (!code.includes("import { Logo, Wordmark }")) {
  code = code.replace("import React,", "import { Logo, Wordmark } from '../Logo';\nimport React,");
}

code = code.replace(
  /<h2 className="text-2xl font-bold text-white">Welcome to Tacstem<\/h2>/g,
  '<div className="flex items-center gap-1"><h2 className="text-2xl font-bold text-white">Welcome to</h2><Logo className="w-8 h-8 ml-2" /><Wordmark className="scale-75 origin-left" /></div>'
);

code = code.replace(/text-purple-400/g, 'text-[#c6ff1f]');
code = code.replace(/text-purple-500/g, 'text-[#c6ff1f]');
code = code.replace(/text-blue-400/g, 'text-[#c6ff1f]');
code = code.replace(/text-blue-500/g, 'text-[#c6ff1f]');
code = code.replace(/bg-purple-600/g, 'bg-[#c6ff1f]');
code = code.replace(/bg-purple-500/g, 'bg-[#c6ff1f]');
code = code.replace(/bg-purple-400/g, 'bg-[#c6ff1f]');
code = code.replace(/bg-blue-600/g, 'bg-[#c6ff1f]');
code = code.replace(/bg-blue-500/g, 'bg-[#c6ff1f]');
code = code.replace(/border-purple-500/g, 'border-[#c6ff1f]');
code = code.replace(/border-purple-400/g, 'border-[#c6ff1f]');
code = code.replace(/border-blue-500/g, 'border-[#c6ff1f]');
code = code.replace(/ring-purple-500/g, 'ring-[#c6ff1f]');
code = code.replace(/hover:bg-purple-500/g, 'hover:bg-[#c6ff1f]');
code = code.replace(/hover:bg-blue-500/g, 'hover:bg-[#c6ff1f]');
code = code.replace(/bg-blue-500\/20/g, 'bg-[#c6ff1f]/20');
code = code.replace(/border-blue-500\/30/g, 'border-[#c6ff1f]/30');

// There's a button in SharedUI that probably has text-white on #c6ff1f, let's fix it
code = code.replace(/bg-\[#c6ff1f\] text-white/g, 'bg-[#c6ff1f] text-black');

fs.writeFileSync('src/components/Shared/SharedUI.tsx', code);
console.log("Patched SharedUI.tsx");
