/* ============================================================
   疯狂怪潮 · UI 层（屏幕管理 / 交互 / 主循环）
   ============================================================ */
'use strict';

/* ---------- 舞台缩放（fitWidth，整数倍优先） ---------- */
function fitStage(){
  const pad = 8;
  const s = Math.min((window.innerWidth-pad)/360, (window.innerHeight-pad)/640);
  document.getElementById('stage').style.transform = 'scale('+s+')';
}
window.addEventListener('resize', fitStage); fitStage();

/* ---------- 屏幕切换 ---------- */
const SCREENS = ['charselect','map','battle','levelup','install','build','shop','event','result'];
function go(name){
  G.screen = name;
  SCREENS.forEach(s=>document.getElementById('scr-'+s).classList.toggle('on', s===name));
  const showBattleHud = (name === 'battle');
  document.getElementById('joyhint').style.opacity = showBattleHud ? '1' : '0';
  if (name === 'charselect') renderCharSelect();
  if (name === 'map') renderMap();
  if (name === 'battle') syncUI();
  if (name === 'build') renderBuild();
  if (name === 'shop') renderShop();
  if (name === 'result') renderResult();
}

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(toast._h); toast._h = setTimeout(()=>t.style.display='none', 1400);
}
function banner(txt){
  const b = document.getElementById('banner');
  b.textContent = txt; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}

/* ---------- 角色选择 ---------- */
let selChar = 0;
function renderCharSelect(){
  const row = document.getElementById('charrow');
  row.innerHTML = '';
  CHARS.forEach((c,i)=>{
    const d = document.createElement('div');
    d.className = 'char' + (i===selChar?' sel':'');
    const cv = document.createElement('canvas'); cv.width = 48; cv.height = 48;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    const spr = spriteCanvas(c.spr, 4, {[c.col]: c.colColor || PAL[c.col]});
    g.drawImage(spr, 0, 0, 48, 48);
    d.appendChild(cv);
    const n = document.createElement('div'); n.className='nm'; n.textContent = c.name; d.appendChild(n);
    d.onclick = ()=>{ selChar = i; renderCharSelect(); };
    row.appendChild(d);
  });
  const c = CHARS[selChar];
  const st = c.stats || {};
  const sk = SKILLS[c.start];
  const lines = [];
  lines.push('<h3>天赋</h3>');
  lines.push('<div class="tal"><span class="tag pos">正向</span><span>'+c.pos+'</span></div>');
  lines.push('<div class="tal"><span class="tag neg">负向</span><span>'+c.neg+'</span></div>');
  lines.push('<h3>初始技能</h3>');
  lines.push('<div class="row"><div class="ri">'+sk.icon+'</div><div class="rt"><b>'+sk.name+'</b>'+
    '<div class="rx">'+sk.type+' · '+sk.tags.join(' / ')+' · CD '+sk.cd+'s</div></div></div>');
  lines.push('<h3>初始属性</h3>');
  lines.push('<div class="row"><div class="ri">⚔</div><div class="rt"><b>攻击 '+Math.round((st.power||1)*100)+'%</b>'+
    '<div class="rx">生命 '+(st.maxhp||100)+' · 移速 '+(st.speed||62)+' px/s</div></div></div>');
  lines.push('<div class="sub" style="margin-top:10px">开局 1 个技能，局内最多 4 个 · 每技能 3 个行为槽</div>');
  document.getElementById('chardetail').innerHTML = lines.join('');
}

function startRun(){
  const c = CHARS[selChar];
  G.char = c;
  c.colColor = PAL[c.col];
  G.rng = makeRng(G.seed);
  G.stats = freshStats(c);
  G.skills = [mkSkill(c.start)];
  G.items = []; G.modsBag = []; G.gold = 0; G.lv = 1; G.exp = 0; G.expNeed = 5;
  G.runTime = 0; G.kills = 0; G.attrTaken = {};
  G.map = genMap(G.seed); G.map.layer = 0;
  document.getElementById('mapseedtxt').textContent = 'seed ' + G.seed + ' · 第 ' + (G.map.layer+1) + ' / ' + MAP_CFG.layers + ' 层';
  go('map');
}

