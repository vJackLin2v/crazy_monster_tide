
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\GameRoot.ts'
s = io.open(p, encoding='utf-8').read()

marker = "    // 真机调试：一键复制本局日志（手绘 chip，不依赖 button 组件）"
i = s.find(marker)
print('marker at', i)
if i > 0:
    # 找到该 block 的结束：从 marker 开始，遇到行首 "    }\n" 结束
    j = s.find("\n    }\n", i)
    block_end = j + len("\n    }\n")
    removed = s[i:block_end]
    print('removing chars:', len(removed))
    s = s[:i] + s[block_end:]

# 正确位置：buildResult 调用结束之后
b = s.find("      this.cur = buildResult(this.uiRoot,")
if b > 0:
    end = s.find("\n      );\n", b)
    if end > 0:
        insert_at = end + len("\n      );\n")
        chip = """
      // 真机调试：一键复制本局日志（手绘 chip，放在标题牌左侧）
      {
        const vs2 = view.getVisibleSize();
        const cx = 58 - vs2.width / 2;
        const cy = vs2.height / 2 - (safeTop() + 56);
        const chip = panel(this.cur, cx, cy, 88, 26, { art: 'btn' });
        text(chip, 0, 0, '复制日志', { size: 10, color: COL.cream, width: 84, bold: true, outline: true });
        onTap(chip, () => this.copyRunLogs());
        console.log('[GameRoot] 复制日志 chip 已创建');
      }
"""
        s = s[:insert_at] + chip + s[insert_at:]
        print('chip inserted after buildResult')
    else:
        print('buildResult end miss')
io.open(p, 'w', encoding='utf-8', newline='').write(s)
