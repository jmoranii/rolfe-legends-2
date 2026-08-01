# REVIEW.md — everything awaiting James

Per GOAL.md rule 3: best calls were made and shipped; nothing here blocks play.
Sections grow as phases land. ✍️ = wants your words. 🎨 = wants your eye. ⚖️ = a judgment call I made.

## Gaps & Personalization report

Every place the result improves with a reference photo or a personal detail. For each: what shipped, what's wanted, what gets regenerated when it arrives.

| # | Gap | What shipped instead | What's wanted | What regenerates |
|---|-----|---------------------|---------------|------------------|
| 1 | ~~**Liam reference photo**~~ **FILLED Fri 2026-08-01** | James supplied two recent photos (staged at `assets/ref-photos/liam-recent-1/2.png`, gitignored); portrait **regenerated from both refs** — sandy-blond wavy hair, real toddler build. Old baby-ref version backed up at `assets/ref-photos/portrait_liam-babyref-backup.png` | ✅ Nothing — eyeball the new `assets/ui/portrait_liam.png` and reroll if it's not quite him | (done — his credits use the same portrait) |
| 2 | Family-cameo event art is **reused RL1 portraits** (Tory, Flaj, Brody, Chelsea, Jacob, Coach, Rocky, Rusty, Goldie) | RL1's finished sig art dropped into the event/rest/shop/treasure screens — continuity with RL1, zero style drift | Your call: fresh RL2 *scene* art per event (e.g. Chelsea's actual kitchen, Brody's actual garage)? A phone photo of the real porch/garage/kitchen would anchor scenes | any of `assets/events/*.png` on request |
| 3 | Farm specifics I couldn't know | Generic Iowa farm in backgrounds/title (red barn, windmill, ducks) | Photos of the *actual* Rolfe farm (barn color, layout, the real Goldie), names of real fields/landmarks for map-node flavor | `assets/backgrounds/*`, `assets/ui/title.png`, event copy |
| 4 | Phrases the boys actually say | My best-guess kid dialogue (see cameo lines below) | Real catchphrases: what Wyatt yells in soccer, Aaron-isms, what Liam actually calls things ("uppies"? "uh-oh"?), what the boys call Jacob/Tory (Dad/Mom assumed) | any event/tip/victory line |
| 5 | Boys' interests beyond soccer (Wyatt) / strength (Aaron) | RL1 canon (Wyatt=speedy/soccer, Aaron=Lil Tornado) | Current obsessions (games, shows, animals) for card names + anthem lyrics | card flavor, anthem lyrics |

## ⚖️ Balance deviations from pure StS mirrors (Phase 2)

Tuned by the harness into the 35–55% band (500 runs/hero: **Aaron 49.8 · Wyatt 54.8 · Liam 49.4**). DESIGN.md sanctions harness-driven drift; flagging anything now above/below its StS original:

- Between-act heal 25% → **33%** (kid-kindness lever; maps are committed paths now, harder than the old pick-1-of-3).
- Aaron: Big Breakfast heal 6 → **10** (Burning Blood is 6) · Pumped Up **3** Str (Inflame 2) · Tough Skin **4** (Metallicize 3).
- Liam: Fresh Diaper passive/evoke **3/6** (Frost 2/5) · Blanket Fort **9** block (Glacier 7) · Nap Time **14** · Giggle Fit **2** Focus (Defragment 1) · HP 75 → **78**.
- Wyatt (was overshooting): Sting Shot poison 3 → **2** (Poisoned Stab 3) · Itching Powder 5 → **4** (Deadly Poison 5) · Prank Cloud poison 4 → **3** (Crippling Cloud 4).
- Bosses sized for floor-12 kid decks (StS bosses meet floor-16 decks): Combine 175→**150** HP, MOW 24→**20** · Raccoon King 290→**250** · Twister 220/240→**190/200**, Monster Gust 28→**24** · Snapping Turtle plating 8+4→**6+3**.

## ✍️ New dialogue for your approval pass (Phase 2)

**The Pie Contest** (event, =Big Fish): "A folding table groans under a dozen pies. The blue ribbon gleams. Nobody is watching the judging sheet…" — choices: sneak a slice / enter your own pie ("The judges are moved to tears. You grow as a person.") / swipe the prize jar ("…There was homework taped under the lid.")

**The Beehive** (event, =Golden Idol risk): "The hive hums like a tiny engine. The honeycomb drips gold. The bees are… watching." — greedy grab: "WORTH IT. Mostly. Ow."

**The Burn Barrel** (event, =Bonfire Spirits): "Dusk. The burn barrel crackles, sparks climbing like fireflies. Room for one more thing — if you want to let something go." — warm hands: "The fire pops approvingly."

**Thunder & Lightning victory lines** (alt act-3 boss):
- Wyatt: "Thunder AND Lightning — and neither one could touch him. WYATT THE SPEEDY — Legend of Rolfe!"
- Aaron: "Thunder boomed. Lightning cracked. Aaron flexed. The storm apologized. AARON THE STRONG!"
- Liam: "Thunder and Lightning met THE BLOWOUT. The storm has not stopped running. LIAM THE LITTLE!"

