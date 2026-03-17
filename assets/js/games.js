// ================================
// MINI-JUEGOS — Pusheen Bank 🐾
// ================================
// Costo por juego: 1 moneda
// Tragamonedas: gana x2 (2 monedas) si hay combinación
// PPT: gana 5 monedas si le ganas a Pusheen

// Símbolos del tragamonedas
const SLOT_SYMBOLS = [
  { emoji: '🐾', name: 'pata',     weight: 30 }, // más común
  { emoji: '🌸', name: 'flor',     weight: 25 },
  { emoji: '🍩', name: 'donut',    weight: 20 },
  { emoji: '⭐', name: 'estrella', weight: 15 },
  { emoji: '💖', name: 'corazon',  weight: 8  },
  { emoji: '👑', name: 'corona',   weight: 2  }, // muy raro — jackpot
];

// Premios del tragamonedas según combinación
const SLOT_PRIZES = {
  corona:   { coins: 50, msg: '👑 ¡JACKPOT! ¡50 monedas!' },
  corazon:  { coins: 20, msg: '💖 ¡Tres corazones! +20 monedas' },
  estrella: { coins: 10, msg: '⭐ ¡Tres estrellas! +10 monedas' },
  donut:    { coins: 5,  msg: '🍩 ¡Tres donuts! +5 monedas' },
  flor:     { coins: 3,  msg: '🌸 ¡Tres flores! +3 monedas' },
  pata:     { coins: 2,  msg: '🐾 ¡Tres patas! +2 monedas' },
};

// Opciones PPT
const PPT_OPTIONS = [
  { id: 'rock',     emoji: '🪨', name: 'Piedra' },
  { id: 'paper',    emoji: '📄', name: 'Papel'  },
  { id: 'scissors', emoji: '✂️', name: 'Tijera' },
];

const PPT_PUSHEEN_NAMES = {
  rock:     '🪨 Piedra',
  paper:    '📄 Papel',
  scissors: '✂️ Tijera',
};

// Resultado PPT
function getPPTResult(player, pusheen) {
  if (player === pusheen) return 'tie';
  if (
    (player === 'rock'     && pusheen === 'scissors') ||
    (player === 'paper'    && pusheen === 'rock')     ||
    (player === 'scissors' && pusheen === 'paper')
  ) return 'win';
  return 'lose';
}

// Función para elegir símbolo según peso
function weightedRandom(symbols) {
  const total = symbols.reduce((s, x) => s + x.weight, 0);
  let r = Math.random() * total;
  for (const sym of symbols) {
    r -= sym.weight;
    if (r <= 0) return sym;
  }
  return symbols[symbols.length - 1];
}

