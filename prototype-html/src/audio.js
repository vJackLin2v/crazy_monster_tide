/* ============================================================
   疯狂怪潮 · 音频（BGM + 音效）
   素材：assets/approved/audio/（35 个文件）
   注意：浏览器禁止无用户手势自动播放 → 首次点击后才启动
   ============================================================ */
'use strict';

const SFX_FILE = {
  click:      'buttonclick1.wav',
  hover:      'paperhover.wav',
  waveStart:  'battlestart.ogg',
  hitLight:   'Slash_Attack_Sword_1.wav',
  hitMid:     'Slash_Attack_Sword_2.wav',
  hitHeavy:   'Slash_Attack_Heavy_1.wav',
  hitRanged:  'Slash_Attack_Archer_1.wav',
  hitMetal:   'Hit_Metal_on_leather.wav',
  crit:       'risingheavyhit.wav',
  levelUp:    'stateup.wav',
  cardPick:   'unitclassup.wav',
  pickup:     'unitabsorbption.wav',
  drop:       'drop.ogg',
  enemyIn:    'unitentering.wav',
  bossIn:     'stage6crack.wav',
  special:    'rainbow.wav',
  holy:       'holy.wav',
  victory:    'victory.wav',
  defeat:     'defeat.wav'
};
const BGM_FILE = { menu: 'mainmenu.ogg', battle: 'battle.ogg', boss: 'boss.ogg' };

const SND = {};          // key -> Audio（音效，可重叠）
const AUD = { bgm: null, bgmKey: null, ready: false, muted: false, vol: 0.55, bgmVol: 0.34 };

function preloadAudio(){
  for (const k in SFX_FILE){
    const a = new Audio('../assets/approved/audio/' + SFX_FILE[k]);
    a.preload = 'auto';
    a.volume = AUD.vol;
    SND[k] = a;
  }
  for (const k in BGM_FILE){
    const a = new Audio('../assets/approved/audio/' + BGM_FILE[k]);
    a.preload = 'auto'; a.loop = true; a.volume = AUD.bgmVol;
    SND['bgm_' + k] = a;
  }
  AUD.ready = true;
}

/* 音效：同一音效并发过多会刺耳 → 限流 */
const _last = {};
function sfx(key, opts){
  if (!AUD.ready || AUD.muted) return;
  const a = SND[key];
  if (!a) return;
  const now = performance.now();
  const gap = (opts && opts.gap) || 55;
  if (_last[key] && now - _last[key] < gap) return;
  _last[key] = now;
  try {
    const n = a.cloneNode();
    n.volume = Math.min(1, (opts && opts.vol != null ? opts.vol : AUD.vol));
    n.play().catch(() => {});
  } catch (e) { /* 忽略播放失败（自动播放策略） */ }
}

/* BGM：切换时若已是同一首则不打断 */
function bgm(key){
  if (!AUD.ready) return;
  if (AUD.bgmKey === key) return;
  if (AUD.bgm){ try { AUD.bgm.pause(); } catch (e) {} }
  const a = SND['bgm_' + key];
  AUD.bgmKey = key; AUD.bgm = a || null;
  if (!a || AUD.muted) return;
  try { a.currentTime = 0; a.play().catch(() => {}); } catch (e) {}
}
function toggleMute(){
  AUD.muted = !AUD.muted;
  if (AUD.bgm){
    if (AUD.muted) { try { AUD.bgm.pause(); } catch (e) {} }
    else { try { AUD.bgm.play().catch(() => {}); } catch (e) {} }
  }
  return AUD.muted;
}
/* 首次用户手势后启动音频（浏览器策略） */
function unlockAudio(){
  if (AUD.unlocked) return;
  AUD.unlocked = true;
  if (!AUD.ready) preloadAudio();
  bgm(G.screen === 'battle' ? (G.isBossWave ? 'boss' : 'battle') : 'menu');
}
