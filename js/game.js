// Rolfe Legends 2 — UI layer. Renders state from the pure engine (combat.js/run.js).
// Emoji art v1; PNG art + Suno music drop in later without code changes.

import { makeRng, randomSeed } from './rng.js';
import { HEROES, CARDS, cardInfo, makeCard } from './cards.js';
import { RELICS } from './relics.js';
import { EVENTS } from './events.js';
import * as C from './combat.js';
import * as R from './run.js';
import { sfx, setEnabled as setSfx, isEnabled as sfxOn } from './sfx.js';
import * as music from './music.js';

const $app = document.getElementById('app');
const SAVE_KEY = 'rl2_run';
const PROFILE_KEY = 'rl2_profile';

let run = null;
let combat = null;
let combatKind = 'fight';
let selectedCard = null;

// ---------- profile & save ----------
function loadProfile() {
  try { return JSON.parse(localStorage.getItem(PROFILE_KEY)) || { wins: { aaron: 0, wyatt: 0 }, bonusSeen: false }; }
  catch { return { wins: { aaron: 0, wyatt: 0 }, bonusSeen: false }; }
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
  const s = el('div', `screen ${cls || 'plain'}`);
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

// ---------- title ----------
function showTitle() {
  music.play('title');
  const s = screen('act-1');
  s.appendChild(el('h1', 'title-logo', '🌪️ ROLFE LEGENDS 2 🦆'));
  s.appendChild(el('p', 'subtitle', '<b>DEFEND THE FARM</b><br>a farm adventure for the Legends of Rolfe'));
  const saved = R.deserializeRun(localStorage.getItem(SAVE_KEY));
  if (saved) {
    const b = el('button', 'btn gold', `▶️ Continue — ${HEROES[saved.hero].name}, ${R.ACT_INFO[saved.act].name}`);
    b.onclick = () => { sfx.tap(); run = saved; showMap(); };
    s.appendChild(b);
  }
  const nb = el('button', 'btn', '🌱 New Adventure');
  nb.onclick = () => { sfx.tap(); showHeroSelect(); };
  s.appendChild(nb);
  const p = loadProfile();
  if (p.wins.aaron > 0 || p.wins.wyatt > 0) {
    s.appendChild(el('p', 'subtitle', `🏆 Farm defended: Wyatt ×${p.wins.wyatt} · Aaron ×${p.wins.aaron}`));
  }
  const settings = el('button', 'btn secondary', '⚙️ Settings');
  settings.onclick = showSettings;
  s.appendChild(settings);
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
  for (const id of ['wyatt', 'aaron']) {
    const h = HEROES[id];
    const c = el('div', 'hero-card',
      `<div class="big">${h.emoji}</div><h3>${h.name}</h3><p>${h.tagline}</p><p>❤️ ${h.hp} HP · ${RELICS[h.relic].emoji} ${RELICS[h.relic].name}</p>`);
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
  s.appendChild(el('div', 'event-emoji', '🧢'));
  s.appendChild(el('h2', '', 'Coach James'));
  s.appendChild(el('div', 'speaker-line', '"Big day, kid. The farm\'s counting on you. Take one of these before you head out."'));
  const rng = makeRng(run.seed ^ 777);
  for (const boon of R.coachBoons(run, rng)) {
    const b = el('button', 'btn', boon.label);
    b.onclick = () => { sfx.relic(); boon.apply(run, rng); saveRun(); showMap(); };
    s.appendChild(b);
  }
}

// ---------- map ----------
const NODE_META = {
  fight: { ico: '⚔️', name: 'Trouble!', desc: 'Something\'s bothering the farm. Deal with it.' },
  elite: { ico: '💀', name: 'BIG Trouble', desc: 'A serious foe. Big risk, big reward (a Farm Treasure!).' },
  boss: { ico: '👑', name: 'THE BOSS', desc: 'This is the big one.' },
  shop: { ico: '🛒', name: "Dad's Farm Supply", desc: 'Jacob\'s got everything you need. For a price.' },
  rest: { ico: '🍪', name: "Granny Rockie's Porch", desc: 'Cookies and a breather.' },
  event: { ico: '❓', name: 'Something Happens…', desc: 'You never know, out in the fields.' },
  treasure: { ico: '🐕', name: 'Here Comes Rusty!', desc: 'He\'s got something in his mouth…' },
};

function showMap() {
  music.play(`map${run.act}`);
  saveRun();
  const s = screen(actCls());
  const info = R.ACT_INFO[run.act];
  s.appendChild(el('h2', '', `${info.emoji} Act ${run.act}: ${info.name}`));
  s.appendChild(el('div', 'floor-meter', `Floor ${run.floor} / ${R.FLOORS_PER_ACT} · ❤️ ${run.hp}/${run.maxHp} · 💰 ${run.gold}`));
  const shelf = el('div', 'relic-shelf');
  for (const rid of run.relics) shelf.appendChild(el('span', 'relic-pin', `${RELICS[rid].emoji}`));
  s.appendChild(shelf);
  s.appendChild(el('p', 'subtitle', 'Pick your next stop:'));
  for (const opt of R.floorOptions(run)) {
    const meta = NODE_META[opt.type];
    const node = el('div', 'map-node', `<div class="ico">${meta.ico}</div><div><h3>${meta.name}</h3><p>${meta.desc}</p></div>`);
    node.onclick = () => { sfx.tap(); enterNode(R.chooseFloor(run, opt)); };
    s.appendChild(node);
  }
  const deckBtn = el('button', 'btn secondary', `🎴 My Deck (${run.deck.length})`);
  deckBtn.onclick = () => showDeckModal(run.deck);
  s.appendChild(deckBtn);
  const menuBtn = el('button', 'btn secondary', '⚙️');
  menuBtn.onclick = showSettings;
  s.appendChild(menuBtn);
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

function renderCombat() {
  const s = screen(actCls());
  s.classList.add('combat');
  const st = combat;

  // enemies
  const row = el('div', 'enemy-row');
  for (const e of st.enemies) {
    if (e.gone || e.fled) continue;
    const dead = e.hp <= 0;
    const d = el('div', `enemy${dead ? ' dead' : ''}`);
    d.innerHTML = `<div class="face">${e.emoji}</div><div class="nm">${e.name}</div>
      <div class="hpbar"><div style="width:${Math.max(0, e.hp / e.maxHp * 100)}%"></div></div>
      <div class="hpnum">❤️ ${Math.max(0, e.hp)}/${e.maxHp}</div>
      <div class="chips">${statusChips(e)}</div>
      ${dead ? '' : intentLabel(st, e)}`;
    if (!dead && selectedCard && cardWantsTarget(selectedCard)) {
      d.classList.add('targetable');
      d.onclick = () => playSelected(e);
    }
    row.appendChild(d);
  }
  s.appendChild(row);

  // hero strip
  const h = st.hero;
  const hero = HEROES[run.hero];
  const strip = el('div', 'hero-strip');
  strip.innerHTML = `<div class="face">${hero.emoji}</div>
    <div class="stats"><b>${hero.name}</b>
      <div class="hpbar"><div style="width:${h.hp / h.maxHp * 100}%"></div></div>
      <div class="hpnum">❤️ ${h.hp}/${h.maxHp} ${h.block ? `· 🛡️ ${h.block}` : ''}</div>
      <div class="chips">${statusChips(h)}</div></div>
    <div class="energy-orb">${h.energy}<small>⚡</small></div>`;
  s.appendChild(strip);

  // snacks
  if (st.snacks.length) {
    const bar = el('div', 'snackbar');
    st.snacks.forEach((id, i) => {
      const b = el('button', 'snack', C.SNACKS[id].emoji);
      b.title = C.SNACKS[id].name;
      b.onclick = () => { sfx.heal(); C.useSnack(st, i); afterAction(); };
      bar.appendChild(b);
    });
    s.appendChild(bar);
  }

  // hand
  const hand = el('div', 'hand');
  for (const c of st.hand) {
    const info = cardInfo(c);
    const cost = C.effectiveCost(st, c);
    const afford = C.canPlay(st, c);
    const d = el('div', `card type-${info.type}${c === selectedCard ? ' selected' : ''}${afford ? '' : ' unaffordable'}${info.upgraded ? ' upgraded' : ''}`);
    d.innerHTML = `${cost === null ? '' : `<div class="cost">${cost === 'X' ? 'X' : cost}</div>`}
      <div class="art">${info.emoji}</div><div class="cnm">${info.name}</div><div class="ctx">${renderCardText(info)}</div>`;
    d.onclick = () => onCardTap(c);
    hand.appendChild(d);
  }
  s.appendChild(hand);

  // bottom bar
  const bottom = el('div', 'combat-bottom');
  const drawB = el('button', 'pilebtn', `🎴 ${st.draw.length}`);
  drawB.onclick = () => showDeckModal(st.draw, 'Draw pile (shuffled)');
  const discB = el('button', 'pilebtn', `🗑️ ${st.discard.length}`);
  discB.onclick = () => showDeckModal(st.discard, 'Discard pile');
  const endB = el('button', 'endturn', 'END TURN ▶');
  endB.onclick = () => { sfx.turn(); selectedCard = null; C.endTurn(combat); afterAction(); };
  bottom.append(drawB, discB, endB);
  s.appendChild(bottom);

  if (st.pendingDiscard > 0) promptDiscard();
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

function onCardTap(c) {
  if (!C.canPlay(combat, c)) { sfx.tap(); return; }
  if (cardWantsTarget(c)) {
    selectedCard = (selectedCard === c) ? null : c;
    renderCombat();
    return;
  }
  selectedCard = null;
  sfx.play();
  const target = C.livingEnemies(combat)[0];
  C.playCard(combat, c, target);
  afterAction();
}

function playSelected(enemy) {
  const c = selectedCard;
  selectedCard = null;
  sfx.attack();
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
  }
  if (rewards.snack && run.snacks.length < run.snackSlots) {
    run.snacks.push(rewards.snack);
    s.appendChild(el('p', 'subtitle', `${C.SNACKS[rewards.snack].emoji} Found a snack: ${C.SNACKS[rewards.snack].name}`));
  }
  if (rewards.cards.length) {
    s.appendChild(el('p', 'subtitle', '<b>Pick a new card:</b>'));
    const row = el('div', 'reward-row');
    for (const id of rewards.cards) {
      const info = cardInfo(makeCard(id));
      const d = el('div', 'reward-card', `<div class="art" style="font-size:1.8rem">${info.emoji}</div><b style="font-size:.85rem">${info.name}</b><div class="ctx" style="font-size:.68rem">${staticCardText(id)}</div>`);
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
  s.appendChild(el('div', 'event-emoji', '🛒'));
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
  s.appendChild(el('div', 'event-emoji', '🍪'));
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
  s.appendChild(el('div', 'event-emoji', ev.emoji));
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
  s.appendChild(el('div', 'event-emoji', '🐕'));
  s.appendChild(el('h2', '', 'Here comes Rusty!'));
  if (relicId) {
    const rl = RELICS[relicId];
    R.onRelicGained(run, relicId);
    s.appendChild(el('div', 'speaker-line', `He trots up, tail wagging, something in his mouth. …It's ${rl.emoji} <b>${rl.name}</b>!<br><i>${rl.text}</i>`));
    sfx.relic();
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
  clearSave();
  const s = screen('plain');
  s.appendChild(el('div', 'event-emoji', '🌧️'));
  s.appendChild(el('h2', '', 'The farm needs you to rest up…'));
  s.appendChild(el('div', 'speaker-line', `"Hey. Even legends have tough days. The farm's still standing — because you were out there. Same time tomorrow?" — Coach James`));
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
  s.appendChild(el('div', 'speaker-line',
    heroId === 'wyatt'
      ? '"The Big Twister itself couldn\'t catch him. WYATT THE SPEEDY — Legend of Rolfe!" 🌪️⚡'
      : '"He looked the Big Twister dead in the eye — and the twister blinked. AARON THE STRONG — the Lil Tornado himself!" 🌪️💪'));
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
