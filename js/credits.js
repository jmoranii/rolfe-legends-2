// Rolfe Legends 2 — synced-lyric victory credits (the RL1 crown-roll trick).
// Each hero's first win rolls an animated victory lap set to their Suno anthem:
// as the song names each family member, their painted portrait slides in, and
// the real lyric lights up word-by-word AS it is sung (Suno word-level timing,
// saved at assets/audio/<track>.lrc). Beats are DERIVED from the lyrics — the
// engine scans the timed words for cast names, so a re-generated anthem re-times
// the whole sequence with no code changes. Missing lrc → wall-clock + evenly
// timed fallback lines; missing art → emoji. Skippable always.

import * as music from './music.js';

// name triggers → the painted cast (art is drop-in, emoji fallback)
const CAST = [
  { re: /^(rusty)/i, art: 'assets/events/treasure_rusty.png', emoji: '🐕', name: 'Rusty', title: 'The Goodest Boy' },
  { re: /^(granny|rockie)/i, art: 'assets/events/rest_granny.png', emoji: '🍪', name: 'Granny Rockie', title: 'Cookies & Practice' },
  { re: /^(poppa|flaj)/i, art: 'assets/events/tractor_ride.png', emoji: '🚜', name: 'Poppa Flaj', title: 'Headed That Way Anyhow' },
  { re: /^(coach)/i, art: 'assets/ui/portrait_coach.png', emoji: '🧢', name: 'Coach James', title: 'Believed in you all along' },
  { re: /^(goldie)/i, art: 'assets/events/goldie_gate.png', emoji: '🦙', name: 'Goldie', title: 'Goldie knows.' },
  { re: /^(mom)/i, art: 'assets/events/care_package.png', emoji: '📦', name: 'Mom', title: 'The Care Package' },
  { re: /^(dad)/i, art: 'assets/events/shop_jacob.png', emoji: '🛒', name: 'Dad', title: 'The Farm Supply' },
  { re: /^(brody)/i, art: 'assets/events/brody_garage.png', emoji: '🔧', name: 'Uncle Brody', title: 'REAL TALK' },
  { re: /^(chelsea)/i, art: 'assets/events/chelsea_kitchen.png', emoji: '🍲', name: 'Aunt Chelsea', title: 'The Warm Kitchen' },
  { re: /^(duck)/i, art: 'assets/events/duck_pond.png', emoji: '🦆', name: 'The Ducks', title: 'The Victory Beat' },
  { re: /^(twister|storm)/i, art: 'assets/enemies/big_twister.png', emoji: '🌪️', name: 'The Big Twister', title: 'Sent packing' },
];

const HERO_SCENES = {
  wyatt: { re: /^wyatt/i, art: 'assets/ui/portrait_wyatt.png', emoji: '⚡', name: 'WYATT', title: 'The Speedy' },
  aaron: { re: /^aaron/i, art: 'assets/ui/portrait_aaron.png', emoji: '🌪️', name: 'AARON', title: 'The Strong · The Lil Tornado' },
  liam: { re: /^liam/i, art: 'assets/ui/portrait_liam.png', emoji: '🍼', name: 'LIAM', title: 'The Little' },
};

const FINALES = {
  wyatt: { big: 'WYATT', sub: 'The Speedy — Legend of Rolfe' },
  aaron: { big: 'AARON', sub: 'The Strong — Legend of Rolfe' },
  liam: { big: 'LIAM', sub: 'The Little — the Tiniest Legend of Rolfe' },
  both: { big: 'WYATT & AARON', sub: 'The Legends of Rolfe' },
};

// caption remaps: if Suno mispronounces/mis-times a word, remap its display
// text here without touching the audio (RL1 trick). Filled after listening.
const REMAP = {};

