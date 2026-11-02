/**
 * 技能 × 黑科技 全量组合审计（只读，不改游戏逻辑）
 *
 * 目的：
 *   1. 用真实的 canInstall / calcSkill 枚举「17 技能 × 17 黑科技 × 最多 3 槽（可重复）」，
 *      找出「装得上但完全没效果」的黑科技；
 *   2. 用统一的 DPS 估算模型对比各组合，找数值断层（最强/中位/最弱）。
 *
 * ⚠️ DPS 是**估算模型**（每种技能形态一套公式），用于横向比较，不是游戏内实测值。
 *    公式口径写在 dpsOf() 里，改这里不用改游戏。
 *
 * 运行： node <tsx> tools/audit_combo.ts
 */
import { SKILLS, SKILL_IDS } from '../cocos/assets/scripts/data/Skills';
import { MODULES, MODULE_IDS, modIntEffect, modEffect } from '../cocos/assets/scripts/data/Modules';
import { calcSkill, canInstall, NEW_SKILL_ALLOW, type SkillInst } from '../cocos/assets/scripts/game/SkillCalc';
import { ringBladeCount } from '../cocos/assets/scripts/game/SkillRules';
import { emptyStats } from '../cocos/assets/scripts/game/Stats';
import type { CharStats } from '../cocos/assets/scripts/data/Types';

const STATS: CharStats = emptyStats();

/** 每种技能形态「真正会读」的 runtime 字段（读不到 = 该模块对这个技能无效） */
const CONSUMES: Record<string, string[]> = {
  projectile: ['dmg', 'spd', 'size', 'count', 'fan', 'pierce', 'bounce', 'orbit', 'split', 'chain', 'echo', 'burn', 'slow', 'vamp', 'thunder', 'harvest'],
  chain:      ['dmg', 'bounce', 'chain', 'size', 'echo', 'burn', 'slow', 'vamp', 'thunder', 'harvest'], // size=跳距；echo=重复施放
  orbit:      ['orbit', 'size', 'burn', 'slow', 'vamp', 'thunder', 'harvest'],            // 常驻：dmg 未参与结算（见报告 BUG）
  trap:       ['dmg', 'split', 'size', 'echo', 'burn', 'slow', 'vamp', 'thunder', 'harvest'], // size=爆炸半径
  summon:     ['dmg', 'count', 'fan', 'pierce', 'bounce', 'split', 'chain', 'burn', 'slow', 'vamp', 'thunder', 'harvest'],
  charge:     ['dmg', 'size', 'echo', 'burn', 'slow', 'vamp', 'thunder', 'harvest'],
  pulse:      ['dmg', 'size', 'echo', 'burn', 'slow', 'vamp', 'thunder', 'harvest'],
  area:       ['dmg', 'size', 'echo', 'burn', 'slow', 'vamp', 'thunder', 'harvest'],
};

/** 模块 → 它实际改动的 runtime 字段（与 SkillCalc / fireSkill 对齐） */
const MODULE_FIELD: Record<string, string> = {
  multi: 'count', fan: 'fan', split: 'split', bounce: 'bounce', pierce: 'pierce',
  orbit: 'orbit', giant: 'size', rapid: 'cd', echo: 'echo', burn: 'burn',
  frost: 'slow', vamp: 'vamp', chain: 'chain', snipe: 'spd', harvest: 'harvest',
  thunder: 'thunder', overload: 'dmg',
};

