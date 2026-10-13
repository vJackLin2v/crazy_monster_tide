/**
 * 资源加载（唯一入口）
 *
 * 约定：美术全部放在 `assets/resources/art/` 下，运行时用 resources.load 读取。
 *      - 单位帧：art/units/<单位>/<动画>/NN
 *      - 特效帧：art/vfx/<组>/<子组>/<组件>/NNN
 *      - 音频  ：art/audio/<文件名>
 *
 * ⚠️ 像素风硬要求：加载后必须把纹理过滤设成 NEAREST，否则会被线性插值糊掉。
 */
import { resources, SpriteFrame, AudioClip, Texture2D } from 'cc';
import { UNIT_FRAMES, ANIM_FPS } from '../data/UnitFrames';
import { VFX_FRAMES } from '../data/VfxFrames';

export type UnitClips = Record<string, SpriteFrame[]>;

function nearest(sf: SpriteFrame): SpriteFrame {
  const tex = sf.texture as Texture2D;
  if (tex && tex.setFilters) tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
  return sf;
}

function loadSF(path: string): Promise<SpriteFrame | null> {
  return new Promise(res => {
    resources.load(path + '/spriteFrame', SpriteFrame, (err, sf) => {
      if (err || !sf) { res(null); return; }
      res(nearest(sf));
    });
  });
}

export class Assets {
  private static unitCache = new Map<string, UnitClips>();
  private static vfxCache = new Map<string, SpriteFrame[]>();
  private static audioCache = new Map<string, AudioClip | null>();
  static loadedCount = 0;
  static failedCount = 0;

  /** 载入一个单位的全部动画帧（同一单位会被缓存） */
  static async loadUnit(unit: string): Promise<UnitClips> {
    const hit = this.unitCache.get(unit);
    if (hit) return hit;

    const def = UNIT_FRAMES[unit];
    const out: UnitClips = {};
    if (!def) { console.warn('[Assets] 未登记的单位：' + unit); return out; }

    for (const anim of Object.keys(def)) {
      const n = def[anim];
      const jobs: Promise<SpriteFrame | null>[] = [];
      for (let i = 1; i <= n; i++) {
        jobs.push(loadSF(`art/units/${unit}/${anim}/${String(i).padStart(2, '0')}`));
      }
      const frames = (await Promise.all(jobs)).filter((f): f is SpriteFrame => !!f);
      this.loadedCount += frames.length;
      this.failedCount += jobs.length - frames.length;
      if (frames.length) out[anim] = frames;
    }
    this.unitCache.set(unit, out);
    return out;
  }

  /** 载入一个 VFX 组件（组件名形如 projectile/fire/fireball-shot） */
  static async loadVfx(key: string): Promise<SpriteFrame[]> {
    const hit = this.vfxCache.get(key);
    if (hit) return hit;

    const n = VFX_FRAMES[key];
    if (!n) { console.warn('[Assets] 未登记的 VFX：' + key); return []; }
    const jobs: Promise<SpriteFrame | null>[] = [];
    for (let i = 1; i <= n; i++) {
      jobs.push(loadSF(`art/vfx/${key}/${String(i).padStart(3, '0')}`));
    }
    const frames = (await Promise.all(jobs)).filter((f): f is SpriteFrame => !!f);
    this.loadedCount += frames.length;
    this.failedCount += jobs.length - frames.length;
    this.vfxCache.set(key, frames);
    return frames;
  }

  static loadAudio(name: string): Promise<AudioClip | null> {
    if (this.audioCache.has(name)) return Promise.resolve(this.audioCache.get(name) ?? null);
    return new Promise(res => {
      resources.load('art/audio/' + name, AudioClip, (err, clip) => {
        const v = (!err && clip) ? clip : null;
        if (!v) this.failedCount++;
        this.audioCache.set(name, v);
        res(v);
      });
    });
  }

  /** 同步取已加载的 VFX 帧（未加载则返回空数组，调用方需容错） */
  static vfxFrames(key: string): SpriteFrame[] { return this.vfxCache.get(key) ?? []; }
  /** 同步取已加载的单位帧 */
  static unitClips(unit: string): UnitClips { return this.unitCache.get(unit) ?? {}; }

  /** 帧率查询 */
  static animFps(anim: string): number { return ANIM_FPS[anim] ?? 12; }

  static stats() { return { loaded: this.loadedCount, failed: this.failedCount }; }
}
