const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');

const regex1 = /let updatedProject = project;\s*if \(isNewVideo\) \{\s*updatedProject = \{ \.\.\.project, fileName: file\.name, lastModified: Date\.now\(\) \};\s*await saveProjectDataLocally\(updatedProject\.id, updatedProject\);\s*\}/g;

const replacement1 = `let updatedProject = project;
          if (isNewVideo) {
              const wasLive = project.fileName === 'live';
              updatedProject = { ...project, fileName: file.name, lastModified: Date.now() };
              
              if (wasLive && updatedProject.data && updatedProject.data.periodSyncs) {
                  updatedProject.data.periodSyncs = updatedProject.data.periodSyncs.map(ps => ({
                      ...ps,
                      needsVideoSync: true
                  }));
              }
              await saveProjectDataLocally(updatedProject.id, updatedProject);
          }`;

let matchCount = (code.match(regex1) || []).length;
console.log("Found " + matchCount + " matches");

if (matchCount > 0) {
    code = code.replace(regex1, replacement1);
    fs.writeFileSync('src/App.tsx', code);
    console.log("Success");
} else {
    console.log("Failed to match regex");
}
