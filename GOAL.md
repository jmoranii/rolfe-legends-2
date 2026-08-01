# GOAL: Take Rolfe Legends 2 from working skeleton to ship-ready — autonomously

You are working in `~/code/rolfe-legends-2`. Read `CLAUDE.md` (constitution) and `DESIGN.md` (locked design) before touching anything; they override this file on conflict. The game is a fully playable Slay-the-Spire-like with 3 heroes, 780 unit tests, a selfplay balance harness, and Chromium e2e — but emoji-placeholder art, no music, a bare-bones UI, and a button-list map. Your goal: complete phases 1–5 below to shippable quality. **Phase 6 (publish/deploy) is James's — never push to a public remote or deploy anywhere.**

## Non-negotiable ground rules

1. **Green before every commit**: `node test/test.mjs` + `node test/selfplay.mjs 150` + e2e. Never commit red. Commit granularly with clear messages.
2. **Content rules from CLAUDE.md hold absolutely**: no curse/status named "Chores"; first names only; Poppa Flaj / Granny Rockie; Liam stays a **zero-hint secret** (nothing visible anywhere pre-unlock — audit every new screen for leaks).
3. **Anything needing James's judgment goes in `REVIEW.md`** (create it): new family-cameo dialogue lines, art rerolls you're unsure of, anthem lyric drafts, any design deviation. Don't block on it — make your best call, log it for his pass.
4. **Family reference photos**: RL1's full set survives at `~/code/rolfe-legends/assets/ref-photos/` (Wyatt, Aaron, Tory, Jacob, Brody, Chelsea, Sean, Kim, James, Rusty, the llama, the pets) — copy what you need into this repo's `assets/ref-photos/` (gitignored — never commit photos). RL1's *finished art* (`~/code/rolfe-legends/assets/cards|ui|backgrounds/`) is also fair game: reuse portraits directly where the same character appears (Granny Rockie, Coach James, Rusty, Goldie) or as style anchors. **Known gap: there is no Liam reference photo anywhere.** Policy for any missing reference: do the best possible without it, ship it, and record it in REVIEW.md's **Gaps & Personalization report** (see Definition of done).
5. Keep a running `PROGRESS.md`: phase, what's done, what's next, current harness numbers. Update it every commit.

## Phase 1 — UI polish & game feel (do this first; it changes how everything else reads)

- **The map becomes a real Slay-the-Spire map**: a scrollable per-act node graph climbing bottom-to-top — 12 floors of 2–4 nodes with drawn edges, branching/merging paths, node icons (⚔️💀🛒🍪❓🐕👑), the player's trail marked, reachable-next nodes highlighted. Generated seeded per act (replace the current pick-1-of-3 floor options in `js/run.js`; preserve the act quotas: 1 shop, 1 treasure, rest before boss, ≤2 elites, ~3 events). This is the single biggest ask — James wants it "like the original Slay the Spire."
- **Sequenced, visible enemy turns**: each enemy acts one at a time with a short pause — attacker lunges, damage numbers fly up and fade, hit shake, block/buff floaties, death animation. No more instant-resolve.
- **Card play feel**: played card animates toward its target/center then away; hand fans slightly with a lift-on-hover/tap; targeting arrow or clear highlight state; energy orb pulses when a card is unaffordable.
- **Screen polish**: card frames with rarity coloring, cleaner typography, per-act battle backdrops (CSS gradients now, art hooks for Phase 3), title screen with layered composition, transitions between screens, `prefers-reduced-motion` respected throughout.
- **Coach James onboarding layer** (RL1's proven just-in-time style, `pointer-events:none` bubbles): first map ("pick your path"), first relic, first snack, first elite warning, and a first-death screen that frames roguelike death kindly ("runs end — that's the game; you keep what you learned"). One tip per moment, ≤12 words each, never twice.
- e2e must be extended to cover the new map interaction and still pass.

## Phase 2 — Balance & depth

- **Hero parity**: tune (via card/enemy numbers, not policy hacks) until all three heroes land in a **35–55% harness winrate band** (currently Aaron 21 / Liam 29 / Wyatt 50). Then tighten the selfplay rails to that band so regressions fail loudly.
- **Boss variety**: implement the designed alternates — The Mud King (act 1, =Slime Boss split) and Thunder & Lightning (act 3 pair, =Donu & Deca) — randomly chosen per run alongside the existing bosses.
- 2–3 additional map events if the pacing wants them (farm-flavored, StS-mirrored; log new dialogue in REVIEW.md).

## Phase 3 — Art pass (gpt-image, codex backend — James's ChatGPT account)

- Tooling: the machine-local `gpt-image` CLI (see `~/code/rolfe-legends/assets/generate-art.sh` and `PROMPTS.md` for the RL1 playbook — copy the pattern: a `generate-art.sh` with per-id rerolls, prompts fully standalone). **Style: the same "Storybook Gouache" as RL1** — study RL1's PROMPTS.md style block and reuse it verbatim as the base.
- Deliverables, all drop-in to the existing asset hooks (add hooks where missing, emoji fallback always): 3 hero portraits (from ref photos — official endpoints only for family likenesses), ~25 enemy portraits, 3 act battle backgrounds (morning fields / dusk barnyard / storm night), map backdrop per act, **title art that physically contains Goldie the llama as the tappable secret element**, 8 event scene images, boss art (+ Big Twister phase-2 variant), app icon.
- Codex image-gen can stall/degrade for hours at a time (RL1 experience) — batch with retries, work on other phases while waiting, reroll only clear failures.

## Phase 4 — Music & endings (Suno)

- Generation: **only via the vault suno skill's unattended path (`suno-auto`)** — never bare `suno generate`. **Keep take 1 of every track** (James's standing rule — no A/B batches). Be economical with credits: ~12 tracks total.
- Track list (drop into `assets/audio/`, names must match `js/music.js` TRACKS): `title`, `map1` `map2` `map3` (morning folk / dusk porch / night storm tension), `battle`, `elite`, `boss`, `anthem_wyatt`, `anthem_aaron`, `anthem_liam`, `anthem_both`.
- **The endings are the crown jewels** (the boys replayed RL1 just to see its credits): each hero's first win plays their anthem over an RL1-style synced-lyric animated credit sequence (use `suno timed-lyrics <id> --lrc` → word-timed captions; see RL1's `js/game.js` credits implementation for the playbook — sliding scenes, caption remaps if Suno mispronounces a name, staged intro so kids don't X out during the instrumental). Winning with both Wyatt and Aaron unlocks the `anthem_both` bonus finale. Anthem lyric drafts go in REVIEW.md.
- Wire crossfading per screen via the existing `js/music.js` (already ported from RL1).

