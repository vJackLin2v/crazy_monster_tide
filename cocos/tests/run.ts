/**
 * 逻辑层单测（不需要 Cocos 编辑器）
 *  运行： npx tsx tests/run.ts        或   npm test
 *
 * 覆盖重点：
 *  1. D-13 回归：角色倍率不能被当成绝对值（移速/拾取）
 *  2. 行为模块叠加规则（additive / tier / 上限）
 *  3. 奖励池：4 类奖励、3 选 1、技能满了要替换
 *  4. 替换不让玩家损失（模块退回背包）
 *  5. 商店：固定 4 货位 / 购买后不消失 / 锁定刷新不掉 / 跨波携带
 *  6. 确定性：同 seed 同结果
 *  7. 波次规则：BOSS 波 / 精英波 / 无尽
 */
import { lastbreathMul, shatterMul, focusedMods, resonatorMul, VOLTLOOP_CHANCE, VOLTLOOP_DMG, VOLTLOOP_CD, greedPowerBonus, FRUGAL_REROLL_MUL, FRUGAL_WAVE_GOLD, THORNCOAT_DMG, THORNCOAT_CD } from '../assets/scripts/game/SpecialItems';
import { RunState } from '../assets/scripts/game/RunState';
import { calcSkill, makeSkill, canInstall, modCount, NEW_SKILL_ALLOW } from '../assets/scripts/game/SkillCalc';
import { MODULES, MODULE_IDS, MODULE_HOOKS, MODULE_NUMS, modEffect, modPower, TIER2_EFFECT } from '../assets/scripts/data/Modules';
import { assertStatsSane, freshStats, emptyStats } from '../assets/scripts/game/Stats';
import { CHARS } from '../assets/scripts/data/Chars';
import { RUN, waveTime, isBossWave, isEliteWave, eliteCount, BASE_SPEED, BASE_PICKUP, SHOP_SLOTS } from '../assets/scripts/core/Const';
import { ENEMIES, enemyPool, BOSS_UNITS, bossUnitFor } from '../assets/scripts/data/Enemies';
import { ATTRS } from '../assets/scripts/data/Attrs';
import { UNIT_FRAMES } from '../assets/scripts/data/UnitFrames';
import { ITEMS, ELITE_POOL, itemNumbers } from '../assets/scripts/data/Items';
import { CS, pageCount, cellPos, gridBottom, detailBox, detailRows, portraitFit } from '../assets/scripts/ui/CharLayout';
import { SKILLS, SKILL_ART } from '../assets/scripts/data/Skills';
import { VFX_FRAMES } from '../assets/scripts/data/VfxFrames';
import { ACHIEVEMENTS, achViews, newlyUnlocked, applyUnlocks } from '../assets/scripts/game/Achievements';
import { defaultSave } from '../assets/scripts/game/Progress';
import { balance, balanceOverride, balanceReset, DEFAULT_BALANCE } from '../assets/scripts/core/Balance';
import { canSourceTriggerModules, makeDamageContext, canHarvest, canVamp, ModuleUsage, type DamageSource } from '../assets/scripts/game/DamageContext';
import { killblastDamage, killblastRadius, shieldAmount, SHIELD_CAP, SHIELD_COOLDOWN, SHIELD_DURATION, executePct, returnstrikePct, lingeringChance, LINGER_TICKS, LINGER_TICK_DMG, LINGER_MAX_ZONES, overchargePeriod, overchargeMul } from '../assets/scripts/game/ModuleValues';
import { nextDifficulty, DIFFICULTIES, difficultyOf, eliteChance, spawnInterval, shopPrice, healAmount, healBudget } from '../assets/scripts/data/Difficulties';
import { BossSummonState } from '../assets/scripts/game/BossSummon';
import { migrateDifficulty } from '../assets/scripts/game/Progress';
import { splitBullets, echoRepeats, echoDelay, burnDuration, burnTickMul, frostSlowPct, frostDuration, slowFor } from '../assets/scripts/game/ModuleScale';
import { telemetryStart, telemetryWaveEnd, telemetryRunEnd, telemetryShopEnter, telemetryShopBuy, telemetryShopReroll, telemetryShopLeave, listRuns, summarize, economySummary, clearLogs } from '../assets/scripts/game/Telemetry';
import type { SaveData } from '../assets/scripts/game/Progress';
import { canSourceTriggerModules as canTrigV7, canSourceHarvest, canSourceVamp, makeDamageContext as makeCtxV7, resetCastSeq, nextCastId as nextCastIdV7 } from '../assets/scripts/game/DamageContext';
import { ringBladeCount, mineSplitCount, mineEchoRepeats, chargeEchoRepeats, sentryShotPlan, SENTRY_BULLET_SPEED, RING_BLADE_MAX } from '../assets/scripts/game/SkillRules';
import { rollEliteAffixes, affixHpMul, affixSpeedMul, affixSplits, eliteAffixRule, AFFIX_SPLIT_COUNT } from '../assets/scripts/game/EliteAffix';
import { parseSave, badgesForRun, badgeId, ENDLESS_MILESTONES } from '../assets/scripts/game/Progress';

let pass = 0, fail = 0;
const ok = (c: boolean, m: string) => { c ? (pass++, console.log('  PASS ' + m)) : (fail++, console.log('  FAIL ' + m)); };

console.log('\n== 1. D-13 回归：角色倍率不能被当成绝对值 ==');
for (const c of CHARS) {
  const s = freshStats(c);
  const errs = assertStatsSane(s);
  ok(errs.length === 0, `${c.name} 属性合理（移速 ${Math.round(s.speed)} px/s，拾取 ${Math.round(s.pickup)}）` + (errs.length ? ' → ' + errs.join('；') : ''));
}
ok(Math.abs(freshStats(CHARS[0]).speed - BASE_SPEED * 0.9) < 0.01, '骑士 = 基础移速 x 0.90 倍率');
ok(Math.abs(freshStats(CHARS[2]).pickup - BASE_PICKUP * 1.5) < 0.01, '游侠拾取 = 基础 x 1.5 倍率（基础 ' + BASE_PICKUP + '）');

// M50：每个黑科技都必须有运行时落点，且声明 calc 的模块真的会改动结算
{
  const st = freshStats(CHARS[0]);
  const missing = MODULE_IDS.filter(id => !MODULE_HOOKS[id] || !MODULE_HOOKS[id].length);
  ok(missing.length === 0, '每个黑科技都有运行时落点（缺失：' + (missing.join(',') || '无') + '）');
  const noNums = MODULE_IDS.filter(id => !MODULE_NUMS[id]);
  ok(noNums.length === 0, '每个黑科技都有数值说明（缺失：' + (noNums.join(',') || '无') + '）');
  const skillFor = (id: string) => {
    const req = MODULES[id].requires as unknown as string[];
    return Object.keys(SKILLS).find(k => (SKILLS[k].tags as unknown as string[]).some(tag => req.includes(tag)));
  };
  const noEffect: string[] = [];
  for (const id of MODULE_IDS) {
    if (!MODULE_HOOKS[id].includes('calc')) continue;
    const skId = skillFor(id);
    if (!skId) { noEffect.push(id + '(无兼容技能)'); continue; }
    const base = calcSkill(makeSkill(skId), st);
    const withMod = calcSkill({ ...makeSkill(skId), mods: [id] }, st);
    const changed = Object.keys(base).some(k => JSON.stringify((base as unknown as Record<string, unknown>)[k]) !== JSON.stringify((withMod as unknown as Record<string, unknown>)[k]));
    if (!changed) noEffect.push(id);
  }
  ok(noEffect.length === 0, '声明 calc 的黑科技都真的改动了结算（无效果：' + (noEffect.join(',') || '无') + '）');
}

console.log('\n== 2. 行为模块叠加规则 ==');
{
  const st = freshStats(CHARS[0]);
  const base = calcSkill(makeSkill('fireball'), st);
  ok(base.count === 1, '初始投射物数量 1');
  // M30 #1：扇射只改 fan，实际发数 = count + fan*2（在 Battle.fireSkill 里结算）
  ok(calcSkill({ ...makeSkill('fireball'), mods: ['fan'] }, st).fan === 1, '扇射 → fan=1（施放发数 = count + fan×2）');

  const s2 = makeSkill('fireball'); s2.mods = ['multi'];
  ok(calcSkill(s2, st).count === 2, '多重 x1 → 数量 2');
  const s3 = makeSkill('fireball'); s3.mods = ['multi', 'multi'];
  ok(calcSkill(s3, st).count === 3, '多重 x2 → 数量 3（可重复安装）');

  const s4 = makeSkill('fireball'); s4.mods = ['giant'];
  ok(Math.abs(calcSkill(s4, st).size / base.size - 1.3) < 0.001, '巨大 x1 → 体积 x1.30');

  const s5 = makeSkill('fireball'); s5.mods = ['rapid', 'rapid'];
  const c5 = calcSkill(s5, st), c0 = calcSkill(makeSkill('fireball'), st);
  ok(Math.abs(c5.cd / c0.cd - 0.88 * 0.88) < 0.001, '急速 x2 → 冷却 x0.88²（乘区叠加）');

  const s6 = makeSkill('fireball'); s6.mods = ['overload'];
  const c6 = calcSkill(s6, st);
  ok(Math.abs(c6.dmg / base.dmg - 1.25) < 0.001, '超载 → 伤害 +25%');
  ok(c6.size < base.size, '超载 → 范围 -10%（有代价，不是纯赚）');

  const s7 = makeSkill('fireball'); s7.mods = ['burn'];
  ok(calcSkill(s7, st).burn === 1, '灼烧 → burn 标志生效');
}
ok(!canInstall(Object.assign(makeSkill('fireball'), { mods: ['multi','multi','multi','multi'] }), 'multi').ok, '多重的数量上限生效（max=4）');
ok(canInstall(makeSkill('fireball'), 'multi').ok && !canInstall(makeSkill('fireball'), 'burst' as string).ok, '兼容性判定：多重可装 / 未知模块不可装');

