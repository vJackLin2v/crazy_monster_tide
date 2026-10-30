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
import { CS, pageCount, cellPos, cellPosPaged, pageRowCount, gridBottom, detailBox, detailRows, pagerPos, portraitFit } from './CharLayout';
import { freshStats } from '../game/Stats';
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
export function buildMenu(parent: Node, seed: number, onStart: () => void, onHowto: () => void,
                        onCodex: () => void, onAchievements: () => void, onSettings: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const at2 = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-menu', COL.bg1);

  // ── 背景：cover 缩放（不拉伸），失败不阻塞 ──
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

  // ── 上下暗角：用等宽色带模拟渐变（像素风不用模糊阴影），把标题/按钮从背景里托出来 ──
  const vig = mkNode(root, 'menu-vignette', VW, VH);
  const vg = vig.addComponent(Graphics);
  const VB = 8, vh0 = VH * 0.30 / VB;
  for (let i = 0; i < VB; i++) {
    const a = Math.round(160 * Math.pow(1 - i / VB, 2));
    vg.fillColor = new Color(9, 14, 30, a);
    vg.rect(-VW / 2, VH / 2 - (i + 1) * vh0, VW, vh0 + 0.5); vg.fill();   // 顶部
    vg.fillColor = new Color(9, 14, 30, a);
    vg.rect(-VW / 2, -VH / 2 + i * vh0, VW, vh0 + 0.5); vg.fill();        // 底部
  }

  // ── 标题区（从安全区往下排）──
  // 用户 2026-10-30：标题整体下移 24px（原来贴得太靠上）
  text(root, 0, at2(180, S + 84).y, '疯狂鸽王',
    { size: 40, color: COL.cream, bold: true, width: 354, outline: true, shadow: true });
  text(root, 0, at2(180, S + 124).y, 'C R A Z Y   P I G E O N   K I N G',
    { size: 10, color: COL.accent, width: 354, bold: true, outline: true });
  // （用户 2026-10-30：去掉标题下那行小字，按钮整体上移）
  // ── 底部动作栈：**底部留白 = 标题上方留白**（用户要求上下呼吸感一致）
  //    640 参考：标题上沿 68 / CTA 398 / 次按钮 466 / 图标行 544 / 底部留白 68
  const topGap = S + 40;                 // 标题上沿到屏幕顶的距离
  // 用户 2026-10-30：按钮整体上移，块心落在屏高约 66%（居中偏下）
  const LIFT = 100;   // 用户 2026-10-30：按钮再上移 28px
  const iconRowY = VH - topGap - 28 - LIFT;   // 图标行中心（高 56）
  const subBtnY = iconRowY - 78;
  const ctaY = subBtnY - 68;

  // ── CTA：主按钮是全页唯一"橙" ──
  const b1 = at2(180, ctaY);
  const btn1 = button(root, b1.x, b1.y, 276, 56, '开始游戏', { primary: true, size: 21 });
  onTap(btn1.node, onStart);
  const b2 = at2(180, subBtnY);
  const btn2 = button(root, b2.x, b2.y, 276, 46, '玩法说明', { size: 17 });
  onTap(btn2.node, onHowto);

  // ── 次级入口：图鉴 / 成就 / 设置（每个 104×56，热区 >=44）──
  const ENTRIES: [string, () => void][] = [['图鉴', onCodex], ['成就', onAchievements], ['设置', onSettings]];
  const EW = 104, EGAP = 8;
  ENTRIES.forEach(([label, cb], i) => {
    const cx = 180 - (EW + EGAP) + i * (EW + EGAP);
    const c = at2(cx, iconRowY);
    const b = button(root, c.x, c.y, EW, 56, label, { size: 15 });
    onTap(b.node, cb);
  });

  void seed;   // 页脚不再显示种子（用户要求去掉底部小字）
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
    // 序号 26（规格 26–28）、标题 15、解释 11
    const num = panel(box, -156 + 17, cy, 26, 26, { art: 'btn_primary' });
    text(num, 0, 1, String(i + 1), { size: 14, color: COL.ink, width: 24, bold: true, outline: false });
    text(box, -120, cy + 9, head, { size: 15, color: COL.cream, align: 'left', width: 294, bold: true, outline: true });
    text(box, -120, cy - 10, desc, { size: 11, color: COL.dim, align: 'left', width: 294, outline: false });
  });
  // P2-B：合成规则从"弱提示"升级成一条规则条（336×34，11px），但仍不与返回键碰撞
  const hintY = S + 82 + bodyH + 26;
  const hintC = at2(180, hintY);
  const bar = panel(root, hintC.x, hintC.y, 336, 34, { art: 'panel_soft' });
  text(bar, 0, 1, '合成规则：3 个同名黑科技 → Ⅱ 级（效果 ×2，只占 1 槽）',
    { size: 11, color: COL.mint, width: 324, outline: false });

  const btn = button(root, 0, -VH / 2 + B + 25, 336, 50, '返回', { size: FS.m });
  onTap(btn.node, onBack);
  return root;
}

