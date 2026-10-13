/**
 * 战斗场景（M12）
 *
 * 职责：把「纯逻辑」（game/ 下的 RunState / SkillCalc / Combat）驱动起来，
 *      并把结果同步到节点上。**所有数值都来自 core/Const.ts 与 data/，这里不写魔法数字。**
 *
 * 当前范围（先跑通战斗，UI 后做）：
 *   ✅ 玩家移动（摇杆/键盘）+ 4 技能自动开火（走 SkillCalc 的模块叠算）
 *   ✅ 怪潮按波次刷新（走 Combat 的曲线，敌人按 from 分波解锁）
 *   ✅ 命中/击杀/暴击 VFX、顿帧、屏震、伤害数字
 *   ✅ 经验掉落与自动吸取、升级弹 3 选 1（先用最简卡片，UI 冻结规格留到下一里程碑）
 *   ✅ 波次计时 → 结算金币 → 下一波；BOSS 波轮换 3 个 BOSS
 *   ✅ KI-001：死亡动画播完即回收节点（先累加计时，再跳过逻辑）
 *   ⬜ 12 屏 UI（按 docs/ui/ui-spec-approved.md v1.0）
 */
import { _decorator, Component, Node, Sprite, UITransform, Color, Graphics, Label, view } from 'cc';
import { ZOOM, ARENA_W, ARENA_H, SCREEN_W, SCREEN_H, HITSTOP, HITSTOP_SCALE, SHAKE, DEATH_ANIM_TIME,
         TARGET_RANGE, RUN, waveTime, isBossWave } from '../core/Const';
import { Assets, makeSolidFrame, shadowFrame, type UnitClips } from '../engine/Assets';
import { FrameAnim } from '../engine/FrameAnim';
import { Camera2D } from '../engine/Camera2D';
import { RunState } from '../game/RunState';
import { calcSkill, type SkillRuntime } from '../game/SkillCalc';
import { spawnPlan, spawnPointAround, waveScale, rollDamage, playerTakenDamage } from '../game/Combat';
import { SKILLS, SKILL_ART, FX } from '../data/Skills';
import type { SkillArt } from '../data/Types';
import { ENEMIES, bossUnitFor } from '../data/Enemies';
import { CHARS } from '../data/Chars';
const { ccclass } = _decorator;

// ---------- 实体 ----------
interface Enemy {
  node: Node; anim: FrameAnim; unit: string;
  x: number; y: number; hp: number; maxhp: number;
  spd: number; dmg: number; r: number; exp: number; gold: number;
  dead: boolean; deathT: number; animT: number; walkT: number; atkT: number;
  facing: number; flash: number; kx: number; ky: number; slow: number; spawnT: number;
  boss: boolean; elite: boolean;
}
interface Bullet {
  node: Node; anim: FrameAnim;
  x: number; y: number; vx: number; vy: number; r: number; dmg: number;
  pierce: number; bounce: number; chain: number; split: number; life: number; t: number;
  hitVfx: string; hit: Set<Enemy>; homing: boolean;
}
interface Area {
  node: Node; anim: FrameAnim; x: number; y: number; r: number; maxR: number;
  dmg: number; life: number; t: number; tick: number; tickRate: number;
  kind: 'pulse' | 'zone'; done: boolean;
}
interface Gem { node: Node; x: number; y: number; v: number; pop: number; vx: number; vy: number; }
interface Fx { node: Node; anim: FrameAnim; t: number; life: number; }

@ccclass('Battle')
export class Battle extends Component {
  // 节点树
  world: Node = null!;
  private layerArea: Node = null!;
  private layerUnit: Node = null!;
  private layerBullet: Node = null!;
  private layerFx: Node = null!;
  private layerText: Node = null!;
  cam: Camera2D = null!;

  // 状态
  rs: RunState = null!;
  private playerNode: Node = null!;
  private playerAnim: FrameAnim = null!;
  private playerClips: UnitClips = {};
  private px = ARENA_W / 2; private py = ARENA_H / 2;
  private face = 1;
  private atkT = 0; private animT = 0; private walkT = 0; private inv = 0; private dmgFlash = 0;
  private skillT: number[] = [0, 0, 0, 0];

  private enemies: Enemy[] = [];
  private bullets: Bullet[] = [];
  private areas: Area[] = [];
  private gems: Gem[] = [];
  private fx: Fx[] = [];

  private spawnAcc = 0;

  /** 生成点：把"当前真实可视尺寸"传给纯逻辑层（相机缩放会随屏幕变） */
  private spawnPt() {
    return spawnPointAround(this.rs.rng, this.px, this.py, ARENA_W, ARENA_H,
      this.cam ? this.cam.viewW : 180, this.cam ? this.cam.viewH : 320);
  }
  private waveLeft = 0;
  private elitesSpawned = 0;
  private bossRef: Enemy | null = null;
  private bossDefeated = false;
  private hitstop = 0;
  private running = false;

  /** 输入方向（-1..1），由 Joystick 或键盘写入 */
  inputX = 0; inputY = 0;

