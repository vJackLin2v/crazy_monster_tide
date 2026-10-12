/* ============================================================
   疯狂怪潮 · 流程层：地图生成 / 奖励 / 节点结算
   ============================================================ */
'use strict';

/* ---------- 树形地图（需求 §2：每个节点可选择不同风险/收益） ---------- */
function genMap(seed){
  const rng = makeRng(seed ^ 0x9E3779B9);
  const layers = [];
  for (let L=0; L<MAP_CFG.layers; L++){
    const n = L === 0 ? 2 : rng.int(2, MAP_CFG.maxBranch);
    const nodes = [];
    for (let i=0;i<n;i++){
      let type;
      if (L === MAP_CFG.layers-1) type = 'boss';
      else if (L === 0) type = 'battle';
      else {
        const r = rng.rnd()*100;
        if (r < 20) type='elite'; else if (r < 34) type='shop';
        else if (r < 52) type='event'; else type='battle';
      }
      nodes.push({type, idx:i, done:false});
    }
    layers.push(nodes);
  }
  return {layers, seed, layer:0, cur:-1};
}

/* ---------- 升级奖励：4 类横向 3 选 1（需求 §2 / §5 + reward_rules） ---------- */
function rollRewards(){
  const kinds = ['skill','module','item','attr'];
  const out = [];
  const used = new Set();
  let guard = 0;
  while (out.length < 3 && guard++ < 200){
    const kind = G.rng.pick(kinds);
    let r = null;
    if (kind === 'skill'){
      if (G.skills.length >= 4) {                        // 满 4 技能 → 改为技能升级
        r = {kind:'skillup', id: G.rng.pick(G.skills).id};
      } else {
        const owned = G.skills.map(s=>s.id);
        const pool = Object.keys(SKILLS).filter(k=>!owned.includes(k));
        if (!pool.length) continue;
        r = {kind:'skill', id: G.rng.pick(pool)};
      }
    } else if (kind === 'module'){
      const owned = G.skills.map(s=>s.id);
      const pool = Object.keys(MODULES).filter(m=>{
        const md = MODULES[m];
        const cnt = G.modsBag.filter(x=>x===m).length;
        if (cnt >= md.max) return false;
        // 至少有一个已拥有技能兼容
        return owned.some(sid => SKILLS[sid].tags.some(t=>md.requires.includes(t)));
      });
      if (!pool.length) continue;
      r = {kind:'module', id: G.rng.pick(pool)};
    } else if (kind === 'item'){
      const owned = G.items.map(i=>i.id);
      const pool = Object.keys(ITEMS).filter(k=>!owned.includes(k));
      if (!pool.length) continue;
      r = {kind:'item', id: G.rng.pick(pool)};
    } else {
      const pool = Object.keys(ATTRS).filter(k=>!(used.has('attr:'+k)));
      if (!pool.length) continue;
      const id = G.rng.pick(pool);
      r = {kind:'attr', id};
    }
    const key = r.kind+':'+(r.id||'');
    if (used.has(key)) continue;
    used.add(key); out.push(r);
  }
  return out;
}

function applyReward(r){
  const st = G.stats;
  if (r.kind === 'skill'){
    G.skills.push(mkSkill(r.id));
    toast('获得技能：'+SKILLS[r.id].name);
  } else if (r.kind === 'skillup'){
    const sk = G.skills.find(s=>s.id===r.id); if (sk) sk.lvl++;
    toast(SKILLS[r.id].name+' 升级到 Lv.'+(sk?sk.lvl:2));
  } else if (r.kind === 'item'){
    const it = ITEMS[r.id]; it.apply(st); G.items.push({id:r.id});
    if (st.hp > st.maxhp) st.hp = st.maxhp;
    toast('获得道具：'+it.name);
  } else if (r.kind === 'attr'){
    const a = ATTRS[r.id];
    if (r.id === 'maxhp'){ st.maxhp += a.step; st.hp += a.step; }
    else st[r.id] = (st[r.id]||0) + a.step;
    G.attrTaken = G.attrTaken || {}; G.attrTaken[r.id] = (G.attrTaken[r.id]||0)+1;
    toast('属性提升：'+a.name);
  }
  syncUI();
}

/* ---------- 暂停 / 继续 ---------- */
function pauseBattle(){ G.paused = true; }
function resumeBattle(){ G.paused = false; G.levelPause = false; }

