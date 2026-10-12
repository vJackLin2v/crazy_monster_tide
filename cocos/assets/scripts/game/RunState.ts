import { Rng } from '../core/Rng';
import { RUN, SHOP_SLOTS, REROLL_BASE_COST, EXP_BASE, EXP_PER_LEVEL, isBossWave, eliteCount } from '../core/Const';
import { CHARS } from '../data/Chars';
import { ITEMS } from '../data/Items';
import { MODULES } from '../data/Modules';
import { SKILLS, SKILL_IDS } from '../data/Skills';
import { ATTRS } from '../data/Attrs';
import { enemyPool, ENEMIES, bossUnitFor } from '../data/Enemies';
import type { CharStats } from '../data/Types';
import { freshStats } from './Stats';
import { calcSkill, makeSkill, MAX_SKILLS, MAX_SLOTS, canInstall, type SkillInst } from './SkillCalc';

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
  runTime = 0;
  endless = false;
  attrTaken: Record<string, number> = {};
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
    this.skills = [makeSkill(c.start)];
  }

  get expProgress(): number { return Math.min(1, this.exp / this.expNeed); }

  addExp(v: number): number {
    this.exp += v;
    let ups = 0;
    while (this.exp >= this.expNeed) {
      this.exp -= this.expNeed;
      this.lv++; ups++;
      this.expNeed = Math.round(EXP_BASE + this.lv * EXP_PER_LEVEL);
    }
    return ups;
  }

  addKill(exp: number, gold: number): void {
    this.kills++;
    this.gold += Math.round(gold * (1 + this.stats.greed));
    this.addExp(exp);
  }

  nextWave(): number {
    const n = this.wave + 1;
    if (n > RUN.waves && !this.endless) return -1;
    this.wave = n;
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

  totalMods(mid: string): number {
    let n = this.modsBag.filter(x => x === mid).length;
    for (const sk of this.skills) n += sk.mods.filter(x => x === mid).length;
    return n;
  }

  applyReward(r: Reward): void {
    if (r.kind === 'skill') this.skills.push(makeSkill(r.id));
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
      out.push(this.makeShopItem(used, i));
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
