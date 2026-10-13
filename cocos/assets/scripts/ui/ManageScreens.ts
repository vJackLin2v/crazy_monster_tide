/**
 * 模块管理屏 —— 规格 §2：
 *   6 模块安装 `scr-install`  /  7 技能替换 `scr-replace`
 *
 * 这两屏是"行为模块"玩法的核心交互（§3.3 / §3.4）：
 *   - 安装屏：技能列表，每个技能显示 **3 个槽位按钮**，点槽位装模块
 *   - 替换屏：技能满 4 个时，选一个腾位置；被替换技能上的模块**全部退回背包**
 */
import { Node, Label, Color, Graphics, UITransform } from 'cc';
import { panel, text, button, onTap, mkNode, mask, screen } from './UIKit';
import { COL, FS, R } from './Tokens';

export interface SkillSlotView {
  skillId: string; name: string; lvl: number;
  mods: string[];                  // 已装模块名（0~3 个）
  compat: boolean[];               // 每个待选模块是否兼容
}
export interface InstallData {
  skills: SkillSlotView[];
  bag: { id: string; name: string }[];     // 背包里的模块
}

/** 6. 模块安装：遮罩 + 技能列表（每技能 3 个槽位按钮）+ [返回] */
export function buildInstall(parent: Node, d: InstallData,
                             onPickSlot: (skillIdx: number, slotIdx: number) => void,
                             onTapModule: (modId: string) => void,
                             onBack: () => void): Node {
  const root = mkNode(parent, 'scr-install', 360, 640);
  mask(root, 360, 640);
  text(root, 0, 300, '安装行为模块', { size: FS.l, color: COL.accent, bold: true, width: 320 });

  let selSkill = -1, selSlot = -1;
  const slotNodes: Node[] = [];

  const paintSlots = () => {
    for (const n of slotNodes) {
      const si = Number(n.name.split('_')[0]), sl = Number(n.name.split('_')[1]);
      const on = si === selSkill && sl === selSlot;
      const has = d.skills[si] && d.skills[si].mods[sl];
      const g = n.getComponent(Graphics); const ut = n.getComponent(UITransform);
      if (!g || !ut) continue;
      const w = ut.contentSize.width, h = ut.contentSize.height;
      g.clear();
      g.fillColor = COL.shadow; g.roundRect(-w / 2, -h / 2 - 2, w, h, R.s); g.fill();
      g.fillColor = on ? COL.accent : (has ? COL.bg3 : COL.bg1); g.roundRect(-w / 2, -h / 2, w, h, R.s); g.fill();
      g.lineWidth = 2; g.strokeColor = on ? COL.accentD : COL.line2; g.roundRect(-w / 2, -h / 2, w, h, R.s); g.stroke();
    }
  };

  const TOP = 262, ROW = 56;
  d.skills.slice(0, 4).forEach((sk, si) => {
    const y = TOP - si * ROW;
    const row = panel(root, 0, y, 330, 50, { bg: COL.bg2, line: COL.line, radius: R.m });
    text(row, -158, 8, sk.name, { size: FS.s, color: COL.cream, align: 'left', width: 150 });
    text(row, -158, -12, 'Lv.' + sk.lvl, { size: FS.xs, color: COL.mint, align: 'left', width: 60 });
    // 3 个槽位按钮
    for (let sl = 0; sl < 3; sl++) {
      const x = 6 + sl * 58;
      const sn = mkNode(row, `${si}_${sl}`, 52, 32, x, -2);
      const g = sn.addComponent(Graphics);
      g.fillColor = COL.bg1; g.roundRect(-26, -16, 52, 32, R.s); g.fill();
      const modId = sk.mods[sl];
      text(sn, 0, 0, modId ? shortName(modId) : '＋', { size: FS.xs, color: modId ? COL.mint : COL.line2, width: 48 });
      slotNodes.push(sn);
      onTap(sn, () => { selSkill = si; selSlot = sl; paintSlots(); });
    }
  });
  paintSlots();

  // 背包模块列表：点一下装到选中的槽位
  const bag = panel(root, 0, -80, 330, 96, { bg: COL.bg2, line: COL.line, radius: R.m });
  text(bag, -158, 36, '背包（点模块装到选中的槽）', { size: FS.xs, color: COL.line2, align: 'left', width: 300 });
  if (!d.bag.length) text(bag, 0, 0, '（背包为空）', { size: FS.xs, color: COL.line, width: 300 });
  d.bag.slice(0, 8).forEach((m, i) => {
    const col = i % 4, rowid = Math.floor(i / 4);
    const x = -120 + col * 80, y = 4 - rowid * 34;
    const n = panel(bag, x, y, 72, 28, { bg: COL.bg3, line: COL.line2, radius: R.s, shadow: false });
    text(n, 0, 0, shortName(m.id), { size: FS.xs, color: COL.cream, width: 68 });
    onTap(n, () => {
      if (selSkill < 0) return;
      if (!d.skills[selSkill].compat[d.bag.findIndex(b => b.id === m.id)]) return;   // 不兼容不给装
      onTapModuleAt(m.id, selSkill, selSlot);
    });
  });

  const b = button(root, 0, -286, 180, 48, '返回', { size: FS.m });
  onTap(b.node, onBack);

  function onTapModuleAt(id: string, si: number, sl: number) { onTapModule(`${id}|${si}|${sl}`); }
  return root;
}