/* ---------- 战斗结束 → 回地图 ---------- */
function endBattle(win){
  G.paused = true;
  const node = G.currentNode;
  if (node){ node.done = true; G.map.cur = node.idx; }
  if (!win){ showResult(false); return; }
  G.banner = '';
  // 精英 / Boss 掉落（需求 §2：精英是高级道具/模块主要来源）
  if (node && (node.type === 'elite' || node.type === 'boss')){
    const id = G.rng.pick(ELITE_POOL);
    ITEMS[id].apply(G.stats); G.items.push({id});
    toast('高级战利品：'+ITEMS[id].name);
    if (node.type === 'boss'){
      const modPool = Object.keys(MODULES).filter(m=>
        G.modsBag.filter(x=>x===m).length < MODULES[m].max);
      if (modPool.length){ const mid = G.rng.pick(modPool); G.modsBag.push(mid); toast('高级行为模块：'+MODULES[mid].name); }
    }
  }
  advanceLayer();
  go('map');
}

/* 推进到下一层可选节点 */
function advanceLayer(){
  const m = G.map;
  const next = m.layer + 1;
  if (next >= MAP_CFG.layers){ /* 最后一层打完 → Boss 已结算 */ }
  m.layer = Math.min(next, MAP_CFG.layers-1);
  m.cur = -1;
}

/* ---------- 节点进入 ---------- */
function enterNode(node){
  G.currentNode = node;
  if (node.type === 'shop'){ openShop(); return; }
  if (node.type === 'event'){ openEvent(); return; }
  startBattle(); go('battle'); resumeBattle();
}

/* ---------- 商店（需求 §2 节点类型之一） ---------- */
function shopStock(){
  const rng = makeRng(G.seed ^ (G.map.layer*7919) ^ 0x51ED);
  const modPool = Object.keys(MODULES).filter(m=>G.modsBag.filter(x=>x===m).length < MODULES[m].max);
  const itemPool = Object.keys(ITEMS).filter(k=>!G.items.map(i=>i.id).includes(k));
  const out = [];
  for (let i=0;i<3;i++){
    if (i < 2 && itemPool.length) out.push({kind:'item', id:itemPool.splice(rng.int(0,itemPool.length-1),1)[0], price: rng.int(14,24) + G.map.layer*2});
    else if (modPool.length) out.push({kind:'module', id:modPool.splice(rng.int(0,modPool.length-1),1)[0], price: rng.int(22,34) + G.map.layer*3});
  }
  out.push({kind:'heal', id:'heal', price:12});
  return out;
}

/* ---------- 事件 ---------- */
const EVENTS = [
  {txt:'废墟里有个箱子，上面写着「别打开」。',
   opts:[{t:'打开它（+25 金币，-8 生命）', f:()=>{G.gold+=25; G.stats.hp=Math.max(1,G.stats.hp-8); toast('金币 +25，生命 -8')}},
         {t:'原样离开', f:()=>{toast('你什么都没做')}}]},
  {txt:'一台自动贩卖机还在闪灯，投币口写着「随机」。',
   opts:[{t:'投 10 金币（随机行为模块）', f:()=>{ if(G.gold<10){toast('金币不足');return;} G.gold-=10;
        const pool=Object.keys(MODULES).filter(m=>G.modsBag.filter(x=>x===m).length<MODULES[m].max);
        if(pool.length){const mid=G.rng.pick(pool); G.modsBag.push(mid); toast('获得模块：'+MODULES[mid].name);} else toast('没有可用模块');}},
         {t:'踢它一脚（-3 生命，+1 随机属性）', f:()=>{G.stats.hp=Math.max(1,G.stats.hp-3);
        const id=G.rng.pick(Object.keys(ATTRS)); const a=ATTRS[id];
        if(id==='maxhp'){G.stats.maxhp+=a.step;G.stats.hp+=a.step;} else G.stats[id]+=a.step; toast('属性：'+a.name);}},
         {t:'走开', f:()=>{toast('你走开了')}}]},
  {txt:'受伤的旅人想用「经验」换一点金币。',
   opts:[{t:'给他 12 金币（+3 经验）', f:()=>{ if(G.gold<12){toast('金币不足');return;} G.gold-=12; addExp(3); toast('经验 +3');}},
         {t:'把他背到安全处（-5 生命，+15 金币）', f:()=>{G.stats.hp=Math.max(1,G.stats.hp-5); G.gold+=15; toast('金币 +15');}}]}
];

/* ---------- 结算 ---------- */
function showResult(win, killed){
  G.result = {
    win, time: G.runTime, kills: G.kills, lv: G.lv, layer: G.map.layer,
    skills: G.skills.map(s=>({id:s.id, lv:s.lvl, mods:s.mods.slice()})),
    items: G.items.map(i=>i.id), gold: G.gold
  };
  go('result');
}
