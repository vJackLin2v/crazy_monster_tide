#!/usr/bin/env node
/**
 * 界面越界审计（UI overflow audit）
 *
 * 干什么：把每个界面里的**可见容器/按钮**矩形，和它所在的「面板 / 整屏」矩形比较，
 *        超出 1.5px 就报错 —— 专门抓"按钮压出边框、贴边、跑出屏幕"这类问题。
 *
 * 为什么需要：2026-10-29 用户发现安装屏的「卸下」按钮 x=132 + 宽 80 = 172，
 *        而面板半宽只有 170，**超出 2px** 压在边框上；同类问题靠肉眼看截图很容易漏。
 *
 * 规则：
 *   · 面板 = 名字为 'panel' 且宽 >= 280 的节点（UIKit.panel 产物）
 *   · 没有面板祖先时，退化为「必须落在整屏范围内」
 *   · 跳过 hit 热区（『xxxHit』故意比视觉大）、mask、纯文字 Label（Label 的宽是排版参数，
 *     不是视觉边界，它的 glyph 由 CLAMP 约束）
 *   · 含一个**负向对照**：把「卸下」按钮推到 x=200，审计必须报错，否则说明检测本身坏了
 *
 * 用法（先起静态服务：node .tmp/ui_task/serve.cjs，默认 8123）：
 *   NODE_PATH=<playwright 所在 node_modules> node tools/ui/audit_overflow.cjs [baseUrl]
 *
 * 退出码：0 = 全部通过；1 = 有越界 / 审计自身失效。
 */
const { chromium } = require('playwright');

const BASE = process.argv[2] || 'http://127.0.0.1:8123/';
// 视口：默认三档（规格要求 360×640 / 390×844 / 412×915 都过一遍）
const VIEWPORTS = (process.env.VIEWPORTS || '360x640,390x844,412x915')
  .split(',').map(s => s.trim()).filter(Boolean)
  .map(s => { const [w, h] = s.split('x').map(Number); return { w, h, tag: s }; });
const TOL = 1.5;

