### 技能（20）

| id | 名称 | 类型 | 冷却 | 伤害 | 标签 | 描述 |
|---|---|---|---|---|---|---|
| ring_blade | 环刃 | orbit | 1.6s | 6 | physical/orbit/melee | 两片刀刃绕身旋转，贴脸的敌人持续掉血。 |
| mine_field | 地雷阵 | trap | 2.6s | 22 | physical/trap/area | 在脚下埋雷，敌人踩到才引爆；同屏最多 4 枚。 |
| sentry | 哨戒哨兵 | summon | 1.2s | 6 | arcane/summon/projectile | 放一个哨兵自动射击，同时只能有一个。 |
| charge_pulse | 蓄能脉冲 | charge | 4s | 26 | lightning/charge/pulse/burst | 蓄力后对锁定目标爆发，附带小范围溅射。 |
| fireball | 火球 | projectile | 0.85s | 12 | fire/projectile | 向最近的敌人扔出火球，命中时炸开一团火。 |
| ice_spear | 冰晶矛 | projectile | 1.25s | 14 | ice/projectile/pierceable | 一记重矛：穿透 1 个敌人，单发很疼，但出手偏慢。 |
| arcane | 奥术飞弹 | projectile | 0.5s | 5 | arcane/projectile/homing | 高频小奥术弹：单发很轻，靠出手快堆伤害。 |
| blade | 回旋刃 | projectile | 1.25s | 11 | physical/projectile/return | 甩出飞刃，飞出去后会朝你飞回来，来回都能伤人。 |
| shockwave | 震荡波 | pulse | 2.4s | 14 | physical/area/pulse | 以自己为中心炸开一圈冲击波，同时打到周围所有敌人。 |
| chain | 连锁闪电 | chain | 1.8s | 9 | lightning/chain | 从你身上劈出闪电，命中后会跳到附近的敌人身上。 |
| poison | 毒雾 | area | 3s | 4 | poison/area/dot | 大范围毒雾，铺得最久，适合拖住怪群。 |
| meteor | 陨石 | area | 3.6s | 14 | fire/area/dot | 陨石落地爆发最疼，燃烧短，点名硬目标。 |
| frostnova | 霜爆 | pulse | 3.6s | 7 | ice/area/pulse/slow | 大范围寒霜：覆盖面广、冷却长，适合清场。 |
| blade_storm | 乱杀 | area | 2.4s | 7 | physical/area/dot | 刃风贴脸转动最快，近身收益最高。 |
| holybolt | 圣光弹 | projectile | 0.75s | 7 | holy/projectile/pierceable | 连发圣光：单发伤害低，但射速快，适合持续压制。 |
| thorn | 荆棘环 | pulse | 2.6s | 10 | nature/area/pulse | 脚下炸开一圈荆棘，同时扎伤周围的敌人。 |
| orb | 雷球 | projectile | 1.1s | 12 | lightning/projectile/homing | 慢速大雷球：出手慢但单发重，追着目标炸。 |
| spike | 扎心 | area | 2s | 5 | nature/area/dot | 裂地施放最快、单次最轻，靠长尾磨血。 |
| frostring | 寒冰环 | pulse | 1.6s | 6 | ice/area/pulse/slow | 贴身高频冰环：范围小、转得快，近身缠斗用。 |
| spirit | 灵能箭 | projectile | 1s | 8 | arcane/projectile/pierceable/homing | 灵能箭会自动追着敌人，并穿透 1 个目标——最稳的命中。 |

### 黑科技（18）

