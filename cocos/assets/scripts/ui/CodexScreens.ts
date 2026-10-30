/**
 * 图鉴 / 成就（滚动版，2026-10-30 按真机反馈重做）
 *
 * 相对旧版：
 *   · 图鉴**不再分页**，改为上下拖动滚动（虚拟化：只渲染视口内的行，最多 70 条也不卡）
 *   · **未发现的条目显示「？？？」**（存档里记 seen），点击已发现的才弹详情卡
 *   · 点击任意已发现条目 → 弹出详情卡（图标 / 名称 / 描述 / 数值）
 *   · 怪物图标在格子里**居中**（旧版节点锚点偏移导致偏左上）
 *   · 成就页同样改为滚动
 */
import { Node, Label, Sprite, UITransform, view, EventTouch, LabelOutline, SpriteFrame } from 'cc';
import { panel, text, title, button, onTap, mkNode, mask, screen, screenHeader, paintPanel } from './UIKit';
import { COL, FS, MIN_TAP } from './Tokens';
import { safeTop, safeBottom } from './Safe';
import type { SaveData } from '../game/Progress';
import { ACHIEVEMENTS, achViews, unlockedCount } from '../game/Achievements';
import { CHARS } from '../data/Chars';
import { SKILLS } from '../data/Skills';
import { ITEMS } from '../data/Items';
import { ITEM_ICON } from '../data/IconMap';
import { ENEMIES } from '../data/Enemies';
import { Assets, iconFrame, loadIcon } from '../engine/Assets';

function at(vw: number, vh: number, x: number, y: number) {
  return { x: x - vw / 2, y: vh / 2 - y };
}

/** 敌人 id → 中文名 */
const ENEMY_CN: Record<string, string> = {
  goblin: '哥布林', wolf: '野狼', eyebat: '眼球蝠', orc: '兽人', imp: '小恶魔',
  stingerbat: '刺蝠', hyena: '鬣狗', axolizard: '六角蜥', lizardhunter: '蜥蜴猎手',
  succubus: '魅魔', basilisk: '蛇怪', observer: '观察者', claweddemon: '爪魔',
  venommaw: '毒颚', cavebrute: '洞穴巨怪', gnollberserker: '豺狼狂战士', boss: '魔王',
};

export interface CodexEntry {
  id: string;          // 存档里的发现键，如 'enemy:goblin'
  name: string;
  sub: string;
  desc?: string;
  art?: string;
  unit?: string;
  portrait?: boolean;
}

const TABS: { key: string; label: string }[] = [
  { key: 'char', label: '角色' },
  { key: 'skill', label: '技能' },
  { key: 'item', label: '道具' },
  { key: 'enemy', label: '怪物' },
];

export function codexData(tab: string): CodexEntry[] {
  if (tab === 'char') {
    return CHARS.map(c => ({
      id: 'char:' + c.id,
      name: c.name, sub: '初始技能：' + (SKILLS[c.start] ? SKILLS[c.start].name : c.start),
      desc: c.pos + '\n' + c.neg, unit: c.unit, portrait: true,
    }));
  }
  if (tab === 'skill') {
    return Object.keys(SKILLS).map((id) => {
      const d = SKILLS[id];
      return {
        id: 'skill:' + id, name: d.name,
        sub: '伤害 ' + d.dmg + ' · 冷却 ' + d.cd.toFixed(2) + 's',
        desc: d.desc, art: d.icon,
      };
    });
  }
  if (tab === 'item') {
    return Object.keys(ITEMS).map((id) => {
      const d = ITEMS[id];
      return { id: 'item:' + id, name: d.name, sub: d.tier === 2 ? '高级道具' : '普通道具', desc: d.desc, art: ITEM_ICON[id] };
    });
  }
  return Object.keys(ENEMIES).map((id) => {
    const d = ENEMIES[id];
    const tag = d.boss ? 'BOSS' : (d.elite ? '精英' : '普通');
    return {
      id: 'enemy:' + id, name: ENEMY_CN[id] ?? id,
      sub: 'HP ' + d.hp + ' · 速度 ' + d.spd + ' · 伤害 ' + d.dmg,
      desc: tag + (d.from ? ' · 第 ' + d.from + ' 波起出现' : ''), unit: d.unit,
    };
  });
}