  /** 暂停（开商店/升级弹窗时置 true，战斗逻辑整个停住） */
  paused = false;
  /** 当前是否 BOSS 波 */
  bossAlive: Enemy | null = null;

  /** 流程钩子：Battle 只负责"打"，什么时候弹什么屏由 GameRoot 决定 */
  hooks: {
    onWaveCleared?: () => void;
    onLevelUp?: (cards: import('../game/RunState').Reward[]) => void;
    onDead?: () => void;
    onClear?: () => void;
  } = {};

  // ---------- 启动 ----------
  async start() {
    this.buildTree();
    this.refreshDebug();
  }

  /** 开一局（角色选择屏点"开始闯关"时调用） */
  async startRun(charId: string, seed: number) {
    const charDef = CHARS.find(c => c.id === charId) ?? CHARS[0];
    this.rs = new RunState(charDef.id, seed);
    // 预载：玩家单位 + 初始技能的投射物/命中特效
    this.playerClips = await Assets.loadUnit(charDef.unit);
    const vfxKeys = new Set<string>([FX.killSmall, FX.killBig, FX.spawnWarn, FX.crit]);
    for (const k of Object.keys(SKILL_ART)) { const a = SKILL_ART[k]; if (a.proj) vfxKeys.add(a.proj); if (a.hit) vfxKeys.add(a.hit); }
    for (const k of vfxKeys) await Assets.loadVfx(k);

    this.createPlayer(charDef.unit);
    await this.startWave(1);
    this.running = true;
    this.paused = false;
  }

  /** 屏上调试行：素材加载统计（确认资源路径是否正确最直观的方式） */
  private debugLabel: Label | null = null;
  private refreshDebug() {
    const n = new Node('debug'); n.parent = this.node;
    const l = n.addComponent(Label);
    l.fontSize = 13; l.lineHeight = 16;
    l.color = new Color(180, 220, 255);
    const ut = n.addComponent(UITransform); ut.setContentSize(340, 60);
    n.setPosition(0, -260, 0);
    this.debugLabel = l;
    this.updateDebug();
  }
  private updateDebug() {
    if (!this.debugLabel) return;
    const vs = view.getVisibleSize();
    const s = this.cam ? this.cam.worldScale : ZOOM;
    this.debugLabel.string =
      `自适应 x${s.toFixed(2)}（原型 x2）· 单位 ${(32 * s).toFixed(0)}px = 屏高 ${(32 * s / vs.height * 100).toFixed(1)}%（原型 10%）` +
      ` · 可视世界 ${Math.round(vs.width / s)}x${Math.round(vs.height / s)}（原型 180x320）` +
      ` · 素材 ${Assets.stats().loaded}/失败 ${Assets.stats().failed} · 敌 ${this.enemies.length} · 波 ${this.rs.wave}`;
  }

  private buildTree() {
    this.world = new Node('World');
    this.world.parent = this.node;
    this.cam = this.world.addComponent(Camera2D);

    const mk = (n: string) => { const x = new Node(n); x.parent = this.world; return x; };

    // 竞技场底色：Graphics 画纯色，不引入任何素材
    // 地面：棋盘格（原型就是格子底，比纯色丰富很多。用 Graphics 画，零素材）
    // 地面 —— 逐项照抄 DEMO 的 render.js:drawBg()
    //   底色 #131C36；格子 24px；两色 #17233D / #1A2846（**差异要小**，我之前给大了导致整体偏亮）；
    //   每格左上角 3x3 的 rgba(255,255,255,.022) 高光点；竞技场 2px 橙色半透明边框
    const ground = new Node('Ground');
    ground.parent = this.world;
    const g = ground.addComponent(Graphics);
    const CELL = 24;
    const C_BASE = new Color(0x13, 0x1C, 0x36, 255);
    const C_ODD = new Color(0x17, 0x23, 0x3D, 255);
    const C_EVEN = new Color(0x1A, 0x28, 0x46, 255);
    const C_DOT = new Color(255, 255, 255, 6);          // .022 * 255 ≈ 6

    g.fillColor = C_BASE;
    g.rect(0, -ARENA_H, ARENA_W, ARENA_H);
    g.fill();

    const NX = Math.ceil(ARENA_W / CELL), NY = Math.ceil(ARENA_H / CELL);
    for (let yy = 0; yy < NY; yy++) {
      for (let xx = 0; xx < NX; xx++) {
        const odd = ((xx + yy) % 2) === 0;
        // 世界 y 向下 → 节点本地 y 向上：格子底部 = -(yy+1)*CELL
        const lx = xx * CELL, ly = -(yy + 1) * CELL;
        g.fillColor = odd ? C_ODD : C_EVEN;
        g.rect(lx, ly, CELL + 0.5, CELL + 0.5);
      }
    }
    g.fill();
    for (let yy = 0; yy < NY; yy++) {
      for (let xx = 0; xx < NX; xx++) {
        if (((xx + yy) % 2) !== 0) continue;
        g.fillColor = C_DOT;
        g.rect(xx * CELL + 3, -(yy + 1) * CELL + 3, 3, 3);
      }
    }
    g.fill();
    // 竞技场边框：橙色半透明 2px（DEMO 是 strokeRect(0,0,ARENA.W,ARENA.H)）
    g.lineWidth = 2;
    g.strokeColor = new Color(255, 168, 75, 90);        // .35 * 255 ≈ 90
    g.rect(0, -ARENA_H, ARENA_W, ARENA_H);
    g.stroke();
    ground.setPosition(0, ARENA_H, 0);

    this.layerArea = mk('Area');
    this.layerUnit = mk('Unit');
    this.layerBullet = mk('Bullet');
    this.layerFx = mk('Fx');
    this.layerText = mk('Text');
  }

