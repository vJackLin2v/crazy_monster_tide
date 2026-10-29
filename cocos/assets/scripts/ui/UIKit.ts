/**
 * UI 工具箱 —— 像素九宫格 + 文本原语
 *
 * 视觉语言（v2「像素共鸣」改造后）：
 *   - 面板 / 按钮 / 卡槽 = **Kenney Pixel UI Pack（CC0）** 重上色的九宫格素材，
 *     四角不拉伸，2px 近黑描边（见 ui/Art.ts）。
 *   - 素材未就绪时自动回退到 Graphics 绘制（方形、2px 黑边、1px 斜面），保证不会"白屏"。
 *   - 文字：系统字体 + 2px 黑描边 + 可选 4px 硬投影（中文可读性优先，见交付说明 §字体）。
 *
 * 坐标系：Canvas 原点在屏幕中心，y 向上。所有 helper 的 (x, y) 都是**节点中心**。
 * ⚠️ 位置必须锚定 `view.getVisibleSize()`，不得写死 640（KI-009 的教训）。
 */
import { Node, Graphics, Label, LabelOutline, UITransform, Color, Sprite, SpriteFrame,
         Texture2D, ImageAsset, Rect, view, BlockInputEvents } from 'cc';
import { COL, R, FS, BORDER, SHADOW_OFF, SHADOW_BTN } from './Tokens';
import { Sfx } from '../engine/Audio';
import { setUiSprite, uiArtReady, type UiArtName } from './Art';

/** 像素风描边宽度（素材已内建 2px 黑边，Graphics 回退也用 2px 保持一致） */
const PX_LINE = 2;

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
  // 规格：暗化层保留约 35~50% 的底层可见度（v2 从 .72 收到 .70，战斗氛围仍看得见）
  g.fillColor = COL.mask;
  g.rect(-w / 2, -h / 2, w, h);
  g.fill();
  // ⚠️ 遮罩必须**真的挡住输入**，否则弹窗下层（HUD 暂停键等）照样能点到
  n.addComponent(BlockInputEvents);
  return n;
}

// ---------- 面板 ----------
export interface PanelOpts {
  bg?: Color; line?: Color; radius?: number;
  /** 兼容旧参数：九宫格素材自带黑边，不再单独画投影 */
  shadow?: boolean;
  border?: boolean;
  /** 显式指定九宫格素材（优先于 bg 推断） */
  art?: UiArtName;
}

/** 按底色推断用哪张九宫格 */
function resolveArt(o: PanelOpts): UiArtName | null {
  if (o.art) return o.art;
  const c = o.bg;
  if (!c) return 'panel';
  if (c === COL.bg3) return 'panel_soft';
  if (c === COL.bg0 || c === COL.bg1) return 'well';
  if (c === COL.accent) return 'btn_primary';
  if (c === COL.red) return 'btn_danger';
  return 'panel';
}

/** 在节点上画面板底（素材优先，失败回退 Graphics）；返回是否用了素材 */
function drawPanel(n: Node, w: number, h: number, o: PanelOpts): boolean {
  const art = resolveArt(o);
  if (art && setUiSprite(n, art, w, h)) return true;
  // 指定的九宫格缺失时退到通用面板，别掉回"平涂方块"（会和其他卡片长得不一样）
  if (art !== 'panel' && setUiSprite(n, 'panel', w, h)) return true;
  let g = n.getComponent(Graphics);
  if (!g) g = n.addComponent(Graphics);
  g.clear();
  g.fillColor = o.bg ?? COL.bg2;
  g.rect(-w / 2, -h / 2, w, h);
  g.fill();
  if (o.border !== false) {
    g.lineWidth = PX_LINE;
    g.strokeColor = o.line ?? COL.edge;
    g.rect(-w / 2, -h / 2, w, h);
    g.stroke();
    // 1px 顶部高光：像素面板的"斜面"感
    g.fillColor = new Color(255, 255, 255, 16);
    g.rect(-w / 2 + PX_LINE, h / 2 - PX_LINE - 1, w - PX_LINE * 2, 1);
    g.fill();
  }
  return false;
}

export function panel(parent: Node, x: number, y: number, w: number, h: number, o: PanelOpts = {}): Node {
  const n = mkNode(parent, 'panel', w, h, x, y);
  drawPanel(n, w, h, o);
  return n;
}

/** 重绘一个 panel 的底（用于状态切换：选中/禁用/稀有度换色） */
export function paintPanel(n: Node, w: number, h: number, o: PanelOpts = {}): void {
  const ut = n.getComponent(UITransform);
  if (ut) ut.setContentSize(w, h);
  drawPanel(n, w, h, o);
}

