#!/bin/bash
# generate-art.sh — Rolfe Legends 2 art batch via the `gpt-image` CLI (codex backend).
#
# Same playbook as RL1 (~/code/rolfe-legends/assets/generate-art.sh): every prompt is
# fully standalone, the Storybook Gouache style block is VERBATIM from RL1's PROMPTS.md.
#
# Usage:
#   ./generate-art.sh list          # show ids + done/missing status
#   ./generate-art.sh missing       # generate everything not yet on disk (resumable)
#   ./generate-art.sh <id> ...      # generate specific ids (rerolls: delete file first)
#   DRY=1 ./generate-art.sh missing # plan only
#
# Family likeness rule: ref photos → official OpenAI endpoints only (codex backend).
# Reused RL1 finished art (family cameos) is copied in ahead of time and never touched here.
set -uo pipefail
cd "$(dirname "$0")/.."

REF_DIR="assets/ref-photos"
QUALITY="${QUALITY:-high}"
EXTRA=""
[ "${DRY:-0}" = "1" ] && EXTRA="--dry-run"
LOG="assets/art-log.txt"

# THE STYLE BLOCK — verbatim from RL1 PROMPTS.md (people; "framed chest-up")
STYLE='Warm hand-painted storybook gouache illustration, friendly caricature with gently exaggerated proportions (slightly larger head, expressive face), bold clean silhouette, soft golden-hour farm lighting with warm rim light, rich saturated colors on a simple painterly farm-vignette background, matched art series for a children'\''s trading-card game, centered subject framed chest-up, no text, no borders, no frames, no watermark.'
# creature variant (RL1 used this for Rusty — no chest-up framing)
CSTYLE='Warm hand-painted storybook gouache illustration, friendly caricature with gently exaggerated proportions, bold clean silhouette, soft golden-hour farm lighting with warm rim light, rich saturated colors on a simple painterly farm-vignette background, matched art series for a children'\''s trading-card game, centered subject, no text, no borders, no frames, no watermark.'
# scene variant (RL1 title_bg pattern)
SCENE='Warm hand-painted storybook gouache illustration, rich saturated colors, soft golden-hour light, matched art series for a children'\''s trading-card game, no text, no borders, no frames, no watermark.'
# act-2 dusk + act-3 storm lighting swaps
SCENE2='Warm hand-painted storybook gouache illustration, rich saturated colors, soft amber-and-violet dusk light, matched art series for a children'\''s trading-card game, no text, no borders, no frames, no watermark.'
SCENE3='Warm hand-painted storybook gouache illustration, rich saturated colors, moody blue storm-night light with dramatic warm lightning glow, matched art series for a children'\''s trading-card game, no text, no borders, no frames, no watermark.'
# night-creature variant (act 3 enemies live in the storm, not golden hour)
NSTYLE='Warm hand-painted storybook gouache illustration, friendly caricature with gently exaggerated proportions, bold clean silhouette, moody blue storm-night lighting with warm lightning rim light, rich saturated colors on a simple painterly night-farm-vignette background, matched art series for a children'\''s trading-card game, centered subject, no text, no borders, no frames, no watermark.'

ALL_IDS=()
GENERATED=(); SKIPPED=(); FAILED=()

find_ref() {
  local ext
  for ext in jpg jpeg png webp; do
    [ -f "$REF_DIR/$1.$ext" ] && { echo "$REF_DIR/$1.$ext"; return 0; }
  done
  return 1
}

