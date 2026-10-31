import { Rng } from '../core/Rng';
import { balance } from '../core/Balance';
import { RUN, SHOP_SLOTS, EXP_BASE, EXP_PER_LEVEL, isBossWave, eliteCount } from '../core/Const';
import { CHARS } from '../data/Chars';
import { ITEMS } from '../data/Items';
import { difficultyOf, shopPrice } from '../data/Difficulties';
import { modEffect } from '../data/Modules';
import type { DifficultyId } from '../data/Difficulties';
import { MODULES, MERGE_COST, baseOf, modPower, nextLevelId } from '../data/Modules';
import { SKILLS, SKILL_IDS } from '../data/Skills';
import { ATTRS } from '../data/Attrs';
import { enemyPool, ENEMIES, bossUnitFor } from '../data/Enemies';
import type { CharStats } from '../data/Types';
import { freshStats } from './Stats';
import { calcSkill, makeSkill, MAX_SKILLS, MAX_SLOTS, canInstall, isCompatible, modCount, type SkillInst } from './SkillCalc';
import { healStep, HEAL_HARD_CAP } from './HealRules';
import type { RunMilestone } from './RunHistory';

export type RewardKind = 'skill' | 'skillup' | 'module' | 'item' | 'attr';
export interface Reward { kind: RewardKind; id: string; needReplace?: boolean; }

export interface ShopSlot {
  kind: 'item' | 'module' | 'heal' | 'attr';
  id: string;
  price: number;
  /** 难度倍率叠加之前的原价（经济遥测用；heal/attr 没有） */
  basePrice?: number;
  sold: boolean;
  locked: boolean;
}

/** 一局的状态 —— 纯逻辑，不依赖 Cocos，可脱离编辑器做类型检查与单测 */
export class RunState {
  seed: number;
  rng: Rng;
  charId: string;
  stats: CharStats;
  /** 统一回血：当前秒窗口（floor(runTime)）与本窗口已回量；存档恢复需保留 */
  healWindow = -1;
  healSpent = 0;
  skills: SkillInst[] = [];
  items: { id: string }[] = [];
  modsBag: string[] = [];
  gold = 0;
  lv = 1;
  exp = 0;
  expNeed = EXP_BASE;
  wave = 0;
  kills = 0;
  /** 本波击杀数 —— DEMO 的 `G.battleKilled`，HUD 的「击杀 N」用它（不是总击杀） */
  waveKills = 0;
  runTime = 0;
  endless = false;
  attrTaken: Record<string, number> = {};
  /** 本局开局时的属性快照（属性面板的对比基准） */
  baseStats!: CharStats;
  shopReroll = 0;
  shopStock: ShopSlot[] | null = null;
  carryOver: ShopSlot[] = [];
  /**
   * 本局是否已经拿到过传说道具（设计 D：每局最多 1 件）。
   * ⚠️ 商店与升级奖励**共享这一份计数**，不允许各维护一套。
   */
  legendaryTaken = false;

  // ---------- 结算 / 历史对局统计（只做累加，不影响玩法） ----------
  eliteKills = 0;
  bossKills = 0;
  /** 本局累计获得 / 花掉的金币（历史详情用） */
  goldEarned = 0;
  goldSpent = 0;
  /** 关键事件时间线（进入波次 / BOSS / 升级 / 传说 / 无尽），最多 80 条 */
  milestones: RunMilestone[] = [];

  /** 记一条里程碑；同 kind+wave+文本不重复（防止同一波重复写） */
  addMilestone(kind: RunMilestone['kind'], text: string): void {
    if (this.milestones.length >= 80) return;
    const last = this.milestones[this.milestones.length - 1];
    if (last && last.kind === kind && last.wave === this.wave && last.text === text) return;
    this.milestones.push({ wave: this.wave, at: Math.round(this.runTime * 10) / 10, kind, text });
  }

  hasItem(id: string): boolean { return this.items.some(i => i.id === id); }

  /** 传说道具（tier 3） */
  isLegendary(id: string): boolean { return (ITEMS[id]?.tier ?? 1) >= 3; }

  /** 本局还能不能再拿传说道具 */
  get legendaryAvailable(): boolean { return !this.legendaryTaken; }

