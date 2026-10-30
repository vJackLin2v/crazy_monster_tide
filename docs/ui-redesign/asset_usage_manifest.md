# UI 素材清单与授权记录（asset_usage_manifest）

> 项目：《疯狂鸽王》（crazy_monster_tide）·UI 专项改造
> 记录人：开发 Agent　｜　更新：2026-10-28
> 规则：只有**实际检查过许可证并实际使用**的文件才标记「已核实 / 已使用」。

---

## 1. 结论速览

| 项 | 结果 |
|---|---|
| 主 UI 素材包 | **Kenney Pixel UI Pack**（CC0 1.0）——唯一进入游戏的一套 |
| 获取方式 | 官方站点 kenney.nl，0 元下载（`Continue without donating...`），未购买任何 All-in-1 合集 |
| 下载文件 | `kenney_pixel-ui-pack.zip`（141,881 字节，2026-10-28 下载） |
| 原始包保存位置 | `assets/ui/third_party/kenney_pixel_ui_pack/`（含 `License.txt`、`9-Slice/`、`Spritesheet/`、`Preview.png`） |
| 游戏内使用文件 | `cocos/assets/resources/ui/kenney/*.png`（19 张，由 `tools/art/gen_ui_kit.py` 从原始 9-Slice 重上色生成） |
| 生成脚本 | `tools/art/gen_ui_kit.py`（可复跑，产物可重建） |
| 素材总览图 | `docs/ui-redesign/ui_kit_overview.png`（含 3 种尺寸的九宫格拉伸验证） |
| 是否需要游戏内署名 | **不需要**（CC0），但项目仍在 `docs/ui-redesign/ui_credits.md` 保留致谢文本 |

---

## 2. 来源与许可证原文

**Resource pack**：Pixel UI pack — by Kenney Vleugels for Kenney (www.kenney.nl), with help by Lynn Evers.
**Official page**：https://kenney.nl/assets/pixel-ui-pack
**License**：Creative Commons Zero (CC0 1.0) — https://creativecommons.org/publicdomain/zero/1.0/
原文（`License.txt`，随原始包保存）：

> You may use these graphics in personal and commercial projects.
> Credit (Kenney or www.kenney.nl) would be nice but is not mandatory.

> ⚠️ 下载注意：kenney.nl 的下载链接是**短时效签名链接**（形如
> `https://kenney.nl/download/<hex路径>/<hmac>?expires=<epoch>`）。直接抓取时链接可能已过期，
> 返回 403「Download link expired or invalid」；先带随机参数重新打开资源页拿到新签名再用同一会话下载即可。
> 本次已实测通过，下载到的 ZIP 内含 `License.txt`（CC0）。

---

## 3. 逐文件清单（原始 → 项目）

原始素材全部来自 `9-Slice/`（48×48、每张只有 3~4 种颜色：底 / 高光 / 暗边 / 角标）。
生成脚本把这几个颜色**替换成项目暗色调色板**，四周补 2px 近黑描边，输出 52×52（九宫格边距 10px）。

| # | 原始文件（Kenney） | 项目文件（cocos/assets/resources/ui/kenney/） | 用途 | 修改记录 |
|---|---|---|---|---|
| 1 | 9-Slice/Ancient/white.png | panel.png | 通用面板底（模态、详情、列表容器） | 重上色 → 底 #2A2A3A / 内暗边 #171721 / 外亮边 #6A6A85；+2px 黑边 |
| 2 | 9-Slice/Ancient/white.png | panel_soft.png | 次级面板 / 行底 / 暂停键底 | 提亮一档（#34344A） |
| 3 | 9-Slice/space.png | well.png | 内凹槽（空技能槽、详情里的技能条） | 压暗凹面 |
| 4 | 9-Slice/space.png | slot.png | 技能槽 / 图标槽 | 提亮凹面 |
| 5 | 9-Slice/Colored/grey.png | btn.png | 普通按钮 | 灰底 → #3A3A48 |
| 6 | 9-Slice/Colored/grey_pressed.png | btn_pressed.png | 普通按钮按下态 | 压暗 |
| 7 | 9-Slice/Colored/yellow.png | btn_primary.png | 主按钮（开始 / 继续 / 购买） | 黄 → 项目橙 #F5A623 |
| 8 | 9-Slice/Colored/yellow_pressed.png | btn_primary_pressed.png | 主按钮按下态 | 压暗 |
| 9 | 9-Slice/Colored/red.png | btn_danger.png | 危险按钮（确认 / 退出） | 橙红 → #E8452F |
| 10 | 9-Slice/Colored/red_pressed.png | btn_danger_pressed.png | 危险按钮按下态 | 压暗 |
| 11 | 9-Slice/Colored/grey.png | btn_disabled.png | 禁用态 | 去高光、压到 #2A2A34 |
| 12 | 9-Slice/Outline/yellow.png | card_sel.png | **当前选中**卡（角色卡、页签选中） | 白底 → 暗蓝底，黄描边 → 青 #46C8D8 |
| 13 | 9-Slice/Outline/yellow.png | card_gold.png | 稀有 / 重点（金色语义） | 描边 → #FFD24A |
| 14 | 9-Slice/Outline/yellow.png | rim_blue.png | 属性类卡片描边 | 描边 → #5AA9FF |
| 15 | 9-Slice/Outline/yellow.png | rim_purple.png | 道具（高级）描边 | 描边 → #A06BFF |
| 16 | 9-Slice/Outline/yellow.png | rim_green.png | 技能强化 / 回复类描边 | 描边 → #6AD86A |
| 17 | 9-Slice/Outline/yellow.png | rim_red.png | 危险 / 失败描边 | 描边 → #FF5A5A |
| 18 | 9-Slice/Outline/yellow.png | rim_cyan.png | 黑科技（模块）描边 | 描边 → #46C8D8 |
| 19 | 9-Slice/list.png | list_row.png | 列表行底（备用，当前未大面积使用） | 白 → 深灰 |