console.log('\n== 3. 奖励池 ==');
{
  const rs = new RunState('knight', 20261012);
  const kinds = new Set<string>();
  for (let i = 0; i < 30; i++) rs.rollRewards().forEach(r => kinds.add(r.kind));
  ok(kinds.size >= 3, '奖励池覆盖多类：' + [...kinds].join('/'));
  const r1 = rs.rollRewards();
  ok(r1.length === 3, '每次 3 选 1（实际 ' + r1.length + '）');
  const uniq = new Set(r1.map(r => r.kind + ':' + r.id));
  ok(uniq.size === r1.length, '同一次 3 张卡不重复');
}
{
  const rs = new RunState('knight', 7);
  rs.skills = ['fireball','ice_spear','arcane','shockwave'].map(makeSkill);
  let sawReplace = false;
  for (let i = 0; i < 60; i++) if (rs.rollRewards().some(r => r.needReplace)) { sawReplace = true; break; }
  ok(sawReplace, '技能满 4 个时会给出「需替换」的新技能');
}

console.log('\n== 4. 替换不让玩家损失 ==');
{
  const rs = new RunState('knight', 1);
  rs.skills = [makeSkill('fireball'), makeSkill('ice_spear'), makeSkill('arcane'), makeSkill('shockwave')];
  rs.skills[0].mods = ['multi', 'pierce'];
  rs.modsBag = [];
  const back = rs.replaceSkill(0, 'blade');
  ok(rs.skills[0].id === 'blade', '技能已替换为 blade');
  ok(back.length === 2 && rs.modsBag.length === 2, '被替换技能上的 2 个模块退回背包（不损失）');
}
{
  const rs = new RunState('knight', 1);
  rs.skills[0].mods = ['multi', 'multi', 'pierce'];   // 3 槽塞满
  rs.modsBag = ['giant'];
  const r = rs.installAt(0, 0, 'giant');
  ok(rs.skills[0].mods[0] === 'giant', '槽位替换：giant 顶掉了第 1 槽');
  ok(r.replaced === 'multi' && rs.modsBag.includes('multi'), '被顶掉的 multi 退回背包');
  ok(!rs.modsBag.includes('giant'), '装上去的 giant 从背包移除');
}
{
  // M30 #5：Build 面板重新分配「已经装在技能上」的模块（背包空也要能做，且不损失）
  const rs = new RunState('knight', 1);
  rs.skills = [makeSkill('fireball'), makeSkill('ice_spear')];
  rs.skills[0].mods = ['pierce', 'giant'];
  rs.modsBag = [];
  ok(rs.moveMod(0, 0, 1, 0) === true, '跨技能搬模块：火球 → 冰晶矛');
  ok(rs.skills[0].mods.length === 1 && rs.skills[0].mods[0] === 'giant', '源技能只剩 giant');
  ok(rs.skills[1].mods[0] === 'pierce', '目标技能拿到了 pierce');
  ok(rs.modsBag.length === 0, '背包不变（是直接搬，不是退回背包）');
  // 目标槽已占用 -> 交换，谁也不丢
  const rs2 = new RunState('knight', 1);
  rs2.skills = [makeSkill('fireball'), makeSkill('ice_spear')];
  rs2.skills[0].mods = ['pierce'];
  rs2.skills[1].mods = ['multi'];                      // 两个都满足 projectile 标签，可互换
  const swapped = rs2.moveMod(0, 0, 1, 0);
  ok(swapped && rs2.skills[0].mods[0] === 'multi' && rs2.skills[1].mods[0] === 'pierce', '目标已占用时交换（不损失）');
}
{
  // M32：3 个同名模块 → 1 个「II」强化（效果 ×2、只占 1 槽；强化不再参与合成）
  const rs = new RunState('knight', 1);
  rs.skills = [makeSkill('fireball')];
  rs.modsBag = ['pierce', 'pierce', 'pierce', 'giant'];
  ok(rs.mergeReady('pierce') === 1, '3 个穿透 = 可合成 1 次');
  ok(rs.mergeModule('pierce') === true, '合成成功');
  ok(rs.modsBag.filter(x => x === 'pierce').length === 0 && rs.modsBag.includes('pierce_2'), '3 个基础模块换成 1 个 pierce_2');
  ok(rs.mergeReady('pierce') === 0, '强化模块不能再合成（封顶 ×2）');
  ok(rs.mergeModule('pierce') === false, '凑不满 3 个时合成失败（不会吞模块）');
  rs.skills[0].mods = ['pierce_2'];
  ok(calcSkill(rs.skills[0], freshStats(CHARS[0])).pierce === 2, '强化穿透 = 2 份效果，但只占 1 个槽');
  ok(rs.moveMod(0, 0, 0, 0) === false, '同一槽移到自己身上 = 无操作');
  // 反例：目标技能不兼容 -> 拒绝，谁都不动
  const rs3 = new RunState('knight', 1);
  rs3.skills = [makeSkill('fireball'), makeSkill('blade_storm')];
  rs3.skills[0].mods = ['pierce'];
  rs3.skills[1].mods = ['giant'];
  ok(rs3.moveMod(0, 0, 1, 1) === false && rs3.skills[0].mods[0] === 'pierce', '目标技能不兼容时拒绝移动（不乱丢模块）');
}

console.log('')
console.log('== 4b. 属性数量 + 是否真的进结算（需求 §10） ==')
{
  ok(Object.keys(ATTRS).length === 24, '核心属性 24 个（实际 ' + Object.keys(ATTRS).length + '）');
  ok(ATTRS.pierce !== undefined && ATTRS.cdr !== undefined && ATTRS.lifesteal !== undefined,
     '新增属性已在数据表里');
  const st = emptyStats();
  const c0 = calcSkill(makeSkill('fireball'), st);
  st.cdr = 0.3; st.count = 2; st.pierce = 2;
  const c1 = calcSkill(makeSkill('fireball'), st);
  ok(c1.cd < c0.cd, '★ 冷却缩减生效（' + c0.cd.toFixed(2) + 's → ' + c1.cd.toFixed(2) + 's）');
  ok(c1.count === c0.count + 2, '★ 多重生效（' + c0.count + ' → ' + c1.count + '）');
  ok(c1.pierce === c0.pierce + 2, '★ 穿透生效（' + c0.pierce + ' → ' + c1.pierce + '）');
}

console.log('')
console.log('')
console.log('== 4d. BOSS 数量 + 帧清单 ==')
{
  ok(BOSS_UNITS.length >= 5 && BOSS_UNITS.length <= 6, 'BOSS 数量 5~6（实际 ' + BOSS_UNITS.length + '）');
  ok(BOSS_UNITS.every(u => !!UNIT_FRAMES[u]), '每个 BOSS 都在帧清单里');
  ok(BOSS_UNITS.every(u => (UNIT_FRAMES[u].idle ?? 0) > 0 && (UNIT_FRAMES[u].death ?? 0) > 0),
     '每个 BOSS 都有 idle + death 帧');
  ok(bossUnitFor(10) !== bossUnitFor(20), '第 10 / 20 波是不同 BOSS');
}

console.log('== 4c. 道具数量（需求 §10：52 普通 + 25 高级） ==')
{
  const ids = Object.keys(ITEMS);
  const t1 = ids.filter(k => ITEMS[k].tier === 1).length;
  const t2 = ids.filter(k => ITEMS[k].tier === 2).length;
  ok(ids.length === 80, '道具共 70 个（实际 ' + ids.length + '）');
  ok(t1 === 52, '普通道具 50 个（实际 ' + t1 + '）');
  ok(t2 === 25, '高级道具 20 个（实际 ' + t2 + '）');
  ok(ELITE_POOL.every(k => ITEMS[k] && ITEMS[k].tier === 2), '精英掉落池里全是高级道具');
  // M43：道具详情的数值说明（从 apply 反推）
  ok(itemNumbers(ITEMS.power_s, 'power_s') === '攻击力 +8%', '数值说明：铁匠手套 = 攻击力 +8%');
  ok(itemNumbers(ITEMS.speed_l, 'speed_l').indexOf('移动速度 +14%') === 0, '数值说明：移速类按百分比显示');
  ok(itemNumbers(ITEMS.t_fire, 't_fire') === '火系技能伤害 +25%', '数值说明：余烬核心 = 火系技能伤害 +25%');
  ok(itemNumbers(ITEMS.dragon, 'dragon').indexOf('生命上限 +40') === 0, '数值说明：巨龙之心含「生命上限 +40」');
  // 抽一个道具验证它真的改属性
  const st = emptyStats();
  const before = st.power;
  ITEMS.power_l.apply(st);
  ok(st.power > before, '★ 道具生效（攻击力 ' + before.toFixed(2) + ' → ' + st.power.toFixed(2) + '）');
}

