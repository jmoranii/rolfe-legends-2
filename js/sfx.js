// Rolfe Legends 2 — procedural WebAudio SFX (no audio files). RL1 pattern.
let ctx = null;
let enabled = true;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function setEnabled(on) { enabled = on; }
export function isEnabled() { return enabled; }

function tone(freq, dur, type = 'sine', vol = 0.15, when = 0) {
  const c = ac();
  if (!c || !enabled) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type; o.frequency.value = freq;
  g.gain.setValueAtTime(vol, c.currentTime + when);
  g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + when + dur);
  o.connect(g); g.connect(c.destination);
  o.start(c.currentTime + when); o.stop(c.currentTime + when + dur + 0.02);
}

export const sfx = {
  tap: () => tone(600, 0.06, 'square', 0.06),
  play: () => { tone(440, 0.08, 'triangle', 0.12); tone(660, 0.1, 'triangle', 0.1, 0.05); },
  attack: () => { tone(200, 0.12, 'sawtooth', 0.14); tone(120, 0.15, 'square', 0.1, 0.03); },
  block: () => { tone(300, 0.1, 'square', 0.1); tone(240, 0.12, 'square', 0.08, 0.05); },
  hurt: () => { tone(150, 0.2, 'sawtooth', 0.16); tone(90, 0.25, 'sawtooth', 0.1, 0.05); },
  heal: () => { tone(523, 0.12, 'sine', 0.12); tone(659, 0.12, 'sine', 0.12, 0.1); tone(784, 0.18, 'sine', 0.12, 0.2); },
  gold: () => { tone(988, 0.08, 'square', 0.08); tone(1319, 0.1, 'square', 0.08, 0.06); },
  win: () => { [523, 659, 784, 1047].forEach((f, i) => tone(f, 0.18, 'triangle', 0.14, i * 0.12)); },
  lose: () => { [392, 330, 262, 196].forEach((f, i) => tone(f, 0.25, 'triangle', 0.12, i * 0.18)); },
  relic: () => { [660, 880, 1100].forEach((f, i) => tone(f, 0.14, 'sine', 0.12, i * 0.09)); },
  quack: () => { tone(280, 0.09, 'sawtooth', 0.18); tone(220, 0.12, 'sawtooth', 0.14, 0.09); },
  turn: () => tone(392, 0.1, 'triangle', 0.1),

  // ---- per-card-family voices (cause-and-effect pass, Sat 2026-08-02) ----
  slash: () => { tone(750, 0.05, 'sawtooth', 0.12); tone(320, 0.13, 'sawtooth', 0.15, 0.03); },       // single hit
  slashTick: (i = 0) => tone(480 + (i % 5) * 90, 0.05, 'square', 0.11),                               // one hit of a flurry
  shield: () => { tone(170, 0.16, 'triangle', 0.2); tone(85, 0.22, 'sine', 0.13, 0.02); },            // block THUNK
  shieldClink: () => { tone(1100, 0.05, 'triangle', 0.12); tone(700, 0.09, 'triangle', 0.1, 0.03); }, // fully blocked
  poison: () => { tone(340, 0.11, 'sine', 0.12); tone(270, 0.11, 'sine', 0.12, 0.09); tone(210, 0.16, 'sine', 0.13, 0.18); }, // bubbly downward
  debuff: () => { tone(420, 0.12, 'sawtooth', 0.1); tone(300, 0.14, 'sawtooth', 0.1, 0.09); tone(210, 0.18, 'sawtooth', 0.1, 0.19); },
  powerUp: () => { [262, 330, 392, 523].forEach((f, i) => tone(f, 0.11, 'triangle', 0.13, i * 0.06)); }, // power comes online
  sparkle: () => { [1047, 1319, 1568].forEach((f, i) => tone(f, 0.07, 'sine', 0.09, i * 0.04)); },    // draw / energy
  pop: () => { tone(520, 0.05, 'square', 0.16); tone(260, 0.09, 'sine', 0.12, 0.03); },               // diaper floats/pops
  boom: () => { tone(90, 0.35, 'sawtooth', 0.2); tone(55, 0.5, 'sine', 0.18, 0.05); tone(180, 0.15, 'square', 0.1, 0.02); }, // BLOWOUT / huge hit
};
