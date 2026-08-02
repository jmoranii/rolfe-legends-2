# Rolfe Legends 2: Defend the Farm 🌪️🦆

### ▶️ [PLAY IT HERE](https://jmoranii.github.io/rolfe-legends-2/) — phone, tablet, or desktop; installable, plays offline after the first visit.

A personalized roguelike deckbuilder built as a gift for my nephews Wyatt and Aaron — the sequel they asked for after [Rolfe Legends](https://github.com/jmoranii/rolfe-legends).

Play as **Wyatt the Speedy** or **Aaron the Strong** and defend the family farm across three acts — The Far Fields at morning, The Barnyard at dusk, and The Storm at night — against crows, raccoon bandits, and finally The Big Twister itself. Family members run the shop, the rest stop, and the treasure deliveries (Rusty the dog brings you relics in his mouth).

## Design

The mechanical skeleton deliberately mirrors *Slay the Spire* — the most playtested deckbuilder architecture in existence — with every card, enemy, and relic re-imagined for the Rolfe farm. All names, art, text, and music are original.

- 2 heroes with distinct archetypes (strength/block vs. speed/poison/discard)
- 3 acts, ~36 floors of branching path choices, 8 family-cameo events
- 40+ cards, 25+ enemies, 16 "Farm Treasure" relics, snacks, upgrades
- Runs sized to fit a kid's screen-time hour (~30–40 min)

## Tech

- HTML5 + CSS3 + vanilla JS ES modules — zero dependencies, no build step
- Pure DOM-free engine (`js/combat.js`, `js/run.js`) with 1,100+ unit tests; Playwright e2e in Chromium and WebKit
- AI selfplay balance harness simulating full runs (`test/selfplay.mjs`) — winrate rails, death heatmaps
- Seeded RNG throughout; localStorage saves
- Procedural WebAudio SFX; drop-in art (PNG) and music (Suno) layers

## Run locally

```
python3 -m http.server 8080   # any static server
node test/test.mjs            # unit tests
node test/selfplay.mjs 200    # balance simulation
```

Built by James Moran with AI pair-programming (Claude Code), 2026.
