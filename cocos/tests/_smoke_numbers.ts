
import { calcSkill, makeSkill } from '../assets/scripts/game/SkillCalc';
import { freshStats } from '../assets/scripts/game/Stats';
import { CHARS } from '../assets/scripts/data/Chars';
import { ITEMS } from '../assets/scripts/data/Items';

const st: any = freshStats(CHARS[0]);
let fail = 0;
const ok = (cond: boolean, msg: string) => { if (!cond) { fail++; console.log('FAIL ' + msg); } else console.log('PASS ' + msg); };
const near = (a: number, b: number, eps = 0.02) => Math.abs(a - b) <= eps;

// 1) 技能差异化后的数值
const expect: Record<string, [number, number]> = {
  ice_spear: [14, 1.25], holybolt: [7, 0.75], spirit: [8, 1.0],
  frostnova: [7, 3.6], frostring: [6, 1.6],
  poison: [4, 3.0], meteor: [14, 3.6], blade_storm: [7, 2.4], spike: [5, 2.0],
  arcane: [5, 0.5], orb: [12, 1.1],
};
for (const id of Object.keys(expect)) {
  const rt = calcSkill(makeSkill(id), st);
  const [dmg, cd] = expect[id];
  ok(Math.round(rt.dmg) === dmg && near(rt.cd, cd, 0.06), id + ' 伤害/冷却 = ' + Math.round(rt.dmg) + '/' + rt.cd.toFixed(2) + '（期望 ' + dmg + '/' + cd + '）');
}

// 2) 属性上限
const d3 = calcSkill(makeSkill('fireball'), { ...st, power: 3 }).dmg;
const d10 = calcSkill(makeSkill('fireball'), { ...st, power: 10 }).dmg;
ok(Math.round(d3) === Math.round(d10), '攻击力上限：×3 与 ×10 伤害相同（' + Math.round(d3) + '）');
const s22 = calcSkill(makeSkill('fireball'), { ...st, area: 2.2 }).size;
const s5 = calcSkill(makeSkill('fireball'), { ...st, area: 5 }).size;
ok(Math.round(s22) === Math.round(s5), '范围上限：×2.2 与 ×5 尺寸相同（' + Math.round(s22) + '）');

// 3) 冷却地板
const baseCd = calcSkill(makeSkill('fireball'), st).cd;
const cdNow = calcSkill(makeSkill('fireball'), { ...st, cdr: 0.48, haste: 1.96 }).cd;
ok(cdNow >= baseCd * 0.35 - 1e-6, '冷却地板：' + cdNow.toFixed(3) + 's ≥ 基础 ' + baseCd.toFixed(2) + '×0.35=' + (baseCd * 0.35).toFixed(3));

// 4) 道具
const a: any = { ...st }; (ITEMS as any)['count_l'].apply(a);
ok(a.count === 1 && near(a.extraProjDmg, 0.15), '三重镜：多重+1 且额外弹 +15%');
const c: any = { ...st }; (ITEMS as any)['slayer'].apply(c);
ok(near(c.eliteDmg, 0.20) && near(c.bossArmor, 0.10), '屠魔者：精英 +20% / 首领减伤 10%');

console.log('---- ' + (fail ? ('FAILED ' + fail) : 'ALL PASS') + ' ----');
if (fail) throw new Error('数值冒烟失败 ' + fail + ' 项');
