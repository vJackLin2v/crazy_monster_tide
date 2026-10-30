# 《疯狂鸽王》项目状态总结（2026-10-30）

> 引擎：Cocos Creator 3.8.6 ｜ 平台：微信小游戏 ｜ 分辨率：360×640 竖屏
> AppID：`wx8a25bc49632e9b92` ｜ 主包 3.02MB / 上限 4MB ｜ 总包 10.84MB / 上限 20MB
> 仓库：https://github.com/vJackLin2v/crazy_monster_tide

---

## 1. 玩法一句话

**玩家只负责走位，技能自动开火**；4 个技能 × 每个技能 3 个黑科技槽，20 波怪物推进，构筑成型后一键清场。

## 2. 已完成的功能模块

| 模块 | 状态 | 说明 |
|---|---|---|
| 主菜单 | ✅ | 标题下移、动作栈上移；音乐/音效/图鉴/成就/设置入口 |
| 选角色 | ✅ | 6 角色，形象与初始技能一一对应；正负天赋 + 6 项数值 |
| 战斗 HUD | ✅ | 血条（6 层泛光警示）/经验/金币/波次/击杀/倒计时；避让微信胶囊 |
| 升级三选一 | ✅ | 属性 / 道具 / 新技能 / 黑科技卡；长文本按行数截断不遮挡 |
| 波间商店 | ✅ | 4 货架、锁定、刷新、持有标记；金币在标题左侧，价格为金币图标 |
| 构建抽屉 | ✅ | 技能/黑科技/道具/属性 4 页；黑科技页可滚动；技能可主动丢弃（至少留 1 个） |
| 结算页 | ✅ | 击杀/等级/金币/伤害 + 本局道具图标行；通关可继续无尽 |
| 图鉴 | ✅ | 4 页签滚动列表；未遇到显示「？？？」；点击弹详情卡 |
| 成就 | ✅ | 滚动列表 + 进度 |
| 设置 | ✅ | 音乐/音效、特效透明度（100/75/50/25/0）、屏幕震动、受击红屏；调试构建才有日志导出；底部显示版本号 |
| 战斗系统 | ✅ | 18 种怪物 + 6 BOSS、精英词缀、AI（冲锋/拍地）、死亡尸体回收 |
| 数值/日志 | ✅ | `Balance.ts` 全参数可配置（localStorage 覆盖）；`Telemetry.ts` 每波一行日志 |

## 3. 关键数值现状

- 刷怪：`interval = max(0.34, 0.62 - 0.016×wave)`，`batch = min(3, 1+floor(wave/4))`，峰值 8.82/s
- 同屏：软上限 40、硬上限 60，超限减速 1.6×
- 怪物成长：HP +18%/波，伤害 +10%/波
- 模块：单模块上限 3；`_2` 合成效果 ×1.6、容量算 2；吸血 4%、荆棘 6%
- 角色：6 个，初始技能 = 回旋刃 / 奥术 / 灵能箭 / 冰晶矛 / 陨石 / 圣光弹

## 4. 代码结构

```
cocos/assets/scripts/
├── core/        Balance.ts（可配置数值） BuildTag.ts（构建标记） Tokens.ts
├── data/        Chars / Skills / Modules / Items / Enemies / UnitFrames
├── engine/      Assets / Audio / Save / Camera2D
├── game/        RunState / Progress / Achievements / Telemetry / Prefs / ModuleScale
├── battle/      Battle.ts（主循环、敌人、技能、VFX）
├── ui/          UIKit / Hud / MenuScreens / Modals / ManageScreens / MetaScreens / CodexScreens / ScrollView / Safe
└── GameRoot.ts  场景状态机（menu / charselect / battle / levelup / shop / result）
```

## 5. 验证状态

- 单元测试：`tsx tests/run.ts` → **PASS 163 / FAIL 0**
- 类型检查：`tsc -p tsconfig.check.json` → exit 0；UI 专项 `tsconfig.ui-check.json` → exit 0
- 构建：web-mobile ✅ / wechatgame ✅（`tools/build-wechat.ps1` 一键构建 + 自检 BOM/JSON/包体）
- 布局审计：字形级溢出审计（商店/抽屉/升级卡）→ 0 处裁切
- 滚动：`ui/ScrollView.ts`（Mask GRAPHICS_RECT + 全局 input + 节点事件双通道）已实测可拖动

## 6. 已知问题 / 待办

1. 真机（iOS/Android）尚未完成完整回归：安全区、胶囊避让、触摸边缘、长时间帧率；
2. 数值仍需真机数据回收后调优（刺猬/吸血/雷击）；
3. 图鉴“看到即解锁”规则偏宽松（商店摆出即算），如需可改为“击杀/拾取才算”；
4. 成就只有 27 条，缺少长期目标；
5. 音效/music 资源为占位，需要正式音源。

## 7. 页面截图

见 `screenshots/` 目录（01~17），覆盖：菜单 / 选角色 / 玩法说明 / 设置 / 图鉴四页 / 成就 / HUD / 升级 / 抽屉四页 / 商店 / 结算。
