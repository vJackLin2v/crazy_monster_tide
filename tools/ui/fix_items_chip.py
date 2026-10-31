
import io
root = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts'

# 1) 道具：改左对齐（和"本局技能"同一套坐标），不再用居中公式
p = root + r'\ui\MenuScreens.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("""    const CELL = 30, CGAP = 6, COLS = 9;
    got.slice(0, COLS).forEach((it, i) => {
      const col = i % COLS, rowi = Math.floor(i / COLS);
      const cc = at2(180 - (COLS * (CELL + CGAP) - CGAP) / 2 + CELL / 2 + col * (CELL + CGAP),
        extraY + 16 + CELL / 2 + rowi * (CELL + CGAP));""",
"""    const CELL = 30, CGAP = 6, COLS = 10;
    const startLeft2 = 12;   // 与"本局技能"一致：左对齐，避免居中公式算错时全挤到一边
    got.slice(0, COLS).forEach((it, i) => {
      const col = i % COLS, rowi = Math.floor(i / COLS);
      const cc = at2(startLeft2 + CELL / 2 + col * (CELL + CGAP),
        extraY + 16 + CELL / 2 + rowi * (CELL + CGAP));""", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('items left-aligned:', 'startLeft2' in s)

# 2) 结算页右上角显示构建标记（确认包版本）+ 复制日志改到底部整行
p2 = root + r'\GameRoot.ts'
g = io.open(p2, encoding='utf-8').read()
g = g.replace("""      const chip = panel(this.cur, 58 - vs2.width / 2, vs2.height / 2 - (safeTop() + 56), 88, 26, { art: 'btn' });
      text(chip, 0, 0, '复制日志', { size: 10, color: new Color(240, 236, 226, 255), width: 84, bold: true, outline: true });
      onTap(chip, () => this.copyRunLogs());""",
"""      // 构建标记：用来确认玩家跑的是哪个包
      text(this.cur, vs2.width / 2 - 76, vs2.height / 2 - 16, BUILD_TAG.slice(0, 16),
        { size: 8, color: new Color(150, 160, 180, 255), width: 140, align: 'right', outline: false });
      const chip = panel(this.cur, 0, -vs2.height / 2 + safeBottom() + 118, 336, 34, { art: 'btn' });
      text(chip, 0, 0, '复制本局日志（真机导出）', { size: 12, color: new Color(240, 236, 226, 255), width: 330, bold: true, outline: true });
      onTap(chip, () => this.copyRunLogs());""", 1)
if "safeBottom" not in g.split('\n')[25]:
    g = g.replace("import { safeTop } from './ui/Safe';", "import { safeTop, safeBottom } from './ui/Safe';", 1)
if 'BUILD_TAG' not in g:
    g = g.replace("import { safeTop, safeBottom } from './ui/Safe';",
                  "import { safeTop, safeBottom } from './ui/Safe';\nimport { BUILD_TAG } from './core/BuildTag';", 1)
io.open(p2, 'w', encoding='utf-8', newline='').write(g)
print('tag+chip:', 'BUILD_TAG' in g, '复制本局日志（真机导出）' in g)

# 3) 更新构建标记
p3 = root + r'\core\BuildTag.ts'
t = io.open(p3, encoding='utf-8').read()
import re
t2 = re.sub(r"export const BUILD_TAG = '[^']*';", "export const BUILD_TAG = '2026-10-31 12:0x 真机7条+难度';", t)
io.open(p3, 'w', encoding='utf-8', newline='').write(t2)
print('build tag:', t2.strip()[:60])
