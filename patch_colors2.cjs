const fs = require('fs');
const path = require('path');

function replaceColorsInFile(file) {
    let code = fs.readFileSync(file, 'utf8');
    
    code = code.replace(/text-blue-[0-9]{3}/g, 'text-[#c6ff1f]');
    code = code.replace(/bg-blue-[0-9]{3}/g, 'bg-[#c6ff1f]');
    code = code.replace(/bg-blue-[0-9]{3}\/[0-9]+/g, 'bg-[#c6ff1f]/20');
    code = code.replace(/hover:bg-blue-[0-9]{3}/g, 'hover:bg-[#a0d600]');
    code = code.replace(/ring-blue-[0-9]{3}\/[0-9]+/g, 'ring-[#c6ff1f]/50');
    code = code.replace(/fill-blue-[0-9]{3}\/[0-9]+/g, 'fill-[#c6ff1f]/20');
    code = code.replace(/from-blue-[0-9]{3}\/[0-9]+/g, 'from-[#c6ff1f]/0');
    code = code.replace(/via-blue-[0-9]{3}\/[0-9]+/g, 'via-[#c6ff1f]/10');
    code = code.replace(/to-blue-[0-9]{3}\/[0-9]+/g, 'to-[#c6ff1f]/0');

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
console.log("Patched all remaining blue colors part 2");
