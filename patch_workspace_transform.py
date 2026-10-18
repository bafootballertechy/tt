import re

with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

# Find `ctx.beginPath();` right before `switch (type) {`
transform_logic = """
    ctx.beginPath();
    
    ctx.save();
    if (unifiedProgress !== undefined) {
        if (type === 'circle' || type === 'connected-circle') {
            let actualProgress = unifiedProgress;
            let effScale = actualProgress < 1 ? Math.pow(actualProgress, 0.5) : 1;
            if (effScale < 1) {
                let cx = p1.x; let cy = p1.y;
                if (type === 'connected-circle') {
                    cx = points.reduce((s, p) => s + p.x, 0) / points.length;
                    cy = points.reduce((s, p) => s + p.y, 0) / points.length;
                }
                ctx.translate(cx, cy);
                ctx.scale(effScale, effScale);
                ctx.translate(-cx, -cy);
            }
        }
        if (type === 'spotlight' && unifiedProgress < 1) {
            ctx.beginPath();
            ctx.rect(0, 0, 1920, 1080 * unifiedProgress);
            ctx.clip();
        }
    }

    switch (type) {
"""
content = content.replace("    ctx.beginPath();\n    switch (type) {\n", transform_logic)

# We need to add an extra ctx.restore() after the switch block.
# Let's find:
#         default: break; 
#     }
#     ctx.restore();
content = content.replace("        default: break; \n    }\n    ctx.restore();", "        default: break; \n    }\n    ctx.restore();\n    ctx.restore();")

with open('src/components/Workspace/Workspace.tsx', 'w') as f:
    f.write(content)