/* ---------- 地图 ---------- */
function renderMap(){
  const w = document.getElementById('mapwrap');
  document.getElementById('mapseedtxt').textContent =
    'seed ' + G.seed + ' · 第 ' + (G.map.layer+1) + ' / ' + MAP_CFG.layers + ' 层';
  syncHud();
  w.innerHTML = '';
  G.map.layers.forEach((nodes, L)=>{
    const row = document.createElement('div'); row.className = 'layer';
    nodes.forEach((n,i)=>{
      const d = document.createElement('div');
      const dno = NODE_DEF[n.type];
      let cls = 'node';
      if (L < G.map.layer || n.done) cls += ' done';
      else if (L === G.map.layer) cls += (n.idx === G.map.cur ? ' cur' : ' avail');
      else cls += ' locked';
      d.className = cls;
      d.innerHTML = '<div>'+dno.icon+'</div><div class="lb">'+dno.label+'</div>';
      if (L === G.map.layer && !n.done) d.onclick = ()=> enterNode(n);
      row.appendChild(d);
    });
    w.appendChild(row);
  });
}

/* ---------- HUD / 技能状态栏（需求 §4） ---------- */
function syncHud(){
  const st = G.stats; if (!st) return;
  const hp = Math.max(0, Math.round(st.hp)), mx = Math.round(st.maxhp);
  const pct = Math.max(0, Math.min(100, hp/mx*100));
  ['','2'].forEach(sfx=>{
    const b = document.getElementById('hpbar'+sfx); if (b) b.style.width = pct+'%';
    const t = document.getElementById('hptxt'+sfx); if (t) t.textContent = hp+'/'+mx;
    const l = document.getElementById('lvbox'+sfx); if (l) l.textContent = 'Lv.'+G.lv;
  });
  const eb = document.getElementById('expbar');
  if (eb) eb.style.width = Math.min(100, G.exp/G.expNeed*100)+'%';
  const gt = document.getElementById('goldtxt'); if (gt) gt.textContent = G.gold;
  const wt = document.getElementById('wavetxt');
  if (wt) wt.textContent = (G.battleKind==='boss'?'BOSS':(G.battleKind==='elite'?'精英':'第 '+(G.map?G.map.layer+1:1)+' 层 · '+G.battleKilled+'/'+G.battleNeed));
}
function syncUI(){
  syncHud();
  const bar = document.getElementById('skillbar');
  if (!bar) return;
  bar.innerHTML = '';
  for (let i=0;i<4;i++){
    const sk = G.skills[i];
    const d = document.createElement('div'); d.className = 'sk';
    if (!sk){
      d.innerHTML = '<div class="ico2" style="opacity:.35">＋</div><div class="slots"><div class="slot"></div><div class="slot"></div><div class="slot"></div></div><div class="nm">空</div>';
      bar.appendChild(d); continue;
    }
    const b = SKILLS[sk.id], c = calcSkill(sk);
    const stacks = {};
    sk.mods.forEach(m=>stacks[m]=(stacks[m]||0)+1);
    const maxStack = Object.entries(stacks).sort((a,b)=>b[1]-a[1])[0];
    let slots = '';
    for (let s=0;s<3;s++){
      const mid = sk.mods[s];
      slots += '<div class="slot'+(mid?' f':'')+'" title="'+(mid?MODULES[mid].name:'空槽')+'"></div>';
    }
    d.innerHTML = '<div class="ico2">'+b.icon+
      '<div class="cdmask" id="cd'+i+'"></div>'+
      (maxStack? '<div class="stack" style="display:block">×'+maxStack[1]+'</div>':'')+
      '</div><div class="slots">'+slots+'</div><div class="nm">'+b.name+' Lv'+sk.lvl+'</div>';
    bar.appendChild(d);
  }
}

