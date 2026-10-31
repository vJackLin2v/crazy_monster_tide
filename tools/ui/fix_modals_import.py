
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\ui\Modals.ts'
s = io.open(p, encoding='utf-8').read()
if "from './ModalList'" not in s:
    s = s.replace("import { makeScroll } from './ScrollView';",
                  "import { makeScroll } from './ScrollView';\nimport { makeModalList } from './ModalList';", 1)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('import ok')
else:
    print('already')
