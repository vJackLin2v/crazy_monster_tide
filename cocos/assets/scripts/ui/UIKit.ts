/**
 * UI 工具箱 —— 规格 v1.1 的绘制原语
 *
 * 视觉语言：**3px 纯黑描边 + 硬投影（画偏移黑块）+ 高饱和色块 + 描边粗体字**
 * 全部用 `Graphics` 画（D-32），不引入任何 UI 素材。
 *
 * 坐标系：Canvas 原点在屏幕中心，y 向上。所有 helper 的 (x, y) 都是**节点中心**。
 * ⚠️ 位置必须锚定 `view.getVisibleSize()`，不得写死 640（KI-009 的教训）。
 */
import { Node, Graphics, Label, LabelOutline, UITransform, Color, Sprite, SpriteFrame,
         Texture2D, ImageAsset, Rect, Size, view } from 'cc';
import { COL, R, FS, BORDER, SHADOW_OFF, SHADOW_BTN } from './Tokens';
import { Sfx } from '../engine/Audio';

// ---------- 基础 ----------
export function mkNode(parent: Node, name: string, w: number, h: number, x = 0, y = 0): Node {
  const n = new Node(name);
  n.parent = parent;
  const ut = n.addComponent(UITransform);
  ut.setContentSize(w, h);
  n.setPosition(x, y, 0);
  return n;
}

/** 1x1 白图（运行时生成，给纯色块上色用） */
let _white: SpriteFrame | null = null;
export function whiteFrame(): SpriteFrame {
  if (_white) return _white;
  const data = new Uint8Array(4 * 4 * 4).fill(255);
  const img = new ImageAsset({ _data: data, width: 4, height: 4, format: 0 } as never);
  const tex = new Texture2D();
  tex.image = img;
  const sf = new SpriteFrame();
  sf.texture = tex;
  sf.rect = new Rect(0, 0, 4, 4);
  _white = sf;
  return _white;
}

// ---------- 屏幕 / 遮罩 ----------
export function screen(parent: Node, name: string, bg?: Color): Node {
  const vs = view.getVisibleSize();
  const n = mkNode(parent, name, vs.width, vs.height, 0, 0);
  if (bg) {
    const g = n.addComponent(Graphics);
    g.fillColor = bg;
    g.rect(-vs.width / 2, -vs.height / 2, vs.width, vs.height);
    g.fill();
  }
  return n;
}

export function mask(parent: Node, w = 360, h = 640): Node {
  const n = mkNode(parent, 'mask', w, h, 0, 0);
  const g = n.addComponent(Graphics);
  g.fillColor = COL.mask;
  g.rect(-w / 2, -h / 2, w, h);
  g.fill();
  return n;
}

// ---------- 面板（3px 黑边 + 硬投影）----------
export interface PanelOpts {
  bg?: Color; line?: Color; radius?: number;
  shadow?: boolean;      // 默认 true：画一个 y 偏移 -4 的纯黑圆角块
  border?: boolean;      // 默认 true
}

