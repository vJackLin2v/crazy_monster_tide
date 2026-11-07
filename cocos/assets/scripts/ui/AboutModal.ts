/**
 * 适龄提示 / 健康游戏忠告 / 隐私说明 弹窗
 *
 * 为什么要单独做：游戏上架审核会看"适龄提示标识"和"健康游戏忠告"，
 * 而隐私说明是用户能自己查到的承诺（本作只写本地存档，不采集个人信息）。
 *
 * 三块内容合并成一个弹窗，从主菜单底部那行小字进入，不占主界面。
 */
import { Node, Color, Graphics, view } from 'cc';
import { panel, text, button, onTap, mkNode } from './UIKit';
import { COL } from './Tokens';

/** 适龄等级：本作无血腥、无恐怖、无社交、无付费，按 8+ 报 */
export const AGE_RATING = 8;

const AGE_NOTE =
  '本游戏适合 8 周岁以上玩家。内容为像素风格的怪物战斗，' +
  '没有血腥画面、没有恐怖元素、没有社交系统，也没有任何付费内容。';

const HEALTH_TIP =
  '抵制不良游戏，拒绝盗版游戏。\n' +
  '注意自我保护，谨防受骗上当。\n' +
  '适度游戏益脑，沉迷游戏伤身。\n' +
  '合理安排时间，享受健康生活。';

const PRIVACY_NOTE =
  '游戏进度只保存在你自己的设备上，不会上传到任何服务器。\n' +
  '为了排查机型兼容问题，会记录设备型号与系统版本，不含姓名、手机号、位置等个人信息。\n' +
  '在设置里可以随时清除全部本地数据。';

/**
 * @param parent 挂载节点（一般是 uiRoot）
 * @param onClose 关闭回调
 */
export function buildAboutModal(parent: Node, onClose: () => void): Node {
  const vs = view.getVisibleSize();
  const VW = vs.width, VH = vs.height;
  const root = mkNode(parent, 'scr-about', VW, VH);

  // 半透明遮罩：点击空白处关闭
  const dim = mkNode(root, 'dim', VW, VH);
  const dg = dim.addComponent(Graphics);
  dg.fillColor = new Color(4, 6, 12, 205);
  dg.rect(-VW / 2, -VH / 2, VW, VH);
  dg.fill();
  onTap(dim, onClose);

  const W = 320, H = 430;
  const box = panel(root, 0, 0, W, H, { art: 'panel' });
  const TX = -W / 2 + 16;        // 正文左边界
  const TW = W - 32;             // 正文宽度

  // ── 适龄提示 ──
  text(box, 0, H / 2 - 25, '适龄提示 ' + AGE_RATING + '+', {
    size: 15, color: COL.cream, width: W - 32, bold: true, outline: true, shadow: true,
  });
  text(box, TX, H / 2 - 65, AGE_NOTE, { size: 11, color: COL.dim, align: 'left', width: TW, h: 60 });

  // ── 健康游戏忠告 ──
  text(box, 0, H / 2 - 112, '健康游戏忠告', {
    size: 12, color: COL.accent, width: W - 32, bold: true, outline: true,
  });
  text(box, TX, H / 2 - 155, HEALTH_TIP, { size: 11, color: COL.dim, align: 'left', width: TW, h: 88 });

  // ── 隐私说明 ──
  text(box, 0, H / 2 - 217, '隐私说明', {
    size: 12, color: COL.accent, width: W - 32, bold: true, outline: true,
  });
  text(box, TX, H / 2 - 265, PRIVACY_NOTE, { size: 11, color: COL.dim, align: 'left', width: TW, h: 80 });

  // ── 关闭 ──
  const ok = button(box, 0, -H / 2 + 32, 200, 44, '知道了', { primary: true, size: 14 });
  onTap(ok.node, onClose);

  return root;
}
