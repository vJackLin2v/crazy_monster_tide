# 主菜单 / 战绩 V2 测试报告（menu_history_v2_test_report）

> 日期：2026-10-31 ｜ 引擎：Cocos Creator 3.8.6 ｜ 平台：微信小游戏
> 结论：**425 PASS / 0 FAIL**；双 tsc 0；微信构建成功；浏览器真实运行 `errors=none`，续玩/商店/升级恢复断言全部通过。
> 明确区分：逻辑测试 ≠ 引擎运行时 ≠ 浏览器实际运行 ≠ 微信真机。

## 1. 分层证据

| 层 | 做了什么 | 结果 |
|---|---|---|
| 纯逻辑单测 | 425 条断言（RNG/存档校验/历史/恢复数值/商店升级快照/战斗判定） | 425 PASS / 0 FAIL |
| 引擎运行时 | 未建立引擎桩测试（需 Cocos 运行时）；以浏览器真实运行覆盖页面与恢复流程 | 见 §3 |
| 浏览器实际运行 | 无存档/有存档/确认弹窗/续玩/商店/升级/历史/详情/战斗 | `errors=none` |
| 微信真机 | **未做**（本机无 DevTools/真机），见 §6 | 待人工 |

## 2. 实际执行

```
cd cocos
tsc -p tsconfig.check.json      -> EXIT=0
tsc -p tsconfig.ui-check.json   -> EXIT=0
tsx tests/run.ts                -> PASS 425 / FAIL 0

cd ..
cmd /c "build-wechat.bat -nopause"
  -> build success

node tools/ui/shot_menu_history_v2.cjs
  -> saved={"hp":45,"maxhp":72,"gold":140,"wave":12,"skills":["blade:1:","sentry:2:multi"]}
  -> resume={"matchHp":true,"hpText":"45/72","gold":140,"wave":12,"skillsMatch":true}
  -> shop-before/after 四货位 ID/价格/锁定/已购/刷新次数一致
  -> lv-before/after 三张卡 kind:id 与顺序一致
  -> errors=none
```

| 指标 | 值 |
|---|---|
| 总断言 | 425 |
| PASS | 425 |
| FAIL | 0 |
| SKIP | 0 |
| 原始日志 | `test_execution.log` |

## 3. 浏览器运行时断言（真实游戏代码，非模拟）

| 项 | 固定测试数据 | 断言结果 |
|---|---|---|
| 续玩生命 | 存档 45/72 | 恢复后 **45/72**（此前截图 72/72 是脚本补血造成的假象，已修脚本并复测） |
| 续玩金币/波次/技能 | 140 / 12 / blade+sentry(multi) | 完全一致 |
| 商店恢复 | 4 货位：power_s 35 锁定、multi 48 已购、haste_s 42、heal 30 锁定；刷新 2 | 恢复后 ID/价格/锁定/已购/刷新次数**全部一致**，阶段为 shop（不重刷货架） |
| 升级恢复 | 三张卡：skill:sentry / module:giant / item:crit_s | 恢复后卡 ID 与顺序**完全一致**，阶段为 levelup，不会重新随机 |
| 页面报错 | — | `errors=none` |

## 4. 本轮新增断言（§22–§23，21 条）

- 生命恢复：45/72、1/72、72/72、0、负数、NaN、超上限、maxhp=0 的安全修复；
- 商店快照：四货位 ID/价格/锁定/已购/刷新次数 + phase；
- 升级快照：三张卡 ID/顺序 + phase；
- ActiveRunSave 新增字段（elite/boss/goldEarned/goldSpent/milestones）随存档往返。

## 5. 截图（真实运行）

| 文件 | 内容 |
|---|---|
| `menu_no_save.png` | 无存档主菜单（开始冒险为主操作） |
| `menu_has_save.png` | 有存档主菜单（继续卡为视觉中心，生命 45/72） |
| `start_confirm.png` | 开始新冒险确认（继续 / 放弃并开始 / 返回，背景为真实主菜单） |
| `resume_battle.png` | 续玩恢复（波次 12，生命 45/72） |
| `shop_resume.png` | 商店中断恢复（固定货架/锁定/已购） |
| `levelup_resume.png` | 升级三选一恢复（固定三张卡） |
| `battle.png` | 战斗 HUD |
| `history_list.png` | 战绩档案（多条记录） |
| `history_empty.png` | 空态（含「开始第一场冒险」） |
| `detail_victory.png` | 详情：成功通关 |
| `detail_defeat.png` | 详情：挑战失败 |
| `detail_abandon.png` | 详情：主动结束冒险（伤害显示「未记录」，未伪造） |

## 6. 微信真机待验收

1. 杀进程/切后台后继续，生命/技能/道具/敌人是否一致；
2. 商店页退出→继续，货架与锁定；
3. 升级卡退出→继续，三张卡不重随机；
4. 历史列表 50 条滚动与筛选记忆；
5. 详情技能点击展开浮层。

## 7. 未解决 / 风险

- Battle 实体层（碰撞/生成/动画）仍无引擎级自动化测试；判定分支已抽函数覆盖，但完整链路需真机或引擎桩。
- 历史详情「造成/承受伤害」为 0 时显示 0（真实记录），主动放弃没有战斗数据时显示「未记录」。
- 角色展示为静态立绘，没有待机动画（未伪造）。
