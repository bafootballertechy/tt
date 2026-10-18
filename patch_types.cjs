const fs = require('fs');
let code = fs.readFileSync('src/types.ts', 'utf8');

const regex = /periodSyncs\?: PeriodSync\[\];/;
const replacement = `periodSyncs?: PeriodSync[];\n  liveTime?: number;`;

if (regex.test(code)) {
    code = code.replace(regex, replacement);
    fs.writeFileSync('src/types.ts', code);
    console.log("Success");
} else {
    console.log("Failed to match regex");
}