/** 图标/立绘：**在格子内居中**（旧版用固定左上偏移，怪物偏了） */
function drawEntryArt(parent: Node, entry: CodexEntry, box: number, known: boolean): void {
  for (const c of parent.children.slice()) c.destroy();
  if (!known) {
    text(parent, 0, 1, '?', { size: Math.round(box * 0.55), color: COL.dim2, width: box, bold: true, outline: false });
    return;
  }
  if (entry.unit) {
    const n = mkNode(parent, 'p', box, box, 0, 0);
    const sp = n.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.trim = false;
    const ut = n.getComponent(UITransform);
    const apply = (f: SpriteFrame | null) => {
      if (!f || !sp.isValid) return;
      sp.spriteFrame = f;
      const w = (f.rect && f.rect.width) || 32, h = (f.rect && f.rect.height) || 32;
      const k = Math.max(1, Math.floor(Math.min((box - 6) / h, (box - 6) / w)));
      if (ut) ut.setContentSize(w * k, h * k);
      n.setPosition(0, 0, 0);      // ★ 居中
    };
    if (entry.portrait) void Assets.loadPortrait(entry.unit).then(apply).catch(() => { /* 忽略 */ });
    else void Assets.loadUnit(entry.unit).then(c => apply((c.idle && c.idle[0]) || null)).catch(() => { /* 忽略 */ });
    return;
  }
  if (entry.art) {
    const n = mkNode(parent, 'ic', box - 8, box - 8, 0, 0);
    const sp = n.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.trim = false;
    const f = iconFrame(entry.art);
    if (f) sp.spriteFrame = f;
    else void loadIcon(entry.art).then(() => { const g = iconFrame(entry.art); if (g && sp.isValid) sp.spriteFrame = g; });
  }
}

/** 详情卡：点击图鉴条目弹出 */
function showDetail(parent: Node, vw: number, vh: number, e: CodexEntry, onClose: () => void): Node {
  const root = mkNode(parent, 'codexDetail', vw, vh);
  mask(root, vw, vh);
  const W = 300, H = 250;
  const c = at(vw, vh, vw / 2, vh / 2);
  const box = panel(root, c.x, c.y, W, H, { art: 'panel' });
  const art = mkNode(box, 'art', 64, 64, 0, H / 2 - 58);
  drawEntryArt(art, e, 64, true);
  title(box, H / 2 - 108, e.name, { width: W - 30 });
  text(box, 0, H / 2 - 132, e.sub, { size: 10, color: COL.dim, width: W - 30, outline: false });
  text(box, 0, -6, e.desc ?? '', { size: 11, color: COL.cream, width: W - 36, h: 76 });
  const btn = button(box, 0, -H / 2 + 32, 180, 44, '关闭', { primary: true, size: 15 });
  onTap(btn.node, onClose);
  return root;
}