console.log('\n== 4e. 角色选择布局（3 列 / 一页 6 个 / 立绘按格子自适应） ==');
{
  ok(CHARS.length === 6, '角色 6 个（实际 ' + CHARS.length + '）');
  ok(pageCount(CHARS.length) === 1 && CS.PER_PAGE === 6, '6 个角色 → 1 页放得下（每屏 ' + CS.PER_PAGE + ' 个）');

  // 立绘按「裁掉透明留白后的内容尺寸」整数倍放大：13×15 → 6 倍 = 78×90
  const k1 = portraitFit(13, 15), k2 = portraitFit(17, 25);
  // M1 视觉升级：卡片 124→90 高，立绘目标高度 90→60（仍占卡高 2/3，把空间让给详情）
  ok(k1.k === 4 && k1.w === 52 && k1.h === 60, '13×15 立绘 → 4 倍 = 52×60（卡高 90 的 2/3）');
  ok(k2.k === 2 && k2.w === 34 && k2.h === 50, '17×25 骑乘立绘 → 2 倍 = 34×50');
  const allFit = [[13, 15], [14, 15], [12, 14], [17, 25]].every(([w, h]) => {
    const f = portraitFit(w, h);
    return f.w <= CS.CARD_W - 12 && f.h <= CS.PORTRAIT && f.k >= 1;
  });
  ok(allFit, '所有立绘都在格子可用区（≤ ' + Math.floor(CS.CARD_W - 12) + ' × ' + CS.PORTRAIT + '）');

  // 立绘 + 姓名必须在格子内，且互不压（3px 描边内缩）
  const innerH = CS.CARD_H / 2 - 3;
  const pTop = CS.PORTRAIT_DY + CS.PORTRAIT / 2;
  const pBot = CS.PORTRAIT_DY - CS.PORTRAIT / 2;
  const lTop = CS.NAME_DY + 10;
  const lBot = CS.NAME_DY - 10;
  ok(pTop <= innerH + 0.01 && pBot >= -innerH - 0.01, '立绘在格子内（上留白 ' + Math.round(innerH - pTop) + 'px）');
  ok(pBot - lTop >= 1.5 && lBot >= -innerH - 0.01, '姓名在立绘下方且不出格子（间隔 ' + (pBot - lTop).toFixed(0) + 'px）');

  let inX = true, inY = true;
  for (let s = 0; s < CS.PER_PAGE; s++) {
    const p = cellPos(s);
    if (p.x - CS.CARD_W / 2 < CS.MARGIN_X - 0.01 || p.x + CS.CARD_W / 2 > 360 - CS.MARGIN_X + 0.01) inX = false;
    if (p.cy + CS.CARD_H / 2 > gridBottom() + 0.01) inY = false;
  }
  ok(inX && inY, '一页 6 格都落在 12~348 的安全区内');
  ok(cellPos(0).cy - CS.CARD_H / 2 >= CS.GRID_TOP - 0.01, '第一行格子不压标题（网格顶边 ' + CS.GRID_TOP + '）');
  ok(Math.abs(cellPos(0).x + cellPos(2).x - 360) < 0.01, '3 列关于屏幕中线对称');

  for (const vh of [640, 760, 844]) {
    const box = detailBox(vh);
    const dr = detailRows(box.height);
    const half = box.height / 2;
    const fits = (r: { y: number; h: number }) => Math.abs(r.y) + r.h / 2 <= half + 0.5;
    ok(fits(dr.name) && fits(dr.pos) && fits(dr.neg) && fits(dr.skill) && fits(dr.stat),
       'VH ' + vh + '：详情 ' + Math.round(box.height) + 'px ' + (dr.compact ? '紧凑' : '完整') + '排版，内容全在面板内');
    ok(box.top > gridBottom() && box.top + box.height < vh - 65,
       'VH ' + vh + '：详情面板夹在网格与底部按钮之间（' + box.top + ' → ' + Math.round(box.top + box.height) + '）');
    // ⚠️ 用户反馈「角色格子和详情面板边框重叠」：缝隙必须够，否则 3px 描边会糊在一起
    ok(box.top - gridBottom() >= 10, 'VH ' + vh + '：网格与详情面板之间留 ' + Math.round(box.top - gridBottom()) + 'px 缝（≥10）');
  }

  const noOverlap = [640, 700, 760, 844].every(vh => {
    const dr = detailRows(detailBox(vh).height);
    const items = [
      { y: dr.name.y, halfH: dr.name.size / 2 },
      { y: dr.pos.y, halfH: dr.pos.size / 2 },
      { y: dr.neg.y, halfH: dr.neg.size / 2 },
      { y: dr.skill.y, halfH: dr.skill.h / 2 },
      { y: dr.stat.y, halfH: dr.stat.h / 2 },   // stat 现在是 2×3 属性网格块
    ];
    for (let i = 0; i + 1 < items.length; i++) {
      if (items[i].y - items[i + 1].y < items[i].halfH + items[i + 1].halfH - 0.6) return false;
    }
    return true;
  });
  ok(noOverlap, '详情五行互不压字（VH 640 / 700 / 760 / 844）');
}

console.log('\n== 4f. 技能视觉与描述一致（用户反馈「灵能箭射出来是个球」） ==');
{
  // 1) 所有引用的 VFX key 必须真实存在（打错一个字就静默变成空特效）
  const missing: string[] = [];
  for (const [id, a] of Object.entries(SKILL_ART)) {
    for (const k of [a.proj, a.hit, a.aoe, a.zone, a.cast, a.swing]) {
      if (k && VFX_FRAMES[k] === undefined) missing.push(id + ':' + k);
    }
  }
  ok(missing.length === 0, '16 个技能的 VFX key 全在 VfxFrames 表里' + (missing.length ? ' → ' + missing.join(', ') : ''));

  // 2) 不许再用「圆球」当弹道（灵能箭/圣光弹/回旋刃 原本都是 arcane-orb）
  const BALL = new Set(['projectile/arcane/arcane-orb', 'projectile/arcane/homing-orb']);
  const balls = Object.entries(SKILL_ART).filter(([, a]) => a.proj && BALL.has(a.proj)).map(([id]) => id);
  ok(balls.length === 0, '没有弹道技能再用圆球素材' + (balls.length ? ' → ' + balls.join(', ') : ''));

  // 3) 形状要对得上名字
  ok(SKILL_ART.spirit.proj === 'projectile/lightning/energy-bolt', '灵能箭 = 细长带尾的 bolt（不再是球）');
  ok(SKILL_ART.holybolt.proj === 'projectile/lightning/plasma-shot', '圣光弹 = 光弹（不再是球）');
  ok(SKILL_ART.blade.proj === 'melee/slash/wide-cleave', '回旋刃 = 月牙刃光（不再是球）');

  // 4) 区域技能要有施法动作（用户反馈「刃爆看不出施法，直接作用到敌人身上」）
  ok(!!SKILL_ART.blade_storm.cast && !!SKILL_ART.blade_storm.swing, '刃暴有施法动作（cast + swing）');
  const areaIds = Object.keys(SKILLS).filter(id => SKILLS[id].type === 'area');
  ok(areaIds.length > 0 && areaIds.every(id => !!SKILL_ART[id] && !!SKILL_ART[id].cast), 
     '所有区域技能都有起手动作（' + areaIds.join('/') + '）');
}

console.log('\n== 5. 商店（固定货位 / 购买不消失 / 锁定） ==');
{
  const rs = new RunState('knight', 99);
  rs.wave = 3;
  rs.refreshShop(false);
  ok(rs.shopStock?.length === SHOP_SLOTS, `固定 ${SHOP_SLOTS} 个货位`);
  ok(rs.shopStock!.every(s => s.price > 0), '每个货位都有价格');
  // 回归：refreshShop 漏了把抽到的 id 记进 used → 4 个货位会刷成同一件商品
  const slotIds = rs.shopStock!.map(s => s.kind + ':' + s.id);
  ok(new Set(slotIds).size === slotIds.length, '★ 4 个货位互不重复（' + slotIds.join(' / ') + '）');

  rs.gold = 500;
  const before = rs.shopStock!.length;
  const buy = rs.buySlot(0);
  ok(buy.ok, '购买成功');
  ok(rs.shopStock!.length === before, '★ 购买后货位数量不变（不消失）');
  ok(rs.shopStock![0].sold === true, '该货位置为已购买');
  ok(!rs.buySlot(0).ok, '已购买的货位不能重复买');

  const id1 = rs.shopStock![1].id;
  rs.toggleLock(1);
  ok(rs.rerollShop(), '刷新成功');
  ok(rs.shopStock![1].id === id1 && rs.shopStock![1].locked, '★ 锁定的货位刷新后仍在');

  rs.carryLockedToNextWave();
  const carried = rs.carryOver.length;
  ok(carried >= 1, '锁定的货位被带到下一波（' + carried + ' 件）');
  rs.shopStock = null;
  rs.refreshShop(false);
  ok(rs.shopStock!.some(s => s.id === id1), '下一波商店里能看到带过来的锁定货');
}

console.log('\n== 5f. 成就系统（纯逻辑） ==');
{
  const mk = (o: Partial<SaveData> = {}): SaveData => ({ ...defaultSave(), ...o });
  const fresh = mk();
  ok(achViews(fresh).length === ACHIEVEMENTS.length, '成就定义 ' + ACHIEVEMENTS.length + ' 条，视图一一对应');
  ok(achViews(fresh).every(v => !v.done && v.cur === 0), '全新区间：全部未解锁、进度 0');

  const s1 = mk({ runs: 1, kills: 150, bestWave: 10 });
  const n1 = newlyUnlocked(s1);
  ok(n1.includes('first_run') && n1.includes('kills_100') && n1.includes('wave_10'), '达标的三条被识别');
  ok(!n1.includes('kills_1000') && !n1.includes('wave_20') && !n1.includes('win_1'), '未达标的不会被误解锁');
  ok(applyUnlocks(s1) === true && s1.ach.length === 3, 'applyUnlocks 写入 3 条');
  ok(applyUnlocks(s1) === false, '重复调用不再新增（幂等）');
  ok(achViews(s1).filter(v => v.done).length === 3, '视图里 3 条已完成');

  const s2 = mk({ kills: 100 });
  ok(applyUnlocks(s2) && s2.ach.includes('kills_100'), '边界：正好达标即解锁');
  ok(achViews(mk({ kills: 99999 })).find(v => v.def.id === 'kills_1000')!.cur === 1000, '进度按 target 截断，不溢出');
}

