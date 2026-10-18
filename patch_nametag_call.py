import re

with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

content = re.sub(
    r"case 'name-tag': if \(shape\.text\) drawNameTag\(ctx, points\[0\], shape\.text, shape\.color, scale, shape\.timestamp, shape\.strokeWidth\); break;",
    r"case 'name-tag': if (shape.text) drawNameTag(ctx, points[0], shape.text, shape.color, scale, shape.timestamp, shape.strokeWidth, false, unifiedProgress); break;",
    content
)

with open('src/components/Workspace/Workspace.tsx', 'w') as f:
    f.write(content)
