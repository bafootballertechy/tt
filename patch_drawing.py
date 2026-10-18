import re

with open('src/utils/drawing.ts', 'r') as f:
    content = f.read()

# drawProArrow
content = re.sub(
    r'export const drawProArrow = \(ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, thickness: number, isDashed: boolean, timestamp: number, isPreview: boolean = false\) => \{',
    'export const drawProArrow = (ctx: CanvasRenderingContext2D, p1: Point, p2: Point, color: string, thickness: number, isDashed: boolean, timestamp: number, isPreview: boolean = false, animProgress?: number) => {',
    content
)
content = re.sub(
    r'const progress = Math.min\(1, age / duration\);',
    'const progress = animProgress !== undefined ? animProgress : Math.min(1, age / duration);',
    content,
    count=1
)

# drawFreehandArrow
content = re.sub(
    r'export const drawFreehandArrow = \(ctx: CanvasRenderingContext2D, points: Point\[\], color: string, thickness: number, isDashed: boolean, timestamp: number, isPreview: boolean\) => \{',
    'export const drawFreehandArrow = (ctx: CanvasRenderingContext2D, points: Point[], color: string, thickness: number, isDashed: boolean, timestamp: number, isPreview: boolean, animProgress?: number) => {',
    content
)
# Second progress
content = re.sub(
    r'const progress = Math.min\(1, age / duration\);',
    'const progress = animProgress !== undefined ? animProgress : Math.min(1, age / duration);',
    content,
    count=1
)

# drawCurvedRun
content = re.sub(
    r'export const drawCurvedRun = \(ctx: CanvasRenderingContext2D, points: Point\[\], color: string, thickness: number, isDashed: boolean, timestamp: number, isPreview: boolean\) => \{',
    'export const drawCurvedRun = (ctx: CanvasRenderingContext2D, points: Point[], color: string, thickness: number, isDashed: boolean, timestamp: number, isPreview: boolean, animProgress?: number) => {',
    content
)
# Third progress
content = re.sub(
    r'const progress = Math.min\(1, age / duration\);',
    'const progress = animProgress !== undefined ? animProgress : Math.min(1, age / duration);',
    content,
    count=1
)

# drawCurvedArrow
content = re.sub(
    r'export const drawCurvedArrow = \(ctx: CanvasRenderingContext2D, points: Point\[\], color: string, width: number, isDashed: boolean, timestamp: number, renderMode: \'full\' \| \'shadow\' \| \'body\' = \'full\'\) => \{',
    'export const drawCurvedArrow = (ctx: CanvasRenderingContext2D, points: Point[], color: string, width: number, isDashed: boolean, timestamp: number, renderMode: \'full\' | \'shadow\' | \'body\' = \'full\', animProgress?: number) => {',
    content
)
content = re.sub(
    r'const progress = timestamp > 0 \? Math.min\(1, \(now - timestamp\) / duration\) : 1;',
    'const progress = animProgress !== undefined ? animProgress : (timestamp > 0 ? Math.min(1, (now - timestamp) / duration) : 1);',
    content
)

with open('src/utils/drawing.ts', 'w') as f:
    f.write(content)
