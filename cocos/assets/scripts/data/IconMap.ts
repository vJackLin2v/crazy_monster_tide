/**
 * 图标映射 —— 道具 / 模块 / 属性 的彩色像素图标
 *
 * 2026-10-17 重做：**按「图标实际画的是什么」逐个语义匹配**（不是按序号硬塞）。
 * 来源：`素材工坊/图标素材/游戏图标/行囊守卫/`
 *   · `imprinticons__shortsicons__*`（41 个语义小图标：eye/hourglass/pierce/multihit/enlarge/blood/execute/golem…）
 *   · `randomoption__*`（属性类：attackup/hpup/aspdup/gold…）
 *   · `skills__*`（技能/模块类）
 *   · `menu__upgrade__*`（升级类）
 *
 * 每个图标的画面内容都经过视觉模型逐个识别 + 人工核对；对不上的**不硬凑**，见 GAP-105。
 */
export const ITEM_ICON: Record<string, string> = {
  power_s: 'sh-fist.png',
  power_l: 'relic-007.png',
  haste_s: 'aspd-up.png',
  haste_l: 'up-speed.png',
  area_s: 'sh-sizeup.png',
  area_l: 'sh-enlarge.png',
  maxhp_s: 'sh-heart.png',
  maxhp_l: 'hp-up.png',
  speed_s: 'survive.png',
  speed_l: 'up-speed.png',
  crit_s: 'sh-eye.png',
  crit_l: 'sh-pierce.png',
  critdmg_s: 'w-thrust.png',
  critdmg_l: 'w-blade.png',
  projSpd_s: 'up-arrow.png',
  projSpd_l: 'sk-galebow.png',
  pierce_s: 'w-thrust.png',
  pierce_l: 'sk-piercebul.png',
  bounce_s: 'sh-diffusion.png',
  bounce_l: 'sh-multihits.png',
  count_s: 'sh-multihit.png',
  count_l: 'sk-tripleshot.png',
  sizeMul_s: 'sh-enlarge.png',
  sizeMul_l: 'sh-earthquake.png',
  armor_s: 'sh-shield.png',
  armor_l: 'sh-blockshield.png',
  regen_s: 'sh-cross.png',
  regen_l: 'sh-heart.png',
  invuln_s: 'sh-shield.png',
  invuln_l: 'sh-hourglass.png',
  lifesteal_s: 'sh-blood.png',
  lifesteal_l: 'w-bleed.png',
  pickup_s: 'ui-essence.png',
  pickup_l: 'ui-essence.png',
  greed_s: 'gold-bag.png',
  greed_l: 'up-startgold.png',
  expGain_s: 'skillmastery.png',
  expGain_l: 'sh-meteor.png',
  killHeal_s: 'w-deadly.png',
  killHeal_l: 'item-scythe.png',
  cdr_s: 'up-reroll.png',
  cdr_l: 'sh-hourglass.png',
  knockback_s: 'sh-fist.png',
  knockback_l: 'berserk.png',
  eliteDmg_s: 'w-savage.png',
  eliteDmg_l: 'w-guard.png',
  summonPower_s: 'sh-golem.png',
  summonPower_l: 'sk-arcanecore.png',
  heal1: 'sh-cross.png',
  heal2: 'sh-heart.png',
  t_fire: 'sh-fire.png',
  t_ice: 'sh-ice.png',
  t_bolt: 'sk-overload.png',
  t_arcane: 'sk-arcanecore.png',
  t_phys: 'sh-swordup.png',
  t_poison: 'sh-poison.png',
  t_holy: 'sh-holy.png',
  t_nature: 'sk-healingsanct.png',
  cdr_ice: 'sh-ice.png',
  cdr_bolt: 'sh-meteor.png',
  prism: 'skillmastery.png',
  dragon: 'up-heart2.png',
  rage: 'sh-angry.png',
  shadow: 'sh-shadowclone.png',
  aegis: 'sh-blockshield.png',
  reaper: 'sh-execute.png',
  totem: 'sh-golem.png',
  slayer: 'sh-swordup.png',
  grail: 'gold-bag.png',
  vampire: 'sh-teeth.png',
};

/**
 * 模块图标（技能类语义图）
 * ⚠️ 武器类道具按「图标**实际画的是什么**」分配，不按文件名猜：
 *    w-blade=弯刀 / w-thrust=突刺长矛 / w-savage=撕裂爪痕 / w-guard=金色直剑
 *    w-bleed=双刀交叉 / w-deadly=死神剪影 / w-axe=战斧 / sh-eye=眼睛 / sh-pierce=靶心
 */
export const MODULE_ICON: Record<string, string> = {
  multi: 'sk-multishot.png',
  fan: 'sk-tripleshot.png',
  split: 'sh-multihit.png',
  bounce: 'sh-diffusion.png',
  pierce: 'sk-piercebul.png',
  orbit: 'sk-arcanorb.png',
  giant: 'sh-enlarge.png',
  rapid: 'aspd-up.png',
  echo: 'sk-mountain.png',
  burn: 'sh-fire.png',
  frost: 'sh-ice.png',
  vamp: 'sk-lifesap.png',
  chain: 'sk-overload.png',
  snipe: 'sk-precision.png',
  harvest: 'sh-execute.png',
  thunder: 'sh-meteor.png',
  thornmail: 'sk-berserkaxe.png',
  overload: 'sk-voltsaw.png',
};

/**
 * 属性图标
 *
 * ⚠️ `item-scythe.png`（死神镰刀）来自 **Sephiria 素材包**（`素材工坊/Sephiria_Assets/08_Misc/ScytheOfBerut`），
 *    是全库唯一真正的镰刀图标 —— 但**不属于行囊守卫那套画风**，
 *    属于用户明确接受的"语义优先、画风略有出入"（用户 2026-10-17：「B」）。
 */

export const ATTR_ICON: Record<string, string> = {
  power: 'atk-up.png',
  haste: 'aspd-up.png',
  area: 'combatshift.png',
  maxhp: 'hp-up.png',
  speed: 'survive.png',
  crit: 'first-hit.png',
  critdmg: 'last-hit.png',
  projSpd: 'up-arrow.png',
  pierce: 'sh-pierce.png',
  bounce: 'sh-diffusion.png',
  count: 'sh-multihit.png',
  sizeMul: 'sh-enlarge.png',
  armor: 'sh-shield.png',
  regen: 'sh-cross.png',
  invuln: 'sh-hourglass.png',
  lifesteal: 'sh-blood.png',
  pickup: 'ui-essence.png',
  greed: 'gold-bag.png',
  expGain: 'skillmastery.png',
  killHeal: 'sh-execute.png',
  cdr: 'up-reroll.png',
  knockback: 'sh-fist.png',
  eliteDmg: 'sh-swordup.png',
  summonPower: 'sh-golem.png',
};
