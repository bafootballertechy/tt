const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex = /const hasSource = projectBlobs\.has\(project\.id\);/;
const replacement = `const hasSource = projectBlobs.has(project.id) || project.fileName === 'live';`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Success");
} else {
    console.log("Failed to match regex");
}
