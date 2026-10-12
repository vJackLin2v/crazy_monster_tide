/* ============================================================
   疯狂怪潮 · 渲染层（单位精灵 + 技能 VFX + 像素风）
   素材：assets/approved/units（21 单位 x 4 动画）｜assets/approved/vfx（85 组件 / 903 帧）
   ============================================================ */
'use strict';

const CV = document.getElementById('cv');
const CX = CV.getContext('2d');
CX.imageSmoothingEnabled = false;

/* ---------- 兼容旧的字符画精灵（经验宝石等少量程序件） ---------- */
const _sprCache = {};
function spriteCanvas(name, scale, override){
  const key = name + '|' + scale + '|' + (override ? JSON.stringify(override) : '');
  if (_sprCache[key]) return _sprCache[key];
  const rows = SPR[name];
  const h = rows.length, w = Math.max.apply(null, rows.map(r => r.length));
  const c = document.createElement('canvas');
  c.width = w * scale; c.height = h * scale;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  for (let y = 0; y < h; y++){
    const row = rows[y];
    for (let x = 0; x < row.length; x++){
      const ch = row[x];
      if (ch === '.') continue;
      const col = (override && override[ch]) || PAL[ch];
      if (!col) continue;
      g.fillStyle = col; g.fillRect(x*scale, y*scale, scale, scale);
    }
  }
  _sprCache[key] = c; return c;
}
function drawSprite(spr, x, y, scale, override, flip){
  const c = spriteCanvas(spr, scale, override);
  const dx = Math.round(x - c.width/2), dy = Math.round(y - c.height/2);
  CX.save();
  if (flip){ CX.translate(dx + c.width, dy); CX.scale(-1,1); CX.drawImage(c,0,0); }
  else CX.drawImage(c, dx, dy);
  CX.restore();
}
function unitRawFrame(u, anim, i){
  const im = UIMG[u + '/' + anim + '/' + i];
  return (im && im.complete && im.naturalWidth) ? im : null;
}
/* 非循环播放（死亡动画）：播到最后一帧停住并淡出 */
function drawUnitOnce(u, anim, idx, x, y, scale, flip){
  const def = (typeof UNITS !== 'undefined') && UNITS[u];
  const n = (def && def.anims[anim]) ? def.anims[anim] : 1;
  const i = Math.min(n, Math.max(1, Math.floor(idx) + 1));
  const im = unitRawFrame(u, anim, i);
  if (!im){ CX.fillStyle = '#8FA3C8'; CX.fillRect(x - 9*scale, y - 9*scale, 18*scale, 18*scale); return; }
  const w = im.naturalWidth * scale, h = im.naturalHeight * scale;
  const dx = Math.round(x - w/2), dy = Math.round(y - h + 8 * scale);
  const fade = 1 - Math.max(0, Math.min(1, (idx - n) / 4));
  CX.save(); CX.globalAlpha = Math.max(0, fade);
  if (flip){ CX.translate(dx + w, dy); CX.scale(-1,1); CX.drawImage(im, 0, 0, w, h); }
  else CX.drawImage(im, dx, dy, w, h);
  CX.restore();
}

/* ---------- 摄像机 ---------- */
function camera(){
  const p = G.player || {x:ARENA.W/2, y:ARENA.H/2};
  let cx = p.x - VIEW_W/2, cy = p.y - VIEW_H/2;
  cx = Math.max(0, Math.min(ARENA.W - VIEW_W, cx));
  cy = Math.max(0, Math.min(ARENA.H - VIEW_H, cy));
  return {cx, cy};
}

/* ---------- 背景 ---------- */
/* 背景铺在【世界空间】（在 scale(ZOOM) 之后调用）—— 程序化棋盘（第一版做法） */
function drawBg(cam){
  const T = 24;
  const x0 = Math.floor(cam.cx/T)*T, y0 = Math.floor(cam.cy/T)*T;
  const x1 = cam.cx + VIEW_W + T, y1 = cam.cy + VIEW_H + T;
  CX.fillStyle = '#131C36'; CX.fillRect(cam.cx - T, cam.cy - T, VIEW_W + T*2, VIEW_H + T*2);
  for (let y = y0; y < y1; y += T){
    for (let x = x0; x < x1; x += T){
      const odd = ((x/T + y/T) % 2) === 0;
      CX.fillStyle = odd ? '#17233D' : '#1A2846';
      CX.fillRect(x, y, T, T);
      if (odd){
        CX.fillStyle = 'rgba(255,255,255,.022)';
        CX.fillRect(x + 3, y + 3, 3, 3);
      }
    }
  }
  CX.strokeStyle = 'rgba(255,168,75,.35)'; CX.lineWidth = 2;
  CX.strokeRect(0, 0, ARENA.W, ARENA.H);
}

