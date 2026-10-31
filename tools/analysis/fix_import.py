
import io
p = r'H:\AI-game\crazy_monster_tide\tools\analysis\build_balance.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("import { waveScale } from '../../cocos/assets/scripts/data/Balance';", "import { waveScale } from '../../cocos/assets/scripts/game/Combat';", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('import fixed')
