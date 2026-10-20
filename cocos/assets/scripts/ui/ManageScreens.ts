/**
 * 模块安装 / 技能替换屏 —— 逐项实现 `docs/ui/ui-spec-approved.md` v1.1 §2.6
 *
 * 交互：
 *   1. 先在下面背包里**点一个模块**（选中高亮）
 *   2. 再点上面某技能的**槽位** —— 空槽 = 装上；已占用 = 替换（被顶掉的退回背包）
 *   3. [返回] 退出
 *
 * ⚠️ 这里必须**真的能装** —— 早期只把模块 push 进背包、没有安装入口，用户报过"无法安装模块"。
 */
import { Node, Label, Color, Graphics, UITransform, UIOpacity } from 'cc';
import { panel, text, title, button, onTap, mkNode, mask, chip, slot, paintPanel } from './UIKit';
import { COL, FS, R, BORDER } from './Tokens';
import { view } from 'cc';

function at(vw: number, vh: number, x: number, y: number) {
  return { x: x - vw / 2, y: vh / 2 - y };
}

export interface InstallData {
  skills: { name: string; lvl: number; mods: string[] }[];
  bag: { id: string; name: string }[];
  selModule: string | null;
  /** 已选模块的显示名（用于提示文案） */
  selModuleName?: string;
  compatible: (skillIdx: number, modId: string) => boolean;
}

export interface InstallCallbacks {
  onSelectModule: (id: string | null) => void;
  onPickSlot: (skillIdx: number, slotIdx: number) => void;
  onBack: () => void;
}

/** 6. 模块安装 —— 规格 §2.6 */
export function buildInstall(parent: Node, d: InstallData, cb: InstallCallbacks): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const root = mkNode(parent, 'scr-install', VW, VH);
  mask(root, VW, VH);

  const t = A(180, 40 + 13);
  title(root, t.y, '安装行为模块');
  const s = A(180, 72 + 8);
  // 用户反馈「无法替换已有行为模块」：其实就是不知道要**先选模块、再点槽**，
  // 而且点已占用的槽 = 替换。原来那行字太含糊，这里写清楚。
  text(root, s.x, s.y,
    d.selModule ? '已选中「' + d.selModuleName + '」→ 点任意槽位：空槽=装上，已占用=替换' 
                : '① 先点下面背包里的模块  ② 再点上面的槽位（已占用的槽 = 替换）',
    { size: 11, color: d.selModule ? COL.mint : COL.dim, width: 344 });

  // ── 技能行：图标 + 名字 + 3 个槽位（34x34，间距 5）──────────
  const ROW_W = 336, ROW_H = 52, ROW_GAP = 8, TOP = 100;
  const SL = 34, SGAP = 5;
  d.skills.slice(0, 4).forEach((sk, si) => {
    const cy = TOP + ROW_H / 2 + si * (ROW_H + ROW_GAP);
    const c = A(180, cy);
    const compat = d.selModule ? d.compatible(si, d.selModule) : true;
    const row = panel(root, c.x, c.y, ROW_W, ROW_H, { bg: COL.bg2, line: COL.line, radius: R.m, shadow: false });
    if (!compat) row.addComponent(UIOpacity).opacity = 115;   // 规格：不兼容整行 .45

    const ib = slot(row, -150 + 17, 0, 34, { color: COL.line });
    text(ib, 0, 1, '✦', { size: 15, color: COL.cream, width: 32, outline: false });
    text(row, -114, 0, sk.name + '  Lv.' + sk.lvl, { size: 15, color: COL.cream, align: 'left', width: 130, bold: true, outline: true });

    for (let k = 0; k < 3; k++) {
      const sx = 340 - SL / 2 - (2 - k) * (SL + SGAP);
      const p = { x: row.position.x - 180 + sx, y: 0 };
      const mod = sk.mods[k];
      const box = slot(row, p.x, 0, SL, { empty: !mod, color: COL.line });
      text(box, 0, 1, mod ? '≡' : '＋', { size: mod ? 16 : 17, color: mod ? COL.cream : COL.dash, width: SL, outline: false });
      onTap(box, () => cb.onPickSlot(si, k));
    }
  });

  // ── 背包：模块 chip，点选 ──────────────────────────────────
  const bagTop = TOP + 4 * (ROW_H + ROW_GAP) + 10;
  const bh = A(12, bagTop + 8);
  text(root, bh.x, bh.y, '背包里的模块', { size: 14, color: COL.accent, align: 'left', width: 312, bold: true, outline: true });
  const CW = 152, CHh = 38;
  if (d.bag.length) {
    d.bag.slice(0, 8).forEach((m, i) => {
      const col = i % 2, rowi = Math.floor(i / 2);
      const cx = 12 + CW / 2 + col * (CW + 8);
      const cy = bagTop + 20 + CHh / 2 + rowi * (CHh + 7);
      const c = A(cx, cy);
      const on = d.selModule === m.id;
      const n = panel(root, c.x, c.y, CW, CHh, { bg: on ? COL.accent : COL.bg2, line: COL.line, radius: R.m, shadow: false });
      // ⚠️ 选中时是"黄底 + 深字"：再叠 2px 黑描边会把字糊掉（用户反馈"环绕 看不清"）。
      //    深色字一律不加描边。
      text(n, 0, 1, m.name, { size: 14, color: on ? COL.ink : COL.cream, width: CW - 12, bold: true, outline: !on });
      onTap(n, () => cb.onSelectModule(on ? null : m.id));
    });
  } else {
    const c = A(180, bagTop + 32);
    text(root, c.x, c.y, '背包是空的', { size: FS.xs, color: COL.dim, width: 312 });
  }

  // 底部两个按钮（用户指令：要有一个「返回」，同时保留「先放背包」）
  //   返回      = 直接回上一屏（商店 / 升级 / 暂停），模块仍在背包里
  //   先放背包  = 明确「不装，收进背包」后再回上一屏
  const by = -VH / 2 + 16;
  const hint = A(180, VH - 16 - 49 - 12);
  text(root, hint.x, hint.y, '不想现在装？模块会留在背包里，之后可在 Build 面板装上',
    { size: FS.xs, color: COL.dim, width: 336 });
  const back = button(root, A(12 + 48, 0).x, by + 24.5, 96, 49, '返回', { size: 15 });
  onTap(back.node, cb.onBack);
  const keep = button(root, A(116 + 116, 0).x, by + 24.5, 232, 49, '先放背包', { primary: true, size: FS.m });
  // 用户要求：选中的模块**已经装到某个技能上**了（不在背包里）-> 没有"放背包"这回事，置灰
  const inBag = !d.selModule || d.bag.some(m => m.id === d.selModule);
  keep.setEnabled(inBag);
  if (inBag) onTap(keep.node, cb.onBack);
  return root;
}

