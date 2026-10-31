# 主菜单 / 战绩 V2 素材清单（menu_history_v2_asset_inventory）

> 原则：优先复用现有像素素材；缺的用"现有素材组合 + 文字/图形"，不引入风格不一致的新图。

## 1. 现有素材

| 类别 | 路径 | 数量/示例 | 用途 |
|---|---|---|---|
| 角色立绘 | `art/units/<unit>/portrait.png` | 6 个角色单位（swordswoman/mage/archer/adv-spearman/adv-mage/prism-swordsman） | 主菜单角色展示、历史卡片头像、详情头图 |
| 角色动画帧 | `art/units/<unit>/*.png` | 同上 | 战斗（本轮不改） |
| 技能图标 | `art/icons/skill-*.png` | 经 `SKILL_ART[].icon` 引用 | 详情技能构筑、升级卡 |
| 道具图标 | `data/IconMap.ITEM_ICON` → `art/icons/*` | 70+ | 详情道具网格、商店 |
| 黑科技图标 | `MODULE_ICON` | 18 | 详情技能下黑科技 |
| UI 九宫格 | `assets/resources/ui/kenney` | `UI_ART_NAMES`（panel/slot/btn/rim…） | 所有面板/按钮/槽位 |
| 背景 | `art/bg/home-bg-360x640.png` | 1 | 主菜单背景 |
| 战斗背景 | `art/bg/battle-floor-620x940.png` | 1 | 战斗（不变） |
| 特效 | `art/vfx/*` | 4000+ | 战斗（不变） |

## 2. 本轮使用

| 页面 | 元素 | 素材 |
|---|---|---|
| 主菜单 | 背景 | `home-bg-360x640` + 暗角色带 |
| 主菜单 | 角色展示 | `Assets.loadPortrait(unit)` + 像素平台（Graphics）+ 现有 slot 框 |
| 主菜单 | 继续卡 | `panel` / `slot` / 文字 |
| 主菜单 | 次级入口 | `slot` 40×40 + 单字（战/册/勋/设） |
| 战绩列表 | 角色头像 | `loadPortrait` + slot 框 |
| 战绩列表 | 结果标识 | 文字徽标（胜/败/弃/尽）+ 颜色 |
| 战绩详情 | 技能 | `SKILL_ART[].icon`（`loadIcon`/`iconFrame`） |
| 战绩详情 | 道具 | `ITEM_ICON` |
| 战绩详情 | 黑科技 | `MODULE_ICON` |

## 3. 缺失素材与解决方式

| 缺失 | 解决 | 许可 |
|---|---|---|
| 战绩/图鉴/成就/设置 专用图标 | 用 `slot` 框 + 单个汉字（战/册/勋/设），与像素 UI 同源 | 项目自有 |
| 结果徽章（胜利/失败）图标 | 暂用文字徽标 + 描边色（不新增图） | 项目自有 |
| 角色待机动画（菜单） | 用 portrait 静态图 + 轻微上下浮动（Tween 由 update 驱动或静态） | 项目自有 |

## 4. 许可

- 角色/怪物/技能/道具图标：项目既有素材（已过 Asset Gate，见 `docs/assets/`）；
- UI 九宫格：Kenney Pixel UI Pack（CC0）；
- 本轮**未新增任何外部素材**。
