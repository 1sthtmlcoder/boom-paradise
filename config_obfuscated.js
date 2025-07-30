
// Obfuscated config for GitHub Pages client.
const __k = Uint8Array.from([253,156,69,152,253,17,110,225,47,109,195,74,132,142,147,153]);
const __b64 = {
  "PHOTON_VOICE_APPID": "y68kqMRyWNACW6B65qOnoMuuaKGfKVnMSV/yfLG+8vjFrnT6",
  "PHOTON_REALTIME_APPID": "zKVz+sxyCtcCWfEssaOn/Jn5aPqeJlvMH1+iLLa/8qGZ+COh",
  "PLAYFAB_TITLE_ID": "zKtw289Q",
  "API_BASE": "legx6I4rQc59KJMGxc3WxqrVEdCiSCG0fTKQD9bY1ss=",
  "REGION": "iO8="
};

function __dx(b64) {
  const raw = atob(b64);
  const out = new Uint8Array(raw.length);
  for (let i=0;i<raw.length;i++) out[i] = raw.charCodeAt(i) ^ __k[i % __k.length];
  return new TextDecoder().decode(out);
}

export function getSecrets() {
  return {
    PHOTON_VOICE_APPID: __dx(__b64.PHOTON_VOICE_APPID),
    PHOTON_REALTIME_APPID: __dx(__b64.PHOTON_REALTIME_APPID),
    PLAYFAB_TITLE_ID: __dx(__b64.PLAYFAB_TITLE_ID),
  };
}

export function getConfig() {
  // Allow override via localStorage 'API_BASE' for quick testing
  const local = localStorage.getItem('API_BASE') || undefined;
  return {
    API_BASE: local || __dx(__b64.API_BASE),
    REGION: __dx(__b64.REGION)
  };
}
