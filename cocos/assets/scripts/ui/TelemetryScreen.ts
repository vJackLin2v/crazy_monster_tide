/**
 * M2-A 遥测查看（仅 DEBUG 构建显示入口）
 * 极简：总览 + 技能总伤害前 N + 导出/清空。
 */
import { Node, view } from 'cc';
import { screen, text, button, onTap, mkNode } from './UIKit';
import { COL } from './Tokens';
import { aggregate, skillTotals, exportAllJson, clearAll } from '../game/telemetry/TelemetryStore';

export function buildTelemetryScreen(parent: Node, onBack: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const root = screen(parent, 'scr-telemetry', COL.bg1);
  const S = Math.min(60, VH * 0.08);
  text(root, 0, VH / 2 - S - 18, '战斗数据（M2-A）', { size: 20, color: COL.cream, bold: true, width: 330, outline: true });
  const agg = aggregate();
  const lines = [
    '完整对局 ' + agg.runs + ' · 胜 ' + agg.wins + ' · 败 ' + agg.deaths + ' · 退 ' + agg.quits,
    '平均最高波次 ' + agg.avgMaxWave + ' · 平均时长 ' + Math.round(agg.avgDurationMs / 1000) + 's',
    '难度分布 ' + Object.keys(agg.byDifficulty).map(k => k + ':' + agg.byDifficulty[k]).join(' / '),
  ];
  let y = VH / 2 - S - 60;
  for (const ln of lines) { text(root, 0, y, ln, { size: 11, color: COL.dim, width: 330 }); y -= 20; }

  const sk = skillTotals();
  const list = Object.keys(sk).sort((a, b) => sk[b].damage - sk[a].damage).slice(0, 8);
  y -= 8;
  text(root, -160, y, '技能（按总伤害）', { size: 12, color: COL.accent, align: 'left', width: 320, bold: true, outline: true });
  y -= 22;
  for (const id of list) {
    const s = sk[id];
    text(root, -160, y, id + '  伤害 ' + Math.round(s.damage) + '  击杀 ' + s.kills + '  释放 ' + s.casts + '  命中 ' + s.hits,
      { size: 10, color: COL.cream, align: 'left', width: 330 });
    y -= 18;
  }
  if (!list.length) text(root, 0, y, '（还没有完整对局数据）', { size: 11, color: COL.dim, width: 320 });

  const exp = button(root, 0, -VH / 2 + 100, 300, 44, '导出全部 JSON（控制台/剪贴板）', { size: 12 });
  onTap(exp.node, () => {
    const json = exportAllJson();
    console.log('[M2A] ' + json);
    try {
      const wxAny = (globalThis as unknown as { wx?: { setClipboardData?: (o: { data: string; fail?: (e: unknown) => void }) => void } }).wx;
      if (wxAny?.setClipboardData) wxAny.setClipboardData({ data: json, fail: () => console.log(json) });
      else if (typeof navigator !== 'undefined' && navigator.clipboard) void navigator.clipboard.writeText(json);
    } catch { /* ignore */ }
  });
  const clr = button(root, 0, -VH / 2 + 48, 140, 34, '清空', { size: 11 });
  onTap(clr.node, () => { clearAll(); onBack(); });
  const back = button(root, 0, -VH / 2 + 14, 140, 30, '返回', { size: 11 });
  onTap(back.node, onBack);
  void mkNode;
  return root;
}