/* ---------- 升级 3 选 1（需求 §5） ---------- */
function onLevelUp(){
  G.levelPause = true;
  G.levelCards = rollRewards();
  if (!G.levelCards.length){ resumeBattle(); return; }
  go('levelup');
  const box = document.getElementById('lucards');
  box.innerHTML = '';
  const KINDNAME = {skill:'技能', skillup:'技能强化', module:'行为模块', item:'道具', attr:'属性'};
  const CLS = {skill:'c-skill', skillup:'c-skill', module:'c-module', item:'c-item', attr:'c-attr'};
  G.levelCards.forEach((r,i)=>{
    let icon = '？', name = '', desc = '', tag = KINDNAME[r.kind];
    if (r.kind === 'skill'){ const s = SKILLS[r.id]; icon=s.icon; name=s.name; desc=s.type+' · '+s.tags.join('/'); }
    else if (r.kind === 'skillup'){ const s = SKILLS[r.id]; icon='⬆'; name=s.name+' 强化'; desc='伤害 +22%，冷却 -6%'; }
    else if (r.kind === 'module'){ const m = MODULES[r.id]; icon=m.icon; name=m.name; desc=m.desc+'<br><span style="color:#FFA84B">'+m.requires.join(' / ')+'</span>'; }
    else if (r.kind === 'item'){ const it = ITEMS[r.id]; icon=it.icon; name=it.name; desc=it.desc; }
    else { const a = ATTRS[r.id]; icon=a.icon; name=a.name; desc=a.fmt(G.stats[r.id]+a.step); }
    const d = document.createElement('div');
    d.className = 'card '+(CLS[r.kind]||'');
    d.innerHTML = '<div class="ci">'+icon+'</div><div class="cn">'+name+'</div><div class="cd">'+desc+'</div><div class="ct">'+tag+'</div>';
    d.onclick = ()=> chooseCard(i);
    box.appendChild(d);
  });
}
function chooseCard(i){
  const r = G.levelCards[i];
  if (r.kind === 'module'){ openInstall(r.id, 'levelup'); return; }
  applyReward(r);
  toMapOrBattle();
}
function toMapOrBattle(){
  if (G.battleRunning && !G.result) { go('battle'); resumeBattle(); }
  else go('map');
}

/* ---------- 行为模块安装（需求 §5：选择后进入安装目标步骤） ---------- */
let instState = null;
function openInstall(mid, from){
  instState = {mid, from};
  const m = MODULES[mid];
  document.getElementById('instTitle').textContent = '安装「'+m.name+'」到哪个技能？';
  document.getElementById('instSub').textContent = '兼容标签：'+m.requires.join(' / ')+' · 可重复安装（上限 '+m.max+'）';
  const list = document.getElementById('instlist');
  list.innerHTML = '';
  let any = false;
  G.skills.forEach((sk, si)=>{
    const b = SKILLS[sk.id];
    const ok = b.tags.some(t=>m.requires.includes(t));
    const free = sk.mods.length < 3;
    const can = ok && free;
    if (can) any = true;
    const d = document.createElement('div'); d.className = 'row';
    d.style.opacity = can ? '1' : '.42';
    const slotHtml = [0,1,2].map(s=>{
      const mm = sk.mods[s];
      return '<span class="tag '+(mm?'n':'')+'" style="margin-right:3px">'+(mm?MODULES[mm].name:'空')+'</span>';
    }).join('');
    d.innerHTML = '<div class="ri">'+b.icon+'</div><div class="rt"><b>'+b.name+'</b><div class="rx">'+slotHtml+'</div></div>'+
      '<div class="ra">'+(can?'装上':(ok?'槽位已满':'不兼容'))+'</div>';
    if (can) d.onclick = ()=>{ doInstall(si, mid); };
    list.appendChild(d);
  });
  if (!any){
    list.innerHTML = '<div class="sub">没有兼容的空槽位。模块已放入背包，可在 Build 面板中改装。</div>';
    G.modsBag.push(mid);
    finishInstall();
    return;
  }
  go('install');
}
function doInstall(si, mid){
  const sk = G.skills[si];
  if (sk.mods.length >= 3) return;
  sk.mods.push(mid);
  if (instState && instState.from === 'build'){
    const k = G.modsBag.indexOf(mid); if (k >= 0) G.modsBag.splice(k,1);
  }
  toast(MODULES[mid].name+' → '+SKILLS[sk.id].name);
  finishInstall();
}
function finishInstall(){
  instState = null;
  if (G.battleRunning && !G.result && G.paused && !G.levelPause){ go('build'); renderBuild(); return; }
  if (G.levelPause){ G.levelPause = false; toMapOrBattle(); return; }
  go('build'); renderBuild();
}

