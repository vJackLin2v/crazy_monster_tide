
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\ui\Modals.ts'
s = io.open(p, encoding='utf-8').read()
old = "    const listTopY = gridTop + CELL / 2 + listH / 2 - CELL / 2;"
new = "    const listTopY = gridTop + (listH + 8) / 2;   // 让列表顶边正好贴住 gridTop"
if old in s:
    s = s.replace(old, new, 1)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('list top fixed')
else:
    print('anchor miss')
