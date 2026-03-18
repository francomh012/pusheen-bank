// ================================================
// assets/js/journey.js — Camino de Patitas 🐾
// ================================================

import { PUSHEEN_VIDEOS, VIDEO_PROBABILITY } from './config.js';

const TOTAL_NODES    = 50;
const REWARD_EVERY   = 5;
const COINS_PER_NODE = 10;

const JOURNEY_REWARDS = [
  { node: 5,  coins: 5,   title: '¡Primera parada!',    icon: '🌸' },
  { node: 10, coins: 10,  title: '¡10 patitas!',         icon: '⭐' },
  { node: 15, coins: 15,  title: '¡A mitad del camino!', icon: '🍩' },
  { node: 20, coins: 20,  title: '¡20 patitas!',         icon: '💖' },
  { node: 25, coins: 25,  title: '¡A la mitad!',         icon: '🔥' },
  { node: 30, coins: 30,  title: '¡30 patitas!',         icon: '⚡' },
  { node: 35, coins: 35,  title: '¡Casi llegás!',        icon: '✨' },
  { node: 40, coins: 50,  title: '¡40 patitas!',         icon: '🌟' },
  { node: 45, coins: 60,  title: '¡Campeón!',            icon: '👑' },
  { node: 50, coins: 100, title: '¡Meta final!',          icon: '🏆' },
];

// ==========================
// CONSTRUIR NODOS — camino muy curveado
// zigzag exagerado: izquierda lejana ↔ derecha lejana
// ==========================
function buildNodes() {
  const nodes = [];
  // Posiciones X más extremas para mayor curvatura
  // Patrón: far-left, mid-left, center, mid-right, far-right, mid-right, center, mid-left...
  const xPositions = [40, 90, 160, 230, 280, 230, 160, 90, 40, 90];

  for (let i = 0; i < TOTAL_NODES; i++) {
    const nodeNum  = i + 1;
    const isReward = nodeNum % REWARD_EVERY === 0;
    const reward   = isReward ? JOURNEY_REWARDS.find(r => r.node === nodeNum) : null;
    const x        = xPositions[i % xPositions.length];
    // Y sube de abajo hacia arriba, con más espacio entre nodos
    const y        = 3000 - (i * 60);

    nodes.push({ id: nodeNum, x, y, isReward, reward, size: isReward ? 38 : 26 });
  }
  return nodes;
}

// ==========================
// LÍNEA DEL CAMINO — curvas Bezier pronunciadas
// ==========================
function buildPathLine(nodes) {
  if (nodes.length < 2) return '';

  let d = `M ${nodes[0].x} ${nodes[0].y}`;

  for (let i = 1; i < nodes.length; i++) {
    const p = nodes[i - 1];
    const c = nodes[i];
    // Control points exagerados para curvas pronunciadas
    const cpX1 = p.x + (c.x - p.x) * 0.1;
    const cpY1 = p.y - Math.abs(c.y - p.y) * 0.5;
    const cpX2 = c.x - (c.x - p.x) * 0.1;
    const cpY2 = c.y + Math.abs(c.y - p.y) * 0.5;
    d += ` C ${cpX1} ${cpY1}, ${cpX2} ${cpY2}, ${c.x} ${c.y}`;
  }

  return `
    <path d="${d}" fill="none" stroke="#ffd6e7" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="#ffaac9" stroke-width="5" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="14 10"/>
  `;
}

