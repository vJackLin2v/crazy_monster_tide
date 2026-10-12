/* ============================================================
   疯狂怪潮 · 引擎层
   规则来源：docs/requirements.md v0.2
   - 4 个主动技能，自动开火（玩家只走位）
   - 每技能 3 个行为槽，模块可重复安装，按自身叠加规则生效
   - 升级横向 3 选 1（技能 / 行为模块 / 道具 / 属性）
   - 树形地图；精英给高级奖励
   - 所有随机由 RunSeed 驱动（可复现）
   ============================================================ */
'use strict';

/* ---------- 可复现随机 ---------- */
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}
function makeRng(seed){const f=mulberry32(seed);return{rnd:f,range:(a,b)=>a+f()*(b-a),int:(a,b)=>Math.floor(a+f()*(b-a+1)),pick:arr=>arr[Math.floor(f()*arr.length)],chance:p=>f()<p}}

/* ---------- 世界 ---------- */
const W = 540, H = 820;              // 竞技场（大于屏幕，摄像机跟随）
const ARENA = {W, H};

const G = {
  seed: 1, rng: null, screen: 'charselect',
  char: null, map: null, layer: 0, nodeIdx: -1,
  skills: [], items: [], modsBag: [], gold: 0,
  lv: 1, exp: 0, expNeed: 5, runTime: 0, kills: 0,
  paused: false, banner: '', stats: {}
};

function freshStats(char){
  const s = {power:1, haste:1, area:1, maxhp:100, speed:62, crit:0.05, critdmg:1.5,
             pickup:26, armor:0, regen:0, projSpd:1, greed:0, tagBonus:{}, tagCdr:{}};
  Object.assign(s, char.stats || {});
  s.hp = s.maxhp;
  return s;
}

/* ---------- 技能实例 ---------- */
function mkSkill(id){
  const base = SKILLS[id];
  return {id, lvl:1, mods:[], t:0, seq:0};
}
function modCount(sk, mid){ return sk.mods.filter(m=>m===mid).length; }
/* 计算技能实际参数（模块 + 属性 生效后的结果） */
function calcSkill(sk){
  const b = SKILLS[sk.id], st = G.stats;
  const cnt = id => modCount(sk, id);
  let cd = b.cd * Math.pow(0.94, sk.lvl-1);
  let dmg = b.dmg * (1 + 0.22*(sk.lvl-1));
  let count = 1, fan = 0, pierce = 0, bounce = 0, orbit = 0, split = 0;
  let sizeMul = 1, echo = 0, burn = 0, slow = 0, vamp = 0, rapid = 0;

  for (const mid of sk.mods){
    switch(mid){
      case 'multi':  count += 1; break;
      case 'fan':    fan   += 1; break;
      case 'split':  split += 1; break;
      case 'bounce': bounce+= 1; break;
      case 'pierce': pierce+= 1; break;
      case 'orbit':  orbit += 1; break;
      case 'giant':  sizeMul *= 1.30; break;
      case 'rapid':  rapid += 1; break;
      case 'echo':   echo  += 1; break;
      case 'burn':   burn  += 1; break;
      case 'frost':  slow  += 1; break;
      case 'vamp':   vamp  += 1; break;
    }
  }
  cd *= Math.pow(0.88, rapid);
  // 标签冷却减免（来自道具）
  const tb = st.tagCdr || {};
  for (const t of b.tags) if (tb[t]) cd *= (1 - tb[t]);
  cd = cd / st.haste;                       // 攻速属性影响冷却
  // 标签伤害加成（来自道具）
  let tagMul = 1; const bo = st.tagBonus || {};
  for (const t of b.tags) if (bo[t]) tagMul *= (1 + bo[t]);
  dmg *= st.power * tagMul;

  return {cd: Math.max(0.12, cd), dmg, count, fan, pierce, bounce, orbit, split,
          size: b.size * sizeMul * (0.9 + 0.1*st.area) * st.area, echo, burn, slow, vamp,
          color: b.color, type: b.type, spd: b.spd * (st.projSpd || 1)};
}

