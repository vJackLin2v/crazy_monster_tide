
import io, os
root = r'H:\AI-game\crazy_monster_tide'

handoff = """# HANDOFF · 《疯狂鸽王》（2026-10-31）

> 新会话唯一必读（配合 START_PROMPT.md 与 AGENTS.md 路由表）。目标：只读 2~3 个文件就能接手。

## 0. 现状一句话

Cocos 3.8.6 微信小游戏，可玩：20 波 + 精英 + BOSS + 无尽；16 老技能 + 4 新技能、
24 黑科技（18 老 + 6 新）、80 道具（70 老 + 10 新）、5 档难度、11 屏 UI。
测试 264 PASS / 0 FAIL，tsc 双配置 0，微信包 3.06MB / 10.89MB。

## 1. 开工三步（照做，别扩读）

    cd H:/AI-game/crazy_monster_tide/cocos
    node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.check.json
    node H:/AI-game/xingnang/cocos_port/node_modules/tsx/dist/cli.mjs tests/run.ts

期望 264 PASS。然后读 memory-bank/tasks.md 顶部里程碑，再按 AGENTS.md 第 2 节路由表按需读 1~3 个文件。

## 2. 构建 / 出包的唯一正确方式（踩过坑）

    cd H:/AI-game/crazy_monster_tide
    cmd /c "build-wechat.bat -nopause"

- 不要直接 CocosCreator.exe --build "platform=wechatgame;..."：它可能静默不产出，
  而同一条命令里 web 构建会打印 build success，极易误判"微信包已更新"。
- 出包后必须校验 index.js 的 LastWriteTime 是刚刚，并 grep 包内应含的新字符串。
- 产物目录：cocos/build/wechatgame（用户导入的就是这个）。

## 3. 本轮（阶段3 内容扩展）已交付

| 项 | 关键文件 | 状态 |
|---|---|---|
| 伤害事件系统 | game/DamageContext.ts | 完成 |
| 六张新黑科技 M1–M6 | game/ModuleValues.ts + battle/Battle.ts | 完成 |
| 五档难度 | data/Difficulties.ts、game/BossSummon.ts、ui/DifficultyScreens.ts | 完成 |
| 四个新技能 | data/Skills.ts（ring_blade/mine_field/sentry/charge_pulse） | 完成 |
| 十件新道具 | data/Items.ts + game/SpecialItems.ts | 完成 |
| 可滚动列表 | ui/ModalList.ts（安装屏背包 + 商店已有道具） | 完成 |
| 命名去梗 / 结算布局 / BOSS 流程 | data/Modules.ts、ui/MenuScreens.ts、GameRoot.showShop | 完成 |

## 4. 硬事实（别重复踩）

1. makeModalList 必须 import：漏 import 会 ReferenceError，被 buildInstall/buildShop 的 try/catch
   吞掉 → 表现为"列表空白 + 底部按钮消失"。已发生 3 次。
2. ui/ModalList.ts 两坑：事件名用 Node.EventType（不要 NodeEventType）；
   显示顶部时 content 位移 =（视口高 - 内容高）/2，符号反了内容会被顶出可视区。
3. 结算页坐标必须用设计坐标算；at2() 返回的是节点坐标，别再传回去。
4. 选中态文字要关 LabelOutline，否则橙底上糊成黑块。
5. 设计文档是意图，实现偏离时以代码为准，并回写 docs/implementation_status.md。

## 5. 待办（按优先级）

1. 真机复测（用户侧）：难度页、两处滚动手感、商店点道具详情、BOSS 通关→结算→无尽流程；
2. 构筑平衡：reports/build_balance_v2.md 只是相对排序（模型假设满配），需用真机 console-*.log 里的
   [TELEMETRY] 反标"按波次实际配置"后再调 sentry / mine_field 初值；
3. 陨石 / 乱杀特效观感待确认（已改：陨石朝下 90°、乱杀换斩击）；
4. 设计文档与实现差异需一次性对齐（见 docs/implementation_status.md 偏差列）。

## 6. 汇报格式（强制）

完成 / 验证（贴真实命令输出）/ 未完成 / 下一步，并停下等确认。
禁止"应该可以 / 理论上没问题"；禁止没跑通截图就说"已修复"。

## 7. 命令速查

| 用途 | 命令 |
|---|---|
| 类型检查 | tsc -p tsconfig.check.json / -p tsconfig.ui-check.json |
| 单测 | tsx tests/run.ts |
| 构建（唯一） | cmd /c "build-wechat.bat -nopause" |
| 网页截图 | node tools/ui/shot_shop.cjs 等（先 web 构建 + serve.cjs） |
| 平衡报告 | tsx tools/analysis/build_balance.ts → reports/build_balance_v2.md |
"""
io.open(os.path.join(root, 'memory-bank', 'HANDOFF.md'), 'w', encoding='utf-8', newline='').write(handoff)

p = os.path.join(root, 'memory-bank', 'tasks.md')
t = io.open(p, encoding='utf-8').read()
entry = """# 当前任务

## 当前阶段

**阶段3（2026-10-31）内容扩展 + 难度系统（已完成开发，等真机复测）**
- 伤害事件：game/DamageContext.ts（来源推导 canTriggerModules、canHarvest/canVamp、ModuleUsage 闸门）；
- 黑科技 M1–M6：溢出爆裂 / 残影护盾 / 处决 / 返程斩 / 焚烧地带 / 蓄势（数值表 game/ModuleValues.ts）；
- 难度：五档 data/Difficulties.ts（普通=基准、回血预算 null）、BOSS 召唤状态机 game/BossSummon.ts、
  难度页 ui/DifficultyScreens.ts（视觉 40 / 热区 44）、通关解锁、结算显示难度；
- 新技能：ring_blade / mine_field / sentry / charge_pulse（各带实体上限与来源规则）+ 黑科技白名单；
- 新道具 10 件 + game/SpecialItems.ts（专注核心伤害/冷却、碎冰、落雷追加、刷新省钱、低血强化、
  金币转攻击、共鸣、余烬、反伤）；
- UI：ui/ModalList.ts（安装屏背包 + 商店已有道具滚动）、结算布局重排、命名去梗、BOSS 通关先结算；
- 数值：怪少而强（间隔 .92 / 批量 2 / 同屏 24~34 / HP 成长 .34）、波时 22~46s、商店涨价加速、
  回血上限 5HP/s、吸血 2%、每波回血 6%、击退 26→12、5 波起每 2 波精英；
- 测试 264 PASS / 0 FAIL；tsc 双配置 0；微信包 3.06MB / 10.89MB。
- 构建只认 build-wechat.bat -nopause（直接调 CocosCreator CLI 会静默不产出）。

"""
if t.startswith('# 当前任务'):
    idx = t.find('## 当前阶段')
    t = (t[:idx] + entry[len('# 当前任务\n\n'):]) if idx > 0 else entry + t
else:
    t = entry + t
io.open(p, 'w', encoding='utf-8', newline='').write(t)
print('ok')
