/**
 * 历史对局页面（列表 + 详情）
 *
 * 数据来自 game/RunHistory（摘要 + 详情分层）：列表只吃摘要，详情点击后才用。
 * 布局：360×640 设计坐标，列表与详情都用 ModalList 滚动（与安装屏/商店同一套）。
 */
import { Node, Color, view } from 'cc';
import { panel, text, button, onTap, mkNode, screen, screenHeader } from './UIKit';
import { COL } from './Tokens';
import { safeTop, safeBottom } from './Safe';
import { makeModalList } from './ModalList';
import { at } from './MenuScreens';
import { CHARS } from '../data/Chars';
import { SKILLS } from '../data/Skills';
import { ITEMS } from '../data/Items';
import { difficultyOf } from '../data/Difficulties';
import { MODULES } from '../data/Modules';
import type { DifficultyId } from '../data/Difficulties';
import { endReasonText, filterRuns, historyStats, resultLabel, type HistoryFilter, type RunDetail, type RunSummary } from '../game/RunHistory';

const ROW_H = 96;
const ROW_GAP = 8;
const ICON_ART = 'icon';

function mmss(sec: number): string {
  const s = Math.max(0, Math.round(sec));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return (m < 10 ? '0' : '') + m + ':' + (r < 10 ? '0' : '') + r;
}

function dateText(ms: number): string {
  const d = new Date(ms);
  const p = (n: number) => (n < 10 ? '0' + n : '' + n);
  return d.getFullYear() + '/' + p(d.getMonth() + 1) + '/' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes());
}

function charName(id: string): string {
  const c = CHARS.find(x => x.id === id);
  return c ? c.name : id;
}

function diffName(id: DifficultyId): string {
  return difficultyOf(id).name;
}

function skillNames(ids: string[]): string {
  return ids.slice(0, 3).map(id => (SKILLS[id] ? SKILLS[id].name : id)).join(' / ') || '—';
}

function resultColor(r: RunSummary['result']): Color {
  if (r === 'victory') return COL.mint;
  if (r === 'defeat') return COL.red;
  if (r === 'endless_end') return COL.accent;
  return COL.dim;
}

function avatar(parent: Node, charId: string, x: number, y: number, d = 44): Node {
  const box = panel(parent, x, y, d, d, { art: 'slot' });
  const c = CHARS.find(k => k.id === charId);
  // 用角色名首字做像素头像（避免为历史页额外加载立绘，保持列表轻量）
  text(box, 0, 1, c ? c.name.slice(0, 1) : '?', { size: 20, color: COL.accent, width: d, bold: true, outline: true });
  return box;
}

/** 列表页：总览 + 筛选 + 可滚动记录 */
export function buildHistoryList(
  parent: Node, list: RunSummary[], filter: HistoryFilter, initialOff: number,
  onFilter: (f: HistoryFilter) => void, onBack: () => void,
  onOpen: (runId: string, scroll: number) => void,
): Node {
  const vs = view.getVisibleSize();
  const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-history', COL.bg1);
  screenHeader(root, VW, S, '历史对局');

  const back = button(root, A(46, S + 30).x, A(46, S + 30).y, 64, 34, '返回', { size: 12 });
  onTap(back.node, onBack);

  const st = historyStats(list);
  text(root, A(16, S + 66).x, A(16, S + 66).y,
    '总对局 ' + st.total + '    胜利 ' + st.wins + '    最远 ' + st.bestWave + ' 波    最长 ' + mmss(st.longestSeconds),
    { size: 11, color: COL.cream, align: 'left', width: 330, outline: true });

  const TABS: [HistoryFilter, string][] = [['all', '全部'], ['win', '胜利'], ['lose', '失败'], ['endless', '无尽']];
  TABS.forEach(([f, label], i) => {
    const x = 14 + i * 84 + 40;
    const b = button(root, A(x, S + 104).x, A(x, S + 104).y, 76, 32, label,
      { primary: f === filter, size: 12 });
    onTap(b.node, () => onFilter(f));
  });

  const shown = filterRuns(list, filter);
  const listTop = S + 132;
  const listH = VH - listTop - B - 12;
  const contentH = Math.max(listH, shown.length * (ROW_H + ROW_GAP) + 8);

  if (!shown.length) {
    const empty = panel(root, A(180, listTop + 100).x, A(180, listTop + 100).y, 320, 120, { art: 'panel_soft' });
    text(empty, 0, 22, list.length ? '这个筛选下没有对局' : '还没有历史对局',
      { size: 15, color: COL.cream, width: 300, bold: true, outline: true });
    text(empty, 0, -8, list.length
      ? '换一个筛选看看'
      : '完成一场冒险后，这里会记录你的战斗经历。',
      { size: 11, color: COL.dim, width: 290 });
  } else {
    const ml = makeModalList(root, A(180, listTop + listH / 2).x, A(180, listTop + listH / 2).y, 336, listH, contentH, initialOff);
    shown.forEach((s, i) => {
      const cy = ml.topY - 8 - i * (ROW_H + ROW_GAP) - ROW_H / 2;
      const row = panel(ml.content, 0, cy, 330, ROW_H, { art: 'panel_soft' });
      avatar(row, s.characterId, -140, 4, 44);
      text(row, -108, 26, charName(s.characterId),
        { size: 14, color: COL.cream, align: 'left', width: 150, bold: true, outline: true });
      text(row, 18, 26, diffName(s.difficulty) + ' · ' + resultLabel(s.result),
        { size: 12, color: resultColor(s.result), width: 120, bold: true, outline: true });
      text(row, -108, 6, '第 ' + s.reachedWave + '/' + s.totalWaves + ' 波 · ' + mmss(s.durationSeconds) + ' · 击杀 ' + s.killCount,
        { size: 10, color: COL.cream, align: 'left', width: 230, outline: true });
      text(row, -108, -14, skillNames(s.finalSkillIds),
        { size: 10, color: COL.accent, align: 'left', width: 230, outline: true });
      text(row, 118, -32, '查看详情 >', { size: 10, color: COL.dim, width: 90, align: 'right' });
      text(row, 118, 6, dateText(s.endedAt), { size: 9, color: COL.dim, width: 110, align: 'right' });
      onTap(row, () => { if (!ml.isDragging()) onOpen(s.runId, ml.offset()); });
    });
  }
  return root;
}

