/**
 * UI 工具箱 —— 把规格里的"硬描边 + 硬投影"做成绘制原语
 *
 * 全部用 `Graphics` 画（不引入任何素材），因此：
 *   - 不会和 D-28「UI 只用第一版（Möbelmon 扁平风）」冲突
 *   - 也不会有像素素材缩放糊边的问题
 *
 * 坐标系：Canvas 原点在屏幕中心，y 向上。
 * 所有 helper 的 (x, y) 都是**节点中心**，尺寸为逻辑像素（与 360x640 设计分辨率一致）。
 */
import { Node, Graphics, Label, UITransform, Color, Sprite, SpriteFrame, Texture2D, ImageAsset, Rect, Size } from 'cc';
import { COL, R, FS, BORDER, SHADOW_OFF } from './Tokens';

// ---------- 基础 ----------
export function mkNode(parent: Node, name: string, w: number, h: number, x = 0, y = 0): Node {
  const n = new Node(name);
  n.parent = parent;
  const ut = n.addComponent(UITransform);
  ut.setContentSize(w, h);
  const r = (n as unknown as { _uiR: number[] })._uiR ?? null;
  void r;
  n.setPosition(x, y, 0);
  return n;
}

/** 1x1 白图（运行时生成，用来给纯色块上色） */
let _white: SpriteFrame | null = null;
export function whiteFrame(): SpriteFrame {
  if (_white) return _white;
  const data = new Uint8Array(4 * 4 * 4).fill(255);
  const img = new ImageAsset({ _data: data, width: 4, height: 4, format: Texture2D.PixelFormat.RGBA8888, _compressed: false } as never);
  const tex = new Texture2D(); tex.image = img;
  tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
  const sf = new SpriteFrame(); sf.texture = tex;
  sf.rect = new Rect(0, 0, 4, 4); sf.originalSize = new Size(4, 4); sf.packable = false;
  _white = sf; return sf;
}

// ---------- 面板 / 卡片 ----------
export interface PanelOpts {
  bg?: Color; line?: Color; radius?: number; shadow?: boolean; border?: boolean;
}

/**
 * 一屏里最常用的盒子：圆角 + 2px 硬描边 + `0 Npx 0` 硬投影
 * （硬投影 = 再画一个同形状的深色块，偏移几个像素，**不模糊**）
 */
export function panel(parent: Node, x: number, y: number, w: number, h: number, o: PanelOpts = {}): Node {
  const n = mkNode(parent, 'panel', w, h, x, y);
  const g = n.addComponent(Graphics);
  const r = o.radius ?? R.m;
  const bg = o.bg ?? COL.bg2;
  const ln = o.line ?? COL.line;
  if (o.shadow !== false) {
    g.fillColor = COL.shadow;
    g.roundRect(-w / 2 + SHADOW_OFF.x, -h / 2 - SHADOW_OFF.y, w, h, r);
    g.fill();
  }
  g.fillColor = bg;
  g.roundRect(-w / 2, -h / 2, w, h, r);
  g.fill();
  if (o.border !== false) {
    g.lineWidth = BORDER;
    g.strokeColor = ln;
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.stroke();
  }
  return n;
}

/** 进度条（血条/经验条）：底 + 填充 + 2px 描边 */
export function bar(parent: Node, x: number, y: number, w: number, h: number, fill: Color, back: Color): { node: Node; set: (v: number) => void } {
  const n = mkNode(parent, 'bar', w, h, x, y);
  const g = n.addComponent(Graphics);
  g.fillColor = back; g.roundRect(-w / 2, -h / 2, w, h, R.s); g.fill();

  const f = mkNode(n, 'fill', w, h);
  const fg = f.addComponent(Graphics);
  let cur = 1;
  const redraw = () => {
    fg.clear();
    const ww = Math.max(0, w - BORDER * 2) * cur;
    if (ww <= 0) return;
    fg.fillColor = fill;
    fg.roundRect(-w / 2 + BORDER, -h / 2 + BORDER, ww, h - BORDER * 2, R.s - 1);
    fg.fill();
  };
  redraw();

  g.lineWidth = BORDER; g.strokeColor = COL.line;
  g.roundRect(-w / 2, -h / 2, w, h, R.s); g.stroke();
  return { node: n, set: (v: number) => { cur = Math.max(0, Math.min(1, v)); redraw(); } };
}

