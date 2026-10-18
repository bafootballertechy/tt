import re

with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

content = content.replace(
    "const [polygonSettings, setPolygonSettings] = useState({\n    fillStyle: 'none' as 'none' | 'fill' | 'stripe'\n  });",
    "const [polygonSettings, setPolygonSettings] = useState({\n    fillStyle: 'fill' as 'none' | 'fill' | 'stripe'\n  });"
)

with open('src/components/Workspace/Workspace.tsx', 'w') as f:
    f.write(content)
