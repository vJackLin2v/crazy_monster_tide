
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\ui\ManageScreens.ts'
s = io.open(p, encoding='utf-8').read()
if "from './ModalList'" not in s:
    s = s.replace("import { panel, text, button, onTap, mkNode, mask, chip, slot } from './UIKit';",
                  "import { panel, text, button, onTap, mkNode, mask, chip, slot } from './UIKit';\nimport { makeModalList } from './ModalList';", 1)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('import added')
else:
    print('already')
