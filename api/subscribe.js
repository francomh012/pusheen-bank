// ================================================
// api/subscribe.js — Vercel Edge Function
// Guarda la suscripción push del usuario en Supabase
// ================================================

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

function cors() {
  return {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };
}

export default async function handler(req) {
  if (req.method === 'OPTIONS') return new Response(null, { headers: cors() });

  try {
    const { username, subscription, action } = await req.json();
    if (!username || !subscription) {
      return new Response(JSON.stringify({ error: 'Missing username or subscription' }), { status: 400, headers: cors() });
    }

    if (action === 'unsubscribe') {
      // Borrar suscripción
      await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?username=eq.${username}`, {
        method:  'DELETE',
        headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
      });
      return new Response(JSON.stringify({ ok: true }), { headers: cors() });
    }

    // Guardar suscripción (upsert — borra la vieja del mismo usuario primero)
    await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions?username=eq.${username}`, {
      method:  'DELETE',
      headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` },
    });

    const res = await fetch(`${SUPABASE_URL}/rest/v1/push_subscriptions`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer':        'return=minimal',
      },
      body: JSON.stringify({ username, subscription }),
    });

    if (!res.ok) throw new Error('Error guardando suscripción');
    return new Response(JSON.stringify({ ok: true }), { headers: cors() });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: cors() });
  }
}