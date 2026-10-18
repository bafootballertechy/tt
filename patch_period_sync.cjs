const fs = require('fs');
let code = fs.readFileSync('src/components/Workspace/PeriodSyncManager.tsx', 'utf8');

const regex2 = /updatedSyncs = periodSyncs\.map\(s => s\.id === update\.id \? \{ \.\.\.s, videoTimeSeconds: update\.newTime \} : s\);/;
const replacement2 = `updatedSyncs = periodSyncs.map(s => s.id === update.id ? { ...s, videoTimeSeconds: update.newTime, needsVideoSync: false } : s);`;

if (regex2.test(code)) {
    code = code.replace(regex2, replacement2);
    fs.writeFileSync('src/components/Workspace/PeriodSyncManager.tsx', code);
    console.log("Success");
} else {
    console.log("Failed to match regex2");
}
