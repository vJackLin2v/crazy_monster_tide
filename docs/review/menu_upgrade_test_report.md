# 主菜单升级测试报告（menu_upgrade_test_report）

> 日期：2026-10-31 ｜ 代码：工作区（本轮改动）｜ 引擎：Cocos Creator 3.8.6 / wechatgame
> 结论：**404 PASS / 0 FAIL**；双 tsc 0；微信构建成功（3.09MB / 10.93MB）；浏览器真实运行无 JS 报错。

## 1. 测试范围

| 层 | 内容 |
|---|---|
| 单元（纯逻辑） | RNG 快照、ActiveRunSave 序列化/校验/版本、历史容量/幂等/筛选/统计/坏数据、BOSS 状态机快照、背水/余烬、击杀与吸血判定分支 |
| 集成 | 双 tsc、微信构建、web-mobile 构建 |
| 运行时（浏览器真实运行） | 主菜单三态、开始游戏、存档、继续恢复（不变量校验）、结算写历史、历史列表/详情/空态、无尽进行中 |
| 真机 | **未做**（本机无微信开发者工具/手机），见 §6 |

## 2. 实际执行命令与结果

```
cd cocos
tsc -p tsconfig.check.json        -> EXIT=0
tsc -p tsconfig.ui-check.json     -> EXIT=0
tsx tests/run.ts                  -> PASS 404 / FAIL 0

cd ..
cmd /c "build-wechat.bat -nopause"
  -> build success；主包 3.09MB / 总计 10.93MB；index.js 286,821 B，15:25:49

node tools/ui/shot_menu_history.cjs
  -> errors=none
  -> resume-match=true
     after={"wave":12,"gold":140,"kills":6,"skills":["blade:1:","sentry:2:multi"]}
```

| 指标 | 值 |
|---|---|
| 总断言 | 404 |
| PASS | 404 |
| FAIL | 0 |
| SKIP | 0 |
| 原始日志 | `test_execution.log` |

## 3. 本轮新增断言（§16–§21，55 条）

| 分组 | 覆盖 |
|---|---|
| §16 RNG | 快照恢复后续序列一致；非法状态回落 |
| §17 ActiveRunSave | JSON 往返、字段还原、缺字段/缺技能/版本不符的拒绝、拒绝非法生命、runId 唯一 |
| §18 历史 | 幂等、50 上限与详情裁剪、倒序、筛选、总览、坏数据过滤、版本重建 |
| §19 BOSS 快照 | 恢复请求数/预警/冷却后行为一致 |
| §20 偏差收尾 | 背水冷却倍率方向与数值；余烬简化值 |
| §21 战斗判定 | 普通/召唤/模块/echo 的击杀回血与引爆权限；吸血权限；分裂/echo 次数上限 |

## 4. 运行时证据（浏览器截图）

| 截图 | 证明 |
|---|---|
| `menu_no_save.png` | 无存档：继续卡置灰 + 空态文案，点击不启动新游戏 |
| `menu_has_save.png` | 有存档：第 12/20 波 · 普通 · 生命 45/72 · 时长 · 构筑 |
| `resume_battle.png` | 继续后回到第 12 波战斗，技能/黑科技/金币/击杀与存档一致 |
| `endless.png` | 无尽第 25 波进行中（HUD 波次 25） |
| `history_list.png` | 总览统计 + 4 筛选 + 记录行 |
| `history_detail.png` | 统计卡、战斗统计、技能构筑、道具、结束原因 |
| `history_empty.png` | 历史空态 |
| `battle.png` / `result.png` | 正常战斗与结算 |

- 页面无 `pageerror` / `console.error`；
- `resume-match` 校验：恢复后波次与构筑完全一致，金币/击杀只增不减（战斗在继续推进）。

## 5. 已知未覆盖

1. **Battle 真实帧循环**（碰撞/实体生成/动画）仍无自动化测试；
   `game/CombatRules.ts` 把判定分支抽出来测了，但实体层需要真机或更重的引擎桩。
2. 微信小游戏切后台/杀进程恢复：浏览器模拟不能等价，未验证。
3. 商店/升级界面中断恢复：代码路径已实现（resuming / pendingRewards），**没有专门截图**。
4. 历史列表 100+ 条时的滚动手感未验证（逻辑上限 50）。

## 6. 待人工验收步骤（微信真机）

1. 导入 `cocos/build/wechatgame`，编译运行；
2. 打到第 5 波以上 → 暂停 → 「保存并退出」→ 主菜单应出现继续卡；
3. 杀掉小程序进程 → 重进 → 点继续：波次/生命/金币/技能/黑科技应一致；
4. 在商店页退出 → 继续：应回到同一货架（不重刷）；
5. 升级三选一时退出 → 继续：应回到同一组卡；
6. 暂停 → 「放弃本局」→ 主菜单进历史：应新增一条「主动放弃」；
7. 通关/死亡 → 历史新增对应记录，点开详情看构筑与里程碑。

## 7. 构建

| 项 | 值 |
|---|---|
| 命令 | `cmd /c "build-wechat.bat -nopause"` |
| 结果 | success |
| 主包 / 总计 | 3.09MB / 10.93MB |
| index.js | 286,821 B，2026-10-31 15:25:49 |
| 对应代码 | 工作区 commit（交付时提交，见 README） |
