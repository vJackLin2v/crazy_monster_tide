/**
 * 黑科技（原「行为模块」）安装 / 替换 / 合成屏 —— 规格 `docs/ui/ui-spec-approved.md` §2.6
 *
 * M32 重做：槽位显示**图标 + 名字**、背包按"份"选择、新增合成区。
 * M35/M36：底部效果说明条、兼容白光高亮、卸下按钮。
 * M37：术语统一为「黑科技」。M38：右侧内边距（槽位与合成按钮不再贴边）。
 */
import { Node, Label, Color, Graphics, UITransform, UIOpacity, Sprite, view } from 'cc';
import { panel, text, button, onTap, mkNode, mask, chip, slot } from './UIKit';
import { COL, FS, R, BORDER } from './Tokens';
import { iconFrame, loadIcon } from '../engine/Assets';
import { safeTop, safeBottom } from './Safe';
import type { UiArtName } from './Art';

function at(vw: number, vh: number, x: number, y: number) {
  return { x: x - vw / 2, y: vh / 2 - y };
}

/** 画一个图标（没有图就留空槽背景） */
function drawIcon(parent: Node, x: number, y: number, size: number, name?: string): Node {
  const n = mkNode(parent, 'icon', size, size, x, y);
  if (!name) return n;
  const sp = n.addComponent(Sprite);
  sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.trim = false;
  const f = iconFrame(name);
  if (f) sp.spriteFrame = f;
  else void loadIcon(name).then(() => {
    const g2 = iconFrame(name);
    if (g2 && sp.isValid) sp.spriteFrame = g2;
  });
  return n;
}

export interface InstallModView { id: string; name: string; icon?: string; merged?: boolean; }
export interface InstallSkillView { name: string; lvl: number; mods: InstallModView[]; }
export interface InstallBagItem { id: string; name: string; icon?: string; merged?: boolean; }

export interface InstallMergeItem {
  baseId: string;
  name: string;
  count: number;
  times: number;
  resultName: string;
  resultIcon?: string;
}

export interface InstallData {
  skills: InstallSkillView[];
  bag: InstallBagItem[];
  /** 选中的是背包里第几份（同名不同份互不影响） */
  selBag: number | null;
  /** 选中的是「已装在技能上」的模块 */
  selSlot?: { si: number; sl: number } | null;
  selName?: string;
  /** 手里拿着的模块 id（用于"哪些技能能装"的高亮） */
  pickedId?: string | null;
  /** 手里拿着的模块效果说明（底部说明条） */
  pickedDesc?: string;
  merges: InstallMergeItem[];
  compatible: (skillIdx: number, modId: string) => boolean;
}

export interface InstallCallbacks {
  onSelectBag: (i: number | null) => void;
  onPickSlot: (skillIdx: number, slotIdx: number) => void;
  onMerge: (baseId: string) => void;
  onUnequip: () => void;
  onBack: () => void;
}