/* ---------- 局内实体 ---------- */
let ents = {enemies:[], bullets:[], areas:[], gems:[], texts:[], fx:[], summons:[]};
function resetEnts(){ ents = {enemies:[], bullets:[], areas:[], gems:[], texts:[], fx:[], summons:[]}; G.areasOwned=[]; }

/* ---------- 敌人生成 ---------- */
const ENEMY_DEF = {
  // 速度标定：约为玩家移速(62)的 55%~95%；太慢会拖节奏，太快会无处可躲
  slime: {spr:'slime', hp:12, spd:34, dmg:6,  r:9,  exp:1, gold:0},
  goblin:{spr:'goblin',hp:20, spd:46, dmg:8,  r:9,  exp:1, gold:1},
  skel:  {spr:'skel',  hp:26, spd:40, dmg:10, r:9,  exp:2, gold:1},
  bat:   {spr:'bat',   hp:12, spd:58, dmg:7,  r:8,  exp:1, gold:0},
  elite: {spr:'elite', hp:150,spd:28, dmg:16, r:13, exp:8, gold:6},
  boss:  {spr:'boss',  hp:900,spd:22, dmg:22, r:20, exp:40, gold:40}
};

function spawnEnemy(kind, x, y, scale){
  const d = ENEMY_DEF[kind], s = scale||1, g = G.layer;
  const hp = Math.round(d.hp * (1 + 0.34*g) * s);
  ents.enemies.push({kind, spr:d.spr, x, y, hp, maxhp:hp, spd:d.spd, dmg:Math.round(d.dmg*(1+0.12*g)),
    r:d.r, exp:d.exp, gold:d.gold, flash:0, kb:0, kx:0, ky:0, slow:0, burn:0, dead:false, boss:kind==='boss'});
}

/* ---------- 波次：每节点一场战斗，随时间/关卡变强 ---------- */
let waveT = 0, waveIdx = 0, spawnAcc = 0;
function startBattle(){
  resetEnts(); waveT = 0; waveIdx = 0; spawnAcc = 0;
  const isBoss = G.currentNode && G.currentNode.type === 'boss';
  const isElite = G.currentNode && G.currentNode.type === 'elite';
  const p = {x: W/2, y: H/2};
  G.player = {x:p.x, y:p.y, r:9, face:1, dmgFlash:0, inv:0, hudFlash:0};
  G.stats.hp = Math.min(G.stats.hp, G.stats.maxhp);
  if (isBoss){ spawnEnemy('boss', W/2, 90, 1); G.banner = 'BOSS 来了'; }
  else if (isElite) spawnEnemy('elite', W/2, 90, 1.2);
  G.battleKind = isBoss ? 'boss' : (isElite ? 'elite' : 'battle');
  G.battleNeed = isBoss ? 1 : (isElite ? 6 + G.layer*2 : 14 + G.layer*4);
  G.battleKilled = 0;
}

function updateBattle(dt){
  waveT += dt; G.runTime += dt;
  const kind = G.battleKind;
  if (kind !== 'boss'){
    spawnAcc += dt;
    const interval = Math.max(0.28, 0.9 - G.layer*0.06);
    if (spawnAcc > interval && G.battleKilled < G.battleNeed){
      spawnAcc = 0;
      const pool = ['slime','bat','goblin','skel'].slice(0, Math.min(4, 1 + Math.floor(G.layer/2)));
      const n = 1 + Math.floor(G.layer/3);
      for (let i=0;i<n;i++){
        // 围绕玩家、在可视区外一圈生成（否则慢速怪要走很久才到，节奏拖沓）
        const a = G.rng.range(0, Math.PI*2);
        const rad = 235 + G.rng.range(0, 45);
        const sx = Math.max(14, Math.min(W-14, G.player.x + Math.cos(a)*rad));
        const sy = Math.max(14, Math.min(H-14, G.player.y + Math.sin(a)*rad));
        spawnEnemy(G.rng.pick(pool), sx, sy);
      }
    }
  }
  updatePlayer(dt);
  updateSkills(dt);
  updateEnemies(dt);
  updateBullets(dt);
  updateAreas(dt);
  updateGems(dt);
  updateTexts(dt);
  updateSummons(dt);

  if (kind === 'boss' && ents.enemies.filter(e=>e.kind==='boss'&&!e.dead).length===0) endBattle(true);
  else if (kind !== 'boss' && G.battleKilled >= G.battleNeed && ents.enemies.filter(e=>!e.dead).length <= 2) endBattle(true);
  if (G.stats.hp <= 0) endBattle(false);
}

