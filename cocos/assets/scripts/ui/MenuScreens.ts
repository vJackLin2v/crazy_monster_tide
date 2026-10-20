/**
 * 入口流程屏幕 —— **逐项实现 `docs/ui/ui-spec-approved.md` v1.1**（土豆兄弟风）
 *
 * 01-menu / 02-howto / 03-charselect / 11-result
 * 坐标全部来自规格 §2.2~§2.4、§2.9（在设计稿 HTML 上实测）。
 * ⚠️ 位置锚定 `view.getVisibleSize()`，不得写死 640（KI-009）。
 */
import { Node, Label, Color, Graphics, UITransform, view, Sprite } from 'cc';
import { panel, text, title, button, onTap, mkNode, screen, radialGlow, paintPanel } from './UIKit';
import { COL, FS, R, BORDER } from './Tokens';
import { CHARS } from '../data/Chars';
import { SKILLS, SKILL_ART } from '../data/Skills';
import { Assets, iconFrame, loadIcon } from '../engine/Assets';

const C_MENU_EDGE = new Color(30, 30, 42);    // #1e1e2a
const C_MENU_MID = new Color(58, 58, 82);     // #3a3a52
const C_GOLD_TOP = new Color(255, 232, 154);
const C_GOLD_BOT = new Color(217, 154, 28);

/** 规格坐标 → Cocos 节点坐标 */
export function at(vw: number, vh: number, x: number, y: number) {
  return { x: x - vw / 2, y: vh / 2 - y };
}

/** 金币圆图标（规格：径向渐变 #ffe89a → #d99a1c + 3px 黑边） */
export function coinIcon(parent: Node, x: number, y: number, d = 19): Node {
  const n = mkNode(parent, 'coin', d, d, x, y);
  const g = n.addComponent(Graphics);
  const rad = d / 2 - 1.5;
  for (let i = 6; i >= 0; i--) {
    const t = i / 6;
    g.fillColor = new Color(
      Math.round(C_GOLD_TOP.r + (C_GOLD_BOT.r - C_GOLD_TOP.r) * t),
      Math.round(C_GOLD_TOP.g + (C_GOLD_BOT.g - C_GOLD_TOP.g) * t),
      Math.round(C_GOLD_TOP.b + (C_GOLD_BOT.b - C_GOLD_TOP.b) * t), 255);
    g.circle(0, rad * 0.35 - i * rad * 0.12, rad * 0.72);
    g.fill();
  }
  g.lineWidth = BORDER; g.strokeColor = COL.line; g.circle(0, 0, rad); g.stroke();
  return n;
}

/** 1. 主界面 —— 规格 §2.2 */
export function buildMenu(parent: Node, seed: number, onStart: () => void, onHowto: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const at2 = (x: number, y: number) => at(VW, VH, x, y);
  const root = screen(parent, 'scr-menu', C_MENU_EDGE);
  radialGlow(root, 0, at2(180, 0.3 * VH).y, VH * 0.62, C_MENU_MID, 150, 16);

  const t = at2(180, 99 + 24);
  text(root, t.x, t.y, '疯狂怪潮', { size: 44, color: COL.cream, bold: true, width: 354, outline: true, shadow: true });
  const s = at2(180, 153 + 8);
  text(root, s.x, s.y, 'C R A Z Y   M O N S T E R   T I D E', { size: 12, color: COL.accent, width: 354, bold: true, outline: true });

  const b1 = at2(180, 300 + 26);
  const btn1 = button(root, b1.x, b1.y, 250, 52, '开始游戏', { primary: true, size: 20 });
  onTap(btn1.node, onStart);
  const b2 = at2(180, 366 + 24.5);
  const btn2 = button(root, b2.x, b2.y, 250, 49, '玩法说明', { size: 18 });
  onTap(btn2.node, onHowto);

  const f1 = at2(180, VH - 70);
  text(root, f1.x, f1.y, '4 技能 · 每技能 3 个行为槽 · 20 波闯关', { size: FS.xs, color: COL.dim, width: 354 });
  text(root, f1.x, f1.y - 18, 'seed ' + seed, { size: FS.xs, color: COL.dim, width: 354 });
  return root;
}

