
import io
code = """/**
 * 模态面板滚动列表（ui/ModalList.ts）v2
 *
 * 上一版整块空白的两个根因（已修）：
 *   1. 用 NodeEventType 常量做事件名——3.8 里不一定导出，取值 undefined 时挂事件会抛异常，
 *      buildInstall 的 try/catch 吞掉后，面板只画了上半截（背包与底部按钮全没了）；
 *   2. content 位移公式符号写反：显示顶部应是 y = (viewportH - contentH) / 2，
 *      写成 (contentH - viewportH) / 2 会把内容整体顶出可视区 → 裁剪后一片空白。
 *
 * 触摸只挂在自己的 viewport 上（不抢全局 input），拖拽超过 8px 才算滚动。
 */
import { Node, Mask, EventTouch } from 'cc';
import { mkNode } from './UIKit';

export interface ModalList {
  view: Node;
  content: Node;
  topY: number;
  isDragging(): boolean;
  destroy(): void;
}

const DRAG_THRESHOLD = 8;

export function makeModalList(
  parent: Node, cx: number, cy: number, w: number, h: number, contentH: number,
): ModalList {
  const view = mkNode(parent, 'mlView', w, h, cx, cy);
  const mask = view.addComponent(Mask);
  mask.type = Mask.Type.GRAPHICS_RECT;

  const H = Math.max(h, contentH);
  const content = mkNode(view, 'mlContent', w, H, 0, 0);

  let off = 0;
  const maxOff = Math.max(0, H - h);
  const apply = () => { content.setPosition(0, (h - H) / 2 - off); };
  apply();

  let startY = 0, dragging = false, moved = 0;

  view.on(Node.EventType.TOUCH_START, (e: EventTouch) => {
    startY = e.getUILocation().y; dragging = false; moved = 0;
  });
  view.on(Node.EventType.TOUCH_MOVE, (e: EventTouch) => {
    const y = e.getUILocation().y;
    const dy = y - startY;
    moved = Math.max(moved, Math.abs(dy));
    if (moved > DRAG_THRESHOLD) dragging = true;
    if (!dragging) return;
    off = Math.max(0, Math.min(maxOff, off - dy));
    startY = y;
    apply();
    e.propagationStopped = true;
  });
  const stop = () => { setTimeout(() => { dragging = false; }, 0); };
  view.on(Node.EventType.TOUCH_END, stop);
  view.on(Node.EventType.TOUCH_CANCEL, stop);

  return {
    view, content, topY: H / 2,
    isDragging: () => dragging,
    destroy: () => { if (view.isValid) view.destroy(); },
  };
}
"""
io.open(r'H:\AI-game\crazy_monster_tide\cocos\assets\scripts\ui\ModalList.ts', 'w', encoding='utf-8', newline='').write(code)
print('written')