/* ---------- Build 面板（暂停后进入，需求 §3） ---------- */
let buildTab = 'skill';
function renderBuild(){
  const tabs = document.getElementById('btabs');
  const T = [['skill','技能'],['mod','行为'],['item','道具'],['attr','属性']];
  tabs.innerHTML = T.map(([k,n])=>'<div class="tab'+(buildTab===k?' on':'')+'" data-k="'+k+'">'+n+'</div>').join('');
  tabs.querySelectorAll('.tab').forEach(el=> el.onclick = ()=>{ buildTab = el.dataset.k; renderBuild(); });
  const list = document.getElementById('blist');
  list.innerHTML = '';
  if (buildTab === 'skill'){
    G.skills.forEach((sk,si)=>{
      const b = SKILLS[sk.id], c = calcSkill(sk);
      const d = document.createElement('div'); d.className = 'row';
      d.innerHTML = '<div class="ri">'+b.icon+'</div><div class="rt"><b>'+b.name+' Lv'+sk.lvl+'</b>'+
        '<div class="rx">伤害 '+c.dmg.toFixed(1)+' · CD '+c.cd.toFixed(2)+'s'+(c.count>1?' · ×'+c.count:'')+
        (c.pierce?' · 穿透'+c.pierce:'')+(c.bounce?' · 反弹'+c.bounce:'')+(c.orbit?' · 环绕'+c.orbit:'')+'</div></div>';
      list.appendChild(d);
      sk.mods.forEach((mid, mi)=>{
        const r = document.createElement('div'); r.className = 'row'; r.style.marginLeft = '14px';
        r.innerHTML = '<div class="ri">'+MODULES[mid].icon+'</div><div class="rt"><b>'+MODULES[mid].name+'</b>'+
          '<div class="rx">槽 '+(mi+1)+' · '+MODULES[mid].desc+'</div></div><div class="ra">卸下</div>';
        r.querySelector('.ra').onclick = ()=>{ sk.mods.splice(mi,1); G.modsBag.push(mid); toast('已放入背包'); renderBuild(); syncUI(); };
        list.appendChild(r);
      });
      if (sk.mods.length < 3){
        const r = document.createElement('div'); r.className='row'; r.style.marginLeft='14px';
        r.innerHTML = '<div class="ri">＋</div><div class="rt"><b>空槽位 '+(sk.mods.length+1)+'</b>'+
          '<div class="rx">从背包安装行为模块</div></div>';
        list.appendChild(r);
      }
    });
  } else if (buildTab === 'mod'){
    const bag = {};
    G.modsBag.forEach(m=>bag[m]=(bag[m]||0)+1);
    if (!Object.keys(bag).length){ list.innerHTML = '<div class="sub">背包里没有未安装的行为模块</div>'; }
    Object.entries(bag).forEach(([mid, n])=>{
      const m = MODULES[mid];
      const d = document.createElement('div'); d.className = 'row';
      d.innerHTML = '<div class="ri">'+m.icon+'</div><div class="rt"><b>'+m.name+' ×'+n+'</b>'+
        '<div class="rx">'+m.desc+' · 兼容 '+m.requires.join('/')+'</div></div><div class="ra">安装</div>';
      d.querySelector('.ra').onclick = ()=> openInstall(mid, 'build');
      list.appendChild(d);
    });
  } else if (buildTab === 'item'){
    if (!G.items.length) list.innerHTML = '<div class="sub">还没有道具</div>';
    G.items.forEach(it=>{
      const d = document.createElement('div'); d.className='row';
      d.innerHTML = '<div class="ri">'+ITEMS[it.id].icon+'</div><div class="rt"><b>'+ITEMS[it.id].name+'</b>'+
        '<div class="rx">'+ITEMS[it.id].desc+'</div></div>';
      list.appendChild(d);
    });
  } else {
    Object.entries(ATTRS).forEach(([k,a])=>{
      const cur = G.stats[k];
      const taken = (G.attrTaken && G.attrTaken[k]) || 0;
      const d = document.createElement('div'); d.className='row';
      d.innerHTML = '<div class="ri">'+a.icon+'</div><div class="rt"><b>'+a.name+'</b>'+
        '<div class="rx">当前 '+a.fmt(cur)+(taken?' · 本局已强化 '+taken+' 次':'')+'</div></div>';
      list.appendChild(d);
    });
  }
  syncHud();
}

