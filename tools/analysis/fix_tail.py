
import io, re
p = r'H:\AI-game\crazy_monster_tide\tools\analysis\build_balance.ts'
s = io.open(p, encoding='utf-8').read()
start = s.find('// 相对排序')
if start < 0:
    print('anchor miss'); raise SystemExit
new_tail = """// 相对排序：同一模型内可比（绝对值不可比，见模型局限）
const ranking = BUILDS.map(b => {
  const dps = b.skills.map(x => skillDps(x.id, x.mods)).reduce((a, p2) => a + p2.dps, 0);
  return { name: b.name, dps };
}).sort((a, b) => b.dps - a.dps);
const extra: string[] = ['', '## 相对排序（同一模型内可比）', ''];
ranking.forEach((r, i) => extra.push((i + 1) + '. ' + r.name + ' - ' + r.dps.toFixed(0) + ' DPS'));
extra.push('', '## 模型局限（必读）', '',
  '1. 假设角色满配（4 技能 Lv5 + 每个 3 个模块），第 5 波远达不到，绝对秒杀时间偏乐观；',
  '2. 弹幕按全部命中同一目标保守估计，群怪时会溢出；',
  '3. 范围技能统一按 4 目标，未区分半径；',
  '4. 不含道具、角色天赋、难度倍率；',
  '5. 结论只用于相对排序与找异常，不作为调数值的唯一依据。');
writeFileSync('reports/build_balance_v2.md', md + '\\n' + extra.join('\\n'), 'utf8');
console.log(ranking.map((r, i) => (i + 1) + '. ' + r.name + ' ' + r.dps.toFixed(0)).join('\\n'));
"""
s = s[:start] + new_tail
io.open(p, 'w', encoding='utf-8', newline='').write(s)
print('rewritten tail')
