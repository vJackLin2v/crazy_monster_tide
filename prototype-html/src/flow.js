/* ============================================================
   疯狂怪潮 · 流程层：波次闯关（土豆兄弟式）
   用户指令 2026-10-12：去掉树形地图，改为波次闯关（decisions.md D-11）

   单局结构：
     第 1 波(20s) → 波间商店 → 第 2 波(24s，途中出精英) → 商店
     → 第 3 波 → 商店 → 第 4 波 → 商店 → 第 5 波(BOSS，击杀即通关) → 结算
   ============================================================ */
'use strict';

/* ---------- 开局 ---------- */
function startRunFlow(){
  G.wave = 0; G.result = null; G.runTime = 0; G.kills = 0;
  G.shopReroll = 0; G.shopStock = null; G.endless = false;
  nextWave();
}

/* ---------- 进入下一波 ---------- */
function nextWave(){
  const n = (G.wave || 0) + 1;
  // 打通 20 波后：只有玩家选择「收工」才结算，否则进入无尽波次
  if (n > RUN.waves && !G.endless){ showResult(true); return; }
  startWave(n);
  G.paused = false;
  go('battle');
  syncUI();
}

/* ---------- 波次结束：清场 + 结算 + 进商店 ---------- */
function waveClear(){
  G.paused = true;
  // 场上残余怪潮清空（时间到即安全）
  let bonus = 0;
  for (const e of ents.enemies){ if (!e.dead){ e.dead = true; G.kills++; bonus += e.gold || 0; } }
  ents.enemies = [];
  const raw = 16 + G.wave*7 + bonus;   // 原 10+6/波，用户反馈「金币不够」→ 提高结算产出
  const gain = Math.round(raw * (1 + (G.stats.greed || 0)));
  G.gold += gain;
  G.lastWaveGold = gain;
  G.paused = false;
  openShop();
}

/* ---------- 失败 ---------- */
function gameOver(){
  if (G.screen === 'result') return;
  showResult(false);
}

/* ---------- 商店（波间准备） ---------- */
function makeShopStock(){
  const rng = makeRng((G.seed ^ (G.wave*7919) ^ 0x51ED ^ (G.shopReroll*104729)) >>> 0);
  const itemPool = Object.keys(ITEMS).filter(k => !G.items.map(i => i.id).includes(k));
  const modPool  = Object.keys(MODULES).filter(m => G.modsBag.filter(x => x===m).length < MODULES[m].max);
  const out = [];
  for (let i = 0; i < 4; i++){
    const roll = rng.rnd();
    if (roll < 0.45 && itemPool.length){
      const id = itemPool.splice(rng.int(0, itemPool.length-1), 1)[0];
      out.push({kind:'item', id, price: 13 + rng.int(0,6) + G.wave*2});
    } else if (modPool.length){
      const id = modPool.splice(rng.int(0, modPool.length-1), 1)[0];
      out.push({kind:'module', id, price: 17 + rng.int(0,7) + G.wave*3});
    } else if (itemPool.length){
      const id = itemPool.splice(rng.int(0, itemPool.length-1), 1)[0];
      out.push({kind:'item', id, price: 13 + rng.int(0,6) + G.wave*2});
    }
  }
  out.push({kind:'heal', id:'heal', price: 8 + G.wave});
  out.push({kind:'attr', id:'attr', price: 16 + G.wave*3});
  return out;
}
function openShop(){
  if (!G.shopStock) G.shopStock = makeShopStock();
  go('shop');
}
function rerollShop(){
  const cost = 2 + G.shopReroll;
  if (G.gold < cost){ toast('金币不足'); return; }
  G.gold -= cost; G.shopReroll++; G.shopStock = makeShopStock();
  toast('已刷新（-' + cost + ' 金币）');
  renderShop();
}

/* ---------- 升级奖励：4 类横向 3 选 1 ---------- */
function rollRewards(){
  const kinds = ['skill','module','item','attr'];
  const out = [], used = new Set();
  let guard = 0;
  while (out.length < 3 && guard++ < 200){
    const kind = G.rng.pick(kinds);
    let r = null;
    if (kind === 'skill'){
      if (G.skills.length >= 4){
        r = {kind:'skillup', id: G.rng.pick(G.skills).id};
      } else {
        const owned = G.skills.map(s => s.id);
        const pool = Object.keys(SKILLS).filter(k => !owned.includes(k));
        if (!pool.length) continue;
        r = {kind:'skill', id: G.rng.pick(pool)};
      }
    } else if (kind === 'module'){
      const owned = G.skills.map(s => s.id);
      const pool = Object.keys(MODULES).filter(m => {
        const md = MODULES[m];
        if (G.modsBag.filter(x => x===m).length >= md.max) return false;
        return owned.some(sid => SKILLS[sid].tags.some(t => md.requires.includes(t)));
      });
      if (!pool.length) continue;
      r = {kind:'module', id: G.rng.pick(pool)};
    } else if (kind === 'item'){
      const owned = G.items.map(i => i.id);
      const pool = Object.keys(ITEMS).filter(k => !owned.includes(k));
      if (!pool.length) continue;
      r = {kind:'item', id: G.rng.pick(pool)};
    } else {
      const pool = Object.keys(ATTRS).filter(k => !used.has('attr:'+k));
      if (!pool.length) continue;
      const id = G.rng.pick(pool);
      r = {kind:'attr', id};
    }
    const key = r.kind + ':' + (r.id || '');
    if (used.has(key)) continue;
    used.add(key); out.push(r);
  }
  return out;
}

function applyReward(r){
  const st = G.stats;
  if (r.kind === 'skill'){
    G.skills.push(mkSkill(r.id));
    toast('获得技能：' + SKILLS[r.id].name);
  } else if (r.kind === 'skillup'){
    const sk = G.skills.find(s => s.id === r.id); if (sk) sk.lvl++;
    toast(SKILLS[r.id].name + ' 升级到 Lv.' + (sk ? sk.lvl : 2));
  } else if (r.kind === 'item'){
    const it = ITEMS[r.id]; it.apply(st); G.items.push({id:r.id});
    if (st.hp > st.maxhp) st.hp = st.maxhp;
    toast('获得道具：' + it.name);
  } else if (r.kind === 'attr'){
    const a = ATTRS[r.id];
    if (r.id === 'maxhp'){ st.maxhp += a.step; st.hp += a.step; }
    else st[r.id] = (st[r.id] || 0) + a.step;
    G.attrTaken = G.attrTaken || {}; G.attrTaken[r.id] = (G.attrTaken[r.id] || 0) + 1;
    toast('属性提升：' + a.name);
  }
  syncUI();
}

/* ---------- 暂停 ---------- */
function pauseBattle(){ G.paused = true; }
function resumeBattle(){ G.paused = false; G.levelPause = false; }

/* ---------- 结算 ---------- */
function showResult(win){
  G.paused = true;
  G.result = {
    win,
    time: G.runTime,
    kills: G.kills,
    lv: G.lv,
    wave: G.wave,
    waves: Math.max(RUN.waves, G.wave),
    endless: !!G.endless,
    skills: G.skills.map(s => ({id:s.id, lv:s.lvl, mods:s.mods.slice()})),
    items: G.items.map(i => i.id),
    gold: G.gold
  };
  go('result');
}
