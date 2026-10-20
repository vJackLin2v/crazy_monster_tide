/**
 * 工程入口 + 流程控制
 *
 * 职责：把「屏幕」和「战斗」串起来。屏幕只画 + 回调，战斗只负责打，
 * 什么时候弹什么屏全部由这里决定（规格 §2 的 11 屏流程）。
 *
 * 流转：menu ─开始游戏→ charselect ─开始闯关→ battle
 *       battle ─波次结束→ shop ─下一波→ battle
 *       battle ─升级→ levelup（模态）→ 选完继续
 *       battle ─阵亡/通关→ result
 *       battle ─暂停键→ build 抽屉
 */
import { _decorator, Component, Node, view, ResolutionPolicy } from 'cc';
import { SCREEN_W, SCREEN_H, RUN, waveTime, isBossWave, isEliteWave } from './core/Const';
import { Joystick } from './engine/Joystick';
import { Battle } from './battle/Battle';
import { mkNode } from './ui/UIKit';
import { Hud, type HudData } from './ui/Hud';
import { buildMenu, buildHowto, buildCharSelect, buildResult, type ResultBuildRow } from './ui/MenuScreens';
import { buildLevelUp, buildShop, buildBuildDrawer, buildConfirm, type CardData, type ShopSlotView } from './ui/Modals';
import { buildInstall, buildReplace } from './ui/ManageScreens';
import { CHARS } from './data/Chars';
import { SKILLS, SKILL_ART } from './data/Skills';
import { Assets, preloadIcons } from './engine/Assets';
import { Sfx } from './engine/Audio';
import { MODULES } from './data/Modules';
import { ITEMS } from './data/Items';
import { ITEM_ICON, MODULE_ICON, ATTR_ICON } from './data/IconMap';
import { ATTRS } from './data/Attrs';
import { calcSkill, isCompatible, MAX_SLOTS } from './game/SkillCalc';
import type { Reward } from './game/RunState';
const { ccclass } = _decorator;

type Phase = 'menu' | 'howto' | 'charselect' | 'battle' | 'shop' | 'result';

@ccclass('GameRoot')
export class GameRoot extends Component {
  private uiRoot!: Node;
  private battleNode!: Node;
  private joyNode!: Node;
  private battle!: Battle;
  private joy!: Joystick;

  private hud: Hud | null = null;
  private cur: Node | null = null;
  private curModal: Node | null = null;
  private phase: Phase = 'menu';
  private charId = CHARS[0].id;
  private seed = 20261012;
  private pendingRewards: Reward[] = [];

  onLoad() {
    // 设计分辨率写死在代码里，不依赖编辑器设置（编辑器里是 1280x720，见 KI-005）
    view.setDesignResolutionSize(SCREEN_W, SCREEN_H, ResolutionPolicy.FIXED_WIDTH);

    this.battleNode = new Node('Battle');
    this.battleNode.parent = this.node;
    this.battle = this.battleNode.addComponent(Battle);

    this.uiRoot = mkNode(this.node, 'UiRoot', SCREEN_W, SCREEN_H);   // 在 Battle 之后 → 盖在上面

    this.joyNode = new Node('Joystick');
    this.joyNode.parent = this.node;
    this.joy = this.joyNode.addComponent(Joystick);
    this.joyNode.active = false;

    this.battle.hooks.onWaveCleared = () => this.showShop();
    this.battle.hooks.onLevelUp = (r) => this.showLevelUp(r);
    this.battle.hooks.onDead = () => this.showResult(false);
    this.battle.hooks.onClear = () => this.showResult(true);

    Sfx.init(this.node);
    void Sfx.preload();
    this.showMenu();
    // 用户反馈「进入游戏时会先卡顿一下」：根因是 startRun 里同步 await 加载
    // 玩家单位 + 全部技能 VFX。改成**开局就在后台预加载**，玩家在菜单停留的时间就把它偷完了。
    void this.preloadAll();
  }

