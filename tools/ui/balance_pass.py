
import io, re
root = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts'

# ---------- 1) HUD：倒计时占位 '0' 清掉；去掉顶部橙色波次条 ----------
p = root + r'\ui\Hud.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""    this.timerText = text(this.root, at(rightEdge, 0).x, at(0, S + 37).y, '0',
      { size: 26, color: COL.cream, align: 'right', width: 130, bold: true, outline: true, shadow: true });""",
"""    // ⚠️ 初始必须是空串：以前占位写 '0'，商店/波间会留下一个黑 0（用户反馈）
    this.timerText = text(this.root, at(rightEdge, 0).x, at(0, S + 37).y, '',
      { size: 26, color: COL.cream, align: 'right', width: 130, bold: true, outline: true, shadow: true });""", 1)
s = s.replace("""    this.waveBarNode = mkNode(this.root, 'waveBar', 336, 3, wb.x, wb.y);
    this.waveBar = this.waveBarNode.addComponent(Graphics);""",
"""    this.waveBarNode = mkNode(this.root, 'waveBar', 336, 3, wb.x, wb.y);
    this.waveBar = this.waveBarNode.addComponent(Graphics);
    // 用户问"金币下面那条橙色横条是什么" —— 这条波次进度条信息重复且干扰，直接隐藏
    this.waveBarNode.active = false;""", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('hud:', "''" in s, 'waveBarNode.active = false' in s)

# ---------- 2) 数值：节奏/怪物质量/经济 ----------
p2 = root + r'\core\Balance.ts'
b = io.open(p2, encoding='utf-8').read()
b = b.replace("    baseInterval: 0.62, perWave: 0.016, minInterval: 0.34,\n    batchEvery: 4, batchMax: 3,\n    openBase: 5, openEvery: 2, openMax: 12,\n    aliveSoft: 40, aliveHard: 60, slowMul: 1.6,",
"    // 2026-10-31 调优：怪少而强（原 0.62/3只/60上限 → 卡顿主因）\n    baseInterval: 0.92, perWave: 0.012, minInterval: 0.52,\n    batchEvery: 6, batchMax: 2,\n    openBase: 4, openEvery: 3, openMax: 7,\n    aliveSoft: 24, aliveHard: 34, slowMul: 1.7,", 1)
b = b.replace("  growth: { hpPerWave: 0.18, dmgPerWave: 0.10 },", "  growth: { hpPerWave: 0.34, dmgPerWave: 0.15 },", 1)
b = b.replace("  wave: { baseTime: 18, timeStep: 3, timeEvery: 3 },", "  wave: { baseTime: 22, timeStep: 4, timeEvery: 3 },", 1)
b = b.replace("    itemBase: 12, itemRand: 6, itemPerWave: 2,\n    modBase: 16, modRand: 7, modPerWave: 3,",
              "    itemBase: 14, itemRand: 6, itemPerWave: 3.4,\n    modBase: 18, modRand: 7, modPerWave: 5.0,", 1)
b = b.replace("    rerollBase: 2,\n    clearGoldBase: 12, clearGoldPerWave: 5,",
              "    rerollBase: 3,\n    clearGoldBase: 9, clearGoldPerWave: 3.5,", 1)
io.open(p2, 'w', encoding='utf-8', newline='').write(b)
print('balance:', 'baseInterval: 0.92' in b, 'hpPerWave: 0.34' in b)

# ---------- 3) 回血/吸血/击退削弱 ----------
p3 = root + r'\battle\Battle.ts'
bt = io.open(p3, encoding='utf-8').read()
bt = bt.replace("    const budget = healBudget(id);                       // null = 普通难度，不启用预算",
                "    const budget = healBudget(id);                       // null = 普通难度，不启用预算", 1)
bt = bt.replace("    const allow = budget === null ? Infinity : Math.max(0, budget - this.healBudgetSpent);",
                "    const cap = budget === null ? 5 : Math.min(budget, 5);   // 2026-10-31：全局回血上限再压到 5HP/s\n    const allow = Math.max(0, cap - this.healBudgetSpent);", 1)
bt = bt.replace("    if (rt.vamp && canVamp(ctx)) this.healPlayer(dmg * 0.03 * rt.vamp);",
                "    if (rt.vamp && canVamp(ctx)) this.healPlayer(dmg * 0.02 * rt.vamp);", 1)
bt = bt.replace("    const heal = Math.min(Math.max(6, Math.round(st.maxhp * 0.12)), st.maxhp - st.hp);",
                "    const heal = Math.min(Math.max(4, Math.round(st.maxhp * 0.06)), st.maxhp - st.hp);", 1)
io.open(p3, 'w', encoding='utf-8', newline='').write(bt)
print('battle nerfs:', '0.02 * rt.vamp' in bt, 'st.maxhp * 0.06' in bt)

# 击退 26 -> 12
p4 = root + r'\game\Stats.ts'
st = io.open(p4, encoding='utf-8').read()
st = st.replace("knockback: 26,", "knockback: 12,", 1)
io.open(p4, 'w', encoding='utf-8', newline='').write(st)
print('knockback:', 'knockback: 12' in st)
