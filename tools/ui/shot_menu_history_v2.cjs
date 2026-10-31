/**
 * 主菜单/战绩 V2 真实运行截图 + 断言
 * 前提：web-mobile 已构建；tools/ui/serve.cjs 在 8123。
 *
 * 覆盖：无存档菜单 / 有存档菜单 / 开新冒险确认 / 续玩恢复(HP) / 商店恢复 / 升级恢复 /
 *      战斗HUD / 历史多条 / 历史空态 / 详情(胜利/失败/放弃) / 无尽进行中
 */
const path = require('path');
const { chromium } = require('H:/AI-game/xingnang/cocos_port/node_modules/playwright-core');
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const OUT = 'H:/AI-game/crazy_monster_tide/deliverables/menu_history_v2_2026-10-31/screenshots';

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
  });
  const ctx = await browser.newContext({ viewport: { width: 360, height: 640 }, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errs = [];
  page.on('pageerror', e => errs.push('ERR ' + e.message.slice(0, 160)));
  page.on('console', m => { if (m.type() === 'error') errs.push('CONSOLE ' + m.text().slice(0, 160)); });

  const shot = async (name) => { await page.locator('canvas').screenshot({ path: path.join(OUT, name) }); };
  const G = async (fn, arg) => page.evaluate(fn, arg);

  await page.goto('http://127.0.0.1:8123/', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await sleep(10000);
  await G(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await sleep(10000);

  await G(() => {
    const cc = window.cc, sc = cc.director.getScene();
    const find = (n, p, d = 0) => {
      if (d > 30 || !n) return null;
      if (p(n)) return n;
      for (const ch of n.children) { const t = find(ch, p, d + 1); if (t) return t; }
      return null;
    };
    window.__G = find(sc, x => x.getComponent && x.getComponent('GameRoot')).getComponent('GameRoot');
  });

  // 1. 无存档菜单
  await shot('menu_no_save.png');

  // 2. 造中局存档（HP 45/72）→ 有存档菜单
  const before = await G(() => {
    const g = window.__G;
    g.charId = 'knight';
    g.startBattle();
    return true;
  });
  await sleep(7000);
  const savedHp = await G(() => {
    const g = window.__G, rs = g.battle.rs;
    rs.wave = 12; rs.gold = 140;
    rs.stats.maxhp = 72; rs.stats.hp = 45;      // 固定测试数据
    if (!rs.skills.some(s => s.id === 'sentry')) rs.skills.push({ id: 'sentry', lvl: 2, mods: ['multi'] });
    g.battle.paused = true;
    g.saveActiveRunNow();
    window.__saved = JSON.stringify({
      hp: rs.stats.hp, maxhp: rs.stats.maxhp, gold: rs.gold, wave: rs.wave,
      skills: rs.skills.map(s => s.id + ':' + s.lvl + ':' + s.mods.join(',')),
    });
    g.showMenu();
    return window.__saved;
  });
  await sleep(1200);
  await shot('menu_has_save.png');
  console.log('saved=' + savedHp);

  // 3. 开始新冒险确认弹窗
  await G(() => { window.__G.requestStart(); });
  await sleep(1000);
  await shot('start_confirm.png');
  await G(() => { window.__G.closeModal(); });
  await sleep(500);

  // 4. 续玩恢复：HP 必须还是 45/72（await 结束立刻冻结，避免被怪打掉血）
  await G(async () => { await window.__G.continueGame(); window.__G.battle.paused = true; });
  await sleep(600);
  const resume = await G(() => {
    const g = window.__G, rs = g.battle.rs;
    g.battle.paused = true;                    // 冻结战斗，保证截图与断言稳定
    const before = JSON.parse(window.__saved);
    const now = {
      hp: rs.stats.hp, maxhp: rs.stats.maxhp, gold: rs.gold, wave: rs.wave,
      skills: rs.skills.map(s => s.id + ':' + s.lvl + ':' + s.mods.join(',')),
    };
    return { matchHp: now.hp === before.hp && now.maxhp === before.maxhp,
      hpText: now.hp + '/' + now.maxhp, gold: now.gold, wave: now.wave,
      skillsMatch: JSON.stringify(now.skills) === JSON.stringify(before.skills) };
  });
  await sleep(600);
  await shot('resume_battle.png');
  console.log('resume=' + JSON.stringify(resume));

  // 5. 商店恢复（固定 4 货位 + 锁定 + 已购 + 刷新次数）
  const shopCheck = await G(() => {
    const g = window.__G, rs = g.battle.rs;
    rs.wave = 6; rs.gold = 120; rs.shopReroll = 2;
    rs.stats.hp = 60; rs.stats.maxhp = 72;    // 恢复合法生命，避免续玩校验拒绝
    rs.shopStock = [
      { kind: 'item', id: 'power_s', price: 35, basePrice: 30, sold: false, locked: true },
      { kind: 'module', id: 'multi', price: 48, basePrice: 40, sold: true, locked: false },
      { kind: 'item', id: 'haste_s', price: 42, basePrice: 36, sold: false, locked: false },
      { kind: 'heal', id: 'heal', price: 30, sold: false, locked: true },
    ];
    g.phase = 'shop';
    g.saveActiveRunNow();
    g.showMenu();
    return JSON.stringify(rs.shopStock.map(s => [s.id, s.price, s.locked, s.sold]));
  });
  await sleep(1000);
  await G(async () => { await window.__G.continueGame(); window.__G.battle.paused = true; });
  await sleep(1200);
  const shopAfter = await G(() => {
    const rs = window.__G.battle.rs;
    return JSON.stringify({
      phase: window.__G.phase, reroll: rs.shopReroll,
      slots: rs.shopStock.map(s => [s.id, s.price, s.locked, s.sold]),
    });
  });
  await shot('shop_resume.png');
  console.log('shop-before=' + shopCheck);
  console.log('shop-after=' + shopAfter);

  // 6. 升级三选一恢复（固定三张卡）
  const lvCheck = await G(() => {
    const g = window.__G, rs = g.battle.rs;
    rs.wave = 7;
    const rewards = [
      { kind: 'skill', id: 'sentry', needReplace: false },
      { kind: 'module', id: 'giant', needReplace: false },
      { kind: 'item', id: 'crit_s', needReplace: false },
    ];
    g.showLevelUp(rewards);
    g.saveActiveRunNow();
    window.__lv = JSON.stringify(rewards.map(r => r.kind + ':' + r.id));
    g.showMenu();
    return window.__lv;
  });
  await sleep(1000);
  await G(async () => { await window.__G.continueGame(); window.__G.battle.paused = true; });
  await sleep(1200);
  const lvAfter = await G(() => {
    const g = window.__G;
    return JSON.stringify({ phase: g.phase, cards: (g.pendingRewards || []).map(r => r.kind + ':' + r.id) });
  });
  await shot('levelup_resume.png');
  console.log('lv-before=' + lvCheck);
  console.log('lv-after=' + lvAfter);
  await G(() => { window.__G.pickReward(-1); });
  await sleep(800);

  // 7. 造三条历史：失败 / 放弃 / 胜利
  await G(() => {
    const g = window.__G, rs = g.battle.rs;
    rs.wave = 14; rs.kills = 180; rs.runTime = 540; rs.eliteKills = 3; rs.bossKills = 1;
    g.battle.totalDmgDealt = 9800; g.battle.totalDmg = 450;   // 固定测试数据
    g.finishRun('defeat');
    g.showMenu();
  });
  await sleep(900);
  await G(() => {
    const g = window.__G;
    g.startBattle().then(() => {
      const rs = g.battle.rs;
      rs.wave = 9; rs.kills = 60; rs.runTime = 240;
      g.saveActiveRunNow();
      g.showMenu();
      g.abandonActiveRun();
    });
  });
  await sleep(7000);
  await G(() => {
    const g = window.__G;
    g.startBattle().then(() => {
      const rs = g.battle.rs;
      rs.wave = 20; rs.kills = 386; rs.runTime = 1122;
      rs.goldEarned = 1240; rs.eliteKills = 8; rs.bossKills = 2;
      rs.skills = [
        { id: 'ring_blade', lvl: 3, mods: ['orbit', 'giant'] },
        { id: 'sentry', lvl: 2, mods: ['multi'] },
        { id: 'mine_field', lvl: 2, mods: ['split'] },
      ];
      rs.items = [{ id: 'power_s' }, { id: 'power_s' }, { id: 'crit_s' }, { id: 'bloodpact' }];
      g.battle.totalDmgDealt = 45600; g.battle.totalDmg = 690;
      g.finishRun('victory');
      g.showMenu();
    });
  });
  await sleep(7000);
  await G(() => { window.__G.showHistory(); });
  await sleep(1500);
  await shot('history_list.png');

  // 8. 三种结果详情
  for (const [result, file] of [['victory', 'detail_victory.png'], ['defeat', 'detail_defeat.png'], ['abandoned', 'detail_abandon.png']]) {
    await G((r) => {
      const g = window.__G;
      const s = g.history.summaries.find(x => x.result === r);
      if (s) g.showHistoryDetail(s.runId);
    }, result);
    await sleep(1200);
    await shot(file);
  }

  // 9. 历史空态
  await G(() => {
    const g = window.__G;
    g.history = { v: 1, summaries: [], details: {} };
    g.showHistory();
  });
  await sleep(1000);
  await shot('history_empty.png');

  // 10. 战斗 HUD（新开一局，暂停冻结）
  await G(() => { window.__G.showMenu(); });
  await sleep(800);
  await G(() => { window.__G.startBattle(); });
  await sleep(6000);
  await G(() => { const g = window.__G; g.battle.paused = true; });
  await sleep(500);
  await shot('battle.png');

  console.log('errors=' + (errs.slice(0, 8).join(' | ') || 'none'));
  await browser.close();
})().catch(e => { console.log('FAIL', e.stack || e.message); process.exit(1); });