  // ---------- 坐标与节点工具 ----------
  /** 世界坐标(y 向下) -> World 节点本地坐标(y 向上)，并把"脚底"对齐：精灵在节点上方 8 单位处 */
  private place(node: Node, wx: number, wy: number, footOffset = 8) {
    node.setPosition(wx, ARENA_H - wy + footOffset, 0);
  }
  /** 屏幕坐标 -> World 本地坐标（摇杆等 UI 用） */
  private screenToWorld(sx: number, sy: number): { x: number; y: number } {
    const cx = this.cam ? this.cam.viewLeft : 0;
    const cy = this.cam ? this.cam.viewTop : 0;
    return { x: cx + sx / ZOOM, y: cy + sy / ZOOM };
  }
  private mkSpriteNode(name: string, parent: Node, w = 32, h = 32, fallbackColor?: Color, withShadow = false): { node: Node; anim: FrameAnim } {
    const node = new Node(name);
    node.parent = parent;
    const sp = node.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    sp.trim = false;
    // 兜底：素材还没加载出来时先显示纯色块 —— 绝不"静默变透明"
    if (fallbackColor) sp.spriteFrame = makeSolidFrame(fallbackColor.r, fallbackColor.g, fallbackColor.b);
    // ⚠️ 顺序很重要：contentSize 必须在 addComponent(Sprite) **之后**设。
    //    Sprite 初始化时会按当时的 spriteFrame（当时可能为空）重置 contentSize，
    //    先设会被覆盖成 0x0 —— 结果就是"精灵什么都看不见"（Graphics 和 Label 不受影响，所以症状很迷惑）。
    const ut = node.getComponent(UITransform) ?? node.addComponent(UITransform);
    ut.setContentSize(w, h);
    const anim = node.addComponent(FrameAnim);
    if (withShadow) {
      // 脚下软阴影：全场景共用一张运行时生成的椭圆贴图（零素材）
      const sh = new Node('shadow');
      sh.parent = node;
      const sut = sh.addComponent(UITransform);
      sut.setContentSize(w * 1.05, w * 0.42);
      const ss = sh.addComponent(Sprite);
      ss.spriteFrame = shadowFrame();
      ss.sizeMode = Sprite.SizeMode.CUSTOM;
      ss.trim = false;
      sh.setPosition(0, -h / 2 + 2, 0);
      sh.setSiblingIndex(0);          // 垫在精灵下面
    }
    return { node, anim };
  }
  private addVfx(key: string, x: number, y: number, life: number, scale = 1): Fx | null {
    const frames = Assets.vfxFrames(key);
    if (!frames || !frames.length) return null;
    const { node, anim } = this.mkSpriteNode('fx:' + key, this.layerFx,
      32 * scale, 32 * scale);
    anim.setClips({ play: frames });
    anim.play('play', false);
    node.setPosition(x, ARENA_H - y, 0);
    const f: Fx = { node, anim, t: 0, life };
    this.fx.push(f);
    return f;
  }

  // ============================================================
  //  实体
  // ============================================================
  private createPlayer(unit: string) {
    const { node, anim } = this.mkSpriteNode('player:' + unit, this.layerUnit, 32, 32, new Color(255, 168, 75), true);
    anim.setClips(this.playerClips);
    this.playerNode = node;
    this.playerAnim = anim;
    this.place(node, this.px, this.py);
    this.cam.target = node;

    // 脚下定位环：怪潮里一眼找到自己（Graphics 画，无需素材）
    const ring = new Node('ring');
    ring.parent = node;
    const g = ring.addComponent(Graphics);
    g.lineWidth = 2;
    g.strokeColor = new Color(255, 168, 75, 220);
    g.ellipse(0, -8, 19, 8);
    g.stroke();
    ring.setPosition(0, 0, 0);
  }

