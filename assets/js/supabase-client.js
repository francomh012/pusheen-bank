// ================================================
// assets/js/supabase-client.js
// Cliente seguro — habla con /api/supabase en vez
// de directamente con Supabase
// ================================================
// ⚠️ NO importes ni uses createClient de supabase aquí
// Este archivo reemplaza al supabase directo en main.js

const API = '/api/supabase';

// Helper base para hacer requests al proxy
async function req(path, method = 'GET', data = undefined) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path, method, data }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    return { data: null, error: { message: err.error || `HTTP ${res.status}` } };
  }
  const result = await res.json();
  return { data: result, error: null };
}

// ================================================
// API compatible con supabase-js (subset usado en main.js)
// ================================================

export const db = {

  // SELECT
  from(table) {
    let _filters = [];
    let _select  = '*';
    let _order   = null;
    let _single  = false;
    let _maybeSingle = false;

    const builder = {
      select(cols = '*') { _select = cols; return builder; },

      eq(col, val) { _filters.push(`${col}=eq.${val}`); return builder; },

      order(col, { ascending = true } = {}) {
        _order = `${col}.${ascending ? 'asc' : 'desc'}`;
        return builder;
      },

      single()      { _single = true; return builder; },
      maybeSingle() { _maybeSingle = true; return builder; },

      async then(resolve, reject) {
        try {
          let path = `${table}?select=${encodeURIComponent(_select)}`;
          if (_filters.length) path += '&' + _filters.join('&');
          if (_order)          path += `&order=${_order}`;
          if (_single || _maybeSingle) path += '&limit=1';

          const { data, error } = await req(path, 'GET');

          if (error) return resolve({ data: null, error });

          const result = Array.isArray(data) ? data : [data];

          if (_single) {
            if (!result.length) return resolve({ data: null, error: { message: 'Row not found' } });
            return resolve({ data: result[0], error: null });
          }
          if (_maybeSingle) {
            return resolve({ data: result[0] || null, error: null });
          }
          return resolve({ data: result, error: null });
        } catch (e) {
          reject(e);
        }
      },
    };
    return builder;
  },

  // INSERT
  insert(table, rows) {
    return req(table, 'POST', Array.isArray(rows) ? rows[0] : rows)
      .then(r => r);
  },

  // UPDATE
  update(table, updates, filters = {}) {
    const filterStr = Object.entries(filters)
      .map(([k, v]) => `${k}=eq.${v}`)
      .join('&');
    const path = filterStr ? `${table}?${filterStr}` : table;
    return req(path, 'PATCH', updates);
  },

  // DELETE
  delete(table, filters = {}) {
    const filterStr = Object.entries(filters)
      .map(([k, v]) => `${k}=eq.${v}`)
      .join('&');
    const path = filterStr ? `${table}?${filterStr}` : table;
    return req(path, 'DELETE');
  },
};

// ================================================
// STORAGE (para imágenes de denuncias)
// Supabase Storage no pasa por el proxy —
// usa la URL pública que ya es pública por diseño
// ================================================
export const storage = {
  from(bucket) {
    return {
      async upload(path, file) {
        // Para storage necesitamos la anon key en el proxy también
        // Enviamos como form data
        const formData = new FormData();
        formData.append('file', file);

        const res = await fetch(API, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            path: `storage/v1/object/${bucket}/${path}`,
            method: 'POST',
            isStorage: true,
          }),
        });
        if (!res.ok) return { error: { message: 'Upload failed' } };
        return { error: null };
      },
      getPublicUrl(path) {
        // La URL pública no necesita la clave
        return {
          data: {
            publicUrl: `${window.__SUPABASE_URL__}/storage/v1/object/public/${bucket}/${path}`,
          },
        };
      },
    };
  },
};