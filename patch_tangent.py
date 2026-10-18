import re

with open('src/utils/drawing.ts', 'r') as f:
    content = f.read()

patch = """    const connectInset = 0.95;
    let startX = p1.x + ux * (r1Eff * connectInset); let startY = p1.y + uy * (r1Eff * connectInset);
    let endX = p2.x - ux * (r2Eff * connectInset); let endY = p2.y - uy * (r2Eff * connectInset);
    
    if (progress < 1) {
        const midX = (startX + endX) / 2;
        const midY = (startY + endY) / 2;
        startX = midX - ((midX - startX) * progress);
        startY = midY - ((midY - startY) * progress);
        endX = midX + ((endX - midX) * progress);
        endY = midY + ((endY - midY) * progress);
    }
"""

content = re.sub(r'const connectInset = 0\.95;\s+const startX = p1\.x \+ ux \* \(r1Eff \* connectInset\); const startY = p1\.y \+ uy \* \(r1Eff \* connectInset\);\s+const endX = p2\.x - ux \* \(r2Eff \* connectInset\); const endY = p2\.y - uy \* \(r2Eff \* connectInset\);', patch, content)

with open('src/utils/drawing.ts', 'w') as f:
    f.write(content)
