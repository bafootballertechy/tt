import re

with open('src/components/Workspace/Workspace.tsx', 'r') as f:
    content = f.read()

# Pass 1
match1 = re.search(r'if \(!shape\.freezeFrameId\) shouldRender = true; \n[ \t]+else if \(editingAnimationFFId === shape\.freezeFrameId\) \{ shouldRender = true; \}.+?if \(shape\.type === \'player-move\' \|\| shape\.type === \'lens\' \|\| shape\.type === \'name-tag\' \|\| shape\.type === \'text\'\) return; ', content, re.DOTALL)
if match1:
    print("MATCH1 FOUND")

# Pass 2
match2 = re.search(r'if \(!shape\.freezeFrameId\) shouldRender = true; \n[ \t]+else if \(editingAnimationFFId === shape\.freezeFrameId\) \{ shouldRender = true; \}.+?if \(shape\.type === \'curved-arrow\'\) drawShapeOnCanvas\(shape, scale, \'body\', alphaToUse\);', content, re.DOTALL)
if match2:
    print("MATCH2 FOUND")
