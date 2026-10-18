const fs = require('fs');
let code = fs.readFileSync('src/components/Logo.tsx', 'utf8');

code = code.replace(/<div className={`relative \${className}`} style={{ width: '100%', height: '100%' }}>/, '<div className={`relative ${className}`}>');

fs.writeFileSync('src/components/Logo.tsx', code);
console.log("Patched Logo.tsx");