/** 3. 角色选择 —— 3 列 × 2 行网格 + 四段式详情（M1 视觉升级） */
export function buildCharSelect(parent: Node, onBack: () => void, onStart: (id: string) => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const at2 = (x: number, y: number) => at(VW, VH, x, y);
  const S = safeTop(), B = safeBottom();
  const root = screen(parent, 'scr-charselect', COL.bg1);

  // 网格 + 详情卡作为一个整体块；剩余高度对半分给上下 → 整块在"标题条 ~ 按钮"之间垂直居中
  // （矮屏几乎不偏移；长屏不会把一大块空白全堆在按钮前面）
  const baseDy = S + 6;
  const dbox = detailBox(VH - baseDy - B);
  const gridH = gridBottom() - CS.GRID_TOP;
  const blockH = gridH + CS.DETAIL_GAP + dbox.height;
  const buttonsTop = VH - B - 60;
  const free = Math.max(0, buttonsTop - 12 - (baseDy + CS.GRID_TOP + blockH));
  const GRID_DY = baseDy + free / 2;
  const A2 = (x: number, y: number) => at2(x, y + GRID_DY);

  screenHeader(root, VW, S, '选择角色', 58, '选择你的战斗风格');

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

  const cells: { node: Node; id: string; label: Label; badge: Node }[] = [];
  CHARS.forEach((ch, i) => {
    const p = cellPos(i % CS.PER_PAGE);
    const c = A2(p.x, p.cy);
    const n = panel(root, c.x, c.y, CS.CARD_W, CS.CARD_H, { art: 'panel' });
    n.active = false;

    // 立绘：portrait.png（已裁透明留白）按整数倍放大，失败退回 idle 首帧
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

    const l = text(n, 0, CS.NAME_DY, ch.name, {
      size: 12, color: COL.cream, width: CS.CARD_W - 6, bold: true, outline: true,
    });

    // 选中徽标：青底 + 勾，形状与颜色双通道（不只靠描边色）
    const badge = mkNode(n, 'selBadge', 18, 18, CS.CARD_W / 2 - 11, CS.CARD_H / 2 - 11);
    const bg = badge.addComponent(Graphics);
    bg.fillColor = COL.select;
    bg.rect(-9, -9, 18, 18); bg.fill();
    bg.lineWidth = 2; bg.strokeColor = COL.inkLine;
    bg.rect(-9, -9, 18, 18); bg.stroke();
    text(badge, 0, 1, '✓', { size: 11, color: COL.ink, width: 16, bold: true, outline: false });
    badge.active = false;

    cells.push({ node: n, id: ch.id, label: l, badge });
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

  // ── 详情面板：名称 / 正负天赋 / 初始技能 / 属性网格（四段式）──
  const dr = detailRows(dbox.height);
  const dc = A2(180, dbox.top + dbox.height / 2);
  const detail = panel(root, dc.x, dc.y, 336, dbox.height, { art: 'panel' });

  const dName = text(detail, -158, dr.name.y, '', {
    size: dr.name.size, color: COL.accent, align: 'left', width: 300, bold: true, outline: true, shadow: true,
  });

  // 天赋行：18×18 色标（＋/－）+ 文本 —— 颜色 + 形状双通道
  const talentRow = (cy: number, mark: string, col: Color): Label => {
    const b = mkNode(detail, 'talBadge', 18, 18, -150, cy);
    const g = b.addComponent(Graphics);
    g.fillColor = col;
    g.rect(-9, -9, 18, 18); g.fill();
    g.lineWidth = 2; g.strokeColor = COL.inkLine;
    g.rect(-9, -9, 18, 18); g.stroke();
    text(b, 0, 1, mark, { size: 12, color: COL.ink, width: 16, bold: true, outline: false });
    return text(detail, -134, cy, '', { size: dr.pos.size, color: col, align: 'left', width: 286, bold: true, outline: true });
  };
  const dPos = talentRow(dr.pos.y, '＋', COL.mint);
  const dNeg = talentRow(dr.neg.y, '－', COL.red);

  // 初始技能行
  const skBox = panel(detail, 0, dr.skill.y, 312, dr.skill.h, { art: 'well' });
  const skIcon = mkNode(skBox, 'skIcon', 28, 28, -136, 0);
  const skSp = skIcon.addComponent(Sprite);
  skSp.sizeMode = Sprite.SizeMode.CUSTOM; skSp.trim = false;
  const skTxt = text(skBox, -114, 0, '', { size: 13, color: COL.cream, align: 'left', width: 196, bold: true, outline: true });
  text(skBox, 150, 0, '初始技能', { size: 10, color: COL.dim, align: 'right', width: 78, outline: false });

  // 属性网格：3 列 × 2 行（数值用角色开局真实属性，只读，不改玩法）
  const CELL_W = 100, CELL_H = 26, CGX = 6, CGY = 8;
  const attrCells: { name: Label; val: Label }[] = [];
  for (let i = 0; i < 6; i++) {
    const col = i % 3, row = Math.floor(i / 3);
    const cx = -156 + CELL_W / 2 + col * (CELL_W + CGX);
    const cy = dr.stat.y + (CELL_H + CGY) / 2 - row * (CELL_H + CGY);
    const cell = panel(detail, cx, cy, CELL_W, CELL_H, { art: 'panel_soft' });
    const nm = text(cell, -CELL_W / 2 + 6, 0, '', { size: 10, color: COL.dim, align: 'left', width: 50, outline: false });
    const vv = text(cell, CELL_W / 2 - 6, 0, '', { size: 12, color: COL.cream, align: 'right', width: 52, bold: true, outline: false });
    attrCells.push({ name: nm, val: vv });
  }

  function refresh() {
    for (const cell of cells) {
      const on = cell.id === picked;
      // 选中：青色描边 + 提亮底 + 右上勾选徽标（三层证据）
      paintPanel(cell.node, CS.CARD_W, CS.CARD_H, { art: on ? 'card_sel' : 'panel' });
      cell.label.color = COL.cream;
      cell.badge.active = on;
    }
    const ch = CHARS.find(x => x.id === picked)!;
    dName.string = ch.name;
    dPos.string = ch.pos;
    dNeg.string = ch.neg;
    skTxt.string = SKILLS[ch.start] ? SKILLS[ch.start].name : ch.start;
    const art = SKILL_ART[ch.start];
    if (art && art.icon) {
      const setIt = () => {
        const f = iconFrame(art.icon!);
        if (f && skSp.isValid) { skSp.spriteFrame = f; }
        return !!f;
      };
      if (!setIt()) void loadIcon(art.icon).then(() => { setIt(); });
    } else skSp.spriteFrame = null;

    // 六项核心属性：攻击 / 移速 / 生命 / 暴击 / 回血 / 拾取（角色开局真实值）
    const st = freshStats(ch);
    const names = ['攻击', '移速', '生命', '暴击', '回血', '拾取'];
    const vals = [
      '×' + st.power.toFixed(1),
      String(Math.round(st.speed)),
      String(Math.round(st.maxhp)),
      Math.round(st.crit * 100) + '%',
      st.regen.toFixed(1) + '/s',
      String(Math.round(st.pickup)),
    ];
    attrCells.forEach((c, i) => { c.name.string = names[i]; c.val.string = vals[i]; });
  }

  // 底部：返回(96) + 开始闯关(232)，让开底部安全区
  const by = -VH / 2 + B + 25;
  const back = button(root, at2(12 + 48, 0).x, by, 96, 48, '返回', { size: 15 });
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
                                     waveTotal?: number; endless?: boolean; maxAlive?: number;
                                     items?: { name: string; icon?: string; count: number }[];
  skills?: { name: string; icon?: string; mods: number }[] },
                            onMenu: () => void, onRetry: () => void,
                            onContinue?: () => void): Node {
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
  const CW = 158, CH = 58, GAP = 8;      // 规格：2×2 统计卡 158×58–64，间距 8
  cards.forEach(([k, v], i) => {
    const col = i % 2, row = Math.floor(i / 2);
    const c = at2(12 + CW / 2 + col * (CW + GAP), S + 152 + CH / 2 + row * (CH + GAP));
    const card = panel(root, c.x, c.y, CW, CH, { art: 'panel_soft' });
    text(card, 0, 14, k, { size: 10, color: COL.dim, width: CW - 16 });
    text(card, 0, -10, v, { size: 22, color: COL.cream, width: CW - 16, bold: true, outline: true });
  });

  // 本局技能：4 个技能图标 + 每个技能已装黑科技数（x/3）
  const sk = stats.skills ?? [];
  const skillTop = S + 152 + CH * 2 + GAP + 18;
  if (sk.length) {
    text(root, at2(12, skillTop).x, at2(12, skillTop).y, '本局技能',
      { size: 11, color: COL.accent, align: 'left', width: 200, bold: true, outline: true });
    const SC = 34, SGAP = 8, SCOLS = 4;
    sk.slice(0, SCOLS).forEach((s, i) => {
      const cx = 180 - (SCOLS * (SC + SGAP) - SGAP) / 2 + SC / 2 + i * (SC + SGAP);
      const c2 = at2(cx, skillTop + 16 + SC / 2);
      const cell = panel(root, c2.x, c2.y, SC, SC, { art: 'slot' });
      if (s.icon) {
        const n = mkNode(cell, 'ic', SC - 10, SC - 10);
        const sp = n.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.trim = false;
        const f = iconFrame(s.icon);
        if (f) sp.spriteFrame = f;
        else void loadIcon(s.icon).then(() => { const g3 = iconFrame(s.icon); if (g3 && sp.isValid) sp.spriteFrame = g3; });
      }
      // 已装数量：贴右上角小徽章（原来放在底部压住图标）
      const badge = mkNode(cell, 'modBadge', 18, 12, SC / 2 - 8, SC / 2 - 6);
      const bg2 = badge.addComponent(Graphics);
      bg2.fillColor = new Color(16, 20, 30, 220); bg2.rect(-9, -6, 18, 12); bg2.fill();
      text(badge, 0, 0, String(s.mods), { size: 9, color: COL.accent, width: 18, bold: true, outline: false });
    });
  }

  // 本局道具（技能区存在时整体下移）
  const extra = at2(180, skillTop + (sk.length ? 46 : 0));
  // 用户 2026-10-30：去掉种子/同屏峰值，改成展示本局拿到的道具
  const got = stats.items ?? [];
  if (got.length) {
    text(root, at2(12, extra.y).x, at2(12, extra.y).y, '本局道具 ' + got.length,
      { size: 11, color: COL.accent, align: 'left', width: 200, bold: true, outline: true });
    const CELL = 30, CGAP = 6, COLS = 9;
    got.slice(0, COLS).forEach((it, i) => {
      const col = i % COLS, rowi = Math.floor(i / COLS);
      const cc = at2(180 - (COLS * (CELL + CGAP) - CGAP) / 2 + CELL / 2 + col * (CELL + CGAP),
        extra.y + 26 + rowi * (CELL + CGAP));
      void rowi;
      const box = panel(root, cc.x, cc.y, CELL, CELL, { art: 'slot' });
      if (it.icon) {
        const n = mkNode(box, 'ic', CELL - 8, CELL - 8);
        const sp = n.addComponent(Sprite);
        sp.sizeMode = Sprite.SizeMode.CUSTOM; sp.trim = false;
        const f = iconFrame(it.icon);
        if (f) sp.spriteFrame = f;
        else void loadIcon(it.icon).then(() => { const g2 = iconFrame(it.icon); if (g2 && sp.isValid) sp.spriteFrame = g2; });
      }
      if (it.count > 1) {
        text(box, CELL / 2 - 2, -CELL / 2 + 6, '×' + it.count,
          { size: 9, color: COL.accent, align: 'right', width: CELL - 4, bold: true, outline: false });
      }
    });
    if (got.length > COLS) {
      text(root, at2(348, extra.y + 26).x, at2(348, extra.y + 26).y,
        '+' + (got.length - COLS), { size: 10, color: COL.dim, align: 'right', width: 60 });
    }
  }

  // 本局构筑
  // 有道具时「本局构筑」要往下让一行（用户 2026-10-30 加的道具展示）
  const listTop = extra.y + 20 + ((stats.items?.length ?? 0) > 0 ? 34 : 0);
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
      text(row, 152, 0, r.sub, { size: 10, color: COL.dim, align: 'right', width: 190 });
    });
  } else {
    text(root, at2(12, rowsTop + 10).x, at2(12, rowsTop + 10).y, '· 没有收获',
      { size: FS.xs, color: COL.dim, align: 'left', width: 312 });
  }
  // 列表被可用高度截断时必须说清楚，别让玩家以为只有这几行
  if (stats.build.length > list.length) {
    const moreY = rowsTop + list.length * 42 + 4;
    text(root, at2(12, moreY).x, at2(12, moreY).y,
      '仅显示前 ' + list.length + ' 项（共 ' + stats.build.length + ' 项）',
      { size: 10, color: COL.dim, align: 'left', width: 336 });
  }

  // 底部：主界面(96) + 再来一局；通关且 onContinue 存在时变成三按钮 96/96/128
  const byy = -VH / 2 + B + 25;
  const m = button(root, at2(12 + 48, 0).x, byy, 96, 50, '主界面', { size: 13 });
  onTap(m.node, onMenu);
  if (onContinue) {
    const again = button(root, at2(116 + 48, 0).x, byy, 96, 50, '再来一局', { size: 13 });
    onTap(again.node, onRetry);
    const go = button(root, at2(220 + 64, 0).x, byy, 128, 50, '继续 · 无尽', { primary: true, size: 15 });
    onTap(go.node, onContinue);
  } else {
    const r2 = button(root, at2(116 + 116, 0).x, byy, 232, 50, '再来一局', { primary: true, size: 17 });
    onTap(r2.node, onRetry);
  }
  return root;
}
