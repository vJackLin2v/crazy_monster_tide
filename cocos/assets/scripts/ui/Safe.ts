/**
 * 安全区（刘海 / 手势条 / 圆角）——设计坐标下的上下内边距
 *
 * 竖屏游戏最容易踩的坑：HUD 贴着屏幕顶边画，上了刘海机就被状态栏压住。
 * 这里优先向引擎/宿主要真实安全区（`view.getSafeAreaRect()`，微信小游戏会给出真实值），
 * 取不到时用保守常量（顶部 28、底部 10 设计像素 ≈ 刘海机状态栏高度）。
 */
import { view } from 'cc';

export interface SafeInsets { top: number; bottom: number }

let cached: SafeInsets | null = null;

export function safeArea(): SafeInsets {
  if (cached) return cached;
  const vs = view.getVisibleSize();
  let top = 28;
  let bottom = 10;
  try {
    const anyView = view as unknown as {
      getSafeAreaRect?: () => { x: number; y: number; width: number; height: number };
    };
    const r = anyView.getSafeAreaRect ? anyView.getSafeAreaRect() : null;
    if (r && r.height > 0) {
      const t = vs.height - (r.y + r.height);
      const b = r.y;
      if (t > 0) top = Math.max(top, Math.min(56, Math.round(t)));
      if (b > 0) bottom = Math.max(bottom, Math.min(48, Math.round(b)));
    }
  } catch {
    /* 宿主不支持：用常量 */
  }
  cached = { top, bottom };
  return cached;
}

/** 顶部安全边距（设计像素） */
export function safeTop(): number { return safeArea().top; }
/** 底部安全边距（设计像素） */
export function safeBottom(): number { return safeArea().bottom; }
/** 测试/预览时重置缓存（视口变化后重新量） */
export function resetSafeArea(): void { cached = null; }
