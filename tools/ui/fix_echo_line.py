
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\data\Modules.ts'
s = io.open(p, encoding='utf-8').read()
bad = "echo:      { name: '复读机', icon: '↻', stack: 'tier',     max: 3, requires: [],  // 通用：任何技能都能重放（重放不计施法次数）      desc: '施放后 0.4s 再放一次（60% 伤害）；每份 +1 次重放' },"
good = "echo:      { name: '复读机', icon: '↻', stack: 'tier',     max: 3, requires: [], desc: '施放后 0.4s 再放一次（60% 伤害）；每份 +1 次重放' },"
if bad in s:
    s = s.replace(bad, good, 1)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('echo line repaired')
else:
    print('bad line not found')
