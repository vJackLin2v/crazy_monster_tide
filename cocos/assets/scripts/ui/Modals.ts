/**
 * 模态屏 —— 逐项实现 `docs/ui/ui-spec-approved.md` v1.1
 *   05 升级3选1 / 08 二次确认 / 09 Build抽屉 / 10 波间商店
 * 统一样式：遮罩 `rgba(4,6,12,.72)` + 3px 纯黑描边 + 硬投影。
 */
import { Node, Label, Color, Graphics, UITransform, UIOpacity, Sprite, view, EventTouch } from 'cc';
import { panel, text, title, button, onTap, mkNode, mask, screen, chip, slot, paintPanel, setOutline, screenHeader } from './UIKit';
import { COL, FS, R, BORDER } from './Tokens';
import { iconFrame, loadIcon } from '../engine/Assets';
import { Sfx } from '../engine/Audio';
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

    // 具体数值（有就显示，没有就不占位）
    let cursor = CH / 2 - 50;
    if (c.nums) {
      const h = c.nums.length > 18 ? 26 : 14;
      text(card, txtX, cursor - 6, c.nums, { size: 12, color: COL.cream, align: 'left', width: txtW, h, bold: true, outline: true });
      cursor -= h + 2;
    }
    // 效果描述：吃掉剩余高度（字号 11，符合"关键说明 ≥11px"；给足 h 不被裁）
    const descH = Math.max(24, cursor - (-CH / 2 + (c.meta ? 28 : 10)));
    text(card, txtX, cursor - descH / 2, c.desc,
      { size: 11, color: COL.dim, align: 'left', width: txtW, h: descH });

    // 叠加 / 上限状态（10px：属于元数据，不承担关键说明）
    if (c.meta) {
      text(card, txtX, -CH / 2 + 15, c.meta, { size: 10, color: COL.dim, align: 'left', width: txtW, h: 13 });
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

  // ── 标题条（整条像素面板）+ 右侧金币 ──
  const header = screenHeader(root, VW, S, '商店');
  const hw = VW / 2;
  const coin = mkNode(header, 'coin', 17, 17, hw - 96, 0);
  const csp = coin.addComponent(Sprite);
  csp.sizeMode = Sprite.SizeMode.CUSTOM; csp.trim = false;
  const cfi = iconFrame('ui-gold.png');
  if (cfi) csp.spriteFrame = cfi;
  else void loadIcon('ui-gold.png').then(() => {
    const f2 = iconFrame('ui-gold.png');
    if (f2 && csp.isValid) csp.spriteFrame = f2;
  });
  text(header, hw - 10, 1, String(gold), { size: 15, color: COL.cream, align: 'right', width: 76, bold: true, outline: true });

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
    text(row, -106, nameY - 27, s.sub, { size: 11, color: COL.dim, align: 'left', width: 156, h: 32 });
    if (s.owned && s.owned > 0 && !s.sold) {
      chip(row, 64, nameY, '持有×' + s.owned, { color: COL.accent, size: 10 });
    }

    if (s.sold) {
      text(row, 128, 0, '已购买', { size: 12, color: COL.red, align: 'right', width: 70, bold: true, outline: true });
    } else {
      const afford = gold >= s.price;
      chip(row, 88, 0, '◆ ' + s.price, { color: afford ? COL.accent : COL.red, size: 12 });
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
  const rf = button(root, A(12 + 56, 0).x, btnY, 112, 50, '刷新 ◆' + rerollCost, { size: 14 });
  onTap(rf.node, onReroll);
  const nx = button(root, A(132 + 108, 0).x, btnY, 216, 50, nextLabel || '下一波', { primary: true, size: 17 });
  onTap(nx.node, onNext);
  return root;
}


// ---------- 暂停 / Build 面板（底部抽屉 + 4 页签）----------
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
                                 onTab?: (i: number) => void): Node {
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
    // 展开全部时行距压到 19（12 行 × 19 = 228），否则「查看全部/收起」条带会被底部按钮压住
    // M63（6.3）：明确"显示的是当前总值"，避免玩家分不清基础值 / 总值 / 额外加成
    text(attrRoot, -VW / 2 + 16, bodyY + 9, '绿色 = 高于基础 · 红色 = 低于基础 · 数值为当前总值（部分属性有上限）',
      { size: 9, color: COL.dim, align: 'left', width: VW - 32, outline: false });
    const COLS = 2, ROW_H = attr.rows.length > 20 ? 19 : 22, GAP_X = 16;
    const CW = (VW - 32 - GAP_X) / 2;      // 156：两列之间留 16px，避免左列数值贴住右列图标
    attr.rows.slice(0, COLS * 12).forEach((r, i) => {
      const col = i % COLS, row = Math.floor(i / COLS);
      const cx = -VW / 2 + 16 + CW / 2 + col * (CW + GAP_X);
      const cy = bodyY - 18 - row * ROW_H;
      const cell = mkNode(attrRoot, 'attrCell', CW, ROW_H, cx, cy);
      if (r.art) {
        const ic = mkNode(cell, 'ic', 14, 14, -CW / 2 + 9, 0);
        const isp = ic.addComponent(Sprite);
        isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
        const f0 = iconFrame(r.art);
        if (f0) isp.spriteFrame = f0;
        else void loadIcon(r.art).then(() => {
          const f1 = r.art ? iconFrame(r.art) : null;
          if (f1 && isp.isValid) isp.spriteFrame = f1;
        });
      }
      text(cell, -CW / 2 + 24, 0, r.name, { size: 12, color: COL.dim, align: 'left', width: 64, outline: false });
      // 相对基准：正 = 绿、负 = 红、持平 = 白
      const vc = r.delta > 0 ? COL.mint : r.delta < 0 ? COL.red : COL.cream;
      text(cell, CW / 2 - 32, 0, r.value, { size: 12, color: vc, align: 'right', width: 46, bold: true, outline: false });
      // M65（6.3）：把"基础值的加成"单独一列显示，玩家能分清 总值 / 加成
      if (r.deltaText) {
        text(cell, CW / 2 - 2, 0, r.deltaText,
          { size: 9, color: r.delta > 0 ? COL.mint : COL.red, align: 'right', width: 30, outline: false });
      }
    });
    // M58（P1-5）：属性太多时默认只显示「核心 + 本局有变化」，底部给可点入口展开/收起全部（数据一项不删）
    if (attr.more) {
      const rowsShown = Math.ceil(Math.min(attr.rows.length, COLS * 12) / COLS);
      // 位置：网格下方 18px。展开到 12 行时要再抬高一点，否则会被「主菜单/继续」按钮压住
      //（M58 首版截图：展开后条带下半截被按钮盖住）
      const my = bodyY - 18 - rowsShown * ROW_H - 12;
      const strip = mkNode(attrRoot, 'attrMore', VW - 32, 26, 0, my);
      panel(strip, 0, 0, VW - 32, 26, { bg: COL.bg3, line: COL.line2, radius: R.s, shadow: false });
      text(strip, 0, 1, attr.more.label, { size: 11, color: COL.accent, width: VW - 46, bold: true, outline: false });
      onTap(strip, attr.more.onTap);
    }
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
      const rowH = 42;
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
      text(card, -W / 2 + 32, 10, s.name + '  Lv.' + s.lvl, { size: 12, color: COL.cream, align: 'left', width: 200, bold: true, outline: true });
      text(card, -W / 2 + 32, -8, s.summary, { size: 9, color: COL.dim, align: 'left', width: W - 60 });
      text(card, W / 2 - 18, 0, open ? '▼' : '▶', { size: 10, color: COL.accent, align: 'right', width: 16 });
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
    const W = VW - 32;
    let y = bodyY - 6;
    const MAX = 5;                        // 一屏最多 5 行（展开后仍放得下）
    itemDetails.slice(0, MAX).forEach((it, i) => {
      const open = itemOpen === i;
      const rowH = 36;
      const card = panel(itemRoot, 0, y - rowH / 2, W, rowH, {
        bg: COL.bg3, line: open ? COL.accent : COL.line2, radius: R.s, shadow: false,
      });
      if (it.icon) {
        const ic = mkNode(card, 'ic', 18, 18, -W / 2 + 16, 0);
        const isp = ic.addComponent(Sprite);
        isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
        const f = iconFrame(it.icon);
        if (f) isp.spriteFrame = f;
        else void loadIcon(it.icon).then(() => {
          const f2 = it.icon ? iconFrame(it.icon) : null;
          if (f2 && isp.isValid) isp.spriteFrame = f2;
        });
      }
      text(card, -W / 2 + 32, 0, it.name, { size: 12, color: COL.cream, align: 'left', width: 190, bold: true, outline: true });
      text(card, W / 2 - 10, 0, open ? '▼' : '▶', { size: 10, color: COL.accent, align: 'right', width: 16 });
      onTap(card, () => { itemOpen = open ? -1 : i; renderItems(); });
      y -= rowH + 4;
      if (open) {
        // 三行：人话效果 / 具体数值 / 类型来源（用户要求"更详细的数值描述"）
        const rows: { t: string; c: Color }[] = [
          { t: it.desc, c: COL.mint },
          { t: it.nums, c: COL.cream },
          { t: it.note, c: COL.dim },
        ].filter(r => !!r.t);
        rows.slice(0, 3).forEach((r, k) => {
          text(itemRoot, -W / 2 + 12, y - 6 - k * 14, r.t,
            { size: 10, color: r.c, align: 'left', width: W - 20, h: 16 });
        });
        y -= rows.length * 14 + 8;
      }
    });
    if (itemDetails.length > MAX) {
      text(itemRoot, -W / 2 + 12, y - 4, '… 还有 ' + (itemDetails.length - MAX) + ' 件（结算页可看全部）',
        { size: 9, color: COL.dim, align: 'left', width: W - 20 });
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
    const lines = (isAttr || isSkills || isItems) ? [] : (pages[cur]?.lines ?? []);
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
