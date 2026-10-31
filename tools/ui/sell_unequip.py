
import io, re
root = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts'

# 1) 乱杀特效：换成斩击（避免与陨石雷同）
p = root + r'\data\Skills.ts'
s = io.open(p, encoding='utf-8').read()
lines = s.split('\n')
for i, ln in enumerate(lines):
    if ln.strip().startswith('blade_storm:') and 'aoe:' in ln:
        lines[i] = re.sub(r"aoe: '[^']*'", "aoe: 'melee/slash/wide-cleave'", ln)
        print('blade_storm aoe ->', lines[i].strip()[:110])
s = '\n'.join(lines)
io.open(p, 'w', encoding='utf-8', newline='').write(s)

# 2) RunState：一键卸下 + 出售黑科技
p2 = root + r'\game\RunState.ts'
r = io.open(p2, encoding='utf-8').read()
if 'unequipAll(' not in r:
    r = r.replace("  mergeReady(id: string)",
"""  /** 一键卸下：把所有技能上的黑科技退回背包 */
  unequipAll(): number {
    let n = 0;
    for (const sk of this.skills) {
      while (sk.mods.length) { const m = sk.mods.pop(); if (m) { this.modsBag.push(m); n++; } }
    }
    return n;
  }

  /** 出售背包里的黑科技（idx 为 modsBag 下标），返回获得的金币 */
  sellMod(idx: number): number {
    if (idx < 0 || idx >= this.modsBag.length) return 0;
    const id = this.modsBag[idx];
    this.modsBag.splice(idx, 1);
    const gold = Math.max(6, Math.round(9 * modEffect(id)));
    this.addGold(gold);
    return gold;
  }

  mergeReady(id: string)""", 1)
io.open(p2, 'w', encoding='utf-8', newline='').write(r)
print('runstate:', 'unequipAll' in r, 'sellMod' in r)

# 3) ManageScreens：底部上方加「一键卸下 / 出售所选」
p3 = root + r'\ui\ManageScreens.ts'
m = io.open(p3, encoding='utf-8').read()
m = m.replace("  onBack: () => void;",
"""  onBack: () => void;
  /** 一键卸下全部黑科技到背包 */
  onUnequipAll?: () => void;
  /** 出售当前选中的背包黑科技 */
  onSellSelected?: () => void;""", 1)
m = m.replace("""  const back = button(box, -78, by, 150, 46, '返回', { size: 15 });""",
"""  // 一键卸下 / 出售所选（放在主按钮上方一排）
  if (cb.onUnequipAll) {
    const u = button(box, -78, by + 54, 150, 32, '一键卸下', { size: 12 });
    onTap(u.node, cb.onUnequipAll);
  }
  if (cb.onSellSelected) {
    const sl = button(box, 78, by + 54, 150, 32, '出售所选', { size: 12 });
    onTap(sl.node, cb.onSellSelected);
  }
  const back = button(box, -78, by, 150, 46, '返回', { size: 15 });""", 1)
io.open(p3, 'w', encoding='utf-8', newline='').write(m)
print('manage buttons:', '一键卸下' in m, '出售所选' in m)
