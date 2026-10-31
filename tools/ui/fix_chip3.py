
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\GameRoot.ts'
s = io.open(p, encoding='utf-8').read()
anchor = "        win && RUN.canContinue ? () => this.continueEndless() : undefined);\n"
assert anchor in s
chip = anchor + """
      // 真机调试：一键复制本局日志（放在标题牌左侧，构建失败不阻断结算）
      const vs2 = view.getVisibleSize();
      const chip = panel(this.cur, 58 - vs2.width / 2, vs2.height / 2 - (safeTop() + 56), 88, 26, { art: 'btn' });
      text(chip, 0, 0, '复制日志', { size: 10, color: COL.cream, width: 84, bold: true, outline: true });
      onTap(chip, () => this.copyRunLogs());
"""
s = s.replace(anchor, chip, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('chip inserted:', '复制日志' in s)
