/**
 * 分析脚本：1–20 波刷怪与强度曲线（只读，不改玩法）
 *
 * 直接 import 真实实现，避免"文档公式"和"代码公式"漂移：
 *   · spawnPlan() / waveScale() ← cocos/assets/scripts/game/Combat.ts
 *   · waveTime() / isBossWave() … ← cocos/assets/scripts/core/Const.ts
 *
 * 运行： node <tsx> tools/analysis/wave_curve.ts
 */
import { spawnPlan, waveScale } from '../../cocos/assets/scripts/game/Combat';
import { waveTime, isBossWave, isEliteWave, eliteCount, RUN } from '../../cocos/assets/scripts/core/Const';
import { ENEMIES, enemyPool } from '../../cocos/assets/scripts/data/Enemies';

const rows: string[] = [];
let cum = 0;
console.log('wave | time | interval | batch | 生成/秒 | 常规生成 | 开场铺怪 | 精英 | HP× | DMG× | 池 | 特殊');
for (let w = 1; w <= RUN.waves; w++) {
  const p = spawnPlan(w);
  const rate = p.batch / p.interval;
  const t = isBossWave(w) ? 0 : waveTime(w);
  const normal = isBossWave(w) ? 0 : Math.round(rate * t);     // BOSS 波普通怪不刷
  const open = isBossWave(w) ? 0 : Math.min(12, 5 + Math.floor(w / 2));
  const elite = isBossWave(w) ? '-' : (isEliteWave(w) ? String(eliteCount(w)) : '0');
  const sc = waveScale(w);
  const pool = isBossWave(w) ? '-' : String(enemyPool(w).length);
  cum += normal + open;
  console.log(
    String(w).padStart(4) + ' | ' + String(w % 10 === 0 ? '-' : t.toFixed(0)).padStart(4)
    + ' | ' + p.interval.toFixed(3).padStart(8)
    + ' | ' + String(p.batch).padStart(5)
    + ' | ' + rate.toFixed(2).padStart(7)
    + ' | ' + String(normal).padStart(8)
    + ' | ' + String(open).padStart(8)
    + ' | ' + elite.padStart(4)
    + ' | ' + sc.hp.toFixed(2).padStart(4)
    + ' | ' + sc.dmg.toFixed(2).padStart(5)
    + ' | ' + pool.padStart(2)
    + ' | ' + (isBossWave(w) ? 'BOSS' : isEliteWave(w) ? '精英波' : ''),
  );
  rows.push([w, t, p.interval, p.batch, rate, normal, open, elite, sc.hp, sc.dmg].join(','));
}

console.log('\n--- 关键跃迁（生成率相对上一波的变化） ---');
let prev = 0;
for (let w = 1; w <= RUN.waves; w++) {
  const p = spawnPlan(w);
  const rate = p.batch / p.interval;
  const d = prev ? (rate / prev - 1) * 100 : 0;
  if (Math.abs(d) >= 40) console.log('第 ' + w + ' 波：' + rate.toFixed(2) + '/s（' + (d > 0 ? '+' : '') + d.toFixed(0) + '%）');
  prev = rate;
}

console.log('\n--- 敌人基础数值（未乘波次倍率） ---');
const ids = Object.keys(ENEMIES);
for (const id of ids) {
  const e = ENEMIES[id];
  console.log(id.padEnd(15), 'hp', String(e.hp).padStart(4), 'spd', String(e.spd).padStart(3),
    'dmg', String(e.dmg).padStart(3), 'from', String(e.from ?? 1).padStart(2),
    e.boss ? 'BOSS' : e.elite ? 'ELITE' : '');
}
console.log('\n累计常规生成（1~20 波，不含开场铺怪/精英）：' + cum);
console.log('注：BOSS 波（10/20）普通怪不刷新 —— Battle.updateSpawn() 在 bossRef 存活时直接 return。');
