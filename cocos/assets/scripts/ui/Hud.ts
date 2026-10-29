/**
 * 战斗 HUD —— 顶部信息带 + 底部技能带，**中央战斗区完全留空**
 *
 * M2 视觉升级（规范：docs/ui-redesign/ui_visual_upgrade_v1.md）：
 *   - 顶部加**极薄承载板**（渐隐色带，最高到 S+92），让数字在亮色特效上仍可读，但不盖战斗区
 *   - 左上：HP 156×18（数值 11px）/ EXP 156×12（LV 贴右端）/ 金币 16 图标 + 14px 数值
 *   - 右上：波次 · 击杀（右对齐 300）/ 倒计时 26px（最后 5 秒转红并放大）/ 暂停 36×36（热区 44）
 *   - BOSS：名字 S+64、血条 336×12 @S+80（无 BOSS 不占位）
 *   - 底部：4 个技能槽 54×54，x=81/147/213/279，中心锚定 VH - safeBottom - 63
 *   - **残血态**：HP < 25% 时数值转红 + 血条红框（静态，不闪烁）
 *
 * ⚠️ 位置全部锚定 view.getVisibleSize() / safeTop() / safeBottom()，不得写死 640（KI-009）。
 */
import { Node, Label, Color, Graphics, UITransform, Sprite, UIOpacity, view } from 'cc';
import { panel, gradBar, text, mkNode, onTap, slot, paintPanel } from './UIKit';
import { COL, FS, R, BORDER, MIN_TAP } from './Tokens';
import { iconFrame, loadIcon } from '../engine/Assets';
import { safeTop, safeBottom } from './Safe';

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

const C_HP_TOP = new Color(136, 214, 188, 255);    // 生命：薄荷绿（正向色）
const C_HP_BOT = new Color(62, 158, 124, 255);
const C_XP_TOP = new Color(140, 160, 255, 255);    // 经验：蓝紫
const C_XP_BOT = new Color(64, 91, 168, 255);
const C_HP_TEXT = new Color(240, 118, 128, 255);   // 残血文字：偏暖的珊瑚红（不刺眼）

const C_SLOT_EMPTY = new Color(13, 23, 50, 255);

export class Hud {
  root: Node;
  private vw = 360; private vh = 640;
  private hpBar!: ReturnType<typeof gradBar>;
  private hpText!: Label;
  private hpWarn!: Graphics;
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
  private lastWarn = false;
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
    const S = safeTop();
    const B = safeBottom();

    // ── 受击红光：屏幕四边由外向内逐层变淡 ──
    this.hurtVig = mkNode(this.root, 'hurtVig', VW, VH);
    const hg = this.hurtVig.addComponent(Graphics);
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

    // ── 顶部承载板：渐隐色带（不盖战斗区，只托住数字）──
    const PLATE = S + 92;
    const plate = mkNode(this.root, 'topPlate', VW, PLATE, 0, VH / 2 - PLATE / 2);
    const pg = plate.addComponent(Graphics);
    const BANDS = 6, bh = PLATE / BANDS;
    for (let i = 0; i < BANDS; i++) {
      const a = Math.round(118 * Math.pow(1 - i / BANDS, 1.6));
      pg.fillColor = new Color(9, 14, 30, a);
      pg.rect(-VW / 2, PLATE / 2 - (i + 1) * bh, VW, bh + 0.5);
      pg.fill();
    }

    // ── 左上：HP 156×18 ──
    const HP_W = 156, HP_H = 18;
    let p = at(10 + HP_W / 2, S + 4 + HP_H / 2);
    // ⚠️ 发光层必须先建（渲染在血条**下面**）：放在血条之后会盖住填充、把血条糊成灰块
    const warn = mkNode(this.root, 'hpWarn', HP_W + 4, HP_H + 4, p.x, p.y);
    this.hpWarn = warn.addComponent(Graphics);
    this.hpBar = gradBar(this.root, p.x, p.y, HP_W, HP_H, { dir: 'h', from: C_HP_TOP, to: C_HP_BOT, line: COL.line });
    this.hpText = text(this.root, p.x, p.y - 1, '100/100',
      { size: 11, color: COL.cream, width: HP_W - 8, bold: true, outline: true });

    // ── 经验 156×12，LV 贴右端 ──
    const XP_H = 12;
    p = at(10 + HP_W / 2, S + 25 + XP_H / 2);
    this.expBar = gradBar(this.root, p.x, p.y, HP_W, XP_H, { dir: 'h', from: C_XP_TOP, to: C_XP_BOT, line: COL.line });
    this.lvText = text(this.root, at(10 + HP_W - 5, 0).x, p.y, 'LV.1',
      { size: 10, color: COL.cream, align: 'right', width: 52, bold: true, outline: true });

