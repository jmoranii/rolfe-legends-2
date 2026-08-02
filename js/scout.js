// Rolfe Legends 2 — Coach James's scouting reports. Tap any enemy in a fight and
// Coach tells you what it actually does and how to beat it.
//
// Rule for writing these: every line must be TRUE of the code in js/enemies.js. A
// scouting report that's merely flavorful is worse than none — the kid will trust it
// and get hit. Name the real mechanic, then give one concrete piece of advice.
//
// DRAFT — family cameo dialogue needs James's sign-off before ship (CLAUDE.md).

export const SCOUT = {
  // ================= ACT 1 — The Far Fields =================
  crow: "First thing it does is CAW, and after that it gets a little stronger every single turn. That's the whole trick. The longer this bird's alive, the harder it pecks, so hit it early and hit it hard.",
  gopher: "He mixes it up: a big Chomp, a Thrash that hits AND blocks, or he burrows down and bulks up. When you see Burrow & Bulk, that's your window to load up, because the next one's coming in heavy.",
  roly_poly: "Little guy, but the first time you hit him he curls up and takes 6 damage off the top. So don't tickle him. One good hit beats three little ones here.",
  roly_poly_curled: "He's balled up now, so he's got Block soaking your hits. That only happens once though. Push through it and he's got nothing left to hide behind.",
  mud_blob_m: "Knock it to half and it SPLITS into two. That's not you doing something wrong, that's just what mud does. Save a big sweep-everybody card for right after it splits.",
  mud_blob_s: "Little blip. Barely a splat in him. Clean it up and move on.",
  mouse_scrappy: "Every time you hit him he gets MADDER and hits harder. Don't poke at this one. Finish him.",
  mouse_zippy: "Fast and bitey, and he hits harder than the others his size. No tricks, no armor. Take him out first.",
  mouse_pudge: "The chunky one. His belly bump doesn't hurt much, but it makes you Weak, so your own hits land softer after. Annoying more than dangerous.",
  mouse_whiskers: "See how he's talking to the others? That speech makes every OTHER mouse stronger. He's the reason the little ones hurt. Take the talker out first.",
  puffball: "Careful with this one. When it pops, the spores make you Vulnerable, which means you take extra damage for a couple turns. Kill it when you've got your Block up, not right before a big hit lands.",
  magpie: "She's a thief. Two snatches, then she covers up, then she's GONE with your gold. You've got about three turns to make her regret it.",
  barn_spider: "Bites hard, and every so often webs you up to make you Weak. Not much to outsmart here. Just steady damage.",
  old_scarecrow: "He's just standing there. Menacingly. And he's blocking while he does it. He wakes up on his own after a few turns, or the second you hit him. Best plan: leave him be and spend those free turns getting your Block and your Strength stacked up.",
  ornery_ram: "This is the big one to respect. He snorts, and after THAT, every skill card you play makes him stronger. Attacks are fine. Skills feed him. Punch, don't posture.",
  scarecrow_post: "It flips back and forth: a straw beam, then it shoves junk Straw cards into your discard pile. Those Straw cards clog your deck for the fight. Faster you drop it, less junk you're shuffling.",
  rogue_combine: "The boss of the fields, and he's got TWO modes. In mow mode he winds up and then MOWS for a huge hit. But do enough damage and he clanks over into armored mode, where he blocks a ton AND has spikes that hurt you back. When he's armored, that's the time to build up, not swing. Wait for the engine roar, then let him have it.",
  rogue_combine_hunker: "He's buttoned up in armored mode right now. Big Block, and spikes that bite back every time you hit him. Two turns of this, then the engine roars and he's back to mowing. Don't waste your best cards on the armor. Get your Block up and be ready the second he opens up.",
  mud_king: "He rules the mud until you knock him to half, and then he doesn't die. He splits into two full-size blobs. Go in knowing that fight has a second half, and keep something big in the tank.",

  // ================= ACT 2 — The Barnyard =================
  raccoon_bandit: "Same racket as the magpie. He mugs you for gold twice, guards up, then runs off with it. Want your money back? Drop him before he scampers.",
  waltzing_weasel: "This is the weird one. That waltz confuses you, and your card costs go all scrambled for the whole fight. It's not broken, it's him. Play what you can afford and don't panic. When he goes down, everything goes back to normal.",
  snapping_turtle: "That shell is armor that DOESN'T go away at the end of the turn like normal Block, and he adds more every turn. Chip damage is useless here. You need big single hits to get through the plating.",
  possum_defender: "The big one shields the little one. Any damage you put into the small one, big brother just covers it back up. Deal with the big shielder first, or you'll be doing the same work twice.",
  possum_healer: "The little one heals the big one, 12 at a time. So yeah, they cover for each other. Pick ONE and focus everything on it, or you'll never get ahead.",
  thorny_bramble: "Mostly it lashes you three times fast, which means Block is great here. Every point of Block eats a whole lash. Sometimes it tangles you up Frail and Weak instead.",
  porcupine: "Watch the quills. It starts at two and adds ONE MORE every single time. Turn five is a whole lot of quills. This is a race, and it wins long fights. Go fast.",
  fox: "Every bite dumps a Scraped Knee into your discard pile, and those are dead cards clogging your deck. She never stops doing it either. Speed matters more than safety on this one.",
  raccoon_ringleader: "He calls in pups, and then he cheers them on and makes them all stronger. Here's the thing though: the pups keep coming. He's the faucet. Shut off the faucet.",
  raccoon_minion: "Just a pup. Swipes at you, sometimes hisses and blocks. They're not the problem, the one calling them in is.",
  raccoon_king: "The crown of the barnyard. He cycles through slams, a big trash-lid wall, and a taunt that makes you Weak AND Frail. Then at half health he goes into ROYAL FURY, shakes off everything you put on him, and comes at you twice as mean. Do NOT show up to the halfway point with an empty hand.",

  // ================= ACT 3 — The Storm =================
  ball_lightning: "Knock it out and it comes BACK, unless everything else on the field is already down. So don't waste your big swings on it early. Clear its friends first, then it stays gone.",
  hail_cloud: "It pelts you and drops Hailstone cards straight into your draw pile, so you'll be drawing junk mid-fight. The longer it's up, the more clogged you get.",
  flooding_creek: "First thing it does is raise the water, and after that you're constricted for the whole fight. Then it just crashes on you, hard. When the water drops, so does the squeeze. Kill it to breathe again.",
  passing_squall: "Do not fight this one. Seriously. It's got basically endless health and it hits harder EVERY turn, and then after five turns it just blows over on its own. Block up, hang on, let it pass.",
  debris_tangle: "It opens by flinging Poison Ivy into your discard, which is a curse card you're stuck with. After that it whips you or throws up a junk wall. Nasty, but it only curses you the once.",
  thunderhead: "See the countdown in its intent? That's a real countdown. Four rumbles, and then a THUNDERSTRIKE that will take your head off. You've got exactly four turns to get your Block up or end it early.",
  ghost_wind: "Every other turn it goes ghostly and your hits barely touch it. So watch the pattern and save your heavy stuff for the solid turns. And that scythe hits like a truck, so don't be low when it swings.",
  wind_funnel: "It spins up dust devils to do its dirty work. The devils hit once and then dissipate on their own, so honestly? Ignore them. Put everything into the funnel.",
  dust_devil: "One big whirl and then it's gone on its own. Not worth a card. Let it spend itself.",
  thunder: "These two work together. Thunder makes them BOTH stronger every other turn, while Lightning shields them both. That's why they're rough as a pair. Most folks take Thunder out first so the strength stops stacking.",
  lightning: "Lightning shields them both every other turn, so anything you do on a shield turn mostly bounces. Time your big hit for the turn AFTER the shields go up.",
  big_twister: "The biggest one on the farm, and here's what nobody tells you: when you beat it, it isn't over. It RE-FORMS, bigger, meaner, and stronger than before. Also, every Power card you play makes it a little stronger, so it's curious about you. Beat phase one with something left in the tank, because phase two is the real fight.",
  big_twister_p2: "This is the re-formed one. Monster gusts, triple funnels, and a roar that leaves you Weak and Vulnerable at the same time. No more phases after this. Everything you've got, right now.",
};

// Anything without a written report falls back to this rather than showing nothing.
export const SCOUT_FALLBACK = "Haven't got a read on this one yet. Watch what it's telegraphing and trust your gut.";

// artKey wins when it has its own report, so a transformed enemy (the re-formed
// Twister, the armored Combine) gets the read on the form you're actually facing.
export function scoutFor(key, artKey) {
  return (artKey && SCOUT[artKey]) || SCOUT[key] || SCOUT_FALLBACK;
}