gen() { # id out size ref("-"=none) prompt
  local id="$1" out="$2" size="$3" refsub="$4" prompt="$5"
  ALL_IDS+=("$id|$out")
  # selection filter
  if [ "$MODE" != "missing" ]; then
    local want=0 w
    for w in ${WANTED[@]+"${WANTED[@]}"}; do [ "$w" = "$id" ] && want=1; done
    [ $want = 0 ] && return 0
  fi
  if [ -f "$out" ]; then SKIPPED+=("$id"); return 0; fi
  local refargs=()
  if [ "$refsub" != "-" ]; then
    local ref
    if ref=$(find_ref "$refsub"); then refargs=(--ref "$ref")
    else echo ">>> SKIP $id — missing ref photo $REF_DIR/$refsub.*" | tee -a "$LOG"; SKIPPED+=("$id"); return 0; fi
  fi
  echo "=== $(date +%H:%M:%S) $id → $out ($size, q=$QUALITY)" | tee -a "$LOG"
  if gpt-image "$prompt" ${refargs[@]+"${refargs[@]}"} --size "$size" --quality "$QUALITY" -o "$out" $EXTRA >>"$LOG" 2>&1; then
    GENERATED+=("$id"); echo "    done: $id" | tee -a "$LOG"
  else
    FAILED+=("$id"); echo "    FAILED: $id (see $LOG)" | tee -a "$LOG"
  fi
}

MODE="${1:-list}"
shift || true
WANTED=("$@")
if [ "$MODE" != "list" ] && [ "$MODE" != "missing" ]; then WANTED+=("$MODE"); fi

# ============================= HEROES (refs; likeness) ======================

gen portrait_wyatt assets/ui/portrait_wyatt.png 1024x1024 wyatt "Square image, 1024x1024.
$STYLE

Subject: the 10-year-old boy from the attached reference photo, clearly recognizable. The hero of a farm adventure: mid-sprint with a soccer ball glued to his feet, wind in his hair, a confident game-day grin, little speed lines and kicked-up dust trailing behind him. Morning light over green farm fields. The fastest kid in the county."

gen portrait_aaron assets/ui/portrait_aaron.png 1024x1024 aaron "Square image, 1024x1024.
$STYLE

Subject: the 8-year-old boy from the attached reference photo, clearly recognizable. The hero of a farm adventure: planted in a mighty superhero stance with both fists clenched, a small friendly tornado of leaves and hay swirling around his arms and shoulders like a power-up, determined happy grin. Morning light over green farm fields. Small kid, huge strength."

# NOTE: Liam's portrait uses TWO recent reference photos (dual --ref) — added by
# James Fri 2026-08-01, staged as ref-photos/liam-recent-1.png + liam-recent-2.png.
# The gen() helper is single-ref, so this one calls gpt-image directly.
gen_portrait_liam() {
  local out=assets/ui/portrait_liam.png
  ALL_IDS+=("portrait_liam|$out")
  if [ "$MODE" != "missing" ]; then
    local want=0 w
    for w in ${WANTED[@]+"${WANTED[@]}"}; do [ "$w" = "portrait_liam" ] && want=1; done
    [ $want = 0 ] && return 0
  fi
  if [ -f "$out" ]; then SKIPPED+=("portrait_liam"); return 0; fi
  echo "=== $(date +%H:%M:%S) portrait_liam → $out (1024x1024, q=$QUALITY, 2 refs)" | tee -a "$LOG"
  if gpt-image "Square image, 1024x1024.
$STYLE

Subject: the toddler boy from the attached reference photos, clearly recognizable — same sandy-blond wavy hair, same face shape and cheeks, same sturdy toddler build. He is almost 3 years old. He wears a tiny white t-shirt and a diaper, arms thrown up in triumph, mid-belly-laugh. Four cartoon diapers float in a gentle orbit around him like magical charms, one glowing softly. Morning light over green farm fields. Two and a half feet of pure chaos." \
      --ref "$REF_DIR/liam-recent-1.png" --ref "$REF_DIR/liam-recent-2.png" \
      --size 1024x1024 --quality "$QUALITY" -o "$out" $EXTRA >>"$LOG" 2>&1; then
    GENERATED+=("portrait_liam"); echo "    done: portrait_liam" | tee -a "$LOG"
  else
    FAILED+=("portrait_liam"); echo "    FAILED: portrait_liam (see $LOG)" | tee -a "$LOG"
  fi
}
gen_portrait_liam