/* 单位影子：让所有单位"站在地上"而不是飘着 */
function unitShadow(x, y, rx){
  CX.save(); CX.globalAlpha = 0.26; CX.fillStyle = '#000';
  CX.beginPath(); CX.ellipse(x, y + 8, rx, rx * 0.36, 0, 0, Math.PI*2); CX.fill();
  CX.restore();
}

/* ---------- 动画状态选择 ---------- */
function unitHas(u, anim){
  const d = (typeof UNITS !== 'undefined') && UNITS[u];
  return !!(d && d.anims && d.anims[anim]);
}
function enemyAnim(e){
  if (e.dead) return 'death';
  if (e.atkT > 0 && unitHas(e.unit, 'attack')) return 'attack';
  if (e.walkT > 0 && unitHas(e.unit, 'walk')) return 'walk';
  return 'idle';
}
function playerAnim(p){
  const u = G.char.unit;
  if (p.atkT > 0 && unitHas(u, 'attack')) return 'attack';
  if (p.walkT > 0 && unitHas(u, 'walk')) return 'walk';
  return 'idle';
}

/* ---------- 主渲染 ---------- */
function render(){
  const cam = camera();
  CX.setTransform(1,0,0,1,0,0);
  CX.fillStyle = '#131C36'; CX.fillRect(0, 0, 360, 640);
  CX.save();
  const sh = G.shake || 0;
  const shx = sh ? (Math.random()*2-1)*sh : 0;
  const shy = sh ? (Math.random()*2-1)*sh : 0;
  // 世界 → 屏幕：screen = ZOOM * (world - cam)
  CX.translate(Math.round(-cam.cx*ZOOM + shx), Math.round(-cam.cy*ZOOM + shy));
  CX.scale(ZOOM, ZOOM);
  drawBg(cam);

  // ---- 地面区域（领域 / 范围技）----
  for (const a of ents.areas){
    const k = a.kind === 'pulse' ? (a.t / a.life) : 1;
    if (a.vfx){
      const sc = a.kind === 'pulse' ? Math.max(1, Math.round(a.max / 32)) : Math.max(1, Math.round(a.r / 16));
      drawVFXStill(a.vfx, a.t, a.x, a.y, sc, {alpha: a.kind === 'pulse' ? (1 - k)*0.95 + 0.05 : 0.85});
    } else {
      CX.save(); CX.globalAlpha = a.kind === 'pulse' ? (1 - k)*0.5 : 0.22;
      CX.fillStyle = a.color;
      CX.beginPath(); CX.arc(a.x, a.y, a.r, 0, Math.PI*2); CX.fill(); CX.restore();
    }
  }
  // ---- 经验宝石 ----
  for (const g of ents.gems) drawSprite('gem', g.x, g.y, 2);
  // ---- 召唤物 ----
  for (const s of ents.summons) drawVFXStill('summon/summon_fx/summon', s.t, s.x, s.y, 1.4, {alpha: 0.95});
  // ---- 敌人 ----
  for (const e of ents.enemies){
    const sc = (e.boss || e.elite) ? 2 : 1;
    if (e.elite || e.boss){                      // 精英/BOSS 光环
      const pulse = 0.5 + 0.5*Math.sin(performance.now()/200);
      CX.save(); CX.globalAlpha = 0.18 + 0.14*pulse;
      CX.fillStyle = e.boss ? '#FFA84B' : '#E04060';
      CX.beginPath(); CX.ellipse(e.x, e.y + 10*sc, e.boss?30:18, e.boss?11:7, 0, 0, Math.PI*2); CX.fill();
      CX.restore();
    }
    if (e.spawnT > 0){                            // 入场警示
      drawVFXStill('core/ring/zap-ring', 0.9 - e.spawnT, e.x, e.y, 1.6, {alpha: Math.min(1, e.spawnT/0.9)});
    }
    unitShadow(e.x, e.y, (e.boss ? 22 : (e.elite ? 15 : 10)) * 0.9);
    if (e.dead) drawUnitOnce(e.unit, 'death', e.deathT * 12, e.x, e.y, sc, e.facing < 0);
    else drawUnit(e.unit, enemyAnim(e), e.animT, e.x, e.y, sc, e.facing < 0, e.flash, null);
    if (!e.dead && e.hp < e.maxhp){               // 血条
      const w = e.boss ? 30 : (e.elite ? 22 : 16);
      const hy = e.y - e.r - (e.boss ? 12 : (e.elite ? 9 : 7));
      CX.fillStyle = '#0B1224'; CX.fillRect(e.x - w/2 - 0.5, hy - 0.5, w + 1, 3);
      CX.fillStyle = e.boss ? '#FFA84B' : '#E04060';
      CX.fillRect(e.x - w/2, hy, w * (e.hp/e.maxhp), 2);
    }
  }
  // ---- 玩家 ----
  if (G.player){
    const p = G.player;
    const pulse = 0.5 + 0.5*Math.sin(performance.now()/260);
    CX.save();
    CX.globalAlpha = 0.85; CX.strokeStyle = '#0A1020'; CX.lineWidth = 2.5;
    CX.beginPath(); CX.ellipse(p.x, p.y + 8, 19, 8, 0, 0, Math.PI*2); CX.stroke();
    CX.globalAlpha = 0.75 + 0.25*pulse; CX.strokeStyle = '#FFA84B'; CX.lineWidth = 1.6;
    CX.beginPath(); CX.ellipse(p.x, p.y + 8, 19, 8, 0, 0, Math.PI*2); CX.stroke();
    CX.globalAlpha = 0.16 + 0.10*pulse; CX.fillStyle = '#FFA84B';
    CX.beginPath(); CX.ellipse(p.x, p.y + 8, 19, 8, 0, 0, Math.PI*2); CX.fill();
    CX.restore();
    unitShadow(p.x, p.y, 12);
    if (p.dmgFlash > 0.02) drawVFX(FX.hurt, (1 - p.dmgFlash) * 0.4, p.x, p.y, 1, 0, false, {alpha: p.dmgFlash});
    drawUnit(G.char.unit, playerAnim(p), p.animT || 0, p.x, p.y, 1, p.face < 0, 0, null);
  }
  // ---- 子弹（按飞行方向旋转）----
  for (const b of ents.bullets){
    if (b.vfx){
      const rot = b.orbit ? (b.orbA + Math.PI/2) : (Math.atan2(b.vy, b.vx) + Math.PI/2);
      const sc = Math.max(1, Math.round(b.r / 5));
      drawVFX(b.vfx, b.t, b.x, b.y, sc, rot, true, {alpha: 0.98});
    } else {
      CX.fillStyle = b.color;
      const s = Math.max(3, Math.round(b.r*2));
      CX.fillRect(Math.round(b.x-s/2), Math.round(b.y-s/2), s, s);
    }
  }
  // ---- 旧版特效（警示环 / 链雷 / 冲击环）----
  for (const f of ents.fx){
    const k = 1 - f.t/f.life;
    if (f.type === 'warn'){
      const kk = f.t/f.life;
      CX.save(); CX.globalAlpha = (1-kk)*0.9; CX.strokeStyle = f.color; CX.lineWidth = 4;
      CX.beginPath(); CX.arc(f.x, f.y, f.max*(1-kk*k), 0, Math.PI*2); CX.stroke(); CX.restore();
    } else if (f.type === 'ring'){
      CX.save(); CX.globalAlpha = Math.max(0,k)*0.8; CX.strokeStyle = f.color; CX.lineWidth = 3;
      CX.beginPath(); CX.arc(f.x, f.y, f.max*(1-k)+4, 0, Math.PI*2); CX.stroke(); CX.restore();
    } else if (f.type === 'chain'){
      CX.save(); CX.globalAlpha = Math.max(0,k); CX.strokeStyle = f.color; CX.lineWidth = 3;
      CX.beginPath();
      f.pts.forEach((p,i)=> i ? CX.lineTo(p.x,p.y) : CX.moveTo(p.x,p.y));
      CX.stroke(); CX.restore();
      for (const pt of f.pts) drawVFXStill('chain/chain-node', f.t, pt.x, pt.y, 1, {alpha: Math.max(0,k)});
    }
  }
  // ---- VFX 组件特效（命中 / 击杀 / 死亡 ...）----
  if (ents.fx2){
    for (const f of ents.fx2) drawVFX(f.vfx, f.t, f.x, f.y, f.scale || 1, f.rot || 0, false, {alpha: 1});
  }
  CX.restore();          // 退出世界变换（含 ZOOM）
  // ---- 伤害数字：屏幕空间绘制，字号恒定清晰（世界空间会被放大成糊字）----
  for (const t of ents.texts){
    const k = 1 - t.t/t.life;
    if (k <= 0) continue;
    const sx = (t.x - cam.cx) * ZOOM, sy = (t.y - cam.cy) * ZOOM;
    if (sx < -40 || sx > 400 || sy < -20 || sy > 660) continue;
    CX.save(); CX.globalAlpha = Math.max(0, Math.min(1, k*1.8));
    CX.font = (t.big ? 'bold 15px' : 'bold 12px') + ' system-ui, sans-serif';
    CX.textAlign = 'center';
    CX.lineWidth = 3; CX.strokeStyle = '#0A1020';
    CX.strokeText(t.txt, sx, sy); CX.fillStyle = t.color; CX.fillText(t.txt, sx, sy);
    CX.restore();
  }
}
