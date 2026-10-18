const fs = require('fs');
function replaceInFile(file) {
    let code = fs.readFileSync(file, 'utf8');
    code = code.replace(/text-purple-400/g, 'text-[#c6ff1f]');
    code = code.replace(/text-purple-500/g, 'text-[#c6ff1f]');
    code = code.replace(/bg-purple-900\/20/g, 'bg-[#c6ff1f]/20');
    code = code.replace(/border-t-purple-500/g, 'border-t-[#c6ff1f]');
    code = code.replace(/from-blue-500 to-purple-500/g, 'from-[#e4ff7a] to-[#c6ff1f]');
    code = code.replace(/from-blue-400 to-purple-400/g, 'from-[#e4ff7a] to-[#c6ff1f]');
    
    // Some buttons were bg-blue-600.
    code = code.replace(/bg-blue-600 hover:bg-blue-500 text-white/g, 'bg-[#c6ff1f] hover:bg-[#a0d600] text-black');
    code = code.replace(/bg-blue-500 hover:bg-blue-600 text-white/g, 'bg-[#c6ff1f] hover:bg-[#a0d600] text-black');
    code = code.replace(/bg-blue-600/g, 'bg-[#c6ff1f]');
    code = code.replace(/hover:bg-blue-500/g, 'hover:bg-[#a0d600]');
    
    fs.writeFileSync(file, code);
}
replaceInFile('src/components/Workspace/Workspace.tsx');
replaceInFile('src/components/Workspace/Modals/WorkspaceModals.tsx');
replaceInFile('src/components/EventPlaybar.tsx');
replaceInFile('src/components/Shared/SharedUI.tsx');

console.log("Patched others");
