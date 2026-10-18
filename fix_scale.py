import re

with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'let effScale = actualProgress < 1 ? Math.pow(actualProgress, 0.5) : 1;',
    'let effScale = actualProgress < 1 ? Math.max(0.0001, Math.pow(actualProgress, 0.5)) : 1;'
)

with open('src/components/Workspace/Workspace.tsx', 'w') as f:
    f.write(content)
