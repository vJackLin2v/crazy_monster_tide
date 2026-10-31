
import io
p = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\GameRoot.ts'
s = io.open(p, encoding='utf-8').read()

s = s.replace("import { mkNode, screen } from './ui/UIKit';",
              "import { mkNode, screen, button, text, onTap } from './ui/UIKit';", 1)

# 结算页加“复制本局日志”小按钮
old = "      this.cur = buildResult(this.uiRoot,"
idx = s.find(old)
if idx < 0:
    print('buildResult call miss')
else:
    # 在 buildResult 语句结束后插入（找该语句的结束 ");"）
    end = s.find('\n', s.find(');', idx))
    ins = """
    // 真机调试：一键复制本局日志（微信走剪贴板，网页走 navigator.clipboard）
    try {
      const vs2 = view.getVisibleSize();
      const chip = button(this.cur, vs2.width / 2 - 52, vs2.height / 2 - safeTop() - 26, 92, 24, '复制日志', { size: 10 });
      onTap(chip.node, () => this.copyRunLogs());
    } catch (e) { console.warn('[GameRoot] 复制日志按钮创建失败', e); }
"""
    s = s[:end] + ins + s[end:]

# 方法
s = s.replace("  private showResult(win: boolean) {",
"""  /** 真机/网页一键复制本局日志（含每波统计），方便回传分析 */
  private copyRunLogs(): void {
    const data = exportLogs();
    const wxAny = (globalThis as unknown as { wx?: { setClipboardData?: (o: { data: string }) => void } }).wx;
    if (wxAny && wxAny.setClipboardData) {
      wxAny.setClipboardData({ data });
      console.log('[日志] 已写入剪贴板，共 ' + data.length + ' 字符');
      return;
    }
    const nav = (globalThis as unknown as { navigator?: { clipboard?: { writeText: (t: string) => Promise<void> } } }).navigator;
    if (nav && nav.clipboard) {
      void nav.clipboard.writeText(data);
      console.log('[日志] 已写入剪贴板，共 ' + data.length + ' 字符');
      return;
    }
    console.log(data);
  }

  private showResult(win: boolean) {""", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('copy button wired:', 'copyRunLogs' in s)
