
const __wk = Uint8Array.from([210,52,132,188,104,42,142,63,226,26,3,232]);
const __wl = ["sFXgywdY6g==", "pVv2zw1d4U2G", "sUH2zw0=", "tlXp0g==", "ulHo0A==", "oVztyA==", "tEHn1w=="];
function __dxw(b64) {
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i) ^ __wk[i % __wk.length];
  return new TextDecoder().decode(out);
}
const WORDS = __wl.map(__dxw);
export function containsProfanity(text) {
  const t = (text||'').toLowerCase();
  return WORDS.some(w => w && t.includes(w));
}
export function countProfanity(text) {
  const t = (text||'').toLowerCase();
  let c = 0; for (const w of WORDS) if (w) { c += (t.split(w).length - 1); }
  return c;
}
