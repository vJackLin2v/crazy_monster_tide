# M2-A 测试报告

> 结论：**503 PASS / 0 FAIL**；tsc check/ui-check = 0；微信构建成功；浏览器运行时遥测落盘成功。
> 未做微信真机。

## 命令

    cd cocos
    tsc -p tsconfig.check.json      -> 0
    tsc -p tsconfig.ui-check.json   -> 0
    tsx tests/run.ts                -> 503 PASS / 0 FAIL

## 新增测试（§28）

覆盖：

1. runId/schemaVersion；
2. 对局结束只结算一次；
3. 波次开始/结束配对；
4. 技能 cast/hit/damage 不重复；
5. echo 单独 cast；
6. 黑科技加成与直接伤害分开记账；
7. 击杀归属；
8. 治疗归因；
9. 玩家承伤；
10. 商店展示/购买/刷新计数；
11. 完整对局标记；
12. 事件环 ≤300；
13. 单局 JSON 可解析；
14. 存储写入/覆盖/读取；
15. 多局互不覆盖；
16. 聚合胜负；
17. 技能总伤害聚合；
18. 损坏数据兜底；
19. 旧版本记录可读；
20. 50 局裁剪；
21. 高频事件不无限增长；
22. NaN/Infinity/负数不抛错；
23. 中断对局不算 complete；
24. 清空存储；
25. 续玩沿用原 runId 与已有统计；
26. 续玩结束前不是 complete；
27. 续玩结束仍是同一局。

## 浏览器运行时（web-mobile）

`node tools/ui/verify_m2a.cjs`：

```json
{"midAgg":{"runs":0},"agg":{"runs":1,"deaths":1,"avgMaxWave":1,"byDifficulty":{"normal":1}},
 "record":{"complete":true,"waves":0,"skills":1,"modules":0,"events":14,"skillDamage":42},
 "size":5330,"errors":"none"}
```

说明：脚本运行 3.5s 后手动结算，波次未完成故 waves=0；技能伤害/事件/落盘均正常。

## 构建

微信小游戏：3.11MB / 10.95MB（构建时间见交付包 build_report）。
