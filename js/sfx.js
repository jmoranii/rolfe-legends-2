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
};
