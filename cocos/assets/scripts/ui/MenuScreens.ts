/**
 * 入口流程的屏幕 —— 规格 §2：
 *   1 主界面 `scr-menu` / 2 玩法说明 `scr-howto` / 3 角色选择 `scr-charselect` / 11 结算 `scr-result`
 *
 * ⚠️ 每个屏幕只负责"画 + 回调"，不做流程决策（流程在 GameRoot/Flow 里）。
 *    这样以后改流程不用动这些屏幕。
 */
import { Node, Label, Color, Graphics, UITransform } from 'cc';
import { panel, bar, text, button, onTap, mkNode, screen, whiteFrame } from './UIKit';
import { COL, FS, R, SP, SAFE_TOP } from './Tokens';
import { CHARS } from '../data/Chars';
import { SKILLS } from '../data/Skills';

const CENTER_Y = 0;

/** 1. 主界面：标题 + [开始游戏][玩法说明] + seed */
export function buildMenu(parent: Node, seed: number, onStart: () => void, onHowto: () => void): Node {
  const root = screen(parent, 'scr-menu', COL.bg1);

  // 标题牌
  const title = panel(root, 0, 150, 300, 108, { bg: COL.bg2, line: COL.line2, radius: R.l });
  text(title, 0, 22, '疯狂怪潮', { size: FS.xl, color: COL.accent, bold: true, width: 280 });
  text(title, 0, -8, 'CRAZY MONSTER TIDE', { size: FS.xs, color: COL.line2, width: 280 });
  text(title, 0, -32, '像素肉鸽 · 割草 · 行为模块', { size: FS.xs, color: COL.mint, width: 280 });

  const b1 = button(root, 0, -40, 220, 54, '开始游戏', { primary: true, size: FS.l });
  onTap(b1.node, onStart);
  const b2 = button(root, 0, -104, 220, 50, '玩法说明', { size: FS.m });
  onTap(b2.node, onHowto);

  text(root, 0, -300 + SAFE_TOP, `seed ${seed}`, { size: FS.xs, color: COL.line, width: 340 });
  return root;
}

/** 2. 玩法说明 */
export function buildHowto(parent: Node, onBack: () => void): Node {
  const root = screen(parent, 'scr-howto', COL.bg1);
  text(root, 0, 268, '玩法说明', { size: FS.l, color: COL.accent, bold: true, width: 320 });

  const box = panel(root, 0, 20, 320, 440, { bg: COL.bg2, line: COL.line, radius: R.l });
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
  lines.forEach((s, i) => text(box, 0, 190 - i * 30, s, { size: FS.s, color: COL.cream, align: 'left', width: 288 }));
  text(box, 0, -190, '目标：搭出你自己的技能组合', { size: FS.xs, color: COL.mint, width: 288 });

  const b = button(root, 0, -260, 200, 50, '返回', { size: FS.m });
  onTap(b.node, onBack);
  return root;
}

