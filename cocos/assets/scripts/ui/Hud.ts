/**
 * 战斗 HUD —— 顶部状态带 + 底部技能带，**中央战斗区完全留空**
 *
 * v2 改造（像素共鸣 UI 专项）：
 *   - 素材：技能槽 / 暂停键 / 状态条全部走 ui/Art 的九宫格（Kenney Pixel UI Pack，CC0）
 *   - 语义色按规范重排：**生命=绿、经验=蓝紫、危险/BOSS=红、强调=橙、选中/当前=青**
 *     （旧版生命是红色、经验是绿色，与"红=危险"的语义冲突）
 *   - 顶部按 `safeTop()` 让开刘海 / 状态栏（旧版写死 11，刘海机会被压住）
 *
 * 布局（设计坐标，原点屏幕左上、y 向下 360x640，顶部另加安全区 S）：
 *   S+2   左上 HP 条 156x18（含数值）
 *   S+22  XP 条 156x14（LV 嵌在条内右端）
 *   S+40  金币图标 + 数字
 *   S+6   右上「波次 · 击杀」（右对齐至 350）
 *   S+30  右上倒计时（26px，最后 5 秒变红放大）
 *   S+64  右上暂停键 34x34（热区 44）
 *   S+86  BOSS 血条（仅 BOSS 波显示）
 *   底部：4 个技能槽 54x54，间距 12，居中，距底 36；槽内底部 3 个黑科技方块
 *
 * ⚠️ 视线安全区（顶部带以下 ~ S+110 ~ 技能带以上）不得被任何常驻 UI 侵占。
 * ⚠️ 位置全部锚定 `view.getVisibleSize()`，不得写死 640（KI-009）。
 */
import { Node, Label, Color, Graphics, UITransform, Sprite, UIOpacity, view } from 'cc';
import { panel, gradBar, text, mkNode, onTap, slot, paintPanel } from './UIKit';
import { COL, FS, R, BORDER, MIN_TAP } from './Tokens';
import { iconFrame, loadIcon } from '../engine/Assets';
import { safeTop } from './Safe';

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

