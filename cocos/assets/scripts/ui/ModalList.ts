/**
 * 模态面板滚动列表（ui/ModalList.ts）v3
 *
 * v3：委托给全局 ScrollView（makeScroll）——旧版自己挂节点 TOUCH_MOVE，
 * 在本场景节点触摸派发不可靠，安装屏背包 / 战绩详情道具经常"滚不动"。
 * ScrollView 用全局 input + 命中测试，且带惯性；这里只保留同一套 API。
 */
import { Node } from 'cc';
import { mkNode } from './UIKit';
import { makeScroll, type ScrollHandle } from './ScrollView';

export interface ModalList {
  view: Node;
  content: Node;
  topY: number;
  isDragging(): boolean;
  /** 当前滚动偏移（0 = 顶部）；用于"详情返回列表后保持位置" */
  offset(): number;
  destroy(): void;
}

export function makeModalList(
  parent: Node, cx: number, cy: number, w: number, h: number, contentH: number,
  initialOff = 0,
): ModalList {
  const contentH2 = Math.max(h, contentH);
  const sc: ScrollHandle = makeScroll(parent, cx, cy, w, h, contentH2);
  if (initialOff > 0) sc.setOffset(initialOff);
  return {
    view: sc.view,
    content: sc.content,
    topY: contentH2 / 2,
    isDragging: () => sc.isDragging(),
    offset: () => sc.offset(),
    destroy: () => sc.dispose(),
  };
}
