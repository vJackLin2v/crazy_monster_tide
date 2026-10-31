/**
 * 本地存档读写（平台适配层）
 *
 * 只用 `sys.localStorage`（浏览器 localStorage / 微信小游戏 storage 都实现它），
 * 不引第三方依赖，也不碰玩法数值。写失败静默降级（隐私模式等）。
 *
 * 数据结构、校验与迁移在 `game/Progress.ts`（纯数据、可单测）；这里只负责存取。
 * 放在 engine/ 是因为它依赖 cc，而 `tsconfig.check` 只覆盖纯逻辑层。
 */
import { sys } from 'cc';
import { parseSave, type SaveData } from '../game/Progress';

export type { SaveData };

const KEY = 'cmt_save_v1';

let cached: SaveData | null = null;

export function loadSave(): SaveData {
  if (cached) return cached;
  let raw: string | null = null;
  try {
    raw = sys.localStorage.getItem(KEY);
  } catch (e) {
    console.warn('[Save] 读取失败，用默认值', e);
  }
  // ⚠️ 解析放在纯函数里：读全字段 + 校验 + 迁移（见 Progress.parseSave 的注释）
  cached = parseSave(raw);
  return cached;
}

export function writeSave(d: SaveData): void {
  cached = d;
  try {
    sys.localStorage.setItem(KEY, JSON.stringify(d));
  } catch (e) {
    console.warn('[Save] 写入失败（不影响本局）', e);
  }
}
