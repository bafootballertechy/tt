import re

with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

# Fix creation
content = content.replace(
    "const newShape: Shape = { id: Date.now().toString(), type: 'circle', points: [currentPoint, { x: currentPoint.x + ringSettings.size, y: currentPoint.y }]",
    "const newShape: Shape = { id: Date.now().toString(), type: 'circle', points: [currentPoint]"
)

# Fix hit detection
hit_test_old = """if (shape.type === 'circle' && shape.points.length >= 2) {
                const r = Math.sqrt(Math.pow(shape.points[0].x - shape.points[1].x, 2) + Math.pow(shape.points[0].y - shape.points[1].y, 2));"""
hit_test_new = """if (shape.type === 'circle' && shape.points.length >= 1) {
                const r = shape.ringConfig?.size || (shape.points.length >= 2 ? Math.sqrt(Math.pow(shape.points[0].x - shape.points[1].x, 2) + Math.pow(shape.points[0].y - shape.points[1].y, 2)) : 50);"""
content = content.replace(hit_test_old, hit_test_new)

# Fix rendering
render_old = "case 'circle': const radius = getDistance(p1, p2); draw3DRing(ctx, p1.x, p1.y, radius, shape.color, shape.ringConfig?.tilt ?? 65, shape.strokeWidth / scale, shape.timestamp, false, shape.ringConfig, unifiedProgress); break;"
render_new = "case 'circle': const radius = shape.ringConfig?.size || (shape.points.length >= 2 ? getDistance(p1, p2) : 50); draw3DRing(ctx, p1.x, p1.y, radius, shape.color, shape.ringConfig?.tilt ?? 65, shape.strokeWidth / scale, shape.timestamp, false, shape.ringConfig, unifiedProgress); break;"
content = content.replace(render_old, render_new)

with open('src/components/Workspace/Workspace.tsx', 'w') as f:
    f.write(content)

print("Done")