/** 3. 角色选择：**角色网格 3x2（要换行）** + 详情 + [返回][开始闯关] */
export function buildCharSelect(parent: Node, onBack: () => void, onStart: (id: string) => void): Node {
  const root = screen(parent, 'scr-charselect', COL.bg1);
  text(root, 0, 288, '选择角色', { size: FS.l, color: COL.accent, bold: true, width: 320 });

  let picked = CHARS[0].id;
  const cells: { node: Node; id: string; name: Label }[] = [];

  const detail = panel(root, 0, -108, 320, 150, { bg: COL.bg2, line: COL.line, radius: R.l });
  const dName = text(detail, -148, 50, '', { size: FS.m, color: COL.accent, align: 'left', width: 300 });
  const dPos = text(detail, -148, 18, '', { size: FS.s, color: COL.mint, align: 'left', width: 300 });
  const dNeg = text(detail, -148, -12, '', { size: FS.s, color: COL.red, align: 'left', width: 300 });
  const dSkill = text(detail, -148, -44, '', { size: FS.s, color: COL.cream, align: 'left', width: 300 });

  const refresh = () => {
    for (const c of cells) {
      const on = c.id === picked;
      paintCell(c.node, on);
      c.name.color = on ? COL.bg0 : COL.cream;
    }
    const ch = CHARS.find(x => x.id === picked)!;
    dName.string = ch.name;
    dPos.string = '＋ ' + ch.pos;
    dNeg.string = '－ ' + ch.neg;
    dSkill.string = '初始技能：' + (SKILLS[ch.start] ? SKILLS[ch.start].name : ch.start);
  };

  // 3 列 x 2 行网格（列间距 104，行间距 60）
  const CW = 96, CH = 52, GX = 104, GY = 60;
  CHARS.forEach((ch, i) => {
    const col = i % 3, rowid = Math.floor(i / 3);
    const x = (col - 1) * GX;
    const y = 200 - rowid * GY;
    const n = panel(root, x, y, CW, CH, { bg: COL.bg3, line: COL.line2, radius: R.m });
    const l = text(n, 0, 0, ch.name, { size: FS.s, color: COL.cream, width: CW - 8 });
    cells.push({ node: n, id: ch.id, name: l });
    onTap(n, () => { picked = ch.id; refresh(); });
  });
  refresh();

  const back = button(root, -70, -272, 130, 48, '返回', { size: FS.m });
  onTap(back.node, onBack);
  const go = button(root, 76, -272, 150, 48, '开始闯关', { primary: true, size: FS.m });
  onTap(go.node, () => onStart(picked));
  return root;
}

/** 选中态：重画格子（选中 = 强调色底 + 深色字，未选 = 面板底） */
function paintCell(n: Node, on: boolean) {
  const g = n.getComponent(Graphics);
  if (!g) return;
  const ut = n.getComponent(UITransform);
  const w = ut ? ut.contentSize.width : 96;
  const h = ut ? ut.contentSize.height : 52;
  g.clear();
  g.fillColor = COL.shadow; g.roundRect(-w / 2, -h / 2 - 3, w, h, R.m); g.fill();
  g.fillColor = on ? COL.accent : COL.bg3; g.roundRect(-w / 2, -h / 2, w, h, R.m); g.fill();
  g.lineWidth = 2; g.strokeColor = on ? COL.accentD : COL.line2; g.roundRect(-w / 2, -h / 2, w, h, R.m); g.stroke();
}

/** 11. 结算：结果大字 + 统计 + [主界面][再来一局] */
export function buildResult(parent: Node, stats: { win: boolean; wave: number; lv: number; kills: number; time: number; build: string[] }, onMenu: () => void, onRetry: () => void): Node {
  const root = screen(parent, 'scr-result', COL.bg1);
  text(root, 0, 200, stats.win ? '通关！' : '阵亡', { size: FS.xl, color: stats.win ? COL.accent : COL.red, bold: true, width: 320 });

  const box = panel(root, 0, 40, 320, 220, { bg: COL.bg2, line: COL.line, radius: R.l });
  const rows: [string, string][] = [
    ['到达波次', String(stats.wave)],
    ['等级', 'Lv.' + stats.lv],
    ['击杀', String(stats.kills)],
    ['用时', Math.floor(stats.time / 60) + '分' + Math.floor(stats.time % 60) + '秒'],
  ];
  rows.forEach(([k, v], i) => {
    text(box, -140, 78 - i * 32, k, { size: FS.s, color: COL.line2, align: 'left', width: 160 });
    text(box, 140, 78 - i * 32, v, { size: FS.m, color: COL.cream, align: 'right', width: 160 });
  });
  text(box, 0, -78, '本局 Build', { size: FS.xs, color: COL.mint, width: 280 });
  text(box, 0, -100, stats.build.slice(0, 3).join('  ') || '—', { size: FS.xs, color: COL.cream, width: 288 });

  const m = button(root, -70, -220, 130, 50, '主界面', { size: FS.m });
  onTap(m.node, onMenu);
  const r = button(root, 76, -220, 150, 50, '再来一局', { primary: true, size: FS.m });
  onTap(r.node, onRetry);
  return root;
}
