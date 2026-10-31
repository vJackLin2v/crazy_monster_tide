import type { SkillDef, SkillArt } from './Types';

/** 16 个基础主动技能（docs/systems/skill_types.md；需求 §10 目标 16） */
export const SKILLS: Record<string, SkillDef> = {
  // ── 第一批新技能（设计 v6）──
  ring_blade: { name: '环刃', icon: 'skill-whirlwind.png', type: 'orbit', tags: ['physical','orbit','melee'], cd: 1.6, dmg: 6, spd: 0, color: '#E8DCC8', size: 40,
                desc: '两片刀刃绕身旋转，贴脸的敌人持续掉血。' },
  mine_field: { name: '地雷阵', icon: 'skill-flame_field.png', type: 'trap', tags: ['physical','trap','area'], cd: 2.6, dmg: 22, spd: 0, color: '#F0C46A', size: 44,
                desc: '在脚下埋雷，敌人踩到才引爆；同屏最多 4 枚。' },
  sentry:     { name: '哨戒哨兵', icon: 'skill-arcane_missile.png', type: 'summon', tags: ['arcane','summon','projectile'], cd: 1.2, dmg: 6, spd: 0, color: '#8C63CF', size: 8,
                desc: '放一个哨兵自动射击，同时只能有一个。' },
  charge_pulse: { name: '蓄能脉冲', icon: 'skill-thunder_beam.png', type: 'charge', tags: ['lightning','charge','pulse','burst'], cd: 4.0, dmg: 26, spd: 0, color: '#9BE7FF', size: 90,
                desc: '蓄力后对锁定目标爆发，附带小范围溅射。' },
  fireball:    { name: '火球',     icon: 'skill-fireball.png',        type: 'projectile', tags: ['fire','projectile'],              cd: 0.85, dmg: 12, spd: 190, color: '#FFA84B', size: 5,
                 desc: '向最近的敌人扔出火球，命中时炸开一团火。' },
  ice_spear:   { name: '冰晶矛',   icon: 'skill-ice_spear.png',       type: 'projectile', tags: ['ice','projectile','pierceable'],   cd: 1.25, dmg: 14, spd: 240, color: '#88D6BC', size: 4,
                 desc: '一记重矛：穿透 1 个敌人，单发很疼，但出手偏慢。' },
  arcane:      { name: '奥术飞弹', icon: 'skill-arcane_missile.png',  type: 'projectile', tags: ['arcane','projectile','homing'],    cd: 0.50, dmg: 5,  spd: 240, color: '#8C63CF', size: 4,
                 desc: '高频小奥术弹：单发很轻，靠出手快堆伤害。' },
  blade:       { name: '回旋刃',   icon: 'skill-returning_blade.png', type: 'projectile', tags: ['physical','projectile','return'],  cd: 1.25, dmg: 11, spd: 200, color: '#F7E9E0', size: 8,
                 desc: '甩出飞刃，飞出去后会朝你飞回来，来回都能伤人。' },
  shockwave:   { name: '震荡波',   icon: 'skill-shockwave.png',       type: 'pulse',      tags: ['physical','area','pulse'],         cd: 2.4,  dmg: 14, spd: 0,   color: '#FFD166', size: 26,
                 desc: '以自己为中心炸开一圈冲击波，同时打到周围所有敌人。' },
  chain:       { name: '连锁闪电', icon: 'skill-chain_lightning.png', type: 'chain',      tags: ['lightning','chain'],               cd: 1.8,  dmg: 9,  spd: 0,   color: '#9BE7FF', size: 0,
                 desc: '从你身上劈出闪电，命中后会跳到附近的敌人身上。' },
  poison:      { name: '毒雾',     icon: 'skill-poison_mist.png',     type: 'area',       tags: ['poison','area','dot'],             cd: 3.0,  dmg: 4,  spd: 0,   color: '#5FB79C', size: 34, zoneLife: 4.2, tickRate: 0.4,
                 desc: '大范围毒雾，铺得最久，适合拖住怪群。' },
  meteor:      { name: '陨石',     icon: 'sk-flamebomb.png',          type: 'area',       tags: ['fire','area','dot'],               cd: 3.6,  dmg: 14, spd: 0,   color: '#FF9B5A', size: 30, zoneLife: 2.4, tickRate: 0.35,
                 desc: '陨石落地爆发最疼，燃烧短，点名硬目标。' },
  frostnova:   { name: '霜爆',     icon: 'skill-frost_ray.png',       type: 'pulse',      tags: ['ice','area','pulse','slow'],       cd: 3.6,  dmg: 7,  spd: 0,   color: '#B6F0DC', size: 34,
                 desc: '大范围寒霜：覆盖面广、冷却长，适合清场。' },
  blade_storm: { name: '乱杀',     icon: 'skill-whirlwind.png',       type: 'area',       tags: ['physical','area','dot'],           cd: 2.4,  dmg: 7,  spd: 0,   color: '#D9C7A0', size: 26, zoneLife: 2.8, tickRate: 0.30,
                 desc: '刃风贴脸转动最快，近身收益最高。' },
  holybolt:    { name: '圣光弹',   icon: 'skill-holy_bolt.png',       type: 'projectile', tags: ['holy','projectile','pierceable'],  cd: 0.75, dmg: 7,  spd: 300, color: '#FFF3C4', size: 6,
                 desc: '连发圣光：单发伤害低，但射速快，适合持续压制。' },
  thorn:       { name: '荆棘环',   icon: 'skill-poison_thorn.png',    type: 'pulse',      tags: ['nature','area','pulse'],           cd: 2.6,  dmg: 10, spd: 0,   color: '#8FE07A', size: 30,
                 desc: '脚下炸开一圈荆棘，同时扎伤周围的敌人。' },
  orb:         { name: '雷球',     icon: 'skill-thunder_beam.png',    type: 'projectile', tags: ['lightning','projectile','homing'], cd: 1.10, dmg: 12, spd: 165, color: '#9BE7FF', size: 8,
                 desc: '慢速大雷球：出手慢但单发重，追着目标炸。' },
  spike:       { name: '扎心',     icon: 'skill-flame_field.png',     type: 'area',       tags: ['nature','area','dot'],             cd: 2.0,  dmg: 5,  spd: 0,   color: '#A8E06A', size: 24, zoneLife: 3.2, tickRate: 0.50,
                 desc: '裂地施放最快、单次最轻，靠长尾磨血。' },
  frostring:   { name: '寒冰环',   icon: 'skill-frost_ring.png',       type: 'pulse',      tags: ['ice','area','pulse','slow'],       cd: 1.6,  dmg: 6,  spd: 0,   color: '#CFEFFF', size: 30,
                 desc: '贴身高频冰环：范围小、转得快，近身缠斗用。' },
  spirit:      { name: '灵能箭',   icon: 'sk-galebow.png',       type: 'projectile', tags: ['arcane','projectile','pierceable','homing'], cd: 1.0, dmg: 8,  spd: 260, color: '#C3A8FF', size: 5,
                 desc: '灵能箭会自动追着敌人，并穿透 1 个目标——最稳的命中。' },
};

