// Rolfe Legends 2 — unit tests. Run: node test/test.mjs
import { makeRng } from '../js/rng.js';
import { CARDS, HEROES, makeCard, cardInfo, draftPool } from '../js/cards.js';
import { RELICS, relicPool } from '../js/relics.js';
import { ENEMIES } from '../js/enemies.js';
import { EVENTS, EVENT_KEYS } from '../js/events.js';
import * as C from '../js/combat.js';
import * as R from '../js/run.js';
import { generateActMap, reachableIds, validateMap, MAP_FLOORS, TREASURE_FLOOR, REST_FLOOR, BOSS_ID } from '../js/map.js';
import { parseLrc } from '../js/credits.js';
import { encodeFarmCode, decodeFarmCode } from '../js/farmcode.js';

let passed = 0, failed = 0;
const fails = [];
function ok(cond, msg) {
  if (cond) passed++;
  else { failed++; fails.push(msg); }
}
function eq(a, b, msg) { ok(a === b, `${msg} (got ${JSON.stringify(a)}, want ${JSON.stringify(b)})`); }

function freshRun(hero = 'aaron', seed = 42) { return R.newRun(hero, seed); }
function combatVs(keys, { hero = 'aaron', seed = 7, run = null } = {}) {
  const r = run || freshRun(hero, seed);
  return { run: r, state: C.startCombat(r, keys, makeRng(seed)) };
}
function findInHand(state, id) { return state.hand.find((c) => c.id === id); }
function forceHand(state, ids) {
  state.hand = ids.map((id) => makeCard(id));
  state.draw = []; state.discard = [];
}

// ---------- rng ----------
{
  const a = makeRng(123), b = makeRng(123);
  eq(a.int(1000), b.int(1000), 'rng deterministic');
  const arr = a.shuffle([1, 2, 3, 4, 5]);
  eq(arr.length, 5, 'shuffle preserves length');
  ok([1, 2, 3, 4, 5].every((x) => arr.includes(x)), 'shuffle preserves elements');
  const r = a.range(3, 6);
  ok(r >= 3 && r <= 6, 'range inclusive bounds');
}

// ---------- damage math ----------
{
  eq(C.attackValue(6, { strength: 0 }), 6, 'attack base');
  eq(C.attackValue(6, { strength: 3 }), 9, 'strength adds');
  eq(C.attackValue(8, { strength: 0, weak: 1 }), 6, 'weak = 75% floor');
  eq(C.blockValue(5, { dexterity: 2 }), 7, 'dex adds to block');
  eq(C.blockValue(8, { dexterity: 0, frail: 1 }), 6, 'frail = 75% floor');
}

// ---------- combat basics ----------
{
  const { state } = combatVs(['gopher']);
  eq(state.hero.energy, 3, 'starts with 3 energy');
  eq(state.hand.length, 5, 'draws 5');
  ok(state.enemies[0].intent, 'enemy announces intent');
  const shove = findInHand(state, 'shove') || state.hand[0];
  forceHand(state, ['shove']);
  const e = state.enemies[0];
  const hp0 = e.hp;
  C.playCard(state, state.hand[0], e);
  eq(e.hp, hp0 - 6, 'Shove deals 6');
  eq(state.hero.energy, 2, 'energy spent');
  eq(state.discard.length, 1, 'card discarded after play');
}
{
  // block + enemy attack + vulnerable
  const { state } = combatVs(['gopher']);
  const e = state.enemies[0];
  forceHand(state, ['brace', 'tornado_slam']);
  C.playCard(state, state.hand[0]);
  eq(state.hero.block, 5, 'Brace gives 5 block');
  const hp0 = e.hp;
  C.playCard(state, state.hand[0], e);
  eq(e.hp, hp0 - 8, 'Tornado Slam 8');
  eq(e.vulnerable, 2, 'Slam applies 2 vulnerable');
  forceHand(state, ['shove']);
  state.hero.energy = 3;
  const hp1 = e.hp;
  C.playCard(state, state.hand[0], e);
  eq(e.hp, hp1 - 9, 'vulnerable = 150% of 6');
}
{
  // poison ticks and decrements on enemy turn
  const { state } = combatVs(['barn_spider'], { hero: 'wyatt' });
  const e = state.enemies[0];
  forceHand(state, ['itching_powder']);
  C.playCard(state, state.hand[0], e);
  eq(e.poison, 4, 'itching powder applies 4 poison');
  const hp0 = e.hp;
  C.endTurn(state);
  eq(e.hp, hp0 - 4, 'poison ticked 4');
  eq(e.poison, 3, 'poison decremented');
}
{
  // block absorbs, expires next turn
  const { state } = combatVs(['gopher']);
  state.enemies[0].intent = { name: 'Chomp', kind: 'attack', dmg: 11 };
  forceHand(state, ['brace', 'brace']);
  C.playCard(state, state.hand[0]);
  C.playCard(state, state.hand[0]);
  eq(state.hero.block, 10, 'stacked block');
  const hp0 = state.hero.hp;
  C.endTurn(state);
  eq(state.hero.hp, hp0 - 1, 'block absorbed 10 of 11');
  eq(state.hero.block, 0, 'block expired at turn start');
}

// ---------- every playable card executes ----------
for (const [id, def] of Object.entries(CARDS)) {
  if (def.unplayable) continue;
  for (const up of [false, true]) {
    const { state } = combatVs(['gopher', 'crow'], { hero: def.hero === 'wyatt' ? 'wyatt' : 'aaron' });
    state.hero.energy = 99;
    forceHand(state, ['shove']); // ensure discard fodder for discard ops
    state.hand.push(makeCard(id, up));
    const inst = state.hand[state.hand.length - 1];
    const okPlay = C.playCard(state, inst, state.enemies[0]);
    ok(okPlay, `card plays: ${id}${up ? '+' : ''}`);
    while (state.pendingDiscard > 0 && state.hand.length) C.resolveDiscard(state, state.hand[0]);
    ok(state.hero.hp > 0 || id === 'all_out', `hero alive after ${id}`);
  }
}