**Coach James onboarding tips** (Phase 1, ≤12 words each): "Pick your path — you can see the whole climb." · "💀 is BIG trouble… and big treasure. Your call." · "Farm Treasures work the whole run. Collect them!" · "Snacks are one-time saves — spend them when it counts." · Defeat screen: "Runs end — that's the game. You keep everything you learned. 💪"

## ✍️ Anthem lyrics (Phase 4 — generated, take 1 kept; your approval pass)

All four are live in the game already (first-win credits). Rewrites = regenerate that anthem + re-pull its `.lrc`; the credits re-time themselves automatically.

**Wyatt the Speedy** (pop-punk country): *Out in Rolfe when the morning glows / Trouble came where the tall corn grows / Wyatt laced up, gave the ball a spin / Fastest feet that have ever been // Mom packed sandwiches, Dad sold gear / Poppa Flaj drove the tractor here / Granny Rockie baked him strong / Rusty brought him treasure all along //* **WYATT! Speedy as the wind / Nutmeg the storm and score again / WYATT! Racing through the rain / The Big Twister couldn't catch him / And it's never coming back again!** */ Uncle Brody yelled REAL TALK, go go go / Aunt Chelsea warmed him head to toe / Coach James said kid, just trust your feet / The ducks all quacked the victory beat / … Even Goldie nodded — once // The farm is safe, the fields are green / Fastest legend Rolfe has ever seen / WYATT!*

**Aaron the Strong** (stomp rock): *Storm rolled in with a hungry sound / Aaron the Strong stood his ground / Eight years old with a hay-wagon swing / The Lil Tornado does his thing // FLEX! The raccoons ran away / Shoved the Mud King into yesterday / Granny's cookies made him stout / A big breakfast never wears out //* **AARON! Strong as an oak / TORNADO FORM — the twister broke! / AARON! Hear the Lil Tornado roar / The storm knocked once — he slammed the door!** */ Dad fixed fences, Mom stood proud / Poppa Flaj cheered extra loud / Coach James grinned, that's my guy / Rusty howled at the clearing sky // The barn still stands, the fields are gold / The strongest story ever told / AARON!*

**Liam the Little** (silly ukulele-tuba): *Who's that waddling through the corn? / Littlest hero ever born / Two and a half feet, hear him giggle / Diapers floating in a magic wiggle //* **LIAM! LIAM THE LITTLE! / Stinky, Fresh, and Snack Time too / When trouble came he yelled UH-OH / And THE BLOWOUT went KA-BOOM!** */ Goldie kept his secret well / Only the tall grass ever could tell / Granny Rockie squeezed his cheeks / Rusty followed him for weeks // The Big Twister sniffed one time / Turned right around and quit the crime / The tiniest legend saved the day / LIAM! Hooray!*

**Legends of Rolfe** (both-brothers finale): *Two brothers on one farm road / Carried home the heavy load / Wyatt quick and Aaron strong / The whole family sang along //* **LEGENDS OF ROLFE! The storm is done / WYATT AND AARON — the farm is won! / Mom and Dad and Granny too / Poppa Flaj and the whole duck crew** */ Brody hollered, Chelsea cheered / Coach James wiped away a tear / Rusty barked and Goldie knew / And even the tall grass giggled too // … Brothers forever, side by side / Defenders of the countryside / LEGENDS OF ROLFE!*

⚖️ Notes: "even the tall grass giggled too" in the finale is a deliberate no-name nod to Liam (zero-hint rule — the finale can play pre-unlock). · Anthem pronunciations unheard by me — if Suno mangles a name, the `REMAP` table in js/credits.js fixes the caption display without regenerating.

## 🎨 Art calls to eyeball (Phase 3 — 57/57 generated, QA'd via contact sheets)

- Style: RL1 Storybook Gouache verbatim; the full set reads as one painter (contact sheets: media/shots/contact-sheet*.png). Kid-check pass: everything funny-menacing, nothing horror.
- **Liam portrait** (assets/ui/portrait_liam.png): generated from his baby photo — reads adorable but younger than 2½ (more like a 1-year-old). Recognizability + age vibe are your call; regenerates in one command with a recent photo (gap #1).
- **Wyatt/Aaron hero portraits**: from their ref photos; Aaron's picked up his RL1 blue-fringe hair (continuity win). Would Wyatt say "that's me"? Your eye.
- **Title art**: Goldie stands lower-right exactly as briefed; the invisible tap-3× hotspot sits on her and was probe-verified (buttons always win taps; llama-area taps fire the unlock). Duck parade + distant twister included.
- Rerolls: delete the file + `./assets/generate-art.sh <id>`. Per-image cost $0 marginal (codex plan); ~130s each.
- ⚖️ Aaron's portrait shirt is a pajama-animal print (from the ref photo's shirt) — endearing, but if he'd rather look "tough," reroll with a note.

## Publish checklist (yours — Phase 6)

- [x] Repo **PUBLIC** (James's call Sat 2026-08-01, for cross-device playtesting): <https://github.com/jmoranii/rolfe-legends-2> (ref photos never pushed — gitignored; surname scrubbed from docs first)
- [x] **GitHub Pages LIVE**: <https://jmoranii.github.io/rolfe-legends-2/> — the playtest link (works offline after first visit, Add-to-Home-Screen ready; art slimmed 140MB→6.5MB for tablet loads)
- [ ] README polish
- [ ] Delivery plan (when/how the boys get it)