  /** 获得道具后更新共享计数 */
  private noteItemTaken(id: string): void {
    if (this.isLegendary(id)) this.legendaryTaken = true;
  }

  /** 候选池是否允许这件道具（已拥有 / 传说已拿过 都要排除） */
  private itemAllowedInPool(id: string): boolean {
    if (this.items.some(i => i.id === id)) return false;
    if (this.legendaryTaken && this.isLegendary(id)) return false;
    return true;
  }

  /** 本局难度（开局从存档复制，局内不可改） */
  difficulty: DifficultyId = 'normal';

  constructor(charId: string, seed: number, difficulty: DifficultyId = 'normal') {
    this.difficulty = difficulty;
    const c = CHARS.find(x => x.id === charId);
    if (!c) throw new Error('未知角色：' + charId);
    this.charId = charId;
    this.seed = seed >>> 0;
    this.rng = new Rng(this.seed);
    this.stats = freshStats(c);
    // M67（第三轮 A2.1）：记录**本局开局基线**。属性面板的"高于/低于基础"必须以角色开局值为基准，
    //   不能用 ATTRS.base（那是全表通用值，如生命上限写死 100，而骑士开局只有 72）。
    this.baseStats = { ...this.stats };
    this.skills = [makeSkill(c.start)];
  }

  /**
   * 唯一玩家回血入口（战斗吸血/击杀回血/波末恢复/商店治疗/道具都走这里）。
   *
   * @param amount 原始回血量（会校验 finite / 正数 / 上限）
   * @param instant true = 瞬时治疗（商店/波末节奏恢复），不吃战斗每秒预算；仍受最大生命夹取
   * @returns 实际增加的生命
   */
  heal(amount: number, instant = false): number {
    const st = this.stats;
    if (!Number.isFinite(amount) || amount <= 0) return 0;
    if (!Number.isFinite(st.maxhp) || st.maxhp <= 0) return 0;
    if (!Number.isFinite(st.hp)) st.hp = 1;
    const win = Math.floor(this.runTime);
    if (win !== this.healWindow) { this.healWindow = win; this.healSpent = 0; }
    const room = Math.max(0, st.maxhp - st.hp);
    if (room <= 0) return 0;
    let healed: number;
    if (!instant) {
      const hpPct = st.hp / st.maxhp;
      // room 传入 healStep：预算只按实际恢复量累计（99/100 请求 5 → 只记 1）
      const step = healStep(amount, this.difficulty, hpPct, this.healSpent, room);
      healed = step.heal;
      this.healSpent = Math.min(HEAL_HARD_CAP, Math.max(0, step.spent));
    } else {
      healed = Math.min(amount, room);
    }
    if (healed > 0) st.hp += healed;
    return healed;
  }

  /**
   * 清空当前秒回血预算（进入商店等安全区时调用）。
   * 只是开启一个新的预算窗口，不改变任何回血数值。
   */
  resetHealBudget(): void {
    this.healWindow = Math.floor(this.runTime);
    this.healSpent = 0;
  }

  get expProgress(): number { return Math.min(1, this.exp / this.expNeed); }

  addExp(v: number): number {
    // ★ 经验获取属性
    // 阶段 E：经验获取上限 +100%（避免等级雪球无上限）
    this.exp += v * (1 + Math.min(1.0, this.stats.expGain ?? 0));
    let ups = 0;
    while (this.exp >= this.expNeed) {
      this.exp -= this.expNeed;
      this.lv++; ups++;
      this.expNeed = Math.round(EXP_BASE + this.lv * EXP_PER_LEVEL);
    }
    return ups;
  }

  /**
   * 击杀结算（**只给击杀数与金币**）
   *
   * ⚠️ 2026-10-17 用户反馈「怪物没有掉落经验值，拾取范围失去意义」：
   *    原来这里直接 `addExp(exp)` —— 击杀瞬间经验就到账了，
   *    地上的经验球纯装饰（而且捡起来还会再加一次 = 重复计算）。
   *    现在**经验只在拾取时给**（见 `Battle.updateGems`），拾取范围才有意义。
   */
  addKill(_exp: number, gold: number): void {
    this.kills++;
    this.waveKills++;
    // 阶段 E：金币获取上限 +100%
    const gain = Math.round(gold * (1 + Math.min(1.0, this.stats.greed)));
    this.gold += gain;
    this.goldEarned += gain;
  }

