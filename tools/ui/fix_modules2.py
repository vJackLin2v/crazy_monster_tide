
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\data\Modules.ts'
s = io.open(p, encoding='utf-8').read()

fixes = [
 ("burn:      { name: '上火', icon: '✹', stack: 'tier',     max: 3, requires: ['fire','lightning','holy'],",
  "burn:      { name: '上火', icon: '✹', stack: 'tier',     max: 3, requires: [],"),
 ("frost:     { name: '冷静', icon: '✽', stack: 'tier',     max: 3, requires: ['ice'],",
  "frost:     { name: '冷静', icon: '✽', stack: 'tier',     max: 3, requires: [],"),
 ("vamp:      { name: '吸血', icon: '♥', stack: 'unique',   max: 3, requires: ['physical','poison'],",
  "vamp:      { name: '吸血', icon: '♥', stack: 'unique',   max: 3, requires: [],"),
 ("harvest:   { name: '割韭菜', icon: '✂', stack: 'unique',   max: 3, requires: ['physical','fire','poison'],",
  "harvest:   { name: '割韭菜', icon: '✂', stack: 'unique',   max: 3, requires: [],"),
 ("thunder:   { name: '渡劫', icon: '⚡', stack: 'tier',     max: 3, requires: ['lightning','arcane','holy'],",
  "thunder:   { name: '渡劫', icon: '⚡', stack: 'tier',     max: 3, requires: [],"),
]
for a, b in fixes:
    if a in s:
        s = s.replace(a, b, 1)
    else:
        print('MISS:', a[:30])

# 修 thornmail 行（注释吞掉了 desc）
bad = "thornmail: { name: '刺猬', icon: '✜', stack: 'unique',   max: 3, requires: [],  // 受击触发        desc: '被咬时反弹 6 点伤害（Ⅱ 约 9.6 点）' },"
good = "thornmail: { name: '刺猬', icon: '✜', stack: 'unique',   max: 3, requires: [], desc: '被咬时反弹 6 点伤害（Ⅱ 约 9.6 点）' },"
if bad in s:
    s = s.replace(bad, good, 1)
else:
    print('thornmail line not matched')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('done')
