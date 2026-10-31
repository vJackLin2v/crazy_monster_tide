
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\ui\ManageScreens.ts'
s = io.open(p, encoding='utf-8').read()
if 'makeModalList' not in s:
    s = s.replace("import { panel, text, button, onTap, mkNode, screen } from './UIKit';",
                  "import { panel, text, button, onTap, mkNode, screen } from './UIKit';\nimport { makeModalList } from './ModalList';", 1)

i = s.find("  // 背包格：视觉 40 高")
j = s.find("  const bagRows = ", i)
if i < 0 or j < 0:
    print('anchors miss', i, j)
else:
    new = """  // 背包：全部展示 + 可滚动（ModalList：只监听自己的触摸，不和底部按钮抢）
  const BW = 100, BHH = 38, BGAP = 8, BCOLS = 3;
  const bagTop = bagTitleY - 12;
  const BAG_VIEW_H = 108;
  let bagBottom = bagTop - 30;
  if (!d.bag.length) {
    text(box, -158, bagTop - 16, '（空：黑科技都装在技能上了，或还没获得）',
      { size: 11, color: COL.dim, align: 'left', width: 316 });
  } else {
    const rows = Math.ceil(d.bag.length / BCOLS);
    const contentH = rows * (BHH + BGAP) + 4;
    const list = makeModalList(box, 0, bagTop - BAG_VIEW_H / 2, 316, BAG_VIEW_H, contentH);
    d.bag.forEach((m, i2) => {
      const col = i2 % BCOLS, rowi = Math.floor(i2 / BCOLS);
      const cx = -158 + BW / 2 + col * (BW + BGAP);
      const cyy = list.topY - BHH / 2 - rowi * (BHH + BGAP);
      const on = d.selBag === i2;
      const n = panel(list.content, cx, cyy, BW, BHH, { art: on ? 'card_gold' : 'btn' });
      drawIcon(n, -BW / 2 + 17, 0, 18, m.icon);
      text(n, 9, 0, (m.name.replace(/\\s*[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/, '') + (m.merged ? ' Ⅱ' : '')).slice(0, 7),
        { size: 11, color: m.merged ? COL.accent : COL.cream, width: 62, outline: true });
      onTap(n, () => { if (list.isDragging()) return; cb.onSelectBag(on ? null : i2); });
    });
    bagBottom = bagTop - BAG_VIEW_H - 8;
  }
"""
    s = s[:i] + new + s[j:]
    # 删除旧的 bagRows/bagBottom 计算（新版已内置）
    s = s.replace("  const bagRows = d.bag.length ? Math.ceil(Math.min(d.bag.length, BAG_MAX) / BCOLS) : 1;\n  const bagBottom = bagTop - bagRows * (BHH + BGAP) + 4;",
                  "", 1)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('bag list patched')
