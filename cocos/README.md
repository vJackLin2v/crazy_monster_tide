# 《疯狂鸽王》· Cocos Creator 工程

> **引擎**：Cocos Creator **3.8.6**（与 `H:\AI-game\xingnang\cocos_port` 对齐 —— decisions.md D-02）
> **状态**：M11 工程初始化完成 —— 配置 / 逻辑层 / 场景骨架 / 单测就位；**画面组件与场景 UI 待做**
> **上游依据**：`../docs/ui/ui-spec-approved.md` v1.0（已冻结 UI 规格）、`../prototype-html/`（可玩原型）

---

## 1. 怎么打开

```
Cocos Dashboard → 添加项目 → 选择本目录（H:\AI-game\crazy_monster_tide\cocos）→ 用 3.8.6 打开
```

首次打开时编辑器会：
- 生成 `library/`、`temp/`、`local/`（已在 `.gitignore` 中）
- 为 `assets/` 下的美术资源生成 `.meta` 文件（**首次导入需要等一会儿**）

导入完成后打开场景 `assets/scenes/Boot.scene`。

---

## 2. 分层设计（**重要**）

```
assets/scripts/
  core/     纯逻辑基础：常量、可复现随机      ← 不 import cc，可脱离编辑器单测
  data/     配置表：技能/模块/道具/角色/敌人/属性  ← 不 import cc
  game/     玩法逻辑：属性计算、模块叠算、一局状态  ← 不 import cc
  ui/       画面与交互（待实现）              ← 这里才 import cc
assets/art/ 美术资源（单位 / VFX / 图标 / 音频）
assets/scenes/Boot.scene
```

**为什么这么分**：`core / data / game` 三层刻意不依赖 `cc`，
于是可以在**不开编辑器**的情况下做类型检查与单元测试：

```bash
npx tsc -p tsconfig.check.json     # 类型检查（0 错误）
npx tsx tests/run.ts               # 逻辑单测（48 项）
```

`tsconfig.json`（编辑器用）和 `tsconfig.check.json`（CI/命令行用）是两份，互不干扰。

---

## 3. 当前完成度

| 模块 | 状态 | 说明 |
|---|---|---|
| 工程配置 | ✅ | `package.json` 3.8.6 / 设计分辨率 **360x640 fitWidth**（与 UI 冻结规格一致） |
| 场景骨架 | ✅ | `Boot.scene`：Canvas + Camera + SceneGlobals（引用可达性已校验） |
| 美术资源 | ✅ | 1671 个文件 / 9.7 MB（单位 463 帧、VFX 947 帧、图标、音频 35） |
| `core/Const.ts` | ✅ | ZOOM / 视野 / 竞技场 / 波次 / 手感参数（唯一数值来源） |
| `core/Rng.ts` | ✅ | mulberry32 可复现随机（同 seed 逐位一致） |
| `data/*` | ✅ | 16 技能 / 18 模块 / 20 道具 / 6 角色 / 13 敌人 / 10 属性 |
| `game/Stats.ts` | ✅ | 属性初始化（含 D-13 的倍率修复 + 开发期断言） |
| `game/SkillCalc.ts` | ✅ | **模块叠算核心**（additive / tier / 上限 / 兼容性） |
| `game/RunState.ts` | ✅ | 一局状态：升级、奖励、技能替换、商店（固定 4 货位 + 锁定） |
| 单测 | ✅ | 48 项全绿（含 D-13 回归、KI-001 相关约束、确定性） |
| **画面组件** | ⬜ | 单位渲染 / VFX 播放 / 摇杆 / 相机 |
| **场景 UI** | ⬜ | 12 个界面（按 `ui-spec-approved.md` §2） |
| **构建到微信小游戏** | ⬜ | 需要编辑器 + 微信开发者工具 |

---

## 4. 下一步（按优先级）

1. **渲染层**：单位帧动画（idle/walk/attack/death）+ VFX 播放器 + 相机跟随（ZOOM=2 基准见 `Const.ts`）
2. **战斗系统**：按 `data/` 配置 spawn、技能开火、伤害结算（复用 `SkillCalc`）
3. **12 屏 UI**：严格照 `ui-spec-approved.md` 实现，**不得重新发明布局**
4. **移植 KI-001**：敌人死亡生命周期（先累加计时再跳过 + 回收）

### 移植时的铁律

- **数值不抄错**：`Const.ts` 是唯一数值来源，别在组件里写魔法数字
- **模块规则不重写**：叠算只走 `SkillCalc.calcSkill`
- **UI 不重新设计**：照冻结规格实现，有疑问先改规格文档（出 v1.1）
- **随机只走 Rng**：禁止 `Math.random()`（会破坏可复现性）

---

## 5. 已知问题（从原型带过来）

见 `../docs/known-issues.md`

| 编号 | 问题 | 状态 |
|---|---|---|
| KI-001 | 怪物死亡后不会消失（deathT 累加被 continue 跳过） | 原型已修；**Cocos 实现时按记录写**，并补"死亡后 N 秒回收"的单测 |
