# feedback/death —— 死亡/受击动画（索引，非素材副本）

> **VM-08「死亡消散」重新判定：这不是外部素材缺口。**
> 本项目主池**自带 180 套 death 动画 + 160 套 hit 动画**，直接可用。

## 为什么只有 manifest.json

素材来自主池 `H:\AI-game\行囊守卫\assets`，授权为 **`internal-use-only`**（SlotBound 解包，禁再分发）。
所以这里**不复制 PNG**，只登记索引与播放规范，运行时从 `assets/internal/` 读取。
详见 `docs/assets/asset_license.md`。

## 实测数据

| 项 | 值 |
|---|---|
| 含 death 的动画表 | **180** |
| 含 hit 的动画表 | **160** |
| 登记总数 | 180 |
| death 帧数分布 | `{3: 1, 4: 38, 5: 60, 6: 43, 7: 15, 8: 15, 9: 6, 10: 2}` |
| 层级分布 | `{'normal': 140, 'elite': 26, 'boss': 14}` |
| 帧尺寸 | 32×32（少数 40×40） |

## 播放规范

| 项 | 值 |
|---|---|
| 基准尺寸 | **32×32**，显示 1× |
| `death` | **12 fps**，播完不循环 |
| `hit` | 主流 **2 帧**（受击白闪）→ **18 fps** 播一遍 |
| 额外消散 | 主池另有 `gone` / `vanish` / `death2` / `fly` / `flight` 等特殊消失态 |

### 分层加强（VM-09 靠组件叠加，不是放大图片）

| 层级 | death 处理 | 叠加组件 |
|---|---|---|
| 普通 | 原速 12fps | — |
| 精英 | 10 fps（略慢加重） | `core/ring/shockwave` + 1 次 `core/flash` |
| Boss | 8 fps + **HitStop 120ms** | `core/burst/big-boom` + `core/ring/shockwave` + 镜头震动 |

> 依据 `docs/assets/vfx_component_library.md`：Boss 的"巨大感"来自**范围/时长/数量/震动/音效/停顿**，
> 而不是把一张普通命中图放大 4 倍。

## 需要做的（不是重新制作）

- [x] 统一尺寸：已是 32×32
- [x] 统一播放速度：见上表
- [x] 检查时长：death 4~6 帧为主（约 0.33~0.5 s），节奏合适
- [x] 检查风格冲突：与主池同源，无冲突
- [ ] 与击杀反馈配合：`feedback/hit/*` + `core/burst/*`（组件已在库中）
- [ ] 普通/精英/Boss 分层表现：按上表实现（HTML MVP 阶段验证手感）
