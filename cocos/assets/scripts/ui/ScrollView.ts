/**
 * 通用滚动区（2026-10-30 v2：加惯性）
 *
 * 为什么不用 cc.ScrollView：参考《行囊守卫》UiKit.scrollArea 的注释——
 * 本场景节点触摸派发不可靠，所以用 Mask(GRAPHICS_RECT) 裁剪 + 全局 cc.input 监听 + 自己命中测试。
 * v2 在此基础上补：拖动速度采样 → 松手后按 0.9^frames 衰减滑行，到边界立即停。
 */
import { Node, Mask, UITransform, input, Input, EventTouch, director, Director } from 'cc';
import { mkNode } from './UIKit';

interface Area {
  view: Node; content: Node;
  w: number; h: number; contentH: number;
  off: number; dragging: boolean; startY: number; startOff: number;
  lastY: number; lastT: number; flingV: number;
}

const areas: Area[] = [];
let bound = false;
/** 惯性参数：低于 FLING_MIN 不滑行；每帧乘 FLING_DAMP；低于 FLING_STOP 直接停 */
const FLING_MIN = 300;
const FLING_DAMP = 0.90;
const FLING_STOP = 30;
function wrect(n: Node): { x0: number; x1: number; y0: number; y1: number } {
  const ut = n.getComponent(UITransform)!;
  const wp = n.getWorldPosition();
  return {
    x0: wp.x - ut.width * ut.anchorX, x1: wp.x + ut.width * (1 - ut.anchorX),
    y0: wp.y - ut.height * ut.anchorY, y1: wp.y + ut.height * (1 - ut.anchorY),
  };
}

function apply(a: Area): void {
  a.content.setPosition(0, a.h / 2 - a.contentH / 2 + a.off, 0);
}

function clampOff(a: Area, v: number): number {
  const max = Math.max(0, a.contentH - a.h);
  return Math.max(0, Math.min(max, v));
}

function bind(): void {
  if (bound) return;
  bound = true;
  input.on(Input.EventType.TOUCH_START, (e: EventTouch) => {
    const p = e.getUILocation();
    for (const a of areas) {
      if (!a.view.isValid) continue;
      const r = wrect(a.view);
      if (p.x >= r.x0 && p.x <= r.x1 && p.y >= r.y0 && p.y <= r.y1) {
        a.dragging = true; a.startY = p.y; a.startOff = a.off;
        a.lastY = p.y; a.lastT = performance.now(); a.flingV = 0;
        return;
      }
    }
  });
  input.on(Input.EventType.TOUCH_MOVE, (e: EventTouch) => {
    const a = areas.find(x => x.dragging);
    if (!a || !a.content.isValid) return;
    const p = e.getUILocation();
    const now = performance.now();
    const dtm = (now - a.lastT) / 1000;
    if (dtm > 0.004) { a.flingV = (p.y - a.lastY) / dtm; a.lastY = p.y; a.lastT = now; }
    a.off = clampOff(a, a.startOff + (p.y - a.startY));
    apply(a);
  });
  const endAll = () => {
    for (const a of areas) {
      if (!a.dragging) continue;
      a.dragging = false;
      if (Math.abs(a.flingV) < FLING_MIN) a.flingV = 0;
    }
  };
  input.on(Input.EventType.TOUCH_END, endAll);
  input.on(Input.EventType.TOUCH_CANCEL, endAll);

  // 惯性滑行
  director.on(Director.EVENT_AFTER_UPDATE, () => {
    const dt = Math.min(0.05, director.getDeltaTime());
    for (const a of areas) {
      if (!a.flingV || !a.content.isValid) continue;
      const max = Math.max(0, a.contentH - a.h);
      let next = a.off + a.flingV * dt;
      if (next <= 0) { next = 0; a.flingV = 0; }
      else if (next >= max) { next = max; a.flingV = 0; }
      a.off = next;
      apply(a);
      a.flingV *= Math.pow(FLING_DAMP, dt * 60);
      if (Math.abs(a.flingV) < FLING_STOP) a.flingV = 0;
    }
  });
}

export interface ScrollHandle { view: Node; content: Node; contentH: number }

export function makeScroll(parent: Node, cx: number, cy: number, w: number, h: number, contentH: number): ScrollHandle {
  bind();
  const view = mkNode(parent, 'scrollView', w, h, cx, cy);
  const mask = view.addComponent(Mask);
  mask.type = Mask.Type.GRAPHICS_RECT;
  const content = mkNode(view, 'scrollContent', w, Math.max(h, contentH), 0, 0);
  const a: Area = {
    view, content, w, h, contentH: Math.max(h, contentH),
    off: 0, dragging: false, startY: 0, startOff: 0,
    lastY: 0, lastT: 0, flingV: 0,
  };
  areas.push(a);
  apply(a);
  const start = (e: EventTouch) => {
    const p = e.getUILocation();
    a.dragging = true; a.startY = p.y; a.startOff = a.off;
    a.lastY = p.y; a.lastT = performance.now(); a.flingV = 0;
  };
  const move = (e: EventTouch) => {
    if (!a.dragging) return;
    const p = e.getUILocation();
    const now = performance.now();
    const dtm = (now - a.lastT) / 1000;
    if (dtm > 0.004) { a.flingV = (p.y - a.lastY) / dtm; a.lastY = p.y; a.lastT = now; }
    a.off = clampOff(a, a.startOff + (p.y - a.startY));
    apply(a);
  };
  const end = () => {
    a.dragging = false;
    if (Math.abs(a.flingV) < FLING_MIN) a.flingV = 0;
  };
  view.on(Node.EventType.TOUCH_START, start, view);
  view.on(Node.EventType.TOUCH_MOVE, move, view);
  view.on(Node.EventType.TOUCH_END, end, view);
  view.on(Node.EventType.TOUCH_CANCEL, end, view);
  return { view, content, contentH: a.contentH };
}

/** 回到顶部（切换页签时用） */
export function resetScroll(h: ScrollHandle): void {
  const a = areas.find(x => x.content === h.content);
  if (a) { a.off = 0; a.flingV = 0; apply(a); }
}