## Phase 5 — Ship hardening

- **Offline service worker** (adapt RL1's `sw.js`: shell network-first, assets cache-first, emoji/silence fallbacks) — game must boot and play fully offline after one online session.
- **Farm Code** save backup (adapt RL1's `js/farmcode.js`): encode profile (wins, Liam unlock) + current run; Settings → copy/paste restore; checksummed; round-trip + tamper unit tests.
- **PWA**: manifest, standalone display, apple-touch-icon, Add-to-Home-Screen helper (RL1 pattern).
- **WebKit e2e** — required, their tablets are Safari-engine: the current playwright package hangs against this Mac's frozen `webkit_mac14_arm64_special-2251` build. Pin the playwright npm version that shipped that WebKit build (RL1-era, ~mid-2026), run the full e2e suite in WebKit, fix what it finds (RL1's iPad-Safari background bug is the cautionary precedent: avoid `position:fixed`+negative-z+transform backdrops and CSS-var `background` shorthand tricks).
- Full-run manual smoke on localhost; screenshots of every screen into `PROGRESS.md`'s final entry.

## The Slay the Spire bar — quality rubric

This game deliberately mirrors StS because StS is the best-tuned deckbuilder ever made. So the bar for every phase is not "does it work" but **"does it capture what makes StS great."** At the end of each phase, honestly grade the build against this rubric in `PROGRESS.md` and treat any ✗ as remaining work for that phase:

1. **Every turn is a solvable puzzle.** Intents + hand + energy always give enough information to find a best line; deaths trace to decisions, not surprises. (If the harness shows a fight where no line avoids big damage repeatedly, that fight is mistuned.)
2. **Path choices are real dilemmas.** The map regularly forces greed-vs-safety calls — elite for a relic vs. rest for HP, shop route vs. event route. If one route is always right, the map generation or economy is wrong.
3. **Decks develop an identity by act 2.** Drafting should visibly bend a run toward an archetype (Aaron: strength or block-fortress; Wyatt: poison or shiv-tempo; Liam: stink-storm or fresh-wall). If harness decks end up as undifferentiated piles, card pools or reward rates need work.
4. **The power fantasy escalates.** Act 3 turns should feel dramatically bigger than act 1 turns (Tornado Form online, triple BLOWOUT turns, 20-poison ticks). Late-game screenshots should look exciting.
5. **Risk is always paid for.** Elites meaningfully harder AND meaningfully more rewarding; the Squall teaches survive-vs-flee; snacks are real comeback tools.
6. **Fights end before they bore.** Normal fights ~3–6 turns, elites ~6–10, bosses ~8–14 (harness can measure). StS fights are tense *and short*.
7. **Fairness reads on screen.** A kid can always see why damage happened: intents, statuses, and block are legible at a glance mid-fight.
8. **Runs tell stories.** A run should be recountable afterward ("I got Keys to the Tractor from Rusty, went double-BLOWOUT, and the Twister re-formed with 4 HP left"). If harness logs read as undifferentiated grind, variance (events, relics, boss pools) is too flat.

When a mechanic choice is ambiguous, resolve it by asking: *what does StS do, and why did that feel good?* — then port the why, reskinned to the farm.

## Definition of done

All five phases complete; 3 heroes in the 35–55% band; unit + selfplay + Chromium e2e + WebKit e2e all green; art and music present for **every** hook (best-effort versions where references were missing — no empty slots); and REVIEW.md contains everything awaiting James:

- **Gaps & Personalization report** (required section): every place the result would improve with a reference photo (Liam above all) or with James's personal input — inside jokes, a detail about a family member, a phrase they actually say, farm specifics the vault doesn't know. For each gap: what was shipped instead, what input is wanted, and exactly what would be regenerated once it arrives.
- Draft cameo lines / anthem lyrics for his approval pass.
- The **publish checklist** (public repo y/n, Pages deploy, README, delivery plan) — his to execute. Stop there.
