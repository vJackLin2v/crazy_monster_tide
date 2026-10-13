/**
 * 战斗 HUD —— 规格 §2 第 4 屏 `scr-battle`
 *
 * 结构（自上而下，规格原文）：
 *   HUD(HP/等级/暂停) → 经验条 → 金币+波次行 → BOSS 血条 → 技能栏
 *
 * 只负责"画"，数据由 Battle 每帧灌进来（`sync()`）。
 */
import { Node, Label, Color } from 'cc';
import { panel, bar, text, mkNode, onTap, whiteFrame } from './UIKit';
import { iconFrame, loadIcon } from '../engine/Assets';
import { COL, FS, R, BORDER, SP, SAFE_TOP, SHADOW_OFF } from './Tokens';
import { Sprite, UITransform, Graphics } from 'cc';

export interface HudData {
  hp: number; maxhp: number;
  lv: number; exp: number; expNeed: number;
  gold: number; wave: number; waveTotal: number; waveLeft: number;
  bossName: string | null; bossHp: number; bossMax: number;
  skills: { name: string; icon: string; cdPct: number; lvl: number }[];
}

export class Hud {
  root: Node;
  private hpBar!: ReturnType<typeof bar>;
  private expBar!: ReturnType<typeof bar>;
  private lvText!: Label;
  private goldText!: Label;
  private waveText!: Label;
  private bossBox!: Node;
  private bossBar!: ReturnType<typeof bar>;
  private bossName!: Label;
  private slots: { node: Node; cd: Graphics; lvl: Label; w: number; icon: Sprite }[] = [];

  constructor(parent: Node, onPause?: () => void) {
    this.root = mkNode(parent, 'Hud', 360, 640);
    const TOP = 320 - SAFE_TOP - 10;      // 320 = 半屏高

    // ── HP 条（左）+ 等级（右）+ 暂停（最右）
    this.hpBar = bar(this.root, -108, TOP, 120, 14, COL.red, COL.hpBack);
    this.lvText = text(this.root, -20, TOP, 'Lv.1', { size: FS.s, color: COL.mint, align: 'left', width: 60 });
    const pause = panel(this.root, 152, TOP, 40, 40, { bg: COL.bg3, line: COL.line2, radius: R.s });
    // 暂停图标：两条竖线（和原型一致）
    const pg = pause.addComponent(Graphics);
    pg.fillColor = COL.cream;
    pg.rect(-6, -8, 4, 16); pg.rect(2, -8, 4, 16);
    pg.fill();
    if (onPause) onTap(pause, onPause);

    // ── 经验条（通栏，紧贴 HUD 下方）
    this.expBar = bar(this.root, 0, TOP - 22, 336, 8, COL.accent, COL.expBack);

    // ── 金币 + 波次行
    this.goldText = text(this.root, -168, TOP - 40, '0', { size: FS.s, color: COL.accent, align: 'left', width: 120 });
    this.waveText = text(this.root, 168, TOP - 40, '第 1 波', { size: FS.s, color: COL.cream, align: 'right', width: 160 });

    // ── BOSS 血条（平时隐藏）
    this.bossBox = mkNode(this.root, 'bossBox', 300, 30, 0, TOP - 66);
    this.bossBar = bar(this.bossBox, 0, -6, 300, 14, COL.purple, COL.hpBack);
    this.bossName = text(this.bossBox, 0, 10, '', { size: FS.xs, color: COL.cream, align: 'center', width: 300 });
    this.bossBox.active = false;

    // ── 技能栏（底部 4 格，44x44，间距 8）
    const bw = 44, gap = 8;
    const total = 4 * bw + 3 * gap;
    for (let i = 0; i < 4; i++) {
      const x = -total / 2 + bw / 2 + i * (bw + gap);
      const y = -320 + 14 + bw / 2;
      const n = panel(this.root, x, y, bw, bw, { bg: COL.bg2, line: COL.line, radius: R.s });
      // 技能图标：32x32（16px 图标整数 2 倍），NEAREST 由 loadSF 保证
      const ic = mkNode(n, 'icon', 32, 32);
      const isp = ic.addComponent(Sprite);
      isp.sizeMode = Sprite.SizeMode.CUSTOM;
      isp.trim = false;
      const cd = mkNode(n, 'cd', bw, bw);          // 冷却遮罩在图标之上
      const g = cd.addComponent(Graphics);
      const lv = text(n, bw / 2 - 8, -bw / 2 + 8, '', { size: FS.xs, color: COL.mint, align: 'right', width: 20 });
      this.slots.push({ node: n, cd: g, lvl: lv, w: bw, icon: isp });
    }
  }

  sync(d: HudData) {
    this.hpBar.set(d.maxhp > 0 ? d.hp / d.maxhp : 0);
    this.expBar.set(d.expNeed > 0 ? d.exp / d.expNeed : 0);
    this.lvText.string = 'Lv.' + d.lv;
    this.goldText.string = '◎ ' + d.gold;
    this.waveText.string = `第 ${d.wave}/${d.waveTotal} 波` + (d.waveLeft > 0 ? `  ${Math.ceil(d.waveLeft)}s` : '');

    if (d.bossName) {
      this.bossBox.active = true;
      this.bossName.string = d.bossName;
      this.bossBar.set(d.bossMax > 0 ? d.bossHp / d.bossMax : 0);
    } else this.bossBox.active = false;

    for (let i = 0; i < this.slots.length; i++) {
      const s = this.slots[i];
      const sk = d.skills[i];
      s.cd.clear();
      if (!sk) { s.icon.spriteFrame = null; continue; }
      // 图标按需加载（第一次为空，加载完自动补上）
      if (sk.icon) {
        const f = iconFrame(sk.icon);
        if (f) {
          if (s.icon.spriteFrame !== f) {
            s.icon.spriteFrame = f;
            // 图标原生 13~32px，必须**整数倍**放大才不糊
            const fw = f.rect.width || 32;
            const k = Math.max(1, Math.floor(32 / fw));
            const ut = s.icon.node.getComponent(UITransform);
            if (ut) ut.setContentSize(fw * k, fw * k);
          }
        }
        else { void loadIcon(sk.icon).then(() => { const g2 = iconFrame(sk.icon); if (g2) s.icon.spriteFrame = g2; }); }
      }
      // 冷却遮罩：从底部往上盖
      if (sk.cdPct > 0.001) {
        s.cd.fillColor = new Color(5, 8, 15, 170);
        const hh = s.w * Math.min(1, sk.cdPct);
        s.cd.roundRect(-s.w / 2, -s.w / 2, s.w, hh, R.s - 2);
        s.cd.fill();
      }
      s.lvl.string = sk.lvl > 1 ? String(sk.lvl) : '';
    }
  }

}
