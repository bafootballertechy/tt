import re

with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

# Replace the end of drawShapeOnCanvas
content = re.sub(
    r'case \'text\': if \(shape\.text && shape\.textConfig\) drawText\(ctx, points\[0\], shape\.text, shape\.color, scale, shape\.timestamp, shape\.textConfig\); break;\n    \}\n    ctx\.restore\(\);\n  \};\n',
    'case \'text\': if (shape.text && shape.textConfig) drawText(ctx, points[0], shape.text, shape.color, scale, shape.timestamp, shape.textConfig); break;\n    }\n    ctx.restore();\n    ctx.restore();\n  };\n',
    content
)

with open('src/components/Workspace/Workspace.tsx', 'w') as f:
    f.write(content)
