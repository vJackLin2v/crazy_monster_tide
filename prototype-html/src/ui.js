/* ============================================================
   疯狂怪潮 · UI 层（屏幕管理 / 交互 / 主循环）
   波次闯关版（土豆兄弟式）—— 见 flow.js 与 decisions.md D-11
   ============================================================ */
'use strict';

/* ---------- 舞台缩放（fitWidth，等比） ---------- */
function fitStage(){
  const pad = 8;
  const s = Math.min((window.innerWidth - pad) / 360, (window.innerHeight - pad) / 640);
  document.getElementById('stage').style.transform = 'scale(' + s + ')';
}
window.addEventListener('resize', fitStage); fitStage();

/* ---------- 屏幕切换 ---------- */
const SCREENS = ['menu','howto','charselect','battle','levelup','install','replace','confirm','build','shop','result'];
const CANVAS_SCREENS = ['battle','levelup','install','replace','confirm','build','shop','result'];
function clearCanvas(){
  CX.setTransform(1,0,0,1,0,0);
  CX.fillStyle = '#131C36'; CX.fillRect(0,0,360,640);
}
function go(name){
  G.screen = name;
  SCREENS.forEach(s => document.getElementById('scr-' + s).classList.toggle('on', s === name));
  if (CANVAS_SCREENS.indexOf(name) < 0) clearCanvas();
  document.getElementById('joyhint').style.opacity = (name === 'battle') ? '1' : '0';
  if (name === 'menu') renderMenu();
  if (name === 'charselect') renderCharSelect();
  if (name === 'battle') syncUI();
  if (name === 'build') renderBuild();
  if (name === 'shop') renderShop();
  if (name === 'result') renderResult();
}

function toast(msg){
  const t = document.getElementById('toast');
  t.textContent = msg; t.style.display = 'block';
  clearTimeout(toast._h); toast._h = setTimeout(() => t.style.display = 'none', 1400);
}
function banner(txt){
  const b = document.getElementById('banner');
  b.textContent = txt; b.classList.remove('show'); void b.offsetWidth; b.classList.add('show');
}

/* ---------- 主界面 ---------- */
function renderMenu(){
  document.getElementById('menuseed').textContent = 'seed ' + G.seed;
}

/* ---------- 角色选择（网格换行） ---------- */
let selChar = 0;
function renderCharSelect(){
  const grid = document.getElementById('chargrid');
  grid.innerHTML = '';
  CHARS.forEach((c, i) => {
    const d = document.createElement('div');
    d.className = 'char' + (i === selChar ? ' sel' : '');
    const cv = document.createElement('canvas'); cv.width = 48; cv.height = 48;
    const g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
    g.drawImage(spriteCanvas(c.spr, 4, {[c.col]: PAL[c.col]}), 0, 0, 48, 48);
    d.appendChild(cv);
    const n = document.createElement('div'); n.className = 'nm'; n.textContent = c.name;
    d.appendChild(n);
    d.onclick = () => { selChar = i; renderCharSelect(); };
    grid.appendChild(d);
  });
  const c = CHARS[selChar], st = c.stats || {}, sk = SKILLS[c.start];
  const spd = Math.round(62 * (st.speedMul || 1));
  document.getElementById('chardetail').innerHTML = [
    '<h3>天赋</h3>',
    '<div class="tal"><span class="tag pos">正向</span><span>' + c.pos + '</span></div>',
    '<div class="tal"><span class="tag neg">负向</span><span>' + c.neg + '</span></div>',
    '<h3>初始技能</h3>',
    '<div class="row"><div class="ri">' + sk.icon + '</div><div class="rt"><b>' + sk.name + '</b>',
    '<div class="rx">' + sk.type + ' · ' + sk.tags.join(' / ') + ' · CD ' + sk.cd + 's</div></div></div>',
    '<h3>初始属性</h3>',
    '<div class="row"><div class="ri">&#9876;</div><div class="rt"><b>攻击 ' + Math.round((st.power || 1) * 100) + '%</b>',
    '<div class="rx">生命 ' + (st.maxhp || 100) + ' · 移速 ' + spd + ' px/s</div></div></div>',
    '<div class="sub" style="margin-top:10px">开局 1 个技能，局内最多 4 个 · 每技能 3 个行为槽</div>'
  ].join('');
}

