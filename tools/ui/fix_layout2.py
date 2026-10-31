
import io
root = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts'

p = root + r'\ui\MenuScreens.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("    const CELL = 30, CGAP = 6, COLS = 10;", "    const CELL = 30, CGAP = 6, COLS = 9;", 1)
s = s.replace("  const availH = (VH - B - 150) - rowsTop;", "  const availH = (VH - B - 74) - rowsTop;", 1)
s = s.replace("  const maxRows = Math.max(1, Math.floor((availH - 24) / 42));",
              "  const maxRows = Math.max(1, Math.min(2, Math.floor((availH - 24) / 42)));", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('items cols/rows:', 'COLS = 9' in s, 'Math.min(2' in s)

p2 = root + r'\GameRoot.ts'
g = io.open(p2, encoding='utf-8').read()
g = g.replace("      const chip = panel(this.cur, 0, -vs2.height / 2 + safeTop() + 118, 336, 34, { art: 'btn' });",
              "      const chip = panel(this.cur, 58 - vs2.width / 2, vs2.height / 2 - (safeTop() + 56), 88, 26, { art: 'btn' });", 1)
g = g.replace("      text(chip, 0, 0, '复制本局日志（真机导出）', { size: 12, color: new Color(240, 236, 226, 255), width: 330, bold: true, outline: true });",
              "      text(chip, 0, 0, '导出日志', { size: 10, color: new Color(240, 236, 226, 255), width: 84, bold: true, outline: true });", 1)
io.open(p2, 'w', encoding='utf-8', newline='').write(g)
print('chip top-left:', '导出日志' in g)