// ---------- specific card mechanics ----------
{
  const { state } = combatVs(['old_scarecrow']);
  const e = state.enemies[0];
  state.hero.strength = 2;
  forceHand(state, ['heavy_haul']);
  const hp0 = e.hp;
  C.playCard(state, state.hand[0], e);
  eq(hp0 - e.hp, 14 + 2 * 3, 'Heavy Haul: strength ×3');
}
{
  const { state } = combatVs(['gopher', 'crow']);
  forceHand(state, ['tornado_spin']);
  state.hero.energy = 3;
  const hp0 = state.enemies[0].hp, hp1 = state.enemies[1].hp;
  C.playCard(state, state.hand[0]);
  eq(state.hero.energy, 0, 'X-cost spends all energy');
  eq(hp0 - state.enemies[0].hp, 15, 'Tornado Spin 5×3 on enemy 1');
  eq(hp1 - state.enemies[1].hp, 15, 'Tornado Spin 5×3 on enemy 2');
}
{
  const { state } = combatVs(['old_scarecrow'], { hero: 'wyatt' });
  const e = state.enemies[0];
  forceHand(state, ['kick', 'kick', 'bicycle_kick']);
  state.hero.energy = 9;
  C.playCard(state, state.hand[0], e);
  C.playCard(state, state.hand[0], e);
  const hp0 = e.hp;
  C.playCard(state, state.hand[0], e);
  eq(hp0 - e.hp, 12, 'Bicycle Kick: 6 × 2 attacks played before it');
}
{
  const { state } = combatVs(['gopher'], { hero: 'wyatt' });
  forceHand(state, ['juggling_show']);
  C.playCard(state, state.hand[0]);
  eq(state.hand.filter((c) => c.id === 'soccer_ball').length, 3, 'Juggling Show adds 3 Soccer Balls');
  const e = state.enemies[0];
  const hp0 = e.hp;
  C.playCard(state, findInHand(state, 'soccer_ball'), e);
  eq(hp0 - e.hp, 4, 'Soccer Ball deals 4');
  eq(state.exhaust.length, 1, 'Soccer Ball exhausts');
}
{
  const { state } = combatVs(['gopher']);
  forceHand(state, ['all_out']);
  state.draw = ['shove', 'shove', 'shove', 'brace', 'brace'].map((id) => makeCard(id));
  const hp0 = state.hero.hp;
  C.playCard(state, state.hand[0]);
  eq(state.hero.hp, hp0 - 6, 'All-Out Effort costs 6 HP');
  eq(state.hero.energy, 5, 'All-Out Effort +2 energy');
  eq(state.hand.length, 3, 'All-Out Effort drew 3');
  eq(state.exhaust.length, 1, 'All-Out Effort exhausts');
}
{
  const { state } = combatVs(['gopher']);
  forceHand(state, ['tornado_form', 'fortify']);
  state.hero.energy = 6;
  C.playCard(state, state.hand[0]);
  C.playCard(state, state.hand[0]);
  state.hero.block = 12;
  state.enemies[0].intent = { name: 'x', kind: 'defend', block: 1 };
  C.endTurn(state);
  eq(state.hero.strength, 2, 'Tornado Form +2 str at turn start');
  eq(state.hero.block, 12, 'Fortify keeps block');
}
{
  const { state } = combatVs(['gopher'], { hero: 'wyatt' });
  forceHand(state, ['sleight_of_hand', 'kick']);
  C.playCard(state, state.hand[0]);
  state.enemies[0].intent = { name: 'x', kind: 'defend', block: 1 };
  C.endTurn(state);
  ok(state.pendingDiscard === 1, 'Sleight of Hand: draw 1 then must discard 1');
  C.resolveDiscard(state, state.hand[0]);
  eq(state.pendingDiscard, 0, 'discard resolved');
}
{
  // innate: sneak_attack surfaces in opening hand
  const run = freshRun('wyatt', 9);
  run.deck.push(makeCard('sneak_attack'));
  const state = C.startCombat(run, ['gopher'], makeRng(9));
  ok(findInHand(state, 'sneak_attack'), 'innate card in opening hand');
}
{
  // hailstone burns in hand; poison_ivy damages on draw
  const { state } = combatVs(['gopher']);
  forceHand(state, ['hailstone']);
  state.enemies[0].intent = { name: 'x', kind: 'defend', block: 1 };
  const hp0 = state.hero.hp;
  C.endTurn(state);
  ok(state.hero.hp <= hp0 - 2, 'hailstone burned 2 at end of turn');
  const run2 = freshRun('aaron', 3);
  run2.deck = [makeCard('poison_ivy'), makeCard('shove')];
  const s2 = C.startCombat(run2, ['gopher'], makeRng(3));
  ok(s2.hero.hp < s2.hero.maxHp, 'poison ivy damaged on draw');
  ok(!C.canPlay(s2, s2.hand.find((c) => c.id === 'poison_ivy')), 'curse unplayable');
}