function startRun(){
  const c = CHARS[selChar];
  G.char = c; c.colColor = PAL[c.col];
  G.rng = makeRng(G.seed);
  G.stats = freshStats(c);
  G.skills = [mkSkill(c.start)];
  G.items = []; G.modsBag = []; G.gold = 0; G.lv = 1; G.exp = 0; G.expNeed = 5;
  G.attrTaken = {}; G.shopStock = null; G.shopReroll = 0;
  G.endless = false; G.hitstop = 0; G.shake = 0;
  startRunFlow();
}

/* ---------- HUD / 技能状态栏 ---------- */
function syncHud(){
  const st = G.stats; if (!st) return;
  const hp = Math.max(0, Math.round(st.hp)), mx = Math.round(st.maxhp);
  const pct = Math.max(0, Math.min(100, hp / mx * 100));
  const b = document.getElementById('hpbar'); if (b) b.style.width = pct + '%';
  const t = document.getElementById('hptxt'); if (t) t.textContent = hp + '/' + mx;
  const l = document.getElementById('lvbox'); if (l) l.textContent = 'Lv.' + G.lv;
  const eb = document.getElementById('expbar');
  if (eb) eb.style.width = Math.min(100, G.exp / G.expNeed * 100) + '%';
  const gt = document.getElementById('goldtxt'); if (gt) gt.textContent = G.gold;
  const wt = document.getElementById('wavetxt');
  if (wt){
    if (G.isBossWave) wt.textContent = '第 ' + G.wave + ' 波 · BOSS';
    else wt.textContent = '第 ' + G.wave + ' 波 · 剩 ' + Math.max(0, Math.ceil(waveLeft)) + 's · 击杀 ' + G.battleKilled;
  }
}
/* 逐帧刷新：BOSS 血条 / 技能冷却 / 顿帧屏震衰减（这些必须流畅，不能 10Hz） */
function syncCombatUI(dt){
  // BOSS 常驻血条
  const bar = document.getElementById('bossbar');
  const boss = (typeof ents !== 'undefined') ? ents.enemies.find(e => e.kind === 'boss' && !e.dead) : null;
  if (boss){
    bar.classList.add('on');
    document.getElementById('bossname').textContent = 'BOSS · 第 ' + G.wave + ' 波';
    document.getElementById('bossfill').style.width = Math.max(0, boss.hp/boss.maxhp*100) + '%';
  } else if (bar.classList.contains('on')) bar.classList.remove('on');
  // 技能冷却
  for (let i = 0; i < 4; i++){
    const el = document.getElementById('cd' + i);
    if (!el) continue;
    const sk = G.skills[i];
    if (!sk){ el.style.transform = 'scaleY(0)'; continue; }
    const c = calcSkill(sk);
    const k = Math.max(0, Math.min(1, sk.t / c.cd));
    el.style.transform = 'scaleY(' + k + ')';
  }
  // 顿帧 / 屏震衰减
  if (G.hitstop > 0) G.hitstop = Math.max(0, G.hitstop - dt);
  if (G.shake > 0){ G.shake *= Math.pow(0.0016, dt); if (G.shake < 0.15) G.shake = 0; }
}

function syncUI(){
  syncHud();
  const bar = document.getElementById('skillbar');
  if (!bar) return;
  bar.innerHTML = '';
  for (let i = 0; i < 4; i++){
    const sk = G.skills[i];
    const d = document.createElement('div'); d.className = 'sk';
    if (!sk){
      d.innerHTML = '<div class="ico2" style="opacity:.35">+</div>' +
        '<div class="slots"><div class="slot"></div><div class="slot"></div><div class="slot"></div></div>' +
        '<div class="nm">空</div>';
      bar.appendChild(d); continue;
    }
    const b = SKILLS[sk.id];
    const stacks = {};
    sk.mods.forEach(m => stacks[m] = (stacks[m] || 0) + 1);
    const top = Object.entries(stacks).sort((a, c) => c[1] - a[1])[0];
    let slots = '';
    for (let s = 0; s < 3; s++){
      const mid = sk.mods[s];
      slots += '<div class="slot' + (mid ? ' f' : '') + '"></div>';
    }
    d.innerHTML = '<div class="ico2">' + b.icon +
      '<div class="cdmask" id="cd' + i + '"></div>' +
      (top ? '<div class="stack" style="display:block">x' + top[1] + '</div>' : '') +
      '</div><div class="slots">' + slots + '</div><div class="nm">' + b.name + ' Lv' + sk.lvl + '</div>';
    bar.appendChild(d);
  }
}