// untimed fallback lines per anthem (used when the .lrc is missing: wall clock,
// one line every few seconds — the show still works offline/pre-music)
const FALLBACK_LINES = {
  wyatt: ['Out in Rolfe when the morning glows', 'Wyatt laced up, gave the ball a spin', 'WYATT! Speedy as the wind', 'The Big Twister could not catch him', 'The farm is safe, the fields are green', 'WYATT!'],
  aaron: ['Storm rolled in with a hungry sound', 'Aaron the Strong stood his ground', 'AARON! Strong as an oak', 'TORNADO FORM — the twister broke!', 'The barn still stands, the fields are gold', 'AARON!'],
  liam: ['Who is that waddling through the corn?', 'LIAM! LIAM THE LITTLE!', 'And THE BLOWOUT went KA-BOOM!', 'The tiniest legend saved the day', 'LIAM! Hooray!'],
  both: ['Two brothers on one farm road', 'LEGENDS OF ROLFE! The storm is done', 'WYATT AND AARON — the farm is won!', 'Brothers forever, side by side', 'LEGENDS OF ROLFE!'],
};

// ---------- LRC parsing (Suno word-level; line-level tolerated) ----------

function parseTime(s) {
  const m = /(\d+):(\d+(?:\.\d+)?)/.exec(s);
  return m ? Number(m[1]) * 60 + Number(m[2]) : null;
}

// Returns [{t, words: [{w, t}]}] or null.
//
// suno-cli `timed-lyrics --lrc` emits ONE WORD PER LINE:
//   [00:10.61] [Verse]     ← section marker; its time carries to the next word
//   Out                    ← bare word (inherits the carried time)
//   [00:11.21] in
//   ...
//   (blank line)           ← phrase break → one caption line
// Classic line-level and enhanced <t>word LRC are tolerated as fallbacks.
export function parseLrc(text) {
  if (!text) return null;
  const lines = [];
  let cur = [];
  let carryT = null;
  const flush = () => {
    if (cur.length) lines.push({ t: cur[0].t, words: cur });
    cur = [];
  };
  for (const raw of text.split('\n')) {
    if (!raw.trim()) { flush(); continue; }
    const m = /^\s*\[(\d+:\d+(?:\.\d+)?)\]\s*(.*)$/.exec(raw);
    if (m) {
      const t = parseTime(m[1]);
      const rest = m[2].trim();
      if (/^\[.*\]$/.test(rest)) { carryT = t; continue; }       // [Verse]/[Chorus] marker
      if (!rest) { carryT = t; continue; }
      // enhanced <t>word tags inside the line?
      const wordRe = /<(\d+:\d+(?:\.\d+)?)>\s*([^<]*)/g;
      let wm, any = false;
      while ((wm = wordRe.exec(rest)) !== null) {
        any = true;
        const wt = parseTime(wm[1]);
        for (const w of wm[2].trim().split(/\s+/)) if (w) cur.push({ w, t: wt });
      }
      if (!any) {
        const ws = rest.split(/\s+/);
        if (ws.length === 1) cur.push({ w: ws[0], t });           // per-word format
        else {                                                    // line-level: spread gently
          flush();
          ws.forEach((w, i) => cur.push({ w, t: t + i * 0.28 }));
          flush();
        }
      }
    } else {
      // bare word: inherits the carried section time (or follows the last word)
      const w = raw.trim();
      if (/^\[.*\]$/.test(w)) continue;
      const t = carryT != null ? carryT : (cur.length ? cur[cur.length - 1].t + 0.01 : 0);
      cur.push({ w, t });
    }
    carryT = null;
  }
  flush();
  return lines.length ? lines : null;
}