  private async startWave(n: number) {
    this.rs.wave = n;
    this.spawnAcc = 0;
    this.elitesSpawned = 0;
    this.bossRef = null;
    this.waveLeft = isBossWave(n) ? 0 : waveTime(n);
    this.px = ARENA_W / 2; this.py = ARENA_H / 2;
    this.place(this.playerNode, this.px, this.py);
    this.inv = 1.4;

    // 开场先铺几只（否则开局几秒屏幕是空的，没有"怪潮"感）
    if (!isBossWave(n)) {
      const pool0 = this.rs.spawnPool;
      if (pool0.length) {
        const open = Math.min(12, 5 + Math.floor(n / 2));   // 开场铺怪（6 只在第1波太多，改成 5）
        for (let i = 0; i < open; i++) {
          const p = this.spawnPt();
          this.spawnEnemy(this.rs.rng.pick(pool0), p.x, p.y);
        }
        this.spawnAcc = -0.9;   // 稍等再进常规节奏
      }
    }
    if (isBossWave(n)) {
      this.spawnEnemy('boss', this.px + 150, this.py - 110,
        1 + 0.35 * Math.floor(n / RUN.bossEvery - 1), bossUnitFor(n));
      this.bossRef = this.enemies[this.enemies.length - 1] ?? null;
      this.bossAlive = this.bossRef;
      this.cam.addShake(SHAKE.boss);
      this.addVfx(FX.killBig, this.px + 150, this.py - 110, 0.9, 2);
    }
  }

  private spawnEnemy(kind: string, wx: number, wy: number, scale = 1, unitOverride?: string) {
    const def = ENEMIES[kind];
    if (!def) { console.warn('[Battle] 未知敌人：' + kind); return; }
    const ws = waveScale(this.rs.wave);
    const hp = Math.round(def.hp * ws.hp * scale);
    const unit = unitOverride ?? def.unit;
    // 尺寸交给 FrameAnim.autoSize（按帧原生像素），这里只给兜底色块尺寸
    const { node, anim } = this.mkSpriteNode('enemy:' + unit, this.layerUnit, 32, 32, new Color(224, 64, 96), true);
    this.place(node, wx, wy);
    const e: Enemy = {
      node, anim, unit, x: wx, y: wy,
      hp, maxhp: hp, spd: def.spd, dmg: Math.round(def.dmg * ws.dmg),
      r: def.r, exp: def.exp, gold: def.gold,
      dead: false, deathT: 0, animT: 0, walkT: 0, atkT: 0,
      facing: 1, flash: 0, kx: 0, ky: 0, slow: 0, spawnT: 0.9,
      boss: !!def.boss, elite: !!def.elite,
    };
    this.enemies.push(e);
    void Assets.loadUnit(unit).then((clips) => { if (e.node.isValid) e.anim.setClips(clips); });
    this.addVfx(FX.spawnWarn, wx, wy, 0.5, 1.6);
  }

  private fireSkill(slot: number, rt: SkillRuntime) {
    const sk = this.rs.skills[slot];
    const def = SKILLS[sk.id];
    const art: SkillArt = (SKILL_ART as Record<string, SkillArt>)[sk.id] || ({} as SkillArt);
    const tgt = this.nearestEnemy(this.px, this.py, TARGET_RANGE);
    const dir = tgt ? Math.atan2(tgt.y - this.py, tgt.x - this.px) : 0;

    if (def.type === 'projectile' || def.type === 'chain') {
      if (def.type === 'chain') {
        if (!tgt) return;
        let cur = tgt; const hit = new Set<Enemy>([cur]);
        this.hitEnemy(cur, rt.dmg, rt, art.hit);
        for (let j = 0; j < 2 + rt.bounce; j++) {
          const nx = this.nearestEnemy(cur.x, cur.y, 140, hit);
          if (!nx) break;
          hit.add(nx); this.hitEnemy(nx, rt.dmg * 0.85, rt, art.hit); cur = nx;
          void Assets.loadVfx('chain/chain-node').then(() => this.addVfx('chain/chain-node', cur.x, cur.y, 0.3, 1));
        }
        return;
      }
      for (let i = 0; i < rt.count; i++) {
        const spread = rt.fan > 0 ? 0.16 * rt.fan : 0.06;
        const a = dir + (rt.count > 1 ? (i - (rt.count - 1) / 2) * spread : 0);
        this.spawnBullet(this.px, this.py, Math.cos(a) * rt.spd, Math.sin(a) * rt.spd,
          rt, art.proj, art.hit, def.tags.includes('homing'));
      }
      for (let i = 0; i < rt.orbit; i++) {
        this.spawnBullet(this.px, this.py, 0, 0, { ...rt, dmg: rt.dmg * 0.8 }, art.proj, art.hit, false, true);
      }
    } else if (def.type === 'pulse') {
      this.spawnArea(this.px, this.py, rt.size + 26, rt.dmg, 0.32, 'pulse', art.aoe, rt);
    } else if (def.type === 'area') {
      const ax = tgt ? tgt.x : this.px, ay = tgt ? tgt.y : this.py;
      this.spawnArea(ax, ay, rt.size, rt.dmg, 3.4, 'zone', art.zone ?? art.aoe, rt);
    }
    // summon 暂未实现（守卫图腾），留到下一个里程碑
  }