  nextWave(): number {
    const n = this.wave + 1;
    if (n > RUN.waves && !this.endless) return -1;
    this.wave = n;
    this.waveKills = 0;          // DEMO 在 startWave 里重置 battleKilled
    return n;
  }
  get isBossWaveNow(): boolean { return isBossWave(this.wave); }
  get elitesThisWave(): number { return this.wave > 0 && !isBossWave(this.wave) ? eliteCount(this.wave) : 0; }
  /** C7：按波次缓存刷怪池（同波多次读取不再重建数组） */
  private poolWave = -1;
  private poolCache: string[] = [];
  get spawnPool(): string[] {
    if (this.poolWave !== this.wave) {
      this.poolCache = enemyPool(this.wave);
      this.poolWave = this.wave;
    }
    return this.poolCache;
  }
  get bossUnit(): string { return bossUnitFor(this.wave); }

  waveClearGold(bonus = 0): number {
    const P = balance().shop;
    const raw = P.clearGoldBase + this.wave * P.clearGoldPerWave + bonus;
    // ⚠️ B10：击杀金币用 Math.min(1, greed) 封顶 +100%，波末金币却直接 (1+greed)，
    //    两处规则冲突。统一按"金币获取加成上限 +100%"处理。
    const gain = Math.round(raw * (1 + Math.min(1, this.stats.greed)));
    this.gold += gain;
    this.goldEarned += gain;
    return gain;
  }

  // ---------- 升级 3 选 1（docs/systems/reward_rules.md） ----------
  rollRewards(): Reward[] {
    const out: Reward[] = [];
    const used = new Set<string>();
    let guard = 0;
    // ★ 2026-10-29（玩法审计 §8.4）：原来是 4 类**等概率 25%**，中后期会频繁出现"三张都没用"。
    //   改成分阶段权重；并且保证三张里至少有一张不是纯属性（属性是"看不出变化"的那一类）。
    const R = balance().reward;
    const band: Partial<Record<RewardKind, number>> =
      this.lv <= R.earlyMax ? R.early : this.lv <= R.midMax ? R.mid : R.late;
    const pickKind = (): RewardKind => {
      let r = this.rng.next();
      for (const k of ['skill', 'module', 'item', 'attr'] as RewardKind[]) {
        r -= band[k] ?? 0;
        if (r <= 0) return k;
      }
      return 'attr';
    };
    while (out.length < 3 && guard++ < 200) {
      let kind = pickKind();
      // 保底：第 3 张如果是属性，但前面也全是属性，就改抽模块/道具
      if (out.length === 2 && kind === 'attr' && out.every(o => o.kind === 'attr')) kind = 'module';
      let r: Reward | null = null;

      if (kind === 'skill') {
        if (this.skills.length >= MAX_SKILLS) {
          // 技能满 4 个：45% 强化已有，55% 给新技能（选中后走替换流程）
          if (this.rng.chance(0.45)) {
            r = { kind: 'skillup', id: this.rng.pick(this.skills).id };
          } else {
            const owned = this.skills.map(s => s.id);
            const pool = SKILL_IDS.filter(k => !owned.includes(k));
            r = pool.length ? { kind: 'skill', id: this.rng.pick(pool), needReplace: true }
                            : { kind: 'skillup', id: this.rng.pick(this.skills).id };
          }
        } else {
          const owned = this.skills.map(s => s.id);
          const pool = SKILL_IDS.filter(k => !owned.includes(k));
          if (!pool.length) continue;
          r = { kind: 'skill', id: this.rng.pick(pool) };
        }
      } else if (kind === 'module') {
        const pool = Object.keys(MODULES).filter(m => {
          if (this.totalMods(m) >= MODULES[m].max) return false;
          return this.skills.some(sk => canInstall(sk, m).why !== '不兼容');
        });
        if (!pool.length) continue;
        r = { kind: 'module', id: this.rng.pick(pool) };
      } else if (kind === 'item') {
        // 传说道具：商店与升级池共享"本局已拿过"计数（设计 D）
        const pool = Object.keys(ITEMS).filter(k => this.itemAllowedInPool(k));
        if (!pool.length) continue;
        r = { kind: 'item', id: this.rng.pick(pool) };
      } else {
        const pool = Object.keys(ATTRS).filter(k => !used.has('attr:' + k));
        if (!pool.length) continue;
        r = { kind: 'attr', id: this.rng.pick(pool) };
      }

      const key = r.kind + ':' + r.id;
      if (used.has(key)) continue;
      used.add(key);
      out.push(r);
    }
    return out;
  }

