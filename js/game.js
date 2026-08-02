// Rolfe Legends 2 — UI layer. Renders state from the pure engine (combat.js/run.js).
// Art + music are drop-in layers: PNGs in assets/ (emoji fallback), MP3s in
// assets/audio/ (silence fallback). No code changes needed when assets land.

import { makeRng, randomSeed } from './rng.js';
import { HEROES, CARDS, DIAPERS, cardInfo, makeCard } from './cards.js';
import { RELICS } from './relics.js';
import { EVENTS } from './events.js';
import * as C from './combat.js';
import * as R from './run.js';
import { MAP_FLOORS, BOSS_ID } from './map.js';
import { sfx, setEnabled as setSfx, isEnabled as sfxOn } from './sfx.js';
import * as music from './music.js';
import { creditsRoll } from './credits.js';
import { encodeFarmCode, decodeFarmCode } from './farmcode.js';
import { prefetch } from './prefetch.js';
import { EVENT_KEYS } from './events.js';

const $app = document.getElementById('app');
const SAVE_KEY = 'rl2_run';
const PROFILE_KEY = 'rl2_profile';
const TIPS_KEY = 'rl2_tips';

const REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const STEP_MS = REDUCED ? 30 : 620;   // enemy-turn sequencing beat

let run = null;
let combat = null;
let combatKind = 'fight';
let selectedCard = null;
let prevSnap = null;                   // combat diff snapshot → floaties/shakes

// ---------- profile & save ----------
function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || { wins: {}, bonusSeen: false, liamUnlocked: false }; }
  catch { return { wins: {}, bonusSeen: false, liamUnlocked: false }; }
}
function saveProfile(p) { localStorage.setItem(PROFILE_KEY, JSON.stringify(p)); }
function saveRun() { if (run) localStorage.setItem(SAVE_KEY, R.serializeRun(run)); }
function clearSave() { localStorage.removeItem(SAVE_KEY); }

// ---------- tiny dom helpers ----------
function el(tag, cls, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html != null) e.innerHTML = html;
  return e;
}
function screen(cls) {
  $app.innerHTML = '';
  document.querySelectorAll('.coach-bubble').forEach((b) => b.remove()); // tips die with their screen
  const s = el('div', `screen ${cls || 'plain'} screen-enter`);
  $app.appendChild(s);
  return s;
}
function toast(msg, ms = 1800) {
  const t = el('div', 'toast', msg);
  document.body.appendChild(t);
  setTimeout(() => t.remove(), ms);
}
function modal(title, buildFn, { dismissable = true } = {}) {
  const veil = el('div', 'modal-veil');
  const m = el('div', 'modal');
  if (title) m.appendChild(el('h2', '', title));
  veil.appendChild(m);
  if (dismissable) veil.addEventListener('click', (ev) => { if (ev.target === veil) veil.remove(); });
  document.body.appendChild(veil);
  buildFn(m, () => veil.remove());
  return veil;
}
function actCls() { return run ? `act-${run.act}` : 'plain'; }

// A stop screen with the person/place as a big painted banner (Dad in his
// shop, Granny on her porch…), title overlaid, choices beneath.
function sceneScreen(artPath, emoji, titleText) {
  const s = screen(actCls());
  s.classList.add('scene-screen');
  const banner = el('div', 'scene-banner');
  banner.appendChild(artImg(artPath, emoji, 'scene-banner-art'));
  banner.appendChild(el('div', 'scene-banner-shade'));
  banner.appendChild(el('h2', 'scene-banner-title', titleText));
  s.appendChild(banner);
  const body = el('div', 'scene-body');
  // decision support: healing/removing/buying decisions need your HP and your
  // deck in view (James's playtest note)
  if (run) {
    const strip = el('div', 'scene-status');
    strip.appendChild(el('span', 'scene-stat', `❤️ ${run.hp}/${run.maxHp}`));
    strip.appendChild(el('span', 'scene-stat', `💰 ${run.gold}`));
    const deckB = el('button', 'pilebtn', `🎴 My Deck (${run.deck.length})`);
    deckB.onclick = () => showDeckModal(run.deck);
    strip.appendChild(deckB);
    body.appendChild(strip);
  }
  s.appendChild(body);
  return body;
}

// ---------- drop-in art (PNG with emoji fallback) ----------
const missingArt = new Set();
function artImg(path, emoji, cls = '') {
  const wrap = el('span', `art-slot ${cls}`);
  if (missingArt.has(path)) { wrap.textContent = emoji; wrap.classList.add('art-emoji'); return wrap; }
  const img = document.createElement('img');
  img.src = path;
  img.alt = '';
  img.draggable = false;
  img.onerror = () => { missingArt.add(path); wrap.textContent = emoji; wrap.classList.add('art-emoji'); };
  wrap.appendChild(img);
  return wrap;
}
function bgLayer(path, cls = 'scene-bg') {
  const d = el('div', cls);
  if (!missingArt.has(path)) {
    const probe = new Image();
    probe.onload = () => { d.style.backgroundImage = `url("${path}")`; d.classList.add('has-art'); };
    probe.onerror = () => missingArt.add(path);
    probe.src = path;
  }
  return d;
}

// ---------- Coach James onboarding tips (one per moment, never twice) ----------
function tipsSeen() { try { return JSON.parse(localStorage.getItem(TIPS_KEY)) || {}; } catch { return {}; } }
function coachTip(key, text) {
  const seen = tipsSeen();
  if (seen[key]) return;
  seen[key] = 1;
  localStorage.setItem(TIPS_KEY, JSON.stringify(seen));
  const b = el('div', 'coach-bubble');
  b.appendChild(artImg('assets/ui/portrait_coach.jpg', '🧢', 'coach-face'));
  b.appendChild(el('span', 'coach-text', `<b>Coach James:</b> ${text}`));
  document.body.appendChild(b);
  setTimeout(() => b.classList.add('gone'), 4600);
  setTimeout(() => b.remove(), 5400);
}

// ---------- predictive prefetch bundles ----------
function actArtUrls(act) {
  const keys = new Set();
  const enc = R.ENCOUNTERS[act];
  for (const pool of [enc.easy, enc.hard, enc.elite, enc.boss]) {
    for (const group of pool) for (const k of group) keys.add(k);
  }
  if (act === 3) keys.add('big_twister_p2');
  const urls = [...keys].map((k) => `assets/enemies/${k}.jpg`);
  urls.push(`assets/backgrounds/battle${act}.jpg`, `assets/backgrounds/map${act}.jpg`);
  return urls;
}
function prefetchActBundle(act) {
  prefetch([...actArtUrls(act), `assets/audio/map${act}.mp3`, 'assets/audio/battle.mp3']);
}

// ---------- title ----------
function showTitle() {
  music.play('title');
  const s = screen('act-1 title-screen');
  const art = bgLayer('assets/ui/title.jpg', 'title-art');
  s.appendChild(art);
  const inner = el('div', 'title-inner');
  inner.appendChild(el('h1', 'title-logo', '🌪️ ROLFE LEGENDS 2 🦆'));
  inner.appendChild(el('p', 'subtitle title-sub', '<b>DEFEND THE FARM</b><br>a farm adventure for the Legends of Rolfe'));
  const btns = el('div', 'title-buttons');
  const saved = R.deserializeRun(localStorage.getItem(SAVE_KEY));
  if (saved) {
    const b = el('button', 'btn gold', `▶️ Continue — ${HEROES[saved.hero].name}, ${R.ACT_INFO[saved.act].name}`);
    b.onclick = () => { sfx.tap(); run = saved; showMap(); };
    btns.appendChild(b);
  }
  const nb = el('button', 'btn', '🌱 New Adventure');
  nb.onclick = () => { sfx.tap(); showHeroSelect(); };
  btns.appendChild(nb);
  const p = loadProfile();
  const winBits = ['wyatt', 'aaron', 'liam'].filter((h) => p.wins[h] > 0).map((h) => `${HEROES[h].name.split(' ')[0]} ×${p.wins[h]}`);
  if (winBits.length) btns.appendChild(el('p', 'subtitle', `🏆 Farm defended: ${winBits.join(' · ')}`));
  const settings = el('button', 'btn secondary', '⚙️ Settings');
  settings.onclick = showSettings;
  btns.appendChild(settings);
  inner.appendChild(btns);
  s.appendChild(inner);

  // Goldie watches. Goldie says nothing. Goldie knows. (Tap 3×.)
  // With title art she stands painted in the lower right; the hotspot sits on
  // her. Without art the emoji plays her part.
  const goldie = el('div', 'goldie-egg', '🦙');
  art.addEventListener('transitionend', () => {}); // no-op; hotspot swap below
  const swapIfArt = () => {
    if (art.classList.contains('has-art')) goldie.classList.add('on-art');
  };
  setTimeout(swapIfArt, 350);
  setTimeout(swapIfArt, 1400);
  let taps = 0;
  goldie.onclick = () => {
    taps += 1;
    const prof = loadProfile();
    if (taps >= 3) {
      taps = 0;
      if (!prof.liamUnlocked) {
        prof.liamUnlocked = true;
        saveProfile(prof);
        sfx.win();
        modal(null, (m, close) => {
          m.appendChild(el('div', 'event-emoji', '🦙'));
          m.appendChild(el('div', 'speaker-line', 'Goldie steps aside. Behind her, someone very small waddles out of the tall grass…'));
          m.appendChild(el('div', 'crown', '🍼'));
          m.appendChild(el('h2', '', 'LIAM THE LITTLE has joined the Legends!'));
          m.appendChild(el('p', 'subtitle', 'Secret hero unlocked — find him on the hero screen. Diapers orbit him. Nobody knows why.'));
          const b = el('button', 'btn gold', 'WHOA. →');
          b.onclick = () => { close(); showTitle(); };
          m.appendChild(b);
        }, { dismissable: false });
      } else {
        toast('🦙 Goldie says nothing. Goldie knows.');
      }
    } else {
      sfx.tap();
    }
  };
  s.appendChild(goldie);

  // warm what a fresh run touches first: act 1, the heroes, the event banners
  prefetchActBundle(1);
  prefetch([
    'assets/ui/portrait_wyatt.jpg', 'assets/ui/portrait_aaron.jpg', 'assets/ui/portrait_coach.jpg',
    ...EVENT_KEYS.map((k) => `assets/events/${k}.jpg`),
    'assets/events/shop_jacob.jpg', 'assets/events/rest_granny.jpg', 'assets/events/treasure_rusty.jpg',
  ]);
}

