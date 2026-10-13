// v2
/**
 * 战斗 HUD —— **逐项对齐 HTML DEMO**（docs/ui/demo-vs-cocos-gap.md）
 *
 * 规格来源：prototype-html/src/app.css 与 index.html（不是目测）
 *
 *   .hud{padding:6px 10px} → .hpwrap(flex:1,h14,border2,r99) + .lv(min36) + .ico(30x30)
 *   .expwrap{h6,r99}  .goldline{color:--gold}  波次文字{color:--accent;font-weight:900}
 *   .bossbar{padding:0 12px 6px} .bwrap{h9,border --accent-d} .bfill{渐变 #FF7A3C→--accent}
 *   .sk{width:52px} → .ico2(44x44) + .slots(3 个 9x9) + .nm(8px)
 *
 * 设计分辨率 360x640，原点在屏幕中心，y 向上。
 */
import { Node, Label, Color, Graphics, UITransform, Sprite, view } from 'cc';
import { panel, gradBar, text, mkNode, onTap, whiteFrame } from './UIKit';
import { COL, FS, R, BORDER } from './Tokens';
import { iconFrame, loadIcon } from '../engine/Assets';

// DEMO 令牌里用到、Palette 里还没有的几个色
const C_GOLD = new Color(255, 209, 102, 255);      // --gold #FFD166
const C_HP_SLOT = new Color(11, 18, 36, 255);      // #0B1224
const C_HP_TOP = new Color(255, 110, 134, 255);    // #FF6E86
const C_MINT_L = new Color(182, 240, 220, 255);    // #B6F0DC
const C_BOSS_TOP = new Color(255, 122, 60, 255);   // #FF7A3C
const C_SUB = new Color(185, 198, 224, 255);       // #B9C6E0（技能名）

export interface HudData {
  hp: number; maxhp: number;
  lv: number; exp: number; expNeed: number;
  gold: number; wave: number; waveTotal: number; waveLeft: number;
  bossName: string | null; bossHp: number; bossMax: number;
  skills: { name: string; icon: string; cdPct: number; lvl: number; modCount: number }[];
}

export class Hud {
  root: Node;
  private hpBar!: ReturnType<typeof gradBar>;
  private hpText!: Label;
  private expBar!: ReturnType<typeof gradBar>;
  private lvText!: Label;
  private goldText!: Label;
  private waveText!: Label;
  private bossBox!: Node;
  private bossBar!: ReturnType<typeof gradBar>;
  private bossName!: Label;
  private slots: {
    node: Node; cd: Graphics; lvl: Label; icon: Sprite; name: Label;
    modDots: Graphics; w: number;
  }[] = [];

  constructor(parent: Node, onPause?: () => void) {
    // ⚠️ 必须锚定**真实可视高度**，不能写死 640。
    //    屏幕实际可视 360x760 时，按 640 定位会让整个 HUD 悬在离顶 73px 处
    //    （DEMO 是离顶 6px）—— 这是"HUD 位置不对"的根因。
    const vs = view.getVisibleSize();
    const VW = vs.width, VH = vs.height;
    this.root = mkNode(parent, 'Hud', VW, VH);
    const TOPY = VH / 2, BOTY = -VH / 2;

    // ── HUD 行：padding 6px / 左右 10px，高 14 ──────────────────
    const ROW_Y = TOPY - 6 - 7;
    // hpwrap：flex:1（= 340 - 8 - 36 - 8 - 30 = 258），中心 x = -41
    this.hpBar = gradBar(this.root, -41, ROW_Y, 258, 14, {
      dir: 'v', from: C_HP_TOP, to: COL.red, radius: 99, line: COL.line,
    });
    // HP 数字：叠在条上，9px 粗体白字 + 黑色下描边（用两个 Label 叠出来）
    text(this.root, -41 - 129, ROW_Y - 1, '100/100', { size: 9, color: new Color(0, 0, 0, 210), align: 'left', width: 258 });
    this.hpText = text(this.root, -41 - 129, ROW_Y, '100/100', { size: 9, color: new Color(255, 255, 255), align: 'left', width: 258, bold: true });

    // 等级牌：min-width 36，中心 x = 114
    const lvBox = panel(this.root, 114, ROW_Y, 36, 20, { bg: COL.bg3, line: COL.line, radius: R.s });
    this.lvText = text(lvBox, 0, 0, 'Lv.1', { size: FS.xs, color: COL.cream, width: 32, bold: true });

    // 暂停按钮：30x30，中心 x = 155
    const pause = panel(this.root, 155, ROW_Y, 30, 30, { bg: COL.bg3, line: COL.line, radius: R.s });
    const pg = pause.addComponent(Graphics);
    pg.fillColor = COL.cream;
    pg.rect(-5, -7, 3, 14); pg.rect(2, -7, 3, 14);
    pg.fill();
    if (onPause) onTap(pause, onPause);

    // ── 经验条：高 6，左右各 10，无描边，位于 hud 下方 4px ──────
    const EXP_Y = ROW_Y - 7 - 3 - 3;
    this.expBar = gradBar(this.root, 0, EXP_Y, 340, 6, {
      dir: 'h', from: COL.mint, to: C_MINT_L, radius: 99,
    });

    // ── 金币 + 波次行：padding 0 10px，字号 xs ──────────────────
    const GOLD_Y = EXP_Y - 3 - 3 - 7;
    this.goldText = text(this.root, -170, GOLD_Y, '◆ 0', { size: FS.xs, color: C_GOLD, align: 'left', width: 150, bold: true });
    this.waveText = text(this.root, 170, GOLD_Y, '第 1 波', { size: FS.xs, color: COL.accent, align: 'right', width: 200, bold: true });

    // ── BOSS 血条（NAME 10px 900 橙 + 条 9 高、描边 accent-d）────
    this.bossBox = mkNode(this.root, 'bossBox', 340, 34, 0, GOLD_Y - 24);
    this.bossName = text(this.bossBox, -170, 12, '', { size: 10, color: COL.accent, align: 'left', width: 340, bold: true });
    this.bossBar = gradBar(this.bossBox, 0, -6, 336, 9, {
      dir: 'h', from: C_BOSS_TOP, to: COL.accent, radius: 99, line: COL.accentD,
    });
    this.bossBox.active = false;

    // ── 技能栏：4 x 52 + 3 x 8 = 232，底部 padding 8 ────────────
    const SW = 52, GAP = 8;
    const total = 4 * SW + 3 * GAP;
    for (let i = 0; i < 4; i++) {
      const x = -total / 2 + SW / 2 + i * (SW + GAP);
      // 技能栏贴着屏幕底：底 padding 8，元素高 68 -> 中心 = BOTY + 8 + 34
      const slot = mkNode(this.root, 'sk' + i, SW, 68, x, BOTY + 8 + 34);

      // 图标 44x44（--bg-2 底 + 2px 描边 + r-m）
      const ico = panel(slot, 0, 22, 44, 44, { bg: COL.bg2, line: COL.line, radius: R.m });
      const ic = mkNode(ico, 'icon', 32, 32);
      const isp = ic.addComponent(Sprite);
      isp.sizeMode = Sprite.SizeMode.CUSTOM;
      isp.trim = false;

      // 冷却遮罩（rgba(0,0,0,.55)，从下往上）
      const cd = mkNode(ico, 'cd', 44, 44);
      const g = cd.addComponent(Graphics);

      // 等级角标：右上角橙色胶囊
      const badge = mkNode(ico, 'stack', 18, 14, 14, 16);
      const bg = badge.addComponent(Graphics);
      bg.fillColor = COL.accent;
      bg.roundRect(-9, -7, 18, 14, 7); bg.fill();
      const lv = text(badge, 0, 0, '', { size: 9, color: new Color(32, 22, 10), width: 18, bold: true });

      // 3 个模块小方块
      const dots = mkNode(slot, 'mods', 32, 9, 0, -3);
      const dg = dots.addComponent(Graphics);

      // 技能名 8px
      const nm = text(slot, -26, -16, '', { size: 8, color: C_SUB, width: 52 });

      this.slots.push({ node: slot, cd: g, lvl: lv, icon: isp, name: nm, modDots: dg, w: 44 });
    }
  }

