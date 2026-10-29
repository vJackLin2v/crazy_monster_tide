#!/usr/bin/env node
/**
 * 触控热区审计（hit area audit）
 *
 * 与 audit_overflow.cjs 互补：
 *   · 越界审计看"视觉框有没有跑出面板"；
 *   · 本工具看"**可点区域**够不够大、有没有互相抢"。
 *
 * 收集方式：UIKit.onTap() 会给节点打 `__hit = true`（手工注册的如 lockHit 也打了）。
 *
 * 判定：
 *   · 尺寸：宽/高都必须 ≥ 44 设计像素（微信硬指标）
 *   · 越界：热区不能超出屏幕
 *   · 重叠：两两比较，**只有祖孙关系允许重叠**（子热区负责吞掉事件，例如商店行的锁定钮）；
 *           兄弟/无关节点重叠 = FAIL（会互相抢点击，或点 A 触发 B）
 *
 * 退出码：0 = 全部通过。
 */
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://127.0.0.1:8123/';
const MIN = 44;

const HIT_SRC = function () {
  const cc = window.cc, sc = cc.director.getScene();
  const find = (n, p, d = 0) => { if (d > 18 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
  const rectOf = (n) => {
    const ut = n.getComponent('cc.UITransform'); if (!ut) return null;
    const wp = n.getWorldPosition();
    return {
      x0: wp.x - ut.width * n.anchorX, x1: wp.x + ut.width * (1 - n.anchorX),
      y0: wp.y - ut.height * n.anchorY, y1: wp.y + ut.height * (1 - n.anchorY),
      w: ut.width, h: ut.height,
    };
  };
  const isAncestor = (a, b) => { let p = b.parent; while (p) { if (p === a) return true; p = p.parent; } return false; };
  const scan = (root) => {
    const hits = [];
    const walk = (n, d) => { if (d > 16 || !n) return; if (n.__hit) hits.push(n); for (const c of n.children) walk(c, d + 1); };
    walk(root, 0);
    const bad = [];
    const info = [];
    for (const h of hits) {
      const r = rectOf(h); if (!r) continue;
      info.push({ name: h.name, w: Math.round(r.w), h: Math.round(r.h) });
      if (r.w < 44 || r.h < 44) bad.push({ kind: 'size', node: h.name, w: Math.round(r.w), h: Math.round(r.h) });
      const vs = cc.view.getVisibleSize();
      if (r.x0 < -1 || r.x1 > vs.width + 1 || r.y0 < -1 || r.y1 > vs.height + 1) {
        bad.push({ kind: 'offscreen', node: h.name });
      }
    }
    for (let i = 0; i < hits.length; i++) {
      for (let j = i + 1; j < hits.length; j++) {
        const a = hits[i], b = hits[j];
        if (isAncestor(a, b) || isAncestor(b, a)) continue;
        const ra = rectOf(a), rb = rectOf(b);
        if (!ra || !rb) continue;
        const ox = Math.min(ra.x1, rb.x1) - Math.max(ra.x0, rb.x0);
        const oy = Math.min(ra.y1, rb.y1) - Math.max(ra.y0, rb.y0);
        if (ox > 1 && oy > 1) bad.push({ kind: 'overlap', a: a.name, b: b.name, ox: Math.round(ox), oy: Math.round(oy) });
      }
    }
    return { count: hits.length, bad, info };
  };
  const names = ['scr-menu', 'scr-charselect', 'scr-levelup', 'scr-shop', 'scr-build', 'scr-install',
    'scr-replace', 'scr-confirm', 'scr-result', 'scr-howto', 'scr-settings', 'scr-codex', 'scr-ach', 'Hud'];
  const report = {};
  for (const nm of names) {
    const n = find(sc, x => x.name === nm);
    if (n) report[nm] = scan(n);
  }
  return JSON.stringify(report);
}.toString();

(async () => {
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await new Promise(r => setTimeout(r, 9500));
  const ev = (code) => page.evaluate((c) => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 18 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    try { return String(eval(c)); } catch (e) { return 'ERR ' + e.message; }
  }, code);
  await page.evaluate((src) => { window.__hits = eval('(' + src + ')'); }, HIT_SRC);
  const run = async (label) => {
    const raw = await page.evaluate(() => window.__hits());
    const rep = JSON.parse(raw);
    let fails = 0;
    for (const k of Object.keys(rep)) {
      const { count, bad } = rep[k];
      if (!count) continue;
      fails += bad.length;
      console.log((bad.length ? '  FAIL ' : '  PASS ') + k + '  (' + count + ' 个热区)'
        + (bad.length ? '  ' + JSON.stringify(bad.slice(0, 6)) : ''));
    }
    return fails;
  };

  let total = 0;
  for (const [nm, code] of [
    ['menu', "(G.showMenu(), 1)"],
    ['charselect', "(G.showCharSelect(), 1)"],
    ['levelup', "(G.showLevelUp([{kind:'skill',id:'holybolt'},{kind:'module',id:'multi'},{kind:'item',id:'armor_l'}]), 1)"],
    ['settings', "(G.closeModal(), G.showMenu(), G.showSettings(), 1)"],
    ['howto', "(G.closeModal(), G.showMenu(), G.showHowto(), 1)"],
    ['codex', "(G.closeModal(), G.showMenu(), G.showCodex(), 1)"],
    ['ach', "(G.closeModal(), G.showMenu(), G.showAchievements(), 1)"],
  ]) { await ev(code); await new Promise(r => setTimeout(r, 800)); console.log('— ' + nm); total += await run(nm); }

  await ev("(G.closeModal(), G.charId='knight', G.startBattle(), 1)");
  await new Promise(r => setTimeout(r, 4200));
  console.log('— hud'); total += await run('hud');
  await ev("(() => { const rs = G.battle.rs; G.battle.hooks.onLevelUp = () => {}; rs.modsBag = ['multi','multi','multi','pierce','fan']; rs.skills[0].mods = ['multi','pierce']; G.showPause(); return 1; })()");
  await new Promise(r => setTimeout(r, 800)); console.log('— drawer'); total += await run('drawer');
  await ev("(G.closeModal(), G.showInstall('pause'), 1)"); await new Promise(r => setTimeout(r, 800));
  console.log('— install'); total += await run('install');
  await ev("(G.installFromSlot = { si: 0, sl: 0 }, G.renderInstall(), 1)"); await new Promise(r => setTimeout(r, 600));
  console.log('— install(选中槽/卸下)'); total += await run('install-slot');
  await ev("(G.closeModal(), G.showShop(), 1)"); await new Promise(r => setTimeout(r, 800)); console.log('— shop'); total += await run('shop');
  await ev("(() => { const rs = G.battle.rs; rs.skills.push({ id:'ice_spear', lvl:2, mods:[] }, { id:'chain', lvl:1, mods:['pierce'] }, { id:'shockwave', lvl:3, mods:['fan','bounce'] }); G.closeModal(); G.showReplace('holybolt'); return 1; })()");
  await new Promise(r => setTimeout(r, 800)); console.log('— replace'); total += await run('replace');
  await ev("(G.closeModal(), G.confirmQuit(), 1)"); await new Promise(r => setTimeout(r, 700)); console.log('— confirm'); total += await run('confirm');
  await ev("(G.closeModal(), G.showResult(false), 1)"); await new Promise(r => setTimeout(r, 800)); console.log('— result'); total += await run('result');

  console.log('\n================ 结果 ================');
  console.log(total ? 'FAIL ' + total + ' 处' : 'PASS 所有可点热区 ≥44×44、无越界、无意外重叠');
  await b.close();
  process.exit(total ? 1 : 0);
})().catch(e => { console.log('FAIL ' + (e.stack || e.message)); process.exit(1); });
