/**
 * 真机行为日志（DeviceLog）
 *
 * 目的：真机实测时把「菜单点了什么 / 是否继续 / 死在第几波 / 商店买了什么」等关键行为
 * 记录到本地环形缓冲，并同步到微信「实时日志」；事后导出即可分析真实玩家行为。
 *
 * 通道：
 *  1. localStorage `cmt_device_log_v1`（最多 600 条，纯事件，不含个人信息）；
 *  2. 微信 `wx.getRealtimeLogManager()`（开发者工具「实时日志」/ 小程序后台可看）；
 *  3. console（浏览器调试）。
 *
 * 不记录：账号、昵称、openid、位置、输入内容；只记录玩法事件。
 */

export interface DeviceLogEntry {
  /** 时间戳（ms） */
  t: number;
  /** 事件名，如 menu_shown / run_start / player_dead */
  ev: string;
  /** 事件参数（小对象，避免长字符串） */
  d?: Record<string, unknown>;
}

const KEY = 'cmt_device_log_v1';
const MAX = 600;

let inited = false;
let rt: { info?: (m: string) => void; warn?: (m: string) => void } | null = null;

function wxApi(): { getRealtimeLogManager?: () => typeof rt; onError?: (cb: (e: unknown) => void) => void; onUnhandledRejection?: (cb: (e: unknown) => void) => void; getSystemInfoSync?: () => { platform?: string; model?: string; system?: string } } | undefined {
  return (globalThis as unknown as { wx?: never }).wx;
}

function readAll(): DeviceLogEntry[] {
  try {
    if (typeof localStorage === 'undefined') return [];
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as DeviceLogEntry[]) : [];
  } catch { return []; }
}

function persist(list: DeviceLogEntry[]): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX)));
  } catch { /* 日志写入失败不影响游戏 */ }
}

function lineOf(e: DeviceLogEntry): string {
  let tail = '';
  try { tail = e.d ? ' ' + JSON.stringify(e.d) : ''; } catch { tail = ''; }
  return e.ev + tail;
}

function append(ev: string, data?: Record<string, unknown>): DeviceLogEntry {
  const e: DeviceLogEntry = { t: Date.now(), ev, d: data };
  const list = readAll();
  list.push(e);
  persist(list);
  const line = '[CPK] ' + lineOf(e);
  try { if (rt && rt.info) rt.info(line); } catch { /* ignore */ }
  try { console.info(line); } catch { /* ignore */ }
  return e;
}

/** 启动时调用一次：初始化实时日志通道 + 全局错误上报 */
export function initDeviceLog(): void {
  if (inited) return;
  inited = true;
  try {
    const api = wxApi();
    if (api && typeof api.getRealtimeLogManager === 'function') rt = api.getRealtimeLogManager();
    if (api && typeof api.onError === 'function') {
      api.onError((e: unknown) => {
        const msg = e && typeof e === 'object' && 'message' in e ? String((e as { message?: unknown }).message) : String(e);
        append('js_error', { msg: msg.slice(0, 300) });
      });
    }
    if (api && typeof api.onUnhandledRejection === 'function') {
      api.onUnhandledRejection((e: unknown) => {
        const reason = e && typeof e === 'object' && 'reason' in e ? String((e as { reason?: unknown }).reason) : String(e);
        append('js_rejection', { msg: reason.slice(0, 300) });
      });
    }
  } catch { /* 非微信环境 */ }
}

/** 记录一条行为事件 */
export function logEvent(ev: string, data?: Record<string, unknown>): void {
  append(ev, data);
}

/** 导出全部事件（JSON 字符串） */
export function dumpDeviceLog(): string {
  return JSON.stringify(readAll(), null, 2);
}

export function clearDeviceLog(): void {
  try { if (typeof localStorage !== 'undefined') localStorage.removeItem(KEY); } catch { /* ignore */ }
}

/** 当前缓冲条数 */
export function deviceLogCount(): number {
  return readAll().length;
}

/** 设备/环境信息（只用于区分机型，不含账号） */
export function deviceInfo(): Record<string, unknown> {
  try {
    const api = wxApi();
    const s = api && typeof api.getSystemInfoSync === 'function' ? api.getSystemInfoSync() : null;
    if (!s) {
      return { platform: 'web', ua: typeof navigator !== 'undefined' ? String(navigator.userAgent).slice(0, 80) : '' };
    }
    return { platform: s.platform ?? '', model: s.model ?? '', system: s.system ?? '' };
  } catch { return { platform: 'unknown' }; }
}
