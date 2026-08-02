// RL2 e2e smoke: title → hero select → boon → map → fight → play cards → outcome →
// reward → map → save/reload → farm code → service worker. Drives the real UI
// headless in BOTH engines (the boys' tablets are Safari). Run:
//   python3 -m http.server 8199 &   (repo root)
//   npm i (playwright is PINNED at 1.60.0 in package.json), then:
//   node test/e2e.mjs
// WEBKIT PIN: this Mac (macOS 14) only has Playwright's frozen mac14 WebKit
// build (webkit_mac14_arm64_special-2251). playwright ≥1.61 hangs against it
// (probe: 20s+ no launch); 1.60.0 drives it fine (~2s). Do not bump playwright
// past 1.60.x on this machine. Missing-asset 404s are by-design (drop-in layers).
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const { webkit, chromium } = require('playwright');

const BASE = 'http://localhost:8199';
const results = [];
function ok(cond, msg) { results.push([cond, msg]); if (!cond) console.log('  ✗', msg); }

async function runSuite(browserType, name) {
  console.log('launching', name); const browser = await browserType.launch({ timeout: 30000 }); console.log('launched', name);
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('Failed to load resource')) errors.push(m.text()); }); // 404s for not-yet-added music/art are by-design (drop-in layers)

  console.log(name || 'deep', 'goto...'); await page.goto(BASE, { waitUntil: 'load', timeout: 20000 }); console.log(name || 'deep', 'loaded');
  ok(await page.locator('.title-logo').count() === 1, `${name}: title renders`);

  // new run → hero select
  await page.locator('.btn', { hasText: 'New Adventure' }).click();
  ok(await page.locator('.hero-card').count() === 2, `${name}: two heroes offered`);

  // pick Wyatt
  await page.locator('.hero-card', { hasText: 'Wyatt' }).click();
  await page.waitForSelector('.speaker-line');
  ok((await page.textContent('h2')).includes('Coach'), `${name}: coach boon screen`);
  await page.locator('.scene-body .btn').first().click();
  // act story card interstitial
  await page.waitForSelector('.act-card');
  ok((await page.textContent('.act-card-name')).includes('FAR FIELDS'), `${name}: act 1 story card`);
  await page.locator('.act-card .btn').click();

  // map: a real node graph — many spots, drawn edges, reachable starts pulsing
  await page.waitForSelector('.map-node');
  ok(await page.locator('.map-spot').count() >= 12, `${name}: map draws the act's node graph`);
  ok(await page.locator('.map-edges .edge').count() >= 10, `${name}: map draws edges`);
  ok(await page.locator('.map-node.reachable').count() >= 2, `${name}: multiple starting paths`);
  ok(await page.locator('.spot-boss-big').count() === 1, `${name}: boss crowns the map`);
  ok((await page.textContent('h2')).includes('Far Fields'), `${name}: act 1 header`);

  // enter a reachable node (floor 1 = fight)
  await page.locator('.map-node').first().click();
  await page.waitForSelector('.enemy');
  ok(await page.locator('.enemy').count() >= 1, `${name}: combat renders enemies`);
  ok(await page.locator('.card').count() >= 5, `${name}: hand renders`);
  ok(await page.locator('.energy-orb').count() === 1, `${name}: energy orb`);
  ok(await page.locator('.intent').count() >= 1, `${name}: enemy intent telegraphed`);

  // play the whole fight via UI clicks (up to 30 turns); enemy turns are
  // sequenced with animation, so wait for END TURN to re-enable between turns
  let won = false;
  for (let turn = 0; turn < 30 && !won; turn++) {
    // play affordable cards while any
    for (let i = 0; i < 12; i++) {
      const modalBtn = page.locator('.modal .btn');
      if (await modalBtn.count() > 0) { await modalBtn.first().click(); continue; }
      const playable = page.locator('.card:not(.unaffordable)');
      if (await playable.count() === 0) break;
      await playable.first().click();
      // if targeting mode engaged, click first targetable enemy
      const target = page.locator('.enemy.targetable');
      if (await target.count() > 0) await target.first().click();
      await page.waitForTimeout(60);
      if (await page.locator('.endturn').count() === 0) break; // fight over
    }
    if (await page.locator('.endturn').count() === 0) break;
    const endB = page.locator('.endturn:not([disabled])');
    if (await endB.count() === 0) break;
    await endB.click();
    // let the sequenced enemy phase play out (reduced-motion beat is fast)
    for (let w = 0; w < 40; w++) {
      await page.waitForTimeout(60);
      if (await page.locator('.endturn:not([disabled])').count() > 0) break;
      if (await page.locator('.endturn').count() === 0) break;
    }
    const h2 = await page.locator('h2').first().textContent().catch(() => '');
    if (h2 && (h2.includes('You did it') || h2.includes('rest up'))) break;
  }
  const outcome = await page.locator('h2').first().textContent().catch(() => '');
  ok(outcome.includes('You did it') || outcome.includes('rest up'), `${name}: fight reaches an outcome (${outcome.trim().slice(0, 30)})`);

  // reward screen: pick a card if offered
  if (outcome.includes('You did it')) {
    const cardPick = page.locator('.reward-card');
    if (await cardPick.count() > 0) await cardPick.first().click();
    else await page.locator('.btn', { hasText: 'Skip' }).click();
    await page.waitForSelector('.map-node');
    ok(await page.locator('.map-node').count() >= 1, `${name}: back on map after reward`);
    ok((await page.textContent('.floor-meter')).includes('Floor 1'), `${name}: floor advanced`);
    ok(await page.locator('.map-spot.current').count() === 1, `${name}: player trail marked on map`);
    // save persistence: reload → continue
    await page.reload({ waitUntil: 'load' });
    ok(await page.locator('.btn', { hasText: 'Continue' }).count() === 1, `${name}: save persists across reload`);
    await page.locator('.btn', { hasText: 'Continue' }).click();
    await page.waitForSelector('.map-node');
    ok(true, `${name}: continue restores map`);
  }

  // the Secret Farm Code: copy out, tamper rejected, restore round-trips
  await page.locator('.pilebtn', { hasText: '⚙️' }).click();
  await page.locator('.btn', { hasText: 'Farm Code' }).click();
  await page.waitForSelector('.farmcode-box');
  const code = await page.locator('.farmcode-box').first().inputValue();
  ok(code.startsWith('FARM2-'), `${name}: farm code shown`);
  await page.locator('.farmcode-box').nth(1).fill('FARM2-nonsense-abc');
  await page.locator('.btn', { hasText: 'Restore this farm' }).click();
  ok(await page.locator('.toast').count() >= 1, `${name}: bad code politely rejected`);
  await page.locator('.farmcode-box').nth(1).fill(code);
  await page.locator('.btn', { hasText: 'Restore this farm' }).click();
  await page.waitForSelector('.title-logo');
  ok(await page.locator('.btn', { hasText: 'Continue' }).count() === 1, `${name}: farm code restores the run`);

  // offline shell: the service worker registers
  const swReady = await page.evaluate(() =>
    Promise.race([
      navigator.serviceWorker.ready.then(() => true),
      new Promise((res) => setTimeout(() => res(false), 4000)),
    ])).catch(() => false);
  ok(swReady, `${name}: service worker registered`);

  ok(errors.length === 0, `${name}: zero console errors${errors.length ? ' — ' + errors[0].slice(0, 120) : ''}`);
  await browser.close();
}

