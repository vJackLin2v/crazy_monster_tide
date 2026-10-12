# 疯狂怪潮 · 竖屏 HTML MVP

Möbelmon 式竖屏单手 UI 的可玩原型。**这是可玩原型，不是静态视觉稿。**

## 怎么跑

```bash
# 方式一：直接双击 index.html（源码用普通 <script>，file:// 可跑）
# 方式二：本地起服（推荐，行为与真机更接近）
python -m http.server 4173 --directory prototype-html
# 打开 http://127.0.0.1:4173
```

## 操作

| 操作 | 说明 |
|---|---|
| 按住屏幕任意处拖动 | 动态摇杆（触点落下处生成，松开消失） |
| 技能 | **全自动开火**，玩家只需走位 |
| 右上 `II` | 暂停 → 遮罩 + Build 抽屉（技能 / 行为 / 道具 / 属性 4 页签） |
| 升级 | 自动弹横向 3 选 1；选到行为模块会进入「安装目标」步骤 |

## 一局怎么打（波次闯关）

```
第 1 波(20s) → 商店 → 第 2 波(24s·精英) → 商店 → 第 3 波(28s)
→ 商店 → 第 4 波(32s·精英) → 商店 → 第 5 波(BOSS·击杀即通关) → 结算
```

- 非 BOSS 波：**撑到倒计时归零即过关**，场上残余怪清空
- 波间商店：买道具 / 行为模块 / 属性，可花金币刷新货架
- 升级：波内经验满即弹 3 选 1（不打断节奏，自动暂停）

## 文件结构

```
index.html            结构（9 个屏幕容器 + canvas 舞台）
src/tokens.css        Design Token（色值来自 Möbelmon 截图实测）
src/app.css           布局样式
src/data.js           数据层：像素精灵（字符画）/ 12 技能 / 12 行为模块 / 10 属性 / 10 道具 / 6 角色 / 地图参数
src/engine.js         引擎层：RNG、玩家、技能开火、伤害、敌人、子弹、区域、拾取
src/flow.js           流程层：树形地图生成、升级奖励、节点结算、商店、事件、结算
src/render.js         渲染层：像素精灵缓存、摄像机、背景、实体、VFX、伤害数字
src/ui.js             UI 层：屏幕管理、摇杆、Build 面板、主循环
```

## 已实现（对照 `docs/ui/prototype_gate.md`）

- 主界面：标题 + 开始游戏 + 玩法说明
- 角色选择：6 角色网格换行（3x2）+ 正负天赋 + 初始技能
- 波次闯关：5 波 + 倒计时 + 精英波 + BOSS 波 + 波间商店（含刷新）

- 战斗：动态摇杆、4 技能自动开火、怪潮、伤害数字、受击白闪、击退、玩家定位环
- 升级 3 选 1：技能 / 行为模块 / 道具 / 属性 四类
- 行为模块：3 槽位 / 兼容性判定 / 可重复安装（多重、扇射、分裂、反弹、穿透、环绕、巨大、急速、回响、灼烧、冰缓、吸血）
- Build 面板：4 页签，支持卸下与搬家
- 结算（统计 + 本局 Build 回顾）
- 固定 Seed：同 seed 同地图、同奖励组（可复现）

## 未实现（按 `prototype_gate.md` 待补）

- 精英 / BOSS 的专属演出与技能、BOSS 常驻血条
- 属性页的实时增减预览、卡片的禁用态 / 满级态
- 音效与音乐
- 参考案例补齐到 >= 3 个后再冻结 UI

## 验证

```bash
# 玩家流程 E2E（三档竖屏视口 + 固定 seed）—— 50 PASS / 0 FAIL
NODE_PATH="H:/AI-game/pixel_roguelike_wechat_agent_kit/node_modules" node tests/e2e_mvp.cjs

# 静态门禁（对比度 / 热区 / 像素级可读性 / 因果链 / 确定性 / 合规）—— 19 PASS / 0 FAIL
NODE_PATH="H:/AI-game/pixel_roguelike_wechat_agent_kit/node_modules" node tests/gate_mvp.cjs
```

截图产物：`screenshots/`（3 视口 x 6 屏）。

## 合规

- 所有像素精灵由本工程用**字符画程序化生成**，未使用任何第三方美术素材。
- Möbelmon 仅作**设计参考**（`assets/ui-reference/mobelmon/`，reference_only），
  其美术 / 文案 / 图标一律未进入本原型。
