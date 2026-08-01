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
  b.appendChild(artImg('assets/ui/portrait_coach.png', '🧢', 'coach-face'));
  b.appendChild(el('span', 'coach-text', `<b>Coach James:</b> ${text}`));
  document.body.appendChild(b);
  setTimeout(() => b.classList.add('gone'), 4600);
  setTimeout(() => b.remove(), 5400);
}

// ---------- title ----------
function showTitle() {
  music.play('title');
  const s = screen('act-1 title-screen');
  const art = bgLayer('assets/ui/title.png', 'title-art');
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
}

function showSettings() {
  modal('⚙️ Settings', (m, close) => {
    const mus = el('button', 'btn', `🎵 Music: ${music.isEnabled() ? 'ON' : 'OFF'}`);
    mus.onclick = () => { music.setEnabled(!music.isEnabled()); mus.textContent = `🎵 Music: ${music.isEnabled() ? 'ON' : 'OFF'}`; };
    const sx = el('button', 'btn', `🔔 Sounds: ${sfxOn() ? 'ON' : 'OFF'}`);
    sx.onclick = () => { setSfx(!sfxOn()); sx.textContent = `🔔 Sounds: ${sfxOn() ? 'ON' : 'OFF'}`; };
    const reset = el('button', 'btn danger', '🗑️ Abandon current run');
    reset.onclick = () => { clearSave(); run = null; close(); showTitle(); };
    m.append(mus, sx, reset);
    m.appendChild(el('p', 'subtitle', 'Rolfe Legends 2 · made with love by Uncle James'));
  });
}

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
    c.appendChild(artImg(`assets/ui/portrait_${id}.png`, h.emoji, 'hero-face'));
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
  const s = screen('act-1');
  s.appendChild(artImg('assets/ui/portrait_coach.png', '🧢', 'scene-art'));
  s.appendChild(el('h2', '', 'Coach James'));
  s.appendChild(el('div', 'speaker-line', '"Big day, kid. The farm\'s counting on you. Take one of these before you head out."'));
  const rng = makeRng(run.seed ^ 777);
  for (const boon of R.coachBoons(run, rng)) {
    const b = el('button', 'btn', boon.label);
    b.onclick = () => { sfx.relic(); boon.apply(run, rng); saveRun(); showMap(); };
    s.appendChild(b);
  }
}

// ---------- the map (StS node graph) ----------
const NODE_META = {
  fight: { ico: '⚔️', name: 'Trouble' },
  elite: { ico: '💀', name: 'BIG Trouble' },
  boss: { ico: '👑', name: 'THE BOSS' },
  shop: { ico: '🛒', name: "Dad's Shop" },
  rest: { ico: '🍪', name: "Granny's Porch" },
  event: { ico: '❓', name: 'Something…' },
  treasure: { ico: '🐕', name: 'Rusty!' },
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
    for (const sn of run.snacks) shelf.appendChild(el('span', 'relic-pin snack-pin', C.SNACKS[sn].emoji));
  }
  const deckBtn = el('button', 'pilebtn', `🎴 ${run.deck.length}`);
  deckBtn.onclick = () => showDeckModal(run.deck);
  const menuBtn = el('button', 'pilebtn', '⚙️');
  menuBtn.onclick = showSettings;
  shelf.append(deckBtn, menuBtn);
  bar.appendChild(shelf);
  s.appendChild(bar);

  // scrollable node graph
  const wrap = el('div', 'map-wrap');
  const canvas = el('div', 'map-canvas');
  const H = MAP_PAD * 2 + MAP_FLOORS * ROW_H + 40;
  canvas.style.height = `${H}px`;
  wrap.appendChild(bgLayer(`assets/backgrounds/map${run.act}.png`, 'map-bg'));
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
  const s = screen(actCls());
  s.appendChild(el('div', 'event-emoji', '🚜'));
  s.appendChild(el('h2', '', 'The tractor rumbles past it all.'));
  s.appendChild(el('div', 'speaker-line', '"Told ya I was headed this way." — Poppa Flaj'));
  const b = el('button', 'btn', 'Onward! →');
  b.onclick = showMap;
  s.appendChild(b);
}

