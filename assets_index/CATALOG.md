# 成品素材目录（给 Agent 用）

> 由 tools/assets/asset_index.py catalog 生成，**只收授权可用**的条目。
> 原始全量见 index.jsonl；本目录是"可以直接拿来做东西"的子集。

## 门槛

| gate | 含义 | 能不能进正式包 |
|---|---|---|
| ok | 可商用（CC0 / 可商用且已标注） | 可以直接用 |
| attribution-required | 可商用但需署名（GameIcons CC BY 3.0 等） | 用，但要在致谢里署名 |
| replace-before-launch | 用户已批准，但上架前必须替换（D-26） | 原型可以，上线不行 |

## 统计

| 维度 | 分布 |
|---|---|
| 条目 | 4652 |
| 类别 | icon-svg 4259, icon 200, unit 102, vfx 91 |
| 授权 | attribution 4259, user-approved 224, ok-attribution 169 |
| 网格契合 | vector 4267, native 232, offgrid 98, big 46, unknown 9 |

## 怎么查

```
# 找可用的 32px 技能图标
python tools/assets/asset_index.py search "火 技能" --cat icon --size 32
# 重新生成成品目录（按类别）
python tools/assets/asset_index.py catalog --cats icon,icon-svg
# 取单条（会打印授权提示）
python tools/assets/asset_index.py pick "pool-icons:技能图标/fire-01.png" --dest .tmp/out
```

## 给 Agent 的规则

1. 先查 catalog.jsonl，再查 index.jsonl；catalog 里没有 = 授权没过，别用。
2. fit=big 的素材不是不能用，是要按 1/2、1/4 **整数倍缩小**，否则像素会糊。
3. gate=replace-before-launch 只用于原型；上线前替换清单见 docs/assets/asset_license.md。
4. 新素材入库前必须先登记授权，再跑 scan + catalog。
