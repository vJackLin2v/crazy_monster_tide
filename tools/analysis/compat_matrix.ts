/**
 * 分析脚本：16 技能 × 18 黑科技 的兼容矩阵（只读）
 *
 * import 真实的 SKILLS / MODULES / isCompatible()，避免手抄标签出错。
 * 运行： node <tsx> tools/analysis/compat_matrix.ts
 */
import { SKILLS } from '../../cocos/assets/scripts/data/Skills';
import { MODULES, MODULE_IDS } from '../../cocos/assets/scripts/data/Modules';
import { isCompatible } from '../../cocos/assets/scripts/game/SkillCalc';

const skillIds = Object.keys(SKILLS);
const rows = skillIds.map(sid => ({ sid, tags: SKILLS[sid].tags, mods: MODULE_IDS.filter(m => isCompatible(sid, m)) }));

console.log('=== 模块 → 可装技能数 ===');
const perMod = MODULE_IDS.map(m => ({ m, n: skillIds.filter(s => isCompatible(s, m)).length }))
  .sort((a, b) => a.n - b.n);
for (const { m, n } of perMod) {
  console.log('  ' + MODULES[m].name.padEnd(5) + ' ' + String(n).padStart(2) + ' 个技能'
    + '  requires=[' + MODULES[m].requires.join(',') + ']  max=' + MODULES[m].max
    + (n <= 2 ? '   ⚠ 极窄' : ''));
}

console.log('\n=== 技能 → 可装模块数 ===');
for (const r of rows.sort((a, b) => a.mods.length - b.mods.length)) {
  console.log('  ' + r.sid.padEnd(12) + String(r.mods.length).padStart(2) + ' 个模块  tags=[' + r.tags.join(',') + ']');
}

console.log('\n=== 兼容矩阵（● 可装） ===');
const head = 'skill'.padEnd(13) + skillIds.length + ' skills';
console.log(head);
const short = (m: string) => MODULES[m].name.slice(0, 3).padEnd(3);
console.log(''.padEnd(13) + MODULE_IDS.map(m => short(m)).join(' '));
for (const r of rows) {
  console.log(r.sid.padEnd(13) + MODULE_IDS.map(m => (isCompatible(r.sid, m) ? ' ● ' : ' · ')).join(''));
}

// 诊断：完全无处可装的模块 / 只有一个技能能吃到的模块
const dead = perMod.filter(x => x.n === 0);
console.log('\n无法安装到任何技能的模块：' + (dead.length ? dead.map(x => x.m).join(', ') : '无'));

// 同一个 requires 组合导致完全重叠的模块对（玩家分不出区别）
const byReq = new Map<string, string[]>();
for (const m of MODULE_IDS) {
  const key = MODULES[m].requires.slice().sort().join('+');
  byReq.set(key, [...(byReq.get(key) ?? []), m]);
}
console.log('\nrequires 完全相同的模块组（兼容池完全一致，只能靠效果区分）：');
for (const [k, arr] of byReq) if (arr.length > 1) console.log('  [' + k + '] → ' + arr.map(m => MODULES[m].name).join(' / '));
