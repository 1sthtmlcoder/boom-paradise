import { getSecrets } from './config_obfuscated.js';
const { PLAYFAB_TITLE_ID } = getSecrets();
const API = `https://${PLAYFAB_TITLE_ID}.playfabapi.com/Client`;

async function pf(path, body) {
  const res = await fetch(`${API}/${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await res.json();
  if (data.error) throw new Error(data.errorMessage || 'PlayFab error');
  return data;
}

export async function login() {
  let customId = localStorage.getItem('pfCustomId');
  if (!customId) { customId = 'web_' + Math.random().toString(36).slice(2); localStorage.setItem('pfCustomId', customId); }
  const { data } = await pf('LoginWithCustomID', { CreateAccount: true, CustomId: customId, TitleId: PLAYFAB_TITLE_ID, InfoRequestParameters: { GetUserInventory: true, GetUserVirtualCurrency: true } });
  return data;
}

export async function getCatalog() {
  const { data } = await pf('GetCatalogItems', { CatalogVersion: 'main' });
  return data.Catalog || data.CatalogItems || [];
}

export function getLocalBC() { return Number(localStorage.getItem('fakeBC') || '0'); }
export function grantBC(amount) { const cur = getLocalBC(); const next = cur + amount; localStorage.setItem('fakeBC', String(next)); return next; }
export function spendLocalBC(cost) { const cur = getLocalBC(); if (cur < cost) return false; localStorage.setItem('fakeBC', String(cur - cost)); return true; }
