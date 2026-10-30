/**
 * 模态屏 —— 逐项实现 `docs/ui/ui-spec-approved.md` v1.1
 *   05 升级3选1 / 08 二次确认 / 09 Build抽屉 / 10 波间商店
 * 统一样式：遮罩 `rgba(4,6,12,.72)` + 3px 纯黑描边 + 硬投影。
 */
import { Node, Label, Color, Graphics, UITransform, UIOpacity, Sprite, view, EventTouch, Mask } from 'cc';
import { panel, text, title, button, onTap, mkNode, mask, screen, chip, slot, paintPanel, setOutline, screenHeader } from './UIKit';
import { COL, FS, R, BORDER } from './Tokens';
import { iconFrame, loadIcon } from '../engine/Assets';
import { Sfx } from '../engine/Audio';
import { makeScroll } from './ScrollView';
import { safeTop, safeBottom } from './Safe';
import type { UiArtName } from './Art';

/** 规格坐标 → 节点坐标 */
function at(vw: number, vh: number, x: number, y: number) {
  return { x: x - vw / 2, y: vh / 2 - y };
}

// ---------- 卡片（升级 3 选 1 用）----------
export interface CardData {
  kind: string; title: string; sub: string; desc: string;
  /** 具体数值（M56：如「攻击力 +8%」「伤害 17 → 21」），奶油色，卡片第二行 */
  nums?: string;
  /** 叠加/限制状态（如「已持有 ×2 / 上限 4」「已叠加 ×3」），卡片底部小字 */
  meta?: string;
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
  skill: '新技能', skillup: '技能强化', module: '黑科技', item: '道具', attr: '属性',
};

/** 5. 升级 3 选 1 —— 竖屏下改成**三张等宽卡片纵向排列**（横排会让每张只剩 100px，读不清） */
export function buildLevelUp(parent: Node, lv: number, cards: CardData[],
                             onPick: (i: number) => void, onSkip: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = mkNode(parent, 'scr-levelup', VW, VH);
  mask(root, VW, VH);

  // 卡片尺寸先定，面板"裹住内容"——大屏上不会在标题与卡片之间空一大片
  const HDR = 64, FTR = 58, GAP = 10, CW = 310;
  const areaMax = (VH - B - 16) - (S + 20) - HDR - FTR;
  const CH = Math.max(92, Math.min(132, (areaMax - GAP * 2) / 3));
  const PH = HDR + FTR + CH * 3 + GAP * 2;
  const top = Math.max(S + 10, (VH - PH) / 2);
  const pc = A(180, top + PH / 2);
  const box = panel(root, pc.x, pc.y, 340, PH, { art: 'panel' });

  // ── 标题区 ──
  text(box, 0, PH / 2 - 30, '升级！  Lv.' + lv,
    { size: 24, color: COL.cream, width: 300, bold: true, outline: true, shadow: true });
  text(box, 0, PH / 2 - 54, '选一个带走', { size: 11, color: COL.dim, width: 300 });

  // ── 卡片区：三张等宽等高的卡，自上而下贴满 ──
  const n = Math.min(3, cards.length);
  const startTop = PH / 2 - HDR - (n < 3 ? (3 - n) * (CH + GAP) / 2 : 0);

  // 类别 → 描边色（同时给左侧 6px 类别色条 + 文字标签，不只靠颜色区分）
  const KIND_ART: Record<string, UiArtName> = {
    skill: 'card_gold', skillup: 'rim_green', module: 'rim_cyan', item: 'rim_purple', attr: 'rim_blue',
  };

  cards.slice(0, 3).forEach((c, i) => {
    const col = c.color ?? KIND_COLOR[c.kind] ?? COL.dim;
    const cardTop = startTop - i * (CH + GAP);
    const cy = cardTop - CH / 2;
    const card = panel(box, 0, cy, CW, CH, { art: KIND_ART[c.kind] ?? 'panel' });

    // 类别色条（左侧 6px）——色弱也能靠"这条"和标签文字分辨
    const bar = mkNode(card, 'kindBar', 6, CH - 20, -CW / 2 + 9, 0);
    const bg = bar.addComponent(Graphics);
    bg.fillColor = col; bg.rect(-3, -(CH - 20) / 2, 6, CH - 20); bg.fill();

    // 图标（44~48，按卡高自适应）
    const iconS = CH >= 110 ? 48 : 42;
    const artName = c.icon ?? c.art;
    if (artName) {
      const inode = mkNode(card, 'cardIcon', iconS, iconS, -CW / 2 + 26 + iconS / 2, 4);
      const isp = inode.addComponent(Sprite);
      isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
      const f = iconFrame(artName);
      if (f) isp.spriteFrame = f;
      else void loadIcon(artName).then(() => { const g = iconFrame(artName); if (g && isp.isValid) isp.spriteFrame = g; });
    } else {
      slot(card, -CW / 2 + 26 + iconS / 2, 4, iconS, { color: COL.line2 });
      text(card, -CW / 2 + 26 + iconS / 2, 4, c.glyph ?? '?', { size: 22, color: COL.cream, width: iconS, outline: false });
    }

    const txtX = -CW / 2 + 26 + iconS + 10;        // 文字列左边界
    const txtW = CW - (txtX + CW / 2) - 10;

    // 名称
    text(card, txtX, CH / 2 - 26, c.title,
      { size: 16, color: COL.cream, align: 'left', width: txtW, bold: true, outline: true });
    // 类别标签（chip 靠右）
    const label = KIND_LABEL[c.kind] ?? c.kind;
    const chipW = Math.max(34, label.length * 11 + 12);
    chip(card, CW / 2 - 8 - chipW / 2, CH / 2 - 27, label, { color: col, size: 10 });

    // 一句话数值（用户 2026-10-30：卡片只保留这一行，长说明去暂停面板看）
    const hasDesc = !!c.desc && c.desc.trim().length > 0;
    const numsY = hasDesc ? CH / 2 - 56 : -2;
    if (c.nums) {
      const nLines = Math.max(1, Math.ceil(c.nums.length / charsPerLine(txtW, 14)));
      const h = nLines * 19;
      text(card, txtX, numsY, clampLines(c.nums, txtW, 14, 2),
        { size: 14, color: COL.cream, align: 'left', width: txtW, h, bold: true, outline: true });
    }
    if (hasDesc) {
      text(card, txtX, CH / 2 - 82, clampLines(c.desc, txtW, 11, 1),
        { size: 11, color: COL.dim, align: 'left', width: txtW, h: 18 });
    }

    // 叠加 / 上限状态：紧贴数值行下方（之前贴在卡片底部，中间留一大块空白）
    if (c.meta) {
      const metaY = hasDesc ? CH / 2 - 108 : numsY - 30;
      text(card, txtX, metaY, c.meta, { size: 10, color: COL.dim, align: 'left', width: txtW, h: 16 });
    }

    // 按下反馈：整卡压暗一档 + 点击
    const sp = card.getComponent(Sprite);
    card.on(Node.EventType.TOUCH_START, () => { if (sp) sp.color = new Color(205, 205, 215, 255); }, card);
    const restore = () => { if (sp && sp.isValid) sp.color = new Color(255, 255, 255, 255); };
    card.on(Node.EventType.TOUCH_END, restore, card);
    card.on(Node.EventType.TOUCH_CANCEL, restore, card);
    onTap(card, () => onPick(i));
  });

  // 底部：跳过（真实逻辑：+8 金币）
  const sk = button(box, 0, -PH / 2 + 30, 300, 44, '跳过（+8 金币）', { size: 15 });
  onTap(sk.node, onSkip);
  return root;
}