function showSettings() {
  modal('⚙️ Settings', (m, close) => {
    const mus = el('button', 'btn', `🎵 Music: ${music.isEnabled() ? 'ON' : 'OFF'}`);
    mus.onclick = () => { music.setEnabled(!music.isEnabled()); mus.textContent = `🎵 Music: ${music.isEnabled() ? 'ON' : 'OFF'}`; };
    const sx = el('button', 'btn', `🔔 Sounds: ${sfxOn() ? 'ON' : 'OFF'}`);
    sx.onclick = () => { setSfx(!sfxOn()); sx.textContent = `🔔 Sounds: ${sfxOn() ? 'ON' : 'OFF'}`; };
    const fc = el('button', 'btn gold', '🔑 Secret Farm Code');
    fc.onclick = () => { close(); showFarmCode(); };
    const a2hs = el('button', 'btn secondary', '📲 Put it on your home screen');
    a2hs.onclick = () => { close(); showA2HS(); };
    const reset = el('button', 'btn danger', '🗑️ Abandon current run');
    reset.onclick = () => { clearSave(); run = null; close(); showTitle(); };
    m.append(mus, sx, fc, a2hs, reset);
    m.appendChild(el('p', 'subtitle', 'Rolfe Legends 2 · made with love by Uncle James'));
  });
}

// ---------- the Secret Farm Code (save backup / restore) ----------
function showFarmCode() {
  const saved = run || R.deserializeRun(localStorage.getItem(SAVE_KEY));
  const code = encodeFarmCode(loadProfile(), saved);
  modal('🔑 Secret Farm Code', (m, close) => {
    m.appendChild(el('p', 'subtitle', 'Your whole farm story in one magic code. Copy it somewhere safe, or type one in to bring a farm back.'));
    const out = document.createElement('textarea');
    out.className = 'farmcode-box';
    out.readOnly = true;
    out.value = code;
    m.appendChild(out);
    const copy = el('button', 'btn', '📋 Copy my code');
    copy.onclick = () => {
      out.select();
      const done = () => { copy.textContent = '✅ Copied!'; setTimeout(() => { copy.textContent = '📋 Copy my code'; }, 1600); };
      if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(code).then(done, () => { document.execCommand('copy'); done(); });
      else { document.execCommand('copy'); done(); }
    };
    m.appendChild(copy);
    const inBox = document.createElement('textarea');
    inBox.className = 'farmcode-box';
    inBox.placeholder = 'Paste a Farm Code here…';
    m.appendChild(inBox);
    const restore = el('button', 'btn gold', '🚜 Restore this farm');
    restore.onclick = () => {
      const decoded = decodeFarmCode(inBox.value);
      if (!decoded) { toast('🤔 That code doesn\'t look right. Check for missing bits!'); return; }
      saveProfile(decoded.profile);
      if (decoded.run) { run = decoded.run; saveRun(); } else { clearSave(); run = null; }
      sfx.win();
      toast('🌾 Farm restored!');
      close();
      showTitle();
    };
    m.appendChild(restore);
  });
}

function showA2HS() {
  modal('📲 Home screen', (m) => {
    if (deferredInstall) {
      const b = el('button', 'btn gold', '⬇️ Install the game');
      b.onclick = () => { deferredInstall.prompt(); deferredInstall = null; };
      m.appendChild(b);
    }
    m.appendChild(el('p', '', '<b>iPad / iPhone (Safari):</b> tap the Share button <span style="font-size:1.1em">⬆️</span>, then <b>"Add to Home Screen"</b>.'));
    m.appendChild(el('p', '', '<b>Android (Chrome):</b> tap the ⋮ menu, then <b>"Add to home screen"</b>.'));
    m.appendChild(el('p', 'subtitle', 'Then the farm gets its own icon — and works even with no internet.'));
  });
}
let deferredInstall = null;
window.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferredInstall = e; });

// ---------- hero select & boon ----------
function showHeroSelect() {
  const s = screen('act-1');
  s.appendChild(el('h2', '', 'Who defends the farm today?'));
  const row = el('div', 'hero-pick');
  const roster = ['wyatt', 'aaron'];
  if (loadProfile().liamUnlocked) roster.push('liam');
  for (const id of roster) {
    const h = HEROES[id];
    const c = el('div', 'hero-card');
    c.appendChild(artImg(`assets/ui/portrait_${id}.jpg`, h.emoji, 'hero-face'));
    c.appendChild(el('h3', '', h.name));
    c.appendChild(el('p', '', h.tagline));
    c.appendChild(el('p', '', `❤️ ${h.hp} HP · ${RELICS[h.relic].emoji} ${RELICS[h.relic].name}`));
    c.onclick = () => { sfx.play(); startRun(id); };
    row.appendChild(c);
  }
  s.appendChild(row);
  const back = el('button', 'btn secondary', '← Back');
  back.onclick = showTitle;
  s.appendChild(back);
}

function startRun(heroId) {
  run = R.newRun(heroId, randomSeed());
  showBoon();
}

function showBoon() {
  const s = sceneScreen('assets/ui/portrait_coach.jpg', '🧢', 'Coach James');
  s.appendChild(el('div', 'speaker-line', '"Big day, kid. The farm\'s counting on you. Take one of these before you head out."'));
  const rng = makeRng(run.seed ^ 777);
  for (const boon of R.coachBoons(run, rng)) {
    const b = el('button', 'btn', boon.label);
    b.onclick = () => { sfx.relic(); boon.apply(run, rng); saveRun(); showActCard(1, showMap); };
    s.appendChild(b);
  }
}

// ---------- the map (StS node graph) ----------
const NODE_META = {
  fight: { ico: '⚔️', name: 'Trouble', desc: "Something's bothering the farm. Fight it!" },
  elite: { ico: '💀', name: 'BIG Trouble', desc: 'A serious foe — big risk, and it drops a Farm Treasure.' },
  boss: { ico: '👑', name: 'THE BOSS', desc: 'The big one at the top of the map.' },
  shop: { ico: '🛒', name: "Dad's Farm Supply", desc: 'Spend gold on cards, treasures, and snacks.' },
  rest: { ico: '🍪', name: "Granny Rockie's Porch", desc: 'Cookies (heal) or Practice (upgrade a card).' },
  event: { ico: '❓', name: 'Something Happens…', desc: 'You never know, out in the fields.' },
  treasure: { ico: '🐕', name: 'Here Comes Rusty!', desc: 'He brings you a Farm Treasure. Good boy.' },
};

const ROW_H = 96;          // px per floor
const MAP_PAD = 40;        // canvas top/bottom padding

function nodeXY(node, W) {
  // cols 0..3 spread across the canvas width; higher floors sit higher up
  const x = W * (0.14 + node.c * 0.24);
  const y = MAP_PAD + (MAP_FLOORS - node.f) * ROW_H + 20;
  return { x, y };
}