  /** 这个模块"值几份"（背包 + 所有技能槽；强化模块 = 2 份） */
  totalMods(mid: string): number {
    const base = baseOf(mid);
    let n = 0;
    for (const x of this.modsBag) if (baseOf(x) === base) n += modPower(x);
    for (const sk of this.skills) for (const x of sk.mods) if (baseOf(x) === base) n += modPower(x);
    return n;
  }

  /** 还能合成几次：3 个同名**基础**模块 = 1 次（强化版不再参与合成，封顶 ×2） */
  /** 一键卸下：把所有技能上的黑科技退回背包 */
  unequipAll(): number {
    let n = 0;
    for (const sk of this.skills) {
      while (sk.mods.length) { const m = sk.mods.pop(); if (m) { this.modsBag.push(m); n++; } }
    }
    return n;
  }

  /** 出售背包里的黑科技（idx 为 modsBag 下标），返回获得金币 */
  sellMod(idx: number): number {
    if (idx < 0 || idx >= this.modsBag.length) return 0;
    const id = this.modsBag[idx];
    this.modsBag.splice(idx, 1);
    const gold = Math.max(6, Math.round(9 * modEffect(id)));
    this.gold += gold;
    return gold;
  }

  mergeReady(baseId: string): number {
    // 只数**完全同名同级**的副本：巨大 与 巨大_2 分开计数，所以不能混着合
    let plain = 0;
    for (const x of this.modsBag) if (x === baseId) plain++;
    for (const sk of this.skills) for (const x of sk.mods) if (x === baseId) plain++;
    return Math.floor(plain / MERGE_COST);
  }

  /**
   * 合成（M32，用户定的规则 B）：消耗 3 个同名基础模块 → 1 个强化模块进背包。
   * 优先扣背包里的，再从技能槽里扣（从后往前，避免索引错位）。
   * 强化模块 = 2 份效果、只占 1 槽；因为 mergeReady 只数基础模块，所以不会再被合成。
   */
  mergeModule(baseId: string): boolean {
    if (this.mergeReady(baseId) < 1) return false;
    let need = MERGE_COST;
    for (let i = this.modsBag.length - 1; i >= 0 && need > 0; i--) {
      if (this.modsBag[i] === baseId) { this.modsBag.splice(i, 1); need--; }
    }
    for (let s = this.skills.length - 1; s >= 0 && need > 0; s--) {
      const mods = this.skills[s].mods;
      for (let k = mods.length - 1; k >= 0 && need > 0; k--) {
        if (mods[k] === baseId) { mods.splice(k, 1); need--; }
      }
    }
    if (need > 0) return false;
    this.modsBag.push(nextLevelId(baseId));   // 3 个 N 级 -> 1 个 N+1 级（可无限）
    return true;
  }

  applyReward(r: Reward): void {
    if (r.kind === 'skill') {
      // ⚠️ 保险：满 4 个时**必须走替换流程**，不能直接 push。
      //    曾经 push 成第 5 个 —— 战斗循环只跑前 4 个，那个奖励等于白拿（且玩家看不见）。
      if (this.skills.length >= MAX_SKILLS) return;
      this.skills.push(makeSkill(r.id));
    }
    else if (r.kind === 'skillup') {
      const sk = this.skills.find(s => s.id === r.id);
      if (sk) sk.lvl++;
    } else if (r.kind === 'item') {
      ITEMS[r.id].apply(this.stats);
      this.items.push({ id: r.id });
      this.noteItemTaken(r.id);
      if (this.stats.hp > this.stats.maxhp) this.stats.hp = this.stats.maxhp;
    } else if (r.kind === 'attr') {
      const a = ATTRS[r.id];
      if (r.id === 'maxhp') { this.stats.maxhp += a.step; this.stats.hp += a.step; }
      else (this.stats as unknown as Record<string, number>)[r.id] += a.step;
      this.attrTaken[r.id] = (this.attrTaken[r.id] ?? 0) + 1;
    }
  }