/* ---------- 玩家 ---------- */
function updatePlayer(dt){
  const p = G.player, st = G.stats;
  let dx = (G.joy && G.joy.active) ? G.joy.dx : 0;
  let dy = (G.joy && G.joy.active) ? G.joy.dy : 0;
  const len = Math.hypot(dx,dy) || 1;
  const mv = st.speed * dt * Math.min(1, len);
  p.x += dx/len * mv;  p.y += dy/len * mv;
  p.x = Math.max(12, Math.min(W-12, p.x));  p.y = Math.max(12, Math.min(H-12, p.y));
  if (Math.abs(dx) > 0.1) p.face = dx > 0 ? 1 : -1;
  p.dmgFlash = Math.max(0, p.dmgFlash - dt*2.4);
  p.inv = Math.max(0, p.inv - dt);
  if (st.regen > 0) st.hp = Math.min(st.maxhp, st.hp + st.regen*dt);
}

/* ---------- 索敌 ---------- */
function nearestEnemy(x,y,maxD){
  let best=null, bd=(maxD||9999)**2;
  for (const e of ents.enemies){ if (e.dead) continue;
    const d=(e.x-x)**2+(e.y-y)**2; if (d<bd){bd=d;best=e} }
  return best;
}
function densestEnemy(x,y){
  let best=null, bc=-1;
  for (const e of ents.enemies){ if (e.dead) continue;
    let c=0; for (const o of ents.enemies){ if(!o.dead && (o.x-e.x)**2+(o.y-e.y)**2 < 60*60) c++; }
    if (c>bc){bc=c;best=e} }
  return best || nearestEnemy(x,y,300);
}

