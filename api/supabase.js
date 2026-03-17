// ================================================
// api/supabase.js — Vercel Edge Function
// Proxy seguro para Supabase
// ================================================
// Este archivo va en: /api/supabase.js (raíz del proyecto)
// La anon key NUNCA llega al cliente — vive en Vercel env vars

export const config = { runtime: 'edge' };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_ANON_KEY;

export default async function handler(req) {

  // Solo aceptar POST
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders(),
    });
  }

  // Preflight CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders() });
  }

  try {
    const body = await req.json();
    const { path, method = 'GET', data } = body;

    if (!path) {
      return new Response(JSON.stringify({ error: 'Missing path' }), {
        status: 400, headers: corsHeaders(),
      });
    }

    // Construir la URL de Supabase
    const url = `${SUPABASE_URL}/rest/v1/${path}`;

    // Hacer el request a Supabase con la clave segura
    const response = await fetch(url, {
      method,
      headers: {
        'Content-Type':  'application/json',
        'apikey':        SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Prefer':        'return=representation',
      },
      body: data ? JSON.stringify(data) : undefined,
    });

    const result = await response.json();

    return new Response(JSON.stringify(result), {
      status: response.status,
      headers: corsHeaders(),
    });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500, headers: corsHeaders(),
    });
  }
}

function corsHeaders() {
  return {
    'Content-Type':                'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods':'POST, OPTIONS',
    'Access-Control-Allow-Headers':'Content-Type',
  };
}