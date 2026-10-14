/**
 * 帧动画播放器（单位与特效共用）
 *
 * 用法：
 *   const anim = node.addComponent(FrameAnim);
 *   anim.setClips(clips);        // { idle: [...], walk: [...], attack: [...], death: [...] }
 *   anim.play('walk');           // 循环
 *   anim.playOnce('death');      // 播一次并停在最后一帧（死亡动画用，KI-001）
 */
import { _decorator, Component, Sprite, SpriteFrame, UITransform } from 'cc';
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

  /** 是否按帧的原生像素自动设定节点尺寸（默认开） */
  autoSize = true;

  setClips(clips: Record<string, SpriteFrame[]>) {
    this.clips = clips;
    const first = clips.idle ? 'idle' : Object.keys(clips)[0];
    if (first) this.play(first);
    const ut = this.node.getComponent(UITransform);
    if (!ut) return;
    // 按帧的原生像素设尺寸：单位 32（大体型 40）、VFX 32/96/128 —— 全部自动对齐，
    // 不靠调用方手写数字（手写过一次 22×22，结果怪比玩家小一圈）
    const f = this.frames[0];
    if (this.autoSize && f && f.rect && f.rect.width > 0) {
      ut.setContentSize(f.rect.width, f.rect.height);
    } else if (ut.contentSize.width <= 0 || ut.contentSize.height <= 0) {
      ut.setContentSize(32, 32);   // 兜底：Sprite 把尺寸重置成 0 时补回来
    }
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
    if (f && this.sprite) {
      this.sprite.spriteFrame = f;
      // 黑色描边层（Battle 里给单位垫的剪影）要同步换帧，否则描边会停在第 1 帧
      const ol = (this.node as unknown as { _outline?: Sprite })._outline;
      if (ol) ol.spriteFrame = f;
    }
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
