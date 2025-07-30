import { login, getCatalog, grantBC, getLocalBC, spendLocalBC } from './playfab.js';
import { Net } from './photonClient.js';
import { startVoice, stopVoice, toggleMute } from './voice.js';
import { getConfig } from './config_obfuscated.js';

const { API_BASE } = getConfig();

const statusEl = document.getElementById('status');
const question = document.getElementById('question');
const help = document.getElementById('help');
const storePanel = document.getElementById('storePanel');
const storeItems = document.getElementById('storeItems');
const closeStore = document.getElementById('closeStore');
const bcEl = document.getElementById('bc');
const equipBtn = document.getElementById('equipBtn');
const chatLog = document.getElementById('chatLog');
const chatForm = document.getElementById('chatForm');
const chatInput = document.getElementById('chatInput');
const overlayDown = document.getElementById('overlayDown');
const downDetail = document.getElementById('downDetail');
const micBtn = document.getElementById('micBtn');
const muteBtn = document.getElementById('muteBtn');
const mobileStick = document.getElementById('mobileStick');
const stickNub = document.getElementById('stickNub');

question.onclick = () => help.style.display = (help.style.display === 'none' || !help.style.display) ? 'block' : 'none';
closeStore.onclick = () => storePanel.style.display = 'none';

function deviceId() {
  let id = localStorage.getItem('deviceId');
  if (!id) {
    const u = navigator.userAgent || '';
    const fp = [u, navigator.platform, navigator.hardwareConcurrency, screen.width+'x'+screen.height].join('|');
    id = 'd_' + btoa(fp).replace(/[^a-zA-Z0-9]/g, '').slice(0, 32);
    localStorage.setItem('deviceId', id);
  }
  return id;
}
const DEV_ID = deviceId();

let cussCount = Number(localStorage.getItem('cussCount') || '0');
function addCuss(n) { cussCount += n; localStorage.setItem('cussCount', String(cussCount)); }

async function api(path, opts={}) {
  const url = `${API_BASE}${path}`;
  return fetch(url, opts);
}

async function checkBan() {
  try {
    const r = await api(`/ban/status?deviceId=${encodeURIComponent(DEV_ID)}`);
    if (!r.ok) return { banned:false };
    return await r.json();
  } catch { return { banned:false }; }
}

function showDown(reason, detail='') { overlayDown.style.display='flex'; downDetail.textContent = detail || reason || ''; }
function hideDown() { overlayDown.style.display='none'; }

const net = new Net('lobby-1', {
  connected() { statusEl.textContent = 'Connected'; },
  playerJoin(a) { addChat({ name:'System', text:`Player ${a.actorNr} joined.` }); },
  playerLeave(a) { addChat({ name:'System', text:`Player ${a.actorNr} left.` }); },
  playerMove({ id, x, y }) { if (!players.has(id)) spawnRemote(id, x, y); const p = players.get(id); p.sprite.x=x; p.sprite.y=y; p.text.x=x; p.text.y=y; },
  chat(msg) { addChat(msg); if (msg.prof) addCuss(1); },
  dance({ id, dance }) { const p = players.get(id); if (p) p.text.setText(p.meta.name + (dance ? ` (dance: ${dance})` : '')); },
  cosmetics({ id, cosmetics }) { const p = players.get(id); if (p) p.meta.cosmetics = cosmetics; },
  down(reason) { showDown(reason); }
});

async function healthLoop() {
  try {
    const r = await api('/health/chat');
    if (!r.ok) throw new Error('chat down');
    const j = await r.json(); if (!j.ok) throw new Error('chat fail');
    muteBtn.disabled = false;
  } catch (e) {
    muteBtn.disabled = false;
    muteBtn.onclick = () => alert('Voice/chat not available :(');
  }
  setTimeout(healthLoop, 10000);
}
healthLoop();