/** 直接挂一张九宫格（页面里需要"只有外框"或特殊底时用） */
export function artPanel(parent: Node, x: number, y: number, w: number, h: number,
                         art: UiArtName, o: { bg?: Color; line?: Color } = {}): Node {
  return panel(parent, x, y, w, h, { ...o, art });
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
    ol.color = COL.inkLine;      // 文字描边与容器描边分开（规范 §2）
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

/**
 * 顶部标题条（各页共用）：整条像素面板 + 居中标题。
 * 返回条节点，右侧可继续挂金币 / 关闭等控件。
 * `top` 用设计坐标（距屏幕顶），内部按可视高度换算成节点坐标。
 */
export function screenHeader(parent: Node, vw: number, top: number, label: string,
                              h = 54, sub?: string): Node {
  const vs = view.getVisibleSize();
  const bar = panel(parent, 0, vs.height / 2 - (top + h / 2), vw, h, { art: 'panel' });
  if (sub) {
    title(bar, 10, label, { width: vw - 100 });
    text(bar, 0, -16, sub, { size: 10, color: COL.dim, width: vw - 36 });
  } else {
    title(bar, 1, label, { width: vw - 120 });
  }
  return bar;
}

// ---------- 按钮 ----------
export interface BtnOpts {
  primary?: boolean; danger?: boolean;
  bg?: Color; line?: Color; fg?: Color; size?: number; radius?: number;
  disabled?: boolean; shadow?: boolean;
  /** 普通按钮换别的按钮素材（如 tab 用 Outline 框） */
  art?: UiArtName;
}

function btnArt(o: BtnOpts): { normal: UiArtName; pressed: UiArtName } {
  if (o.disabled) return { normal: 'btn_disabled', pressed: 'btn_disabled' };
  if (o.primary) return { normal: 'btn_primary', pressed: 'btn_primary_pressed' };
  if (o.danger) return { normal: 'btn_danger', pressed: 'btn_danger_pressed' };
  if (o.art) {
    const n = o.art;
    const p = (n.endsWith('_pressed') ? n : n + '_pressed') as UiArtName;
    return { normal: n, pressed: p };
  }
  return { normal: 'btn', pressed: 'btn_pressed' };
}

/**
 * 按钮：九宫格素材 + **按下态换图 + 文字下沉 1px**（微信小游戏没有 hover，必须有按下反馈）。
 * 热区下限 44（微信硬要求）。
 */
export function button(parent: Node, x: number, y: number, w: number, h: number,
                       str: string, o: BtnOpts = {}): { node: Node; label: Label; setEnabled: (v: boolean) => void } {
  const hh = Math.max(44, h);
  const dis = !!o.disabled;
  const bg = dis ? COL.bg3 : (o.bg ?? (o.primary ? COL.accent : o.danger ? COL.red : COL.bg3));
  const fg = dis ? COL.dim2 : (o.fg ?? (o.primary ? COL.ink : COL.cream));
  const { normal, pressed } = btnArt(o);
  const n = mkNode(parent, 'btn', w, hh, x, y);

  let usedArt = setUiSprite(n, normal, w, hh);
  if (!usedArt) {
    const g = n.addComponent(Graphics);
    const draw = (col: Color) => {
      g.clear();
      g.fillColor = COL.shadow;
      g.rect(-w / 2, -hh / 2 - (o.shadow === false ? 0 : SHADOW_BTN), w, hh);
      g.fill();
      g.fillColor = col;
      g.rect(-w / 2, -hh / 2, w, hh);
      g.fill();
      g.lineWidth = PX_LINE; g.strokeColor = COL.edge;
      g.rect(-w / 2, -hh / 2, w, hh); g.stroke();
      g.fillColor = new Color(255, 255, 255, 22);
      g.rect(-w / 2 + PX_LINE, hh / 2 - PX_LINE - 2, w - PX_LINE * 2, 2); g.fill();
    };
    draw(bg);
  }

  // 主按钮是「橙底 + 深棕字」：叠加黑描边会糊字；次/危险按钮深底白字保留描边
  const l = text(n, 0, 1, str, {
    size: o.size ?? FS.s, color: fg, align: 'center', bold: true, width: w - 12, outline: !o.primary,
  });

  let cur = normal;
  // ★ 运行时状态：disabled 必须是**可变**的，不能只在创建时算一次。
  //   之前 `dis` 是常量，setEnabled(false) 只改外观 —— 点了照样触发业务回调、照样播点击音。
  let enabled = !dis;
  (n as unknown as { __uiEnabled?: boolean }).__uiEnabled = enabled;

  const swap = (art: UiArtName, dy: number) => {
    if (cur === art) { l.node.setPosition(0, dy); return; }
    cur = art;
    if (usedArt) setUiSprite(n, art, w, hh);
    l.node.setPosition(0, dy);
  };
  n.on(Node.EventType.TOUCH_START, () => { if (enabled) swap(pressed, 0); }, n);
  n.on(Node.EventType.TOUCH_END, () => { if (enabled) swap(normal, 1); }, n);
  n.on(Node.EventType.TOUCH_CANCEL, () => { if (enabled) swap(normal, 1); }, n);

  const setEnabled = (v: boolean) => {
    enabled = v;
    (n as unknown as { __uiEnabled?: boolean }).__uiEnabled = v;
    l.color = v ? fg : COL.dim2;
    if (usedArt) {
      cur = v ? normal : 'btn_disabled';
      setUiSprite(n, cur, w, hh);
    }
    if (!v) l.node.setPosition(0, 1);       // 禁用时把文字从"按下位"复位
  };

  return { node: n, label: l, setEnabled };
}

// ---------- 槽位 / 标签 ----------
/** 槽位方块：统一 52x52 九宫格（空槽 = well 更暗） */
export function slot(parent: Node, x: number, y: number, size: number,
                     o: { empty?: boolean; radius?: number; color?: Color } = {}): Node {
  void o.radius; void o.color;
  return panel(parent, x, y, size, size, { art: o.empty ? 'well' : 'slot' });
}

/** 标签 chip：小尺寸用 Graphics 画（素材 10px 边距对 20px 高度太紧），保持方形像素边 */
export function chip(parent: Node, x: number, y: number, str: string,
                     o: { color?: Color; bg?: Color; size?: number; dark?: boolean } = {}): Node {
  const size = o.size ?? FS.xs;
  const w = Math.max(34, str.length * (size + 1) + 12);
  const h = size + 10;
  const n = mkNode(parent, 'chip', w, h, x, y);
  const g = n.addComponent(Graphics);
  g.fillColor = o.bg ?? COL.bg3;
  g.rect(-w / 2, -h / 2, w, h);
  g.fill();
  g.lineWidth = PX_LINE;
  g.strokeColor = o.color ?? COL.line2;
  g.rect(-w / 2, -h / 2, w, h);
  g.stroke();
  // dark = 字是深色、底是亮色 -> **不能加黑描边**（会被描边糊掉）
  text(n, 0, 1, str, { size, color: o.color ?? COL.cream, bold: true, width: w - 4, outline: !o.dark });
  return n;
}

// ---------- 进度条（像素两段式：底槽 + 主色 + 顶部高光）----------
export interface GradBarOpts { dir: 'h' | 'v'; from: Color; to: Color; radius?: number; line?: Color }

export function gradBar(parent: Node, x: number, y: number, w: number, h: number,
                        o: GradBarOpts): { node: Node; set: (v: number) => void } {
  const n = mkNode(parent, 'gradbar', w, h, x, y);
  const g = n.addComponent(Graphics);
  g.fillColor = COL.hpBack;
  g.rect(-w / 2, -h / 2, w, h);
  g.fill();
  if (o.line !== undefined) {
    g.lineWidth = PX_LINE; g.strokeColor = o.line;
    g.rect(-w / 2, -h / 2, w, h);
    g.stroke();
  }
  const inner = mkNode(n, 'fill', w, h);
  const fg = inner.addComponent(Graphics);
  const PAD = o.line !== undefined ? PX_LINE : 0;
  const iw = w - PAD * 2, ih = h - PAD * 2;

  const redraw = (v: number) => {
    fg.clear();
    const k = Math.max(0, Math.min(1, v));
    if (k <= 0.001 || iw <= 0 || ih <= 0) return;
    const fw = Math.max(1, Math.round(iw * k));
    // 主体
    fg.fillColor = o.to;
    fg.rect(-w / 2 + PAD, -h / 2 + PAD, fw, ih);
    fg.fill();
    // 顶部 2px 高光（像素血条的标准做法：一条亮线而不是渐变）
    if (ih > 4) {
      fg.fillColor = o.from;
      fg.rect(-w / 2 + PAD, h / 2 - PAD - 2, fw, 2);
      fg.fill();
    }
  };
  redraw(1);
  return { node: n, set: redraw };
}

/** 细分隔线（像素 1px 横线） */
export function divider(parent: Node, x: number, y: number, w: number,
                        color: Color = COL.bg4): Node {
  const n = mkNode(parent, 'divider', w, 1, x, y);
  const g = n.addComponent(Graphics);
  g.fillColor = color;
  g.rect(-w / 2, -0.5, w, 1);
  g.fill();
  return n;
}

/** 运行时开关一个 Label 的黑描边（状态切换：如页签选中后底色变橙、字变深，必须去掉描边） */
export function setOutline(l: Label, on: boolean): void {
  const ol = l.node.getComponent(LabelOutline);
  if (ol) ol.enabled = on;
}

// ---------- 交互 ----------
/** 触摸回调（UIKit 不接管输入，避免和摇杆抢事件） */
export function onTap(node: Node, cb: () => void): void {
  // ⚠️ 统一在这里挡掉"被禁用的按钮"：button().setEnabled(false) 会写 __uiEnabled=false，
  //    TOUCH_END 仍会到达节点（节点没被移除），所以必须在这里拦截，
  //    否则禁用按钮照样执行回调、照样播"点击成功"的音效。
  const n = node as unknown as { __uiEnabled?: boolean; __hit?: boolean };
  n.__hit = true;   // 标记：热区审计（tools/ui/audit_hit_area.cjs）据此收集所有可点区域
  node.on(Node.EventType.TOUCH_END, () => {
    if (n.__uiEnabled === false) return;
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

/** 素材状态（页面调试/验收用） */
export function uiArtStatus(): boolean { return uiArtReady(); }
/** 兼容旧引用 */
export const RADIUS = R;
/** 已废弃的常量，保留避免 import 断裂 */
export const SHADOW_OFFSET = SHADOW_OFF;