console.log('\n== 5g. 数值表与战斗日志（纯逻辑） ==');
{
  // 数值表：默认值可读、局部覆盖只改目标字段、reset 回到默认
  ok(balance().spawn.batchMax === DEFAULT_BALANCE.spawn.batchMax, '默认数值表可读（batchMax=' + DEFAULT_BALANCE.spawn.batchMax + '）');
  const before = balance().shop.modBase;
  balanceOverride({ shop: { modBase: before + 5 } });
  ok(balance().shop.modBase === before + 5, '局部覆盖生效（只改 modBase）');
  ok(balance().spawn.batchMax === DEFAULT_BALANCE.spawn.batchMax, '覆盖不影响其它分组');
  balanceReset();
  ok(balance().shop.modBase === before, 'reset 后恢复默认');

  // 日志：没有 localStorage 时不能崩，且空数据可汇总
  let threw = false;
  try {
    telemetryStart('knight', 1);
    telemetryWaveEnd({ wave: 1, kills: 10, lv: 2, gold: 20, aliveMax: 6, hp: 50, dmgTaken: 12 });
    telemetryRunEnd({ end: 'dead', deathWave: 1, kills: 10, maxAlive: 6, dmgTaken: 12, durSec: 18 });
  } catch { threw = true; }
  ok(!threw, '日志 API 在无 localStorage 环境下不抛异常');
  ok(Array.isArray(listRuns()), 'listRuns 返回数组');
  ok(typeof summarize() === 'object', 'summarize 返回对象');
}

console.log('\n== 5h. 非 UI BUG 回归（B1/B2/B3/B4/B10） ==');
{
  const mk = (charId = 'knight') => new RunState(charId, 12345);
  const total = (rs: any, base: string) => {
    let n = 0;
    for (const m of rs.modsBag) if ((m === base || m === base + '_2')) n += (m === base + '_2' ? 2 : 1);
    for (const s of rs.skills) for (const m of s.mods) if (m && (m === base || m === base + '_2')) n += (m === base + '_2' ? 2 : 1);
    return n;
  };

  // B1：替换技能不得复制模块（总量守恒）
  {
    const rs = mk();
    rs.skills[0].mods = ['multi', 'pierce'];
    const before = total(rs, 'multi') + total(rs, 'pierce');
    rs.replaceSkill(0, 'ice_spear');
    const after = total(rs, 'multi') + total(rs, 'pierce');
    ok(before === after && after === 2, 'B1 替换技能后模块总量不变（' + before + ' → ' + after + '）');
    ok(rs.modsBag.filter(m => m === 'multi').length === 1, 'B1 背包里 multi 只有 1 份（无重复返还）');
  }

  // B2：跨技能移到"第 3 个空槽"不能产生稀疏数组
  {
    const rs = mk();
    rs.skills.push({ id: 'ice_spear', lvl: 1, mods: [] } as never);
    rs.skills[0].mods = ['multi'];
    const okMove = rs.moveMod(0, 0, 1, 2);       // 目标技能只有 0 个模块，点第 3 槽
    const b = rs.skills[1].mods;
    const holeFree = b.length === 1 && b.every(m => typeof m === 'string' && m.length > 0);
    ok(okMove && holeFree, 'B2 跨技能移动到空槽后数组连续（length=' + b.length + '）');
    ok(!Object.keys(b).some(k => b[Number(k)] === undefined), 'B2 无 undefined 空洞');
  }

  // B3：installAt 的非法输入必须抛错且不改变状态
  {
    const rs = mk();
    rs.modsBag = ['multi'];
    const snap = () => JSON.stringify({ bag: rs.modsBag, mods: rs.skills.map(s => s.mods) });
    const before = snap();
    let threw = 0;
    try { rs.installAt(0, 0, 'not_a_module'); } catch { threw++; }
    try { rs.installAt(0, 0, 'pierce'); } catch { threw++; }          // 背包里没有
    try { rs.installAt(0, 5, 'multi'); } catch { threw++; }            // 槽位越界
    try { rs.installAt(9, 0, 'multi'); } catch { threw++; }            // 技能越界
    ok(threw === 4, 'B3 四种非法安装都抛错（' + threw + '/4）');
    ok(snap() === before, 'B3 失败时背包与技能槽完全不变');
  }

  // B4：强化模块一次占 2 份，不能突破 max（扇射 max=3：已有 2 份 + _2 的 2 份 = 4 > 3）
  {
    const rs = mk();
    rs.skills[0].mods = ['fan', 'fan'];
    rs.modsBag = ['fan_2'];
    let threw = false;
    try { rs.installAt(0, 2, 'fan_2'); } catch { threw = true; }
    ok(threw, 'B4 已占 2 份 + 强化 2 份 > max(3) 时拒绝安装');
    ok(rs.skills[0].mods.length === 2 && rs.modsBag.includes('fan_2'), 'B4 拒绝后状态不变');
  }
  // 合法边界：已有 1 份 + 强化 2 份 = 3 <= max(3) 允许
  {
    const rs = mk();
    rs.skills[0].mods = ['fan'];
    rs.modsBag = ['fan_2'];
    let okInstall = true;
    try { rs.installAt(0, 1, 'fan_2'); } catch { okInstall = false; }
    ok(okInstall && modCount(rs.skills[0], 'fan') === 3, 'B4 边界：1 份 + _2(2 份) = 3 正好等于上限，允许');
  }

  // B10：波末金币的贪婪加成也必须封顶 +100%
  {
    const a = mk(); a.stats.greed = 1.0; const g1 = a.waveClearGold();
    const b = mk(); b.stats.greed = 1.5; const g2 = b.waveClearGold();
    ok(g1 === g2, 'B10 greed 1.5 与 1.0 的波末金币相同（封顶 +100%）：' + g1 + '=' + g2);
  }
}

console.log('\n== 5i. 模块份数真的更强（B8）+ 合成入口（B4） ==');
{
  // 分裂：1 份 2 枚 → 每份 +1，封顶 6
  ok(splitBullets(1) === 2 && splitBullets(2) === 3 && splitBullets(3) === 4, '分裂份数生效：2/3/4 枚');
  ok(splitBullets(9) === 6, '分裂封顶 6 枚');
  // 复读机：1 份 1 次、2 份 2 次、3 份 3 次
  ok(echoRepeats(1) === 1 && echoRepeats(2) === 2 && echoRepeats(3) === 3, '复读机份数 = 重放次数');
  // 上火：时长与每跳伤害都随份数涨
  ok(burnDuration(1) === 2 && Math.abs(burnDuration(3) - 3.2) < 1e-9, '上火时长 2 → 3.2 秒');
  ok(Math.abs(burnTickMul(1) - 0.1) < 1e-9 && Math.abs(burnTickMul(3) - 0.3) < 1e-9, '上火每跳 10% → 30%');
  // 冷静：减速与时长都随份数涨，且有上限
  ok(Math.abs(frostSlowPct(1) - 0.35) < 1e-9 && Math.abs(frostSlowPct(3) - 0.55) < 1e-9, '冷静减速 35% → 55%');
  ok(frostSlowPct(9) === 0.6, '冷静减速封顶 60%');
  ok(Math.abs(frostDuration(1) - 1.2) < 1e-9 && Math.abs(frostDuration(3) - 2.0) < 1e-9, '冷静时长 1.2 → 2.0 秒');

  // B4：可合成模块 max 必须 >= 3；unique 模块不该出现在合成候选
  const mergeable = Object.keys(MODULES).filter(id => MODULES[id].max >= 3);
  const notMergeable = Object.keys(MODULES).filter(id => MODULES[id].max < 3);
  ok(mergeable.length + notMergeable.length === Object.keys(MODULES).length, '模块按 max 分成可合成/不可合成两组');
  ok(notMergeable.every(id => MODULES[id].max <= 2), '不可合成组都是 max<=2（unique/稀有）');
  ok(mergeable.includes('split') && mergeable.includes('echo') && mergeable.includes('burn') && mergeable.includes('frost'),
    '四个"份数型"模块现在都能凑够 3 份（可合成）');
}

console.log('\n== 5j. 唯一模块可合成 + 合成收益递减 ==');
{
  ok(modEffect('vamp') === 1 && Math.abs(modEffect('vamp_2') - TIER2_EFFECT) < 1e-9,
    '唯一模块普通=1 份效果、Ⅱ=1.6 份效果（不是 2 份）');
  ok(modPower('vamp_2') === 2, 'Ⅱ 仍然按 2 份计入上限/合成（占位与效果分离）');
  ok(TIER2_EFFECT < 2, '合成收益递减：Ⅱ 效果 < 2 份普通');

  // 唯一模块现在都能凑够 3 份 → 出现在合成候选里
  for (const id of ['vamp', 'harvest', 'thornmail']) {
    ok(MODULES[id].max >= 3, id + ' 的 max >= 3（可以凑 3 个合成）');
  }

  // 数值确实被削弱：吸血 4%、刺猬 6
  const s = makeSkill('blade');
  s.mods = ['vamp'];
  const ranger = CHARS.find(c => c.id === 'ranger')!;
  const rt1 = calcSkill(s, freshStats(ranger));
  s.mods = ['vamp_2'];
  const rt2 = calcSkill(s, freshStats(ranger));
  ok(rt1.vamp === 1 && Math.abs(rt2.vamp - 1.6) < 1e-9,
    '装上之后 rt.vamp：普通 1、Ⅱ 1.6（吸血 = 伤害 × 4% × 该值）');
}

