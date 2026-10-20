/**
 * 模态屏 —— 逐项实现 `docs/ui/ui-spec-approved.md` v1.1
 *   05 升级3选1 / 08 二次确认 / 09 Build抽屉 / 10 波间商店
 * 统一样式：遮罩 `rgba(4,6,12,.72)` + 3px 纯黑描边 + 硬投影。
 */
import { Node, Label, Color, Graphics, UITransform, UIOpacity, Sprite, view } from 'cc';
import { panel, text, title, button, onTap, mkNode, mask, screen, chip, slot, paintPanel, setOutline } from './UIKit';
import { COL, FS, R, BORDER } from './Tokens';
import { iconFrame, loadIcon } from '../engine/Assets';

/** 规格坐标 → 节点坐标 */
function at(vw: number, vh: number, x: number, y: number) {
  return { x: x - vw / 2, y: vh / 2 - y };
}

// ---------- 卡片（升级 3 选 1 用）----------
export interface CardData {
  kind: string; title: string; sub: string; desc: string;
  color?: Color;
  /** 技能图标名（有就画图标） */
  icon?: string;
  /** 没有图标时显示的字符 */
  glyph?: string;
  /** 彩色图标文件名（来自 IconMap） */
  art?: string;
}

const KIND_COLOR: Record<string, Color> = {
  skill: COL.accent, skillup: COL.mint, module: COL.mint, item: COL.purple, attr: COL.dim,
};
const KIND_LABEL: Record<string, string> = {
  skill: '新技能', skillup: '技能强化', module: '行为模块', item: '道具', attr: '属性',
};

/** 5. 升级 3 选 1 —— 规格 §2.5：三张卡结构完全一致（标签/图标/名称/介绍） */
export function buildLevelUp(parent: Node, lv: number, cards: CardData[],
                             onPick: (i: number) => void, onSkip: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const root = mkNode(parent, 'scr-levelup', VW, VH);
  mask(root, VW, VH);

  const t = A(180, 96 + 16);
  title(root, t.y, '升级！ Lv.' + lv);
  const s = A(180, 134 + 8);
  text(root, s.x, s.y, '选一个带走', { size: 12, color: COL.dim, width: 340 });

  const CW = 104, CHh = 252, GAP = 12;
  cards.slice(0, 3).forEach((c, i) => {
    const cx = 12 + CW / 2 + i * (CW + GAP);
    const p = A(cx, 166 + CHh / 2);
    const col = c.color ?? KIND_COLOR[c.kind] ?? COL.dim;
    const n = panel(root, p.x, p.y, CW, CHh, { bg: COL.bg2, line: col, radius: R.m });

    // ── 卡片内部：从上到下留出**明确间隔**（用户反馈：图标和文字贴在一起、介绍被遮挡）──
    //   [标签] 10 [图标 44] 12 [名称] 10 [介绍(多行，给足高度)]
    const PAD = 10;
    const chipCy = CHh / 2 - PAD - 10;
    const iconCy = chipCy - 10 - 10 - 22;
    const nameCy = iconCy - 22 - 12 - 11;
    const descTop = nameCy - 11 - 10;
    const descH = Math.max(46, descTop + CHh / 2 - PAD);
    chip(n, 0, chipCy, KIND_LABEL[c.kind] ?? c.kind, { color: col, size: 10 });

    const artName = c.icon ?? c.art;      // 技能用技能图集图标；模块/道具/属性用 IconMap 的彩色图
    if (artName) {
      const inode = mkNode(n, 'cardIcon', 44, 44, 0, iconCy);
      const isp = inode.addComponent(Sprite);
      isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
      const f = iconFrame(artName);
      if (f) isp.spriteFrame = f;
      else void loadIcon(artName).then(() => { const g = iconFrame(artName); if (g && isp.isValid) isp.spriteFrame = g; });
    } else {
      slot(n, 0, iconCy, 44, { color: COL.line2 });
      text(n, 0, iconCy, c.glyph ?? '?', { size: 24, color: COL.cream, width: 44, outline: false });
    }

    text(n, 0, nameCy, c.title, { size: 16, color: COL.cream, width: CW - 8, bold: true, outline: true });
    // ⚠️ 介绍会换行 —— **必须给足节点高度**（h），否则第二行被裁掉（用户截图就是这么被遮挡的）
    text(n, -CW / 2 + 8, descTop - descH / 2, c.desc,
      { size: FS.xs, color: COL.dim, align: 'left', width: CW - 16, h: descH });

    onTap(n, () => onPick(i));
  });

  const sk = A(180, VH - 44 - 24.5);
  const btn = button(root, sk.x, sk.y, 240, 49, '跳过（+8 金币）', { size: 15 });
  onTap(btn.node, onSkip);
  return root;
}