  private spawnBullet(x: number, y: number, vx: number, vy: number, rt: SkillRuntime,
                      vfxKey: string | undefined, hitVfx: string | undefined,
                      homing: boolean, orbit = false) {
    const key = vfxKey ?? FX.killSmall;
    const frames = Assets.vfxFrames(key);
    const sc = Math.max(1, Math.round(rt.size / 5));
    const { node, anim } = this.mkSpriteNode('bullet', this.layerBullet, 32 * sc, 32 * sc, new Color(255, 209, 102));
    anim.autoSize = false;   // 子弹按技能 size 缩放，不跟随帧原生尺寸
    if (frames.length) { anim.setClips({ play: frames }); anim.play('play', true); }
    node.setPosition(x, ARENA_H - y, 0);
    this.bullets.push({
      node, anim, x, y, vx, vy, r: Math.max(4, rt.size),
      dmg: rt.dmg, pierce: rt.pierce, bounce: rt.bounce, chain: rt.chain, split: rt.split,
      life: orbit ? 3.2 : 1.6, t: 0, hitVfx: hitVfx ?? 'core/spark/hit-spark',
      hit: new Set(), homing,
    });
  }

  private spawnArea(x: number, y: number, r: number, dmg: number, life: number,
                    kind: 'pulse' | 'zone', vfxKey: string | undefined, _rt: SkillRuntime) {
    const frames = vfxKey ? Assets.vfxFrames(vfxKey) : [];
    const { node, anim } = this.mkSpriteNode('area', this.layerArea, r * 2, r * 2);
    if (frames.length) { anim.setClips({ play: frames }); anim.play('play', true); }
    node.setPosition(x, ARENA_H - y, 0);
    this.areas.push({
      node, anim, x, y, r: kind === 'pulse' ? 0 : r, maxR: r, dmg,
      life, t: 0, tick: 0, tickRate: 0.45, kind, done: false,
    });
  }