  /** 后台预加载：技能 VFX + 技能图标 + 全部角色单位（不阻塞菜单） */
  private async preloadAll() {
    const t0 = performance.now();
    try {
      const keys = new Set<string>();
      for (const k of Object.keys(SKILL_ART)) {
        const a = SKILL_ART[k];
        if (a.proj) keys.add(a.proj);
        if (a.hit) keys.add(a.hit);
        if (a.aoe) keys.add(a.aoe);
        if (a.zone) keys.add(a.zone);
      }
      for (const k of keys) await Assets.loadVfx(k);
      const icons = Object.keys(SKILL_ART)
        .map(k => SKILL_ART[k].icon)
        .filter((s): s is string => !!s);
      await preloadIcons(icons);
      // 角色单位不在这里加载（角色选择屏会加载全部 6 个）；这里只补 VFX + 图标，避免开场抢带宽
      console.log('[GameRoot] 预加载完成 ' + Math.round(performance.now() - t0) + 'ms');
    } catch (e) {
      console.warn('[GameRoot] 预加载失败（不影响游戏）:', e);
    }
  }

  // ---------- 屏幕切换 ----------
  private clearScreen() {
    if (this.cur && this.cur.isValid) this.cur.destroy();
    this.cur = null;
    this.hud = null;
  }
  private closeModal() {
    if (this.curModal && this.curModal.isValid) this.curModal.destroy();
    this.curModal = null;
  }

  private showMenu() {
    this.phase = 'menu'; this.closeModal(); this.clearScreen();
    Sfx.bgm('menu');
    this.battleNode.active = false; this.joyNode.active = false;
    this.cur = buildMenu(this.uiRoot, this.seed, () => this.showCharSelect(), () => this.showHowto());
  }
  private showHowto() {
    this.phase = 'howto'; this.clearScreen();
    this.cur = buildHowto(this.uiRoot, () => this.showMenu());
  }
  private showCharSelect() {
    this.phase = 'charselect'; this.clearScreen();
    this.cur = buildCharSelect(this.uiRoot, () => this.showMenu(), (id) => { this.charId = id; void this.startBattle(); });
  }

  private async startBattle() {
    this.phase = 'battle'; this.closeModal(); this.clearScreen();
    this.battleNode.active = true; this.joyNode.active = true;
    const hudNode = mkNode(this.uiRoot, 'HudRoot', SCREEN_W, SCREEN_H);
    this.hud = new Hud(hudNode, () => this.onPausePressed());
    this.cur = hudNode;
    const t0 = performance.now();
    await this.battle.startRun(this.charId, this.seed);
    console.log('[GameRoot] startRun 耗时 ' + Math.round(performance.now() - t0) + 'ms');
    this.battle.paused = false;
  }

  // ---------- 5. 升级 3 选 1 ----------
  private showLevelUp(rewards: Reward[]) {
    this.pendingRewards = rewards;
    const cards: CardData[] = rewards.map(r => this.toCard(r));
    this.closeModal();
    this.curModal = buildLevelUp(this.uiRoot, this.battle.rs.lv, cards,
      (i) => this.pickReward(i), () => this.pickReward(-1));
  }

  // ---------- 7. 技能替换（4 技能已满时抽到新技能）----------
  /**
   * ⚠️ 这一段此前**完全缺失**：`buildReplace` 被 import 却从未调用，
   *    导致满 4 技能时抽到「新技能」只能白拿（奖励进不了任何槽位）。
   *    替换屏是规格 §2 的第 7 屏，必须接上。
   */
  private showReplace(newId: string) {
    const rs = this.battle.rs;
    const def = SKILLS[newId];
    this.battle.paused = true;
    this.curModal = buildReplace(this.uiRoot,
      { name: def ? def.name : newId, desc: def ? tagText(def.tags) : '' },
      rs.skills.map(s => ({
        name: (SKILLS[s.id] ? SKILLS[s.id].name : s.id) + '  Lv.' + s.lvl,
        modCount: s.mods.length,
      })),
      (slot) => {
        const back = rs.replaceSkill(slot, newId);   // 被换掉技能上的模块**退回背包**
        if (back.length) rs.modsBag.push(...back);
        this.installSel = rs.modsBag.length ? rs.modsBag[0] : null;
        this.closeModal();
        this.battle.resumeFromModal();
      },
      () => { this.closeModal(); this.battle.resumeFromModal(); });
  }

