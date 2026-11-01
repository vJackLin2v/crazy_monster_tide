# 黑科技统一底框（跨类图标辨识）

## 修改

- ui/Modals.ts：商店模块图标槽加 40×40 rim_cyan 底框。
- ui/ManageScreens.ts：安装屏模块图标槽加 22×22 rim_cyan 底框。
- 不改任何图标素材、不动道具/黑科技效果。

## 目的

同一图标既代表全局道具又代表单技能黑科技时，玩家可通过黑科技底框区分；覆盖 05_重复图标 中 11 组道具↔黑科技跨类重复。

## 验证

- tsc check = 0；tsc ui-check = 0
- tests/run.ts = 558 PASS / 0 FAIL
- 浏览器商店截图：deliverables/m2b3_ui_shop_incompatible.png（模块图标均带青色底框）
- 微信构建：3.14MB / 10.97MB；index.js 333,565 B（2026-11-01 15:41:32）

## 未处理

- 技能图标 4 组重复、道具 27 件共用 14 图标，仍未换图；
- 冰系/冷却数值、技能定位、tier/文档问题未动。