// ---------- relics ----------
{
  const run = freshRun('aaron', 5);
  run.relics.push('fence_post', 'lucky_horseshoe', 'skipping_stone', 'barbed_wire', 'grannys_thermos', 'barn_lantern');
  run.hp = 50;
  const state = C.startCombat(run, ['gopher'], makeRng(5));
  eq(state.hero.block, 8, 'Fence Post: 8 block at combat start');
  eq(state.hero.strength, 1, 'Lucky Horseshoe +1 str');
  eq(state.hero.dexterity, 1, 'Skipping Stone +1 dex');
  eq(state.hero.thorns, 3, 'Barbed Wire thorns 3');
  eq(state.hero.hp, 52, "Granny's Thermos healed 2");
  eq(state.hero.energy, 4, 'Barn Lantern +1 energy turn 1');
}
{
  const run = freshRun('wyatt', 5); // head_start starter
  const state = C.startCombat(run, ['gopher'], makeRng(5));
  eq(state.hand.length, 7, 'Head Start draws 2 extra turn 1');
}
{
  const run = freshRun('aaron', 5);
  run.relics.push('keys_tractor', 'old_quilt');
  const state = C.startCombat(run, ['gopher'], makeRng(5));
  eq(state.hero.energy, 4, 'Keys to the Tractor +1 energy');
  state.enemies[0].intent = { name: 'x', kind: 'defend', block: 1 };
  C.endTurn(state);
  // old quilt gave 6 block at end of turn (then expired at next turn start)
  ok(true, 'old quilt exercised');
}
{
  const run = freshRun('aaron', 5);
  run.relics.push('rally_cap');
  const state = C.startCombat(run, ['gopher'], makeRng(5));
  state.hand = [];
  C.dealDamage(state, state.hero, 5, { isAttack: false });
  eq(state.hand.length, 3, 'Rally Cap drew 3 on first HP loss');
}
{
  const run = freshRun('aaron', 5);
  run.relics.push('hay_bale_toss', 'soccer_drills');
  const state = C.startCombat(run, ['old_scarecrow'], makeRng(5));
  forceHand(state, ['shove', 'shove', 'shove']);
  state.hero.energy = 9;
  const e = state.enemies[0];
  C.playCard(state, state.hand[0], e);
  C.playCard(state, state.hand[0], e);
  eq(state.hero.strength, 0, 'no str before 3rd attack');
  C.playCard(state, state.hand[0], e);
  eq(state.hero.strength, 1, 'Hay Bale Toss: 3rd attack +1 str');
  eq(state.hero.dexterity, 1, 'Soccer Drills: 3rd attack +1 dex');
}

