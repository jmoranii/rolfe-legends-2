# Rolfe Legends 2 — build progress

Running log per GOAL.md. Newest entry first. Harness = `node test/selfplay.mjs 300`.

## 2026-08-05 · Power cards say they're permanent (James's call)

- Every power card's text now auto-appends **"Lasts the whole fight!"** — same never-drifts mechanism as the Innate line, one append site covers all 12 powers on every surface. The load-bearing case: Pumped Up ("Gain 3 Strength") read identical to Flex ("Gain 2 Strength this turn") unless the permanence is stated. Verified side by side in-hand. sw v24.

## 2026-08-05 · Map murals: tall scrolling act paintings (James's pick — option B)

- **The map backdrop was viewport-anchored and slid away when scrolling** (bare act gradient above floor ~4). Now each act has a **1:3 tall mural that scrolls WITH the trail**, StS-parchment style: act 1 — farmhouse at the gate up through golden corn to the Rogue Combine waiting on the ridge; act 2 — barnyard gate up past the coops to a crowned raccoon silhouette on the dusk ridge; act 3 — the battened farmhouse up through storm-bent fields to the Big Twister's grinning face filling the sky. Bottom of the act = home, top = the boss. The trail literally climbs toward trouble.
- **Pipeline**: codex can't hold a 3:1 aspect (two full stalls), so each mural is two 1024×1536 panels with matching haze bands at the joining edges, vstacked — the seam hides in the haze. (One comedy beat: zsh arrays are 1-indexed, so the first batch's briefs all shifted one act over; paintings were fine, filenames rotated, act 3 regenerated.)
- **Wide screens**: the trail canvas caps at 560px, so a blurred copy of the mural fills the side gutters (letterbox-blur) instead of bare gradient. Verified at phone + iPad-landscape.
- unit 1390 · e2e 80/80 · sw v23.

## 2026-08-05 · Victory stars + README refresh (James's pick from the polish menu)

- **Victory stars on the title screen**: the old "Farm defended: Wyatt ×3" text is now ⚡ Wyatt ⭐⭐⭐ / 🌪️ Aaron ⭐ (per-hero rows, ⭐×N past five). Liam's row exists only once he has a win — zero-hint verified (pre-unlock profile shows no trace).
- **README refreshed**: hard-mode framing ("losses teach, every sung ending is earned"), the karaoke anthems mentioned, event/test counts current. Still says "2 heroes" — the README is public and zero-hint applies there too.
- **A2HS icons checked**: barn + duck + twister, crisp at 192/512 — no change needed.
- unit 1390 · e2e 80/80 · sw v22.

## 2026-08-04 · Aaron's karaoke: FIXED with acoustic ground truth (no regeneration needed)

- James still heard pacing wrongness at the Dad mention after two heuristic repairs. Root cause finally nailed by **transcribing the actual audio** (whisperkit-cli large-v3, word timestamps, on filtered isolated windows — the full mix defeats Whisper, but 13s windows with the lyrics as prompt decode cleanly): **Suno stamped "Dad fixed fences, Mom stood proud" ~12 seconds early** — during "he slammed the door!" and an *unlabeled "oh oh oh hey!" backing chant* — while the Coach/Rusty stamps were nearly right (±0.3s vs acoustics). Our repair passes had "fixed" the correct side toward the wrong one.
- Fix: the two bad lines' stamps in anthem_aaron.lrc are **patched to the measured acoustic times** (verse actually sung 62.3–67.6s); Coach/Rusty left at Suno's (verified-correct) stamps. The chant stays uncaptioned — it's not in the lyric sheet, so the captions simply rest through the break, like every instrumental.
- Beats now land with the singing: Dad 62.1 · Mom 63.8 · Poppa Flaj 65.3 · Coach 68.0 · Rusty 71.1. The outro has a layered AARON!-chant that gives conflicting decodes — left at Suno's stamps (unverifiable, and never reported as wrong).
- Technique now proven for any future anthem-timing dispute: chunked whisper + lyric prompt → patch the .lrc. unit 1390 · e2e 80/80 · sw v21.

## 2026-08-04 · Intent etiquette (James's call — StS-true telegraph timing)

- A telegraphed move now **vanishes the moment the enemy makes it** (the bubble becomes a dim "…"), and the fresh telegraph **waits for the start of your turn** — all enemies re-telegraph together. Was: the next turn's intent popped instantly mid-carnage, muddling "what just hit me" with "what's coming." UI-only (reads the engine's phase queue); probe-verified across a 3-enemy phase. sw v20.

## 2026-08-04 · Roly-poly uncurls (James's report) — Belly Flop preview confirmed correct

