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
import { _decorator, Component, Node, view, ResolutionPolicy, Color } from 'cc';
import { SCREEN_W, SCREEN_H, RUN, waveTime, isBossWave, isEliteWave } from './core/Const';
import { Joystick } from './engine/Joystick';
import { Battle } from './battle/Battle';
import { mkNode, screen } from './ui/UIKit';
import { preloadUiArt } from './ui/Art';
import { Hud, type HudData } from './ui/Hud';
import { buildMenu, buildHowto, buildCharSelect, buildResult, type ResultBuildRow } from './ui/MenuScreens';
import { buildSettings } from './ui/MetaScreens';
import { buildDifficultySelect } from './ui/DifficultyScreens';
import { nextDifficulty, difficultyOf } from './data/Difficulties';
import type { DifficultyId } from './data/Difficulties';
import { buildCodex, buildAchievements } from './ui/CodexScreens';
import { applyFxPrefs } from './game/Prefs';
import { migrateDifficulty } from './game/Progress';
import { setupUpdate, updateState, applyUpdate } from './game/Update';
import { loadSave, writeSave } from './engine/Save';
import { telemetryStart, telemetryRunEnd, listRuns, exportLogs, clearLogs, summarize } from './game/Telemetry';
import { balance, balanceOverride, balanceReset, exportBalance, importBalance } from './core/Balance';
import { applyUnlocks } from './game/Achievements';
import { buildLevelUp, buildShop, buildBuildDrawer, buildConfirm, type CardData, type ShopSlotView } from './ui/Modals';
import { buildInstall, buildReplace } from './ui/ManageScreens';
import { CHARS } from './data/Chars';
import { SKILLS, SKILL_ART } from './data/Skills';
import { Assets, preloadIcons } from './engine/Assets';
import { Sfx } from './engine/Audio';
import { MODULES, MODULE_IDS, MODULE_NUMS, moduleDef, baseOf, isMerged, levelOf, nextLevelId } from './data/Modules';
import { ITEMS, itemNumbers } from './data/Items';
import { ITEM_ICON, MODULE_ICON, ATTR_ICON } from './data/IconMap';
import { ATTRS } from './data/Attrs';
import { calcSkill, canInstall, isCompatible } from './game/SkillCalc';
import type { Reward } from './game/RunState';
const { ccclass } = _decorator;

/** 启动占位底色（与 COL.bg1 一致，避免首帧白/黑闪） */
const COL_BG1 = new Color(38, 38, 54, 255);

