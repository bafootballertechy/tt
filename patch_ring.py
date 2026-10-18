import re

with open('src/utils/drawing.ts', 'r') as f:
    content = f.read()

# Add unifiedProgress to signature
content = re.sub(
    r'export const draw3DRing = \(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, tiltDegrees: number, strokeWidth: number, timestamp: number, isGhost: boolean = false, config: any = \{\}\) => \{',
    'export const draw3DRing = (ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, color: string, tiltDegrees: number, strokeWidth: number, timestamp: number, isGhost: boolean = false, config: any = {}, unifiedProgress?: number) => {',
    content
)

logic = """
  let scaleEnt = 1;
  let alphaEnt = 1;
  if (unifiedProgress !== undefined) {
      const p = Math.max(0, Math.min(1, unifiedProgress));
      alphaEnt = p;
      if (p < 0.6) {
          scaleEnt = 0.3 + 0.78 * (p / 0.6);
      } else {
          scaleEnt = 1.08 - 0.08 * ((p - 0.6) / 0.4);
      }
  } else {
      const entSpeed = 500;
      if (!isGhost && timeElapsed < entSpeed) {
          const p = timeElapsed / entSpeed;
          alphaEnt = p;
          if (p < 0.6) {
              scaleEnt = 0.3 + 0.78 * (p / 0.6);
          } else {
              scaleEnt = 1.08 - 0.08 * ((p - 0.6) / 0.4);
          }
      }
  }
"""

content = re.sub(
    r'let scaleEnt = 1;\s+let alphaEnt = 1;\s+const entSpeed = 500;\s+if \(!isGhost && timeElapsed < entSpeed\) \{\s+const p = timeElapsed / entSpeed;\s+alphaEnt = p;\s+if \(p < 0\.6\) \{\s+scaleEnt = 0\.3 \+ 0\.78 \* \(p / 0\.6\);\s+\} else \{\s+scaleEnt = 1\.08 - 0\.08 \* \(\(p - 0\.6\) / 0\.4\);\s+\}\s+\}',
    logic,
    content
)

with open('src/utils/drawing.ts', 'w') as f:
    f.write(content)
