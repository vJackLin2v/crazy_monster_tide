/**
 * 微信小游戏转发（分享给好友）
 *
 * ## 平台事实（决定了这里的写法）
 *  · 小游戏**没有**小程序那套「页面 onShareAppMessage 注册」，只有两个入口：
 *      - `wx.onShareAppMessage(cb)`  被动转发：玩家点右上角 ··· → 转发时回调取内容
 *      - `wx.shareAppMessage(obj)`   主动转发：游戏内按钮直接唤起分享面板
 *  · 小游戏**不支持**朋友圈分享（`onShareTimeline` 是小程序 API），也**没有**分享成功/失败回调。
 *    想知道"有没有人通过分享进来"，只能靠落地参数（query）+ onShow。
 *  · 分享图建议 5:4（500×400，<128KB）。当前不传 imageUrl，微信会截取游戏画面作为封面；
 *    美术出图后把 SHARE_IMG 指向包内路径即可。
 *
 * ## 落地参数约定
 *   from=menu | result | win     来源场景
 *   wave=<数字>                  分享者到达的波次（用于「好友打到了第 N 波」的对比）
 *   win=0 | 1                    分享者是否通关
 */

import { logEvent } from './DeviceLog';

/** 分享图（包内相对路径）。留空 = 用微信自动截图，等美术出图后再填 */
const SHARE_IMG = '';

export interface ShareStats {
  win: boolean;
  wave: number;
  kills: number;
  lv: number;
  charName?: string;
  difficultyName?: string;
}

export interface ShareContent {
  title: string;
  query: string;
  imageUrl?: string;
}

interface WxShare {
  showShareMenu?: (o: { withShareTicket?: boolean }) => void;
  onShareAppMessage?: (cb: () => ShareContent) => void;
  shareAppMessage?: (o: ShareContent) => void;
  getLaunchOptionsSync?: () => { query?: Record<string, string> };
  onShow?: (cb: (res: { query?: Record<string, string> }) => void) => void;
}

function getWx(): WxShare | null {
  const g = globalThis as unknown as { wx?: WxShare };
  return g.wx ?? null;
}

/** 当前被动转发的默认内容（进战斗/结算时会被覆盖） */
let passive: ShareContent = {
  title: '一屏怪潮，一键清场 —— 来试试《疯狂鸽王》',
  query: 'from=menu',
  ...(SHARE_IMG ? { imageUrl: SHARE_IMG } : {}),
};

/** 游戏启动时调一次：打开右上角转发菜单，并注册被动转发内容 */
export function initShare(): void {
  const wx = getWx();
  if (!wx) return;                       // 浏览器 / 编辑器：静默跳过
  try { wx.showShareMenu?.({ withShareTicket: true }); } catch { /* 低版本忽略 */ }
  try { wx.onShareAppMessage?.(() => passive); } catch { /* ignore */ }
}

/** 覆盖被动转发内容（切场景时调，让玩家转发出去的是当前进度而不是空标题） */
export function setPassiveShare(c: ShareContent): void {
  passive = c;
}

/** 按结算数据生成分享文案 */
export function buildShareContent(s: ShareStats): ShareContent {
  const title = s.win
    ? `通关！${s.difficultyName ?? ''}难度 ${s.wave} 波全清，来挑战一下`
    : `我只撑到第 ${s.wave} 波，击杀 ${s.kills} 只，你能更远吗？`;
  return {
    title,
    query: `from=result&wave=${s.wave}&win=${s.win ? 1 : 0}`,
    ...(SHARE_IMG ? { imageUrl: SHARE_IMG } : {}),
  };
}

/**
 * 主动转发（保留给未来的运营入口，当前 UI 不使用）。
 * 微信小游戏的转发走「右上角 ··· → 转发」，内容由 onShareAppMessage 提供，
 * 所以正常玩法里**不需要**游戏内按钮 —— 结算页只要 setPassiveShare 即可。
 */
export function shareNow(s: ShareStats): boolean {
  const content = buildShareContent(s);
  setPassiveShare(content);
  logEvent('share_click', { wave: s.wave, win: s.win ? 1 : 0, kills: s.kills });

  const wx = getWx();
  if (!wx || typeof wx.shareAppMessage !== 'function') return false;
  try {
    wx.shareAppMessage(content);
    return true;
  } catch {
    return false;
  }
}

/** 读取本次启动的落地参数（从分享卡片进入时带 query） */
export function readLaunchQuery(): Record<string, string> {
  const wx = getWx();
  if (!wx) return {};
  try {
    return wx.getLaunchOptionsSync?.()?.query ?? {};
  } catch {
    return {};
  }
}

/**
 * 监听「游戏已在后台，玩家又从分享卡片点进来」。
 * 冷启动的 query 由 readLaunchQuery() 取，这里只处理热启动。
 */
export function onShareEnter(cb: (q: Record<string, string>) => void): void {
  const wx = getWx();
  if (!wx) return;
  try {
    wx.onShow?.((res) => {
      const q = res?.query ?? {};
      if (q.from) cb(q);
    });
  } catch { /* ignore */ }
}