  private pickReward(i: number) {
    const r = i >= 0 ? this.pendingRewards[i] : null;
    // 4 技能已满时抽到新技能 -> 走替换屏
    if (r && r.kind === 'skill' && r.needReplace) {
      this.showReplace(r.id);
      return;
    }
    if (r && r.kind === 'module') {
      // ⚠️ 模块必须**进安装屏真的装上**，不能只丢进背包。
      //    之前就是只 push 进背包、没有安装入口 —— 用户报"无法安装模块"。
      this.battle.rs.modsBag.push(r.id);
      this.installSel = r.id;
      this.showInstall('levelup');
      return;
    }
    if (r) this.battle.rs.applyReward(r);
    this.closeModal();
    this.battle.resumeFromModal();
  }

  // ---------- 6. 模块安装（槽位级交互，规格 §3.3）----------
  private installSel: string | null = null;
  private installReturn: 'levelup' | 'pause' | 'shop' | 'nextwave' = 'levelup';

  private showInstall(returnTo: 'levelup' | 'pause' | 'shop' | 'nextwave') {
    this.installReturn = returnTo;
    const rs = this.battle.rs;
    if (!this.installSel || rs.modsBag.indexOf(this.installSel) < 0) {
      this.installSel = rs.modsBag.length ? rs.modsBag[0] : null;
    }
    // 用户要求：**背包为空就自动返回**，不弹一个空界面
    if (rs.modsBag.length === 0) { this.afterInstall(); return; }
    this.battle.paused = true;
    this.renderInstall();
  }

  /** 安装屏收起后回哪儿 —— 三个来源分别处理 */
  private afterInstall() {
    this.closeModal();
    if (this.installReturn === 'pause') this.showPause();
    else if (this.installReturn === 'shop') this.renderShop();
    else if (this.installReturn === 'nextwave') { this.phase = 'battle'; this.battle.advanceWave(); }
    else this.battle.resumeFromModal();
  }

  private renderInstall() {
    this.closeModal();
    const rs = this.battle.rs;
    this.curModal = buildInstall(this.uiRoot, {
      skills: rs.skills.map(s => ({
        name: SKILLS[s.id] ? SKILLS[s.id].name : s.id,
        lvl: s.lvl,
        mods: s.mods.map(m => (MODULES[m] ? MODULES[m].name : m).slice(0, 2)),
      })),
      bag: rs.modsBag.map(id => ({ id, name: (MODULES[id] ? MODULES[id].name : id).slice(0, 4) })),
      selModule: this.installSel,
      selModuleName: this.installSel && MODULES[this.installSel] ? MODULES[this.installSel].name : (this.installSel ?? ''),
      compatible: (si, modId) => {
        const sk = rs.skills[si];
        if (!sk) return false;
        return isCompatible(sk.id, modId) && (sk.mods.length < MAX_SLOTS || sk.mods.indexOf(modId) >= 0 || true);
      },
    }, {
      onSelectModule: (id) => { this.installSel = id; this.renderInstall(); },
      onPickSlot: (si, sl) => this.doInstall(si, sl),
      // 「先放背包」= 不装、直接回去。模块本来就已在背包里，之后能在 Build 面板再装。
      onBack: () => this.afterInstall(),
    });
  }

  private doInstall(si: number, sl: number) {
    const rs = this.battle.rs;
    const sk = rs.skills[si];
    const modId = this.installSel;
    if (!sk || !modId) return;
    if (!isCompatible(sk.id, modId)) return;
    try {
      rs.installAt(si, sl, modId);          // RunState 负责：装上去 + 被顶掉的退回背包
    } catch (e) {
      console.warn('[Install] 安装失败:', e);
    }
    this.installSel = rs.modsBag.length ? rs.modsBag[0] : null;
    // 全部装完（背包空了）-> 自动收起，不让玩家停在空界面
    if (!this.installSel) { this.afterInstall(); return; }
    this.renderInstall();
  }