// ---------- 二次确认 ----------
/** 8. 二次确认 —— 规格 §2.6 */
export function buildConfirm(parent: Node, t: string, body: string, okText: string,
                             onCancel: () => void, onOk: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const root = mkNode(parent, 'scr-confirm', VW, VH);
  mask(root, VW, VH);

  const W = 304, H = 190;
  const p = A(180, 230 + H / 2);
  const box = panel(root, p.x, p.y, W, H, { bg: COL.bg2, line: COL.line, radius: R.m });
  text(box, 0, H / 2 - 30, t, { size: 19, color: COL.cream, width: W - 30, bold: true, outline: true });
  text(box, 0, 4, body, { size: 12, color: COL.dim, width: W - 40 });
  const b1 = button(box, -76, -H / 2 + 34, 132, 48, '取消', { size: 16 });
  onTap(b1.node, onCancel);
  const b2 = button(box, 76, -H / 2 + 34, 132, 48, okText, { danger: true, size: 16 });
  onTap(b2.node, onOk);
  return root;
}

/** 按字数粗截断（中文 1 字 ≈ 1 字号宽）。用于**单行**标签，避免换行后被裁 */
function fit(s: string, maxChars: number): string {
  if (!s) return s;
  return s.length <= maxChars ? s : s.slice(0, maxChars - 1) + '…';
}

// ---------- 波间商店 ----------
export interface ShopSlotView {
  title: string; sub: string; price: number; sold: boolean; locked: boolean; kind: string;
  /** 彩色图标文件名（道具/模块来自 IconMap） */
  icon?: string;
}

const KIND_ICON: Record<string, string> = { item: '🛡', module: '⛓', heal: '＋', attr: '★' };

