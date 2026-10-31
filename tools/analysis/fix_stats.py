
import io
p = r'H:\AI-game\crazy_monster_tide\tools\analysis\build_balance.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("import { calcSkill } from '../../cocos/assets/scripts/game/SkillCalc';",
              "import { calcSkill } from '../../cocos/assets/scripts/game/SkillCalc';\nimport { freshStats } from '../../cocos/assets/scripts/game/Stats';", 1)
s = s.replace("const ST = { ...CHAR.stats } as Record<string, number>;", "const ST = freshStats(CHAR);", 1)
s = s.replace("const rt = calcSkill(sk as never, ST as never);", "const rt = calcSkill(sk as never, ST);", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('stats fixed')