// derive portrait beats from the timed words
function deriveBeats(lines, heroId) {
  const beats = [];
  const lastShown = new Map();
  let lastBeat = -3;
  const heroes = heroId === 'both' ? [HERO_SCENES.wyatt, HERO_SCENES.aaron] : [HERO_SCENES[heroId]];
  for (const line of lines) {
    for (const { w, t } of line.words) {
      const word = w.replace(/[^a-zA-Z]/g, '');
      if (!word) continue;
      let scene = null;
      for (const h of heroes) if (h && h.re.test(word)) scene = { kind: 'hero', ...h };
      if (!scene) {
        for (const c of CAST) if (c.re.test(word)) { scene = { kind: 'cast', ...c }; break; }
      }
      if (!scene) continue;
      const cool = scene.kind === 'hero' ? 9 : 16;
      if (t - lastBeat < 2.4) continue;
      if (lastShown.has(scene.name) && t - lastShown.get(scene.name) < cool) continue;
      beats.push({ t: Math.max(0, t - 0.15), scene });
      lastShown.set(scene.name, t);
      lastBeat = t;
    }
  }
  return beats;
}

// ---------- the roll ----------

// deps injected from game.js: { el, artImg, sfx, REDUCED }
export function creditsRoll(heroId, deps, onDone) {
  const { el, artImg, REDUCED } = deps;
  const track = `anthem_${heroId}`;
  music.play(track);

  const root = el('div', 'credits');
  const bg = el('div', 'credits-bg');
  const stage = el('div', 'credits-stage');
  const cap = el('div', 'credits-caption');
  const skip = el('button', 'credits-skip', 'skip ⏭');
  root.append(bg, stage, cap, skip);
  document.body.appendChild(root);

  let lines = null, beats = [], duration = 95;
  let beatIdx = -1, lineIdx = -1, capWords = [], curSlide = null;
  let ended = false, raf = 0, wallBase = null, started = false, hintEl = null;

  const audioEl = () => document.querySelector(`audio[data-track="${track}"]`);
  const clock = () => {
    const a = audioEl();
    if (a && !a.paused && a.currentTime > 0.05) return a.currentTime;
    return wallBase != null ? (performance.now() - wallBase) / 1000 : 0;
  };

  function setBg(path) {
    bg.style.opacity = '0';
    setTimeout(() => {
      bg.style.backgroundImage = path ? `url("${path}")` : 'none';
      bg.style.opacity = '1';
    }, 180);
  }

  function showSlide(build) {
    const slide = el('div', `credits-slide${REDUCED ? '' : ' enter-right'}`);
    build(slide);
    const old = curSlide;
    stage.appendChild(slide);
    curSlide = slide;
    if (old) {
      if (REDUCED) old.remove();
      else {
        old.classList.remove('enter-right');
        old.classList.add('exit-left');
        setTimeout(() => old.remove(), 700);
      }
    }
  }

  function introSlide() {
    setBg('assets/ui/title.png');
    showSlide((s) => {
      s.append(el('div', 'credits-crown', '👑'));
      s.append(el('div', 'credits-big', FINALES[heroId].big));
      s.append(el('div', 'credits-intro',
        `<div class="ci ci-1">🎉 You did it!</div>` +
        `<div class="ci ci-2">Sit back — here comes your victory song.</div>` +
        `<div class="ci ci-3">🎬 The whole farm is about to take a bow — keep watching <span class="ci-go">→</span></div>`));
    });
  }

  function sceneSlide(scene) {
    setBg(scene.kind === 'hero' ? 'assets/ui/title.png' : `assets/backgrounds/battle1.png`);
    showSlide((s) => {
      if (scene.kind === 'hero') s.append(el('div', 'credits-crown small', '👑'));
      s.append(artImg(scene.art, scene.emoji, `credits-portrait${scene.kind === 'hero' ? ' hero' : ''} in-pop`));
      const card = el('div', 'credits-titlecard');
      card.append(el('div', 'cn', scene.name), el('div', 'ct', scene.title));
      s.append(card);
    });
  }

  let continued = false;
  function finaleSlide() {
    if (continued) return;
    continued = true;
    setBg('assets/ui/title.png');
    showSlide((s) => {
      s.append(el('div', 'credits-crown', '👑'));
      s.append(el('div', 'credits-big', FINALES[heroId].big));
      s.append(el('div', 'credits-sub', FINALES[heroId].sub));
      s.append(el('div', 'credits-crew', `Made with love by <b>Uncle James</b><br><span class="dim">Music by Suno · Rolfe Legends 2 · 2026</span>`));
    });
    skip.remove();
    const btn = el('button', 'btn gold credits-continue', '👑 Continue');
    btn.onclick = finish;
    root.appendChild(btn);
  }

  function finish() {
    if (ended) return;
    ended = true;
    cancelAnimationFrame(raf);
    root.remove();
    onDone();
  }
  skip.onclick = finaleSlide;

  function loop() {
    const t = clock();
    let bi = beatIdx;
    while (bi + 1 < beats.length && beats[bi + 1].t <= t) bi++;
    if (bi !== beatIdx) { beatIdx = bi; sceneSlide(beats[bi].scene); }
    if (lines) {
      let li = lineIdx;
      while (li + 1 < lines.length && lines[li + 1].t <= t) li++;
      if (li !== lineIdx && li >= 0) {
        lineIdx = li;
        cap.innerHTML = '';
        const inner = el('div', 'cap-inner');
        capWords = lines[li].words.map(({ w, t: wt }) => {
          const s = el('span', 'cw');
          s.textContent = (REMAP[w] || w) + ' ';
          inner.appendChild(s);
          return { s, wt };
        });
        cap.appendChild(inner);
        cap.classList.remove('show'); void cap.offsetWidth; cap.classList.add('show');
      }
      // karaoke: light each word the moment it's sung; held notes don't creep
      for (const cw of capWords) if (!cw.lit && t >= cw.wt) { cw.lit = true; cw.s.classList.add('lit'); }
    }
    const a = audioEl();
    if (!continued && (t >= duration || (a && a.ended))) finaleSlide();
    raf = requestAnimationFrame(loop);
  }

  function startRoll(useWall) {
    if (started) return;
    started = true;
    if (hintEl) { hintEl.remove(); hintEl = null; }
    if (useWall) wallBase = performance.now();
    raf = requestAnimationFrame(loop);
  }

  // load the timed lyrics, then arm the clock
  fetch(`assets/audio/${track}.lrc`)
    .then((r) => (r.ok ? r.text() : null))
    .catch(() => null)
    .then((text) => {
      lines = parseLrc(text);
      if (!lines) {
        // fallback: evenly spaced untimed lines on the wall clock
        const fl = FALLBACK_LINES[heroId] || [];
        lines = fl.map((l, i) => ({
          t: 8 + i * 9,
          words: l.split(/\s+/).map((w, j) => ({ w, t: 8 + i * 9 + j * 0.35 })),
        }));
        duration = 8 + fl.length * 9 + 8;
      } else {
        const lastLine = lines[lines.length - 1];
        duration = Math.max(...lastLine.words.map((w) => w.t)) + 7;
      }
      beats = deriveBeats(lines, heroId);
      introSlide();
      if (!music.isEnabled()) { startRoll(true); return; }
      // roll the instant the anthem is audibly playing; if autoplay is blocked
      // a tap hint appears and the first tap starts the song in sync
      const armed = setInterval(() => {
        const a = audioEl();
        if (a && !a.paused && a.currentTime > 0.05) { clearInterval(armed); startRoll(false); }
      }, 110);
      setTimeout(() => {
        if (!started) { hintEl = el('div', 'credits-hint', '🎵 Tap to start the song'); root.appendChild(hintEl); }
      }, 600);
      root.addEventListener('pointerdown', () => { if (!started) { music.unlock(); music.play(track); } });
      // wall-clock rescue: never leave a kid stuck on a frozen intro
      setTimeout(() => { if (!started) startRoll(true); }, 6000);
    });

  return { finish };
}
