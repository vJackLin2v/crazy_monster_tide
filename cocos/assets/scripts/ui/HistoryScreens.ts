/**
 * 战绩档案 V2（历史列表 + 单局报告）
 *
 * 设计：
 *  · 列表 = 紧凑统计面板 + Tab 筛选 + 战绩卡片（角色/波次/结果一眼可读），空态有行动入口；
 *  · 详情 = 结果头图 + 2×3 核心数据 + 图标化技能/道具 + 关键事件 + 结束原因；
 *  · 只用真实记录字段，缺失显示「未记录」，不推算、不伪造。
 */
import { Node, Color, view, Sprite, UITransform, Graphics } from 'cc';
import { panel, text, button, onTap, mkNode, screen } from './UIKit';
import { COL } from './Tokens';
import { safeTop, safeBottom } from './Safe';
import { makeModalList } from './ModalList';
import { at } from './MenuScreens';
import { CHARS } from '../data/Chars';
import { SKILLS, SKILL_ART } from '../data/Skills';
import { ITEMS } from '../data/Items';
import { ITEM_ICON, MODULE_ICON } from '../data/IconMap';
import { baseOf, MODULES } from '../data/Modules';
import { difficultyOf } from '../data/Difficulties';
import type { DifficultyId } from '../data/Difficulties';
import { Assets, iconFrame, loadIcon } from '../engine/Assets';
import {
  endReasonText, filterRuns, historyStats, resultLabel,
  type HistoryFilter, type RunDetail, type RunSummary,
} from '../game/RunHistory';

const ROW_H = 92;
const ROW_GAP = 8;

function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60), r = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
}