| id | 名称 | 叠加 | 数值 | 兼容要求 | 描述 |
|---|---|---|---|---|---|
| multi | 多重射击 | additive ×4 | +1 发 · 全额伤害 | projectile | 一次开火多打出一发子弹，同方向 |
| fan | 散射 | additive ×3 | +2 发 · 每发 55% 伤害 | projectile | 额外散开两枚小子弹，伤害较低、射程短 |
| split | 分裂 | additive ×3 | 命中后再炸 2 枚子弹 | projectile | 命中后炸出小子弹，继续伤人 |
| bounce | 弹射 | additive ×3 | +1 次转向弹射 | projectile | 命中后转向附近另一只敌人继续飞 |
| pierce | 穿透 | additive ×3 | 穿透 +1 个目标 | projectile | 子弹可以多穿透一个目标 |
| orbit | 环绕弹 | additive ×3 | +1 枚环绕弹 | projectile | 多一枚绕着角色旋转的子弹 |
| giant | 增大 | additive ×3 | 体积 / 范围 +30% | projectile / area / pulse / chain | 技能体积与范围更大 |
| rapid | 冷却缩减 | tier ×3 | 冷却 -12% | projectile / pulse / chain / area | 技能冷却更短 |
| echo | 重复施放 | tier ×3 | 0.4s 后追加 60% 伤害 | 任意 | 施放后短暂延迟再放一次，伤害较低 |
| burn | 灼烧 | tier ×3 | 命中附加灼烧 2s | 任意 | 命中附加灼烧，持续掉血 |
| frost | 减速 | tier ×3 | 减速 35% · 1.2s | 任意 | 命中减速目标 |
| vamp | 吸血 | unique ×3 | 伤害的 4% 回血 | 任意 | 伤害的 4% 回复自身生命（合成为 Ⅱ 后约 6.4%） |
| chain | 连锁 | tier ×3 | 跳 1 次 · 70% 伤害 | projectile / chain | 命中后跳到附近另一个敌人身上 |
| snipe | 狙击 | tier ×3 | 弹速 +40% · 伤害 +15% | projectile | 弹速更快、伤害更高 |
| harvest | 击杀回血 | unique ×3 | 击杀回复 1 HP | 任意 | 每次击杀回复 1 点生命（Ⅱ 约 1.6 点） |
| thunder | 落雷 | tier ×3 | 15% 概率落雷 | 任意 | 命中有概率落雷，对范围内敌人造成伤害 |
| thornmail | 反伤 | unique ×3 | 被咬时反伤 6 | 任意 | 被咬时反弹 6 点伤害（Ⅱ 约 9.6 点） |
| overload | 强化伤害 | tier ×3 | 伤害 +25% · 范围 -10% | projectile / area / pulse / chain | 伤害更高、技能范围更小 |

### 道具（80）

