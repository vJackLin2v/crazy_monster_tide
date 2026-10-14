/**
 * 入口流程屏幕 —— 采用参考 Möbelmon 的**彩色横幅**设计语言
 *
 * 规格来自 18 张参考截图的像素量测（docs/ui/reference-library/mobelmon-analysis.md）：
 *   菜单/标题类横幅高 35.6~40.4%，列表类 16.5~18.6%，底部按钮栏 6.8%
 *   橙 #F8A048 / #F89038，紫 #7048A8，薄荷 #70C0A8
 *   橙底配**深色字**（不是白字）
 *
 * ⚠️ 横幅必须锚定 `view.getVisibleSize()`，不能按写死的 640 定位（见 KI-009 的教训）。
 */
import { Node, Label, Color, Graphics, UITransform, view } from 'cc';
import { panel, text, button, onTap, mkNode, screen, banner, bottomBar } from './UIKit';
import { COL, FS, R, BAND, SAFE_TOP } from './Tokens';
import { CHARS } from '../data/Chars';
import { SKILLS } from '../data/Skills';

/** 顶部横幅：返回 (节点, 横幅底边的 design y) */
function heroBanner(root: Node, ratio: number, color: Color, title: string, sub?: string) {
  const vs = view.getVisibleSize();
  const top = vs.height / 2;
  const h = Math.round(vs.height * ratio);
  const b = banner(root, top, h, color);
  const ty = top - h / 2 + (sub ? 10 : 0);
  text(b, 0, ty, title, { size: FS.xl, color: BAND.ink, bold: true, width: 340 });
  if (sub) text(b, 0, ty - 30, sub, { size: FS.s, color: new Color(32, 22, 10, 190), width: 340 });
  return { node: b, bottomY: top - h };
}

/** 1. 主界面：橙色背景 + 标题 + 按钮 */
export function buildMenu(parent: Node, seed: number, onStart: () => void, onHowto: () => void): Node {
  const root = screen(parent, 'scr-menu', COL.bg1);
  const vs = view.getVisibleSize();
  const top = vs.height / 2, bot = -vs.height / 2;

  // 顶部 36% 橙色横幅（参考 screen-13/15：35.6%）
  // 横幅加大到 40%（参考 screen-07 是 40.4%）
  const hb = heroBanner(root, 0.40, BAND.top, '疯狂怪潮', 'CRAZY MONSTER TIDE');
  text(hb.node, 0, hb.bottomY + 40, '像素肉鸽 · 割草 · 行为模块', { size: FS.s, color: BAND.ink, width: 340 });

  // 内容**紧贴横幅往下排**（参考 screen-13 内容从横幅下沿立刻开始，不是垂直居中）
  const by = hb.bottomY - 52;
  const b1 = button(root, 0, by, 250, 62, '开始游戏', { primary: true, size: FS.l });
  onTap(b1.node, onStart);
  const b2 = button(root, 0, by - 80, 250, 56, '玩法说明', { size: FS.m });
  onTap(b2.node, onHowto);

  // 底部信息卡，把下方空间用起来（参考里菜单底部也有内容）
  const info = panel(root, 0, bot + SAFE_TOP + 52, 300, 92, { bg: COL.bg2, line: COL.line, radius: R.m });
  text(info, 0, 20, '20 波闯关 · 4 技能 × 各 3 行为槽位', { size: FS.xs, color: COL.cream, width: 290 });
  text(info, 0, -6, '自动攻击，你只负责走位', { size: FS.xs, color: COL.mint, width: 290 });
  text(info, 0, -30, 'seed ' + seed, { size: FS.xs, color: COL.line2, width: 290 });
  return root;
}

