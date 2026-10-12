import type { ModuleDef } from './Types';

/** 18 个行为模块（docs/systems/behavior_modules.md；需求 §10 目标约 18）
 *  核心规则：可重复安装；模块自己声明叠加方式与上限；兼容性由标签决定。 */
export const MODULES: Record<string, ModuleDef> = {
  multi:     { name: '多重', icon: '≡', stack: 'additive', max: 4, requires: ['projectile'],               desc: '一次施放多生成 1 个攻击实例' },
  fan:       { name: '扇射', icon: '⋔', stack: 'additive', max: 2, requires: ['projectile'],               desc: '以固定扇面同时发射，扩大覆盖' },
  split:     { name: '分裂', icon: '⋉', stack: 'additive', max: 3, requires: ['projectile'],               desc: '命中/结束后分裂出 2 枚小子弹' },
  bounce:    { name: '反弹', icon: '↺', stack: 'additive', max: 3, requires: ['projectile'],               desc: '命中后在附近目标间弹射 +1 次' },
  pierce:    { name: '穿透', icon: '⇢', stack: 'additive', max: 3, requires: ['projectile'],               desc: '可额外穿透 +1 个目标' },
  orbit:     { name: '环绕', icon: '◌', stack: 'additive', max: 3, requires: ['projectile'],               desc: '额外生成 1 个绕身旋转的弹体' },
  giant:     { name: '巨大', icon: '⬤', stack: 'additive', max: 3, requires: ['projectile','area','pulse'], desc: '体积/范围 +30%' },
  rapid:     { name: '急速', icon: '»', stack: 'tier',     max: 3, requires: ['projectile','pulse','chain'], desc: '冷却 -12%（乘区叠加）' },
  echo:      { name: '回响', icon: '↻', stack: 'tier',     max: 2, requires: ['area','pulse'],             desc: '施放后 0.4s 追加一次 60% 伤害' },
  burn:      { name: '灼烧', icon: '✹', stack: 'tier',     max: 3, requires: ['fire','lightning','holy'],  desc: '命中附加持续伤害' },
  frost:     { name: '冰缓', icon: '✽', stack: 'tier',     max: 2, requires: ['ice'],                      desc: '命中减速 35%，持续 1.2s' },
  vamp:      { name: '吸血', icon: '♥', stack: 'unique',   max: 1, requires: ['physical','poison'],        desc: '伤害的 6% 回复自身生命' },
  chain:     { name: '连锁', icon: '⛓', stack: 'tier',     max: 2, requires: ['projectile','chain'],       desc: '命中后跳向附近另一个目标' },
  snipe:     { name: '狙击', icon: '⌖', stack: 'tier',     max: 2, requires: ['projectile'],               desc: '弹速 +40%，伤害 +15%' },
  harvest:   { name: '收割', icon: '✂', stack: 'unique',   max: 1, requires: ['physical','fire','poison'],  desc: '每次击杀回复 1 点生命' },
  thunder:   { name: '雷鸣', icon: '⚡', stack: 'tier',     max: 2, requires: ['lightning','arcane','holy'], desc: '命中时 15% 概率落雷，造成范围伤害' },
  thornmail: { name: '荆棘', icon: '✜', stack: 'unique',   max: 1, requires: ['nature','physical'],        desc: '受击时反弹 8 点伤害给攻击者' },
  overload:  { name: '超载', icon: '⚠', stack: 'tier',     max: 2, requires: ['projectile','area','pulse'], desc: '伤害 +25%，但范围 -10%' },
};

export const MODULE_IDS = Object.keys(MODULES);