| id | 名称 | 稀有度 | 效果 |
|---|---|---|---|
| power_s | 铁匠手套 | T1 | 攻击更疼一点 |
| power_l | 战锤碎片 | T1 | 攻击明显更疼 |
| haste_s | 疾风戒 | T1 | 出手更快一点 |
| haste_l | 迅捷护符 | T1 | 出手明显更快 |
| area_s | 放大镜 | T1 | 技能范围更大 |
| area_l | 广角符文 | T1 | 技能范围大很多 |
| maxhp_s | 生命护符 | T1 | 血条变长一点 |
| maxhp_l | 巨人之心 | T1 | 血条长一截 |
| speed_s | 轻羽靴 | T1 | 跑得更快一点 |
| speed_l | 疾风长靴 | T1 | 跑得明显更快 |
| crit_s | 鹰眼 | T1 | 更容易打出暴击 |
| crit_l | 猎手之瞳 | T1 | 暴击更容易了 |
| critdmg_s | 破甲锥 | T1 | 暴击打得更疼 |
| critdmg_l | 斩钢刃 | T1 | 暴击特别疼 |
| projSpd_s | 羽毛箭 | T1 | 子弹飞得更快 |
| projSpd_l | 追风矢 | T1 | 子弹快得离谱 |
| pierce_s | 穿甲尖 | T1 | 子弹多穿一个 |
| pierce_l | 破空矢 | T1 | 子弹多穿两个 |
| bounce_s | 弹跳石 | T1 | 子弹多弹一次 |
| bounce_l | 回音石 | T1 | 子弹多弹两次 |
| count_s | 分裂核心 | T1 | 一次多打一发 |
| count_l | 三重镜 | T1 | 多打一发，且额外那发更疼 |
| sizeMul_s | 巨兽骨 | T1 | 子弹变大了 |
| sizeMul_l | 大就是好 | T1 | 子弹特别大 |
| armor_s | 铁胸甲 | T1 | 挨打掉血更少 |
| armor_l | 龙鳞甲 | T1 | 挨打几乎不疼 |
| regen_s | 苔藓苔 | T1 | 慢慢自动回血 |
| regen_l | 生命之泉 | T1 | 自动回血更快 |
| invuln_s | 龟甲片 | T1 | 挨打后无敌更久 |
| invuln_l | 时之沙 | T1 | 挨打后无敌很久 |
| lifesteal_s | 血牙 | T1 | 攻击能回一点血 |
| lifesteal_l | 嗜血之刃 | T1 | 攻击能回不少血 |
| pickup_s | 吸尘器 | T1 | 经验吸得更远 |
| pickup_l | 吸铁石 | T1 | 经验吸得很远 |
| greed_s | 金币袋 | T1 | 金币掉得更多 |
| greed_l | 贪婪硬币 | T1 | 金币掉得很多 |
| expGain_s | 智慧卷轴 | T1 | 经验涨得更快 |
| expGain_l | 贤者之石 | T1 | 经验涨得很快 |
| killHeal_s | 猎魂刀 | T1 | 杀一个回点血 |
| killHeal_l | 死神镰刀 | T1 | 杀一个回不少血 |
| cdr_s | 齿轮 | T1 | 技能转得更快 |
| cdr_l | 时之轮 | T1 | 技能转得很快 |
| knockback_s | 铁拳套 | T1 | 把怪推得更远 |
| knockback_l | 巨力腰带 | T1 | 把怪推飞 |
| eliteDmg_s | 斩魔刃 | T1 | 打精英更疼 |
| eliteDmg_l | 屠龙剑 | T1 | 精英杀手 |
| aoe_s | 熔火符 | T1 | 范围技能更疼 |
| aoe_l | 烈焰之核 | T1 | 范围技能很疼 |
| heal1 | 急救包 | T1 | 立刻回一口血 |
| heal2 | 治疗药水 | T1 | 血直接回满 |
| t_fire | 余烬核心 | T2 | 火系技能更疼 |
| t_ice | 冰河之心 | T2 | 冰系技能更疼 |
| t_bolt | 雷神之锤 | T2 | 雷系技能更疼 |
| t_arcane | 奥术宝石 | T2 | 奥术技能更疼 |
| t_phys | 锋锐原石 | T2 | 物理技能更疼 |
| t_poison | 剧毒囊 | T2 | 毒系技能更疼 |
| t_holy | 圣徽 | T2 | 圣系技能更疼 |
| t_nature | 自然之心 | T2 | 自然技能更疼 |
| cdr_ice | 寒霜碎片 | T2 | 冰系技能转得更快 |
| cdr_bolt | 雷暴核心 | T2 | 雷系技能转得更快 |
| prism | 棱镜 | T2 | 所有技能都更疼 |
| dragon | 巨龙之心 | T2 | 血更厚，还会自动回血 |
| rage | 狂战之怒 | T2 | 打得更疼，也更爱暴击 |
| shadow | 迅捷之影 | T2 | 跑得快，出手也快 |
| aegis | 守护圣盾 | T2 | 挨打不疼，无敌更久 |
| reaper | 收割者 | T2 | 杀怪回血、涨经验 |
| aoe_x | 天火之心 | T2 | 范围技能非常疼 |
| slayer | 屠魔者 | T2 | 对精英与首领更狠，也更抗打 |
| grail | 贪婪金杯 | T2 | 金币哗哗地掉 |
| vampire | 吸血鬼牙 | T2 | 能吸血，暴击更疼 |
| emberstack | 灼烧增伤 | T2 | 火系命中的目标再受火伤 +25% |
| shatter | 破冰增伤 | T2 | 对被减速目标 +20% 伤害，对未被减速目标 -5% |
| voltloop | 落雷追加 | T2 | 雷击命中 15% 概率追加 40% 小雷击 |
| bloodpact | 血契 | T3 | 攻击力 +30%，最大生命 -25% |
| lastbreath | 低血强化 | T2 | 生命低于 35% 时攻速 +35%，高于则 -8% |
| thorncoat | 受击反伤 | T1 | 受击反弹 12 点伤害（0.5s CD），移速 -6% |
| greed | 金币转攻击 | T2 | 金币 +25%，每 100 金币攻击 +3%（上限 +15%） |
| frugal | 刷新省钱 | T1 | 刷新费用 -50%，每波结束金币 -2 |
| focused | 极简专精 | T3 | 装备技能 ≤2 个时：技能伤害 +25%、冷却 -10% |
| resonator | 黑科技共鸣 | T3 | 同一技能装了 2 个同类黑科技时，该技能伤害 +20% |

### 难度

| 难度 | 星级 | 敌人HP | 敌人伤害 | 刷怪 | 精英率 | BOSS HP | 初始生命 | 金币 | 经验 | 商店价格 | 刷新 | 回血预算 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 休闲 | 1 | 0.8 | 0.8 | 1.15 | 0.8 | 0.9 | 1.1 | 1.2 | 1.15 | 0.9 | 0.9 | 8 |
| 普通 | 2 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 1 | 默认8 |
| 困难 | 3 | 1.25 | 1.15 | 0.92 | 1.2 | 1.2 | 1 | 0.92 | 0.95 | 1.1 | 1.15 | 8 |
| 噩梦 | 4 | 1.45 | 1.35 | 0.85 | 1.5 | 1.45 | 0.95 | 0.85 | 0.9 | 1.22 | 1.3 | 6 |
| 地狱 | 5 | 1.9 | 1.55 | 0.78 | 1.8 | 1.7 | 0.9 | 0.78 | 0.85 | 1.35 | 1.5 | 5 |