function dateShort(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => (n < 10 ? '0' + n : '' + n);
  return (d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function charName(id: string): string {
  const c = CHARS.find(x => x.id === id);
  return c ? c.name : id;
}

function diffName(id: DifficultyId): string { return difficultyOf(id).name; }

function resultText(r: RunSummary['result']): string {
  if (r === 'victory') return '胜利';
  if (r === 'defeat') return '失败';
  if (r === 'endless_end') return '无尽止步';
  return '主动放弃';
}

function headTitle(r: RunSummary['result']): string {
  if (r === 'victory') return '成功通关';
  if (r === 'defeat') return '挑战失败';
  if (r === 'endless_end') return '无尽落幕';
  return '主动结束冒险';
}

function resultColor(r: RunSummary['result']): Color {
  if (r === 'victory') return COL.mint;
  if (r === 'defeat') return COL.red;
  if (r === 'endless_end') return COL.accent;
  return COL.dim;
}

/** 角色头像（立绘 + 槽位框）；加载失败时用名字首字兜底 */
function portrait(parent: Node, charId: string, x: number, y: number, size: number): Node {
  const box = mkNode(parent, 'avatar', size, size, x, y);
  const slotN = panel(box, 0, 0, size, size, { art: 'slot' });
  const unit = CHARS.find(c => c.id === charId)?.unit;
  if (unit) {
    const n = mkNode(box, 'portrait', size - 8, size - 8);
    const sp = n.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.trim = false;
    void Assets.loadPortrait(unit).then((sf) => { if (sf && sp.isValid) sp.spriteFrame = sf; });
  }
  text(slotN, 0, 1, charName(charId).slice(0, 1), { size: Math.round(size / 2.4), color: COL.accent, width: size, bold: true, outline: true });
  return box;
}

/** 图标：技能/道具/黑科技统一走 IconMap + 异步回填 */
function iconNode(parent: Node, name: string | undefined, x: number, y: number, size: number): Node {
  const n = mkNode(parent, 'icon', size, size, x, y);
  if (!name) return n;
  const sp = n.addComponent(Sprite);
  sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.trim = false;
  const f = iconFrame(name);
  if (f) sp.spriteFrame = f;
  else void loadIcon(name).then((sf) => { if (sf && sp.isValid) sp.spriteFrame = sf; });
  return n;
}

/** 页面头：返回 + 标题 + 副标题（不用 screenHeader，避免返回按钮压边框） */
function pageHeader(root: Node, VW: number, VH: number, S: number, titleText: string, subtitle: string, onBack: () => void): void {
  const back = button(root, at(VW, VH, 54, S + 27).x, at(VW, VH, 54, S + 27).y, 64, 36, '返回', { size: 12 });
  onTap(back.node, onBack);
  text(root, 0, at(VW, VH, 180, S + 20).y, titleText,
    { size: 20, color: COL.cream, width: 300, bold: true, outline: true, shadow: true });
  text(root, 0, at(VW, VH, 180, S + 44).y, subtitle,
    { size: 9, color: COL.dim, width: 300 });
}

// ============================================================
// 列表
// ============================================================

export function buildHistoryList(
  parent: Node, list: RunSummary[], filter: HistoryFilter, initialOff: number,
  onFilter: (f: HistoryFilter) => void, onBack: () => void,
  onOpen: (runId: string, scroll: number) => void, onNewRun: () => void,
): Node {
  const vs = view.getVisibleSize();
  const VW = vs.width, VH = vs.height;
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-history', COL.bg1);
  pageHeader(root, VW, VH, S, '战绩档案', '记录每一次冒险', onBack);

  // ── A. 统计面板（一个面板，四个小数据块）──
  const panelY = S + 104;
  const statBox = panel(root, at(VW, VH, 180, panelY).x, at(VW, VH, 180, panelY).y, 330, 76, { art: 'panel' });
  const st = historyStats(list);
  const cols: [string, string][] = [
    ['总场次', String(st.total)],
    ['胜利', String(st.wins)],
    ['最高波次', String(st.bestWave)],
    ['最长生存', mmss(st.longestSeconds)],
  ];
  cols.forEach(([k, v], i) => {
    const cx = -124 + i * 82.5;
    text(statBox, cx, 10, v, { size: 18, color: i === 1 ? COL.mint : COL.cream, width: 80, bold: true, outline: true });
    text(statBox, cx, -16, k, { size: 8, color: COL.dim, width: 80 });
  });

  // ── B. 筛选 Tab ──
  const TABS: [HistoryFilter, string][] = [['all', '全部'], ['win', '胜利'], ['lose', '失败'], ['endless', '无尽']];
  const tabY = S + 172;   // 与统计面板多留 8px 呼吸（用户反馈贴太近）
  TABS.forEach(([f, label], i) => {
    const cx = 51 + i * 86;
    const b = button(root, at(VW, VH, cx, tabY).x, at(VW, VH, cx, tabY).y, 78, 36, label,
      { primary: f === filter, size: 12 });
    onTap(b.node, () => onFilter(f));
  });

  // ── C. 列表 / 空态 ──
  const listTop = S + 198;
  const listH = VH - listTop - B - 10;
  const shown = filterRuns(list, filter);

  if (!shown.length) {
    const cy = listTop + listH / 2 - 30;
    const card = panel(root, at(VW, VH, 180, cy).x, at(VW, VH, 180, cy).y, 320, 260, { art: 'panel_soft' });
    const pn = mkNode(card, 'emptyHero', 96, 104, 0, 62);
    const sp = pn.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.trim = false;
    void Assets.loadPortrait(CHARS[0].unit).then((sf) => { if (sf && sp.isValid) sp.spriteFrame = sf; });
    text(card, 0, -12, list.length ? '这个筛选下没有战绩' : '还没有战绩',
      { size: 16, color: COL.cream, width: 280, bold: true, outline: true });
    text(card, 0, -38, list.length
      ? '换一个筛选，或者去开启新的冒险。'
      : '完成一场冒险后，这里会留下你的战斗记录。',
      { size: 10, color: COL.dim, width: 280 });
    const go = button(card, 0, -88, 210, 44, list.length ? '返回全部战绩' : '开始第一场冒险', { primary: !list.length, size: 13 });
    onTap(go.node, () => {
      if (list.length) onFilter('all');
      else onNewRun();
    });
  } else {
    const contentH = Math.max(listH, shown.length * (ROW_H + ROW_GAP) + 8);
    const ml = makeModalList(root, at(VW, VH, 180, listTop + listH / 2).x, at(VW, VH, 180, listTop + listH / 2).y, 336, listH, contentH, initialOff);
    shown.forEach((s, i) => {
      const cy = ml.topY - 8 - i * (ROW_H + ROW_GAP) - ROW_H / 2;
      const row = panel(ml.content, 0, cy, 330, ROW_H, { art: 'panel_soft' });
      portrait(row, s.characterId, -136, 2, 52);

      text(row, -108, 24, charName(s.characterId),
        { size: 14, color: COL.cream, align: 'left', width: 92, bold: true, outline: true });
      text(row, -108, 4, diffName(s.difficulty) + ' · ' + (s.endlessMode ? '无尽' : '标准'),
        { size: 9, color: COL.dim, align: 'left', width: 92 });

      // 波次：本局最醒目的成绩
      const waveStr = s.endlessMode ? String(s.reachedWave) : s.reachedWave + '/' + s.totalWaves;
      text(row, -14, 22, waveStr, { size: 20, color: COL.accent, width: 66, bold: true, outline: true });
      text(row, -14, 2, s.endlessMode ? '波次（无尽）' : '波次', { size: 8, color: COL.dim, width: 66 });

      text(row, 56, 22, mmss(s.durationSeconds), { size: 10, color: COL.cream, width: 54, align: 'left', outline: true });
      text(row, 56, 4, '击杀 ' + s.killCount, { size: 9, color: COL.dim, width: 54, align: 'left' });

      const rc = resultColor(s.result);
      text(row, 140, 24, resultText(s.result), { size: 10, color: rc, width: 50, align: 'right', bold: true, outline: true });
      text(row, 140, 4, dateShort(s.endedAt), { size: 8, color: COL.dim, width: 50, align: 'right' });
      text(row, 140, -18, '详情 ›', { size: 9, color: COL.cream, width: 50, align: 'right' });

      onTap(row, () => { if (!ml.isDragging()) onOpen(s.runId, ml.offset()); });
    });
  }
  return root;
}

// ============================================================
// 详情
// ============================================================

export function buildHistoryDetail(
  parent: Node, summary: RunSummary, detail: RunDetail | null, onBack: () => void,
): Node {
  const vs = view.getVisibleSize();
  const VW = vs.width, VH = vs.height;
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-history-detail', COL.bg1);
  pageHeader(root, VW, VH, S, '对局详情', dateShort(summary.endedAt), onBack);

  const skills = detail ? detail.skills : summary.finalSkillIds.map(id => ({ id, lvl: 1, mods: [] as string[] }));
  const items = detail ? detail.items : summary.finalItemIds.map(id => ({ id, count: 1 }));
  const stats = detail ? detail.stats : {};
  const milestones = detail ? detail.milestones : [];

  // 预计算内容高度
  const HERO = 150;
  const GRID = 190;
  const SKILL_H = 40 + Math.max(1, skills.length) * 54;
  const ITEM_ROWS = Math.max(1, Math.ceil(items.length / 7));
  const ITEM_H = items.length ? 30 + ITEM_ROWS * 46 : 52;
  const MS_H = milestones.length ? 30 + Math.min(12, milestones.length) * 20 : 52;
  const END_H = 84;
  const contentH = HERO + GRID + SKILL_H + ITEM_H + MS_H + END_H + 30;

  const listTop = S + 62;
  const listH = VH - listTop - B - 8;
  const ml = makeModalList(root, at(VW, VH, 180, listTop + listH / 2).x, at(VW, VH, 180, listTop + listH / 2).y, 340, listH, contentH);
  let y = ml.topY - 10;

  // ── A. 战绩头图 ──
  const rc = resultColor(summary.result);
  text(ml.content, 0, y - 36, headTitle(summary.result),
    { size: 24, color: rc, width: 330, bold: true, outline: true, shadow: true });
  text(ml.content, 0, y - 60, diffName(summary.difficulty) + ' · ' + resultText(summary.result)
    + (summary.endlessMode ? ' · 无尽' : ''),
    { size: 10, color: COL.dim, width: 320 });

  portrait(ml.content, summary.characterId, -118, y - 110, 64);
  text(ml.content, -76, y - 96, charName(summary.characterId),
    { size: 18, color: COL.cream, align: 'left', width: 180, bold: true, outline: true });
  text(ml.content, -76, y - 120, (summary.endlessMode ? '第 ' + summary.reachedWave + ' 波' : '第 ' + summary.reachedWave + '/' + summary.totalWaves + ' 波')
    + ' · ' + mmss(summary.durationSeconds),
    { size: 11, color: COL.accent, align: 'left', width: 220, bold: true, outline: true });
  text(ml.content, -76, y - 138, dateShort(summary.startedAt) + ' → ' + dateShort(summary.endedAt),
    { size: 8, color: COL.dim, align: 'left', width: 240 });
  y -= HERO;

  // ── B. 核心战斗数据（2×3）──
  const dmgDealt = typeof stats.dmgDealt === 'number' ? String(Math.round(stats.dmgDealt)) : '未记录';
  const dmgTaken = typeof stats.dmgTaken === 'number' ? String(Math.round(stats.dmgTaken)) : '未记录';
  const cells: [string, string][] = [
    ['击杀数量', String(summary.killCount)],
    ['生存时间', mmss(summary.durationSeconds)],
    ['最高波次', summary.endlessMode ? String(summary.reachedWave) : summary.reachedWave + '/' + summary.totalWaves],
    ['造成伤害', dmgDealt],
    ['承受伤害', dmgTaken],
    ['获得金币', String(summary.goldEarned)],
  ];
  cells.forEach(([k, v], i) => {
    const cx = -84 + (i % 2) * 168;
    const cy = y - 30 - Math.floor(i / 2) * 64;
    const card = panel(ml.content, cx, cy, 158, 56, { art: 'panel_soft' });
    // 统一左对齐，避免 2×3 卡片里数值长度不同导致视觉错位
    text(card, -64, 12, k, { size: 9, color: COL.dim, align: 'left', width: 128 });
    text(card, -64, -10, v, { size: v.length > 6 ? 15 : 19, color: COL.cream, align: 'left', width: 128, bold: true, outline: true });
  });
  y -= GRID;

  // ── C. 技能构筑（图标 + 展开）──
  text(ml.content, -165, y - 14, '技能构筑', { size: 12, color: COL.accent, align: 'left', width: 200, bold: true, outline: true });
  (skills.length ? skills : [{ id: '', lvl: 0, mods: [] }]).forEach((s, i) => {
    const cy = y - 56 - i * 54;
    const row = panel(ml.content, 0, cy, 330, 48, { art: 'panel_soft' });
    iconNode(row, SKILL_ART[s.id]?.icon, -142, 2, 32);
    const def = SKILLS[s.id];
    text(row, -116, 10, (def ? def.name : s.id || '—') + '  Lv.' + s.lvl,
      { size: 12, color: COL.cream, align: 'left', width: 160, bold: true, outline: true });
    text(row, -116, -10, s.mods.length ? ('黑科技 ' + s.mods.length + ' 个') : '无黑科技',
      { size: 9, color: COL.dim, align: 'left', width: 170 });
    text(row, 150, 0, '详情 ›', { size: 9, color: COL.accent, width: 60, align: 'right' });
    onTap(row, () => openSkillModal(root, s, VW, VH));
  });
  y -= SKILL_H;

  // ── D. 道具 ──
  text(ml.content, -165, y - 14, '道具收藏 (' + items.length + ')', { size: 12, color: COL.accent, align: 'left', width: 220, bold: true, outline: true });
  if (!items.length) {
    text(ml.content, -165, y - 34, '（本局没有获得道具）', { size: 10, color: COL.dim, align: 'left', width: 300 });
  } else {
    items.forEach((it, i) => {
      const cx = -144 + (i % 7) * 48;
      const cy = y - 46 - Math.floor(i / 7) * 46;
      const box = panel(ml.content, cx, cy, 42, 42, { art: 'slot' });
      iconNode(box, ITEM_ICON[it.id], 0, 0, 34);
      if (it.count > 1) text(box, 15, -15, '×' + it.count, { size: 8, color: COL.accent, width: 26, align: 'right' });
    });
  }
  y -= ITEM_H;

  // ── E. 关键事件 ──
  text(ml.content, -165, y - 14, '关键事件', { size: 12, color: COL.accent, align: 'left', width: 200, bold: true, outline: true });
  if (!milestones.length) {
    text(ml.content, -165, y - 34, '（这一局没有记录到关键事件）', { size: 10, color: COL.dim, align: 'left', width: 300 });
  } else {
    milestones.slice(-12).forEach((m, i) => {
      text(ml.content, -165, y - 34 - i * 20,
        '第 ' + m.wave + ' 波 · ' + mmss(m.at) + '  ' + m.text,
        { size: 10, color: m.kind === 'boss' ? COL.red : COL.cream, align: 'left', width: 300, outline: true });
    });
  }
  y -= MS_H;

  // ── F. 结束原因 ──
  const endCard = panel(ml.content, 0, y - 34, 330, 62, { art: 'panel' });
  text(endCard, 0, 14, '结束原因', { size: 9, color: COL.dim, width: 300 });
  text(endCard, 0, -10, detail?.endReason || endReasonText(summary.result),
    { size: 12, color: rc, width: 310, bold: true, outline: true });

  return root;
}

/** 技能详情浮层（点技能卡打开；不改变列表布局） */
function openSkillModal(root: Node, s: { id: string; lvl: number; mods: string[] }, VW: number, VH: number): void {
  const def = SKILLS[s.id];
  const wrap = mkNode(root, 'skillModal', VW, VH);
  const dim = wrap.addComponent(UITransform);
  dim.setContentSize(VW, VH);
  const dg = wrap.addComponent(Graphics);
  dg.fillColor = new Color(4, 6, 12, 200);
  dg.rect(-VW / 2, -VH / 2, VW, VH); dg.fill();
  const bg = panel(wrap, 0, 0, 320, 250, { art: 'panel' });
  text(bg, 0, 98, (def ? def.name : s.id) + '  Lv.' + s.lvl,
    { size: 16, color: COL.cream, width: 300, bold: true, outline: true });
  text(bg, 0, 72, def ? def.desc : '—', { size: 10, color: COL.dim, width: 290 });
  const mods = s.mods.length ? s.mods : [];
  if (!mods.length) {
    text(bg, 0, 20, '（没有安装黑科技）', { size: 11, color: COL.dim, width: 280 });
  } else {
    mods.slice(0, 3).forEach((mid, i) => {
      const base = baseOf(mid);
      const d = MODULES[base];
      const ry = 28 - i * 34;
      iconNode(bg, MODULE_ICON[base], -132, ry, 26);
      text(bg, -108, ry + 6, d ? d.name : mid, { size: 11, color: COL.cream, align: 'left', width: 250, bold: true, outline: true });
      text(bg, -108, ry - 10, d ? d.desc : '', { size: 8, color: COL.dim, align: 'left', width: 260 });
    });
  }
  const close = button(bg, 0, -94, 140, 34, '关闭', { size: 11 });
  onTap(close.node, () => { if (wrap.isValid) wrap.destroy(); });
  onTap(bg, () => { if (wrap.isValid) wrap.destroy(); });
}
