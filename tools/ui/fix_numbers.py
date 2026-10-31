
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\data\Items.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""    if (Math.abs(raw) > 1e-9 && (raw % 1 !== 0 || Math.abs(raw / b) > 0.5)) {""",
"""    const flatAdd = Math.abs(raw) >= 1 && Number.isInteger(raw);
    const absurd = Math.abs(raw / b) > 0.5;
    if (Math.abs(raw) > 1e-9 && (flatAdd || absurd)) {""", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('condition fixed')