function showMap() {
  music.play(`map${run.act}`);
  saveRun();
  const s = screen(actCls());
  s.classList.add('map-screen');
  const info = R.ACT_INFO[run.act];

  // top bar
  const bar = el('div', 'map-topbar');
  bar.appendChild(el('h2', 'map-title', `${info.emoji} Act ${run.act}: ${info.name}`));
  bar.appendChild(el('div', 'floor-meter', `Floor ${run.floor} / ${MAP_FLOORS} · ❤️ ${run.hp}/${run.maxHp} · 💰 ${run.gold}`));
  const shelf = el('div', 'relic-shelf');
  for (const rid of run.relics) {
    const pin = el('span', 'relic-pin', RELICS[rid].emoji);
    pin.title = `${RELICS[rid].name} — ${RELICS[rid].text}`;
    pin.onclick = () => toast(`${RELICS[rid].emoji} ${RELICS[rid].name}: ${RELICS[rid].text}`, 2400);
    shelf.appendChild(pin);
  }
  if (run.snacks.length) {
    for (const sn of run.snacks) {
      const pin = el('span', 'relic-pin snack-pin', C.SNACKS[sn].emoji);
      pin.onclick = () => toast(`${C.SNACKS[sn].emoji} ${C.SNACKS[sn].name}: ${C.SNACKS[sn].text} (use it during a fight)`, 2600);
      shelf.appendChild(pin);
    }
  }
  const deckBtn = el('button', 'pilebtn', `🎴 ${run.deck.length}`);
  deckBtn.onclick = () => showDeckModal(run.deck);
  const helpBtn = el('button', 'pilebtn', '📖');
  helpBtn.onclick = showHelpModal;
  const menuBtn = el('button', 'pilebtn', '⚙️');
  menuBtn.onclick = showSettings;
  shelf.append(deckBtn, helpBtn, menuBtn);
  bar.appendChild(shelf);
  s.appendChild(bar);

  // scrollable node graph
  const wrap = el('div', 'map-wrap');
  const canvas = el('div', 'map-canvas');
  const H = MAP_PAD * 2 + MAP_FLOORS * ROW_H + 40;
  canvas.style.height = `${H}px`;
  wrap.appendChild(bgLayer(`assets/backgrounds/map${run.act}.jpg`, 'map-bg'));
  s.appendChild(wrap);
  wrap.appendChild(canvas);
  $app.appendChild(s); // ensure laid out for width

  const W = Math.min(wrap.clientWidth || 390, 560);
  canvas.style.width = `${W}px`;

  const map = run.map;
  const reach = new Set(R.nextNodes(run).map((n) => n.id));
  const onTrail = new Set(run.trail);

  // edges (SVG under the nodes)
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', W);
  svg.setAttribute('height', H);
  svg.classList.add('map-edges');
  const trailPairs = new Set();
  for (let i = 0; i < run.trail.length - 1; i++) trailPairs.add(`${run.trail[i]}>${run.trail[i + 1]}`);
  for (const [from, tos] of Object.entries(map.edges)) {
    for (const to of tos) {
      const a = nodeXY(map.nodes[from], W);
      const b = nodeXY(map.nodes[to], W);
      const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      const midY = (a.y + b.y) / 2;
      path.setAttribute('d', `M ${a.x} ${a.y} C ${a.x} ${midY}, ${b.x} ${midY}, ${b.x} ${b.y}`);
      path.classList.add('edge');
      if (trailPairs.has(`${from}>${to}`)) path.classList.add('edge-taken');
      else if (run.pos === from) path.classList.add('edge-open');
      svg.appendChild(path);
    }
  }
  canvas.appendChild(svg);

  // nodes
  let currentEl = null;
  let eliteReachable = false;
  for (const [id, node] of Object.entries(map.nodes)) {
    const meta = NODE_META[node.type];
    const { x, y } = nodeXY(node, W);
    const isReach = reach.has(id);
    const cls = ['map-spot', `spot-${node.type}`];
    if (id === BOSS_ID) cls.push('spot-boss-big');
    if (isReach) cls.push('map-node', 'reachable');
    if (onTrail.has(id)) cls.push('visited');
    if (run.pos === id) cls.push('current');
    const d = el('div', cls.join(' '));
    d.style.left = `${x}px`;
    d.style.top = `${y}px`;
    d.innerHTML = `<span class="spot-ico">${meta.ico}</span>`;
    d.title = meta.name;
    if (isReach) {
      if (node.type === 'elite') eliteReachable = true;
      d.onclick = () => { sfx.tap(); const res = R.enterMapNode(run, id); if (res) enterNode(res); };
    } else {
      // any spot identifies itself on tap (kids learn the icons by poking)
      d.onclick = () => toast(`${meta.ico} ${meta.name} — ${NODE_META[node.type].desc}`, 2600);
    }
    canvas.appendChild(d);
    if (run.pos === id) currentEl = d;
  }
  // "you are here" marker at act start
  if (!run.pos) {
    const start = el('div', 'map-start-hint', '⬆️ Pick your first stop');
    start.style.top = `${MAP_PAD + MAP_FLOORS * ROW_H + 8}px`;
    canvas.appendChild(start);
  }

  // scroll: keep current position (or the bottom) in view
  requestAnimationFrame(() => {
    const target = currentEl ? currentEl.offsetTop - wrap.clientHeight * 0.62 : canvas.scrollHeight;
    wrap.scrollTo({ top: Math.max(0, target), behavior: REDUCED ? 'auto' : 'smooth' });
  });

  coachTip('map', 'Pick your path — you can see the whole climb.');
  if (eliteReachable) coachTip('elite', '💀 is BIG trouble… and big treasure. Your call.');

  prefetchActBundle(run.act);
  if (eliteReachable) prefetch(['assets/audio/elite.mp3']);
  if (run.floor >= 8) prefetch(['assets/audio/boss.mp3', 'assets/audio/victory.mp3']);
  if (run.floor >= 10 && run.act < R.ACTS) prefetchActBundle(run.act + 1);
}

function enterNode(node) {
  saveRun();
  switch (node.type) {
    case 'fight': case 'elite': case 'boss': return startCombatUI(node.enemies, node.type);
    case 'shop': return showShop(node.shop);
    case 'rest': return showRest();
    case 'event': return showEvent(node.event);
    case 'treasure': return showTreasure(node.relic);
    case 'skipped': return showSkipped();
    default: return showMap();
  }
}

function showSkipped() {
  const s = sceneScreen('assets/events/tractor_ride.jpg', '🚜', 'The tractor rumbles past it all.');
  s.appendChild(el('div', 'speaker-line', '"Told ya I was headed this way." — Poppa Flaj'));
  const b = el('button', 'btn', 'Onward! →');
  b.onclick = showMap;
  s.appendChild(b);
}

// ---------- combat ----------
let lastBossKeys = [];
function startCombatUI(enemyKeys, kind) {
  combatKind = kind;
  if (kind === 'boss') lastBossKeys = enemyKeys;
  combat = C.startCombat(run, enemyKeys, makeRng(randomSeed()), { kind });
  music.play(kind === 'boss' ? 'boss' : kind === 'elite' ? 'elite' : 'battle');
  selectedCard = null;
  prevSnap = null;
  renderCombat();
  coachTip('intent', "Those bubbles show each enemy's next move!");
  if (kind === 'boss' && run.act === R.ACTS) {
    // a win is likely — have the ending ready the instant it happens
    const p = loadProfile();
    const wants = [`assets/audio/anthem_${run.hero}.mp3`, `assets/audio/anthem_${run.hero}.lrc`, 'assets/ui/title.jpg'];
    const other = run.hero === 'wyatt' ? 'aaron' : 'wyatt';
    if (['wyatt', 'aaron'].includes(run.hero) && p.wins[other] > 0 && !p.bonusSeen) {
      wants.push('assets/audio/anthem_both.mp3', 'assets/audio/anthem_both.lrc');
    }
    prefetch(wants);
  }
}

// Every status is tap-to-explain (kids can't hover) — see the delegated
// click handler at boot.
const STATUS_INFO = {
  block: '🛡️ Block: soaks up that much damage, then wears off next turn.',
  strength: '💪 Strength: every attack hits that much harder.',
  tempStr: '💪⏳ Temporary Strength: extra attack damage this turn only.',
  dexterity: '🩰 Dexterity: block cards give that much MORE Block.',
  poison: '☠️ Poison: takes that much damage at the start of its turn, then shrinks by 1.',
  weak: '😩 Weak: its attacks deal 25% LESS damage.',
  vulnerable: '💔 Vulnerable: takes 50% MORE damage from attacks.',
  frail: '🦴 Frail: block cards give 25% less Block.',
  thorns: '🌵 Thorns: anyone who attacks it takes that much damage back.',
  intangible: '👻 Intangible: takes at most 1 damage from ANYTHING right now.',
  focus: '😆 Giggle Power: all floating diapers get that much stronger.',
};

