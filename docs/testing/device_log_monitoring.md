# 真机行为日志监听（device_log_monitoring）

> 目的：真机实测时，把玩家的**真实行为**（点继续还是开新局、死在第几波、商店买什么、升级跳不跳）
> 记下来，事后可复现问题、校准难度与经济。

## 1. 记录什么

代码：`cocos/assets/scripts/game/DeviceLog.ts`（事件）+ `game/Telemetry.ts`（每局/每波/商店）。

| 事件 | 触发 | 关键字段 |
|---|---|---|
| `session_start` | 启动 | platform / model / system |
| `menu_shown` | 主菜单出现 | save: ok/none/corrupt，wave，char |
| `menu_continue` / `menu_start` | 点继续 / 开始 | — |
| `start_confirm_shown` / `_continue` / `_abandon` / `_back` | 有存档时点开始 | wave |
| `save_discard` | 清坏档 | — |
| `difficulty_pick` / `char_pick` | 选难度 / 选角色 | id |
| `run_start` / `run_resume` | 新局 / 续玩恢复 | char, difficulty, wave, phase, seed |
| `wave_clear` | 一波结束 | wave |
| `player_dead` / `run_clear` | 阵亡 / 通关 | wave, difficulty |
| `levelup_open` / `levelup_pick` | 升级三选一 | lv, cards, kind, id, pick(-1=跳过) |
| `shop_open` / `shop_buy` / `shop_reroll` / `shop_leave` | 商店 | wave, gold, id, price, cost |
| `pause_open` / `quit_cancel` / `quit_save` / `quit_abandon` | 暂停与返回菜单 | wave, hp |
| `run_end` / `result_shown` | 结算 | result, wave, duration, kills |
| `page_view` | 战绩/图鉴/成就/设置/玩法说明 | page |
| `js_error` / `js_rejection` | 全局异常 | msg（截断 300 字） |

**不记录**：账号、昵称、openid、位置、聊天/输入内容、通讯录。机型信息只用于区分设备。

两套日志：

- `cmt_device_log_v1`：行为事件，环形缓冲 **600 条**；
- `cmt_log_v1`：每局/每波/商店经济（最多 20 局），原有 Telemetry。

## 2. 真机上怎么拿日志

### 方式 A：微信开发者工具「实时日志」（最方便）

1. 真机预览/调试启动游戏；
2. 开发者工具 → **调试器 → 实时日志**（或小程序后台 → 运维中心 → 实时日志）；
3. 过滤 `[CPK]`，即可看到逐条事件；
4. 复现问题后，把这一段时间的日志复制/导出。

### 方式 B：本地缓冲导出（需要能进调试控制台）

在开发者工具 Console 里执行：

```js
__deviceLogDump()    // 打印 JSON（可直接复制）
__deviceLogCount()   // 条数
__deviceLogClear()   // 清空
__logDump()          // 每局 Telemetry JSON
```

也可以直接读存储：

```js
wx.getStorageSync('cmt_device_log_v1')
wx.getStorageSync('cmt_log_v1')
```

> 上线版没有 vConsole 时，以「实时日志」或后台日志为准；本地缓冲只作为补充。

## 3. 日志怎么给我

把 JSON 存成文件（或直接粘贴文本）发我，例如：

```
deliverables/device_logs/2026-10-31_session.json
```

我运行：

```bash
node tools/analyze_device_log.cjs <日志文件>
```

输出示例：

```
启动次数: 1（devtools / iPhone 13 ×1）
菜单展示: 3 次（有存档 2，无存档 1）
继续游戏点击: 2 · 开始游戏点击: 1
新游戏确认: 弹出 1 · 继续 1 · 放弃并开始 0 · 返回 0
新开局: 1 · 续玩恢复: 2 · 结算: 1
死亡波次: 第3波×1
升级出现: 4 · 选卡: 4 · 跳过: 1（25%）
进店: 2 · 购买: 3 · 刷新: 1
JS 报错/拒绝: 0
```

## 4. 我会重点分析什么

1. **首屏漏斗**：启动 → 菜单 → 继续/开始 → 实际进局，卡在哪一步；
2. **继续 vs 新局**：有存档时是否真的点继续、确认弹窗三选分布；
3. **死亡波次分布**：难度曲线是否在某波陡增（结合 Telemetry 每波耗时/承伤）；
4. **商店行为**：进店次数、购买率、刷新次数、常买道具（校准金币/价格）；
5. **升级选择**：跳过率、技能/道具偏好；
6. **异常**：`js_error` / `js_rejection` 的堆栈与出现场景；
7. **留存线索**：同一 session 内开几局、是否反复续玩/放弃。

## 5. 真机验收建议操作

1. 清空本地日志（`__deviceLogClear()`，或新装包）；
2. 完整走一遍：无存档 → 开始 → 死一局 → 再来一局 → 暂停保存退出 → 继续游戏 → 再死；
3. 再走一遍有存档时点「开始游戏」→ 三选各试一次；
4. 打开战绩/图鉴/成就/设置/玩法说明各一次；
5. 把实时日志或 JSON 发我，我输出行为分析 + 问题清单。

## 6. 注意

- 日志只用于玩法分析，不含个人信息；对外分享前可先 `__deviceLogClear()` 清掉旧数据。
- 实时日志有平台侧采样/保留时间限制；要完整数据优先用方式 B 导出 JSON。
- Web 端同样会记录（localStorage），排查网页版问题时可直接 `__deviceLogDump()`。