/** 估算一行能放多少字符（中文按 1 个 size 宽，英文/数字按 0.55 个） */
function charsPerLine(width: number, size: number): number {
  return Math.max(4, Math.floor(width / (size * 0.92)));
}
/** 把文本截断到最多 maxLines 行，超出补省略号 */
function clampLines(str: string, width: number, size: number, maxLines: number): string {
  const per = charsPerLine(width, size);
  const max = per * Math.max(1, maxLines);
  if (str.length <= max) return str;
  return str.slice(0, Math.max(1, max - 1)) + '…';
}

// ---------- 二次确认 ----------
/** 8. 二次确认 —— 规格 §2.6 */
export function buildConfirm(parent: Node, t: string, body: string, okText: string,
                             onCancel: () => void, onOk: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const root = mkNode(parent, 'scr-confirm', VW, VH);
  mask(root, VW, VH);

  const W = 312, H = 196;
  const c = A(180, VH / 2);                 // 垂直居中（旧版按 230 硬编码，长屏偏低）
  const box = panel(root, c.x, c.y, W, H, { art: 'panel' });
  text(box, 0, H / 2 - 32, t, { size: 19, color: COL.cream, width: W - 30, bold: true, outline: true, shadow: true });
  // body 可能是两行（如"用A替换B？B会退回背包"），必须给足高度，否则第二行被按钮压住
  text(box, 0, 6, body, { size: 12, color: COL.dim, width: W - 40, h: 64 });
  const b1 = button(box, -78, -H / 2 + 38, 136, 48, '取消', { size: 16 });
  onTap(b1.node, onCancel);
  const b2 = button(box, 78, -H / 2 + 38, 136, 48, okText, { danger: true, size: 16 });
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
  /** 稀有度：1 普通 / 2 高级（M52：不再"全是红框"） */
  rarity?: number;
  /** 已经持有几件（M52：堆叠展示） */
  owned?: number;
}

/** 稀有度 / 类型 → 边框色（M52）。红只留给"危险/负向"，不再当通用描边。 */
const RARITY_COL = {
  common: new Color(126, 140, 168),      // 普通道具：灰蓝
  rare: new Color(160, 107, 255),        // 高级道具：紫
  module: new Color(74, 210, 176),       // 黑科技：青
  heal: new Color(111, 216, 106),        // 回复：绿
  attr: new Color(90, 169, 255),         // 属性：蓝
};

const KIND_ICON: Record<string, string> = { item: '🛡', module: '⛓', heal: '＋', attr: '★' };

/** 金币图标（14px）：价格 chip / 刷新按钮都用它，替代之前的"◆"棱形字符 */
function coinGlyph(parent: Node, x: number, y: number, size = 13): Node {
  const n = mkNode(parent, 'coin', size, size, x, y);
  const sp = n.addComponent(Sprite);
  sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.trim = false;
  const f = iconFrame('ui-gold.png');
  if (f) sp.spriteFrame = f;
  else void loadIcon('ui-gold.png').then(() => { const g = iconFrame('ui-gold.png'); if (g && sp.isValid) sp.spriteFrame = g; });
  return n;
}