function statusChips(cr) {
  const chips = [];
  const add = (k, label) => chips.push(`<span class="chip" data-status="${k}">${label}</span>`);
  if (cr.block) add('block', `🛡️${cr.block}`);
  if (cr.strength) add('strength', `💪${cr.strength}`);
  if (cr.tempStr) add('tempStr', `💪${cr.tempStr}⏳`);
  if (cr.dexterity) add('dexterity', `🩰${cr.dexterity}`);
  if (cr.poison) add('poison', `☠️${cr.poison}`);
  if (cr.weak) add('weak', `😩${cr.weak}`);
  if (cr.vulnerable) add('vulnerable', `💔${cr.vulnerable}`);
  if (cr.frail) add('frail', `🦴${cr.frail}`);
  if (cr.thorns) add('thorns', `🌵${cr.thorns}`);
  if (cr.intangible) add('intangible', '👻');
  if (cr.focus) add('focus', `😆${cr.focus}`);
  return chips.join('');
}

const INTENT_KIND_INFO = {
  attack: (name, dmg) => `⚔️ Next move — ${name}: it will attack you for ${dmg} after your turn!`,
  defend: (name) => `🛡️ Next move — ${name}: it will protect itself with Block.`,
  buff: (name) => `⬆️ Next move — ${name}: it will power itself (or its friends) up.`,
  debuff: (name) => `🌀 Next move — ${name}: it will hit YOU with something nasty.`,
  sleep: (name) => `😴 ${name} — it isn't doing anything… yet. (Attacking it will wake it up!)`,
  flee: (name) => `🪽 Next move — ${name}: it's about to run away!`,
  summon: (name) => `➕ Next move — ${name}: it will call in friends.`,
  countdown: (name) => `⏳ ${name}: something BIG is charging up. The number is the countdown.`,
  special: (name) => `✨ Next move — ${name}.`,
};

function intentLabel(state, e) {
  const it = e.intent;
  if (!it) return '';
  if (it.dmg != null) {
    const p = C.intentPreview(state, e);
    const t = p.times > 1 ? `×${p.times}` : '';
    const total = p.per * p.times;
    return `<span class="intent attack" data-intent="attack" data-name="${it.name}" data-dmg="${p.per}${t} (${total} total)">⚔️ ${p.per}${t}</span>`;
  }
  const icons = { defend: '🛡️', buff: '⬆️', debuff: '🌀', sleep: '😴', flee: '🪽', summon: '➕', countdown: '⏳', special: '✨' };
  return `<span class="intent ${it.kind}" data-intent="${it.kind}" data-name="${it.name}">${icons[it.kind] || '❔'} ${it.name}</span>`;
}

// mini card used anywhere the player is CHOOSING or BUYING a card — always
// shows cost, name, and full text (James's readability pass, Fri 2026-08-01)
function miniCard(info, { extraCls = '', price = null } = {}) {
  const cost = info.cost;
  const d = el('div', `reward-card mini-card rarity-${info.rarity} type-${info.type} ${extraCls}`);
  d.innerHTML = `${cost === null ? '' : `<div class="cost">${cost === 'X' ? 'X' : cost}</div>`}
    <div class="art">${info.emoji}</div><b class="mc-name">${info.name}${info.upgraded ? '+' : ''}</b>
    <div class="ctx mc-text">${cardText(info, false)}</div>
    ${price != null ? `<div class="price-tag">💰${price}</div>` : ''}`;
  return d;
}

function snapCombat(st) {
  const snap = { heroHp: st.hero.hp, heroBlock: st.hero.block, enemies: {} };
  st.enemies.forEach((e, i) => { snap.enemies[i] = { hp: e.hp, block: e.block, dead: e.hp <= 0 }; });
  return snap;
}

function floaty(target, text, cls) {
  if (!target || REDUCED) return;
  const f = el('span', `floaty ${cls}`, text);
  f.style.left = `${30 + Math.random() * 40}%`;
  target.appendChild(f);
  setTimeout(() => f.remove(), 900);
}

// Compare current combat state to prevSnap and decorate the fresh DOM with
// floaties + shakes. HP-loss floaties come from the engine's per-hit damage
// log so a ×3 flurry or an X-cost spin visibly lands as 3 separate hits
// (staggered), not one lump. Called at the end of every renderCombat.
let lastLogIdx = 0;
function animateDiffs(s, enemyEls, heroEl) {
  const st = combat;
  if (!prevSnap || !st) {
    prevSnap = st ? snapCombat(st) : null;
    lastLogIdx = st ? st.log.length : 0;
    return;
  }
  const prev = prevSnap;
  // per-hit events since last render → staggered floaties (multi-hit clarity)
  const events = st.log.slice(lastLogIdx);
  lastLogIdx = st.log.length;
  let delay = 0;
  for (const ev of events) {
    const target = ev.target === 'hero' ? heroEl : enemyEls[ev.target];
    if (!target) continue;
    const show = () => {
      if (ev.t === 'dmg') { floaty(target, `-${ev.amount}`, 'dmg'); target.classList.remove('shake'); void target.offsetWidth; target.classList.add('shake'); }
      else if (ev.t === 'blocked') floaty(target, '🛡️ Blocked!', 'blk');
    };
    if (REDUCED || delay === 0) show();
    else setTimeout(show, delay);
    delay += 170;
  }
  st.enemies.forEach((e, i) => {
    const elx = enemyEls[i];
    const p = prev.enemies[i];
    if (!elx || !p) return;
    if (e.hp <= 0 && !p.dead) elx.classList.add('dying');
    if (e.block > p.block) floaty(elx, `🛡️+${e.block - p.block}`, 'blk');
  });
  if (st.hero.hp > prev.heroHp) floaty(heroEl, `+${st.hero.hp - prev.heroHp}`, 'heal');
  if (st.hero.block > prev.heroBlock) floaty(heroEl, `🛡️+${st.hero.block - prev.heroBlock}`, 'blk');
  prevSnap = snapCombat(st);
}

