
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\GameRoot.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("'build 12:00'", "'v2 12:14 真机'", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('tag literal:', 'v2 12:14 真机' in s)
