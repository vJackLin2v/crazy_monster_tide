# 道具图标与效果全量审计

- 道具总数：79
- 不同图标数：79
- 重复图标组：0
- 相同效果签名组（数值完全一致）：0
- 相同效果类型组（同一属性/标签，数值可不同）：23

> 说明：剩余重复图标均为同语义家族（生命/护盾/元素/时间等）或同属性 1/2/3 档；本轮修复了跨语义重复。
> 效果类型组均为同属性的不同档位，**没有发现数值完全相同的重复道具**。

## 图标修复记录

修复明细见 git 历史与 docs/m2b/m2b_3_* 报告；本表只列当前剩余重复。

## 重复图标

| 图标 | 数量 | 道具 |
|---|---|---|

## 相同效果签名（数值完全一致）

| 效果签名 | 数量 | 道具 |
|---|---|---|

## 相同效果类型（同属性/标签，数值可不同）

| 属性/标签 | 数量 | 道具（数值） |
|---|---|---|
| greed | 3 | 金币袋(greed_s：greed+0.15)；贪婪硬币(greed_l：greed+0.35)；贪婪金杯(grail：greed+0.4) |
| aoeDmg | 3 | 熔火符(aoe_s：aoeDmg+0.12)；烈焰之核(aoe_l：aoeDmg+0.28)；天火之心(aoe_x：aoeDmg+0.4) |
| power | 2 | 铁匠手套(power_s：power×1.08)；战锤碎片(power_l：power×1.16) |
| haste | 2 | 疾风戒(haste_s：haste×1.08)；迅捷护符(haste_l：haste×1.16) |
| area | 2 | 放大镜(area_s：area×1.08)；广角符文(area_l：area×1.18) |
| maxhp | 2 | 生命护符(maxhp_s：maxhp×1.208)；巨人之心(maxhp_l：maxhp×1.486) |
| speed | 2 | 轻羽靴(speed_s：speed×1.06)；疾风长靴(speed_l：speed×1.14) |
| crit | 2 | 鹰眼(crit_s：crit×1.8)；猎手之瞳(crit_l：crit×2.8) |
| critdmg | 2 | 破甲锥(critdmg_s：critdmg×1.1)；斩钢刃(critdmg_l：critdmg×1.233) |
| projSpd | 2 | 羽毛箭(projSpd_s：projSpd×1.1)；追风矢(projSpd_l：projSpd×1.22) |
| pierce | 2 | 穿甲尖(pierce_s：pierce+1)；破空矢(pierce_l：pierce+2) |
| bounce | 2 | 弹跳石(bounce_s：bounce+1)；回音石(bounce_l：bounce+2) |
| sizeMul | 2 | 巨兽骨(sizeMul_s：sizeMul×1.1)；大就是好(sizeMul_l：sizeMul×1.22) |
| armor | 2 | 铁胸甲(armor_s：armor+0.05)；龙鳞甲(armor_l：armor+0.11) |
| regen | 2 | 苔藓苔(regen_s：regen+0.3)；生命之泉(regen_l：regen+0.7) |
| invuln | 2 | 龟甲片(invuln_s：invuln×1.125)；时之沙(invuln_l：invuln×1.275) |
| lifesteal | 2 | 血牙(lifesteal_s：lifesteal+0.03)；嗜血之刃(lifesteal_l：lifesteal+0.07) |
| pickup | 2 | 吸尘器(pickup_s：pickup×1.25)；吸铁石(pickup_l：pickup×1.55) |
| expGain | 2 | 智慧卷轴(expGain_s：expGain+0.12)；贤者之石(expGain_l：expGain+0.28) |
| killHeal | 2 | 猎魂刀(killHeal_s：killHeal+0.5)；死神镰刀(killHeal_l：killHeal+1.5) |
| cdr | 2 | 齿轮(cdr_s：cdr+0.05)；时之轮(cdr_l：cdr+0.11) |
| knockback | 2 | 铁拳套(knockback_s：knockback×1.5)；巨力腰带(knockback_l：knockback×2.167) |
| eliteDmg | 2 | 斩魔刃(eliteDmg_s：eliteDmg+0.1)；屠龙剑(eliteDmg_l：eliteDmg+0.25) |

## 全部道具