function renderCombat(actedEnemy = null) {
  const s = screen(actCls());
  s.classList.add('combat');
  s.classList.remove('screen-enter'); // combat re-renders constantly; no re-entry flash
  const st = combat;
  s.appendChild(bgLayer(`assets/backgrounds/battle${run.act}.jpg`, 'battle-bg'));
  const inner = el('div', 'combat-inner');
  s.appendChild(inner);

  // enemies
  const row = el('div', 'enemy-row');
  const enemyEls = [];
  st.enemies.forEach((e, i) => {
    if (e.gone || e.fled) { enemyEls[i] = null; return; }
    const dead = e.hp <= 0;
    const d = el('div', `enemy${dead ? ' dead' : ''}${e.isBoss ? ' boss-foe' : ''}${e.isElite && !e.isBoss ? ' elite-foe' : ''}`);
    const face = artImg(`assets/enemies/${e.artKey}.jpg`, e.emoji, 'face');
    d.appendChild(face);
    d.insertAdjacentHTML('beforeend', `<div class="nm">${e.name}</div>
      <div class="hpbar"><div style="width:${Math.max(0, e.hp / e.maxHp * 100)}%"></div></div>
      <div class="hpnum">❤️ ${Math.max(0, e.hp)}/${e.maxHp}</div>
      <div class="chips">${statusChips(e)}</div>
      ${dead ? '' : intentLabel(st, e)}`);
    if (!dead && selectedCard && cardWantsTarget(selectedCard)) {
      d.classList.add('targetable');
      d.onclick = () => playSelected(e);
    }
    if (e === actedEnemy) d.classList.add('lunge');
    row.appendChild(d);
    enemyEls[i] = d;
  });
  inner.appendChild(row);

  // floating diapers (Liam)
  if (st.hero.orbs && (st.hero.orbs.length || run.hero === 'liam')) {
    const orbRow = el('div', 'orb-row');
    for (const orb of st.hero.orbs) {
      const d = DIAPERS[orb.type];
      const val = orb.type === 'blowout' ? orb.stored
        : orb.type === 'stinky' ? d.passive + st.hero.focus
        : orb.type === 'fresh' ? d.passive + st.hero.focus
        : '⚡';
      const o = el('span', 'orb', `${d.emoji}<small>${val}</small>`);
      o.dataset.orb = orb.type;
      if (orb.type === 'blowout') o.dataset.stored = orb.stored;
      orbRow.appendChild(o);
    }
    for (let i = st.hero.orbs.length; i < st.hero.orbSlots; i++) {
      const o = el('span', 'orb empty', '◌');
      o.dataset.orb = 'empty';
      orbRow.appendChild(o);
    }
    if (orbRow.children.length) inner.appendChild(orbRow);
  }

  // hero strip
  const h = st.hero;
  const hero = HEROES[run.hero];
  const strip = el('div', 'hero-strip');
  strip.appendChild(artImg(`assets/ui/portrait_${run.hero}.jpg`, hero.emoji, 'face hero-face-combat'));
  const stats = el('div', 'stats');
  stats.innerHTML = `<b>${hero.name}</b>
      <div class="hpbar"><div style="width:${h.hp / h.maxHp * 100}%"></div></div>
      <div class="hpnum">❤️ ${h.hp}/${h.maxHp} ${h.block ? `· 🛡️ ${h.block}` : ''}</div>
      <div class="chips">${statusChips(h)}</div>`;
  strip.appendChild(stats);
  const orb = el('div', 'energy-orb', `${h.energy}<small>⚡</small>`);
  strip.appendChild(orb);
  inner.appendChild(strip);

  // snacks (tap → confirm with the effect text; no more mystery misclicks)
  if (st.snacks.length) {
    const bar = el('div', 'snackbar');
    st.snacks.forEach((id, i) => {
      const sn = C.SNACKS[id];
      const b = el('button', 'snack', sn.emoji);
      b.disabled = st.phase === 'enemy';
      b.onclick = () => modal(null, (m, close) => {
        m.appendChild(el('div', 'event-emoji', sn.emoji));
        m.appendChild(el('h2', '', sn.name));
        m.appendChild(el('p', 'subtitle', sn.text));
        const use = el('button', 'btn gold', `${sn.emoji} Eat it now!`);
        use.onclick = () => { close(); sfx.heal(); C.useSnack(st, i); afterAction(); };
        const keep = el('button', 'btn secondary', '🎒 Save it for later');
        keep.onclick = close;
        m.append(use, keep);
      });
      bar.appendChild(b);
    });
    inner.appendChild(bar);
  }

  // hand (fanned)
  const hand = el('div', 'hand');
  const n = st.hand.length;
  st.hand.forEach((c, i) => {
    const info = cardInfo(c);
    const cost = C.effectiveCost(st, c);
    const afford = C.canPlay(st, c) && st.phase !== 'enemy';
    const d = el('div', `card type-${info.type} rarity-${info.rarity}${c === selectedCard ? ' selected' : ''}${afford ? '' : ' unaffordable'}${info.upgraded ? ' upgraded' : ''}`);
    d.innerHTML = `${cost === null ? '' : `<div class="cost">${cost === 'X' ? 'X' : cost}</div>`}
      <div class="art">${info.emoji}</div><div class="cnm">${info.name}</div><div class="ctx">${renderCardText(info)}</div>`;
    if (!REDUCED && n > 1) {
      const off = i - (n - 1) / 2;
      d.style.setProperty('--fan-rot', `${off * Math.min(4, 26 / n)}deg`);
      d.style.setProperty('--fan-y', `${Math.abs(off) * Math.min(3.4, 22 / n)}px`);
    }
    d.onclick = () => onCardTap(c, d);
    hand.appendChild(d);
  });
  inner.appendChild(hand);

  // targeting hint
  if (selectedCard && cardWantsTarget(selectedCard)) {
    inner.appendChild(el('div', 'target-hint', '🎯 Tap an enemy!'));
  }

  // bottom bar
  const bottom = el('div', 'combat-bottom');
  const drawB = el('button', 'pilebtn', `🎴 ${st.draw.length}`);
  drawB.onclick = () => showDeckModal(st.draw, 'Draw pile (shuffled)');
  const discB = el('button', 'pilebtn', `🗑️ ${st.discard.length}`);
  discB.onclick = () => showDeckModal(st.discard, 'Discard pile');
  bottom.append(drawB, discB);
  if (st.exhaust.length) {
    const exB = el('button', 'pilebtn', `♻️ ${st.exhaust.length}`);
    exB.onclick = () => showDeckModal(st.exhaust, 'Used up this fight (Exhaust)');
    bottom.append(exB);
  }
  const endB = el('button', 'endturn', st.phase === 'enemy' ? '👀 ENEMY TURN…' : 'END TURN ▶');
  endB.disabled = st.phase === 'enemy';
  endB.onclick = () => { sfx.turn(); selectedCard = null; runEnemyPhase(); };
  const infoB = el('button', 'pilebtn', 'ℹ️');
  infoB.onclick = showStuffModal;
  bottom.append(endB, infoB);
  inner.appendChild(bottom);

  animateDiffs(s, enemyEls, strip);

  if (st.pendingDiscard > 0) promptDiscard();
}

// sequenced, visible enemy turns: one enemy acts per beat
function runEnemyPhase() {
  if (!combat) return;
  if (!C.beginEnemyPhase(combat)) return;
  renderCombat();          // hand discards, button flips to ENEMY TURN
  const step = () => {
    if (!combat) return;
    if (combat.over) return afterAction();
    const actor = C.stepEnemyAction(combat);
    if (combat.over) return setTimeout(afterAction, REDUCED ? 0 : 500);
    if (actor) {
      sfx.attack();
      renderCombat(actor);
      setTimeout(step, STEP_MS);
    } else {
      renderCombat();      // new hero turn drawn
    }
  };
  setTimeout(step, REDUCED ? 0 : 380);
}

// Fill {d}/{b}/{n} in card text. `live` applies current strength/dex/weak/frail
// previews — a modified number is highlighted green (boosted) or red (reduced),
// the StS trick that makes buffs *visibly* matter.
function cardText(info, live = false) {
  const fx = info.fx || [];
  const dmgOp = fx.find((o) => o.dmg != null);
  const blockOp = fx.find((o) => o.block != null);
  const statusOp = fx.find((o) => o.status);
  const nOp = fx.find((o) => o.selfStr != null || o.selfDex != null || o.tempStr != null || o.draw != null || o.energy != null || o.addCard);
  const nVal = statusOp ? Math.abs(statusOp.status.n)
    : info.pn != null ? info.pn
    : nOp ? (nOp.selfStr ?? nOp.selfDex ?? nOp.tempStr ?? nOp.draw ?? nOp.energy ?? (nOp.addCard && nOp.addCard.n)) : '?';
  const mark = (liveVal, baseVal) => {
    if (!live || !combat || liveVal === baseVal) return liveVal;
    return `<b class="${liveVal > baseVal ? 'val-up' : 'val-down'}">${liveVal}</b>`;
  };
  const dVal = dmgOp ? (live && combat ? mark(C.attackValue(dmgOp.dmg, combat.hero), dmgOp.dmg) : dmgOp.dmg) : (info.base ?? '?');
  const bVal = blockOp ? (live && combat ? mark(C.blockValue(blockOp.block, combat.hero), blockOp.block) : blockOp.block) : (info.pn ?? '?');
  return (info.text || '').replace('{d}', dVal).replace('{b}', bVal).replace('{n}', nVal);
}
function renderCardText(info) { return cardText(info, true); }

function cardWantsTarget(c) {
  return C.cardNeedsTarget(cardInfo(c)) && C.livingEnemies(combat).length > 1;
}

function flyCard(cardEl) {
  if (REDUCED || !cardEl) return;
  const r = cardEl.getBoundingClientRect();
  const ghost = cardEl.cloneNode(true);
  ghost.classList.add('card-ghost');
  ghost.style.left = `${r.left}px`;
  ghost.style.top = `${r.top}px`;
  ghost.style.width = `${r.width}px`;
  document.body.appendChild(ghost);
  requestAnimationFrame(() => ghost.classList.add('fly'));
  setTimeout(() => ghost.remove(), 480);
}

function onCardTap(c, cardEl) {
  if (combat.phase === 'enemy') return;
  if (!C.canPlay(combat, c)) {
    sfx.tap();
    const orb = document.querySelector('.energy-orb');
    if (orb) { orb.classList.remove('pulse'); void orb.offsetWidth; orb.classList.add('pulse'); }
    return;
  }
  if (cardWantsTarget(c)) {
    selectedCard = (selectedCard === c) ? null : c;
    renderCombat();
    return;
  }
  selectedCard = null;
  sfx.play();
  flyCard(cardEl);
  const target = C.livingEnemies(combat)[0];
  C.playCard(combat, c, target);
  afterAction();
}

