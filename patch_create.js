const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf-8');
code = code.replace(
  /\/\/ Save locally\s*await saveProjectDataLocally\(newId, newProject\);\s*setProjects\(prev => \[newProject, \.\.\.prev\]\);\s*setProjectBlobs\(prev => new Map\(prev\)\.set\(newId, url\)\);\s*setActiveProject\(newProject\);\s*setView\('workspace'\);\s*\};/,
  `// Update UI instantly
      setProjects(prev => [newProject, ...prev]);
      setProjectBlobs(prev => new Map(prev).set(newId, url));
      setActiveProject(newProject);
      setView('workspace');

      // Save locally in background
      saveProjectDataLocally(newId, newProject).catch(console.error);
  };`
);
fs.writeFileSync('src/App.tsx', code);