    // ── 金币：16 图标 + 14px 数值 ──
    const gy = S + 48;
    const coinC = at(18, gy);
    const coin = mkNode(this.root, 'coin', 16, 16, coinC.x, coinC.y);
    const cs = coin.addComponent(Sprite);
    cs.sizeMode = Sprite.SizeMode.CUSTOM; cs.trim = false;
    const cf = iconFrame('ui-gold.png');
    if (cf) cs.spriteFrame = cf;
    else void loadIcon('ui-gold.png').then(() => {
      const f2 = iconFrame('ui-gold.png');
      if (f2 && cs.isValid) cs.spriteFrame = f2;
    });
    this.goldText = text(this.root, at(30, gy).x, at(0, gy).y, '0',
      { size: 14, color: COL.cream, align: 'left', width: 96, bold: true, outline: true });

    // ── 右上：波次 · 击杀 / 倒计时 / 暂停 ──
    this.waveText = text(this.root, at(300, 0).x, at(0, S + 12).y, '波次 1 · 击杀 0',
      { size: 12, color: COL.cream, align: 'right', width: 210, bold: true, outline: true });
    this.timerText = text(this.root, at(300, 0).x, at(0, S + 37).y, '0',
      { size: 26, color: COL.cream, align: 'right', width: 130, bold: true, outline: true, shadow: true });

    // 暂停：视觉 36×36，热区 44（微信硬要求）
    const pauseC = at(332, S + 29);
    const pause = panel(this.root, pauseC.x, pauseC.y, 36, 36, { art: 'panel_soft' });
    const pIcon = mkNode(pause, 'pauseIcon', 36, 36);
    const pgi = pIcon.addComponent(Graphics);
    pgi.fillColor = COL.cream;
    pgi.rect(-6, -8, 4, 16); pgi.rect(3, -8, 4, 16); pgi.fill();
    const hit = mkNode(this.root, 'pauseHit', MIN_TAP, MIN_TAP, pauseC.x, pauseC.y);
    if (onPause) onTap(hit, onPause);

    // ── BOSS：名字 S+64 / 血条 336×12 @S+80（无 BOSS 不占位）──
    this.bossBox = mkNode(this.root, 'bossBox', 336, 34, at(180, S + 72).x, at(0, S + 72).y);
    this.bossName = text(this.bossBox, -166, 8, '', { size: 11, color: COL.accent, align: 'left', width: 330, bold: true, outline: true });
    this.bossBar = gradBar(this.bossBox, 0, -7, 336, 12, {
      dir: 'h', from: new Color(255, 122, 60), to: COL.red, line: COL.line,
    });
    this.bossBox.active = false;