/** 价格 chip：金币图标 + 数字（不再用 "◆ 20" 这种字符占位） */
function priceChip(parent: Node, x: number, y: number, price: number, color: Color): Node {
  const w = Math.max(52, String(price).length * 9 + 40);
  const c = panel(parent, x, y, w, 24, { bg: COL.bg3, line: color, radius: 3, shadow: false });
  coinGlyph(c, -w / 2 + 12, 0, 13);
  text(c, 10, 1, String(price), { size: 12, color, width: w - 30, align: 'center', bold: true, outline: false });
  return c;
}

/** 10. 波间商店 —— 规格 §2.8：竖向 4 行，买完置灰不消失 */
export function buildShop(parent: Node, wave: number, gold: number, slots: ShopSlotView[],
                          onBuy: (i: number) => void, onLock: (i: number) => void,
                          onReroll: () => void, rerollCost: number, onNext: () => void,
                          tip?: string, nextLabel?: string,
                          owned: { name: string; icon?: string; count?: number }[] = []): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-shop', COL.bg1);

  // ── 标题条（整条像素面板）+ **左侧金币**（右侧会被微信胶囊/内容压住，用户 2026-10-30）──
  const header = screenHeader(root, VW, S, '商店');
  const hw = VW / 2;
  const coin = mkNode(header, 'coin', 17, 17, -hw + 24, 0);
  const csp = coin.addComponent(Sprite);
  csp.sizeMode = Sprite.SizeMode.CUSTOM; csp.trim = false;
  const cfi = iconFrame('ui-gold.png');
  if (cfi) csp.spriteFrame = cfi;
  else void loadIcon('ui-gold.png').then(() => {
    const f2 = iconFrame('ui-gold.png');
    if (f2 && csp.isValid) csp.spriteFrame = f2;
  });
  text(header, -hw + 38, 1, String(gold), { size: 15, color: COL.cream, align: 'left', width: 96, bold: true, outline: true });

  // ── 已有道具：先算它的位置（贴底），货架的高度再按剩余空间自适应 ──
  const btnY = -VH / 2 + B + 25;
  const CELL = 40, CGAP = 8, COLS = 8, MAXR = 3;
  const shown = owned.slice(0, COLS * MAXR);
  const nRows = Math.max(1, Math.ceil(shown.length / COLS));
  const gridBottom = VH - B - 58 - 18;       // 按钮顶边再往上让 18（一排道具都不许压到按钮）
  const gridTop = gridBottom - (nRows * CELL + (nRows - 1) * CGAP);
  const ownedTitleY = gridTop - 20;

  // ── 货架：4 行卡片。行高按"标题条 → 已有道具区"之间的可用高度自适应 ──
  //    矮屏（640）行高压到 66，长屏（844）拉到 84 —— 不会中间空一大块，也不会挤
  const ROW_W = 336, GAP = 8;
  const rowsTop = S + 54 + 12;
  const bandBottom = ownedTitleY - 26;
  const availH = Math.max(240, bandBottom - rowsTop);
  const ROW_H = Math.max(64, Math.min(84, (availH - GAP * 3) / 4));
  const groupH = 4 * ROW_H + GAP * 3;
  slots.slice(0, 4).forEach((s, i) => {
    const cy = rowsTop + ROW_H / 2 + i * (ROW_H + GAP);
    const c = A(180, cy);
    // 稀有度/类型 → 外框（同一张 Outline 素材换描边色，线宽完全一致）
    const art: UiArtName = s.sold ? 'well'
      : s.kind === 'module' ? 'rim_cyan'
        : s.kind === 'heal' ? 'rim_green'
          : s.kind === 'attr' ? 'rim_blue'
            : (s.rarity === 2 ? 'rim_purple' : 'panel');
    const row = panel(root, c.x, c.y, ROW_W, ROW_H, { art });
    if (s.sold) row.addComponent(UIOpacity).opacity = 150;

    // 图标槽（44），垂直居中
    const iconBox = slot(row, -138, 0, 44, { empty: s.sold });
    if (s.icon) {
      const inode = mkNode(iconBox, 'icon', 32, 32);
      const isp = inode.addComponent(Sprite);
      isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
      const f = iconFrame(s.icon);
      if (f) isp.spriteFrame = f;
      else void loadIcon(s.icon).then(() => { const g = iconFrame(s.icon!); if (g && isp.isValid) isp.spriteFrame = g; });
    } else {
      text(iconBox, 0, 1, KIND_ICON[s.kind] ?? '◆', { size: 18, color: s.sold ? COL.dash : COL.cream, width: 40, outline: false });
    }

    // 名称（左上）+ 说明（两行，占下半）
    const nameY = Math.min(17, ROW_H / 2 - 16);
    text(row, -106, nameY, fit(s.title, 12), {
      size: 14, color: s.sold ? COL.dim2 : COL.cream, align: 'left', width: 168, bold: true, outline: true,
    });
    // ⚠️ 宽度 150 → 168：「扇射」这类 30 字描述在 150 宽会折成 3 行、第三行被裁（用户 2026-10-30 截图）
    text(row, -106, nameY - 27, clampLines(s.sub, 168, 11, 2),
      { size: 11, color: COL.dim, align: 'left', width: 168, h: 36 });
    if (s.owned && s.owned > 0 && !s.sold) {
      chip(row, 64, nameY, '持有×' + s.owned, { color: COL.accent, size: 10 });
    }

    if (s.sold) {
      text(row, 128, 0, '已购买', { size: 12, color: COL.red, align: 'right', width: 70, bold: true, outline: true });
    } else {
      const afford = gold >= s.price;
      priceChip(row, 88, 0, s.price, afford ? COL.accent : COL.red);
      // 锁定：视觉 32，热区 44（微信硬要求）
      const lockArt: UiArtName = s.locked ? 'btn_primary' : 'btn';
      const lk = panel(row, 144, 0, 32, 32, { art: lockArt });
      const inkC = s.locked ? COL.ink : COL.dim;
      const lkIcon = mkNode(lk, 'lockIcon', 32, 32);
      const lg = lkIcon.addComponent(Graphics);
      lg.lineWidth = 2; lg.strokeColor = inkC;
      // ⚠️ 锁体 + 锁梁必须**整体居中**（y 范围 -8..8）：之前画在 -2..14，整个图形偏高 6px
      lg.rect(-6, -8, 12, 10); lg.stroke();     // 锁体
      lg.rect(-4, 2, 8, 6); lg.stroke();        // 锁梁
      // ⚠️ lockHit 是 row 的**子节点**：Cocos 的 TOUCH_END 默认冒泡到父节点，
      //    只写 onTap(hit) 会让"点锁"同时触发整行购买（本轮实测复现）。
      //    这里单独处理并 propagationStopped = true，保证「点锁只锁定、点主体才购买」。
      const hit = mkNode(row, 'lockHit', 44, 44, 144, 0);
      (hit as unknown as { __hit?: boolean }).__hit = true;   // 手工注册的锁也需要进热区审计
      hit.on(Node.EventType.TOUCH_END, (e: EventTouch) => {
        e.propagationStopped = true;
        Sfx.sfx('click', 0.45, 40);
        onLock(i);
      }, hit);
    }
    onTap(row, () => onBuy(i));
  });

  if (tip) {
    text(root, 0, A(180, rowsTop + groupH + 18).y, tip, { size: 10, color: COL.dim, width: 336 });
  }

  // ── 已有道具网格（位置已在上方算好）──
  text(root, A(12, ownedTitleY).x, A(12, ownedTitleY).y, '已有道具 ' + owned.length,
    { size: 13, color: COL.accent, align: 'left', width: 240, bold: true, outline: true });
  if (!owned.length) {
    text(root, A(12, gridTop + 8).x, A(12, gridTop + 8).y, '（还没有道具：精英/BOSS 会掉，商店也能买）',
      { size: 10, color: COL.dim, align: 'left', width: 320 });
  } else {
    shown.forEach((it, i) => {
      const col = i % COLS, rowi = Math.floor(i / COLS);
      const cc = A(12 + CELL / 2 + col * (CELL + CGAP), gridTop + CELL / 2 + rowi * (CELL + CGAP));
      const box = panel(root, cc.x, cc.y, CELL, CELL, { art: 'slot' });
      if (it.count && it.count > 1) {
        text(box, CELL / 2 - 3, -CELL / 2 + 7, '×' + it.count,
          { size: 10, color: COL.accent, align: 'right', width: CELL - 6, bold: true, outline: false });
      }
      if (it.icon) {
        const inode = mkNode(box, 'icon', 28, 28);
        const isp = inode.addComponent(Sprite);
        isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
        const f = iconFrame(it.icon);
        if (f) isp.spriteFrame = f;
        else void loadIcon(it.icon).then(() => {
          const g2 = it.icon ? iconFrame(it.icon) : null;
          if (g2 && isp.isValid) isp.spriteFrame = g2;
        });
      } else {
        text(box, 0, 1, '◆', { size: 14, color: COL.cream, width: CELL, outline: false });
      }
    });
    if (owned.length > COLS * MAXR) {
      text(root, A(12, gridTop - 12).x, A(12, gridTop - 12).y, '… 还有 ' + (owned.length - COLS * MAXR) + ' 件',
        { size: 10, color: COL.dim, align: 'left', width: 320 });
    }
  }

  // 底部：刷新(112) + 下一波(216)
  const rf = button(root, A(12 + 56, 0).x, btnY, 112, 50, '刷新', { size: 14 });
  // 布局：文字靠左、图标居中偏右、数字靠右（之前图标压在"刷新"上）
  const rfLabel = rf.node.getComponentInChildren(Label);
  if (rfLabel) { rfLabel.node.setPosition(-24, 1); (rfLabel.node.getComponent(UITransform))?.setContentSize(64, 20); }
  coinGlyph(rf.node, 12, 1, 14);
  text(rf.node, 30, 1, String(rerollCost), { size: 14, color: COL.cream, width: 34, align: 'left', bold: true, outline: true });
  onTap(rf.node, onReroll);
  const nx = button(root, A(132 + 108, 0).x, btnY, 216, 50, nextLabel || '下一波', { primary: true, size: 17 });
  onTap(nx.node, onNext);
  return root;
}


