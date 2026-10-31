
import io
root = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts'

# ---------- 结算页布局：技能/道具/构筑 三段不再重叠 ----------
p = root + r'\ui\MenuScreens.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("  const extraY = skillTop + (sk.length ? 46 : 0);",
              "  const extraY = skillTop + (sk.length ? 62 : 0);", 1)
s = s.replace("""      const cc = at2(180 - (COLS * (CELL + CGAP) - CGAP) / 2 + CELL / 2 + col * (CELL + CGAP),
        extraY + 26 + rowi * (CELL + CGAP));""",
"""      const cc = at2(180 - (COLS * (CELL + CGAP) - CGAP) / 2 + CELL / 2 + col * (CELL + CGAP),
        extraY + 16 + CELL / 2 + rowi * (CELL + CGAP));""", 1)
s = s.replace("  const listTop = skillTop + (sk.length ? 46 : 0) + 20 + ((stats.items?.length ?? 0) > 0 ? 34 : 0);",
              "  const listTop = skillTop + (sk.length ? 62 : 0) + ((stats.items?.length ?? 0) > 0 ? 52 : 0) + 24;", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('result layout:', 'sk.length ? 62' in s)

# ---------- 复制日志按钮：放到标题牌左侧，并输出失败原因 ----------
p2 = root + r'\GameRoot.ts'
g = io.open(p2, encoding='utf-8').read()
g = g.replace("""      const vs2 = view.getVisibleSize();
      const chip = button(this.cur, -vs2.width / 2 + 52, vs2.height / 2 - safeTop() - 26, 92, 24, '复制日志', { size: 10 });
      onTap(chip.node, () => this.copyRunLogs());""",
"""      const vs2 = view.getVisibleSize();
      const px = 58 - vs2.width / 2;
      const py = vs2.height / 2 - (safeTop() + 56);
      const chip = button(this.cur, px, py, 88, 26, '复制日志', { size: 10 });
      onTap(chip.node, () => this.copyRunLogs());
      console.log('[GameRoot] 复制日志按钮已创建');""", 1)
io.open(p2, 'w', encoding='utf-8', newline='').write(g)
print('copy btn:', '复制日志按钮已创建' in g)
