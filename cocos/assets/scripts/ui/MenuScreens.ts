/**
 * 入口流程屏幕 —— 主菜单 / 玩法说明 / 角色选择 / 结算
 *
 * v2 改造（像素共鸣 UI 专项）要点：
 *   - 统一走 UIKit 的像素九宫格（Kenney Pixel UI Pack，CC0）：面板、按钮、卡片、槽位同源同线宽
 *   - **安全区**：顶部标题与底部按钮都按 safeTop()/safeBottom() 让开刘海与手势条
 *   - 层级：标题 26/44px 粗体带黑描边 + 硬投影；正文 11~13px；辅助信息 10px 灰
 *   - 角色卡选中态 = 青色描边 + 提亮底（card_sel），不只靠文字颜色
 *   - 结算：4 个统计卡（2x2）+ 本局构筑列表，只显示真实存在的字段
 *
 * 坐标全部来自 `docs/ui/ui-spec-approved.md` / ui-redesign 规范，锚定 `view.getVisibleSize()`
 * （不得写死 640，KI-009）。
 */
import { Node, Label, Color, Graphics, UITransform, view, Sprite, SpriteFrame } from 'cc';
import { panel, text, button, onTap, mkNode, screen, radialGlow, paintPanel, screenHeader } from './UIKit';
import { COL, FS, R, BORDER } from './Tokens';
import { CHARS } from '../data/Chars';
import { SKILLS, SKILL_ART } from '../data/Skills';
import { Assets, iconFrame, loadIcon } from '../engine/Assets';
import { CS, pageCount, cellPos, cellPosPaged, pageRowCount, detailBox, detailRows, pagerPos, portraitFit } from './CharLayout';
import { safeTop, safeBottom } from './Safe';

const C_MENU_EDGE = new Color(30, 30, 42);    // #1e1e2a
const C_MENU_MID = new Color(58, 58, 82);     // #3a3a52
const C_GOLD_TOP = new Color(255, 232, 154);
const C_GOLD_BOT = new Color(217, 154, 28);

/** 规格坐标 → Cocos 节点坐标 */
export function at(vw: number, vh: number, x: number, y: number) {
  return { x: x - vw / 2, y: vh / 2 - y };
}

/** 金币圆图标（保留旧导出：结算/商店如需程序化金币仍可调用） */
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

/** 顶部标题条（实现统一在 UIKit.screenHeader，这里只保留本站习惯的调用名） */
function titleBar(root: Node, vw: number, s: number, label: string): Node {
  return screenHeader(root, vw, s, label);
}

/** 1. 主界面 */
export function buildMenu(parent: Node, seed: number, onStart: () => void, onHowto: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const at2 = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-menu', C_MENU_EDGE);

  // 背景图：art/bg/home-bg-360x640（meta 是 type:texture，走 Assets.loadBg 的双路回退）
  const bgNode = new Node('menu-bg');
  bgNode.parent = root;
  const bgUt = bgNode.addComponent(UITransform);
  const bgK = Math.max(VW / 360, VH / 640);
  bgUt.setContentSize(360 * bgK, 640 * bgK);
  const bgSp = bgNode.addComponent(Sprite);
  bgSp.sizeMode = Sprite.SizeMode.CUSTOM;
  bgSp.trim = false;
  void Assets.loadBg('home-bg-360x640').then((sf) => {
    if (sf && bgSp.isValid) bgSp.spriteFrame = sf;
  });

  radialGlow(root, 0, at2(180, 0.3 * VH).y, VH * 0.62, C_MENU_MID, 150, 16);

  // 标题（安全区下移；字号 44 / 副标题 12）
  const t = at2(180, S + 74);
  text(root, t.x, t.y, '疯狂怪潮', { size: 44, color: COL.cream, bold: true, width: 354, outline: true, shadow: true });
  const s = at2(180, S + 120);
  text(root, s.x, s.y, 'C R A Z Y   M O N S T E R   T I D E', { size: 12, color: COL.accent, width: 354, bold: true, outline: true });

  // 主 CTA（全页最醒目）+ 次按钮
  const b1 = at2(180, S + 300);
  const btn1 = button(root, b1.x, b1.y, 268, 58, '开始游戏', { primary: true, size: 21 });
  onTap(btn1.node, onStart);
  const b2 = at2(180, S + 372);
  const btn2 = button(root, b2.x, b2.y, 268, 52, '玩法说明', { size: 18 });
  onTap(btn2.node, onHowto);

  // 页脚（版本信息 / 种子；按底部安全区定位）
  const f1 = at2(180, VH - B - 48);
  text(root, f1.x, f1.y, '4 技能 · 每技能 3 个黑科技槽 · 20 波闯关', { size: 10, color: COL.dim, width: 340 });
  text(root, f1.x, f1.y - 17, '本局种子 ' + seed + ' · 同种子奖励相同', { size: 10, color: COL.dim, width: 340 });
  return root;
}

