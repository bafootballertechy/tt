import re

with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'let actualProgress = unifiedProgress !== undefined ? unifiedProgress : 1;',
    'let actualProgress = unifiedProgress !== undefined ? Math.max(0, unifiedProgress) : 1;'
)

content = content.replace(
    'let actualProgress = unifiedProgress;',
    'let actualProgress = Math.max(0, unifiedProgress);'
)

with open('src/components/Workspace/Workspace.tsx', 'w') as f:
    f.write(content)
