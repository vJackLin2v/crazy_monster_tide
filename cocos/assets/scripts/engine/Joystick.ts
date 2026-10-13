/**
 * 动态摇杆（需求 §3：触点落下处生成、松开消失、不固定绘制）
 *
 * 同时支持键盘 WASD / 方向键，方便在桌面端调试。
 * 视觉用 Graphics 画，不引入素材。
 */
import { _decorator, Component, Node, Graphics, Color, input, Input, EventTouch, EventKeyboard, KeyCode, UITransform } from 'cc';
import { SCREEN_W, SCREEN_H } from '../core/Const';
const { ccclass } = _decorator;

const RADIUS = 34;          // 有效半径（屏幕像素）
const KNOB_R = 20;
const RING_R = 48;

@ccclass('Joystick')
export class Joystick extends Component {
  /** 输出方向（-1..1）；y 正值 = 世界坐标向下（与摇杆方向一致） */
  outX = 0;
  outY = 0;

  private ring: Node = null!;
  private knob: Node = null!;
  private ox = 0; private oy = 0;
  private active = false;
  private keys = new Set<number>();

  onLoad() {
    const ut = this.node.addComponent(UITransform);
    ut.setContentSize(SCREEN_W, SCREEN_H);

    this.ring = new Node('ring'); this.ring.parent = this.node;
    const rg = this.ring.addComponent(Graphics);
    rg.lineWidth = 2;
    rg.strokeColor = new Color(136, 214, 188, 130);
    rg.fillColor = new Color(13, 23, 50, 90);
    rg.circle(0, 0, RING_R); rg.fill(); rg.stroke();

    this.knob = new Node('knob'); this.knob.parent = this.ring;
    const kg = this.knob.addComponent(Graphics);
    kg.fillColor = new Color(136, 214, 188, 220);
    kg.circle(0, 0, KNOB_R); kg.fill();

    this.ring.active = false;

    input.on(Input.EventType.TOUCH_START, this.onDown, this);
    input.on(Input.EventType.TOUCH_MOVE, this.onMove, this);
    input.on(Input.EventType.TOUCH_END, this.onUp, this);
    input.on(Input.EventType.TOUCH_CANCEL, this.onUp, this);
    input.on(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.on(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  onDestroy() {
    input.off(Input.EventType.TOUCH_START, this.onDown, this);
    input.off(Input.EventType.TOUCH_MOVE, this.onMove, this);
    input.off(Input.EventType.TOUCH_END, this.onUp, this);
    input.off(Input.EventType.TOUCH_CANCEL, this.onUp, this);
    input.off(Input.EventType.KEY_DOWN, this.onKeyDown, this);
    input.off(Input.EventType.KEY_UP, this.onKeyUp, this);
  }

  /** 触摸点 -> Canvas 本地坐标（Canvas 原点在屏幕中心） */
  private toLocal(e: EventTouch): { x: number; y: number } {
    const p = e.getUILocation();
    return { x: p.x - SCREEN_W / 2, y: p.y - SCREEN_H / 2 };
  }

  private onDown(e: EventTouch) {
    if (this.active) return;
    const p = this.toLocal(e);
    this.ox = p.x; this.oy = p.y;
    this.active = true;
    this.ring.active = true;
    this.ring.setPosition(this.ox, this.oy, 0);
    this.knob.setPosition(0, 0, 0);
  }

  private onMove(e: EventTouch) {
    if (!this.active) return;
    const p = this.toLocal(e);
    let dx = p.x - this.ox, dy = p.y - this.oy;
    const d = Math.hypot(dx, dy);
    if (d > RADIUS) { dx = dx / d * RADIUS; dy = dy / d * RADIUS; }
    this.knob.setPosition(dx, dy, 0);
    this.outX = dx / RADIUS;
    this.outY = -dy / RADIUS;      // Canvas y 向上 → 世界 y 向下
  }

  private onUp(_e: EventTouch) {
    this.active = false;
    this.ring.active = false;
    this.outX = 0; this.outY = 0;
  }

  private onKeyDown(e: EventKeyboard) {
    this.keys.add(e.keyCode);
    this.syncKeys();
  }
  private onKeyUp(e: EventKeyboard) {
    this.keys.delete(e.keyCode);
    this.syncKeys();
  }
  private syncKeys() {
    if (this.active) return;
    const k = this.keys;
    let x = 0, y = 0;
    if (k.has(KeyCode.KEY_A) || k.has(KeyCode.ARROW_LEFT)) x -= 1;
    if (k.has(KeyCode.KEY_D) || k.has(KeyCode.ARROW_RIGHT)) x += 1;
    if (k.has(KeyCode.KEY_W) || k.has(KeyCode.ARROW_UP)) y -= 1;      // 上 = 世界 y 减小
    if (k.has(KeyCode.KEY_S) || k.has(KeyCode.ARROW_DOWN)) y += 1;
    this.outX = x; this.outY = y;
  }
}