- **Roly-poly was stuck in curled art forever**: the first-hit curl set the name/art and nothing ever set them back. Now once the curl's Block is spent (it zeroes at his turn start), he visibly unrolls via the form-change cross-fade — and the trick stays used up (no re-curl). Unit-tested end to end.
- **Belly Flop "(4 right now!)" at zero Block investigated — not a bug**: Strength rides on the flop (attackValue adds it, StS Body Slam behaves the same, and it's unit-tested). The preview number is the true damage: 0 Block + 4 Strength really deals 4.
- unit 1390 · e2e 80/80 · sw v19.

## 2026-08-03 · The Twister's re-form + every silent tell announces itself (James's round)

- **Bespoke re-form sequence** for THE BIG TWISTER's phase swap (was the generic cross-fade): double lightning flash over the whole screen, board quake + gust lean, the card convulses and GROWS through the art swap (2.2s, --fx scaled), debris scatters, boom + gale + rumble stack, "🌪️ IT RE-FORMS… BIGGER!". Reduced-motion keeps just the label.
- **ROYAL FURY gets its moment**: the Raccoon King's half-HP enrage flashes his card hot red with "👑 ROYAL FURY!" (it was a silent chip update).
- **Generic tells** in animateDiffs: enemy heals float 💚+N (possum nuzzles were invisible), strength gains float 💪+N (crow rallies, Whiskers's speech, Inhale, THUNDER's boom), and a ≥3-point debuff drop floats "😤 Shook it ALL off!" (cleanse vs natural tick-down).
- e2e probe force-kills phase 1 and asserts the sequence fires + the card renames. unit 1385 · e2e 80/80 · sw v18.

## 2026-08-03 · Poison pierces Block (James's call — StS "HP loss" rule)

- New `pierce` option on dealDamage: HP-loss damage skips Block entirely. **Poison** now bites through the Snapping Turtle's plating (the canonical case — it was silently being absorbed) and **All-Out Effort's self-cost** no longer gets eaten by the hero's own Block. Thorns/hailstones/constrict stay blockable (StS calls those "damage", not "HP loss").
- Poison explainers updated: "Goes right through Block and shells!" (status chip + tip library).
- Winrates barely moved (Aaron 30.7 · Wyatt 37.3 · Liam 36.0 @150) — the turtle case is narrow. unit 1385 · e2e 77/77 · sw v17.

## 2026-08-03 · Full heal between acts (James's call — StS-true, meal-framed)

- Between-act heal 20% → **100%**: "🥪 Lunch at the farmhouse!" after act 1, "🍗 Dinner before the storm!" after act 2. James: hard mode lives in the fights, not the transitions. Exactly StS's between-act behavior.
- Measured, NOT rebalanced (per instruction): 150-run winrates drift up to **Aaron 34.0 · Wyatt 37.3 · Liam 36.0** (from 32.6/29.4/26.8 @500). Wyatt+Liam now sit a touch above the 25–35 soft band — noted for the next balance batch.
- unit 1381 · e2e 77/77 · sw v16.

## 2026-08-03 · Scout reports describe, never prescribe (James's rule)

- All ~40 of Coach's tap-an-enemy scouting reports rewritten as pure M.O. — the mechanic, the pattern, the danger, and **zero how-to-beat advice** ("Take the talker out first", "Punch, don't posture", "Block up, hang on" all cut). Many answers is the point of the game; a well-stated M.O. implies the strategy without dictating it (the Squall's "endless health, hits harder every turn, blows itself out after five" needs no directive). **Zero exceptions were needed.** Reassurance stays ("It's not broken — it's him").
- A lint test now bans prescription phrases from the scout library permanently. unit 1380 · e2e 77/77 · sw v15.

## 2026-08-02 · Death-feel suite (all five, James's call) + event relic reveals

- **Knockout beat**: the lethal hit no longer cuts straight to defeat — the world drains gray, the hero strip tips over (~1.6s, --fx scaled), then the defeat screen fades in. Mirror of the victory fade.
- **"Taken down by…"**: the engine records the killer (enemy w/ art, or a src label — Sneaky poison ☠️, Prickly spikes 🌵, The rising water 🌊…); the defeat screen shows a wanted-poster chip + a tiny run recap (Act · Floor · fights won).
- **Danger telegraph**: under 25% HP the screen edges pulse red and a heartbeat thumps once per turn — death stops arriving as a surprise. Static (no pulse) under reduced motion.
- **Coach's pickup lines**: 12 rotating encouragements on the defeat screen (localStorage rotation, no repeats until the library wraps). Word pass in REVIEW.md.
- **Per-hero KO art**: dusted-but-okay paintings (mud puddle, dizzy stars, consoling ducks) at assets/ui/ko_<hero>.jpg — emoji fallback until each lands.
- **Goldie's Gate + Pie Contest relic bug** (James's report): event relics printed raw ids ("lucky_horseshoe") in prose — now they queue `run.pendingRelicPop` and get the same big FARM TREASURE reveal as Rusty/elite drops, with rewritten flavor lines.
- unit 1335 · e2e 77/77 both engines (new: defeat-screen probe incl. line rotation) · sw v14.

