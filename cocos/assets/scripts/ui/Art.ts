/**
 * 像素 UI 素材（九宫格）入口
 *
 * 素材来源：**Kenney Pixel UI Pack（CC0）**
 *   https://kenney.nl/assets/pixel-ui-pack
 *   原始包保存在 assets/ui/third_party/kenney_pixel_ui_pack/（含 License.txt）
 *   项目实际使用的、按本作暗色调色板重上色的九宫格由 tools/art/gen_ui_kit.py 生成，
 *   落在 assets/resources/ui/kenney/*.png；素材清单见 docs/ui-redesign/asset_usage_manifest.md
 *
 * 设计要点：
 *   - 全部 52x52、四角 10px 不拉伸（九宫格），四边 2px 近黑描边（与项目既有硬描边语言一致）
 *   - 纹理 NEAREST；节点尺寸变化时只有中段被拉伸，四角像素不变形
 *   - 加载失败时返回 null，UIKit 自动回退到 Graphics 绘制（保功能不保观感）
 */
import { Node, Sprite, SpriteFrame, UITransform } from 'cc';
import { Assets } from '../engine/Assets';

/** 九宫格边距（像素，原图 52x52 的 10px 边框） */
export const UI_INSET = 10;

export const UI_ART_NAMES = [
  'panel', 'panel_soft', 'well', 'slot', 'list_row',
  'btn', 'btn_pressed', 'btn_primary', 'btn_primary_pressed',
  'btn_danger', 'btn_danger_pressed', 'btn_disabled',
  'card_sel', 'card_gold', 'rim_blue', 'rim_purple', 'rim_green', 'rim_red', 'rim_cyan',
] as const;

export type UiArtName = typeof UI_ART_NAMES[number];

const cache = new Map<string, SpriteFrame | null>();
let loaded = false;

/** 预加载全部 UI 九宫格（GameRoot.onLoad 里 await 一次，之后全部同步可用） */
export async function preloadUiArt(): Promise<void> {
  if (loaded) return;
  await Promise.all(UI_ART_NAMES.map(async (n) => {
    const f = await Assets.loadUi(n);
    cache.set(n, f);
  }));
  loaded = !!cache.get('panel');
  const miss = UI_ART_NAMES.filter(n => !cache.get(n));
  if (loaded) console.log('[Art] UI 九宫格就绪 ' + (UI_ART_NAMES.length - miss.length) + '/' + UI_ART_NAMES.length);
  else console.warn('[Art] UI 九宫格未加载（回退到 Graphics 绘制）: ' + miss.join(','));
}

export function uiFrame(name: string): SpriteFrame | null {
  return cache.get(name) ?? null;
}

/** 素材是否可用：不可用时 UIKit 走旧的 Graphics 画法 */
export function uiArtReady(): boolean { return loaded; }

/** 给已存在的节点挂/换九宫格 Sprite；返回是否成功（素材缺失时返回 false） */
export function setUiSprite(n: Node, name: string, w: number, h: number): boolean {
  const f = uiFrame(name);
  if (!f) return false;
  let sp = n.getComponent(Sprite);
  if (!sp) sp = n.addComponent(Sprite);
  sp.sizeMode = Sprite.SizeMode.CUSTOM;
  sp.trim = false;
  sp.type = Sprite.Type.SLICED;
  if (sp.spriteFrame !== f) sp.spriteFrame = f;
  const ut = n.getComponent(UITransform);
  if (ut) ut.setContentSize(w, h);
  return true;
}
