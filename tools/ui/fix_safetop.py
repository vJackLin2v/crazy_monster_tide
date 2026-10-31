
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\GameRoot.ts'
s = io.open(p, encoding='utf-8').read()
if "from './ui/Safe'" not in s:
    s = s.replace("import { mkNode, screen, button, text, onTap, panel } from './ui/UIKit';",
                  "import { mkNode, screen, button, text, onTap, panel } from './ui/UIKit';\nimport { safeTop } from './ui/Safe';", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('safeTop imported:', "import { safeTop }" in s)
