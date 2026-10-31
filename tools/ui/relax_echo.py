
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\data\Modules.ts'
s = io.open(p, encoding='utf-8').read()
old = "echo:      { name: '复读机', icon: '↻', stack: 'tier',     max: 3, requires: ['area','pulse','chain'],"
new = "echo:      { name: '复读机', icon: '↻', stack: 'tier',     max: 3, requires: [],  // 通用：任何技能都能重放（重放不计施法次数）"
if old in s:
    s = s.replace(old, new, 1)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('echo relaxed')
else:
    print('echo anchor miss')
