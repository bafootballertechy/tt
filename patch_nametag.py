import re

with open('src/utils/drawing.ts', 'r') as f:
    content = f.read()

# Change signature to accept unifiedProgress
content = re.sub(
    r'export const drawNameTag = \(ctx: CanvasRenderingContext2D, point: Point, text: string, color: string, scale: number, timestamp: number, fontSize: number = 14, isGhost: boolean = false\) => \{',
    'export const drawNameTag = (ctx: CanvasRenderingContext2D, point: Point, text: string, color: string, scale: number, timestamp: number, fontSize: number = 14, isGhost: boolean = false, unifiedProgress?: number) => {',
    content
)

logic = """
    // Animation
    const animDuration = 400;
    let animProgress = 1;
    if (unifiedProgress !== undefined) {
        animProgress = Math.max(0, Math.min(1, unifiedProgress));
    } else {
        animProgress = isGhost ? 1 : Math.max(0, Math.min(1, Math.max(0, age) / animDuration));
    }
"""

content = re.sub(
    r'// Animation\s+const animDuration = 400;\s+let animProgress = isGhost \? 1 : Math\.min\(1, Math\.max\(0, age\) / animDuration\);',
    logic,
    content
)

# Replace the bubbling scale with a clip
content = re.sub(
    r'const easeOutBack = \(x: number\): number => \{\s+const c1 = 1\.70158;\s+const c3 = c1 \+ 1;\s+return 1 \+ c3 \* Math\.pow\(x - 1, 3\) \+ c1 \* Math\.pow\(x - 1, 2\);\s+\};\s+const scaleAnim = easeOutBack\(animProgress\);\s+if \(scaleAnim <= 0 && !isGhost\) \{\s+ctx\.restore\(\);\s+return;\s+\}\s+ctx\.translate\(point\.x, point\.y\);\s+ctx\.scale\(scaleAnim, scaleAnim\);',
    'ctx.translate(point.x, point.y);',
    content
)

with open('src/utils/drawing.ts', 'w') as f:
    f.write(content)