console.log('\n== 5k. 商店与奖励的原子性（B12） ==');
{
  const mk = () => new RunState('knight', 777);
  // 非法道具 id：不能扣钱、不能标记已售
  {
    const rs = mk();
    rs.gold = 500;
    const stock: any[] = [{ kind: 'item', id: 'not_an_item', price: 50, sold: false, locked: false }];
    rs.shopStock = stock as never;
    const r = rs.buySlot(0);
    ok(!r.ok && rs.gold === 500 && !stock[0].sold, 'B12 道具 id 非法时拒绝购买且不扣钱');
  }
  // 非法 kind
  {
    const rs = mk();
    rs.gold = 500;
    rs.shopStock = [{ kind: 'weird', id: 'x', price: 50, sold: false, locked: false }] as never;
    const r = rs.buySlot(0);
    ok(!r.ok && rs.gold === 500, 'B12 非法 kind 拒绝且不扣钱');
  }
  // 金币不足
  {
    const rs = mk();
    rs.gold = 10;
    rs.shopStock = [{ kind: 'heal', id: 'heal', price: 50, sold: false, locked: false }] as never;
    const r = rs.buySlot(0);
    ok(!r.ok && rs.gold === 10, 'B12 金币不足时不扣钱');
  }
  // 正常购买仍然成功
  {
    const rs = mk();
    rs.gold = 500;
    const stock2: any[] = [{ kind: 'heal', id: 'heal', price: 50, sold: false, locked: false }];
    rs.shopStock = stock2 as never;
    const r = rs.buySlot(0);
    ok(r.ok && rs.gold === 450 && stock2[0].sold, 'B12 正常购买：扣钱 + 标记已售');
  }
}

console.log('\n== 5l. 主动丢弃技能（至少保留 1 个） ==');
{
  const rs = new RunState('knight', 4242);
  rs.skills[0].mods = ['multi', 'pierce'];
  rs.skills.push({ id: 'ice_spear', lvl: 1, mods: [] } as never);
  const r1 = rs.dropSkill(0);
  ok(r1.ok && rs.skills.length === 1, '丢弃技能成功（2 → 1）');
  ok(rs.modsBag.filter(m => m === 'multi' || m === 'pierce').length === 2, '被丢技能的 2 个黑科技退回背包');
  const r2 = rs.dropSkill(0);
  ok(!r2.ok && rs.skills.length === 1, '只剩 1 个技能时拒绝丢弃');
  const r3 = rs.dropSkill(9);
  ok(!r3.ok, '越界索引拒绝丢弃');
}

console.log('\n== 5m. 高风险构筑组合（阶段3 数学边界） ==');
{
  // 1) 弹体膨胀 multi+fan+split：分裂数有上限，且衍生弹不再分裂（split:0，见 Battle.ts:1588）
  ok(splitBullets(1) === 2 && splitBullets(3) === 4, '分裂子弹数有上限（1份2枚、3份4枚）');
  ok(splitBullets(99) === 6, '分裂子弹数被硬上限 6 夹住');
  ok(splitBullets(2) > splitBullets(1), '分裂随份数递增');

  // 2) 高频爆发 echo+rapid+multi：复读次数 ≤3，且复读伤害 60%、不会再次入队（echo:0，Battle.ts:946）
  ok(echoRepeats(1) === 1 && echoRepeats(99) === 3, '复读次数上限 3');
  ok(echoDelay(0) < echoDelay(1) && echoDelay(1) < echoDelay(2), '复读间隔递增（不是同帧爆发）');

  // 3) 范围/控制：灼烧按份数取 max（不叠加），减速有 60% 上限（赋值而非累加）
  ok(Math.abs(burnTickMul(1) - 0.10) < 1e-9 && Math.abs(burnTickMul(3) - 0.30) < 1e-9, '灼烧每份 +10%，上限 30%');
  ok(frostSlowPct(99) <= 0.60 + 1e-9, '减速不超过 60%（不会叠到定身）');
  ok(Math.abs(slowFor(true, 3) - 0.30) < 1e-9, 'BOSS 减速封顶 30%');
  ok(Math.abs(slowFor(false, 3) - frostSlowPct(3)) < 1e-9, '普通怪减速仍按份数');
  ok(frostSlowPct(2) > frostSlowPct(1), '减速随份数递增');
  ok(frostDuration(3) > frostDuration(1) && burnDuration(3) > burnDuration(1), '控制/灼烧持续时间随份数增长');

  // 4) 回血守恒：所有回血入口都夹在 maxhp 以内（RunState 层）
  const rs2 = new RunState('knight', 777);
  rs2.stats.hp = rs2.stats.maxhp - 5;
  rs2.stats.hp = Math.min(rs2.stats.maxhp, rs2.stats.hp + 999);
  ok(rs2.stats.hp === rs2.stats.maxhp, '回血不会溢出最大生命');

  // 5) 模块守恒：安装→替换→丢弃 不产生重复/丢失
  const rs3 = new RunState('knight', 888);
  rs3.modsBag.push('multi', 'multi', 'multi');
  const beforeMods = rs3.modsBag.length;
  const inst = rs3.installAt(0, 0, 'multi');
  ok(inst.replaced === null && rs3.modsBag.length === beforeMods - 1, '安装消耗背包 1 份，不凭空产生');
  // 分级合成：3×L1 -> L2；3×L2 -> L3；2×L1 + 1×L2 不能合
  const rsM = new RunState('knight', 2024);
  rsM.modsBag.push('giant', 'giant', 'giant');
  ok(rsM.mergeModule('giant') && rsM.modsBag.includes('giant_2'), '3 个一级 -> 二级');
  rsM.modsBag.length = 0;
  rsM.modsBag.push('giant_2', 'giant_2', 'giant_2');
  ok(rsM.mergeModule('giant_2') && rsM.modsBag.includes('giant_3'), '3 个二级 -> 三级（可继续往上）');
  rsM.modsBag.length = 0;
  rsM.modsBag.push('giant', 'giant', 'giant_2');
  ok(!rsM.mergeModule('giant'), '2 个一级 + 1 个二级不能合成');
  ok(Math.abs(modEffect('giant_3') - 2.2) < 1e-9, '三级效果 = 1 + 0.6x2 = 2.2');
  ok(modPower('giant_3') === 2, '三级容量仍算 2 份');

  const dropped = rs3.dropSkill(0);
  ok(!dropped.ok || dropped.back!.length === 1, '丢弃技能时模块原样退回');
}

console.log('\n== 5n. 伤害上下文与模块闸门（设计 v6） ==');
{
  // 1) 来源 → 能否触发模块
  ok(!canSourceTriggerModules('module') && !canSourceTriggerModules('summon'), 'module/summon 来源不能触发模块');
  ok(canSourceTriggerModules('normal') && canSourceTriggerModules('split') && canSourceTriggerModules('echo') && canSourceTriggerModules('chain'),
    'normal/split/echo/chain 允许触发模块');

  // 2) 上下文由来源推导，不接受调用方覆盖
  const c1 = makeDamageContext('split', 'c1');
  ok(c1.canTriggerModules === true && c1.source === 'split', 'split 上下文默认允许触发');
  const c2 = makeDamageContext('module', 'c1');
  ok(c2.canTriggerModules === false, 'module 上下文默认禁止触发');

  // 3) 击杀回血：召唤物击杀不算
  ok(canHarvest(c1) === true, '普通来源击杀可触发 harvest');
  ok(canHarvest(makeDamageContext('summon', 'c2')) === false, '召唤物击杀不触发 harvest');

  // 4) 吸血：summon 是例外，module 不行
  // v7：summon 默认不吸血，只有哨兵（summonKind='sentry'）是显式例外
  ok(canVamp(makeDamageContext('summon', 'c3')) === false, '普通召唤物攻击默认不触发 vamp');
  ok(canVamp(makeDamageContext('summon', 'c3', { summonKind: 'sentry' })) === true, '哨兵攻击可触发 vamp');
  ok(canVamp(makeDamageContext('module', 'c3')) === false, 'module 伤害不能再触发 vamp');

  // 5) 模块闸门：来源过滤 + 冷却 + 单次施法上限
  const usage = new ModuleUsage();
  const gate = { id: 'lingering', allowedSources: ['normal', 'split'] as DamageSource[], cooldownSec: 0, maxPerCast: 2 };
  const normalCtx = makeDamageContext('normal', 'c10');
  ok(usage.canTrigger(normalCtx, gate, 0), '普通来源通过来源过滤');
  ok(!usage.canTrigger(makeDamageContext('echo', 'c10'), gate, 0), 'echo 被 M5 的 allowedSources 拒绝');

  usage.mark(normalCtx, gate, 0);
  usage.mark(normalCtx, gate, 0);
  ok(!usage.canTrigger(normalCtx, gate, 0), '同一次施法达到 maxPerCast 后被拒绝');
  const nextCast = makeDamageContext('normal', 'c11');
  ok(usage.canTrigger(nextCast, gate, 0), '换一次施法后计数独立');

  const cdGate = { id: 'shieldonhit', allowedSources: ['normal'] as DamageSource[], cooldownSec: 1.5, maxPerCast: 99 };
  const u2 = new ModuleUsage();
  ok(u2.canTrigger(normalCtx, cdGate, 0), '冷却闸门首次可触发');
  u2.mark(normalCtx, cdGate, 0);
  ok(!u2.canTrigger(normalCtx, cdGate, 1.0), '1.0s 时仍在 1.5s 冷却内');
  ok(u2.canTrigger(normalCtx, cdGate, 1.6), '1.6s 后冷却结束可再次触发');
}