/** 7. 技能替换：遮罩 + 新技能卡 + 4 个待替换技能 + [放弃这个技能] */
export function buildReplace(parent: Node, newSkill: { name: string; desc: string },
                             owned: { id: string; name: string; modCount: number }[],
                             onReplace: (slot: number) => void, onGiveUp: () => void): Node {
  const root = mkNode(parent, 'scr-replace', 360, 640);
  mask(root, 360, 640);
  text(root, 0, 296, '技能栏已满', { size: FS.l, color: COL.accent, bold: true, width: 320 });
  text(root, 0, 268, '选一个替换掉（上面的模块会退回背包）', { size: FS.xs, color: COL.cream, width: 330 });

  const card = panel(root, 0, 200, 300, 90, { bg: COL.bg2, line: COL.accent, radius: R.m });
  text(card, 0, 20, newSkill.name, { size: FS.m, color: COL.accent, bold: true, width: 280 });
  text(card, 0, -12, newSkill.desc, { size: FS.xs, color: COL.cream, width: 280 });

  owned.slice(0, 4).forEach((o, i) => {
    const y = 90 - i * 60;
    const n = panel(root, 0, y, 300, 52, { bg: COL.bg3, line: COL.line2, radius: R.m });
    text(n, -130, 8, o.name, { size: FS.s, color: COL.cream, align: 'left', width: 200 });
    text(n, -130, -12, o.modCount > 0 ? `带 ${o.modCount} 个模块（会退回）` : '无模块', { size: FS.xs, color: COL.line2, align: 'left', width: 250 });
    onTap(n, () => onReplace(i));
  });

  const g = button(root, 0, -250, 220, 48, '放弃这个技能', { size: FS.s });
  onTap(g.node, onGiveUp);
  return root;
}

function shortName(id: string): string {
  // 模块名太长会溢出，取前 2 字
  const MAP: Record<string, string> = {
    multi: '多重', fan: '扇射', split: '分裂', bounce: '反弹', pierce: '穿透', orbit: '环绕',
    giant: '巨大', rapid: '急速', echo: '回响', burn: '灼烧', frost: '冰缓', vamp: '吸血',
    chain: '连锁', snipe: '狙击', harvest: '收割', thunder: '雷鸣', thornmail: '荆棘', overload: '超载',
  };
  return MAP[id] ?? id.slice(0, 2);
}
