
import io
root = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts'

# 1) RunState：在 mergeReady 之前插入两个方法（用正确锚点）
p = root + r'\game\RunState.ts'
r = io.open(p, encoding='utf-8').read()
if 'unequipAll(' not in r:
    anchor = "  mergeReady(baseId: string): number {"
    ins = """  /** 一键卸下：把所有技能上的黑科技退回背包 */
  unequipAll(): number {
    let n = 0;
    for (const sk of this.skills) {
      while (sk.mods.length) { const m = sk.mods.pop(); if (m) { this.modsBag.push(m); n++; } }
    }
    return n;
  }

  /** 出售背包里的黑科技（idx 为 modsBag 下标），返回获得金币 */
  sellMod(idx: number): number {
    if (idx < 0 || idx >= this.modsBag.length) return 0;
    const id = this.modsBag[idx];
    this.modsBag.splice(idx, 1);
    const gold = Math.max(6, Math.round(9 * modEffect(id)));
    this.addGold(gold);
    return gold;
  }

"""
    if anchor in r:
        r = r.replace(anchor, ins + anchor, 1)
        io.open(p, 'w', encoding='utf-8', newline='').write(r)
        print('runstate ok')
    else:
        print('anchor miss')
else:
    print('already there')

# 2) GameRoot：把两个回调传进安装屏
p2 = root + r'\GameRoot.ts'
g = io.open(p2, encoding='utf-8').read()
if 'onUnequipAll:' not in g:
    g = g.replace("      onPickSlot: (si, sl) => this.doInstall(si, sl),",
"""      onPickSlot: (si, sl) => this.doInstall(si, sl),
      onUnequipAll: () => {
        const n = this.battle.rs.unequipAll();
        this.installSel = null; this.installSelIdx = null; this.installFromSlot = null;
        console.log('[Install] 一键卸下 ' + n + ' 个黑科技');
        this.renderInstall();
      },
      onSellSelected: () => {
        const idx = this.installSelIdx;
        if (idx === null) return;
        const gold = this.battle.rs.sellMod(idx);
        this.installSel = null; this.installSelIdx = null;
        console.log('[Install] 出售黑科技获得 ' + gold + ' 金币');
        this.renderInstall();
      },""", 1)
    io.open(p2, 'w', encoding='utf-8', newline='').write(g)
    print('gameroot callbacks:', 'onUnequipAll:' in g)
