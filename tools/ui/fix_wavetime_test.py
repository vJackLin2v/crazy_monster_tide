
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\tests\run.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("ok(a === 18 && b === 36, '波次时长 18s → 36s（实测 ' + a + ' → ' + b + '）');",
              "ok(a === 22 && b === 46, '波次时长 22s → 46s（实测 ' + a + ' → ' + b + '）');", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('test updated:', '22s → 46s' in s)