## 2026-08-02 · Farm Code removed + overkill HP clamp (James's calls)

- **Secret Farm Code deleted entirely** (settings button, restore flow, js/farmcode.js, its unit + e2e coverage) — James: cross-device save transfer isn't needed; each device keeps its own farm. Settings is now: music, sounds, animations, home-screen, abandon run.
- **HP floors at 0 in the engine**: an overkill hit was flashing "❤️ -3" on the hero strip before the defeat screen replaced it. Clamped in dealDamage so every surface inherits the fix.
- unit 1324 · e2e 71/71 both engines · sw v13.

## 2026-08-02 · Karaoke audit: orphaned line tails fixed + every sung face shows (James's Aaron playthrough)

- **Aaron's "Poppa Flaj" jumble diagnosed**: Suno stamped the tails of two caption lines after instrumental breaks they don't belong to ("Flaj cheered extra loud" at 67s though sung ~54s; "no more!" 23s late at the bridge). New **Repair 0 in parseLrc**: an in-line stall >6s with a short tail snaps the tail to the head's cadence — unless the head is a bunched cluster (Wyatt's-intro glitch), which stays the cluster pass's case. Same discriminator as that pass, so the two repairs partition cleanly.
- **Beat coverage**: CAST gains **THE MUD KING** 👑 and **The Raccoon King** 🦝 (sung in Aaron's anthem with art, previously invisible). deriveBeats now **chains crowded names** (min 1.5s apart, ≤4s drift cap) instead of dropping everyone after the first — Aaron's anthem gains Mom; the both-brothers finale gains Dad, Granny, Chelsea, and Goldie (the full family parade it always sang about).
- **Real-file regression tests**: the four shipped .lrc captures are now unit-tested (monotonic, no in-line stalls, required faces per anthem, ≥1.5s beat spacing) — a regenerated anthem that re-imports Suno's glitches fails loudly. unit 1337 · e2e 73/73 · sw v12.
- Hard mode field-validated: James beat it as Aaron after two deaths — "it was hard. So I think it's good."

## 2026-08-02 · Goldie beacon dot (James's discoverability nudge)

- The Liam-unlock hotspot is viewport-stable but the painted llama drifts with the art crop — so a **tiny white dot (7px, soft glow + faint dark halo)** now marks the hotspot once title art loads. It sits in the hotspot's top band (the true center hides behind the New Adventure button). Verified portrait + landscape; e2e asserts the dot (73/73). Zero-hint posture unchanged otherwise: no copy, no tips change; the dot is a sanctioned wink. sw v11.

## 2026-08-02 · HARD MODE — the balance pass lands at ~30% (James: "I want this game to be hard")

- New design target: every hero close to **30% winrate** (was the 35–55 band). Selfplay rails re-anchored to 25–35 (hard ±2 at n≥300).
- Three tuning rounds, verified at **500 runs/hero: Aaron 32.6 · Wyatt 29.4 · Liam 26.8** (from 35.3/53.3/44.7). Pacing rails untouched: 4.6/6.7/10.9 avg turns.
- The dials: between-act heal 33%→**20%** · **Wyatt HP 70→54** (his StS-true kit overperforms; the HP dial carries the whole nerf — zero card changes) · Liam HP 78→76 + Fresh Diaper reverted to Frost-true 2/5 + Blanket Fort 9→8 · Aaron Big Breakfast 10→8 (also fixed its text, which claimed 6 while the engine healed 10).
- Watch-item for playtests: Wyatt's deaths now front-load into act 1 (Ornery Ram top killer) — spiky early game, by design but worth feeling out.
- sw cache v10 · unit 1312 · e2e 72/72 both engines.

## 2026-08-02 · BELLY FLOP! + true-Claw Sticky Hands + richer shop & porch (James's round)

- **BELLY FLOP!** 💦 (Aaron, =Body Slam, common): deal damage equal to your Block; 1⚡ → FREE upgraded. Pairs with Fortify the Barn (Barricade). New engine op `dmgFromBlock`; the card face shows the live number ("(14 right now!)").
- **Sticky Hands is now a real Claw**: new generic `grows` mechanic — a per-fight shared bonus pool keyed by card id; every play makes ALL copies +2, numbers tick up green on every card face, "🍯 Sticky Handses +2!" floaty per play. Resets between fights (unit-tested 4→6→8).
- **Shop widened** (filling the snack hole): **8 cards** (was 5) and **2 Farm Treasures to pick between** (was 1); buying one leaves the other on the shelf.
- **Granny's porch third option**: 🏠 Store a card at Granny's — free removal, guarded so a kid can never empty their deck. Selfplay bot stashes junk cards there when healthy.
- Harness fidelity: the bot now *understands* both mechanics (perceives Belly Flop as its Block, Sticky as base+bonus) — without that, Aaron measured 3pts low on a pure artifact.
- Post-change winrates (150/hero, still NOT rebalanced): **Aaron 35.3 · Wyatt 53.3 · Liam 44.7** (Sticky buff visible: Liam +4). Aaron is the low hero post-snack-cut — first candidate for the balance pass.
- sw cache v9 · unit 1312 · e2e 72/72 both engines.

## 2026-08-02 · Snacks CUT + screen wake lock (James's calls)

- **Consumable snacks removed entirely** — James: "more complexity than value." Full sweep: engine (SNACKS/useSnack gone), fight-reward drops, shop stock, Coach boon, Mom's juice-box event choice, Lunchbox relic (Potion Belt) retired, belt UI (now just FARM TREASURES), map shelf, Your-stuff modal, tip library, selfplay policies, DESIGN/README/REVIEW docs. Old mid-run saves load clean (snack fields scrubbed, Lunchbox stripped on deserialize). **Liam's Snack Time diaper is a different system and stays** (his Plasma orb — it's in his anthem).
- Post-cut winrates measured (150 runs/hero, NOT rebalanced per James — queued for the balance pass): **Aaron 38.7 · Wyatt 50.7 · Liam 40.7** (was ~50/55/49; snacks were carrying late-game survivability — act-3 deaths dominate). All inside rails.
- **Screen Wake Lock**: tablets auto-dimmed while kids read their hand (James hit it playtesting). Held from fight start until back on map/title — covers fights, victory beats, rewards, and the credits roll; re-acquired when the tab returns. Verified live (held in fight, released on map).
- **Harness confession + guard**: `selfplay.mjs --quick` parsed as `Number('--quick') = NaN` → the loop ran ZERO games and every rail passed vacuously. My recent commit gates that used `--quick` were fake-green (no balance-relevant changes shipped under them, but still). The harness now refuses non-numeric/zero run counts.
- sw cache v8 · unit 1290 · e2e 72/72 both engines.

## 2026-08-02 · Combat belt + the Squall's exit (fleeing ≠ dying)

- **Combat belt** (shipped 798fddb, logging here): SNACKS + FARM TREASURES sit in labeled groups under the hero health bar, wrapping to extra rows as the collection grows; every treasure pin taps to explain itself, and **pins jiggle+glow the moment they proc** (engine logs `relic` events at all 15 proc sites).
- **Flee-ers finally exit on camera.** A fled enemy used to vanish between renders — and worse, a SOLO flee-er (the act-3 Passing Squall, outlasted after 5 gusts) ended the fight with no render at all: it froze on screen while victory fired around it. Now `runEnemyPhase` renders once more when the fight ends mid-enemy-phase (which also fixes the last enemy dying to poison/thorns never playing its death animation), and fled enemies get one last render wearing `.fleeing`.
- **Fleeing ≠ dying, on purpose.** Dying topples DOWN and drains gray; fleeing lifts OFF — a buffet against the wind, then the whole card streaks away blurring, HP bar still full (the Squall was outlasted, not beaten). Leaves and wheat scatter downwind, a filtered-noise whoosh plays (new sfx voice: a noise buffer through a swept bandpass — tones can't make wind), and the Squall gets the full gale: whole-screen lean + gold "🌬️ IT BLEW OVER!". The Magpie/Raccoon announce "💨 It got away with your 💰30!" so stolen gold reads as taken, not dropped.
- sw cache v7 · e2e 72/72 both engines (new: solo-flee probe — the blow-away renders AND still lands on the victory beat).

## 2026-08-02 · Victory beats + Coach's tip library + a fistful of playtest fixes

- **Fight wins fade out** (no more abrupt cut) into a **victory beat**: Coach James congratulates by enemy name and serves ONE tip from a ~40-tip rotating library (js/tips.js) — general strategy, hero-specific coaching (Liam's only while playing him — zero-hint safe), and one deliberately vague title-screen tease (no location/method; the egg may move someday). Sequential rotation per hero persists across sessions; unit-tested (full coverage, no cross-hero leaks, no jargon, tease stays vague).
- Boss wins keep their bigger splash (now also faded into).
- **Game Face**: costs 1, upgrade makes it FREE (James's spec; balance check deferred).
- **Heavy Haul** upgrade was real (Str ×3→×5) but the text was frozen at "3 times" — now shows {n}.
- **Art fallback self-heals**: one flaky image load no longer pins an enemy/scene to emoji for the whole session (12s retry window; James's "Combine switches to emoji in defensive mode" — there is no mode-swap art, that was the sticky fallback).
- **Intent explainers describe the M.O. only** — cut counter-advice ("attacking wakes it up") per James: many answers is the point.
- **Act cards: dark text + white outline on all acts** (light-on-white was mush on act 2).
- **e2e self-hosts** its static server (the external one kept dying) and dismisses persistent coach bubbles at every seam; failure screenshots on outcome asserts. 1290 unit · 65/65 e2e both engines.

## 2026-08-02 · Karaoke desync bug (Aaron's credits) — found & fixed

James saw "something weird with Aaron's karaoke, maybe one-time." Root cause: if the anthem started late (uncached first load / blocked autoplay), the credits' wall-clock rescue ran the captions ahead; when the song then started at 0:00 the clock jumped BACKWARD, but caption/scene indices only advanced forward → karaoke stuck seconds ahead for the whole roll. Cached second plays start instantly, hence "one-time." Fix: indices recompute from scratch every frame (both directions) and lit words un-light on resync. Repro'd the failure and verified the fix live (caption visibly ahead on wall clock → cleared on song start → back in sync at 13.6s, 3 words lit on beat). Aaron's LRC data itself audited clean (monotonic, no bunching, no stray tokens — all four anthems).

## 2026-08-02 · Card feel system + anthem pronunciation fix

- **Cause-and-effect pass** (James's round-4 ask): played cards physically FLY to what they affect (attacks → the enemy, skills/powers → you); damage floaties bigger with an impact pop (12+ = huge red, 15+ = boom sound); every card family has its own voice (single slash / flurry ticks / shield THUNK / poison bubble / power-up chord / diaper pop / BLOWOUT boom) with per-hit sounds synced to per-hit floaties.
- **Animation pacing**: default is SLOW & CLEAR (~1.35× longer, ~950ms enemy beats) for learning; ⚙️ Settings → "🎬 Animations: FAST" once they've got it. Driven by a --fx CSS var + JS scale so every shake/lunge/fly/floaty obeys one knob. prefers-reduced-motion still wins.
- **Anthem names fixed**: Suno mispronounced Wyatt + Liam → anthem_wyatt/anthem_liam/anthem_both regenerated singing "Whyatt"/"Leeum" while the karaoke captions remap to the real spellings (RL1 trick, verified live: audio sings Whyatt at t=17s, caption reads "Wyatt laced up…"). Beat triggers match both spellings. ~30 credits.
- sw cache v5 · unit 1163 · e2e 65/65 both engines.

## 2026-08-02 · Liam legibility audit + junk-card & elite-reward visibility

James's round-3 playtest notes, all fixed:
- **Active powers were invisible once played** (audit's biggest find, all heroes): purple power chips now sit on the hero strip (🌪️2 Tornado Form, 🎂 Birthday Boy, 🌫️ MAXIMUM STINK…), tap → explanation with live values.
- **Diaper auto-evokes** now announce themselves ("💩 POP!" floaty over the orb row) — the invisible oldest-pops-when-full rule finally shows.
- **Junk-card shoves are announced**: any Straw/Scraped Knee/Hailstone/Poison Ivy stuffed into your piles toasts what+where ("🌾 2× Straw got tossed onto your DISCARD pile! It vanishes after the fight."); the junk cards' own text now says they're gone after the fight.
- **Elite relic drops** get the full FARM TREASURE reveal popup (was a one-line mention on the reward screen); elite reward header now reads "💀 BIG Trouble — beaten!" with a collected-✓ line.
- Kid-English: "Evoke" → "POP" on Double Trouble / Uppies!.
- Tests: unit 1163 · e2e 65/65 both engines.

## 2026-08-01 · Story & spectacle pass (James's playtest round 2)

- **In-scene family art**: all nine RL1-reused portraits regenerated (same gouache, now *doing the thing*) — Rusty carries the mystery bundle, Granny offers the cookie plate from her rocker, Dad works his shop counter, Flaj pats the tractor seat, Mom holds out the care package, Brody wrenches, Chelsea ladles, Coach fist-bumps, Goldie blocks the gate. RL1 versions parked in originals/rl1-reused.
- **Decision support**: every stop screen (shop/rest/events/boon) now shows ❤️ HP · 💰 gold · a My Deck browser — heal-vs-upgrade and buy-vs-skip decisions have the facts in view.
- **Boss victory drama**: new `victory.mp3` fanfare sting (Suno, 5.6s, one-shot) + BOSS DEFEATED confetti splash → rewards → **FARM TREASURE popup** (Keys to the Tractor gets a real reveal, not a toast) → act story card → next act.
- **Act story cards**: full-screen interstitials before each act (copy in REVIEW.md for James's word pass); act 2 emoji 🌇→🦆.
- **Landscape**: manifest orientation "any"; tablet landscape gets banner-beside-choices scene layout + wider combat stage; short phone-landscape shows a friendly "turn your screen tall-ways" overlay. Portrait phone unchanged.
- Tests: unit 1163 · e2e 64/64 both engines (act-card flow covered).

## 2026-08-01 · Loading strategy: predictive prefetch + 128kbps audio

James asked how content growth affects load time. Decision (his sign-off): **no loading screen — lazy foundation + predictive prefetch**.
- js/prefetch.js: once-only idle fetch queue (concurrency 1, never competes with urgent loads); every byte lands in the sw cache, so prefetch doubles as offline install.
- Smart moments: title → act-1 bundle (enemies, backdrops, map1+battle tracks, heroes, all event banners; measured: 39 assets warmed from the title alone) · map → current act bundle, elite/boss tracks as floors climb, next-act bundle at floor 10 · final boss → your anthem + lrc + credits backdrop (+ anthem_both when it would unlock).
- Audio re-encoded 180→128kbps CBR (assets/optimize-audio.sh; originals gitignored in assets/originals/audio/): 23.7MB → **16.3MB**, inaudible on tablet speakers.
- Full-game transfer is now ~23MB total (was ~170MB pre-optimization); first paint still ~350KB. sw cache bumped v3.

## 2026-08-01 · UI legibility pass (James's feedback) + GitHub backup

James's post-playtest asks: costs invisible on card choices/shop, relic effects unclear, statuses/intents unexplained, multi-hits animate as one lump, scene screens should feature the family art big, bosses should read BIG. Response: a full **StS legibility audit** — the list of everything Slay the Spire does to keep the player informed, with our version of each:

| # | What StS does | RL2's version |
|---|---|---|
| 1 | Intent icons + damage numbers over enemies | ✓ intent bubble with live damage (×N shown); **NEW: tap any intent → plain-kid-English explanation of the next move**; Coach tip on first fight ("Those bubbles show each enemy's next move!") |
| 2 | Hover tooltips on every buff/debuff | ✓ **tap any status chip → explanation toast** (tablets can't hover); full glossary in 📖 |
| 3 | Keyword tooltips (Exhaust, Innate, X-cost) | ✓ 📖 "How to read the game" modal: map icons, card keywords, all statuses — reachable from map top bar AND combat ℹ️ |
| 4 | Modified damage shown green/red on cards | ✓ **live card text marks buffed values green, weakened red** (Strength/Weak/Dex/Frail) |
| 5 | Card cost always visible when choosing | ✓ **mini-card component with cost badge + full text everywhere**: fight rewards, shop (with price tags + can't-afford graying), deck/draw/discard lists (cost column) |
| 6 | Relic/potion tooltips everywhere | ✓ shop relic/snack buttons show effect text; map pins toast; **combat ℹ️ lists all your treasures + snacks with texts** |
| 7 | Draw/discard/exhaust piles inspectable | ✓ draw + discard always; **♻️ exhaust pile button appears once something exhausts** |
| 8 | Per-hit damage numbers on multi-hit attacks | ✓ **engine logs every resolved hit; UI floats each hit staggered ~170ms** — a ×4 flurry or an X-cost spin visibly lands as separate hits; fully-blocked hits float "🛡️ Blocked!" |
| 9 | Potion click → use menu (no misclicks) | ✓ **snack tap → confirm modal with effect text** (Eat it now / Save it) |
| 10 | Bosses/elites visually distinct | ✓ **"👑 BOSS" / "💀 BIG TROUBLE" ribbons, gold/red auras, bigger frames + art** |
| 11 | Map node icons learnable | ✓ tap any non-reachable spot → identifies itself; map legend in 📖 |
| 12 | Energy orb prominent | ✓ + tap → explanation |
| 13 | Turn state obvious | ✓ END TURN flips to "👀 ENEMY TURN…" during the sequenced phase |

Plus: **scene banners** — Dad's Farm Supply now IS a big painted Dad-in-his-shop header (same for Granny's porch, Rusty, Coach's boon, the tractor skip, and every event scene), title overlaid, choices beneath.

**Backup**: repo pushed to private GitHub (`jmoranii/rolfe-legends-2`) at James's request — he's the only viewer until delivery; public + Pages remains a Phase-6 decision.

**Tests**: unit 1163 · e2e 62/62 both engines · balance untouched ("balance seems good" — James).

## 2026-07-31 · SHIP-READY — GOAL.md definition of done MET

All five phases complete in one autonomous session (Phases 1–5, ~6 hours wall-clock, generation batches in background throughout).

**Final numbers**
- Winrate band (final 300/hero): **Aaron 51.3% · Wyatt 54.0% · Liam 49.3%** — all inside 35–55 (500-run confirmation earlier: 49.8 / 54.8 / 49.4).
- Fight pacing: normals 4.7 · elites 6.6 · bosses 10.7 avg turns (targets 3–6 / 6–10 / 8–14) — rail-enforced.
- Tests: **unit 1163/1163 · e2e 62/62 in BOTH Chromium and WebKit** (playwright pinned 1.60.0 for the frozen mac14 WebKit) · selfplay band rails ALL CLEAR.
- Art: **57/57 generated** (storybook gouache, style-QA'd via contact sheets) + 9 RL1 reuses + derived icons — every hook filled, emoji fallback intact.
- Music: **11/11 tracks** (take 1 kept) + word-level `.lrc` × 4 anthems — every `js/music.js` hook filled, silence fallback intact.
- Liam zero-hint audit: hero select pre-unlock shows 2 heroes (e2e-checked), anthem_both never names him, no visible UI/copy references pre-unlock. ✓

**Every-screen smoke** (`media/shots/s01…s19`): title (painted Goldie hotspot verified: buttons win taps, llama taps unlock) · heroes · boon · map · combat + targeting · reward · shop · rest · treasure · Goldie event · Pie Contest · act-2 fight · Twister boss · Thunder & Lightning pair · defeat · victory crown · settings · farm code. Plus `p4-credits-beat*.png` (live synced credits).

**Final rubric — the Slay the Spire bar**
1. Every turn is a solvable puzzle — ✓ intents + live previews + measured no-stall fights (0.5%).
2. Path choices are real dilemmas — ✓ visible node graph; elite/shop/event routing carries real winrate stakes.
3. Decks develop identity by act 2 — ✓ harness signatures: Aaron strength piles, Wyatt poison-tempo, Liam fresh-wall/stink.
4. The power fantasy escalates — ✓ Tornado Form/MAXIMUM STINK/Ball Machine act-3 turns; boss fights average 10.7 tense turns.
5. Risk is always paid for — ✓ elites optional, visible, relic-paying; Squall teaches flee; snacks are comeback tools (harness uses them like a kid would).
6. Fights end before they bore — ✓ measured + rail-enforced.
7. Fairness reads on screen — ✓ intents/statuses/block/floaties legible mid-fight on a phone.
8. Runs tell stories — ✓ random boss pools, 11 events, cascading Mud King splits, and credits that literally retell the cast.

**Remaining = James's Phase 6** (publish checklist in REVIEW.md): repo public y/n, Pages deploy, README, delivery. NEVER pushed anywhere — local git only, per the ground rules.

## 2026-07-31 · Phase 4 — Music & endings (DONE) · Phase 5 — Ship hardening (core DONE)

**Phase 4 — the crown jewels**
- **11-track Suno soundtrack** (suno-auto unattended, take 1 kept on every track, ~130 credits): title / map1-2-3 (morning folk · dusk porch · storm-night underscore) / battle / elite / boss instrumentals + 4 vocal anthems (Wyatt pop-punk-country, Aaron stomp rock, Liam silly ukulele-tuba, both-brothers brass finale). Crossfading via js/music.js; anthems play once (they're the credits clock).
- **Synced-lyric victory credits** (js/credits.js, the RL1 trick rebuilt data-driven): word-level `.lrc` from `suno timed-lyrics` for all four anthems; karaoke captions light each word AS it's sung; **portrait beats are DERIVED from the timed lyrics** (cast-name scan with cooldowns) so a regenerated anthem re-times the whole show with zero code changes. Staged intro, journey slide transitions, skip button, wall-clock + fallback-lines rescue (works silent/offline), both-finale duo scene, `#credits-<hero>` preview hash, replay button on the crown screen. Live smoke: at audio t=16.8s the caption read "Wyatt laced up, gave the ball a spin" with 4 words lit and WYATT's portrait up — synced to the real playhead.
- Beats per anthem (derived): Wyatt 11 (Mom→Flaj→Rusty→Twister→Brody→Chelsea→Ducks→Goldie), Aaron 11, Liam 7, Both 8 (duo scenes).

**Phase 5 — hardening**
- **Offline service worker** (sw.js): shell network-first, assets cache-first lazy-fill, icons best-effort — boots and plays fully offline after one online visit; emoji/silence fallbacks cover uncached assets.
- **Secret Farm Code** (js/farmcode.js): FARM2-checksummed base64url of profile (wins, bonusSeen, Liam unlock) + the current run (map, deck, relics — everything); Settings UI with copy + paste-restore; round-trip/tamper/garbage unit tests; Liam-wins-imply-unlock guard.
- **PWA**: manifest (standalone, portrait), theme color, apple-touch-icon link, Add-to-Home-Screen helper (captures beforeinstallprompt on Android; Safari instructions for the iPads).
- **WebKit e2e UNBLOCKED**: playwright pinned to **1.60.0** — probed 1.62.1 against this Mac's frozen `webkit_mac14_arm64_special-2251` (hangs, 20s+), 1.60.0 drives it in ~2s. Full suite now runs in BOTH engines. **e2e 62/62** (map graph, sequenced combat, liam unlock, credits, farm code, service worker — both engines).

**Harness** (500/hero, regression-stable): Aaron 49.8 · Wyatt 54.8 · Liam 49.4 · pacing 4.7/6.6/10.7.
**Tests**: unit 1163/1163 · e2e 62/62 (Chromium + WebKit) · selfplay band rails ALL CLEAR.

**Rubric re-grade (endings lens)**: #8 runs tell stories — ✓✓ the credits literally retell the run's cast with the family taking bows; the boys' replay-for-credits behavior is the design target.

## 2026-07-31 · Phase 2 — Balance, boss variety, events (DONE)

**Done**
- **Hero parity in the 35–55% band** (500 runs/hero): **Aaron 49.8% · Wyatt 54.8% · Liam 49.4%** (from 21/50/29). Tuned via card/enemy/relic numbers only — no policy hacks; every deviation from a pure StS mirror is itemized in REVIEW.md §Balance deviations. The harness also gained: competent snack use at elites/bosses, fight-pacing metrics, winning-deck signature report.
- **Selfplay rails tightened to the band**: hard fail outside 33–57% at n≥300 (28–62% guard for quick runs), plus pacing rails (fights ≤7 avg turns, elites ≤11, bosses ≤16) and the stall rail. Regressions now fail loudly.
- **Boss variety**: THE MUD KING (act 1 alt, =Slime Boss — splits into two Mud Blobs at half, who themselves split into Blips) and THUNDER & LIGHTNING (act 3 alt pair, =Donu & Deca — one empowers both, one shields both), randomly drawn per run alongside the originals. Victory lines adapt to the finale fought.
- **3 new events** (art in the running batch): The Pie Contest (=Big Fish), The Beehive (=Golden Idol risk), The Burn Barrel (=Bonfire Spirits, deck-thinning heal). Dialogue in REVIEW.md.
- REVIEW.md created: Gaps & Personalization report (Liam photo top), balance deviations, dialogue for approval, publish checklist.

**Harness** (500/hero): Aaron 49.8 · Wyatt 54.8 · Liam 49.4 · pacing 4.7 / 6.6 / 10.7 avg turns · 7 stalls in 1500 runs.
**Tests**: unit 1134/1134 · e2e 29/29 · selfplay band rails ALL CLEAR.

**Rubric grade (Phase 2 lens)**
1. Solvable puzzle — ✓ deaths trace to attrition/decisions; no repeated no-line fights in harness logs (stall rate 0.5%).
2. Real path dilemmas — ✓ elite-vs-safe and shop-vs-event are live choices with real winrate stakes now that the band is tight.
3. Deck identity by act 2 — ✓ winning decks show archetypes: Aaron pumped_up×2.7 strength piles, Wyatt slide_tackle/sting_shot poison-tempo, Liam blanket_fort×3.0 fresh-wall + stink.
4. Power fantasy escalates — ✓ Tornado Form/Maximum Stink/Ball Machine anchor act-3 turns; boss avg 10.7 turns means scaling comes online.
5. Risk paid for — ✓ elites pay a relic and kill 3× more than normals per encounter; Squall teaches flee-vs-fight.
6. Fights end before boring — ✓ measured: 4.7 / 6.6 / 10.7 avg turns (targets 3–6 / 6–10 / 8–14), now rail-enforced.
7. Fairness on screen — ✓ (Phase 1) unchanged.
8. Runs tell stories — ✓ boss pools randomize finales, 11 events, split-cascade Mud King runs are recountable ("the Mud King split and then the blobs split!").

**Next**: Phase 3 QA of the art batch (25/57 at this entry) + drop-ins; Phase 4 music.

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
