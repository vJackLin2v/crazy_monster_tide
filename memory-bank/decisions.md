# 已确认决策（D-*）

> 规则：已确认的决策**不得被 Agent 自行推翻**；要改必须由用户显式批准。

## D-01 项目命名

- **状态**：已确认（2026-10-12 用户拍板「可以」）。
- **决策**：中文名《疯狂怪潮》，工程代号 `crazy-monster-tide`，路径 `H:\AI-game\crazy_monster_tide`。
- **依据**：2026-10 微信小游戏榜单调研。畅销榜头部含《疯狂水世界》《向僵尸开炮》《无尽冬日》，
  2026 年 9~10 月人气榜新入榜含《开局一条枪》《有种来闯关》《解压来捞菜》。
  命名词式归纳见 `docs/requirements.md` §11。
- **备注**：上线前仍需平台名称查重 + 商标检索（`requirements.md` §12 Q6）；备选名已登记。

## D-02 引擎

- **决策**：正式实现使用 **Cocos Creator + TypeScript**（版本与环境对齐待确认）。
- **依据**：目标平台为微信 / 抖音小游戏；Godot 无法导出小游戏平台（参考 `H:\AI-game\行囊守卫` 的迁移记录）。
- **状态**：已确认（2026-10-12 用户拍板「对齐」）。
- **版本锁定**：**Cocos Creator 3.8.6**，与 `H:\AI-game\xingnang\cocos_port`（package.json `creator.version = 3.8.6`）**完全对齐**。

## D-03 先原型后引擎

- **决策**：必须先完成**可玩的 HTML MVP** 并确认 UI，再进入引擎实现。
- **依据**：`requirements.md` §9；母本工程源码经验（UI 反复试错成本高）。

## D-04 母本素材与素材门禁

- **决策**：`pixel_roguelike_wechat_agent_kit` 的素材**只能作为来源池**，进入本工程前必须
  逐个过 Asset Gate（来源 / 授权 / 商用 / 可改），并完成归一化登记。
  迁移这一动作本身也需用户批准（`requirements.md` Q2）。
- **状态**：已确认（2026-10-12 用户拍板「可以迁移作为备选素材」）。迁移后进入**备选池**，仍须逐个过 Gate 并完成归一化登记。
- **依据**：`docs/assets/asset_license.md`；禁止「目录里有就直接用」。

## D-05 关键平台约束

- **决策**：竖屏 **360 x 640**、fitWidth、Nearest 过滤、触摸优先、动态摇杆、
  战斗期不出现大块技能按钮。
- **依据**：`requirements.md` §3 §4 §0；`docs/ui/screen_specs.md`。

## D-06 合规红线

- **决策**：项目**禁止赌博语义**：老虎机 / 转盘 / 骰子 / 筹码 / 下注 / 赔率 / 开箱 / 付费随机抽取，
  包括 UI 与视觉隐喻。
- **依据**：`AGENTS.md` §11；平台审核风险。

## D-08 世界观包装

- **决策**：**像素奇幻**（pixel fantasy）。
- **依据**：2026-10-12 用户拍板。
- **影响范围**：`docs/assets/asset_style_guide.md` 的视觉母题、事件文案、角色/怪物命名风格、UI 装饰元素。

## D-09 UI 参考锁定 Möbelmon

- **决策**：UI 参考锁定 <https://www.bran.organic/projects/mobelmon-ui/>（用户指定）。
- **落地**：素材下载至 `assets/ui-reference/mobelmon/`（22 个文件），结构化分析见
  `docs/ui/reference-library/mobelmon-analysis.md`。
- **边界**：状态 **reference_only**，不得进 `assets/approved/`，不得复制其美术 / 文案。
- **已采纳 Pattern**：夜幕底 + 单强调色、战斗 HUD 贴边、横向 3 卡、粗描边硬投影、大圆角。

## D-10 玩家可读性硬要求

- **决策**：怪潮密集时必须能一眼找到玩家 → 玩家脚下常驻脉冲定位环 + 玩家 sprite 永远画在最上层。
- **依据**：VLM 目视评审反馈（`docs/ui/reference-library/self-critic-vlm.md`）+ `docs/ui/ui_principles.md` §3。

## D-07 里程碑制

- **决策**：一次只做一个里程碑，做完停下等用户确认；禁止连续推进多个里程碑。
- **依据**：用户显式要求（见 `AGENTS.md` §7）。
