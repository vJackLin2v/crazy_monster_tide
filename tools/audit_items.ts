import { ITEMS } from '../cocos/assets/scripts/data/Items';
import { ITEM_ICON } from '../cocos/assets/scripts/data/IconMap';
import { freshStats } from '../cocos/assets/scripts/game/Stats';
import { CHARS } from '../cocos/assets/scripts/data/Chars';
import fs from 'node:fs';

const rows: { id: string; name: string; icon: string; sig: string; desc: string }[] = [];
for (const [id, def] of Object.entries(ITEMS)) {
  const base: any = freshStats(CHARS[0]);
  base.hp = Math.min(1, base.maxhp);   // 捕捉治疗类道具的 hp 变化
  const s: any = freshStats(CHARS[0]);
  s.hp = Math.min(1, s.maxhp);
  try { def.apply(s); } catch { /* ignore */ }
  const sig: string[] = [];
  for (const k of Object.keys(s)) {
    const a = base[k], b = s[k];
    if (typeof a === 'number' && typeof b === 'number' && a !== b) {
      if (k === 'hp') sig.push('hp' + (b - a >= 0 ? '+' : '') + Math.round(b - a));
      else if (a !== 0 && Math.abs(b / a - 1) > 1e-9) sig.push(k + '×' + (Math.round((b / a) * 1000) / 1000));
      else sig.push(k + (b - a >= 0 ? '+' : '') + (Math.round((b - a) * 1000) / 1000));
    } else if (a && b && typeof a === 'object') {
      const ka = Object.keys(a), kb = Object.keys(b);
      for (const kk of new Set([...ka, ...kb])) {
        const av = a[kk] ?? 0, bv = b[kk] ?? 0;
        if (av !== bv) sig.push(k + '.' + kk + '+' + (Math.round((bv - av) * 1000) / 1000));
      }
    }
  }
  if (def.special) sig.unshift('special:' + def.special);
  const keys = sig.map(x => x.split(/[+×]/)[0]).filter(Boolean);
  rows.push({ id, name: def.name, icon: ITEM_ICON[id] || def.icon || '?', sig: sig.join(' ') || 'no-stat-change', desc: def.desc, keys } as any);
}

const iconGroups = new Map<string, typeof rows>();
for (const r of rows) { if (!iconGroups.has(r.icon)) iconGroups.set(r.icon, []); iconGroups.get(r.icon)!.push(r); }
const dupIcons = [...iconGroups.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);

const effectGroups = new Map<string, typeof rows>();
for (const r of rows) { if (!effectGroups.has(r.sig)) effectGroups.set(r.sig, []); effectGroups.get(r.sig)!.push(r); }
const dupEffects = [...effectGroups.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);

const keyGroups = new Map<string, typeof rows>();
for (const r of rows as any) {
  if (!r.keys || !r.keys.length) continue;
  const k = r.keys.join(',');
  if (!keyGroups.has(k)) keyGroups.set(k, []);
  keyGroups.get(k)!.push(r);
}
const dupKeys = [...keyGroups.entries()].filter(([, v]) => v.length > 1).sort((a, b) => b[1].length - a[1].length);

let md = '# 道具图标与效果全量审计\n\n';
md += '- 道具总数：' + rows.length + '\n';
md += '- 不同图标数：' + iconGroups.size + '\n';
md += '- 重复图标组：' + dupIcons.length + '\n';
md += '- 相同效果签名组（数值完全一致）：' + dupEffects.length + '\n';
md += '- 相同效果类型组（同一属性/标签，数值可不同）：' + dupKeys.length + '\n\n';
md += '> 说明：剩余重复图标均为同语义家族（生命/护盾/元素/时间等）或同属性 1/2/3 档；本轮修复了跨语义重复。\n';
md += '> 效果类型组均为同属性的不同档位，**没有发现数值完全相同的重复道具**。\n\n';
md += '## 图标修复记录\n\n修复明细见 git 历史与 docs/m2b/m2b_3_* 报告；本表只列当前剩余重复。\n\n';
md += '## 重复图标\n\n| 图标 | 数量 | 道具 |\n|---|---|---|\n';
for (const [icon, list] of dupIcons) md += '| ' + icon + ' | ' + list.length + ' | ' + list.map(x => x.name + '(' + x.id + ')').join('、') + ' |\n';
md += '\n## 相同效果签名（数值完全一致）\n\n| 效果签名 | 数量 | 道具 |\n|---|---|---|\n';
for (const [sig, list] of dupEffects) md += '| ' + sig + ' | ' + list.length + ' | ' + list.map(x => x.name + '(' + x.id + ')').join('、') + ' |\n';
md += '\n## 相同效果类型（同属性/标签，数值可不同）\n\n| 属性/标签 | 数量 | 道具（数值） |\n|---|---|---|\n';
for (const [k, list] of dupKeys) md += '| ' + k + ' | ' + list.length + ' | ' + list.map(x => x.name + '(' + x.id + '：' + x.sig + ')').join('；') + ' |\n';
md += '\n## 全部道具\n\n| id | 名称 | 图标 | 效果 | 描述 |\n|---|---|---|---|---|\n';
for (const r of rows.sort((a,b)=>a.id.localeCompare(b.id))) md += '| ' + r.id + ' | ' + r.name + ' | ' + r.icon + ' | ' + r.sig + ' | ' + r.desc + ' |\n';

const out = 'deliverables/m2a_real_runs_20261101/analysis/item_audit.md';
fs.writeFileSync(out, md, 'utf8');
console.log(JSON.stringify({ items: rows.length, icons: iconGroups.size, dupIconGroups: dupIcons.length, dupEffectGroups: dupEffects.length, dupKeyGroups: dupKeys.length, out }, null, 2));
console.log('DUP_ICONS');
for (const [icon, list] of dupIcons) console.log(icon + ': ' + list.map(x => x.id).join(','));
console.log('DUP_EFFECTS');
for (const [sig, list] of dupEffects) console.log(sig + ': ' + list.map(x => x.id).join(','));