/** 2. 玩法说明 —— 规格 §2.3 */
export function buildHowto(parent: Node, onBack: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const at2 = (x: number, y: number) => at(VW, VH, x, y);
  const root = screen(parent, 'scr-howto', COL.bg1);

  const tt = at2(180, 14 + 16);
  title(root, tt.y, '玩法说明');

  const secs: [string, string[]][] = [
    ['操作', ['按住屏幕任意处拖动 = 动态摇杆，松开消失。', '技能全自动开火，你只需要走位。']],
    ['一局怎么打', ['共 20 波。每波有倒计时，撑到时间结束即过关。', '每 3 波出精英，第 10 / 20 波是 BOSS。']],
    ['核心构筑', ['最多 4 个主动技能，每个技能 3 个行为槽。', '模块可以重复装，也能在 Build 面板里搬家。']],
  ];
  const LINE_H = 22, SEC_H = 24, PAD = 14;
  let bodyH = PAD * 2;
  for (const [, lines] of secs) bodyH += SEC_H + lines.length * LINE_H + 10;
  const top = VH / 2 - 60;
  const box = panel(root, 0, top - bodyH / 2, 336, bodyH, { bg: COL.bg2, line: COL.line, radius: R.m });
  let cy = bodyH / 2 - PAD - SEC_H / 2;
  for (const [head, lines] of secs) {
    text(box, -156, cy, head, { size: 14, color: COL.accent, align: 'left', width: 312, bold: true, outline: true });
    cy -= SEC_H;
    for (const ln of lines) {
      text(box, -156, cy, ln, { size: FS.xs, color: COL.cream, align: 'left', width: 312 });
      cy -= LINE_H;
    }
    cy -= 10;
  }

  const btn = button(root, 0, -VH / 2 + 16 + 24.5, 336, 49, '返回', { size: FS.m });
  onTap(btn.node, onBack);
  return root;
}