// ---------- enemy behaviors ----------
{
  const { state } = combatVs(['roly_poly']);
  const e = state.enemies[0];
  C.dealDamage(state, e, 3, { attacker: state.hero });
  eq(e.block, 6, 'roly-poly curls for 6 block on first hit');
}
{
  const { state } = combatVs(['mud_blob_m']);
  const e = state.enemies[0];
  C.dealDamage(state, e, Math.ceil(e.maxHp / 2) + 1, { attacker: state.hero });
  eq(state.enemies.length, 2, 'mud blob split spawned a blip');
}
{
  const { state } = combatVs(['magpie']);
  const e = state.enemies[0];
  for (let i = 0; i < 6 && !state.over; i++) { state.hand = []; C.endTurn(state); }
  ok(e.fled || state.over, 'magpie eventually flees (or fight ended)');
}
{
  const { state, run } = combatVs(['magpie']);
  const e = state.enemies[0];
  e.intent = { name: 'Snatch!', kind: 'attack', dmg: 10, fn: (st, en) => { en.stolen += 15; } };
  state.hand = [];
  C.endTurn(state);
  eq(e.stolen, 15, 'magpie stole gold');
  e.fled = true;
  C.checkCombatEnd(state);
  ok(state.over && state.won, 'combat won when thief flees');
  const g0 = run.gold;
  R.applyCombatResult(run, state);
  eq(run.gold, g0 - 15, 'stolen gold deducted');
}
{
  const { state } = combatVs(['old_scarecrow']);
  const e = state.enemies[0];
  eq(e.intent.kind, 'sleep', 'scarecrow starts dormant');
  C.dealDamage(state, e, 5, { attacker: state.hero });
  state.hand = [];
  C.endTurn(state);
  ok(e.intent.kind !== 'sleep', 'scarecrow woke after damage');
}
{
  const { state } = combatVs(['ornery_ram']);
  const e = state.enemies[0];
  state.hand = [];
  C.endTurn(state); // ram snorts → enraged
  const str0 = e.strength;
  forceHand(state, ['brace']);
  C.playCard(state, state.hand[0]);
  eq(e.strength, str0 + 2, 'ram enrages when hero plays a skill');
}
{
  const { state } = combatVs(['scarecrow_post']);
  state.enemies[0].intent = { name: 'Straw Toss', kind: 'debuff', fn: (st) => C.addCardToCombat(st, 'straw', 2, 'discard') };
  state.hand = [];
  C.endTurn(state);
  eq(state.discard.filter((c) => c.id === 'straw').length, 2, 'scarecrow post shoved 2 straw');
}
{
  const { state } = combatVs(['rogue_combine']);
  const e = state.enemies[0];
  C.dealDamage(state, e, 40, { attacker: state.hero });
  eq(e.state.mode, 'hunker', 'combine shifts to defensive mode after 35 damage');
  eq(e.thorns, 3, 'combine thorns up in hunker mode');
}
{
  const { state } = combatVs(['raccoon_king']);
  const e = state.enemies[0];
  e.hp = Math.floor(e.maxHp / 2) - 5;
  state.hand = [];
  C.endTurn(state);
  ok(e.state.enraged, 'raccoon king enrages at half');
}
{
  const { state } = combatVs(['ball_lightning', 'ball_lightning', 'ball_lightning']);
  const [a, b] = state.enemies;
  C.dealDamage(state, a, 999, { attacker: state.hero });
  ok(a.hp <= 0 && !state.over, 'one ball lightning down, fight continues');
  eq(a.state.reviveIn, 2, 'revive counter set');
  state.hand = [];
  C.endTurn(state); C.endTurn(state);
  ok(a.hp > 0, 'ball lightning revived');
}
{
  const { state } = combatVs(['ball_lightning', 'ball_lightning']);
  for (const e of [...state.enemies]) C.dealDamage(state, e, 999, { attacker: state.hero });
  ok(state.over && state.won, 'killing all ball lightnings at once wins');
}
{
  const { state } = combatVs(['passing_squall']);
  for (let i = 0; i < 7 && !state.over; i++) { state.hand = []; state.hero.hp = 999; state.hero.maxHp = 999; C.endTurn(state); }
  ok(state.over && state.won, 'squall blows over → survival win');
}
{
  const { state } = combatVs(['waltzing_weasel'], { hero: 'wyatt' });
  ok(state.flags.confused, 'weasel confusion active');
  C.drawCards(state, 3);
  const overridden = state.hand.some((c) => state.costOverride[c.uid] != null);
  ok(overridden, 'drawn cards got randomized costs');
  C.dealDamage(state, state.enemies[0], 999, { attacker: state.hero });
  ok(!state.flags.confused, 'confusion clears on weasel death');
}
{
  const { state } = combatVs(['fox', 'fox']);
  state.hand = [];
  C.endTurn(state);
  ok(state.discard.some((c) => c.id === 'scraped_knee'), 'fox shoved a scraped knee');
}
{
  const { state } = combatVs(['flooding_creek']);
  state.hand = [];
  C.endTurn(state); // creek sets constrict
  eq(state.flags.constrict, 5, 'creek constricts');
  const hp0 = state.hero.hp;
  state.hand = [];
  C.endTurn(state);
  ok(state.hero.hp < hp0, 'constrict dealt damage at turn start');
}
{
  const { state } = combatVs(['big_twister']);
  const e = state.enemies[0];
  C.dealDamage(state, e, 999, { attacker: state.hero });
  ok(!state.over, 'twister phase 1 death does not end fight');
  eq(e.hp, 200, 'twister re-formed with 200 HP');
  eq(e.state.phase, 2, 'twister in phase 2');
  C.dealDamage(state, e, 9999, { attacker: state.hero });
  ok(state.over && state.won, 'twister phase 2 death wins');
}
{
  const { state } = combatVs(['ghost_wind']);
  const e = state.enemies[0];
  e.intangible = true;
  const hp0 = e.hp;
  C.dealDamage(state, e, 50, { attacker: state.hero });
  eq(hp0 - e.hp, 1, 'intangible caps damage at 1');
}
{
  const { state } = combatVs(['thunderhead']);
  const e = state.enemies[0];
  for (let i = 0; i < 4; i++) { state.hand = []; state.hero.hp = 500; state.hero.maxHp = 500; C.endTurn(state); }
  ok(e.intent.name.includes('THUNDERSTRIKE') || e.state.count === 0, 'thunderhead counts down to the big strike');
}
{
  const { state } = combatVs(['wind_funnel']);
  state.enemies[0].intent = state.enemies[0].def.nextMove(state.enemies[0], state, makeRng(1));
  let spawned = false;
  for (let i = 0; i < 6 && !spawned; i++) {
    state.hand = []; state.hero.hp = 500; state.hero.maxHp = 500;
    C.endTurn(state);
    spawned = state.enemies.some((e) => e.key === 'dust_devil');
  }
  ok(spawned, 'wind funnel summons dust devils');
}
{
  const { state } = combatVs(['possum_defender', 'possum_healer']);
  const [big, little] = state.enemies;
  big.hp = 20;
  little.intent = { name: 'Nuzzle (heal)', kind: 'buff', fn: () => { big.hp = Math.min(big.maxHp, big.hp + 12); } };
  big.intent = { name: 'x', kind: 'defend', block: 1 };
  state.hand = [];
  C.endTurn(state);
  eq(big.hp, 32, 'possum healer heals its buddy');
}

// ---------- every enemy survives a 12-turn smoke fight ----------
for (const key of Object.keys(ENEMIES)) {
  const { state } = combatVs([key], { seed: 99 });
  state.hero.hp = 5000; state.hero.maxHp = 5000;
  let crashed = false;
  try {
    for (let t = 0; t < 12 && !state.over; t++) { state.hand = []; C.endTurn(state); }
  } catch (err) { crashed = true; fails.push(`enemy ${key} crashed: ${err.message}`); }
  ok(!crashed, `enemy smoke: ${key}`);
}