/** 7. 技能替换 —— 规格 §2.6 */
export function buildReplace(parent: Node, newSkill: { name: string; desc: string },
                             owned: { name: string; modCount: number }[],
                             onReplace: (slot: number) => void, onGiveUp: () => void): Node {
  const vs = view.getVisibleSize(); const VW = vs.width, VH = vs.height;
  const A = (x: number, y: number) => at(VW, VH, x, y);
  const root = mkNode(parent, 'scr-replace', VW, VH);
  mask(root, VW, VH);

  const t = A(180, 36 + 13);
  title(root, t.y, '技能已满 4 个');
  const s = A(180, 68 + 8);
  text(root, s.x, s.y, '选择要替换掉的技能', { size: 12, color: COL.dim, width: 340 });

  // 新技能卡（橙描边）
  const c1 = A(180, 96 + 34);
  const card = panel(root, c1.x, c1.y, 336, 68, { bg: COL.bg2, line: COL.accent, radius: R.m });
  const nb = slot(card, -150 + 20, 0, 40, { color: COL.accent });
  text(nb, 0, 1, '❄', { size: 20, color: COL.cream, width: 38, outline: false });
  text(card, -116, 10, newSkill.name, { size: 16, color: COL.cream, align: 'left', width: 180, bold: true, outline: true });
  text(card, -116, -12, newSkill.desc, { size: FS.xs, color: COL.dim, align: 'left', width: 190 });
  chip(card, 132, 0, '新', { bg: COL.accent, color: COL.ink, size: 12, dark: true });

  // 待替换列表：4 行
  const TOP = 180, ROW_W = 336, ROW_H = 52, ROW_GAP = 8;
  owned.slice(0, 4).forEach((o, i) => {
    const cy = TOP + ROW_H / 2 + i * (ROW_H + ROW_GAP);
    const c = A(180, cy);
    const row = panel(root, c.x, c.y, ROW_W, ROW_H, { bg: COL.bg2, line: COL.line, radius: R.m, shadow: false });
    const ib = slot(row, -150 + 15, 0, 30, { color: COL.line });
    text(ib, 0, 1, '✦', { size: 14, color: COL.cream, width: 28, outline: false });
    text(row, -118, 0, o.name, { size: 14, color: COL.cream, align: 'left', width: 120, bold: true, outline: true });
    text(row, 20, 0, o.modCount ? '已装 ' + o.modCount + ' 个模块' : '无模块',
      { size: FS.xs, color: COL.dim, align: 'left', width: 120 });
    chip(row, 130, 0, '替换', { color: COL.red, size: 11 });
    onTap(row, () => onReplace(i));
  });

  const by = -VH / 2 + 16 + 24.5;
  const b = button(root, 0, by, 336, 49, '放弃这个技能', { size: 15 });
  onTap(b.node, onGiveUp);
  return root;
}