# ============================= ACT 1 ENEMIES ================================

gen crow assets/enemies/crow.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a glossy black crow perched on a weathered fence post, head thrown back mid-CAW with dramatic flair, one wing raised like an orchestra conductor. Feathers slightly ruffled, a glint of troublemaker genius in its eye. Morning field behind. Funny-menacing, never scary."

gen gopher assets/enemies/gopher.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a chubby gopher popping halfway out of a dirt burrow in a green field, cheeks stuffed, little clods of soil flying, wearing a cheeky buck-toothed grin. Ready to chomp something it should not."

gen roly_poly assets/enemies/roly_poly.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a giant cute pill-bug the size of a melon, half-curled into its armored ball, peeking out shyly with big round eyes. Segmented shell like polished pebbles. In the grass of a morning farm field. More bashful than fierce."

gen mud_blob_m assets/enemies/mud_blob_m.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a goofy blob of thick brown mud the size of a hay bale, with two big googly white eyes and a wide drippy grin, raising two stubby mud arms. Little splashes and drips flying off. Sitting in a muddy patch of a morning field. Gross in the funnest possible way."

gen mud_blob_s assets/enemies/mud_blob_s.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a tiny handful-sized blob of brown mud with two huge googly white eyes and a determined little frown, doing its very best to look threatening. One tiny droplet flying off the top. In a muddy patch of a morning field. Adorably harmless."

gen mouse_scrappy assets/enemies/mouse_scrappy.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a tiny gray field mouse in a boxing stance, little fists up, a small bandage on one ear, fierce scrunched-up face. Standing on a barn floor plank. The smallest toughest scrapper on the farm."

gen mouse_zippy assets/enemies/mouse_zippy.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a lean brown field mouse caught mid-dash, body stretched out like a race car, motion lines and a little dust trail behind it, wild happy eyes. On a barn floor plank. Too fast for its own good."

gen mouse_pudge assets/enemies/mouse_pudge.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a very round, very content gray mouse with a big belly, cookie crumbs on its whiskers, winding up a mighty belly-bump. On a barn floor plank next to a stolen cracker. Soft, spherical, surprisingly dangerous."

gen mouse_whiskers assets/enemies/mouse_whiskers.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a wise old rat with extravagantly long white whiskers and bushy eyebrows, leaning on a piece of straw like a walking stick, one paw raised mid-speech as if rallying troops. On a barn floor plank. The brains of the mouse gang."

gen puffball assets/enemies/puffball.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a big round mushroom creature, cream-and-tan cap, puffed up proudly with tiny arms and a smug little smile, faint golden spore sparkles drifting around it. In morning field grass. One bump away from bursting into a cloud of glitter."

gen magpie assets/enemies/magpie.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a sleek black-and-white magpie hovering mid-flight, clutching a shiny gold coin in one claw, giving a guilty sideways glance like it has been caught red-handed. Morning sky over a farm field. Charming little thief."

gen barn_spider assets/enemies/barn_spider.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a fuzzy round barn spider dangling from a single silk thread in a barn doorway, eight big friendly cartoon eyes, little legs spinning a lasso of sticky web. Cute-spooky, absolutely not scary — like a plush toy that learned to knit."

gen old_scarecrow assets/enemies/old_scarecrow.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: an old weathered scarecrow with a carved pumpkin head, standing perfectly still and slightly crooked on its post in a misty morning field, arms out, patched coat stuffed with straw. A single crow perched on its shoulder. Its stitched grin says it is definitely NOT just a scarecrow. Storybook-ominous, kid-safe."

gen ornery_ram assets/enemies/ornery_ram.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a huge barrel-chested ram with magnificent curled horns, lowered head, steam puffing from its nostrils, one hoof pawing the dirt, eyes narrowed in pure ornery determination. Morning pasture behind a broken fence rail it clearly just smashed."

