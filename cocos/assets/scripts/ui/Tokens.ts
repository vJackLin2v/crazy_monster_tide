/**
 * 设计令牌 —— 逐项抄自 `docs/ui/ui-spec-approved.md` **v1.1**（已冻结）
 *
 * 视觉语言（土豆兄弟风）：
 *   - 所有容器 **3px 纯黑描边**，圆角 8/6/4
 *   - **硬投影**（画偏移黑块），**不用模糊阴影**
 *   - 高饱和色块 + 描边粗体字
 *   - 文字带黑色描边（LabelOutline 2px）+ 向下 4px 硬投影
 *
 * ⚠️ 改这里等于改规格。要改先改 `docs/ui/ui-spec-approved.md` 并升到 v1.2。
 */
import { Color } from 'cc';

const C = (hex: string, a = 255): Color => {
  const v = parseInt(hex.slice(1), 16);
  return new Color((v >> 16) & 255, (v >> 8) & 255, v & 255, a);
};

export const COL = {
  // ---- 底 / 面板（规格 §1.1）----
  bg0: C('#15151c'),        // 最深：空槽底色
  bg1: C('#262636'),        // 屏幕底
  bg2: C('#1b1b24'),        // 面板 / 列表行 / 槽位
  bg3: C('#33333f'),        // 次级按钮
  bg4: C('#43434f'),        // 分隔 / 描边亮
  dash: C('#4a4a58'),       // 空槽里的「＋」

  // ---- 强调 / 语义 ----
  accent: C('#f5a623'),     // 主强调（橙）
  accentD: C('#b8790c'),    // 橙的硬投影
  mint: C('#8bd63a'),       // 正向（绿）
  mintD: C('#4f9416'),
  red: C('#e8452f'),        // 危险（红）
  redD: C('#a81f10'),
  purple: C('#9b63d6'),     // 道具

  // ---- 文字 ----
  cream: C('#ffffff'),      // 正文（一律加粗）
  dim: C('#b9c0cf'),        // 次级文字
  dim2: C('#7c8496'),       // 禁用文字
  ink: C('#2b1d00'),        // 橙底上的深字
  btnInk: C('#2b1d00'),     // 兼容旧名

  // ---- 线与遮罩 ----
  line: C('#000000'),       // ★ 统一 3px 纯黑描边
  line2: C('#43434f'),      // 需要"淡一点"的描边时用
  shadow: C('#000000'),     // 硬投影 = 纯黑
  mask: C('#04060c', 184),  // rgba(4,6,12,.72)

  // ---- 进度条槽底 ----
  hpBack: C('#12121a'),
  expBack: C('#12121a'),
  hpTop: C('#ff6e86'),
  mintLight: C('#b6f0dc'),

  // ---- 兼容旧名（DEMO 时代遗留，逐步淘汰）----
  sub: C('#b9c0cf'),
  foot: C('#b9c0cf'),
  skillName: C('#b9c0cf'),
  logoShadow: C('#000000'),
  slotEmpty: C('#15151c'),
};

/** 圆角（规格：8 面板/按钮，6 小件，4 进度条） */
export const R = { s: 6, m: 8, l: 8, bar: 4 };
/** 间距 */
export const SP = { xs: 4, s: 7, m: 12, l: 16, xl: 24 };
/** 字号（26 / 17 / 13 / 11） */
export const FS = { xs: 11, s: 13, m: 17, l: 26, xl: 26 };
/** 说明文字字号 */
export const FS_SUB = 11;
/** 描边宽度：规格硬性 3px */
export const BORDER = 3;
/** 硬投影偏移（规格：按钮 5px / 面板 4px） */
export const SHADOW_OFF = { x: 0, y: 4 };
export const SHADOW_BTN = 5;

export const SCREEN = { w: 360, h: 640 };
/** 安全边距：左右 12 / 上 11 / 下 16 */
export const SAFE = { x: 12, top: 11, bottom: 16 };
/** 兼容旧名 */
export const SAFE_TOP = 11;
/** 最小热区（微信硬要求） */
export const MIN_TAP = 44;
