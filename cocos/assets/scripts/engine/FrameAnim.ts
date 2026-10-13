/**
 * 帧动画播放器（单位与特效共用）
 *
 * 用法：
 *   const anim = node.addComponent(FrameAnim);
 *   anim.setClips(clips);        // { idle: [...], walk: [...], attack: [...], death: [...] }
 *   anim.play('walk');           // 循环
 *   anim.playOnce('death');      // 播一次并停在最后一帧（死亡动画用，KI-001）
 */
import { _decorator, Component, Sprite, SpriteFrame } from 'cc';
import { Assets } from './Assets';
const { ccclass } = _decorator;

@ccclass('FrameAnim')
export class FrameAnim extends Component {
  private sprite: Sprite = null!;
  private clips: Record<string, SpriteFrame[]> = {};
  private cur = '';
  private frames: SpriteFrame[] = [];
  private t = 0;
  private frame = 0;
  private loop = true;
  private done = true;
  private fpsOverride = 0;

  onLoad() {
    this.sprite = this.getComponent(Sprite) ?? this.addComponent(Sprite);
    this.sprite.sizeMode = Sprite.SizeMode.CUSTOM;    // 用节点尺寸，别让引擎按图改大小
    this.sprite.trim = false;
  }

  setClips(clips: Record<string, SpriteFrame[]>) {
    this.clips = clips;
    const first = clips.idle ? 'idle' : Object.keys(clips)[0];
    if (first) this.play(first);
  }

  get current(): string { return this.cur; }
  get isDone(): boolean { return this.done; }

  play(name: string, loop = true, fpsOverride = 0) {
    if (!this.clips[name]) {
      if (this.clips.idle) name = 'idle'; else return;
    }
    if (this.cur === name && loop === this.loop) return;   // 已在播同一动画，不打断
    this.cur = name;
    this.frames = this.clips[name];
    this.loop = loop;
    this.fpsOverride = fpsOverride;
    this.t = 0;
    this.frame = 0;
    this.done = false;
    this.apply();
  }

  playOnce(name: string) { this.play(name, false); }

  private apply() {
    const f = this.frames[this.frame];
    if (f && this.sprite) this.sprite.spriteFrame = f;
  }

  update(dt: number) {
    if (this.done || !this.frames.length) return;
    const fps = this.fpsOverride || Assets.animFps(this.cur);
    this.t += dt;
    const idx = Math.floor(this.t * fps);
    if (idx >= this.frames.length) {
      if (this.loop) {
        this.frame = idx % this.frames.length;
      } else {
        this.frame = this.frames.length - 1;
        this.done = true;
      }
    } else {
      this.frame = idx;
    }
    this.apply();
  }
}
