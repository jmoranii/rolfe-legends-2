# Rolfe Legends 2 — build progress

Running log per GOAL.md. Newest entry first. Harness = `node test/selfplay.mjs 300`.

## 2026-07-31 · Phase 1 — StS map + game feel (CORE LANDED)

**Done**
- **Real Slay-the-Spire map** (`js/map.js`, pure + seeded): per-act node graph, 12 floors × 1–4 nodes, 6 path walks planarized into non-crossing branching/merging edges. Fixed structure mirrors StS: floor 1 all fights, floor 6 treasure row (Rusty), floor 11 rest row (Granny), single boss crown; exactly 1 shop, exactly 2 elites (floor ≥5), 1 optional mid-rest, ≥3 events per act. Map validation invariants unit-tested across seeds × acts (reachability both ways, non-crossing, quotas).
- Map UI: scrollable bottom-to-top canvas, SVG dotted edges (trail solid, next-step gold), node icons, visited/current/reachable states, auto-scroll to position, per-act backdrop hook (`assets/backgrounds/mapN.png`).
- **Sequenced enemy turns**: engine phase machine (`beginEnemyPhase`/`stepEnemyAction`; `endTurn` unchanged for tests) — each enemy acts on a ~620ms beat with lunge, damage floaties, hit shake, death animation. `prefers-reduced-motion` collapses beats to instant.
- **Card play feel**: fanned hand (rotation + lift), hover/selected raise, played-card fly-away ghost, targeting glow + "tap an enemy" hint, energy orb pulse on unaffordable tap.
- **Screen polish**: rarity-colored card frames (common/uncommon/rare), per-act battle backdrop hooks with gradient fallback, screen transitions, title screen art hook (`assets/ui/title.png`) with Goldie hotspot repositioning onto the painted llama.
- **Coach James onboarding**: one-shot pointer-events-none bubbles (map intro, first relic, first snack, elite warning ≤12 words each), kind first-death framing on the defeat screen.
- Drop-in art layer: `artImg()`/`bgLayer()` with emoji/gradient fallback + missing-art memo (no 404 spam). Enemy art keys (incl. `big_twister_p2` phase swap), hero portraits, event/scene art, backgrounds.
- e2e extended (Chromium, reduced-motion): map graph assertions (spots/edges/multiple starts/boss/trail), sequenced-turn-aware fight driver. **29/29 green.**
- First balance pass so rails stay green post-map (map is harder than pick-1-of-3): between-act heal 25→33%, Big Breakfast 6→8, Snapping Turtle plating 8+4 → 6+3.

**Harness** (300 runs/hero): Aaron **8.7%** · Wyatt **47.0%** · Liam **12.3%** · 1 stall. v1 rails ALL CLEAR (win band tuning = Phase 2).
**Tests**: unit 1107/1107 · e2e 29/29 · selfplay rails green.

**Screenshots**: `media/shots/p1-title.png` (mid-transition), `p1-map.png`, `p1-combat.png`, `p1-combat-play.png`.

**Rubric grade (Phase 1 lens)**
1. Solvable puzzle — ✓ intents + live damage preview always visible; mistuned-fight sweep lands with Phase 2 measurement.
2. Real path dilemmas — ✓ structurally (elite-vs-safe, shop-vs-event routes now real choices on a visible graph); economy tuning Phase 2.
3. Deck identity by act 2 — ✗ not yet verified; Phase 2 harness deck-shape report.
4. Power fantasy escalates — partial; Phase 2 numbers work.
5. Risk paid for — ✓ elites optional on map, pay a relic; Squall/snacks in place.
6. Fights end before boring — ✗ unmeasured; Phase 2 adds turn-length metrics to harness.
7. Fairness reads on screen — ✓ intents/statuses/block/floaties legible mid-fight.
8. Runs tell stories — partial; boss pools + extra events land in Phase 2.

**Next**: Phase 2 — hero parity to 35–55% band, tighten rails, Mud King + Thunder & Lightning alternates, 2–3 new events, fight-length metrics.

**Background**: full art batch (57 images, codex backend) running — 16/57 done at this entry; style validated (storybook gouache matches RL1).
