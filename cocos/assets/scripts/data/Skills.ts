import type { SkillDef, SkillArt } from './Types';

/** 16 个基础主动技能（docs/systems/skill_types.md；需求 §10 目标 16） */
export const SKILLS: Record<string, SkillDef> = {
  fireball:    { name: '火球',     icon: 'skill-fireball.png',        type: 'projectile', tags: ['fire','projectile'],              cd: 0.85, dmg: 12, spd: 190, color: '#FFA84B', size: 5 },
  ice_spear:   { name: '冰晶矛',   icon: 'skill-ice_spear.png',       type: 'projectile', tags: ['ice','projectile','pierceable'],   cd: 1.05, dmg: 10, spd: 250, color: '#88D6BC', size: 4 },
  arcane:      { name: '奥术飞弹', icon: 'skill-arcane_missile.png',  type: 'projectile', tags: ['arcane','projectile','homing'],    cd: 0.55, dmg: 6,  spd: 220, color: '#8C63CF', size: 4 },
  blade:       { name: '回旋刃',   icon: 'skill-returning_blade.png', type: 'projectile', tags: ['physical','projectile','return'],  cd: 1.25, dmg: 11, spd: 200, color: '#F7E9E0', size: 5 },
  shockwave:   { name: '震荡波',   icon: 'skill-ground_slash.png',    type: 'pulse',      tags: ['physical','area','pulse'],         cd: 2.4,  dmg: 14, spd: 0,   color: '#FFD166', size: 26 },
  chain:       { name: '连锁闪电', icon: 'skill-chain_lightning.png', type: 'chain',      tags: ['lightning','chain'],               cd: 1.8,  dmg: 9,  spd: 0,   color: '#9BE7FF', size: 0 },
  poison:      { name: '毒雾',     icon: 'skill-poison_mist.png',     type: 'area',       tags: ['poison','area','dot'],             cd: 2.8,  dmg: 5,  spd: 0,   color: '#5FB79C', size: 30 },
  sentry:      { name: '守卫图腾', icon: 'skill-arcane_turret.png',   type: 'summon',     tags: ['summon','arcane'],                 cd: 3.6,  dmg: 9,  spd: 0,   color: '#FFC98A', size: 0 },
  frostnova:   { name: '霜爆',     icon: 'skill-frost_ray.png',       type: 'pulse',      tags: ['ice','area','pulse','slow'],       cd: 3.2,  dmg: 8,  spd: 0,   color: '#B6F0DC', size: 34 },
  blade_storm: { name: '刃暴',     icon: 'skill-whirlwind.png',       type: 'area',       tags: ['physical','area','dot'],           cd: 3.0,  dmg: 6,  spd: 0,   color: '#D9C7A0', size: 26 },
  holybolt:    { name: '圣光弹',   icon: 'skill-arcane_pulse.png',    type: 'projectile', tags: ['holy','projectile','pierceable'],  cd: 1.4,  dmg: 9,  spd: 210, color: '#FFF3C4', size: 6 },
  thorn:       { name: '荆棘环',   icon: 'skill-poison_thorn.png',    type: 'pulse',      tags: ['nature','area','pulse'],           cd: 2.6,  dmg: 10, spd: 0,   color: '#8FE07A', size: 30 },
  orb:         { name: '雷球',     icon: 'skill-thunder_beam.png',    type: 'projectile', tags: ['lightning','projectile','homing'], cd: 0.95, dmg: 8,  spd: 175, color: '#9BE7FF', size: 6 },
  spike:       { name: '地刺',     icon: 'skill-flame_field.png',     type: 'area',       tags: ['nature','area','dot'],             cd: 2.9,  dmg: 6,  spd: 0,   color: '#A8E06A', size: 24 },
  frostring:   { name: '寒冰环',   icon: 'skill-frost_ray.png',       type: 'pulse',      tags: ['ice','area','pulse','slow'],       cd: 2.5,  dmg: 9,  spd: 0,   color: '#CFEFFF', size: 30 },
  spirit:      { name: '灵能箭',   icon: 'skill-arcane_pulse.png',    type: 'projectile', tags: ['arcane','projectile','pierceable'], cd: 0.9, dmg: 9,  spd: 265, color: '#C3A8FF', size: 5 },
};

/** 技能 -> 美术资源（VFX 路径：assets/art/vfx/<组>/<子组>/<组件>/） */
export const SKILL_ART: Record<string, SkillArt> = {
  fireball:    { icon: 'skill-fireball.png',        proj: 'projectile/fire/fireball-shot',    hit: 'feedback/hit/fire-hit' },
  ice_spear:   { icon: 'skill-ice_spear.png',       proj: 'projectile/ice/ice-shard-shot',    hit: 'feedback/hit/ice-hit' },
  arcane:      { icon: 'skill-arcane_missile.png',  proj: 'projectile/arcane/magic-missile',  hit: 'core/spark/hit-spark' },
  blade:       { icon: 'skill-returning_blade.png', proj: 'projectile/arcane/arcane-orb',     hit: 'feedback/hit/slash-hit' },
  shockwave:   { icon: 'skill-ground_slash.png',    aoe: 'core/ring/shockwave',               hit: 'feedback/hit/heavy-hit' },
  chain:       { icon: 'skill-chain_lightning.png', proj: 'projectile/lightning/energy-bolt', hit: 'feedback/hit/shock-hit' },
  poison:      { icon: 'skill-poison_mist.png',     zone: 'ground/fill/ground-fill-poison',   hit: 'feedback/hit/poison-hit' },
  sentry:      { icon: 'skill-arcane_turret.png',   proj: 'summon/summon_fx/summon' },
  frostnova:   { icon: 'skill-frost_ray.png',       aoe: 'ground/frost/frost-nova',           hit: 'feedback/hit/ice-hit' },
  blade_storm: { icon: 'skill-whirlwind.png',       zone: 'ground/ring/burning-ground',       hit: 'feedback/hit/slash-hit' },
  holybolt:    { icon: 'skill-arcane_pulse.png',    proj: 'projectile/arcane/arcane-orb',     hit: 'core/spark/hit-spark' },
  thorn:       { icon: 'skill-poison_thorn.png',    aoe: 'ground/ring/cast-circle',           hit: 'core/spark/block-spark' },
  orb:         { icon: 'skill-thunder_beam.png',    proj: 'projectile/lightning/plasma-shot', hit: 'feedback/hit/shock-hit' },
  spike:       { icon: 'skill-flame_field.png',     zone: 'ground/flame/flame-loop',          hit: 'feedback/hit/slash-hit' },
  frostring:   { icon: 'skill-frost_ray.png',       aoe: 'ground/frost/frost-nova',           hit: 'feedback/hit/ice-hit' },
  spirit:      { icon: 'skill-arcane_pulse.png',    proj: 'projectile/arcane/arcane-orb',     hit: 'core/spark/pierce-spark' },
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
  summon:    'summon/summon_fx/portal',
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