export function panel(parent: Node, x: number, y: number, w: number, h: number, o: PanelOpts = {}): Node {
  const n = mkNode(parent, 'panel', w, h, x, y);
  const g = n.addComponent(Graphics);
  const r = o.radius ?? R.m;
  const bg = o.bg ?? COL.bg2;
  const ln = o.line ?? COL.line;
  if (o.shadow !== false) {
    g.fillColor = COL.shadow;
    g.roundRect(-w / 2, -h / 2 - SHADOW_OFF.y, w, h, r);
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

/** 重绘一个 panel 的底（用于状态切换：选中/禁用） */
export function paintPanel(n: Node, w: number, h: number, o: PanelOpts = {}): void {
  const g = n.getComponent(Graphics);
  if (!g) return;
  const r = o.radius ?? R.m;
  g.clear();
  if (o.shadow !== false) {
    g.fillColor = COL.shadow;
    g.roundRect(-w / 2, -h / 2 - SHADOW_OFF.y, w, h, r);
    g.fill();
  }
  g.fillColor = o.bg ?? COL.bg2;
  g.roundRect(-w / 2, -h / 2, w, h, r);
  g.fill();
  if (o.border !== false) {
    g.lineWidth = BORDER;
    g.strokeColor = o.line ?? COL.line;
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.stroke();
  }
}

// ---------- 文字 ----------
export interface TextOpts {
  size?: number; color?: Color; align?: 'left' | 'center' | 'right';
  width?: number; bold?: boolean;
  /** 节点高度。多行文本必须传，否则默认"单行高"，换行后的第二行会被裁掉 */
  h?: number;
  /** 黑色描边（规格：正文一律带 2px 黑描边） */
  outline?: boolean;
  /** 向下 4px 硬投影（规格：标题/大字用，叠两个 Label） */
  shadow?: boolean;
}

/**
 * ⚠️ (x, y) 的语义按对齐方式解释：
 *    左对齐 -> x 是**文字左边界**；右对齐 -> x 是右边界；居中 -> x 是中心。
 */
export function text(parent: Node, x: number, y: number, str: string, o: TextOpts = {}): Label {
  const w = o.width ?? 300;
  const size = o.size ?? FS.s;
  const cx = o.align === 'left' ? x + w / 2 : o.align === 'right' ? x - w / 2 : x;
  if (o.shadow) {
    // 先画下层黑字（向下 4px），再画本体 —— 这就是 CSS `0 4px 0 #000` 的做法
    const s = mkNode(parent, 'textShadow', w, o.h ?? (Math.round(size * 1.5) + 4), cx, y - 4);
    const sl = s.addComponent(Label);
    sl.string = str;
    sl.fontSize = size;
    sl.lineHeight = Math.round(size * 1.5);
    sl.color = COL.shadow;
    sl.isBold = true;
    sl.overflow = Label.Overflow.CLAMP;
    sl.horizontalAlign = o.align === 'left' ? Label.HorizontalAlign.LEFT
      : o.align === 'right' ? Label.HorizontalAlign.RIGHT : Label.HorizontalAlign.CENTER;
    sl.verticalAlign = Label.VerticalAlign.CENTER;
  }
  const n = mkNode(parent, 'text', w, o.h ?? (Math.round(size * 1.5) + 4), cx, y);
  const l = n.addComponent(Label);
  l.string = str;
  l.fontSize = size;
  l.lineHeight = Math.round(size * 1.5);
  l.color = o.color ?? COL.cream;
  l.isBold = !!o.bold;
  l.overflow = Label.Overflow.CLAMP;
  l.enableWrapText = true;
  l.horizontalAlign = o.align === 'left' ? Label.HorizontalAlign.LEFT
    : o.align === 'right' ? Label.HorizontalAlign.RIGHT : Label.HorizontalAlign.CENTER;
  l.verticalAlign = Label.VerticalAlign.CENTER;
  if (o.outline !== false && (o.bold || size >= 13)) {
    const ol = n.addComponent(LabelOutline);
    ol.color = COL.line;
    ol.width = 2;
  }
  return l;
}

/** 屏幕标题：26px 加粗白字 + 黑描边 + 向下硬投影，居中 */
export function title(parent: Node, y: number, str: string, o: { color?: Color; width?: number } = {}): Label {
  return text(parent, 0, y, str, {
    size: FS.l, color: o.color ?? COL.cream, bold: true, width: o.width ?? 340,
    outline: true, shadow: true,
  });
}

/**
 * DEMO 时代的「标题 + 副标题」块（保留此名，内部已改为 v1.1 样式）
 * 返回**内容起始 y**（标题块下沿）。
 */
export function titleBlock(parent: Node, t: string, sub?: string,
                           o: { color?: Color; topY?: number } = {}): number {
  const vs = view.getVisibleSize();
  const top = o.topY ?? vs.height / 2;
  const nH = FS.l + 6;
  const cy = top - 12 - nH / 2;          // 规格：上边距 12
  title(parent, cy, t, { color: o.color });
  let y = top - 12 - nH - 4;
  if (sub) {
    const sH = FS.xs + 6;
    text(parent, 0, y - sH / 2, sub, { size: FS.xs, color: COL.dim, width: 340 });
    y -= sH + 8;
  }
  return y;
}

// ---------- 按钮 ----------
export interface BtnOpts {
  primary?: boolean; danger?: boolean;
  bg?: Color; line?: Color; fg?: Color; size?: number; radius?: number;
  disabled?: boolean; shadow?: boolean;
}

/**
 * 按钮：3px 黑边 + `0 5px 0` 纯黑硬投影；主按钮 = 橙底深字。
 * 热区下限 44（微信硬要求）。
 */
export function button(parent: Node, x: number, y: number, w: number, h: number,
                       str: string, o: BtnOpts = {}): { node: Node; label: Label; setEnabled: (v: boolean) => void } {
  const hh = Math.max(44, h);
  const bg = o.disabled ? COL.bg3 : (o.bg ?? (o.primary ? COL.accent : o.danger ? COL.red : COL.bg3));
  const fg = o.disabled ? COL.dim2 : (o.fg ?? (o.primary ? COL.ink : COL.cream));
  const n = mkNode(parent, 'btn', w, hh, x, y);
  const draw = (enabled: boolean) => {
    let g = n.getComponent(Graphics);
    if (!g) g = n.addComponent(Graphics);
    const r = o.radius ?? R.m;
    g.clear();
    if (!o.disabled) {
      g.fillColor = COL.shadow;
      g.roundRect(-w / 2, -hh / 2 - SHADOW_BTN, w, hh, r);
      g.fill();
    }
    g.fillColor = enabled ? bg : COL.bg3;
    g.roundRect(-w / 2, -hh / 2, w, hh, r);
    g.fill();
    g.lineWidth = BORDER;
    g.strokeColor = COL.line;
    g.roundRect(-w / 2, -hh / 2, w, hh, r);
    g.stroke();
  };
  draw(!o.disabled);
  // ⚠️ 主按钮是「橙底 + 深棕字」：若再叠 2px 黑描边，字会被描边吃掉、糊成一团（用户反馈）。
  //    所以主按钮不加描边；次/危险按钮是深底白字，保留描边反而更清晰。
  const l = text(n, 0, 1, str, {
    size: o.size ?? FS.s, color: fg, align: 'center', bold: true, width: w - 12, outline: !o.primary,
  });
  return {
    node: n, label: l,
    setEnabled: (v: boolean) => { l.color = v ? fg : COL.dim2; draw(v); },
  };
}

// ---------- 槽位 / 标签 ----------
/** 槽位方块：`#1b1b24` 底 + 3px 黑边 + 圆角 8；空槽用 `empty`（底色更深、内容灰色） */
export function slot(parent: Node, x: number, y: number, size: number,
                     o: { empty?: boolean; radius?: number; color?: Color } = {}): Node {
  const n = panel(parent, x, y, size, size, {
    bg: o.empty ? COL.bg0 : COL.bg2,
    line: COL.line,
    radius: o.radius ?? R.m,
    shadow: false,
  });
  void o.color;
  return n;
}

/** 标签 chip：3px 黑边 + 圆角 6，按类型换描边色 */
export function chip(parent: Node, x: number, y: number, str: string,
                     o: { color?: Color; bg?: Color; size?: number; dark?: boolean } = {}): Node {
  const size = o.size ?? FS.xs;
  const w = Math.max(34, str.length * (size + 1) + 14);
  const h = size + 11;
  const n = panel(parent, x, y, w, h, {
    bg: o.bg ?? COL.bg3, line: o.color ?? COL.line2, radius: R.s, shadow: false,
  });
  // dark = 字是深色、底是亮色 -> **不能加黑描边**（会被描边糊掉）
  text(n, 0, 1, str, { size, color: o.color ?? COL.cream, bold: true, width: w - 6, outline: !o.dark });
  return n;
}

// ---------- 进度条（渐变 = 切条，逐条 fill）----------
export interface GradBarOpts { dir: 'h' | 'v'; from: Color; to: Color; radius?: number; line?: Color }

export function gradBar(parent: Node, x: number, y: number, w: number, h: number,
                        o: GradBarOpts): { node: Node; set: (v: number) => void } {
  const r = o.radius ?? R.bar;
  const n = mkNode(parent, 'gradbar', w, h, x, y);
  const g = n.addComponent(Graphics);
  // 底槽
  g.fillColor = COL.hpBack;
  g.roundRect(-w / 2, -h / 2, w, h, r);
  g.fill();
  if (o.line) {
    g.lineWidth = BORDER; g.strokeColor = o.line;
    g.roundRect(-w / 2, -h / 2, w, h, r);
    g.stroke();
  }
  const inner = mkNode(n, 'fill', w, h);
  const fg = inner.addComponent(Graphics);
  const PAD = o.line ? BORDER : 0;
  const iw = w - PAD * 2, ih = h - PAD * 2;

  const lerp = (a: Color, b: Color, t: number) => new Color(
    Math.round(a.r + (b.r - a.r) * t), Math.round(a.g + (b.g - a.g) * t),
    Math.round(a.b + (b.b - a.b) * t), 255);

  const redraw = (v: number) => {
    fg.clear();
    const k = Math.max(0, Math.min(1, v));
    if (k <= 0.001) return;
    // ⚠️ 每条带必须**单独 rect + fill**：fillColor 在 fill() 时才作用于整条路径，
    //    设 N 次颜色只 fill 一次 -> 只有最后一个颜色生效（渐变会退化成纯色）。
    const STEPS = o.dir === 'h' ? 16 : 10;
    if (o.dir === 'h') {
      const seg = iw * k / STEPS;
      for (let i = 0; i < STEPS; i++) {
        fg.fillColor = lerp(o.from, o.to, i / (STEPS - 1));
        fg.rect(-w / 2 + PAD + i * seg, -h / 2 + PAD, seg + 0.5, ih);
        fg.fill();
      }
    } else {
      const seg = ih / STEPS;
      for (let i = 0; i < STEPS; i++) {
        fg.fillColor = lerp(o.from, o.to, i / (STEPS - 1));
        fg.rect(-w / 2 + PAD, -h / 2 + PAD + (STEPS - 1 - i) * seg, iw * k, seg + 0.5);
        fg.fill();
      }
    }
  };
  redraw(1);
  return { node: n, set: redraw };
}

/** 运行时开关一个 Label 的黑描边（状态切换：如页签选中后底色变橙、字变深，必须去掉描边） */
export function setOutline(l: Label, on: boolean): void {
  const ol = l.node.getComponent(LabelOutline);
  if (ol) ol.enabled = on;
}

// ---------- 交互 ----------
/** 触摸回调（UIKit 不接管输入，避免和摇杆抢事件） */
export function onTap(node: Node, cb: () => void): void {
  node.on(Node.EventType.TOUCH_END, () => {
    Sfx.sfx('click', 0.45, 40);     // 统一点击音（限流 40ms，避免连点刷屏）
    cb();
  }, node);
}

// ---------- 径向光晕（近似 CSS radial-gradient）----------
/**
 * 用**一组同心圆**叠出来：从外圈往里一圈圈画，alpha 逐层累加。
 * ⚠️ 每个圆必须单独 `circle + fill`（否则只有最后一个颜色生效）。
 * 静态绘制一次，不进 update。
 */
export function radialGlow(parent: Node, cx: number, cy: number, radius: number,
                           color: Color, peakAlpha = 26, steps = 14): Node {
  const n = mkNode(parent, 'glow', radius * 2, radius * 2, cx, cy);
  const g = n.addComponent(Graphics);
  const a = Math.max(1, Math.round(255 * (1 - Math.pow(1 - peakAlpha / 255, 1 / steps))));
  for (let i = steps; i >= 1; i--) {
    const r = radius * i / steps;
    g.fillColor = new Color(color.r, color.g, color.b, a);
    g.circle(0, 0, r);
    g.fill();
  }
  return n;
}

