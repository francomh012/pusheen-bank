# Pusheen Bank 🐾

App de monedas compartida entre Franco y Jess.

## Estructura del proyecto

```
/
├── index.html          → HTML principal
├── sw.js               → Service Worker (PWA, caché offline)
├── manifest.json       → Config PWA (icono, nombre, colores)
├── vercel.json         → Config Vercel (rutas, funciones)
│
├── api/
│   └── supabase.js     → Proxy seguro para Supabase (Vercel Edge Function)
│
└── assets/
    ├── css/
    │   ├── main.css    → Estilos principales
    │   └── games.css   → Estilos de mini-juegos
    │
    ├── js/
    │   ├── config.js          → ⚙️ Toda la configuración central (keys, constantes)
    │   ├── main.js            → Lógica principal (monedas, ranking, denuncias)
    │   ├── rewards.js         → Lógica de recompensas y racha diaria
    │   ├── games.js           → Mini-juegos (tragamonedas, PPT)
    │   └── supabase-client.js → Cliente seguro para Supabase
    │
    └── img/
        ├── amigos.png   → Login
        ├── pusheen.gif  → Pusheen principal
        ├── corona1.png  → Ranking — Franco liderando
        ├── corona2.png  → Ranking — Jess liderando
        ├── juez.png     → Sección denuncias
        └── icon.png     → Ícono de la app (PWA)
```

## Tablas en Supabase

| Tabla | Descripción |
|---|---|
| `players` | Jugadores, wallet, racha, recompensas, videos |
| `bank` | Banco compartido de Pusheen (monedas + historial) |
| `complaints` | Denuncias entre jugadores |

### Columnas de `players`
| Columna | Tipo | Descripción |
|---|---|---|
| `username` | TEXT | Nombre del jugador (PK) |
| `wallet_coins` | INT8 | Monedas en billetera (puede ser negativo) |
| `weekly_donations` | INT8 | Donaciones de la semana (ranking) |
| `total_donated` | INT8 | Total histórico donado (recompensas) |
| `streak` | INT8 | Racha de días consecutivos |
| `last_claim` | DATE | Último día que reclamó reward diario |
| `claimed_rewards` | TEXT[] | IDs de recompensas ya canjeadas |
| `videos` | JSONB | Videos ganados en la mochila |

## Variables de entorno (Vercel)

| Variable | Descripción |
|---|---|
| `SUPABASE_URL` | URL del proyecto Supabase |
| `SUPABASE_ANON_KEY` | Anon key de Supabase |

## Cómo deployar

1. Push a GitHub → Vercel redeploya automáticamente
2. Las variables de entorno están en Vercel → Settings → Environment Variables
3. El SW se actualiza automáticamente — los usuarios ven el toast de "Nueva versión"

## Mini-juegos

- **Tragamonedas 🎰** — Cuesta 1 moneda. Tres iguales = premio según símbolo. Jackpot 👑 = 50 monedas.
- **Piedra Papel Tijera 🪨** — Cuesta 1 moneda. Ganás = +5 🪙. Empate = moneda devuelta. Pusheen gana = -2 🪙 extra.

## Recompensas

**Por monedas donadas:** 50 → +10, 100 → +25, 200 → +60, 500 → +150

**Por racha diaria:** 3 días → +5, 7 días → +15, 14 días → +40, 30 días → +100

Al canjear hay 40% de chance de ganar un video de Pusheen que queda guardado en la mochila 🎒