/** 6. 黑科技安装 / 替换 / 合成 —— 全屏面板（不再是"飘在战场上的文字"） */
export function buildInstall(parent: Node, d: InstallData, cb: InstallCallbacks): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = mkNode(parent, 'scr-install', VW, VH);
  mask(root, VW, VH);

  // ── 主面板：顶部让开安全区、底部让开手势条 ──
  const top = S + 10;
  const PH = (VH - B - 8) - top;
  const pc = A(180, top + PH / 2);
  const box = panel(root, pc.x, pc.y, 340, PH, { art: 'panel' });
  const TOPY = PH / 2;

  const holding = d.selSlot
    ? (d.skills[d.selSlot.si]?.mods[d.selSlot.sl]?.name ?? '黑科技')
    : d.selBag !== null ? (d.bag[d.selBag]?.name ?? '黑科技') : '';
  const picking = !!(d.selSlot || d.selBag !== null);

  // 标题 + 操作提示
  text(box, 0, TOPY - 24, '黑科技', { size: 24, color: COL.cream, width: 300, bold: true, outline: true, shadow: true });
  text(box, 0, TOPY - 50, d.selSlot ? '已拿起「' + holding + '」→ 点槽位：空槽=移动，占用=交换'
    : d.selBag !== null ? '已选中「' + holding + '」→ 点槽位：空槽=装上，占用=替换（满槽也能换）'
      : '点背包里的黑科技，或点技能上的黑科技把它拿起来',
  { size: 11, color: picking ? COL.mint : COL.dim, width: 316, h: 28 });

  // ── 4 个技能行（行内：技能名 / 3 个模块槽）──
  // 矮屏（360x640 设计分辨率）必须压一档，否则 4 行技能 + 背包 + 合成 + 按钮会打架
  const compact = PH < 620;
  const ROW_W = 316, ROW_H = compact ? 52 : 60, ROW_GAP = compact ? 5 : 6;
  const rowsTop = TOPY - (compact ? 74 : 82);
  const SW = 74, SH = compact ? 34 : 40, SGAP = 6;
  const slotCx = (k: number) => -ROW_W / 2 + 8 + 68 + SW / 2 + k * (SW + SGAP);
  const picked = d.pickedId ?? null;
  d.skills.slice(0, 4).forEach((sk, si) => {
    const cy = rowsTop - ROW_H / 2 - si * (ROW_H + ROW_GAP);
    // 兼容 = 标签能装（含"槽位满、点槽位替换"）。只有**真不兼容**才置灰。
    const compat = picked ? d.compatible(si, picked) : true;
    const full = sk.mods.length >= 3;                 // 3 个槽全占满
    const rowArt: UiArtName = picked && compat ? (full ? 'rim_gold' : 'card_sel') : 'panel_soft';
    const row = panel(box, 0, cy, ROW_W, ROW_H, { art: rowArt });
    if (picked && !compat) row.addComponent(UIOpacity).opacity = 110;
    text(row, -ROW_W / 2 + 10, 11, sk.name, { size: 13, color: COL.cream, align: 'left', width: 64, bold: true, outline: true });
    // 三种状态都要有**文字**证据：不兼容 / 已满 / 常规（不能只靠压暗）
    const subTxt = picked && !compat ? '不兼容' : 'Lv.' + sk.lvl + (full && picked ? ' · 满' : '');
    const subCol = picked && !compat ? COL.red : (full && picked ? COL.accent : COL.dim);
    text(row, -ROW_W / 2 + 10, -10, subTxt,
      { size: 10, color: subCol, align: 'left', width: 64, bold: picked });
    for (let k = 0; k < 3; k++) {
      const mod = sk.mods[k];
      const isSel = !!d.selSlot && d.selSlot.si === si && d.selSlot.sl === k;
      const b = panel(row, slotCx(k), 0, SW, SH, { art: isSel ? 'card_gold' : (mod ? 'slot' : 'well') });
      if (mod) {
        drawIcon(b, -SW / 2 + 16, 0, 18, mod.icon);
        text(b, 10, 0, (mod.name + (mod.merged ? 'Ⅱ' : '')).slice(0, 5),
          { size: 10, color: mod.merged ? COL.accent : COL.cream, width: 48, outline: true });
      } else {
        text(b, 0, 1, '＋', { size: 16, color: COL.dash, width: SW, outline: false });
      }
      onTap(b, () => cb.onPickSlot(si, k));
    }
  });

  // ── 背包 ──
  // 背包紧跟"最后一行技能"，技能不满 4 个时不会在中间留一个大洞
  const usedRows = Math.max(1, Math.min(4, d.skills.length));
  const bagTitleY = rowsTop - usedRows * ROW_H - (usedRows - 1) * ROW_GAP - (compact ? 16 : 20);
  const moreTxt = d.bag.length > (compact ? 3 : 6) ? '（还有 ' + (d.bag.length - (compact ? 3 : 6)) + ' 个）' : '';
  text(box, -158, bagTitleY, '背包里的黑科技' + moreTxt,
    { size: 13, color: COL.accent, align: 'left', width: 300, bold: true, outline: true });
  const BW = 100, BHH = compact ? 30 : 34, BGAP = 6, BCOLS = 3;
  const BAG_MAX = compact ? 3 : 6;              // 矮屏只放一排
  const bagTop = bagTitleY - 12;
  if (!d.bag.length) {
    text(box, -158, bagTop - 14, '（空：黑科技都装在技能上了，或还没获得）',
      { size: 11, color: COL.dim, align: 'left', width: 316 });
  } else {
    d.bag.slice(0, BAG_MAX).forEach((m, i) => {
      const col = i % BCOLS, rowi = Math.floor(i / BCOLS);
      const cx = -158 + BW / 2 + col * (BW + BGAP);
      const cyy = bagTop - BHH / 2 - rowi * (BHH + BGAP);
      const on = d.selBag === i;
      const n = panel(box, cx, cyy, BW, BHH, { art: on ? 'card_gold' : 'btn' });
      drawIcon(n, -BW / 2 + 17, 0, 18, m.icon);
      text(n, 9, 0, (m.name + (m.merged ? 'Ⅱ' : '')).slice(0, 5),
        { size: 11, color: m.merged ? COL.accent : COL.cream, width: 62, outline: true });
      onTap(n, () => cb.onSelectBag(on ? null : i));
    });
  }
  const bagRows = d.bag.length ? Math.min(compact ? 1 : 2, Math.ceil(Math.min(d.bag.length, BAG_MAX) / BCOLS)) : 1;
  const bagBottom = bagTop - bagRows * (BHH + BGAP) + 4;

  // ── 合成区 ──
  const mergeTitleY = bagBottom - 12;
  text(box, -158, mergeTitleY, '合成：3 个同名 → 1 个 II（效果 ×2，只占 1 槽）',
    { size: 11, color: COL.accent, align: 'left', width: 316, bold: true, outline: true });
  const descY = -PH / 2 + (d.pickedDesc ? 104 : 66);
  const mergeTop = mergeTitleY - 12;
  const maxRows = Math.max(1, Math.floor((mergeTop - descY - 10) / 34));
  // 候选按"已有份数"排序：够 3 个给按钮，不够给"还差 N 个"（不拿灰按钮骗人）
  const cands = d.merges
    .filter(m => m.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, maxRows);
  if (!cands.length) {
    text(box, -158, mergeTop - 14, '（同名黑科技凑满 3 个才能合成）',
      { size: 11, color: COL.dim, align: 'left', width: 316 });
  } else {
    cands.forEach((m, i) => {
      const cy = mergeTop - 16 - i * 34;
      const row = panel(box, 0, cy, 316, 30, { art: 'panel_soft' });
      drawIcon(row, -146, 0, 18, m.resultIcon);
      text(row, -128, 0, m.name + ' ×' + m.count + ' / 3 → ' + m.resultName,
        { size: 11, color: COL.cream, align: 'left', width: 208, outline: true });
      if (m.times >= 1) {
        // 按钮右边缘留 9px、上下各 5px（用户反馈：原来贴住行边框，右上都没空）
        const mb = panel(row, 126, 0, 46, 20, { art: 'btn_primary' });
        text(mb, 0, 1, '合成', { size: 10, color: COL.ink, width: 42, bold: true, outline: false });
        const hit = mkNode(row, 'mergeHit', 46, 34, 126, 0);
        onTap(hit, () => cb.onMerge(m.baseId));
        onTap(mb, () => cb.onMerge(m.baseId));
      } else {
        // 右对齐结束在 x=148（行半宽 158，留 10px）
        text(row, 111, 0, '还差 ' + Math.max(1, 3 - m.count) + ' 个',
          { size: 10, color: COL.dim, align: 'right', width: 74, outline: false });
      }
    });
  }

  // ── 效果说明条 + 卸下 ──
  if (d.pickedDesc) {
    text(box, -158, descY, '「' + (d.selName ?? '') + '」' + d.pickedDesc,
      { size: 11, color: COL.mint, align: 'left', width: d.selSlot ? 240 : 316, h: 32 });
  }
  if (d.selSlot) {
    // 右边缘收到 162（面板半宽 170，留 8px）：原来 x=132 + 40 = 172，**超出面板 2px**
    const ub = panel(box, 122, descY, 80, 28, { art: 'btn_danger' });
    text(ub, 0, 1, '卸下', { size: 12, color: COL.cream, width: 76, bold: true, outline: false });
    const hit = mkNode(box, 'unequipHit', 80, 34, 122, descY);
    onTap(hit, () => cb.onUnequip());
  }

  // ── 底部按钮 ──
  const by = -PH / 2 + 28;
  const back = button(box, -78, by, 150, 46, '返回', { size: 15 });
  onTap(back.node, cb.onBack);
  const done = button(box, 78, by, 150, 46, '完成', { primary: true, size: 17 });
  onTap(done.node, cb.onBack);
  return root;
}