  sync(d: HudData) {
    this.hpBar.set(d.maxhp > 0 ? d.hp / d.maxhp : 0);
    this.expBar.set(d.expNeed > 0 ? d.exp / d.expNeed : 0);
    // DEMO 的 HP 文字是 "100/100"
    this.hpText.string = Math.max(0, Math.round(d.hp)) + '/' + Math.round(d.maxhp);
    this.lvText.string = 'Lv.' + d.lv;
    this.goldText.string = '◆ ' + d.gold;
    this.waveText.string = `第 ${d.wave} 波` + (d.waveLeft > 0 ? `  ${Math.ceil(d.waveLeft)}s` : '');

    if (d.bossName) {
      this.bossBox.active = true;
      this.bossName.string = d.bossName;
      this.bossBar.set(d.bossMax > 0 ? d.bossHp / d.bossMax : 0);
    } else this.bossBox.active = false;

    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      const sk = d.skills[i];
      s.cd.clear();
      s.modDots.clear();
      if (!sk) { s.icon.spriteFrame = null; s.name.string = ''; s.lvl.string = ''; continue; }

      // 图标（整数倍放大，否则像素糊）
      if (sk.icon) {
        const f = iconFrame(sk.icon);
        if (f) {
          if (s.icon.spriteFrame !== f) {
            s.icon.spriteFrame = f;
            const fw = f.rect.width || 32;
            const k = Math.max(1, Math.floor(32 / fw));
            const ut = s.icon.node.getComponent(UITransform);
            if (ut) ut.setContentSize(fw * k, fw * k);
          }
        } else {
          void loadIcon(sk.icon).then(() => { const g2 = iconFrame(sk.icon); if (g2) s.icon.spriteFrame = g2; });
        }
      }

      // 技能名
      s.name.string = sk.name;

      // 等级角标（只有 >1 才显示，和 DEMO 的 .stack 一致）
      s.lvl.string = sk.lvl > 1 ? String(sk.lvl) : '';
      s.lvl.node.parent!.active = sk.lvl > 1;

      // 3 个模块小方块（已装 = 橙色）
      for (let k = 0; k < 3; k++) {
        const filled = k < sk.modCount;
        s.modDots.fillColor = filled ? COL.accent : C_HP_SLOT;
        s.modDots.roundRect(-16 + k * 11, -4.5, 9, 9, 2);
      }
      s.modDots.fill();
      s.modDots.lineWidth = 1;
      s.modDots.strokeColor = COL.line2;
      for (let k = 0; k < 3; k++) s.modDots.roundRect(-16 + k * 11, -4.5, 9, 9, 2);
      s.modDots.stroke();

      // 冷却遮罩：rgba(0,0,0,.55)，从底部往上盖
      if (sk.cdPct > 0.001) {
        s.cd.fillColor = new Color(0, 0, 0, 140);
        const hh = 44 * Math.min(1, sk.cdPct);
        s.cd.roundRect(-22, -22, 44, hh, R.s);
        s.cd.fill();
      }
    }
  }
}
