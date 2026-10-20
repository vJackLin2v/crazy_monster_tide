/**
 * 音频管理器 —— BGM + 音效
 *
 * 素材：`resources/art/audio/`（35 个，已在 Asset Gate 内）
 * 映射与 **HTML DEMO 的 `src/audio.js` 一致**，不另发明一套。
 *
 * 设计要点：
 *   · 音效用 `playOneShot`（可重叠）；BGM 用 `play()` + loop
 *   · 同一音效**限流**（默认 55ms 内不重复播），否则密集命中会刺耳
 *   · 载入失败**静默降级**，绝不阻塞游戏
 */
import { AudioClip, AudioSource, Node } from 'cc';
import { Assets } from './Assets';

/** 音效 key -> 文件名（照抄 DEMO 的 SFX_FILE） */
const SFX_FILE: Record<string, string> = {
  click: 'buttonclick1.wav',
  hover: 'paperhover.wav',
  waveStart: 'battlestart.ogg',
  hitLight: 'Slash_Attack_Sword_1.wav',
  hitMid: 'Slash_Attack_Sword_2.wav',
  hitHeavy: 'Slash_Attack_Heavy_1.wav',
  hitRanged: 'Slash_Attack_Archer_1.wav',
  hitMetal: 'Hit_Metal_on_leather.wav',
  crit: 'risingheavyhit.wav',
  levelUp: 'stateup.wav',
  cardPick: 'unitclassup.wav',
  pickup: 'unitabsorbption.wav',
  drop: 'drop.ogg',
  enemyIn: 'unitentering.wav',
  bossIn: 'stage6crack.wav',
  special: 'rainbow.wav',
  holy: 'holy.wav',
  victory: 'victory.wav',
  defeat: 'defeat.wav',
};
const BGM_FILE: Record<string, string> = { menu: 'mainmenu.ogg', battle: 'battle.ogg', boss: 'boss.ogg' };

class AudioMgr {
  private sfxSrc: AudioSource | null = null;
  private bgmSrc: AudioSource | null = null;
  private clips = new Map<string, AudioClip>();
  private lastAt = new Map<string, number>();
  private curBgm = '';
  /** 想播的 BGM（若此刻还没载入完，preload 结束后自动补播） */
  private wantBgm = '';
  muted = false;

  init(node: Node): void {
    if (this.sfxSrc) return;
    this.sfxSrc = node.addComponent(AudioSource);
    this.bgmSrc = node.addComponent(AudioSource);
    if (this.bgmSrc) { this.bgmSrc.loop = true; this.bgmSrc.volume = 0.34; }
  }

  /** 后台加载全部音频（不阻塞） */
  async preload(): Promise<void> {
    let n = 0;
    for (const k of Object.keys(SFX_FILE)) {
      const c = await Assets.loadAudio(SFX_FILE[k]);
      if (c) { this.clips.set(k, c); n++; }
    }
    for (const k of Object.keys(BGM_FILE)) {
      const c = await Assets.loadAudio(BGM_FILE[k]);
      if (c) { this.clips.set('bgm_' + k, c); n++; }
    }
    console.log('[Audio] 已载入 ' + n + ' 个音频');
    // 补播：载入前就请求过的 BGM，现在真正开播
    if (this.wantBgm) { const k = this.wantBgm; this.wantBgm = ''; this.bgm(k); }
  }

  /** 播一个音效。gapMs = 限流间隔；vol = 0~1 */
  sfx(key: string, vol = 0.6, gapMs = 55): void {
    if (this.muted || !this.sfxSrc) return;
    const clip = this.clips.get(key);
    if (!clip) return;
    const now = Date.now();
    if (now - (this.lastAt.get(key) ?? 0) < gapMs) return;
    this.lastAt.set(key, now);
    try { this.sfxSrc.playOneShot(clip, vol); } catch (e) { /* 静默降级 */ }
  }

  /**
   * 切 BGM（同一首不重播）
   *
   * ⚠️ 踩过的坑：早期这里在**clip 还没载入**时就把 `curBgm = key` 记下了，
   *    于是之后同样的调用被"同一首"判定挡掉 —— BGM 永远不播（clip 一直是 null）。
   *    现在只有真正开播才记 curBgm；没载入就先记到 wantBgm，preload 结束后补播。
   */
  bgm(key: string): void {
    this.wantBgm = key;
    if (!this.bgmSrc) return;
    if (this.curBgm === key) return;
    const clip = this.clips.get('bgm_' + key);
    if (!clip) return;                     // 还没载完 -> 不记 curBgm，等 preload 补播
    this.curBgm = key;
    try {
      this.bgmSrc.stop();
      if (this.muted) return;
      this.bgmSrc.clip = clip;
      this.bgmSrc.play();
    } catch (e) { /* 静默降级 */ }
  }

  stopBgm(): void {
    this.curBgm = '';
    try { this.bgmSrc?.stop(); } catch (e) { /* ignore */ }
  }

  setMuted(m: boolean): void {
    this.muted = m;
    if (!this.bgmSrc) return;
    if (m) { try { this.bgmSrc.pause(); } catch (e) { /* ignore */ } }
    else { try { this.bgmSrc.play(); } catch (e) { /* ignore */ } }
  }
}

export const Sfx = new AudioMgr();
