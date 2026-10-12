/* ============================================================
   疯狂怪潮 · 单位精灵加载与动画
   素材：assets/approved/units/<单位>/<动画>/NN.png（32x32 网格，源自母本主池）
   动画：idle / walk / attack / death
   ============================================================ */
'use strict';

const UIMG = {};                      // 'archer/idle/01' -> Image
let U_LOADED = 0, U_TOTAL = 0, U_FAIL = 0;

function unitURL(u, a, idx){
  return '../assets/approved/units/' + u + '/' + a + '/' + String(idx).padStart(2, '0') + '.png';
}
function preloadUnits(list){
  for (const u of list){
    const def = (typeof UNITS !== 'undefined') && UNITS[u];
    if (!def){ continue; }
    for (const a in def.anims){
      for (let i = 1; i <= def.anims[a]; i++){
        const key = u + '/' + a + '/' + i;
        if (UIMG[key]) continue;
        const im = new Image();
        im.onload = () => { U_LOADED++; };
        im.onerror = () => { U_FAIL++; };
        im.src = unitURL(u, a, i);
        UIMG[key] = im; U_TOTAL++;
      }
    }
  }
}
function unitReady(u){ return !!(typeof UNITS !== 'undefined' && UNITS[u]); }

/* 取某一帧（自动循环） */
function unitFrame(u, a, idx){
  const def = (typeof UNITS !== 'undefined') && UNITS[u];
  if (!def) return null;
  let anim = a;
  if (!def.anims[anim]) anim = def.anims.walk ? 'walk' : (def.anims.idle ? 'idle' : Object.keys(def.anims)[0]);
  const n = def.anims[anim] || 1;
  const i = ((Math.floor(idx) % n) + n) % n + 1;
  const im = UIMG[u + '/' + anim + '/' + i];
  return (im && im.complete && im.naturalWidth) ? im : null;
}
function animIndex(anim, t){
  const fps = (typeof UNIT_ANIM_FPS !== 'undefined' && UNIT_ANIM_FPS[anim]) || 12;
  return Math.floor(t * fps);
}

/* ---------- 画一个单位 ----------
   scale: 整数倍；flip: 是否水平翻转；flash: 受击白闪强度 0~1 */
function drawUnit(u, anim, t, x, y, scale, flip, flash, tint){
  const im = unitFrame(u, anim, animIndex(anim, t));
  if (!im){
    // 素材没加载出来时的兜底：画个方块，绝不静默变透明
    CX.fillStyle = tint || '#8FA3C8';
    const s = 20 * scale;
    CX.fillRect(Math.round(x - s/2), Math.round(y - s/2), s, s);
    CX.fillStyle = '#0A1020';
    CX.fillRect(Math.round(x - s/2), Math.round(y - s/2), s, 3 * scale);
    return;
  }
  const w = im.naturalWidth * scale, h = im.naturalHeight * scale;
  const dx = Math.round(x - w/2), dy = Math.round(y - h + 8 * scale);   // 以脚底为锚点
  CX.save();
  if (flip){ CX.translate(dx + w, dy); CX.scale(-1, 1); CX.drawImage(im, 0, 0, w, h); }
  else CX.drawImage(im, dx, dy, w, h);
  CX.restore();
  if (flash && flash > 0.001){
    CX.save();
    CX.globalAlpha = Math.min(0.8, flash * 6);
    CX.globalCompositeOperation = 'source-atop';
    CX.fillStyle = '#fff';
    if (flip){ CX.translate(dx + w, dy); CX.scale(-1, 1); CX.fillRect(0, 0, w, h); }
    else CX.fillRect(dx, dy, w, h);
    CX.restore();
  }
}

/* ---------- 通用小图标（技能/属性/关卡节点）---------- */
const IICON = {};
function preloadIcons(list){
  for (const rel of list){
    if (IICON[rel] !== undefined) continue;
    const im = new Image();
    im.src = '../assets/approved/icons/' + rel;
    IICON[rel] = im;
  }
}
function iconEl(rel, size, cls){
  const s = size || 20;
  return '<img src="../assets/approved/icons/' + rel + '" width="' + s + '" height="' + s +
         '" style="image-rendering:pixelated;vertical-align:middle' + (cls ? ';' + cls : '') + '">';
}
function iconHTML(rel, size){ return iconEl(rel, size); }
