
import io, os
root = r'H:\AI-game\crazy_monster_tide'
p = os.path.join(root, 'memory-bank', 'tasks.md')
txt = ''
if os.path.exists(p):
    txt = io.open(p, encoding='utf-8').read()
entry = """

---

## 2026-10-31 · 阶段3（内容扩展）进度

- ✅ 步骤1 伤害事件系统：game/DamageContext.ts（来源推导 canTriggerModules、canHarvest/canVamp、castId、ModuleGate/ModuleUsage）
- ✅ 步骤2 难度系统：data/Difficulties.ts（五档 + rules）、Progress selectedDifficulty/difficulties + 迁移、RunState 价格/刷新、Battle 怪物数值/刷怪间隔/回血公式、ui/DifficultyScreens.ts、通关解锁、结算页显示难度
- ✅ 步骤3 四个新技能：ring_blade(orbit)/mine_field(trap)/sentry(summon)/charge_pulse(charge) + 实体上限 + SkillCalc 白名单
- ✅ 步骤4 十件新道具：Items 80 条（tier 1/2/3）、SpecialItems.ts 纯函数、已接线（血契/荆棘/专注核心/碎冰/回响/精打细算/背水/贪欲/共鸣器/余烬）
- ✅ M1–M6 黑科技实现（溢出爆裂/残影护盾/处决/返程斩/焚烧地带/蓄势）
- 🟡 待办：构筑平衡（12 套 DPS/存活）、全量回归（三档截图+微信包+真机清单）
- 测试基线：257 PASS / 0 FAIL；tsc 双配置 0；微信包构建通过
- 注意：临时脚本已收进 tools/ui/，禁止再把脚本/日志写到仓库根目录
"""
io.open(p, 'w', encoding='utf-8', newline='').write(txt + entry)
print('tasks.md updated')