/* ---------- 升级 3 选 1 ---------- */
function onLevelUp(){
  G.levelPause = true;
  G.levelCards = rollRewards();
  if (!G.levelCards.length){ resumeBattle(); return; }
  go('levelup');
  const box = document.getElementById('lucards');
  box.innerHTML = '';
  const KINDNAME = {skill:'技能', skillup:'技能强化', module:'行为模块', item:'道具', attr:'属性'};
  const CLS = {skill:'c-skill', skillup:'c-skill', module:'c-module', item:'c-item', attr:'c-attr'};
  G.levelCards.forEach((r, i) => {
    let icon = '?', name = '', desc = '', tag = KINDNAME[r.kind];
    if (r.kind === 'skill'){
      const s = SKILLS[r.id]; icon = s.icon; name = s.name;
      desc = r.needReplace
        ? s.type + ' · ' + s.tags.join('/') + '<br><span style="color:#FFA84B;font-weight:900">技能已满 4 个，需替换</span>'
        : s.type + ' · ' + s.tags.join('/');
      if (r.needReplace) tag = '技能（替换）';
    }
    else if (r.kind === 'skillup'){ const s = SKILLS[r.id]; icon = '^'; name = s.name + ' 强化'; desc = '伤害 +22%，冷却 -6%'; }
    else if (r.kind === 'module'){ const m = MODULES[r.id]; icon = m.icon; name = m.name;
      desc = m.desc + '<br><span style="color:#FFA84B">' + m.requires.join(' / ') + '</span>'; }
    else if (r.kind === 'item'){ const it = ITEMS[r.id]; icon = it.icon; name = it.name; desc = it.desc; }
    else { const a = ATTRS[r.id]; icon = a.icon; name = a.name;
      const cur = G.stats[r.id], nxt = (r.id === 'maxhp') ? cur + a.step : cur + a.step;
      desc = a.fmt(cur) + ' <span style="color:#88D6BC">→</span> <b style="color:#FFA84B">' + a.fmt(nxt) + '</b>' +
             '<br><span style="opacity:.7">本局已强化 ' + ((G.attrTaken && G.attrTaken[r.id]) || 0) + ' 次</span>'; }
    const d = document.createElement('div');
    d.className = 'card ' + (CLS[r.kind] || '');
    d.innerHTML = '<div class="ci">' + icon + '</div><div class="cn">' + name + '</div>' +
      '<div class="cd">' + desc + '</div><div class="ct">' + tag + '</div>';
    d.onclick = () => chooseCard(i);
    box.appendChild(d);
  });
}
function chooseCard(i){
  const r = G.levelCards[i];
  if (r.kind === 'module'){ openInstall(r.id, 'levelup'); return; }
  if (r.kind === 'skill' && G.skills.length >= 4){ openSkillReplace(r.id); return; }
  applyReward(r);
  backToBattle();
}
function backToBattle(){
  G.levelPause = false;
  G.screen = 'battle';
  go('battle');
  resumeBattle();
}

