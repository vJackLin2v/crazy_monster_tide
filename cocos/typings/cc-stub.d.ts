/**
 * `cc` 引擎 API 的宽松桩（仅用于命令行检查）
 *
 * 目的：Cocos 的 cc 模块只有编辑器里才有类型，命令行 tsc 会报 "Cannot find module 'cc'"。
 *      这里给一个宽松声明，好让 `tsconfig.cc.json` 能对我们的画面代码做
 *      **语法检查 + 未定义标识符检查** —— 免得打开编辑器才发现低级错误。
 *
 * ⚠️ 它不是真实 API 的类型定义，**不要**依赖它做类型推导；真实类型以编辑器为准。
 */
declare module 'cc' {
  export const _decorator: { ccclass: any; property: any; menu: any; executeInEditMode: any };
  export class Component {
    node: any; enabled: boolean; schedule: any; scheduleOnce: any;
    getComponent(t: any): any; addComponent(t: any): any;
    onLoad?(): void; start?(): void; update?(dt: number): void; onDestroy?(): void;
  }
  export class Node {
    constructor(name?: string);
    name: string; parent: any; children: any[]; active: boolean; angle: number;
    position: any; scale: any; layer: number; isValid: boolean;
    setPosition(...a: any[]): void; setScale(...a: any[]): void;
    addComponent(t: any): any; getComponent(t: any): any;
    destroy(): void; setSiblingIndex(i: number): void; getSiblingIndex(): number;
  }
  export class Sprite { color: any; static SizeMode: any; spriteFrame: any; sizeMode: any; trim: boolean; }
  export class SpriteFrame { texture: any; rect: any; originalSize: any; packable: boolean; }
  export class ImageAsset { constructor(src?: any); }
  export class Texture2D { static Filter: any; static PixelFormat: any; image: any; width: number; height: number; setFilters(a: any, b: any): void; }
  export class UITransform { setContentSize(a: any, b?: any): void; contentSize: any; }
  export class Graphics {
    fillColor: any; strokeColor: any; lineWidth: number;
    rect(...a: any[]): void; circle(...a: any[]): void; ellipse(...a: any[]): void;
    fill(): void; stroke(): void; clear(): void; moveTo(...a: any[]): void; lineTo(...a: any[]): void;
  }
  export class Label { string: string; fontSize: number; lineHeight: number; color: any; }
  export class Color { constructor(r?: number, g?: number, b?: number, a?: number); r: number; g: number; b: number; a: number; }
  export class Vec2 { constructor(x?: number, y?: number); x: number; y: number; }
  export class Vec3 { constructor(x?: number, y?: number, z?: number); x: number; y: number; z: number; }
  export class Rect { constructor(x?: number, y?: number, w?: number, h?: number); x: number; y: number; width: number; height: number; }
  export class Size { constructor(w?: number, h?: number); width: number; height: number; }
  export class Quat {}
  export class Canvas {}
  export class AudioSource { clip: any; play(): void; }
  export class AudioClip {}
  export class EventTouch { getUILocation(): { x: number; y: number }; }
  export class EventKeyboard { keyCode: number; }
  export const Input: { EventType: any };
  export const input: { on(t: any, cb: any, target?: any): void; off(t: any, cb: any, target?: any): void };
  export const KeyCode: any;
  export const resources: { load(p: string, t: any, cb: (err: any, a: any) => void): void };
  export const assetManager: any;
  export const director: any;
  export const ResolutionPolicy: any;
export const view: { getVisibleSize(): { width: number; height: number }; setDesignResolutionSize(...a: any[]): void; };
  export const game: any;
  export const math: any;
  export const tween: any;
  export const instantiate: any;
  export const find: any;
  export class Prefab {}
  export const sys: any;
}