/** 技能 -> 美术资源（VFX 路径：assets/art/vfx/<组>/<子组>/<组件>/）
 *
 * ⚠️ 2026-10-20 用户反馈「部分技能与描述不符，比如灵能箭射出来是个球」→ 三个原本共用
 *    `arcane-orb`（圆球）的弹道技能换成形状对得上的素材：
 *      灵能箭（箭/bolt）   → projectile/lightning/energy-bolt（细长带尾，像箭）
 *      圣光弹（光弹/bolt） → projectile/lightning/plasma-shot（短促光弹）
 *      回旋刃（刀/刃）     → melee/slash/wide-cleave（月牙刃光，会跟着飞行方向转）
 */
export const SKILL_ART: Record<string, SkillArt> = {
  ring_blade:  { icon: 'skill-whirlwind.png',      proj: 'melee/slash/wide-cleave',    hit: 'feedback/hit/slash-hit' },
  mine_field:  { icon: 'skill-flame_field.png',    aoe: 'core/burst/warm-explosion',   hit: 'feedback/hit/fire-hit' },
  sentry:      { icon: 'skill-arcane_missile.png', proj: 'projectile/arcane/magic-missile', hit: 'core/spark/hit-spark' },
  charge_pulse:{ icon: 'skill-thunder_beam.png',   aoe: 'core/ring/shockwave',         hit: 'feedback/hit/shock-hit' },
  fireball:    { icon: 'skill-fireball.png',        proj: 'projectile/fire/fireball-shot',    hit: 'feedback/hit/fire-hit' },
  ice_spear:   { icon: 'skill-ice_spear.png',       proj: 'projectile/ice/ice-shard-shot',    hit: 'feedback/hit/ice-hit' },
  arcane:      { icon: 'skill-arcane_missile.png',  proj: 'projectile/arcane/magic-missile',  hit: 'core/spark/hit-spark' },
  blade:       { icon: 'skill-returning_blade.png', proj: 'melee/slash/wide-cleave',          hit: 'feedback/hit/slash-hit' },
  shockwave:   { icon: 'skill-shockwave.png',       aoe: 'core/ring/shockwave',               hit: 'feedback/hit/heavy-hit' },
  chain:       { icon: 'skill-chain_lightning.png', proj: 'projectile/lightning/energy-bolt', hit: 'feedback/hit/shock-hit' },
  poison:      { icon: 'skill-poison_mist.png',     zone: 'ground/fill/ground-fill-poison',   hit: 'feedback/hit/poison-hit',
                 cast: 'ground/poison/acid-splash' },
  meteor:      { icon: 'sk-flamebomb.png',          zone: 'ground/ring/burning-ground',       hit: 'feedback/hit/fire-hit',
                 cast: 'ground/ring/cast-circle', aoe: 'core/burst/warm-explosion' },
  frostnova:   { icon: 'skill-frost_ray.png',       aoe: 'ground/frost/frost-nova',           hit: 'feedback/hit/ice-hit' },
  blade_storm: { icon: 'skill-whirlwind.png',       zone: 'ground/ring/burning-ground',       hit: 'feedback/hit/slash-hit',
                 cast: 'melee/slash/spin-slash', swing: 'melee/slash/wide-cleave' },
  holybolt:    { icon: 'skill-holy_bolt.png',       proj: 'projectile/lightning/plasma-shot', hit: 'core/spark/hit-spark' },
  thorn:       { icon: 'skill-poison_thorn.png',    aoe: 'ground/ring/cast-circle',           hit: 'core/spark/block-spark' },
  orb:         { icon: 'skill-thunder_beam.png',    proj: 'projectile/lightning/plasma-shot', hit: 'feedback/hit/shock-hit' },
  spike:       { icon: 'skill-flame_field.png',     zone: 'ground/earth/stone-burst',         hit: 'feedback/hit/heavy-hit',
                 cast: 'core/dust/dirt-kick' },
  frostring:   { icon: 'skill-frost_ring.png',       aoe: 'ground/frost/frost-nova',           hit: 'feedback/hit/ice-hit' },
  spirit:      { icon: 'sk-galebow.png',             proj: 'projectile/lightning/energy-bolt', hit: 'core/spark/pierce-spark' },
};

/** 通用特效（不绑定技能） */
export const FX = {
  killSmall: 'core/burst/small-pop',
  killBig:   'core/burst/blast',
  crit:      'feedback/crit/critical-star',
  hurt:      'core/flash/parry-flash',
  levelUp:   'feedback/level_up/level-up-big',
  pickup:    'feedback/pickup/exp-gain',
  spawnWarn: 'core/ring/zap-ring',

  orbit:     'defense/orbit/shock-aura',
  heal:      'support/heal/heal',
  // 特效分层的通用层（见 Battle.hitEnemy / killEnemy）
  hitSpark:  'core/spark/hit-spark',
  critFlash: 'core/flash/storm-flash',
  killSpark: 'core/spark/spark-burst',
  killDust:  'core/dust/dust-cloud',
  killRing:  'core/ring/shockwave',
} as const;

export const SKILL_IDS = Object.keys(SKILLS);
