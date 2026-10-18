import re

with open('src/utils/drawing.ts', 'r') as f:
    content = f.read()

clip_logic = """
    const boxX = -boxWidth / 2;
    const boxY = -triangleHeight - boxHeight;
    
    if (animProgress < 1 && !isGhost) {
        ctx.beginPath();
        // Wiping from start to end (left to right)
        ctx.rect(boxX, boxY, boxWidth * animProgress, boxHeight + triangleHeight + 10);
        ctx.clip();
    }
"""

content = re.sub(
    r'const boxX = -boxWidth / 2;\s+const boxY = -triangleHeight - boxHeight;',
    clip_logic,
    content
)

with open('src/utils/drawing.ts', 'w') as f:
    f.write(content)