  /**
   * 升级卡片数据 —— 规格 v1.1 §2.5：
   *   · 三张卡结构一致（标签 / 图标 / 名称 / 介绍）
   *   · **属性数值并入介绍文案**（用户指令），不再单列数据行
   */
  private toCard(r: Reward): CardData {
    if (r.kind === 'skill' || r.kind === 'skillup') {
      const s = SKILLS[r.id];
      const art = SKILL_ART[r.id];
      const icon = art ? art.icon : undefined;
      const tags = s ? tagText(s.tags) : '';
      if (r.kind === 'skillup') {
        const cur = this.battle.rs.skills.find(k => k.id === r.id);
        const lv = cur ? cur.lvl : 1;
        const d0 = s ? Math.round(s.dmg * (1 + 0.22 * (lv - 1))) : 0;
        const d1 = s ? Math.round(s.dmg * (1 + 0.22 * lv)) : 0;
        return {
          kind: 'skillup', title: s ? s.name : r.id, sub: 'Lv.' + lv + ' → ' + (lv + 1),
          desc: '伤害 ' + d0 + ' → ' + d1 + '，冷却再降 6%。',
          icon,
        };
      }
      return {
        kind: 'skill', title: s ? s.name : r.id, sub: '新技能',
        // 卡片高度有限：把数值放一行、标签放一行，比原来一整句更好读
        desc: (s ? s.dmg : 0) + ' 点伤害 · 冷却 ' + (s ? s.cd : 0) + 's' + (tags ? ' ｜ ' + tags : ''),
        icon,
      };
    }
    if (r.kind === 'module') {
      const m = MODULES[r.id];
      const owned = this.battle.rs.totalMods(r.id);
      return {
        kind: 'module', title: m ? m.name : r.id, sub: r.needReplace ? '装到技能上' : '行为模块',
        desc: (m ? m.desc : '') + '（已持有 ' + owned + ' / ' + (m ? m.max : 1) + '）',
        glyph: m ? m.icon : '⇢',
        art: MODULE_ICON[r.id],            // 用模块自己的图标，别写死
      };
    }
    if (r.kind === 'item') {
      const it = ITEMS[r.id];
      return { kind: 'item', title: it ? it.name : r.id, sub: '道具', desc: it ? it.desc : '', glyph: it ? it.icon : '◆', art: ITEM_ICON[r.id] };
    }
    const a = ATTRS[r.id];
    return {
      kind: 'attr', title: a ? a.name : r.id, sub: '属性',
      desc: '当前 ' + (a ? a.name : '') + ' ' + (a ? a.fmt(a.base) : '') +
            '，提升到 ' + (a ? a.fmt(a.base + a.step) : '') + '。永久生效，可叠加。',
      glyph: a ? a.icon : '★',
      art: ATTR_ICON[r.id],            // 用属性自己的图标（⚔ / » / ◎ / ♥ …）
    };
  }

  // ---------- 10. 波间商店 ----------
  private showShop() {
    this.phase = 'shop';
    this.battle.rs.refreshShop(true);
    this.renderShop();
  }

  private renderShop() {
    this.closeModal();
    const rs = this.battle.rs;
    const slots: ShopSlotView[] = (rs.shopStock || []).map(s => {
      const title = s.kind === 'item' ? (ITEMS[s.id] ? ITEMS[s.id].name : s.id)
        : s.kind === 'module' ? (MODULES[s.id] ? MODULES[s.id].name : s.id)
        : s.kind === 'heal' ? '回复 40 HP' : '随机属性 +1';
      const sub = s.kind === 'item' ? (ITEMS[s.id] ? ITEMS[s.id].desc : '')
        : s.kind === 'module' ? (MODULES[s.id] ? MODULES[s.id].desc : '') : '';
      const icon = s.kind === 'item' ? ITEM_ICON[s.id]
        : s.kind === 'module' ? MODULE_ICON[s.id] : undefined;
      return { title, sub, price: s.price, sold: s.sold, locked: s.locked, kind: s.kind, icon };
    });
    // DEMO 在货架下方有一行提示：下一波时长 / 是否 BOSS 波 / 是否精英波
    const nw = rs.wave + 1;
    const nextTip = '下一波：' + waveTime(nw) + ' 秒'
      + (isBossWave(nw) ? ' · BOSS 波' : (isEliteWave(nw) ? ' · 精英波' : ''));
    // 打通 20 波后按钮变成「继续挑战」（DEMO 还多一个「收工结算」，见待办）
    const done = rs.wave >= RUN.waves && !rs.endless;
    const nextLabel = done ? '继续挑战' : ('下一波' + (isBossWave(nw) ? ' · BOSS' : ''));
    this.curModal = buildShop(this.uiRoot, rs.wave, rs.gold, slots,
      // 用户指令（2026-10-17 重构）：商店买模块**不再立刻弹安装**。
      //   买一个就装一个节奏太碎。改成：买完只进背包，点「下一波」时**统一装一次**。
      (i) => { rs.buySlot(i); this.renderShop(); },
      (i) => { rs.toggleLock(i); this.renderShop(); },
      () => { rs.rerollShop(); this.renderShop(); },
      rs.rerollCost(),
      () => this.nextWave(),
      nextTip, nextLabel);
  }

