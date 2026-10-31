# 性能预算

## 设计约束

- 事件环最多 300 条，超出 `shift()`；
- 性能采样 1Hz，单条小对象；
- 只在每局结束写一次 localStorage；
- 遥测方法全部可选链，关闭时零调用；
- 不遍历节点，直接用现有数组长度与 update 计时。

## 估算

- 单局短局实测 JSON 5.3KB（14 事件、1 技能、3.5s）——见 `test_report.md`；
- 满 300 事件 + 20 波 + 18 技能/模块，单局约 30~80KB；
- 50 局上限约 1.5~4MB（微信 localStorage 上限通常 10MB，超出会写入失败）；
- 写入失败被捕获，不影响游戏。

## 实测

- `performanceSample.updateMs` 由 `performance.now()` 在 Battle.update 首尾测量；
- 未做 CPU profiler；未测真机。
- 峰值指标随对局写入记录（peakEnemies/peakBullets/peakAreas/peakEventsPerSec/peakUpdateMs）。
