// Rolfe Legends 2 — map events (family cameos). James-approved roster + draft
// dialogue lines (final lines get James's sign-off before ship — CLAUDE.md rule).
// Each event: { name, emoji, speaker, line, choices: [{label, can?(run), apply(run, rng) → result string}] }
// Pure: mutates the run object only; UI renders, selfplay picks.

import { relicPool } from './relics.js';
import { makeCard, CARDS } from './cards.js';

function heal(run, amount) {
  run.hp = Math.min(run.maxHp, run.hp + amount);
  return amount;
}
function gainRelic(run, rng) {
  const pool = relicPool(run.relics);
  if (!pool.length) return null;
  const id = rng.pick(pool);
  run.relics.push(id);
  return id;
}
function removableCards(run) {
  return run.deck.filter((c) => !['status', 'curse'].includes(CARDS[c.id].type));
}
function curses(run) {
  return run.deck.filter((c) => ['homework', 'poison_ivy'].includes(c.id));
}

export const EVENTS = {
  care_package: {
    name: "Mom's Care Package", emoji: '📦', speaker: 'Mom',
    line: '"You boys eating enough? Here. And WEAR your sunscreen."',
    choices: [
      { label: '🥪 The sandwich (heal 20% HP)', apply: (run) => `Healed ${heal(run, Math.floor(run.maxHp * 0.2))} HP. Thanks, Mom.` },
      { label: '🧃 The juice box (gain a Snack)', can: (run) => run.snacks.length < run.snackSlots, apply: (run, rng) => { run.snacks.push(rng.pick(['lemonade', 'juice_box', 'trail_mix'])); return 'Snack pocketed.'; } },
      { label: '🧴 The sunscreen (remove a curse)', can: (run) => curses(run).length > 0, apply: (run) => { const c = curses(run)[0]; run.deck.splice(run.deck.indexOf(c), 1); return 'Curse removed. Mom was right.'; } },
    ],
  },
  tractor_ride: {
    name: "Poppa Flaj's Tractor Ride", emoji: '🚜', speaker: 'Poppa Flaj',
    line: '"Hop on, I\'m headed that way anyhow."',
    choices: [
      { label: '🚜 Ride ahead (skip the next floor)', apply: (run) => { run.skipNextFloor = true; return 'The tractor rumbles up the path.'; } },
      { label: '🚶 Walk (nothing happens)', apply: () => 'You wave as he putters off.' },
    ],
  },
  brody_garage: {
    name: "Uncle Brody's Garage", emoji: '🔧', speaker: 'Uncle Brody',
    line: '"REAL TALK, kid. Let\'s soup this thing UP."',
    choices: [
      { label: '🔧 Upgrade a card', can: (run) => run.deck.some((c) => !c.up), apply: (run, rng) => { const ups = run.deck.filter((c) => !c.up && !['status', 'curse'].includes(c.id)); const c = rng.pick(ups); c.up = true; return `Souped up: ${c.id}!`; } },
      { label: '👋 Just say hi', apply: () => 'Brody gives you a fist bump.' },
    ],
  },
  chelsea_kitchen: {
    name: "Aunt Chelsea's Kitchen", emoji: '🍲', speaker: 'Aunt Chelsea',
    line: '"Sit down, warm up. You don\'t have to carry all that, you know."',
    choices: [
      { label: '🍲 Warm meal (heal 25% HP)', apply: (run) => `Healed ${heal(run, Math.floor(run.maxHp * 0.25))} HP.` },
      { label: '🎒 Lighten your load (remove a card)', can: (run) => removableCards(run).length > 1, apply: (run) => { run.pendingRemove = true; return 'PICK_CARD'; } },
    ],
  },
  duck_pond: {
    name: 'The Duck Pond', emoji: '🦆', speaker: null,
    line: 'A duckling is separated from the parade. It looks up at you. Quack.',
    choices: [
      { label: '🦆 Walk it home (a Duck Friend joins your deck!)', apply: (run) => { run.deck.push(makeCard('duck')); return 'QUACK! The duck follows you now.'; } },
      { label: '🚶 Leave it (it\'ll probably be fine)', apply: () => 'You feel watched the rest of the day.' },
    ],
  },
  goldie_gate: {
    name: "Goldie's Gate", emoji: '🦙', speaker: null,
    line: 'The llama stands at the gate, guarding something. Goldie says nothing. Goldie knows.',
    choices: [
      { label: '🦙 Approach the llama', apply: (run, rng) => {
        const id = gainRelic(run, rng);
        if (rng.chance(0.5)) { run.hp = Math.max(1, run.hp - 5); return id ? `Goldie SPITS (-5 HP)… but lets you take it: ${id}.` : 'Goldie spits. That\'s all.'; }
        return id ? `Goldie nods, once. You may take it: ${id}.` : 'Goldie nods. There was nothing behind her. Classic Goldie.';
      } },
      { label: '🚶 Respect the llama, walk away', apply: () => 'Wise.' },
    ],
  },
  pep_talk: {
    name: "Coach James's Pep Talk", emoji: '🧢', speaker: 'Coach James',
    line: '"You\'ve already got everything you need. But take this anyway."',
    choices: [
      { label: '❤️ Believe in yourself (+5 Max HP)', apply: (run) => { run.maxHp += 5; run.hp += 5; return 'You feel tougher.'; } },
      { label: '🧴 Advice (remove a curse)', can: (run) => curses(run).length > 0, apply: (run) => { const c = curses(run)[0]; run.deck.splice(run.deck.indexOf(c), 1); return 'That homework? Handled.'; } },
      { label: '💰 Pocket money (+50 gold)', apply: (run) => { run.gold += 50; return 'For Jacob\'s shop.'; } },
    ],
  },
  old_well: {
    name: 'The Old Well', emoji: '🪙', speaker: null,
    line: 'An old wishing well. The water glimmers. Toss a coin?',
    choices: [
      { label: '🪙 Make a wish (toss 10 gold)', can: (run) => run.gold >= 10, apply: (run, rng) => {
        run.gold -= 10;
        const roll = rng.random();
        if (roll < 0.4) { run.gold += 75; return 'SPLASH — a bucket of coins comes up! (+75 gold)'; }
        if (roll < 0.7) { heal(run, 10); return 'The water is cool and sweet. (+10 HP)'; }
        if (roll < 0.9) { return 'Plunk. Nothing. Wells, man.'; }
        run.deck.push(makeCard('poison_ivy')); return 'You lean too far and tumble into the ivy patch. (Curse: Poison Ivy)';
      } },
      { label: '🚶 Save your coins', apply: () => 'The well gurgles, unimpressed.' },
    ],
  },
};

export const EVENT_KEYS = Object.keys(EVENTS);
