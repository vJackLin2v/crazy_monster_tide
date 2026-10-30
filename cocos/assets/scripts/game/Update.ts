/**
 * 微信小游戏版本更新（2026-10-30）
 *
 * 背景：微信小游戏**每次发版后，老客户端不会自动换新包**——它只在「冷启动」时向后台检查，
 * 而且检查到新版本后还要等下载完成，再调 applyUpdate() 才会真正重启到新版。
 * 官方 API（基础库 1.9.90+）：
 *   const um = wx.getUpdateManager();
 *   um.onCheckForUpdate(cb)  // cb({hasUpdate})
 *   um.onUpdateReady(cb)     // 新包下载完成，此时才能 applyUpdate()
 *   um.applyUpdate()         // 重启并使用新版本
 *   um.onUpdateFailed(cb)    // 下载失败（网络/包体过大）
 *
 * 本模块做的事：
 *   1. 启动时注册三个回调；
 *   2. 新版本就绪 → 回调 onReady（UI 层弹「重启更新」）；
 *   3. 暴露 check() 给设置页手动检查。
 */

export type UpdateState = 'idle' | 'checking' | 'none' | 'ready' | 'failed' | 'unsupported';

interface WxUpdateManager {
  onCheckForUpdate: (cb: (res: { hasUpdate: boolean }) => void) => void;
  onUpdateReady: (cb: () => void) => void;
  onUpdateFailed: (cb: () => void) => void;
  applyUpdate: () => void;
}

const S = { state: 'idle' as UpdateState, hasUpdate: false };

function mgr(): WxUpdateManager | null {
  try {
    const g = globalThis as unknown as { wx?: { getUpdateManager?: () => WxUpdateManager } };
    if (g.wx && typeof g.wx.getUpdateManager === 'function') return g.wx.getUpdateManager();
  } catch { /* 非微信环境 */ }
  return null;
}

/** 当前更新状态（设置页展示用） */
export function updateState(): UpdateState { return S.state; }
export function updateHasNew(): boolean { return S.hasUpdate; }

/** 应用更新（仅在 state === 'ready' 时有意义） */
export function applyUpdate(): void {
  const um = mgr();
  if (!um) return;
  try { um.applyUpdate(); } catch { /* 忽略 */ }
}

/**
 * 注册更新回调。建议在游戏启动最早期调用一次。
 * @param onReady 新版本下载完成时调用（UI 层可弹确认框）
 */
export function setupUpdate(onReady?: () => void): void {
  const um = mgr();
  if (!um) { S.state = 'unsupported'; return; }
  S.state = 'checking';
  try {
    um.onCheckForUpdate((res) => {
      S.hasUpdate = !!res.hasUpdate;
      S.state = res.hasUpdate ? 'checking' : 'none';
      console.log('[Update] 检查完成 hasUpdate=' + res.hasUpdate);
    });
    um.onUpdateReady(() => {
      S.state = 'ready';
      S.hasUpdate = true;
      console.log('[Update] 新版本已下载，可 applyUpdate()');
      onReady?.();
    });
    um.onUpdateFailed(() => {
      S.state = 'failed';
      console.log('[Update] 新版本下载失败（网络或包体过大）');
    });
  } catch (e) {
    S.state = 'unsupported';
    console.warn('[Update] 注册失败', e);
  }
}