gen scarecrow_post assets/enemies/scarecrow_post.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a stiff straw-stuffed scarecrow mounted on a wooden post, burlap sack head with button eyes, staring straight ahead with unsettling politeness, loose straw drifting off it in the breeze. One of a matched row of field sentries. Deadpan, funny-creepy, kid-safe."

gen rogue_combine assets/enemies/rogue_combine.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: BOSS ART — a huge runaway green combine harvester rumbling through a golden wheat field with no driver, round headlights like wild eyes and a front grille bent into a toothy grin, hay and stalks flying everywhere, smokestack puffing. Big, loud, and completely out of control. Funny-menacing farm machine, never scary."

gen mud_king assets/enemies/mud_king.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: BOSS ART — an enormous throne-sized blob of royal brown mud wearing a lopsided crown of twigs and daisies, holding a bent cattail like a scepter, huge googly eyes and a grand booming grin. Two tiny mud blobs salute him from below. In the muddiest corner of the morning fields. His Majesty of Muck."

# ============================= ACT 2 ENEMIES ================================

gen raccoon_bandit assets/enemies/raccoon_bandit.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a sneaky raccoon standing upright at dusk, natural mask markings like a burglar, clutching a small burlap sack of stolen coins over its shoulder, mid-tiptoe with a delighted guilty grin. Barnyard fence and amber dusk sky behind."

gen waltzing_weasel assets/enemies/waltzing_weasel.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: an elegant long-bodied weasel dancing on its hind legs at dusk, mid-twirl with one paw extended like a ballroom flourish, hypnotic swirls in its eyes, little musical sparkles circling it. Barnyard at amber dusk behind. So graceful it makes you dizzy."

gen snapping_turtle assets/enemies/snapping_turtle.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a big grumpy snapping turtle with a mossy shell layered like armor plates, jaw open in a mighty CHOMP, little pond weeds hanging off it. At the muddy edge of a barnyard pond at dusk. A tank with a temper."

gen possum_defender assets/enemies/possum_defender.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a big burly possum standing upright with arms crossed like a bouncer, sturdy and unbothered, protectively planted in front of a knocked-over trash can den at dusk. Big brother energy."

gen possum_healer assets/enemies/possum_healer.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a small gentle possum with soft eyes holding a little bundle of herbs and clover blossoms, offering them up like medicine. Sitting by a knocked-over trash can den at dusk. The sweet little sibling who patches everyone up."

gen thorny_bramble assets/enemies/thorny_bramble.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a living bramble bush at dusk, three whippy thorned vines raised like arms, two mischievous dark berries for eyes and a leafy grin, a torn scrap of overalls snagged on one thorn. Growing wild against a barnyard fence. Pointy but personable."

gen porcupine assets/enemies/porcupine.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a large porcupine puffed up to maximum, quills fanned out like a pincushion arsenal, chewing one quill like a toothpick with narrowed cowboy eyes. On a barnyard woodpile at dusk. A walking hailstorm of pointy."

gen fox assets/enemies/fox.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a sly red fox at dusk, sitting with tail curled neatly, half-lidded clever eyes and a knowing smirk, one ear cocked. Amber dusk light on barnyard straw. The kind of smile that means your snack is already gone."

gen raccoon_ringleader assets/enemies/raccoon_ringleader.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a tall commanding raccoon standing on an upturned crate at dusk, pointing a bent twig like a general's baton, chest puffed, rallying unseen troops with theatrical flair. Barnyard behind. Nine-tenths showmanship, one-tenth menace."

gen raccoon_minion assets/enemies/raccoon_minion.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a tiny raccoon pup with enormous sparkly eyes and an oversized attitude, fists raised in a wobbly fighting stance it clearly copied from someone bigger. Barnyard at dusk. Ninety percent fluff."