// full-run deep test in chromium via engine driving (fast-forward a whole game in-page)
async function deepRun() {
  const name = 'deep';
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  console.log(name || 'deep', 'goto...'); await page.goto(BASE, { waitUntil: 'load', timeout: 20000 }); console.log(name || 'deep', 'loaded');
  const out = await page.evaluate(async () => {
    const { R, C } = window.__RL2;
    const { makeRng } = await import('./js/rng.js');
    // simulate a full run headless-in-page (same engine the UI uses)
    const run = R.newRun('aaron', 12345);
    let fights = 0;
    for (let act = 1; act <= 3; act++) {
      let bossDone = false;
      let guard0 = 60;
      while (!bossDone && guard0-- > 0) {
        const opts = R.nextNodes(run);
        const node = R.enterMapNode(run, opts[0].id);
        if (['fight', 'elite', 'boss'].includes(node.type)) {
          const st = C.startCombat(run, node.enemies, makeRng(run.floor * 7 + act), { kind: node.type });
          let guard = 0;
          while (!st.over && guard++ < 50) {
            st.hero.hp = Math.max(st.hero.hp, 500); st.hero.maxHp = 500; // invincible traversal — exercising code paths
            const playable = st.hand.filter((c) => C.canPlay(st, c));
            if (playable.length) C.playCard(st, playable[0], C.livingEnemies(st)[0]);
            while (st.pendingDiscard > 0 && st.hand.length) C.resolveDiscard(st, st.hand[0]);
            if (!playable.length) C.endTurn(st);
          }
          fights++;
          run.hp = 500; run.maxHp = 500;
          if (node.type === 'boss') bossDone = true;
        }
      }
      if (act < 3) R.advanceAct(run);
      else break;
    }
    return { fights, act: run.act };
  });
  ok(out.fights > 10, `deep run exercised ${out.fights} fights across 3 acts`);
  ok(out.act === 3, 'deep run reached act 3');
  ok(errors.length === 0, `deep run: zero errors${errors.length ? ' — ' + errors[0].slice(0, 120) : ''}`);
  await browser.close();
}