/* ---------- 行为模块安装 ---------- */
let instState = null;
function openInstall(mid, from){
  instState = {mid, from};
  const m = MODULES[mid];
  document.getElementById('instTitle').textContent = '安装「' + m.name + '」到哪个技能？';
  document.getElementById('instSub').textContent = '兼容标签：' + m.requires.join(' / ') + ' · 可重复（上限 ' + m.max + '）';
  const list = document.getElementById('instlist');
  list.innerHTML = '';
  let any = false;
  // 槽位级交互：空槽=直接装上；已占用的槽=点它就把原来那个换下来（换下的模块回背包，不损失）
  G.skills.forEach((sk, si) => {
    const b = SKILLS[sk.id];
    const okTag = b.tags.some(x => m.requires.includes(x));
    const cnt = sk.mods.filter(x => x === mid).length;
    const capped = cnt >= m.max;
    const can = okTag && !capped;
    if (can) any = true;
    const d = document.createElement('div'); d.className = 'row';
    d.style.opacity = can ? '1' : '.45';
    const stackTip = cnt > 0 ? ' <span class="tag n" style="margin-left:2px">已有 x' + cnt + '/' + m.max + '</span>' : '';
    let slotsHtml = '';
    for (let s = 0; s < 3; s++){
      const mm = sk.mods[s];
      const ok = can && (s <= sk.mods.length);
      slotsHtml += '<span class="slotbtn' + (mm ? ' full' : '') + (ok ? '' : ' off') + '" data-si="' + si + '" data-slot="' + s + '">' +
        (mm ? MODULES[mm].name : '空槽') + (mm ? '<i>替换</i>' : '') + '</span>';
    }
    d.innerHTML = '<div class="ri">' + b.icon + '</div><div class="rt"><b>' + b.name + '</b>' + stackTip +
      '<div class="rx" style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap">' + slotsHtml + '</div></div>' +
      '<div class="ra"' + (can ? '' : ' style="opacity:.5"') + '>' +
      (!okTag ? '不兼容' : (capped ? '已满级' : '选槽位')) + '</div>';
    if (can) d.querySelectorAll('.slotbtn').forEach(el => {
      if (el.classList.contains('off')) return;
      el.onclick = () => doInstallAt(+el.dataset.si, +el.dataset.slot, mid);
    });
    list.appendChild(d);
  });
  if (!any){
    G.modsBag.push(mid);
    toast('没有兼容的槽位，模块已放入背包');
    finishInstall(); return;
  }
  go('install');
}
/* 装到指定槽位：空槽=装上；占用=替换（被替换的模块回背包，不损失） */
function doInstallAt(si, slot, mid){
  const sk = G.skills[si];
  if (slot < sk.mods.length){
    const old = sk.mods[slot];
    if (old === mid){ toast('这个槽位已经是它了'); return; }
    G.modsBag.push(old);
    sk.mods[slot] = mid;
    toast(MODULES[mid].name + ' 替换 ' + MODULES[old].name + '（原模块已回背包）');
  } else {
    sk.mods.push(mid);
    toast(MODULES[mid].name + ' → ' + SKILLS[sk.id].name);
  }
  if (instState && instState.from === 'build'){
    const k = G.modsBag.indexOf(mid); if (k >= 0) G.modsBag.splice(k, 1);
  }
  resetFlags();
  finishInstall();
}
function doInstall(si, mid){ doInstallAt(si, G.skills[si].mods.length, mid); }
function finishInstall(){
  const from = instState ? instState.from : null;
  instState = null;
  if (from === 'build'){ go('build'); renderBuild(); return; }
  backToBattle();
}