> 19 张全部为 **NEAREST** 过滤、九宫格 10px 边距（`SpriteFrame.inset*` 在 `Assets.loadUi()` 里设置）。
> 四角在任何尺寸下都不拉伸；边与中心只有纯色中段被拉伸，不会出现像素边缘变形。

---

## 4. 使用了原始包的哪些部分

| 原始内容 | 是否使用 | 说明 |
|---|---|---|
| 9-Slice/Ancient/* | 用 white | 只取一张作为面板底，brown/tan/grey 未用——避免同一游戏出现两套边框色 |
| 9-Slice/Colored/* | 用 grey / yellow / red | blue/green 未用（语义由描边版承担） |
| 9-Slice/Outline/* | 用 yellow 一张，换描边色 | 保证所有"选中/稀有"框线宽完全一致 |
| 9-Slice/space.png、list.png | 使用 | 凹槽与列表行 |
| Spritesheet/UIpackSheet_transparent.png | 未使用 | 内含大量图标/箭头，与本作既有 32×32 图标体系风格不匹配；按"一套主视觉"原则不混入 |
| Preview.png / .url | 仅作核对 | 预览图不是素材 |

---

## 5. 评估过但不采用

| 候选 | 官方 URL | 结论 |
|---|---|---|
| Kenney UI Pack - Pixel Adventure（CC0，第二候选） | https://kenney.nl/assets/ui-pack-pixel-adventure | **未使用**。主包已覆盖面板/按钮/槽位/状态条；第二套边框线宽与斜面结构不同，混用会破坏"一套边框"。 |
| Foozle Critters Pixel UI（CC0 / name your own price） | https://foozlecc.itch.io/critters-pixel-ui | **未下载、未使用**。仅参考其"完整页面如何组织"（HUD 分区、商店=左网格+右详情），素材不进入本项目。 |
| Kenney UI Pack - Adventure（CC0） | https://kenney.nl/assets/ui-pack-adventure | 未使用：本作是俯视割草，不需要冒险界面的羊皮纸对话框。 |
| Fusion Pixel Font（中文字体候选） | https://github.com/TakWolf/fusion-pixel-font | **未引入**，理由见 §6。 |

---

## 6. 字体决策（单独审查）

- **现状**：引擎内置系统字体 + 2px 黑描边 + 4px 硬投影。
- **候选**：Fusion Pixel Font（像素中文字体，许可证需逐文件核对，字形按 12px 网格设计）。
- **不采用的实测理由**：
  1. 本作字号阶梯 9/10/11/12/13/14/16/17/19/20/24/26/38/44，**多数不是 12 的整数倍**；
     像素字形在非整数倍下笔画粗细不均，比系统字体更糊。
  2. 完整简体字库约 3~5 MB，微信小游戏首包体积敏感，收益只在 12/24px 两档。
  3. 现有系统字体在 360 设计宽下 10~13px 中文清晰、无方框字、无回退字体混排（截图逐页核对）。
- **结论**：保持系统字体，不新增字体依赖。若要做"全中文像素字"，需先把字号阶梯整体改成 12 的倍数，
  属于新一轮规格变更，不在本次范围。

---

## 7. 复现方式

    # 1) 原始包已在 assets/ui/third_party/kenney_pixel_ui_pack/
    python tools/art/gen_ui_kit.py     # 重生成 19 张九宫格 + .meta + 总览图

生成脚本不做凭空绘制：只做颜色替换、加 2px 黑边、导出 PNG 与 Cocos meta。
原始 48×48 素材没有改形；如需回退，删除 `cocos/assets/resources/ui/kenney/` 即可，
UIKit 会自动退回 Graphics 绘制。

---

## 8. 未核实 / 待办

- [x] 许可证文件已读到原文（CC0 1.0）并随原始包保留
- [x] 下载文件名、URL、字节数已记录
- [x] 实际使用位置逐张记录
- [ ] 微信真机（iOS 刘海 / Android 挖孔）安全区实测 —— 仍未做，见交付报告「未验证」