/** 详情页：纵向滚动（基本信息 / 统计 / 构筑 / 道具 / 进程 / 结束原因） */
export function buildHistoryDetail(
  parent: Node, summary: RunSummary, detail: RunDetail | null, onBack: () => void,
): Node {
  const vs = view.getVisibleSize();
  const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-history-detail', COL.bg1);
  screenHeader(root, VW, S, '对局详情');
  const back = button(root, A(46, S + 30).x, A(46, S + 30).y, 64, 34, '返回', { size: 12 });
  onTap(back.node, onBack);

  const skills = detail ? detail.skills : summary.finalSkillIds.map(id => ({ id, lvl: 1, mods: [] as string[] }));
  const items = detail ? detail.items : summary.finalItemIds.map(id => ({ id, count: 1 }));
  const milestones = detail ? detail.milestones : [];
  const stats = detail ? detail.stats : {};

  // 先算内容高度（保证滚动范围正确）
  const HEAD = 96;
  const CARDS = 132;                       // 两行 × (58 卡 + 8 间距)
  const SKILL_BLOCK = 26 + Math.max(1, skills.length) * 52;
  const ITEM_ROWS = Math.max(1, Math.ceil(items.length / 7));
  const ITEMS_BLOCK = items.length ? 26 + ITEM_ROWS * 44 : 46;
  const MS_BLOCK = milestones.length ? 26 + Math.min(12, milestones.length) * 20 : 46;
  const END_BLOCK = 74;
  const statsLines = [
    '精英击杀 ' + summary.eliteKillCount,
    'BOSS 击杀 ' + summary.bossKillCount,
    '获得金币 ' + summary.goldEarned,
    '商店花费 ' + summary.goldSpent,
    '结束生命 ' + (typeof stats.hp === 'number' ? Math.round(stats.hp) : '未记录'),
  ];
  const STAT_BLOCK = 22 + statsLines.length * 18 + 10;
  const contentH = HEAD + CARDS + STAT_BLOCK + SKILL_BLOCK + ITEMS_BLOCK + MS_BLOCK + END_BLOCK + 40;
  const listTop = S + 64;
  const listH = VH - listTop - B - 10;
  const ml = makeModalList(root, A(180, listTop + listH / 2).x, A(180, listTop + listH / 2).y, 340, listH, contentH);

  let y = ml.topY - 8;
  // 1) 基本信息
  avatar(ml.content, summary.characterId, -138, y - 30, 52);
  text(ml.content, -104, y - 16, charName(summary.characterId),
    { size: 18, color: COL.cream, align: 'left', width: 210, bold: true, outline: true });
  text(ml.content, -104, y - 38, diffName(summary.difficulty) + ' · ' + resultLabel(summary.result) + (summary.endlessMode ? ' · 无尽' : ''),
    { size: 12, color: resultColor(summary.result), align: 'left', width: 220, bold: true, outline: true });
  text(ml.content, -104, y - 56, dateText(summary.startedAt) + ' → ' + dateText(summary.endedAt),
    { size: 9, color: COL.dim, align: 'left', width: 240 });
  y -= HEAD;

  // 2) 四个统计卡
  const cards: [string, string][] = [
    ['到达波次', summary.reachedWave + '/' + summary.totalWaves],
    ['存活时间', mmss(summary.durationSeconds)],
    ['击杀数量', String(summary.killCount)],
    ['徽章', summary.badges.length ? String(summary.badges.length) : '—'],
  ];
  cards.forEach(([k, v], i) => {
    const cx = -126 + (i % 2) * 168;
    const cy = y - 30 - Math.floor(i / 2) * 66;
    const card = panel(ml.content, cx, cy, 160, 58, { art: 'panel_soft' });
    text(card, 0, 14, k, { size: 10, color: COL.dim, width: 144 });
    text(card, 0, -10, v, { size: 20, color: COL.cream, width: 144, bold: true, outline: true });
  });
  y -= CARDS;

  // 3) 战斗统计
  text(ml.content, -152, y - 14, '战斗统计', { size: 12, color: COL.accent, align: 'left', width: 200, bold: true, outline: true });
  statsLines.forEach((line, i) => {
    text(ml.content, -146, y - 34 - i * 18, line, { size: 10, color: COL.cream, align: 'left', width: 280, outline: true });
  });
  y -= STAT_BLOCK;

  // 4) 技能构筑
  text(ml.content, -152, y - 14, '技能构筑', { size: 12, color: COL.accent, align: 'left', width: 200, bold: true, outline: true });
  (skills.length ? skills : [{ id: '', lvl: 0, mods: [] }]).forEach((s, i) => {
    const cy = y - 42 - i * 52;
    const card = panel(ml.content, 0, cy, 330, 46, { art: 'panel_soft' });
    const def = SKILLS[s.id];
    text(card, -146, 10, (def ? def.name : s.id || '—') + '  Lv.' + s.lvl,
      { size: 12, color: COL.cream, align: 'left', width: 190, bold: true, outline: true });
    const mods = s.mods.map(m => moduleName(m)).join(' · ') || '无黑科技';
    text(card, -146, -10, mods, { size: 9, color: COL.dim, align: 'left', width: 300 });
  });
  y -= SKILL_BLOCK;

  // 5) 道具
  text(ml.content, -152, y - 14, '道具收藏 (' + items.length + ')', { size: 12, color: COL.accent, align: 'left', width: 220, bold: true, outline: true });
  if (!items.length) {
    text(ml.content, -146, y - 34, '（本局没有获得道具）', { size: 10, color: COL.dim, align: 'left', width: 280 });
  }
  items.slice(0, 21).forEach((it, i) => {
    const cx = -144 + (i % 7) * 48;
    const cy = y - 44 - Math.floor(i / 7) * 44;
    const box = panel(ml.content, cx, cy, 40, 40, { art: 'slot' });
    const def = ITEMS[it.id];
    text(box, 0, 1, def ? def.name.slice(0, 2) : '?', { size: 9, color: COL.cream, width: 38, outline: false });
    if (it.count > 1) text(box, 14, -14, '×' + it.count, { size: 9, color: COL.accent, width: 26, align: 'right' });
  });
  y -= ITEMS_BLOCK;

  // 6) 对局进程
  text(ml.content, -152, y - 14, '对局进程', { size: 12, color: COL.accent, align: 'left', width: 200, bold: true, outline: true });
  if (!milestones.length) {
    text(ml.content, -146, y - 34, '（没有记录到关键事件）', { size: 10, color: COL.dim, align: 'left', width: 280 });
  } else {
    milestones.slice(-12).forEach((m, i) => {
      text(ml.content, -146, y - 34 - i * 20,
        '第 ' + m.wave + ' 波 · ' + mmss(m.at) + '  ' + m.text,
        { size: 10, color: m.kind === 'boss' ? COL.red : COL.cream, align: 'left', width: 300, outline: true });
    });
  }
  y -= MS_BLOCK;

  // 7) 结束原因
  const endCard = panel(ml.content, 0, y - 32, 330, 58, { art: 'panel' });
  text(endCard, 0, 12, '结束原因', { size: 10, color: COL.dim, width: 300 });
  text(endCard, 0, -10, endReasonText(summary.result), { size: 12, color: resultColor(summary.result), width: 310, bold: true, outline: true });
  return root;
}

function moduleName(id: string): string {
  const base = id.replace(/_\d+$/, '');
  return MODULES[base] ? MODULES[base].name : id;
}
