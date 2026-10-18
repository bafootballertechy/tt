const fs = require('fs');
let code = fs.readFileSync('src/components/LoginScreen.tsx', 'utf8');

if (!code.includes("import { Logo, Wordmark }")) {
  code = code.replace("import React from 'react';", "import React from 'react';\nimport { Logo, Wordmark } from './Logo';");
}

code = code.replace(
  /<span className="text-2xl font-extrabold tracking-tight text-white">Tacstem<\/span>/g,
  '<Logo className="w-12 h-12" /><Wordmark className="scale-[0.8] origin-left" />'
);

// Replace gradients
code = code.replace(/from-\[#3b206b\] via-\[#1c1143\] to-\[#0a0618\]/g, 'from-[#1a2b03] via-[#0b1202] to-[#040601]');
code = code.replace(/bg-purple-500\/20/g, 'bg-[#c6ff1f]/20');
code = code.replace(/bg-purple-500\/10/g, 'bg-[#c6ff1f]/10');
code = code.replace(/bg-purple-400\/20/g, 'bg-[#c6ff1f]/20');
code = code.replace(/border-purple-500\/20/g, 'border-[#c6ff1f]/20');
code = code.replace(/bg-purple-400/g, 'bg-[#c6ff1f]');
code = code.replace(/bg-purple-500\/80/g, 'bg-[#c6ff1f]/80');
code = code.replace(/bg-blue-600\/10/g, 'bg-[#a0d600]/10');
code = code.replace(/from-purple-400 to-emerald-300/g, 'from-[#e4ff7a] to-[#c6ff1f]');
code = code.replace(/text-purple-100\/70/g, 'text-[#c6ff1f]/70');
code = code.replace(/from-blue-500 to-purple-500/g, 'from-[#a0d600] to-[#c6ff1f]');
code = code.replace(/rgba\(168, 85, 247/g, 'rgba(198, 255, 31'); // The zone highlight polygon

fs.writeFileSync('src/components/LoginScreen.tsx', code);
console.log("Patched LoginScreen.tsx");