const C_HP_TOP = new Color(126, 224, 126, 255);    // 生命：亮绿
const C_HP_BOT = new Color(52, 148, 74, 255);      // 生命：深绿
const C_XP_TOP = new Color(140, 156, 255, 255);    // 经验：亮蓝紫
const C_XP_BOT = new Color(64, 82, 200, 255);      // 经验：深蓝紫
const C_SLOT_EMPTY = new Color(21, 21, 28, 255);   // 空槽底色

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
    const S = safeTop();               // 顶部安全区（刘海 / 状态栏）

    // ── 受击红光：屏幕四边由外向内逐层变淡（容器整体调 opacity）──
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

    // ── 左上：HP 条 156x18 ─────────────────────────────────────
    const HP_W = 156, HP_H = 18;
    let p = at(10 + HP_W / 2, S + 2 + HP_H / 2);
    this.hpBar = gradBar(this.root, p.x, p.y, HP_W, HP_H, {
      dir: 'h', from: C_HP_TOP, to: C_HP_BOT, line: COL.line,
    });
    this.hpText = text(this.root, p.x, p.y - 1, '100/100',
      { size: 10, color: COL.cream, width: HP_W - 8, bold: true, outline: true });

    // ── 经验条 156x14 @S+22，LV 嵌在条内右端 ────────────────────
    const XP_H = 14;
    p = at(10 + HP_W / 2, S + 22 + XP_H / 2);
    this.expBar = gradBar(this.root, p.x, p.y, HP_W, XP_H, {
      dir: 'h', from: C_XP_TOP, to: C_XP_BOT, line: COL.line,
    });
    this.lvText = text(this.root, at(10 + HP_W - 5, 0).x, p.y, 'LV.1',
      { size: 10, color: COL.cream, align: 'right', width: 52, bold: true, outline: true });

    // ── 金币：素材图标 16x16 + 数字 ─────────────────────────────
    const gy = S + 40 + 8;
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
    this.goldText = text(this.root, at(29, gy).x, at(0, gy).y, '0',
      { size: 15, color: COL.cream, align: 'left', width: 90, bold: true, outline: true });

    // ── 右上：波次 / 倒计时 / 暂停 ─────────────────────────────
    this.waveText = text(this.root, at(350, 0).x, at(0, S + 8).y, '波次 1 · 击杀 0',
      { size: 12, color: COL.cream, align: 'right', width: 210, bold: true, outline: true });

    this.timerText = text(this.root, at(350, 0).x, at(0, S + 32).y, '0',
      { size: 24, color: COL.cream, align: 'right', width: 120, bold: true, outline: true, shadow: true });

    // 暂停 34x34 九宫格（中心 S+64+17），热区扩到 44（微信硬要求）
    const pauseC = at(350 - 17, S + 64 + 17);
    const pause = panel(this.root, pauseC.x, pauseC.y, 34, 34, { art: 'panel_soft' });
    // ⚠️ 图标必须画在**子节点**：panel 节点上已挂了 Sprite，同节点再加 Graphics 会互相打架
    const pIcon = mkNode(pause, 'pauseIcon', 34, 34);
    const pg = pIcon.addComponent(Graphics);
    pg.fillColor = COL.cream;
    pg.rect(-6, -7, 4, 14); pg.rect(2, -7, 4, 14); pg.fill();
    const hit = mkNode(this.root, 'pauseHit', MIN_TAP, MIN_TAP, pauseC.x, pauseC.y);
    if (onPause) onTap(hit, onPause);

    // ── BOSS 血条（S+96 起，BOSS 波才显示）────────────────────
    const bz = at(184, S + 96 + 18);
    this.bossBox = mkNode(this.root, 'bossBox', 336, 36, bz.x, bz.y);
    this.bossName = text(this.bossBox, -168 + 2, 13, '', { size: 11, color: COL.accent, align: 'left', width: 330, bold: true, outline: true });
    this.bossBar = gradBar(this.bossBox, 0, -7, 336, 12, {
      dir: 'h', from: new Color(255, 122, 60), to: COL.red, line: COL.line,
    });
    this.bossBox.active = false;

    // ── 底部技能栏 ─────────────────────────────────────────────
    // ⚠️ 必须**按屏幕底部定位**，不能按"设计稿的绝对 y"（760 屏会悬空 120px）
    const SLOT = 54, PITCH = 66;
    const FROM_BOTTOM = 36 + SLOT / 2;      // 槽中心离屏幕底
    for (let i = 0; i < 4; i++) {
      const cx = 81 + i * PITCH;
      const c = at(cx, VH - FROM_BOTTOM);
      const sk = mkNode(this.root, 'sk' + i, SLOT, SLOT, c.x, c.y);

      const box = slot(sk, 0, 0, SLOT);
      const ic = mkNode(box, 'icon', 36, 36);
      const isp = ic.addComponent(Sprite);
      isp.sizeMode = Sprite.SizeMode.CUSTOM;
      isp.trim = false;
      const plus = text(box, 0, 1, '＋', { size: 22, color: COL.dash, width: 44, outline: false });

      const cd = mkNode(box, 'cd', SLOT, SLOT);
      const g = cd.addComponent(Graphics);

      // 等级角标：槽右上（18x16）
      const bp = at(cx + SLOT / 2 - 8, VH - FROM_BOTTOM - SLOT / 2 + 8);
      const badge = mkNode(this.root, 'stack', 18, 16, bp.x, bp.y);
      const bg = badge.addComponent(Graphics);
      bg.fillColor = COL.accent;
      bg.rect(-9, -8, 18, 16); bg.fill();
      bg.lineWidth = 2; bg.strokeColor = COL.line; bg.rect(-9, -8, 18, 16); bg.stroke();
      const lv = text(badge, 0, 1, '', { size: 10, color: COL.ink, width: 16, bold: true, outline: false });

      // 3 个黑科技方块：**槽内底部**（原来在槽下方，矮屏会贴到屏幕边）
      const dots = mkNode(box, 'mods', 42, 9, 0, -SLOT / 2 + 7);
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
    this.waveText.string = '波次 ' + d.wave + ' · 击杀 ' + d.kills;
    const left = Math.ceil(d.waveLeft);
    this.timerText.string = d.waveLeft > 0 ? String(Math.max(0, left)) : '';
    // 最后 5 秒倒计时变红放大，给"这一波要结束了"的感知
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
        paintPanel(box, 54, 54, { art: 'well' });
        s.icon.spriteFrame = null;
        s.lvl.node.parent!.active = false;
        s.plus.node.active = true;
        for (let k = 0; k < 3; k++) s.modDots.rect(-15 + k * 12, -4.5, 9, 9);
        s.modDots.fillColor = new Color(58, 58, 72);
        s.modDots.fill();
        s.modDots.lineWidth = 2; s.modDots.strokeColor = COL.line;
        for (let k = 0; k < 3; k++) s.modDots.rect(-15 + k * 12, -4.5, 9, 9);
        s.modDots.stroke();
        continue;
      }
      paintPanel(box, 54, 54, { art: 'slot' });
      s.plus.node.active = false;

      // 图标：整数倍缩放，目标 ~36px（非整数倍会糊）
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

      // 等级角标：只有 Lv>1 才显示
      s.lvl.string = sk.lvl > 1 ? String(sk.lvl) : '';
      s.lvl.node.parent!.active = sk.lvl > 1;

      // 3 个黑科技方块（已装 = 橙）
      s.modDots.fillColor = COL.accent;
      for (let k = 0; k < 3; k++) {
        if (k < sk.modCount) { s.modDots.rect(-15 + k * 12, -4.5, 9, 9); }
      }
      s.modDots.fill();
      s.modDots.fillColor = new Color(58, 58, 72);
      for (let k = sk.modCount; k < 3; k++) s.modDots.rect(-15 + k * 12, -4.5, 9, 9);
      if (sk.modCount < 3) s.modDots.fill();
      s.modDots.lineWidth = 2; s.modDots.strokeColor = COL.line;
      for (let k = 0; k < 3; k++) s.modDots.rect(-15 + k * 12, -4.5, 9, 9);
      s.modDots.stroke();

      // 冷却遮罩：从下往上盖
      if (sk.cdPct > 0.001) {
        s.cd.fillColor = new Color(0, 0, 0, 140);
        const hh = 54 * Math.min(1, sk.cdPct);
        s.cd.rect(-27, -27, 54, hh);
        s.cd.fill();
      }
    }
  }
}