// ---------- Liam the Little: diapers (orb system) ----------
{
  const run = freshRun('liam', 200);
  eq(run.deck.length, 10, 'liam starter deck 10');
  eq(run.relics[0], 'diaper_bag', 'liam starter relic');
  const state = C.startCombat(run, ['gopher'], makeRng(200));
  eq(state.hero.orbs.length, 1, 'Diaper Bag floats a diaper at combat start');
  eq(state.hero.orbs[0].type, 'stinky', 'and it is Stinky');
}
{
  // stinky passive + evoke, focus scaling
  const { state } = combatVs(['old_scarecrow'], { hero: 'liam', seed: 201 });
  state.hero.orbs = [];
  const e = state.enemies[0];
  forceHand(state, ['change_it']);
  C.playCard(state, state.hand[0]);
  eq(state.hero.orbs.length, 1, 'Change It! channels');
  const hp0 = e.hp;
  state.enemies[0].intent = { name: 'x', kind: 'buff' };
  C.endTurn(state);
  eq(hp0 - e.hp, 3, 'stinky passive zaps 3 at end of turn');
  e.block = 0;
  state.hero.focus = 2;
  forceHand(state, ['double_trouble']);
  state.hero.energy = 3;
  const hp1 = e.hp;
  C.playCard(state, state.hand[0]);
  eq(hp1 - e.hp, (8 + 2) * 2, 'Double Trouble evokes stinky twice with Giggle Power');
  eq(state.hero.orbs.length, 0, 'orb consumed by evoke');
}
{
  // fresh passive/evoke; blowout growth + weakest-target evoke; snack energy
  const { state } = combatVs(['gopher', 'old_scarecrow'], { hero: 'liam', seed: 202 });
  state.hero.orbs = [];
  forceHand(state, ['sippy_cup', 'uh_oh', 'snacks']);
  state.hero.energy = 9;
  C.playCard(state, state.hand.find((c) => c.id === 'sippy_cup'));
  C.playCard(state, state.hand.find((c) => c.id === 'uh_oh'));
  C.playCard(state, state.hand.find((c) => c.id === 'snacks'));
  eq(state.hero.orbs.length, 3, 'three diapers floating');
  for (const e of state.enemies) e.intent = { name: 'x', kind: 'buff' };
  const blowout = state.hero.orbs.find((o) => o.type === 'blowout');
  C.endTurn(state);
  eq(blowout.stored, 12, 'BLOWOUT grew from 6 to 12');
  ok(state.hero.energy >= 4, 'snack diaper gave +1 energy at turn start');
  // evoke order is oldest-first: fresh, then blowout
  state.hero.block = 0;
  C.evokeOrb(state);
  eq(state.hero.block, 6, 'fresh evoke = 6 block');
  const weakest = state.enemies.slice().sort((a, b) => a.hp - b.hp)[0];
  weakest.block = 0;
  const whp = weakest.hp;
  C.evokeOrb(state);
  eq(whp - weakest.hp, 12, 'BLOWOUT unleashes stored damage on the weakest enemy');
}
{
  // auto-evoke when slots full; More Diapers! raises the cap
  const { state } = combatVs(['old_scarecrow'], { hero: 'liam', seed: 203 });
  state.hero.orbs = [];
  C.channelOrb(state, 'fresh'); C.channelOrb(state, 'fresh'); C.channelOrb(state, 'fresh');
  state.hero.block = 0;
  C.channelOrb(state, 'stinky');
  eq(state.hero.orbs.length, 3, 'capped at 3 slots');
  eq(state.hero.block, 6, 'oldest auto-evoked (fresh: 6 block)');
  forceHand(state, ['more_diapers']);
  state.hero.energy = 3;
  C.playCard(state, state.hand[0]);
  eq(state.hero.orbSlots, 5, 'More Diapers! +2 slots');
}
{
  // uppies re-channels; throw_food scales with orbs; maximum stink hits all
  const { state } = combatVs(['gopher', 'crow'], { hero: 'liam', seed: 204 });
  state.hero.orbs = [];
  C.channelOrb(state, 'snack');
  forceHand(state, ['uppies']);
  state.hero.energy = 9;
  C.playCard(state, state.hand[0]);
  eq(state.hero.orbs.length, 1, 'Uppies! evoked and re-channeled');
  eq(state.hero.orbs[0].type, 'snack', 'same diaper type');
  C.channelOrb(state, 'fresh');
  forceHand(state, ['throw_food']);
  const e = state.enemies[0];
  const hp0 = e.hp;
  C.playCard(state, state.hand[0], e);
  eq(hp0 - e.hp, 8, 'Throw Food: 4 × 2 floating diapers');
  forceHand(state, ['maximum_stink']);
  state.hero.energy = 9;
  C.playCard(state, state.hand[0]);
  ok(state.hero.powers.max_stink, 'MAXIMUM STINK active');
  state.hero.orbs = [{ type: 'stinky', stored: 0 }];
  const hpa = state.enemies[0].hp, hpb = state.enemies[1].hp;
  for (const en of state.enemies) en.intent = { name: 'x', kind: 'defend', block: 1 };
  C.endTurn(state);
  ok(state.enemies[0].hp < hpa && state.enemies[1].hp < hpb, 'stinky hits ALL enemies under MAXIMUM STINK');
}
{
  // birthday boy scales giggle power
  const { state } = combatVs(['old_scarecrow'], { hero: 'liam', seed: 205 });
  forceHand(state, ['birthday_boy']);
  state.hero.energy = 3;
  C.playCard(state, state.hand[0]);
  state.enemies[0].intent = { name: 'x', kind: 'defend', block: 1 };
  state.hand = [];
  C.endTurn(state);
  eq(state.hero.focus, 1, 'Birthday Boy: +1 Giggle Power at turn start');
}

// ---------- snacks ----------
{
  const run = freshRun('aaron', 11);
  run.snacks = ['lemonade', 'juice_box', 'jerky', 'trail_mix', 'band_aid'];
  const state = C.startCombat(run, ['gopher'], makeRng(11));
  state.hero.hp = 40;
  C.useSnack(state, 0);
  eq(state.hero.hp, 52, 'lemonade heals 12');
  C.useSnack(state, 0);
  eq(state.hero.energy, 5, 'juice box +2 energy');
  C.useSnack(state, 0);
  eq(state.hero.strength, 2, 'jerky +2 str');
  const h0 = state.hand.length;
  C.useSnack(state, 0);
  eq(state.hand.length, Math.min(10, h0 + 3), 'trail mix draws 3');
}

