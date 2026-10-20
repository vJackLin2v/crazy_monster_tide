/**
 * 角色选择屏布局（规格 §2.4 v1.2：2 列 × 2 行 + 翻页 + 立绘 128）
 *
 * ⚠️ **纯数学，不 import cc** —— 这样 `tests/run.ts` 能在没有编辑器的情况下
 *    验证「格子不越界 / 详情面板夹在网格与按钮之间 / 文字不压字 / 立绘是整数倍」。
 *
 * 坐标语义：`x` 是距屏幕**左**边、`cy` 是距屏幕**上**边的设计坐标（与规格稿一致）。
 * 屏幕宽固定 360（`ResolutionPolicy.FIXED_WIDTH`），**可视高度随机型变化**（640 ~ 800+）。
 */

export const CS = {
  /** 网格列数 / 行数 / 每屏角色数 */
  COLS: 2,
  ROWS: 2,
  PER_PAGE: 4,
  /** 屏幕左右安全边距 */
  MARGIN_X: 12,
  /** 格子间距 */
  GAP: 8,
  /** 格子尺寸：(360 - 12*2 - 8) / 2 = 164 宽；高 162 = 立绘 128 + 2 + 姓名 20 + 上下 3 */
  CARD_W: 164,
  CARD_H: 162,
  /** 立绘：32px 源 × **4 倍整数缩放**（非整数倍会糊边，见 rules.md） */
  PORTRAIT: 128,
  /** 立绘中心相对格子中心的偏移（y 向上为正）；姓名相对偏移 */
  PORTRAIT_DY: 11,
  NAME_DY: -65,
  /** 网格顶边（标题 12 / 副标题 50 之下） */
  GRID_TOP: 70,
  /** 网格底 → 详情面板的缝 */
  DETAIL_GAP: 4,
  /** 详情面板底 → 屏幕底（底部按钮区 86） */
  DETAIL_BOTTOM: 86,
  /** 详情面板最小高度；低于此值说明屏幕太矮，内容会挤 */
  DETAIL_MIN: 140,
  /** 详情面板矮于这个高度时改用紧凑排版（640 高的机型就是这种情况） */
  COMPACT_BELOW: 200,
} as const;

/** 6 个角色 / 每屏 4 个 → 2 页 */
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

/** 第 page 页实际用了几行（最后一页常常不满：6 个角色 → 第 2 页只有 1 行） */
export function pageRowCount(count: number, page: number): number {
  const n = Math.max(0, Math.min(CS.PER_PAGE, count - page * CS.PER_PAGE));
  return Math.max(1, Math.ceil(n / CS.COLS));
}

/**
 * 页内第 index 个格子的中心。rowsUsed < COLS 时**整块垂直居中**，
 * 否则最后一页（比如只有 2 个角色）会挤在最上面、下面空一大片，看着像 bug。
 */
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

/** 详情面板：顶边跟着网格走，底边跟着屏幕底走 → 高度随机型变化 */
export function detailBox(vh: number): { top: number; height: number; compact: boolean } {
  const top = gridBottom() + CS.DETAIL_GAP;
  const height = Math.max(CS.DETAIL_MIN, vh - CS.DETAIL_BOTTOM - top);
  return { top, height, compact: height < CS.COMPACT_BELOW };
}

export interface DetailRow { y: number; size: number; h: number }
export interface DetailSpec {
  compact: boolean;
  name: DetailRow;
  pos: DetailRow;
  neg: DetailRow;
  skill: { y: number; h: number };
  stat: DetailRow;
}

/**
 * 详情面板内部各行的 y（面板中心为 0，y 向上）。
 * 完整版沿用规格 §2.4 的间距；紧凑版把间距压下来，保证 640 高的机型也放得下。
 */
export function detailRows(height: number): DetailSpec {
  const half = height / 2;
  if (height < CS.COMPACT_BELOW) {
    return {
      compact: true,
      name: { y: half - 20, size: 18, h: 31 },
      pos: { y: half - 44, size: 12, h: 22 },
      neg: { y: half - 64, size: 12, h: 22 },
      skill: { y: half - 96, h: 34 },
      stat: { y: -half + 13, size: 11, h: 20 },
    };
  }
  return {
    compact: false,
    name: { y: half - 26, size: 20, h: 34 },
    pos: { y: half - 62, size: 13, h: 24 },
    neg: { y: half - 88, size: 13, h: 24 },
    skill: { y: half - 140, h: 44 },
    stat: { y: -half + 22, size: 11, h: 20 },
  };
}

/** 翻页按钮：右上角，96x44（≥ 44 热区），左边留给左对齐的副标题 */
export function pagerPos(): { x: number; y: number; w: number; h: number } {
  return { x: 300, y: 42, w: 96, h: 44 };
}

/**
 * 立绘缩放：**按高度取整数倍**，宽度超出格子时再降一档。
 *
 * 单位帧去掉透明留白后大小不一（13×15 ~ 17×25），用同一目标高度（= CARD_H 内可用高度）
 * 让每张立绘都差不多高：13×15 → 8 倍 = 104×120；17×25 → 5 倍 = 85×125。
 * ⚠️ 只允许整数倍（像素风硬规则），所以宽高会略有差异，这是刻意的。
 */
export function portraitFit(srcW: number, srcH: number): { k: number; w: number; h: number } {
  const maxW = CS.CARD_W - 12;
  const maxH = CS.PORTRAIT;
  let k = Math.max(1, Math.floor(Math.min(maxH / srcH, maxW / srcW)));
  while (k > 1 && (srcW * k > maxW || srcH * k > maxH)) k--;
  return { k, w: srcW * k, h: srcH * k };
}
