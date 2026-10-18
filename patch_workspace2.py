import re

with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

render_calc = """            let unifiedProgress: number | undefined = undefined;
            if (shouldRender) {
                if (shape.freezeFrameId && (shape.freezeFrameId === editingAnimationFFId || shape.freezeFrameId === activeFreezeFrameId)) {
                    const activeFFDur = freezeFrames.find(f => f.id === shape.freezeFrameId)?.duration ?? 10;
                    const elapsed = shape.freezeFrameId === editingAnimationFFId ? animationPreviewTime : (activeFFDur - countdownValue);
                    const start = shape.animStart ?? 0;
                    const end = shape.animEnd ?? activeFFDur;
                    if (elapsed < start || elapsed > end) {
                        shouldRender = false;
                    } else {
                        const appearDuration = 0.5;
                        const disappearDuration = 0.5;
                        let ap = 1; let dp = 0;
                        if (elapsed >= start && elapsed <= start + appearDuration) {
                            ap = (elapsed - start) / appearDuration;
                        }
                        if (elapsed >= end - disappearDuration && elapsed <= end) {
                            dp = (elapsed - (end - disappearDuration)) / disappearDuration;
                        }
                        unifiedProgress = ap < 1 ? ap : (1 - dp);
                    }
                }
            }"""

old_logic = r"""            if \(shouldRender\) \{
                if \(shape\.freezeFrameId && shape\.freezeFrameId === editingAnimationFFId\) \{
                    const activeFFDur = freezeFrames\.find\(f => f\.id === editingAnimationFFId\)\?\.duration \?\? 10;
                    const elapsed = animationPreviewTime;
                    const start = shape\.animStart \?\? 0;
                    const end = shape\.animEnd \?\? activeFFDur;
                    if \(elapsed < start \|\| elapsed > end\) shouldRender = false;
                \} else if \(shape\.freezeFrameId && shape\.freezeFrameId === activeFreezeFrameId\) \{
                    const activeFFDur = freezeFrames\.find\(f => f\.id === activeFreezeFrameId\)\?\.duration \?\? 10;
                    const elapsed = activeFFDur - countdownValue;
                    const start = shape\.animStart \?\? 0;
                    const end = shape\.animEnd \?\? activeFFDur;
                    if \(elapsed < start \|\| elapsed > end\) shouldRender = false;
                \}
            \}"""

content = re.sub(old_logic, render_calc, content)

# Pass 1
content = re.sub(
    r'if \(shape\.type === \'curved-arrow\'\) drawShapeOnCanvas\(shape, scale, \'shadow\', alphaToUse\);\s+else drawShapeOnCanvas\(shape, scale, \'full\', alphaToUse\);',
    r"if (shape.type === 'curved-arrow') drawShapeOnCanvas(shape, scale, 'shadow', alphaToUse, undefined, unifiedProgress);\n                else drawShapeOnCanvas(shape, scale, 'full', alphaToUse, undefined, unifiedProgress);",
    content
)

# Pass 2
content = re.sub(
    r'if \(shape\.type === \'curved-arrow\'\) drawShapeOnCanvas\(shape, scale, \'body\', alphaToUse\);\s+if \(shape\.type === \'player-move\'\) drawShapeOnCanvas\(shape, scale, \'full\', alphaToUse\);',
    r"if (shape.type === 'curved-arrow') drawShapeOnCanvas(shape, scale, 'body', alphaToUse, undefined, unifiedProgress);\n                if (shape.type === 'player-move') drawShapeOnCanvas(shape, scale, 'full', alphaToUse, undefined, unifiedProgress);",
    content
)

# Lens 
lens_old = r"""                if \(shape\.type === \'lens\' && video\) \{
                    if \(shape\.lensConfig && shape\.points\[0\]\) \{
                        ctx\.save\(\);
                        ctx\.globalAlpha = ffAlpha;
                        drawLens\(ctx, shape\.points\[0\], shape\.lensConfig\.radius, shape\.lensConfig\.zoom, video, scale, shape\.timestamp\);
                        ctx\.restore\(\);
                    \}
                \}"""

lens_new = """                if (shape.type === 'lens' && video) {
                    if (shape.lensConfig && shape.points[0]) {
                        ctx.save();
                        ctx.globalAlpha = ffAlpha;
                        let actualProgress = unifiedProgress !== undefined ? unifiedProgress : 1;
                        let effScale = actualProgress < 1 ? Math.pow(actualProgress, 0.5) : 1;
                        if (effScale < 1) {
                            ctx.translate(shape.points[0].x, shape.points[0].y);
                            ctx.scale(effScale, effScale);
                            ctx.translate(-shape.points[0].x, -shape.points[0].y);
                        }
                        drawLens(ctx, shape.points[0], shape.lensConfig.radius, shape.lensConfig.zoom, video, scale, shape.timestamp);
                        ctx.restore();
                    }
                }"""
content = re.sub(lens_old, lens_new, content)

# Name tag and text
content = re.sub(
    r'if \(shape\.type === \'name-tag\' \|\| shape\.type === \'text\'\) \{\s+drawShapeOnCanvas\(shape, scale, \'full\', alphaToUse\);\s+\}',
    r"if (shape.type === 'name-tag' || shape.type === 'text') {\n                    drawShapeOnCanvas(shape, scale, 'full', alphaToUse, undefined, unifiedProgress);\n                }",
    content
)

with open('src/components/Workspace/Workspace.tsx', 'w') as f:
    f.write(content)