gen raccoon_king assets/enemies/raccoon_king.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: BOSS ART — a magnificently fat raccoon king lounging on a throne built of stacked trash treasure at dusk, wearing a tin-can crown, holding a trash-can lid as a shield and a bent fork as a scepter, one eyebrow raised imperiously. Fairy lights of fireflies around the throne. Royalty of the barnyard, ruler of all he has stolen."

# ============================= ACT 3 ENEMIES ================================

gen ball_lightning assets/enemies/ball_lightning.png 1024x1024 - "Square image, 1024x1024.
$NSTYLE

Subject: a crackling ball of blue-white lightning the size of a beach ball, floating over a night field, with a zig-zag grin and sparking little arcs like arms. Glowing bright against the storm dark. Zappy, bouncy, delighted to exist."

gen hail_cloud assets/enemies/hail_cloud.png 1024x1024 - "Square image, 1024x1024.
$NSTYLE

Subject: a grumpy little storm cloud hovering low over a night field, cheeks puffed with effort as it pelts marble-sized hailstones downward, tiny lightning sparks in its frown. Comically cranky, not scary."

gen flooding_creek assets/enemies/flooding_creek.png 1024x1024 - "Square image, 1024x1024.
$NSTYLE

Subject: a surging creek rising up into a serpent-shaped wave of dark water, foamy whitecaps forming a wild mane and two glowing moonlit eyes, curling over a flooded fence line at night in the rain. Powerful and dramatic, storybook not scary."

gen passing_squall assets/enemies/passing_squall.png 1024x1024 - "Square image, 1024x1024.
$NSTYLE

Subject: a towering half-transparent figure made of sideways wind and rain sweeping across a night field, leaves and stray leaves and a lost umbrella caught up in its stride, faint face of rushing cloud. Here and gone in moments. Majestic, blustery, kid-safe."

gen debris_tangle assets/enemies/debris_tangle.png 1024x1024 - "Square image, 1024x1024.
$NSTYLE

Subject: a rolling tangled ball of storm debris — branches, baling wire, leaves, a lost kite and half a fence board — with two peeking eyes deep inside and twiggy hands reaching out. Tumbling across a night field. A junk drawer come to life."

gen thunderhead assets/enemies/thunderhead.png 1024x1024 - "Square image, 1024x1024.
$NSTYLE

Subject: ELITE ART — a massive anvil-shaped thundercloud filling the night sky above a tiny farm fence, with the stern face of a grumpy old judge formed in its folds, deep lightning glowing inside it like a held breath, counting down to something big. Grand and rumbling, storybook not scary."

gen ghost_wind assets/enemies/ghost_wind.png 1024x1024 - "Square image, 1024x1024.
$NSTYLE

Subject: ELITE ART — a pale translucent wind spirit drifting above a moonlit night field, long flowing form like a bedsheet of mist, gentle glowing eyes and a calm knowing smile, fireflies passing straight through it. Beautiful and a little spooky in the friendliest way."

gen wind_funnel assets/enemies/wind_funnel.png 1024x1024 - "Square image, 1024x1024.
$NSTYLE

Subject: ELITE ART — a mid-sized tornado funnel over a night field with two tiny baby dust devils spinning beside it like ducklings following their parent, hay and leaves orbiting all three. The funnel leans proudly like a parent showing off. Windy family portrait, funny-menacing."

gen dust_devil assets/enemies/dust_devil.png 1024x1024 - "Square image, 1024x1024.
$NSTYLE

Subject: a knee-high baby whirlwind of dust and leaf confetti with a squinty determined little cartoon face, spinning so hard it wobbles. On a night field in storm light. Tiny tornado, tiny fury, zero actual threat."

gen big_twister assets/enemies/big_twister.png 1024x1024 - "Square image, 1024x1024.
$NSTYLE

Subject: FINAL BOSS ART — a huge dramatic night tornado touching down on distant farm fields, lightning flickering deep inside the funnel, barn boards and hay bales swirling in its wide debris skirt, the faintest suggestion of a swirling eye and mouth in the cloud wall. Epic, awe-inspiring, funny-ominous — the storybook storm of the century, kid-safe."

