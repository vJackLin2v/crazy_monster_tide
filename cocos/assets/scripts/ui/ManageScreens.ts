/**
 * 模块安装 / 技能替换屏 —— 规格 §2 第 6、7 屏
 *
 * 交互流程（§3.3 槽位级交互）：
 *   1. 在下方背包里**点一个模块**（选中，高亮）
 *   2. 点上方某个技能的**一个槽位** -> 装进去
 *      - 槽位为空 = 装到该槽
 *      - 槽位已有 = 替换（被顶掉的模块退回背包）
 *   3. [返回] 退出
 *
 * ⚠️ 这里必须**真的能装** —— 之前只把模块 push 进背包、没有安装入口，用户报"无法安装模块"。
 */
import { Node, Label, Color, Graphics, UITransform } from 'cc';
import { panel, text, button, onTap, mkNode, mask } from './UIKit';
import { COL, FS, R } from './Tokens';

export interface InstallData {
  skills: { name: string; lvl: number; mods: string[] }[];
  bag: { id: string; name: string }[];
  /** 由调用方持有选中状态，重绘时不丢 */
  selModule: string | null;
  /** 模块 -> 该技能是否兼容（不兼容的槽位不可点） */
  compatible: (skillIdx: number, modId: string) => boolean;
}

export interface InstallCallbacks {
  onSelectModule: (id: string | null) => void;
  onPickSlot: (skillIdx: number, slotIdx: number) => void;
  onBack: () => void;
}

export function buildInstall(parent: Node, d: InstallData, cb: InstallCallbacks): Node {
  const root = mkNode(parent, 'scr-install', 360, 640);
  mask(root, 360, 640);
  text(root, 0, 296, '安装行为模块', { size: FS.l, color: COL.accent, bold: true, width: 340 });
  text(root, 0, 272, d.selModule ? '已选中模块 → 点上方任意槽位装上' : '先点下面的模块，再点上面的槽位',
       { size: FS.xs, color: d.selModule ? COL.mint : COL.line2, width: 340 });

  // ── 技能列表：每个技能一行，行内 3 个槽位按钮 ──────────────
  const ROW_Y0 = 226, ROW_H = 62;
  d.skills.slice(0, 4).forEach((sk, si) => {
    const y = ROW_Y0 - si * ROW_H;
    panel(root, 0, y, 336, 56, { bg: COL.bg2, line: COL.line, radius: R.m });
    text(root, -160, y + 16, sk.name, { size: FS.s, color: COL.cream, align: 'left', width: 130, bold: true });
    text(root, -160, y - 4, 'Lv.' + sk.lvl, { size: FS.xs, color: COL.mint, align: 'left', width: 60 });
    for (let sl = 0; sl < 3; sl++) {
      const sx = 6 + sl * 60;
      const mod = sk.mods[sl];
      const ok = !!d.selModule && d.compatible(si, d.selModule);
      const n = mkNode(root, 'sl' + si + '_' + sl, 54, 36, sx, y - 2);
      const g = n.addComponent(Graphics);
      g.fillColor = mod ? COL.bg3 : COL.bg1;
      g.roundRect(-27, -18, 54, 36, R.s); g.fill();
      g.lineWidth = 2;
      g.strokeColor = ok ? COL.accent : (mod ? COL.line2 : COL.line);
      g.roundRect(-27, -18, 54, 36, R.s); g.stroke();
      if (mod) g.fillColor = COL.accent;
      text(n, -27, 0, mod ? (mod.startsWith('＋') ? mod : mod) : (ok ? '＋' : '空'),
           { size: 10, color: mod ? COL.mint : (ok ? COL.accent : COL.line2), align: 'left', width: 54 });
      onTap(n, () => cb.onPickSlot(si, sl));
    }
  });

  // ── 背包：点选模块 ─────────────────────────────────────────
  const bagTop = ROW_Y0 - 4 * ROW_H + 4;      // = -18
  panel(root, 0, bagTop - 74, 336, 132, { bg: COL.bg2, line: COL.line, radius: R.m });
  text(root, -160, bagTop - 18, '背包（点选要安装的模块）', { size: FS.xs, color: COL.line2, align: 'left', width: 320 });
  if (!d.bag.length) text(root, 0, bagTop - 76, '背包为空', { size: FS.s, color: COL.line, width: 320 });
  d.bag.slice(0, 8).forEach((m, i) => {
    const col = i % 4, row = Math.floor(i / 4);
    const x = -126 + col * 84, y = bagTop - 48 - row * 40;
    const on = d.selModule === m.id;
    const n = mkNode(root, 'bag' + i, 78, 34, x, y);
    const g = n.addComponent(Graphics);
    g.fillColor = on ? COL.accent : COL.bg3;
    g.roundRect(-39, -17, 78, 34, R.s); g.fill();
    g.lineWidth = 2; g.strokeColor = on ? COL.accentD : COL.line2;
    g.roundRect(-39, -17, 78, 34, R.s); g.stroke();
    text(n, 0, 0, m.name, { size: FS.xs, color: on ? COL.bg0 : COL.cream, width: 74, bold: on });
    onTap(n, () => cb.onSelectModule(on ? null : m.id));
  });

  const b = button(root, 0, -292, 180, 48, '返回', { size: FS.m });
  onTap(b.node, cb.onBack);
  return root;
}

/** 7. 技能替换（4 个技能满时） */
export function buildReplace(parent: Node, newSkill: { name: string; desc: string },
                             owned: { name: string; modCount: number }[],
                             onReplace: (slot: number) => void, onGiveUp: () => void): Node {
  const root = mkNode(parent, 'scr-replace', 360, 640);
  mask(root, 360, 640);
  text(root, 0, 296, '技能栏已满', { size: FS.l, color: COL.accent, bold: true, width: 340 });
  text(root, 0, 270, '选一个替换掉（它上面的模块会退回背包）', { size: FS.xs, color: COL.cream, width: 340 });

  panel(root, 0, 206, 320, 84, { bg: COL.bg2, line: COL.accent, radius: R.m });
  text(root, 0, 216, newSkill.name, { size: FS.m, color: COL.accent, bold: true, width: 300 });
  text(root, 0, 190, newSkill.desc, { size: FS.xs, color: COL.cream, width: 300 });

  owned.slice(0, 4).forEach((o, i) => {
    const y = 120 - i * 62;
    const row = panel(root, 0, y, 320, 54, { bg: COL.bg3, line: COL.line2, radius: R.m });
    text(row, -150, 8, o.name, { size: FS.s, color: COL.cream, align: 'left', width: 210 });
    text(row, -150, -12, o.modCount > 0 ? '带 ' + o.modCount + ' 个模块（会退回背包）' : '无模块',
         { size: FS.xs, color: COL.line2, align: 'left', width: 260 });
    onTap(row, () => onReplace(i));   // 整行可点
  });

  const g = button(root, 0, -270, 220, 48, '放弃这个技能', { size: FS.s });
  onTap(g.node, onGiveUp);
  return root;
}
