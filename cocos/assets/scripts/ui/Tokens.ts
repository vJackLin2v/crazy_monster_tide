/**
 * 设计令牌 —— 颜色/字号/间距的唯一来源
 *
 * **规范来源**：`docs/ui-redesign/ui_visual_upgrade_v1.md`（FROZEN v1.0，2026-10-29）
 * 上位规格：`docs/ui/ui-spec-approved.md` v1.5（§1.1/§1.2 旧色板已作废，引用上面的文件）
 *
 * ⚠️ 改这里等于改规格。要改先改规范文档并升版本。
 * ⚠️ **面板描边（edge）与文字描边（inkLine）是两个变量**：
 *    前者给容器（#34496E，去掉纯黑粗框），后者给 LabelOutline（#0A0E1A，保证深底可读）。
 */
import { Color } from 'cc';

const C = (hex: string, a = 255): Color => {
  const v = parseInt(hex.slice(1), 16);
  return new Color((v >> 16) & 255, (v >> 8) & 255, v & 255, a);
};

export const COL = {
  // ---- 底 / 面板（视觉规范 §2）----
  bg0: C('#0d1732'),        // 最深：空槽 / 遮罩深层
  bg1: C('#131c36'),        // 屏幕底（深蓝夜色）
  bg2: C('#1e2a46'),        // 普通面板
  bg3: C('#263653'),        // 次级面板 / 列表行
  bg4: C('#34496e'),        // 分隔线
  dash: C('#4a628c'),       // 空槽里的「＋」

  // ---- 描边（容器 vs 文字，**不要混用**）----
  edge: C('#34496e'),       // 面板/槽位描边
  edgeHi: C('#617da8'),     // 内沿高光 / 焦点
  inkLine: C('#0a0e1a'),    // 文字描边（LabelOutline）
  line: C('#0a0e1a'),       // 兼容旧名：深色线（保持文字可读）
  line2: C('#34496e'),      // 兼容旧名：淡描边

  // ---- 强调 / 语义 ----
  accent: C('#ffa84b'),     // 唯一主操作色
  accentD: C('#c97a2a'),    // 主操作暗部（硬投影）
  select: C('#61dce7'),     // 选中 / 科技态
  mint: C('#88d6bc'),       // 正向 / 回复
  mintD: C('#4fa98f'),
  red: C('#e04060'),        // 危险 / 负向
  redD: C('#a82a45'),
  purple: C('#b68aff'),     // 稀有

  // ---- 文字 ----
  cream: C('#f7e9e0'),      // 正文
  dim: C('#a8b5cd'),        // 次级文字
  dim2: C('#6d7892'),       // 禁用文字
  ink: C('#2b1d00'),        // 橙底上的深字
  btnInk: C('#2b1d00'),

  // ---- 线与遮罩 ----
  shadow: C('#05080f'),     // 硬投影
  mask: C('#060a16', 184),  // rgba(6,10,22,.72)

  // ---- 进度条槽底 ----
  hpBack: C('#0d1732'),
  expBack: C('#0d1732'),
  hpTop: C('#88d6bc'),
  mintLight: C('#b6f0dc'),

  // ---- 兼容旧名（逐步淘汰）----
  sub: C('#a8b5cd'),
  foot: C('#a8b5cd'),
  skillName: C('#a8b5cd'),
  logoShadow: C('#05080f'),
  slotEmpty: C('#0d1732'),
};

/** 圆角（素材自带圆角，Graphics 回退时用） */
export const R = { s: 6, m: 8, l: 8, bar: 4 };
/** 间距阶梯（规范 §4：4/8/12/16/24） */
export const SP = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };
/** 字号阶梯（规范 §3） */
export const FS = { xs: 11, s: 13, m: 17, l: 26, xl: 26 };
/** 说明文字字号 */
export const FS_SUB = 11;
/** 描边宽度（像素风统一 2px；容器用 edge，文字用 inkLine） */
export const BORDER = 2;
/** 硬投影偏移（按钮 5px / 面板 4px） */
export const SHADOW_OFF = { x: 0, y: 4 };
export const SHADOW_BTN = 5;

export const SCREEN = { w: 360, h: 640 };
/** 安全边距：左右 12 / 上 11 / 下 16（上下实际走 safeTop/safeBottom） */
export const SAFE = { x: 12, top: 11, bottom: 16 };
/** 兼容旧名 */
export const SAFE_TOP = 11;
/** 最小热区（微信硬要求） */
export const MIN_TAP = 44;
