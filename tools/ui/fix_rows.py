
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\ui\MenuScreens.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("  const availH = (VH - B - 74) - rowsTop;", "  const availH = (VH - B - 60) - rowsTop;", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('availH updated')
