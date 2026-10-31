const { chromium } = require('playwright');
const fs = require('fs');
const OUT = 'H:/AI-game/crazy_monster_tide/screenshots/delivery';
const sleep = ms => new Promise(r => setTimeout(r, ms));
(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const b = await chromium.launch();
  const page = await (await b.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 })).newPage();
  const errs = [];
  page.on('pageerror', e => errs.push(e.message.slice(0, 150)));
  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await sleep(9000);
  const ev = (code) => page.evaluate((c) => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => { if (d > 25 || !n) return null; if (p(n)) return n; for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; } return null; };
    const G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
    try { return String(eval(c)); } catch (e) { return 'ERR ' + e.message; }
  }, code);
  const shot = async (n) => { await page.locator('canvas').screenshot({ path: OUT + '/' + n + '.png' }); };
  const tab = async (idx) => {
    const p = await page.evaluate((i) => {
      const cc = window.cc, sc = cc.director.getScene();
      const find = (n, p2, d = 0) => { if (d > 25 || !n) return null; if (p2(n)) return n; for (const ch of n.children) { const t = find(ch, p2, d + 1); if (t) return t; } return null; };
      const roots = ['scr-codex', 'scr-build'];
      for (const rn of roots) {
        const root = find(sc, n => n.name === rn); if (!root) continue;
        const arr = []; const walk = (n, d) => { if (d > 6 || !n) return; if (n.name === 'tabHit') arr.push(n); for (const c of n.children) walk(c, d + 1); }; walk(root, 0);
        if (!arr[i]) continue;
        let x = 0, y = 0, cur = arr[i]; while (cur && cur.name !== 'Canvas') { x += cur.position.x; y += cur.position.y; cur = cur.parent; }
        const vs = cc.view.getVisibleSize(); const cv = document.querySelector('canvas');
        return { x: (vs.width/2 + x) * (cv.clientWidth/vs.width), y: (vs.height/2 - y) * (cv.clientHeight/vs.height) };
      }
      return null;
    }, idx);
    if (p) { await page.mouse.click(p.x, p.y); await sleep(600); }
  };

  await sleep(500); await shot('01-menu');
  await ev("(G.showCharSelect(), 1)"); await sleep(900); await shot('02-charselect');
  await ev("(G.closeModal(), G.showHowTo(), 1)"); await sleep(700); await shot('03-howto');
  await ev("(G.closeModal(), G.showSettings(), 1)"); await sleep(600); await shot('04-settings');
  await ev("(G.closeModal(), G.save.seen=['enemy:goblin','enemy:wolf','enemy:boss','skill:blade','item:power_l'], G.showCodex(), 1)"); await sleep(800);
  await shot('05-codex-char'); await tab(1); await shot('06-codex-skill'); await tab(2); await shot('07-codex-item'); await tab(3); await shot('08-codex-enemy');
  await ev("(G.closeModal(), G.showAchievements(), 1)"); await sleep(700); await shot('09-achievements');
  await ev("(G.closeModal(), G.showMenu(), 1)"); await sleep(300);
  await ev("(G.charId='knight', G.startBattle(), 1)"); await sleep(4500); await shot('10-hud');
  await ev("(G.battle.paused=true, G.showLevelUp([{kind:'item',id:'count_l'},{kind:'module',id:'fan'},{kind:'skill',id:'blade_storm'}]), 1)"); await sleep(800); await shot('11-levelup');
  await ev("(() => { const rs=G.battle.rs; rs.modsBag=['multi','pierce','fan','burn','split','orbit','giant']; rs.skills[0].mods=['multi','pierce']; G.closeModal(); G.pauseTab=0; G.showPause(); return 1; })()"); await sleep(700); await shot('12-drawer-skill');
  await ev("(G.closeModal(), G.pauseTab=1, G.showPause(), 1)"); await sleep(700); await shot('13-drawer-mod');
  await ev("(G.closeModal(), G.pauseTab=2, G.showPause(), 1)"); await sleep(700); await shot('14-drawer-item');
  await ev("(G.closeModal(), G.pauseTab=3, G.showPause(), 1)"); await sleep(700); await shot('15-drawer-attr');
  await ev("(G.closeModal(), G.battle.rs.gold=999, G.showShop(), 1)"); await sleep(800); await shot('16-shop');
  await ev("(G.closeModal(), G.battle.rs.wave=20, G.showResult({wave:20,level:12,kills:640,gold:320,time:512,dmg:18200,items:['power_l','haste_s','count_l'],skills:['blade','ice_spear','meteor','holybolt']}), 1)"); await sleep(900); await shot('17-result');
  console.log('shots done, errors=' + (errs.slice(0, 3).join(' | ') || 'none'));
  await b.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