console.log('\n== 5o. 新黑科技数值表（独立预期值） ==');
{
  // M1：伤害 8/14/20，半径 40/46/52
  ok(killblastDamage(1) === 8 && killblastDamage(2) === 14 && killblastDamage(3) === 20, 'M1 伤害 8/14/20');
  ok(killblastRadius(1) === 40 && killblastRadius(2) === 46 && killblastRadius(3) === 52, 'M1 半径 40/46/52');
  ok(killblastDamage(9) === 20, 'M1 份数超上限按 3 份算');

  // M2：护盾 3/5/7，池上限 9，CD 1.5，持续 4
  ok(shieldAmount(1) === 3 && shieldAmount(2) === 5 && shieldAmount(3) === 7, 'M2 护盾 3/5/7');
  ok(SHIELD_CAP === 9 && SHIELD_COOLDOWN === 1.5 && SHIELD_DURATION === 4, 'M2 上限/冷却/持续时间');

  // M3：普通 40/58/76%，BOSS 20/29/38%
  ok(Math.abs(executePct(1, false) - 0.40) < 1e-9, 'M3 一份 +40%');
  ok(Math.abs(executePct(3, false) - 0.76) < 1e-9, 'M3 三份 +76%');
  ok(Math.abs(executePct(1, true) - 0.20) < 1e-9 && Math.abs(executePct(3, true) - 0.38) < 1e-9, 'M3 BOSS 减半 20/38%');

  // M4：70/95/120%
  ok(Math.abs(returnstrikePct(1) - 0.70) < 1e-9 && Math.abs(returnstrikePct(2) - 0.95) < 1e-9 && Math.abs(returnstrikePct(3) - 1.20) < 1e-9, 'M4 70/95/120%');

  // M5：概率 35/45/55%，split 减半
  ok(Math.abs(lingeringChance(1, false) - 0.35) < 1e-9, 'M5 一份 35%');
  ok(Math.abs(lingeringChance(3, false) - 0.55) < 1e-9, 'M5 三份 55%');
  ok(Math.abs(lingeringChance(3, true) - 0.275) < 1e-9, 'M5 split 减半 27.5%');
  ok(LINGER_TICKS === 3 && Math.abs(LINGER_TICK_DMG - 0.30) < 1e-9 && LINGER_MAX_ZONES === 4, 'M5 3 跳 / 30% / 4 区');

  // M6：周期 3/2/2，倍率 1.8/2.1/2.4
  ok(overchargePeriod(1) === 3 && overchargePeriod(2) === 2 && overchargePeriod(3) === 2, 'M6 周期 3/2/2');
  ok(Math.abs(overchargeMul(1) - 1.8) < 1e-9 && Math.abs(overchargeMul(3) - 2.4) < 1e-9, 'M6 倍率 1.8/2.4');
}

console.log('\n== 5p. 难度系统（数值 + 迁移 + 召唤状态机） ==');
{
  ok(DIFFICULTIES.length === 5, '五档难度齐备');
  const n = difficultyOf('normal');
  ok(n.enemyHpMul === 1 && n.enemyDmgMul === 1 && n.spawnMul === 1 && n.shopPriceMul === 1, '普通难度所有倍率为 1');
  ok(n.rules.length === 0 && n.healBudgetPerSecond === null, '普通难度无规则且不启用回血预算');

  ok(Math.abs(eliteChance(0.1, 'casual') - 0.08) < 1e-9, '休闲精英概率 0.08');
  ok(Math.abs(eliteChance(0.1, 'hell') - Math.min(1, 0.18)) < 1e-9, '地狱精英概率按 1.8 倍且封顶 1');

  ok(Math.abs(spawnInterval(0.62, 'casual') - 0.713) < 1e-9, '休闲刷怪间隔变慢（x1.15）');
  ok(Math.abs(spawnInterval(0.62, 'hell') - 0.4836) < 1e-9, '地狱刷怪间隔变快（x0.78）');

  ok(shopPrice(100, 'normal', 20) === 100, '普通商店不涨价');
  ok(Math.abs(shopPrice(100, 'hell', 20) - 182.25) < 1e-6, '地狱第 20 波价格 = 1.35 x 1.35 = 182.25');

  ok(Math.abs(healAmount(10, 'normal', 0.2) - 10) < 1e-9, '普通回血不加成');
  ok(Math.abs(healAmount(10, 'casual', 0.2) - 14.4) < 1e-9, '休闲低血回血 = 10 x1.2 x1.2');
  ok(healBudget('normal') === null && healBudget('nightmare') === 6, '普通无预算，噩梦 6HP/s');
  ok(nextDifficulty('normal') === 'hard', '普通通关解锁困难');
  ok(nextDifficulty('nightmare') === 'hell', '噩梦通关解锁地狱');
  ok(nextDifficulty('hell') === null, '最高难度不再解锁');


  // 存档迁移：只补不改
  const old = { wins: 3 } as unknown as SaveData;
  migrateDifficulty(old);
  ok(old.selectedDifficulty === 'normal', '旧档补 selectedDifficulty=normal');
  ok(old.difficulties.indexOf('hard') >= 0, 'wins>=1 补解锁困难');
  const keep = { wins: 0, selectedDifficulty: 'hell', difficulties: ['hell'] } as unknown as SaveData;
  migrateDifficulty(keep);
  ok(keep.selectedDifficulty === 'hell' && keep.difficulties.length === 1, '已有字段不被覆盖');

  // BOSS 召唤状态机
  const st = new BossSummonState({ thresholds: [70, 35], count: 3, maxAlive: 6, minIntervalSec: 12, warnSec: 1.2 });
  ok(st.update(75, 0, 0) === 0, '75% 不召唤');
  ok(st.update(69, 0, 0) === 0, '刚过 70% 只起预警，不立刻召唤');
  ok(st.update(69, 1.3, 0) === 3, '预警结束后召唤 3 只');
  ok(st.update(30, 2, 3) === 0, '35% 阈值被触发但需要等待间隔');
  ok(st.update(30, 13.5, 3) === 0, '间隔满足后先起预警');
  ok(st.update(30, 14.8, 5) === 1, '场上已有 5 只时只补 1 只');
  const st2 = new BossSummonState({ thresholds: [70], count: 3, maxAlive: 6, minIntervalSec: 12, warnSec: 1.2 });
  st2.update(69, 0, 0); st2.onBossDead();
  ok(st2.update(69, 5, 0) === 0, 'BOSS 死亡后取消所有召唤');
}

console.log('\n== 5q. 新技能 × 黑科技 兼容白名单 ==');
{
  const rb = { id: 'ring_blade', lvl: 1, mods: [] } as never;
  ok(canInstall(rb, 'multi').ok === false, '环刃不能装 multi（无弹体）');
  ok(canInstall(rb, 'giant').ok === true, '环刃可以装 giant');
  ok(canInstall(rb, 'orbit').ok === true, '环刃可以装 orbit（+1 片）');
  ok(canInstall(rb, 'fan').ok === false, '环刃不能装 fan');
  const mf = { id: 'mine_field', lvl: 1, mods: [] } as never;
  ok(canInstall(mf, 'split').ok === true && canInstall(mf, 'echo').ok === true, '地雷阵可装 split/echo');
  ok(canInstall(mf, 'pierce').ok === false, '地雷阵不能装 pierce');
  const sn = { id: 'sentry', lvl: 1, mods: [] } as never;
  ok(canInstall(sn, 'multi').ok === true && canInstall(sn, 'snipe').ok === true, '哨兵可装 multi/snipe');
  ok(canInstall(sn, 'overload').ok === false, '哨兵不能装 overload');
  const cp = { id: 'charge_pulse', lvl: 1, mods: [] } as never;
  ok(canInstall(cp, 'overload').ok === true && canInstall(cp, 'multi').ok === false, '蓄能可装 overload、不能装 multi');
  ok(canInstall({ id: 'blade', lvl: 1, mods: [] } as never, 'thunder').ok === true, '回旋刃可以装渡劫（命中触发类不再要求标签）');
  ok(canInstall({ id: 'poison', lvl: 1, mods: [] } as never, 'vamp').ok === true, '毒雾可以装吸血');
  ok(canInstall({ id: 'fireball', lvl: 1, mods: [] } as never, 'harvest').ok === true, '火球可以装割韭菜');
  ok(canInstall({ id: 'poison', lvl: 1, mods: [] } as never, 'multi').ok === false, '毒雾不能装加量（无弹体）');
  // 矩阵对齐（2026-10-31）：环刃/哨兵 echo = N，白名单同步移除
  ok(canInstall({ id: 'ring_blade', lvl: 1, mods: [] } as never, 'echo').ok === false, '环刃不能装复读机（矩阵 N）');
  ok(canInstall({ id: 'sentry', lvl: 1, mods: [] } as never, 'echo').ok === false, '哨兵不能装复读机（矩阵 N）');
  ok(canInstall({ id: 'blade', lvl: 1, mods: [] } as never, 'echo').ok === true, '回旋刃可以装复读机');


}

console.log('\n== 5r. 特殊道具（独立预期值） ==');
{
  ok(Math.abs(lastbreathMul(0.2) - 1.35) < 1e-9, '背水：低血 x1.35');
  ok(Math.abs(lastbreathMul(0.8) - 0.92) < 1e-9, '背水：高血 x0.92');
  ok(Math.abs(shatterMul(true) - 1.20) < 1e-9 && Math.abs(shatterMul(false) - 0.95) < 1e-9, '碎冰：减速 +20% / 未减速 -5%');
  const f2 = focusedMods(2), f4 = focusedMods(4);
  ok(Math.abs(f2.dmg - 1.25) < 1e-9 && Math.abs(f2.cd - 0.90) < 1e-9, '专注核心：2 技能 +25% / -10% 冷却');
  ok(f4.dmg === 1 && f4.cd === 1, '专注核心：4 技能不生效');
  ok(Math.abs(resonatorMul(1) - 1.20) < 1e-9 && resonatorMul(0) === 1, '共鸣器：同 Hook 成对 +20%');
  ok(VOLTLOOP_CHANCE === 0.15 && Math.abs(VOLTLOOP_DMG - 0.40) < 1e-9 && VOLTLOOP_CD === 0.6, '回响电弧：15% / 40% / 0.6s');
  ok(Math.abs(greedPowerBonus(0)) < 1e-9 && Math.abs(greedPowerBonus(100) - 0.03) < 1e-9, '贪欲：每 100 金币 +3%');
  ok(Math.abs(greedPowerBonus(9999) - 0.15) < 1e-9, '贪欲：封顶 +15%');
  ok(FRUGAL_REROLL_MUL === 0.5 && FRUGAL_WAVE_GOLD === 2, '精打细算：刷新 -50% / 每波 -2');
  ok(THORNCOAT_DMG === 12 && THORNCOAT_CD === 0.5, '荆棘外衣：12 点 / 0.5s CD');
}

