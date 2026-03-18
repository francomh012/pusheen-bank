// ================================================
// assets/js/journey.js — Camino de Patitas 🐾
// Estilo Candy Crush — 50 nodos, cada 5 hay recompensa
// Progreso basado en total_donated
// ================================================

import { PUSHEEN_VIDEOS, VIDEO_PROBABILITY } from './config.js';

// ==========================
// CONFIGURACIÓN DEL CAMINO
// ==========================
const TOTAL_NODES    = 50;   // nodos totales
const REWARD_EVERY   = 5;    // cada 5 nodos hay recompensa
const COINS_PER_NODE = 10;   // monedas donadas necesarias por nodo

// Recompensas en cada nodo de recompensa (cada 5)
const JOURNEY_REWARDS = [
  { node: 5,  coins: 5,  title: '¡Primera parada!',    icon: '🌸' },
  { node: 10, coins: 10, title: '¡10 patitas!',         icon: '⭐' },
  { node: 15, coins: 15, title: '¡A mitad del camino!', icon: '🍩' },
  { node: 20, coins: 20, title: '¡20 patitas!',         icon: '💖' },
  { node: 25, coins: 25, title: '¡A la mitad!',         icon: '🔥' },
  { node: 30, coins: 30, title: '¡30 patitas!',         icon: '⚡' },
  { node: 35, coins: 35, title: '¡Casi llegás!',        icon: '✨' },
  { node: 40, coins: 50, title: '¡40 patitas!',         icon: '🌟' },
  { node: 45, coins: 60, title: '¡Campeón!',            icon: '👑' },
  { node: 50, coins: 100,title: '¡Meta final!',         icon: '🏆' },
];

// Posiciones del camino — zigzag curveado
// Columnas: izq(L), centro-izq(CL), centro-der(CR), der(R)
// El camino sube de abajo hacia arriba
function buildPath() {
  const nodes = [];
  // Patrón de columnas x para cada nodo (zigzag)
  const xPattern = [
    50, 130, 210, 270, 210, 130, 50, 130, 210, 270,  // 1-10
    210, 130, 50, 130, 210, 270, 210, 130, 50, 130,   // 11-20
    210, 270, 210, 130, 50, 130, 210, 270, 210, 130,  // 21-30
    50, 130, 210, 270, 210, 130, 50, 130, 210, 270,   // 31-40
    210, 130, 50, 130, 210, 270, 210, 130, 50, 130,   // 41-50
  ];

  for (let i = 0; i < TOTAL_NODES; i++) {
    const nodeNum    = i + 1;
    const isReward   = nodeNum % REWARD_EVERY === 0;
    const rewardData = isReward ? JOURNEY_REWARDS.find(r => r.node === nodeNum) : null;
    // Y: empieza abajo (alto) y sube
    const y = 2800 - (i * 56);
    nodes.push({
      id:         nodeNum,
      x:          xPattern[i],
      y,
      isReward,
      rewardData,
      size:       isReward ? 44 : 32,
    });
  }
  return nodes;
}

// ==========================
// RENDER DEL CAMINO
// ==========================
export function renderJourneyTab(totalDonated, claimedJourneyRewards, onClaimReward) {
  const container = document.getElementById('tab-journey');
  if (!container) return;

  const nodes         = buildPath();
  const currentNode   = Math.min(Math.floor(totalDonated / COINS_PER_NODE), TOTAL_NODES);
  const totalHeight   = 2900;
  const svgWidth      = 320;

  container.innerHTML = `
    <div class="journey-wrap">
      <div class="journey-header">
        <img src="assets/img/pusheen.gif" class="journey-pusheen" alt="Pusheen">
        <div class="journey-info">
          <div class="journey-title">Camino de Patitas 🐾</div>
          <div class="journey-progress">${currentNode} / ${TOTAL_NODES} patitas</div>
          <div class="journey-donated">${totalDonated} monedas donadas</div>
        </div>
      </div>

      <div class="journey-scroll" id="journey-scroll">
        <svg width="${svgWidth}" height="${totalHeight}" viewBox="0 0 ${svgWidth} ${totalHeight}" class="journey-svg">

          <!-- Línea del camino -->
          ${buildPathLine(nodes)}

          <!-- Nodos -->
          ${nodes.map(node => renderNode(node, currentNode, claimedJourneyRewards)).join('')}

          <!-- Inicio -->
          <g transform="translate(130, ${totalHeight - 30})">
            <circle cx="0" cy="0" r="20" fill="#ff6fa8" stroke="#fff" stroke-width="3"/>
            <text x="0" y="5" text-anchor="middle" font-size="14" fill="white" font-family="Nunito" font-weight="900">🐾</text>
          </g>

        </svg>
      </div>
    </div>
  `;

  // Scroll hasta el nodo actual
  setTimeout(() => {
    const scroll = document.getElementById('journey-scroll');
    if (!scroll) return;
    const currentY = nodes[Math.max(0, currentNode - 1)]?.y || totalHeight;
    scroll.scrollTop = Math.max(0, currentY - 300);
  }, 100);

  // Click en nodos de recompensa
  container.querySelectorAll('.journey-reward-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const nodeId = parseInt(btn.dataset.node);
      const reward = JOURNEY_REWARDS.find(r => r.node === nodeId);
      if (!reward) return;
      onClaimReward(nodeId, reward);
    });
  });
}

