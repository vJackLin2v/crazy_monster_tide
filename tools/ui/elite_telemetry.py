
import io
root = r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts'

# 4) 精英：第 5 波起每 2 波必出
p = root + r'\core\Const.ts'
s = io.open(p, encoding='utf-8').read()
old = "export function isEliteWave(n: number): boolean { return !isBossWave(n) && n % RUN.eliteEvery === 0; }"
new = """export function isEliteWave(n: number): boolean {
  if (isBossWave(n)) return false;
  // 2026-10-31：玩家反馈"第五波开始可以多出精英" → 5 波起每 2 波一只
  const every = n >= 5 ? 2 : RUN.eliteEvery;
  return n % every === 0;
}"""
if old in s:
    s = s.replace(old, new, 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('elite:', 'n >= 5 ? 2' in s)

# 5) 结算时把 telemetry 打到 console（真机日志可直接分析，不依赖剪贴板）
p2 = root + r'\GameRoot.ts'
g = io.open(p2, encoding='utf-8').read()
if "[TELEMETRY]" not in g:
    g = g.replace("    Sfx.sfx(win ? 'victory' : 'defeat', 0.7, 800);",
"""    // 真机日志里直接落一份结构化数据，方便把 console log 发回来分析
    try { console.log('[TELEMETRY]' + exportLogs()); } catch (e) { console.warn('[TELEMETRY] dump failed', e); }
    Sfx.sfx(win ? 'victory' : 'defeat', 0.7, 800);""", 1)
io.open(p2, 'w', encoding='utf-8', newline='').write(g)
print('telemetry dump:', '[TELEMETRY]' in g)