    // ── 底部技能栏 ──
    const SLOT = 54, PITCH = 66;
    const centerY = VH - B - 63;          // 中心锚定：底部安全区往上 63
    for (let i = 0; i < 4; i++) {
      const cx = 81 + i * PITCH;
      const c = at(cx, 0);
      const sk = mkNode(this.root, 'sk' + i, SLOT, SLOT, c.x, VH / 2 - centerY);

      const box = slot(sk, 0, 0, SLOT);
      const ic = mkNode(box, 'icon', 36, 36);
      const isp = ic.addComponent(Sprite);
      isp.sizeMode = Sprite.SizeMode.CUSTOM;
      isp.trim = false;
      const plus = text(box, 0, 1, '＋', { size: 22, color: COL.dash, width: 44, outline: false });

      const cd = mkNode(box, 'cd', SLOT, SLOT);
      const g = cd.addComponent(Graphics);

      // 等级角标：槽右上（18×16），只有 Lv>1 才显示
      const bpx = cx + SLOT / 2 - 8, bpy = centerY - SLOT / 2 + 8;
      const badge = mkNode(this.root, 'stack', 18, 16, at(bpx, 0).x, VH / 2 - bpy);
      const bg = badge.addComponent(Graphics);
      bg.fillColor = COL.accent;
      bg.rect(-9, -8, 18, 16); bg.fill();
      bg.lineWidth = 2; bg.strokeColor = COL.line; bg.rect(-9, -8, 18, 16); bg.stroke();
      const lv = text(badge, 0, 1, '', { size: 10, color: COL.ink, width: 16, bold: true, outline: false });

      // 3 个黑科技方块：槽内底部
      const dots = mkNode(box, 'mods', 42, 9, 0, -SLOT / 2 + 7);
      const dg = dots.addComponent(Graphics);

      const nm = text(sk, 0, -34, '', { size: 10, color: COL.dim, width: SLOT + 6 });
      nm.node.active = false;

      this.slots.push({ node: sk, cd: g, lvl: lv, icon: isp, modDots: dg, name: nm, plus });
    }
  }

  sync(d: HudData) {
    const ratio = d.maxhp > 0 ? Math.max(0, d.hp) / d.maxhp : 0;
    this.hpBar.set(ratio);
    this.hpText.string = Math.max(0, Math.round(d.hp)) + ' / ' + Math.round(d.maxhp);
    this.expBar.set(d.expNeed > 0 ? d.exp / d.expNeed : 0);
    this.lvText.string = 'LV.' + d.lv;
    this.goldText.string = String(d.gold);
    this.waveText.string = '波次 ' + d.wave + ' · 击杀 ' + d.kills;

    // 残血态：数值转红 + **柔和外发光**（低于 25%，静态不闪烁）
    //   用户反馈（2026-10-29）：硬红框太"框"，改成泛光/阴影，且不要过饱和。
    const warn = ratio > 0 && ratio < 0.25;
    if (warn !== this.lastWarn) {
      this.lastWarn = warn;
      this.hpText.color = warn ? C_HP_TEXT : COL.cream;
      this.hpWarn.clear();
      if (warn) {
        // 血条外圈光晕：**四边等宽**（用户 2026-10-29 第三轮反馈：上左右比下宽，看着不对齐）
        //   · 宽度统一 2.5px —— 上限由经验条决定：血条底边到经验条顶边只有 3px
        //   · 两层：外圈 2.5px（淡）+ 内圈 1.1px（浓），叠出"边缘实、往外化开"的效果
        const W = 156, H = 18, GLOW = 2.5;
        this.hpWarn.fillColor = new Color(214, 88, 106, 38);
        this.hpWarn.roundRect(-W / 2 - GLOW, -H / 2 - GLOW, W + GLOW * 2, H + GLOW * 2, 7);
        this.hpWarn.fill();
        this.hpWarn.fillColor = new Color(224, 100, 116, 92);
        this.hpWarn.roundRect(-W / 2 - 1.1, -H / 2 - 1.1, W + 2.2, H + 2.2, 5);
        this.hpWarn.fill();
      }
    }

    const left = Math.ceil(d.waveLeft);
    this.timerText.string = d.waveLeft > 0 ? String(Math.max(0, left)) : '';
    const urgent = d.waveLeft > 0 && left <= 5;
    this.timerText.color = urgent ? COL.red : COL.cream;
    this.timerText.node.setScale(urgent ? 1.12 : 1, urgent ? 1.12 : 1, 1);

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
        paintPanel(box, 54, 54, { art: 'well' });
        s.icon.spriteFrame = null;
        s.lvl.node.parent!.active = false;
        s.plus.node.active = true;
        for (let k = 0; k < 3; k++) s.modDots.rect(-15 + k * 12, -4.5, 9, 9);
        s.modDots.fillColor = new Color(42, 58, 92);
        s.modDots.fill();
        s.modDots.lineWidth = 2; s.modDots.strokeColor = COL.line;
        for (let k = 0; k < 3; k++) s.modDots.rect(-15 + k * 12, -4.5, 9, 9);
        s.modDots.stroke();
        continue;
      }
      paintPanel(box, 54, 54, { art: 'slot' });
      s.plus.node.active = false;

      if (sk.icon) {
        const f = iconFrame(sk.icon);
        if (f) {
          if (s.icon.spriteFrame !== f) {
            s.icon.spriteFrame = f;
            const fw = f.rect.width || 32;
            const k = Math.max(1, Math.floor(36 / fw));
            const ut = s.icon.node.getComponent(UITransform);
            if (ut) ut.setContentSize(fw * k, fw * k);
          }
        } else {
          void loadIcon(sk.icon).then(() => { const g2 = iconFrame(sk.icon); if (g2) s.icon.spriteFrame = g2; });
        }
      }

      s.lvl.string = sk.lvl > 1 ? String(sk.lvl) : '';
      s.lvl.node.parent!.active = sk.lvl > 1;

      s.modDots.fillColor = COL.accent;
      for (let k = 0; k < 3; k++) if (k < sk.modCount) s.modDots.rect(-15 + k * 12, -4.5, 9, 9);
      s.modDots.fill();
      s.modDots.fillColor = new Color(42, 58, 92);
      for (let k = sk.modCount; k < 3; k++) s.modDots.rect(-15 + k * 12, -4.5, 9, 9);
      if (sk.modCount < 3) s.modDots.fill();
      s.modDots.lineWidth = 2; s.modDots.strokeColor = COL.line;
      for (let k = 0; k < 3; k++) s.modDots.rect(-15 + k * 12, -4.5, 9, 9);
      s.modDots.stroke();

      // 冷却遮罩：从下往上盖（透明度压到 120，图标仍可辨认）
      if (sk.cdPct > 0.001) {
        s.cd.fillColor = new Color(0, 0, 0, 120);
        const hh = 54 * Math.min(1, sk.cdPct);
        s.cd.rect(-27, -27, 54, hh);
        s.cd.fill();
      }
    }
  }
}