/** 10. 波间商店 —— 规格 §2.8：竖向 4 行，买完置灰不消失 */
export function buildShop(parent: Node, wave: number, gold: number, slots: ShopSlotView[],
                          onBuy: (i: number) => void, onLock: (i: number) => void,
                          onReroll: () => void, rerollCost: number, onNext: () => void,
                          tip?: string, nextLabel?: string): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const root = screen(parent, 'scr-shop', COL.bg1);

  const t = A(180, 12 + 16);
  title(root, t.y, '商店');
  // 金币行
  // 标题 26px 的节点高约 43（中心 y=28 → 占 6.5~49.5），原来金币放在 y=46 会与之重叠 → 下移到 62
  const g = A(180, 62);
  const coin = mkNode(root, 'coin', 17, 17, g.x - 22, g.y);
  const cg = coin.addComponent(Graphics);
  cg.fillColor = new Color(240, 196, 84);
  cg.circle(0, 0, 7); cg.fill();
  cg.lineWidth = BORDER; cg.strokeColor = COL.line; cg.circle(0, 0, 7); cg.stroke();
  text(root, g.x - 8, g.y + 1, String(gold), { size: 15, color: COL.cream, align: 'left', width: 120, bold: true, outline: true });

  // 4 行货位：x12 w336 h52 间距 7
  const ROW_W = 336, ROW_H = 52, GAP = 7, TOP = 80;
  slots.slice(0, 4).forEach((s, i) => {
    const cy = TOP + ROW_H / 2 + i * (ROW_H + GAP);
    const c = A(180, cy);
    const kindCol: Color = s.kind === 'item' ? COL.red
      : s.kind === 'module' ? COL.mint : s.kind === 'heal' ? COL.mint : COL.dim;
    const row = panel(root, c.x, c.y, ROW_W, ROW_H, {
      bg: s.sold ? COL.bg0 : COL.bg2, line: s.sold ? COL.line2 : kindCol, radius: R.m, shadow: false,
    });
    if (s.sold) row.addComponent(UIOpacity).opacity = 115;   // 规格：整行 opacity .45

    // 行内宽度重新分配，给文字留出最多空间（原来只给 132，描述常常装不下）：
    //   行 336 = 边距8 + 图标36 + 间距8 + 文字168 + 间距8 + 价格56 + 间距8 + 锁30 + 边距8
    const iconCx = -168 + 8 + 18;          // -142
    const textX = -168 + 8 + 36 + 8;       // -116（左边界）
    const chipCx = 168 - 8 - 30 - 8 - 28;  // 94
    const lockCx = 168 - 8 - 15;           // 145
    const iconBox = slot(row, iconCx, 0, 36, { empty: s.sold, color: COL.line });
    if (s.icon) {
      // 彩色图标（原来只有 emoji 字形，用户反馈"黑白色的不好看"）
      const inode = mkNode(iconBox, 'icon', 28, 28);
      const isp = inode.addComponent(Sprite);
      isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
      const f = iconFrame(s.icon);
      if (f) isp.spriteFrame = f;
      else void loadIcon(s.icon).then(() => { const g = iconFrame(s.icon!); if (g && isp.isValid) isp.spriteFrame = g; });
    } else {
      text(iconBox, 0, 1, KIND_ICON[s.kind] ?? '◆', { size: 18, color: s.sold ? COL.dash : COL.cream, width: 34, outline: false });
    }

    // 名称 / 描述
    // ⚠️ 描述必须**限宽 + 截断**：text() 是"单行高"节点，开了自动换行的话
    //    第二行会被裁掉，看起来就是"文字被截断"（用户反馈）。宽度已尽量给足。
    text(row, textX, 9, fit(s.title, 12), { size: 14, color: s.sold ? COL.dim2 : COL.cream, align: 'left', width: 168, bold: true, outline: true });
    text(row, textX, -9, fit(s.sub, 15), { size: FS.xs, color: COL.dim, align: 'left', width: 168 });

    // 价格 chip / 已购
    const chipColor = s.sold ? COL.dim2 : (gold >= s.price ? COL.accent : COL.red);
    chip(row, chipCx, 0, s.sold ? '已购' : '◆ ' + s.price, { color: chipColor, size: 11 });

    // 锁按钮 30x30
    if (!s.sold) {
      const lk = panel(row, lockCx, 0, 30, 30, { bg: s.locked ? COL.accent : COL.bg3, line: COL.line, radius: R.s, shadow: false });
      const inkC = s.locked ? COL.ink : COL.dim;
      // ⚠️ 同上：图标必须画在子节点，不能和 panel 共用节点（会变成两个 Graphics）
      const lkIcon = mkNode(lk, 'lockIcon', 30, 30);
      const lg = lkIcon.addComponent(Graphics);
      lg.lineWidth = 2; lg.strokeColor = inkC;
      lg.roundRect(-6, -1, 12, 10, 2); lg.stroke();
      lg.roundRect(-4, 6, 8, 7, 3); lg.stroke();
      onTap(lk, () => onLock(i));
      onTap(row, () => onBuy(i));
    } else {
      const st = text(row, 96, 0, '已购买', { size: FS.xs, color: COL.red, width: 80, bold: true, outline: true });
      st.node.angle = 12;
    }
  });

  if (tip) {
    const tp = A(180, TOP + 4 * (ROW_H + GAP) + 12);
    text(root, tp.x, tp.y, tip, { size: FS.xs, color: COL.dim, width: 336 });
  }

  // 底部：刷新(112) + 下一波(216)
  const by = -VH / 2 + 16;
  const rf = button(root, A(12 + 56, 0).x, by + 24.5, 112, 49, '刷新 ◆' + rerollCost, { size: 14 });
  onTap(rf.node, onReroll);
  const nx = button(root, A(132 + 108, 0).x, by + 26, 216, 52, nextLabel || '下一波', { primary: true, size: 17 });
  onTap(nx.node, onNext);
  return root;
}

// ---------- 暂停 / Build 面板（底部抽屉 + 4 页签）----------
export interface BuildPageData { tab: string; lines: string[]; }

