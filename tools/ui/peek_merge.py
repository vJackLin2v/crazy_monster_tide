
import io, re
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\ui\ManageScreens.ts'
s = io.open(p, encoding='utf-8').read()
print('merges block present:', 'd.merges' in s)
idx = s.find('// ── 合成区')
print('merge section at', idx)
print(s[idx:idx+700] if idx>0 else 'no marker')
