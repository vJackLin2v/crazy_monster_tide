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
import { _decorator, Component, Node, Sprite, UITransform, Color, Graphics, Label, view, UIOpacity } from 'cc';
import { ZOOM, ARENA_W, ARENA_H, SCREEN_W, SCREEN_H, HITSTOP, HITSTOP_SCALE, SHAKE, DEATH_ANIM_TIME,
         TARGET_RANGE, RUN, waveTime, isBossWave } from '../core/Const';
import { Assets, makeSolidFrame, shadowFrame, type UnitClips } from '../engine/Assets';
import { Sfx } from '../engine/Audio';
import { FrameAnim } from '../engine/FrameAnim';
import { Camera2D } from '../engine/Camera2D';
import { RunState } from '../game/RunState';
import { calcSkill, type SkillRuntime } from '../game/SkillCalc';
import { spawnPlan, spawnPointAround, waveScale, rollDamage, playerTakenDamage, aliveCaps } from '../game/Combat';
import { balance } from '../core/Balance';
import { telemetryWaveStart, telemetryWaveEnd } from '../game/Telemetry';
import { splitBullets, echoRepeats, echoDelay, burnDuration, burnTickMul, frostSlowPct, frostDuration, slowFor } from '../game/ModuleScale';
import { SKILLS, SKILL_ART, FX } from '../data/Skills';
import type { SkillArt } from '../data/Types';
import { ENEMIES, bossUnitFor } from '../data/Enemies';
import { baseOf, modEffect } from '../data/Modules';
import { FxPrefs } from '../game/Prefs';
import { focusedMods, shatterMul, VOLTLOOP_CHANCE, VOLTLOOP_DMG, VOLTLOOP_CD, lastbreathMul, greedPowerBonus, EMBERSTACK_MUL, THORNCOAT_DMG, THORNCOAT_CD } from '../game/SpecialItems';
import { MODULE_HOOKS } from '../data/Modules';
import { difficultyOf, healAmount, healBudget, spawnInterval } from '../data/Difficulties';
import { BossSummonState } from '../game/BossSummon';
import type { DifficultyId } from '../data/Difficulties';
import { DamageContext, DamageSource, makeDamageContext, canVamp, nextCastId, ModuleUsage } from '../game/DamageContext';
import { killblastDamage, killblastRadius, shieldAmount, SHIELD_CAP, SHIELD_COOLDOWN, SHIELD_DURATION, executePct, returnstrikePct, overchargePeriod, overchargeMul, lingeringChance, LINGER_TICKS, LINGER_TICK_DMG, LINGER_MAX_ZONES } from '../game/ModuleValues';
import { CHARS } from '../data/Chars';
const { ccclass } = _decorator;

/**
 * 屏上调试行开关 —— **默认关闭**。
 * 打开后战斗画面底部会显示：自适应倍率 / 单位像素 / 可视世界 / 素材加载统计 / 敌数 / 波次。
 * 只在排查「东西没显示出来」时临时打开（当初 KI-002 就是靠它定位的）。
 */
const DEBUG_HUD = false;

// ---------- 实体 ----------
interface Enemy {
  /** 是否为 BOSS 召唤出来的小怪（噩梦难度） */
  summoned?: boolean;
  /** BOSS 是否已进入狂怒（地狱） */
  enraged?: boolean;
  node: Node; anim: FrameAnim; unit: string;
  x: number; y: number; hp: number; maxhp: number;
  spd: number; dmg: number; r: number; exp: number; gold: number;
  dead: boolean; deathT: number; animT: number; walkT: number; atkT: number;
  facing: number; flash: number; kx: number; ky: number; slow: number; spawnT: number;
  /** 减速比例（冷静模块的份数决定：35~55%） */
  slowPct: number;
  boss: boolean; elite: boolean;
  /** 状态层（M48）：中毒淡绿 / 灼烧淡红，持续期间每 0.5s 掉血 */
  poisonT: number; burnT: number; dotTick: number;
  poisonDmg: number; burnDmg: number;
  /** 视觉缩放（M64）：精英/BOSS 只放大**显示**，不动碰撞半径 r */
  visScale: number;
  /** AI（玩法审计 §8.5/§8.6）：冲锋/BOSS 技能的预警-执行-恢复状态机 */
  aiState: 'idle' | 'tele' | 'dash' | 'rec' | 'slam';
  aiT: number;          // 当前状态剩余时间
  aiCd: number;         // 冷却
  aiDX: number; aiDY: number;   // 锁定的冲锋方向
  aiNext: 'charge' | 'slam';    // BOSS 下一次要放哪招
}
interface Bullet {
  node: Node; anim: FrameAnim;
  x: number; y: number; vx: number; vy: number; r: number; dmg: number;
  pierce: number; bounce: number; chain: number; split: number; life: number; t: number;
  hitVfx: string; hit: Set<Enemy>; homing: boolean;
  /** 触发效果（M48/M49）：子弹要带上技能的各类附加效果，否则命中时丢失 */
  burn?: number; slow?: number; vamp?: number; thunder?: number;
  splitDone?: boolean;
  /** 回旋（回旋刃）：飞出去一段时间后折返，回程可再命中一次 */
  returning?: boolean;
  returned?: boolean;
  /** 本次返程是否已经结算过 M4 返程斩（每次返程只触发一次） */
  returnHit?: boolean;
  outT?: number;
  /** 回程自转角度（让刃"转着回来"） */
  spinAngle?: number;
}
interface Area {
  node: Node; anim: FrameAnim; x: number; y: number; r: number; maxR: number;
  dmg: number; life: number; t: number; tick: number; tickRate: number;
  kind: 'pulse' | 'zone'; done: boolean;
  /** 产生它的技能 id（地刺要按节拍从地里冒刺；毒雾挂中毒） */
  tag?: string;
  /** 灼烧层数（区域技能命中时也要挂灼烧状态） */
  burn?: number;
}
interface Gem { node: Node; x: number; y: number; v: number; pop: number; vx: number; vy: number; base: number; }
interface Fx { node: Node; anim: FrameAnim; t: number; life: number; }
/** 陨石（M45）：从天而降的投射体，落地才结算范围伤害 */
interface Meteor {
  node: Node; fromX: number; fromY: number; toX: number; toY: number;
  t: number; dur: number; size: number; dmg: number; rt: SkillRuntime;
  zoneLife?: number; tickRate?: number;
  zoneKey?: string; trailT: number; done: boolean;
}
@ccclass('Battle')
export class Battle extends Component {
  // 节点树
  world: Node = null!;
  private layerArea: Node = null!;
  private layerUnit: Node = null!;
  private layerBullet: Node = null!;
  /** 玩家单独一层，永远画在所有敌人之上（M66：否则被怪群盖住找不到自己） */
  private layerPlayer: Node = null!;
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
  private meteors: Meteor[] = [];
  /** 复读机（echo）：延迟重放一次施放 */
  private echoQueue: { slot: number; in: number }[] = [];

  /** 闪电线段（连锁闪电用）：画成折线，短暂淡出 */
  private bolts: { node: Node; t: number; life: number }[] = [];

  private spawnAcc = 0;

  // ---- 波次结束过渡（用户要求：不要立刻跳走，先吸干净全场经验再进奖励/商店）----
  private waveEnding = false;      // 正在结算本波（吸收经验中）
  private waveEndT = 0;
  private waveEndPending = false;  // 经验收完了，但还有升级弹窗没处理完
  /** 本波吸取到的经验（升级次数）：等全部吸完再一次性开升级卡（M33 #2） */
  private waveEndUps = 0;
  private waveAbsorbDone = false;
  /** 受击闪屏强度 0~1（Hud 读它做红色边框闪烁） */
  hurtFlash = 0;

  /** 生成点：把"当前真实可视尺寸"传给纯逻辑层（相机缩放会随屏幕变） */
  private spawnPt() {
    return spawnPointAround(this.rs.rng, this.px, this.py, ARENA_W, ARENA_H,
      this.cam ? this.cam.viewW : 180, this.cam ? this.cam.viewH : 320);
  }
  private waveLeft = 0;
  private elitesSpawned = 0;
  /** 铁拳骑士「受击后 2s 攻击力 +20%」剩余时间 */
  private hurtBoostT = 0;
  /** 本局最高同屏活怪（结算页展示，用于判断"怪潮是否失控"） */
  maxAlive = 0;
  /** 本局出现过的敌人种类（图鉴解锁用） */
  seenEnemies = new Set<string>();
  /** 本波玩家受到的伤害（日志用） */
  private waveDmg = 0;          // 本波**玩家承受**的伤害（历史命名，勿混用）
  /** 统一回血预算：吸血 + 击杀回血合计 ≤8HP/s（阶段3 结论：不改就"站桩不死"） */
  private healBudgetSpent = 0;
  private healBudgetSec = 0;

  /** 本局难度 id（由 GameRoot 在 begin 前设置） */
  difficultyId: DifficultyId = 'normal';
  /** 当前施法 id（每次 fireSkill 生成，供 DamageContext 使用） */
  private currentCastId = 'c0';
  /** 每个技能的施法计数（M6 蓄势） */
  private castCount: Record<number, number> = {};
  /** 护盾（M2 残影护盾）与剩余时间 */
  private shield = 0;
  private shieldT = 0;
  /** 模块触发闸门（冷却 / 单次施法上限） */
  private modUsage = new ModuleUsage();
  /** 运行时钟（秒），给模块冷却用 */
  private runTime = 0;
  private voltloopAt = -9;
  /** 荆棘外衣上次反弹时间 */
  private thorncoatAt = -9;

  /** 所有自我回血都走这里：受每秒预算 + 最大生命双重夹取 */
  private healPlayer(amount: number): void {
    if (!(amount > 0)) return;
    const id = this.rs.difficulty;
    const budget = healBudget(id);                       // null = 普通难度，不启用预算
    const hpPct = this.rs.stats.maxhp > 0 ? this.rs.stats.hp / this.rs.stats.maxhp : 1;
    const scaled = healAmount(amount, id, hpPct);        // 基础 x healMul x 条件倍率
    const cap = budget === null ? 5 : Math.min(budget, 5);   // 2026-10-31：全局回血上限再压到 5HP/s
    const allow = Math.max(0, cap - this.healBudgetSpent);
    const heal = Math.min(scaled, allow);
    if (heal <= 0) return;
    if (budget !== null) this.healBudgetSpent += heal;
    this.rs.stats.hp = Math.min(this.rs.stats.maxhp, this.rs.stats.hp + heal);
  }
  private waveDmgDealt = 0;     // 本波**玩家造成**的伤害（新增，供阶段2 A/B 与遥测用）
  /** 调试用时间倍速（1 = 正常）；真机/正式包保持 1 */
  timeScale = 1;
  private totalDmg = 0;