function dpsOf(skillId: string, rt: ReturnType<typeof calcSkill>): number {
  const def = SKILLS[skillId];
  const cd = Math.max(0.12, rt.cd);
  const echoMul = 1 + Math.min(3, rt.echo) * 0.6;      // 复读机：每份 +60%，最多 3 次
  switch (def.type) {
    case 'projectile': {
      const shots = rt.count + rt.fan * 2 * 0.55;
      const chainExtra = rt.chain > 0 ? rt.chain * 0.7 : 0;   // 每跳 70%，终结本体
      const bounceExtra = rt.bounce * 0.8;                    // 每次弹射 80% 递减（取 1 次）
      const splitExtra = rt.split > 0 ? 0.4 * (1 + rt.split) : 0;
      const perCast = rt.dmg * (shots + chainExtra + bounceExtra + splitExtra);
      return perCast * echoMul / cd;
    }
    case 'chain': {
      const hits = 3 + rt.bounce + rt.chain;
      const perCast = rt.dmg * (1 + 0.85 * (hits - 1));
      return perCast * echoMul / cd;                          // echo 已接入（最多 1 次，见 chainEchoRepeats）
    }
    case 'pulse': return rt.dmg * echoMul / cd;
    case 'area': {
      const ticks = Math.max(1, (SKILLS[skillId].zoneLife ?? 3.4) / (SKILLS[skillId].tickRate ?? 0.45));
      return rt.dmg * ticks * echoMul / cd;
    }
    case 'orbit': {
      const blades = ringBladeCount(1, rt.orbit);
      return 1.5 * blades / 0.25;                             // 实际固定值，不吃 rt.dmg
    }
    case 'trap': {
      const splitExtra = rt.split > 0 ? 0.4 * (1 + rt.split) : 0;
      return rt.dmg * (1 + splitExtra) * (1 + Math.min(1, rt.echo) * 0.6) / cd;
    }
    case 'summon': {
      const shots = rt.count + rt.fan * 2 * 0.55;
      return rt.dmg * shots / 0.9;
    }
    case 'charge': return rt.dmg * (1 + Math.min(1, rt.echo) * 0.6) / cd;
    default: return rt.dmg / cd;
  }
}

function mk(mods: string[]): SkillInst { return { id: 'x', lvl: 1, mods }; }

// ───────────────────────── 1. 兼容矩阵 + 空转检测 ─────────────────────────
console.log('================ A. 兼容矩阵 / 空转检测 ================');
const noop: string[] = [];
for (const sid of SKILL_IDS) {
  const def = SKILLS[sid];
  const consumes = CONSUMES[def.type] ?? [];
  const allowed: string[] = [];
  const blocked: string[] = [];
  for (const mid of MODULE_IDS) {
    const sk: SkillInst = { id: sid, lvl: 1, mods: [] };
    const r = canInstall(sk, mid);
    if (!r.ok) { blocked.push(mid); continue; }
    allowed.push(mid);
    const field = MODULE_FIELD[mid];
    const ok = field === 'cd' || field === 'dmg' ? true : consumes.includes(field);
    if (!ok) noop.push(`${def.name}(${sid}/${def.type}) × ${MODULES[mid].name}(${mid}) → 字段 ${field} 不被读取`);
  }
  console.log(`\n${def.name.padEnd(5)} [${def.type}] 可装 ${allowed.length}/17：${allowed.join(',') || '（无）'}`);
  if (blocked.length) console.log(`      不可装：${blocked.join(',')}`);
}
console.log('\n---- 空转清单（装得上但该技能形态不读这个字段）----');
console.log(noop.length ? noop.map(s => '  ! ' + s).join('\n') : '  （无）');

// ───────────────────────── 2. 白名单反向校验 ─────────────────────────
console.log('\n================ B. 新技能白名单 vs 实际消费字段 ================');
for (const sid of Object.keys(NEW_SKILL_ALLOW)) {
  const def = SKILLS[sid];
  const consumes = CONSUMES[def.type] ?? [];
  for (const mid of NEW_SKILL_ALLOW[sid]) {
    const field = MODULE_FIELD[mid];
    if (field !== 'cd' && field !== 'dmg' && !consumes.includes(field)) {
      console.log(`  ! 白名单里有无效项：${def.name} × ${MODULES[mid].name}（字段 ${field}）`);
    }
  }
}

// ───────────────────────── 3. 3 槽全组合 DPS 分布 ─────────────────────────
console.log('\n================ C. 3 槽全组合（可重复）DPS 分布 ================');
type Row = { sid: string; mods: string[]; dps: number };
const rows: Row[] = [];
for (const sid of SKILL_IDS) {
  const def = SKILLS[sid];
  const base = dpsOf(sid, calcSkill({ id: sid, lvl: 1, mods: [] }, STATS));
  // 枚举：17 个模块取 3 个（可重复，顺序无关）
  for (let a = 0; a < MODULE_IDS.length; a++) {
    for (let b = a; b < MODULE_IDS.length; b++) {
      for (let c = b; c < MODULE_IDS.length; c++) {
        const mods = [MODULE_IDS[a], MODULE_IDS[b], MODULE_IDS[c]];
        // 用 canInstall 逐步校验（含叠加上限与槽位）
        let sk: SkillInst = { id: sid, lvl: 1, mods: [] };
        let ok = true;
        for (const m of mods) {
          const r = canInstall(sk, m);
          if (!r.ok) { ok = false; break; }
          sk = { id: sid, lvl: 1, mods: [...sk.mods, m] };
        }
        if (!ok) continue;
        const rt = calcSkill(sk, STATS);
        rows.push({ sid, mods, dps: dpsOf(sid, rt) });
      }
    }
  }
  const mine = rows.filter(r => r.sid === sid);
  const best = mine.reduce((p, q) => (q.dps > p.dps ? q : p), mine[0]);
  const ratio = base > 0 ? best.dps / base : 0;
  console.log(`${def.name.padEnd(5)} 裸装 ${base.toFixed(1).padStart(7)} DPS → 最强 ${best.dps.toFixed(1).padStart(7)}`
    + ` (×${ratio.toFixed(2)})  [${best.mods.join('+')}]`);
}