gen big_twister_p2 assets/enemies/big_twister_p2.png 1024x1024 - "Square image, 1024x1024.
$NSTYLE

Subject: FINAL BOSS PHASE TWO ART — the same huge night tornado RE-FORMED even bigger and wider, now darker with bright lightning veins running up the funnel like glowing roots, a double ring of spinning debris, its swirling cloud-face now clearly awake and roaring with storm-wind. The final form of the storm of the century. Epic and thrilling, still kid-safe."

gen thunder assets/enemies/thunder.png 1024x1024 - "Square image, 1024x1024.
$NSTYLE

Subject: BOSS ART — a huge round rumbling cloud-giant in deep blue-purple, built like a friendly sumo wrestler made of storm cloud, raising two drum-like cloud fists that boom with sound rings. Night sky over a farm fence. The big loud sibling of a storm duo."

gen lightning assets/enemies/lightning.png 1024x1024 - "Square image, 1024x1024.
$NSTYLE

Subject: BOSS ART — a skinny crackling storm spirit made of jagged yellow-white lightning bolts, zig-zag limbs and wild electric hair, caught mid-leap with a mischievous grin full of static. Night sky over a farm fence. The quick sneaky sibling of a storm duo."

# ============================= BACKGROUNDS ==================================

gen battle1 assets/backgrounds/battle1.png 1536x1024 - "Wide landscape image, 3:2 ratio, 1536x1024.
$SCENE

Scene: a wide painted farm-field battleground at morning — rolling green pasture in the foreground with soft grass texture, golden crop rows and a distant fence line, a big open blue-gold morning sky. The middle of the image is calm and uncluttered (game characters will stand there); detail lives at the edges. Storybook backdrop for an adventure's first act."

gen battle2 assets/backgrounds/battle2.png 1536x1024 - "Wide landscape image, 3:2 ratio, 1536x1024.
$SCENE2

Scene: a wide painted barnyard battleground at dusk — packed-dirt yard in the foreground, a classic red barn with white trim and a wooden fence to one side, hay bales and a water trough at the edges, big amber-violet dusk sky with the first stars. The middle of the image is calm and uncluttered (game characters will stand there). Storybook backdrop for an adventure's second act."

gen battle3 assets/backgrounds/battle3.png 1536x1024 - "Wide landscape image, 3:2 ratio, 1536x1024.
$SCENE3

Scene: a wide painted storm-night battleground — dark wind-flattened field grass in the foreground, rain streaking sideways, a distant farmhouse with one warm lit window, huge rolling storm clouds with moonlit edges and a flicker of lightning on the horizon. The middle of the image is calm and uncluttered (game characters will stand there). Dramatic but cozy-storybook, not scary."

gen map1 assets/backgrounds/map1.png 1024x1536 - "Vertical image, 2:3 ratio, 1024x1536.
$SCENE

Scene: a soft muted painted overview of morning farm fields seen from above at a gentle angle — patchwork crop fields, a winding dirt path climbing from the bottom of the image to the top, scattered trees and a small creek. Low contrast, gentle hazy colors, deliberately calm and unbusy: game map icons will be drawn on top of this. No people, no animals."

gen map2 assets/backgrounds/map2.png 1024x1536 - "Vertical image, 2:3 ratio, 1024x1536.
$SCENE2

Scene: a soft muted painted overview of a barnyard and farmstead at dusk seen from above at a gentle angle — barn roofs, pens, a silo, a winding path climbing from the bottom of the image to the top between them, warm windows starting to glow. Low contrast, gentle dusky colors, deliberately calm and unbusy: game map icons will be drawn on top of this. No people, no animals."

gen map3 assets/backgrounds/map3.png 1024x1536 - "Vertical image, 2:3 ratio, 1024x1536.
$SCENE3