/** 2. 玩法说明 */
export function buildHowto(parent: Node, onBack: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const at2 = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-howto', COL.bg1);

  titleBar(root, VW, S, '玩法说明');

  // 4 步图示化，一步一行卡片：序号 + 动作 + 一句解释
  const steps: [string, string][] = [
    ['按住屏幕拖动 = 走位', '松手就停；不用点技能'],
    ['技能全自动开火', '你只负责站位和躲怪'],
    ['升级三选一，越选越强', '最多 4 技能，每个 3 个黑科技槽'],
    ['撑过 20 波就赢', '每 3 波精英，第 10 / 20 波是 BOSS'],
  ];
  const CARD_H = 56, CARD_GAP = 8, PAD = 12;
  const bodyH = PAD * 2 + steps.length * CARD_H + (steps.length - 1) * CARD_GAP;
  const top = S + 82;
  const box = panel(root, 0, at2(180, top + bodyH / 2).y, 336, bodyH, { art: 'panel' });
  steps.forEach(([head, desc], i) => {
    const cy = bodyH / 2 - PAD - CARD_H / 2 - i * (CARD_H + CARD_GAP);
    const num = panel(box, -156 + 16, cy, 24, 24, { art: 'btn_primary' });
    text(num, 0, 1, String(i + 1), { size: 13, color: COL.ink, width: 22, bold: true, outline: false });
    text(box, -122, cy + 9, head, { size: 13, color: COL.cream, align: 'left', width: 296, bold: true, outline: true });
    text(box, -122, cy - 9, desc, { size: 10, color: COL.dim, align: 'left', width: 296, outline: false });
  });
  text(root, 0, at2(0, S + 82 + bodyH + 22).y, '提示：3 个同名黑科技可合成 Ⅱ（效果 ×2，只占 1 槽）',
    { size: 10, color: COL.mint, width: 336, outline: false });

  const btn = button(root, 0, -VH / 2 + B + 25, 336, 50, '返回', { size: FS.m });
  onTap(btn.node, onBack);
  return root;
}

