/**
 * 通用滚动区（2026-10-30 重写）
 *
 * ⚠️ 为什么不用 cc.ScrollView、也不用节点 TOUCH_MOVE：
 *    参考《行囊守卫》的实现（xingnang/cocos_port/assets/scripts/ui/UiKit.ts::scrollArea）——
 *    那边明确写了"本场景节点触摸派发有问题"，所以它用的是
 *    ① Mask(Type.GRAPHICS_RECT) 裁剪 + ② **全局 cc.input 监听** + 自己在触摸点做命中测试。
 *    我们在微信小游戏里同样遇到"节点收不到 TOUCH_MOVE"，所以照这套做。
 *
 * 用法：
 *   const sc = makeScroll(parent, cx, cy, w, h, contentH);
 *   // 往 sc.content 里放内容，坐标以 content 中心为原点（content 高度 = contentH）
 */
import { Node, Mask, UITransform, input, Input, EventTouch } from 'cc';
/* 双通道：全局 input（全屏页用）+ 节点事件（模态抽屉里用，那里节点事件是通的） */
import { mkNode } from './UIKit';

interface Area {
  view: Node; content: Node;
  w: number; h: number; contentH: number;
  off: number; dragging: boolean; startY: number; startOff: number;
}

const areas: Area[] = [];
let bound = false;

function wrect(n: Node): { x0: number; x1: number; y0: number; y1: number } {
  const ut = n.getComponent(UITransform)!;
  const wp = n.getWorldPosition();
  return {
    x0: wp.x - ut.width * ut.anchorX, x1: wp.x + ut.width * (1 - ut.anchorX),
    y0: wp.y - ut.height * ut.anchorY, y1: wp.y + ut.height * (1 - ut.anchorY),
  };
}

function apply(a: Area): void {
  // content 顶部对齐视口顶部，再按 offset 上移（与参考实现一致）
  a.content.setPosition(0, a.h / 2 - a.contentH / 2 + a.off, 0);
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
        return;
      }
    }
  });
  input.on(Input.EventType.TOUCH_MOVE, (e: EventTouch) => {
    const a = areas.find(x => x.dragging);
    if (!a || !a.content.isValid) return;
    const p = e.getUILocation();
    const max = Math.max(0, a.contentH - a.h);
    a.off = Math.max(0, Math.min(max, a.startOff + (p.y - a.startY)));
    apply(a);
  });
  const end = () => { for (const a of areas) a.dragging = false; };
  input.on(Input.EventType.TOUCH_END, end);
  input.on(Input.EventType.TOUCH_CANCEL, end);
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
  };
  areas.push(a);
  apply(a);
  // 节点级兜底：抽屉/弹窗里节点触摸是通的（按钮能点），直接用节点事件更可靠
  const start = (e: EventTouch) => { a.dragging = true; a.startY = e.getUILocation().y; a.startOff = a.off; };
  const move = (e: EventTouch) => {
    if (!a.dragging) return;
    const max = Math.max(0, a.contentH - a.h);
    a.off = Math.max(0, Math.min(max, a.startOff + (e.getUILocation().y - a.startY)));
    apply(a);
  };
  const end = () => { a.dragging = false; };
  view.on(Node.EventType.TOUCH_START, start, view);
  view.on(Node.EventType.TOUCH_MOVE, move, view);
  view.on(Node.EventType.TOUCH_END, end, view);
  view.on(Node.EventType.TOUCH_CANCEL, end, view);
  return { view, content, contentH: a.contentH };
}

/** 让某个滚动区回到顶部（切换页签时用） */
export function resetScroll(h: ScrollHandle): void {
  const a = areas.find(x => x.content === h.content);
  if (a) { a.off = 0; apply(a); }
}