Scene: a soft muted painted overview of storm-dark fields at night seen from above at a gentle angle — wind-bent crops, a winding path climbing from the bottom of the image to the top, distant lightning glow behind clouds, one farmhouse light far away. Low contrast, deep calm blues, deliberately unbusy: game map icons will be drawn on top of this. No people, no animals."

# ============================= TITLE + ICON =================================

gen title assets/ui/title.png 1024x1536 - "Vertical image, 2:3 ratio, 1024x1536.
$SCENE

Scene: a beautiful small Iowa family farm at golden hour, painted storybook-style — a classic red barn with white trim, golden crop fields, a long dirt road leading toward the horizon, a windmill, and a line of white ducks waddling along the road. On the far horizon, a single enormous storybook tornado looms in dramatic-but-friendly silhouette, lit gold by the sunset. The upper third of the image is mostly warm open sky with soft clouds (a game logo will be overlaid there). In the LOWER RIGHT foreground, close to the corner, one llama stands perfectly still at a fence, watching the viewer. Cozy, epic, like the cover of a beloved children's book."

gen icon assets/ui/icon.png 1024x1024 - "Square image, 1024x1024.
Bold simple app icon, hand-painted storybook gouache style, thick rounded shapes, vibrant saturated colors, no text, no borders, no watermark.

Subject: a friendly classic red barn with white trim, a small cartoon tornado swirling playfully above its roof, and one white duck standing proudly in front. Simple warm sky background, composition readable at tiny sizes."

# ============================= EVENT SCENES =================================

gen duck_pond assets/events/duck_pond.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a small farm duck pond in morning light, a parade of white ducks swimming in a neat line — and one fluffy yellow duckling separated on the grassy bank, looking up at the viewer with enormous hopeful eyes. Cattails and lily pads around. The most important decision of the day."

gen old_well assets/events/old_well.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: an old stone wishing well with a little shingled roof and a wooden bucket, standing alone at the edge of a farm field, its water glimmering with faint golden sparkle light from within. A single coin mid-toss glints in the air above it. Inviting and mysterious."

gen pie_contest assets/events/pie_contest.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a county-fair pie table groaning under a dozen glorious golden-crusted pies, steam curling up, one pie in the center wearing a huge blue first-place ribbon. Bunting flags overhead, a rolling pin standing guard like a sword in a stone. Warm, delicious, faintly competitive."

gen beehive assets/events/beehive.png 1024x1024 - "Square image, 1024x1024.
$CSTYLE

Subject: a wooden beehive box at the sunny edge of an orchard, one golden honeycomb frame pulled halfway out and dripping with glowing honey, a squadron of round fuzzy cartoon bees hovering in perfect formation, watching the viewer with polite suspicion. Sweet reward, obvious consequences."

gen burn_barrel assets/events/burn_barrel.png 1024x1024 - "Square image, 1024x1024.
$SCENE2

Scene: a rusty farm burn barrel at dusk with a small cheerful fire crackling inside, sparks rising like fireflies into the amber-violet sky, a stack of old papers and a wooden stool beside it, the silhouette of a barn far behind. Cozy end-of-day ritual energy — the warm kind of letting go."

# ============================= REPORT =======================================

if [ "$MODE" = "list" ]; then
  echo "art inventory (${#ALL_IDS[@]} ids):"
  for entry in "${ALL_IDS[@]}"; do
    id="${entry%%|*}"; out="${entry#*|}"
    if [ -f "$out" ]; then echo "  ✅ $id"; else echo "  ⬜ $id → $out"; fi
  done
  exit 0
fi

echo ""
echo "generated: ${#GENERATED[@]} — ${GENERATED[*]:-none}"
echo "skipped:   ${#SKIPPED[@]}"
echo "FAILED:    ${#FAILED[@]} — ${FAILED[*]:-none}"
[ ${#FAILED[@]} -gt 0 ] && exit 1
exit 0