  // ---------- 技能 / 模块替换（D-21）：替换一律不让玩家损失 ----------
  replaceSkill(slot: number, newId: string): string[] {
    const sk = this.skills[slot];
    if (!sk) throw new Error('槽位越界：' + slot);
    const back = sk.mods.slice();
    this.modsBag.push(...back);
    this.skills[slot] = makeSkill(newId);
    return back;
  }

  /**
   * 把一个模块装到 slot 技能的 target 槽位。
   *
   * ⚠️ B3：模型层必须是**最终防线**。UI 把行变暗只是提示，回调仍可能被程序/测试直接调用。
   * ⚠️ B4：叠加判定要用「已占份数 + 本次模块份数 ≤ max」，不能只比"当前份数 < max"
   *    —— 强化模块 _2 一次占 2 份，旧写法会让 max=2 的模块被装到 3 份。
   * 所有校验都在**改动任何状态之前**完成；失败抛错且不产生副作用。
   */
  /**
   * 主动丢弃一个技能（用户 2026-10-30 要求）。
   * 规则：**至少保留 1 个技能**；被丢技能上的黑科技全部退回背包，不损失。
   */
  dropSkill(slot: number): { ok: boolean; why: string; back?: string[] } {
    const sk = this.skills[slot];
    if (!sk) return { ok: false, why: '技能槽越界' };
    if (this.skills.length <= 1) return { ok: false, why: '至少要保留 1 个技能' };
    const back = sk.mods.slice();
    this.modsBag.push(...back);
    this.skills.splice(slot, 1);
    return { ok: true, why: '', back };
  }

  installAt(slot: number, target: number, mid: string): { replaced: string | null } {
    const sk = this.skills[slot];
    if (!sk) throw new Error('技能槽越界：' + slot);
    if (!Number.isInteger(target) || target < 0 || target >= MAX_SLOTS) throw new Error('模块槽越界：' + target);
    const m = MODULES[baseOf(mid)];
    if (!m) throw new Error('未知模块：' + mid);
    if (this.modsBag.indexOf(mid) < 0) throw new Error('背包里没有该模块：' + mid);
    if (!isCompatible(sk.id, mid)) throw new Error('不兼容：' + mid);
    const old = sk.mods[target];
    if (!old && sk.mods.length >= MAX_SLOTS) throw new Error('槽位已满，需指定替换目标');
    // 被顶掉的那一份不算在内：它同时离开技能（换成同 id 时两边抵消）
    const existing = modCount(sk, mid) - (old && baseOf(old) === baseOf(mid) ? modPower(old) : 0);
    if (existing + modPower(mid) > m.max) throw new Error('超过上限：' + mid + '（' + existing + '+' + modPower(mid) + ' > ' + m.max + '）');

    // —— 校验全部通过，开始提交（之后不会再 return）——
    const bagI = this.modsBag.indexOf(mid);
    this.modsBag.splice(bagI, 1);
    if (old) { this.modsBag.push(old); sk.mods[target] = mid; return { replaced: old }; }
    sk.mods.push(mid);
    return { replaced: null };
  }

  /**
   * 卸下：把某个技能槽上的模块**取回背包**（M36——之前只能替换，不能下架）。
   * 返回 true 表示成功。
   */
  unequip(si: number, sl: number): boolean {
    const sk = this.skills[si];
    if (!sk) return false;
    const mod = sk.mods[sl];
    if (!mod) return false;
    sk.mods.splice(sl, 1);
    this.modsBag.push(mod);
    return true;
  }