function playSelected(enemy) {
  const c = selectedCard;
  selectedCard = null;
  sfx.attack();
  const selEl = document.querySelector('.card.selected');
  flyCard(selEl);
  C.playCard(combat, c, enemy);
  afterAction();
}

function promptDiscard() {
  modal(`Discard ${combat.pendingDiscard} card${combat.pendingDiscard > 1 ? 's' : ''}`, (m, close) => {
    for (const c of combat.hand) {
      const info = cardInfo(c);
      const b = el('button', 'btn secondary', `${info.emoji} ${info.name}`);
      b.onclick = () => { C.resolveDiscard(combat, c); close(); afterAction(); };
      m.appendChild(b);
    }
  }, { dismissable: false });
}

function afterAction() {
  if (!combat) return;
  if (combat.over) {
    if (combat.won) return combatWon();
    return showDefeat();
  }
  renderCombat();
}

function combatWon() {
  sfx.win();
  const st = combat;
  combat = null;
  prevSnap = null;
  const result = R.applyCombatResult(run, st);
  const rng = makeRng(run.seed ^ (run.act * 31 + run.floor * 7) ^ 0x5EED);
  const rewards = R.fightRewards(run, combatKind, rng);
  run.gold += rewards.gold;
  saveRun();
  if (combatKind === 'boss') {
    const bossName = st.enemies.filter((e) => e.isBoss).map((e) => e.name).join(' & ') || 'THE BOSS';
    showBossSplash(bossName, () => showReward(rewards, result, 'boss'));
  } else {
    showReward(rewards, result, combatKind);
  }
}

// the act boss goes down: fanfare, confetti, THEN the loot
function showBossSplash(bossName, onDone) {
  music.play('victory');
  const s = screen(actCls());
  s.classList.add('boss-splash');
  if (!REDUCED) {
    const confetti = el('div', 'confetti-layer');
    for (let i = 0; i < 60; i++) {
      const c = el('span', 'confetto', ['🎉', '🎊', '⭐', '🌾', '🦆'][i % 5]);
      c.style.left = `${(i * 137) % 100}%`;
      c.style.animationDelay = `${(i % 20) * 0.14}s`;
      c.style.fontSize = `${0.8 + (i % 4) * 0.28}rem`;
      confetti.appendChild(c);
    }
    s.appendChild(confetti);
  }
  s.appendChild(el('div', 'crown', '👑'));
  s.appendChild(el('h1', 'splash-big', 'BOSS DEFEATED!'));
  s.appendChild(el('div', 'speaker-line', `<b>${bossName}</b> won't be bothering the farm again.`));
  const b = el('button', 'btn gold', '🎉 Collect your rewards →');
  b.onclick = onDone;
  s.appendChild(b);
}

// a Farm Treasure deserves a moment, not a toast
function showRelicPop(relicId, onDone) {
  const rl = RELICS[relicId];
  sfx.relic();
  modal(null, (m, close) => {
    m.classList.add('treasure-pop');
    m.appendChild(el('div', 'crown', '👑'));
    m.appendChild(el('h2', '', 'FARM TREASURE!'));
    m.appendChild(el('div', 'treasure-emoji', rl.emoji));
    m.appendChild(el('h2', 'treasure-name', rl.name));
    m.appendChild(el('p', 'subtitle', rl.text));
    const b = el('button', 'btn gold', 'WHOA! →');
    b.onclick = () => { close(); onDone(); };
    m.appendChild(b);
  }, { dismissable: false });
}

// the story beats between acts (copy pending James's word pass — REVIEW.md)
const ACT_CARDS = {
  1: { sub: 'Trouble is stirring out in the corn.', line: 'Grab your gear, Legend — the Far Fields need you first!' },
  2: { sub: 'The fields are safe… but night is falling.', line: 'Raccoons are raiding the barnyard — the ducks need you!' },
  3: { sub: 'The sky has gone dark. The Big Twister is coming.', line: 'This is the big one. Defend the farm!' },
};

function showActCard(act, onDone) {
  const info = R.ACT_INFO[act];
  const card = ACT_CARDS[act];
  const s = screen(`act-${act}`);
  s.classList.add('act-card');
  s.appendChild(bgLayer(`assets/backgrounds/battle${act}.jpg`, 'battle-bg'));
  const inner = el('div', 'act-card-inner');
  inner.appendChild(el('div', 'act-card-kicker', `ACT ${act}`));
  inner.appendChild(el('div', 'event-emoji', info.emoji));
  inner.appendChild(el('h1', 'act-card-name', info.name.toUpperCase()));
  inner.appendChild(el('p', 'act-card-sub', card.sub));
  inner.appendChild(el('div', 'speaker-line', card.line));
  const b = el('button', 'btn gold', act === 1 ? '🌱 Let\'s go!' : '💪 Onward!');
  b.onclick = onDone;
  inner.appendChild(b);
  s.appendChild(inner);
}

// ---------- rewards ----------
function showReward(rewards, result, kind) {
  const s = screen(actCls());
  s.appendChild(el('h2', '', kind === 'boss' ? '👑 BOSS DEFEATED!' : '🎉 You did it!'));
  if (result.goldLost) s.appendChild(el('p', 'subtitle', `😤 The thief got away with 💰${result.goldLost}…`));
  s.appendChild(el('p', 'subtitle', `+💰 ${rewards.gold} gold`));
  if (rewards.relic) {
    const rl = RELICS[rewards.relic];
    s.appendChild(el('div', 'speaker-line', `${rl.emoji} <b>${rl.name}</b> — ${rl.text}`));
    run.relics.push(rewards.relic);
    R.onRelicGained(run, rewards.relic);
    coachTip('relic', 'Farm Treasures work the whole run. Collect them!');
  }
  if (rewards.snack && run.snacks.length < run.snackSlots) {
    run.snacks.push(rewards.snack);
    s.appendChild(el('p', 'subtitle', `${C.SNACKS[rewards.snack].emoji} Found a snack: ${C.SNACKS[rewards.snack].name}`));
    coachTip('snack', 'Snacks are one-time saves — spend them when it counts.');
  }
  if (rewards.cards.length) {
    s.appendChild(el('p', 'subtitle', '<b>Pick a new card:</b>'));
    const row = el('div', 'reward-row');
    for (const id of rewards.cards) {
      const d = miniCard(cardInfo(makeCard(id)));
      d.onclick = () => { sfx.play(); run.deck.push(makeCard(id)); finishReward(kind); };
      row.appendChild(d);
    }
    s.appendChild(row);
  }
  const skip = el('button', 'btn secondary', 'Skip the cards →');
  skip.onclick = () => finishReward(kind);
  s.appendChild(skip);
}

function finishReward(kind) {
  if (kind === 'boss') {
    if (run.act >= R.ACTS) return showVictory();
    const proceed = () => {
      R.advanceAct(run);
      saveRun();
      toast('❤️ You catch your breath between acts (+33% HP)', 2400);
      showActCard(run.act, showMap);
    };
    // boss relic: the jackpot — and it gets a real reveal
    if (!run.relics.includes('keys_tractor')) {
      run.relics.push('keys_tractor');
      showRelicPop('keys_tractor', proceed);
    } else {
      proceed();
    }
    return;
  }
  saveRun();
  showMap();
}

// ---------- shop / rest / event / treasure ----------
function showShop(shop) {
  const s = sceneScreen('assets/events/shop_jacob.jpg', '🛒', "Dad's Farm Supply");
  s.appendChild(el('div', 'speaker-line', '"Hey bud. Take a look around — everything a farm defender needs."'));
  s.appendChild(el('p', 'subtitle gold-line', `Your gold: 💰 <b>${run.gold}</b>`));
  if (shop.cards.length) {
    const row = el('div', 'reward-row');
    shop.cards.forEach((item, i) => {
      const d = miniCard(cardInfo(makeCard(item.id)), { price: item.price });
      if (run.gold < item.price) d.classList.add('cant-afford');
      else d.onclick = () => { if (R.shopBuyCard(run, shop, i)) { sfx.gold(); saveRun(); showShop(shop); } };
      row.appendChild(d);
    });
    s.appendChild(row);
  }
  if (shop.relic) {
    const rl = RELICS[shop.relic.id];
    const b = el('button', 'btn gold two-line', `${rl.emoji} ${rl.name} — 💰${shop.relic.price}<small>${rl.text}</small>`);
    b.disabled = run.gold < shop.relic.price;
    b.onclick = () => { if (R.shopBuyRelic(run, shop)) { sfx.relic(); saveRun(); showShop(shop); } };
    s.appendChild(b);
  }
  if (shop.snack) {
    const sn = C.SNACKS[shop.snack.id];
    const b = el('button', 'btn secondary two-line', `${sn.emoji} ${sn.name} — 💰${shop.snack.price}<small>${sn.text}</small>`);
    b.disabled = run.gold < shop.snack.price || run.snacks.length >= run.snackSlots;
    b.onclick = () => { if (R.shopBuySnack(run, shop)) { sfx.gold(); saveRun(); showShop(shop); } };
    s.appendChild(b);
  }
  if (!shop.removed) {
    const b = el('button', 'btn secondary', `✂️ Remove a card from your deck — 💰${shop.removePrice}`);
    b.disabled = run.gold < shop.removePrice;
    b.onclick = () => pickCardModal('Remove which card?', run.deck, (c) => {
      if (R.shopRemoveCard(run, shop, c.uid)) { sfx.play(); toast('Card removed!'); saveRun(); showShop(shop); }
    });
    s.appendChild(b);
  }
  const done = el('button', 'btn', 'Thanks, Dad! →');
  done.onclick = () => { saveRun(); showMap(); };
  s.appendChild(done);
}

