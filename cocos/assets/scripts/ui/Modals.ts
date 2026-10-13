/**
 * 模态屏 —— 规格 §2：
 *   5 升级3选1 `scr-levelup` / 7 技能替换 `scr-replace` / 8 二次确认 `scr-confirm`
 *   9 Build面板 `scr-build` / 10 波间商店 `scr-shop` / 6 模块安装 `scr-install`
 *
 * 统一样式：遮罩 `rgba(5,8,15,.74)` + 面板 2px 硬描边 + `0 3px 0` 硬投影。
 */
import { Node, Label, Color, Graphics, UITransform } from 'cc';
import { panel, text, button, onTap, mkNode, mask, screen } from './UIKit';
import { COL, FS, R, SP, SAFE_TOP } from './Tokens';

// ---------- 卡片（升级 3 选 1 用）----------
export interface CardData { kind: string; title: string; sub: string; desc: string; color?: Color; }

const KIND_COLOR: Record<string, Color> = {
  skill: COL.accent, skillup: COL.mint, module: COL.mint, item: COL.purple, attr: COL.cream,
};
const KIND_LABEL: Record<string, string> = {
  skill: '新技能', skillup: '技能强化', module: '行为模块', item: '道具', attr: '属性',
};

/** 5. 升级 3 选 1：遮罩 + 横向 3 卡 + [跳过] */
export function buildLevelUp(parent: Node, lv: number, cards: CardData[], onPick: (i: number) => void, onSkip: () => void): Node {
  const root = mkNode(parent, 'scr-levelup', 360, 640);
  mask(root, 360, 640);
  text(root, 0, 232, '升级！  Lv.' + lv, { size: FS.l, color: COL.accent, bold: true, width: 320 });
  text(root, 0, 206, '选一个带走', { size: FS.xs, color: COL.cream, width: 320 });

  // 横向 3 卡（规格原文），每张 96 宽，间距 12
  const CW = 96, CHe = 200, GAP = 12;
  const total = 3 * CW + 2 * GAP;
  cards.slice(0, 3).forEach((c, i) => {
    const x = -total / 2 + CW / 2 + i * (CW + GAP);
    const col = c.color ?? KIND_COLOR[c.kind] ?? COL.cream;
    const n = panel(root, x, 40, CW, CHe, { bg: COL.bg2, line: col, radius: R.m });
    text(n, 0, CHe / 2 - 20, KIND_LABEL[c.kind] ?? c.kind, { size: FS.xs, color: col, width: CW - 10 });
    text(n, 0, CHe / 2 - 44, c.title, { size: FS.m, color: COL.cream, bold: true, width: CW - 10 });
    text(n, 0, CHe / 2 - 74, c.sub, { size: FS.xs, color: COL.mint, width: CW - 10 });
    text(n, 0, -30, c.desc, { size: FS.xs, color: COL.line2, width: CW - 14 });
    onTap(n, () => onPick(i));
  });

  const sk = button(root, 0, -180, 180, 48, '跳过', { size: FS.m });
  onTap(sk.node, onSkip);
  return root;
}

// ---------- 波间商店 ----------
export interface ShopSlotView { title: string; sub: string; price: number; sold: boolean; locked: boolean; kind: string; }

/** 10. 波间商店：标题 + 金币 + 4 个固定货位 + [刷新][下一波] */
export function buildShop(parent: Node, wave: number, gold: number, slots: ShopSlotView[],
                          onBuy: (i: number) => void, onLock: (i: number) => void,
                          onReroll: () => void, rerollCost: number, onNext: () => void): Node {
  const root = screen(parent, 'scr-shop', COL.bg0);
  text(root, 0, 288, '波间商店', { size: FS.l, color: COL.accent, bold: true, width: 320 });
  text(root, 0, 258, `第 ${wave} 波结束`, { size: FS.xs, color: COL.line2, width: 320 });
  text(root, 0, 228, '◎ ' + gold, { size: FS.m, color: COL.accent, bold: true, width: 320 });

  // 4 个固定货位，2x2
  const CW = 150, CH = 110, GX = 160, GY = 122;
  slots.slice(0, 4).forEach((s, i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const x = (col - 0.5) * GX, y = 90 - row * GY;
    const col2 = KIND_COLOR[s.kind] ?? COL.cream;
    const n = panel(root, x, y, CW, CH, { bg: s.sold ? COL.bg1 : COL.bg2, line: s.sold ? COL.line : col2, radius: R.m });
    text(n, -CW / 2 + 10, 30, s.title, { size: FS.s, color: s.sold ? COL.line2 : COL.cream, align: 'left', width: CW - 46 });
    text(n, -CW / 2 + 10, 6, s.sub, { size: FS.xs, color: COL.line2, align: 'left', width: CW - 20 });
    if (!s.sold) {
      text(n, -CW / 2 + 10, -34, '◎ ' + s.price, { size: FS.s, color: gold >= s.price ? COL.accent : COL.red, align: 'left', width: 80 });
    } else {
      text(n, 0, -34, '已购买', { size: FS.xs, color: COL.line2, width: CW - 20 });
    }
    // 锁定小按钮（右上角）
    if (!s.sold) {
      const lk = mkNode(n, 'lock', 26, 26, CW / 2 - 16, CH / 2 - 16);
      const lg = lk.addComponent(Graphics);
      lg.lineWidth = 2;
      lg.strokeColor = s.locked ? COL.accent : COL.line2;
      lg.roundRect(-9, -8, 18, 14, 3); lg.stroke();
      if (s.locked) { lg.fillColor = COL.accent; lg.roundRect(-7, -6, 14, 10, 2); lg.fill(); }
      onTap(lk, () => onLock(i));
    }
    if (!s.sold) onTap(n, () => onBuy(i));
  });

  const rf = button(root, -76, -200, 140, 48, `刷新 ◎${rerollCost}`, { size: FS.s });
  onTap(rf.node, onReroll);
  const nx = button(root, 82, -200, 150, 50, '下一波', { primary: true, size: FS.m });
  onTap(nx.node, onNext);
  return root;
}