| id | 名称 | 图标 | 效果 | 描述 |
|---|---|---|---|---|
| aegis | 守护圣盾 | relic-055.png | armor+0.1 invuln×1.25 | 挨打不疼，无敌更久 |
| aoe_l | 烈焰之核 | sh-explosion.png | aoeDmg+0.28 | 范围技能很疼 |
| aoe_s | 熔火符 | relic-013.png | aoeDmg+0.12 | 范围技能更疼 |
| aoe_x | 天火之心 | relic-022.png | aoeDmg+0.4 | 范围技能非常疼 |
| area_l | 广角符文 | sh-enlarge.png | area×1.18 | 技能范围大很多 |
| area_s | 放大镜 | sh-sizeup.png | area×1.08 | 技能范围更大 |
| armor_l | 龙鳞甲 | sh-blockshield.png | armor+0.11 | 挨打几乎不疼 |
| armor_s | 铁胸甲 | sh-shield.png | armor+0.05 | 挨打掉血更少 |
| bloodpact | 血契 | relic-026.png | special:bloodpact power×1.3 maxhp×0.75 | 攻击力 +30%，最大生命 -25% |
| bounce_l | 回音石 | relic-009.png | bounce+2 | 子弹多弹两次 |
| bounce_s | 弹跳石 | relic-008.png | bounce+1 | 子弹多弹一次 |
| cdr_bolt | 雷暴核心 | sh-meteor.png | tagCdr.lightning+0.15 | 雷系技能转得更快 |
| cdr_ice | 寒霜碎片 | relic-036.png | tagCdr.ice+0.15 | 冰系技能转得更快 |
| cdr_l | 时之轮 | relic-018.png | cdr+0.11 | 技能转得很快 |
| cdr_s | 齿轮 | relic-040.png | cdr+0.05 | 技能转得更快 |
| count_l | 三重镜 | relic-061.png | count+1 extraProjDmg+0.15 | 多打一发，且额外那发更疼 |
| count_s | 分裂核心 | relic-023.png | count+1 | 一次多打一发 |
| crit_l | 猎手之瞳 | sh-pierce.png | crit×2.8 | 暴击更容易了 |
| crit_s | 鹰眼 | sh-eye.png | crit×1.8 | 更容易打出暴击 |
| critdmg_l | 斩钢刃 | w-blade.png | critdmg×1.233 | 暴击特别疼 |
| critdmg_s | 破甲锥 | w-thrust.png | critdmg×1.1 | 暴击打得更疼 |
| dragon | 巨龙之心 | relic-063.png | maxhp×1.556 regen+0.5 hp+40 | 血更厚，还会自动回血 |
| eliteDmg_l | 屠龙剑 | w-guard.png | eliteDmg+0.25 | 精英杀手 |
| eliteDmg_s | 斩魔刃 | w-savage.png | eliteDmg+0.1 | 打精英更疼 |
| emberstack | 灼烧增伤 | relic-033.png | special:emberstack | 火系命中的目标再受火伤 +25% |
| expGain_l | 贤者之石 | relic-054.png | expGain+0.28 | 经验涨得很快 |
| expGain_s | 智慧卷轴 | relic-056.png | expGain+0.12 | 经验涨得更快 |
| focused | 极简专精 | concentrate.png | special:focused | 装备技能 ≤2 个时：技能伤害 +25%、冷却 -10% |
| frugal | 刷新省钱 | relic-019.png | special:frugal | 刷新费用 -50%，每波结束金币 -2 |
| grail | 贪婪金杯 | relic-015.png | greed+0.4 | 金币哗哗地掉 |
| greed | 金币转攻击 | relic-007.png | special:greed greed+0.25 | 金币 +25%，每 100 金币攻击 +3%（上限 +15%） |
| greed_l | 贪婪硬币 | up-startgold.png | greed+0.35 | 金币掉得很多 |
| greed_s | 金币袋 | gold-bag.png | greed+0.15 | 金币掉得更多 |
| haste_l | 迅捷护符 | up-speed.png | haste×1.16 | 出手明显更快 |
| haste_s | 疾风戒 | ui-aspd.png | haste×1.08 | 出手更快一点 |
| heal1 | 急救包 | relic-045.png | hp+30 | 立刻回一口血 |
| invuln_l | 时之沙 | sh-hourglass.png | invuln×1.275 | 挨打后无敌很久 |
| invuln_s | 龟甲片 | relic-017.png | invuln×1.125 | 挨打后无敌更久 |
| killHeal_l | 死神镰刀 | item-scythe.png | killHeal+1.5 | 杀一个回不少血 |
| killHeal_s | 猎魂刀 | w-deadly.png | killHeal+0.5 | 杀一个回点血 |
| knockback_l | 巨力腰带 | relic-043.png | knockback×2.167 | 把怪推飞 |
| knockback_s | 铁拳套 | relic-046.png | knockback×1.5 | 把怪推得更远 |
| lastbreath | 低血强化 | relic-038.png | special:lastbreath | 生命低于 35% 时攻速 +35%，高于则 -8% |
| lifesteal_l | 嗜血之刃 | w-bleed.png | lifesteal+0.07 | 攻击能回不少血 |
| lifesteal_s | 血牙 | sh-blood.png | lifesteal+0.03 | 攻击能回一点血 |
| maxhp_l | 巨人之心 | up-heart2.png | maxhp×1.486 | 血条长一截 |
| maxhp_s | 生命护符 | sh-heart.png | maxhp×1.208 | 血条变长一点 |
| pickup_l | 吸铁石 | ui-magnet-core.png | pickup×1.55 | 经验吸得很远 |
| pickup_s | 吸尘器 | ui-essence.png | pickup×1.25 | 经验吸得更远 |
| pierce_l | 破空矢 | w-tusk.png | pierce+2 | 子弹多穿两个 |
| pierce_s | 穿甲尖 | relic-020.png | pierce+1 | 子弹多穿一个 |
| power_l | 战锤碎片 | atk-up.png | power×1.16 | 攻击明显更疼 |
| power_s | 铁匠手套 | sh-fist.png | power×1.08 | 攻击更疼一点 |
| prism | 棱镜 | relic-010.png | tagAll+0.08 | 所有技能都更疼 |
| projSpd_l | 追风矢 | ui-arrow.png | projSpd×1.22 | 子弹快得离谱 |
| projSpd_s | 羽毛箭 | up-arrow.png | projSpd×1.1 | 子弹飞得更快 |
| rage | 狂战之怒 | sh-angry.png | power×1.2 crit×2.6 | 打得更疼，也更爱暴击 |
| reaper | 收割者 | relic-064.png | expGain+0.15 killHeal+2 | 杀怪回血、涨经验 |
| regen_l | 生命之泉 | relic-042.png | regen+0.7 | 自动回血更快 |
| regen_s | 苔藓苔 | sh-cross.png | regen+0.3 | 慢慢自动回血 |
| resonator | 黑科技共鸣 | relic-031.png | special:resonator | 同一技能装了 2 个相同触发时机（Hook）的黑科技时，该技能伤害 +20% |
| shadow | 迅捷之影 | sh-shadowclone.png | haste×1.1 speed×1.15 | 跑得快，出手也快 |
| shatter | 破冰增伤 | relic-024.png | special:shatter | 对被减速目标 +20% 伤害，对未被减速目标 -5% |
| sizeMul_l | 大就是好 | relic-034.png | sizeMul×1.22 | 子弹特别大 |
| sizeMul_s | 巨兽骨 | relic-032.png | sizeMul×1.1 | 子弹变大了 |
| slayer | 屠魔者 | relic-011.png | eliteDmg+0.2 bossArmor+0.1 | 对精英与首领更狠，也更抗打 |
| speed_l | 疾风长靴 | relic-053.png | speed×1.14 | 跑得明显更快 |
| speed_s | 轻羽靴 | relic-030.png | speed×1.06 | 跑得更快一点 |
| t_arcane | 奥术宝石 | sk-arcanecore.png | tagBonus.arcane+0.25 | 奥术技能更疼 |
| t_bolt | 雷神之锤 | relic-065.png | tagBonus.lightning+0.25 | 雷系技能更疼 |
| t_fire | 余烬核心 | skill-flame_field.png | tagBonus.fire+0.25 | 火系技能更疼 |
| t_holy | 圣徽 | relic-051.png | tagBonus.holy+0.25 | 圣系技能更疼 |
| t_ice | 冰河之心 | relic-035.png | tagBonus.ice+0.25 | 冰系技能更疼 |
| t_nature | 自然之心 | sk-healingsanct.png | tagBonus.nature+0.25 | 自然技能更疼 |
| t_phys | 锋锐原石 | relic-044.png | tagBonus.physical+0.25 | 物理技能更疼 |
| t_poison | 剧毒囊 | sh-poison.png | tagBonus.poison+0.25 | 毒系技能更疼 |
| thorncoat | 受击反伤 | sk-guardshield.png | special:thorncoat | 受击反弹 12 点伤害（0.5s CD），移速 -6% |
| vampire | 吸血鬼牙 | sh-teeth.png | critdmg×1.133 lifesteal+0.08 | 能吸血，暴击更疼 |
| voltloop | 落雷追加 | sk-bolt.png | special:voltloop | 雷击命中 15% 概率追加 40% 小雷击 |
