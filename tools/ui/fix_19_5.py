
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\GameRoot.ts'
s = io.open(p, encoding='utf-8').read()

# #5 默认不选中任何黑科技
old = "    if (rs.modsBag.length && this.installSelIdx === null) this.selectBag(0);"
new = "    // 用户要求：进入面板默认**不选中**任何黑科技（以前自动选背包第一个）\n    if (false && rs.modsBag.length && this.installSelIdx === null) this.selectBag(0);"
if old in s:
    s = s.replace(old, new, 1)
    print('#5 patched')

# #19 BOSS 通关：先结算，选「继续无尽」后才进商店/装模块
old2 = "  private showShop() {"
new2 = """  private showShop() {
    // 用户要求：打通 20 波后**先出结算页**，只有点「继续·无尽」才进商店/装模块
    {
      const rs0 = this.battle.rs;
      if (rs0.wave >= RUN.waves && !rs0.endless) {
        if (!this.endShown) { this.endShown = true; this.showResult(true); }
        return;
      }
    }"""
if old2 in s:
    s = s.replace(old2, new2, 1)
    print('#19 patched')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