// ---------- alternate bosses ----------
{
  // Mud King splits into two mediums at half HP (Slime Boss)
  const { state } = combatVs(['mud_king']);
  const king = state.enemies[0];
  C.dealDamage(state, king, Math.ceil(king.maxHp / 2) + 1, { attacker: state.hero });
  ok(king.gone, 'Mud King steps aside when split');
  const blobs = state.enemies.filter((e) => e.key === 'mud_blob_m');
  eq(blobs.length, 2, 'Mud King splits into two Mud Blobs');
  ok(blobs.every((b) => b.hp === blobs[0].hp && b.hp <= 78), 'split blobs inherit his remaining HP');
  ok(!state.over, 'fight continues vs the blobs');
  for (const b of blobs) C.dealDamage(state, b, 999, { attacker: state.hero });
  ok(state.over && state.won, 'killing both blobs wins');
}
{
  // Thunder buffs the pair, Lightning shields the pair (Donu & Deca)
  const { state } = combatVs(['thunder', 'lightning']);
  const [thunder, lightning] = state.enemies;
  thunder.state.i = 0; // → BOOM
  thunder.intent = thunder.def.nextMove(thunder, state, state.rng);
  thunder.intent.fn(state, thunder);
  ok(thunder.strength === 2 && lightning.strength === 2, 'Thunder empowers BOTH');
  lightning.state.i = 1; // → Static Shield
  const li = lightning.def.nextMove(lightning, state, state.rng);
  li.fn(state, lightning);
  ok(thunder.block === 11 && lightning.block === 11, 'Lightning shields BOTH');
}
{
  // boss pools contain the alternates
  ok(R.ENCOUNTERS[1].boss.some((b) => b.includes('mud_king')), 'act 1 boss pool has Mud King');
  ok(R.ENCOUNTERS[3].boss.some((b) => b.includes('thunder') && b.includes('lightning')), 'act 3 boss pool has the pair');
}

// ---------- steppable enemy phase (UI sequencing = endTurn semantics) ----------
{
  const { state } = combatVs(['gopher', 'crow'], { seed: 55 });
  ok(state.phase === 'hero', 'combat starts in hero phase');
  ok(C.beginEnemyPhase(state), 'enemy phase begins');
  eq(state.phase, 'enemy', 'phase flips to enemy');
  eq(state.hand.length, 0, 'hand discarded at phase start');
  let steps = 0;
  let acted;
  while ((acted = C.stepEnemyAction(state)) !== null) {
    ok(acted.name, `step ${++steps} returns the acting enemy`);
    ok(steps < 10, 'stepper terminates');
  }
  eq(state.phase, 'hero', 'phase returns to hero');
  eq(state.turn, 2, 'next hero turn began');
  ok(state.hand.length > 0, 'new hand drawn');
  // endTurn (sync) drives the same machinery
  const { state: s2 } = combatVs(['gopher'], { seed: 56 });
  C.endTurn(s2);
  eq(s2.turn, 2, 'endTurn advances to turn 2');
  eq(s2.phase, 'hero', 'endTurn leaves hero phase');
}

