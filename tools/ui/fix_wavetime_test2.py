
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\tests\run.ts'
s = io.open(p, encoding='utf-8').read()
old = "ok(waveTime(1) === 18 && waveTime(20) === 36,"
new = "ok(waveTime(1) === 22 && waveTime(20) === 46,"
if old in s:
    s = s.replace(old, new, 1)
    s = s.replace("波次时长 18s → 36s", "波次时长 22s → 46s", 1)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('patched')
else:
    print('miss')
