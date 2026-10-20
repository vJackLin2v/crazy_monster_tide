/**
 * 战斗 HUD —— **逐项实现 `docs/ui/ui-spec-approved.md` v1.1 §2.1**（坐标实测，非目测）
 *
 * 布局（设计坐标，原点屏幕左上、y 向下 360x640）：
 *   左上竖排：HP 条(11,11,152x17) → 经验条(11,33,152x17，**LV 嵌在条内右端**) → 金币图标(11,59,19x19)+数字
 *   右上：波次文字(右对齐至 349,11) → 闹钟(291,38,22x22)+倒计时(318,32) → 暂停(319,71,30x30)
 *   底部：4 个技能槽(y567, 50x50, x=61/124/187/250) + 每个槽下方 3 个模块方块(y620, 9x9)
 *
 * ⚠️ **视线安全区 y 101~562 不得被任何 HUD 元素侵占**（用户明确要求）。
 * ⚠️ 位置全部锚定 `view.getVisibleSize()`，不得写死 640（KI-009）。
 */
import { Node, Label, Color, Graphics, UITransform, Sprite, UIOpacity, view } from 'cc';
import { panel, gradBar, text, mkNode, onTap, slot, paintPanel } from './UIKit';
import { COL, FS, R, BORDER, MIN_TAP } from './Tokens';
import { iconFrame, loadIcon } from '../engine/Assets';

export interface HudData {
  hp: number; maxhp: number;
  lv: number; exp: number; expNeed: number;
  gold: number; wave: number; waveTotal: number; waveLeft: number;
  /** 本波击杀数 */
  kills: number;
  /** 受击闪屏强度 0~1（Battle.hurtFlash） */
  hurtFlash: number;
  bossName: string | null; bossHp: number; bossMax: number;
  skills: { name: string; icon: string; cdPct: number; lvl: number; modCount: number }[];
}

/** 规格坐标：x 为屏幕左起的像素，y 为屏幕上起；本函数换算成 Cocos 节点坐标 */
function P(vw: number, vh: number, x: number, y: number) {
  return { x: x - vw / 2, y: vh / 2 - y };
}

const C_GOLD_TOP = new Color(255, 232, 154, 255);   // #ffe89a
const C_GOLD_BOT = new Color(217, 154, 28, 255);    // #d99a1c
const C_SLOT_EMPTY = new Color(21, 21, 28, 255);    // #15151c

export class Hud {
  root: Node;
  private vw = 360; private vh = 640;
  private hpBar!: ReturnType<typeof gradBar>;
  private hpText!: Label;
  private expBar!: ReturnType<typeof gradBar>;
  private lvText!: Label;
  private goldText!: Label;
  private waveText!: Label;
  private timerText!: Label;
  private bossBox!: Node;
  private bossBar!: ReturnType<typeof gradBar>;
  private bossName!: Label;
  private hurtVig!: Node;
  private hurtOp!: UIOpacity;
  private slots: {
    node: Node; cd: Graphics; lvl: Label; icon: Sprite;
    modDots: Graphics; name: Label; plus: Label;
  }[] = [];

