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
 *
 * 2026-10-20 二次核对：按「画面 vs 道具语义」改了 28 条（道具 14 / 模块 6 / 属性 7 / 巨龙之心 1），
 * 清单与依据见 docs/assets/icon_semantic_audit.md；对不上的 4 条留了 ⏸（库里没有合适的图）。
 */
export const ITEM_ICON: Record<string, string> = {
  emberstack: 'sh-fire.png',
  shatter: 'sh-shield.png',
  voltloop: 'sk-bolt.png',
  bloodpact: 'sh-blood.png',
  lastbreath: 'sh-execute.png',
  thorncoat: 'sh-heart.png',
  greed: 'relic-007.png',
  frugal: 'relic-019.png',
  focused: 'sh-sizeup.png',
  resonator: 'relic-030.png',


  power_s: 'sh-fist.png',
  power_l: 'relic-007.png',
  haste_s: 'aspd-up.png',
  haste_l: 'up-speed.png',
  area_s: 'sh-sizeup.png',
  area_l: 'relic-019.png',
  maxhp_s: 'sh-heart.png',
  maxhp_l: 'up-heart2.png',
  speed_s: 'relic-030.png',
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
  sizeMul_s: 'relic-032.png',
  sizeMul_l: 'relic-034.png',
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
  expGain_s: 'relic-056.png',
  expGain_l: 'relic-014.png',
  killHeal_s: 'w-deadly.png',
  killHeal_l: 'item-scythe.png',
  cdr_s: 'relic-040.png',
  cdr_l: 'sh-hourglass.png',
  knockback_s: 'sh-fist.png',
  knockback_l: 'relic-043.png',
  eliteDmg_s: 'w-savage.png',
  eliteDmg_l: 'w-guard.png',
  aoe_s: 'relic-013.png',
  aoe_l: 'relic-014.png',
  heal1: 'sh-cross.png',
  heal2: 'sh-heart.png',
  t_fire: 'sh-fire.png',
  t_ice: 'sh-ice.png',
  t_bolt: 'sk-overload.png',
  t_arcane: 'sk-arcanecore.png',
  t_phys: 'relic-044.png',
  t_poison: 'sh-poison.png',
  t_holy: 'sh-holy.png',
  t_nature: 'sk-healingsanct.png',
  cdr_ice: 'sh-ice.png',
  cdr_bolt: 'sh-meteor.png',
  prism: 'relic-010.png',
  dragon: 'relic-063.png',
  rage: 'sh-angry.png',
  shadow: 'sh-shadowclone.png',
  aegis: 'sh-blockshield.png',
  reaper: 'sh-execute.png',
  aoe_x: 'relic-022.png',
  slayer: 'relic-011.png',
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
  // M3：原来指到 sk-multishot.png（那是**角色帧**，不是图标，卡片上像个人头）
  // 换成"叠在一起的多支箭"，语义 = 一次多打一发；与 fan（扇射）/count_l 区分开
  multi: 'sh-multihits.png',
  fan: 'sk-tripleshot.png',
  split: 'sk-overload.png',
  bounce: 'sh-diffusion.png',
  pierce: 'sk-piercebul.png',
  orbit: 'sk-arcanorb.png',
  giant: 'sk-mountain.png',
  rapid: 'aspd-up.png',
  echo: 'sh-holy.png',
  burn: 'sh-fire.png',
  frost: 'sh-ice.png',
  vamp: 'sk-lifesap.png',
  chain: 'sh-multihits.png',
  snipe: 'sk-precision.png',
  harvest: 'sh-execute.png',
  thunder: 'sh-multihit.png',
  thornmail: 'relic-004.png',
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
  area: 'relic-019.png',
  maxhp: 'up-heart2.png',
  speed: 'relic-030.png',
  crit: 'first-hit.png',
  critdmg: 'last-hit.png',
  projSpd: 'up-arrow.png',
  pierce: 'sh-pierce.png',
  bounce: 'sh-diffusion.png',
  count: 'sh-multihit.png',
  sizeMul: 'relic-032.png',
  armor: 'sh-shield.png',
  regen: 'sh-cross.png',
  invuln: 'sh-hourglass.png',
  lifesteal: 'sh-blood.png',
  pickup: 'ui-essence.png',
  greed: 'gold-bag.png',
  expGain: 'relic-056.png',
  killHeal: 'sh-execute.png',
  cdr: 'relic-040.png',
  knockback: 'sh-fist.png',
  eliteDmg: 'sh-swordup.png',
  aoeDmg: 'relic-013.png',
};
