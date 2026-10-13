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
import { resources, SpriteFrame, AudioClip, Texture2D, ImageAsset, Rect, Size } from 'cc';
import { UNIT_FRAMES, ANIM_FPS } from '../data/UnitFrames';
import { VFX_FRAMES } from '../data/VfxFrames';

export type UnitClips = Record<string, SpriteFrame[]>;

function nearest(sf: SpriteFrame): SpriteFrame {
  const tex = sf.texture as Texture2D;
  if (tex && tex.setFilters) tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
  return sf;
}

/**
 * 载入一张图 -> SpriteFrame
 *
 * ⚠️ 这里踩过一个坑（2026-10-13）：本工程的图片被导入成 **texture**（只有 `texture` 子资源），
 *    而代码找的是 `spriteFrame` 子资源 → 全部加载失败，画面上"除了底色什么都没有"。
 *    所以这里**两条路都走**：先试 spriteFrame，失败则从 texture 现场构造 SpriteFrame。
 *    好处：不管工程以后把图片导成哪种类型，都能跑。
 *    另外：meta 里过滤器是 linear，像素风必须在这里强制成 NEAREST。
 */
function loadSF(path: string): Promise<SpriteFrame | null> {
  return new Promise(res => {
    resources.load(path + '/spriteFrame', SpriteFrame, (err, sf) => {
      if (sf) { Assets.loadedCount++; res(nearest(sf)); return; }
      // 回退：从 texture 子资源构造
      resources.load(path + '/texture', Texture2D, (err2, tex) => {
        if (err2 || !tex) {
          if (Assets.firstFailLogged < 5) {
            Assets.firstFailLogged++;
            console.error('[Assets] 加载失败：' + path + '（spriteFrame 与 texture 都取不到）',
              (err && (err as Error).message) || err, (err2 && (err2 as Error).message) || err2);
          }
          Assets.failedCount++;
          res(null); return;
        }
        tex.setFilters(Texture2D.Filter.NEAREST, Texture2D.Filter.NEAREST);
        const frame = new SpriteFrame();
        frame.texture = tex;
        frame.rect = new Rect(0, 0, tex.width, tex.height);
        frame.originalSize = new Size(tex.width, tex.height);
        frame.packable = false;
        Assets.loadedCount++;
        res(frame);
      });
    });
  });
}

/** 纯色 SpriteFrame（运行时生成，不依赖任何外部素材）—— 素材加载失败时的兜底，保证"看得见" */
export function makeSolidFrame(r: number, g: number, b: number, a = 255, size = 8): SpriteFrame {
  const data = new Uint8Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4] = r; data[i * 4 + 1] = g; data[i * 4 + 2] = b; data[i * 4 + 3] = a;
  }
  const img = new ImageAsset({
    _data: data, width: size, height: size, format: Texture2D.PixelFormat.RGBA8888, _compressed: false,
  } as never);
  const tex = new Texture2D();
  tex.image = img;
  const sf = new SpriteFrame();
  sf.texture = tex;
  return nearest(sf);
}

export class Assets {
  private static unitCache = new Map<string, UnitClips>();
  private static vfxCache = new Map<string, SpriteFrame[]>();
  private static audioCache = new Map<string, AudioClip | null>();
  static loadedCount = 0;
  static failedCount = 0;
  static firstFailLogged = 0;

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

/**
 * 程序生成一张椭圆软阴影贴图（零素材）
 *
 * 为什么不用素材：阴影是纯图形，用 16x16 的 alpha 渐变就够了，
 * 比给每个单位挂一个 Graphics 组件便宜得多（那是每帧都要提交渲染的）。
 * 全场景共用这一张，SpriteFrame 只生成一次。
 */
let _shadow: SpriteFrame | null = null;
export function shadowFrame(): SpriteFrame {
  if (_shadow) return _shadow;
  const N = 16;
  const data = new Uint8Array(N * N * 4);
  const cx = (N - 1) / 2, cy = (N - 1) / 2, r = N / 2 - 0.5;
  for (let y = 0; y < N; y++) {
    for (let x = 0; x < N; x++) {
      const dx = (x - cx) / r, dy = (y - cy) / r;
      const d = Math.sqrt(dx * dx + dy * dy);
      // 中心最实，边缘平滑淡出
      const a = d >= 1 ? 0 : Math.round(150 * Math.pow(1 - d, 1.6));
      const i = (y * N + x) * 4;
      data[i] = 0; data[i + 1] = 0; data[i + 2] = 0; data[i + 3] = a;
    }
  }
  const img = new ImageAsset({
    _data: data, width: N, height: N, format: Texture2D.PixelFormat.RGBA8888, _compressed: false,
  } as never);
  const tex = new Texture2D();
  tex.image = img;
  tex.setFilters(Texture2D.Filter.LINEAR, Texture2D.Filter.LINEAR);   // 阴影要柔，用 LINEAR
  const sf = new SpriteFrame();
  sf.texture = tex;
  sf.rect = new Rect(0, 0, N, N);
  sf.originalSize = new Size(N, N);
  sf.packable = false;
  _shadow = sf;
  return sf;
}
