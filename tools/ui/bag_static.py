
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\ui\ManageScreens.ts'
s = io.open(p, encoding='utf-8').read()

# 去掉"还有 N 个"，背包最多显示 9 个（3 行），格子压到 34 高
s = s.replace("  const moreTxt = d.bag.length > (compact ? 3 : 6) ? '（还有 ' + (d.bag.length - (compact ? 3 : 6)) + ' 个）' : '';\n", "", 1)
s = s.replace("  text(box, -158, bagTitleY, '背包里的黑科技' + moreTxt,", "  text(box, -158, bagTitleY, '背包里的黑科技 ' + d.bag.length,", 1)
s = s.replace("  const BW = 100, BHH = 40, BGAP = 6, BCOLS = 3;", "  const BW = 100, BHH = 34, BGAP = 6, BCOLS = 3;", 1)
s = s.replace("  const BAG_MAX = compact ? 3 : 6;              // 矮屏只放一排", "  const BAG_MAX = 9;                            // 全部展示（最多 3 行）", 1)
s = s.replace("  const bagRows = d.bag.length ? Math.min(compact ? 1 : 2, Math.ceil(Math.min(d.bag.length, BAG_MAX) / BCOLS)) : 1;",
              "  const bagRows = d.bag.length ? Math.ceil(Math.min(d.bag.length, BAG_MAX) / BCOLS) : 1;", 1)
# 合成区：没有可合成项时整块隐藏
s = s.replace("""  const mergeTitleY = bagBottom - 12;
  text(box, -158, mergeTitleY, '合成区（3 个同名 → 1 个更强版）',
    { size: 11, color: COL.accent, align: 'left', width: 316, bold: true, outline: true });""",
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
    // 没有可合成项：整块不显示
  } else {""", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('restored+patched:', 'BAG_MAX = 9' in s, 'canMerge' in s)
