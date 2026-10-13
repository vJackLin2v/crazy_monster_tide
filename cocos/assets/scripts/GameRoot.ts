/**
 * 工程入口 —— 挂在 Boot.scene 的 Game 节点上
 *
 * 现在只做一件事：建 UI 层 + 摇杆，然后启动战斗。
 * 后续里程碑会在这里接入 12 屏 UI（按 docs/ui/ui-spec-approved.md v1.0）。
 */
import { _decorator, Component, Node, Canvas, UITransform } from 'cc';
import { SCREEN_W, SCREEN_H } from './core/Const';
import { Joystick } from './engine/Joystick';
import { Battle } from './battle/Battle';
import { Assets } from './engine/Assets';
const { ccclass } = _decorator;

@ccclass('GameRoot')
export class GameRoot extends Component {
  private joy: Joystick = null!;
  private battle: Battle = null!;

  onLoad() {
    // 战斗世界（Battle 自己会建 World 节点树）
    const battleNode = new Node('Battle');
    battleNode.parent = this.node;
    this.battle = battleNode.addComponent(Battle);

    // 输入层：铺满全屏，接收触摸
    const joyNode = new Node('Joystick');
    joyNode.parent = this.node;
    const ut = joyNode.addComponent(UITransform);
    ut.setContentSize(SCREEN_W, SCREEN_H);
    this.joy = joyNode.addComponent(Joystick);
  }

  update(_dt: number) {
    if (this.joy && this.battle) {
      this.battle.inputX = this.joy.outX;
      this.battle.inputY = this.joy.outY;
    }
  }
}