  /**
   * 把**已经装在技能上**的模块挪到另一个槽位（同技能内挪位置 / 跨技能搬 / 目标已占用则交换）。
   *
   * 为什么需要：behavior_modules.md §1 写死「玩家可在 Build 面板中重新分配已拥有的模块」，
   * 而暂停面板的「装模块」只能装背包里的东西 —— 背包一空就什么都做不了
   * （用户反馈「暂停面板点装模块无法安装模块」，2026-10-20 M30 #5）。
   * 这里保证任何情况都不让玩家损失模块：目标有模块就交换。
   */
  moveMod(fromSi: number, fromSl: number, toSi: number, toSl: number): boolean {
    const a = this.skills[fromSi], b = this.skills[toSi];
    if (!a || !b) return false;
    if (fromSi === toSi && fromSl === toSl) return false;
    const mod = a.mods[fromSl];
    if (!mod) return false;

    if (fromSi === toSi) {
      const arr = a.mods;
      if (toSl < arr.length) {
        const t = arr[toSl];
        if (!isCompatible(a.id, t)) return false;
        arr[toSl] = mod; arr[fromSl] = t;
      } else {
        arr.splice(fromSl, 1);
        arr.splice(toSl, 0, mod);
      }
      return true;
    }

    // ⚠️ B2：跨技能搬到"空槽"时不能写 b.mods[toSl] = mod —— 当 toSl >= 长度时会
    //    造出带空洞的稀疏数组（例如 [] 上写 index 2 → [empty, empty, mod]），
    //    之后 calcSkill 迭代到 undefined 会崩，槽位计数也会与 UI 不一致。
    //    正确语义：mods 永远是**连续**数组；空槽 = 位置由 push 决定（UI 的点选只用来表达"要装"）。
    const isEmptySlot = toSl >= b.mods.length || b.mods[toSl] === undefined;
    if (!isEmptySlot) {
      const target = b.mods[toSl];
      if (!isCompatible(b.id, mod) || !isCompatible(a.id, target)) return false;
      b.mods[toSl] = mod;
      a.mods[fromSl] = target;
      return true;
    }
    if (!isCompatible(b.id, mod)) return false;
    if (b.mods.length >= MAX_SLOTS) return false;      // 目标技能已满 3 槽
    b.mods.push(mod);
    a.mods.splice(fromSl, 1);
    return true;
  }

  // ---------- 商店（固定 4 货位 + 锁定，参考 Brotato） ----------
  refreshShop(keepLocked: boolean): void {
    const prev = this.shopStock ?? [];
    const carried = this.carryOver.slice();
    const used: string[] = [];
    const out: ShopSlot[] = [];
    for (let i = 0; i < SHOP_SLOTS; i++) {
      const p = prev[i];
      if (keepLocked && p && p.locked && !p.sold) { out.push(p); used.push(p.id); continue; }
      const c = carried.shift();
      if (c && !c.sold) { out.push(c); used.push(c.id); continue; }
      // ⚠️ 必须把抽到的 id 记进 used：否则 4 次抽样的 RNG 种子完全一样
      //    （种子里有 used.length），4 个货位会刷成**同一件商品**。
      //    DEMO 的 refreshShop 里有这一行，移植时漏了。
      const it = this.makeShopItem(used, i);
      used.push(it.id);
      out.push(it);
    }
    this.shopStock = out;
    this.carryOver = [];
  }