// ---------- 暂停 / Build 面板（底部抽屉 + 4 页签）----------
/** 黑科技页的结构化数据（图标 / 名称 / 数量 / 效果 / 是否已装） */
export interface ModDetailView { name: string; icon?: string; count: number; desc: string; installed: boolean }
export interface BuildPageData { tab: string; lines: string[]; }

/** 技能页的详情（M33 #4：手风琴，能看到技能描述 + 已装模块描述） */
export interface SkillDetailView {
  name: string;
  lvl: number;
  icon?: string;
  /** 一行摘要：伤害 / 冷却 */
  summary: string;
  /** 技能本身的一句话（形态 + 标签） */
  desc: string;
  mods: { name: string; desc: string }[];
}

/** 道具页的详情（M42：暂停面板里的道具要有详细介绍，可展开） */
export interface ItemDetailView {
  name: string;
  icon?: string;
  /** 这道具干什么（一句话） */
  desc: string;
  /** 具体数值（如「攻击力 +8% · 暴击率 +4%」） */
  nums: string;
  /** 类型 / 来源等补充信息 */
  note: string;
}

/** 属性页的一格：图标 + 名称 + 数值 + 相对基准的差值（正绿 / 负红 / 持平白） */
export interface AttrRow {
  name: string; value: string; delta: number; art?: string;
  /** M65：相对基础的差值文本（如 +4% / -12），有值才显示，单独一列避免和总值混淆 */
  deltaText?: string;
}