// ---------- 文字 ----------
export interface TextOpts { size?: number; color?: Color; align?: 'left' | 'center' | 'right'; bold?: boolean; width?: number; }

export function text(parent: Node, x: number, y: number, str: string, o: TextOpts = {}): Label {
  const n = mkNode(parent, 'text', o.width ?? 300, (o.size ?? FS.s) + 6, x, y);
  const l = n.addComponent(Label);
  l.string = str;
  l.fontSize = o.size ?? FS.s;
  l.lineHeight = (o.size ?? FS.s) + 4;
  l.color = o.color ?? COL.cream;
  l.isBold = !!o.bold;
  l.horizontalAlign = o.align === 'left' ? Label.HorizontalAlign.LEFT
    : o.align === 'right' ? Label.HorizontalAlign.RIGHT
    : Label.HorizontalAlign.CENTER;
  l.verticalAlign = Label.VerticalAlign.CENTER;
  return l;
}

// ---------- 按钮 ----------
export interface BtnOpts {
  bg?: Color; line?: Color; fg?: Color; size?: number; radius?: number;
  primary?: boolean;      // 主按钮 = 强调色底
  disabled?: boolean;
}

/**
 * 按钮：**至少 44x44 热区**（规格 §1.1 最小热区）
 * 返回 node，`onTap` 由调用方挂触摸事件（UIKit 不接管输入，避免和摇杆抢事件）
 */
export function button(parent: Node, x: number, y: number, w: number, h: number, str: string, o: BtnOpts = {}): { node: Node; label: Label; setEnabled: (v: boolean) => void } {
  const hh = Math.max(44, h);              // 热区下限 44
  const primary = !!o.primary;
  const bg = o.disabled ? COL.bg2 : (o.bg ?? (primary ? COL.accent : COL.bg3));
  const fg = o.disabled ? COL.line2 : (o.fg ?? (primary ? COL.bg0 : COL.cream));
  const n = panel(parent, x, y, w, hh, {
    bg, line: o.line ?? (primary ? COL.accentD : COL.line2), radius: o.radius ?? R.m,
  });
  const l = text(n, 0, 1, str, { size: o.size ?? FS.m, color: fg, align: 'center', bold: primary, width: w - 12 });
  return {
    node: n, label: l,
    setEnabled: (v: boolean) => {
      l.color = v ? fg : COL.line2;
      const g = n.getComponent(Graphics);
      if (!g) return;
      g.clear();
      g.fillColor = COL.shadow; g.roundRect(-w / 2, -hh / 2 - SHADOW_OFF.y, w, hh, o.radius ?? R.m); g.fill();
      g.fillColor = v ? bg : COL.bg2; g.roundRect(-w / 2, -hh / 2, w, hh, o.radius ?? R.m); g.fill();
      g.lineWidth = BORDER; g.strokeColor = v ? (o.line ?? (primary ? COL.accentD : COL.line2)) : COL.line;
      g.roundRect(-w / 2, -hh / 2, w, hh, o.radius ?? R.m); g.stroke();
    },
  };
}

// ---------- 遮罩 ----------
/** 模态遮罩：rgba(5,8,15,.74)，盖住整屏并吃掉点击 */
export function mask(parent: Node, w: number, h: number): Node {
  const n = mkNode(parent, 'mask', w, h);
  const g = n.addComponent(Graphics);
  g.fillColor = COL.mask;
  g.rect(-w / 2, -h / 2, w, h);
  g.fill();
  const sp = n.addComponent(Sprite);
  sp.spriteFrame = whiteFrame();
  sp.sizeMode = Sprite.SizeMode.CUSTOM;
  sp.color = COL.mask;
  sp.enabled = false;              // 用 Graphics 画就够了，Sprite 只为了让节点可点
  return n;
}

/** 全屏容器 */
export function screen(parent: Node, name: string, bg?: Color): Node {
  const n = mkNode(parent, name, 360, 640, 0, 0);
  if (bg) {
    const g = n.addComponent(Graphics);
    g.fillColor = bg; g.rect(-180, -320, 360, 640); g.fill();
  }
  return n;
}

// ---------- 触摸 ----------
/**
 * 给节点挂点击。UIKit 不主动接管输入，只提供这一个入口，
 * 免得和摇杆抢事件（摇杆是全局 input，屏幕是节点事件）。
 */
export function onTap(node: Node, cb: () => void) {
  node.on(Node.EventType.TOUCH_END, () => cb(), node);
}