  private nextWave() {
    const rs = this.battle.rs;
    // 用户指令：进下一关前**统一打开一次安装界面**，让玩家把背包里的模块装一装
    if (rs.modsBag.length > 0) {
      this.installReturn = 'nextwave';
      this.installSel = rs.modsBag[0];
      this.battle.paused = true;
      this.renderInstall();
      return;
    }
    this.closeModal();
    this.phase = 'battle';
    this.battle.advanceWave();
  }

  // ---------- 11. 结算 ----------
  private showResult(win: boolean) {
    this.phase = 'result';
    Sfx.sfx(win ? 'victory' : 'defeat', 0.7, 800);
    Sfx.bgm('menu');
    this.closeModal(); this.clearScreen();
    const rs = this.battle.rs;
    // 规格 v1.1 §2.9：本局 Build 每行 = 技能图标 + 名称(Lv) + 已装模块
    const build: ResultBuildRow[] = rs.skills.map(s => {
      const def = SKILLS[s.id];
      const mods = s.mods.map(m => (MODULES[m] ? MODULES[m].name : m)).join(' · ');
      return {
        icon: def ? (def.icon ?? '') : '',
        name: (def ? def.name : s.id) + ' Lv.' + s.lvl,
        sub: mods || '无行为模块',
      };
    });
    this.battleNode.active = false;
    this.joyNode.active = false;
    this.cur = buildResult(this.uiRoot,
      { win, wave: rs.wave, lv: rs.lv, kills: rs.kills, time: rs.runTime, build,
        gold: rs.gold, seed: this.seed, waveTotal: RUN.waves, endless: rs.endless },
      () => this.showMenu(), () => void this.startBattle());
  }

  // ---------- 9. 暂停 / Build 抽屉 ----------
  private showPause() {
    const rs = this.battle.rs;
    const pages = [
      { tab: '技能', lines: rs.skills.flatMap((s, i) => {
          const def = SKILLS[s.id];
          const rt = calcSkill(s, rs.stats);
          const mods = s.mods.map(m => MODULES[m] ? MODULES[m].name : m).join('/');
          // NOTE: each entry must be a SINGLE line -- the drawer body renders one Label per line,
          //       so embedding a newline here would make one entry occupy two rows and overlap.
          const head = (i + 1) + '. ' + (def ? def.name : s.id) + '  Lv.' + s.lvl + '  [' + (mods || '空') + ']';
          const sub = '    ' + '伤害 ' + Math.round(rt.dmg) + '   冷却 ' + rt.cd.toFixed(2) + 's';
          return [head, sub];
        }) },
      { tab: '模块', lines: rs.modsBag.length ? rs.modsBag.map(m => '· ' + (MODULES[m] ? MODULES[m].name : m) + '：' + (MODULES[m] ? MODULES[m].desc : '')) : ['（背包为空）'] },
      { tab: '道具', lines: rs.items.length ? rs.items.map(i => '· ' + (ITEMS[i.id] ? ITEMS[i.id].name : i.id) + '：' + (ITEMS[i.id] ? ITEMS[i.id].desc : '')) : ['（没有道具）'] },
      // 属性页签：**从 ATTRS 表自动生成**（24 项，两列一行）
      //   以前是手写 4 行，加了属性就会漏显示。
      { tab: '属性', lines: (() => {
          const st = rs.stats as unknown as Record<string, number | undefined>;
          const ids = Object.keys(ATTRS);
          const cell = (id: string) => {
            const d = ATTRS[id];
            return d.name + ' ' + d.fmt(st[id] ?? d.base);
          };
          // 每行 3 列：24 项 → 正好 8 行。
          // ⚠️ 抽屉正文**实际只能显示约 8 行**（再多会被底部按钮压住）。
          //    2 列时要 12 行，最后 4 项看不见；3 列刚好。
          const out: string[] = [];
          for (let i = 0; i < ids.length; i += 3) {
            const row = ids.slice(i, i + 3).map(cell).join('  ');
            out.push(row);
          }
          return out;
        })() },
    ];
    this.battle.paused = true;
    this.curModal = buildBuildDrawer(this.uiRoot, pages,
      () => { this.closeModal(); this.confirmQuit(); },
      () => { this.closeModal(); this.battle.paused = false; },
      () => { this.showInstall('pause'); },
      this.battle.rs.modsBag.length);
  }