  constructor(parent: Node, onPause?: () => void) {
    const vs = view.getVisibleSize();
    const VW = vs.width, VH = vs.height;
    this.vw = VW; this.vh = VH;
    this.root = mkNode(parent, 'Hud', VW, VH);
    const at = (x: number, y: number) => P(VW, VH, x, y);

    // ── 受击红光：屏幕四边的红色由外向内逐层变淡（容器整体调 opacity）──
    //    参照同类割草游戏（土豆兄弟 / 弹壳特攻队）：扣血时**屏幕边缘泛红一闪**，
    //    比"角色闪一下"更容易被感知 —— 玩家视线通常在角色附近，边缘变化同样在余光里。
    this.hurtVig = mkNode(this.root, 'hurtVig', VW, VH);
    const hg = this.hurtVig.addComponent(Graphics);
    // 用户反馈「屏幕红色太宽，左右两侧收窄一些、柔和一些」：
    //   层数 14→10、每层内缩 7→4px、线宽 14→8、峰值透明度 170→120 —— 整体带宽约减半，过渡更柔。
    const LAYERS = 10;
    for (let i = 0; i < LAYERS; i++) {
      const t = i / (LAYERS - 1);
      const inset = i * 4;
      hg.lineWidth = 8;
      hg.strokeColor = new Color(232, 69, 47, Math.round(120 * (1 - t) * (1 - t)));
      hg.rect(-VW / 2 + inset, -VH / 2 + inset, VW - inset * 2, VH - inset * 2);
      hg.stroke();
    }
    this.hurtOp = this.hurtVig.addComponent(UIOpacity);
    this.hurtOp.opacity = 0;

    // ── 左上：HP 条 152x17 @(11,11) ─────────────────────────────
    let p = at(11 + 76, 11 + 8.5);
    this.hpBar = gradBar(this.root, p.x, p.y, 152, 17, {
      dir: 'v', from: new Color(232, 69, 47), to: new Color(184, 40, 26), radius: R.bar, line: COL.line,
    });
    this.hpText = text(this.root, p.x, p.y + 1, '100/100',
      { size: FS.xs, color: COL.cream, width: 146, bold: true, outline: true });

    // ── 经验条 152x17 @(11,33)，LV 嵌在条内右端 ────────────────
    p = at(11 + 76, 33 + 8.5);
    this.expBar = gradBar(this.root, p.x, p.y, 152, 17, {
      dir: 'v', from: new Color(139, 214, 58), to: new Color(90, 168, 31), radius: R.bar, line: COL.line,
    });
    // 规格：等级贴右端内部，右边距 5 → 文字右边界 = 11+152-5 = 158
    this.lvText = text(this.root, at(158, 41.5).x, p.y + 1, 'LV.1',
      { size: FS.xs, color: COL.cream, align: 'right', width: 60, bold: true, outline: true });

    // ── 金币：圆图标 19x19 @(11,59) + 数字 ─────────────────────
    const coinC = at(11 + 9.5, 59 + 9.5);
    const coin = mkNode(this.root, 'coin', 19, 19, coinC.x, coinC.y);
    const cg = coin.addComponent(Graphics);
    for (let i = 10; i >= 0; i--) {                 // 竖向渐变用同心圆近似
      const t = i / 10;
      cg.fillColor = new Color(
        Math.round(C_GOLD_TOP.r + (C_GOLD_BOT.r - C_GOLD_TOP.r) * t),
        Math.round(C_GOLD_TOP.g + (C_GOLD_BOT.g - C_GOLD_TOP.g) * t),
        Math.round(C_GOLD_TOP.b + (C_GOLD_BOT.b - C_GOLD_TOP.b) * t), 255);
      cg.circle(0, -3 + i * 0.6, 6.5);
      cg.fill();
    }
    cg.lineWidth = BORDER; cg.strokeColor = COL.line; cg.circle(0, 0, 8); cg.stroke();
    this.goldText = text(this.root, at(36, 56 + 12.5).x, at(36, 56 + 12.5).y,
      '0', { size: 19, color: COL.cream, align: 'left', width: 90, bold: true, outline: true, shadow: true });

    // ── 右上：波次 / 闹钟+倒计时 / 暂停 ─────────────────────────
    // 波次文字：右边界 349，y 中心 19.5
    this.waveText = text(this.root, at(349, 0).x, at(0, 19.5).y, '波次 1 · 击杀 0',
      { size: FS.s, color: COL.cream, align: 'right', width: 200, bold: true, outline: true });

    // 闹钟 22x22 中心 (302, 49)
    const clk = at(302, 49);
    const ck = mkNode(this.root, 'clock', 22, 22, clk.x, clk.y);
    const kg = ck.addComponent(Graphics);
    kg.fillColor = new Color(242, 236, 220);
    kg.circle(0, 0, 9); kg.fill();
    kg.lineWidth = BORDER; kg.strokeColor = COL.line; kg.circle(0, 0, 9); kg.stroke();
    kg.fillColor = new Color(34, 34, 34);
    kg.rect(-1.5, 1, 3, 7); kg.fill();          // 时针（向上）
    kg.rect(0, -1.5, 6, 3); kg.fill();          // 分针（向右）

    // 倒计时：25px，右边界 349，中心 y 48.5
    this.timerText = text(this.root, at(349, 0).x, at(0, 48.5).y, '0',
      { size: 25, color: COL.cream, align: 'right', width: 120, bold: true, outline: true, shadow: true });

    // 暂停 30x30 中心 (334, 86)；热区扩到 44（微信硬要求）
    const pauseC = at(334, 86);
    const pause = panel(this.root, pauseC.x, pauseC.y, 30, 30, { bg: COL.bg2, line: COL.line, radius: R.s });
    // ⚠️ 必须画在**子节点**上：panel() 已经给该节点加了 Graphics，
    //    再 addComponent(Graphics) 就是同一节点上两个 Graphics —— 图标画不出来。
    const pIcon = mkNode(pause, 'pauseIcon', 30, 30);
    const pg = pIcon.addComponent(Graphics);
    pg.fillColor = COL.cream;
    pg.rect(-5, -7, 3, 14); pg.rect(2, -7, 3, 14); pg.fill();
    const hit = mkNode(this.root, 'pauseHit', MIN_TAP, MIN_TAP, pauseC.x, pauseC.y);
    if (onPause) onTap(hit, onPause);

    // ── BOSS 血条（贴在波次下方，BOSS 波才显示）────────────────
    const bz = at(180, 112);
    this.bossBox = mkNode(this.root, 'bossBox', 340, 36, bz.x, bz.y);
    this.bossName = text(this.bossBox, at(12, 0).x, 12, '', { size: FS.xs, color: COL.accent, align: 'left', width: 336, bold: true, outline: true });
    this.bossBar = gradBar(this.bossBox, 0, -6, 336, 9, {
      dir: 'h', from: new Color(255, 122, 60), to: COL.accent, radius: R.bar, line: COL.line,
    });
    this.bossBox.active = false;

    // ── 底部技能栏 ─────────────────────────────────────────────
    // ⚠️ 必须**按屏幕底部定位**，不能按"设计稿的绝对 y"。
    //    设计稿是 640 高、槽中心 y=592（离底 48）；但预览可视高度是 760，
    //    若按绝对 y 定位，技能栏会悬在离底 131px 的位置（用户反馈"离底部太远"）。
    const SLOT = 50, PITCH = 63;
    const FROM_BOTTOM = 48;              // 设计稿：640 - 592
    const DOTS_FROM_BOTTOM = 15.5;       // 设计稿：640 - 624.5
    const BADGE_FROM_BOTTOM = 64.5;      // 设计稿：640 - 575.5
    for (let i = 0; i < 4; i++) {
      const cx = 86 + i * PITCH;
      const c = at(cx, VH - FROM_BOTTOM);
      const sk = mkNode(this.root, 'sk' + i, SLOT, SLOT, c.x, c.y);

      const box = slot(sk, 0, 0, SLOT);
      const ic = mkNode(box, 'icon', 34, 34);
      const isp = ic.addComponent(Sprite);
      isp.sizeMode = Sprite.SizeMode.CUSTOM;
      isp.trim = false;
      const plus = text(box, 0, 0, '＋', { size: 22, color: COL.dash, width: 40, outline: false });

      const cd = mkNode(box, 'cd', SLOT, SLOT);
      const g = cd.addComponent(Graphics);

      // 等级角标：槽右上（规格 18x17）
      const bp = at(cx + 25 - 9, VH - BADGE_FROM_BOTTOM);
      const badge = mkNode(this.root, 'stack', 18, 17, bp.x, bp.y);
      const bg = badge.addComponent(Graphics);
      bg.fillColor = COL.accent;
      bg.roundRect(-9, -8, 18, 16, R.s); bg.fill();
      bg.lineWidth = BORDER; bg.strokeColor = COL.line; bg.roundRect(-9, -8, 18, 16, R.s); bg.stroke();
      const lv = text(badge, 0, 1, '', { size: 10, color: COL.ink, width: 16, bold: true, outline: false });

      // 3 个模块方块：y620，间距 11，居中
      const dp = at(cx, VH - DOTS_FROM_BOTTOM);
      const dots = mkNode(this.root, 'mods', 31, 9, dp.x, dp.y);
      const dg = dots.addComponent(Graphics);

      const nm = text(sk, 0, -34, '', { size: 10, color: COL.dim, width: SLOT + 6 });
      nm.node.active = false;          // 规格 v1.1：图标下不放技能名（用户确认）

      this.slots.push({ node: sk, cd: g, lvl: lv, icon: isp, modDots: dg, name: nm, plus });
    }
  }