// ================================
// RENDER PRINCIPAL DE JUEGOS
// ================================
export function renderGamesTab(currentPlayer, myWallet, onWalletChange) {

  const container = document.getElementById('tab-games');
  if (!container) return;

  container.innerHTML = `
    <div class="games-header">
      <img src="assets/img/pusheen.gif" class="games-pusheen" alt="Pusheen">
      <h2 class="games-title">Mini-juegos 🎮</h2>
      <p class="games-sub">Cada juego cuesta <strong>1 🪙</strong></p>
    </div>

    <!-- TRAGAMONEDAS -->
    <div class="game-card" id="slot-card">
      <div class="game-card-header">
        <span class="game-icon">🎰</span>
        <div>
          <div class="game-name">Tragamonedas</div>
          <div class="game-desc">3 iguales = ganás. Jackpot 👑 = 50 monedas</div>
        </div>
      </div>

      <div class="slot-machine">
        <div class="slot-reels">
          <div class="slot-reel" id="reel-0">🐾</div>
          <div class="slot-reel" id="reel-1">🐾</div>
          <div class="slot-reel" id="reel-2">🐾</div>
        </div>
        <div class="slot-line"></div>
      </div>

      <div id="slot-result" class="game-result" style="display:none;"></div>
      <button class="btn-play" id="btn-slot" onclick="window.playSlot()">
        Girar 🎰 <span class="btn-cost">−1 🪙</span>
      </button>
    </div>

    <!-- PIEDRA PAPEL TIJERA -->
    <div class="game-card" id="ppt-card">
      <div class="game-card-header">
        <span class="game-icon">🪨</span>
        <div>
          <div class="game-name">Piedra Papel Tijera</div>
          <div class="game-desc">Ganá a Pusheen = +5 monedas</div>
        </div>
      </div>

      <div class="ppt-arena">
        <div class="ppt-side">
          <div class="ppt-label">Tú</div>
          <div class="ppt-choice" id="ppt-player-choice">❓</div>
        </div>
        <div class="ppt-vs">VS</div>
        <div class="ppt-side">
          <div class="ppt-label">Pusheen</div>
          <div class="ppt-choice" id="ppt-pusheen-choice">🐾</div>
        </div>
      </div>

      <div class="ppt-buttons">
        <button class="btn-ppt" onclick="window.playPPT('rock')">🪨<span>Piedra</span></button>
        <button class="btn-ppt" onclick="window.playPPT('paper')">📄<span>Papel</span></button>
        <button class="btn-ppt" onclick="window.playPPT('scissors')">✂️<span>Tijera</span></button>
      </div>

      <div id="ppt-result" class="game-result" style="display:none;"></div>
    </div>
  `;

  // ================================
  // LÓGICA TRAGAMONEDAS
  // ================================
  let slotSpinning = false;

  window.playSlot = async () => {
    if (slotSpinning) return;

    // Verificar costo
    const currentWallet = window.getWallet();
    if (currentWallet < 1) {
      showGameMsg('slot-result', '¡No tenés monedas suficientes! 🪙', 'error');
      return;
    }

    slotSpinning = true;
    document.getElementById('btn-slot').disabled = true;

    // Cobrar 1 moneda
    await onWalletChange(-1, 'slot-cost');

    // Animación de giro
    const reels = [0, 1, 2].map(i => document.getElementById(`reel-${i}`));
    const intervals = reels.map((reel, i) =>
      setInterval(() => {
        reel.textContent = weightedRandom(SLOT_SYMBOLS).emoji;
        reel.classList.add('spinning');
      }, 80 + i * 20)
    );

    // Resultado final
    const results = [
      weightedRandom(SLOT_SYMBOLS),
      weightedRandom(SLOT_SYMBOLS),
      weightedRandom(SLOT_SYMBOLS),
    ];

    // Detener carretes uno a uno
    setTimeout(() => { clearInterval(intervals[0]); reels[0].textContent = results[0].emoji; reels[0].classList.remove('spinning'); reels[0].classList.add('stop'); }, 700);
    setTimeout(() => { clearInterval(intervals[1]); reels[1].textContent = results[1].emoji; reels[1].classList.remove('spinning'); reels[1].classList.add('stop'); }, 1100);
    setTimeout(async () => {
      clearInterval(intervals[2]);
      reels[2].textContent = results[2].emoji;
      reels[2].classList.remove('spinning');
      reels[2].classList.add('stop');

      // Limpiar clases stop
      setTimeout(() => reels.forEach(r => r.classList.remove('stop')), 500);

      // Evaluar resultado
      const isWin = results[0].name === results[1].name && results[1].name === results[2].name;
      const resultEl = document.getElementById('slot-result');

      if (isWin) {
        const prize = SLOT_PRIZES[results[0].name];
        await onWalletChange(prize.coins, 'slot-win');
        showGameMsg('slot-result', prize.msg, 'win');
        if (window.spawnCoins) window.spawnCoins(10);
        // Jackpot visual extra
        if (results[0].name === 'corona') {
          reels.forEach(r => r.classList.add('jackpot'));
          setTimeout(() => reels.forEach(r => r.classList.remove('jackpot')), 2000);
        }
      } else {
        showGameMsg('slot-result', 'No fue esta vez... 😿 ¡Intentá de nuevo!', 'lose');
      }

      slotSpinning = false;
      document.getElementById('btn-slot').disabled = false;
    }, 1500);
  };

  // ================================
  // LÓGICA PIEDRA PAPEL TIJERA
  // ================================
  let pptPlaying = false;

  window.playPPT = async (playerChoice) => {
    if (pptPlaying) return;

    const currentWallet = window.getWallet();
    if (currentWallet < 1) {
      showGameMsg('ppt-result', '¡No tenés monedas suficientes! 🪙', 'error');
      return;
    }

    pptPlaying = true;
    document.querySelectorAll('.btn-ppt').forEach(b => b.disabled = true);

    // Cobrar 1 moneda
    await onWalletChange(-1, 'ppt-cost');

    // Mostrar elección del jugador
    const playerEl  = document.getElementById('ppt-player-choice');
    const pusheenEl = document.getElementById('ppt-pusheen-choice');
    const chosen    = PPT_OPTIONS.find(o => o.id === playerChoice);
    playerEl.textContent = chosen.emoji;

    // Animación Pusheen pensando
    pusheenEl.textContent = '🤔';
    let thinkInterval = setInterval(() => {
      pusheenEl.textContent = ['🤔','😏','🐾','😼'][Math.floor(Math.random()*4)];
    }, 200);

    setTimeout(async () => {
      clearInterval(thinkInterval);

      // Elección aleatoria de Pusheen
      const pusheenChoice = PPT_OPTIONS[Math.floor(Math.random() * PPT_OPTIONS.length)];
      pusheenEl.textContent = pusheenChoice.emoji;

      const result = getPPTResult(playerChoice, pusheenChoice.id);

      if (result === 'win') {
        await onWalletChange(5, 'ppt-win');
        showGameMsg('ppt-result', `¡Ganaste! ${chosen.emoji} vence a ${pusheenChoice.emoji} · +5 🪙`, 'win');
        if (window.spawnCoins) window.spawnCoins(8);
        playerEl.classList.add('ppt-winner');
        pusheenEl.classList.add('ppt-loser');
      } else if (result === 'lose') {
        showGameMsg('ppt-result', `¡Pusheen ganó! ${pusheenChoice.emoji} vence a ${chosen.emoji} 😹`, 'lose');
        pusheenEl.classList.add('ppt-winner');
        playerEl.classList.add('ppt-loser');
      } else {
        // Empate — devuelve la moneda
        await onWalletChange(1, 'ppt-tie');
        showGameMsg('ppt-result', `¡Empate! ${chosen.emoji} vs ${pusheenChoice.emoji} · Moneda devuelta 🪙`, 'tie');
      }

      setTimeout(() => {
        playerEl.classList.remove('ppt-winner','ppt-loser');
        pusheenEl.classList.remove('ppt-winner','ppt-loser');
        pptPlaying = false;
        document.querySelectorAll('.btn-ppt').forEach(b => b.disabled = false);
      }, 2500);

    }, 1200);
  };
}

// ================================
// HELPER: mostrar mensaje en juego
// ================================
function showGameMsg(id, text, type) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = text;
  el.className   = `game-result game-result-${type}`;
  el.style.display = 'block';
  clearTimeout(el._t);
  el._t = setTimeout(() => { el.style.display = 'none'; }, 3500);
}