/** 9. Build 面板 —— 规格 §2.7：底部抽屉 470 高，上圆角，贴屏幕底 */
export function buildBuildDrawer(parent: Node, pages: BuildPageData[],
                                 onMenu: () => void, onResume: () => void,
                                 onInstall?: () => void, bagCount = 0,
                                 attr?: { index: number; rows: AttrRow[]; more?: { label: string; onTap: () => void } }, wave = 1,
                                 skillDetails?: SkillDetailView[],
                                 itemDetails?: ItemDetailView[],
                                 startTab = 0,
                                 onTab?: (i: number) => void,
                                 modDetails?: ModDetailView[],
                                 onDropSkill?: (si: number) => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const root = mkNode(parent, 'scr-build', VW, VH);
  mask(root, VW, VH);

  // 抽屉：高 470，**贴屏幕底**（规格 §2.7）
  // ⚠️ 必须按底部锚定：写死顶边 y=170 的话，在 760 高的屏上抽屉只到 664，离底留 96px 缝。
  //    多加 24px 画到屏幕外，让下圆角看不见（规格：贴底无边）。
  const S = safeTop(), B = safeBottom();
  const DH = Math.min(470, VH - S - 18);
  const c = A(180, VH - DH / 2 + 12);
  const drawer = panel(root, c.x, c.y, VW, DH + 24, { art: 'panel' });
  // ⚠️ 抽屉里的内容必须用**抽屉内部坐标**。c.y 是父节点（全屏 root）坐标，
  //    混进来会让标题/页签/正文/属性网格整体下移 |c.y| px（760 屏 157px、640 屏 97px）：
  //    属性页 24 项只有前 12 项可读，其余被「主菜单/装模块/继续」压住（2026-10-20 实机验收发现）。
  const dcTop = (DH + 24) / 2;            // 抽屉内容顶边（抽屉内部坐标）

  // 头部
  text(drawer, 0, dcTop - 22, '构建面板', { size: 19, color: COL.cream, width: 340, bold: true, outline: true, shadow: true });
  text(drawer, 0, dcTop - 44, '第 ' + wave + ' 波 · 已暂停', { size: 10, color: COL.dim, width: 340 });

  // 4 个页签：视觉 36，热区 44（贴一条隐形热区，避免"看着够大其实点不中"）
  let cur = Math.max(0, Math.min(3, startTab));
  const tabNodes: { n: Node; label: Label; i: number }[] = [];
  const TW = 78, TGAP = 6;
  const tabsW = 4 * TW + 3 * TGAP;
  const TAB_H = 36;
  const tabY = dcTop - 44 - 12 - TAB_H / 2;
  pages.slice(0, 4).forEach((pg, i) => {
    const x = -tabsW / 2 + TW / 2 + i * (TW + TGAP);
    const n = panel(drawer, x, tabY, TW, TAB_H, { art: 'btn' });
    const l = text(n, 0, 1, pg.tab, { size: 12, color: COL.cream, width: TW - 8, bold: true, outline: true });
    tabNodes.push({ n, label: l, i });
    const hit = mkNode(drawer, 'tabHit', TW, 44, x, tabY);
    onTap(hit, () => { cur = i; onTab?.(i); refresh(); });
    void n;
  });

  // 正文：逐行 Label（⚠️ 必须逐行建 —— 一整块带 \n 的 Label 行距不可控，曾导致"内容错位"）
  // ⚠️ 正文可用高度实测只有约 138px（抽屉标题/页签之下，到"主菜单/装模块/继续"按钮之上）。
  //    原来 22px 行高只够 6 行，第 7 行起会被底部按钮压住（用户反馈"属性页最后一行被遮挡"）。
  //    改成 17px 行高、8 行 -> 8×17 = 136px，正好放下。
  const LINE_H = 17, MAX_LINES = 8;
  const bodyY = tabY - TAB_H / 2 - 22;
  const bodyLines: Label[] = [];
  for (let i = 0; i < MAX_LINES; i++) {
    const l = text(drawer, -VW / 2 + 16, bodyY - i * LINE_H, '', { size: FS.s, color: COL.cream, align: 'left', width: VW - 32 });
    l.node.active = false;
    bodyLines.push(l);
  }

  // ── 属性页专用：2 列 × 12 行**对齐网格**（图标 + 名称 + 数值，正绿 / 负红）──
  //    以前是把 3 个属性拼成一行字符串（"攻击 1.0  移速 0.9  生命 120"）：
  //    列不对齐、字号一样、也看不出哪项比基准高/低 → 用户反馈「属性页面太乱，看不清」。
  const attrIndex = attr ? attr.index : -1;
  const attrRoot = mkNode(drawer, 'attrGrid', VW, 1, 0, 0);
  attrRoot.active = false;
  if (attr) {
    // 用户 2026-10-30：改成**一行一个属性**（名称左、数值右），去掉"绿色=高于基础"图例，支持滚动看全部
    const ROW_H = 30, W = VW - 32;
    const rowsAll = attr.rows;
    const viewTop = bodyY + 6;
    const viewBottom = -VH / 2 + B + 150;
    const viewH = Math.max(80, viewTop - viewBottom);
    const cy = (viewTop + viewBottom) / 2;
    const contentH = Math.max(viewH, rowsAll.length * ROW_H + 10);
    const sc = makeScroll(attrRoot, 0, cy, VW - 8, viewH, contentH);
    const topY = contentH / 2 - ROW_H / 2 - 2;
    rowsAll.forEach((r, i) => {
      const y = topY - i * ROW_H;
      const row = mkNode(sc.content, 'attrRow', W, ROW_H - 4, 0, y);
      if (r.art) {
        const ic = mkNode(row, 'ic', 16, 16, -W / 2 + 10, 0);
        const isp = ic.addComponent(Sprite);
        isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
        const f0 = iconFrame(r.art);
        if (f0) isp.spriteFrame = f0;
        else void loadIcon(r.art).then(() => {
          const f1 = r.art ? iconFrame(r.art) : null;
          if (f1 && isp.isValid) isp.spriteFrame = f1;
        });
      }
      text(row, -W / 2 + 24, 0, r.name, { size: 12, color: COL.dim, align: 'left', width: 120, outline: false });
      const vc = r.delta > 0 ? COL.mint : r.delta < 0 ? COL.red : COL.cream;
      // 数值统一右对齐到行右边界；长数字（如 1,234 / 55.5%）也不会挤到名称
      text(row, W / 2 - 52, 0, r.value, { size: 12, color: vc, align: 'right', width: 100, bold: true, outline: false });
      if (r.deltaText) {
        text(row, W / 2 - 4, 0, r.deltaText,
          { size: 10, color: r.delta > 0 ? COL.mint : COL.red, align: 'right', width: 46, outline: false });
      }
    });
  }

  // ── 技能页专用：手风琴（点一行展开：技能描述 + 已装模块描述）──
  const skillRoot = mkNode(drawer, 'skillDetail', VW, 1, 0, 0);
  skillRoot.active = false;
  let skillOpen = -1;
  function renderSkills() {
    if (!skillDetails) return;
    for (const c of skillRoot.children.slice()) c.destroy();
    const W = VW - 32;
    let y = bodyY - 6;
    skillDetails.slice(0, 4).forEach((s, i) => {
      const open = skillOpen === i;
      const rowH = 44;                  // P1-B：整行就是热区，必须 ≥44（原来是 42）
      const card = panel(skillRoot, 0, y - rowH / 2, W, rowH, {
        bg: COL.bg3, line: open ? COL.accent : COL.line2, radius: R.s, shadow: false,
      });
      if (s.icon) {
        const ic = mkNode(card, 'ic', 18, 18, -W / 2 + 16, 0);
        const isp = ic.addComponent(Sprite);
        isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
        const f = iconFrame(s.icon);
        if (f) isp.spriteFrame = f;
        else void loadIcon(s.icon).then(() => {
          const f2 = s.icon ? iconFrame(s.icon) : null;
          if (f2 && isp.isValid) isp.spriteFrame = f2;
        });
      }
      // 右侧要给「丢弃」按钮留位置（用户截图：按钮压在技能名上）
      const dropW = (onDropSkill && (skillDetails?.length ?? 0) > 1) ? 64 : 0;
      text(card, -W / 2 + 32, 10, s.name + '  Lv.' + s.lvl, { size: 12, color: COL.cream, align: 'left', width: W - 60 - dropW, bold: true, outline: true });
      text(card, -W / 2 + 32, -9, s.summary, { size: 10, color: COL.dim, align: 'left', width: W - 70 - dropW });
      text(card, W / 2 - 18, 0, open ? '▼' : '▶', { size: 10, color: COL.accent, align: 'right', width: 16 });
      // 主动丢弃（至少保留 1 个技能时才有这个入口）
      if (onDropSkill && (skillDetails?.length ?? 0) > 1) {
        const del = mkNode(card, 'dropHit', 52, 44, W / 2 - 40, 0);
        const db = panel(del, 0, 0, 52, 24, { art: 'btn_danger' });
        text(db, 0, 1, '丢弃', { size: 10, color: COL.cream, width: 48, bold: true, outline: false });
        onTap(del, () => onDropSkill(i));
      }
      onTap(card, () => { skillOpen = open ? -1 : i; renderSkills(); });
      y -= rowH + 4;
      if (open) {
        const rows: { t: string; c: Color }[] = [{ t: s.desc, c: COL.mint }];
        for (const m of s.mods) rows.push({ t: '· ' + m.name + '：' + m.desc, c: COL.cream });
        if (!s.mods.length) rows.push({ t: '· 还没有装黑科技', c: COL.dim });
        rows.slice(0, 5).forEach((ln, k) => {
          text(skillRoot, -W / 2 + 12, y - 6 - k * 13, ln.t, { size: 9, color: ln.c, align: 'left', width: W - 20, outline: false });
        });
        y -= Math.min(5, rows.length) * 13 + 6;
      }
    });
  }

  // ── 道具页专用：可展开的道具卡（M42：暂停面板里的道具要有详细介绍）──
  const itemRoot = mkNode(drawer, 'itemDetail', VW, 1, 0, 0);
  itemRoot.active = false;
  let itemOpen = -1;
  function renderItems() {
    if (!itemDetails) return;
    for (const c of itemRoot.children.slice()) c.destroy();
    const W = VW - 32, ROW_H = 44;
    if (!itemDetails.length) {
      text(itemRoot, 0, 0, '（还没有道具：精英 / BOSS 会掉，商店也能买）',
        { size: 11, color: COL.dim, align: 'center', width: W });
      return;
    }
    // 用户 2026-10-30：道具页要看**全部**，改成滚动列表（一行一件：图标 + 名称×数量 + 数值）
    const viewTop = bodyY + 6;
    const viewBottom = -VH / 2 + B + 150;
    const viewH = Math.max(80, viewTop - viewBottom);
    const cy = (viewTop + viewBottom) / 2;
    const contentH = Math.max(viewH, itemDetails.length * (ROW_H + 4) + 10);
    const sc = makeScroll(itemRoot, 0, cy, VW - 8, viewH, contentH);
    const topY = contentH / 2 - ROW_H / 2 - 2;
    itemDetails.forEach((it, i) => {
      const y = topY - i * (ROW_H + 4);
      const row = panel(sc.content, 0, y, W, ROW_H, { bg: COL.bg3, line: COL.line2, radius: R.s, shadow: false });
      if (it.icon) {
        const ic = mkNode(row, 'ic', 22, 22, -W / 2 + 18, 0);
        const isp = ic.addComponent(Sprite);
        isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
        const f = iconFrame(it.icon);
        if (f) isp.spriteFrame = f;
        else void loadIcon(it.icon).then(() => {
          const f2 = it.icon ? iconFrame(it.icon) : null;
          if (f2 && isp.isValid) isp.spriteFrame = f2;
        });
      }
      text(row, -W / 2 + 36, 8, it.name, { size: 12, color: COL.cream, align: 'left', width: W - 120, bold: true, outline: true });
      text(row, -W / 2 + 36, -10, it.nums || it.desc, { size: 10, color: COL.dim, align: 'left', width: W - 90, outline: false });
      if (i >= 0) text(row, W / 2 - 10, 0, '×' + ((it as unknown as { count?: number }).count ?? 1), { size: 11, color: COL.accent, align: 'right', width: 50, bold: true, outline: false });
    });
  }

  // ── 黑科技页：结构化列表（图标 + 名称/数量 + 效果），**已装与背包分开** ──
  // 可视窗口本身要**有真实尺寸**，否则触摸事件不会落在它上面（这是滚不动的真因）
  const VIEW_TOP = bodyY + 12;
  const VIEW_BOTTOM = -VH / 2 + 150;   // 再往上收 30px，避免半截行贴到按钮带   // 让列表停在按钮带更上方，配合底部底板彻底不重叠
  const VIEW_H = Math.max(40, VIEW_TOP - VIEW_BOTTOM);
  const VIEW_CY = (VIEW_TOP + VIEW_BOTTOM) / 2;
  const modHost = mkNode(drawer, 'modDetail', VW - 8, VIEW_H, 0, VIEW_CY);
  modHost.active = false;
  // 本页滚动的宿主（真正的滚动区由 makeScroll 创建在 modHost 内）
  let modScrollNode: Node | null = null;
  /** 黑科技页：全量渲染进滚动内容（裁切交给 Mask，拖动交给全局 input） */
  function renderMods() {
    if (modScrollNode && modScrollNode.isValid) modScrollNode.destroy();
    for (const c of modHost.children.slice()) c.destroy();
    const W = VW - 32;
    const all = modDetails ?? [];
    if (!all.length) {
      text(modHost, 0, 0, '（还没有黑科技：升级三选一 / 商店可以获得）',
        { size: 11, color: COL.dim, align: 'center', width: W });
      return;
    }
    type Line = { kind: 'head'; label: string } | { kind: 'row'; m: ModDetailView };
    const lines: Line[] = [];
    const pushSection = (label: string, arr: ModDetailView[]) => {
      if (!arr.length) return;
      lines.push({ kind: 'head', label: label + '（' + arr.length + '）' });
      for (const m of arr) lines.push({ kind: 'row', m });
    };
    pushSection('已装', all.filter(m => m.installed));
    pushSection('背包', all.filter(m => !m.installed));

    const HEAD_H = 24, ROW_H = 58, ROW_GAP = 4;   // 58 = 标题 16 + 描述两行 30 + 上下边距
    const contentH = Math.max(VIEW_H, lines.reduce((s, l) => s + (l.kind === 'head' ? HEAD_H : ROW_H + ROW_GAP), 0) + 8);
    // 抽屉里的 Mask 裁剪不稳（实测会漏出半行到底部按钮上），这里**手动裁剪**：
    // 每次滚动回调只把"完整落在视口内"的行设为可见。
    const bands: { n: Node; y: number; h: number }[] = [];
    const sc = makeScroll(modHost, 0, 0, VW - 8, VIEW_H, contentH, () => {
      // 只显示**完整落在视口内**的行（留 2px 余量），半截行直接隐藏，否则会漏到按钮带上
      for (const b of bands) {
        b.n.active = (b.y + b.h / 2 <= VIEW_H / 2 - 2) && (b.y - b.h / 2 >= -VIEW_H / 2 + 2);
      }
    });
    modScrollNode = sc.view;
    let cursor = contentH / 2 - 4;
    for (const l of lines) {
      const h = l.kind === 'head' ? HEAD_H : ROW_H + ROW_GAP;
      if (l.kind === 'head') {
        const hl = text(sc.content, -W / 2 + 4, cursor - 4, l.label,
          { size: 11, color: COL.accent, align: 'left', width: W, bold: true, outline: false });
        bands.push({ n: hl.node, y: cursor - 4, h: 20 });
      } else {
        const m = l.m;
        const card = panel(sc.content, 0, cursor - ROW_H / 2, W, ROW_H, {
          bg: COL.bg3, line: COL.line2, radius: R.s, shadow: false,
        });
        bands.push({ n: card, y: cursor - ROW_H / 2, h: ROW_H });
        if (m.icon) {
          const ic = mkNode(card, 'ic', 18, 18, -W / 2 + 16, 0);
          const isp = ic.addComponent(Sprite);
          isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
          const f = iconFrame(m.icon);
          if (f) isp.spriteFrame = f;
          else void loadIcon(m.icon).then(() => {
            const f2 = m.icon ? iconFrame(m.icon) : null;
            if (f2 && isp.isValid) isp.spriteFrame = f2;
          });
        }
        text(card, -W / 2 + 32, 16, m.name + (m.count > 1 ? ' ×' + m.count : ''),
          { size: 12, color: COL.cream, align: 'left', width: W - 110, bold: true, outline: true });
        // 10px × 2 行需要 30px；原来给 24 会裁掉第二行（审计脚本实测 need=30 > box=24）
        text(card, -W / 2 + 32, -10, m.desc,
          { size: 10, color: COL.dim, align: 'left', width: W - 96, h: 32 });
        if (m.installed) chip(card, W / 2 - 34, 0, '已装', { color: COL.mint, size: 9 });
      }
      cursor -= h;
    }
  }

  function refresh() {
    tabNodes.forEach(t => {
      const on = t.i === cur;
      paintPanel(t.n, TW, TAB_H, { art: on ? 'btn_primary' : 'btn' });
      t.label.color = on ? COL.ink : COL.cream;
      setOutline(t.label, !on);          // 选中时底变橙、字变深 -> 去掉黑描边，否则糊成一团
    });
    const isAttr = cur === attrIndex && !!attr;
    attrRoot.active = isAttr;
    // 技能页用可展开的技能卡（M33 #4），其余页签还是逐行文本
    const isSkills = cur === 0 && !!skillDetails;
    skillRoot.active = isSkills;
    if (isSkills) renderSkills();
    const isItems = cur === 2 && !!itemDetails;
    itemRoot.active = isItems;
    if (isItems) renderItems();
    const isMods = cur === 1 && !!modDetails;
    modHost.active = isMods;
    if (isMods) renderMods();
    const lines = (isAttr || isSkills || isItems || isMods) ? [] : (pages[cur]?.lines ?? []);
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
  // 底部按钮带垫一块**不透明底板**：滚动页的溢出内容会被它挡住（虚拟化仍会漏半行）
  {
    const plateY = -VH / 2 + B + 60;      // 覆盖按钮带并往上多 40px
    const plate = mkNode(drawer, 'btnPlate', VW, 128, 0, plateY);
    const pg = plate.addComponent(Graphics);
    pg.fillColor = COL.bg2;
    pg.rect(-VW / 2, -64, VW, 128);
    pg.fill();
  }

  // 底部按钮带垫不透明底板：滚动内容即使漏出一行也会被盖住（用户截图：主菜单那行被压）
  panel(drawer, 0, -VH / 2 + B + 28, VW, 62, { art: 'panel' });

  const by = -VH / 2 + B + 0;
  const m = button(root, A(12 + 48, 0).x, by + 25, 96, 50, '主菜单', { size: 14 });
  onTap(m.node, onMenu);
  if (onInstall) {
    const ins = button(root, A(116 + 48, 0).x, by + 25, 96, 50,
      bagCount ? '装黑科技' : '装黑科技', { size: 14 });
    onTap(ins.node, onInstall);
    const cont = button(root, A(220 + 64, 0).x, by + 25, 128, 50, '继续', { primary: true, size: 17 });
    onTap(cont.node, onResume);
  } else {
    const cont = button(root, A(116 + 116, 0).x, by + 25, 232, 50, '继续', { primary: true, size: 17 });
    onTap(cont.node, onResume);
  }
  refresh();
  return root;
}
