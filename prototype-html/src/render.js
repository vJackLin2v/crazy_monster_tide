/* ============================================================
   疯狂怪潮 · 渲染层（像素风，Nearest，整数倍缩放）
   ============================================================ */
'use strict';

const CV = document.getElementById('cv');
const CX = CV.getContext('2d');
CX.imageSmoothingEnabled = false;

/* ---------- 精灵缓存（字符画 → 离屏 canvas） ---------- */
const _sprCache = {};
function spriteCanvas(name, scale, override){
  const key = name+'|'+scale+'|'+(override?JSON.stringify(override):'');
  if (_sprCache[key]) return _sprCache[key];
  const rows = SPR[name];
  const h = rows.length, w = Math.max(...rows.map(r=>r.length));
  const c = document.createElement('canvas');
  c.width = w*scale; c.height = h*scale;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  for (let y=0;y<h;y++){
    const row = rows[y];
    for (let x=0;x<row.length;x++){
      const ch = row[x];
      if (ch === '.') continue;
      const col = (override && override[ch]) || PAL[ch];
      if (!col) continue;
      g.fillStyle = col; g.fillRect(x*scale, y*scale, scale, scale);
    }
  }
  _sprCache[key] = c; return c;
}

/* ---------- 摄像机 ---------- */
function camera(){
  const p = G.player || {x:ARENA.W/2, y:ARENA.H/2};
  let cx = p.x - 180, cy = p.y - 320;
  cx = Math.max(0, Math.min(ARENA.W-360, cx));
  cy = Math.max(0, Math.min(ARENA.H-640, cy));
  return {cx, cy};
}

/* ---------- 背景 ---------- */
function drawBg(cam){
  CX.fillStyle = '#131C36'; CX.fillRect(0,0,360,640);
  const T = 24;
  const x0 = Math.floor(cam.cx/T)*T, y0 = Math.floor(cam.cy/T)*T;
  for (let y=y0; y<cam.cy+640+T; y+=T){
    for (let x=x0; x<cam.cx+360+T; x+=T){
      const odd = ((x/T + y/T) % 2) === 0;
      CX.fillStyle = odd ? '#17233D' : '#1A2846';
      CX.fillRect(Math.round(x-cam.cx), Math.round(y-cam.cy), T, T);
      if (odd){
        CX.fillStyle = 'rgba(255,255,255,.022)';
        CX.fillRect(Math.round(x-cam.cx)+3, Math.round(y-cam.cy)+3, 3, 3);
      }
    }
  }
  // 竞技场边界
  CX.strokeStyle = 'rgba(255,168,75,.35)'; CX.lineWidth = 3;
  CX.strokeRect(Math.round(-cam.cx), Math.round(-cam.cy), ARENA.W, ARENA.H);
}

/* ---------- 实体 ---------- */
function drawSprite(spr, x, y, scale, override, flip, flash){
  const c = spriteCanvas(spr, scale, override);
  const dx = Math.round(x - c.width/2), dy = Math.round(y - c.height/2);
  CX.save();
  if (flip){ CX.translate(dx + c.width, dy); CX.scale(-1,1); CX.drawImage(c,0,0); }
  else CX.drawImage(c, dx, dy);
  CX.restore();
  if (flash && flash > 0){                       // 受击白闪（需求 §7）
    CX.save(); CX.globalAlpha = Math.min(0.85, flash*6);
    CX.fillStyle = '#fff';
    CX.globalCompositeOperation = 'source-atop';
    CX.fillRect(dx, dy, c.width, c.height);
    CX.restore();
  }
}

