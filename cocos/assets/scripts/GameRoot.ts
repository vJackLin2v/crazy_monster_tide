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
import { SCREEN_W, SCREEN_H, RUN } from './core/Const';
import { Joystick } from './engine/Joystick';
import { Battle } from './battle/Battle';
import { mkNode } from './ui/UIKit';
import { Hud, type HudData } from './ui/Hud';
import { buildMenu, buildHowto, buildCharSelect, buildResult } from './ui/MenuScreens';
import { buildLevelUp, buildShop, buildBuildDrawer, buildConfirm, type CardData, type ShopSlotView } from './ui/Modals';
import { CHARS } from './data/Chars';
import { SKILLS } from './data/Skills';
import { MODULES } from './data/Modules';
import { ITEMS } from './data/Items';
import { ATTRS } from './data/Attrs';
import { calcSkill } from './game/SkillCalc';
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

    this.showMenu();
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
    await this.battle.startRun(this.charId, this.seed);
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

  private pickReward(i: number) {
    const r = i >= 0 ? this.pendingRewards[i] : null;
    if (r) {
      if (r.kind === 'module') this.battle.rs.modsBag.push(r.id);
      else this.battle.rs.applyReward(r);
    }
    this.closeModal();
    this.battle.resumeFromModal();
  }

  private toCard(r: Reward): CardData {
    if (r.kind === 'skill') {
      const s = SKILLS[r.id];
      return { kind: 'skill', title: s ? s.name : r.id, sub: '新技能', desc: s ? tagText(s.tags) : '' };
    }
    if (r.kind === 'skillup') {
      const s = SKILLS[r.id];
      const cur = this.battle.rs.skills.find(k => k.id === r.id);
      return { kind: 'skillup', title: s ? s.name : r.id, sub: 'Lv.' + (cur ? cur.lvl : 1) + ' → +1', desc: '伤害 +22% / 冷却 -6%' };
    }
    if (r.kind === 'module') {
      const m = MODULES[r.id];
      return { kind: 'module', title: m ? m.name : r.id, sub: r.needReplace ? '装到技能上' : '行为模块', desc: m ? m.desc : '' };
    }
    if (r.kind === 'item') {
      const it = ITEMS[r.id];
      return { kind: 'item', title: it ? it.name : r.id, sub: '道具', desc: it ? it.desc : '' };
    }
    const a = ATTRS[r.id];
    return { kind: 'attr', title: a ? a.name : r.id, sub: '属性', desc: a ? a.fmt(a.base + a.step) : '' };
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
      return { title, sub, price: s.price, sold: s.sold, locked: s.locked, kind: s.kind };
    });
    this.curModal = buildShop(this.uiRoot, rs.wave, rs.gold, slots,
      (i) => { rs.buySlot(i); this.renderShop(); },
      (i) => { rs.toggleLock(i); this.renderShop(); },
      () => { rs.rerollShop(); this.renderShop(); },
      rs.rerollCost(),
      () => this.nextWave());
  }

  private nextWave() {
    this.closeModal();
    this.phase = 'battle';
    this.battle.advanceWave();
  }

  // ---------- 11. 结算 ----------
  private showResult(win: boolean) {
    this.phase = 'result';
    this.closeModal(); this.clearScreen();
    const rs = this.battle.rs;
    const build = rs.skills.map(s => {
      const def = SKILLS[s.id];
      return (def ? def.name : s.id) + (s.mods.length ? '(' + s.mods.length + ')' : '');
    });
    this.battleNode.active = false;
    this.joyNode.active = false;
    this.cur = buildResult(this.uiRoot,
      { win, wave: rs.wave, lv: rs.lv, kills: rs.kills, time: rs.runTime, build },
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
      { tab: '属性', lines: [
          '攻击力 ' + rs.stats.power.toFixed(2) + 'x   攻速 ' + rs.stats.haste.toFixed(2) + 'x',
          '范围 ' + rs.stats.area.toFixed(2) + 'x   移速 ' + Math.round(rs.stats.speed),
          '生命 ' + Math.round(rs.stats.hp) + '/' + rs.stats.maxhp + '   减伤 ' + Math.round(rs.stats.armor * 100) + '%',
          '暴击 ' + Math.round(rs.stats.crit * 100) + '%   暴伤 ' + Math.round(rs.stats.critdmg * 100) + '%',
        ] },
    ];
    this.battle.paused = true;
    this.curModal = buildBuildDrawer(this.uiRoot, pages,
      () => { this.closeModal(); this.confirmQuit(); },
      () => { this.closeModal(); this.battle.paused = false; });
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
      bossName: boss ? 'BOSS' : null, bossHp: boss ? boss.hp : 0, bossMax: boss ? boss.maxhp : 0,
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

function tagText(tags: string[]): string {
  const M: Record<string, string> = { fire: '火', ice: '冰', lightning: '雷', physical: '物理',
    arcane: '奥术', holy: '圣', poison: '毒', nature: '自然' };
  return tags.map(t => M[t] || t).join('/');
}