// ==========================
// CONSTRUIR LÍNEA DEL CAMINO
// ==========================
function buildPathLine(nodes) {
  if (nodes.length < 2) return '';
  let d = `M ${nodes[0].x} ${nodes[0].y}`;
  for (let i = 1; i < nodes.length; i++) {
    const prev = nodes[i - 1];
    const curr = nodes[i];
    const cpX  = (prev.x + curr.x) / 2;
    const cpY  = (prev.y + curr.y) / 2;
    d += ` Q ${prev.x} ${cpY} ${curr.x} ${curr.y}`;
  }
  return `
    <path d="${d}" fill="none" stroke="#ffd6e7" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="${d}" fill="none" stroke="#ffaac9" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="12 8"/>
  `;
}

// ==========================
// RENDER DE CADA NODO
// ==========================
function renderNode(node, currentNode, claimedJourneyRewards) {
  const reached  = node.id <= currentNode;
  const claimed  = claimedJourneyRewards.includes(node.id);
  const canClaim = node.isReward && reached && !claimed;

  if (node.isReward) {
    // Nodo de recompensa — más grande, con fondo dorado
    const fillColor   = claimed ? '#a8e6c0' : reached ? '#ffc94d' : '#e0e0e0';
    const strokeColor = claimed ? '#1a7a3a' : reached ? '#b8860b' : '#bbb';
    const textColor   = claimed ? '#1a7a3a' : reached ? '#3a1a2e' : '#999';
    const icon        = claimed ? '✅' : node.rewardData?.icon || '🎁';

    return `
      <g transform="translate(${node.x}, ${node.y})">
        <!-- Brillo detrás si está disponible -->
        ${canClaim ? `<circle cx="0" cy="0" r="${node.size + 8}" fill="#ffc94d" opacity="0.3">
          <animate attributeName="r" values="${node.size + 6};${node.size + 12};${node.size + 6}" dur="1.5s" repeatCount="indefinite"/>
          <animate attributeName="opacity" values="0.3;0.1;0.3" dur="1.5s" repeatCount="indefinite"/>
        </circle>` : ''}
        <circle cx="0" cy="0" r="${node.size}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="3"/>
        <text x="0" y="6" text-anchor="middle" font-size="20" font-family="Nunito">${icon}</text>
        <text x="0" y="${node.size + 14}" text-anchor="middle" font-size="10" fill="${textColor}" font-family="Nunito" font-weight="800">${node.id}</text>
        ${canClaim ? `<foreignObject x="${-node.size}" y="${node.size + 18}" width="${node.size * 2}" height="24">
          <button class="journey-reward-btn" data-node="${node.id}" xmlns="http://www.w3.org/1999/xhtml">
            ¡Canjear!
          </button>
        </foreignObject>` : ''}
      </g>
    `;
  } else {
    // Nodo normal — patita pequeña
    const fillColor   = reached ? '#ff6fa8' : '#e8e8e8';
    const strokeColor = reached ? '#d63d7a' : '#ccc';

    return `
      <g transform="translate(${node.x}, ${node.y})">
        <circle cx="0" cy="0" r="${node.size}" fill="${fillColor}" stroke="${strokeColor}" stroke-width="2.5"/>
        <image href="assets/img/patita.png"
          x="${-node.size * 0.65}" y="${-node.size * 0.65}"
          width="${node.size * 1.3}" height="${node.size * 1.3}"
          opacity="${reached ? 1 : 0.35}"/>
        <text x="0" y="${node.size + 14}" text-anchor="middle" font-size="9" fill="${reached ? '#d63d7a' : '#aaa'}" font-family="Nunito" font-weight="700">${node.id}</text>
      </g>
    `;
  }
}