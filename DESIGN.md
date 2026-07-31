# Rolfe Legends 2: Defend the Farm — Locked Design

Slay-the-Spire-like roguelike deckbuilder. Every mechanic mirrors StS unless noted; every enemy/relic names its StS original. Locked with James Thu 2026-07-30.

## Core loop (StS verbatim)

- Pick a hero → Coach James grants a starting boon → climb a branching 3-act map → fight/shop/rest/event/treasure per node → act boss → next act → beat The Big Twister → hero-specific ending.
- Combat: draw 5/turn, **3 ⚡/turn** (flat), block expires at turn start, enemies telegraph **intents**. Strength (+dmg per hit), Dexterity (+block per block card), Weak (-25% dmg dealt), Vulnerable (+50% dmg taken), Frail (-25% block), Poison (N dmg at victim's turn start, then -1). Exhaust pile. Innate = in opening hand. X-cost = spend all ⚡.
- Rewards after fights: gold + pick-1-of-3 cards; elites add a relic; treasure = Rusty brings a relic.
- Numbers at StS scale: hero HP 70–80, hits 5–30. NOT RL1's small numbers (James's call).
- Deck starts small, grows by drafting; shop offers card removal. Snacks (potions): 1 belt slot (+1 with Lunchbox).

## Heroes (equal depth — do not underestimate Aaron)

### Aaron the Strong (Ironclad spine) — 75 HP, starter relic Big Breakfast (heal 6 after each fight)
Starter deck (10): 5× Shove (Strike: 6) · 4× Brace (Defend: 5) · 1× Tornado Slam (Bash: 2⚡, 8 + 2 Vulnerable)
Themes: strength scaling, big block, effort costs (exhaust/HP framed as "wears himself out"), **Tornado Form**.

### Wyatt the Speedy (Silent spine) — 70 HP, starter relic Head Start (draw 2 extra on turn 1)
Starter deck (12): 5× Kick (Strike: 6) · 5× Dodge (Defend: 5) · 1× Nutmeg (Neutralize: 0⚡, 3 + 1 Weak) · 1× Quick Feet (Survivor: 1⚡, 8 block, discard 1)
Themes: Soccer Balls (shivs: 0⚡, 4 dmg, exhaust), poison (named poison), discard/cycle (**Sleight of Hand**), Footwork dexterity.