  sync(d: HudData) {
    this.hpBar.set(d.maxhp > 0 ? d.hp / d.maxhp : 0);
    this.hpText.string = Math.max(0, Math.round(d.hp)) + ' / ' + Math.round(d.maxhp);
    this.expBar.set(d.expNeed > 0 ? d.exp / d.expNeed : 0);
    this.lvText.string = 'LV.' + d.lv;
    this.goldText.string = String(d.gold);
    // 规格：「波次 N · 击杀 M」
    this.waveText.string = '波次 ' + d.wave + ' · 击杀 ' + d.kills;
    // 规格：闹钟旁只显示秒数（非 BOSS 波才有倒计时）
    const left = Math.ceil(d.waveLeft);
    this.timerText.string = d.waveLeft > 0 ? String(Math.max(0, left)) : '';
    // 用户要求：最后 5 秒倒计时变红，给"这一波要结束了"的感知
    const urgent = d.waveLeft > 0 && left <= 5;
    this.timerText.color = urgent ? COL.red : COL.cream;
    this.timerText.node.setScale(urgent ? 1.12 : 1, urgent ? 1.12 : 1, 1);

    // 受击红光
    this.hurtOp.opacity = Math.round(255 * Math.max(0, Math.min(1, d.hurtFlash)));

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
      const box = s.icon.node.parent!;

      if (!sk) {
        // 空槽：底色更深 + 灰色「＋」+ 3 个空方块
        paintPanel(box, 50, 50, { bg: C_SLOT_EMPTY, line: COL.line, radius: R.m, shadow: false });
        s.icon.spriteFrame = null;
        s.lvl.node.parent!.active = false;
        s.plus.node.active = true;
        for (let k = 0; k < 3; k++) s.modDots.roundRect(-11 + k * 11, -4.5, 9, 9, 2);
        s.modDots.fillColor = new Color(58, 58, 72);
        s.modDots.fill();
        s.modDots.lineWidth = 2; s.modDots.strokeColor = COL.line;
        for (let k = 0; k < 3; k++) s.modDots.roundRect(-11 + k * 11, -4.5, 9, 9, 2);
        s.modDots.stroke();
        continue;
      }
      paintPanel(box, 50, 50, { bg: COL.bg2, line: COL.line, radius: R.m, shadow: false });
      s.plus.node.active = false;

      // 图标：整数倍缩放，目标 ~34px（非整数倍会糊）
      if (sk.icon) {
        const f = iconFrame(sk.icon);
        if (f) {
          if (s.icon.spriteFrame !== f) {
            s.icon.spriteFrame = f;
            const fw = f.rect.width || 32;
            const k = Math.max(1, Math.floor(34 / fw));
            const ut = s.icon.node.getComponent(UITransform);
            if (ut) ut.setContentSize(fw * k, fw * k);
          }
        } else {
          void loadIcon(sk.icon).then(() => { const g2 = iconFrame(sk.icon); if (g2) s.icon.spriteFrame = g2; });
        }
      }

      // 等级角标：只有 Lv>1 才显示
      s.lvl.string = sk.lvl > 1 ? String(sk.lvl) : '';
      s.lvl.node.parent!.active = sk.lvl > 1;

      // 3 个模块方块（已装 = 橙）
      s.modDots.fillColor = COL.accent;
      for (let k = 0; k < 3; k++) {
        if (k < sk.modCount) { s.modDots.roundRect(-11 + k * 11, -4.5, 9, 9, 2); }
      }
      s.modDots.fill();
      s.modDots.fillColor = new Color(58, 58, 72);
      for (let k = sk.modCount; k < 3; k++) s.modDots.roundRect(-11 + k * 11, -4.5, 9, 9, 2);
      if (sk.modCount < 3) s.modDots.fill();
      s.modDots.lineWidth = 2; s.modDots.strokeColor = COL.line;
      for (let k = 0; k < 3; k++) s.modDots.roundRect(-11 + k * 11, -4.5, 9, 9, 2);
      s.modDots.stroke();

      // 冷却遮罩：从下往上盖，圆角 6
      if (sk.cdPct > 0.001) {
        s.cd.fillColor = new Color(0, 0, 0, 140);
        const hh = 50 * Math.min(1, sk.cdPct);
        s.cd.roundRect(-25, -25, 50, hh, R.s);
        s.cd.fill();
      }
    }
  }
}