type Phase = 'menu' | 'howto' | 'charselect' | 'battle' | 'shop' | 'result' | 'codex' | 'ach';

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
  /** 本次/下一局的随机种子：**每局都换**（原来写死 20261012 → 每局商店、奖励完全一样） */
  private seed = (Math.random() * 0xffffffff) >>> 0;
  /** 菜单里已经"预览"过这个种子时置 true，开局直接用；否则开局前重摇一次 */
  private seedFresh = true;
  private pendingRewards: Reward[] = [];
  /** 本局结算是否已经展示过（防止 onDead/onClear 重入重复弹结算） */
  private endShown = false;
  /** 卡死看门狗计时：战斗被暂停、却没有任何弹窗时的累计时间 */
  private stuckT = 0;
  /** 本地存档（音频开关 + 成就进度），只读展示 + 结算时累计 */
  private save = loadSave();

  onLoad() {
    // 设计分辨率写死在代码里，不依赖编辑器设置（编辑器里是 1280x720，见 KI-005）
    view.setDesignResolutionSize(SCREEN_W, SCREEN_H, ResolutionPolicy.FIXED_WIDTH);

    // 控制台调试钩子（只在浏览器/微信调试器里用）：
    //   __logs()          看全部战斗日志
    //   __logDump()       打印 JSON（发同事）
    //   __bal()           看当前生效的数值表
    //   __balSet({...})   局部改数值（立即持久化，下次进局生效）
    //   __balReset()      恢复代码默认值
    const dbg = globalThis as unknown as Record<string, unknown>;
    dbg.__logs = () => listRuns();
    dbg.__logDump = () => console.log(exportLogs());
    dbg.__logClear = () => { clearLogs(); console.log('[Log] 已清空'); };
    dbg.__logSummary = () => summarize();
    dbg.__bal = () => balance();
    dbg.__balSet = (p: unknown) => balanceOverride(p as never);
    dbg.__balReset = () => balanceReset();
    dbg.__balExport = () => exportBalance();
    dbg.__balImport = (j: string) => importBalance(j);

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
    // ★ 结算只允许触发一次：以前同一帧/重入时 onDead 可能被多次调用，
    //   控制台会连刷「玩家阵亡」，还会反复重建结算页（用户 2026-10-28 反馈"看到阵亡提示但没死"）
    this.battle.hooks.onDead = () => { if (this.endShown) return; this.endShown = true; this.showResult(false); };
    this.battle.hooks.onClear = () => { if (this.endShown) return; this.endShown = true; this.showResult(true); };
    // 成就统计（只计数，不参与战斗结算）
    this.battle.hooks.onBossKill = () => { this.save.bossKills++; writeSave(this.save); };
    // 微信版本更新：冷启动检查 → 下载完成提示重启（浏览器里自动跳过）
    setupUpdate(() => {
      const g = globalThis as unknown as { wx?: { showModal?: (o: unknown) => void } };
      if (g.wx && typeof g.wx.showModal === 'function') {
        g.wx.showModal({
          title: '发现新版本',
          content: '新版本已下载完成，重启后生效。',
          confirmText: '立即重启',
          cancelText: '稍后',
          success: (r: { confirm?: boolean }) => { if (r.confirm) applyUpdate(); },
        });
      } else {
        applyUpdate();
      }
    });
    console.log('[Update] state=' + updateState());

    // 应用存档里的音频开关 + 画面偏好（特效透明度/屏震/受击红屏）
    Sfx.setMusic(this.save.music);
    Sfx.setSfx(this.save.sfx);
    migrateDifficulty(this.save);
    applyFxPrefs(this.save.fxAlpha ?? 1, this.save.shakeOn !== false, this.save.hurtOn !== false);

    Sfx.init(this.node);
    void Sfx.preload();
    // UI 九宫格素材是异步载入的，**载入完再画菜单**，否则首帧会退化成 Graphics 旧样式
    void this.boot();
    // 用户反馈「进入游戏时会先卡顿一下」：根因是 startRun 里同步 await 加载
    // 玩家单位 + 全部技能 VFX。改成**开局就在后台预加载**，玩家在菜单停留的时间就把它偷完了。
    void this.preloadAll();
  }

  /** 启动：先载 UI 素材，再出菜单（素材失败也照常进菜单，UIKit 会回退） */
  private async boot() {
    const vs = view.getVisibleSize();
    const ph = screen(this.uiRoot, 'bootbg', COL_BG1);
    try { await preloadUiArt(); } catch (e) { console.warn('[GameRoot] UI 素材加载失败', e); }
    if (ph.isValid) ph.destroy();
    this.showMenu();
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

  /**
   * 弹窗字段改成 **带销毁语义的访问器**（M61）。
   *
   * 为什么：黑科技安装屏弹「替换确认」时，原代码直接 `this.curModal = buildConfirm(...)`，
   * 安装屏节点从此没人引用 → closeModal 只销毁确认框，安装屏**永远留在画面上**，
   * 叠在构建面板后面（第二轮截图 12–16 后面那层"黑科技"就是这样来的）。
   * 现在任何赋值都会先销毁旧弹窗，从根上避免"孤儿全屏层"。
   */
  private _curModal: Node | null = null;
  private get curModal(): Node | null { return this._curModal; }
  private set curModal(n: Node | null) {
    if (this._curModal && this._curModal.isValid && this._curModal !== n) this._curModal.destroy();
    this._curModal = n;
  }

  private showMenu() {
    this.phase = 'menu'; this.closeModal(); this.clearScreen();
    Sfx.bgm('menu');
    this.battleNode.active = false; this.joyNode.active = false;
    // 回到菜单就摇**下一局**的种子，菜单底部显示的就是即将用的那个
    this.seed = this.newSeed();
    this.seedFresh = true;
    this.cur = buildMenu(this.uiRoot, this.seed,
      () => this.showCharSelect(),
      () => this.showHowto(),
      () => this.showCodex(),
      () => this.showAchievements(),
      () => this.showSettings());
  }

  // ---------- 元页面：图鉴 / 成就 / 设置 ----------
  private showCodex() {
    this.phase = 'codex'; this.closeModal(); this.clearScreen();
    this.cur = buildCodex(this.uiRoot, this.save, () => this.showMenu());
  }
  private showAchievements() {
    this.phase = 'ach'; this.closeModal(); this.clearScreen();
    this.cur = buildAchievements(this.uiRoot, this.save, () => this.showMenu());
  }
  /** 设置是**模态**：盖在菜单上，关闭后菜单还在（不重建，避免闪一下） */
  private showSettings() {
    this.closeModal();
    this.curModal = buildSettings(this.uiRoot, this.save, (k) => {
      this.save[k] = !this.save[k];
      if (k === 'music') Sfx.setMusic(this.save.music);
      else Sfx.setSfx(this.save.sfx);
      writeSave(this.save);
    }, () => this.closeModal());
  }
  private showHowto() {
    this.phase = 'howto'; this.clearScreen();
    this.cur = buildHowto(this.uiRoot, () => this.showMenu());
  }
  /** 难度选择页：菜单 → 难度 → 选角 */
  /** 通关当前难度后解锁下一档（写存档） */
  private unlockNextDifficulty(): void {
    const cur: DifficultyId = this.save.selectedDifficulty ?? 'normal';
    const next = nextDifficulty(cur);
    if (next && this.save.difficulties.indexOf(next) < 0) {
      this.save.difficulties.push(next);
      writeSave(this.save);
      console.log('[Difficulty] 通关 ' + cur + ' → 解锁 ' + next);
    }
  }

  private showDifficulty() {
    this.closeModal();
    if (this.cur && this.cur.isValid) this.cur.destroy();
    this.cur = buildDifficultySelect(
      this.uiRoot,
      this.save.difficulties,
      this.save.selectedDifficulty ?? 'normal',
      () => this.showMenu(),
      (id: DifficultyId) => {
        this.save.selectedDifficulty = id;
        writeSave(this.save);
        this.showCharSelect();
      },
    );
  }

  private showCharSelect() {
    this.phase = 'charselect'; this.clearScreen();
    this.cur = buildCharSelect(this.uiRoot, () => this.showMenu(), (id) => { this.charId = id; void this.startBattle(); });
  }

  private newSeed(): number { return (Math.random() * 0xffffffff) >>> 0; }

  private async startBattle() {
    this.endShown = false;
    this.stuckT = 0;
    // 从结算页"再来一局"进来时没有经过菜单 → 这里重摇一次，保证每局不同
    if (!this.seedFresh) this.seed = this.newSeed();
    this.seedFresh = false;
    this.phase = 'battle'; this.closeModal(); this.clearScreen();
    this.battleNode.active = true; this.joyNode.active = true;
    const hudNode = mkNode(this.uiRoot, 'HudRoot', SCREEN_W, SCREEN_H);
    this.hud = new Hud(hudNode, () => this.onPausePressed());
    this.cur = hudNode;
    // 本局难度：从存档复制到战斗（局内不可改）
    const diffId = this.save.selectedDifficulty ?? 'normal';
    if (this.save.difficulties.indexOf(diffId) < 0) this.save.selectedDifficulty = 'normal';
    this.battle.difficultyId = this.save.selectedDifficulty ?? 'normal';
    const t0 = performance.now();
    // 图鉴发现：开局记下角色与初始技能
    this.markSeen('char:' + this.charId);
    const cdef0 = CHARS.find(c => c.id === this.charId);
    if (cdef0) this.markSeen('skill:' + cdef0.start);
    telemetryStart(this.charId, this.seed);       // 战斗日志：本局开始
    await this.battle.startRun(this.charId, this.seed);
    console.log('[GameRoot] startRun 耗时 ' + Math.round(performance.now() - t0) + 'ms');
    this.battle.paused = false;
  }

  // ---------- 5. 升级 3 选 1 ----------
  private showLevelUp(rewards: Reward[]) {
    // 图鉴：升级卡里出现过的内容也算"见过"（不用拿）
    for (const r of rewards) {
      if (r.kind === 'skill' || r.kind === 'skillup') this.markSeen('skill:' + r.id);
      else if (r.kind === 'item') this.markSeen('item:' + r.id);
    }
    this.pendingRewards = rewards;
    this.closeModal();
    try {
      const cards: CardData[] = rewards.map(r => this.toCard(r));
      this.curModal = buildLevelUp(this.uiRoot, this.battle.rs.lv, cards,
        (i) => this.pickReward(i), () => this.pickReward(-1));
    } catch (e) {
      // ★ 防御：任何界面构建失败都不能把游戏留在「暂停 + 没弹窗」的状态（= 看起来卡死）
      console.error('[UI] 升级面板构建失败，自动跳过本次升级', e);
      this.closeModal();
      this.battle.resumeFromModal();
    }
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
    // ⚠️ 必须先关掉「升级 3 选 1」弹窗！之前直接覆盖 this.curModal，升级弹窗的节点
    //    从来没被销毁 → 替换完只销毁了替换屏，升级页留在画面上且再也关不掉
    //    （用户反馈「替换技能后无法关闭升级选项页面」就是这个原因）。
    this.closeModal();
    this.curModal = buildReplace(this.uiRoot,
      { name: def ? def.name : newId, desc: def ? tagText(def.tags) : '', icon: def ? def.icon : undefined },
      rs.skills.map(s => ({
        name: (SKILLS[s.id] ? SKILLS[s.id].name : s.id) + '  Lv.' + s.lvl,
        modCount: s.mods.length,
        icon: SKILLS[s.id] ? SKILLS[s.id].icon : undefined,
      })),
      (slot) => {
        // ⚠️ B1：replaceSkill() **自己**已经把旧模块放进 modsBag 并返回同一份数组。
        //    调用方再 push 一次就会让模块翻倍（复制 BUG）。返还责任只在模型层。
        const back = rs.replaceSkill(slot, newId);
        console.log('[Replace] 退回背包 ' + back.length + ' 个（模型层已入库）');
        this.installSelIdx = null; this.installSel = null;
        if (rs.modsBag.length) this.selectBag(0);
        this.closeModal();
        this.battle.resumeFromModal();
      },
      () => { this.closeModal(); this.battle.resumeFromModal(); });
  }

  /** 上一次生效的选卡时间（防双击/重复回调把同一张卡应用两次） */
  private lastPickAt = 0;

  private pickReward(i: number) {
    // ⚠️ B12：连点/重复回调守卫。同一次升级只允许生效一次（150ms 内的第二次直接忽略）。
    const now = Date.now();
    if (now - this.lastPickAt < 150) return;
    this.lastPickAt = now;
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
      this.installSelIdx = null; this.installSel = null;
      this.showInstall('levelup');
      const bag = this.battle.rs.modsBag;
      const idx = bag.lastIndexOf(r.id);
      if (idx >= 0) { this.selectBag(idx); this.renderInstall(); }
      return;
    }
    if (r) this.battle.rs.applyReward(r);
    this.closeModal();
    this.battle.resumeFromModal();
  }

  // ---------- 6. 模块安装（槽位级交互，规格 §3.3）----------
  /** 选中的模块 id（背包里的某一份） */
  private installSel: string | null = null;
  /** 选中的是背包里**第几份**：同名模块各选各的，不再一起高亮（M32） */
  private installSelIdx: number | null = null;
  /** 选中的「已装在技能上的模块」——Build 面板重新分配（空槽=移动，已占用=交换） */
  private installFromSlot: { si: number; sl: number } | null = null;
    /** 属性页是否展开全部（P1-5） */
  private attrShowAll = false;
  /** 暂停抽屉当前页签（0 技能 / 1 黑科技 / 2 道具 / 3 属性）——重开面板时保持不变 */
  private pauseTab = 0;