// ==========================
// RENDER DE CADA NODO
// ==========================
function renderNode(node, currentNode, claimedJourney, claimedPaws) {
  const reached     = node.id <= currentNode;
  const claimed     = claimedJourney.includes(node.id);
  const pawClaimed  = claimedPaws.includes(node.id);
  const canClaim    = node.isReward && reached && !claimed;
  const canClaimPaw = !node.isReward && reached && !pawClaimed;

  if (node.isReward) {
    // Nodo de recompensa — imagen grande con animación
    const opacity  = reached ? '1' : '0.35';
    const filter   = claimed ? 'grayscale(1) brightness(0.8)' : reached ? 'drop-shadow(0 0 6px #ffc94d)' : 'grayscale(1)';

    return `
      <g class="journey-node journey-node-reward ${canClaim ? 'can-claim' : ''}"
         data-node="${node.id}" data-type="reward"
         transform="translate(${node.x}, ${node.y})" style="cursor:${canClaim ? 'pointer' : 'default'}">

        ${canClaim ? `
        <circle cx="0" cy="0" r="${node.size + 10}" fill="#ffc94d" opacity="0.2">
          <animate attributeName="r" values="${node.size+8};${node.size+14};${node.size+8}" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.2;0.05;0.2" dur="1.5s" repeatCount="indefinite"/>
        </circle>` : ''}

        <image href="assets/img/patita.png"
          x="${-node.size}" y="${-node.size}"
          width="${node.size * 2}" height="${node.size * 2}"
          opacity="${opacity}"
          style="filter:${filter}"/>

        ${claimed ? `<text x="0" y="${node.size + 16}" text-anchor="middle" font-size="11" fill="#1a7a3a" font-family="Nunito" font-weight="900">✅</text>` : ''}
        ${canClaim ? `<text x="0" y="${node.size + 16}" text-anchor="middle" font-size="10" fill="#b8860b" font-family="Nunito" font-weight="900">¡Toca! ${node.reward?.icon}</text>` : ''}
        ${!reached ? `<text x="0" y="${node.size + 16}" text-anchor="middle" font-size="9" fill="#aaa" font-family="Nunito" font-weight="700">${node.id}</text>` : ''}
      </g>
    `;
  } else {
    // Nodo normal — solo imagen patita, sin círculo
    const opacity = reached ? (pawClaimed ? '0.5' : '1') : '0.25';
    const filter  = reached && !pawClaimed
      ? 'drop-shadow(0 2px 4px rgba(200,80,140,0.4))'
      : 'none';

    return `
      <g class="journey-node journey-node-paw ${canClaimPaw ? 'can-claim-paw' : ''}"
         data-node="${node.id}" data-type="paw"
         transform="translate(${node.x}, ${node.y})"
         style="cursor:${canClaimPaw ? 'pointer' : 'default'}">

        <image href="assets/img/patita.png"
          x="${-node.size}" y="${-node.size}"
          width="${node.size * 2}" height="${node.size * 2}"
          opacity="${opacity}"
          style="filter:${filter}"/>

        ${pawClaimed ? `<text x="0" y="${node.size + 12}" text-anchor="middle" font-size="9" fill="#1a7a3a" font-family="Nunito" font-weight="800">+1 ✅</text>` : ''}
        ${canClaimPaw ? `<text x="0" y="${node.size + 12}" text-anchor="middle" font-size="9" fill="#d63d7a" font-family="Nunito" font-weight="800">+1 🪙</text>` : ''}
      </g>
    `;
  }
}