function showRest() {
  const s = sceneScreen('assets/events/rest_granny.jpg', '🍪', "Granny Rockie's Porch");
  s.appendChild(el('div', 'speaker-line', '"There\'s my little legend. Cookies, or shall we practice that one move?"'));
  const cookies = el('button', 'btn', `🍪 Cookies (heal ${Math.floor(run.maxHp * 0.3)} HP)`);
  cookies.onclick = () => { sfx.heal(); const h = R.restCookies(run); toast(`❤️ +${h} HP. Granny hugs you.`); saveRun(); showMap(); };
  s.appendChild(cookies);
  const canUp = run.deck.some((c) => !c.up);
  const practice = el('button', 'btn gold', '⭐ Practice (upgrade a card)');
  practice.disabled = !canUp;
  practice.onclick = () => pickCardModal('Upgrade which card?', run.deck.filter((c) => !c.up), (c) => {
    if (R.restPractice(run, c.uid)) { sfx.relic(); toast(`⭐ ${CARDS[c.id].name}+ learned!`); saveRun(); showMap(); }
  });
  s.appendChild(practice);
}

function showEvent(key) {
  const ev = EVENTS[key];
  const s = sceneScreen(`assets/events/${key}.jpg`, ev.emoji, ev.name);
  s.appendChild(el('div', 'speaker-line', ev.line));
  const rng = makeRng(run.seed ^ run.floor * 991 ^ 0xE1E);
  for (const choice of ev.choices) {
    const b = el('button', 'btn', choice.label);
    if (choice.can && !choice.can(run)) b.disabled = true;
    b.onclick = () => {
      sfx.tap();
      const result = choice.apply(run, rng);
      if (result === 'PICK_CARD' || run.pendingRemove) {
        run.pendingRemove = false;
        return pickCardModal('Let go of which card?', run.deck, (c) => {
          const i = run.deck.findIndex((x) => x.uid === c.uid);
          if (i >= 0) run.deck.splice(i, 1);
          toast('You feel lighter.');
          saveRun(); showMap();
        });
      }
      toast(result, 2600);
      saveRun();
      showMap();
    };
    s.appendChild(b);
  }
}

function showTreasure(relicId) {
  const s = sceneScreen('assets/events/treasure_rusty.jpg', '🐕', 'Here comes Rusty!');
  if (relicId) {
    const rl = RELICS[relicId];
    R.onRelicGained(run, relicId);
    s.appendChild(el('div', 'speaker-line', `He trots up, tail wagging, something in his mouth. …It's ${rl.emoji} <b>${rl.name}</b>!<br><i>${rl.text}</i>`));
    sfx.relic();
    coachTip('relic', 'Farm Treasures work the whole run. Collect them!');
  } else {
    s.appendChild(el('div', 'speaker-line', 'He trots up, tail wagging. It\'s… a very good stick. He keeps it. Good boy anyway.'));
  }
  const b = el('button', 'btn', 'Good boy!! →');
  b.onclick = () => { saveRun(); showMap(); };
  s.appendChild(b);
}

// ---------- deck & card pickers ----------
function showDeckModal(cards, title = 'My Deck') {
  modal(`${title} (${cards.length})`, (m) => {
    if (!cards.length) m.appendChild(el('p', 'subtitle', '(empty)'));
    for (const c of cards) {
      const info = cardInfo(c);
      const cost = info.cost === null ? '—' : (info.cost === 'X' ? 'X⚡' : `${info.cost}⚡`);
      m.appendChild(el('p', 'deck-line', `<span class="deck-cost">${cost}</span> ${info.emoji} <b>${info.name}${c.up ? '+' : ''}</b> <span style="opacity:.7;font-size:.8rem">${cardText(info, false)}</span>`));
    }
  });
}

// ---------- "what's all this?" — inspect + glossary (tap, not hover) ----------
function showStuffModal() {
  modal('🎒 Your stuff', (m, close) => {
    m.appendChild(el('p', 'subtitle', '<b>Farm Treasures</b>'));
    for (const rid of run.relics) {
      const rl = RELICS[rid];
      m.appendChild(el('p', 'deck-line', `${rl.emoji} <b>${rl.name}</b> <span style="opacity:.75;font-size:.8rem">${rl.text}</span>`));
    }
    if (run.snacks.length) {
      m.appendChild(el('p', 'subtitle', '<b>Snacks</b>'));
      for (const sid of run.snacks) {
        const sn = C.SNACKS[sid];
        m.appendChild(el('p', 'deck-line', `${sn.emoji} <b>${sn.name}</b> <span style="opacity:.75;font-size:.8rem">${sn.text}</span>`));
      }
    }
    const help = el('button', 'btn secondary', '📖 What do the words mean?');
    help.onclick = () => { close(); showHelpModal(); };
    m.appendChild(help);
  });
}

const KEYWORD_INFO = [
  ['⚡ Energy', 'Cards cost ⚡ to play. You get 3 fresh ⚡ every turn.'],
  ['♻️ Exhaust', 'After you play it, that card is used up for the rest of the FIGHT.'],
  ['✋ Innate', 'Always shows up in your opening hand.'],
  ['❎ X cost', 'Spends ALL your ⚡ — the more you spend, the bigger it gets.'],
  ['🎯 Intent bubble', "The bubble under each enemy shows its NEXT move. ⚔️ + a number = how hard it'll hit you."],
];

function showHelpModal() {
  modal('📖 How to read the game', (m) => {
    m.appendChild(el('p', 'subtitle', '<b>Map stops</b>'));
    for (const [type, meta] of Object.entries(NODE_META)) {
      m.appendChild(el('p', 'deck-line', `${meta.ico} <b>${meta.name}</b> <span style="opacity:.75;font-size:.8rem">${meta.desc}</span>`));
    }
    m.appendChild(el('p', 'subtitle', '<b>Words on cards</b>'));
    for (const [k, v] of KEYWORD_INFO) {
      m.appendChild(el('p', 'deck-line', `<b>${k}</b> <span style="opacity:.75;font-size:.8rem">${v}</span>`));
    }
    m.appendChild(el('p', 'subtitle', '<b>Buffs & debuffs (tap any icon in a fight!)</b>'));
    for (const v of Object.values(STATUS_INFO)) {
      m.appendChild(el('p', 'deck-line', `<span style="font-size:.85rem">${v}</span>`));
    }
    // the secret hero's kit — only ever shown while playing him (zero-hint rule)
    if (run && run.hero === 'liam') {
      m.appendChild(el('p', 'subtitle', '<b>Liam\'s floating diapers (tap one in a fight!)</b>'));
      m.appendChild(el('p', 'deck-line', '💩 <b>Stinky</b> <span style="opacity:.75;font-size:.8rem">zaps a random enemy every turn; pops for a big zap</span>'));
      m.appendChild(el('p', 'deck-line', '🩲 <b>Fresh</b> <span style="opacity:.75;font-size:.8rem">blocks for Liam every turn; pops for big Block</span>'));
      m.appendChild(el('p', 'deck-line', '🌋 <b>THE BLOWOUT</b> <span style="opacity:.75;font-size:.8rem">grows every turn… pops ALL AT ONCE on the weakest enemy</span>'));
      m.appendChild(el('p', 'deck-line', '🧃 <b>Snack Time</b> <span style="opacity:.75;font-size:.8rem">+1 ⚡ every turn it floats</span>'));
      m.appendChild(el('p', 'deck-line', '😆 <b>Giggle Power</b> <span style="opacity:.75;font-size:.8rem">makes every diaper stronger; diapers pop oldest-first when full</span>'));
    }
  });
}
function pickCardModal(title, cards, onPick) {
  modal(title, (m, close) => {
    for (const c of cards) {
      const info = cardInfo(c);
      const b = el('button', 'btn secondary', `${info.emoji} ${info.name}${c.up ? '+' : ''}`);
      b.onclick = () => { close(); onPick(c); };
      m.appendChild(b);
    }
  });
}

