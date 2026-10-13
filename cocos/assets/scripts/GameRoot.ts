/**
 * 工程入口 —— 挂在 Boot.scene 的 Game 节点上
 *
 * 现在只做一件事：建 UI 层 + 摇杆，然后启动战斗。
 * 后续里程碑会在这里接入 12 屏 UI（按 docs/ui/ui-spec-approved.md v1.0）。
 */
import { _decorator, Component, Node, Canvas, UITransform, view, ResolutionPolicy } from 'cc';
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
    // ⚠️ 在这里**强制**设定设计分辨率，不依赖编辑器里的项目设置。
    //    实测（2026-10-13）：编辑器预览时用的是 1280x720（settings.js 里写着），
    //    跟我写在 settings/v2/packages/project.json 的 360x640 不一致 —— 结果游戏按
    //    1280x2702 的设计空间铺开，单位只占屏高 3.6%，看着"特别小"。
    //    写死在代码里最可靠：与 docs/ui/ui-spec-approved.md 冻结规格一致。
    view.setDesignResolutionSize(SCREEN_W, SCREEN_H, ResolutionPolicy.FIXED_WIDTH);

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
