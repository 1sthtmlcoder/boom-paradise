import { countProfanity } from './chat_filter.js';
const micBtn = document.getElementById('micBtn');
const muteBtn = document.getElementById('muteBtn');
const voiceAudio = document.getElementById('voice');
let localStream = null;
let recognition = null;

function supportedSpeech() { return 'webkitSpeechRecognition' in window || 'SpeechRecognition' in window; }
function makeRecognizer() {
  const C = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!C) return null;
  const r = new C(); r.lang='en-US'; r.continuous=true; r.interimResults=false;
  r.onresult = (e) => {
    for (let i=e.resultIndex; i<e.results.length; i++) {
      const text = e.results[i][0].transcript || '';
      const c = countProfanity(text);
      if (c>0) document.dispatchEvent(new CustomEvent('voice:cuss', { detail:{ count:c, text } }));
    }
  };
  r.onerror = (e)=>console.warn('Speech error', e);
  r.onend = ()=>{ if (localStream) try { r.start(); } catch {} };
  return r;
}

export async function startVoice() {
  if (localStream) return true;
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ audio:true });
    voiceAudio.srcObject = localStream;
    if (supportedSpeech()) { recognition = makeRecognizer(); try { recognition && recognition.start(); } catch {} }
    return true;
  } catch { return false; }
}
export function stopVoice() { if (recognition) try{recognition.stop();}catch{}; recognition=null; if(localStream){ localStream.getTracks().forEach(t=>t.stop()); localStream=null; } }
export function toggleMute() { if (!localStream) return false; const t=localStream.getAudioTracks()[0]; t.enabled=!t.enabled; return t.enabled; }
