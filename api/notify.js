// ================================================
// api/notify.js — Vercel Edge Function
// Envía notificaciones push a los jugadores
// ================================================
// Eventos soportados:
//   - steal    → cuando alguien roba monedas
//   - complaint → nueva denuncia
//   - reward   → alguien canjeó recompensa
//   - ranking  → cambio en el ranking

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;
const VAPID_PUBLIC  = process.env.VAPID_PUBLIC_KEY;
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY;
const VAPID_EMAIL   = process.env.VAPID_EMAIL || 'mailto:pusheen@bank.com';
const APP_URL       = 'https://pusheen-bank.vercel.app';

// ==========================
// CORS headers
// ==========================
function cors() {
  return {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

// ==========================
// Obtener suscripciones de un usuario
// ==========================
async function getSubscriptions(username) {
  const url = `${SUPABASE_URL}/rest/v1/push_subscriptions?username=eq.${username}&select=subscription`;
  const res = await fetch(url, {
    headers: {
      'apikey':        SUPABASE_KEY,
      'Authorization': `Bearer ${SUPABASE_KEY}`,
    },
  });
  const data = await res.json();
  return Array.isArray(data) ? data.map(r => r.subscription) : [];
}

// ==========================
// Firmar y enviar Web Push
// ==========================
async function sendPush(subscription, payload) {
  // Construir JWT VAPID
  const audience = new URL(subscription.endpoint).origin;
  const now      = Math.floor(Date.now() / 1000);

  const header  = b64url(JSON.stringify({ typ: 'JWT', alg: 'ES256' }));
  const claims  = b64url(JSON.stringify({ aud: audience, exp: now + 86400, sub: VAPID_EMAIL }));
  const signing = `${header}.${claims}`;

  // Importar clave privada VAPID
  const rawPriv = base64UrlToUint8(VAPID_PRIVATE);
  const privKey = await crypto.subtle.importKey(
    'raw', rawPriv,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false, ['sign']
  );

  const sig = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privKey,
    new TextEncoder().encode(signing)
  );

  const token = `${signing}.${b64url(new Uint8Array(sig))}`;
  const auth  = `vapid t=${token},k=${VAPID_PUBLIC}`;

  // Cifrar payload con ECDH
  const body = await encryptPayload(subscription, JSON.stringify(payload));

  const res = await fetch(subscription.endpoint, {
    method:  'POST',
    headers: {
      'Authorization':   auth,
      'Content-Type':    'application/octet-stream',
      'Content-Encoding':'aesgcm',
      'Encryption':      body.encryption,
      'Crypto-Key':      `dh=${body.dh};${auth.replace('vapid ','vapid ')}`,
      'TTL':             '86400',
    },
    body: body.ciphertext,
  });

  return res.status;
}

// ==========================
// Cifrado ECDH para Web Push
// ==========================
async function encryptPayload(subscription, plaintext) {
  const salt       = crypto.getRandomValues(new Uint8Array(16));
  const serverKeys = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const serverPub  = await crypto.subtle.exportKey('raw', serverKeys.publicKey);

  const clientPub = base64UrlToUint8(subscription.keys.p256dh);
  const clientKey = await crypto.subtle.importKey('raw', clientPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared    = await crypto.subtle.deriveBits({ name: 'ECDH', public: clientKey }, serverKeys.privateKey, 256);

  const authSecret = base64UrlToUint8(subscription.keys.auth);
  const prk        = await hkdf(authSecret, new Uint8Array(shared), str2buf('Content-Encoding: auth\0'), 32);
  const key        = await hkdf(salt, prk, buildInfo('aesgcm', clientPub, new Uint8Array(serverPub)), 16);
  const nonce      = await hkdf(salt, prk, buildInfo('nonce',  clientPub, new Uint8Array(serverPub)), 12);

  const aesKey = await crypto.subtle.importKey('raw', key, 'AES-GCM', false, ['encrypt']);
  const data   = new TextEncoder().encode(plaintext);
  const padded = new Uint8Array(data.length + 2);
  padded.set([0, 0]); padded.set(data, 2);

  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, aesKey, padded);

  return {
    ciphertext:  new Uint8Array(ciphertext),
    encryption:  `salt=${b64url(salt)}`,
    dh:          b64url(new Uint8Array(serverPub)),
  };
}

// ==========================
// HKDF helper
// ==========================
async function hkdf(salt, ikm, info, length) {
  const key    = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits   = await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, length * 8);
  return new Uint8Array(bits);
}