/* ---------- Build 面板（暂停：遮罩 + 抽屉） ---------- */
let buildTab = 'skill';
function renderBuild(){
  const bw = document.getElementById('buildWave'); if (bw) bw.textContent = G.wave || 1;
  const tabs = document.getElementById('btabs');
  const T = [['skill','技能'],['mod','行为'],['item','道具'],['attr','属性']];
  tabs.innerHTML = T.map(([k, n]) => '<div class="tab' + (buildTab === k ? ' on' : '') + '" data-k="' + k + '">' + n + '</div>').join('');
  tabs.querySelectorAll('.tab').forEach(el => el.onclick = () => { buildTab = el.dataset.k; renderBuild(); });
  const list = document.getElementById('blist');
  list.innerHTML = '';
  if (buildTab === 'skill'){
    G.skills.forEach((sk, si) => {
      const b = SKILLS[sk.id], c = calcSkill(sk);
      const d = document.createElement('div'); d.className = 'row';
      d.innerHTML = '<div class="ri">' + b.icon + '</div><div class="rt"><b>' + b.name + ' Lv' + sk.lvl + '</b>' +
        '<div class="rx">伤害 ' + c.dmg.toFixed(1) + ' · CD ' + c.cd.toFixed(2) + 's' +
        (c.count > 1 ? ' · x' + c.count : '') + (c.pierce ? ' · 穿透' + c.pierce : '') +
        (c.bounce ? ' · 反弹' + c.bounce : '') + (c.orbit ? ' · 环绕' + c.orbit : '') + '</div></div>';
      list.appendChild(d);
      sk.mods.forEach((mid, mi) => {
        const r = document.createElement('div'); r.className = 'row'; r.style.marginLeft = '14px';
        r.innerHTML = '<div class="ri">' + MODULES[mid].icon + '</div><div class="rt"><b>' + MODULES[mid].name + '</b>' +
          '<div class="rx">槽 ' + (mi + 1) + ' · ' + MODULES[mid].desc + '</div></div><div class="ra">卸下</div>';
        r.querySelector('.ra').onclick = () => { sk.mods.splice(mi, 1); G.modsBag.push(mid); toast('已放入背包'); renderBuild(); syncUI(); };
        list.appendChild(r);
      });
      if (sk.mods.length < 3){
        const r = document.createElement('div'); r.className = 'row'; r.style.marginLeft = '14px';
        r.innerHTML = '<div class="ri">+</div><div class="rt"><b>空槽位 ' + (sk.mods.length + 1) + '</b>' +
          '<div class="rx">从「行为」页签安装模块</div></div>';
        list.appendChild(r);
      }
    });
  } else if (buildTab === 'mod'){
    const bag = {};
    G.modsBag.forEach(m => bag[m] = (bag[m] || 0) + 1);
    if (!Object.keys(bag).length) list.innerHTML = '<div class="sub">背包里没有未安装的行为模块</div>';
    Object.entries(bag).forEach(([mid, n]) => {
      const m = MODULES[mid];
      const d = document.createElement('div'); d.className = 'row';
      d.innerHTML = '<div class="ri">' + m.icon + '</div><div class="rt"><b>' + m.name + ' x' + n + '</b>' +
        '<div class="rx">' + m.desc + ' · 兼容 ' + m.requires.join('/') + '</div></div><div class="ra">安装</div>';
      d.querySelector('.ra').onclick = () => openInstall(mid, 'build');
      list.appendChild(d);
    });
  } else if (buildTab === 'item'){
    if (!G.items.length) list.innerHTML = '<div class="sub">还没有道具</div>';
    G.items.forEach(it => {
      const d = document.createElement('div'); d.className = 'row';
      d.innerHTML = '<div class="ri">' + ITEMS[it.id].icon + '</div><div class="rt"><b>' + ITEMS[it.id].name + '</b>' +
        '<div class="rx">' + ITEMS[it.id].desc + '</div></div>';
      list.appendChild(d);
    });
  } else {
    Object.entries(ATTRS).forEach(([k, a]) => {
      const taken = (G.attrTaken && G.attrTaken[k]) || 0;
      const d = document.createElement('div'); d.className = 'row';
      d.innerHTML = '<div class="ri">' + a.icon + '</div><div class="rt"><b>' + a.name + '</b>' +
        '<div class="rx">当前 ' + a.fmt(G.stats[k]) + (taken ? ' · 本局已强化 ' + taken + ' 次' : '') + '</div></div>';
      list.appendChild(d);
    });
  }
  syncHud();
}

