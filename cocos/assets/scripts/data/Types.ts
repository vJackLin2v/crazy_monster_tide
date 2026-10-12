/** 数据层共用类型 —— 全部来自 docs/systems/ 的规则定义 */

export type SkillType = 'projectile' | 'pulse' | 'area' | 'chain' | 'summon';

/** 技能标签：用于行为模块的兼容性判定与联动（docs/systems/tags.md） */
export type Tag =
  | 'fire' | 'ice' | 'lightning' | 'arcane' | 'physical' | 'poison' | 'nature' | 'holy'
  | 'projectile' | 'area' | 'pulse' | 'chain' | 'summon'
  | 'dot' | 'slow' | 'homing' | 'pierceable' | 'return';

export interface SkillDef {
  name: string;
  icon: string;            // assets/art/icons/skill-*.png
  type: SkillType;
  tags: Tag[];
  cd: number;              // 冷却（秒）
  dmg: number;             // 基础伤害
  spd: number;             // 投射物速度 px/s（非投射物为 0）
  color: string;
  size: number;            // 体积 / 范围基数
}

/** 行为模块叠加方式（docs/systems/behavior_modules.md） */
export type StackType = 'additive' | 'tier' | 'unique' | 'exclusive';

export interface ModuleDef {
  name: string;
  icon: string;
  stack: StackType;
  max: number;
  requires: Tag[];         // 兼容标签：技能须至少命中一个
  desc: string;
}

export interface CharStats {
  power: number; haste: number; area: number; maxhp: number; speed: number;
  crit: number; critdmg: number; pickup: number; armor: number; regen: number;
  projSpd: number; greed: number; tagAll: number;
  tagBonus: Record<string, number>;
  tagCdr: Record<string, number>;
  hp: number;
}

export interface ItemDef {
  name: string;
  icon: string;
  tier: 1 | 2;
  desc: string;
  apply: (s: CharStats) => void;
}

export interface CharDef {
  id: string;
  name: string;
  unit: string;            // assets/art/units/<unit>/
  pos: string;             // 正向天赋
  neg: string;             // 负向天赋（必须明显）
  start: string;           // 初始技能 id
  stats: Partial<CharStats> & { speedMul?: number; pickupMul?: number };
}

export interface EnemyDef {
  unit: string;
  hp: number; spd: number; dmg: number; r: number;
  exp: number; gold: number;
  from?: number;           // 从第几波解锁
  elite?: boolean;
  boss?: boolean;
}

export interface SkillArt {
  icon: string;
  proj?: string;
  hit?: string;
  aoe?: string;
  zone?: string;
}
