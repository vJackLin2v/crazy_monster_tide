/**
 * 画面/无障碍偏好（真机反馈 2026-10-30 #6）
 *
 * 参考 Brotato 的 Accessibility 设置（输入灵敏度、减少视觉杂乱、降低闪烁）：
 * 我们只做三件对"晃眼/累"最有效、且实现成本最低的：
 *   1. 特效透明度（0~100%，只影响 VFX 图层，不影响敌人/技能判定的可读性）
 *   2. 屏幕震动开关
 *   3. 受击红屏开关
 *
 * 数值放在这里（模块级可变），Battle 每帧读取；设置页改了立刻生效，并写入存档。
 */
export const FxPrefs = {
  /** 特效透明度 0~1（1=原样，0=完全隐藏） */
  alpha: 1,
  /** 屏幕震动 */
  shake: true,
  /** 受击红屏 */
  hurt: true,
};

export function applyFxPrefs(alpha: number, shake: boolean, hurt: boolean): void {
  FxPrefs.alpha = Math.max(0, Math.min(1, alpha));
  FxPrefs.shake = shake;
  FxPrefs.hurt = hurt;
}
