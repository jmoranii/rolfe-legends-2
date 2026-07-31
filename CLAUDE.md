# Rolfe Legends 2: Defend the Farm

A personalized Slay-the-Spire-style roguelike deckbuilder built by James (Uncle James) as the requested sequel to Rolfe Legends, for his nephews **Wyatt (10)** and **Aaron (8)** Rittgers, who live on a farm in Rolfe, Iowa. The boys beat RL1, loved it, and asked for a sequel with more ducks and farm life. No deadline — it ships when it's good.

## The one-sentence vision

A kid opens the game, picks himself as the hero, and every run down the randomized farm map is a new story — and because it's a roguelike, the game he loves never runs out.

## Design pillars (check every decision against these)

1. **Mirror Slay the Spire.** James's directive: clone the StS skeleton as closely as possible — flat 3 energy, StS-scale numbers (HP 50–100, not RL1's tiny numbers), near-verbatim Ironclad/Silent kits, an equivalent to (roughly) each StS enemy with its mechanic intact, intents telegraphed. StS is the most playtested deckbuilder in existence; inherit its balance. Names/text/art are 100% ours.
2. **It's THEIR game.** Both heroes are the boys — **Wyatt the Speedy** (Silent spine) and **Aaron the Strong** (Ironclad spine) — with **equal mechanical depth** (do not underestimate Aaron). Family are helpers, never enemies. The farm supplies the bestiary. Ducks matter (the boys asked).
3. **Kid-fair, not kid-easy.** Enemy intents always telegraphed; deaths feel earned. Poison/Weak/Vulnerable keep their real names. Runs fit a screen-time hour (~30–40 min).
4. **Durable + frictionless.** Vanilla HTML/CSS/JS, no build step, no server. localStorage saves. Hosted under jmoranii.github.io (same origin as RL1 — the parental-controls exception already covers it).
5. **Tested, not hoped.** Pure logic layer + unit tests; selfplay harness simulates whole runs (winrate by act, death heatmaps). Run tests after any logic/data change.

## Hard content rules

- **Never a curse/status named "Chores."** Household norm: chores (especially farm chores) are never framed as bad. Curses are Homework, Poison Ivy, injuries (Scraped Knee), weather junk.
- First names / family nicknames only; no surnames, no birthdates. Grandparents are **Poppa Flaj** and **Granny Rockie** (not Grampa/Grandma).
- Family cameo dialogue lines are James-approved before ship (RL1 beat-line rule).
- Exhaust/self-cost on Aaron's cards is framed as effort ("wears himself out"), not pain/blood.

## Cast

- **Heroes:** Wyatt the Speedy (shivs=Quick Kicks/Soccer Balls, poison, discard=Sleight of Hand, Footwork) · Aaron the Strong (strength, block, Tornado Form; he is "The Lil Tornado" from RL1).
- **Helpers:** Jacob's farm-supply **shop** (Dad) · **Granny Rockie's porch** rest site (Cookies=heal / Practice=upgrade) · **Coach James** start-of-run boon (Neow role) · **Rusty** the dog = treasure (trots up with a relic in his mouth) · map **events** star Mom (Victoria), Poppa Flaj, Uncle Brody, Aunt Chelsea, Goldie the llama, the ducks.
- **Acts:** 1 The Far Fields (morning) → 2 The Barnyard (dusk) → 3 The Storm (night). Bosses: The Rogue Combine / The Raccoon King / The Big Twister. Full bestiary in DESIGN.md — every enemy names its StS original.

## Conventions

- Stack: HTML5 + CSS3 + vanilla JS ES modules, zero dependencies, no build.
- `js/combat.js`, `js/run.js`, `js/rng.js` are **pure** (no DOM). Data lives in `js/cards.js`, `js/enemies.js`, `js/relics.js`, `js/events.js`. `js/game.js` renders.
- Tests: `node test/test.mjs` (rules + every card/relic/enemy), `node test/selfplay.mjs` (full-run balance). Both green before any commit.
- SFX procedural WebAudio; music = Suno files in `assets/audio/` (drop-in, missing = silence). Art = emoji first; PNGs drop into `assets/cards|ui|backgrounds/` with no code changes.
- Seeded RNG everywhere in logic (reproducible runs, testable maps).
- Endings: separate Suno anthem + RL1-style synced-lyric credit sequence **per hero**, plus a bonus for winning with both. Build the win-screen scaffold early; music/art land later.

## Privacy & publishing

Local git only until James's explicit go. RL1 precedent: public repo + Pages was authorized, but the go is per-project — ask at ship time.