Card pools: ~22 per hero v1 (trimmed from StS's ~75; selfplay harness re-tunes). Full rosters live in `js/cards.js` with StS-original annotations.

## Statuses & curses (NEVER "Chores")

- Statuses (combat junk): **Scraped Knee** (=Wound, unplayable) · **Straw** (=Dazed, unplayable, gone at combat end) · **Hailstone** (=Burn: end of turn in hand → take 2).
- Curses (deck junk from events): **Homework** (=Curse of the Bell-ish clog, unplayable) · **Poison Ivy** (unplayable, take 1 when drawn = Regret-lite).

## Acts & bestiary (each = StS original, mechanic intact)

### Act 1 — The Far Fields (morning) · ~12 floors
Normals: Cawing Crow=Cultist (scaling str) · Gopher=Jaw Worm · Roly-Poly=Louse (curls: block) · Mud Blob=Slime (splits) · Mouse Gang=Gremlin Gang · Puffball=Fungi Beast (Vulnerable spore burst on death) · Magpie=Looter (steals gold, flees) · Barn Spider=Slaver (entangle/Weak).
Elites: **Old Scarecrow**=Lagavulin ("Stands there. Menacingly." — dormant until provoked, then -str/-dex debuffs + big hits) · **The Ornery Ram**=Gremlin Nob (enrages when you play Tricks/skills) · **Scarecrow Row**=Sentries (3, shove Straw).
Boss: **The Rogue Combine**=The Guardian (mode shift: Mow ↔ Hunker). (Alt for later: Mud King=Slime Boss.)

### Act 2 — The Barnyard (dusk) · ~12 floors
Normals: Raccoon Bandit=Mugger (steals) · Waltzing Weasel=Snecko (dance randomizes card costs) · Snapping Turtle=Shelled Parasite (plated armor) · Possum Pair=Centurion+Mystic (plays dead/heals) · Thorny Bramble=Snake Plant (multi-hit).
Elites: **The Porcupine**=Book of Stabbing (scaling multi-hit) · **The Fox**=Taskmaster (shoves Scraped Knees) · **Raccoon Ringleader**=Gremlin Leader (summons bandits).
Boss: **The Raccoon King**=The Champ (trash-lid shield block, taunts, enrages at half).

### Act 3 — The Storm (night) · ~12 floors + finale
Normals: Ball Lightning ×3=Darklings (revive unless all down) · Hail Cloud=Orb Walker (shoves Hailstones) · Flooding Creek=Spire Growth (constrict) · The Passing Squall=Transient (huge hits, leaves after 5 turns) · Debris Tangle=Writhing Mass (reactive).
Elites: **The Thunderhead**=Giant Head (countdown to massive strike) · **Ghost Wind**=Nemesis (intangible alternating turns) · **Wind Funnel**=Reptomancer (summons dust devils).
Final boss: **The Big Twister**=Awakened One (phase 2: dissipates, then RE-FORMS bigger — the RL1 Rockie-enrage tradition).

## Relics — "Farm Treasures" (James-approved, all StS mirrors)

Starters: Big Breakfast (Aaron) · Head Start (Wyatt).
Pool: Fence Post=Anchor (8 block turn 1) · Granny's Thermos=Blood Vial (heal 2 at fight start) · Barbed Wire=Bronze Scales (thorns 3) · Barn Lantern=Lantern (+1⚡ turn 1) · Lucky Horseshoe=Vajra (+1 str) · Skipping Stone=Oddly Smooth Stone (+1 dex) · Old Quilt=Orichalcum (6 block if none at turn end) · Sunflower=Happy Flower (+1⚡ every 3rd turn) · Slingshot=Pen Nib (every 10th attack ×2) · Soccer Drills=Kunai (3 attacks/turn → +1 dex) · Hay Bale Toss=Shuriken (→ +1 str) · Lunchbox=Potion Belt (+1 Snack slot) · Rally Cap=Centennial Puzzle (first HP loss/fight → draw 3).
Boss: **Keys to the Tractor** (+1⚡ every turn, NO downside — kid-version jackpot).

## Snacks (potions) — 1 slot

Granny's Lemonade (heal 12) · Juice Box (+2⚡) · Beef Jerky (+2 str this fight) · Trail Mix (draw 3) · Band-Aid (heal 20% max HP).

## Map events (family cameos; lines James-approved)

Mom's Care Package (heal 20% / gain Snack / remove a curse) · Poppa Flaj's Tractor Ride (skip next floor) · Uncle Brody's Garage (upgrade a card) · Aunt Chelsea's Kitchen (heal 25% / remove a card) · The Duck Pond (a **Duck** ally card joins the run) · Goldie's Gate (relic; 50% she spits: lose 5 HP; "Goldie says nothing. Goldie knows.") · Coach James's Pep Talk (+5 max HP / remove curse / 50 gold) · The Old Well (coin-toss gamble).
Rest site = **Granny Rockie's porch**: Cookies (heal 30% max) or Practice (upgrade a card).
Shop = **Jacob's Farm Supply** (Dad): cards, relic, snack, card removal.
Treasure = **Rusty** trots up with a relic in his mouth.
Start boon = **Coach James** (Neow): pick 1 of 3 modest boosts.

## Map generation

~12 floors/act: floor 0 fights; mix of fight/event/shop/treasure/rest; elite ≥floor 4; rest guaranteed before boss; 1 shop + 1 treasure + 2–3 events per act. 2–4 nodes per floor, branching paths, seeded RNG.

## Endings (build scaffold early; music/art later)

First win per hero = that hero's Suno anthem + synced-lyric animated credit sequence (RL1 trick). Winning with BOTH heroes unlocks a bonus finale. Post-win: "Storm Warning" difficulty ladder (ascension-lite, ~5 levels, later phase).

## Run length target

Full run 30–40 min (fits the screen-time hour). ~12 floors/act keeps it under StS's ~16.

## Build order

1. Pure engine: rng, combat (all keywords), tests.
2. Content data: heroes, cards, enemies acts 1–3, relics, snacks, events.
3. Run layer: map gen, rewards, shop/rest/treasure/events, save.
4. Selfplay harness: full-run simulation, winrate rails.
5. UI: title/character select/map/battle/reward/shop/rest/event/win/lose.
6. Polish phases: art pass (gpt-image), Suno soundtrack + endings, sw.js offline, Farm Code, Storm Warning ladder.