/* ---------- 技能开火 ---------- */
function updateSkills(dt){
  const p = G.player;
  for (const sk of G.skills){
    sk.t -= dt;
    const c = calcSkill(sk);
    if (sk.t > 0) continue;
    const b = SKILLS[sk.id];
    let tgt = null;
    if (b.type === 'area' || b.type === 'pulse') tgt = densestEnemy(p.x,p.y);
    else tgt = nearestEnemy(p.x,p.y,260);
    if (!tgt && b.type !== 'pulse' && b.type !== 'area' && b.type !== 'summon') continue;
    sk.t = c.cd; sk.seq++;
    fireSkill(sk, c, tgt);
    if (c.echo > 0){
      for (let i=0;i<c.echo;i++) setTimeout(()=>{ if(G.screen==='battle') fireSkill(sk,c,tgt,0.6) }, 400);
    }
  }
}
function fireSkill(sk, c, tgt, mul){
  const p = G.player, b = SKILLS[sk.id], M = mul||1;
  const dir = tgt ? Math.atan2(tgt.y-p.y, tgt.x-p.x) : 0;
  if (b.type === 'projectile' || b.type === 'chain'){
    if (b.type === 'chain'){
      if (!tgt) return;
      let cur = tgt, hit = [cur], jumps = 2 + c.bounce;
      dealDamage(cur, c.dmg*M, c, sk);
      for (let j=0;j<jumps;j++){
        let nx=null,nd=140**2;
        for (const e of ents.enemies){ if(e.dead||hit.includes(e))continue;
          const d=(e.x-cur.x)**2+(e.y-cur.y)**2; if(d<nd){nd=d;nx=e} }
        if(!nx)break; hit.push(nx); dealDamage(nx, c.dmg*M*0.85, c, sk); cur=nx;
      }
      ents.fx.push({type:'chain', pts:hit.map(e=>({x:e.x,y:e.y})), t:0.18, life:0.18, color:c.color});
      return;
    }
    const n = c.count;
    for (let i=0;i<n;i++){
      const spread = c.fan > 0 ? (0.16 * c.fan) : 0.06;
      const a = dir + (n>1 ? (i-(n-1)/2)*spread : 0);
      ents.bullets.push({x:p.x, y:p.y, vx:Math.cos(a)*c.spd, vy:Math.sin(a)*c.spd,
        r:c.size, dmg:c.dmg*M, color:c.color, pierce:c.pierce, bounce:c.bounce, split:c.split,
        life:1.6, tags:b.tags, sk, hit:[], orbit:false, ret:!!b.tags.includes('return'), t:0});
    }
    for (let i=0;i<c.orbit;i++){
      const a = (i/c.orbit)*Math.PI*2;
      ents.bullets.push({x:p.x, y:p.y, vx:0, vy:0, r:c.size*0.9, dmg:c.dmg*M*0.8, color:c.color,
        pierce:0, bounce:0, split:0, life:3.2, tags:b.tags, sk, hit:[], orbit:true, orbA:a, orbR:44, t:0});
    }
  } else if (b.type === 'pulse'){
    ents.areas.push({x:p.x, y:p.y, r:0, max: c.size + 26, dmg:c.dmg*M, color:c.color, life:0.32, t:0,
      tags:b.tags, sk, hitOnce:true, kind:'pulse'});
    ents.fx.push({type:'ring', x:p.x, y:p.y, r:0, max:c.size+26, t:0.32, life:0.32, color:c.color});
  } else if (b.type === 'area'){
    const ax = tgt? tgt.x : p.x, ay = tgt? tgt.y : p.y;
    ents.areas.push({x:ax, y:ay, r:c.size, max:c.size, dmg:c.dmg*M, color:c.color, life:3.4, t:0,
      tags:b.tags, sk, tick:0, tickRate:0.45, kind:'zone'});
  } else if (b.type === 'summon'){
    ents.summons.push({x:p.x+G.rng.range(-24,24), y:p.y+G.rng.range(-24,24), life:9, t:0, cd:0.7, dmg:c.dmg*M, color:c.color, sk});
  }
}

/* ---------- 伤害 ---------- */
function dealDamage(e, base, c, sk){
  if (e.dead) return;
  const st = G.stats;
  let dmg = base, crit = false;
  if (G.rng.chance(st.crit)){ dmg *= st.critdmg; crit = true; }
  dmg = Math.max(1, Math.round(dmg));
  e.hp -= dmg; e.flash = 0.12;
  ents.texts.push({x:e.x+G.rng.range(-4,4), y:e.y-12, vy:-26, t:0.75, life:0.75,
    txt:String(dmg), color: crit?'#FFD166':'#FFFFFF', big:crit});
  if (c && c.burn) e.burn = Math.max(e.burn, 2.0), e.burnDps = c.dmg*0.25;
  if (c && c.slow) e.slow = 1.2;
  if (c && c.vamp) G.stats.hp = Math.min(G.stats.maxhp, G.stats.hp + dmg*0.06);
  // 击退
  const a = Math.atan2(e.y-G.player.y, e.x-G.player.x);
  if (!e.boss){ e.kx += Math.cos(a)*26; e.ky += Math.sin(a)*26; }
  if (e.hp <= 0) killEnemy(e);
}
function killEnemy(e){
  if (e.dead) return; e.dead = true; G.kills++; G.battleKilled++;
  ents.fx.push({type:'boom', x:e.x, y:e.y, r:e.r, t:0.22, life:0.22, color:'#FFFFFF'});
  ents.gems.push({x:e.x, y:e.y, v:e.exp, t:0});
  if (e.gold > 0) G.gold += Math.round(e.gold * (1 + (G.stats.greed||0)));
  if (e.boss) G.banner = 'BOSS 倒下！';
}