/** 7. 技能替换 —— 全屏面板 + 4 个可点技能行 */
export function buildReplace(parent: Node, newSkill: { name: string; desc: string; icon?: string },
                             owned: { name: string; modCount: number; icon?: string }[],
                             onReplace: (slot: number) => void, onGiveUp: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = mkNode(parent, 'scr-replace', VW, VH);
  mask(root, VW, VH);

  const top = S + 10;
  const PH = (VH - B - 8) - top;
  const pc = A(180, top + PH / 2);
  const box = panel(root, pc.x, pc.y, 340, PH, { art: 'panel' });
  const TOPY = PH / 2;

  text(box, 0, TOPY - 24, '技能已满 4 个', { size: 24, color: COL.cream, width: 300, bold: true, outline: true, shadow: true });
  text(box, 0, TOPY - 50, '选择要替换掉的技能', { size: 11, color: COL.dim, width: 300 });

  // 新技能卡（拿到的新技能长什么样）
  const card = panel(box, 0, TOPY - 98, 316, 68, { art: 'card_gold' });
  const nb = slot(card, -128, 0, 40);
  if (newSkill.icon) drawIcon(nb, 0, 0, 34, newSkill.icon);
  else text(nb, 0, 1, '?', { size: 18, color: COL.cream, width: 38, outline: false });
  text(card, -100, 12, newSkill.name, { size: 16, color: COL.cream, align: 'left', width: 150, bold: true, outline: true });
  text(card, -100, -12, newSkill.desc, { size: 11, color: COL.dim, align: 'left', width: 172, h: 26 });
  chip(card, 124, 0, '新技能', { bg: COL.accent, color: COL.ink, size: 10, dark: true });

  // 4 个已拥有技能行
  const ROW_W = 316, ROW_H = 56, ROW_GAP = 8;
  const rowsTop = TOPY - 140;
  owned.slice(0, 4).forEach((o, i) => {
    const cy = rowsTop - ROW_H / 2 - i * (ROW_H + ROW_GAP);
    const row = panel(box, 0, cy, ROW_W, ROW_H, { art: 'panel_soft' });
    const ib = slot(row, -ROW_W / 2 + 26, 0, 34);
    if (o.icon) drawIcon(ib, 0, 0, 26, o.icon);
    text(row, -ROW_W / 2 + 50, 0, o.name, { size: 14, color: COL.cream, align: 'left', width: 150, bold: true, outline: true });
    text(row, 6, 0, o.modCount ? o.modCount + ' 个黑科技退回背包' : '无黑科技可退',
      { size: 9, color: o.modCount ? COL.mint : COL.dim, align: 'left', width: 96 });
    chip(row, 132, 0, '替换', { color: COL.red, size: 11 });
    onTap(row, () => onReplace(i));
  });

  text(box, 0, -PH / 2 + 78, '换下的技能，黑科技会退回背包，不会丢失', { size: 10, color: COL.mint, width: 316 });

  const b = button(box, 0, -PH / 2 + 28, 300, 46, '放弃这个技能', { size: 15 });
  onTap(b.node, onGiveUp);
  return root;
}
