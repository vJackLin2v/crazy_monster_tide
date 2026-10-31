
import io, os, re
root = r'H:\AI-game\crazy_monster_tide\docs\design'
def rd(f): return io.open(os.path.join(root,f), encoding='utf-8').read()
def wr(f, s): io.open(os.path.join(root,f),'w',encoding='utf-8',newline='').write(s)

SKIP = {'doc_conflict_check.md', 'v5_revision_report.md', 'v6_revision_report.md'}
docs = [f for f in sorted(os.listdir(root)) if f.endswith('.md') and f not in SKIP]
def alltext(): return '\n'.join(rd(f) for f in docs)

kw = [
 ('旧存档字段写法', r'progress\.difficulty|save\.difficulty'),
 ('pendingSummonCount（旧名）', r'pendingSummonCount'),
 ('技能槽 -2', r'技能槽\s*-\s*2|技能槽-2'),
 ('护盾 3/5/9', r'3 / 5 / 9'),
 ('半径不随合成成长', r'半径不随合成成长'),
 ('四档稀有度', r'四档'),
 ('衍生弹不触发 onhit', r'衍生弹不触发'),
 ('每波涨价 1.2%', r'1\.2%/波'),
]
kwrows, kwok = [], True
for name, pat in kw:
    hits = [(f, len(re.findall(pat, rd(f)))) for f in docs]
    hits = [(f, n) for f, n in hits if n]
    if hits: kwok = False
    kwrows.append('| ' + name + ' | ' + (', '.join(f + ' x' + str(n) for f, n in hits) if hits else '—') + ' |')

logic = [
 ('L1 存档只允许三个字段', not re.search(r'progress\.difficulty|save\.difficulty', alltext())),
 ('L2 难度行：视觉 40 + 热区 44', ('40px' in rd('difficulty_ui_spec.md')) and ('44x44' in rd('difficulty_ui_spec.md'))),
 ('L3 M5 allowedSources 仅 normal/split', ('allowedSources' in rd('module_expansion_design.md')) and ('echo / chain / module / summon 不允许' in rd('module_expansion_design.md'))),
 ('L4 召唤状态机字段与空位规则', ('pendingSummonWaves' in rd('difficulty_system_design.md')) and ('空位' in rd('difficulty_system_design.md'))),
 ('L5 普通难度不介入且回血 null', ('不介入' in rd('difficulty_system_design.md')) and ('healBudgetPerSecond = null' in rd('difficulty_system_design.md'))),
 ('L6 M2 护盾 3/5/7', '3 / 5 / 7' in rd('module_expansion_design.md')),
 ('L7 M1 半径 40/46/52 且无矛盾表述', ('40 / 46 / 52' in rd('module_expansion_design.md')) and ('不随合成成长' not in rd('module_expansion_design.md'))),
 ('L8 M3/M4/M6 三档数值', all(x in rd('module_expansion_design.md') for x in ['+40% / +58% / +76%','70% / 95% / 120%','+80% / +110% / +140%'])),
 ('L9 四技能兼容矩阵 18 行', len(re.findall(r'\| (?:Y|N|S) \| (?:Y|N|S) \| (?:Y|N|S) \| (?:Y|N|S) \|', rd('skill_expansion_design.md'))) == 18),
 ('L10 传说奖励池排除规则', ('排除传说' in rd('item_expansion_design.md')) and ('共享' in rd('item_expansion_design.md'))),
 ('L11 旧系统回归基线', '旧系统回归基线' in rd('expansion_acceptance_criteria.md')),
 ('L12 最终决策表含 v5 新增', ('pendingSummonWaves' in rd('FINAL_DESIGN_DECISIONS.md')) and ('普通难度（v5 新增' in rd('FINAL_DESIGN_DECISIONS.md'))),
 ('L13 哨兵击杀禁止触发 harvest', '不触发 Harvest（击杀回血）' in rd('skill_expansion_design.md')),
 ('L14 哨兵可通过 vamp 吸血', ('Vamp' in rd('skill_expansion_design.md')) and ('Vamp' in rd('damage_event_interface.md'))),
 ('L15 地狱价格标为暂定', ('暂定值，非最终验收' in rd('difficulty_system_design.md'))),
 ('L16 测试禁止用配置值当预期', ('禁止**用配置值当预期值' in rd('expansion_acceptance_criteria.md'))),
]
logicok = all(v for _, v in logic)

lines = ['# 文档冲突检查报告（doc_conflict_check · v5）','',
 '> A 关键词扫描（旧规则残留）；B **逻辑一致性断言**（关键词扫不到的规则冲突）。','',
 '## A. 关键词扫描','','| 旧规则 | 命中 |','|---|---|'] + kwrows + ['','## B. 逻辑一致性断言','','| 断言 | 结果 |','|---|---|']
lines += ['| ' + n + ' | ' + ('PASS' if v else '**FAIL**') + ' |' for n, v in logic]
lines += ['','## 结论','', ('**通过**：关键词 0 命中，16 条逻辑断言全部 PASS。' if (kwok and logicok) else '**未通过**：见 FAIL 项。')]
wr('doc_conflict_check.md', '\n'.join(lines))
print('kw_ok=', kwok, 'logic_ok=', logicok)
for n, v in logic:
    if not v: print('FAIL:', n)
