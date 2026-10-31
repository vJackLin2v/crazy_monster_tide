
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\game\RunState.ts'
s = io.open(p, encoding='utf-8').read()
if 'modEffect' not in s.split('\n')[0:40].__str__():
    s = s.replace("import { difficultyOf, shopPrice } from '../data/Difficulties';",
                  "import { difficultyOf, shopPrice } from '../data/Difficulties';\nimport { modEffect } from '../data/Modules';", 1)
s = s.replace("    this.addGold(gold);", "    this.gold += gold;", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('patched:', 'modEffect' in s, 'this.gold += gold' in s)
