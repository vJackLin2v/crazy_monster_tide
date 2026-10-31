/**
 * 主菜单 V3 功能图标（像素网格绘制，16×16）
 *
 * 为什么用 Graphics 而不是 PNG：
 *  · 项目里没有统一的 16×16 功能图标素材，临时生成 PNG 容易风格不一致；
 *  · 用整数网格矩形块绘制，天然无抗锯齿、无渐变，颜色直接取 Tokens；
 *  · 预览图（docs/ui/menu_v3_icons_preview.png）从真实运行截图裁切，保证和游戏内一致。
 *
 * 设计：战绩=卷轴 / 图鉴=摊开的书 / 成就=奖杯 / 设置=齿轮。
 */
import { Node, Graphics, Color } from 'cc';
import { mkNode } from './UIKit';

export type MenuIconKind = 'history' | 'codex' | 'achievement' | 'settings';

export const MENU_ICON_GRID = 16;

/** 调色板（与 Tokens 的米白/金/深蓝灰一致） */
const C_CREAM = new Color(244, 231, 198, 255);
const C_GOLD = new Color(242, 179, 61, 255);
const C_DARK = new Color(42, 53, 80, 255);
const C_ACCENT = new Color(255, 168, 75, 255);

const PALETTE: Record<string, Color> = {
  '#': C_CREAM,
  g: C_GOLD,
  d: C_DARK,
  a: C_ACCENT,
};

/**
 * 16×16 像素图（每行必须 16 字符）
 * ' ' / '.' = 透明，'#' = 米白，'g' = 金，'d' = 深蓝灰，'a' = 橙
 */
export const MENU_ICON_MAPS: Record<MenuIconKind, string[]> = {
  // 战绩：横向卷轴（左右金色卷轴杆 + 三条记录线）
  history: [
    '................',
    '..g##########g..',
    '..g..........g..',
    '..g.########.g..',
    '..g..........g..',
    '..g.########.g..',
    '..g..........g..',
    '..g.########.g..',
    '..g..........g..',
    '..g##########g..',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  // 图鉴：摊开的书（两页 + 中缝 + 整条书底 + 金色衬线）
  codex: [
    '................',
    '..#####.#####...',
    '..#...#.#...#...',
    '..#.g.#.#...#...',
    '..#...#.#...#...',
    '..#...#.#...#...',
    '..#...#.#...#...',
    '..#...#.#...#...',
    '..#####.#####...',
    '..############..',
    '.gggggggggggggg.',
    '................',
    '................',
    '................',
    '................',
    '................',
  ],
  // 成就：奖杯（杯口 + 双把手 + 杯身 + 杯柄 + 杯座）
  achievement: [
    '................',
    '....##..##......',
    '...####.####....',
    '..#..######..#..',
    '..#..######..#..',
    '...##########...',
    '....########....',
    '.....######.....',
    '......####......',
    '.......##.......',
    '.......##.......',
    '.....######.....',
    '....########....',
    '................',
    '................',
    '................',
  ],
  // 设置：齿轮（八齿 + 中心孔）
  settings: [
    '................',
    '....##..##......',
    '...########.....',
    '..##########....',
    '.###.####.###...',
    '.####.##.####...',
    '..####..####....',
    '..###....###....',
    '..###....###....',
    '..####..####....',
    '.####.##.####...',
    '.###.####.###...',
    '..##########....',
    '...########.....',
    '....##..##......',
    '................',
  ],
};

/** 在 parent 上画一个功能图标；pixel=2 → 32×32 显示，保持整数倍 */
export function drawMenuIcon(
  parent: Node, kind: MenuIconKind, x: number, y: number, pixel = 2,
): Node {
  const size = MENU_ICON_GRID * pixel;
  const n = mkNode(parent, 'menu-icon-' + kind, size, size, x, y);
  const g = n.addComponent(Graphics);
  // 齿轮单独用"矩形环 + 八齿"构造：16 网格里更容易读，且完全是整数矩形
  if (kind === 'settings') {
    const R = (cx: number, cy: number, w: number, h: number) => {
      g.rect(-size / 2 + cx * pixel, size / 2 - (cy + h) * pixel, w * pixel + 0.5, h * pixel + 0.5);
      g.fill();
    };
    g.fillColor = C_CREAM;
    // 方形环（中间 6×6 透明孔）
    R(3, 3, 10, 2); R(3, 11, 10, 2); R(3, 3, 2, 10); R(11, 3, 2, 10);
    // 四个正齿 + 四个角齿
    R(7, 1, 2, 2); R(7, 13, 2, 2); R(1, 7, 2, 2); R(13, 7, 2, 2);
    R(2, 2, 2, 2); R(12, 2, 2, 2); R(2, 12, 2, 2); R(12, 12, 2, 2);
    return n;
  }
  const map = MENU_ICON_MAPS[kind];
  // 自动把图形平移到 16×16 网格中心（不同图标内容行数不同，避免整体偏上/偏下）
  let minR = MENU_ICON_GRID, maxR = -1, minC = MENU_ICON_GRID, maxC = -1;
  for (let r = 0; r < MENU_ICON_GRID; r++) {
    for (let c = 0; c < MENU_ICON_GRID; c++) {
      if (PALETTE[(map[r] ?? '')[c] ?? '.']) {
        if (r < minR) minR = r; if (r > maxR) maxR = r;
        if (c < minC) minC = c; if (c > maxC) maxC = c;
      }
    }
  }
  const offX = maxC >= 0 ? Math.round((MENU_ICON_GRID - 1 - (minC + maxC)) / 2) : 0;
  const offY = maxR >= 0 ? Math.round((MENU_ICON_GRID - 1 - (minR + maxR)) / 2) : 0;

  for (let r = 0; r < MENU_ICON_GRID; r++) {
    const row = map[r] ?? '';
    for (let c = 0; c < MENU_ICON_GRID; c++) {
      const ch = row[c] ?? '.';
      const col = PALETTE[ch];
      if (!col) continue;
      g.fillColor = col;
      const rr = r + offY, cc = c + offX;
      // +0.5 避免相邻矩形之间出现抗锯齿缝
      g.rect(-size / 2 + cc * pixel, size / 2 - (rr + 1) * pixel, pixel + 0.5, pixel + 0.5);
      g.fill();
    }
  }
  return n;
}