// ---------- 二次确认 ----------
/** 8. 二次确认：遮罩 + 确认框 + [取消][确认] */
export function buildConfirm(parent: Node, title: string, body: string, okText: string, onCancel: () => void, onOk: () => void): Node {
  const root = mkNode(parent, 'scr-confirm', 360, 640);
  mask(root, 360, 640);
  const box = panel(root, 0, 30, 280, 150, { bg: COL.bg2, line: COL.line2, radius: R.l });
  text(box, 0, 42, title, { size: FS.m, color: COL.accent, bold: true, width: 250 });
  text(box, 0, 8, body, { size: FS.s, color: COL.cream, width: 250 });
  const c = button(box, -66, -44, 110, 44, '取消', { size: FS.s });
  onTap(c.node, onCancel);
  const o = button(box, 66, -44, 110, 44, okText, { primary: true, size: FS.s });
  onTap(o.node, onOk);
  return root;
}

// ---------- 暂停 / Build 面板（底部抽屉 + 4 页签）----------
export interface BuildPageData { tab: string; lines: string[]; }

/** 9. Build 面板：遮罩 + 底部抽屉 + 4 页签 + [主菜单][继续] */
export function buildBuildDrawer(parent: Node, pages: BuildPageData[],
                                 onMenu: () => void, onResume: () => void): Node {
  const root = mkNode(parent, 'scr-build', 360, 640);
  mask(root, 360, 640);
  text(root, 0, 250, '暂停', { size: FS.l, color: COL.accent, bold: true, width: 320 });

  const drawer = panel(root, 0, -70, 340, 420, { bg: COL.bg2, line: COL.line2, radius: R.l });
  // 页签
  let cur = 0;
  const tabNodes: { n: Node; i: number }[] = [];
  const body = text(drawer, 0, -140, '', { size: FS.s, color: COL.cream, align: 'left', width: 300 });
  const TW = 76, TX = 4;
  const refresh = () => {
    const p = pages[cur];
    body.string = p ? p.lines.join('\n') : '';
    for (const t of tabNodes) paintTab(t.n, t.i === cur);
  };
  pages.slice(0, 4).forEach((p, i) => {
    const x = -1.5 * (TW + TX) + i * (TW + TX);
    const n = panel(drawer, x, 170, TW, 40, { bg: COL.bg3, line: COL.line, radius: R.s });
    text(n, 0, 0, p.tab, { size: FS.xs, color: COL.cream, width: TW - 6 });
    tabNodes.push({ n, i });
    onTap(n, () => { cur = i; refresh(); });
  });
  refresh();

  const m = button(root, -84, -300, 140, 48, '主菜单', { size: FS.s });
  onTap(m.node, onMenu);
  const r = button(root, 84, -300, 140, 48, '继续', { primary: true, size: FS.s });
  onTap(r.node, onResume);
  return root;
}

function paintTab(n: Node, on: boolean) {
  const g = n.getComponent(Graphics);
  const ut = n.getComponent(UITransform);
  if (!g || !ut) return;
  const w = ut.contentSize.width, h = ut.contentSize.height;
  g.clear();
  g.fillColor = on ? COL.accent : COL.bg3; g.roundRect(-w / 2, -h / 2, w, h, R.s); g.fill();
  g.lineWidth = 2; g.strokeColor = on ? COL.accentD : COL.line; g.roundRect(-w / 2, -h / 2, w, h, R.s); g.stroke();
}
