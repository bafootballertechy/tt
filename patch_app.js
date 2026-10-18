const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

// Add import
if (!code.includes("import { Logo, Wordmark }")) {
  code = code.replace("import { LoginScreen }", "import { Logo, Wordmark } from './components/Logo';\nimport { LoginScreen }");
}

// Replace dashboard title
code = code.replace(
  /<span>Tacstem <span className="gradient-text">Dashboard<\/span><\/span>/g,
  '<div className="flex items-center gap-2"><Logo className="w-8 h-8" /><Wordmark className="scale-75 origin-left" /></div>'
);

// CSS replacements
code = code.replace(/rgba\(120, 60, 255/g, 'rgba(198, 255, 31'); // orb-1
code = code.replace(/rgba\(255, 70, 180/g, 'rgba(198, 255, 31'); // orb-2
code = code.replace(/rgba\(0, 200, 255/g, 'rgba(198, 255, 31'); // orb-3
code = code.replace(/linear-gradient\(135deg, #c084fc, #8b5cf6, #ec4899\)/g, '#c6ff1f'); // gradient-text
code = code.replace(/linear-gradient\(135deg, #7c3aed, #6d28d9\)/g, 'linear-gradient(135deg, #c6ff1f, #a0d600)'); // btn-glow background
code = code.replace(/rgba\(124, 58, 237, 0.25\)/g, 'rgba(198, 255, 31, 0.25)'); // btn-glow box-shadow
code = code.replace(/rgba\(124, 58, 237, 0.45\)/g, 'rgba(198, 255, 31, 0.45)'); // btn-glow hover box-shadow
code = code.replace(/linear-gradient\(135deg, #a78bfa, #7c3aed, #ec4899\)/g, 'linear-gradient(135deg, #e4ff7a, #c6ff1f, #94c900)'); // btn-glow after background
code = code.replace(/rgba\(124, 58, 237, 0.3\)/g, 'rgba(198, 255, 31, 0.3)'); // border-color
code = code.replace(/rgba\(124, 58, 237, 0.05\)/g, 'rgba(198, 255, 31, 0.05)'); // box-shadow 40px
code = code.replace(/linear-gradient\(135deg, rgba\(124, 58, 237, 0.15\), rgba\(236, 72, 153, 0.10\)\)/g, 'linear-gradient(135deg, rgba(198, 255, 31, 0.15), rgba(150, 200, 0, 0.10))'); // plan-badge
code = code.replace(/rgba\(124, 58, 237, 0.20\)/g, 'rgba(198, 255, 31, 0.20)'); // plan-badge border
code = code.replace(/color: #c084fc;/g, 'color: #c6ff1f;'); // text color
code = code.replace(/conic-gradient\(from 0deg, #7c3aed, #ec4899, #7c3aed\)/g, 'conic-gradient(from 0deg, #c6ff1f, #94c900, #c6ff1f)'); // avatar-ring
code = code.replace(/rgba\(124, 58, 237, 0.4\)/g, 'rgba(198, 255, 31, 0.4)'); // search-bar focus border
code = code.replace(/rgba\(124, 58, 237, 0.15\)/g, 'rgba(198, 255, 31, 0.15)'); // filter-tab active background
code = code.replace(/border-purple-500/g, 'border-[#c6ff1f]'); // loading spinner
code = code.replace(/shadow-purple-500/g, 'shadow-[#c6ff1f]'); // toast shadow
code = code.replace(/text-purple-400/g, 'text-[#c6ff1f]'); // user icon

// Replace blue-600 with the brand color #c6ff1f for some buttons, but wait, text-white on #c6ff1f won't look good. Let's make it text-black.
code = code.replace(/bg-blue-600 hover:bg-blue-500 text-white/g, 'bg-[#c6ff1f] hover:bg-[#a0d600] text-black');

fs.writeFileSync('src/App.tsx', code);
console.log("Patched App.tsx");
