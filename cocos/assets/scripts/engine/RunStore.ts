/**
 * 本局续玩 / 历史对局的持久化层（依赖 cc 的 sys.localStorage）
 *
 * 数据模型与校验在 `game/RunSave.ts` / `game/RunHistory.ts`（纯逻辑、可单测）；
 * 这里只负责"读字符串 → 校验 → 返回结构 / 结构 → JSON → 写"。
 */
import { sys } from 'cc';
import { validateActiveRun, type ActiveRunSave, type LoadCheck } from '../game/RunSave';
import { emptyHistory, validateHistory, type RunHistoryData } from '../game/RunHistory';

const ACTIVE_KEY = 'cmt_active_run_v1';
const HISTORY_KEY = 'cmt_history_v1';

function read(key: string): string | null {
  try {
    return sys.localStorage.getItem(key);
  } catch (e) {
    console.warn('[RunStore] 读取失败', e);
    return null;
  }
}

function write(key: string, value: string): boolean {
  try {
    sys.localStorage.setItem(key, value);
    return true;
  } catch (e) {
    console.warn('[RunStore] 写入失败（不影响本局）', e);
    return false;
  }
}

export function loadActiveRun(): LoadCheck {
  const raw = read(ACTIVE_KEY);
  if (!raw) return { status: 'none' };
  let obj: unknown;
  try {
    obj = JSON.parse(raw);
  } catch {
    return { status: 'corrupt', message: '存档不是合法 JSON' };
  }
  return validateActiveRun(obj);
}

export function saveActiveRun(save: ActiveRunSave): boolean {
  return write(ACTIVE_KEY, JSON.stringify(save));
}

export function clearActiveRun(): void {
  try { sys.localStorage.removeItem(ACTIVE_KEY); } catch { /* 忽略 */ }
}

export function loadRunHistory(): RunHistoryData {
  const raw = read(HISTORY_KEY);
  if (!raw) return emptyHistory();
  try {
    return validateHistory(JSON.parse(raw));
  } catch {
    console.warn('[RunStore] 历史记录损坏，已重建为空');
    return emptyHistory();
  }
}

export function saveRunHistory(h: RunHistoryData): boolean {
  return write(HISTORY_KEY, JSON.stringify(h));
}
