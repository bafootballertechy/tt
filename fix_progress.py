import re

with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    'const polyProgress = shape.timestamp ? Math.min(1, (polyNow - shape.timestamp) / polyDuration) : 1;',
    'const polyProgress = shape.timestamp ? Math.max(0, Math.min(1, (polyNow - shape.timestamp) / polyDuration)) : 1;'
)

content = content.replace(
    'const pmProgress = shape.timestamp ? Math.min(1, (Date.now() - shape.timestamp) / pmDuration) : 1;',
    'const pmProgress = shape.timestamp ? Math.max(0, Math.min(1, (Date.now() - shape.timestamp) / pmDuration)) : 1;'
)

with open('src/components/Workspace/Workspace.tsx', 'w') as f:
    f.write(content)

with open('src/utils/drawing.ts', 'r') as f:
    content = f.read()

content = re.sub(
    r'const progress = animProgress !== undefined \? animProgress : Math\.min\(1, age / duration\);',
    r'const progress = animProgress !== undefined ? Math.max(0, animProgress) : Math.max(0, Math.min(1, age / duration));',
    content
)

content = re.sub(
    r'const progress = animProgress !== undefined \? animProgress : \(timestamp > 0 \? Math\.min\(1, \(now - timestamp\) / duration\) : 1\);',
    r'const progress = animProgress !== undefined ? Math.max(0, animProgress) : (timestamp > 0 ? Math.max(0, Math.min(1, (now - timestamp) / duration)) : 1);',
    content
)

with open('src/utils/drawing.ts', 'w') as f:
    f.write(content)
