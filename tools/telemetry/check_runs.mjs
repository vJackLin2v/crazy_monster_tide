#!/usr/bin/env node
/**
 * M2-A-R 原始对局校验/清单工具。
 * 用法：node tools/telemetry/check_runs.mjs --dir deliverables/m2a_real_runs_20261101
 * 只读 raw/*.json；报告写入 reports/ 与 analysis/；不修改原始数据。
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const args = process.argv.slice(2);
const dirArg = args.indexOf('--dir') >= 0 ? args[args.indexOf('--dir') + 1] : '';
if (!dirArg) { console.error('usage: node tools/telemetry/check_runs.mjs --dir <collection-dir>'); process.exit(2); }
const root = path.resolve(dirArg);
const rawDir = path.join(root, 'raw');
const reportsDir = path.join(root, 'reports');
const analysisDir = path.join(root, 'analysis');
for (const d of [rawDir, reportsDir, analysisDir]) fs.mkdirSync(d, { recursive: true });

const TARGETS = { casual: 3, normal: 10, hard: 5, nightmare: 3, hell: 3 };
const files = fs.existsSync(rawDir) ? fs.readdirSync(rawDir).filter(f => f.toLowerCase().endsWith('.json')).sort() : [];
const records = [];
const fileInfos = [];
const errors = [];
const warnings = [];
const seen = new Set();
let duplicateFiles = 0;

function num(v) { return typeof v === 'number' && Number.isFinite(v) ? v : 0; }

for (const f of files) {
  const p = path.join(rawDir, f);
  const buf = fs.readFileSync(p);
  const sha = crypto.createHash('sha256').update(buf).digest('hex');
  let parsed;
  try { parsed = JSON.parse(buf.toString('utf8').replace(/^\uFEFF/, '')); }
  catch (e) { errors.push(f + ': JSON 解析失败 - ' + e.message); fileInfos.push({ file: f, sha256: sha, records: 0, error: 'parse' }); continue; }
  // 支持：{records:[...]} / 顶层数组（微信 Storage 里 cmt_telemetry_v1 原值）/ 单条记录
  const list = Array.isArray(parsed) ? parsed : (Array.isArray(parsed?.records) ? parsed.records : [parsed]);
  let added = 0;
  for (const r of list) {
    if (!r || typeof r !== 'object' || typeof r.runId !== 'string') { errors.push(f + ': 记录缺少 runId'); continue; }
    if (seen.has(r.runId)) { duplicateFiles++; warnings.push(f + ': runId 重复，已忽略 ' + r.runId); continue; }
    seen.add(r.runId); records.push(r); added++;
  }
  fileInfos.push({ file: f, sha256: sha, records: added });
}

const perDifficulty = {};
for (const k of Object.keys(TARGETS)) perDifficulty[k] = { target: TARGETS[k], collected: 0, complete: 0, interrupted: 0, partial: 0, corrupted: 0 };
const progressRows = [];
const csv = ['runId,difficulty,character,result,state,maxWave,durationMs,kills,bossKills,damageTaken,healing,goldEarned,goldSpent,casts,skillDamage,unknownDamage'];

for (const r of records) {
  const s = r.summary || {};
  const c = r.completeness || {};
  const state = c.state || (c.complete ? 'complete' : 'partial');
  const diff = s.difficultyId || 'unknown';
  if (!perDifficulty[diff]) perDifficulty[diff] = { target: 0, collected: 0, complete: 0, interrupted: 0, partial: 0, corrupted: 0 };
  const d = perDifficulty[diff];
  d.collected++;
  if (state === 'complete') d.complete++;
  else if (state === 'interrupted') d.interrupted++;
  else if (state === 'corrupted') d.corrupted++;
  else d.partial++;

  if (!r.schemaVersion) errors.push(r.runId + ': 缺少 schemaVersion');
  if (!s.endTime && state === 'complete') warnings.push(r.runId + ': complete 但 endTime=0');
  if (num(s.damageTaken) < 0 || num(s.healingReceived) < 0) errors.push(r.runId + ': 承伤/治疗为负数');
  if (num(s.killTotal) < 0) errors.push(r.runId + ': 击杀为负数');
  if (num(s.killTotal) < num(s.bossKillTotal)) errors.push(r.runId + ': BOSS 击杀大于总击杀');
  if (state === 'complete') {
    const ev = Array.isArray(r.events) ? r.events : [];
    if (!ev.some(e => e.type === 'run_start')) warnings.push(r.runId + ': 缺少 run_start 事件');
    if (!ev.some(e => e.type === 'run_end')) warnings.push(r.runId + ': 缺少 run_end 事件');
  }
  const waveSeen = new Set();
  for (const w of Array.isArray(r.waves) ? r.waves : []) {
    if (waveSeen.has(w.wave)) errors.push(r.runId + ': 波次重复结算 ' + w.wave);
    waveSeen.add(w.wave);
    if (num(w.damageTaken) < 0 || num(w.healing) < 0) errors.push(r.runId + ': 波次承伤/治疗为负数');
  }
  const shop = r.shop || { displays: {}, purchases: {} };
  for (const k of Object.keys(shop.purchases || {})) {
    const bought = num(shop.purchases[k]);
    const shown = num((shop.displays || {})[k]);
    if (bought > shown) warnings.push(r.runId + ': 购买次数大于展示次数 ' + k + ' ' + bought + '>' + shown);
  }
  const skills = Array.isArray(r.skills) ? r.skills : [];
  const totalKills = skills.reduce((a, x) => a + num(x.killCount), 0);
  if (totalKills > num(s.killTotal)) errors.push(r.runId + ': 技能击杀合计大于总击杀');
  for (const sk of skills) {
    if (num(sk.damageTotal) < 0 || num(sk.damageMax) < 0) errors.push(r.runId + ': 技能伤害为负数 ' + sk.skillId);
  }
  const unknown = skills.filter(x => x.skillId === 'unknown');
  const unknownDmg = unknown.reduce((a, x) => a + num(x.damageTotal), 0);
  const allDmg = skills.reduce((a, x) => a + num(x.damageTotal), 0);
  const casts = skills.reduce((a, x) => a + num(x.castCount), 0);
  csv.push([r.runId, diff, s.characterId || '', s.result || '', state, num(s.maxWave), num(s.durationMs), num(s.killTotal), num(s.bossKillTotal),
    num(s.damageTaken), num(s.healingReceived), num(s.goldEarned), num(s.goldSpent), casts, Math.round(allDmg * 10) / 10, Math.round(unknownDmg * 10) / 10].join(','));
  progressRows.push({ runId: r.runId, diff, char: s.characterId || '', result: s.result || '', wave: num(s.maxWave), state, file: fileInfos.find(f => f.records > 0)?.file || '?' });
}

const complete = records.filter(r => (r.completeness?.state || '') === 'complete').length;
const manifest = {
  generatedAt: new Date().toISOString(),
  targetTotal: Object.values(TARGETS).reduce((a, b) => a + b, 0),
  collectedTotal: records.length,
  completeTotal: complete,
  duplicates: duplicateFiles,
  perDifficulty,
  files: fileInfos,
  records: records.map(r => ({ runId: r.runId, difficulty: r.summary?.difficultyId, result: r.summary?.result, state: r.completeness?.state })),
};
fs.writeFileSync(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
fs.writeFileSync(path.join(analysisDir, 'preliminary_metrics.csv'), csv.join('\n') + '\n', 'utf8');

const progress = ['# 采集进度', '', '目标 24 局（探索性样本，不是正式统计量）。', '', '| 难度 | 目标 | 已采集 | complete | interrupted | partial | corrupted |', '|---|---|---|---|---|---|---|'];
for (const [k, v] of Object.entries(perDifficulty)) progress.push('| ' + k + ' | ' + v.target + ' | ' + v.collected + ' | ' + v.complete + ' | ' + v.interrupted + ' | ' + v.partial + ' | ' + v.corrupted + ' |');
progress.push('', '## 对局', '', '| runId | 难度 | 角色 | 结果 | 波次 | 完整性 |', '|---|---|---|---|---|---|');
for (const p of progressRows) progress.push('| ' + p.runId + ' | ' + p.diff + ' | ' + p.char + ' | ' + p.result + ' | ' + p.wave + ' | ' + p.state + ' |');
if (!progressRows.length) progress.push('| （暂无） | | | | | |');
fs.writeFileSync(path.join(reportsDir, 'collection_progress.md'), progress.join('\n') + '\n', 'utf8');

const integrity = ['# 数据完整性报告', '', '- 原始文件：' + files.length, '- 解析记录：' + records.length, '- 重复 runId：' + duplicateFiles, '- 错误：' + errors.length, '- 警告：' + warnings.length, '', '## 错误', ''];
integrity.push(...(errors.length ? errors.map(e => '- ' + e) : ['- 无']));
integrity.push('', '## 警告', '');
integrity.push(...(warnings.length ? warnings.map(w => '- ' + w) : ['- 无']));
integrity.push('', '> 本工具只读 raw/；原始 JSON 是证据，清洗/汇总只写入 reports/ 与 analysis/。');
fs.writeFileSync(path.join(reportsDir, 'data_integrity_report.md'), integrity.join('\n') + '\n', 'utf8');

console.log(JSON.stringify({ files: files.length, records: records.length, complete, duplicates: duplicateFiles, errors: errors.length, warnings: warnings.length, manifest: path.join(root, 'manifest.json') }, null, 2));
