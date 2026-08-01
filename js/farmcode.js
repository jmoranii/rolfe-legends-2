// Rolfe Legends 2 — the Secret Farm Code: save backup as a copyable string.
// Pure (no DOM) so tests can round-trip it. Encodes the earned state (wins per
// hero, both-brothers finale seen, Liam unlock) plus the current run, so a
// tablet swap keeps everything. Format: FARM2-<base64url payload>-<checksum>;
// the checksum catches paste typos. RL1's js/farmcode.js pattern.

import { serializeRun, deserializeRun } from './run.js';

function checksum(s) {
  let h = 7;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) % 46655;
  return h.toString(36).padStart(3, '0');
}

const b64encode = (str) => {
  const bytes = new TextEncoder().encode(str);
  let bin = '';
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};
const b64decode = (b) => {
  const bin = atob(b.replace(/-/g, '+').replace(/_/g, '/'));
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

// profile: { wins: {wyatt,aaron,liam}, bonusSeen, liamUnlocked } ; run: run object or null
export function encodeFarmCode(profile, run) {
  const data = {
    v: 2,
    w: {
      wyatt: Math.max(0, Number(profile.wins?.wyatt) || 0),
      aaron: Math.max(0, Number(profile.wins?.aaron) || 0),
      liam: Math.max(0, Number(profile.wins?.liam) || 0),
    },
    b: profile.bonusSeen ? 1 : 0,
    l: profile.liamUnlocked ? 1 : 0,
    r: run ? JSON.parse(serializeRun(run)) : null,
  };
  const b = b64encode(JSON.stringify(data));
  return `FARM2-${b}-${checksum(b)}`;
}

// Returns { profile, run } or null if the code is bad/tampered.
export function decodeFarmCode(code) {
  try {
    const trimmed = String(code).trim();
    if (!/^FARM2-/i.test(trimmed)) return null;
    const parts = trimmed.slice(6).split('-');
    if (parts.length !== 2) return null;
    const [b, sum] = parts;
    if (checksum(b) !== sum) return null;
    const d = JSON.parse(b64decode(b));
    if (d.v !== 2) return null;
    const cleanWin = (n) => (Number.isInteger(n) && n >= 0 && n <= 9999 ? n : 0);
    const profile = {
      wins: { wyatt: cleanWin(d.w?.wyatt), aaron: cleanWin(d.w?.aaron), liam: cleanWin(d.w?.liam) },
      bonusSeen: !!d.b,
      liamUnlocked: !!d.l || cleanWin(d.w?.liam) > 0,
    };
    const run = d.r ? deserializeRun(JSON.stringify(d.r)) : null;
    return { profile, run };
  } catch {
    return null;
  }
}
