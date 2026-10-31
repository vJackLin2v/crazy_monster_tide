
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\ui\ManageScreens.ts'
s = io.open(p, encoding='utf-8').read()

# 导入 makeScroll
if 'makeScroll' not in s:
    s = s.replace("import { panel, text, button, onTap, mkNode, screen } from './UIKit';",
                  "import { panel, text, button, onTap, mkNode, screen } from './UIKit';\nimport { makeScroll } from './ScrollView';", 1)

old_start = "  const moreTxt = d.bag.length"
i = s.find(old_start)
j = s.find("  const bagRows = ", i)
if i < 0 or j < 0:
    print('bag anchors miss', i, j)
else:
    new = """  // 背包全部展示 + 可滚动（用户要求：不允许"还有 N 个"，且要能滚动）
  text(box, -158, bagTitleY, '背包里的黑科技 ' + d.bag.length,
    { size: 13, color: COL.accent, align: 'left', width: 300, bold: true, outline: true });
  const BW = 100, BHH = 40, BGAP = 6, BCOLS = 3;
  const BAG_VIEW_H = 96;                       // 两行可见，超出滚动
  const bagTop = bagTitleY - 10;
  if (!d.bag.length) {
    text(box, -158, bagTop - 16, '（空：黑科技都装在技能上了，或还没获得）',
      { size: 11, color: COL.dim, align: 'left', width: 316 });
  } else {
    const rows = Math.ceil(d.bag.length / BCOLS);
    const contentH = rows * (BHH + BGAP) + 4;
    const sh = makeScroll(box, 0, bagTop - BAG_VIEW_H / 2, 316, BAG_VIEW_H, contentH);
    d.bag.forEach((m, i2) => {
      const col = i2 % BCOLS, rowi = Math.floor(i2 / BCOLS);
      const cx = -158 + BW / 2 + col * (BW + BGAP);
      const cyy = contentH / 2 - BHH / 2 - rowi * (BHH + BGAP);
      const on = d.selBag === i2;
      const n = panel(sh.content, cx, cyy, BW, BHH, { art: on ? 'card_gold' : 'btn' });
      drawIcon(n, -BW / 2 + 17, 0, 18, m.icon);
      text(n, 9, 0, (m.name.replace(/\\s*[ⅠⅡⅢⅣⅤⅥⅦⅧⅨⅩ]+$/, '') + (m.merged ? ' Ⅱ' : '')).slice(0, 7),
        { size: 11, color: m.merged ? COL.accent : COL.cream, width: 62, outline: true });
      onTap(n, () => cb.onSelectBag(on ? null : i2));
    });
  }
"""
    s = s[:i] + new + s[j:]
    # bagRows/bagBottom 重新定义
    s = s.replace("  const bagRows = d.bag.length ? Math.min(compact ? 1 : 2, Math.ceil(Math.min(d.bag.length, BAG_MAX) / BCOLS)) : 1;\n  const bagBottom = bagTop - bagRows * (BHH + BGAP) + 4;",
                  "  const bagBottom = bagTop - (d.bag.length ? BAG_VIEW_H : 34) - 6;", 1)
    # 合成区：没有可合成项时整块隐藏
    s = s.replace("  const mergeTitleY = bagBottom - 12;\n  text(box, -158, mergeTitleY, '合成区（3 个同名 → 1 个更强版）',\n    { size: 11, color: COL.accent, align: 'left', width: 316, bold: true, outline: true });",
"""  const mergeTitleY = bagBottom - 12;
  const canMerge = d.merges.some(m => m.count >= 3);
  if (canMerge) {
    text(box, -158, mergeTitleY, '合成区（3 个同名 → 1 个更强版）',
      { size: 11, color: COL.accent, align: 'left', width: 316, bold: true, outline: true });
  }""", 1)
    s = s.replace("""  if (!cands.length) {
    text(box, -158, mergeTop - 14, '（同名黑科技凑满 3 个才能合成）',
      { size: 11, color: COL.dim, align: 'left', width: 316 });
  } else {""",
"""  if (!cands.length || !canMerge) {
    // 没有可合成项：整块不显示（用户要求）
  } else {""", 1)
    io.open(p, 'w', encoding='utf-8', newline='').write(s)
    print('bag scroll patched')
