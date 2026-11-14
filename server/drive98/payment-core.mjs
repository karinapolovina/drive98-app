// YooMoney wallet notifications: sign (HMAC-SHA256), not deprecated sha1_hash.
export const PRICE_KOPECKS = 99000;
export const PRODUCT = 'full-v1';
const enc = new TextEncoder();
export class PaymentError extends Error {
  constructor(message, status = 400) { super(message); this.status = status; }
}
export function cents(value) {
  if (typeof value !== 'string' || !/^\d{1,9}(\.\d{1,2})?$/.test(value)) return null;
  const [whole, fraction = ''] = value.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
const rfc3986 = value => encodeURIComponent(value).replace(/[!'()*]/g, c => '%' + c.charCodeAt(0).toString(16).toUpperCase());
export function canonical(params) {
  const keys = [...params.keys()];
  if (new Set(keys).size !== keys.length) throw new PaymentError('Duplicate fields');
  return keys.filter(k => k !== 'sign').sort().map(k => `${rfc3986(k)}=${rfc3986(params.get(k))}`).join('&');
}
export async function sign(params, secret) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), {name:'HMAC', hash:'SHA-256'}, false, ['sign']);
  return [...new Uint8Array(await crypto.subtle.sign('HMAC', key, enc.encode(canonical(params))))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function equal(a,b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  let n=0; for(let i=0;i<a.length;i++) n |= a.charCodeAt(i)^b.charCodeAt(i); return n===0;
}
export async function notification(raw, secret) {
  if (!secret) throw new PaymentError('Payments not configured', 503);
  if (raw.length > 16000) throw new PaymentError('Payload too large', 413);
  const p = new URLSearchParams(raw);
  const expected = await sign(p, secret);
  if (!/^[a-f0-9]{64}$/.test(p.get('sign')||'') || !equal(expected,p.get('sign'))) throw new PaymentError('Invalid signature',403);
  // Test notifications must NEVER create entitlements, even if correctly signed.
  if (p.has('test_notification') && p.get('test_notification') !== 'false') return {ignore:'test'};
  if (!p.get('label')?.startsWith('d98_')) return {ignore:'other_product'};
  if (!/^d98_[a-f0-9]{32}$/.test(p.get('label'))) throw new PaymentError('Invalid order');
  if (!/^[a-zA-Z0-9_-]{1,100}$/.test(p.get('operation_id')||'')) throw new PaymentError('Invalid operation');
  if (!['p2p-incoming','card-incoming'].includes(p.get('notification_type')) || p.get('currency') !== '643' || p.get('codepro') !== 'false' || p.get('unaccepted') !== 'false') return {ignore:'not_settled'};
  const gross=cents(p.get('withdraw_amount')), net=cents(p.get('amount'));
  if (gross===null || net===null || net<=0 || net>gross) throw new PaymentError('Invalid amounts');
  if (gross!==PRICE_KOPECKS) return {ignore:'wrong_amount'};
  if (!p.get('datetime') || !Number.isFinite(Date.parse(p.get('datetime')))) throw new PaymentError('Invalid date');
  return {label:p.get('label'),operation:p.get('operation_id'),gross,net,at:p.get('datetime')};
}
export function checkout(wallet, label, returnUrl, method='AC') {
  if (!/^410\d{8,20}$/.test(wallet||'') || !/^d98_[a-f0-9]{32}$/.test(label)) throw new PaymentError('Payments not configured',503);
  if (new URL(returnUrl).protocol !== 'https:' || !['AC','PC'].includes(method)) throw new PaymentError('Invalid checkout');
  return {action:'https://yoomoney.ru/quickpay/confirm',fields:{receiver:wallet,'quickpay-form':'button',paymentType:method,sum:'990.00',label,successURL:returnUrl}};
}
export async function sha256(value) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256',enc.encode(value)))].map(n=>n.toString(16).padStart(2,'0')).join('');
}
export function opaque() { return [...crypto.getRandomValues(new Uint8Array(32))].map(n=>n.toString(16).padStart(2,'0')).join(''); }
const decode = v => Uint8Array.from(atob(v.replaceAll('-','+').replaceAll('_','/').padEnd(Math.ceil(v.length/4)*4,'=')), c=>c.charCodeAt(0));
let jwksCache=null;
export async function telegramLogin(token,clientId,nonce,{now=Date.now(),keys=null}={}) {
  try {
    if(typeof token!=='string'||token.length>12000||!clientId) return null;
    const parts=token.split('.'); if(parts.length!==3) return null;
    const h=JSON.parse(new TextDecoder().decode(decode(parts[0]))),p=JSON.parse(new TextDecoder().decode(decode(parts[1])));
    if(h.alg!=='RS256'||!h.kid||p.iss!=='https://oauth.telegram.org'||String(p.aud)!==String(clientId)||!Number.isSafeInteger(p.exp)||p.exp<=now/1000||!Number.isSafeInteger(p.iat)||p.iat>now/1000+60||p.iat<now/1000-600||!equal(p.nonce,nonce)||!Number.isSafeInteger(p.id)||p.id<=0)return null;
    if(!keys){
      if(!jwksCache||jwksCache.until<now){
        const r=await fetch('https://oauth.telegram.org/.well-known/jwks.json');if(!r.ok)return null;
        jwksCache={keys:(await r.json()).keys,until:now+300000};
      }
      keys=jwksCache.keys;
    }
    const jwk=keys.find(k=>k.kid===h.kid&&k.kty==='RSA'&&(!k.use||k.use==='sig'));if(!jwk)return null;
    const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
    return await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),enc.encode(parts[0]+'.'+parts[1]))?'tg:'+p.id:null;
  }catch{return null}
}
// Server-side authorization; UI checks are supplementary only.
export function fullVersionRequired(event,data,state) {
  if(['career.select','career.complete'].includes(event)) return /^c[1-3]s[0-2]$/.test(data.id||'') || /^skill[0-5]$/.test(data.id||'');
  if(event==='drift.start')return data.trip!=='district';
  if(event==='drift.choose')return !!state.drift && state.drift.trip!=='district';
  if(event==='circuit.create')return state.circuit.routes.length>=1;
  if(event.startsWith('circuit.') && event!=='circuit.create')return state.circuit.routes.findIndex(r=>r.id===data.id)>0;
  return event==='garage.award'&&Number(data.chapter)>0;
}