/* ---------- 商店 ---------- */
let shopItems = [];
function openShop(){ shopItems = shopStock(); go('shop'); }
function renderShop(){
  document.getElementById('shopGold').textContent = '金币 ' + G.gold;
  const list = document.getElementById('shoplist'); list.innerHTML = '';
  shopItems.forEach((s, i)=>{
    if (s.sold) return;
    let icon='?', name='', desc='';
    if (s.kind === 'item'){ icon=ITEMS[s.id].icon; name=ITEMS[s.id].name; desc=ITEMS[s.id].desc; }
    else if (s.kind === 'module'){ icon=MODULES[s.id].icon; name=MODULES[s.id].name; desc=MODULES[s.id].desc; }
    else { icon='✚'; name='治疗包'; desc='回复 40 生命'; }
    const d = document.createElement('div'); d.className='row';
    const afford = G.gold >= s.price;
    d.innerHTML = '<div class="ri">'+icon+'</div><div class="rt"><b>'+name+'</b><div class="rx">'+desc+'</div></div>'+
      '<div class="ra" style="'+(afford?'':'opacity:.45')+'">◆'+s.price+'</div>';
    d.querySelector('.ra').onclick = ()=>{
      if (G.gold < s.price){ toast('金币不足'); return; }
      G.gold -= s.price; s.sold = true;
      if (s.kind === 'item'){ ITEMS[s.id].apply(G.stats); G.items.push({id:s.id}); }
      else if (s.kind === 'module'){ G.modsBag.push(s.id); }
      else G.stats.hp = Math.min(G.stats.maxhp, G.stats.hp + 40);
      toast('买下：'+name); renderShop();
    };
    list.appendChild(d);
  });
  const leave = document.createElement('div');
  leave.className = 'sub'; leave.style.marginTop = '10px';
  leave.textContent = '商店里的东西买完就没了';
  list.appendChild(leave);
}
function leaveShop(){ advanceLayer(); go('map'); }

/* ---------- 事件 ---------- */
function openEvent(){
  const ev = G.rng.pick(EVENTS);
  document.getElementById('evtext').textContent = ev.txt;
  const box = document.getElementById('evopts'); box.innerHTML = '';
  ev.opts.forEach(o=>{
    const b = document.createElement('button');
    b.className = 'btn ghost'; b.style.width='100%'; b.style.marginBottom='8px'; b.style.fontSize='var(--ft-s)';
    b.textContent = o.t;
    b.onclick = ()=>{ o.f(); syncUI(); advanceLayer(); go('map'); };
    box.appendChild(b);
  });
  go('event');
}

/* ---------- 结算 ---------- */
function renderResult(){
  const r = G.result || {win:false};
  document.getElementById('resBig').textContent = r.win ? '通关！' : '倒下';
  document.getElementById('resBig').style.color = r.win ? 'var(--mint)' : 'var(--red)';
  const st = document.getElementById('resStats');
  st.innerHTML = [
    ['存活时间', (r.time||0).toFixed(1)+' s'],
    ['击杀', r.kills||0],
    ['等级', 'Lv.'+(r.lv||1)],
    ['推进到', '第 '+((r.layer||0)+1)+' / '+MAP_CFG.layers+' 层'],
    ['金币', r.gold||0],
    ['seed', G.seed]
  ].map(([k,v])=>'<div class="stat"><span>'+k+'</span><b>'+v+'</b></div>').join('');
  const bd = document.getElementById('resBuild');
  let html = '';
  (r.skills||[]).forEach(s=>{
    html += '<div class="row"><div class="ri">'+SKILLS[s.id].icon+'</div><div class="rt"><b>'+SKILLS[s.id].name+' Lv'+s.lv+'</b>'+
      '<div class="rx">'+(s.mods.length? s.mods.map(m=>MODULES[m].name).join(' · ') : '无行为模块')+'</div></div></div>';
  });
  (r.items||[]).forEach(id=>{
    html += '<div class="row"><div class="ri">'+ITEMS[id].icon+'</div><div class="rt"><b>'+ITEMS[id].name+'</b>'+
      '<div class="rx">'+ITEMS[id].desc+'</div></div></div>';
  });
  bd.innerHTML = html || '<div class="sub">没有收获</div>';
}

