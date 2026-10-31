
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\ui\MenuScreens.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("  const maxRows = Math.max(1, Math.min(2, Math.floor((availH - 24) / 42)));",
              "  const maxRows = Math.max(1, Math.min(3, Math.floor(availH / 42)));", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('maxRows fixed')