/** 3. 角色选择 —— 规格 §2.4（3x2 网格 + 详情 + 底部双按钮） */
export function buildCharSelect(parent: Node, onBack: () => void, onStart: (id: string) => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const at2 = (x: number, y: number) => at(VW, VH, x, y);
  const root = screen(parent, 'scr-charselect', COL.bg1);

  const tt = at2(180, 12 + 16);
  title(root, tt.y, '选择角色');
  const st = at2(180, 46 + 8);
  text(root, st.x, st.y, '每个角色都有正向天赋，也有明显的负面代价', { size: 12, color: COL.dim, width: 354 });

  let picked = CHARS[0].id;
  const cells: { node: Node; id: string; label: Label }[] = [];
  // 网格：左右各 12，3 列，间距 8 → 单元宽 = (336-16)/3
  // 立绘放大到 96px（32px 源 × 3 倍整数缩放）：格子相应加高到 124
  const GAP = 8, CW = (336 - GAP * 2) / 3, CHh = 124, X0 = 12;
  CHARS.forEach((ch, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const cx = X0 + CW / 2 + col * (CW + GAP);
    const cy = 70 + CHh / 2 + row * (CHh + GAP);
    const c = at2(cx, cy);
    const n = panel(root, c.x, c.y, CW, CHh, { bg: COL.bg2, line: COL.line, radius: R.m });

    // 用户反馈「角色立绘太小」：46 → 96（3 倍整数缩放，占格子宽约 92%）
    const pn = mkNode(n, 'portrait', 96, 96, 0, 14);
    const sp = pn.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.trim = false;
    Assets.loadUnit(ch.unit).then(clips => {
      const f = (clips.idle && clips.idle[0]) || (clips.walk && clips.walk[0]);
      if (!f || !sp.isValid) return;
      sp.spriteFrame = f;
      const fw = f.rect.width || 32;
      const k = Math.max(1, Math.floor(96 / fw));
      const ut = pn.getComponent(UITransform);
      if (ut) ut.setContentSize(fw * k, fw * k);
    }).catch(() => { /* 人像失败不影响选角 */ });

    const l = text(n, 0, -50, ch.name, { size: FS.xs, color: COL.cream, width: CW - 4, bold: true, outline: true });
    cells.push({ node: n, id: ch.id, label: l });
    onTap(n, () => { picked = ch.id; refresh(); });
  });

  // 详情面板：12,290 → 底 86
  const dTop = 70 + 2 * (CHh + GAP) + 4;      // 跟着网格走，别写死（格子高度会变）
  const dBot = VH - 86;
  const DH = dBot - dTop;
  const dc = at2(180, dTop + DH / 2);
  const detail = panel(root, dc.x, dc.y, 336, DH, { bg: COL.bg2, line: COL.line, radius: R.m });
  const half = DH / 2;
  const dName = text(detail, -156, half - 26, '', { size: 20, color: COL.accent, align: 'left', width: 312, bold: true, outline: true, shadow: true });
  const dPos = text(detail, -156, half - 62, '', { size: FS.s, color: COL.mint, align: 'left', width: 312, bold: true, outline: true });
  const dNeg = text(detail, -156, half - 88, '', { size: FS.s, color: COL.red, align: 'left', width: 312, bold: true, outline: true });
  // 初始技能行
  const skBox = panel(detail, 0, half - 140, 304, 44, { bg: COL.bg3, line: COL.line, radius: R.m, shadow: false });
  const skIcon = mkNode(skBox, 'skIcon', 30, 30, -130, 0);
  const skSp = skIcon.addComponent(Sprite);
  skSp.sizeMode = Sprite.SizeMode.CUSTOM; skSp.trim = false;
  const skTxt = text(skBox, -108, 1, '', { size: 14, color: COL.cream, align: 'left', width: 180, bold: true, outline: true });
  const dStat = text(detail, 0, -half + 22, '', { size: FS.xs, color: COL.dim, width: 312 });

  function refresh() {
    for (const cell of cells) {
      const on = cell.id === picked;
      paintPanel(cell.node, CW, CHh, { bg: on ? COL.bg3 : COL.bg2, line: on ? COL.accent : COL.line, radius: R.m });
      cell.label.color = on ? COL.accent : COL.cream;
    }
    const ch = CHARS.find(x => x.id === picked)!;
    dName.string = ch.name;
    dPos.string = '＋ ' + ch.pos;
    dNeg.string = '－ ' + ch.neg;
    skTxt.string = '初始技能：' + (SKILLS[ch.start] ? SKILLS[ch.start].name : ch.start);
    // 初始技能的图标（此前只建了 Sprite 节点、没设 spriteFrame → 详情面板里图标一直是空的）
    const art = SKILL_ART[ch.start];
    if (art && art.icon) {
      const setIt = () => {
        const f = iconFrame(art.icon!);
        if (f && skSp.isValid) { skSp.spriteFrame = f; }
        return !!f;
      };
      if (!setIt()) {
        void loadIcon(art.icon).then(() => { setIt(); });
      }
    } else skSp.spriteFrame = null;
    const st2 = ch.stats || {};
    const bits: string[] = [];
    if (st2.power !== undefined) bits.push('攻击 ×' + st2.power.toFixed(1));
    if (st2.speedMul !== undefined) bits.push('移速 ×' + st2.speedMul.toFixed(2));
    if (st2.maxhp !== undefined) bits.push('生命 ' + st2.maxhp);
    if (st2.crit !== undefined) bits.push('暴击 ' + Math.round(st2.crit * 100) + '%');
    if (st2.regen !== undefined) bits.push('回血 ' + st2.regen + '/s');
    if (st2.pickupMul !== undefined) bits.push('拾取 ×' + st2.pickupMul);
    dStat.string = bits.join('   ');
  }

  // 底部：返回(96) + 开始闯关(232)，底边距 16，间距 8
  const by = -VH / 2 + 16 + 24.5;
  const back = button(root, at2(12 + 48, 0).x, by, 96, 49, '返回', { size: 15 });
  onTap(back.node, onBack);
  const go = button(root, at2(116 + 116, 0).x, -VH / 2 + 16 + 26, 232, 52, '开始闯关', { primary: true, size: 17 });
  onTap(go.node, () => onStart(picked));
  refresh();
  return root;
}

