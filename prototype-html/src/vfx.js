/* ============================================================
   疯狂怪潮 · 技能特效（VFX）加载与播放
   素材：assets/approved/vfx/<组>/<子组>/<组件>/NN.png（85 组件 / 903 帧）
   许可：母本已逐包登记（IM/PF/XI/FZ/SV/SF）；用户 2026-10-12 决定直接使用
   ============================================================ */
'use strict';

const VIMG = {};
let V_LOADED = 0, V_TOTAL = 0, V_FAIL = 0;

function vfxURL(key, idx){
  // 注意：VFX 帧是 3 位编号（001.png），单位帧是 2 位（01.png）—— 别搞混
  return '../assets/approved/vfx/' + key + '/' + String(idx).padStart(3, '0') + '.png';
}
function preloadVFX(list){
  for (const key of list){
    const def = (typeof VFX !== 'undefined') && VFX[key];
    if (!def){ continue; }
    for (let i = 1; i <= def.n; i++){
      const k = key + '/' + i;
      if (VIMG[k]) continue;
      const im = new Image();
      im.onload = () => { V_LOADED++; };
      im.onerror = () => { V_FAIL++; };
      im.src = vfxURL(key, i);
      VIMG[k] = im; V_TOTAL++;
    }
  }
}
function vfxFrame(key, idx){
  const def = (typeof VFX !== 'undefined') && VFX[key];
  if (!def) return null;
  const i = ((Math.floor(idx) % def.n) + def.n) % def.n + 1;
  const im = VIMG[key + '/' + i];
  return (im && im.complete && im.naturalWidth) ? im : null;
}

/* 播放一段特效：
   key     组件名
   t       已播放秒数
   x,y     世界坐标
   scale   整数倍
   rotate  弧度（可选）
   loop    是否循环（投射物/地面持续效果用 true；爆炸用 false，播完即止）
   返回 false 表示已播完（调用方可据此清理） */
function drawVFX(key, t, x, y, scale, rotate, loop, opts){
  const def = (typeof VFX !== 'undefined') && VFX[key];
  if (!def) return true;
  const fps = (typeof VFX_FPS !== 'undefined' ? VFX_FPS : 18);
  const total = def.n / fps;
  if (!loop && t >= total) return false;
  const idx = loop ? Math.floor(t * fps) : Math.min(def.n - 1, Math.floor(t * fps));
  const im = vfxFrame(key, idx);
  if (!im) return true;
  const s = scale || 1;
  const w = im.naturalWidth * s, h = im.naturalHeight * s;
  CX.save();
  const al = (opts && opts.alpha != null) ? opts.alpha : 1;
  if (al !== 1) CX.globalAlpha = al;
  if (rotate){
    CX.translate(x, y); CX.rotate(rotate);
    if (opts && opts.flipX) CX.scale(-1, 1);
    CX.drawImage(im, -w/2, -h/2, w, h);
  } else {
    if (opts && opts.flipX){ CX.translate(x, y); CX.scale(-1, 1); CX.drawImage(im, -w/2, -h/2, w, h); }
    else CX.drawImage(im, Math.round(x - w/2), Math.round(y - h/2), w, h);
  }
  CX.restore();
  return true;
}

/* 静态一帧（地面区域用） */
function drawVFXStill(key, t, x, y, scale, opts){
  return drawVFX(key, t, x, y, scale, 0, true, opts);
}