private installReturn: 'levelup' | 'pause' | 'shop' | 'nextwave' = 'levelup';

  private showInstall(returnTo: 'levelup' | 'pause' | 'shop' | 'nextwave') {
    this.installReturn = returnTo;
    this.installFromSlot = null;              // 每次进入安装屏都从头选
    const rs = this.battle.rs;
    this.installSel = null;
    this.installSelIdx = null;
    // 背包空 + 技能上也没装过 -> 没什么可管理的，直接回去。
    // ⚠️ 以前只看背包：背包一空这里就静默返回，玩家点了「装模块」像没反应
    //    （用户反馈「暂停面板点装模块无法安装模块」，2026-10-20 M30 #5）。
    const hasInstalled = rs.skills.some(s => s.mods.length > 0);
    if (rs.modsBag.length === 0 && !hasInstalled) { this.afterInstall(); return; }
    this.battle.paused = true;
    if (rs.modsBag.length && this.installSelIdx === null) this.selectBag(0);
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

  /** 选中背包里的第 i 份（同名模块各自独立） */
  private selectBag(i: number) {
    const bag = this.battle.rs.modsBag;
    if (i < 0 || i >= bag.length) { this.installSel = null; this.installSelIdx = null; return; }
    this.installSelIdx = i;
    this.installSel = bag[i];
  }

  private modName(id: string): string {
    const d = moduleDef(id);
    const base = d ? d.name : baseOf(id);
    const lv = levelOf(id);
    // 等级用罗马数字后缀显示：巨大 / 巨大 Ⅱ / 巨大 Ⅲ / 巨大 Ⅳ …
    const R = ['', '', 'Ⅱ', 'Ⅲ', 'Ⅳ', 'Ⅴ', 'Ⅵ', 'Ⅶ', 'Ⅷ', 'Ⅸ', 'Ⅹ'];
    return lv > 1 ? base + ' ' + (R[lv] ?? lv) : base;
  }
  private modIcon(id: string): string | undefined {
    return MODULE_ICON[baseOf(id)];
  }

  /** 安装屏构建的统一入口：**任何异常都不许把游戏卡在暂停态** */
  private renderInstall() {
    try {
      this.renderInstallUnsafe();
    } catch (e) {
      console.error('[UI] 黑科技安装屏构建失败（已自动恢复）', e);
      this.closeModal();
      if (this.installReturn === 'levelup') this.battle.resumeFromModal();
      else this.battle.paused = false;
    }
  }

  private renderInstallUnsafe() {
    this.closeModal();
    const rs = this.battle.rs;
    const from = this.installFromSlot;
    const fromMod = from ? rs.skills[from.si]?.mods[from.sl] : null;
    const selName = from && fromMod ? this.modName(fromMod) : (this.installSel ? this.modName(this.installSel) : '');
    const view = (id: string) => ({ id, name: this.modName(id), icon: this.modIcon(id), merged: isMerged(id) });
    this.curModal = buildInstall(this.uiRoot, {
      skills: rs.skills.map(s => ({
        name: SKILLS[s.id] ? SKILLS[s.id].name : s.id,
        lvl: s.lvl,
        mods: s.mods.map(view),
      })),
      bag: rs.modsBag.map(view),
      selBag: this.installSelIdx,
      selSlot: from,
      selName,
      pickedId: from && fromMod ? fromMod : this.installSel,
      pickedDesc: (() => {
        const id = from && fromMod ? fromMod : this.installSel;
        const d = id ? moduleDef(id) : undefined;
        return d ? d.desc : '';
      })(),
      // 只列「max >= 3」的模块：max 1~2 的模块永远凑不到 3 个同名，
      // 列出来只会显示"还差 1 个"却永远凑不齐（B4 的体验问题）
      // 用户 2026-10-30：等级要**分开列出且可无限往上合**。
      // 这里枚举"背包 + 已装"里实际出现的所有等级 id（giant / giant_2 / giant_3 …），
      // 每行只统计同级数量，因此 3 个 Ⅱ 会单独出现并合成 Ⅲ。
      merges: (() => {
        const seen = new Map<string, number>();
        for (const x of rs.modsBag) seen.set(x, (seen.get(x) ?? 0) + 1);
        for (const sk of rs.skills) for (const x of sk.mods) seen.set(x, (seen.get(x) ?? 0) + 1);
        const out: { baseId: string; name: string; count: number; times: number; resultName: string; resultIcon?: string }[] = [];
        for (const [id, count] of seen) {
          if (count < 3) continue;                       // 不够 3 个不显示（避免永远凑不齐的无效项）
          const lv = levelOf(id);
          out.push({
            baseId: id,
            name: this.modName(id),
            count,
            times: rs.mergeReady(id),
            resultName: this.modName(nextLevelId(id)),
            resultIcon: MODULE_ICON[baseOf(id)],
          });
          void lv;
        }
        return out.sort((a, b) => a.name.localeCompare(b.name));
      })(),
      compatible: (si, modId) => {
        const sk = rs.skills[si];
        if (!sk) return false;
        const r = canInstall(sk, modId);
        // ★ 2026-10-28 用户反馈：槽位装满时把技能置灰，玩家会以为"这个技能不能装"。
        //   「需替换槽位」不是不兼容 —— 点槽位就会替换掉那一格，所以这里算可用。
        return r.ok || r.why === '需替换槽位';
      },
    }, {
      onSelectBag: (i) => {
        this.installFromSlot = null;
        if (i === null) { this.installSel = null; this.installSelIdx = null; }
        else this.selectBag(i);
        this.renderInstall();
      },
      onPickSlot: (si, sl) => this.doInstall(si, sl),
      onUnequip: () => {
        const f = this.installFromSlot;
        if (!f) return;
        const rs2 = this.battle.rs;
        const ok = rs2.unequip(f.si, f.sl);
        console.log('[Install] 卸下模块 ' + ok);
        this.installFromSlot = null;
        if (ok && rs2.modsBag.length) this.selectBag(rs2.modsBag.length - 1);
        this.renderInstall();
      },
      onMerge: (baseId) => {
        const ok = rs.mergeModule(baseId);
        if (ok) { this.save.merges++; writeSave(this.save); }
        console.log('[Merge] ' + baseId + ' ×3 → ' + baseId + '_2 : ' + ok);
        this.installFromSlot = null;
        const idx = rs.modsBag.lastIndexOf(baseId + '_2');
        if (idx >= 0) this.selectBag(idx);
        this.renderInstall();
      },
      onBack: () => this.afterInstall(),
    });
  }

  private doInstall(si: number, sl: number) {
    const rs = this.battle.rs;
    // ① 手里拿的是「已装模块」-> 移动 / 交换
    if (this.installFromSlot) {
      const ok = rs.moveMod(this.installFromSlot.si, this.installFromSlot.sl, si, sl);
      if (!ok) console.warn('[Install] 不能移动：目标技能不兼容（标签不匹配）');
      this.installFromSlot = null;
      this.renderInstall();
      return;
    }
    const sk = rs.skills[si];
    const modId = this.installSel;
    // ② 没选模块时点已占用槽 = 把它拿起来（背包空也能重新分配，behavior_modules.md §1）
    if (!modId) {
      if (sk && sk.mods[sl]) {
        this.installFromSlot = { si, sl };
        this.renderInstall();
      }
      return;
    }
    if (!sk) return;
    if (!isCompatible(sk.id, modId)) return;
    // M57（P1-4）：要**顶掉**已有黑科技时先给一次确认，明确"换什么、旧的去哪"。
    //   RunState.installAt 会把被顶掉的模块塞回背包，所以这里可以放心承诺"不会丢"。
    const cur = sk.mods[sl];
    if (cur && cur !== modId) {
      const from = this.modName(cur), to = this.modName(modId);
      this.curModal = buildConfirm(this.uiRoot, '替换黑科技',
        '用「' + to + '」替换「' + from + '」？\n被替换的「' + from + '」会退回背包，不会丢失。',
        '替换',
        () => this.renderInstall(),
        () => { this.doInstallRaw(si, sl, modId); });
      return;
    }
    this.doInstallRaw(si, sl, modId);
  }

  /** 真正执行安装（确认弹窗之后调用） */
  private doInstallRaw(si: number, sl: number, modId: string) {
    const rs = this.battle.rs;
    try {
      rs.installAt(si, sl, modId);          // RunState 负责：装上去 + 被顶掉的退回背包
    } catch (e) {
      console.warn('[Install] 安装失败:', e);
    }
    if (rs.modsBag.length) this.selectBag(0);
    else { this.installSel = null; this.installSelIdx = null; }
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
          desc: '',                      // 用户 2026-10-30：卡片只留一句话，详情去暂停面板看
          nums: '伤害 ' + d0 + ' → ' + d1,
          meta: 'Lv.' + lv + ' → ' + (lv + 1) + ' · 冷却 -6%',
          icon,
        };
      }
      return {
        kind: 'skill', title: s ? s.name : r.id, sub: '新技能',
        desc: '',
        nums: '伤害 ' + (s ? s.dmg : 0) + ' · 冷却 ' + (s ? s.cd : 0) + 's',
        meta: (tags ? tags + ' · ' : '') + (r.needReplace ? '技能已满，选中后替换' : '占 1 个技能槽'),
        icon,
      };
    }
    if (r.kind === 'module') {
      const m = MODULES[r.id];
      const owned = this.battle.rs.totalMods(r.id);
      return {
        kind: 'module', title: m ? m.name : r.id, sub: r.needReplace ? '装到技能上' : '黑科技',
        desc: '',
        nums: MODULE_NUMS[r.id] ?? '',
        meta: '已持有 ×' + owned + ' · 上限 ' + (m ? m.max : 1) + (r.needReplace ? ' · 需装到技能槽' : ''),
        glyph: m ? m.icon : '⇢',
        art: MODULE_ICON[r.id],            // 用模块自己的图标，别写死
      };
    }
    if (r.kind === 'item') {
      const it = ITEMS[r.id];
      const ownedN = this.battle.rs.items.filter(i => i.id === r.id).length;
      return {
        kind: 'item', title: it ? it.name : r.id, sub: '道具',
        desc: '',
        nums: it ? itemNumbers(it, r.id) : '',
        meta: (ownedN > 0 ? '已持有 ×' + ownedN : '尚未持有') + ' · ' + ((it && it.tier === 2) ? '高级道具' : '普通道具'),
        glyph: it ? it.icon : '◆', art: ITEM_ICON[r.id],
      };
    }
    const a = ATTRS[r.id];
    const taken = this.battle.rs.attrTaken[r.id] ?? 0;
    // ⚠️ 修复 "+-92%"：ATTRS[id].fmt 的入参是**绝对值**（power 会把 v 当 1.08 算 +8%）。
    //    直接喂 step(0.08) 会被算成 (0.08-1)*100 = -92%。这里用"显示值之差"求增量。
    // 用"把格式化模板里的数字换成增量"的方式，避免拼出 "+7+%"（模板里本来带 + 号）
    const stepTxt = a ? (() => {
      const numOf = (s: string) => { const m = s.match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : 0; };
      const shown0 = a.fmt(a.base);
      const shown1 = a.fmt(a.base + a.step);
      const dv = Math.round((numOf(shown1) - numOf(shown0)) * 10) / 10;
      // 模板本身就带符号（如 "+8%"），所以**只替换数字**，不要再补一个 '+'（否则变成 "++8%"）
      const abs = String(Math.abs(dv));
      if (/-?\d+(?:\.\d+)?/.test(shown1)) {
        const out = shown1.replace(/-?\d+(?:\.\d+)?/, abs);
        return dv < 0 ? out.replace(/^\+/, '-') : out;
      }
      return (dv >= 0 ? '+' : '-') + abs;
    })() : '';
    return {
      kind: 'attr', title: a ? a.name : r.id, sub: '属性',
      desc: '',
      nums: stepTxt,
      meta: (taken > 0 ? '已叠加 ×' + taken + ' · 可继续叠加' : '可无限叠加'),
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

  /** 商店构建的统一入口：构建失败时直接开下一波，别把人卡在空商店里 */
  private renderShop() {
    // 图鉴：商店货架上摆出来的东西也算"见过"
    for (const s2 of this.battle.rs.shopStock ?? []) {
      if (s2.kind === 'item') this.markSeen('item:' + s2.id);
    }
    try {
      this.renderShopUnsafe();
    } catch (e) {
      console.error('[UI] 商店面板构建失败，直接进入下一波', e);
      this.closeModal();
      this.phase = 'battle';
      this.battle.paused = false;
      this.battle.advanceWave();
    }
  }

  private renderShopUnsafe() {
    this.closeModal();
    const rs = this.battle.rs;
    const slots: ShopSlotView[] = (rs.shopStock || []).map(s => {
      const title = s.kind === 'item' ? (ITEMS[s.id] ? ITEMS[s.id].name : s.id)
        : s.kind === 'module' ? (MODULES[s.id] ? MODULES[s.id].name : s.id)
        : s.kind === 'heal' ? '回复 40 HP' : '随机属性 +1';
      // 商店里道具直接显示**具体数值**（决策要看数）；黑科技仍显示人话描述
      const sub = s.kind === 'item'
        ? (ITEMS[s.id] ? itemNumbers(ITEMS[s.id], s.id) || ITEMS[s.id].desc : '')
        // 用户 2026-10-30：商店也只留"一句话"——黑科技显示数值短句，不再显示长效果描述
        : s.kind === 'module' ? (MODULE_NUMS[s.id] ?? (MODULES[s.id] ? MODULES[s.id].name : '')) : '';
      const icon = s.kind === 'item' ? ITEM_ICON[s.id]
        : s.kind === 'module' ? MODULE_ICON[s.id] : undefined;
      // M52：稀有度（1 普通 / 2 高级）+ 已持有数量（堆叠提示）
      const ownedCount = s.kind === 'item' ? rs.items.filter(i => i.id === s.id).length : 0;
      return {
        title, sub, price: s.price, sold: s.sold, locked: s.locked, kind: s.kind, icon,
        rarity: s.kind === 'item' ? ((ITEMS[s.id]?.tier ?? 1)) : 0,
        owned: ownedCount,
      };
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
      nextTip, nextLabel,
      // 已有道具（用户要求：商店下方展示手上道具，参考土豆兄弟）
      (() => {
        const counts = new Map<string, number>();
        for (const it of rs.items) counts.set(it.id, (counts.get(it.id) ?? 0) + 1);
        return Array.from(counts.entries()).map(([id, count]) => ({
          name: ITEMS[id] ? ITEMS[id].name : id, icon: ITEM_ICON[id], count,
        }));
      })());
  }

  /** 图鉴解锁：把发现项写进存档（去重，避免频繁写盘） */
  private seenBuffer = new Set<string>();
  private markSeen(id: string): void {
    if (!id || this.save.seen.includes(id) || this.seenBuffer.has(id)) return;
    this.seenBuffer.add(id);
    this.save.seen.push(id);
    writeSave(this.save);
  }

  /** 本局结束补记：技能 / 道具 / 敌人 */
  private recordRunDiscovery(): void {
    const rs = this.battle.rs;
    for (const s of rs.skills) this.markSeen('skill:' + s.id);
    for (const it of rs.items) this.markSeen('item:' + it.id);
    for (const k of this.battle.seenEnemies) this.markSeen('enemy:' + k);
  }

  /** 通关后继续无尽：把 endless 打开，回到战斗并从第 21 波开始 */
  private continueEndless() {
    const rs = this.battle.rs;
    rs.endless = true;
    this.endWaveShown();
    this.battle.running = true;
    this.battle.advanceWave();
  }

  private endWaveShown() {
    this.closeModal();
    this.clearScreen();
    this.phase = 'battle';
    this.battleNode.active = true;
    this.joyNode.active = true;
  }

  private nextWave() {
    const rs = this.battle.rs;
    // 用户指令：进下一关前**统一打开一次安装界面**，让玩家把背包里的模块装一装
    if (rs.modsBag.length > 0) {
      this.installReturn = 'nextwave';
      this.installSelIdx = null; this.installSel = null;
      this.selectBag(0);
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
    if (win) this.unlockNextDifficulty();
    // 结算前清掉所有残留屏（暂停抽屉/升级卡/商店），否则它们会浮在结算页上方（用户截图确认）
    if (this.cur && this.cur.isValid) { this.cur.destroy(); this.cur = null; }
    if (this.curModal && this.curModal.isValid) { this.curModal.destroy(); this.curModal = null; }
    if (this.battleNode) this.battleNode.active = false;
    if (this.joyNode) this.joyNode.active = false;
    // P0 防呆：胜利只可能来自"打完最后一波"。若状态不符，说明是调试入口或状态没重置，
    // 这里留下明确日志（上线版不弹 UI），避免以后又出现「通关 + 第 8/20 波」的截图。
    const rs0 = this.battle.rs;
    if (win && rs0.wave < RUN.waves) {
      console.warn('[Result] 非法胜利状态：wave=' + rs0.wave + ' < 总波次 ' + RUN.waves + '（可能来自调试调用）');
    }
    this.phase = 'result';
    // 结算后彻底停战：不再刷怪、不再结算波次（否则 result 背后还会冒出敌人）
    this.battle.running = false;
    this.battle.paused = true;
    // ★ 成就统计：只在结算时累计一次（不影响分数/奖励）
    {
      const rsP = this.battle.rs;
      this.save.runs++;
      this.save.kills += rsP.kills;
      this.save.bestWave = Math.max(this.save.bestWave, rsP.wave);
      this.save.bestLv = Math.max(this.save.bestLv, rsP.lv);
      if (win) {
        this.save.wins++;
        if (!this.save.charsWin.includes(rsP.charId)) this.save.charsWin.push(rsP.charId);
      }
      const unlocked = applyUnlocks(this.save);
      writeSave(this.save);
      if (unlocked) console.log('[Ach] 解锁新成就：' + this.save.ach.join(','));
    }
    this.recordRunDiscovery();      // 图鉴：补记本局遇到的内容
    // 战斗日志：本局结束（阵亡/通关）
    // ⚠️ 上面成就块里的 rsP 是块级作用域，这里必须重新取
    const rsR = this.battle.rs;
    telemetryRunEnd({
      end: win ? 'clear' : 'dead',
      deathWave: rsR.wave,
      kills: rsR.kills,
      maxAlive: this.battle.maxAlive,
      dmgTaken: this.battle.totalDmgTaken(),
      durSec: rsR.runTime,
    });
    Sfx.sfx(win ? 'victory' : 'defeat', 0.7, 800);
    Sfx.bgm('menu');
    this.closeModal(); this.clearScreen();
    const rs = this.battle.rs;
    // 规格 v1.1 §2.9：本局 Build 每行 = 技能图标 + 名称(Lv) + 已装模块
    const build: ResultBuildRow[] = rs.skills.map(s => {
      const def = SKILLS[s.id];
      const mods = s.mods.map(m => this.modName(m)).join(' · ');
      return {
        icon: def ? (def.icon ?? '') : '',
        name: (def ? def.name : s.id) + ' Lv.' + s.lvl,
        sub: mods || '无黑科技',
      };
    });
    this.battleNode.active = false;
    this.joyNode.active = false;
    try {
      this.cur = buildResult(this.uiRoot,
        { win, wave: rs.wave, lv: rs.lv, kills: rs.kills, time: rs.runTime, build,
          gold: rs.gold, seed: this.seed, waveTotal: RUN.waves, endless: rs.endless,
          maxAlive: this.battle.maxAlive,
          difficultyName: (difficultyOf(this.battle.rs.difficulty).name) + ' (' + this.battle.rs.difficulty + ')',
          skills: rs.skills.map(s => {
            const def = SKILLS[s.id];
            return { name: def ? def.name : s.id, icon: def ? def.icon : undefined, mods: s.mods.length };
          }),
          items: (() => {
            const m = new Map<string, number>();
            for (const it of rs.items) m.set(it.id, (m.get(it.id) ?? 0) + 1);
            return Array.from(m.entries()).map(([id, count]) => ({
              name: ITEMS[id] ? ITEMS[id].name : id, icon: ITEM_ICON[id], count,
            }));
          })() },
        () => this.showMenu(), () => void this.startBattle(),
        // 通关后进入无尽（RUN.canContinue 之前是死字段，从没人读）
        win && RUN.canContinue ? () => this.continueEndless() : undefined);
    } catch (e) {
      console.error('[UI] 结算面板构建失败，回到主菜单', e);
      this.closeModal(); this.clearScreen(); this.showMenu();
    }
  }

  // ---------- 9. 暂停 / Build 抽屉 ----------
  private showPause() {
    const rs = this.battle.rs;
    const pages = [
      { tab: '技能', lines: rs.skills.flatMap((s, i) => {
          const def = SKILLS[s.id];
          const rt = calcSkill(s, rs.stats);
          const mods = s.mods.map(m => this.modName(m)).join('/');
          // NOTE: each entry must be a SINGLE line -- the drawer body renders one Label per line,
          //       so embedding a newline here would make one entry occupy two rows and overlap.
          const head = (i + 1) + '. ' + (def ? def.name : s.id) + '  Lv.' + s.lvl + '  [' + (mods || '空') + ']';
          const sub = '    ' + '伤害 ' + Math.round(rt.dmg) + '   冷却 ' + rt.cd.toFixed(2) + 's';
          return [head, sub];
        }) },
      { tab: '黑科技', lines: rs.modsBag.length ? rs.modsBag.map(m => { const d = moduleDef(m); return '· ' + (d ? d.name : m) + '：' + (d ? d.desc : ''); }) : ['（背包为空）'] },
      { tab: '道具', lines: rs.items.length ? rs.items.map(i => '· ' + (ITEMS[i.id] ? ITEMS[i.id].name : i.id) + '：' + (ITEMS[i.id] ? ITEMS[i.id].desc : '')) : ['（没有道具）'] },
      // 属性页签：不再拼字符串，改由抽屉渲染「2 列对齐网格」（图标 + 名称 + 数值，正绿负红）。
      //   数据从 ATTRS 表自动生成，加属性不会漏显示。
      { tab: '属性', lines: [] },
    ];
    // 相对**基准值**（ATTRS.base）的差值：负数红色、正数绿色、持平白色
    const stNow = rs.stats as unknown as Record<string, number | undefined>;
    const baseNow = rs.baseStats as unknown as Record<string, number | undefined>;
    const allAttrRows = Object.keys(ATTRS).map(id => {
      const d = ATTRS[id];
      const v = stNow[id] ?? baseNow[id] ?? d.base;
      const baseVal = baseNow[id] ?? d.base;
      const delta = v - baseVal;
      // ⚠️ 不能用 fmt(delta)：fmt 是"绝对值 → 显示值"的转换（power 会做 (v-1)*100），
      //   直接喂差值会算出 +92% 这种错数（M65 首版截图就是）。这里改成
      //   「显示值之差」：把 fmt(v) 与 fmt(基准) 的数字部分相减，再拼回同一个单位后缀。
      const shown = d.fmt(v), shownBase = d.fmt(baseVal);
      const numOf = (s: string) => { const m = s.match(/-?\d+(?:\.\d+)?/); return m ? parseFloat(m[0]) : NaN; };
      const suffix = shown.replace(/-?\d+(?:\.\d+)?/, '').trim();
      const dv = numOf(shown) - numOf(shownBase);
      // 基础值本来就是 0 的属性（攻击力/攻速等），总值就是加成，再显示一列纯属噪音
      const baseNum = numOf(shownBase);
      const dt = isFinite(dv) && Math.abs(dv) > 1e-6 && Math.abs(baseNum) > 1e-6
        // 后缀是 % 时不留空格（"+8%" 而不是 "+8 %"），其它单位（HP/秒）保留空格
        ? (dv > 0 ? '+' : '') + (Math.round(dv * 10) / 10) + (suffix ? (suffix.startsWith('%') ? suffix : ' ' + suffix) : '')
        : '';
      return {
        name: d.name, value: shown, delta, art: ATTR_ICON[id], id,
        deltaText: dt || undefined,
      };
    });
    // P1-5：默认只显示「核心战斗属性 + 本局发生变化的」，其余收进「查看全部」（数据一项不删）
    const CORE_ATTRS = new Set(['power', 'haste', 'maxhp', 'cdr', 'crit', 'critdmg', 'area', 'speed', 'projSpd', 'pickup']);
    // 用户 2026-10-30：属性页改成可滚动列表后，**默认就列全部属性**
    //（之前只列核心 10 项，内容高度刚好等于视口，所以"滚不动"）
    const attrRows = allAttrRows;
    void this.attrShowAll;
    const hiddenAttrs = 0;   // 全部可见后不再需要"还有 N 项"入口
    // 技能页详情（M33 #4）：点一行展开 -> 技能描述 + 已装模块的名字与描述
    const skillDetails = rs.skills.map(s => {
      const def = SKILLS[s.id];
      const art = SKILL_ART[s.id];
      const rt = calcSkill(s, rs.stats);
      return {
        name: def ? def.name : s.id,
        lvl: s.lvl,
        icon: art ? art.icon : undefined,
        summary: '伤害 ' + Math.round(rt.dmg) + ' · 冷却 ' + rt.cd.toFixed(2) + 's · ' + (def ? tagText(def.tags) : '—'),
        desc: def ? def.desc : '—',
        mods: s.mods.map(m => {
          const d = moduleDef(m);
          return { name: d ? d.name : m, desc: d ? d.desc : '' };
        }),
      };
    });
    // 道具页详情（M42）：图标 + 名称 + 展开后的效果/类型
    // 同名道具**合并成一行并计数**（之前每个都是 ×1）
    const itemDetails = (() => {
      const cnt = new Map<string, number>();
      for (const i of rs.items) cnt.set(i.id, (cnt.get(i.id) ?? 0) + 1);
      return Array.from(cnt.entries()).map(([id, count]) => {
        const it = ITEMS[id];
        return {
          id, count,
          name: it ? it.name : id,
          icon: ITEM_ICON[id],
          desc: it ? it.desc : '',
          nums: it ? itemNumbers(it, id) : '',
          note: it ? (it.tier === 2 ? '高级道具 · 精英 / BOSS 掉落' : '普通道具 · 商店或掉落获取') : '',
        };
      });
    })();
    // 黑科技页的结构化数据：已装（按技能逐个列）+ 背包（按同名合并计数）
    const modDetails = (() => {
      const out: { name: string; icon?: string; count: number; desc: string; installed: boolean }[] = [];
      rs.skills.forEach((s) => {
        (s.mods || []).forEach((m) => {
          const d = moduleDef(m);
          out.push({
            name: this.modName(m) + (s.mods.length > 1 ? '' : ''), icon: MODULE_ICON[baseOf(m)],
            count: 1, desc: d ? d.desc : '', installed: true,
          });
        });
      });
      const bag = new Map<string, number>();
      rs.modsBag.forEach((m) => bag.set(m, (bag.get(m) ?? 0) + 1));
      bag.forEach((n, m) => {
        const d = moduleDef(m);
        out.push({
          name: this.modName(m), icon: MODULE_ICON[baseOf(m)],
          count: n, desc: d ? d.desc : '', installed: false,
        });
      });
      return out;
    })();
    this.battle.paused = true;
    this.curModal = buildBuildDrawer(this.uiRoot, pages,
      () => { this.closeModal(); this.confirmQuit(); },
      () => { this.closeModal(); this.battle.paused = false; },
      () => { this.showInstall('pause'); },
      this.battle.rs.modsBag.length,
      {
        index: 3, rows: attrRows,
        more: (hiddenAttrs > 0 || this.attrShowAll)
          ? {
            label: this.attrShowAll
              ? '收起（只看核心与变化）'
              : '查看全部属性（还有 ' + hiddenAttrs + ' 项）',
            onTap: () => { this.attrShowAll = !this.attrShowAll; this.pauseTab = 3; this.showPause(); },
          }
          : undefined,
      },
      rs.wave,
      skillDetails,
      itemDetails,
      this.pauseTab,
      (i) => { this.pauseTab = i; },
      modDetails,
      (si) => this.askDropSkill(si));
  }

  /** 丢弃技能：二次确认 → 模型层删除（模块退回背包，至少保留 1 个技能） */
  private askDropSkill(si: number) {
    const rs = this.battle.rs;
    const sk = rs.skills[si];
    if (!sk) return;
    if (rs.skills.length <= 1) return;
    const name = SKILLS[sk.id] ? SKILLS[sk.id].name : sk.id;
    const n = sk.mods.length;
    this.curModal = buildConfirm(this.uiRoot, '丢弃技能',
      '丢掉「' + name + '」？' + (n ? '它上面的 ' + n + ' 个黑科技会退回背包。' : '它上面没有黑科技。'),
      '丢弃',
      () => { this.closeModal(); this.showPause(); },
      () => {
        const r = rs.dropSkill(si);
        console.log('[Drop] ' + name + ' → ' + (r.ok ? 'ok' : r.why));
        this.closeModal();
        this.showPause();
      });
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
    if (this.hud && this.battle.rs && this.phase === 'battle') {
      try { this.syncHud(); } catch (e) { this.hudError(e); }
    }
    this.watchdog(_dt);
  }

  /**
   * 卡死看门狗（2026-10-28 用户报"玩到一半页面卡死"）
   *
   * 症状：画面停住、点什么都没反应，但控制台没有明显报错。
   * 根因类型：某个界面构建抛异常 / 弹窗被销毁但没恢复暂停 → 游戏处于
   *          **paused=true 且 curModal=null**，玩家看不到任何可点的东西。
   * 这里兜底：连续 2 秒处于这种状态就自动恢复，至少让玩家能继续玩。
   */
  private watchdog(dt: number) {
    const b = this.battle;
    if (!b || !b.rs) { this.stuckT = 0; return; }
    const stuck = b.paused && !this.curModal && b.running && !!this.hud;
    if (!stuck) { this.stuckT = 0; return; }
    if (this.phase !== 'battle' && this.phase !== 'shop') { this.stuckT = 0; return; }
    this.stuckT += dt;
    if (this.stuckT < 2) return;
    this.stuckT = 0;
    console.warn('[GameRoot] 看门狗：phase=' + this.phase + ' 被暂停但没有弹窗 → 自动恢复');
    if (this.phase === 'shop') {
      // 商店页没建出来：直接开下一波，别把人卡在空商店
      this.phase = 'battle';
      b.paused = false;
      b.advanceWave();
    } else {
      b.paused = false;
    }
  }

  /** HUD 同步异常只刷一次日志，避免每帧刷屏把控制台冲爆 */
  private hudErrCount = 0;
  private hudError(e: unknown) {
    this.hudErrCount++;
    if (this.hudErrCount <= 3) console.error('[UI] HUD 同步失败（第 ' + this.hudErrCount + ' 次）', e);
  }

  private syncHud() {
    const rs = this.battle.rs;
    const boss = this.battle.bossAlive;
    const d: HudData = {
      hp: rs.stats.hp, maxhp: rs.stats.maxhp,
      lv: rs.lv, exp: rs.exp, expNeed: rs.expNeed,
      gold: rs.gold, wave: rs.wave, waveTotal: RUN.waves, waveLeft: this.battle.waveLeftSec,
      waveDur: waveTime(rs.wave),
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
  projectile: '远程', area: '范围', pulse: '周身', chain: '连锁',
  melee: '近战', beam: '射线', burst: '爆发',
  // 特性
  pierceable: '可穿透', homing: '追踪', return: '回旋',
  slow: '减速', dot: '持续伤害',
};
function tagText(tags: string[]): string {
  return tags.map(t => TAG_CN[t] ?? t).join(' · ');
}