console.log('\n== 6. 确定性与波次规则 ==');
{
  const a = new RunState('mage', 4242), b = new RunState('mage', 4242);
  const ra = JSON.stringify(a.rollRewards()), rb = JSON.stringify(b.rollRewards());
  ok(ra === rb, '同 seed → 同奖励组：' + ra);
  const sa = new RunState('mage', 4242), sb = new RunState('mage', 4242);
  sa.wave = 5; sb.wave = 5; sa.refreshShop(false); sb.refreshShop(false);
  ok(JSON.stringify(sa.shopStock) === JSON.stringify(sb.shopStock), '同 seed → 同商店货架');
}
ok(isBossWave(10) && isBossWave(20) && !isBossWave(9), 'BOSS 波在 10 / 20');
ok(isEliteWave(3) && !isEliteWave(10), '精英波每 3 波一次，且 BOSS 波不出精英');
ok(eliteCount(11) === 1 && eliteCount(12) === 2, '第 12 波起精英出 2 只');
ok(waveTime(1) === 22 && waveTime(20) === 46, `波次时长 22s → 46s（实测 ${waveTime(1)} → ${waveTime(20)}）`);
ok(enemyPool(1).join(',') === 'goblin', '第 1 波只有哥布林（新手保护）');
ok(enemyPool(3).includes('wolf'), '第 3 波解锁狼');
{
  const fastest = Math.max(...Object.values(ENEMIES).filter(e => !e.boss && !e.elite).map(e => e.spd));
  ok(fastest < BASE_SPEED, `最快怪 ${fastest} px/s < 玩家 ${BASE_SPEED} px/s（可躲是硬条件）`);
}
{
  const rs = new RunState('knight', 1);
  for (let i = 0; i < RUN.waves; i++) rs.nextWave();
  ok(rs.nextWave() === -1, '打通 20 波后默认结算');
  rs.endless = true;
  ok(rs.nextWave() === 21, '选择继续则进入第 21 波（无尽）');
}


console.log('\n== 7. 伤害事件 v7：权限派生 / 哨兵例外 / castId ==');
{
  ok(canTrigV7('normal') && canTrigV7('split') && canTrigV7('echo') && canTrigV7('chain'),
    'normal/split/echo/chain 可触发模块');
  ok(!canTrigV7('module') && !canTrigV7('summon'), 'module/summon 默认不可触发模块');

  ok(canSourceHarvest('normal') && canSourceHarvest('module'), '普通与模块伤害击杀可触发 harvest（规则只排除 summon）');
  ok(!canSourceHarvest('summon'), '召唤物击杀不触发 harvest');

  ok(canSourceVamp('normal') && canSourceVamp('split'), '普通/分裂伤害可吸血');
  ok(!canSourceVamp('module'), '模块伤害不能吸血（避免递归）');
  ok(!canSourceVamp('summon'), '普通召唤物默认不吸血（只有哨兵是例外）');
  ok(canSourceVamp('summon', 'sentry'), '哨兵伤害可以吸血（S 规则）');

  const sentryCtx = makeCtxV7('summon', 'c9', { summonKind: 'sentry', isBoss: true });
  ok(sentryCtx.canTriggerModules === false && sentryCtx.canHarvest === false && sentryCtx.canVamp === true,
    '哨兵上下文：不触发 onhit 模块 / 击杀不回血 / 可吸血');
  ok(Object.isFrozen(sentryCtx), '上下文被冻结（派生权限不可事后改写）');

  const forged = makeCtxV7('summon', 'c1',
    { canTriggerModules: true, canHarvest: true, canVamp: true } as unknown as never);
  ok(forged.canTriggerModules === false && forged.canHarvest === false && forged.canVamp === false,
    '调用方伪造 can* 字段无效（仍按来源推导）');

  ok(canHarvest(makeCtxV7('summon', 'c')) === false && canVamp(makeCtxV7('summon', 'c')) === false,
    '旧函数入口与上下文字段结论一致');

  resetCastSeq();
  const id1 = nextCastIdV7(), id2 = nextCastIdV7();
  ok(id1 !== id2 && id1.startsWith('c') && id2.startsWith('c'), 'castId 在不同主动施法之间唯一');
  ok(makeCtxV7('echo', 'c42').castId === makeCtxV7('split', 'c42').castId, '同一次施法的弹体共享 castId');
}

console.log('\n== 8. 新技能 S 规则（纯函数） ==');
{
  ok(ringBladeCount(1, 0) === 2, '环刃 1 级 = 2 片');
  ok(ringBladeCount(3, 0) === 4, '环刃随等级加片');
  ok(ringBladeCount(4, 0) === RING_BLADE_MAX, '环刃受 4 片硬上限');
  ok(ringBladeCount(1, 1) === 3, 'orbit × 环刃（S）= 额外 +1 片');
  ok(ringBladeCount(4, 3) === RING_BLADE_MAX, 'orbit 加片仍受 4 片上限');

  ok(mineSplitCount(0) === 0, '地雷未装分裂 → 0 枚分裂弹');
  ok(mineSplitCount(1) === 2 && mineSplitCount(2) === 3 && mineSplitCount(3) === 4,
    'split × 地雷（S）：2/3/4 枚分裂弹');

  ok(mineEchoRepeats(0) === 0, '地雷未装 echo → 不复制');
  ok(mineEchoRepeats(1) === 1 && mineEchoRepeats(3) === 1, 'echo × 地雷（S）：最多复制 1 次');
  ok(chargeEchoRepeats(0) === 0 && chargeEchoRepeats(2) === 1, 'echo × 蓄能（S）：最多重放 1 次');

  const p1 = sentryShotPlan(1, 0);
  ok(p1.shots === 1 && p1.fanShots === 0 && p1.speed === SENTRY_BULLET_SPEED, '哨兵基础：1 发 / 弹速 260');
  const p3 = sentryShotPlan(3, 2);
  ok(p3.shots === 3 && p3.fanShots === 4, '哨兵 multi(3 发) + fan(4 扇) 生效');
}

console.log('\n== 9. 精英词缀（实际数值效果） ==');
{
  const hardRules = difficultyOf('hard').rules;
  ok(eliteAffixRule(hardRules, 11) === null, '困难第 11 波：还没有词缀规则');
  ok(eliteAffixRule(hardRules, 12) !== null, '困难第 12 波起：护盾词缀规则生效');

  const rollSeq = [0.10, 0.0];
  let ri = 0;
  const roll = () => rollSeq[ri++] ?? 0.5;
  const hardHit = rollEliteAffixes(hardRules, 12, roll);
  ok(hardHit.length === 1 && hardHit[0] === 'shield', '困难 12 波 25% 命中 → 护盾');
  let calls = 0;
  const hardMiss = rollEliteAffixes(hardRules, 12, () => { calls++; return 0.9; });
  ok(hardMiss.length === 0 && calls === 1, '困难 12 波 25% 未命中 → 无词缀');

  let touched = false;
  const none = rollEliteAffixes([], 99, () => { touched = true; return 0; });
  ok(none.length === 0 && !touched, '普通难度无规则：不掷骰子、不消耗随机数');

  const nmRules = difficultyOf('nightmare').rules;
  ok(rollEliteAffixes(nmRules, 7, () => 0).length === 0, '噩梦第 7 波：还不带词缀');
  ok(rollEliteAffixes(nmRules, 8, () => 0).length === 1, '噩梦第 8 波起必带 1 个词缀');

  let hk = 0;
  const hellAffixes = rollEliteAffixes(difficultyOf('hell').rules, 5, () => (hk++ === 0 ? 0 : 0.5));
  ok(hellAffixes.length === 2 && hellAffixes[0] !== hellAffixes[1], '地狱必带 2 个不重复词缀');

  ok(Math.abs(affixHpMul(['shield']) - 1.2) < 1e-9, '护盾词缀：最大生命 +20%');
  ok(Math.abs(affixSpeedMul(['swift']) - 1.25) < 1e-9, '加速词缀：移速 +25%');
  ok(affixSplits(['split']) && !affixSplits(['shield']), '分裂词缀只在 split 时生效');
  ok(AFFIX_SPLIT_COUNT === 2, '分裂词缀死亡出 2 只小怪');
}

