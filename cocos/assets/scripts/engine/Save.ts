/**
 * 本地存档读写（平台适配层）
 *
 * 只用 `sys.localStorage`（浏览器 localStorage / 微信小游戏 storage 都实现它），
 * 不引第三方依赖，也不碰玩法数值。写失败静默降级（隐私模式等）。
 *
 * 数据结构在 `game/Progress.ts`（纯数据、可单测）；这里只负责读写，
 * 放在 engine/ 是因为它依赖 cc，而 `tsconfig.check` 只覆盖纯逻辑层。
 */
import { sys } from 'cc';
import { defaultSave, type SaveData } from '../game/Progress';

export type { SaveData };

const KEY = 'cmt_save_v1';

let cached: SaveData | null = null;

export function loadSave(): SaveData {
  if (cached) return cached;
  const d = defaultSave();
  try {
    const raw = sys.localStorage.getItem(KEY);
    if (raw) {
      const o = JSON.parse(raw) as Partial<SaveData>;
      if (typeof o.music === 'boolean') d.music = o.music;
      if (typeof o.sfx === 'boolean') d.sfx = o.sfx;
      for (const k of ['runs', 'wins', 'kills', 'bestWave', 'bestLv', 'bossKills', 'merges'] as const) {
        const v = o[k];
        if (typeof v === 'number' && isFinite(v) && v >= 0) d[k] = Math.floor(v);
      }
      if (Array.isArray(o.ach)) d.ach = o.ach.filter((x): x is string => typeof x === 'string');
    }
  } catch (e) {
    console.warn('[Save] 读取失败，用默认值', e);
  }
  cached = d;
  return d;
}

export function writeSave(d: SaveData): void {
  cached = d;
  try {
    sys.localStorage.setItem(KEY, JSON.stringify(d));
  } catch (e) {
    console.warn('[Save] 写入失败（不影响本局）', e);
  }
}
