# HANDOFF · 《疯狂鸽王》（2026-10-31 阶段3 收尾后）

> 新会话唯一必读（配合 START_PROMPT.md 与 AGENTS.md 路由表）。
> 本轮已经把**设计文档 / 代码 / 测试**对齐；状态以本文件 + `docs/review/` 为准。

## 0. 现状一句话

Cocos 3.8.6 微信小游戏，可玩：20 波 + 精英 + BOSS + 无尽；16 老技能 + 4 新技能、24 黑科技、80 道具、5 档难度、11 屏 UI。
**测试 349 PASS / 0 FAIL**，tsc 双配置 0，微信包 3.06MB / 10.9MB（2026-10-31 14:47 重新出包，commit 49a929a）。
本轮补齐：伤害来源贯穿击杀链路、6 条 S 规则、精英词缀真实效果、传说道具共享上限、存档读取、无尽徽章、地狱商店经济遥测。

## 1. 开工三步

    cd H:/AI-game/crazy_monster_tide/cocos
    node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.check.json
    node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.ui-check.json
    node H:/AI-game/xingnang/cocos_port/node_modules/tsx/dist/cli.mjs tests/run.ts

期望 **349 PASS / 0 FAIL**。然后读 `docs/review/stage3_final_review_report.md` 的"未完成/待验证"。

## 2. 构建 / 出包（唯一正确方式）

    cd H:/AI-game/crazy_monster_tide
    cmd /c "build-wechat.bat -nopause"

产物：`cocos/build/wechatgame`（用户导入的就是这个）。
出包后必须校验 `assets/main/index.js` 的 LastWriteTime 是刚刚。
不要直接调 CocosCreator CLI 出微信包（可能静默不产出）；web-mobile 可以直接调 CLI（截图用）。

## 3. 本轮新增/变更的代码

| 文件 | 作用 |
|---|---|
| `game/DamageContext.ts` | v7：canHarvest / canVamp 变字段，工厂 freeze；哨兵 `summonKind` 例外 |
| `game/SkillRules.ts` | 环刃片数、地雷分裂/回声、蓄能回声、哨兵开火计划（纯函数） |
| `game/EliteAffix.ts` | 精英词缀选择与数值（护盾/加速/分裂） |
| `game/Progress.ts` | `parseSave` 读全字段 + 迁移；`badgesForRun` 无尽徽章 |
| `game/Telemetry.ts` | 商店经济快照（进店/原价/成交/刷新/离店/难度） |
| `game/RunState.ts` | 传说共享计数、商店原价 |
| `battle/Battle.ts` | 来源贯穿击杀、elite 概率/词缀、环刃 orbit、地雷 split/echo、蓄能 echo、哨兵真实弹体、echo 不计蓄势 |
| `GameRoot.ts` | 遥测接线、徽章写档/展示、商店回调 |
| `tests/run.ts` | 新增 §7–§15（85 条新断言） |

## 4. 硬事实 / 踩坑

- `tsconfig.check.json` **不含 ui/ 与 GameRoot.ts**；动 UI 必须跑 `tsconfig.ui-check.json`。
  另有诊断用全量配置 `tsconfig.full-check.json`（当前 14 条历史遗留错误，非本轮引入，不作门禁）。
- `makeModalList` 漏 import 会被 try/catch 吞掉 → 列表空白；UI 改动后必须跑 ui-check。
- `Battle.killEnemy` 的 `src` 参数必须由 `hitEnemy` 传下去，否则 summon 击杀会错误触发 harvest。
- echo 重放走 `echoReplay` 标记：不计蓄势、不递归 echo。
- 兼容矩阵与 `SkillCalc.NEW_SKILL_ALLOW` 必须逐格一致（tests §15 会抓）。
- 结算页坐标用设计坐标算；at2() 返回节点坐标，别传回去。

## 5. 待办（按优先级）

1. **真机复测**（用户侧）：难度页、精英词缀辨识度（护盾蓝描边）、两处滚动手感、商店点道具详情、BOSS 通关→结算→无尽、结算页无尽徽章文案。
2. **地狱 1.8225 倍**：拿真机 `[TELEMETRY]` 日志反标经济（已记波次/进店金币/原价/成交价/购买/刷新/离店/难度），再决定是否调参。
3. **普通难度旧版逐项对照**：仓库没有阶段2 行为快照，只能证明公式层；若要做实，需要旧版本包或旧测试。
4. ~~`telemetryWaveEnd` 未接收 `dmgDealt`~~ —— 已补签名，`WaveRec.dmgDealt` 现在会落盘。
5. 精英模板仍固定 `gnollberserker`（词缀已生效，单位种类未随机化）。

## 6. 汇报格式（强制）

完成 / 验证（贴真实命令输出）/ 未完成 / 下一步，并停下等确认。
禁止"应该可以 / 理论上没问题"；禁止没跑通就说"已修复"。

## 7. 命令速查

| 用途 | 命令 |
|---|---|
| 类型检查 | `tsc -p tsconfig.check.json` / `-p tsconfig.ui-check.json` |
| 诊断全量检查 | `tsc -p tsconfig.full-check.json`（有历史错误，看新增） |
| 单测 | `tsx tests/run.ts` |
| 构建（微信） | `cmd /c "build-wechat.bat -nopause"` |
| 构建（网页截图） | `CocosCreator.exe --project cocos --build 'platform=web-mobile;debug=false'` |
| 网页截图 | 先 `node tools/ui/serve.cjs`，再跑 `tools/ui/shot_*.cjs` |
