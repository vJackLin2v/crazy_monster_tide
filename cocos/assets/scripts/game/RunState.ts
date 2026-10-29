import { Rng } from '../core/Rng';
import { RUN, SHOP_SLOTS, REROLL_BASE_COST, EXP_BASE, EXP_PER_LEVEL, isBossWave, eliteCount } from '../core/Const';
import { CHARS } from '../data/Chars';
import { ITEMS } from '../data/Items';
import { MODULES, MERGE_COST, baseOf, modPower } from '../data/Modules';
import { SKILLS, SKILL_IDS } from '../data/Skills';
import { ATTRS } from '../data/Attrs';
import { enemyPool, ENEMIES, bossUnitFor } from '../data/Enemies';
import type { CharStats } from '../data/Types';
import { freshStats } from './Stats';
import { calcSkill, makeSkill, MAX_SKILLS, MAX_SLOTS, canInstall, isCompatible, type SkillInst } from './SkillCalc';

export type RewardKind = 'skill' | 'skillup' | 'module' | 'item' | 'attr';
export interface Reward { kind: RewardKind; id: string; needReplace?: boolean; }

export interface ShopSlot {
  kind: 'item' | 'module' | 'heal' | 'attr';
  id: string;
  price: number;
  sold: boolean;
  locked: boolean;
}

/** 一局的状态 —— 纯逻辑，不依赖 Cocos，可脱离编辑器做类型检查与单测 */
export class RunState {
  seed: number;
  rng: Rng;
  charId: string;
  stats: CharStats;
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

  constructor(charId: string, seed: number) {
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
    this.gold += Math.round(gold * (1 + Math.min(1.0, this.stats.greed)));
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
  get spawnPool(): string[] { return enemyPool(this.wave); }
  get bossUnit(): string { return bossUnitFor(this.wave); }

  waveClearGold(bonus = 0): number {
    const raw = 12 + this.wave * 5 + bonus;
    const gain = Math.round(raw * (1 + this.stats.greed));
    this.gold += gain;
    return gain;
  }

  // ---------- 升级 3 选 1（docs/systems/reward_rules.md） ----------
  rollRewards(): Reward[] {
    const out: Reward[] = [];
    const used = new Set<string>();
    let guard = 0;
    while (out.length < 3 && guard++ < 200) {
      const kind = this.rng.pick<RewardKind>(['skill', 'module', 'item', 'attr']);
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
        const pool = Object.keys(ITEMS).filter(k => !this.items.some(i => i.id === k));
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
  mergeReady(baseId: string): number {
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
    this.modsBag.push(baseId + '_2');
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

  installAt(slot: number, target: number, mid: string): { replaced: string | null } {
    const sk = this.skills[slot];
    if (!sk) throw new Error('槽位越界：' + slot);
    if (target < sk.mods.length) {
      const old = sk.mods[target];
      const bagI = this.modsBag.indexOf(mid);
      if (bagI >= 0) this.modsBag.splice(bagI, 1);
      this.modsBag.push(old);
      sk.mods[target] = mid;
      return { replaced: old };
    }
    if (sk.mods.length >= MAX_SLOTS) throw new Error('槽位已满，需指定替换目标');
    const bagI = this.modsBag.indexOf(mid);
    if (bagI >= 0) this.modsBag.splice(bagI, 1);
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

    const target = b.mods[toSl] ?? null;
    if (target !== null) {
      if (!isCompatible(b.id, mod) || !isCompatible(a.id, target)) return false;
      b.mods[toSl] = mod;
      a.mods[fromSl] = target;
    } else {
      if (!isCompatible(b.id, mod)) return false;
      b.mods[toSl] = mod;
      a.mods.splice(fromSl, 1);
    }
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
    const itemPool = Object.keys(ITEMS).filter(k => !this.items.some(i => i.id === k) && !used.includes(k));
    const modPool = Object.keys(MODULES).filter(m => this.totalMods(m) < MODULES[m].max && !used.includes(m));
    if (rng.next() < 0.5 && itemPool.length) {
      const id = rng.pick(itemPool);
      return { kind: 'item', id, price: 12 + rng.int(0, 6) + this.wave * 2, sold: false, locked: false };
    }
    if (modPool.length) {
      const id = rng.pick(modPool);
      return { kind: 'module', id, price: 16 + rng.int(0, 7) + this.wave * 3, sold: false, locked: false };
    }
    if (itemPool.length) {
      const id = rng.pick(itemPool);
      return { kind: 'item', id, price: 12 + rng.int(0, 6) + this.wave * 2, sold: false, locked: false };
    }
    return idx % 2 === 0
      ? { kind: 'heal', id: 'heal', price: 8 + this.wave, sold: false, locked: false }
      : { kind: 'attr', id: 'attr', price: 16 + this.wave * 3, sold: false, locked: false };
  }

  rerollCost(): number { return REROLL_BASE_COST + this.shopReroll; }

  rerollShop(): boolean {
    const cost = this.rerollCost();
    if (this.gold < cost) return false;
    this.gold -= cost;
    this.shopReroll++;
    this.refreshShop(true);
    return true;
  }

  buySlot(i: number): { ok: boolean; why: string } {
    const s = this.shopStock?.[i];
    if (!s) return { ok: false, why: '货位为空' };
    if (s.sold) return { ok: false, why: '已购买' };
    if (this.gold < s.price) return { ok: false, why: '金币不足' };
    this.gold -= s.price;
    s.sold = true;
    s.locked = false;
    if (s.kind === 'item') { ITEMS[s.id].apply(this.stats); this.items.push({ id: s.id }); }
    else if (s.kind === 'module') this.modsBag.push(s.id);
    else if (s.kind === 'heal') this.stats.hp = Math.min(this.stats.maxhp, this.stats.hp + 40);
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
