
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\ui\Modals.ts'
s = io.open(p, encoding='utf-8').read()
i = s.find("  // ── 已有道具网格（位置已在上方算好）──")
j = s.find("  // 底部：刷新(112) + 下一波(216)", i)
print('anchors', i, j)
if i > 0 and j > i:
    new = """  // ── 已有道具：全部展示 + 可滚动（ModalList，同安装屏一套）──
  text(root, A(12, ownedTitleY).x, A(12, ownedTitleY).y, '已有道具 ' + owned.length,
    { size: 13, color: COL.accent, align: 'left', width: 240, bold: true, outline: true });
  if (!owned.length) {
    text(root, A(12, gridTop + 8).x, A(12, gridTop + 8).y, '（还没有道具：精英/BOSS 会掉，商店也能买）',
      { size: 10, color: COL.dim, align: 'left', width: 320 });
  } else {
    const rowsAll = Math.ceil(owned.length / COLS);
    const contentH = rowsAll * (CELL + CGAP) + 4;
    const viewH = MAXR * (CELL + CGAP) - CGAP + 8;      // 3 行 + 上边距，超出滚动
    const viewCy = gridTop + viewH / 2;                 // 顶边贴 gridTop
    console.log('[Shop] gridTop=' + gridTop + ' rows=' + rowsAll + ' contentH=' + contentH + ' viewH=' + viewH + ' cy=' + viewCy);
    const list = makeModalList(root, A(180, viewCy).x, A(180, viewCy).y, 336, viewH, contentH);
    owned.forEach((it, i2) => {
      const col = i2 % COLS, rowi = Math.floor(i2 / COLS);
      const cx = -158 + CELL / 2 + col * (CELL + CGAP);
      const cyy = list.topY - CELL / 2 - 4 - rowi * (CELL + CGAP);
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
  }

"""
    s = s[:i] + new + s[j:]
    if "from './ModalList'" not in s:
        s = s.replace("import { panel, text, button, onTap, mkNode, screen } from './UIKit';",
                      "import { panel, text, button, onTap, mkNode, screen } from './UIKit';\nimport { makeModalList } from './ModalList';", 1)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('shop list v2 patched')
