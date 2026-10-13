/**
 * 相机（不移动引擎相机，改移动 World 容器）
 *
 * ── 目标：**与 HTML 原型逐项同比例**，且在任何屏幕上自动成立 ────────────
 * 原型：stage 固定 360x640（完整容纳），ZOOM=2 → 可视世界 180x320，单位占屏高 10%。
 * 若这里写死 scale = ZOOM，长屏（390x844）下 fitWidth 会多露出竖向世界
 * （可见 779 设计单位 = 390 世界单位，比原型的 320 多 22%），同一个 64px 单位看起来就"小"。
 * 用户 2026-10-13 反馈的正是这个。
 *
 * 解法：**自适应 cover 缩放**
 *     s = max(visW / VIEW_W, visH / VIEW_H)
 *   → 可视世界不小于 VIEW_W x VIEW_H（不露边），长屏上 s 自动变大，
 *     单位占比反而与原型一致（390x844 下 s=2.43，单位占屏高 10.0%）。
 *
 * ── 坐标约定 ────────────────────────────────────────────────
 * 世界：原点 = 竞技场左上角，x 右、**y 下**，范围 ARENA_W x ARENA_H
 * Cocos：y 上 → 世界点 (wx,wy) 放进 World 用 (wx, ARENA_H - wy)
 * Canvas：原点在屏幕中心 → 可视区左上角 = (-visW/2, +visH/2)
 *     P = ( -visW/2 - s*camX ,  +visH/2 - s*(ARENA_H - camY) )
 * ────────────────────────────────────────────────────────────
 */
import { _decorator, Component, Node, Vec3, view } from 'cc';
import { ZOOM, VIEW_W, VIEW_H, ARENA_W, ARENA_H } from '../core/Const';
const { ccclass, property } = _decorator;

@ccclass('Camera2D')
export class Camera2D extends Component {
  @property(Node) target: Node | null = null;
  /** 跟随平滑（0 = 硬跟随） */
  @property followLerp = 0;

  private shake = 0;
  private camX = 0;
  private camY = 0;
  private scale = ZOOM;
  private vw = VIEW_W;
  private vh = VIEW_H;

  static toLocal(wx: number, wy: number): Vec3 { return new Vec3(wx, ARENA_H - wy, 0); }

  addShake(v: number) { this.shake = Math.max(this.shake, v); }
  get viewLeft(): number { return this.camX; }
  get viewTop(): number { return this.camY; }
  /** 当前实际缩放（自适应后，原型基准是 ZOOM） */
  get worldScale(): number { return this.scale; }
  /** 当前实际可视世界尺寸 */
  get viewW(): number { return this.vw; }
  get viewH(): number { return this.vh; }

  visible(wx: number, wy: number, pad = 24): boolean {
    return wx >= this.camX - pad && wx <= this.camX + this.vw + pad &&
           wy >= this.camY - pad && wy <= this.camY + this.vh + pad;
  }

  update(dt: number) {
    const vs = view.getVisibleSize();
    const s = Math.max(vs.width / VIEW_W, vs.height / VIEW_H);
    this.scale = s;
    this.vw = vs.width / s;
    this.vh = vs.height / s;

    if (!this.target) {
      // 目标还没建好也要先把缩放定下来，避免"先小后大"的跳变
      this.node.setScale(s, s, 1);
      this.node.setPosition(-(vs.width / 2) - s * this.camX, (vs.height / 2) - s * (ARENA_H - this.camY), 0);
      return;
    }

    const p = this.target.position;
    const wx = p.x, wy = ARENA_H - p.y;

    let cx = wx - this.vw / 2;
    let cy = wy - this.vh / 2;
    cx = Math.max(0, Math.min(Math.max(0, ARENA_W - this.vw), cx));
    cy = Math.max(0, Math.min(Math.max(0, ARENA_H - this.vh), cy));

    if (this.followLerp > 0) {
      const k = Math.min(1, this.followLerp * dt);
      this.camX += (cx - this.camX) * k;
      this.camY += (cy - this.camY) * k;
    } else { this.camX = cx; this.camY = cy; }

    let ox = 0, oy = 0;
    if (this.shake > 0.1) {
      ox = (Math.random() * 2 - 1) * this.shake;
      oy = (Math.random() * 2 - 1) * this.shake;
      this.shake *= Math.pow(0.0016, dt);
    } else this.shake = 0;

    this.node.setScale(s, s, 1);
    this.node.setPosition(
      Math.round(-(vs.width / 2) - s * this.camX + ox),
      Math.round((vs.height / 2) - s * (ARENA_H - this.camY) + oy),
      0,
    );
  }
}