规则：[
 {
  "name": "休闲",
  "rules": [
   {
    "kind": "noEliteUntilWave",
    "wave": 3
   },
   {
    "kind": "lowHpHealBonus",
    "thresholdPct": 30,
    "mul": 1.2
   },
   {
    "kind": "shopGuaranteeOffense",
    "count": 1
   }
  ],
  "unlock": {
   "type": "default"
  },
  "reward": ""
 },
 {
  "name": "普通",
  "rules": [],
  "unlock": {
   "type": "default"
  },
  "reward": ""
 },
 {
  "name": "困难",
  "rules": [
   {
    "kind": "eliteAffixFromWave",
    "wave": 12,
    "chance": 0.25,
    "affixes": [
     "shield"
    ]
   },
   {
    "kind": "noHealInShop"
   },
   {
    "kind": "rerollLimitPerWave",
    "count": 3
   }
  ],
  "unlock": {
   "type": "win",
   "difficulty": "normal"
  },
  "reward": "困难徽章"
 },
 {
  "name": "噩梦",
  "rules": [
   {
    "kind": "eliteAlwaysAffixFromWave",
    "wave": 8,
    "count": 1,
    "affixes": [
     "shield",
     "swift",
     "split"
    ]
   },
   {
    "kind": "bossSummon",
    "thresholds": [
     70,
     35
    ],
    "count": 3,
    "maxAlive": 6,
    "minIntervalSec": 12,
    "warnSec": 1.2,
    "hpMul": 0.7,
    "dmgMul": 0.8
   },
   {
    "kind": "lockCostPerLock",
    "gold": 2
   }
  ],
  "unlock": {
   "type": "win",
   "difficulty": "hard"
  },
  "reward": "噩梦徽章"
 },
 {
  "name": "地狱",
  "rules": [
   {
    "kind": "eliteGuaranteedWaves",
    "waves": [
     5,
     8,
     11,
     14,
     17,
     20
    ]
   },
   {
    "kind": "eliteAlwaysAffixFromWave",
    "wave": 5,
    "count": 2,
    "affixes": [
     "shield",
     "swift",
     "split"
    ]
   },
   {
    "kind": "bossEnrage",
    "thresholdPct": 30,
    "dmgMul": 1.25,
    "speedMul": 1.15
   }
  ],
  "unlock": {
   "type": "win",
   "difficulty": "nightmare"
  },
  "reward": "地狱徽章 + 金色图鉴框"
 }
]

### 全局数值

    {
 "balance": {
  "spawn": {
   "baseInterval": 0.92,
   "perWave": 0.012,
   "minInterval": 0.52,
   "batchEvery": 6,
   "batchMax": 2,
   "openBase": 4,
   "openEvery": 3,
   "openMax": 7,
   "aliveSoft": 24,
   "aliveHard": 34,
   "slowMul": 1.7
  },
  "growth": {
   "hpPerWave": 0.42,
   "dmgPerWave": 0.2
  },
  "wave": {
   "baseTime": 22,
   "timeStep": 4,
   "timeEvery": 3
  },
  "reward": {
   "earlyMax": 5,
   "midMax": 12,
   "early": {
    "skill": 0.35,
    "module": 0.25,
    "item": 0.25,
    "attr": 0.15
   },
   "mid": {
    "skill": 0.2,
    "module": 0.35,
    "item": 0.25,
    "attr": 0.2
   },
   "late": {
    "skill": 0.15,
    "module": 0.35,
    "item": 0.3,
    "attr": 0.2
   }
  },
  "shop": {
   "slots": 4,
   "itemBase": 14,
   "itemRand": 6,
   "itemPerWave": 3.4,
   "modBase": 18,
   "modRand": 7,
   "modPerWave": 5,
   "healBase": 8,
   "healPerWave": 1,
   "attrBase": 16,
   "attrPerWave": 3,
   "rerollBase": 3,
   "clearGoldBase": 9,
   "clearGoldPerWave": 3.5
  },
  "ai": {
   "eliteChargeTele": 0.7,
   "eliteChargeDash": 0.35,
   "eliteChargeRec": 0.55,
   "eliteChargeCd": 4.5,
   "bossChargeTele": 0.7,
   "bossChargeDash": 0.35,
   "bossChargeRec": 0.55,
   "bossChargeCd": 3.2,
   "bossSlamTele": 0.9,
   "bossSlamRadius": 70,
   "bossSlamMul": 1.5,
   "bossSlamRec": 0.5,
   "bossFirstCd": 2.2,
   "eliteFirstCd": 3,
   "chargeSpeedMul": 2.2
  },
  "exp": {
   "base": 5,
   "perLevel": 3.2,
   "waveEndMul": 0.5
  },
  "thunder": {
   "radius": 60,
   "mul": 0.5
  }
 },
 "run": {
  "waves": 20,
  "bossEvery": 10,
  "canContinue": true
 },
 "waveTime1": 22,
 "waveTime20": 46,
 "bossWaves": [
  10,
  20
 ]
}