/* ---------- 波间商店 ---------- */
function renderShop(){
  document.getElementById('shopTitle').textContent = '第 ' + G.wave + ' 波 结束';
  document.getElementById('shopGold').innerHTML =
    '金币 <b style="color:var(--gold)">' + G.gold + '</b>' +
    (G.lastWaveGold ? ' &nbsp;(+ ' + G.lastWaveGold + ')' : '');
  const btn = document.getElementById('btn-reroll');
  btn.textContent = '刷新 ◆' + (2 + (G.shopReroll || 0));
  const list = document.getElementById('shoplist');
  list.innerHTML = '';
  (G.shopStock || []).forEach((s, i) => {
    if (!s){                                  // 空货位也占位显示，避免列表跳动
      const e = document.createElement('div'); e.className = 'row shoprow empty';
      e.textContent = '空货位';
      list.appendChild(e); return;
    }
    let icon = '?', name = '', desc = '', blocked = '', tagHtml = '';
    if (s.kind === 'item'){
      icon = ITEMS[s.id].icon; name = ITEMS[s.id].name; desc = ITEMS[s.id].desc;
      if (G.items.some(x => x.id === s.id)) blocked = '已拥有';
    } else if (s.kind === 'module'){
      icon = MODULES[s.id].icon; name = MODULES[s.id].name; desc = MODULES[s.id].desc;
      const owned = G.modsBag.filter(x => x === s.id).length +
        G.skills.reduce((n, sk) => n + sk.mods.filter(x => x === s.id).length, 0);
      tagHtml = '<span class="tag n" style="margin-left:4px">持有 x' + owned + '/' + MODULES[s.id].max + '</span>';
      if (owned >= MODULES[s.id].max) blocked = '已满级';
    } else if (s.kind === 'attr'){ icon = '&#9733;'; name = '随机属性'; desc = '立刻随机提升 1 项属性'; }
    else { icon = '+'; name = '治疗包'; desc = '回复 40 点生命'; }

    const can = !s.sold && !blocked && G.gold >= s.price;
    const d = document.createElement('div');
    d.className = 'row shoprow' + (s.sold ? ' sold' : '');
    // 购买后**不消失**：货位保留 + 盖「已购买」印记（用户反馈：买完东西消失很怪）
    const stamp = s.sold ? '<div class="stamp">已购买</div>' : '';
    const priceTxt = s.sold ? '已购' : (blocked || ('&#9670;' + s.price));
    d.innerHTML = stamp +
      '<div class="ri">' + icon + '</div>' +
      '<div class="rt"><b>' + name + '</b>' + tagHtml + '<div class="rx">' + desc + '</div></div>' +
      '<div class="ra" style="' + (can ? '' : 'opacity:.45') + '">' + priceTxt + '</div>' +
      '<div class="lockbtn' + (s.locked ? ' on' : '') + '" title="锁定：刷新也不掉">' +
        (s.locked ? '&#128274;' : '&#128275;') + '</div>';
    if (!s.sold && !blocked) d.querySelector('.ra').onclick = () => buyShop(s, name, i);
    if (!s.sold) d.querySelector('.lockbtn').onclick = (ev) => { ev.stopPropagation(); toggleLock(i); };
    list.appendChild(d);
  });
  const tip = document.createElement('div');
  tip.className = 'sub'; tip.style.marginTop = '10px';
  tip.textContent = '下一波：' + waveTime(G.wave + 1) + ' 秒' +
    (isBossWave(G.wave + 1) ? ' · BOSS 波' : (isEliteWave(G.wave + 1) ? ' · 精英波' : ''));
  list.appendChild(tip);
  // 打通 20 波后：可以选择继续或收工
  const done = G.wave >= RUN.waves && !G.endless;
  document.getElementById('endgamebox').classList.toggle('on', done);
  const btnFinish = document.getElementById('btn-finish');
  btnFinish.style.display = done ? 'block' : 'none';
  document.getElementById('btn-nextwave').textContent =
    done ? '继续挑战' : ('下一波' + (isBossWave(G.wave + 1) ? ' · BOSS' : ''));
}
function buyShop(s, name, idx){
  if (G.gold < s.price){ toast('金币不足'); return; }
  G.gold -= s.price; s.sold = true; s.locked = false;
  if (s.kind === 'item'){ ITEMS[s.id].apply(G.stats); G.items.push({id:s.id}); }
  else if (s.kind === 'module'){ G.modsBag.push(s.id); }
  else if (s.kind === 'attr'){
    const id = G.rng.pick(Object.keys(ATTRS)), a = ATTRS[id];
    if (id === 'maxhp'){ G.stats.maxhp += a.step; G.stats.hp += a.step; }
    else G.stats[id] = (G.stats[id] || 0) + a.step;
    G.attrTaken = G.attrTaken || {}; G.attrTaken[id] = (G.attrTaken[id] || 0) + 1;
    name = name + ' → ' + a.name;
  } else G.stats.hp = Math.min(G.stats.maxhp, G.stats.hp + 40);
  toast('买下：' + name);
  renderShop();
}