document.addEventListener('voice:cuss', async (e) => {
  const n = e.detail.count || 1; addCuss(n);
  await api('/moderation/report', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ deviceId: DEV_ID, kind:'voice', sample:e.detail.text||'', ua: navigator.userAgent }) });
  await enforceBanPolicy();
});

async function enforceBanPolicy() {
  let action = null;
  if (cussCount === 1) action = 'warn';
  else if (cussCount === 2) action = 'ban_1h';
  else if (cussCount === 5) action = 'ban_1w';
  else if (cussCount >= 10) action = 'ban_perm';
  if (!action) return;
  const r = await api('/moderation/ban', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ deviceId: DEV_ID, action }) });
  if (r.ok) { const j = await r.json(); if (j.banned) showDown('banned', j.reason || ''); }
}

function addChat({ name, text }) { const p=document.createElement('div'); p.textContent = `${name}: ${text}`; chatLog.appendChild(p); chatLog.scrollTop = chatLog.scrollHeight; }
chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim(); if (!text) return;
  const c = net.sendChat('Player', text);
  if (c>0) { addCuss(c); await api('/moderation/report', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ deviceId: DEV_ID, kind:'text', sample:text, ua: navigator.userAgent }) }); await enforceBanPolicy(); }
  chatInput.value='';
});

micBtn.onclick = async () => {
  const ok = await startVoice();
  if (ok) { micBtn.textContent = 'Voice On'; muteBtn.disabled = false; } else alert('Voice/chat not available :(');
};
muteBtn.onclick = () => { const enabled = toggleMute(); muteBtn.textContent = enabled ? 'Mute' : 'Unmute'; };

const state = { catalog: [], owned: new Set(), equipped: [], bc: 0 };
function updateBC() { state.bc = getLocalBC(); bcEl.textContent = `BC: ${state.bc}`; }
equipBtn.onclick = () => {
  const ownedCosmetics = state.catalog.filter(i => i.Tags?.includes('cosmetic') && state.owned.has(i.ItemId));
  if (ownedCosmetics.length === 0) return alert('You do not own any cosmetics yet.');
  const pick = ownedCosmetics[Math.floor(Math.random() * ownedCosmetics.length)];
  state.equipped = [pick.ItemId];
};

(async () => {
  await login();
  if (!localStorage.getItem('seededBC')) { grantBC(1000); localStorage.setItem('seededBC', '1'); }
  updateBC();
})();

const config = { type: Phaser.AUTO, parent: document.body, width: innerWidth, height: innerHeight, backgroundColor: '#0b0f17', physics: { default:'arcade', arcade:{ debug:false } }, scene:{ preload, create, update } };
let game, cursors, me, shopZone;
let players = new Map();
let joystick = { active:false, dx:0, dy:0 };

function isTouch() { return ('ontouchstart' in window) || navigator.maxTouchPoints > 0; }

function setupJoystick() {
  if (!isTouch()) return;
  const base = document.getElementById('mobileStick');
  const nub = document.getElementById('stickNub');
  base.style.display = 'block';
  const rect = base.getBoundingClientRect();
  const center = { x: rect.left + rect.width/2, y: rect.top + rect.height/2 };
  function handle(ev) {
    const t = (ev.touches && ev.touches[0]) || ev;
    const x = t.clientX - center.x; const y = t.clientY - center.y;
    const len = Math.hypot(x,y); const max = rect.width/2 - 20;
    const nx = len > max ? x*(max/len) : x; const ny = len > max ? y*(max/len) : y;
    nub.style.transform = `translate(${nx}px, ${ny}px)`;
    joystick.dx = nx/max; joystick.dy = ny/max; joystick.active = true;
  }
  function reset(){ nub.style.transform='translate(-50%,-50%)'; joystick.dx=0; joystick.dy=0; joystick.active=false; }
  base.addEventListener('touchstart', handle); base.addEventListener('touchmove', handle);
  base.addEventListener('touchend', reset); base.addEventListener('touchcancel', reset);
}

