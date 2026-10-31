/**
 * M2-A.3b：DoT 击杀来源选择（纯函数，Battle 与单测共用）
 *
 * 只考虑**本次 tick 实际生效**的 DoT：
 *  - 仅 burn：burn 来源；
 *  - 仅 poison：poison 来源；
 *  - 两者：伤害较高的一层来源（相等取 burn，沿用既有规则）；
 *  - 缺失：unknown。
 * 已结束的 DoT 即使残留 dmg 数值也不参与比较。
 */
export function pickDotSource(d: {
  poisonActive: boolean; poisonDmg: number; poisonSkill?: string;
  burnActive: boolean; burnDmg: number; burnSkill?: string;
}): string {
  const poison = d.poisonActive ? (d.poisonSkill || 'unknown') : null;
  const burn = d.burnActive ? (d.burnSkill || 'unknown') : null;
  if (poison && burn) return d.burnDmg >= d.poisonDmg ? burn : poison;
  if (burn) return burn;
  if (poison) return poison;
  return 'unknown';
}