const AUDIT_SRC = function () {
  const cc = window.cc, sc = cc.director.getScene();
  const find = (n, p, d = 0) => { if (d > 18 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
  const rectOf = (n) => {
    const ut = n.getComponent('cc.UITransform'); if (!ut) return null;
    const wp = n.getWorldPosition();
    return {
      x0: wp.x - ut.width * n.anchorX, x1: wp.x + ut.width * (1 - n.anchorX),
      y0: wp.y - ut.height * n.anchorY, y1: wp.y + ut.height * (1 - n.anchorY),
    };
  };
  const scan = (root) => {
    const bad = [];
    let checked = 0;
    const walk = (n, pan, d) => {
      if (d > 14 || !n) return;
      let cur = pan;
      const ut = n.getComponent('cc.UITransform');
      // 跳过：热区（故意比视觉大）、mask、纯文字 Label（宽是排版参数）、
      //       以及**故意铺满/超出的背景图**（menu-bg 用 cover 缩放，本来就会溢出）
      const skip = /hit$/i.test(n.name) || n.name === 'mask' || /^text/i.test(n.name)
        || n.name === 'p' || n.name === 'icon' || /^menu-bg$/i.test(n.name) || /^bg/i.test(n.name);
      if (ut && n.name === 'panel' && ut.width >= 280) cur = n;
      const r = rectOf(n);
      if (r && cur && n !== cur && !skip) {
        const pr = rectOf(cur);
        if (pr) {
          checked++;
          const dx = Math.max(pr.x0 - r.x0, r.x1 - pr.x1);
          const dy = Math.max(pr.y0 - r.y0, r.y1 - pr.y1);
          if (dx > 1.5 || dy > 1.5) {
            const pu = cur.getComponent('cc.UITransform');
            bad.push({
              node: n.name, dx: +dx.toFixed(1), dy: +dy.toFixed(1),
              w: Math.round(ut.width), h: Math.round(ut.height),
              panel: Math.round(pu.width) + 'x' + Math.round(pu.height),
            });
          }
        }
      }
      for (const c of n.children) walk(c, cur, d + 1);
    };
    walk(root, root, 0);
    return { bad, checked };
  };
  const names = ['scr-menu', 'scr-charselect', 'scr-levelup', 'scr-shop', 'scr-build', 'scr-install',
    'scr-replace', 'scr-confirm', 'scr-result', 'scr-howto', 'scr-settings', 'scr-codex', 'scr-ach'];
  const report = {};
  for (const nm of names) {
    const n = find(sc, x => x.name === nm);
    if (n) report[nm] = scan(n);
  }
  return JSON.stringify(report);
}.toString();

async function runViewport(b, vp) {
  console.log('\n########## ' + vp.tag + ' ##########');
  const page = await (await b.newContext({ viewport: { width: vp.w, height: vp.h }, deviceScaleFactor: 2 })).newPage();
  await page.goto(BASE, { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await new Promise(r => setTimeout(r, 9500));
  const ev = (code) => page.evaluate((c) => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 18 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    try { return String(eval(c)); } catch (e) { return 'ERR ' + e.message; }
  }, code);
  await page.evaluate((src) => { window.__audit = eval('(' + src + ')'); }, AUDIT_SRC);
  const run = async (label) => {
    const rep = JSON.parse(await page.evaluate(() => window.__audit()));
    const fails = [];
    for (const k of Object.keys(rep)) {
      const { bad } = rep[k];
      if (bad.length) fails.push(k + ': ' + JSON.stringify(bad.slice(0, 5)));
      console.log((bad.length ? '  FAIL ' : '  PASS ') + k + '  (' + rep[k].checked + ' 个节点)');
    }
    return fails;
  };

  const all = [];
  for (const [nm, code] of [
    ['menu', "(G.showMenu(), 1)"],
    ['charselect', "(G.showCharSelect(), 1)"],
    ['levelup', "(G.showLevelUp([{kind:'skill',id:'holybolt'},{kind:'module',id:'multi'},{kind:'item',id:'armor_l'}]), 1)"],
    ['settings', "(G.closeModal(), G.showMenu(), G.showSettings(), 1)"],
    ['howto', "(G.closeModal(), G.showMenu(), G.showHowto(), 1)"],
    ['codex', "(G.closeModal(), G.showMenu(), G.showCodex(), 1)"],
    ['ach', "(G.closeModal(), G.showMenu(), G.showAchievements(), 1)"],
  ]) { await ev(code); await new Promise(r => setTimeout(r, 900)); console.log('— ' + nm); all.push(...await run(nm)); }

  await ev("(G.closeModal(), G.charId='knight', G.startBattle(), 1)");
  await new Promise(r => setTimeout(r, 4500));
  await ev("(() => { const rs = G.battle.rs; G.battle.hooks.onLevelUp = () => {}; rs.modsBag = ['multi','multi','multi','pierce','fan']; rs.skills[0].mods = ['multi','pierce']; G.showPause(); return 1; })()");
  await new Promise(r => setTimeout(r, 900)); console.log('— drawer'); all.push(...await run('drawer'));
  await ev("(G.closeModal(), G.showInstall('pause'), 1)");
  await new Promise(r => setTimeout(r, 900)); console.log('— install'); all.push(...await run('install'));
  await ev("(() => { G.installFromSlot = { si: 0, sl: 0 }; G.renderInstall(); return 1; })()");
  await new Promise(r => setTimeout(r, 600)); console.log('— install(选中槽，出现「卸下」)'); all.push(...await run('install-slot'));

  // 负向对照：把「卸下」推到 x=200，必须报错
  const moved = await page.evaluate(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 18 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const inst = find(sc, n => n.name === 'scr-install');
    const hit = find(inst, n => n.name === 'unequipHit');
    if (!hit) return false;
    const btn = hit.parent.children.find(c => c !== hit && c.getComponent('cc.UITransform')
      && Math.round(c.getComponent('cc.UITransform').width) === 80);
    if (!btn) return false;
    btn.setPosition(200, btn.position.y);
    return true;
  });
  await new Promise(r => setTimeout(r, 300));
  const ctl = await page.evaluate(() => window.__audit());
  const ctlBad = JSON.parse(ctl)['scr-install'];
  const controlOk = !!(ctlBad && ctlBad.bad.length);
  console.log('  对照（应报错）：' + (controlOk ? 'PASS 检测有效' : 'FAIL 检测失效！'));

  await ev("(() => { const rs = G.battle.rs; rs.skills.push({ id:'ice_spear', lvl:2, mods:[] }, { id:'chain', lvl:1, mods:['pierce'] }, { id:'shockwave', lvl:3, mods:['fan','bounce'] }); G.closeModal(); G.showReplace('holybolt'); return 1; })()");
  await new Promise(r => setTimeout(r, 900)); console.log('— replace'); all.push(...await run('replace'));
  await ev("(G.closeModal(), G.confirmQuit(), 1)");
  await new Promise(r => setTimeout(r, 700)); console.log('— confirm'); all.push(...await run('confirm'));
  await ev("(G.closeModal(), G.showShop(), 1)");
  await new Promise(r => setTimeout(r, 900)); console.log('— shop'); all.push(...await run('shop'));
  await ev("(G.closeModal(), G.showResult(false), 1)");
  await new Promise(r => setTimeout(r, 900)); console.log('— result'); all.push(...await run('result'));

  console.log('  => ' + (all.length ? 'FAIL ' + all.length + ' 处越界' : 'PASS 无越界')
    + ' / ' + (controlOk ? 'PASS 对照有效' : 'FAIL 对照失效'));
  return { fails: all, controlOk };
}

(async () => {
  const b = await chromium.launch();
  const summary = [];
  for (const vp of VIEWPORTS) {
    const r = await runViewport(b, vp);
    summary.push({ tag: vp.tag, ...r });
  }
  await b.close();
  console.log('\n================ 结果 ================');
  for (const s of summary) {
    console.log((s.fails.length === 0 && s.controlOk ? 'PASS ' : 'FAIL ') + s.tag
      + (s.fails.length ? '  越界 ' + s.fails.length + ' 处：' + s.fails[0].slice(0, 160) : '  无越界')
      + (s.controlOk ? '' : '  [对照失效]'));
  }
  const bad = summary.filter(s => s.fails.length || !s.controlOk);
  process.exit(bad.length ? 1 : 0);
})().catch(e => { console.log('FAIL ' + (e.stack || e.message)); process.exit(1); });