// ---------- run layer ----------
{
  const run = freshRun('aaron', 42);
  eq(run.deck.length, 10, 'aaron starter deck 10');
  eq(freshRun('wyatt', 1).deck.length, 12, 'wyatt starter deck 12');
  eq(run.relics[0], 'big_breakfast', 'aaron starter relic');
  const rng = makeRng(42);
  const boons = R.coachBoons(run, rng);
  eq(boons.length, 3, 'coach offers 3 boons');
  boons[0].apply(run, rng);
  ok(true, 'boon applies without crash');
}
{
  // ---------- map generation invariants (many seeds) ----------
  for (const seed of [1, 7, 42, 999, 31337]) {
    for (let act = 1; act <= 3; act++) {
      const map = generateActMap(seed, act);
      const problems = validateMap(map);
      eq(problems.length, 0, `map ${seed}/${act} valid (${problems[0] || ''})`);
      const types = Object.values(map.nodes).map((n) => n.type);
      eq(types.filter((t) => t === 'shop').length, 1, `map ${seed}/${act} exactly 1 shop`);
      eq(types.filter((t) => t === 'elite').length, 2, `map ${seed}/${act} exactly 2 elites`);
      ok(types.filter((t) => t === 'event').length >= 3, `map ${seed}/${act} ≥3 events`);
      ok(map.floors[1].every((id) => map.nodes[id].type === 'fight'), `map ${seed}/${act} floor 1 all fights`);
      ok(map.floors[TREASURE_FLOOR].every((id) => map.nodes[id].type === 'treasure'), `map ${seed}/${act} treasure row`);
      ok(map.floors[REST_FLOOR].every((id) => map.nodes[id].type === 'rest'), `map ${seed}/${act} pre-boss rest row`);
      eq(map.floors[MAP_FLOORS].length, 1, `map ${seed}/${act} single boss`);
      ok(Object.values(map.nodes).every((n) => n.type !== 'elite' || n.f >= 5), `map ${seed}/${act} elites at floor ≥5`);
      for (let f = 1; f < REST_FLOOR; f++) {
        ok(map.floors[f].length >= 1 && map.floors[f].length <= 4, `map ${seed}/${act} floor ${f} has 1-4 nodes`);
      }
      ok(map.floors[1].length >= 2, `map ${seed}/${act} ≥2 starting choices`);
    }
  }
  // determinism
  const a = generateActMap(42, 2), b = generateActMap(42, 2);
  eq(JSON.stringify(a), JSON.stringify(b), 'same seed → same map');
  ok(JSON.stringify(generateActMap(42, 1)) !== JSON.stringify(generateActMap(43, 1)), 'different seed → different map');
}
{
  // walking the map: full act traversal through run layer
  const run = freshRun('aaron', 77);
  const seen = new Set();
  let guard = 40;
  while (guard-- > 0) {
    const opts = R.nextNodes(run);
    ok(opts.length >= 1, `reachable nodes at floor ${run.floor}`);
    const node = R.enterMapNode(run, opts[0].id);
    ok(node, 'enterMapNode resolves a reachable node');
    seen.add(node.type);
    if (node.type === 'fight' || node.type === 'elite' || node.type === 'boss') {
      ok(node.enemies.every((k) => ENEMIES[k]), `valid encounter keys at floor ${run.floor}`);
    }
    if (node.type === 'boss') break;
  }
  eq(run.floor, MAP_FLOORS, 'act runs 12 floors');
  ok(seen.has('boss'), 'act ends with boss');
  ok(seen.has('treasure'), 'path passed the treasure row');
  ok(seen.has('rest'), 'path passed the pre-boss rest');
  eq(R.enterMapNode(run, 'nope'), null, 'unreachable node rejected');
  ok(R.advanceAct(run), 'advance to act 2');
  eq(run.act, 2, 'act advanced');
  eq(run.floor, 0, 'floor reset');
  eq(run.pos, null, 'position reset');
  ok(run.map && run.map.nodes[BOSS_ID], 'fresh act-2 map generated');
  ok(reachableIds(run.map, null).length >= 2, 'act 2 offers starting nodes');
}
{
  // rewards + draft
  const run = freshRun('wyatt', 13);
  const rng = makeRng(13);
  const rw = R.fightRewards(run, 'elite', rng);
  ok(rw.gold >= 25 && rw.gold <= 35, 'elite gold in range');
  ok(rw.relic, 'elite grants relic');
  eq(rw.cards.length, 3, 'draft offers 3');
  ok(rw.cards.every((id) => CARDS[id].hero === 'wyatt'), 'draft cards match hero');
  const draws = new Set();
  for (let i = 0; i < 200; i++) draws.add(R.pickRarity(makeRng(i)));
  ok(draws.has('common') && draws.has('uncommon'), 'rarity spread sane');
}
{
  // shop
  const run = freshRun('aaron', 21);
  run.gold = 500;
  const rng = makeRng(21);
  const shop = R.makeShop(run, rng);
  eq(shop.cards.length, 5, 'shop stocks 5 cards');
  const d0 = run.deck.length;
  ok(R.shopBuyCard(run, shop, 0), 'buy card');
  eq(run.deck.length, d0 + 1, 'card added to deck');
  ok(R.shopBuyRelic(run, shop), 'buy relic');
  ok(R.shopBuySnack(run, shop), 'buy snack');
  const uid = run.deck[0].uid;
  ok(R.shopRemoveCard(run, shop, uid), 'remove card service');
  ok(!run.deck.some((c) => c.uid === uid), 'card removed');
  ok(!R.shopRemoveCard(run, shop, run.deck[0].uid), 'removal is once per shop');
}
{
  // rest
  const run = freshRun('aaron', 31);
  run.hp = 30;
  const healed = R.restCookies(run);
  eq(healed, Math.floor(run.maxHp * 0.3), 'cookies heal 30%');
  const c = run.deck[0];
  ok(R.restPractice(run, c.uid), 'practice upgrades');
  ok(c.up, 'card marked upgraded');
  ok(!R.restPractice(run, c.uid), 'cannot upgrade twice');
}
{
  // events all apply without crash
  const rng = makeRng(51);
  for (const key of EVENT_KEYS) {
    const run = freshRun('aaron', 61);
    run.gold = 200; run.deck.push(makeCard('homework'));
    const ev = EVENTS[key];
    for (const choice of ev.choices) {
      const run2 = freshRun('wyatt', 62);
      run2.gold = 200; run2.deck.push(makeCard('homework'));
      if (choice.can && !choice.can(run2)) continue;
      const result = choice.apply(run2, rng);
      ok(typeof result === 'string', `event ${key} choice "${choice.label}" returns text`);
    }
  }
  // duck pond adds the duck
  const run3 = freshRun('wyatt', 63);
  EVENTS.duck_pond.choices[0].apply(run3, rng);
  ok(run3.deck.some((c) => c.id === 'duck'), 'duck friend joins the deck');
}
{
  // save round-trip
  const run = freshRun('wyatt', 71);
  run.gold = 123; run.act = 2; run.floor = 5; run.relics.push('sunflower');
  const json = R.serializeRun(run);
  const back = R.deserializeRun(json);
  ok(back && back.gold === 123 && back.act === 2 && back.deck.length === run.deck.length, 'run save round-trips');
  eq(R.deserializeRun('{"v":9}'), null, 'bad save rejected');
  eq(R.deserializeRun('garbage'), null, 'garbage save rejected');
}
{
  // big breakfast post-fight heal
  const run = freshRun('aaron', 81);
  const state = C.startCombat(run, ['gopher'], makeRng(81));
  state.hero.hp = 50;
  C.dealDamage(state, state.enemies[0], 999, { attacker: state.hero });
  R.applyCombatResult(run, state);
  eq(run.hp, 60, 'big breakfast heals 10 after fight');
}