  private makeShopItem(used: string[], idx: number): ShopSlot {
    const rng = new Rng((this.seed ^ (this.wave * 7919) ^ (this.shopReroll * 104729) ^ (used.length * 2654435761)) >>> 0);
    const itemPool = Object.keys(ITEMS).filter(k => this.itemAllowedInPool(k) && !used.includes(k));
    const modPool = Object.keys(MODULES).filter(m => this.totalMods(m) < MODULES[m].max && !used.includes(m));
    const P = balance().shop;
    // basePrice = 难度倍率之前的原价（只用于遥测，不参与结算）
    let rawItem = 0, rawMod = 0;
    const itemPrice = () => {
      rawItem = P.itemBase + rng.int(0, P.itemRand) + this.wave * P.itemPerWave;
      return Math.round(shopPrice(rawItem, this.difficulty, this.wave));
    };
    const modPrice = () => {
      rawMod = P.modBase + rng.int(0, P.modRand) + this.wave * P.modPerWave;
      return Math.round(shopPrice(rawMod, this.difficulty, this.wave));
    };
    if (rng.next() < 0.5 && itemPool.length) {
      const id = rng.pick(itemPool);
      return { kind: 'item', id, price: itemPrice(), basePrice: Math.round(rawItem), sold: false, locked: false };
    }
    if (modPool.length) {
      const id = rng.pick(modPool);
      return { kind: 'module', id, price: modPrice(), basePrice: Math.round(rawMod), sold: false, locked: false };
    }
    if (itemPool.length) {
      const id = rng.pick(itemPool);
      return { kind: 'item', id, price: itemPrice(), basePrice: Math.round(rawItem), sold: false, locked: false };
    }
    return idx % 2 === 0
      ? { kind: 'heal', id: 'heal', price: P.healBase + this.wave * P.healPerWave, sold: false, locked: false }
      : { kind: 'attr', id: 'attr', price: P.attrBase + this.wave * P.attrPerWave, sold: false, locked: false };
  }

  rerollCost(): number {
    // 刷新费用增长：基础 + 次数 ×3（原来每刷一次只 +1，后期金币溢出时几乎无成本）
    const base = (balance().shop.rerollBase + this.shopReroll * 3) * difficultyOf(this.difficulty).rerollCostMul;
    return Math.round(this.hasItem('frugal') ? base * 0.5 : base);
  }

  rerollShop(): boolean {
    const cost = this.rerollCost();
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.goldSpent += cost;
    this.shopReroll++;
    this.refreshShop(true);
    return true;
  }

  buySlot(i: number): { ok: boolean; why: string } {
    const s = this.shopStock?.[i];
    if (!s) return { ok: false, why: '货位为空' };
    if (s.sold) return { ok: false, why: '已购买' };
    // ⚠️ B12：**先校验商品能否兑现，再扣钱**。
    //    旧实现在扣钱之后才走 kind 分支，如果 id 在数据表里不存在（存档损坏、版本回退、
    //    手改过的 shopStock），会先扣钱、再抛异常 → 钱没了东西也没拿到。
    if (s.id !== 'heal' && s.id !== 'attr') {
      if (s.kind === 'item' && !ITEMS[s.id]) return { ok: false, why: '道具不存在：' + s.id };
      if (s.kind === 'module' && !MODULES[baseOf(s.id)]) return { ok: false, why: '模块不存在：' + s.id };
      if (s.kind !== 'item' && s.kind !== 'module') return { ok: false, why: '商品类型非法：' + s.kind };
    }
    if (this.gold < s.price) return { ok: false, why: '金币不足' };
    this.gold -= s.price;
    this.goldSpent += s.price;
    s.sold = true;
    s.locked = false;
    if (s.kind === 'item') {
      ITEMS[s.id].apply(this.stats);
      this.items.push({ id: s.id });
      this.noteItemTaken(s.id);          // 商店与升级池共享传说计数
    }
    else if (s.kind === 'module') this.modsBag.push(s.id);
    else if (s.kind === 'heal') this.heal(40, true);   // 商店治疗：走唯一回血入口（瞬时，不占战斗预算）
    else {
      const id = this.rng.pick(Object.keys(ATTRS));
      const a = ATTRS[id];
      if (id === 'maxhp') { this.stats.maxhp += a.step; this.stats.hp += a.step; }
      else (this.stats as unknown as Record<string, number>)[id] += a.step;
    }
    return { ok: true, why: '' };
  }

  toggleLock(i: number): void {
    const s = this.shopStock?.[i];
    if (!s || s.sold) return;
    s.locked = !s.locked;
  }

  carryLockedToNextWave(): void {
    this.carryOver = (this.shopStock ?? []).filter(s => s.locked && !s.sold);
    this.shopStock = null;
    this.shopReroll = 0;
  }

  skillRuntime(i: number) { return calcSkill(this.skills[i], this.stats); }
  get charDef() { return CHARS.find(c => c.id === this.charId)!; }
  skillName(id: string) { return SKILLS[id]?.name ?? id; }
  get enemyCount(): number { return Object.keys(ENEMIES).length; }
}