function preload() {}
function create() {
  const scene = this;
  const g = scene.add.graphics(); g.fillStyle(0x182031,1); g.fillRect(0,0,config.width,config.height);
  const shopX=config.width/2-120, shopY=config.height/2-80, shopW=240, shopH=160;
  scene.add.rectangle(shopX, shopY, shopW, shopH, 0x26324d).setOrigin(0,0);
  scene.add.text(shopX+10, shopY+10, 'SHOP', { fontSize:'18px', color:'#fff' });
  shopZone = new Phaser.Geom.Rectangle(shopX, shopY, shopW, shopH);
  cursors = scene.input.keyboard.createCursorKeys();
  this.keys = scene.input.keyboard.addKeys({ W:87, A:65, S:83, D:68, ONE:49, TWO:50, THREE:51, FOUR:52 });
  me = scene.add.circle(100,100,12,0x7aa2ff);
  const nameText = scene.add.text(100,100,'You',{ fontSize:'12px', color:'#fff' }).setOrigin(0.5,1.4);
  players.set('local', { sprite: me, text: nameText, meta:{ name:'You' } });
  setupJoystick();
  net.connect();
  loadCatalogAndBuildStore();
}
function update(time, delta) {
  if (!me) return;
  const speed = 200*(delta/1000); let dx=0, dy=0;
  if (isTouch() && joystick.active) { dx += joystick.dx*speed; dy += joystick.dy*speed; }
  else {
    if (cursors.left.isDown || this.keys.A.isDown) dx -= speed;
    if (cursors.right.isDown || this.keys.D.isDown) dx += speed;
    if (cursors.up.isDown || this.keys.W.isDown) dy -= speed;
    if (cursors.down.isDown || this.keys.S.isDown) dy += speed;
  }
  me.x += dx; me.y += dy; const obj = players.get('local'); obj.text.x = me.x; obj.text.y = me.y;
  net.sendMove(me.x, me.y);
  if (Phaser.Input.Keyboard.JustDown(this.keys.ONE)) addChat({ name:'System', text:'You dance: wave' });
  if (Phaser.Input.Keyboard.JustDown(this.keys.TWO)) addChat({ name:'System', text:'You dance: shuffle' });
  if (Phaser.Input.Keyboard.JustDown(this.keys.THREE)) addChat({ name:'System', text:'You dance: spin' });
  if (Phaser.Input.Keyboard.JustDown(this.keys.FOUR)) addChat({ name:'System', text:'You dance: point' });
  if (Phaser.Geom.Rectangle.Contains(shopZone, me.x, me.y)) storePanel.style.display='flex';
}
function spawnRemote(id, x=100, y=100) { const scene = game.scene.scenes[0]; const s=scene.add.circle(x,y,12,0xffac7a); const t=scene.add.text(x,y,`P${id}`,{ fontSize:'12px', color:'#fff' }).setOrigin(0.5,1.4); players.set(id,{ sprite:s, text:t, meta:{ name:`P${id}` } }); }
async function loadCatalogAndBuildStore() { let items=[]; try { const r = await fetch('./playfab_catalog.json'); items = await r.json(); } catch { items = await getCatalog(); } state.catalog = items; buildStoreUI(items); }
function buildStoreUI(items) { storeItems.innerHTML=''; items.forEach(item=>{ const c=document.createElement('div'); c.className='card'; const priceBC=item.VirtualCurrencyPrices?.BC || item.VirtualCurrencyPrices?.['BC'] || 0; c.innerHTML = `<div><strong>${item.DisplayName}</strong></div><div style="opacity:0.8; font-size:13px;">${item.Description||''}</div><div>Price: ${priceBC} BC</div><button class='btn'>Buy</button>`; const b=c.querySelector('button'); b.onclick=()=>{ if(!spendLocalBC(priceBC)) return alert('Not enough BC.'); updateBC(); state.owned.add(item.ItemId); alert('Purchased '+item.DisplayName+'!'); }; storeItems.appendChild(c); }); }
const game = new Phaser.Game(config);