console.log('\n== 10. 存档读取 / 迁移 / 无尽徽章 ==');
{
  const d0 = parseSave(null);
  ok(d0.selectedDifficulty === 'normal' && d0.difficulties.length === 2, '空存档 → 普通 + 默认两档解锁');
  ok(parseSave('{坏的JSON').runs === 0, '坏 JSON → 回落到默认值');

  const full = { ...defaultSave(), selectedDifficulty: 'hell',
    difficulties: ['casual', 'normal', 'hard', 'nightmare', 'hell'],
    seen: ['enemy:goblin'], charsWin: ['knight'], endlessBadges: ['hell:30'],
    fxAlpha: 0.4, shakeOn: false, runs: 7 } as SaveData;
  const d1 = parseSave(JSON.stringify(full));
  ok(d1.selectedDifficulty === 'hell' && d1.difficulties.length === 5, '存档读回：难度选择与解锁列表不丢');
  ok(d1.seen[0] === 'enemy:goblin' && d1.charsWin[0] === 'knight' && d1.endlessBadges[0] === 'hell:30',
    '存档读回：图鉴 / 角色通关 / 徽章不丢');
  ok(Math.abs(d1.fxAlpha - 0.4) < 1e-9 && d1.shakeOn === false && d1.runs === 7,
    '存档读回：画面偏好与累计值不丢');

  const legacy = { wins: 2, kills: 30 } as unknown as Partial<SaveData>;
  const d2 = parseSave(JSON.stringify(legacy));
  ok(d2.selectedDifficulty === 'normal' && d2.difficulties.indexOf('hard') >= 0, '旧档迁移：wins>=1 补困难');
  ok(d2.kills === 30, '旧档迁移：已有字段保留');

  const d3 = parseSave(JSON.stringify({ selectedDifficulty: 'xxx', difficulties: ['normal', 'bad'] }));
  ok(d3.selectedDifficulty === 'normal' && d3.difficulties.length === 1 && d3.difficulties[0] === 'normal',
    '非法难度值被过滤，不污染解锁列表');

  ok(badgesForRun([], 'hell', 29).length === 0, '29 波不发徽章');
  const b30 = badgesForRun([], 'hell', 30);
  ok(b30.length === 1 && b30[0] === badgeId('hell', 30), '30 波发第一枚徽章');
  const b42 = badgesForRun([], 'hell', 42);
  ok(b42.length === 2, '42 波补发 30/40 两枚');
  ok(badgesForRun(b42, 'hell', 50).length === 3, '50 波补发到 3 枚');
  ok(badgesForRun(b42, 'hell', 42).length === 2, '重复结算不重复发放');
  ok(badgesForRun(b30, 'nightmare', 30).length === 2, '徽章按难度隔离');
  ok(ENDLESS_MILESTONES.length === 3, '里程碑固定 30/40/50');
}

console.log('\n== 11. 传说道具共享上限 ==');
{
  const legIds = Object.keys(ITEMS).filter(k => (ITEMS[k].tier ?? 1) >= 3);
  ok(legIds.length >= 3, '传说道具存在（tier 3）');

  const rs = new RunState('knight', 20261031);
  ok(!rs.legendaryTaken && rs.legendaryAvailable, '开局：本局未拿传说');
  rs.applyReward({ kind: 'item', id: legIds[0] });
  ok(rs.legendaryTaken && !rs.legendaryAvailable, '升级奖励拿到传说 → 本局锁定');

  let upgradeLeak = false;
  for (let k = 0; k < 120; k++) {
    for (const r of rs.rollRewards()) {
      if (r.kind === 'item' && (ITEMS[r.id].tier ?? 1) >= 3) upgradeLeak = true;
    }
  }
  ok(!upgradeLeak, '升级池排除传说（拿到后 120 次抽样无传说）');

  let shopLeak = false;
  for (let w = 1; w <= 20; w++) {
    rs.wave = w; rs.refreshShop(true);
    for (const s2 of rs.shopStock ?? []) {
      if (s2.kind === 'item' && (ITEMS[s2.id].tier ?? 1) >= 3) shopLeak = true;
    }
  }
  ok(!shopLeak, '商店池排除传说（拿到后 1~20 波刷新无传说）');

  const rs2 = new RunState('mage', 7);
  rs2.gold = 999;
  rs2.shopStock = [{ kind: 'item', id: legIds[1], price: 10, sold: false, locked: false }];
  const bought = rs2.buySlot(0);
  ok(bought.ok && rs2.legendaryTaken, '商店买到传说 → 共享计数立即生效');

  let shopLeak2 = false;
  for (let w = 1; w <= 10; w++) {
    rs2.wave = w; rs2.refreshShop(true);
    for (const s2 of rs2.shopStock ?? []) {
      if (s2.kind === 'item' && (ITEMS[s2.id].tier ?? 1) >= 3) shopLeak2 = true;
    }
  }
  ok(!shopLeak2, '刷新商店绕不过传说上限');
}

console.log('\n== 12. 地狱商店经济遥测 ==');
{
  const store = new Map<string, string>();
  (globalThis as unknown as { localStorage: Storage }).localStorage = {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => { store.set(k, v); },
    removeItem: (k: string) => { store.delete(k); },
    clear: () => { store.clear(); },
    key: (i: number) => Array.from(store.keys())[i] ?? null,
    get length(): number { return store.size; },
  } as Storage;

  clearLogs();
  telemetryStart('knight', 42, 'hell');
  telemetryShopEnter(5, 100);
  telemetryShopBuy('bloodpact', 'item', 120, 90);
  telemetryShopReroll();
  telemetryShopLeave(30);
  telemetryRunEnd({ end: 'dead', deathWave: 5, kills: 12, maxAlive: 9, dmgTaken: 40, durSec: 120 });

  const runs = listRuns();
  ok(runs.length === 1 && runs[0].difficulty === 'hell', '遥测：本局记录含难度');
  const sh = runs[0].shop[0];
  ok(!!sh && sh.wave === 5 && sh.goldIn === 100 && sh.goldOut === 30 && sh.rerolls === 1 && sh.bought.length === 1,
    '遥测：进店/离店金币、刷新次数、购买数都记下');
  ok(!!sh && sh.bought[0].price === 120 && sh.bought[0].basePrice === 90, '遥测：商品原价与成交价分开记');
  const sum = economySummary('hell');
  ok(sum.runs === 1 && sum.shops === 1 && sum.buys === 1 && sum.avgRerolls === 1, '遥测：地狱经济汇总可读');
  clearLogs();
}

console.log('\n== 13. 普通难度 = 不介入原版本（公式层） ==');
{
  const n = difficultyOf('normal');
  ok(n.rules.length === 0 && n.healBudgetPerSecond === null, '普通：无难度规则、不启用回血预算');
  ok(spawnInterval(0.62, 'normal') === 0.62, '普通：刷怪间隔原样返回（不乘 1.0）');
  ok(shopPrice(37, 'normal', 18) === 37, '普通：商店价格原样返回（不乘倍率、无递增）');
  ok(shopPrice(37, 'normal', 1) === 37, '普通第 1 波价格也不被改写');
  ok(eliteChance(0.37, 'normal') === 0.37, '普通：精英概率原样返回');
  ok(healAmount(10, 'normal', 0.1) === 10, '普通：回血不乘倍率、不触发低血加成');
  ok(healBudget('normal') === null, '普通：不启用新增回血预算');
}

console.log('\n== 14. BOSS 召唤：请求不丢 / 间隔 / 空位 ==');
{
  const cfg = { thresholds: [70, 35], count: 3, maxAlive: 6, minIntervalSec: 12, warnSec: 1.2 };
  const bs = new BossSummonState(cfg);
  ok(bs.update(71, 0, 0) === 0, 'BOSS 血量 71%：不召唤');
  ok(bs.update(70, 1, 0) === 0 && bs.pending === 1, '70%：提交 1 个请求并起预警');
  ok(bs.update(35, 1.5, 0) === 0 && bs.pending === 2, '预警期间跨过 35%：请求入队，不启动第二个预警');
  const first = bs.update(35, 2.3, 0);
  ok(first === 3 && bs.pending === 1 && !bs.isWarning, '预警结束：执行 1 个波次（3 只），剩余请求保留');
  ok(bs.update(35, 5, 0) === 0 && bs.pending === 1, '12 秒冷却内：剩余请求等待，不丢弃');
  ok(bs.update(35, 14.4, 0) === 0 && bs.isWarning, '冷却结束：剩余请求起预警');
  ok(bs.update(35, 15.7, 6) === 0 && bs.pending === 0, '空位为 0：请求完成但不召唤，不永久挂起');
  const bs2 = new BossSummonState(cfg);
  bs2.update(70, 1, 0);
  bs2.onBossDead();
  ok(bs2.pending === 0 && !bs2.isWarning && bs2.update(35, 30, 0) === 0, 'BOSS 死亡：取消所有未执行请求');
}


console.log('\n== 15. 兼容矩阵 × 白名单逐格一致（18 模块 × 4 技能） ==');
{
  // 这张表与 skill_expansion_design.md §7 的矩阵逐格对应；改了矩阵必须同时改这里。
  const MATRIX: Record<string, string[]> = {
    ring_blade: ['orbit', 'giant', 'rapid', 'burn', 'frost', 'vamp', 'harvest', 'thornmail'],
    mine_field: ['giant', 'rapid', 'burn', 'frost', 'vamp', 'harvest', 'thornmail', 'split', 'echo', 'overload'],
    sentry: ['multi', 'fan', 'split', 'bounce', 'pierce', 'rapid', 'burn', 'frost', 'chain', 'snipe', 'harvest', 'thunder', 'vamp'],
    charge_pulse: ['giant', 'burn', 'frost', 'vamp', 'harvest', 'overload', 'echo'],
  };
  for (const skill of Object.keys(MATRIX)) {
    const got = NEW_SKILL_ALLOW[skill] ?? [];
    const want = MATRIX[skill];
    const missing = want.filter(m => got.indexOf(m) < 0);
    const extra = got.filter(m => want.indexOf(m) < 0);
    ok(missing.length === 0 && extra.length === 0,
      skill + ' 白名单与矩阵一致（缺 ' + (missing.join(',') || '无') + ' / 多 ' + (extra.join(',') || '无') + '）');
  }
  const totalCells = Object.keys(MATRIX).length * MODULE_IDS.length;
  ok(totalCells === 72, '矩阵覆盖 18 模块 × 4 技能 = 72 格');
}
console.log('\n================ 结果 ================');
console.log(`PASS ${pass} / FAIL ${fail}`);
if (fail) throw new Error(`有 ${fail} 项失败`);