// ==========================
// RENDER PRINCIPAL
// ==========================
export function renderJourneyScreen(totalDonated, claimedJourney, claimedPaws, onClaimReward, onClaimPaw) {
  const screen = document.getElementById('journey-fullscreen');
  if (!screen) return;

  const nodes       = buildNodes();
  const currentNode = Math.min(Math.floor(totalDonated / COINS_PER_NODE), TOTAL_NODES);
  const totalHeight = 3100;
  const svgWidth    = 320;

  screen.innerHTML = `
    <header class="journey-header">
      <button class="btn-back" id="btn-back-journey">← Volver</button>
      <div class="journey-header-info">
        <div class="journey-title">Camino de Patitas 🐾</div>
        <div class="journey-progress">${currentNode} / ${TOTAL_NODES}</div>
      </div>
      <img src="assets/img/pusheen.gif" class="journey-pusheen-mini" alt="Pusheen">
    </header>

    <div class="journey-scroll" id="journey-scroll">
      <svg width="${svgWidth}" height="${totalHeight}"
           viewBox="0 0 ${svgWidth} ${totalHeight}"
           class="journey-svg" id="journey-svg">

        <!-- Fondo decorativo -->
        <defs>
          <radialGradient id="bgGrad" cx="50%" cy="50%" r="50%">
            <stop offset="0%" stop-color="#fff8fc"/>
            <stop offset="100%" stop-color="#fff0f5"/>
          </radialGradient>
        </defs>
        <rect width="${svgWidth}" height="${totalHeight}" fill="url(#bgGrad)"/>

        <!-- Línea del camino -->
        ${buildPathLine(nodes)}

        <!-- Punto de inicio -->
        <image href="assets/img/pusheen.gif"
          x="105" y="${totalHeight - 65}"
          width="50" height="50"/>
        <text x="130" y="${totalHeight - 10}"
          text-anchor="middle" font-size="11"
          fill="#d63d7a" font-family="Nunito" font-weight="900">¡Inicio! 🐾</text>

        <!-- Nodos -->
        ${nodes.map(n => renderNode(n, currentNode, claimedJourney, claimedPaws)).join('')}

        <!-- Meta final -->
        <text x="${nodes[TOTAL_NODES-1].x}" y="${nodes[TOTAL_NODES-1].y - 50}"
          text-anchor="middle" font-size="18">🏆</text>
        <text x="${nodes[TOTAL_NODES-1].x}" y="${nodes[TOTAL_NODES-1].y - 30}"
          text-anchor="middle" font-size="10"
          fill="#b8860b" font-family="Nunito" font-weight="900">¡Meta!</text>

      </svg>
    </div>
  `;

  // Scroll hasta el nodo actual
  setTimeout(() => {
    const scrollEl = document.getElementById('journey-scroll');
    if (!scrollEl || !nodes[currentNode - 1]) return;
    const targetY = nodes[Math.max(0, currentNode - 1)].y;
    scrollEl.scrollTop = Math.max(0, targetY - 300);
  }, 150);

  // Botón volver
  document.getElementById('btn-back-journey').onclick = () => {
    screen.classList.remove('active');
  };

  // Click en nodos
  document.getElementById('journey-svg').addEventListener('click', (e) => {
    const node = e.target.closest('.journey-node');
    if (!node) return;
    const nodeId = parseInt(node.dataset.node);
    const type   = node.dataset.type;

    if (type === 'reward' && node.classList.contains('can-claim')) {
      const reward = JOURNEY_REWARDS.find(r => r.node === nodeId);
      if (reward) onClaimReward(nodeId, reward);
    }
    if (type === 'paw' && node.classList.contains('can-claim-paw')) {
      onClaimPaw(nodeId);
    }
  });
}

// ==========================
// MODAL RECOMPENSA DEL CAMINO
// ==========================
export function showJourneyRewardModal(reward, wonVideo, spawnCoinsFn) {
  const existing = document.getElementById('journey-modal-overlay');
  if (existing) existing.remove();

  const overlay = document.createElement('div');
  overlay.id = 'journey-modal-overlay';
  overlay.className = 'journey-modal-overlay';

  const videoHTML = wonVideo ? `
    <div class="journey-modal-video">
      <iframe src="https://www.youtube-nocookie.com/embed/${wonVideo.id}?autoplay=1&mute=0&rel=0"
        allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>
    </div>
    <p style="font-size:0.78rem;font-weight:800;color:#1a7a3a;">✅ Video guardado en tu mochila 🎒</p>
  ` : '';

  overlay.innerHTML = `
    <div class="journey-modal-box">
      <div class="journey-confetti" id="j-confetti"></div>
      <div class="journey-modal-icon">${reward.icon}</div>
      <h2 class="journey-modal-title">${reward.title}</h2>
      <p class="journey-modal-desc">¡Llegaste al nodo ${reward.node}!</p>
      <div class="journey-modal-coins">+${reward.coins} 🪙</div>
      ${videoHTML}
      <button class="journey-modal-btn" id="j-modal-close">¡Genial! 🐾</button>
    </div>
  `;

  document.body.appendChild(overlay);
  if (spawnCoinsFn) spawnCoinsFn(12);

  // Confetti
  const confettiEl = document.getElementById('j-confetti');
  if (confettiEl) {
    const colors = ['#ff6fa8','#ffc94d','#ffaac9','#a8e6c0','#ff6b6b'];
    for (let i = 0; i < 30; i++) {
      const p = document.createElement('div');
      p.className = 'confetti-piece';
      p.style.cssText = `left:${Math.random()*100}%;background:${colors[i%colors.length]};animation-duration:${1.2+Math.random()*1.2}s;animation-delay:${Math.random()*0.5}s;width:${6+Math.random()*6}px;height:${6+Math.random()*6}px;border-radius:${Math.random()>0.5?'50%':'2px'}`;
      confettiEl.appendChild(p);
    }
  }

  document.getElementById('j-modal-close').onclick = () => overlay.remove();
  overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
}