export function buildCodex(parent: Node, save: SaveData, onBack: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-codex', COL.bg1);
  screenHeader(root, VW, S, '图鉴', 58);

  let tab = 0;
  const TAB_W = 78, TAB_GAP = 6, TAB_H = 34;
  const tabsW = TAB_W * 4 + TAB_GAP * 3;
  const tabY = S + 58 + 16 + TAB_H / 2;
  const tabNodes: { n: Node; l: Label; i: number }[] = [];
  TABS.forEach((t, i) => {
    const x = -tabsW / 2 + TAB_W / 2 + i * (TAB_W + TAB_GAP);
    const p = A(180, tabY);
    const n = panel(root, p.x + x, p.y, TAB_W, TAB_H, { art: 'btn' });
    const l = text(n, 0, 1, t.label, { size: 12, color: COL.cream, width: TAB_W - 10, bold: true, outline: true });
    tabNodes.push({ n, l, i });
    const hit = mkNode(root, 'tabHit', TAB_W, MIN_TAP, p.x + x, p.y);
    onTap(hit, () => { tab = i; refresh(true); });
  });

  // 滚动视口：从页签下面到返回键上面（**必须有真实尺寸**，否则收不到拖动）
  // ⚠️ 全部用"从屏幕顶往下"的坐标，别再和局部 y 混用（第一版就是这么把视口放到屏幕外的）
  const viewTop = tabY + TAB_H / 2 + 12;
  const viewBottom = VH - B - 60;                 // 返回键上方
  const viewH = Math.max(80, viewBottom - viewTop);
  const vc = A(VW / 2, viewTop + viewH / 2);
  const viewport = mkNode(root, 'codexView', VW - 8, viewH, vc.x, vc.y);
  const ROW_H = 50, PITCH = 56, ROW_W = 336;
  let offset = 0, maxOffset = 0, dragFrom = 0, dragging = false;

  const back = button(root, 0, -VH / 2 + B + 24, 336, 48, '返回', { size: FS.m });
  onTap(back.node, onBack);

  function rows(): CodexEntry[] { return codexData(TABS[tab].key); }

  function refresh(reset = false): void {
    if (reset) { offset = 0; }
    tabNodes.forEach(t => {
      paintTab(t.i === tab);
    });
    for (const c of viewport.children.slice()) c.destroy();
    const data = rows();
    const contentH = Math.max(0, data.length * PITCH - (PITCH - ROW_H));
    maxOffset = Math.max(0, contentH - viewH + 12);
    offset = Math.max(0, Math.min(maxOffset, offset));
    const first = Math.max(0, Math.floor(offset / PITCH));
    const last = Math.min(data.length - 1, first + Math.max(1, Math.floor((viewH - 10) / PITCH)));
    const topY = viewH / 2 - ROW_H / 2 - 4 + offset;   // 第 0 行的 y（随滚动上移）
    for (let i = first; i <= last; i++) {
      const e = data[i];
      if (!e) continue;
      const known = (save.seen ?? []).includes(e.id);
      const y = topY - i * PITCH;
      const row = panel(viewport, 0, y, ROW_W, ROW_H, { art: known ? 'panel_soft' : 'well' });
      const iconHost = mkNode(row, 'iconHost', 34, 34, -ROW_W / 2 + 25, 0);
      drawEntryArt(iconHost, e, 34, known);
      text(row, -ROW_W / 2 + 50, 8, known ? e.name : '？？？',
        { size: 13, color: known ? COL.cream : COL.dim2, align: 'left', width: 240, bold: true, outline: known });
      text(row, -ROW_W / 2 + 50, -11, known ? e.sub : '尚未发现',
        { size: 10, color: COL.dim, align: 'left', width: 250, outline: false });
      if (known) {
        text(row, ROW_W / 2 - 12, 0, '›', { size: 16, color: COL.accent, align: 'right', width: 20, outline: false });
        onTap(row, () => { this_detail = showDetail(root, VW, VH, e, () => { if (this_detail) { this_detail.destroy(); this_detail = null; } }); });
      }
    }
  }
  // 闭包变量（避免在 onTap 里引用未定义）
  let this_detail: Node | null = null;

  function paintTab(on: boolean): void {
    const t = tabNodes.find(k => k.i === tab);
    tabNodes.forEach(k => {
      const sel = k.i === tab;
      paintPanel(k.n, TAB_W, TAB_H, { art: sel ? 'btn_primary' : 'btn' });
      k.l.color = sel ? COL.ink : COL.cream;
      const ol = k.l.node.getComponent(LabelOutline);
      if (ol) ol.enabled = !sel;
    });
    void t; void on;
  }

  // 拖动
  viewport.on(Node.EventType.TOUCH_START, () => { dragging = true; dragFrom = offset; }, viewport);
  viewport.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
    if (!dragging) return;
    offset = Math.max(0, Math.min(maxOffset, dragFrom + e.getUIDelta().y));
    refresh();
  }, viewport);
  viewport.on(Node.EventType.TOUCH_END, () => { dragging = false; }, viewport);
  viewport.on(Node.EventType.TOUCH_CANCEL, () => { dragging = false; }, viewport);

  refresh(true);
  return root;
}

