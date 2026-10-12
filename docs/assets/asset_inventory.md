# 素材盘点（真实扫描结果）

> **状态：已完成**（S1 素材评估门禁）
> 盘点对象：`H:\AI-game\pixel_roguelike_wechat_agent_kit\assets`
> 盘点时间：2026-10-12 ｜ 工具：`tools/assets/asset_scan.py`（只读 PNG 头部，不加载像素）
> 原始数据：`docs/assets/data/kit_assets/asset_index.csv`（3,666 行）+ `asset_summary.json`
> 授权裁决：`docs/assets/data/candidate_verdicts.json`
> **结论清单：`docs/assets/asset_candidates.md`**

---

## 0. 可复现的盘点命令

```bash
python tools/assets/asset_scan.py "H:/AI-game/pixel_roguelike_wechat_agent_kit/assets" \
       docs/assets/data/kit_assets --label kit-assets
```

同一目录跑两次结果一致（遍历与输出均固定排序）。`.import`/`.DS_Store` 等元数据文件不在统计内。

---

## 1. 总量

| 项 | 值 |
|---|---|
| 文件数 | **3,666** |
| 体积 | **11.77 MB** |
| PNG | 3,600+（含 1,193 图标 / 1,041 VFX / 370 面板 / 867 internal） |
| 类别数 | 23 |

## 2. 按目录

| 目录 | 文件 | 体积 | 定性 |
|---|---:|---:|---|
| `approved/icons` | 1,193 | 1.01 MB | 道具/技能/属性图标池（Willibab + Shikashi） |
| `approved/vfx` | 1,041 | 0.77 MB | VFX 组件库（90 组件 / 约 940 帧） |
| `approved/ui` | 434 | 0.45 MB | panels 370 + result 6 + **kit 58（🔴 阻断）** |
| `approved/bg` | 48 | 1.18 MB | arena 13 + menu 35（含 3 个待裁决） |
| `approved/fonts` | 5 | 4.14 MB | Fusion Pixel（OFL 1.1） |
| `generated` | 56 | 0.28 MB | **程序绘制，无外部输入** |
| `internal` | 867 | 0.63 MB | 🔴 SlotBound 解包，禁商用 |
| `ui-reference` | 20 | 3.57 MB | 🚫 设计参考（未授权截图） |
| `source` / `working` / README | 5 | 0.01 MB | 登记与说明 |

## 3. 尺寸分布（决定能否直接进 360x640 竖屏）

| 类别 | 主尺寸 | 适配结论 |
|---|---|---|
| 图标 | **32x32 (1192)** | ✅ 直接可用（1:1 或 x2） |
| UI 面板 | **24x24 (369)** | ✅ 9-slice，可拉伸 |
| VFX | 32x32 (720) / 96x96 (210) | ⚠️ 96x96 是 3x 预放大，需整数倍还原到原生 32 |
| 背景 | 360x640 (15) | ✅ 与逻辑分辨率 1:1 |
| internal 单位 | 32x32 (416) / 40x40 (47) | （不可用，仅记录） |

## 4. 与母本自带盘点的差异

母本 `docs/assets/asset_inventory.md` 盘的是它的**三个池**（P-A 行囊守卫 7,754 / P-B 素材工坊 96,860 / P-C 特效 2,084）。
**本次盘的是母本自己的 `assets/` 生产路径（3,666）** —— 那才是"已过筛选、可直接用"的候选，两者互补。

## 5. 待办

- [x] 逐类授权裁决 → `asset_license.md`
- [x] 产出首版可直接用清单 → `asset_candidates.md`
- [x] 缺口登记 → `asset_gap.md`
- [ ] 缺口补齐（GAP-101~104）：需用户决策（找 CC0 包 / 自绘 / AI 生成 / 占位）
