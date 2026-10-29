/**
 * 角色选择屏布局（M1 视觉升级：卡片更紧凑，详情改成四段式 + 属性网格）
 *
 * ⚠️ **纯数学，不 import cc** —— 这样 `tests/run.ts` 能在没有编辑器的情况下
 *    验证「格子不越界 / 详情面板夹在网格与按钮之间 / 文字不压字 / 立绘是整数倍」。
 *
 * 坐标语义：`x` 是距屏幕**左边**、`cy` 是距屏幕**上边**的设计坐标。
 * 屏幕宽固定 360（`ResolutionPolicy.FIXED_WIDTH`），**可视高度随机型变化**（640 ~ 800+）。
 *
 * 变更记录：
 *   v1.2（D-36）2 列 × 2 行 + 翻页 + 立绘 104×120 —— 用户反馈「立绘太大了」，已回退；
 *   v1.3 3 列 × 2 行一页放 6 个，立绘 78×90；
 *   **v1.4（M1，2026-10-29）卡片 106×124 → 106×90、立绘 78×90 → 52×60**：
 *     把纵向空间让给详情面板（四段式 + 2×3 属性网格），角色卡仍占卡片高度的一半以上。
 */

export const CS = {
  /** 网格列数 / 行数 / 每页角色数（6 个角色 = 正好一页） */
  COLS: 3,
  ROWS: 2,
  PER_PAGE: 6,
  /** 屏幕左右安全边距 */
  MARGIN_X: 12,
  /** 格子间距 */
  GAP: 8,
  /** 格子尺寸：(360 - 12*2 - 8*2) / 3 = 106.67 宽；90 高（立绘 + 姓名） */
  CARD_W: (360 - 12 * 2 - 8 * 2) / 3,
  CARD_H: 90,
  /** 立绘框：**高度上限**（宽度上限 = CARD_W - 12）。整数倍缩放后落在 52×60 / 34×50 */
  PORTRAIT: 60,
  /** 立绘中心相对格子中心的偏移（y 向上为正）；姓名相对偏移 */
  PORTRAIT_DY: 10,
  NAME_DY: -32,
  /** 网格顶边（标题条 62 之下，再由 buildCharSelect 补 S+6） */
  GRID_TOP: 70,
  /**
   * 网格底 → 详情面板的缝。
   * ⚠️ 原来是 4：两块的描边几乎贴在一起，看着像"边框重叠"（用户反馈）。现在留 14。
   */
  DETAIL_GAP: 14,
  /** 详情面板底 → 屏幕底（底部按钮区 86） */
  DETAIL_BOTTOM: 86,
  /** 详情面板最小高度；低于此值说明屏幕太矮，内容会挤 */
  DETAIL_MIN: 140,
  /** 详情面板内边距（上下各一份）与内容高度（见 detailContentHeight） */
  DETAIL_PAD: 14,
  /** 详情面板矮于这个高度时改用紧凑排版 */
  COMPACT_BELOW: 200,
} as const;

/** 6 个角色 / 每屏 6 个 → 1 页（角色变多时自动翻页，逻辑保留） */
export function pageCount(n: number): number {
  return Math.max(1, Math.ceil(n / CS.PER_PAGE));
}

/** 第 slot 个格子的中心（slot 是**页内**序号 0..PER_PAGE-1） */
export function cellPos(slot: number): { x: number; cy: number } {
  const col = slot % CS.COLS;
  const row = Math.floor(slot / CS.COLS) % CS.ROWS;
  return {
    x: CS.MARGIN_X + CS.CARD_W / 2 + col * (CS.CARD_W + CS.GAP),
    cy: CS.GRID_TOP + CS.CARD_H / 2 + row * (CS.CARD_H + CS.GAP),
  };
}

/** 网格底边（距屏幕顶） */
export function gridBottom(): number {
  return CS.GRID_TOP + CS.ROWS * CS.CARD_H + (CS.ROWS - 1) * CS.GAP;
}

/** 第 page 页实际用了几行（角色数不是 COLS 整数倍时，最后一页只用部分行） */
export function pageRowCount(count: number, page: number): number {
  const n = Math.max(0, Math.min(CS.PER_PAGE, count - page * CS.PER_PAGE));
  return Math.max(1, Math.ceil(n / CS.COLS));
}

/** 页内第 index 个格子的中心；rowsUsed < ROWS 时**整块垂直居中**，避免底部空一大片 */
export function cellPosPaged(index: number, rowsUsed: number): { x: number; cy: number } {
  const col = index % CS.COLS;
  const row = Math.floor(index / CS.COLS);
  const bandH = gridBottom() - CS.GRID_TOP;
  const blockH = rowsUsed * CS.CARD_H + (rowsUsed - 1) * CS.GAP;
  const top = CS.GRID_TOP + Math.max(0, (bandH - blockH) / 2);
  return {
    x: CS.MARGIN_X + CS.CARD_W / 2 + col * (CS.CARD_W + CS.GAP),
    cy: top + CS.CARD_H / 2 + row * (CS.CARD_H + CS.GAP),
  };
}

