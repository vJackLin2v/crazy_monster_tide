# Difficulties 数据结构规格（difficulties_data_spec）

> 开发时先落这个文件；普通难度是唯一 base，其他档位用 Partial 覆盖。

    export type DifficultyId = "casual" | "normal" | "hard" | "nightmare" | "hell";

    export interface DifficultyConfig {
      id: DifficultyId;
      name: string;
      stars: 1 | 2 | 3 | 4 | 5;
      tagline: string;
      enemyHpMul: number;
      enemyDmgMul: number;
      spawnMul: number;          // 乘在刷怪间隔上：>1 更慢
      eliteChanceMul: number;
      bossHpMul: number;
      bossDmgMul: number;
      startHpMul: number;
      goldMul: number;
      expMul: number;
      shopPriceMul: number;
      shopPricePerWave: number;  // 地狱 0.02，其余 0
      rerollCostMul: number;
      healMul: number;
      healBudgetPerSecond: number;
      rules: DifficultyRule[];
      unlock: { type: "default" } | { type: "win"; difficulty: DifficultyId };
      rewards: { id: string; name: string; kind: "badge" | "achievement" | "codexFrame" }[];
    }

    export type DifficultyRule =
      | { kind: "noEliteUntilWave"; wave: number }
      | { kind: "lowHpHealBonus"; thresholdPct: number; mul: number }
      | { kind: "shopGuaranteeOffense"; count: number }
      | { kind: "eliteAffixFromWave"; wave: number; chance: number; affixes: string[] }
      | { kind: "eliteAlwaysAffixFromWave"; wave: number; count: number }
      | { kind: "noHealInShop" }
      | { kind: "rerollLimitPerWave"; count: number }
      | { kind: "bossSummon"; thresholds: number[]; count: number; maxAlive: number; minIntervalSec: number; warnSec: number; hpMul: number; dmgMul: number }
      | { kind: "lockCostPerLock"; gold: number }
      | { kind: "eliteGuaranteedWaves"; waves: number[] }
      | { kind: "bossEnrage"; thresholdPct: number; dmgMul: number; speedMul: number };

## 关键实现约定

1. DIFFICULTIES.normal 是唯一基准：所有倍率 = 1、rules = []，实现时不额外分支；
2. 其他难度用 Partial<DifficultyConfig> 覆盖 normal；
3. 运行时只读 balance()（全局）与 difficulty()（本局），不把倍率硬编码进 Battle；
4. rules[] 结构化存储：UI 详情面板直接遍历生成文案，避免 UI 文案与数值不同步。