// ---------- combat ----------
function startCombatUI(enemyKeys, kind) {
  combatKind = kind;
  combat = C.startCombat(run, enemyKeys, makeRng(randomSeed()), { kind });
  music.play(kind === 'boss' ? 'boss' : kind === 'elite' ? 'elite' : 'battle');
  selectedCard = null;
  prevSnap = null;
  renderCombat();
}

function statusChips(cr) {
  const chips = [];
  if (cr.block) chips.push(`🛡️${cr.block}`);
  if (cr.strength) chips.push(`💪${cr.strength}`);
  if (cr.tempStr) chips.push(`💪${cr.tempStr}⏳`);
  if (cr.dexterity) chips.push(`🩰${cr.dexterity}`);
  if (cr.poison) chips.push(`☠️${cr.poison}`);
  if (cr.weak) chips.push(`😩${cr.weak}`);
  if (cr.vulnerable) chips.push(`💔${cr.vulnerable}`);
  if (cr.frail) chips.push(`🦴${cr.frail}`);
  if (cr.thorns) chips.push(`🌵${cr.thorns}`);
  if (cr.intangible) chips.push('👻');
  if (cr.focus) chips.push(`😆${cr.focus}`);
  return chips.map((c) => `<span class="chip">${c}</span>`).join('');
}

