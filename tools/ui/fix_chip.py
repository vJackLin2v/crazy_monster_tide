
import io
root = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts'

p = root + r'\GameRoot.ts'
g = io.open(p, encoding='utf-8').read()
old_start = g.find("    // 真机调试：一键复制本局日志")
old_end = g.find("} catch (e) { console.warn('[GameRoot] 复制日志按钮创建失败', e); }")
if old_start > 0 and old_end > old_start:
    new_block = """    // 真机调试：一键复制本局日志（手绘 chip，不依赖 button 组件）
    {
      const vs2 = view.getVisibleSize();
      const S2 = safeTop();
      const cx = 58 - vs2.width / 2;
      const cy = vs2.height / 2 - (S2 + 56);
      const chip = panel(this.cur, cx, cy, 88, 26, { art: 'btn' });
      text(chip, 0, 0, '复制日志', { size: 10, color: COL.cream, width: 84, bold: true, outline: true });
      onTap(chip, () => this.copyRunLogs());
      console.log('[GameRoot] 复制日志 chip 已创建');
    }
"""
    g = g[:old_start] + new_block + g[old_end + len("} catch (e) { console.warn('[GameRoot] 复制日志按钮创建失败', e); }"):]
else:
    print('copy block anchors miss', old_start, old_end)
# 需要 panel / COL 导入
if 'panel,' not in g.split('\n')[16]:
    g = g.replace("import { mkNode, screen, button, text, onTap } from './ui/UIKit';",
                  "import { mkNode, screen, button, text, onTap, panel } from './ui/UIKit';", 1)
if "from './ui/Tokens'" not in g:
    g = g.replace("import { buildMenu,", "import { COL } from './ui/Tokens';\nimport { buildMenu,", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(g)
print('chip rewrite:', '复制日志 chip 已创建' in g)

# 构筑列表可见行数：底部按钮更高，重新计算
p2 = root + r'\ui\MenuScreens.ts'
m = io.open(p2, encoding='utf-8').read()
m = m.replace("  const availH = (VH - B - 60) - rowsTop;", "  const availH = (VH - B - 150) - rowsTop;", 1)
m = m.replace("  const maxRows = Math.max(1, Math.floor((availH - 18) / 42));", "  const maxRows = Math.max(1, Math.floor((availH - 24) / 42));", 1)
io.open(p2, 'w', encoding='utf-8', newline='').write(m)
print('maxRows:', 'VH - B - 150' in m)
