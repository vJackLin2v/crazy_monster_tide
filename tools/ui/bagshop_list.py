
import io
root = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\ui'

# 1) 背包可视高度只放整两行，避免半行压在合成区标题上
p = root + r'\ManageScreens.ts'
s = io.open(p, encoding='utf-8').read()
s = s.replace("  const BAG_VIEW_H = 110;", "  const BAG_VIEW_H = 92;   // 正好两行，避免半行压住下面的合成区", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('bag height:', 'BAG_VIEW_H = 92' in s)

# 2) 商店已有道具：改成可滚动列表（全部展示）
p2 = root + r'\Modals.ts'
m = io.open(p2, encoding='utf-8').read()
if "makeModalList" not in m:
    m = m.replace("import { panel, text, button, onTap, mkNode, screen } from './UIKit';",
                  "import { panel, text, button, onTap, mkNode, screen } from './UIKit';\nimport { makeModalList } from './ModalList';", 1)
i = m.find("  } else {\n    shown.forEach((it, i) => {")
j = m.find("    if (owned.length > COLS * MAXR) {", i)
if i > 0 and j > i:
    new = """  } else {
    // 已有道具：全部展示 + 可滚动（原来 8 列会溢出被裁，且 MAXR=3 之后直接截断）
    const rows = Math.ceil(owned.length / COLS);
    const listH = COLS > 0 ? Math.min(MAXR * (CELL + CGAP) - CGAP, rows * (CELL + CGAP) - CGAP) : CELL;
    const contentH = rows * (CELL + CGAP) + 4;
    const listTopY = gridTop + CELL / 2 + listH / 2 - CELL / 2;
    const list = makeModalList(root, A(180, listTopY).x, A(180, listTopY).y, 336, listH + 8, contentH);
    owned.forEach((it, i) => {
      const col = i % COLS, rowi = Math.floor(i / COLS);
      const cx = -158 + CELL / 2 + col * (CELL + CGAP);
      const cyy = list.topY - CELL / 2 - rowi * (CELL + CGAP) - 2;
      const box = panel(list.content, cx, cyy, CELL, CELL, { art: 'slot' });
      if (it.count && it.count > 1) {
        text(box, CELL / 2 - 3, -CELL / 2 + 7, '×' + it.count,
          { size: 10, color: COL.accent, align: 'right', width: CELL - 6, bold: true, outline: false });
      }
      if (it.icon) {
        const inode = mkNode(box, 'icon', 28, 28);
        const isp = inode.addComponent(Sprite);
        isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
        const f = iconFrame(it.icon);
        if (f) isp.spriteFrame = f;
        else void loadIcon(it.icon).then(() => {
          const g2 = it.icon ? iconFrame(it.icon) : null;
          if (g2 && isp.isValid) isp.spriteFrame = g2;
        });
      } else {
        text(box, 0, 1, '◆', { size: 14, color: COL.cream, width: CELL, outline: false });
      }
      onTap(box, () => {
        if (list.isDragging()) return;
        const pop = panel(root, 0, 0, 300, 150, { art: 'panel' });
        text(pop, 0, 52, it.name + (it.count && it.count > 1 ? (' ×' + it.count) : ''), { size: 15, color: COL.accent, width: 280, bold: true, outline: true });
        text(pop, 0, 6, it.desc ?? '（暂无说明）', { size: 11, color: COL.cream, width: 270, align: 'left' });
        const close = button(pop, 0, -54, 120, 34, '关闭', { size: 12 });
        onTap(close.node, () => pop.destroy());
        onTap(pop, () => pop.destroy());
      });
    });
"""
    m = m[:i] + new + m[j:]
    # 删掉旧的"还有 N 件"
    m = m.replace("""    if (owned.length > COLS * MAXR) {
      text(root, A(12, gridTop - 12).x, A(12, gridTop - 12).y, '… 还有 ' + (owned.length - COLS * MAXR) + ' 件',
        { size: 10, color: COL.dim, align: 'left', width: 320 });
    }
""", "", 1)
    io.open(p2, 'w', encoding='utf-8', newline='').write(m)
    print('shop list patched')
