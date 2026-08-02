#!/bin/bash
# RL2 soundtrack batch via suno-auto (take 1 kept, per standing rule).
# Sequential; each call re-heals the Clerk cookie. Logs JSON per track.
set -uo pipefail
cd "$(dirname "$0")/.."
VAULT="/Users/jamesmoran/Library/CloudStorage/GoogleDrive-jamessheehanmoran@gmail.com/My Drive/second-brain"
LY="${RL2_LYRICS_DIR:?set RL2_LYRICS_DIR to the lyrics folder}"
mkdir -p assets/audio/gen-logs

gen_track() { # track title [extra args...]
  local track="$1" title="$2"; shift 2
  if [ -f "assets/originals/audio/$track.mp3" ]; then echo "=== $track already done"; return 0; fi
  local tmp="assets/audio/tmp_$track"
  mkdir -p "$tmp"
  # transient "hcaptcha never finished loading" config_errors cost 0 credits — retry
  local id="" attempt
  for attempt in 1 2 3; do
    echo "=== $(date +%H:%M:%S) generating $track ($title) [attempt $attempt]"
    ( cd "$VAULT" && .claude/skills/suno/suno-auto generate --title "$title" "$@" --model v5.5 --wait --download "/Users/jamesmoran/code/rolfe-legends-2/$tmp" ) > "assets/audio/gen-logs/$track.json" 2>&1
    id=$(/usr/bin/grep -o '"id": "[0-9a-f-]*"' "assets/audio/gen-logs/$track.json" | head -1 | cut -d'"' -f4)
    [ -n "$id" ] && break
    echo "    transient failure; cooling down 45s"
    sleep 45
  done
  if [ -z "$id" ]; then echo "!!! $track FAILED after 3 attempts (see gen-logs/$track.json)"; return 1; fi
  local f
  f=$(ls "$tmp" | /usr/bin/grep "${id:0:8}" | head -1)
  if [ -z "$f" ]; then echo "!!! $track FAILED (take-1 file ${id:0:8} not downloaded)"; return 1; fi
  mkdir -p assets/originals/audio
  mv "$tmp/$f" "assets/originals/audio/$track.mp3"
  # take 2 parked (gitignored), never shipped — standing keep-take-1 rule
  mkdir -p assets/audio/other-takes
  for rest in "$tmp"/*; do [ -f "$rest" ] && mv "$rest" "assets/audio/other-takes/$track-take2.mp3"; done
  rmdir "$tmp" 2>/dev/null || true
  echo "    done: $track ← take 1 ($id)"
}

FAILS=0
gen_track map1 "RL2 Morning Fields" --tags "gentle morning folk instrumental, acoustic guitar, soft whistling, pastoral, light and warm, video game map music, looping" --exclude "vocals, singing, sad, dark" --instrumental || FAILS=1
gen_track map2 "RL2 Dusk Barnyard" --tags "warm dusk porch folk instrumental, slide guitar, harmonica, lazy golden evening, cozy americana, video game map music, looping" --exclude "vocals, singing, sad" --instrumental || FAILS=1
gen_track map3 "RL2 Storm Night" --tags "tense night storm underscore instrumental, low strings, rumbling toms, wind, suspenseful adventure, cinematic, video game map music" --exclude "vocals, singing, horror, scary, screeching" --instrumental || FAILS=1
gen_track battle "RL2 Battle" --tags "energetic bluegrass rock hoedown instrumental, fast fiddle, banjo, driving drums, playful fight music, video game battle theme, looping" --exclude "vocals, singing, sad" --instrumental || FAILS=1
gen_track elite "RL2 Big Trouble" --tags "heavy stomp bluegrass rock instrumental, menacing but fun, big drums, electric guitar and banjo, danger theme, video game elite battle, looping" --exclude "vocals, singing, horror" --instrumental || FAILS=1
gen_track boss "RL2 Boss Showdown" --tags "epic orchestral country rock showdown instrumental, thunderous drums, brass hits, dramatic heroic finale, video game boss battle, looping" --exclude "vocals, singing, horror, scary" --instrumental || FAILS=1
gen_track anthem_wyatt "Wyatt the Speedy" --tags "upbeat pop punk country rock, kids victory anthem, fast bright electric guitars, gang vocals, triumphant, young male vocals" --exclude "sad, slow, screaming" --lyrics-file "$LY/wyatt.txt" || FAILS=1
gen_track anthem_aaron "Aaron the Strong" --tags "stomp rock kids victory anthem, heavy drums, country rock, powerful, triumphant, young male vocals" --exclude "sad, slow, metal screams" --lyrics-file "$LY/aaron.txt" || FAILS=1
gen_track anthem_liam "Liam the Little" --tags "silly bouncy kids song, ukulele, tuba, playful, upbeat, giggly, children's music" --exclude "sad, slow, rock, heavy" --lyrics-file "$LY/liam.txt" || FAILS=1
gen_track anthem_both "Legends of Rolfe" --tags "triumphant country pop finale, brass, gang vocals, joyful, kids victory anthem, big singalong ending" --exclude "sad, slow" --lyrics-file "$LY/both.txt" || FAILS=1

./assets/optimize-audio.sh >/dev/null && echo "(optimize-audio refreshed deployed 128kbps copies)"
echo "=== music batch complete (fails=$FAILS)"
ls -la assets/audio/*.mp3
exit $FAILS