// ---------- endings ----------
function showDefeat() {
  music.play('title');
  sfx.lose();
  const st = combat; combat = null;
  prevSnap = null;
  clearSave();
  const s = screen('plain');
  s.appendChild(el('div', 'event-emoji', '🌧️'));
  s.appendChild(el('h2', '', 'The farm needs you to rest up…'));
  s.appendChild(el('div', 'speaker-line', `"Hey. Even legends have tough days. The farm's still standing — because you were out there. Same time tomorrow?" — Coach James`));
  s.appendChild(el('p', 'subtitle', `Runs end — that's the game. You keep everything you learned. 💪`));
  s.appendChild(el('p', 'subtitle', `You made it to Act ${run.act}, floor ${run.floor}.`));
  const b = el('button', 'btn', '🌱 Try Again');
  b.onclick = showHeroSelect;
  s.appendChild(b);
  const t = el('button', 'btn secondary', '🏠 Title');
  t.onclick = showTitle;
  s.appendChild(t);
  run = null;
}

function showVictory() {
  const heroId = run.hero;
  const p = loadProfile();
  const firstWin = !(p.wins[heroId] > 0);
  p.wins[heroId] = (p.wins[heroId] || 0) + 1;
  saveProfile(p);
  clearSave();
  // THE CROWN — first win per hero rolls the synced-lyric anthem credits;
  // winning with BOTH big brothers unlocks the bonus finale on top.
  const bothNow = p.wins.aaron > 0 && p.wins.wyatt > 0 && !p.bonusSeen;
  const rollBonus = () => {
    if (bothNow) {
      p.bonusSeen = true;
      saveProfile(p);
      creditsRoll('both', { el, artImg, sfx, REDUCED }, () => showCrownScreen(heroId));
    } else {
      showCrownScreen(heroId);
    }
  };
  if (firstWin) creditsRoll(heroId, { el, artImg, sfx, REDUCED }, rollBonus);
  else rollBonus();
}

function showCrownScreen(heroId) {
  const p = loadProfile();
  music.play(`anthem_${heroId}`);
  const s = screen('act-1');
  s.appendChild(el('div', 'crown', '👑'));
  s.appendChild(el('h1', '', 'THE FARM IS SAFE!'));
  const twisterFinale = !lastBossKeys.includes('thunder');
  const VICTORY_LINES = twisterFinale ? {
    wyatt: '"The Big Twister itself couldn\'t catch him. WYATT THE SPEEDY — Legend of Rolfe!" 🌪️⚡',
    aaron: '"He looked the Big Twister dead in the eye — and the twister blinked. AARON THE STRONG — the Lil Tornado himself!" 🌪️💪',
    liam: '"The Big Twister took one whiff of THE BLOWOUT and surrendered on the spot. LIAM THE LITTLE — the tiniest Legend of Rolfe!" 🌪️🍼',
  } : {
    wyatt: '"Thunder AND Lightning — and neither one could touch him. WYATT THE SPEEDY — Legend of Rolfe!" ⛈️⚡',
    aaron: '"Thunder boomed. Lightning cracked. Aaron flexed. The storm apologized. AARON THE STRONG!" ⛈️💪',
    liam: '"Thunder and Lightning met THE BLOWOUT. The storm has not stopped running. LIAM THE LITTLE!" ⛈️🍼',
  };
  s.appendChild(el('div', 'speaker-line', VICTORY_LINES[heroId]));
  if (p.wins.aaron > 0 && p.wins.wyatt > 0) {
    s.appendChild(el('div', 'speaker-line', '🏆 <b>BOTH LEGENDS HAVE DEFENDED THE FARM!</b><br>Rusty barks twice. Goldie nods, once. Somewhere, the ducks are cheering.'));
  }
  const again = el('button', 'btn secondary', '🎬 Watch your credits again');
  again.onclick = () => creditsRoll(heroId, { el, artImg, sfx, REDUCED }, () => showCrownScreen(heroId));
  s.appendChild(again);
  const b = el('button', 'btn', '🌱 Play Again');
  b.onclick = () => { run = null; showHeroSelect(); };
  s.appendChild(b);
  const t = el('button', 'btn secondary', '🏠 Title');
  t.onclick = () => { run = null; showTitle(); };
  s.appendChild(t);
  run = null;
}

// ---------- boot ----------
music.arm();
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
// phones held sideways: gentle rotate ask (pure CSS visibility; tablets unaffected)
{
  const rh = document.createElement('div');
  rh.className = 'rotate-hint';
  rh.innerHTML = '<span class="rh-icon">📱</span>Turn your screen tall-ways to play!';
  document.body.appendChild(rh);
}

// tap-to-explain, everywhere (kids can't hover): status chips, intent bubbles,
// the energy orb
document.addEventListener('click', (ev) => {
  if (ev.target.closest && ev.target.closest('.enemy.targetable')) return; // targeting taps = attacks, not tooltips
  const chip = ev.target.closest && ev.target.closest('.chip[data-status]');
  if (chip && STATUS_INFO[chip.dataset.status]) { toast(STATUS_INFO[chip.dataset.status], 2800); return; }
  const it = ev.target.closest && ev.target.closest('.intent[data-intent]');
  if (it) {
    const kind = it.dataset.intent;
    const fn = INTENT_KIND_INFO[kind];
    if (fn) toast(fn(it.dataset.name || 'its move', it.dataset.dmg || ''), 3200);
    return;
  }
  const orb = ev.target.closest && ev.target.closest('.energy-orb');
  if (orb) { toast('⚡ Energy: playing cards costs ⚡. You get 3 fresh ⚡ every turn.', 2800); return; }
  const diaper = ev.target.closest && ev.target.closest('.orb[data-orb]');
  if (diaper && combat) {
    const f = combat.hero.focus;
    const g = f > 0 ? ` (Giggle Power +${f}!)` : '';
    const TEXTS = {
      stinky: `💩 Stinky Diaper: every turn its smell zaps a random enemy for ${3 + f}${g}. When it pops: ${8 + f} damage!`,
      fresh: `🩲 Fresh Diaper: every turn it wraps Liam in ${3 + f} Block${g}. When it pops: ${6 + f} Block!`,
      blowout: `🌋 THE BLOWOUT: it grows +${6 + f} bigger every turn${g} — it's at ${diaper.dataset.stored || 0} now. When it pops: ALL of it hits the weakest enemy. KA-BOOM.`,
      snack: `🧃 Snack Time: +1 ⚡ every turn while it floats. When it pops: +2 ⚡.`,
      empty: `◌ An empty diaper slot. Cards like Change It! float a new diaper here. When they're all full, the OLDEST one pops to make room.`,
    };
    if (TEXTS[diaper.dataset.orb]) toast(TEXTS[diaper.dataset.orb], 3400);
  }
});
// #credits-<hero> previews an ending anytime (dev/testing; harmless for kids)
const creditsPreview = /^#credits-(wyatt|aaron|liam|both)$/.exec(location.hash);
if (creditsPreview) creditsRoll(creditsPreview[1], { el, artImg, sfx, REDUCED }, () => showTitle());
else showTitle();

// e2e/debug handle (+ dev screen-jumps for tests/screenshots — harmless in play)
window.__RL2 = {
  get run() { return run; }, get combat() { return combat; }, R, C, showTitle,
  dev: {
    start(heroId = 'wyatt', seed = 4242) { run = R.newRun(heroId, seed); showMap(); },
    enter(type, arg) {
      if (!run) this.start();
      const rng = makeRng(99);
      if (type === 'shop') return enterNode({ type: 'shop', shop: R.makeShop(run, rng) });
      if (type === 'rest') return enterNode({ type: 'rest' });
      if (type === 'treasure') return enterNode({ type: 'treasure', relic: arg || 'sunflower' });
      if (type === 'event') return enterNode({ type: 'event', event: arg || 'duck_pond' });
      if (type === 'fight' || type === 'elite' || type === 'boss') {
        return enterNode({ type, enemies: arg || (type === 'boss' ? ['big_twister'] : ['gopher']) });
      }
      if (type === 'defeat') { run.floor = 5; return showDefeat(); }
      if (type === 'victory') return showVictory();
      if (type === 'refresh') return afterAction();
    },
  },
};
