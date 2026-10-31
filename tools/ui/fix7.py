
import io, re
root = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts'

# ---------- A/B 波次结束不再刷怪 + 每波回血 ----------
p = root + r'\battle\Battle.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("  private updateSpawn(dt: number) {\n    if (this.bossRef && !this.bossRef.dead) return;",
"""  private updateSpawn(dt: number) {
    // 波次结算中（吸经验 / 等升级卡）不再刷怪 —— 用户反馈"波次结束了还在出怪"
    if (this.waveEnding) return;
    if (this.bossRef && !this.bossRef.dead) return;""", 1)

if 'private waveClearHeal(' not in s:
    s = s.replace("  private finishWave(",
"""  /** 每波结束的固定恢复（不吃难度回血预算，属于节奏设计） */
  private waveClearHeal(): void {
    const st = this.rs.stats;
    const heal = Math.min(Math.max(6, Math.round(st.maxhp * 0.12)), st.maxhp - st.hp);
    if (heal > 0) {
      st.hp += heal;
      this.addVfx(FX.killBig, this.px, this.py, 0.4, 1.6);
    }
  }

  private finishWave(""", 1)
s = s.replace("  private finishWave() {", "  private finishWave() {\n    this.waveClearHeal();", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('battle:', 'waveClearHeal' in s, 'waveEnding) return' in s)

# ---------- C 拾取范围 ----------
p2 = root + r'\core\Const.ts'
c = io.open(p2, encoding='utf-8').read()
c = c.replace("export const BASE_PICKUP = 34;", "export const BASE_PICKUP = 56;", 1)
io.open(p2, 'w', encoding='utf-8', newline='').write(c)
print('pickup:', 'BASE_PICKUP = 56' in c)

# ---------- D 菜单进入难度页 ----------
p3 = root + r'\GameRoot.ts'
g = io.open(p3, encoding='utf-8').read()
i = g.find('buildMenu(')
if i > 0:
    seg = g[i:i+600]
    seg2 = seg.replace('() => this.showCharSelect()', '() => this.showDifficulty()', 1)
    g = g[:i] + seg2 + g[i+600:]
# 通关难度只显示中文
g = g.replace("difficultyName: (difficultyOf(this.battle.rs.difficulty).name) + ' (' + this.battle.rs.difficulty + ')',",
              "difficultyName: difficultyOf(this.battle.rs.difficulty).name,", 1)
# 复制日志按钮挪到左上角，避免与顶部标题/底部按钮冲突
g = g.replace("const chip = button(this.cur, vs2.width / 2 - 52, vs2.height / 2 - safeTop() - 26, 92, 24, '复制日志', { size: 10 });",
              "const chip = button(this.cur, -vs2.width / 2 + 52, vs2.height / 2 - safeTop() - 26, 92, 24, '复制日志', { size: 10 });", 1)
io.open(p3, 'w', encoding='utf-8', newline='').write(g)
print('menu route:', 'showDifficulty()' in g, 'difficultyName plain:', 'difficultyOf(this.battle.rs.difficulty).name,' in g)

# ---------- E 结算页道具坐标（原来把节点坐标当设计坐标，导致全挤左上角） ----------
p4 = root + r'\ui\MenuScreens.ts'
m = io.open(p4, encoding='utf-8').read()
old = """  const extra = at2(180, skillTop + (sk.length ? 46 : 0));"""
new = """  // ⚠️ 必须用设计坐标算（at2 返回的是节点坐标，拿它再加偏移会全挤到左上角）
  const extraY = skillTop + (sk.length ? 46 : 0);"""
if old in m:
    m = m.replace(old, new, 1)
m = m.replace("""    text(root, at2(12, extra.y).x, at2(12, extra.y).y, '本局道具 ' + got.length,""",
"""    text(root, at2(12, extraY).x, at2(12, extraY).y, '本局道具 ' + got.length,""", 1)
m = m.replace("""      const cc = at2(180 - (COLS * (CELL + CGAP) - CGAP) / 2 + CELL / 2 + col * (CELL + CGAP),
        extra.y + 26 + rowi * (CELL + CGAP));""",
"""      const cc = at2(180 - (COLS * (CELL + CGAP) - CGAP) / 2 + CELL / 2 + col * (CELL + CGAP),
        extraY + 26 + rowi * (CELL + CGAP));""", 1)
m = m.replace("""      text(root, at2(348, extra.y + 26).x, at2(348, extra.y + 26).y,""",
"""      text(root, at2(348, extraY + 26).x, at2(348, extraY + 26).y,""", 1)
io.open(p4, 'w', encoding='utf-8', newline='').write(m)
print('result items:', 'extraY' in m)

# ---------- F itemNumbers：加法属性不再算成离谱百分比 ----------
p5 = root + r'\data\Items.ts'
it = io.open(p5, encoding='utf-8').read()
it = it.replace("""  for (const [k, label] of MULT) {
    const b = (before[k] as number) || 1;
    const d = ((s[k] as number) / b) - 1;
    if (Math.abs(d) > 1e-9) parts.push(label + ' ' + pct(d));
  }""",
"""  for (const [k, label] of MULT) {
    const b = (before[k] as number) || 1;
    const cur = s[k] as number;
    const raw = cur - b;
    // 有的道具是直接加绝对值（如 拾取 +3），按比例算会得出 -91%，所以这里判断：
    // 变化幅度超过 50% 且是小数加法时，按 "+N" 显示（用户反馈"移动速度写个 3"看不懂）
    if (Math.abs(raw) > 1e-9 && (raw % 1 !== 0 || Math.abs(raw / b) > 0.5)) {
      const v = Math.abs(raw) < 10 ? Number(raw.toFixed(1)) : Math.round(raw);
      parts.push(label + ' ' + (v >= 0 ? '+' : '') + v);
    } else {
      const d = (cur / b) - 1;
      if (Math.abs(d) > 1e-9) parts.push(label + ' ' + pct(d));
    }
  }""", 1)
io.open(p5, 'w', encoding='utf-8', newline='').write(it)
print('itemNumbers:', 'raw % 1' in it)
