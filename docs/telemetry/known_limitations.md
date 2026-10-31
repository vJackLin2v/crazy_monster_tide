# 已知限制（M2-A）

## 数据归因

1. **延迟弹体/区域的技能归因**：M2-A.2 已绑定攻击对象来源；M2-A.3 补齐 DoT/反伤击杀归因，killEnemy 缺省 unknown，不再回退最近施法。仅无来源召唤物/模块伤害标 unknown。
2. **模块加成拆分**：shatter/emberstack/execute 等“乘区加成”只增加总伤害，未拆成 module_damage；技能 damageTotal 包含加成，moduleBonus 仅记录了显式传入值（当前未传）。模块直接伤害（killblast/voltloop/thunder）有独立 module_damage。
3. **item_effect 事件未实现**：道具生效点分散，当前仅记录 item_purchase/item_acquire。
4. **减伤/护盾避免伤害**：damagePrevented 未精确统计，列入 unsupportedMetrics。
5. **控制持续时间**：未统计（无统一控制状态机）。

## 续玩/完整性

6. 续玩用同 runId 并从 Store `resumeFrom` 合并已有统计；若上一次进程在写盘前崩溃，已丢失部分数据。
7. 异常中断不会自动落盘（只有 finishRun 写）；如需强一致需定时 checkpoint（M2-B）。

## 验证范围

8. 仅纯逻辑单测 + 浏览器运行时；**未做微信真机**。
9. 未做 CPU profiler；性能只测 updateMs 峰值与事件/实体数量。
10. DEBUG 查看页仅 DEBUG 构建可见，release 包无入口；未做正式 UI 设计。