/** 9. Build 面板 —— 规格 §2.7：底部抽屉 470 高，上圆角，贴屏幕底 */
export function buildBuildDrawer(parent: Node, pages: BuildPageData[],
                                 onMenu: () => void, onResume: () => void,
                                 onInstall?: () => void, bagCount = 0): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const root = mkNode(parent, 'scr-build', VW, VH);
  mask(root, VW, VH);

  // 抽屉：高 470，**贴屏幕底**（规格 §2.7）
  // ⚠️ 必须按底部锚定：写死顶边 y=170 的话，在 760 高的屏上抽屉只到 664，离底留 96px 缝。
  //    多加 24px 画到屏幕外，让下圆角看不见（规格：贴底无边）。
  const DH = 470;
  const c = A(180, VH - DH / 2 + 12);
  const drawer = panel(root, c.x, c.y, VW, DH + 24, { bg: COL.bg2, line: COL.line, radius: R.m });
  const dcTop = c.y + (DH + 24) / 2;      // 抽屉内容顶边（节点坐标）

  // 头部
  text(drawer, 0, dcTop - 24, '构建面板', { size: 19, color: COL.cream, width: 340, bold: true, outline: true });
  text(drawer, 0, dcTop - 48, '第 ' + 0 + ' 波 · 已暂停', { size: FS.xs, color: COL.dim, width: 340 });

  // 4 个页签
  let cur = 0;
  const tabNodes: { n: Node; label: Label; i: number }[] = [];
  const TW = 74, TGAP = 8;
  const tabsW = 4 * TW + 3 * TGAP;
  const tabY = dcTop - 48 - 16 - 16;
  pages.slice(0, 4).forEach((pg, i) => {
    const x = -tabsW / 2 + TW / 2 + i * (TW + TGAP);
    const n = panel(drawer, x, tabY, TW, 30, { bg: COL.bg3, line: COL.line, radius: R.s, shadow: false });
    const l = text(n, 0, 1, pg.tab, { size: 12, color: COL.cream, width: TW - 8, bold: true, outline: true });
    tabNodes.push({ n, label: l, i });
    onTap(n, () => { cur = i; refresh(); });
  });

  // 正文：逐行 Label（⚠️ 必须逐行建 —— 一整块带 \n 的 Label 行距不可控，曾导致"内容错位"）
  // ⚠️ 正文可用高度实测只有约 138px（抽屉标题/页签之下，到"主菜单/装模块/继续"按钮之上）。
  //    原来 22px 行高只够 6 行，第 7 行起会被底部按钮压住（用户反馈"属性页最后一行被遮挡"）。
  //    改成 17px 行高、8 行 -> 8×17 = 136px，正好放下。
  const LINE_H = 17, MAX_LINES = 8;
  const bodyY = tabY - 15 - 14;
  const bodyLines: Label[] = [];
  for (let i = 0; i < MAX_LINES; i++) {
    const l = text(drawer, -VW / 2 + 16, bodyY - i * LINE_H, '', { size: FS.s, color: COL.cream, align: 'left', width: VW - 32 });
    l.node.active = false;
    bodyLines.push(l);
  }

  function refresh() {
    tabNodes.forEach(t => {
      const on = t.i === cur;
      paintPanel(t.n, TW, 30, { bg: on ? COL.accent : COL.bg3, line: COL.line, radius: R.s, shadow: false });
      t.label.color = on ? COL.ink : COL.cream;
      setOutline(t.label, !on);          // 选中时底变橙、字变深 -> 去掉黑描边，否则糊成一团
    });
    const lines = pages[cur]?.lines ?? [];
    bodyLines.forEach((l, i) => {
      const has = i < lines.length && i < MAX_LINES;
      l.node.active = has;
      if (has) l.string = lines[i];
    });
    if (lines.length > MAX_LINES) {
      bodyLines[MAX_LINES - 1].node.active = true;
      bodyLines[MAX_LINES - 1].string = '… 还有 ' + (lines.length - MAX_LINES + 1) + ' 行';
    }
  }

  // ── 底部按钮 ─────────────────────────────────────────────
  // ⚠️ 三按钮时必须**重新分配 x**：原来「主菜单」和「装模块」都从 x12 起，
  //    一个占 12~124、一个占 12~100，直接叠在一起（用户反馈"底部三个按钮重叠"）。
  //    左右边距 12，按钮间距 8，可用宽 336：
  //      两个按钮：96 + 8 + 232 = 336
  //      三个按钮：96 + 8 + 96 + 8 + 128 = 336
  const by = -VH / 2 + 16;
  const m = button(root, A(12 + 48, 0).x, by + 24.5, 96, 49, '主菜单', { size: 14 });
  onTap(m.node, onMenu);
  if (onInstall) {
    const ins = button(root, A(116 + 48, 0).x, by + 24.5, 96, 49,
      bagCount ? '装模块 ' + bagCount : '装模块', { size: 14 });
    onTap(ins.node, onInstall);
    const cont = button(root, A(220 + 64, 0).x, by + 26, 128, 52, '继续', { primary: true, size: 17 });
    onTap(cont.node, onResume);
  } else {
    const cont = button(root, A(116 + 116, 0).x, by + 26, 232, 52, '继续', { primary: true, size: 17 });
    onTap(cont.node, onResume);
  }
  refresh();
  return root;
}
