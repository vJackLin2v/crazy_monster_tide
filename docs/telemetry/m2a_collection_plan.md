# M2-A-R 真实对局数据采集计划

> 2026-11-01 更新：用户决定先用已采集的 5 局做描述性观察，暂停继续扩样；5 局不足以做平衡结论。

> 目标：24 局探索性样本（不是正式统计量）。不修改任何数值。
> 采集目录：`deliverables/m2a_real_runs_20261101/`

## 1. 样本配额

| 难度 | 目标 | 已采集 | 备注 |
|---|---|---|---|
| casual 休闲 | 3 | 0 | |
| normal 普通 | 10 | 0 | 先试采 2 局 |
| hard 困难 | 5 | 0 | |
| nightmare 噩梦 | 3 | 0 | 需已解锁 |
| hell 地狱 | 3 | 0 | 需已解锁 |
| 合计 | 24 | 0 | |

角色/构筑尽量分散，不刻意只玩强势组合；失败局必须保留。

## 2. 采集前检查（已完成）

- 代码冻结：`docs/telemetry/m2a_close_report.md`；
- 测试 525 PASS；tsc/ui-check = 0；
- 浏览器导出验证：JSON 5,606B、可解析、runId 唯一；
- 校验工具：`tools/telemetry/check_runs.mjs`；
- 目录：`raw/`、`reports/`、`analysis/`、`verification/` 已建立。

## 3. 导出方式（微信端）

### 推荐 A：微信开发者工具（模拟器/真机调试）

1. 用开发者工具打开 `cocos/build/wechatgame`（release 包即可，控制台钩子保留）；
2. 正常玩一局，回到主菜单/结算；
3. 打开 Console，执行：

   ```js
   copy(__m2aJson())
   ```

   若无 `copy`，执行：

   ```js
   wx.setClipboardData({ data: __m2aJson() })
   ```

   若提示 `__m2aJson is not defined`：

   - 先确认微信开发者工具已重新编译最新 `cocos/build/wechatgame`；
   - 尝试 `GameGlobal.__m2aJson()`；
   - 仍不行则绕过钩子，直接读本地存储（保存原始数组即可，校验工具已支持顶层数组）：

   ```js
   const v = wx.getStorageSync('cmt_telemetry_v1');
   const recs = typeof v === 'string' ? JSON.parse(v) : v;
   wx.setClipboardData({ data: JSON.stringify({ schemaVersion: 2, records: recs }) });
   ```

   （有 `copy` 时把最后一句换成 `copy(JSON.stringify({schemaVersion:2,records:recs}))`；
   也可以直接把 `wx.getStorageSync('cmt_telemetry_v1')` 的原始字符串保存为 JSON 文件）

   再粘贴到本机文本文件；
4. 保存为 `raw/run_001.json`（可包含多局 records；校验工具按 runId 去重）；
5. **不要手工修改 JSON**。

### 推荐 B：DEBUG 构建的数据页

```
CocosCreator.exe --project cocos --build 'platform=wechatgame;debug=true;md5Cache=false'
```

DEBUG 构建主菜单右上「数据」→「导出全部 JSON（控制台/剪贴板）」。
release 包 `debug=false` 不显示该按钮，但控制台钩子仍可用（A 方案）。

> 微信真机上的文件落盘尚未验证；第一批判先用开发者工具完成 2 局试采。

## 4. 单局流程

0. **粘贴去重**：每次粘贴前按 runId 对比已有 raw/；只保存新 runId，旧记录忽略。若只粘贴新增记录，文件内不会出现重复 runId。
1. 开局前确认难度/角色；
2. 正常玩到死亡/通关/主动退出（退出局标 interrupted，不删）；
3. 回结算/菜单；
4. 导出 JSON；
5. 记录：编号、难度、角色、runId、结果、波次、完整性、文件名；
6. 同一局不要重复导出成多份“新对局”；重复 runId 由工具识别。

## 5. 完整性标记

- complete：正常结束（死亡/通关）；
- interrupted：主动退出/中途关；
- partial：字段缺失/导出截断；
- corrupted：JSON 无法解析。

只有 complete 进入通关率/平均伤害等统计。

## 6. 导入与校验

```powershell
node tools/telemetry/check_runs.mjs --dir deliverables/m2a_real_runs_20261101
```

输出/更新：

- `manifest.json`
- `reports/collection_progress.md`
- `reports/data_integrity_report.md`
- `analysis/preliminary_metrics.csv`

## 7. 逐局登记表

| 编号 | 难度 | 角色 | runId | 结果 | 波次 | 完整性 | JSON 文件 |
|---|---|---|---|---|---|---|---|
| 001 | normal |  |  |  |  |  |  |
| ... |  |  |  |  |  |  |  |
| 024 |  |  |  |  |  |  |  |

> 24 局完成前不做数值调整；完成后再出描述性统计与 M2-B 候选方案。