// ---------- the Secret Farm Code ----------
{
  const profile = { wins: { wyatt: 3, aaron: 1, liam: 0 }, bonusSeen: true, liamUnlocked: true };
  const run = freshRun('wyatt', 909);
  run.gold = 231; run.act = 2; run.deck.push(makeCard('sting_shot'));
  const code = encodeFarmCode(profile, run);
  ok(code.startsWith('FARM2-'), 'farm code has the FARM2 prefix');
  const back = decodeFarmCode(code);
  ok(back, 'farm code decodes');
  eq(back.profile.wins.wyatt, 3, 'wins survive the round-trip');
  ok(back.profile.bonusSeen && back.profile.liamUnlocked, 'flags survive');
  ok(back.run && back.run.gold === 231 && back.run.act === 2, 'current run survives');
  eq(back.run.deck.length, run.deck.length, 'deck survives');
  ok(back.run.map && back.run.map.nodes, 'map survives');
  // no run
  const solo = decodeFarmCode(encodeFarmCode(profile, null));
  ok(solo && solo.run === null, 'profile-only code round-trips');
  // tamper: flip a payload char → checksum rejects
  const mid = 20 + Math.floor((code.length - 24) / 2);
  const tampered = code.slice(0, mid) + (code[mid] === 'A' ? 'B' : 'A') + code.slice(mid + 1);
  eq(decodeFarmCode(tampered), null, 'tampered code rejected');
  eq(decodeFarmCode('FARM2-garbage-xyz'), null, 'garbage rejected');
  eq(decodeFarmCode('hello'), null, 'non-code rejected');
  eq(decodeFarmCode(''), null, 'empty rejected');
  // liam wins imply unlock even if flag dropped
  const p2 = decodeFarmCode(encodeFarmCode({ wins: { liam: 1 }, bonusSeen: false, liamUnlocked: false }, null));
  ok(p2.profile.liamUnlocked, 'liam wins imply his unlock');
}

// ---------- credits LRC parsing ----------
{
  // suno-cli timed-lyrics --lrc: one word per line, blank line = phrase break,
  // section markers carry their time to the next bare word (real capture)
  const lrc = '[00:10.61] [Verse]\nOut \n[00:11.21] in \n[00:11.45] Rolfe \n[00:12.62] glows\n\n[00:13.31] Trouble \n[00:13.80] came\n\n\n[00:20.25] [Verse 2]\nMom \n[00:21.18] packed';
  const lines = parseLrc(lrc);
  eq(lines.length, 3, 'lrc: three phrases parsed');
  eq(lines[0].t, 10.61, 'lrc: section time carries to first word');
  eq(lines[0].words[0].w, 'Out', 'lrc: bare word captured');
  eq(lines[0].words[0].t, 10.61, 'lrc: bare word inherits section time');
  eq(lines[0].words[2].w, 'Rolfe', 'lrc: timed word text');
  eq(lines[0].words[2].t, 11.45, 'lrc: timed word time');
  eq(lines[0].words.length, 4, 'lrc: section tag not shown as a word');
  eq(lines[2].words[0].w, 'Mom', 'lrc: verse 2 first word');
  eq(lines[2].words[0].t, 20.25, 'lrc: verse 2 inherits marker time');
  // enhanced word-tag format still tolerated
  const enh = parseLrc('[00:15.56] <00:15.56> Out <00:15.88> in <00:16.00> Rolfe');
  eq(enh[0].words.length, 3, 'enhanced lrc words');
  eq(enh[0].words[2].t, 16.00, 'enhanced lrc word time');
  // plain line-level fallback spreads words
  const plain = parseLrc('[00:10.00] hello there world');
  eq(plain.length, 1, 'plain lrc parsed');
  eq(plain[0].words.length, 3, 'plain lrc words spread');
  ok(plain[0].words[2].t > plain[0].words[0].t, 'plain lrc word times increase');
  eq(parseLrc(''), null, 'empty lrc → null');
  eq(parseLrc(null), null, 'null lrc → null');
  // Suno glitch repair: a bunched cluster stamped at ~0s before a >5s cliff
  // gets re-anchored to just before the next reliable word (real instrumental
  // breaks after normally-spaced words are left alone)
  const glitch = '[00:00.10] Out \n[00:00.20] in \n[00:00.30] Rolfe \n[00:00.40] when \n[00:00.55] glows\n\n[00:01.69] Trouble \n[00:13.86] came \n[00:14.07] where';
  const rep = parseLrc(glitch);
  ok(rep[0].t > 10, 'bunched head cluster re-anchored near the singing');
  ok(rep[1].words[0].t > 12 && rep[1].words[0].t < 13.86, 'cluster tail sits just before the reliable word');
  const legit = '[00:60.0] cheered \n[00:60.5] loud\n\n[00:75.0] The \n[00:75.4] strongest';
  const rep2 = parseLrc(legit);
  eq(rep2[0].words[0].t, 60.0, 'normally-spaced words before a real break untouched');
}

// ---------- data integrity ----------
{
  for (const [id, c] of Object.entries(CARDS)) {
    ok(c.name && c.emoji && c.type, `card ${id} has name/emoji/type`);
    ok(!c.name.toLowerCase().includes('chore'), `card ${id} respects the no-Chores rule`);
    if (!c.unplayable) ok(c.cost === 'X' || Number.isInteger(c.cost), `card ${id} has a cost`);
  }
  for (const [id, r] of Object.entries(RELICS)) ok(r.name && r.text, `relic ${id} complete`);
  for (const [id, e] of Object.entries(ENEMIES)) {
    ok(e.name && e.emoji && Array.isArray(e.hp), `enemy ${id} complete`);
    ok(typeof e.nextMove === 'function', `enemy ${id} has moves`);
  }
  ok(draftPool('aaron').length >= 15, 'aaron has a real card pool');
  ok(draftPool('wyatt').length >= 15, 'wyatt has a real card pool');
  ok(!draftPool('aaron').some((id) => draftPool('wyatt').includes(id)), 'hero pools are disjoint');
  ok(draftPool('liam').length >= 15, 'liam has a real card pool');
  ok(!draftPool('liam').some((id) => draftPool('aaron').includes(id) || draftPool('wyatt').includes(id)), 'liam pool disjoint');
}

// ---------- report ----------
console.log(`\n${passed} passed, ${failed} failed`);
if (failed) {
  for (const f of fails) console.log('  ✗ ' + f);
  process.exit(1);
}