  /** 本局玩家累计受到的伤害（结算/日志用） */
  totalDmgTaken(): number { return this.totalDmg; }
  /** 本波最高同屏（日志用） */
  private waveAliveMax = 0;
  private bossRef: Enemy | null = null;
  /** 噩梦 BOSS 召唤状态机 */
  private bossSummon: BossSummonState | null = null;
  /** 环刃状态（按技能槽） */
  private orbits: Record<number, { n: number; radius: number; dmg: number; rot: number; tick: number; rt: SkillRuntime }> = {};
  /** 地雷（同屏上限 4） */
  private traps: { x: number; y: number; t: number; armed: boolean; dmg: number; rt: SkillRuntime }[] = [];
  /** 哨兵（同时 1 个） */
  private sentries: { x: number; y: number; t: number; cd: number; dmg: number; rt: SkillRuntime }[] = [];
  /** 蓄能脉冲状态（按技能槽） */
  private charges: Record<number, { t: number; dmg: number; r: number; rt: SkillRuntime }> = {};
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
    /** 击败 BOSS（只用于成就统计，不参与结算） */
    onBossKill?: () => void;
  } = {};

  // ---------- 启动 ----------
  async start() {
    this.buildTree();
    // ⚠️ 调试行**默认关闭**：它是排查素材加载问题时加的，玩家不该看到。
    //    要排查时把 DEBUG_HUD 改成 true 即可（DOM 与 Cocos 其余布局不受影响）。
    if (DEBUG_HUD) this.refreshDebug();
  }

  /** 开一局（角色选择屏点"开始闯关"时调用） */
  async startRun(charId: string, seed: number) {
    // ⚠️ 必须自保：菜单界面里 Battle 节点是 **inactive**，Cocos 不会调 start()，
    //    于是 cam / world 都没建。之前这里直接 this.cam.target = node 会抛 TypeError，
    //    把整个 startRun 打断（表现出来就是"进战斗卡一下"+"看不到人"）。
    if (!this.cam || !this.world) this.buildTree();
    // ★ M33 #1：先清上一局残留。以前这里只 new RunState，场上旧敌人 / 经验球 /
    //   飞行物 / 旧玩家节点全留着 —— 表现就是"开新局还能看到上一局的经验球和两个玩家"。
    this.resetRunState();
    const charDef = CHARS.find(c => c.id === charId) ?? CHARS[0];
    this.rs = new RunState(charDef.id, seed, this.difficultyId);
    // 预载：玩家单位 + 初始技能的投射物/命中特效
    this.playerClips = await Assets.loadUnit(charDef.unit);
    // 经验球素材（5 帧，很小）：开局就同步载入，保证第一只怪掉球时就能看见
    await Assets.loadVfx('pickup/gem');
    // VFX **不再阻塞入场**（用户反馈「进入游戏时会先卡顿一下」）：
    //   原来这里同步 await 了 20+ 个特效组件，实测 startRun 要 700ms+。
    //   改成后台加载：前 1~2 秒的命中特效可能缺席，但不卡；GameRoot 开局也在预加载同一批。
    void this.preloadVfx();

    this.createPlayer(charDef.unit);
    // ⚠️ running 必须在 startWave 之前置 true：startWave 里有 "已结束就不开波" 的守卫，
    //    顺序反了会导致第 1 波完全不刷怪（用户 2026-10-30 反馈）
    this.running = true;
    this.paused = false;
    await this.startWave(1);
  }

  /**
   * 开新局前把**所有跨局残留**清掉（M33 #1）。
   * 覆盖：玩家节点、敌人、经验球、飞行物、区域、特效、召唤、闪电、
   *      波次计时 / BOSS 引用 / 命中停顿 / 受击闪屏 / 技能冷却。
   */
  private resetRunState() {
    const kill = (n?: Node) => { if (n && n.isValid) n.destroy(); };
    kill(this.playerNode);
    this.playerNode = null!;
    for (const e of this.enemies) kill(e.node);
    this.enemies = [];
    for (const g of this.gems) kill(g.node);
    this.gems = [];
    for (const b of this.bullets) kill(b.node);
    this.bullets = [];
    for (const a of this.areas) kill(a.node);
    this.areas = [];
    for (const f of this.fx) kill(f.node);
    this.fx = [];
    for (const bo of this.bolts) kill(bo.node);
    this.bolts = [];
    for (const m of this.meteors) kill(m.node);
    this.meteors = [];
    this.echoQueue = [];

    this.waveLeft = 0; this.elitesSpawned = 0; this.spawnAcc = 0;
    this.waveEnding = false; this.waveEndT = 0; this.waveEndPending = false;
    this.waveEndUps = 0; this.pendingUps = 0;
    this.bossRef = null; this.bossAlive = null; this.bossDefeated = false;
    this.hitstop = 0; this.hurtFlash = 0; this.inv = 0; this.dmgFlash = 0; this.hurtBoostT = 0;
    this.skillT = [0, 0, 0, 0];
    this.running = false; this.paused = false;
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
    // ⚠️ 幂等：startRun 里可能已经补建过一次（菜单里 Battle 节点是 inactive，
    //    Cocos 不会调 start()）。再建一次会产生第二套 World/Camera，画面就对不上了。
    if (this.world && this.cam) return;
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

    // ── 地面层次（2026-10-13 加）──────────────────────────────
    // 参考分析（docs/ui/reference-library/video-ref-analysis.md）：
    //   热门作品画面"中调像素"占 27~37%，而我们只有 **4%**（94% 是纯暗色）——
    //   看着像"在一块黑布上放几个精灵"。这里用程序生成的碎石/草簇把中调补上来。
    // 全部用确定性哈希，不依赖 Rng，网格永远长一样（不会每帧闪）。
    const hash = (x: number, y: number) => {
      let h = (x * 374761393 + y * 668265263) | 0;
      h = (h ^ (h >> 13)) * 1274126177;
      return ((h ^ (h >> 16)) >>> 0) / 4294967296;
    };
    const GRAVEL = new Color(0x2A, 0x3E, 0x60, 255);     // 碎石（比底亮一档）
    const GRAVEL2 = new Color(0x35, 0x4C, 0x72, 255);    // 亮碎石
    const GRASS = new Color(0x2C, 0x4A, 0x4A, 255);      // 草簇（带一点绿）
    const CRACK = new Color(0x12, 0x1B, 0x2E, 255);      // 裂缝（比底暗一档）
    // 第一层：密集小碎石（每格 4~7 个 2~5px）—— 覆盖率要够才有"地面质感"
    for (let yy = 0; yy < NY; yy++) {
      for (let xx = 0; xx < NX; xx++) {
        const lx = xx * CELL, ly = -(yy + 1) * CELL;
        const n = 7 + Math.floor(hash(xx, yy) * 5);
        for (let k = 0; k < n; k++) {
          const r1 = hash(xx * 31 + k, yy * 17 + k);
          const r2 = hash(xx * 13 + k * 7, yy * 23 + k * 3);
          const r3 = hash(xx + k * 101, yy + k * 57);
          const px = lx + 1 + r1 * (CELL - 8);
          const py = ly + 1 + r2 * (CELL - 8);
          const s = 3 + Math.floor(r3 * 5);
          g.fillColor = r3 < 0.14 ? CRACK : (r3 < 0.60 ? GRAVEL : (r3 < 0.86 ? GRAVEL2 : GRASS));
          g.rect(Math.round(px), Math.round(py), s, s);
        }
      }
    }
    g.fill();
    // 第二层：中大型物件（石头/草丛/残骸，8~18px）—— 约 12% 的格子
    const ROCK = new Color(0x3B, 0x52, 0x78, 255);
    const ROCK_D = new Color(0x24, 0x35, 0x52, 255);
    const BUSH = new Color(0x2E, 0x52, 0x44, 255);
    for (let yy = 0; yy < NY; yy += 2) {
      for (let xx = 0; xx < NX; xx += 2) {
        if (hash(xx * 3 + 11, yy * 5 + 7) > 0.40) continue;   // 约 40% 的 2x2 块
        const lx = xx * CELL, ly = -(yy + 1) * CELL;
        const r1 = hash(xx * 19, yy * 29), r2 = hash(xx * 41 + 3, yy * 13 + 5), r3 = hash(xx + yy * 97, yy + 31);
        const w = 10 + Math.floor(r1 * 14);
        const h = 8 + Math.floor(r2 * 10);
        const px = lx + 2 + r1 * (CELL * 2 - w - 4);
        const py = ly + 2 + r2 * (CELL * 2 - h - 4) - CELL;
        // 先画暗底（阴影），再画亮面 —— 有立体感
        g.fillColor = ROCK_D;
        g.rect(Math.round(px), Math.round(py - 2), w, h);
        g.fill();
        g.fillColor = r3 < 0.3 ? BUSH : ROCK;
        g.rect(Math.round(px), Math.round(py), w, h - 2);
        g.fill();
      }
    }
    ground.setPosition(0, ARENA_H, 0);

    // ── 地面贴图（2026-10-20）：SDXL 竞技场底图，620×940 = 1:1 世界尺寸 ──
    // 加载成功就隐藏上面那套程序绘制（保留为兜底：素材没导入时画面不会空）
    const artGround = new Node('GroundArt');
    artGround.parent = this.world;
    const gut = artGround.addComponent(UITransform);
    gut.setContentSize(ARENA_W, ARENA_H);
    artGround.setPosition(ARENA_W / 2, ARENA_H / 2, 0);
    const gsp = artGround.addComponent(Sprite);
    gsp.sizeMode = Sprite.SizeMode.CUSTOM;
    gsp.trim = false;
    void Assets.loadBg('battle-floor-620x940').then((sf) => {
      if (!sf || !gsp.isValid) { console.warn('[Battle] 地面贴图缺失，回退程序绘制'); return; }
      gsp.spriteFrame = sf;
      ground.active = false;
    });

    // 竞技场边界（2px 橙）单独一层，不随 ground 隐藏
    const bd = new Node('ArenaBorder');
    bd.parent = this.world;
    const bdg = bd.addComponent(Graphics);
    bdg.lineWidth = 2;
    bdg.strokeColor = new Color(255, 168, 75, 90);
    bdg.rect(0, -ARENA_H, ARENA_W, ARENA_H);
    bdg.stroke();
    bd.setPosition(0, ARENA_H, 0);

    // 边缘暗角：四周压暗，把注意力聚焦到战斗中心
    const vig = new Node('Vignette');
    vig.parent = this.world;
    const vg = vig.addComponent(Graphics);
    const EDGE = 90;
    for (let i = 0; i < 14; i++) {
      const a = Math.round(70 * Math.pow(1 - i / 14, 2.0));   // 边缘最暗 -> 向内淡出
      vg.fillColor = new Color(0, 0, 0, a);
      const t0 = (EDGE / 14) * i;
      vg.rect(0, -ARENA_H + t0, ARENA_W, EDGE / 14);          // 上
      vg.rect(0, -t0 - EDGE / 14, ARENA_W, EDGE / 14);        // 下
      vg.rect(t0, -ARENA_H, EDGE / 14, ARENA_H);              // 左
      vg.rect(ARENA_W - t0 - EDGE / 14, -ARENA_H, EDGE / 14, ARENA_H);  // 右
      vg.fill();
    }
    vig.setPosition(0, ARENA_H, 0);

    // ⚠️ M66（遮挡评估）：层序就是绘制序。旧顺序 Area>Unit>Bullet 让**子弹画在单位上面**，
    //   且玩家与敌人同层（敌人后创建 → 盖住玩家）。密集战斗里玩家会被整个盖掉（已有截图证据）。
    //   新顺序：Area(地面/经验球) > Bullet(子弹) > Unit(敌人) > Player(玩家恒在单位之上) > Fx > Text
    this.layerArea = mk('Area');
    this.layerBullet = mk('Bullet');
    this.layerUnit = mk('Unit');
    this.layerPlayer = mk('Player');
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
  /**
   * 建一个精灵节点。
   *
   * ⚠️ 单位的结构是「容器 + 三层子节点」：
   *      node（容器，Battle 定位/翻转它）
   *        ├─ outline  黑色剪影（放大 1.14，垫在最下面）→ 单位才从地面细节里跳出来
   *        ├─ shadow   脚下软阴影
   *        └─ body     真正的动画精灵（FrameAnim 挂这里）
   *    **必须这样分层**：Cocos 里"节点自身的 Sprite 会先于子节点渲染"，
   *    如果把描边做成子节点、精灵挂在容器上，描边就盖到精灵上面去了。
   */
  private mkSpriteNode(name: string, parent: Node, w = 32, h = 32, fallbackColor?: Color, withShadow = false): { node: Node; anim: FrameAnim; body: Node } {
    const node = new Node(name);
    node.parent = parent;
    const ut = node.addComponent(UITransform);
    ut.setContentSize(w, h);

    let body = node;
    let outline: Sprite | null = null;
    let glow: Node | null = null;
    let glow2: Node | null = null;
    if (withShadow) {
      const ol = new Node('outline');
      ol.parent = node;
      const out = ol.addComponent(UITransform);
      out.setContentSize(w * 1.14, h * 1.14);   // 放大才有描边效果
      outline = ol.addComponent(Sprite);
      outline.sizeMode = Sprite.SizeMode.CUSTOM;
      outline.trim = false;
      outline.color = new Color(6, 8, 16, 235);

      // ★ 泛光层（参考"吞噬/行囊守卫"的转职光晕做法：同一帧放大 + 染色低透明度）
      //   精英绿色泛光：内层 1.18× alpha 0.9，外层 1.45× alpha 0.3
      glow = new Node('glow');
      glow.parent = node;
      const gut = glow.addComponent(UITransform);
      gut.setContentSize(w * 1.22, h * 1.22);
      const gsp = glow.addComponent(Sprite);
      gsp.sizeMode = Sprite.SizeMode.CUSTOM; gsp.trim = false;
      gsp.color = new Color(74, 227, 106, 255);
      glow.active = false;

      glow2 = new Node('glow2');
      glow2.parent = node;
      const g2ut = glow2.addComponent(UITransform);
      g2ut.setContentSize(w * 1.46, h * 1.46);
      const g2sp = glow2.addComponent(Sprite);
      g2sp.sizeMode = Sprite.SizeMode.CUSTOM; g2sp.trim = false;
      g2sp.color = new Color(74, 227, 106, 120);
      glow2.active = false;

      body = new Node('body');
      body.parent = node;
      const but = body.addComponent(UITransform);
      but.setContentSize(w, h);
    }

    const sp = body.addComponent(Sprite);
    sp.sizeMode = Sprite.SizeMode.CUSTOM;
    sp.trim = false;
    if (fallbackColor) sp.spriteFrame = makeSolidFrame(fallbackColor.r, fallbackColor.g, fallbackColor.b);
    // contentSize 必须在 addComponent(Sprite) 之后设（Sprite 初始化会按空 spriteFrame 重置尺寸）
    const but2 = body.getComponent(UITransform) ?? body.addComponent(UITransform);
    but2.setContentSize(w, h);
    const anim = body.addComponent(FrameAnim);
    if (outline) (node as unknown as { _outline: Sprite })._outline = outline;
    if (glow) (node as unknown as { _glow: Node })._glow = glow;
    if (glow2) (node as unknown as { _glow2: Node })._glow2 = glow2;

    if (withShadow) {
      const sh = new Node('shadow');
      sh.parent = node;
      const sut = sh.addComponent(UITransform);
      sut.setContentSize(w * 1.05, w * 0.42);
      const ss = sh.addComponent(Sprite);
      ss.spriteFrame = shadowFrame();
      ss.sizeMode = Sprite.SizeMode.CUSTOM;
      ss.trim = false;
      sh.setPosition(0, -h / 2 + 2, 0);
      // ★ 层级必须是「描边 → 阴影 → 外泛光 → 内泛光 → 身体」：
      //   泛光要**垫在身体后面**，否则 1.5× 的染色副本会盖住身体、把角色整体染成绿/红。
      // （ol 是上一个 if 块里的局部变量，这里按名字取，别再引用它）
      const olNode = node.getChildByName('outline');
      if (olNode) olNode.setSiblingIndex(0);
      sh.setSiblingIndex(1);
      if (glow2) glow2.setSiblingIndex(2);
      if (glow) glow.setSiblingIndex(3);
      body.setSiblingIndex(4);
      body.getComponent(UITransform)!.setContentSize(w, h);
    }
    return { node, anim, body };
  }

  private addVfx(key: string, x: number, y: number, life: number, scale = 1, angleDeg = 0): Fx | null {
    const frames = Assets.vfxFrames(key);
    if (!frames || !frames.length) {
      // 没预加载过的 key：先触发加载，下一次施放就能画出来（例如地刺的 spike-row）
      void Assets.loadVfx(key);
      return null;
    }
    // 用户 #6：特效透明度设置（0~1）。只作用于 VFX 图层，不影响敌人与判定的可读性。
    const alpha = FxPrefs.alpha;
    if (alpha <= 0.01) return null;
    const { node, anim } = this.mkSpriteNode('fx:' + key, this.layerFx,
      32 * scale, 32 * scale);
    if (alpha < 0.99) {
      const op = node.addComponent(UIOpacity);
      op.opacity = Math.round(255 * alpha);
    }
    anim.setClips({ play: frames });
    anim.play('play', false);
    node.setPosition(x, ARENA_H - y, 0);
    node.angle = angleDeg;
    const f: Fx = { node, anim, t: 0, life };
    this.fx.push(f);
    return f;
  }

  // ============================================================
  //  实体
  // ============================================================
  private createPlayer(unit: string) {
    const { node, anim } = this.mkSpriteNode('player:' + unit, this.layerPlayer, 32, 32, new Color(255, 168, 75), true);
    anim.setClips(this.playerClips);
    this.playerNode = node;
    this.playerAnim = anim;
    this.place(node, this.px, this.py);
    this.cam.target = node;

    // 脚下阴影：用户要求**去掉**（"不需要区分，土豆兄弟也没有"）。
    // 角色本身有黑描边（mkSpriteNode 的 withShadow 画的是精灵描边，不是地面影），
    // 怪潮里依然能看清，所以这里不再画额外的东西。
  }

  /** 后台预加载本局可能用到的特效（不阻塞战斗开始） */
  private async preloadVfx() {
    const keys = new Set<string>([FX.killSmall, FX.killBig, FX.spawnWarn, FX.crit,
      FX.hitSpark, FX.critFlash, FX.killSpark, FX.killDust, FX.killRing]);
    for (const k of Object.keys(SKILL_ART)) {
      const a = SKILL_ART[k];
      if (a.proj) keys.add(a.proj);
      if (a.hit) keys.add(a.hit);
      if (a.aoe) keys.add(a.aoe);
      if (a.zone) keys.add(a.zone);
      if (a.cast) keys.add(a.cast);
      if (a.swing) keys.add(a.swing);
    }
    // 区域技能（type=area）的通用起手法阵
    keys.add('ground/ring/cast-circle');
    keys.add('chain/chain-node');          // 连锁闪电的命中火花（原来每次跳都异步 load 一次）
    keys.add('ground/earth/spike-row');    // 地刺的尖刺行（素材，M34 #2）
    keys.add('ground/earth/stone-burst');  // 地刺的地面碎裂
    keys.add('support/heal/heal');          // 吸血 / 击杀回血的回血动画（M39）
    keys.add('pickup/gem');                 // 经验球素材动画（M41）
    keys.add('projectile/fire/fire-trail'); // 陨石拖尾（M45）
    keys.add('projectile/earth/meteor');    // 陨石本体（岩石，M53）
    keys.add('core/burst/warm-explosion');
    keys.add('core/burst/big-boom');
    for (const k of keys) await Assets.loadVfx(k);
  }

  private async startWave(n: number) {
    // ⚠️ 用户反馈"一局结束还会刷怪"：result 之后仍有排队中的 finishWave/advanceWave 走到这里，
    //    startWave 会铺开场怪 → 看起来还在刷。局已结束（running=false）就直接拒绝开波。
    if (!this.running) { console.log('[Battle] 已结束，忽略 startWave(' + n + ')'); return; }
    this.rs.wave = n;
    this.waveDmg = 0; this.waveDmgDealt = 0; this.waveAliveMax = 0;
    if (n === 1) this.totalDmg = 0;
    telemetryWaveStart(this.rs.kills);
    this.waveEnding = false; this.waveEndT = 0; this.waveEndPending = false;
    this.waveEndUps = 0; this.waveAbsorbDone = false;
    this.spawnAcc = 0;
    this.elitesSpawned = 0;
    this.bossRef = null;
    this.waveLeft = isBossWave(n) ? 0 : waveTime(n);
    for (const b of this.bolts) { if (b.node && b.node.isValid) b.node.destroy(); }
    this.bolts = [];
    this.px = ARENA_W / 2; this.py = ARENA_H / 2;
    this.place(this.playerNode, this.px, this.py);
    this.inv = 1.4;

    Sfx.sfx('waveStart', 0.4, 400);
    if (isBossWave(n)) { Sfx.sfx('bossIn', 0.6, 600); Sfx.bgm('boss'); }
    else Sfx.bgm('battle');

    // 开场先铺几只（否则开局几秒屏幕是空的，没有"怪潮"感）
    if (!isBossWave(n)) {
      const pool0 = this.rs.spawnPool;
      if (pool0.length) {
        const S = balance().spawn;
        const open = Math.min(S.openMax, S.openBase + Math.floor(n / S.openEvery));   // 开场铺怪
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
      this.shake(SHAKE.boss);
      this.addVfx(FX.killBig, this.px + 150, this.py - 110, 0.9, 2);
    }
  }

  private spawnEnemy(kind: string, wx: number, wy: number, scale = 1, unitOverride?: string) {
    const def = ENEMIES[kind];
    if (!def) { console.warn('[Battle] 未知敌人：' + kind); return; }
    this.seenEnemies.add(kind);
    const ws0 = waveScale(this.rs.wave);
    const dcfg = difficultyOf(this.rs.difficulty);
    const ws = { hp: ws0.hp * dcfg.enemyHpMul, dmg: ws0.dmg * dcfg.enemyDmgMul };
    // 玩法审计 §8.5：阻路者（慢速高血量）降速但更难推走；其它单位保持原样
    const BLOCKER = kind === 'orc' || kind === 'cavebrute';
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
      facing: 1, flash: 0, kx: 0, ky: 0, slow: 0, spawnT: 0.9, slowPct: 0.35,
      boss: !!def.boss, elite: !!def.elite,
      poisonT: 0, burnT: 0, dotTick: 0, poisonDmg: 0, burnDmg: 0,
      visScale: 1,
      aiState: 'idle', aiT: 0,
      aiCd: def.boss ? balance().ai.bossFirstCd : balance().ai.eliteFirstCd, aiDX: 0, aiDY: 0,
      aiNext: 'charge',
    };
    if (BLOCKER) e.spd = Math.round(e.spd * 0.82);
    // ★ M49：单位帧是异步加载的，加载完成前先**藏起来**（之前会露出红色兜底方块）
    const bodyNode = node.getChildByName('body') ?? node;
    const bodySp = bodyNode.getComponent(Sprite);
    const outlineSp = (node as unknown as { _outline?: Sprite })._outline ?? null;
    if (bodySp) bodySp.enabled = false;
    if (outlineSp) outlineSp.enabled = false;
    // ★ M64：精英/BOSS 只放大**显示**（碰撞半径 r 不变，判定范围不因此改变）
    e.visScale = def.boss ? 1.6 : (def.elite ? 1.25 : 1);
    if (e.visScale !== 1) node.setScale(e.visScale, e.visScale, 1);

    // ★ 精英/BOSS 的辨识 = **身体泛光**（不再画地面圈）
    //   用户 2026-10-28 明确要求：地面圈会盖住地面细节、还像技能范围指示；
    //   改成"同帧放大 + 染色 + 半透明"的两层光晕垫在身体后面 —— 就是《吞噬守卫》里稀有度角色的做法。
    if (e.elite) {
      // 用户 2026-10-30：之前 alpha 235/120 太实，三层同帧叠在一起像"三只怪"
      this.setBodyGlow(node, new Color(120, 255, 140), 90, new Color(52, 210, 90), 52);
      const ol = (node as unknown as { _outline?: Sprite })._outline;
      if (ol) ol.color = new Color(88, 232, 120, 255);     // 描边染绿 = 清晰的绿色轮廓
    }
    if (e.boss) {
      this.setBodyGlow(node, new Color(255, 96, 80), 100, new Color(170, 34, 26), 60);
      const ol = (node as unknown as { _outline?: Sprite })._outline;
      if (ol) ol.color = new Color(232, 78, 66, 255);
      this.addBossTag(node);
      this.addVfx('core/ring/zap-ring', wx, wy, 0.7, 2.4);
      this.shake(SHAKE.boss);
    }
    this.enemies.push(e);
    void Assets.loadUnit(unit).then((clips) => {
      if (!e.node.isValid) return;
      e.anim.setClips(clips);
      if (bodySp && bodySp.isValid) bodySp.enabled = true;
      if (outlineSp && outlineSp.isValid) outlineSp.enabled = true;
    });
    this.addVfx(FX.spawnWarn, wx, wy, 0.5, 1.6);
  }

  private fireSkill(slot: number, rt: SkillRuntime) {
    this.currentCastId = nextCastId();
    // M6 蓄势：按技能独立计数，达到周期的那一次享受加成，随后归零
    const oc = this.modStacks('overcharge');
    if (oc > 0) {
      const period = overchargePeriod(oc);
      const n = (this.castCount[slot] ?? 0) + 1;
      if (n >= period) {
        this.castCount[slot] = 0;
        const mul = overchargeMul(oc);
        rt = { ...rt, dmg: rt.dmg * mul };
      } else {
        this.castCount[slot] = n;
      }
    }
    const foc = focusedMods(this.rs.skills.length);
    if (foc.dmg !== 1 || foc.cd !== 1) rt = { ...rt, dmg: rt.dmg * foc.dmg, cd: rt.cd * foc.cd };
    // 背水：低血攻速提升（用伤害乘区近似，冷却不变）
    if (this.rs.hasItem('lastbreath')) {
      const hpPct = this.rs.stats.maxhp > 0 ? this.rs.stats.hp / this.rs.stats.maxhp : 1;
      rt = { ...rt, dmg: rt.dmg * lastbreathMul(hpPct) };
    }
    // 贪欲之心：金币换攻击（封顶 +15%）
    if (this.rs.hasItem('greed')) {
      const gb = greedPowerBonus(this.rs.gold);
      if (gb > 0) rt = { ...rt, dmg: rt.dmg * (1 + gb) };
    }
    // 共鸣器：同一技能装 2 个同 Hook 模块 → 该技能 +20%
    if (this.rs.hasItem('resonator')) {
      const hookCount: Record<string, number> = {};
      const skCur = this.rs.skills[slot];
      for (const m of (skCur ? skCur.mods : [])) for (const h of (MODULE_HOOKS[m.replace(/_(\d+)$/, '')] ?? [])) hookCount[h] = (hookCount[h] ?? 0) + 1;
      if (Object.values(hookCount).some(n => n >= 2)) rt = { ...rt, dmg: rt.dmg * 1.2 };
    }
    const sk = this.rs.skills[slot];
    const def = SKILLS[sk.id];
    const art: SkillArt = (SKILL_ART as Record<string, SkillArt>)[sk.id] || ({} as SkillArt);
    const tgt = this.nearestEnemy(this.px, this.py, TARGET_RANGE);
    const dir = tgt ? Math.atan2(tgt.y - this.py, tgt.x - this.px) : 0;

    if (def.type === 'projectile' || def.type === 'chain') {
      if (def.type === 'chain') {
        if (!tgt) return;
        // 用户要求：**从角色身上发出闪电**，先打到第一个目标，再逐跳连锁。
        // 每一跳都画一段折线闪电（来源 → 目标），命中点再叠一个火花。
        let cur = tgt; const hit = new Set<Enemy>([cur]);
        this.spawnBolt(this.px, this.py, cur.x, cur.y);          // ★ 玩家 → 第一个目标
        this.hitEnemy(cur, rt.dmg, rt, art.hit);
        // ⚠️ B6：原来只吃 bounce（反弹模块），「传染」模块累积在 rt.chain 里但被忽略。
        //    现在两者都算跳数：2 基础跳 + 反弹 + 传染。
        for (let j = 0; j < 2 + rt.bounce + rt.chain; j++) {
          const from = cur;
          const nx = this.nearestEnemy(from.x, from.y, 140, hit);
          if (!nx) break;
          hit.add(nx);
          this.spawnBolt(from.x, from.y, nx.x, nx.y);            // ★ 目标 → 下一个目标
          this.hitEnemy(nx, rt.dmg * 0.85, rt, art.hit);
          this.addVfx('chain/chain-node', nx.x, nx.y, 0.3, 1);
          cur = nx;
        }
        return;
      }
      // ★ 扇射：以前 fan 只改「间距」不改「数量」—— count=1 时(i - (count-1)/2) 恒为 0，
      //   装 1~2 个扇射完全看不出散射（用户反馈「火了装了散射却不散射」，2026-10-20 M30 #1）。
      //   现在每个扇射 **多 2 发**，并沿扇面均匀铺开。
      // ★ M49：**加量**和**扇射**必须不一样 ——
      //   加量：同方向多打 1 发，全额伤害（火力集中）
      //   扇射：额外散开 2 发"小弹"，每发 60% 伤害、射程更短（覆盖面换伤害）
      const baseShots = rt.count;
      // 用户反馈：两份刀刃几乎重叠，看不出打了两发 → 间距调到 ~17°
      const baseSpread = baseShots > 1 ? 0.30 : 0;
      // 第三轮批准：额外弹（第 2 发起）按 extraProjDmg 加成（三重镜 = +15%），主弹仍是全额
      const extraMul = 1 + (this.rs.stats.extraProjDmg ?? 0);
      for (let i = 0; i < baseShots; i++) {
        const a = dir + (i - (baseShots - 1) / 2) * baseSpread;
        const shotRt = i === 0 || extraMul === 1 ? rt : { ...rt, dmg: rt.dmg * extraMul };
        const bl = this.spawnBullet(this.px, this.py, Math.cos(a) * rt.spd, Math.sin(a) * rt.spd,
          shotRt, art.proj, art.hit, def.tags.includes('homing'));
        // ★ 回旋刃（M46）：飞出去 0.5s 后折返，回程可再命中一次
        if (bl && def.tags.includes('return')) {
          bl.returning = true; bl.returnHit = false;
          bl.outT = 0.5;
          bl.life = 2.2;
        }
      }
      const fanShots = rt.fan * 2;
      for (let i = 0; i < fanShots; i++) {
        const a = dir + (i - (fanShots - 1) / 2) * 0.24;
        this.spawnBullet(this.px, this.py, Math.cos(a) * rt.spd * 0.85, Math.sin(a) * rt.spd * 0.85,
          { ...rt, dmg: rt.dmg * 0.55, pierce: 0, bounce: 0, chain: 0, split: 0 },
          art.proj, art.hit, false, false, 0.75);
      }
      for (let i = 0; i < rt.orbit; i++) {
        this.spawnBullet(this.px, this.py, 0, 0, { ...rt, dmg: rt.dmg * 0.8 }, art.proj, art.hit, false, true);
      }
    } else if (def.type === 'pulse') {
      // 复读机（echo）：0.4s 后再来一次 60% 伤害
      this.queueEcho(slot, rt.echo);
      // 0.45s 让扩散过程看得见；再补一圈更大的冲击环和尘土
      this.spawnArea(this.px, this.py, rt.size + 26, rt.dmg, 0.45, 'pulse', art.aoe, rt);
      this.addVfx('core/ring/shockwave', this.px, this.py, 0.38, Math.max(1.6, (rt.size + 26) / 12));
    } else if (def.type === 'orbit') {
      // 环刃：常驻，随等级加片（上限 4）
      const n = Math.min(4, 1 + sk.lvl);
      this.orbits[slot] = { n, radius: Math.max(30, rt.size), dmg: rt.dmg, rot: 0, tick: 0, rt };
    } else if (def.type === 'trap') {
      // 地雷：同屏上限 4，超出时最早的一枚立即引爆
      this.traps.push({ x: this.px, y: this.py, t: 0, armed: false, dmg: rt.dmg, rt });
      if (this.traps.length > 4) {
        const old = this.traps.shift();
        if (old) this.explodeTrap(old);
      }
    } else if (def.type === 'summon') {
      // 哨兵：同时 1 个，重复施放移动并刷新时长
      this.sentries = [{ x: this.px, y: this.py, t: 0, cd: 0, dmg: rt.dmg, rt }];
    } else if (def.type === 'charge') {
      // 蓄能脉冲：进入蓄力（无目标也允许，结算时空放返还冷却）
      this.charges[slot] = { t: 0, dmg: rt.dmg, r: Math.max(60, rt.size), rt };
    } else if (def.type === 'area') {
      const ax = tgt ? tgt.x : this.px, ay = tgt ? tgt.y : this.py;
      // ★ 施法动作（用户反馈「刃爆看不出施法，像直接作用到敌人身上」）：
      //   先在角色脚下起手法阵，再在角色身上转一刀，最后朝目标方向补一道斩击。
      //   三道特效都在**落地之前**播，让"打出去"这件事有明确的动作来源。
      this.addVfx('ground/ring/cast-circle', this.px, this.py, 0.34, 1.6);
      if (art.cast) this.addVfx(art.cast, this.px, this.py, 0.30, 2.0);
      if (art.swing && tgt) {
        const ang = Math.atan2(ay - this.py, ax - this.px);
        this.addVfx(art.swing, (this.px + ax) / 2, (this.py + ay) / 2, 0.24, 1.8, -ang * 180 / Math.PI);
      }
      // 复读机（echo）：0.4s 后再来一次 60% 伤害
      this.queueEcho(slot, rt.echo);
      // ★ 陨石（M45）：先从屏幕上方砸下来，**落地瞬间**才生成燃烧区
      if (sk.id === 'meteor') { this.castMeteor(ax, ay, rt.size, rt.dmg, rt, art); return; }
      // 第三轮：区域时长/跳动间隔按技能配置（默认 3.4s / 0.45s）
      this.spawnArea(ax, ay, rt.size, rt.dmg, sk.zoneLife ?? 3.4, 'zone', art.zone ?? art.aoe, rt, sk.tickRate ?? 0.45);
      // 地刺：zone 只负责伤害，视觉是"从地里冒出来的一排石刺"（M33 #3）
      const ar = this.areas[this.areas.length - 1];
      if (ar) ar.tag = sk.id;
      if (sk.id === 'spike') this.spawnSpikeField(ax, ay, rt.size);
    }
  }

  /**
   * 一道闪电（从 A 到 B）：折线 + 淡出。
   * 用户要求：「连锁闪电应该是**角色发出闪电**，击中后才进行连锁」——所以第一段必须从玩家身上发出去。
   */
  private spawnBolt(x1: number, y1: number, x2: number, y2: number, life = 0.20) {
    const n = new Node('bolt');
    n.parent = this.layerFx;
    const g = n.addComponent(Graphics);
    const SEG = 7;
    g.lineWidth = 3;
    g.strokeColor = new Color(155, 231, 255, 255);
    let prevX = x1, prevY = ARENA_H - y1;
    for (let i = 1; i <= SEG; i++) {
      const t = i / SEG;
      const jitter = i < SEG ? 7 : 0;   // 末端不抖，保证正好落在目标身上
      const bx = x1 + (x2 - x1) * t + (jitter ? this.rs.rng.range(-jitter, jitter) : 0);
      const by = y1 + (y2 - y1) * t + (jitter ? this.rs.rng.range(-jitter, jitter) : 0);
      g.moveTo(prevX, prevY);
      g.lineTo(bx, ARENA_H - by);
      prevX = bx; prevY = ARENA_H - by;
    }
    g.stroke();
    this.bolts.push({ node: n, t: 0, life });
  }

  private updateBolts(dt: number) {
    for (const b of this.bolts) b.t += dt;
    this.bolts = this.bolts.filter(b => {
      if (b.t < b.life) return true;
      if (b.node && b.node.isValid) b.node.destroy();
      return false;
    });
  }

  private spawnBullet(x: number, y: number, vx: number, vy: number, rt: SkillRuntime,
                      vfxKey: string | undefined, hitVfx: string | undefined,
                      homing: boolean, orbit = false, life = 1.6) {
    const key = vfxKey ?? FX.killSmall;
    const frames = Assets.vfxFrames(key);
    const sc = Math.max(1, Math.round(rt.size / 5));
    const { node, anim } = this.mkSpriteNode('bullet', this.layerBullet, 32 * sc, 32 * sc, new Color(255, 209, 102));
    anim.autoSize = false;   // 子弹按技能 size 缩放，不跟随帧原生尺寸
    if (frames.length) { anim.setClips({ play: frames }); anim.play('play', true); }
    node.setPosition(x, ARENA_H - y, 0);
    const b: Bullet = {
      node, anim, x, y, vx, vy, r: Math.max(4, rt.size),
      dmg: rt.dmg, pierce: rt.pierce, bounce: rt.bounce, chain: rt.chain, split: rt.split,
      life: orbit ? 3.2 : life, t: 0, hitVfx: hitVfx ?? 'core/spark/hit-spark',
      hit: new Set(), homing,
      burn: rt.burn, slow: rt.slow, vamp: rt.vamp, thunder: rt.thunder,
    };
    this.bullets.push(b);
    return b;
  }

  private spawnArea(x: number, y: number, r: number, dmg: number, life: number,
                    kind: 'pulse' | 'zone', vfxKey: string | undefined, _rt: SkillRuntime,
                    tickRate = 0.45) {
    const frames = vfxKey ? Assets.vfxFrames(vfxKey) : [];
    // 地面持续区域（zone）本身只是个"环/地面贴图"，很安静 —— 用户反馈「刃爆看不出特效」。
    // 这里补一发**起手爆发**：落下瞬间的冲击环 + 闪光，让"打出去了"这件事有明确反馈。
    const { node, anim } = this.mkSpriteNode('area', this.layerArea, r * 2, r * 2);
    // ⚠️ M33 #3：FrameAnim.setClips 默认按帧原生尺寸（32px）改节点大小，
    //    于是**所有范围技能都只画了 32px 的一小圈**（半径 26~34 的震荡波/霜爆/毒雾全中招），
    //    玩家看到的就是"技能放出去没效果"。这里必须关掉 autoSize，保留 r*2。
    anim.autoSize = false;
    if (frames.length) { anim.setClips({ play: frames }); anim.play('play', true); }
    node.setPosition(x, ARENA_H - y, 0);
    if (kind === 'zone') {
      this.addVfx('core/ring/shockwave', x, y, 0.35, Math.max(1.2, r / 18));
      this.addVfx(FX.killBig, x, y, 0.3, Math.max(1, r / 26));
    } else {
      // 脉冲（震荡波 / 霜爆 / 荆棘环 / 寒冰环）：冲击环 + 地面扬尘 + 镜头轻震
      this.addVfx('core/dust/landing-dust', x, y + 6, 0.32, Math.max(1.4, r / 14));
      this.shake(SHAKE.kill);
    }
    this.areas.push({
      node, anim, x, y, r: kind === 'pulse' ? 0 : r, maxR: r, dmg,
      life, t: 0, tick: 0, tickRate, kind, done: false, burn: _rt.burn,
    });
  }

  /**
   * 陨石（M45）：从屏幕上方 300px 处砸向落点，越落越快，带火焰拖尾；
   * **落地那一刻**才播爆炸 + 相机震动 + 生成燃烧区。这样才看得出"从天上来"。
   */
  private castMeteor(x: number, y: number, size: number, dmg: number, rt: SkillRuntime, art: SkillArt) {
    // 落点预警环（下落期间才看得到，砸下来更有"要来了"的感觉）
    this.addVfx('core/ring/zap-ring', x, y, Math.max(0.5, 0.6), Math.max(1.6, size / 12));
    // M53：本体换成**岩石**（复用已导入的石屑帧第 2 张），火焰交给拖尾 ——
    //      之前用 fireball-shot，看着就是"火球砸下来"（用户反馈）
    const stoneFrames = Assets.vfxFrames('ground/earth/stone-burst');
    const frames = stoneFrames.length > 1 ? [stoneFrames[1]] : stoneFrames;
    const { node, anim } = this.mkSpriteNode('meteor', this.layerUnit, 32, 32, new Color(255, 160, 80));
    anim.autoSize = false;
    if (frames.length) { anim.setClips({ play: frames }); anim.play('play', true); }
    const sc = Math.max(2.4, rt.size / 10);
    node.setScale(sc, sc, 1);
    node.setPosition(x, ARENA_H - (y - 320), 0);
    this.meteors.push({
      node,
      fromX: x, fromY: y - 320, toX: x, toY: y,
      t: 0, dur: 0.55, size, dmg, rt, zoneKey: art.zone ?? art.aoe, trailT: 0, done: false,
      zoneLife: SKILLS.meteor.zoneLife, tickRate: SKILLS.meteor.tickRate,
    });
  }

  /** 刺猬的实际效果份数（普通 1、Ⅱ 1.6，可跨技能叠加） */
  private thornEffect(): number {
    let sum = 0;
    for (const sk of this.rs.skills) for (const m of sk.mods) if (baseOf(m) === 'thornmail') sum += modEffect(m);
    return sum;
  }

  /** 复读机：按份数排队重放（0.4s / 0.8s / 1.2s…），每份 +1 次 */
  private queueEcho(slot: number, n: number) {
    const reps = echoRepeats(n);
    for (let i = 0; i < reps; i++) this.echoQueue.push({ slot, in: echoDelay(i) });
  }

  private updateEcho(dt: number) {
    for (const q of this.echoQueue) q.in -= dt;
    const due = this.echoQueue.filter(q => q.in <= 0);
    this.echoQueue = this.echoQueue.filter(q => q.in > 0);
    for (const q of due) {
      const sk = this.rs.skills[q.slot];
      if (!sk) continue;
      const rt = { ...this.rs.skillRuntime(q.slot), dmg: this.rs.skillRuntime(q.slot).dmg * 0.6, echo: 0 };
      // ⚠️ 真机崩溃修复：skillT 是 Battle 的字段，不是 RunState 的。
      //    之前写 this.rs.skillT[...] → undefined[3] = 0 → TypeError: Cannot set properties of undefined
      this.skillT[q.slot] = 0;                        // 复读不消耗真实冷却
      this.fireSkill(q.slot, rt);
      this.skillT[q.slot] = rt.cd;
    }
  }

  private updateMeteors(dt: number) {
    for (const m of this.meteors) {
      m.t += dt;
      const k = Math.min(1, m.t / m.dur);
      const e = k * k;                                  // 越落越快
      const x = m.fromX + (m.toX - m.fromX) * k;
      const y = m.fromY + (m.toY - m.fromY) * e;
      if (m.node && m.node.isValid) {
        m.node.setPosition(x, ARENA_H - y, 0);
        // 石块是"团"状，不做朝向旋转，靠**竖直下落 + 火焰拖尾**表现"砸下来"
        m.node.setScale(Math.max(2.4, m.size / 10) * (1 + 0.15 * k));
      }
      m.trailT -= dt;
      if (m.trailT <= 0) {
        m.trailT = 0.05;
        this.addVfx('projectile/fire/fire-trail', x, y + 6, 0.3, Math.max(1.0, m.size / 16));
      }
      if (k >= 1 && !m.done) {
        m.done = true;
        this.addVfx('core/burst/warm-explosion', m.toX, m.toY, 0.5, Math.max(1.6, m.size / 13));
        this.addVfx('core/burst/big-boom', m.toX, m.toY, 0.42, Math.max(1.4, m.size / 17));
        this.shake(SHAKE.boss);
        Sfx.sfx('hitMetal', 0.6, 90);
        this.spawnArea(m.toX, m.toY, m.size, m.dmg, m.zoneLife ?? 3.4, 'zone', m.zoneKey, m.rt, m.tickRate ?? 0.45);
      }
    }
    this.meteors = this.meteors.filter(m => {
      if (!m.done) return true;
      if (m.node && m.node.isValid) m.node.destroy();
      return false;
    });
  }

  /**
   * 地刺（M34）：**不再程序化绘制**，改用素材
   *   · `ground/earth/spike-row`（SpikePlatform 的尖刺行，10 帧变体）
   *   · `ground/earth/stone-burst`（石屑迸开，垫在尖刺脚下）
   * 伤害仍由 zone 结算，这里只管表现。
   */
  private spawnSpikeField(x: number, y: number, r: number) {
    const sc = Math.max(2, Math.round(r / 8));
    // 主刺行 + 左右两撮错位，看起来像"一片"刺
    this.addVfx('ground/earth/spike-row', x, y, 0.55, sc);
    this.addVfx('ground/earth/spike-row', x - r * 0.35, y + 3, 0.5, Math.max(1.6, sc - 1));
    this.addVfx('ground/earth/spike-row', x + r * 0.35, y + 3, 0.5, Math.max(1.6, sc - 1));
    this.addVfx('ground/earth/stone-burst', x, y + 4, 0.42, Math.max(1.4, sc - 1));
  }

  /** 头顶「BOSS」标牌（M62）：深红底 + 浅红描边，和地面环一起构成身份标识 */
  private addBossTag(parent: Node) {
    const tag = new Node('bossTag');
    tag.parent = parent;
    const k = parent.scale.x || 1;          // 父节点已被放大 -> 标牌反向补偿，保持可读尺寸
    tag.setPosition(0, 34 / k, 0);
    tag.setScale(1 / k, 1 / k, 1);
    const ut = tag.addComponent(UITransform); ut.setContentSize(40, 14);
    const g = tag.addComponent(Graphics);
    g.fillColor = new Color(120, 30, 34, 235);
    g.roundRect(-20, -7, 40, 14, 3); g.fill();
    g.lineWidth = 1; g.strokeColor = new Color(255, 138, 128, 210);
    g.roundRect(-20, -7, 40, 14, 3); g.stroke();
    const tn = new Node('label'); tn.parent = tag;
    const l = tn.addComponent(Label);
    l.string = 'BOSS'; l.fontSize = 9; l.lineHeight = 11; l.isBold = true;
    l.color = new Color(255, 225, 215, 255);
    const tu = tn.addComponent(UITransform); tu.setContentSize(40, 12);
  }

  /**
   * 打开单位的「身体泛光」（精英 / BOSS 共用）
   *
   * 做法：两层同帧放大的染色副本垫在身体后面（内层亮、外层暗），
   * 只露出一圈轮廓光 —— 不遮挡身体细节、不占用地面。
   * ⚠️ 泛光节点必须在上面的层级顺序里排在 body **之前**（见 mkSpriteNode）。
   */
  /** 统一的震屏入口：被"屏幕震动"设置关掉时直接忽略（用户 #6） */
  private shake(v: number): void {
    if (FxPrefs.shake) this.cam.addShake(v);
  }

  private setBodyGlow(node: Node, inner: Color, innerA: number, outer: Color, outerA: number): void {
    const ref = node as unknown as { _glow?: Node; _glow2?: Node };
    const g1 = ref._glow, g2 = ref._glow2;
    if (g1 && g1.isValid) {
      g1.active = true;
      const s = g1.getComponent(Sprite);
      if (s) s.color = new Color(inner.r, inner.g, inner.b, innerA);
    }
    if (g2 && g2.isValid) {
      g2.active = true;
      const s = g2.getComponent(Sprite);
      if (s) s.color = new Color(outer.r, outer.g, outer.b, outerA);
    }
  }

  /** 玩家 4 个技能里只要装了某个黑科技就返回 true（强化版 `id_2` 也算） */
  /** 某个黑科技在本局的份数（含合成版，最多 3 份） */
  private modStacks(id: string): number {
    let n = 0;
    for (const sk of this.rs.skills) for (const m of sk.mods) if (m === id || m.startsWith(id + '_')) n++;
    return Math.min(3, n);
  }

  /** 纯伤害（不触发任何命中模块）：M1 爆炸、M4 返程额外伤害都用它 */
  private applyRawDamage(e: Enemy, dmg: number): void {
    if (e.dead) return;
    e.hp -= dmg;
    this.waveDmgDealt += dmg;
    if (e.hp <= 0) this.killEnemy(e, undefined, 'module');
  }

  private hasModule(id: string): boolean {
    return this.rs.skills.some(s => s.mods.some(m => m === id || m === id + '_2'));
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
  private hitEnemy(e: Enemy, base: number, rt: SkillRuntime, hitVfx?: string, noThunder = false, src: DamageSource = 'normal') {
    if (e.dead) return;
    // 统一伤害上下文：来源由调用方声明，能否触发模块由入口推导（设计 v6）
    const ctx: DamageContext = makeDamageContext(src, this.currentCastId, { isBoss: !!e.boss });
    let { dmg, crit } = rollDamage(base, this.rs.stats, this.rs.rng);
    if (this.rs.hasItem('shatter')) dmg *= shatterMul((e.slowPct ?? 0) > 0);
    // 余烬刻印：对已处于灼烧的目标再受火伤 +25%
    if (this.rs.hasItem('emberstack') && (e.burnT ?? 0) > 0) dmg *= 1 + EMBERSTACK_MUL;
    // M3 处决：按结算前血量判定（BOSS 增伤减半）
    const ex = this.modStacks('execute');
    if (ex > 0 && e.maxhp > 0 && e.hp / e.maxhp < 0.30) {
      dmg *= 1 + executePct(ex, !!e.boss);
    }
    // ★ 精英伤害：对精英/BOSS 额外加成
    // 阶段 E：精英/首领伤害加成上限 +150%
    if ((e.elite || e.boss) && this.rs.stats.eliteDmg) dmg = Math.round(dmg * (1 + Math.min(1.5, this.rs.stats.eliteDmg)));
    e.hp -= dmg;
      this.waveDmgDealt += Math.min(dmg);
    // ★ 吸血：按伤害比例回血 + 绿色数字 + 角色身上回血动画（M39）
    if (this.rs.stats.lifesteal > 0) {
      const before = this.rs.stats.hp;
      this.rs.stats.hp = Math.min(this.rs.stats.maxhp, this.rs.stats.hp + dmg * this.rs.stats.lifesteal);
      const healed = this.rs.stats.hp - before;
      if (healed >= 0.5) this.healFeedback(healed);
    }
    e.flash = 0.12;
    this.addDamageText(e.x, e.y - 10, dmg, crit);
    // ── 特效分层（参考作品的手法：闪光 + 粒子 + 碎片）──────────
    //   原来每次命中只有 1 层，看着"单薄"。现在：
    //   L1 技能专属命中特效（火/冰/雷…）
    //   L2 通用火星（更小更快，每次都有，增加"打击感"）
    //   L3 暴击时额外闪光
    //   每层给不同的尺寸/寿命/微偏移，避免完全重叠显得假
    // 音效：暴击单独一个；投射物 / 范围各用不同打击音（照 DEMO 的映射）
    if (crit) Sfx.sfx('crit', 0.34, 110);
    else Sfx.sfx(rt.spd > 0 ? 'hitRanged' : 'hitHeavy', 0.20, 60);
    if (hitVfx) this.addVfx(hitVfx, e.x, e.y, 0.45, 1);
    this.addVfx(FX.hitSpark, e.x + this.rs.rng.range(-4, 4), e.y + this.rs.rng.range(-4, 4), 0.24, 0.7);
    if (crit) {
      this.addVfx(FX.crit, e.x, e.y, 0.5, 1);
      this.addVfx(FX.critFlash, e.x, e.y, 0.30, 1.5);
    }
    // 灼烧（M48）：挂 2s 持续状态（淡红 + 每 0.5s 掉血），不再是"一次性附加伤害"
    if (rt.burn) {
      e.burnT = Math.max(e.burnT, burnDuration(rt.burn));              // 2 / 2.6 / 3.2 秒
      e.burnDmg = Math.max(e.burnDmg, Math.max(1, Math.round(dmg * burnTickMul(rt.burn))));  // 10/20/30%
    }
    if (rt.slow) {
      e.slow = frostDuration(rt.slow);       // 1.2 / 1.6 / 2.0 秒
      // 阶段3 结论：BOSS 单独限速 30%，避免被永久冻住站桩打
      e.slowPct = slowFor(!!e.boss, rt.slow);   // 普通 35/45/55%，BOSS 封顶 30%
    }
    // 吸血：基础 4%/份（唯一模块可合成，Ⅱ = 1.6 份 → 6.4%，低于两份普通）
    if (rt.vamp && canVamp(ctx)) this.healPlayer(dmg * 0.02 * rt.vamp);
    if (this.rs.hasItem('voltloop') && this.runTime - this.voltloopAt >= VOLTLOOP_CD && this.rs.rng.chance(VOLTLOOP_CHANCE)) {
      this.voltloopAt = this.runTime;
      this.applyRawDamage(e, dmg * VOLTLOOP_DMG);
    }
    // M5 焚烧地带：伤害在生成瞬间快照，同屏最多 4 个（超出删最早）
    {
      const lg = this.modStacks('lingering');
      if (lg > 0 && this.rs.rng.chance(lingeringChance(lg, ctx.source === 'split'))) {
        const snap = Math.max(1, Math.round(dmg * LINGER_TICK_DMG));
        this.spawnArea(e.x, e.y, 26, snap, LINGER_TICKS * 0.5, 'zone', undefined, rt, 0.5);
        const created = this.areas[this.areas.length - 1];
        if (created) created.tag = 'lingering';
        const mine = this.areas.filter(a => a.kind === 'zone' && a.tag === 'lingering');
        if (mine.length > LINGER_MAX_ZONES) {
          const old = mine[0];
          if (old && old.node && old.node.isValid) old.node.destroy();
          const i = this.areas.indexOf(old);
          if (i >= 0) this.areas.splice(i, 1);
        }
      }
    }
    // M2 残影护盾：全局 1.5s CD，单层池上限 9，获得即刷新 4s
    {
      const sh = this.modStacks('shieldonhit');
      if (sh > 0) {
        const gate = { id: 'shieldonhit', allowedSources: ['normal', 'chain', 'split'] as DamageSource[], cooldownSec: SHIELD_COOLDOWN };
        if (this.modUsage.canTrigger(ctx, gate, this.runTime)) {
          this.modUsage.mark(ctx, gate, this.runTime);
          this.shield = Math.min(SHIELD_CAP, this.shield + shieldAmount(sh));
          this.shieldT = SHIELD_DURATION;
        }
      }
    }   // 每份 3%（原 4%），且受每秒 8HP 预算限制
    // ★ B7：原来只有特效、**没有伤害**（描述写"造成范围伤害"）。
    //   现在按 15%×份数 触发，对落点 60 半径内的敌人结算 50% 伤害。
    //   ⚠️ 这两个数值（半径/倍率）在 docs/systems 里没有规定，是候选值，已列入审计报告待确认；
    //   通过 Balance 可调，不需要改代码。
    if (!noThunder && rt.thunder > 0 && this.rs.rng.chance(0.15 * rt.thunder)) {
      const T = balance().thunder;
      this.addVfx('feedback/hit/shock-hit', e.x, e.y, 0.4, 1.4);
      for (const t of this.enemies) {
        if (t.dead || t === e) continue;
        if (Math.hypot(t.x - e.x, t.y - e.y) <= T.radius) {
          this.hitEnemy(t, dmg * T.mul, rt, undefined, true);   // 递归触发被最后一个参数挡住
        }
      }
    }
    // 击退
    if (!e.boss) {
      const a = Math.atan2(e.y - this.py, e.x - this.px);
      const kb = this.rs.stats.knockback ?? 26;                  // ★ 击退强度 = 属性
      e.kx += Math.cos(a) * kb; e.ky += Math.sin(a) * kb;
    }
    if (e.hp <= 0) this.killEnemy(e, rt);
  }

  /**
   * 击杀。
   * ⚠️ KI-001 教训：死亡后**先累加 deathT**，再跳过其它逻辑，否则实体永远回收不掉。
   *    见 docs/known-issues.md
   */
  private killEnemy(e: Enemy, rt?: SkillRuntime, src: DamageSource = 'normal') {
    if (e.dead) return;
    e.dead = true; e.deathT = 0;
    // ★ 死亡动画：单位素材每套都有 death 帧（UNIT_FRAMES），以前从来没人播（M30 #2）
    e.anim.playOnce('death');
    this.rs.addKill(e.exp, e.gold);
    // ★ 击杀回血属性
    const kh = this.rs.stats.killHeal ?? 0;
    if (kh > 0) {
      const before = this.rs.stats.hp;
      this.rs.stats.hp = Math.min(this.rs.stats.maxhp, this.rs.stats.hp + kh);
      const healed = this.rs.stats.hp - before;
      if (healed >= 0.5) this.healFeedback(healed);
    }
    // M1 溢出爆裂：只由 normal/split 击杀触发，爆炸自身来源为 module（不连锁）
    const kb = this.modStacks('killblast');
    if (kb > 0 && src !== 'module') {
      const radius = killblastRadius(kb);
      const dmg = killblastDamage(kb);
      const cand: { e: Enemy; d: number }[] = [];
      for (const o of this.enemies) {
        if (o.dead || o === e) continue;
        const d = Math.hypot(o.x - e.x, o.y - e.y);
        if (d <= radius) cand.push({ e: o, d });
      }
      cand.sort((a, b) => a.d - b.d);
      for (const c of cand.slice(0, 60)) this.applyRawDamage(c.e, dmg);
    }
    this.hitstop = Math.max(this.hitstop, e.boss ? HITSTOP.boss : (e.elite ? HITSTOP.elite : HITSTOP.normal));
    this.cam.addShake(e.boss ? SHAKE.boss : (e.elite ? SHAKE.elite : SHAKE.kill));
    // 击杀分层：爆发 + 碎片 + 尘土（+ 精英/BOSS 额外冲击波）
    const big = e.boss || e.elite;
    if (e.boss) Sfx.sfx('special', 0.65, 200);
    else if (e.elite) Sfx.sfx('hitMetal', 0.5, 200);
    if (e.boss) this.hooks.onBossKill?.();      // 成就统计用（不改战斗逻辑）
    else Sfx.sfx('drop', 0.14, 130);
    this.addVfx(big ? FX.killBig : FX.killSmall, e.x, e.y, e.boss ? 0.9 : 0.5, big ? 2 : 1);
    this.addVfx(FX.killSpark, e.x, e.y, 0.42, big ? 1.8 : 1.1);
    this.addVfx(FX.killDust, e.x, e.y + 4, 0.55, big ? 2.2 : 1.2);
    if (big) this.addVfx(FX.killRing, e.x, e.y, 0.55, e.boss ? 3.2 : 2.2);
    // 割韭菜：基础 1 点/份（Ⅱ = 1.6 点）
    if (rt && rt.harvest) this.healPlayer(rt.harvest);   // 每击杀 1 点，和吸血共享 8HP/s 预算
    // ★ M41：经验球换成**素材动画**（Sunny Land 宝石，CC0，5 帧循环），按经验值分档大小：
    //   普通 1×、精英 1.12×、BOSS/大额 1.35×。不再用程序化绘制的菱形。
    const gemFrames = Assets.vfxFrames('pickup/gem');
    if (!gemFrames.length) void Assets.loadVfx('pickup/gem');     // 首帧没预加载到就补一下
    // 经验球是地面掉落物：放在 Area 层（单位下面），不会盖住玩家/敌人
    const { node: g, anim: gemAnim } = this.mkSpriteNode('gem', this.layerArea, 12, 12);
    gemAnim.autoSize = false;
    if (gemFrames.length) { gemAnim.setClips({ play: gemFrames }); gemAnim.play('play', true); }
    // 用户要求「经验弄小一些」：基准 12px，三档 0.85 / 1.0 / 1.15
    const tier = e.exp >= 12 ? 1.15 : e.exp >= 4 ? 1.0 : 0.85;
    g.setPosition(e.x, ARENA_H - e.y, 0);
    g.setScale(tier, tier, 1);
    const a = this.rs.rng.range(0, Math.PI * 2);
    this.gems.push({ node: g, x: e.x, y: e.y, v: e.exp, pop: 0.22, base: tier,
      vx: Math.cos(a) * 60, vy: Math.sin(a) * 60 });
  }

  /** 回血反馈冷却（避免每帧刷屏） */
  private healFxCd = 0;

  /** 回血反馈：角色头顶冒绿色 "+N"，身上播一次回血动画（带 0.35s 冷却 + 数值合并） */
  private healFeedback(amount: number) {
    this.healAccum += amount;
    if (this.healFxCd > 0) return;          // 冷却中：先攒着，冷却结束合成一个数字
    this.healFxCd = 0.35;
    const total = this.healAccum;
    this.healAccum = 0;
    this.addHealText(this.px, this.py - 18, total);
    this.addVfx('support/heal/heal', this.px, this.py, 0.55, 1.2);
  }
  private healAccum = 0;

  /** 绿色回血数字（和伤害数字同一条层，向上飘） */
  private addHealText(x: number, y: number, amount: number) {
    const n = new Node('heal'); n.parent = this.layerText;
    const l = n.addComponent(Label);
    l.string = '+' + Math.max(1, Math.round(amount));
    l.fontSize = 15;
    l.lineHeight = 18;
    l.color = new Color(120, 230, 140);
    const ut = n.addComponent(UITransform); ut.setContentSize(60, 22);
    n.setPosition(x, ARENA_H - y, 0);
    this.fx.push({ node: n, anim: null as unknown as FrameAnim, t: 0, life: 0.8 });
  }

  private addDamageText(x: number, y: number, dmg: number, crit: boolean, kind?: 'poison' | 'burn') {
    const n = new Node('dmg'); n.parent = this.layerText;
    const l = n.addComponent(Label);
    l.string = String(dmg);
    // 用户要求：数字小一号；暴击用**红色**
    // 用户要求：数字再小一号；持续伤害用更小的字号 + 状态色（毒=绿 / 烧=橙红）
    l.fontSize = kind ? 9 : (crit ? 12 : 10);
    l.lineHeight = kind ? 11 : (crit ? 14 : 12);
    l.color = kind === 'poison' ? new Color(150, 230, 160, 255)
      : kind === 'burn' ? new Color(255, 160, 110, 255)
        : crit ? new Color(240, 70, 62, 255) : new Color(255, 255, 255, 255);
    const ut = n.addComponent(UITransform); ut.setContentSize(60, 24);
    n.setPosition(x, ARENA_H - y, 0);
    this.fx.push({ node: n, anim: null as unknown as FrameAnim, t: 0, life: 0.75 });
  }

  // ============================================================
  //  主循环
  // ============================================================
  update(dtRaw: number) {
    if (!this.running || !this.rs || this.paused) return;
    let dt = dtRaw * this.timeScale;
    if (this.hitstop > 0) { dt = dtRaw * HITSTOP_SCALE; this.hitstop = Math.max(0, this.hitstop - dtRaw); }
    // 回血预算每秒清零
    this.runTime += dt;
    if (this.shield > 0) {
      this.shieldT -= dt;
      if (this.shieldT <= 0) { this.shield = 0; this.shieldT = 0; }
    }
    this.healBudgetSec += dt;
    if (this.healBudgetSec >= 1) { this.healBudgetSec -= 1; this.healBudgetSpent = 0; }

    this.rs.runTime += dtRaw;
    this.updatePlayer(dt);
    this.updateSkills(dt);
    this.updateSpawn(dt);
    this.updateBossMechanics();
    this.updateNewSkillTypes(dt);
    this.updateEnemies(dt);
    this.updateBullets(dt);
    this.updateAreas(dt);
    this.updateMeteors(dt);
    this.updateEcho(dt);
    this.updateGems(dt);
    this.updateBolts(dt);
    this.updateFx(dtRaw);
    this.checkWaveEnd(dt);
    if (this.hurtFlash > 0) this.hurtFlash = Math.max(0, this.hurtFlash - dtRaw * 2.2);
    if (this.hurtBoostT > 0) this.hurtBoostT = Math.max(0, this.hurtBoostT - dtRaw);
    if (this.waveEnding) {
      this.waveEndT += dtRaw;
      // ★ M33 #2：**等经验全部吸完**（0.6s 起步 + 3.2s 兜底）再开升级卡；
      //   升级卡全部选完才进商店（finishWave）。一次升多级 = 连开多次。
      const settled = this.gems.length === 0 || this.waveEndT > 3.2;
      if (!this.waveAbsorbDone && this.waveEndT > 0.6 && settled) {
        this.waveAbsorbDone = true;
        if (this.waveEndUps > 0) {
          const n = this.waveEndUps;
          this.waveEndUps = 0;
          this.waveEndPending = true;       // 弹完再收尾
          this.onLevelUp(n);
        } else {
          this.waveEnding = false;
          this.finishWave();
        }
      }
    }
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
    if (this.healFxCd > 0) this.healFxCd -= dt;
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
      // 铁拳骑士：受击后 2s 内攻击力 +20%（角色被动，之前只有描述）
      const atkMul = (this.rs.charId === 'knight' && this.hurtBoostT > 0) ? 1.2 : 1;
      const rt = calcSkill(this.rs.skills[i], this.rs.stats, atkMul);
      this.skillT[i] = rt.cd;
      this.atkT = 0.3;
      this.fireSkill(i, rt);
    }
  }

  /** 当前存活敌人数（死亡动画中的不计） */
  private aliveCount(): number {
    let n = 0;
    for (const e of this.enemies) if (!e.dead) n++;
    if (n > this.maxAlive) this.maxAlive = n;
    if (n > this.waveAliveMax) this.waveAliveMax = n;
    return n;
  }

  /** 四个新技能类型的运行时（环刃 / 地雷 / 哨兵 / 蓄能） */
  private updateNewSkillTypes(dt: number): void {
    // 环刃：旋转 + 每 0.25s 结算一次环带内的敌人
    for (const key of Object.keys(this.orbits)) {
      const slot = Number(key);
      const o = this.orbits[slot];
      o.rot += dt * 1.4 * Math.PI * 2;
      o.tick += dt;
      if (o.tick < 0.25) continue;
      o.tick = 0;
      const band = o.radius + 10;
      for (const e of this.enemies) {
        if (e.dead) continue;
        const d = Math.hypot(e.x - this.px, e.y - this.py);
        if (d <= band) this.hitEnemy(e, 1.5 * o.n, o.rt, undefined, true);
      }
    }
    // 地雷：0.6s 后进入待触发，敌人踩到即爆
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const tr = this.traps[i];
      tr.t += dt;
      if (!tr.armed) { if (tr.t >= 0.6) tr.armed = true; continue; }
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - tr.x, e.y - tr.y) <= 16) {
          this.explodeTrap(tr);
          this.traps.splice(i, 1);
          break;
        }
      }
    }
    // 哨兵：每 0.9s 射一发，8s 后消失；伤害来源 summon（不触发玩家 onhit）
    for (let i = this.sentries.length - 1; i >= 0; i--) {
      const sn = this.sentries[i];
      sn.t += dt;
      if (sn.t >= 8) { this.sentries.splice(i, 1); continue; }
      sn.cd -= dt;
      if (sn.cd > 0) continue;
      const tgt = this.nearestEnemy(sn.x, sn.y, 160);
      if (!tgt) continue;
      sn.cd = 0.9;
      this.hitEnemy(tgt, sn.dmg, sn.rt, undefined, true, 'summon');
    }
    // 蓄能：3s 后结算（目标死亡则溅射；空放返还剩余冷却 50%）
    for (const key of Object.keys(this.charges)) {
      const slot = Number(key);
      const c = this.charges[slot];
      c.t += dt;
      if (c.t < 3) continue;
      delete this.charges[slot];
      const tgt = this.nearestEnemy(this.px, this.py, 200);
      if (!tgt) { this.skillT[slot] = Math.max(0, (this.skillT[slot] ?? 0) * 0.5); continue; }
      this.hitEnemy(tgt, c.dmg, c.rt, undefined, true);
      for (const e of this.enemies) {
        if (e.dead || e === tgt) continue;
        if (Math.hypot(e.x - tgt.x, e.y - tgt.y) <= c.r) this.applyRawDamage(e, c.dmg * 0.4);
      }
    }
  }

  /** 地雷引爆：48px 内全部受伤（来源 normal，可吃常规加成） */
  private explodeTrap(tr: { x: number; y: number; dmg: number; rt: SkillRuntime }): void {
    this.addVfx(FX.killBig, tr.x, tr.y, 0.45, 2.2);
    for (const e of this.enemies) {
      if (e.dead) continue;
      if (Math.hypot(e.x - tr.x, e.y - tr.y) <= 48) this.hitEnemy(e, tr.dmg, tr.rt, undefined, true);
    }
  }

  /** 荆棘外衣：受击反弹 12 点（0.5s 内置 CD） */
  private tryThorncoat(attacker: Enemy): void {
    if (!this.rs.hasItem('thorncoat')) return;
    if (this.runTime - this.thorncoatAt < THORNCOAT_CD) return;
    this.thorncoatAt = this.runTime;
    this.applyRawDamage(attacker, THORNCOAT_DMG);
  }

  /** BOSS 难度机制：地狱狂怒 / 噩梦召唤（状态机驱动） */
  private updateBossMechanics(): void {
    const boss = this.bossRef;
    if (!boss || boss.dead) { this.bossSummon?.onBossDead(); return; }
    const cfg = difficultyOf(this.rs.difficulty);

    // 地狱：血量 <30% 进入狂怒（一次性）
    const enr = cfg.rules.find(r => r.kind === 'bossEnrage');
    if (enr && enr.kind === 'bossEnrage' && !boss.enraged && boss.maxhp > 0 && boss.hp / boss.maxhp < enr.thresholdPct / 100) {
      boss.enraged = true;
      boss.dmg *= enr.dmgMul;
      boss.spd *= enr.speedMul;
    }

    // 噩梦：按状态机召唤（每个阈值一次、12s 间隔、同屏 <=6）
    const sum = cfg.rules.find(r => r.kind === 'bossSummon');
    if (!sum || sum.kind !== 'bossSummon') return;
    if (!this.bossSummon) this.bossSummon = new BossSummonState(sum);
    let alive = 0;
    for (const e of this.enemies) if (!e.dead && e.summoned) alive++;
    const n = this.bossSummon.update(boss.maxhp > 0 ? (boss.hp / boss.maxhp) * 100 : 100, this.runTime, alive);
    for (let i = 0; i < n; i++) {
      const ang = this.rs.rng.range(0, Math.PI * 2);
      this.spawnEnemy('goblin', boss.x + Math.cos(ang) * 40, boss.y + Math.sin(ang) * 40, 1);
      const e = this.enemies[this.enemies.length - 1];
      if (e) { e.summoned = true; e.maxhp *= sum.hpMul; e.hp = e.maxhp; e.dmg *= sum.dmgMul; }
    }
  }

  private updateSpawn(dt: number) {
    // 波次结算中（吸经验 / 等升级卡）不再刷怪 —— 用户反馈"波次结束了还在出怪"
    if (this.waveEnding) return;
    if (this.bossRef && !this.bossRef.dead) return;
    // ★ 活怪上限（玩法审计 §8.2）：硬上限停刷，软上限把间隔拉长，避免同屏无限堆积
    const caps = aliveCaps();
    const alive = this.aliveCount();
    if (alive >= caps.hard) return;
    const plan = spawnPlan(this.rs.wave);
    const interval = spawnInterval(alive >= caps.soft ? plan.interval * caps.slowMul : plan.interval, this.rs.difficulty);
    this.spawnAcc += dt;
    if (this.spawnAcc < interval) return;
    this.spawnAcc = 0;
    const pool = this.rs.spawnPool;
    if (!pool.length) return;
    for (let i = 0; i < plan.batch; i++) {
      const p = this.spawnPt();
      this.spawnEnemy(this.rs.rng.pick(pool), p.x, p.y);
    }
    // 难度规则：休闲前 N 波禁精英；地狱指定波次保底至少 1 只
    const dcfg = difficultyOf(this.rs.difficulty);
    const noElite = dcfg.rules.some(r => r.kind === 'noEliteUntilWave' && this.rs.wave <= r.wave);
    const guaranteed = dcfg.rules.some(r => r.kind === 'eliteGuaranteedWaves' && r.waves.indexOf(this.rs.wave) >= 0);
    if (!noElite && this.rs.wave > 1 && this.waveLeft > 0) {
      const prog = 1 - this.waveLeft / waveTime(this.rs.wave);
      const want = Math.max(this.rs.elitesThisWave, guaranteed ? 1 : 0);
      if ((prog > 0.3 || guaranteed) && this.elitesSpawned < want) {
        this.elitesSpawned++;
        const p = this.spawnPt();
        this.spawnEnemy('gnollberserker', p.x, p.y, 1 + 0.2 * this.rs.wave);
        this.shake(SHAKE.elite);
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
      // ── 持续伤害状态（M48）：中毒 / 灼烧，每 0.5s 结算一次 ──
      if (e.poisonT > 0 || e.burnT > 0) {
        e.dotTick -= dt;
        if (e.dotTick <= 0) {
          e.dotTick = 0.5;
          let dot = 0;
          if (e.poisonT > 0) { dot += e.poisonDmg; e.poisonT = Math.max(0, e.poisonT - 0.5); }
          if (e.burnT > 0) { dot += e.burnDmg; e.burnT = Math.max(0, e.burnT - 0.5); }
          if (dot > 0) {
            e.hp -= dot;
      this.waveDmgDealt += Math.min(dot);
            this.addDamageText(e.x, e.y - 10, dot, false, e.poisonT > 0 ? 'poison' : 'burn');
            if (e.hp <= 0) { this.killEnemy(e); continue; }
          }
        }
      } else {
        e.dotTick = 0;
      }

      const spdMul = e.slow > 0 ? 1 - (e.slowPct ?? 0.35) : 1;   // 冷静的份数会提高减速比例
      const a = Math.atan2(this.py - e.y, this.px - e.x);

      // ── AI 状态机（玩法审计 §8.5/§8.6）：冲锋预警 → 冲锋 → 恢复；BOSS 额外有范围砸地 ──
      const canCharge = (e.elite || e.boss);
      if (canCharge && e.spawnT <= 0) {
        if (e.aiCd > 0) e.aiCd -= dt;
        if (e.aiState === 'idle') {
          if (e.aiCd <= 0) {
            const AI = balance().ai;
            if (e.boss && e.aiNext === 'slam') {
              e.aiState = 'slam'; e.aiT = AI.bossSlamTele;
              this.addVfx('ground/ring/cast-circle', e.x, e.y, 0.9, 2.6);   // 预警：范围提示
            } else {
              e.aiState = 'tele'; e.aiT = e.boss ? balance().ai.bossChargeTele : balance().ai.eliteChargeTele;
              e.aiDX = Math.cos(a); e.aiDY = Math.sin(a);
              this.addVfx(FX.spawnWarn, e.x + e.aiDX * 26, e.y + e.aiDY * 26, 0.7, 2.2);  // 预警：冲锋方向
            }
          }
        } else if (e.aiState === 'tele') {
          e.aiT -= dt;
          if (e.aiT <= 0) {
            const AI = balance().ai;
            e.aiState = 'dash'; e.aiT = e.boss ? AI.bossChargeDash : AI.eliteChargeDash;
          }
          e.x -= Math.cos(a) * e.spd * 0.25 * dt;   // 蓄力时后撤一点，给玩家反应
          e.y -= Math.sin(a) * e.spd * 0.25 * dt;
        } else if (e.aiState === 'dash') {
          e.aiT -= dt;
          const AI = balance().ai;
          e.x += e.aiDX * e.spd * AI.chargeSpeedMul * dt;
          e.y += e.aiDY * e.spd * AI.chargeSpeedMul * dt;
          if (e.aiT <= 0) { e.aiState = 'rec'; e.aiT = e.boss ? AI.bossChargeRec : AI.eliteChargeRec; }
        } else if (e.aiState === 'slam') {
          e.aiT -= dt;
          if (e.aiT <= 0) {
            // 结算：玩家在半径 70 内才吃伤害（预警 0.9s 已经给足移动时间）
            const d2 = Math.hypot(this.px - e.x, this.py - e.y);
            this.addVfx('core/burst/warm-explosion', e.x, e.y, 0.5, 2.8);
            this.shake(SHAKE.elite);
            const AI2 = balance().ai;
            if (d2 < AI2.bossSlamRadius && this.inv <= 0) {
              let dm = playerTakenDamage(Math.round(e.dmg * AI2.bossSlamMul), this.rs.stats);
              if (this.shield > 0) { const a = Math.min(this.shield, dm); this.shield -= a; dm -= a; }
              this.rs.stats.hp -= dm;
              this.tryThorncoat(e);
        this.waveDmg += dm; this.totalDmg += dm;
              this.inv = Math.max(0.2, this.rs.stats.invuln ?? 0.8);
              this.dmgFlash = 1; this.hurtFlash = 1;
              if (this.rs.charId === 'knight') this.hurtBoostT = 2.0;
              Sfx.sfx('hitHeavy', 0.5, 200);
            }
            e.aiState = 'rec'; e.aiT = 0.5;
          }
        } else if (e.aiState === 'rec') {
          e.aiT -= dt;
          if (e.aiT <= 0) {
            e.aiState = 'idle';
            e.aiCd = e.boss ? balance().ai.bossChargeCd : balance().ai.eliteChargeCd;
            e.aiNext = e.aiNext === 'charge' ? 'slam' : 'charge';
          }
        }
        // 冲锋/砸地期间不普通追击
        if (e.aiState !== 'idle') {
          this.place(e.node, e.x, e.y);
          continue;
        }
      }

      e.x += Math.cos(a) * e.spd * spdMul * dt;
      e.y += Math.sin(a) * e.spd * spdMul * dt;
      e.x += e.kx * dt * 4; e.y += e.ky * dt * 4; e.kx *= 0.86; e.ky *= 0.86;
      e.walkT += dt;
      // ★ 敌人动画：以前永远停在 idle（setClips 默认播 idle），走路看着就是"待机贴图在平移"
      //   （用户反馈 M30 #2）。攻击中播 attack，其余时间播 walk。
      if (e.atkT > 0) e.anim.playOnce('attack');
      else e.anim.play('walk');
      if (Math.abs(Math.cos(a)) > 0.15) e.facing = Math.cos(a) > 0 ? 1 : -1;
      this.place(e.node, e.x, e.y);
      const s = e.node.scale;
      e.node.setScale(e.facing < 0 ? -Math.abs(s.x) : Math.abs(s.x), s.y, 1);
      // M62：BOSS 头顶标牌不能跟着身体镜像（否则 BOSS 会变成「SSO8」）
      if (e.boss) {
        const tag = e.node.getChildByName('bossTag');
        const inv = 1 / (e.visScale || 1);
        if (tag && tag.isValid) tag.setScale((e.facing < 0 ? -1 : 1) * inv, inv, 1);
      }
      // 精英 / BOSS 身体泛光：缓慢呼吸（±5%），让它在混战里"活着"但不闪眼
      if (e.elite || e.boss) {
        const pulse = 1 + 0.05 * Math.sin(e.animT * 3.2);
        const g1 = (e.node as unknown as { _glow?: Node })._glow;
        const g2 = (e.node as unknown as { _glow2?: Node })._glow2;
        if (g1 && g1.isValid) g1.setScale(pulse, pulse, 1);
        if (g2 && g2.isValid) g2.setScale(pulse, pulse, 1);
      }
      const bodyNode = e.node.getChildByName('body') ?? e.node;
      const sp = bodyNode.getComponent(Sprite);
      if (sp) {
        if (e.flash > 0) sp.color = new Color(255, 150, 150, 255);          // 受击闪白红
        else if (e.poisonT > 0) sp.color = new Color(165, 230, 165, 255);   // 中毒：淡绿
        else if (e.burnT > 0) sp.color = new Color(255, 165, 130, 255);     // 灼烧：淡红
        else if (sp.color.r !== 255 || sp.color.g !== 255) sp.color = new Color(255, 255, 255, 255);
      }

      const d = Math.hypot(this.px - e.x, this.py - e.y);
      if (d < e.r + 12 && this.inv <= 0) {
        // 第三轮批准：屠魔者 = 受到精英/BOSS 伤害 -10%
        const bossGuard = (e.elite || e.boss) ? (1 - Math.min(0.5, this.rs.stats.bossArmor ?? 0)) : 1;
        let dm = playerTakenDamage(e.dmg, this.rs.stats, bossGuard);
        if (this.shield > 0) { const a = Math.min(this.shield, dm); this.shield -= a; dm -= a; }
        this.rs.stats.hp -= dm;
        this.tryThorncoat(e);
        this.waveDmg += dm; this.totalDmg += dm;
        // 受击无敌帧 0.55 -> 0.80（2026-10-13 实测标定）
        // 原来 0.55s 把承伤封顶在 ~11 伤害/秒，120 血只够撑 11 秒，而一波 18 秒 ——
        // 密度一提上来就必死。放宽到 0.80 秒后封顶 ~7.5/秒，才留得出走位空间。
        this.inv = Math.max(0.2, this.rs.stats.invuln ?? 0.80);   // ★ 受击无敌帧 = 属性
        this.dmgFlash = 1;
        e.atkT = 0.34;
        if (FxPrefs.hurt) this.hurtFlash = 1;   // HUD 用它做"屏幕边缘红光一闪"（可关）
        if (this.rs.charId === 'knight') this.hurtBoostT = 2.0;   // 骑士受击强化 2s
        Sfx.sfx('hitMetal', 0.4, 180);      // 玩家挨打
        this.shake(SHAKE.hurt);
        // ★ 刺猬：基础 6 点/份（Ⅱ = 1.6 份 → 9.6 点），按效果份数结算
        const thorn = this.thornEffect();
        if (thorn > 0) {
          const back = Math.round(6 * thorn);
          e.hp -= back;
      this.waveDmgDealt += Math.min(back);
          this.addDamageText(e.x, e.y - 10, back, false);
          this.addVfx('core/spark/block-spark', e.x, e.y, 0.3, 1.2);
          if (e.hp <= 0) this.killEnemy(e);
        }
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
        // ★ 回旋：到点后朝玩家折返，回程清空命中表（同一只怪能再吃一次）
        if (b.returning) {
          b.outT = Math.max(0, (b.outT ?? 0) - dt);
          if (b.outT <= 0) {
            if (!b.returned) { b.returned = true; b.hit.clear(); }
            const dx = this.px - b.x, dy = this.py - b.y;
            const d = Math.hypot(dx, dy) || 1;
            const sp = Math.hypot(b.vx, b.vy) || 200;
            b.vx = (dx / d) * sp * 1.15;      // 回程略快
            b.vy = (dy / d) * sp * 1.15;
            if (d < 26) b.life = 0;           // 回到手上就消失
          }
        }
        b.x += b.vx * dt; b.y += b.vy * dt;
      }
      b.node.setPosition(b.x, ARENA_H - b.y, 0);
      // ⚠️ 投射物素材**全部头朝右**（实测：fireball-shot / ice-shard-shot / energy-bolt / plasma-shot /
      //    poison-dart 都是"头在右、尾在左"）。这里原多减了 90°（按"素材朝上"算）→ 火球/箭全都横着飞。
      //    用户反馈「火球不要横着发射出去」即此。
      // 回旋刃回程时自转，视觉上能看出"转着回来"
      if (b.returning && b.returned) b.spinAngle = (b.spinAngle ?? 0) + 720 * dt;
      b.node.angle = -Math.atan2(b.vy, b.vx) * 180 / Math.PI + (b.spinAngle ?? 0);

      for (const e of this.enemies) {
        if (e.dead || b.hit.has(e)) continue;
        if (Math.hypot(e.x - b.x, e.y - b.y) < e.r + b.r) {
          b.hit.add(e);
          this.hitEnemy(e, b.dmg, this.bulletRt(b), b.hitVfx);
          // ★ 传染（M49）：**不是穿过去**，而是从这只怪身上"跳"到附近的另一只——
          //   劈一道链式闪电 + 追加 80% 伤害，本体到此结束（和穿透/反弹完全不同）
          if (b.chain > 0) {
            // ⚠️ B6：原来不管 chain 有几份，都只跳 1 次就终止弹体。
            //    现在按份数连续跳（每跳 70% 伤害、命中表去重，避免来回跳同一只）。
            let from = e;
            while (b.chain > 0) {
              b.chain--;
              const nx = this.nearestEnemy(from.x, from.y, 150, b.hit);
              if (!nx) break;
              b.hit.add(nx);
              this.spawnBolt(from.x, from.y, nx.x, nx.y);
              this.addVfx('chain/chain-node', nx.x, nx.y, 0.3, 1);
              this.hitEnemy(nx, b.dmg * 0.7, this.bulletRt(b), b.hitVfx);
              from = nx;
            }
            b.life = 0;
            break;
          }
          // M4 返程斩：只有 return 标签技能的返程阶段、且本次返程未结算过
          if (b.returning && !b.returnHit) {
            const rs4 = this.modStacks('returnstrike');
            if (rs4 > 0) {
              b.returnHit = true;
              this.applyRawDamage(e, b.dmg * returnstrikePct(rs4));
            }
          }
          // ★ 分裂（M49）：命中时炸成 2 枚小子弹（和"扇射"的发射时散射区分开）
          if (b.split > 0 && !b.splitDone) {
            b.splitDone = true;
            const base = Math.atan2(b.vy, b.vx);
            // 份数 → 子弹数（1 份 2 枚，2 份 3 枚，3 份 4 枚），角度均匀散开
            const cnt = splitBullets(b.split);
            for (let k = 0; k < cnt; k++) {
              const spread = cnt <= 1 ? 0 : 1.4 / (cnt - 1);
              const ang = base + (k - (cnt - 1) / 2) * spread;
              this.spawnBullet(b.x, b.y, Math.cos(ang) * 170, Math.sin(ang) * 170,
                // 第三轮批准：衍生弹伤害 40%（原 50%），且 split:0 保证不再递归
                { ...this.bulletRt(b), dmg: b.dmg * 0.4, pierce: 0, bounce: 0, chain: 0, split: 0, burn: 0 },
                undefined, b.hitVfx, false, false, 0.55);
            }
          }
          // ★ 反弹（M49）：弹体不消失，**转向**附近另一个敌人继续飞
          let bounced = false;
          if (b.bounce > 0) {
            b.bounce--;
            const nx = this.nearestEnemy(e.x, e.y, 200, b.hit);
            if (nx) {
              const ang = Math.atan2(nx.y - b.y, nx.x - b.x);
              const sp = Math.hypot(b.vx, b.vy) || 200;
              b.vx = Math.cos(ang) * sp; b.vy = Math.sin(ang) * sp;
              // 第三轮批准：反弹每次伤害 ×0.8（原来不衰减，会越弹越强）
              b.dmg = b.dmg * 0.8;
              b.life = Math.max(b.life, 0.9);
              bounced = true;
            }
          }
          if (!bounced && b.hit.size > b.pierce + 1) { b.life = 0; break; }
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
      echo: 0, burn: b.burn ?? 0, slow: b.slow ?? 0, vamp: b.vamp ?? 0, thunder: b.thunder ?? 0,
      thornmail: 0, harvest: false };
  }

  private updateAreas(dt: number) {
    for (const a of this.areas) {
      a.t += dt;
      if (a.kind === 'pulse') {
        a.r = a.maxR * Math.min(1, a.t / a.life);
        // ★ M33 #3：脉冲的**画面**也要跟着扩散（之前节点固定 r*2，看着像"闪了一下"）
        const k = Math.max(0.15, a.r / a.maxR);
        if (a.node && a.node.isValid) a.node.setScale(k, k, 1);
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
          // 地刺：每次跳动从地里再冒一组刺（错开一点位置，像连环穿刺）
          if (a.tag === 'spike') {
            const rnd = this.rs.rng.range(0, Math.PI * 2);
            const off = this.rs.rng.range(0, a.maxR * 0.35);
            this.spawnSpikeField(a.x + Math.cos(rnd) * off, a.y + Math.sin(rnd) * off, a.maxR * 0.75);
          }
          for (const e of this.enemies) {
            if (e.dead || Math.hypot(e.x - a.x, e.y - a.y) >= a.r + e.r) continue;
            this.hitEnemy(e, a.dmg, this.bulletRt2(a.dmg));
            // 灼烧（M48）：区域技能也挂状态
            if (a.burn) {
              e.burnT = Math.max(e.burnT, 2.0);
              e.burnDmg = Math.max(e.burnDmg, Math.max(1, Math.round(a.dmg * 0.8)));
            }
            // 毒雾（M48）：站进去就挂 2s 中毒（淡绿 + 每 0.5s 掉血）
            if (a.tag === 'poison') {
              e.poisonT = Math.max(e.poisonT, 2.0);
              e.poisonDmg = Math.max(e.poisonDmg, Math.max(1, Math.round(a.dmg * 0.8)));
            }
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

  private gemT = 0;
  private updateGems(dt: number) {
    const st = this.rs.stats;
    this.gemT += dt;
    for (const g of this.gems) {
      if (!g.node || !g.node.isValid) continue;
      if (g.pop > 0) { g.x += g.vx * dt; g.y += g.vy * dt; g.vx *= 0.88; g.vy *= 0.88; g.pop -= dt; }
      const dx = this.px - g.x, dy = this.py - g.y;
      const d = Math.hypot(dx, dy) || 0.01;
      // 波次结算期：等待 0.5 秒"吸收感"之后，全场宝石无视拾取半径直接飞向玩家
      const vacuum = this.waveEnding && this.waveEndT > 0.5;
      const pick = vacuum ? 1e9 : st.pickup;
      if (d < pick) {
        // ★ M33 #2：波末吸取要**看得见**（参考土豆兄弟）。以前 vacuum 用 1e9 半径 + 3.4 倍速度，
        //   相当于瞬间吸完、玩家只看到经验条跳一下。现在远处的球要飞 1~1.5 秒，
        //   过程里还能听到一串拾取音。
        const pull = vacuum ? 0.35 + 0.65 * Math.min(1, 40 / d) : 1 - d / pick;
        const speed = vacuum ? (260 + 440 * pull) : (170 + 430 * pull);
        const sp = speed * dt;
        g.x += dx / d * sp; g.y += dy / d * sp;
      }
      // 脉动：静态背景上"会呼吸"的小宝石，远看也能注意到（乘在分档大小上）
      const k = 1 + 0.10 * Math.sin(this.gemT * 7 + g.x * 0.05);
      g.node.setScale(g.base * k, g.base * k, 1);
      if (d < 17) {
        g.node.destroy();
        Sfx.sfx('pickup', 0.16, 90);
        this.addVfx('feedback/pickup/exp-gain', g.x, g.y, 0.22, 0.55);   // 拾取反馈
        // 用户要求：波次结束的**全屏吸取经验减半**（原地捡是全额）
        const gain = this.waveEnding ? g.v * balance().exp.waveEndMul : g.v;
        const ups = this.rs.addExp(gain);
        if (ups > 0) {
          // 波末吸到的经验先记账，**等全部吸完**再开升级卡（M33 #2）
          if (this.waveEnding) this.waveEndUps += ups;
          else this.onLevelUp(ups);
        }
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
    if (this.waveEnding) return;                    // 结算中：走 updateGems 收经验，别重复触发
    // BOSS 波没有倒计时，靠击杀推进（bossDefeated 在回收 BOSS 节点时置位）
    if (this.bossDefeated) { this.bossDefeated = false; this.beginWaveEnd(); return; }
    if (this.waveLeft <= 0) return;
    this.waveLeft -= dt;
    if (this.waveLeft > 0) return;
    this.beginWaveEnd();
  }

  /** 波次结束：残留敌人直接移除，**不给经验 / 金币 / 掉落**（M35 #1） */
  private despawnAllEnemies() {
    // ⚠️ 修复"怪物尸体有时不消失"：旧实现跳过 dead 的怪，但随后把 enemies 清空，
    //    正在播死亡动画的节点就再也没人回收 → 尸体永久留在场上。
    for (const e of this.enemies) {
      if (e.node && e.node.isValid) e.node.destroy();
    }
    this.enemies = [];
    if (this.bossRef) { this.bossRef = null; this.bossAlive = null; }
  }

  /** 波次结束清场：把纯表现层的残留全部回收（经验宝石保留 —— 还要吸） */
  private clearFieldFx() {
    const kill = (n?: Node) => { if (n && n.isValid) n.destroy(); };
    for (const b of this.bullets) kill(b.node);
    this.bullets = [];
    for (const a of this.areas) kill(a.node);
    this.areas = [];
    for (const f of this.fx) kill(f.node);
    this.fx = [];
    for (const bo of this.bolts) kill(bo.node);
    this.bolts = [];
    for (const m of this.meteors) kill(m.node);
    this.meteors = [];
    this.echoQueue = [];
  }

  /**
   * 本波结束 —— 用户要求（2026-10-17）：
   *   「结束不要立刻跳下一关，等一会、把全场经验吸干净，再进奖励选择，类似土豆兄弟」
   * 所以这里只做三件事：清场 / 结算金币 / 进入"吸收经验"状态，
   * 界面切换交给 finishWave()（经验吸完、升级弹窗也处理完之后）。
   *
   * ⚠️ 顺带修了一个 bug：BOSS 波此前走的是 `advanceWave()` —— **直接开下一波、跳过了商店**。
   *    现在和普通波走同一条结束路径，商店正常出现。
   */
  private beginWaveEnd() {
    // ★ 清场：飞行物 / 范围特效 / 召唤物 / 闪电都要在**本波结束时**销毁。
    //   以前只清了敌人，毒雾、刃暴的地面环、飞着的火球会一路飘到商店甚至下一波
    //   （用户反馈「上一波技能特效会保留到下一波」，M30 #3）。
    //   顺序：先清残留，再让敌人死亡 —— 这样击杀特效还能正常播完（它们自己有生命周期）。
    this.clearFieldFx();
    // ★ M35 #1：波次结束**不再把残怪打死换经验**（用户："不要把怪物杀死再给经验"）。
    //   经验只来自玩家之前打掉、还留在地上的球；残怪直接消失。
    this.despawnAllEnemies();
    const gain = this.rs.waveClearGold();
    console.log(`[Battle] 第 ${this.rs.wave} 波通过  +${gain} 金币  总计 ${this.rs.gold}  Lv${this.rs.lv}`);
    // 战斗日志：每波一行（之后可在控制台 __logs() / 设置页导出）
    telemetryWaveEnd({
      wave: this.rs.wave, kills: this.rs.kills, lv: this.rs.lv, gold: this.rs.gold,
      aliveMax: this.waveAliveMax, hp: this.rs.stats.hp,
      dmgTaken: this.waveDmg, dmgDealt: Math.round(this.waveDmgDealt),
    });
    this.waveEnding = true;
    this.waveEndT = 0;
    this.waveEndUps = 0;
    this.waveAbsorbDone = false;
  }

  /** 经验吸完（且升级弹窗处理完）才真正切屏 */
  /** 每波结束的固定恢复（不吃难度回血预算，属于节奏设计） */
  private waveClearHeal(): void {
    const st = this.rs.stats;
    const heal = Math.min(Math.max(4, Math.round(st.maxhp * 0.06)), st.maxhp - st.hp);
    if (heal > 0) {
      st.hp += heal;
      this.addVfx(FX.killBig, this.px, this.py, 0.4, 1.6);
    }
  }

  private finishWave() {
    this.waveClearHeal();
    if (this.pendingUps > 0) { this.waveEndPending = true; return; }   // 还有升级卡要选
    this.paused = true;
    this.hooks.onWaveCleared?.();
  }

  /** 由 GameRoot 在商店点"下一波"时调用 */
  advanceWave() {
    if (!this.running) return;      // 局已结束：不再推进波次
    const next = this.rs.wave + 1;
    if (next > RUN.waves && !this.rs.endless) { this.running = false; this.hooks.onClear?.(); return; }
    console.log('[Battle] 进入第 ' + next + ' 波');
    this.paused = false;
    void this.startWave(next);
  }

  private onLevelUp(_ups: number) {
    Sfx.sfx('levelUp', 0.6, 300);
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
    // 若本波已结束、经验也吸完了，只是卡在升级弹窗上 -> 现在把波次收尾（进商店）
    if (this.waveEndPending) { this.waveEndPending = false; this.finishWave(); return; }
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
