# 项目现状

| 项 | 值 |
|---|---|
| 项目 | 《疯狂鸽王》 / `crazy-monster-tide` |
| 工程 | `H:\AI-game\crazy_monster_tide` |
| 阶段 | **M16 完成：Cocos 11 屏按 UI 规格 v1.1 重做并实机验证**（2026-10-17） |
| 引擎 | **Cocos Creator 3.8.6**｜工程 `cocos/`｜D-02 / D-29 |
| 世界观 | **像素奇幻** ｜ D-08 |
| UI | **土豆兄弟风的竖屏版**（自研设计稿，非复刻任何产品）｜D-35｜规格 v1.1 已冻结 |
| 目标平台 | 微信小游戏（首发）→ 抖音小游戏 / Web 竖屏调试 |
| 需求基线 | `docs/requirements.md` v0.2 + §13 修订 R1~R15 |

## 里程碑

| # | 内容 | 状态 |
|---|---|---|
| M0 | Agent 文档体系（地图 / 流程 / 系统规则 / UI / 素材 / 测试 / memory-bank） | ✅ |
| M1 | 四大决策落盘；Möbelmon UI 参考分析；**可玩 HTML MVP**（`prototype-html/`） | ✅ |
| M7 | 素材门禁：可商用 2,711 / 阻断 925（后由 D-26 用户决定使用主池） | ✅ |
| M11 | Cocos 工程初始化（分层 / 数据表 / 单测） | ✅ |
| M12 | 渲染层 + 战斗系统（单位帧动画 / VFX / 摇杆 / 相机 / 刷怪 / 技能开火） | ✅ |
| M13 | 11 屏 UI + 流程打通 | ✅ |
| M14 | UI 回到 DEMO 基准（撤掉 Möbelmon 横幅） | ✅ |
| M15 | **UI 重设计（土豆兄弟风）+ UI 规格 v1.1 冻结** | ✅ |
| M16 | **Cocos 按 v1.1 重做 11 屏** + 实机逐屏验证 | ✅ |
| M17 | 文档回正（`wave_rules` / `core_loop` / `synergy_rules` / `requirements` / 状态文件） | ✅ |
| — | 三档竖屏视口回归、剩余模态屏逐屏核对 | ⬜ 下一步 |
| — | 内容量补齐（按文档：24 属性 / 70 道具 / 5~6 BOSS） | ⬜ |
| — | 音频接入、守卫图腾、微信分包、上架准备 | ⬜ |

## 关卡结构

一局 **20 波**：非 BOSS 波撑到倒计时归零即过关，第 10 / 20 波为 BOSS 波（击杀即过关），
每 3 波一次精英（第 12 波起 2 只），每波结束进商店（4 个固定货位 + 锁定 + 刷新）。
打通 20 波后可收工结算或继续无尽。详见 `docs/systems/wave_rules.md`。

## 素材门禁结论（M7 + D-26）

| 裁决 | 文件数 | 说明 |
|---|---:|---|
| ✅ 可商用 | 2,711 | 图标 / VFX / UI 面板 / 背景 / 字体 / 程序绘制 |
| 🔴 阻断 | 925 | 母本 `internal/**` + `approved/ui/kit/**` |
| 🟡 待裁决 | 3 | `menu-bg*.png` |

**当前实际使用**：单位 21 套 / 463 帧、VFX 85 组件 / 947 帧、技能图标 16 个、音频 35 个。
授权风险由用户承担（**D-26**）→ **上架前必须重新裁决**。

## 主要风险

| # | 风险 | 说明 | 缓解 |
|---|---|---|---|
| R1 | 数值待真人验证 | 中后期（8~20 波）曲线只有自动化标定，未做过真人长局 | 待玩家模拟 |
| R8 | **素材授权风险** | 主池素材来自商业游戏解包，上游声明禁再分发 | D-26 用户承担；**上架前必须重新裁决** |
| R10 | **微信主包超限** | `resources/` 约 17MB，主包上限 4MB | 需分包方案（未做） |
| R4 | 内容量偏大 | 文档要求 24 属性 / 70 道具 / 5~6 BOSS，实际 10 / 20 / 3 | 按里程碑分批补 |
| R11 | 两版手感参数分叉 | DEMO 与 Cocos 的受击无敌帧（0.55 / 0.80）、刷怪曲线已不一致 | 需定基准 |
| R12 | 未接入音频 | `Assets.loadAudio` 已写好但**零调用** | 独立里程碑 |

## 验证环境备忘

| 用途 | 命令 / 路径 |
|---|---|
| 类型检查（逻辑层） | `node H:/AI-game/xingnang/cocos_port/node_modules/typescript/bin/tsc -p tsconfig.check.json` |
| 类型检查（画面层） | 同上，`-p tsconfig.cc.json`（用 `typings/cc-stub.d.ts` 宽松桩） |
| 单元测试 | `node H:/AI-game/xingnang/cocos_port/node_modules/tsx/dist/cli.mjs tests/run.ts` |
| 触发编辑器编译 | `python tools/cocos_compile.py <文件> <新代码独有的标记>` ⚠️ 标记别用旧字符串 |
| 连预览截图 | Playwright 连 `http://127.0.0.1:7456/`（脚本样例见 `.tmp/uishot_cocos.cjs`） |
| **看图（视觉验收）** | `VLM_MODEL=glm-4.5v python .tmp/see.py <图片> "<问题>"`（用系统里的 `ZHIPU_API_KEY`） |
| 设计稿 | `docs/ui/mockups/v2/*.html`（一屏一文件）→ `screenshots/ui-v2-design/*.png` |
