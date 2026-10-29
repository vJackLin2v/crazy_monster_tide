/**
 * 安全区（刘海 / 手势条 / 圆角）——设计坐标下的上下内边距
 *
 * ## 3.8.6 的事实（已核对引擎源码）
 * 安全区 API 是 **`sys.getSafeAreaRect(symmetric = true)`**：
 *   · 位于 `engine/cocos/core/platform/sys.ts`，由 `cc.SafeArea` 组件内部调用；
 *   · 返回 **设计分辨率单位** 的 `Rect`，原点在**可见区域左下角**（引擎内部
 *     用 `view._convertToUISpace()` 转过了）；
 *   · `symmetric = true`（默认）会把左右/上下的安全边取成一致，取较大的一边。
 *
 * ⚠️ 早期实现写的是 `view.getSafeAreaRect()` —— **这个方法在 3.8.6 不存在**，
 *    于是永远走常量兜底，刘海机上从来没有真正读到过安全区（M5 遗留的 P0）。
 *    本文件改为调用 `sys.getSafeAreaRect()`，并在控制台打印来源，方便真机排查。
 *
 * ## 设计留白 vs 安全区
 * 即使没有刘海（浏览器 / 普通手机 raw = 0），界面也需要一点顶部留白（设计稿按 28/10 排的版）。
 * 所以最终值 = **max(设计留白, 真实安全区)**，两者都在日志里分开打印，不会把"兜底"伪装成"安全区"。
 *
 * ## 缓存
 * 视口变化 / 横竖屏切换 / 小游戏前后台恢复都可能改变安全区，因此注册了重置回调
 * （`view` / `screen` 的事件，存在才挂，全部 try/catch）。
 */
import { sys, view, screen } from 'cc';

/** 设计留白下限（没有安全区时也保留，保证标题/HUD 不贴边） */
const DESIGN_TOP = 28;
const DESIGN_BOTTOM = 10;

export interface SafeInfo {
  /** 布局实际使用的上内边距（设计像素，已含设计留白） */
  top: number;
  /** 布局实际使用的下内边距 */
  bottom: number;
  /** 设备真实安全区（设计像素）；读不到时为 0 */
  rawTop: number;
  rawBottom: number;
  /** 数据来源：sys = 真的从引擎拿到；fallback = 引擎没给 */
  source: 'sys' | 'fallback';
  visible: { w: number; h: number };
}

let cached: SafeInfo | null = null;
let hooked = false;

/** 视口/方向变化 → 丢缓存（只挂一次） */
function hookResize(): void {
  if (hooked) return;
  hooked = true;
  const reset = () => { cached = null; };
  try { (view as unknown as { on?: (e: string, cb: () => void) => void }).on?.('canvas-resize', reset); } catch { /* 忽略 */ }
  try { (view as unknown as { on?: (e: string, cb: () => void) => void }).on?.('design-resolution-changed', reset); } catch { /* 忽略 */ }
  try { (screen as unknown as { on?: (e: string, cb: () => void) => void }).on?.('window-resize', reset); } catch { /* 忽略 */ }
  try { (screen as unknown as { on?: (e: string, cb: () => void) => void }).on?.('orientation-change', reset); } catch { /* 忽略 */ }
}

export function safeAreaInfo(): SafeInfo {
  if (cached) return cached;
  hookResize();
  const vs = view.getVisibleSize();
  let rawTop = 0, rawBottom = 0;
  let source: 'sys' | 'fallback' = 'fallback';
  try {
    const fn = (sys as unknown as {
      getSafeAreaRect?: (symmetric?: boolean) => { x: number; y: number; width: number; height: number };
    }).getSafeAreaRect;
    if (typeof fn === 'function') {
      // symmetric=false：要的是**真实**上下边，不取齐；布局留白由 DESIGN_* 负责
      const r = fn.call(sys, false);
      if (r && r.height > 0 && vs.height > 0) {
        rawTop = Math.max(0, Math.round(vs.height - (r.y + r.height)));
        rawBottom = Math.max(0, Math.round(r.y));
        source = 'sys';
      }
    }
  } catch (e) {
    console.warn('[Safe] sys.getSafeAreaRect 调用失败，使用设计留白', e);
  }
  const info: SafeInfo = {
    top: Math.max(DESIGN_TOP, Math.min(120, rawTop)),
    bottom: Math.max(DESIGN_BOTTOM, Math.min(80, rawBottom)),
    rawTop, rawBottom, source,
    visible: { w: vs.width, h: vs.height },
  };
  cached = info;
  console.log('[Safe] source=' + info.source
    + ' raw(top/bottom)=' + info.rawTop + '/' + info.rawBottom
    + ' → layout=' + info.top + '/' + info.bottom
    + ' visible=' + vs.width + 'x' + vs.height);
  return info;
}

/** 顶部安全边距（设计像素） */
export function safeTop(): number { return safeAreaInfo().top; }
/** 底部安全边距（设计像素） */
export function safeBottom(): number { return safeAreaInfo().bottom; }
/** 视口变化 / 测试时重置缓存 */
export function resetSafeArea(): void { cached = null; }