/** 结算页的 Build 行（带技能图标） */
export interface ResultBuildRow { icon: string; name: string; sub: string }

/** 11. 结算 —— 规格 §2.9 */
export function buildResult(parent: Node,
                            stats: { win: boolean; wave: number; lv: number; kills: number; time: number;
                                     build: ResultBuildRow[]; gold?: number; seed?: number;
                                     waveTotal?: number; endless?: boolean },
                            onMenu: () => void, onRetry: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const at2 = (x: number, y: number) => at(VW, VH, x, y);
  const root = screen(parent, 'scr-result', COL.bg1);

  const tt = at2(180, 14 + 16);
  title(root, tt.y, '结算');

  // 结果大字 38px，y52 起
  const big = stats.win ? '通关！' : '倒下';
  const bt = at2(180, 52 + 24);
  text(root, bt.x, bt.y, big, {
    size: 38, color: stats.win ? COL.mint : COL.red, bold: true, width: 354, outline: true, shadow: true,
  });

  // 统计面板 x12 y118 w336
  const rows: [string, string][] = [
    ['存活时间', stats.time.toFixed(1) + ' s'],
    ['击杀', String(stats.kills)],
    ['等级', 'Lv.' + stats.lv],
    ['推进到', '第 ' + stats.wave + ' / ' + (stats.waveTotal ?? 20) + ' 波' + (stats.endless ? '（无尽）' : '')],
    ['金币', String(stats.gold ?? 0)],
    ['seed', String(stats.seed ?? '')],
  ];
  const ROW_H = 30, PAD = 13;
  const boxH = PAD * 2 + rows.length * ROW_H;
  const bc = at2(180, 118 + boxH / 2);
  const box = panel(root, bc.x, bc.y, 336, boxH, { bg: COL.bg2, line: COL.line, radius: R.m });
  rows.forEach(([k, v], i) => {
    const ry = boxH / 2 - PAD - ROW_H / 2 - i * ROW_H;
    text(box, -156, ry, k, { size: FS.s, color: COL.dim, align: 'left', width: 150 });
    text(box, 156, ry, v, { size: FS.s, color: COL.cream, align: 'right', width: 150, bold: true, outline: true });
  });

  // 本局 Build：y368
  const bh = at2(12, 368 + 8);
  text(root, bh.x, bh.y, '本局 Build', { size: 14, color: COL.accent, align: 'left', width: 312, bold: true, outline: true });

  const listTop = 394;
  const maxRows = Math.max(1, Math.floor((VH - 16 - 52 - listTop - 8) / 46));
  const list = stats.build.slice(0, maxRows);
  if (list.length) {
    list.forEach((r, i) => {
      const c = at2(180, listTop + i * 46 + 22);
      const row = panel(root, c.x, c.y, 336, 44, { bg: COL.bg2, line: COL.line, radius: R.m, shadow: false });
      const ic = mkNode(row, 'ic', 28, 28, -142, 0);
      const isp = ic.addComponent(Sprite);
      isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
      if (r.icon) {
        const f = iconFrame(r.icon);
        if (f) { isp.spriteFrame = f; }
        else { void loadIcon(r.icon).then(() => { const g2 = iconFrame(r.icon); if (g2 && isp.isValid) isp.spriteFrame = g2; }); }
      }
      text(row, -120, 0, r.name, { size: FS.s, color: COL.cream, align: 'left', width: 150, bold: true, outline: true });
      text(row, 156, 0, r.sub, { size: FS.xs, color: COL.dim, align: 'right', width: 190 });
    });
  } else {
    const c = at2(180, listTop + 10);
    text(root, c.x, c.y, '· 没有收获', { size: FS.xs, color: COL.dim, align: 'left', width: 312 });
  }

  // 底部：主界面(96) + 再来一局(232)
  const byy = -VH / 2 + 16 + 24.5;
  const m = button(root, at2(12 + 48, 0).x, byy, 96, 49, '主界面', { size: 14 });
  onTap(m.node, onMenu);
  const r2 = button(root, at2(116 + 116, 0).x, -VH / 2 + 16 + 26, 232, 52, '再来一局', { primary: true, size: 17 });
  onTap(r2.node, onRetry);
  return root;
}