/* ---------- 动态摇杆（需求 §3） ---------- */
G.joy = {active:false, dx:0, dy:0, ox:0, oy:0};
const stageEl = document.getElementById('stage');
const joyEl = document.getElementById('joy'), knobEl = document.getElementById('knob');
function stagePos(e){
  const r = stageEl.getBoundingClientRect();
  const sx = r.width / 360;
  return {x:(e.clientX - r.left)/sx, y:(e.clientY - r.top)/sx};
}
function onDown(e){
  if (G.screen !== 'battle' || G.paused) return;
  e.preventDefault();
  const p = stagePos(e);
  G.joy.active = true; G.joy.ox = p.x; G.joy.oy = p.y; G.joy.dx = 0; G.joy.dy = 0;
  joyEl.style.display = 'block';
  joyEl.style.left = (p.x-48)+'px'; joyEl.style.top = (p.y-48)+'px';
  knobEl.style.left = '26px'; knobEl.style.top = '26px';
  document.getElementById('joyhint').style.opacity = '0';
}
function onMove(e){
  if (!G.joy.active || G.screen !== 'battle') return;
  e.preventDefault();
  const p = stagePos(e);
  let dx = p.x - G.joy.ox, dy = p.y - G.joy.oy;
  const d = Math.hypot(dx,dy), max = 34;
  if (d > max){ dx = dx/d*max; dy = dy/d*max; }
  G.joy.dx = dx/max; G.joy.dy = dy/max;
  knobEl.style.left = (26 + dx)+'px'; knobEl.style.top = (26 + dy)+'px';
}
function onUp(){
  if (!G.joy.active) return;
  G.joy.active = false; G.joy.dx = 0; G.joy.dy = 0; joyEl.style.display = 'none';
}
stageEl.addEventListener('pointerdown', onDown);
window.addEventListener('pointermove', onMove, {passive:false});
window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', onUp);

/* ---------- 按钮绑定 ---------- */
document.getElementById('btn-start').onclick = startRun;
document.getElementById('btn-pause').onclick = ()=>{ pauseBattle(); go('build'); };
document.getElementById('btn-resume').onclick = ()=>{ resumeBattle(); go(G.result? 'result' : 'battle'); };
document.getElementById('btn-build').onclick = ()=>{ go('build'); };
document.getElementById('btn-skip').onclick = ()=>{ G.gold += 8; toast('+8 金币'); G.levelCards = []; toMapOrBattle(); };
document.getElementById('btn-instback').onclick = ()=>{ finishInstall(); };
document.getElementById('btn-shopleave').onclick = leaveShop;
document.getElementById('btn-again').onclick = ()=>{ G.seed = (G.seed*7919 + 13) % 2147483647; startRun(); };

/* ---------- 主循环 ---------- */
let last = performance.now(), hudAcc = 0;
function loop(now){
  const dt = Math.min(0.05, (now-last)/1000); last = now;
  if (G.screen === 'battle' && !G.paused && G.player){
    G.battleRunning = true;
    updateBattle(dt);
    hudAcc += dt;
    if (hudAcc > 0.1){ hudAcc = 0; syncUI(); }
    if (G.banner){ banner(G.banner); G.banner = ''; }
  }
  if (G.player) render();
  requestAnimationFrame(loop);
}

/* ---------- 启动 ---------- */
window.__G = G;   // 供调试 / 自动化测试观察状态（只读用途）
G.seed = 20261012;
go('charselect');
requestAnimationFrame(loop);