function render(){
  const cam = camera();
  CX.setTransform(1,0,0,1,0,0);
  drawBg(cam);
  CX.save();
  CX.translate(-Math.round(cam.cx), -Math.round(cam.cy));

  // 区域效果（画在最底层）
  for (const a of ents.areas){
    const al = a.kind === 'pulse' ? (1 - a.t/a.life)*0.5 : 0.22;
    CX.save(); CX.globalAlpha = Math.max(0, al);
    CX.fillStyle = a.color;
    CX.beginPath(); CX.arc(a.x, a.y, a.r, 0, Math.PI*2); CX.fill();
    CX.restore();
  }
  // 经验宝石
  for (const g of ents.gems) drawSprite('gem', g.x, g.y, 2);
  // 召唤物
  for (const s of ents.summons){
    CX.save(); CX.globalAlpha = 0.9;
    CX.fillStyle = s.color; CX.fillRect(s.x-7, s.y-14, 14, 14);
    CX.fillStyle = '#12101C'; CX.fillRect(s.x-7, s.y-14, 14, 3);
    CX.restore();
  }
  // 敌人
  for (const e of ents.enemies){
    const sc = e.boss ? 3 : (e.kind==='elite' ? 2 : 2);
    drawSprite(e.spr, e.x, e.y, sc, null, e.x > G.player.x, e.flash);
    if (e.hp < e.maxhp){
      const w = e.boss ? 44 : 20, hy = e.y - e.r - (e.boss?16:10);
      CX.fillStyle = '#0B1224'; CX.fillRect(e.x-w/2-1, hy-1, w+2, 5);
      CX.fillStyle = e.boss ? '#FFA84B' : '#E04060';
      CX.fillRect(e.x-w/2, hy, w*(e.hp/e.maxhp), 3);
    }
  }
  // 玩家
  if (G.player){
    const ch = G.char;
    const ov = {}; ov[ch.col] = ch.colColor || PAL[ch.col];
    if (G.player.dmgFlash > 0.02) { /* 受击闪红 */ }
    // 脚下定位环：怪潮最密时也能一眼找到自己（可读性硬要求）
    const pulse = 0.5 + 0.5*Math.sin(performance.now()/260);
    CX.save();
    // 深色底环：保证在任何背景色上都读得出（对比度兜底）
    CX.globalAlpha = 0.85; CX.strokeStyle = '#0A1020'; CX.lineWidth = 4;
    CX.beginPath(); CX.ellipse(G.player.x, G.player.y+12, 13, 5.5, 0, 0, Math.PI*2); CX.stroke();
    // 橙色主环：高不透明度，怪潮最密时也能定位自己
    CX.globalAlpha = 0.75 + 0.25*pulse; CX.strokeStyle = '#FFA84B'; CX.lineWidth = 2.5;
    CX.beginPath(); CX.ellipse(G.player.x, G.player.y+12, 13, 5.5, 0, 0, Math.PI*2); CX.stroke();
    CX.globalAlpha = 0.18 + 0.10*pulse; CX.fillStyle = '#FFA84B';
    CX.beginPath(); CX.ellipse(G.player.x, G.player.y+12, 13, 5.5, 0, 0, Math.PI*2); CX.fill();
    CX.restore();
    drawSprite(ch.spr, G.player.x, G.player.y, 2, ov, G.player.face < 0, 0);
    // 影子
    CX.save(); CX.globalAlpha = 0.28; CX.fillStyle = '#000';
    CX.beginPath(); CX.ellipse(G.player.x, G.player.y+13, 11, 4, 0, 0, Math.PI*2); CX.fill(); CX.restore();
  }
  // 子弹
  for (const b of ents.bullets){
    CX.fillStyle = b.color;
    const s = Math.max(3, Math.round(b.r*2));
    CX.fillRect(Math.round(b.x-s/2), Math.round(b.y-s/2), s, s);
    CX.save(); CX.globalAlpha = 0.28; CX.fillStyle = b.color;
    CX.fillRect(Math.round(b.x-s/2)-2, Math.round(b.y-s/2)-2, s+4, s+4); CX.restore();
  }
  // 特效
  for (const f of ents.fx){
    const k = 1 - f.t/f.life;
    if (f.type === 'hit' || f.type === 'boom'){
      CX.save(); CX.globalAlpha = Math.max(0,k);
      CX.fillStyle = f.color;
      const r = f.r * (1 + (1-k)*1.6);
      CX.beginPath(); CX.arc(f.x, f.y, r, 0, Math.PI*2); CX.fill(); CX.restore();
    } else if (f.type === 'ring'){
      CX.save(); CX.globalAlpha = Math.max(0,k)*0.8; CX.strokeStyle = f.color; CX.lineWidth = 3;
      CX.beginPath(); CX.arc(f.x, f.y, f.max*(1-k)+4, 0, Math.PI*2); CX.stroke(); CX.restore();
    } else if (f.type === 'chain'){
      CX.save(); CX.globalAlpha = Math.max(0,k); CX.strokeStyle = f.color; CX.lineWidth = 3;
      CX.beginPath();
      f.pts.forEach((p,i)=> i? CX.lineTo(p.x,p.y) : CX.moveTo(p.x,p.y));
      CX.stroke(); CX.restore();
    }
  }
  // 伤害数字（需求 §7）
  for (const t of ents.texts){
    const k = 1 - t.t/t.life;
    CX.save(); CX.globalAlpha = Math.max(0, Math.min(1, k*1.8));
    CX.font = (t.big ? 'bold 15px' : 'bold 11px') + ' system-ui, sans-serif';
    CX.textAlign = 'center';
    CX.lineWidth = 3; CX.strokeStyle = '#0A1020';
    CX.strokeText(t.txt, t.x, t.y); CX.fillStyle = t.color; CX.fillText(t.txt, t.x, t.y);
    CX.restore();
  }
  CX.restore();
}