  private confirmQuit() {
    this.curModal = buildConfirm(this.uiRoot, '返回主菜单？', '本局进度会丢失', '确认',
      () => this.closeModal(),
      () => { this.closeModal(); this.showMenu(); });
  }

  // ---------- 暂停键热区（HUD 右上角）----------
  private pauseHit(x: number, y: number): boolean {
    return Math.abs(x - 152) <= 26 && Math.abs(y - 286) <= 26;
  }

  // ---------- 每帧 ----------
  update(_dt: number) {
    if (this.joy && this.battle) {
      this.battle.inputX = this.joy.outX;
      this.battle.inputY = this.joy.outY;
    }
    if (this.hud && this.battle.rs && this.phase === 'battle') this.syncHud();
  }

  private syncHud() {
    const rs = this.battle.rs;
    const boss = this.battle.bossAlive;
    const d: HudData = {
      hp: rs.stats.hp, maxhp: rs.stats.maxhp,
      lv: rs.lv, exp: rs.exp, expNeed: rs.expNeed,
      gold: rs.gold, wave: rs.wave, waveTotal: RUN.waves, waveLeft: this.battle.waveLeftSec,
      kills: rs.waveKills,
      hurtFlash: this.battle.hurtFlash,
      bossName: boss ? ('BOSS · 第 ' + rs.wave + ' 波') : null, bossHp: boss ? boss.hp : 0, bossMax: boss ? boss.maxhp : 0,
      skills: [0, 1, 2, 3].map(i => {
        const s = rs.skills[i];
        const def = s ? SKILLS[s.id] : null;
        return {
          name: def ? def.name : '',
          icon: def ? (def.icon || '') : '',
          cdPct: this.battle.skillCdPct[i] || 0, lvl: s ? s.lvl : 0,
          modCount: s ? s.mods.length : 0,
        };
      }),
    };
    this.hud!.sync(d);
  }

  /** 供 HUD 暂停按钮调用（Hud 里注册触摸时会回调这里） */
  onPausePressed() { if (this.phase === 'battle') this.showPause(); }
}

/**
 * 技能标签 → 中文
 *
 * ⚠️ 原来只翻译了元素标签，形态/属性标签（projectile / pierceable / homing…）
 *    会原样漏到界面上，用户看到的就是「奥术/projectile/pierceable」这种半英文串。
 *    现在**全量覆盖**，词表见 `docs/systems/tags.md`。
 */
const TAG_CN: Record<string, string> = {
  // 元素
  fire: '火', ice: '冰', lightning: '雷', physical: '物理',
  arcane: '奥术', holy: '圣', poison: '毒', nature: '自然',
  // 形态
  projectile: '投射物', area: '范围', pulse: '脉冲', chain: '连锁',
  summon: '召唤', melee: '近战', beam: '射线', burst: '爆发',
  // 特性
  pierceable: '可穿透', homing: '追踪', return: '回旋',
  slow: '减速', dot: '持续伤害',
};
function tagText(tags: string[]): string {
  return tags.map(t => TAG_CN[t] ?? t).join(' · ');
}