const sorted = rows.slice().sort((a, b) => b.dps - a.dps);
console.log('\n---- 全表 Top 10 ----');
for (const r of sorted.slice(0, 10)) {
  console.log(`  ${SKILLS[r.sid].name.padEnd(5)} ${r.dps.toFixed(1).padStart(8)}  ${r.mods.join('+')}`);
}
console.log('---- 全表 Bottom 5 ----');
for (const r of sorted.slice(-5)) {
  console.log(`  ${SKILLS[r.sid].name.padEnd(5)} ${r.dps.toFixed(1).padStart(8)}  ${r.mods.join('+')}`);
}
const median = sorted[Math.floor(sorted.length / 2)].dps;
console.log(`\n组合总数 ${rows.length}；中位 ${median.toFixed(1)}；最强/中位 = ${(sorted[0].dps / median).toFixed(2)}×`);

// ───────────────────────── 4. 单模块边际收益 ─────────────────────────
console.log('\n================ D. 单模块边际收益（裸装 → 装 1 个）===============');
for (const sid of SKILL_IDS) {
  const base = dpsOf(sid, calcSkill({ id: sid, lvl: 1, mods: [] }, STATS));
  const gains: { m: string; g: number }[] = [];
  for (const mid of MODULE_IDS) {
    let sk: SkillInst = { id: sid, lvl: 1, mods: [] };
    if (!canInstall(sk, mid).ok) continue;
    const rt = calcSkill({ id: sid, lvl: 1, mods: [mid] }, STATS);
    gains.push({ m: mid, g: dpsOf(sid, rt) / base });
  }
  gains.sort((a, b) => b.g - a.g);
  const top = gains.slice(0, 3).map(x => `${x.m}×${x.g.toFixed(2)}`).join(' ');
  const zero = gains.filter(x => x.g < 1.001).map(x => x.m);
  console.log(`${SKILLS[sid].name.padEnd(5)} 最高增益：${top}${zero.length ? `   无增益：${zero.join(',')}` : ''}`);
}

// ───────────────────────── 5. 强化（Ⅱ/Ⅲ）阶梯 ─────────────────────────
console.log('\n================ E. 合成阶梯（Ⅰ/Ⅱ/Ⅲ 单装效果）===============');
for (const mid of ['multi', 'fan', 'split', 'bounce', 'pierce', 'orbit', 'chain', 'echo', 'giant', 'rapid', 'overload', 'snipe', 'burn', 'frost', 'vamp', 'harvest', 'thunder']) {
  const parts: string[] = [];
  for (const lv of ['', '_2', '_3']) {
    const id = mid + lv;
    const rt = calcSkill({ id: 'fireball', lvl: 1, mods: [id] }, STATS);
    const f = MODULE_FIELD[mid];
    const v = (rt as unknown as Record<string, number>)[f];
    parts.push(`${lv || '_1'}=${typeof v === 'number' ? v.toFixed(2) : v}`);
  }
  const e = `${modEffect(mid).toFixed(1)}/${modEffect(mid + '_2').toFixed(1)}/${modEffect(mid + '_3').toFixed(1)}`;
  const n = `${modIntEffect(mid)}/${modIntEffect(mid + '_2')}/${modIntEffect(mid + '_3')}`;
  console.log(`  ${MODULES[mid].name.padEnd(5)} e=${e}  int=${n}  实测(${MODULE_FIELD[mid]}) ${parts.join(' → ')}`);
}
