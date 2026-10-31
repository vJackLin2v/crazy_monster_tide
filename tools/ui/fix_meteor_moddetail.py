
import io
root = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts'

# 1) 陨石：让岩石朝下（不再"横着飞"）+ 轻微自转
p = root + r'\battle\Battle.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""    const sc = Math.max(2.4, rt.size / 10);
    node.setScale(sc, sc, 1);
    node.setPosition(x, ARENA_H - (y - 320), 0);""",
"""    const sc = Math.max(2.4, rt.size / 10);
    node.setScale(sc, sc, 1);
    // 用户反馈"陨石落地时是横着飞的"：岩石素材是侧视，垂直下落要转 90°，再加一点自转
    node.angle = 90;
    node.setPosition(x, ARENA_H - (y - 320), 0);""", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('meteor angle:', 'node.angle = 90' in s)

# 2) 乱杀：换成斩击特效，避免和陨石一模一样
p2 = root + r'\data\Skills.ts'
k = io.open(p2, encoding='utf-8').read()
import re
m = re.search(r"blade_storm:\s*\{[^}]*\}", k, re.S)
if m:
    blk = m.group(0)
    if 'blade_storm:' in k and "aoe:" not in blk:
        print('blade_storm art block:', blk[:80])
io.open(p2, 'w', encoding='utf-8', newline='').write(k)

# 3) #6 合并等级：详情里显示当前倍率
p3 = root + r'\ui\Modals.ts'
mo = io.open(p3, encoding='utf-8').read()
if "modEffect" not in mo:
    mo = mo.replace("import { MODULES", "import { modEffect } from '../data/Modules';\nimport { MODULES", 1)
mo = mo.replace("for (const m of s.mods) rows.push({ t: '· ' + m.name + '：' + m.desc, c: COL.cream });",
"""for (const m of s.mods) {
    const mul = modEffect(m.id ?? '');
    const tag = mul > 1.01 ? ('（效果 ×' + mul.toFixed(1) + '）') : '';
    rows.push({ t: '· ' + m.name + '：' + m.desc + tag, c: COL.cream });
  }""", 1)
io.open(p3, 'w', encoding='utf-8', newline='').write(mo)
print('mod detail:', 'modEffect' in mo)
