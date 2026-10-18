const fs = require('fs');
const path = require('path');

function replaceColorsInFile(file) {
    let code = fs.readFileSync(file, 'utf8');
    
    // Blues to #c6ff1f variations
    code = code.replace(/text-blue-500/g, 'text-[#c6ff1f]');
    code = code.replace(/text-blue-400/g, 'text-[#c6ff1f]');
    code = code.replace(/text-blue-300/g, 'text-[#a0d600]');
    
    code = code.replace(/bg-blue-600/g, 'bg-[#c6ff1f]');
    code = code.replace(/bg-blue-500/g, 'bg-[#c6ff1f]');
    code = code.replace(/bg-blue-400/g, 'bg-[#c6ff1f]');
    code = code.replace(/bg-blue-900\/20/g, 'bg-[#c6ff1f]/20');
    code = code.replace(/bg-blue-500\/5/g, 'bg-[#c6ff1f]/5');
    code = code.replace(/bg-blue-500\/10/g, 'bg-[#c6ff1f]/10');
    code = code.replace(/bg-blue-500\/50/g, 'bg-[#c6ff1f]/50');
    
    code = code.replace(/border-blue-500/g, 'border-[#c6ff1f]');
    code = code.replace(/border-blue-400/g, 'border-[#c6ff1f]');
    code = code.replace(/border-blue-500\/30/g, 'border-[#c6ff1f]/30');
    code = code.replace(/border-blue-500\/50/g, 'border-[#c6ff1f]/50');
    code = code.replace(/border-t-blue-500/g, 'border-t-[#c6ff1f]');
    code = code.replace(/shadow-\[0_0_8px_rgba\(59,130,246,0\.8\)\]/g, 'shadow-[0_0_8px_rgba(198,255,31,0.8)]');
    
    code = code.replace(/fill-blue-500/g, 'fill-[#c6ff1f]');
    
    code = code.replace(/hover:bg-blue-600/g, 'hover:bg-[#a0d600]');
    code = code.replace(/hover:bg-blue-500/g, 'hover:bg-[#a0d600]');
    code = code.replace(/hover:border-blue-500/g, 'hover:border-[#c6ff1f]');
    code = code.replace(/hover:text-blue-300/g, 'hover:text-[#a0d600]');
    
    // specific to login
    code = code.replace(/from-blue-500 to-emerald-400/g, 'from-[#e4ff7a] to-[#c6ff1f]');

    // fix the bg-[#c6ff1f] text-white to text-black if we messed up
    code = code.replace(/bg-\[#c6ff1f\] text-white/g, 'bg-[#c6ff1f] text-black');
    
    fs.writeFileSync(file, code);
}

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDirectory(fullPath);
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            replaceColorsInFile(fullPath);
        }
    }
}

processDirectory('src');
console.log("Patched all remaining blue colors");