/** 2. 玩法说明 */
export function buildHowto(parent: Node, onBack: () => void): Node {
  const root = screen(parent, 'scr-howto', COL.bg1);
  const vs = view.getVisibleSize(); const bot = -vs.height / 2;
  const hb = heroBanner(root, 0.26, BAND.top, '玩法说明');

  const boxTop = hb.bottomY - 20;
  const lines = [
    '· 自动攻击：你只负责走位，技能会自动开火',
    '· 每个技能最多装 3 个「行为模块」',
    '· 同一个模块可以重复装，效果按规则叠加',
    '· 模块靠兼容性决定能装到哪个技能上',
    '· 20 波闯关，每 3 波出精英，每 10 波出 BOSS',
    '· 撑过 20 波后可以选择「继续」玩无尽',
    '· 升级时 3 选 1；技能满 4 个后可以替换',
    '· 波间商店有 4 个货位，可锁定留到下一波',
  ];
  const boxH = lines.length * 30 + 50;
  const box = panel(root, 0, boxTop - boxH / 2, 332, boxH, { bg: COL.bg2, line: COL.line, radius: R.l });
  lines.forEach((s, i) => text(box, -150, boxH / 2 - 32 - i * 30, s, { size: FS.s, color: COL.cream, align: 'left', width: 300 }));
  text(box, 0, -boxH / 2 + 20, '目标：搭出你自己的技能组合', { size: FS.xs, color: COL.mint, width: 300 });

  const b = button(root, 0, bot + SAFE_TOP + 26, 200, 50, '返回', { size: FS.m });
  onTap(b.node, onBack);
  return root;
}

/** 3. 角色选择：横幅 + 3x2 网格 + 详情 */
export function buildCharSelect(parent: Node, onBack: () => void, onStart: (id: string) => void): Node {
  const root = screen(parent, 'scr-charselect', COL.bg1);
  const vs = view.getVisibleSize(); const bot = -vs.height / 2;
  const hb = heroBanner(root, BAND.hList, BAND.top, '选择角色');

  let picked = CHARS[0].id;
  const cells: { node: Node; id: string; label: Label }[] = [];

  const gridTop = hb.bottomY - 18;
  const CW = 106, CHh = 70, GX = 110, GY = 80;
  CHARS.forEach((ch, i) => {
    const col = i % 3, row = Math.floor(i / 3);
    const x = (col - 1) * GX, y = gridTop - CHh / 2 - row * GY;
    const n = panel(root, x, y, CW, CHh, { bg: COL.bg3, line: COL.line2, radius: R.m });
    const l = text(n, 0, 0, ch.name, { size: FS.s, color: COL.cream, width: CW - 8 });
    cells.push({ node: n, id: ch.id, label: l });
    onTap(n, () => { picked = ch.id; refresh(); });
  });

  // 详情面板放在「网格以下 ~ 按钮以上」的正中，并加大到 190 高（原来只有 130，下方空 250px）
  const btnY = bot + SAFE_TOP + 24;
  // 详情面板紧贴网格下方，并加高到填满到按钮上方
  const dTop = gridTop - 2 * GY + (CHh / 2) - 14;
  const DH = Math.max(180, dTop - (btnY + 34) - 12);
  const detail = panel(root, 0, dTop - DH / 2, 332, DH, { bg: COL.bg2, line: COL.line, radius: R.l });
  const dName = text(detail, -150, DH / 2 - 30, '', { size: FS.l, color: COL.accent, align: 'left', width: 300, bold: true });
  const dPos = text(detail, -150, DH / 2 - 74, '', { size: FS.s, color: COL.mint, align: 'left', width: 300 });
  const dNeg = text(detail, -150, DH / 2 - 108, '', { size: FS.s, color: COL.red, align: 'left', width: 300 });
  const dSkill = text(detail, -150, -DH / 2 + 74, '', { size: FS.m, color: COL.cream, align: 'left', width: 300, bold: true });
  // 补属性行，避免面板下半发空（也让选角色时有依据）
  const dStat = text(detail, 0, -DH / 2 + 40, '', { size: FS.xs, color: COL.line2, width: 300 });

  function refresh() {
    for (const c of cells) { paintCell(c.node, c.id === picked); c.label.color = c.id === picked ? BAND.ink : COL.cream; }
    const ch = CHARS.find(x => x.id === picked)!;
    dName.string = ch.name;
    dPos.string = '＋ ' + ch.pos;
    dNeg.string = '－ ' + ch.neg;
    dSkill.string = '初始技能：' + (SKILLS[ch.start] ? SKILLS[ch.start].name : ch.start);
    const st = ch.stats || {};
    const bits: string[] = [];
    if (st.power !== undefined) bits.push('攻击 ×' + st.power);
    if (st.speedMul !== undefined) bits.push('移速 ×' + st.speedMul);
    if (st.maxhp !== undefined) bits.push('生命 ' + st.maxhp);
    if (st.crit !== undefined) bits.push('暴击 ' + Math.round(st.crit * 100) + '%');
    if (st.regen !== undefined) bits.push('回血 ' + st.regen + '/s');
    if (st.pickupMul !== undefined) bits.push('拾取 ×' + st.pickupMul);
    dStat.string = bits.join('   ');
  }

  const back = button(root, -76, btnY, 132, 48, '返回', { size: FS.m });
  onTap(back.node, onBack);
  const go = button(root, 82, btnY, 152, 52, '开始闯关', { primary: true, size: FS.m });
  onTap(go.node, () => onStart(picked));
  refresh();
  return root;
}

