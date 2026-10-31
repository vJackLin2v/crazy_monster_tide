
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\ui\Modals.ts'
s = io.open(p, encoding='utf-8').read()

# #17-1 右侧被裁：8 列 × 48 = 384 > 336，改 7 列（328）
s = s.replace("  const CELL = 40, CGAP = 8, COLS = 8, MAXR = 3;", "  const CELL = 40, CGAP = 8, COLS = 7, MAXR = 3;   // 7 列才装得进 336（8 列会溢出被裁）", 1)

# #17-2 点击道具看详情：点格子弹一个说明卡（名称 + 数量 + 描述）
s = s.replace("""      } else {
        text(box, 0, 1, '◆', { size: 14, color: COL.cream, width: CELL, outline: false });
      }
    });""",
"""      } else {
        text(box, 0, 1, '◆', { size: 14, color: COL.cream, width: CELL, outline: false });
      }
      // 点击查看详情（用户要求：道具能点开看说明）
      onTap(box, () => {
        const pop = panel(root, 0, 0, 300, 150, { art: 'panel' });
        text(pop, 0, 52, it.name + (it.count && it.count > 1 ? (' ×' + it.count) : ''), { size: 15, color: COL.accent, width: 280, bold: true, outline: true });
        text(pop, 0, 6, it.desc ?? '（暂无说明）', { size: 11, color: COL.cream, width: 270, align: 'left' });
        const close = button(pop, 0, -54, 120, 34, '关闭', { size: 12 });
        onTap(close.node, () => pop.destroy());
        onTap(pop, () => pop.destroy());
      });
    });""", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('shop:', 'COLS = 7' in s, '点击查看详情' in s)
