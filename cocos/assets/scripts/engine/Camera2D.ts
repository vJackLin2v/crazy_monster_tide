/**
 * 相机（不移动引擎相机，改移动 World 容器 —— 2D 里这样最可控）
 *
 * ── 坐标约定（必须理解这一段，否则画面会错位）────────────────────
 * 世界坐标（与 HTML 原型一致，方便对照移植）：
 *     原点 = 竞技场左上角，x 向右、**y 向下**，范围 ARENA_W x ARENA_H
 * Cocos：y 向上。所以世界点 (wx, wy) 放进 World 节点时用 (wx, ARENA_H - wy)。
 * Canvas：设计分辨率 360x640，**原点在屏幕中心**（y 向上）——
 *     屏幕左上角 = Canvas 本地 (-180, +320)。
 *
 * ── 推导 ────────────────────────────────────────────────────
 * 设 World 节点 scale = ZOOM、position = P，则
 *     canvasLocal = P + ZOOM * (wx, ARENA_H - wy)
 * 让可视区左上角 (camX, camY) 落在屏幕左上角：
 *     P = (-180 - ZOOM*camX ,  320 - ZOOM*(ARENA_H - camY))
 * ────────────────────────────────────────────────────────────
 */
import { _decorator, Component, Node, Vec3 } from 'cc';
import { ZOOM, VIEW_W, VIEW_H, ARENA_W, ARENA_H, SCREEN_W, SCREEN_H } from '../core/Const';
const { ccclass, property } = _decorator;

@ccclass('Camera2D')
export class Camera2D extends Component {
  @property(Node) target: Node | null = null;
  /** 跟随平滑（0 = 硬跟随） */
  @property followLerp = 0;

  private shake = 0;
  private camX = 0;
  private camY = 0;

  /** 世界坐标(y 向下) -> World 节点下的本地坐标(y 向上) */
  static toLocal(wx: number, wy: number): Vec3 { return new Vec3(wx, ARENA_H - wy, 0); }

  /** 屏幕像素 -> Canvas 本地坐标（原点在屏幕中心，y 向上）—— 摇杆等 UI 用 */
  static screenToCanvas(sx: number, sy: number): Vec3 {
    return new Vec3(sx - SCREEN_W / 2, SCREEN_H / 2 - sy, 0);
  }

  addShake(v: number) { this.shake = Math.max(this.shake, v); }
  get viewLeft(): number { return this.camX; }
  get viewTop(): number { return this.camY; }
  /** 世界坐标是否在可视区内（用于剔除） */
  visible(wx: number, wy: number, pad = 24): boolean {
    return wx >= this.camX - pad && wx <= this.camX + VIEW_W + pad &&
           wy >= this.camY - pad && wy <= this.camY + VIEW_H + pad;
  }

  update(dt: number) {
    if (!this.target) return;
    const p = this.target.position;
    const wx = p.x;                       // 目标在 World 下的本地 x == 世界 x
    const wy = ARENA_H - p.y;             // 本地 y -> 世界 y（翻转）

    let cx = wx - VIEW_W / 2;
    let cy = wy - VIEW_H / 2;
    cx = Math.max(0, Math.min(ARENA_W - VIEW_W, cx));
    cy = Math.max(0, Math.min(ARENA_H - VIEW_H, cy));

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

    this.node.setScale(ZOOM, ZOOM, 1);
    this.node.setPosition(
      Math.round(-(SCREEN_W / 2) - ZOOM * this.camX + ox),
      Math.round((SCREEN_H / 2) - ZOOM * (ARENA_H - this.camY) + oy),
      0,
    );
  }
}
