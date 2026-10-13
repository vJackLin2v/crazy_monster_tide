/**
 * 设计令牌 —— 逐项抄自 docs/ui/ui-spec-approved.md v1.0（**已冻结**）
 *
 * 铁律（规格 §1.2）：
 *   - 全屏只有一个强调色（橙 #FFA84B），其它都是衬托
 *   - 卡片/按钮一律 **2px 硬描边 + `0 Npx 0` 硬投影**，不用模糊阴影
 *   - 圆角只用 6/10/16；间距只用 4/8/12/16/24；字号只用 11/13/16/20/26
 *   - 遮罩统一 rgba(5,8,15,.74)
 *
 * ⚠️ 改这里等于改规格。要改先改 docs/ui/ui-spec-approved.md 并升到 v1.1。
 */
import { Color } from 'cc';

const C = (hex: string, a = 255): Color => {
  const v = parseInt(hex.slice(1), 16);
  return new Color((v >> 16) & 255, (v >> 8) & 255, v & 255, a);
};

export const COL = {
  bg0: C('#0D1732'),        // 最深底
  bg1: C('#17233D'),        // 主底
  bg2: C('#1E1E40'),        // 面板
  bg3: C('#233154'),        // 面板亮
  line: C('#31456F'),       // 描边
  line2: C('#3E5490'),      // 描边亮
  accent: C('#FFA84B'),     // 主强调（唯一）
  accentD: C('#E08020'),    // 强调暗
  mint: C('#88D6BC'),       // 辅助
  purple: C('#6842A7'),     // 稀有
  cream: C('#F7E9E0'),      // 正文
  red: C('#E04060'),        // 危险
  shadow: C('#080C18'),     // 硬投影
  mask: C('#05080F', 189),  // 遮罩 rgba(5,8,15,.74)
  hpBack: C('#2A1220'),
  expBack: C('#141C33'),
};

/** 圆角（只允许这三档） */
export const R = { s: 6, m: 10, l: 16 };
/** 间距（只允许这几档） */
export const SP = { xs: 4, s: 8, m: 12, l: 16, xl: 24 };
/** 字号（只允许这几档） */
export const FS = { xs: 11, s: 13, m: 16, l: 20, xl: 26 };
/** 描边宽度：硬性 2px */
export const BORDER = 2;
/** 硬投影偏移（x, y）；规格是 `0 Npx 0` */
export const SHADOW_OFF = { x: 0, y: 3 };

export const SCREEN = { w: 360, h: 640 };
/** 顶部安全区（规格：至少 24dp） */
export const SAFE_TOP = 24;