/* ---------- 敌人 ---------- */
function updateEnemies(dt){
  const p = G.player;
  for (const e of ents.enemies){
    if (e.dead) continue;
    if (e.flash > 0) e.flash -= dt;
    if (e.slow > 0){ e.slow -= dt; }
    const spdMul = e.slow > 0 ? 0.65 : 1;
    const a = Math.atan2(p.y-e.y, p.x-e.x);
    const sp = e.spd * spdMul * (e.boss?1:1) * dt;
    e.x += Math.cos(a)*sp; e.y += Math.sin(a)*sp;
    // 击退回弹
    e.x += e.kx*dt*4; e.y += e.ky*dt*4; e.kx *= 0.86; e.ky *= 0.86;
    // 持续伤害
    if (e.burn > 0){ e.burn -= dt; e.hp -= (e.burnDps||1)*dt;
      if (Math.random() < dt*8) ents.texts.push({x:e.x, y:e.y-10, vy:-20, t:0.4, life:0.4, txt:'·', color:'#FFA84B'});
      if (e.hp <= 0) killEnemy(e); }
    // 接触伤害
    const d = Math.hypot(p.x-e.x, p.y-e.y);
    if (d < e.r + p.r && p.inv <= 0){
      let dm = e.dmg * (1 - G.stats.armor);
      dm = Math.max(1, Math.round(dm * (G.char.negDmgMul||1)));
      G.stats.hp -= dm; p.inv = 0.55; p.dmgFlash = 1; G.hudFlash = 0.3;
      ents.texts.push({x:p.x, y:p.y-14, vy:-24, t:0.6, life:0.6, txt:'-'+dm, color:'#FF8FA3', big:false});
      if (e.boss){ const a2 = Math.atan2(p.y-e.y,p.x-e.x); p.x += Math.cos(a2)*10; p.y += Math.sin(a2)*10; }
    }
  }
  ents.enemies = ents.enemies.filter(e=>!e.dead);
}

/* ---------- 子弹 ---------- */
function updateBullets(dt){
  const p = G.player;
  for (const b of ents.bullets){
    b.t += dt;
    if (b.orbit){
      b.orbA += dt*3.0;
      b.x = p.x + Math.cos(b.orbA)*b.orbR; b.y = p.y + Math.sin(b.orbA)*b.orbR;
    } else {
      if (b.ret && b.t > 0.42){ // 回旋：掉头
        b.vx = -b.vx*1.05; b.vy = -b.vy*1.05; b.ret = false;
      }
      // homing 标签：轻微追踪（小幅修正，不改变主要手感）
      if (b.tags && b.tags.indexOf('homing') >= 0){
        const t0 = nearestEnemy(b.x, b.y, 200);
        if (t0){
          const sp = Math.hypot(b.vx, b.vy) || 200;
          const want = Math.atan2(t0.y-b.y, t0.x-b.x);
          const cur = Math.atan2(b.vy, b.vx);
          let d = want - cur; while (d > Math.PI) d -= Math.PI*2; while (d < -Math.PI) d += Math.PI*2;
          const na = cur + Math.max(-2.6*dt, Math.min(2.6*dt, d));
          b.vx = Math.cos(na)*sp; b.vy = Math.sin(na)*sp;
        }
      }
      b.x += b.vx*dt; b.y += b.vy*dt;
    }
    b.life -= dt;
    for (const e of ents.enemies){
      if (e.dead || b.hit.includes(e)) continue;
      if (Math.hypot(e.x-b.x, e.y-b.y) < e.r + b.r){
        b.hit.push(e); dealDamage(e, b.dmg, b, b.sk);
        ents.fx.push({type:'hit', x:b.x, y:b.y, r:b.r*1.6, t:0.14, life:0.14, color:b.color});
        if (b.split > 0 && b.hit.length === 1){
          for (let i=0;i<2;i++){
            const a = Math.atan2(b.vy,b.vx) + (i? 0.7 : -0.7);
            ents.bullets.push({x:b.x,y:b.y,vx:Math.cos(a)*190, vy:Math.sin(a)*190,
              r:b.r*0.7, dmg:b.dmg*0.55, color:b.color, pierce:0,bounce:0,split:0, life:0.7, tags:b.tags, sk:b.sk, hit:[]});
          }
        }
        if (b.bounce > 0 && b.hit.length <= b.bounce){
          const nx = nearestEnemy(b.x,b.y,150);
          if (nx && !b.hit.includes(nx)){
            const a = Math.atan2(nx.y-b.y, nx.x-b.x), sp = Math.hypot(b.vx,b.vy)||190;
            b.vx = Math.cos(a)*sp; b.vy = Math.sin(a)*sp;
            continue;
          }
        }
        if (b.hit.length > b.pierce + 1) { b.life = 0; break; }
      }
    }
    if (b.x < -40 || b.x > W+40 || b.y < -40 || b.y > H+40) b.life = 0;
  }
  ents.bullets = ents.bullets.filter(b=>b.life>0);
}