/* ---------- 技能替换（已有 4 技能时，抽到新技能要换掉一个） ---------- */
let repState = null;
function openSkillReplace(newId){
  repState = {newId};
  const s = SKILLS[newId];
  document.getElementById('repIcon').textContent = s.icon;
  document.getElementById('repName').textContent = s.name;
  document.getElementById('repDesc').innerHTML = s.type + ' · ' + s.tags.join(' / ') + ' · CD ' + s.cd + 's';
  const list = document.getElementById('replist');
  list.innerHTML = '';
  G.skills.forEach((sk, si) => {
    const b = SKILLS[sk.id];
    const modTxt = sk.mods.length ? sk.mods.map(m => MODULES[m].name).join(' · ') : '无行为模块';
    const d = document.createElement('div'); d.className = 'row';
    d.innerHTML = '<div class="ri">' + b.icon + '</div><div class="rt"><b>' + b.name + ' Lv' + sk.lvl + '</b>' +
      '<div class="rx">' + modTxt + (sk.mods.length ? '（会退回背包）' : '') + '</div></div>' +
      '<div class="ra">替换</div>';
    // 整行可点（点击冒泡即可，不再依赖具体命中哪个子元素）
    d.style.cursor = 'pointer';
    d.onclick = () => doReplace(si, newId);
    list.appendChild(d);
  });
  go('replace');
}
function doReplace(si, newId){
  const sk = G.skills[si];
  const back = sk.mods.slice();
  if (back.length) G.modsBag.push.apply(G.modsBag, back);   // 模块不损失，回背包
  G.skills[si] = mkSkill(newId);
  resetFlags();
  toast(SKILLS[newId].name + ' 上场' + (back.length ? '，' + back.length + ' 个模块已退回背包' : ''));
  repState = null;
  backToBattle();
}

/* ---------- 二次确认弹窗 ---------- */
let cfmCb = null, cfmFrom = 'build';
function confirmBox(title, text, okText, cb, from){
  document.getElementById('cfmTitle').textContent = title;
  document.getElementById('cfmText').textContent = text;
  document.getElementById('cfmOk').textContent = okText || '确认';
  cfmCb = cb; cfmFrom = from || 'build';
  go('confirm');
}
function closeConfirm(ok){
  const cb = cfmCb; cfmCb = null;
  go(cfmFrom);
  if (ok && cb) cb();
}
/* 彻底清掉本局状态，避免回主菜单后 canvas 还留着上一局的画面 */
function hardResetRun(){
  G.result = null; G.paused = true; G.levelPause = false;
  G.player = null; G.endless = false; G.wave = 0; G.bossRef = null;
  if (typeof resetEnts === 'function') resetEnts();
}

/* ---------- 结算 ---------- */
function renderResult(){
  const r = G.result || {win:false};
  document.getElementById('resBig').textContent = r.win ? '通关！' : '倒下';
  document.getElementById('resBig').style.color = r.win ? 'var(--mint)' : 'var(--red)';
  document.getElementById('resStats').innerHTML = [
    ['存活时间', (r.time || 0).toFixed(1) + ' s'],
    ['击杀', r.kills || 0],
    ['等级', 'Lv.' + (r.lv || 1)],
    ['推进到', '第 ' + (r.wave || 1) + ' / ' + (r.waves || RUN.waves) + ' 波' + (r.endless ? '（无尽）' : '')],
    ['金币', r.gold || 0],
    ['seed', G.seed]
  ].map(([k, v]) => '<div class="stat"><span>' + k + '</span><b>' + v + '</b></div>').join('');
  let html = '';
  (r.skills || []).forEach(s => {
    html += '<div class="row"><div class="ri">' + SKILLS[s.id].icon + '</div><div class="rt"><b>' + SKILLS[s.id].name +
      ' Lv' + s.lv + '</b><div class="rx">' + (s.mods.length ? s.mods.map(m => MODULES[m].name).join(' · ') : '无行为模块') +
      '</div></div></div>';
  });
  (r.items || []).forEach(id => {
    html += '<div class="row"><div class="ri">' + ITEMS[id].icon + '</div><div class="rt"><b>' + ITEMS[id].name +
      '</b><div class="rx">' + ITEMS[id].desc + '</div></div></div>';
  });
  document.getElementById('resBuild').innerHTML = html || '<div class="sub">没有收获</div>';
}