/** 详情面板四段内容的自然高度（名称 / 正负天赋 / 初始技能 / 属性网格 + 行距） */
export function detailContentHeight(compact = false): number {
  if (compact) return 22 + 6 + 18 + 3 + 18 + 8 + 34 + 8 + 54;   // 171
  return 26 + 8 + 20 + 4 + 20 + 10 + 40 + 10 + 60;              // 198
}

/**
 * 详情面板：顶边跟着网格走；高度**按内容取**。
 * 剩余空间留在面板下方（按钮之上），视觉上是一块独立的卡片。
 */
export function detailBox(vh: number): { top: number; height: number; compact: boolean } {
  const top = gridBottom() + CS.DETAIL_GAP;
  const avail = vh - CS.DETAIL_BOTTOM - top;
  const fit = detailContentHeight(false) + CS.DETAIL_PAD * 2;   // 226
  const height = Math.max(CS.DETAIL_MIN, Math.min(avail, fit));
  return { top, height, compact: height < CS.COMPACT_BELOW };
}

export interface DetailRow { y: number; size: number; h: number }
export interface DetailSpec {
  compact: boolean;
  name: DetailRow;
  pos: DetailRow;
  neg: DetailRow;
  skill: { y: number; h: number };
  /** 属性网格块：h 是整块高度（2 行 + 行距），size 是单元格字号 */
  stat: DetailRow;
}

/**
 * 详情面板内部各行的 y（面板中心为 0，y 向上）。
 * 完整版沿用 M1 规格间距；紧凑版把间距压下来，保证矮屏也放得下。
 */
export function detailRows(height: number): DetailSpec {
  const compact = height < CS.COMPACT_BELOW;
  const nameH = compact ? 22 : 26, nameS = compact ? 18 : 20;
  const posH = compact ? 18 : 20, posS = compact ? 12 : 13;
  const negH = compact ? 18 : 20, negS = compact ? 12 : 13;
  const skillH = compact ? 34 : 40;
  const statH = compact ? 54 : 60, statS = compact ? 11 : 12;
  const g1 = compact ? 6 : 8;     // 名字 → 正天赋
  const g2 = compact ? 3 : 4;     // 正天赋 → 负天赋
  const g3 = compact ? 8 : 10;    // 负天赋 → 初始技能
  const g4 = compact ? 8 : 10;    // 初始技能 → 属性网格
  const total = nameH + g1 + posH + g2 + negH + g3 + skillH + g4 + statH;
  // 内容**整体垂直居中**：面板高度随机型变化，贴顶会让下面空一大片
  const topPad = Math.max(6, (height - total) / 2);
  const half = height / 2;

  let y = half - topPad;
  const place = (h: number) => { const cy = y - h / 2; y -= h; return cy; };
  const nameY = place(nameH);
  y -= g1;
  const posY = place(posH);
  y -= g2;
  const negY = place(negH);
  y -= g3;
  const skillY = place(skillH);
  y -= g4;
  const statY = place(statH);

  return {
    compact,
    name: { y: nameY, size: nameS, h: nameH },
    pos: { y: posY, size: posS, h: posH },
    neg: { y: negY, size: negS, h: negH },
    skill: { y: skillY, h: skillH },
    stat: { y: statY, size: statS, h: statH },
  };
}

/** 翻页按钮（角色数 ≤ 每页数量时不会创建）：右上角，96x44 */
export function pagerPos(): { x: number; y: number; w: number; h: number } {
  return { x: 300, y: 42, w: 96, h: 44 };
}

/**
 * 立绘缩放：**按高度取整数倍**，宽度超出格子时再降一档。
 *
 * 单位帧去掉透明留白后大小不一（12×14 ~ 17×25），用同一目标高度让每张立绘都差不多高：
 * 13×15 → 4 倍 = 52×60；17×25 → 2 倍 = 34×50（骑乘单位本来就大，缩小后仍占满格）。
 * ⚠️ 只允许整数倍（像素风硬规则），所以宽高会略有差异，这是刻意的。
 */
export function portraitFit(srcW: number, srcH: number): { k: number; w: number; h: number } {
  const maxW = CS.CARD_W - 12;
  const maxH = CS.PORTRAIT;
  // 立绘基准统一到**目标高度**，再受宽高上限约束（避免骑乘单位比别人大一档半）
  // 统一目标高度 55：整数倍下 6 个角色的可见高度落在 50~60（相对目标 ±9.1%），
  // 骑乘单位（17×25）只能 2 倍 = 50，3 倍 = 75 会超出卡片立绘框，且不允许拉伸。
  const TARGET_H = 55;
  let k = Math.max(1, Math.round(TARGET_H / srcH));
  while (k > 1 && (srcW * k > maxW || srcH * k > maxH)) k--;
  return { k, w: srcW * k, h: srcH * k };
}
