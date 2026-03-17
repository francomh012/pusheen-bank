// ================================================
// assets/js/config.js
// ⚙️ Toda la configuración central de Pusheen Bank
// Si querés cambiar algo, buscalo acá primero
// ================================================

// ==========================
// SUPABASE
// ==========================
export const SUPABASE_URL = 'https://erblqbqsjqhatarcpzjs.supabase.co';
export const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyYmxxYnFzanFoYXRhcmNwempzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Nzk4NTUsImV4cCI6MjA4NzU1NTg1NX0.p3WM4tO9vDIc1gtS6kg3FqYxMRHFhYUo2wcsHDVKZEk';

// ==========================
// JUGADORES
// ==========================
export const AVATARS = {
  Franco: '🧔',
  Jess:   '👩',
};

export const RANKING_IMGS = {
  Franco:  { src: 'assets/img/corona1.png', label: '¡Franco va ganando! 👑' },
  Jess:    { src: 'assets/img/corona2.png', label: '¡Jess va ganando! 👑'   },
  default: { src: 'assets/img/corona1.png', label: '¡A ganar! 👑'           },
};

// ==========================
// RECOMPENSAS — monedas donadas
// ==========================
export const COIN_REWARDS = [
  { id: 'coins_50',  threshold: 50,  icon: '🌸', title: '50 monedas donadas',  desc: '+10 monedas bonus',  coins: 10  },
  { id: 'coins_100', threshold: 100, icon: '💖', title: '100 monedas donadas', desc: '+25 monedas bonus',  coins: 25  },
  { id: 'coins_200', threshold: 200, icon: '✨', title: '200 monedas donadas', desc: '+60 monedas bonus',  coins: 60  },
  { id: 'coins_500', threshold: 500, icon: '👑', title: '500 monedas donadas', desc: '+150 monedas bonus', coins: 150 },
];

// ==========================
// RECOMPENSAS — racha diaria
// ==========================
export const STREAK_REWARDS = [
  { id: 'streak_3',  threshold: 3,  icon: '🔥', title: '3 días seguidos',  desc: '+5 monedas bonus',   coins: 5   },
  { id: 'streak_7',  threshold: 7,  icon: '⚡', title: '7 días seguidos',  desc: '+15 monedas bonus',  coins: 15  },
  { id: 'streak_14', threshold: 14, icon: '🌟', title: '14 días seguidos', desc: '+40 monedas bonus',  coins: 40  },
  { id: 'streak_30', threshold: 30, icon: '💫', title: '30 días seguidos', desc: '+100 monedas bonus', coins: 100 },
];

// ==========================
// VIDEOS DE PUSHEEN
// ==========================
export const PUSHEEN_VIDEOS = [
  { id: 'LBkVqEvctkg', title: 'Pusheen Video 1' },
  { id: 'HU5Qq97cxvU', title: 'Pusheen Video 2' },
  { id: 'E_bG4NAcwjg', title: 'Pusheen Video 3' },
  { id: 'gFgkNn3tTfw', title: 'Pusheen Video 4' },
  { id: '_6cOAcMrcQo', title: 'Pusheen Video 5' },
  { id: 'kmChzsv7_PI', title: 'Pusheen Video 6' },
];

// Probabilidad de ganar video al canjear recompensa (0.0 a 1.0)
export const VIDEO_PROBABILITY = 0.4;

// ==========================
// JUEGOS — Tragamonedas
// ==========================
export const SLOT_SYMBOLS = [
  { emoji: '🐾', name: 'pata',     weight: 30 },
  { emoji: '🌸', name: 'flor',     weight: 25 },
  { emoji: '🍩', name: 'donut',    weight: 20 },
  { emoji: '⭐', name: 'estrella', weight: 15 },
  { emoji: '💖', name: 'corazon',  weight: 8  },
  { emoji: '👑', name: 'corona',   weight: 2  },
];

export const SLOT_PRIZES = {
  corona:   { coins: 50, msg: '👑 ¡JACKPOT! ¡50 monedas!' },
  corazon:  { coins: 20, msg: '💖 ¡Tres corazones! +20 🪙' },
  estrella: { coins: 10, msg: '⭐ ¡Tres estrellas! +10 🪙' },
  donut:    { coins: 5,  msg: '🍩 ¡Tres donuts! +5 🪙'    },
  flor:     { coins: 3,  msg: '🌸 ¡Tres flores! +3 🪙'    },
  pata:     { coins: 2,  msg: '🐾 ¡Tres patas! +2 🪙'     },
};

// ==========================
// JUEGOS — Piedra Papel Tijera
// ==========================
export const PPT_OPTIONS = [
  { id: 'rock',     emoji: '🪨', name: 'Piedra' },
  { id: 'paper',    emoji: '📄', name: 'Papel'  },
  { id: 'scissors', emoji: '✂️', name: 'Tijera' },
];

// Cuánto gana/pierde en PPT
export const PPT_WIN_COINS  = 5;
export const PPT_LOSE_COINS = 2; // monedas extra que pierde si Pusheen gana

// ==========================
// REWARD DIARIO
// ==========================
export const DAILY_REWARD_COINS = 2;