/* ---------- 动态摇杆 ---------- */
G.joy = {active:false, dx:0, dy:0, ox:0, oy:0, pid:null};
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
  G.joy.active = true; G.joy.pid = e.pointerId;
  G.joy.ox = p.x; G.joy.oy = p.y; G.joy.dx = 0; G.joy.dy = 0;
  joyEl.style.display = 'block';
  joyEl.style.left = (p.x - 48) + 'px'; joyEl.style.top = (p.y - 48) + 'px';
  knobEl.style.left = '26px'; knobEl.style.top = '26px';
  document.getElementById('joyhint').style.opacity = '0';
}
function onMove(e){
  if (!G.joy.active || G.screen !== 'battle') return;
  e.preventDefault();
  const p = stagePos(e);
  let dx = p.x - G.joy.ox, dy = p.y - G.joy.oy;
  const d = Math.hypot(dx, dy), max = 34;
  if (d > max){ dx = dx / d * max; dy = dy / d * max; }
  G.joy.dx = dx / max; G.joy.dy = dy / max;
  knobEl.style.left = (26 + dx) + 'px'; knobEl.style.top = (26 + dy) + 'px';
}
function onUp(){
  if (!G.joy.active) return;
  G.joy.active = false; G.joy.dx = 0; G.joy.dy = 0; G.joy.pid = null;
  joyEl.style.display = 'none';
}
stageEl.addEventListener('pointerdown', onDown);
window.addEventListener('pointermove', onMove, {passive:false});
window.addEventListener('pointerup', onUp);
window.addEventListener('pointercancel', onUp);
window.addEventListener('blur', onUp);

/* ---------- 按钮绑定 ---------- */
document.getElementById('btn-play').onclick = () => go('charselect');
document.getElementById('btn-howto').onclick = () => go('howto');
document.getElementById('btn-howtoback').onclick = () => go('menu');
document.getElementById('btn-csback').onclick = () => go('menu');
document.getElementById('btn-start').onclick = startRun;
document.getElementById('btn-pause').onclick = () => { pauseBattle(); go('build'); };
document.getElementById('btn-resume').onclick = () => { resumeBattle(); go('battle'); };
document.getElementById('btn-skip').onclick = () => { G.gold += 8; toast('+8 金币'); backToBattle(); };
document.getElementById('btn-instback').onclick = () => finishInstall();
document.getElementById('btn-reroll').onclick = () => rerollShop();
document.getElementById('btn-nextwave').onclick = () => {
  if (G.wave >= RUN.waves && !G.endless){ G.endless = true; toast('进入无尽模式'); }
  G.shopStock = null; G.shopReroll = 0; nextWave();
};
document.getElementById('btn-finish').onclick = () => showResult(true);
document.getElementById('btn-again').onclick = () => { G.seed = (G.seed * 7919 + 13) % 2147483647; startRun(); };
document.getElementById('btn-tomenu').onclick = () => go('menu');
document.getElementById('btn-repback').onclick = () => { repState = null; backToBattle(); };
document.getElementById('cfmOk').onclick = () => closeConfirm(true);
document.getElementById('cfmCancel').onclick = () => closeConfirm(false);
// 暂停面板 -> 返回主菜单（会丢进度，所以二次确认）
document.getElementById('btn-tomenu2').onclick = () => {
  G.paused = true;
  confirmBox('返回主菜单？', '第 ' + (G.wave || 1) + ' 波的本局进度会丢失，主菜单不能继续这一局。', '放弃本局', () => {
    hardResetRun();
    go('menu');
  }, 'build');
};

/* ---------- 主循环 ---------- */
let last = performance.now(), hudAcc = 0;
function loop(now){
  const dt = Math.min(0.05, (now - last) / 1000); last = now;
  if (G.screen === 'battle' && !G.paused && G.player){
    // 顿帧：命中/击杀瞬间把时间压慢，打击感来源之一
    const scale = (G.hitstop > 0) ? 0.22 : 1;
    updateBattle(dt * scale);
    syncCombatUI(dt);
    hudAcc += dt;
    if (hudAcc > 0.1){ hudAcc = 0; syncUI(); }
    if (G.banner){ banner(G.banner); G.banner = ''; }
  }
  if (G.player && CANVAS_SCREENS.indexOf(G.screen) >= 0) render();
  requestAnimationFrame(loop);
}

/* ---------- 启动 ---------- */
window.__G = G;
G.seed = 20261012;
go('menu');
requestAnimationFrame(loop);
