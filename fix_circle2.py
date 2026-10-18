import re

with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

hit_points_old = """        if (shape.type !== 'pen' && !shape.isFreehand) {
            for (let j = 0; j < shape.points.length; j++) {
                const p = shape.points[j];
                const dist = Math.sqrt(Math.pow(pt.x - p.x, 2) + Math.pow(pt.y - p.y, 2));
                if (dist <= threshold) {
                    return { shapeId: shape.id, pointIndex: j, type: 'point' as const };
                }
            }
        }"""
        
hit_points_new = """        if (shape.type !== 'pen' && !shape.isFreehand) {
            // For circle, only check the first point (center), ignore any others that might be left over from old data
            const ptsToCheck = shape.type === 'circle' ? [shape.points[0]] : shape.points;
            for (let j = 0; j < ptsToCheck.length; j++) {
                const p = ptsToCheck[j];
                if (!p) continue;
                const dist = Math.sqrt(Math.pow(pt.x - p.x, 2) + Math.pow(pt.y - p.y, 2));
                if (dist <= threshold) {
                    return { shapeId: shape.id, pointIndex: j, type: 'point' as const };
                }
            }
        }"""

content = content.replace(hit_points_old, hit_points_new)

render_points_old = """                    if (shape.id === selectedShapeId) {
                        if (shape.type !== 'pen' && !shape.isFreehand) {
                            shape.points.forEach((p, i) => {
                                ctx.beginPath();
                                ctx.fillStyle = '#3b82f6';
                                ctx.strokeStyle = '#ffffff';
                                ctx.lineWidth = 2 / scale;
                                ctx.arc(p.x, p.y, 5 / scale, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.stroke();
                            });
                        }
                    }"""

render_points_new = """                    if (shape.id === selectedShapeId) {
                        if (shape.type !== 'pen' && !shape.isFreehand) {
                            const ptsToRender = shape.type === 'circle' ? [shape.points[0]] : shape.points;
                            ptsToRender.forEach((p, i) => {
                                if (!p) return;
                                ctx.beginPath();
                                ctx.fillStyle = '#3b82f6';
                                ctx.strokeStyle = '#ffffff';
                                ctx.lineWidth = 2 / scale;
                                ctx.arc(p.x, p.y, 5 / scale, 0, Math.PI * 2);
                                ctx.fill();
                                ctx.stroke();
                            });
                        }
                    }"""

content = content.replace(render_points_old, render_points_new)

with open('src/components/Workspace/Workspace.tsx', 'w') as f:
    f.write(content)

print("Done")