function paintCell(n: Node, on: boolean) {
  const g = n.getComponent(Graphics); const ut = n.getComponent(UITransform);
  if (!g || !ut) return;
  const w = ut.contentSize.width, h = ut.contentSize.height;
  g.clear();
  g.fillColor = COL.shadow; g.roundRect(-w / 2, -h / 2 - 3, w, h, R.m); g.fill();
  g.fillColor = on ? BAND.top : COL.bg3; g.roundRect(-w / 2, -h / 2, w, h, R.m); g.fill();
  g.lineWidth = 2; g.strokeColor = on ? BAND.bottom : COL.line2; g.roundRect(-w / 2, -h / 2, w, h, R.m); g.stroke();
}

/** 11. 结算：横幅（胜橙 / 败红）+ 统计 + 按钮 */
export function buildResult(parent: Node, stats: { win: boolean; wave: number; lv: number; kills: number; time: number; build: string[] },
                            onMenu: () => void, onRetry: () => void): Node {
  const root = screen(parent, 'scr-result', COL.bg1);
  const vs = view.getVisibleSize(); const bot = -vs.height / 2;
  const hb = heroBanner(root, 0.30, stats.win ? BAND.top : COL.red, stats.win ? '通关！' : '阵亡');

  const btnY2 = bot + SAFE_TOP + 26;
  const boxH = 230;
  const boxMid = (hb.bottomY + btnY2 + 26) / 2;
  const box = panel(root, 0, boxMid, 324, boxH, { bg: COL.bg2, line: COL.line, radius: R.l });
  const rows: [string, string][] = [
    ['到达波次', String(stats.wave)],
    ['等级', 'Lv.' + stats.lv],
    ['击杀', String(stats.kills)],
    ['用时', Math.floor(stats.time / 60) + '分' + Math.floor(stats.time % 60) + '秒'],
  ];
  rows.forEach(([k, v], i) => {
    text(box, -140, 82 - i * 36, k, { size: FS.s, color: COL.line2, align: 'left', width: 150 });
    text(box, 140, 82 - i * 36, v, { size: FS.m, color: COL.cream, align: 'right', width: 150, bold: true });
  });
  text(box, 0, -84, '本局 Build', { size: FS.xs, color: COL.mint, width: 280 });
  text(box, 0, -108, stats.build.slice(0, 3).join('  ') || '—', { size: FS.s, color: COL.cream, width: 300 });

  const m = button(root, -76, btnY2, 132, 50, '主界面', { size: FS.m });
  onTap(m.node, onMenu);
  const r = button(root, 82, btnY2, 152, 52, '再来一局', { primary: true, size: FS.m });
  onTap(r.node, onRetry);
  return root;
}
