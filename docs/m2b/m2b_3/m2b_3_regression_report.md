# M2-B.3 回归报告

## 1. 全量测试

- 命令：tsx tests/run.ts
- 结果：550 PASS / 0 FAIL
- 基线：536 PASS
- 新增：14 条
  - rapid 六条（普通三级 + 法师三级）
  - 商店 requires 提示四条
  - 商店购买/保留/后续安装/出售四条
- 旧测试全部保留，没有删除或弱化。

## 2. TypeScript / UI 检查

- tsc -p tsconfig.check.json：0
- tsc -p tsconfig.ui-check.json：0

## 3. pulse 回归

- M2-B.1 的 §29 pulse 测试仍在，全部 PASS。
- pulse 修复代码未改动。
- 商店/rapid 修改没有触碰 Battle.pulse 逻辑。

## 4. 商店购买流程回归

自动化已覆盖：

- 暂时不兼容模块仍可购买；
- 购买后进入 modsBag；
- 当前技能仍不能安装（规则未变）；
- 获得兼容技能后可安装；
- 可出售清出背包。
- 商店池/价格/概率/按钮状态未改。

## 5. 微信构建

- 命令：cmd /c "build-wechat.bat -nopause"
- 结果：success
- 主包 / 总计：3.14MB / 10.98MB
- index.js：334,283 B（2026-11-01 15:10:28）
- 未做微信真机验证

## 6. 浏览器 UI 验证

debug web build，真实 GameRoot/商店路径：

- 有兼容：需要：投射物
- 无兼容：暂无兼容，可留用 · 需要：投射物
- 多条件：需要：投射物/范围/脉冲/连锁
- 法师 rapid_2：Lv.2 · 冷却 -22.6%

截图：

- deliverables/m2b3_ui_shop.png
- deliverables/m2b3_ui_shop_incompatible.png

## 7. 未解决问题

- 微信真机未验证。
- 商店提示在极长组合下可能截断第二行数值；requires 提示放在首行，完整保留。
- rapid 公式注释与实现（0.85 vs 0.8523）的语义仍需设计确认，本轮未改公式。
- 未改商品池过滤；是否过滤留给产品决策。