function buildInfo(type, clientPub, serverPub) {
  const buf = new Uint8Array(18 + type.length + 1 + 2 + 65 + 2 + 65);
  let i = 0;
  const enc = s => new TextEncoder().encode(s);
  const set = arr => { buf.set(arr, i); i += arr.length; };
  set(enc('Content-Encoding: ')); set(enc(type)); set([0]);
  buf[i++] = 0; buf[i++] = 65; set(clientPub);
  buf[i++] = 0; buf[i++] = 65; set(serverPub);
  return buf;
}

function str2buf(s) { return new TextEncoder().encode(s); }
function b64url(data) {
  const arr = data instanceof Uint8Array ? data : new Uint8Array(data);
  return btoa(String.fromCharCode(...arr)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');
}
function base64UrlToUint8(b64) {
  const b = b64.replace(/-/g,'+').replace(/_/g,'/');
  return Uint8Array.from(atob(b), c => c.charCodeAt(0));
}

// ==========================
// MENSAJES POR EVENTO
// ==========================
function buildMessage(event, data) {
  switch (event) {
    case 'steal':
      return {
        title: `¡${data.from} te robó ${data.amount} moneda${data.amount > 1 ? 's' : ''}! ❌`,
        body:  'Entrá a Pusheen Bank para vengarte 😤',
        icon:  `${APP_URL}/assets/img/icon.png`,
        url:   APP_URL,
      };
    case 'complaint':
      return {
        title: `🚨 Nueva denuncia de ${data.from}`,
        body:  `Categoría: ${data.category}`,
        icon:  `${APP_URL}/assets/img/icon.png`,
        url:   APP_URL,
      };
    case 'reward':
      return {
        title: `🎁 ${data.from} canjeó una recompensa`,
        body:  data.rewardTitle || '¡Mirá qué ganó!',
        icon:  `${APP_URL}/assets/img/icon.png`,
        url:   APP_URL,
      };
    case 'ranking':
      return {
        title: `👑 ${data.leader} lidera el ranking`,
        body:  `Con ${data.coins} monedas esta semana`,
        icon:  `${APP_URL}/assets/img/icon.png`,
        url:   APP_URL,
      };
    default:
      return { title: 'Pusheen Bank 🐾', body: 'Hay novedades', icon: `${APP_URL}/assets/img/icon.png`, url: APP_URL };
  }
}

// ==========================
// HANDLER PRINCIPAL
// ==========================
export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });
  if (req.method !== 'POST')    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: cors() });

  try {
    const { event, to, data } = await req.json();
    if (!event || !to) return new Response(JSON.stringify({ error: 'Missing event or to' }), { status: 400, headers: cors() });

    const subscriptions = await getSubscriptions(to);
    if (!subscriptions.length) return new Response(JSON.stringify({ ok: true, sent: 0 }), { headers: cors() });

    const message = buildMessage(event, data || {});
    let sent = 0;

    for (const sub of subscriptions) {
      try {
        const status = await sendPush(sub, message);
        if (status < 300) sent++;
        // Si la suscripción expiró (410/404), borrarla
        if (status === 410 || status === 404) {
          await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?subscription=eq.${encodeURIComponent(JSON.stringify(sub))}`, {
            method:  'DELETE',
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
          });
        }
      } catch (e) {
        console.error('Error enviando push:', e);
      }
    }

    return new Response(JSON.stringify({ ok: true, sent }), { headers: cors() });
  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors() });
  }
}