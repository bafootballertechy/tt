import re

with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'ctx.arc(cx, cy, r * polyProgress, 0, Math.PI * 2);',
    'ctx.arc(cx, cy, Math.max(0.0001, r * polyProgress), 0, Math.PI * 2);'
)

with open('src/components/Workspace/Workspace.tsx', 'w') as f:
    f.write(content)