/** 3. 角色选择 —— 3 列 × 2 行网格 + 详情 + 底部双按钮 */
export function buildCharSelect(parent: Node, onBack: () => void, onStart: (id: string) => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const at2 = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-charselect', COL.bg1);

  // 网格整体下移一个安全区（CharLayout 的坐标是"距屏幕顶"，这里统一加 S）
  // titleBar 高 62，网格顶边 70 —— 两者只差 8，所以网格再补 6px，避免卡片压住标题条
  const GRID_DY = S + 6;
  const A2 = (x: number, y: number) => at2(x, y + GRID_DY);

  screenHeader(root, VW, S, '选择角色', 62, '每个角色都有正向天赋，也有明显的负面代价');

  const pages = pageCount(CHARS.length);
  let page = 0;
  let picked = CHARS[0].id;

  let pgBtn: { node: Node; label: Label } | null = null;
  if (pages > 1) {
    const pp = pagerPos();
    const pgc = A2(pp.x, pp.y);
    pgBtn = button(root, pgc.x, pgc.y, pp.w, pp.h, '', { size: 13 });
    onTap(pgBtn.node, () => {
      page = (page + 1) % pages;
      applyPage();
      const first = page * CS.PER_PAGE;
      if (!CHARS.slice(first, first + CS.PER_PAGE).some(c => c.id === picked)) {
        picked = CHARS[first].id;
        refresh();
      }
    });
  }

  const cells: { node: Node; id: string; label: Label }[] = [];
  CHARS.forEach((ch, i) => {
    const p = cellPos(i % CS.PER_PAGE);
    const c = A2(p.x, p.cy);
    const n = panel(root, c.x, c.y, CS.CARD_W, CS.CARD_H, { art: 'panel' });
    n.active = false;

    const P = CS.PORTRAIT;
    const pn = mkNode(n, 'portrait', P, P, 0, CS.PORTRAIT_DY);
    const sp = pn.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.trim = false;
    const ut = pn.getComponent(UITransform);
    const apply = (f: SpriteFrame | null) => {
      if (!f || !sp.isValid) return;
      sp.spriteFrame = f;
      const fit = portraitFit(f.rect.width || 32, f.rect.height || 32);
      if (ut) ut.setContentSize(fit.w, fit.h);
    };
    Assets.loadPortrait(ch.unit).then(f => {
      if (f) { apply(f); return; }
      return Assets.loadUnit(ch.unit).then(c2 => {
        apply((c2.idle && c2.idle[0]) || (c2.walk && c2.walk[0]) || null);
      });
    }).catch(() => { /* 人像失败不影响选角 */ });

    const l = text(n, 0, CS.NAME_DY, ch.name, { size: FS.xs, color: COL.cream, width: CS.CARD_W - 6, bold: true, outline: true });
    cells.push({ node: n, id: ch.id, label: l });
    onTap(n, () => { picked = ch.id; refresh(); });
  });

  function applyPage() {
    const rowsUsed = pageRowCount(CHARS.length, page);
    cells.forEach((c, i) => {
      const onPage = Math.floor(i / CS.PER_PAGE) === page;
      c.node.active = onPage;
      if (onPage) {
        const p = cellPosPaged(i - page * CS.PER_PAGE, rowsUsed);
        const q = A2(p.x, p.cy);
        c.node.setPosition(q.x, q.y, 0);
      }
    });
    if (pgBtn) pgBtn.label.string = (page + 1) + '/' + pages + ' ›';
  }

  // 详情面板：顶边跟网格走、底边让开安全区与底部按钮
  const dbox = detailBox(VH - GRID_DY - B);
  const dr = detailRows(dbox.height);
  const dc = A2(180, dbox.top + dbox.height / 2);
  const detail = panel(root, dc.x, dc.y, 336, dbox.height, { art: 'panel' });
  const dName = text(detail, -156, dr.name.y, '', { size: dr.name.size, color: COL.accent, align: 'left', width: 312, bold: true, outline: true, shadow: true });
  const dPos = text(detail, -156, dr.pos.y, '', { size: dr.pos.size, color: COL.mint, align: 'left', width: 312, bold: true, outline: true });
  const dNeg = text(detail, -156, dr.neg.y, '', { size: dr.neg.size, color: COL.red, align: 'left', width: 312, bold: true, outline: true });
  const skBox = panel(detail, 0, dr.skill.y, 304, dr.skill.h, { art: 'well' });
  const skD = dr.compact ? 24 : 30;
  const skIcon = mkNode(skBox, 'skIcon', skD, skD, -130, 0);
  const skSp = skIcon.addComponent(Sprite);
  skSp.sizeMode = Sprite.SizeMode.CUSTOM; skSp.trim = false;
  const skTxt = text(skBox, -108, 1, '', { size: dr.compact ? 12 : 14, color: COL.cream, align: 'left', width: 180, bold: true, outline: true });
  const dStat = text(detail, 0, dr.stat.y, '', { size: dr.stat.size, color: COL.dim, width: 312 });

  function refresh() {
    for (const cell of cells) {
      const on = cell.id === picked;
      // 选中态：青色描边 + 提亮底（不只靠文字颜色，缩小到 1/3 屏也能一眼看出）
      paintPanel(cell.node, CS.CARD_W, CS.CARD_H, { art: on ? 'card_sel' : 'panel' });
      cell.label.color = on ? COL.accent : COL.cream;
    }
    const ch = CHARS.find(x => x.id === picked)!;
    dName.string = ch.name;
    dPos.string = '＋ ' + ch.pos;
    dNeg.string = '－ ' + ch.neg;
    skTxt.string = '初始技能：' + (SKILLS[ch.start] ? SKILLS[ch.start].name : ch.start);
    const art = SKILL_ART[ch.start];
    if (art && art.icon) {
      const setIt = () => {
        const f = iconFrame(art.icon!);
        if (f && skSp.isValid) { skSp.spriteFrame = f; }
        return !!f;
      };
      if (!setIt()) void loadIcon(art.icon).then(() => { setIt(); });
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

  // 底部：返回(96) + 开始闯关(232)，让开底部安全区
  const by = -VH / 2 + B + 25;
  const back = button(root, at2(12 + 48, 0).x, by, 96, 50, '返回', { size: 15 });
  onTap(back.node, onBack);
  const go = button(root, at2(116 + 116, 0).x, by, 232, 50, '开始闯关', { primary: true, size: 17 });
  onTap(go.node, () => onStart(picked));
  applyPage();
  refresh();
  return root;
}

/** 结算页的 Build 行（带技能图标） */
export interface ResultBuildRow { icon: string; name: string; sub: string }

/** 4. 结算 */
export function buildResult(parent: Node,
                            stats: { win: boolean; wave: number; lv: number; kills: number; time: number;
                                     build: ResultBuildRow[]; gold?: number; seed?: number;
                                     waveTotal?: number; endless?: boolean },
                            onMenu: () => void, onRetry: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const at2 = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-result', COL.bg1);

  titleBar(root, VW, S, '结算');

  // 结果大字
  const big = stats.win ? '通关！' : '倒下';
  const bt = at2(180, S + 86);
  text(root, bt.x, bt.y, big, {
    size: 38, color: stats.win ? COL.mint : COL.red, bold: true, width: 354, outline: true, shadow: true,
  });
  const sub = at2(180, S + 122);
  text(root, sub.x, sub.y, stats.win ? '本局全部波次已清空' : '再撑久一点，下一局会更强',
    { size: 11, color: COL.dim, width: 340 });

  // 4 个统计卡（2x2）—— 规格 §9：只展示真实存在的数据
  const waveLine = stats.win
    ? (stats.waveTotal ?? 20) + '/' + (stats.waveTotal ?? 20) + ' 波'
    : '第 ' + Math.min(stats.wave, stats.waveTotal ?? 20) + '/' + (stats.waveTotal ?? 20) + ' 波' + (stats.endless ? '（无尽）' : '');
  const cards: [string, string][] = [
    ['存活时间', stats.time.toFixed(1) + ' s'],
    ['击杀数', String(stats.kills)],
    ['最高等级', 'Lv.' + stats.lv],
    ['波次', waveLine],
  ];
  const CW = 163, CH = 60, GAP = 10;
  cards.forEach(([k, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const c = at2(12 + CW / 2 + col * (CW + GAP), S + 152 + CH / 2 + row * (CH + GAP));
    const card = panel(root, c.x, c.y, CW, CH, { art: 'panel_soft' });
    text(card, 0, 14, k, { size: 10, color: COL.dim, width: CW - 16 });
    text(card, 0, -10, v, { size: 18, color: COL.cream, width: CW - 16, bold: true, outline: true });
  });

  // 金币 / 种子（小字，不抢统计卡）
  const extra = at2(180, S + 152 + CH * 2 + GAP + 18);
  text(root, extra.x, extra.y, '金币 ' + (stats.gold ?? 0) + '   ·   种子 ' + (stats.seed ?? ''),
    { size: 10, color: COL.dim, width: 336 });

  // 本局构筑
  const listTop = S + 152 + CH * 2 + GAP + 40;
  const bh = at2(12, listTop);
  text(root, bh.x, bh.y, '本局构筑', { size: 13, color: COL.accent, align: 'left', width: 312, bold: true, outline: true });
  const rowsTop = listTop + 22;
  const availH = (VH - B - 60) - rowsTop;
  const maxRows = Math.max(1, Math.floor(availH / 42));
  const list = stats.build.slice(0, maxRows);
  if (list.length) {
    list.forEach((r, i) => {
      const c = at2(180, rowsTop + i * 42 + 19);
      const row = panel(root, c.x, c.y, 336, 38, { art: 'panel' });
      const ic = mkNode(row, 'ic', 26, 26, -146, 0);
      const isp = ic.addComponent(Sprite);
      isp.sizeMode = Sprite.SizeMode.CUSTOM; isp.trim = false;
      if (r.icon) {
        const f = iconFrame(r.icon);
        if (f) { isp.spriteFrame = f; }
        else { void loadIcon(r.icon).then(() => { const g2 = iconFrame(r.icon); if (g2 && isp.isValid) isp.spriteFrame = g2; }); }
      }
      text(row, -126, 0, r.name, { size: FS.s, color: COL.cream, align: 'left', width: 150, bold: true, outline: true });
      text(row, 152, 0, r.sub, { size: FS.xs, color: COL.dim, align: 'right', width: 190 });
    });
  } else {
    text(root, at2(12, rowsTop + 10).x, at2(12, rowsTop + 10).y, '· 没有收获',
      { size: FS.xs, color: COL.dim, align: 'left', width: 312 });
  }

  // 底部：主界面(96) + 再来一局(232)
  const byy = -VH / 2 + B + 25;
  const m = button(root, at2(12 + 48, 0).x, byy, 96, 50, '主界面', { size: 14 });
  onTap(m.node, onMenu);
  const r2 = button(root, at2(116 + 116, 0).x, byy, 232, 50, '再来一局', { primary: true, size: 17 });
  onTap(r2.node, onRetry);
  return root;
}