export function buildAchievements(parent: Node, save: SaveData, onBack: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-ach', COL.bg1);
  screenHeader(root, VW, S, '成就', 58);
  text(root, 0, A(180, S + 58 + 20).y, '已解锁 ' + unlockedCount(save) + ' / ' + ACHIEVEMENTS.length,
    { size: 11, color: COL.dim, width: 320, outline: false });

  const viewTop = S + 58 + 38;
  const viewBottom = VH - B - 60;
  const viewH = Math.max(80, viewBottom - viewTop);
  const vc = A(VW / 2, viewTop + viewH / 2);
  const viewport = mkNode(root, 'achView', VW - 8, viewH, vc.x, vc.y);
  const ROW_H = 50, PITCH = 56, ROW_W = 336;
  let offset = 0, maxOffset = 0, dragFrom = 0, dragging = false;

  const back = button(root, 0, -VH / 2 + B + 24, 336, 48, '返回', { size: FS.m });
  onTap(back.node, onBack);

  function refresh(): void {
    for (const c of viewport.children.slice()) c.destroy();
    const views = achViews(save);
    const contentH = Math.max(0, views.length * PITCH - (PITCH - ROW_H));
    maxOffset = Math.max(0, contentH - viewH + 12);
    offset = Math.max(0, Math.min(maxOffset, offset));
    const first = Math.max(0, Math.floor(offset / PITCH));
    const last = Math.min(views.length - 1, first + Math.ceil(viewH / PITCH) + 1);
    const topY = viewH / 2 - ROW_H / 2 - 4 + offset;
    for (let i = first; i <= last; i++) {
      const v = views[i];
      if (!v) continue;
      const y = topY - i * PITCH;
      const row = panel(viewport, 0, y, ROW_W, ROW_H, { art: v.done ? 'rim_gold' : 'panel_soft' });
      text(row, -ROW_W / 2 + 12, 8, v.def.name,
        { size: 13, color: v.done ? COL.accent : COL.cream, align: 'left', width: 200, bold: true, outline: true });
      text(row, -ROW_W / 2 + 12, -11, v.def.desc,
        { size: 10, color: COL.dim, align: 'left', width: 220, outline: false });
      if (v.done) {
        const b = panel(row, ROW_W / 2 - 40, 0, 60, 24, { art: 'btn_primary' });
        text(b, 0, 1, '已解锁', { size: 10, color: COL.ink, width: 56, bold: true, outline: false });
      } else {
        text(row, ROW_W / 2 - 10, 0, v.cur + ' / ' + v.def.target,
          { size: 11, color: COL.dim2, align: 'right', width: 72, bold: true, outline: false });
      }
    }
  }

  viewport.on(Node.EventType.TOUCH_START, () => { dragging = true; dragFrom = offset; }, viewport);
  viewport.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
    if (!dragging) return;
    offset = Math.max(0, Math.min(maxOffset, dragFrom + e.getUIDelta().y));
    refresh();
  }, viewport);
  viewport.on(Node.EventType.TOUCH_END, () => { dragging = false; }, viewport);
  viewport.on(Node.EventType.TOUCH_CANCEL, () => { dragging = false; }, viewport);

  refresh();
  return root;
}