  private nearestEnemy(x: number, y: number, maxD: number, exclude?: Set<Enemy>): Enemy | null {
    let best: Enemy | null = null, bd = maxD * maxD;
    for (const e of this.enemies) {
      if (e.dead || (exclude && exclude.has(e))) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bd) { bd = d; best = e; }
    }
    return best;
  }

  /** 一次伤害结算（走 Combat.rollDamage，暴击也吃同一个 Rng） */
  private hitEnemy(e: Enemy, base: number, rt: SkillRuntime, hitVfx?: string) {
    if (e.dead) return;
    const { dmg, crit } = rollDamage(base, this.rs.stats, this.rs.rng);
    e.hp -= dmg;
    e.flash = 0.12;
    this.addDamageText(e.x, e.y - 10, dmg, crit);
    if (crit) this.addVfx(FX.crit, e.x, e.y, 0.5, 1);
    if (hitVfx) this.addVfx(hitVfx, e.x, e.y, 0.45, 1);
    if (rt.burn) e.hp -= Math.max(1, Math.round(dmg * 0.12));      // 灼烧：简化为附加一次伤害
    if (rt.slow) e.slow = 1.2;
    if (rt.vamp) this.rs.stats.hp = Math.min(this.rs.stats.maxhp, this.rs.stats.hp + dmg * 0.06);
    if (rt.thunder > 0 && this.rs.rng.chance(0.15 * rt.thunder)) this.addVfx('feedback/hit/shock-hit', e.x, e.y, 0.4, 1.4);
    // 击退
    if (!e.boss) {
      const a = Math.atan2(e.y - this.py, e.x - this.px);
      e.kx += Math.cos(a) * 26; e.ky += Math.sin(a) * 26;
    }
    if (e.hp <= 0) this.killEnemy(e, rt);
  }

  /**
   * 击杀。
   * ⚠️ KI-001 教训：死亡后**先累加 deathT**，再跳过其它逻辑，否则实体永远回收不掉。
   *    见 docs/known-issues.md
   */
  private killEnemy(e: Enemy, rt?: SkillRuntime) {
    if (e.dead) return;
    e.dead = true; e.deathT = 0;
    this.rs.addKill(e.exp, e.gold);
    this.hitstop = Math.max(this.hitstop, e.boss ? HITSTOP.boss : (e.elite ? HITSTOP.elite : HITSTOP.normal));
    this.cam.addShake(e.boss ? SHAKE.boss : (e.elite ? SHAKE.elite : SHAKE.kill));
    this.addVfx(e.boss || e.elite ? FX.killBig : FX.killSmall, e.x, e.y, e.boss ? 0.9 : 0.5, e.boss || e.elite ? 2 : 1);
    if (rt && rt.harvest) this.rs.stats.hp = Math.min(this.rs.stats.maxhp, this.rs.stats.hp + 1);
    const g = new Node('gem'); g.parent = this.layerUnit;
    const ut = g.addComponent(UITransform); ut.setContentSize(8, 8);
    const sp = g.addComponent(Sprite); sp.sizeMode = Sprite.SizeMode.CUSTOM;
    const gg = g.addComponent(Graphics);
    gg.fillColor = new Color(255, 209, 102, 255); gg.circle(0, 0, 4); gg.fill();
    g.setPosition(e.x, ARENA_H - e.y, 0);
    const a = this.rs.rng.range(0, Math.PI * 2);
    this.gems.push({ node: g, x: e.x, y: e.y, v: e.exp, pop: 0.22,
      vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 });
  }

  private addDamageText(x: number, y: number, dmg: number, crit: boolean) {
    const n = new Node('dmg'); n.parent = this.layerText;
    const l = n.addComponent(Label);
    l.string = String(dmg);
    l.fontSize = crit ? 22 : 16;
    l.lineHeight = crit ? 24 : 18;
    l.color = crit ? new Color(255, 209, 102) : new Color(255, 255, 255);
    const ut = n.addComponent(UITransform); ut.setContentSize(60, 24);
    n.setPosition(x, ARENA_H - y, 0);
    this.fx.push({ node: n, anim: null as unknown as FrameAnim, t: 0, life: 0.75 });
  }

  // ============================================================
  //  主循环
  // ============================================================
  update(dtRaw: number) {
    if (!this.running || !this.rs || this.paused) return;
    let dt = dtRaw;
    if (this.hitstop > 0) { dt = dtRaw * HITSTOP_SCALE; this.hitstop = Math.max(0, this.hitstop - dtRaw); }

    this.rs.runTime += dtRaw;
    this.updatePlayer(dt);
    this.updateSkills(dt);
    this.updateSpawn(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateAreas(dt);
    this.updateGems(dt);
    this.updateFx(dtRaw);
    this.checkWaveEnd(dt);
    this.updateDebug();
  }

  private updatePlayer(dt: number) {
    const st = this.rs.stats;
    const dx = this.inputX, dy = this.inputY;
    const len = Math.hypot(dx, dy);
    if (len > 0.01) {
      const n = Math.min(1, len);
      this.px += (dx / len) * st.speed * n * dt;
      this.py += (dy / len) * st.speed * n * dt;
      if (Math.abs(dx) > 0.15) this.face = dx > 0 ? 1 : -1;
      this.walkT += dt;
      if (this.atkT > 0) this.playerAnim.playOnce('attack'); else this.playerAnim.play('walk');
    } else {
      this.walkT = 0;
      if (this.atkT > 0) this.playerAnim.playOnce('attack'); else this.playerAnim.play('idle');
    }
    this.px = Math.max(12, Math.min(ARENA_W - 12, this.px));
    this.py = Math.max(12, Math.min(ARENA_H - 12, this.py));
    this.animT += dt;
    if (this.atkT > 0) this.atkT -= dt;
    if (this.inv > 0) this.inv -= dt;
    this.place(this.playerNode, this.px, this.py);
    const s = this.playerNode.scale;
    this.playerNode.setScale(this.face < 0 ? -Math.abs(s.x) : Math.abs(s.x), s.y, 1);
    if (st.regen > 0) st.hp = Math.min(st.maxhp, st.hp + st.regen * dt);
  }

  private updateSkills(dt: number) {
    for (let i = 0; i < this.rs.skills.length && i < 4; i++) {
      this.skillT[i] -= dt;
      if (this.skillT[i] > 0) continue;
      const rt = calcSkill(this.rs.skills[i], this.rs.stats);
      this.skillT[i] = rt.cd;
      this.atkT = 0.3;
      this.fireSkill(i, rt);
    }
  }

  private updateSpawn(dt: number) {
    if (this.bossRef && !this.bossRef.dead) return;
    const plan = spawnPlan(this.rs.wave);
    this.spawnAcc += dt;
    if (this.spawnAcc < plan.interval) return;
    this.spawnAcc = 0;
    const pool = this.rs.spawnPool;
    if (!pool.length) return;
    for (let i = 0; i < plan.batch; i++) {
      const p = this.spawnPt();
      this.spawnEnemy(this.rs.rng.pick(pool), p.x, p.y);
    }
    if (this.rs.wave > 1 && this.waveLeft > 0) {
      const prog = 1 - this.waveLeft / waveTime(this.rs.wave);
      if (prog > 0.3 && this.elitesSpawned < this.rs.elitesThisWave) {
        this.elitesSpawned++;
        const p = this.spawnPt();
        this.spawnEnemy('gnollberserker', p.x, p.y, 1 + 0.2 * this.rs.wave);
        this.cam.addShake(SHAKE.elite);
      }
    }
  }

  private updateEnemies(dt: number) {
    for (const e of this.enemies) {
      // ⚠️ KI-001：死亡单位必须先累加 deathT 再跳过，否则实体永远回收不掉
      if (e.dead) { e.deathT += dt; continue; }
      e.animT += dt;
      if (e.spawnT > 0) e.spawnT -= dt;
      if (e.atkT > 0) e.atkT -= dt;
      if (e.flash > 0) e.flash -= dt;
      if (e.slow > 0) e.slow -= dt;

      const spdMul = e.slow > 0 ? 0.65 : 1;
      const a = Math.atan2(this.py - e.y, this.px - e.x);
      e.x += Math.cos(a) * e.spd * spdMul * dt;
      e.y += Math.sin(a) * e.spd * spdMul * dt;
      e.x += e.kx * dt * 4; e.y += e.ky * dt * 4; e.kx *= 0.86; e.ky *= 0.86;
      e.walkT += dt;
      if (Math.abs(Math.cos(a)) > 0.15) e.facing = Math.cos(a) > 0 ? 1 : -1;
      this.place(e.node, e.x, e.y);
      const s = e.node.scale;
      e.node.setScale(e.facing < 0 ? -Math.abs(s.x) : Math.abs(s.x), s.y, 1);
      // 受击闪白：直接改 Sprite.color（乘算），比换贴图便宜
      const sp = e.node.getComponent(Sprite);
      if (sp) {
        if (e.flash > 0) sp.color = new Color(255, 150, 150, 255);
        else if (sp.color.r !== 255 || sp.color.g !== 255) sp.color = new Color(255, 255, 255, 255);
      }

      const d = Math.hypot(this.px - e.x, this.py - e.y);
      if (d < e.r + 12 && this.inv <= 0) {
        const dm = playerTakenDamage(e.dmg, this.rs.stats);
        this.rs.stats.hp -= dm;
        // 受击无敌帧 0.55 -> 0.80（2026-10-13 实测标定）
        // 原来 0.55s 把承伤封顶在 ~11 伤害/秒，120 血只够撑 11 秒，而一波 18 秒 ——
        // 密度一提上来就必死。放宽到 0.80 秒后封顶 ~7.5/秒，才留得出走位空间。
        this.inv = 0.80; this.dmgFlash = 1;
        e.atkT = 0.34;
        this.cam.addShake(SHAKE.hurt);
        if (this.rs.stats.hp <= 0 && this.running) { this.running = false; this.paused = true; console.log('[Battle] 玩家阵亡'); this.hooks.onDead?.(); }
      }
    }
  }

  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      b.t += dt; b.life -= dt;
      if (b.vx === 0 && b.vy === 0) {
        const ang = b.t * 3.0;
        b.x = this.px + Math.cos(ang) * 44;
        b.y = this.py + Math.sin(ang) * 44;
      } else {
        if (b.homing) {
          const t0 = this.nearestEnemy(b.x, b.y, 200);
          if (t0) {
            const sp = Math.hypot(b.vx, b.vy) || 200;
            const want = Math.atan2(t0.y - b.y, t0.x - b.x);
            const cur = Math.atan2(b.vy, b.vx);
            let dd = want - cur;
            while (dd > Math.PI) dd -= Math.PI * 2;
            while (dd < -Math.PI) dd += Math.PI * 2;
            const na = cur + Math.max(-2.6 * dt, Math.min(2.6 * dt, dd));
            b.vx = Math.cos(na) * sp; b.vy = Math.sin(na) * sp;
          }
        }
        b.x += b.vx * dt; b.y += b.vy * dt;
      }
      b.node.setPosition(b.x, ARENA_H - b.y, 0);
      b.node.angle = -Math.atan2(b.vy, b.vx) * 180 / Math.PI - 90;

      for (const e of this.enemies) {
        if (e.dead || b.hit.has(e)) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
          b.hit.add(e);
          this.hitEnemy(e, b.dmg, this.bulletRt(b), b.hitVfx);
          if (b.hit.size > b.pierce + 1) { b.life = 0; break; }
        }
      }
      if (b.x < -40 || b.x > ARENA_W + 40 || b.y < -40 || b.y > ARENA_H + 40) b.life = 0;
    }
    this.bullets = this.bullets.filter(b => {
      if (b.life > 0) return true;
      if (b.node && b.node.isValid) b.node.destroy();
      return false;
    });
  }

  private bulletRt(b: Bullet): SkillRuntime {
    return { cd: 0, dmg: b.dmg, spd: 0, size: b.r, count: 1, fan: 0, pierce: b.pierce,
      bounce: b.bounce, orbit: 0, split: b.split, chain: b.chain,
      echo: 0, burn: 0, slow: 0, vamp: 0, thunder: 0, thornmail: 0, harvest: false };
  }

  private updateAreas(dt: number) {
    for (const a of this.areas) {
      a.t += dt;
      if (a.kind === 'pulse') {
        a.r = a.maxR * Math.min(1, a.t / a.life);
        if (!a.done) {
          for (const e of this.enemies) {
            if (!e.dead && Math.hypot(e.x - a.x, e.y - a.y) < a.r + e.r) this.hitEnemy(e, a.dmg, this.bulletRt2(a.dmg));
          }
          a.done = true;
        }
      } else {
        a.tick -= dt;
        if (a.tick <= 0) {
          a.tick = a.tickRate;
          for (const e of this.enemies) {
            if (!e.dead && Math.hypot(e.x - a.x, e.y - a.y) < a.r + e.r) this.hitEnemy(e, a.dmg, this.bulletRt2(a.dmg));
          }
        }
      }
      a.node.setPosition(a.x, ARENA_H - a.y, 0);
    }
    this.areas = this.areas.filter(a => {
      if (a.t < a.life) return true;
      if (a.node && a.node.isValid) a.node.destroy();
      return false;
    });
  }

  private bulletRt2(dmg: number): SkillRuntime {
    return { cd: 0, dmg, spd: 0, size: 0, count: 1, fan: 0, pierce: 0, bounce: 0, orbit: 0,
      split: 0, chain: 0, echo: 0, burn: 0, slow: 0, vamp: 0, thunder: 0, thornmail: 0, harvest: false };
  }

  private updateGems(dt: number) {
    const st = this.rs.stats;
    for (const g of this.gems) {
      if (!g.node || !g.node.isValid) continue;
      if (g.pop > 0) { g.x += g.vx * dt; g.y += g.vy * dt; g.vx *= 0.88; g.vy *= 0.88; g.pop -= dt; }
      const dx = this.px - g.x, dy = this.py - g.y;
      const d = Math.hypot(dx, dy) || 0.01;
      if (d < st.pickup) {
        const pull = 1 - d / st.pickup;
        const sp = (170 + 430 * pull) * dt;
        g.x += dx / d * sp; g.y += dy / d * sp;
      }
      if (d < 17) {
        g.node.destroy();
        const ups = this.rs.addExp(g.v);
        if (ups > 0) this.onLevelUp(ups);
      } else {
        g.node.setPosition(g.x, ARENA_H - g.y, 0);
      }
    }
    this.gems = this.gems.filter(g => g.node && g.node.isValid);
  }

  private updateFx(dt: number) {
    for (const f of this.fx) {
      f.t += dt;
      if (f.node && f.node.isValid) f.node.setPosition(f.node.position.x, f.node.position.y + dt * 24, 0);
    }
    this.fx = this.fx.filter(f => {
      if (f.t < f.life) return true;
      if (f.node && f.node.isValid) f.node.destroy();
      return false;
    });

    // 死亡动画播完即回收（KI-001 的正面要求：先累加计时，再回收）
    this.enemies = this.enemies.filter(e => {
      if (!e.dead || e.deathT < DEATH_ANIM_TIME) return true;
      if (e.node && e.node.isValid) e.node.destroy();
      if (e === this.bossRef) { this.bossRef = null; this.bossAlive = null; this.bossDefeated = true; }
      return false;
    });
  }

  private checkWaveEnd(dt: number) {
    // BOSS 波没有倒计时，靠击杀推进（bossDefeated 在回收 BOSS 节点时置位）
    if (this.bossDefeated) { this.bossDefeated = false; this.advanceWave(); return; }
    if (this.waveLeft <= 0) return;
    this.waveLeft -= dt;
    if (this.waveLeft > 0) return;
    for (const e of this.enemies) { if (!e.dead) this.killEnemy(e); }
    const gain = this.rs.waveClearGold();
    console.log(`[Battle] 第 ${this.rs.wave} 波通过  +${gain} 金币  总计 ${this.rs.gold}  Lv${this.rs.lv}`);
    this.paused = true;
    this.hooks.onWaveCleared?.();
  }

  /** 由 GameRoot 在商店点"下一波"时调用 */
  advanceWave() {
    const next = this.rs.wave + 1;
    if (next > RUN.waves && !this.rs.endless) { this.running = false; this.hooks.onClear?.(); return; }
    console.log('[Battle] 进入第 ' + next + ' 波');
    this.paused = false;
    void this.startWave(next);
  }

  private onLevelUp(_ups: number) {
    // 交给 UI：暂停战斗 + 弹 3 选 1；选完由 GameRoot 调 resumeFromModal()
    this.pendingUps = _ups;
    this.paused = true;
    this.hooks.onLevelUp?.(this.rs.rollRewards());
  }

  private pendingUps = 0;
  /** UI 选完卡后调用；若还有未消化的升级，继续弹 */
  resumeFromModal() {
    this.pendingUps--;
    if (this.pendingUps > 0) {
      this.hooks.onLevelUp?.(this.rs.rollRewards());
      return;
    }
    this.pendingUps = 0;
    this.paused = false;
  }
  /** UI 直接取当前待选卡（重开弹窗时用） */
  peekCards() { return this.rs.rollRewards(); }

  // ---------- 给 HUD 的查询接口 ----------
  get waveLeftSec(): number { return Math.max(0, this.waveLeft); }
  /** 每个技能槽的冷却进度 0~1（1 = 刚放完，0 = 就绪） */
  get skillCdPct(): number[] {
    return [0, 1, 2, 3].map(i => {
      const sk = this.rs.skills[i];
      if (!sk) return 0;
      const cd = calcSkill(sk, this.rs.stats).cd;
      return cd > 0 ? Math.max(0, Math.min(1, this.skillT[i] / cd)) : 0;
    });
  }
}