// secret-hero unlock flow: Goldie ×3 → Liam appears → run starts with floating diapers
async function liamUnlock() {
  const name = 'liam';
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE, { waitUntil: 'load' });
  ok(await page.locator('.goldie-egg').count() === 1, 'liam: Goldie watches the title screen');
  // zero-hint check: no Liam on hero select before unlock
  await page.locator('.btn', { hasText: 'New Adventure' }).click();
  ok(await page.locator('.hero-card').count() === 2, 'liam: only 2 heroes before unlock');
  await page.locator('.btn', { hasText: 'Back' }).click();
  for (let i = 0; i < 3; i++) await page.locator('.goldie-egg').click();
  ok((await page.textContent('.modal h2')).includes('LIAM THE LITTLE'), 'liam: unlock modal fires on 3rd tap');
  await page.locator('.modal .btn').click();
  await page.locator('.btn', { hasText: 'New Adventure' }).click();
  ok(await page.locator('.hero-card').count() === 3, 'liam: 3 heroes after unlock');
  await page.locator('.hero-card', { hasText: 'Liam' }).click();
  await page.locator('.scene-body .btn').first().click(); // boon
  await page.waitForSelector('.act-card');
  await page.locator('.act-card .btn').click();
  await page.waitForSelector('.map-node');
  await page.locator('.map-node').first().click();
  await page.waitForSelector('.enemy');
  ok(await page.locator('.orb-row .orb').count() >= 1, 'liam: diapers float in combat (Diaper Bag)');
  // tap a floating diaper → it explains itself (James's legibility ask)
  await page.locator('.orb[data-orb="stinky"]').first().click();
  ok((await page.locator('.toast').first().textContent()).includes('Stinky Diaper'), 'liam: tapping a diaper explains it');
  // unlock persists
  await page.reload({ waitUntil: 'load' });
  await page.evaluate(() => localStorage.removeItem('rl2_run'));
  await page.reload({ waitUntil: 'load' });
  await page.locator('.btn', { hasText: 'New Adventure' }).click();
  ok(await page.locator('.hero-card').count() === 3, 'liam: unlock persists across reload');
  ok(errors.length === 0, `liam: zero page errors${errors.length ? ' — ' + errors[0].slice(0, 120) : ''}`);
  await browser.close();
}

// credits preview: the synced-lyric ending scaffold (silent/wall-clock path)
async function creditsPreview() {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' });
  const errors = [];
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.goto(BASE + '/#credits-wyatt', { waitUntil: 'load' });
  await page.waitForSelector('.credits');
  ok(await page.locator('.credits-big').count() >= 1, 'credits: intro slide renders');
  ok((await page.textContent('.credits-big')).includes('WYATT'), 'credits: hero named');
  ok(await page.locator('.credits-skip').count() === 1, 'credits: skippable');
  await page.locator('.credits-skip').click();
  await page.waitForSelector('.credits-continue');
  ok((await page.textContent('.credits-crew')).includes('Uncle James'), 'credits: crew card on finale');
  await page.locator('.credits-continue').click();
  await page.waitForSelector('.title-logo');
  ok(true, 'credits: continue returns to title');
  ok(errors.length === 0, `credits: zero page errors${errors.length ? ' — ' + errors[0].slice(0, 120) : ''}`);
  await browser.close();
}

try {
  await runSuite(chromium, 'chromium');
  await runSuite(webkit, 'webkit');
  await liamUnlock();
  await creditsPreview();
  await deepRun();
} catch (e) {
  ok(false, 'suite crashed: ' + e.message);
}
const pass = results.filter(([c]) => c).length;
console.log(`\ne2e: ${pass}/${results.length} passed`);
process.exit(pass === results.length ? 0 : 1);
