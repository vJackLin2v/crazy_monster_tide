
import io
p = r'H:\AI-game\crazy_monster_tide\tools\analysis\build_balance.ts'
s = io.open(p, encoding='utf-8').read()
# 追加模型局限与相对排序（不再用绝对阈值告警）
s = s.replace("""    if (w === 20 && ttk > 5) warn.push(b.name + '：W20 秒杀 ' + ttk.toFixed(1) + 's（偏弱）');
    if (w === 5 && ttk < 0.5) warn.push(b.name + '：W5 秒杀 ' + ttk.toFixed(2) + 's（偏强）');
""", "")
s = s.replace("""writeFileSync('reports/build_balance_v2.md', md, 'utf8');""",
"""// 相对排序：只看同一模型内的强弱差，不用绝对阈值（模型假设了满配角色，绝对值不可比）
const ranking = BUILDS.map(b => {
  const dps = b.skills.map(x => skillDps(x.id, x.mods)).reduce((a, p2) => a + p2.dps, 0);
  return { name: b.name, dps };
}).sort((a, b) => b.dps - a.dps);
md.push('', '## 相对排序（同一模型内可比）', '', ...ranking.map((r, i) => (i + 1) + '. ' + r.name + ' — ' + r.dps.toFixed(0) + ' DPS'));
md.push('', '## 模型局限（必读）', '',
  '1. 假设角色**满配**（4 技能 Lv5 + 每个 3 个模块），实际第 5 波远达不到，所以绝对秒杀时间偏乐观；',
  '2. 弹幕按“全部命中同一目标”保守估计，实际群怪时会溢出；',
  '3. 范围技能统一按 4 目标，未区分技能半径；',
  '4. 不含道具、角色天赋、难度倍率；',
  '5. 结论只用于**相对排序与找异常**，不作为调数值的唯一依据。');
writeFileSync('reports/build_balance_v2.md', md, 'utf8');""", 1)
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('report generator updated')