/* ---------- 区域 ---------- */
function updateAreas(dt){
  for (const a of ents.areas){
    a.t += dt;
    if (a.kind === 'pulse'){
      a.r = a.max * Math.min(1, a.t/a.life);
      if (!a.done){
        for (const e of ents.enemies){ if(e.dead) continue;
          if (Math.hypot(e.x-a.x, e.y-a.y) < a.r + e.r) dealDamage(e, a.dmg, a, a.sk); }
        a.done = true;
      }
    } else {
      a.tick -= dt;
      if (a.tick <= 0){ a.tick = a.tickRate;
        for (const e of ents.enemies){ if(e.dead) continue;
          if (Math.hypot(e.x-a.x, e.y-a.y) < a.r + e.r) dealDamage(e, a.dmg, a, a.sk); } }
    }
  }
  ents.areas = ents.areas.filter(a=>a.t < a.life);
}
function updateSummons(dt){
  for (const s of ents.summons){
    s.t += dt; s.cd -= dt;
    if (s.cd <= 0){ s.cd = 0.75;
      const t = nearestEnemy(s.x,s.y,180);
      if (t){ const a = Math.atan2(t.y-s.y,t.x-s.x);
        ents.bullets.push({x:s.x,y:s.y,vx:Math.cos(a)*180,vy:Math.sin(a)*180,r:4,dmg:s.dmg,color:s.color,
          pierce:0,bounce:0,split:0,life:1.2,tags:['arcane','projectile','summon'],sk:s.sk,hit:[]}); } }
  }
  ents.summons = ents.summons.filter(s=>s.t<s.life);
}

/* ---------- 掉落 / 经验 ---------- */
function updateGems(dt){
  const p = G.player, st = G.stats;
  for (const g of ents.gems){
    const d = Math.hypot(p.x-g.x, p.y-g.y);
    if (d < st.pickup){ const a = Math.atan2(p.y-g.y, p.x-g.x), sp = 150*dt; g.x += Math.cos(a)*sp; g.y += Math.sin(a)*sp; }
    if (d < 14){ g.got = true; addExp(g.v); }
  }
  ents.gems = ents.gems.filter(g=>!g.got);
}
function addExp(v){
  G.exp += v;
  while (G.exp >= G.expNeed){ G.exp -= G.expNeed; G.lv++; G.expNeed = Math.round(5 + G.lv*3.2); onLevelUp(); }
}
function updateTexts(dt){
  for (const t of ents.texts){ t.t += dt; t.y += t.vy*dt; t.vy *= 0.94; }
  ents.texts = ents.texts.filter(t=>t.t<t.life);
  for (const f of ents.fx) f.t += dt;
  ents.fx = ents.fx.filter(f=>f.t<f.life);
}