function intentLabel(state, e) {
  const it = e.intent;
  if (!it) return '';
  if (it.dmg != null) {
    const p = C.intentPreview(state, e);
    const t = p.times > 1 ? `×${p.times}` : '';
    return `<span class="intent attack">⚔️ ${p.per}${t}</span>`;
  }
  const icons = { defend: '🛡️', buff: '⬆️', debuff: '🌀', sleep: '😴', flee: '🪽', summon: '➕', countdown: '⏳', special: '✨' };
  return `<span class="intent ${it.kind}">${icons[it.kind] || '❔'} ${it.name}</span>`;
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
// floaties + shakes. Called at the end of every renderCombat.
function animateDiffs(s, enemyEls, heroEl) {
  const st = combat;
  if (!prevSnap || !st) { prevSnap = st ? snapCombat(st) : null; return; }
  const prev = prevSnap;
  st.enemies.forEach((e, i) => {
    const elx = enemyEls[i];
    const p = prev.enemies[i];
    if (!elx || !p) return;
    if (e.hp < p.hp) {
      floaty(elx, `-${p.hp - e.hp}`, 'dmg');
      elx.classList.add('shake');
    }
    if (e.hp <= 0 && !p.dead) elx.classList.add('dying');
    if (e.block > p.block) floaty(elx, `🛡️+${e.block - p.block}`, 'blk');
  });
  if (st.hero.hp < prev.heroHp) {
    floaty(heroEl, `-${prev.heroHp - st.hero.hp}`, 'dmg');
    heroEl && heroEl.classList.add('shake');
  } else if (st.hero.hp > prev.heroHp) {
    floaty(heroEl, `+${st.hero.hp - prev.heroHp}`, 'heal');
  }
  if (st.hero.block > prev.heroBlock) floaty(heroEl, `🛡️+${st.hero.block - prev.heroBlock}`, 'blk');
  prevSnap = snapCombat(st);
}

function renderCombat(actedEnemy = null) {
  const s = screen(actCls());
  s.classList.add('combat');
  s.classList.remove('screen-enter'); // combat re-renders constantly; no re-entry flash
  const st = combat;
  s.appendChild(bgLayer(`assets/backgrounds/battle${run.act}.png`, 'battle-bg'));
  const inner = el('div', 'combat-inner');
  s.appendChild(inner);

  // enemies
  const row = el('div', 'enemy-row');
  const enemyEls = [];
  st.enemies.forEach((e, i) => {
    if (e.gone || e.fled) { enemyEls[i] = null; return; }
    const dead = e.hp <= 0;
    const d = el('div', `enemy${dead ? ' dead' : ''}${e.isBoss ? ' boss-foe' : ''}`);
    const face = artImg(`assets/enemies/${e.artKey}.png`, e.emoji, 'face');
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
      orbRow.appendChild(el('span', 'orb', `${d.emoji}<small>${val}</small>`));
    }
    for (let i = st.hero.orbs.length; i < st.hero.orbSlots; i++) orbRow.appendChild(el('span', 'orb empty', '◌'));
    if (orbRow.children.length) inner.appendChild(orbRow);
  }

  // hero strip
  const h = st.hero;
  const hero = HEROES[run.hero];
  const strip = el('div', 'hero-strip');
  strip.appendChild(artImg(`assets/ui/portrait_${run.hero}.png`, hero.emoji, 'face hero-face-combat'));
  const stats = el('div', 'stats');
  stats.innerHTML = `<b>${hero.name}</b>
      <div class="hpbar"><div style="width:${h.hp / h.maxHp * 100}%"></div></div>
      <div class="hpnum">❤️ ${h.hp}/${h.maxHp} ${h.block ? `· 🛡️ ${h.block}` : ''}</div>
      <div class="chips">${statusChips(h)}</div>`;
  strip.appendChild(stats);
  const orb = el('div', 'energy-orb', `${h.energy}<small>⚡</small>`);
  strip.appendChild(orb);
  inner.appendChild(strip);

  // snacks
  if (st.snacks.length) {
    const bar = el('div', 'snackbar');
    st.snacks.forEach((id, i) => {
      const b = el('button', 'snack', C.SNACKS[id].emoji);
      b.title = C.SNACKS[id].name;
      b.disabled = st.phase === 'enemy';
      b.onclick = () => { sfx.heal(); C.useSnack(st, i); afterAction(); };
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
  const endB = el('button', 'endturn', st.phase === 'enemy' ? '👀 ENEMY TURN…' : 'END TURN ▶');
  endB.disabled = st.phase === 'enemy';
  endB.onclick = () => { sfx.turn(); selectedCard = null; runEnemyPhase(); };
  bottom.append(drawB, discB, endB);
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

// Fill {d}/{b}/{n} in card text. `live` applies current strength/dex previews.
function cardText(info, live = false) {
  const fx = info.fx || [];
  const dmgOp = fx.find((o) => o.dmg != null);
  const blockOp = fx.find((o) => o.block != null);
  const statusOp = fx.find((o) => o.status);
  const nOp = fx.find((o) => o.selfStr != null || o.selfDex != null || o.tempStr != null || o.draw != null || o.energy != null || o.addCard);
  const nVal = statusOp ? Math.abs(statusOp.status.n)
    : info.pn != null ? info.pn
    : nOp ? (nOp.selfStr ?? nOp.selfDex ?? nOp.tempStr ?? nOp.draw ?? nOp.energy ?? (nOp.addCard && nOp.addCard.n)) : '?';
  const dVal = dmgOp ? (live && combat ? C.attackValue(dmgOp.dmg, combat.hero) : dmgOp.dmg) : (info.base ?? '?');
  const bVal = blockOp ? (live && combat ? C.blockValue(blockOp.block, combat.hero) : blockOp.block) : (info.pn ?? '?');
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
  showReward(rewards, result, combatKind);
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
      const info = cardInfo(makeCard(id));
      const d = el('div', `reward-card rarity-${info.rarity}`, `<div class="art" style="font-size:1.8rem">${info.emoji}</div><b style="font-size:.85rem">${info.name}</b><div class="ctx" style="font-size:.68rem">${staticCardText(id)}</div>`);
      d.onclick = () => { sfx.play(); run.deck.push(makeCard(id)); finishReward(kind); };
      row.appendChild(d);
    }
    s.appendChild(row);
  }
  const skip = el('button', 'btn secondary', 'Skip the cards →');
  skip.onclick = () => finishReward(kind);
  s.appendChild(skip);
}

function staticCardText(id) { return cardText(CARDS[id], false); }

function finishReward(kind) {
  if (kind === 'boss') {
    if (run.act >= R.ACTS) return showVictory();
    // boss relic: the jackpot
    if (!run.relics.includes('keys_tractor')) {
      run.relics.push('keys_tractor');
      toast('🔑 KEYS TO THE TRACTOR! +1 ⚡ every turn!', 2600);
      sfx.relic();
    }
    R.advanceAct(run);
    toast(`${R.ACT_INFO[run.act].emoji} Entering ${R.ACT_INFO[run.act].name}… (+25% HP)`, 2400);
  }
  saveRun();
  showMap();
}

// ---------- shop / rest / event / treasure ----------
function showShop(shop) {
  const s = screen(actCls());
  s.appendChild(artImg('assets/events/shop_jacob.png', '🛒', 'scene-art'));
  s.appendChild(el('h2', '', "Dad's Farm Supply"));
  s.appendChild(el('div', 'speaker-line', '"Hey bud. Take a look around — everything a farm defender needs."'));
  s.appendChild(el('p', 'subtitle', `💰 ${run.gold}`));
  shop.cards.forEach((item, i) => {
    const info = CARDS[item.id];
    const b = el('button', 'btn secondary', `${info.emoji} ${info.name} — 💰${item.price}`);
    b.disabled = run.gold < item.price;
    b.onclick = () => { if (R.shopBuyCard(run, shop, i)) { sfx.gold(); saveRun(); showShop(shop); } };
    s.appendChild(b);
  });
  if (shop.relic) {
    const rl = RELICS[shop.relic.id];
    const b = el('button', 'btn gold', `${rl.emoji} ${rl.name} — 💰${shop.relic.price}`);
    b.disabled = run.gold < shop.relic.price;
    b.onclick = () => { if (R.shopBuyRelic(run, shop)) { sfx.relic(); saveRun(); showShop(shop); } };
    s.appendChild(b);
  }
  if (shop.snack) {
    const sn = C.SNACKS[shop.snack.id];
    const b = el('button', 'btn secondary', `${sn.emoji} ${sn.name} — 💰${shop.snack.price}`);
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
  const s = screen(actCls());
  s.appendChild(artImg('assets/events/rest_granny.png', '🍪', 'scene-art'));
  s.appendChild(el('h2', '', "Granny Rockie's Porch"));
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
  const s = screen(actCls());
  s.appendChild(artImg(`assets/events/${key}.png`, ev.emoji, 'scene-art'));
  s.appendChild(el('h2', '', ev.name));
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
  const s = screen(actCls());
  s.appendChild(artImg('assets/events/treasure_rusty.png', '🐕', 'scene-art'));
  s.appendChild(el('h2', '', 'Here comes Rusty!'));
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
      m.appendChild(el('p', '', `${info.emoji} <b>${info.name}</b> <span style="opacity:.7;font-size:.8rem">${staticCardText(c.id)}</span>`));
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
  p.wins[heroId] = (p.wins[heroId] || 0) + 1;
  saveProfile(p);
  clearSave();
  music.play(`anthem_${heroId}`);
  const s = screen('act-1');
  s.appendChild(el('div', 'crown', '👑'));
  s.appendChild(el('h1', '', 'THE FARM IS SAFE!'));
  const VICTORY_LINES = {
    wyatt: '"The Big Twister itself couldn\'t catch him. WYATT THE SPEEDY — Legend of Rolfe!" 🌪️⚡',
    aaron: '"He looked the Big Twister dead in the eye — and the twister blinked. AARON THE STRONG — the Lil Tornado himself!" 🌪️💪',
    liam: '"The Big Twister took one whiff of THE BLOWOUT and surrendered on the spot. LIAM THE LITTLE — the tiniest Legend of Rolfe!" 🌪️🍼',
  };
  s.appendChild(el('div', 'speaker-line', VICTORY_LINES[heroId]));
  const both = p.wins.aaron > 0 && p.wins.wyatt > 0;
  if (both && !p.bonusSeen) {
    p.bonusSeen = true;
    saveProfile(p);
    s.appendChild(el('div', 'speaker-line', '🏆 <b>BOTH LEGENDS HAVE DEFENDED THE FARM!</b><br>Rusty barks twice. Goldie nods, once. Somewhere, the ducks are cheering.<br><i>(A proper double-legend celebration is coming in an update…)</i>'));
  }
  s.appendChild(el('p', 'subtitle', '🎵 Victory anthem + credits sequence coming soon — this crown screen is the placeholder.'));
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
showTitle();

// e2e/debug handle
window.__RL2 = { get run() { return run; }, get combat() { return combat; }, R, C, showTitle };
