/** 数据层共用类型 —— 全部来自 docs/systems/ 的规则定义 */

export type SkillType = 'projectile' | 'pulse' | 'area' | 'chain' | 'orbit' | 'trap' | 'summon' | 'charge';

/** 技能标签：用于行为模块的兼容性判定与联动（docs/systems/tags.md） */
export type Tag = | 'fire' | 'ice' | 'lightning' | 'arcane' | 'physical' | 'poison' | 'nature' | 'holy'
  | 'projectile' | 'area' | 'pulse' | 'chain'
  | 'dot' | 'slow' | 'homing' | 'pierceable' | 'return' | 'orbit' | 'melee' | 'trap' | 'summon' | 'charge' | 'burst';

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
  /** 玩家向的一句话效果说明（M34 #1：卡片与构建面板都要显示） */
  desc: string;
  /** 持续区域时长（秒，默认 3.4）——第三轮：给持续伤害技能做定位差异 */
  zoneLife?: number;
  /** 持续区域跳动间隔（秒，默认 0.45） */
  tickRate?: number;
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
  // —— 基础 7 ——
  power: number; haste: number; area: number; maxhp: number; speed: number;
  crit: number; critdmg: number;
  // —— 投射 5 ——
  projSpd: number; pierce: number; bounce: number; count: number; sizeMul: number;
  // —— 生存 4 ——
  armor: number; regen: number; invuln: number; lifesteal: number;
  // —— 收益 4 ——
  pickup: number; greed: number; expGain: number; killHeal: number;
  // —— 特效 4 ——
  cdr: number; knockback: number; eliteDmg: number; /** 范围伤害加成（area/pulse 技能） */ aoeDmg: number;
  /** 额外弹（多重/扇射打出的第 2 发起）伤害加成（第三轮：三重镜） */
  extraProjDmg: number;
  /** 受到精英/BOSS 伤害减免（第三轮：屠魔者） */
  bossArmor: number;
  // —— 标签联动（道具写入，不是可升级属性）——
  tagAll: number;
  tagBonus: Record<string, number>;
  tagCdr: Record<string, number>;
  hp: number;
  /** 角色：模块提供的冷却效果倍率（秘术学徒 = 1.25；只作用于 rapid 模块，不影响其它 cdr） */
  modCdrMul?: number;
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
  stats: Partial<CharStats> & { speedMul?: number; pickupMul?: number; modCdrMul?: number };
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
  /** 施法动作（在角色身上播，替代「直接作用到敌人身上」的突兀感） */
  cast?: string;
  /** 挥击特效（朝目标方向播一道斩击） */
  swing?: string;
}
