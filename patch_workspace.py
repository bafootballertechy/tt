import re

with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

# Replace draw3DRing in circle
content = re.sub(
    r"case 'circle': const radius = getDistance\(p1, p2\); draw3DRing\(ctx, p1\.x, p1\.y, radius, shape\.color, shape\.ringConfig\?\.tilt \?\? 65, shape\.strokeWidth / scale, shape\.timestamp, false, shape\.ringConfig\); break;",
    r"case 'circle': const radius = getDistance(p1, p2); draw3DRing(ctx, p1.x, p1.y, radius, shape.color, shape.ringConfig?.tilt ?? 65, shape.strokeWidth / scale, shape.timestamp, false, shape.ringConfig, unifiedProgress); break;",
    content
)

# Replace draw3DRing in connected-circle
content = re.sub(
    r"draw3DRing\(ctx, p\.x, p\.y, p\.r \|\| ringSettings\.size, shape\.color, shape\.ringConfig\?\.tilt \?\? 65, shape\.strokeWidth / scale, p\.timestamp \|\| shape\.timestamp, false, shape\.ringConfig\);",
    r"draw3DRing(ctx, p.x, p.y, p.r || ringSettings.size, shape.color, shape.ringConfig?.tilt ?? 65, shape.strokeWidth / scale, p.timestamp || shape.timestamp, false, shape.ringConfig, unifiedProgress);",
    content
)

# Replace drawTangentLine with progress
content = re.sub(
    r"drawTangentLine\(ctx, c1, c2, c1\.r \|\| ringSettings\.size, c2\.r \|\| ringSettings\.size, shape\.color, 0, 1, pulseAge, false, shape\.ringConfig\?\.tilt \?\? 65, shape\.ringConfig\);",
    r"drawTangentLine(ctx, c1, c2, c1.r || ringSettings.size, c2.r || ringSettings.size, shape.color, 0, unifiedProgress !== undefined ? Math.max(0, unifiedProgress) : 1, pulseAge, false, shape.ringConfig?.tilt ?? 65, shape.ringConfig);",
    content
)

content = re.sub(
    r"drawTangentLine\(ctx, last, first, last\.r \|\| ringSettings\.size, first\.r \|\| ringSettings\.size, shape\.color, 0, 1, pulseAge, false, shape\.ringConfig\?\.tilt \?\? 65, shape\.ringConfig\);",
    r"drawTangentLine(ctx, last, first, last.r || ringSettings.size, first.r || ringSettings.size, shape.color, 0, unifiedProgress !== undefined ? Math.max(0, unifiedProgress) : 1, pulseAge, false, shape.ringConfig?.tilt ?? 65, shape.ringConfig);",
    content
)

# Remove the global scaling for connected-circle (we want only 'circle' to be globally scaled)
# We had: if (type === 'circle' || type === 'connected-circle')
content = content.replace(
    "if (type === 'circle' || type === 'connected-circle') {",
    "if (type === 'circle') {"
)

with open('src/components/Workspace/Workspace.tsx', 'w') as f:
    f.write(content)
