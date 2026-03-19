// ================================================
// assets/js/games.js — Mini-juegos Pusheen Bank 🐾
// ================================================

import { SLOT_SYMBOLS, SLOT_PRIZES, PPT_OPTIONS, PPT_WIN_COINS, PPT_LOSE_COINS } from './config.js';

// ==========================
// HELPERS
// ==========================
function getPPTResult(player, pusheen) {
    if (player === pusheen) return 'tie';
    if (
        (player === 'rock'     && pusheen === 'scissors') ||
        (player === 'paper'    && pusheen === 'rock')     ||
        (player === 'scissors' && pusheen === 'paper')
    ) return 'win';
    return 'lose';
}

function weightedRandom(symbols) {
    const total = symbols.reduce((s, x) => s + x.weight, 0);
    let r = Math.random() * total;
    for (const sym of symbols) { r -= sym.weight; if (r <= 0) return sym; }
    return symbols[symbols.length - 1];
}

function showGameMsg(id, text, type) {
    const el = document.getElementById(id);
    if (!el) return;
    el.textContent   = text;
    el.className     = `game-result game-result-${type}`;
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

function updateGFWallet() {
    const el = document.getElementById('gf-wallet-num');
    if (el) el.textContent = window.getWallet() + ' 🪙';
}

// ==========================
// PERSONAJES FLAPPY
// ==========================
const FLAPPY_CHARS = [
    { id: 'globo1',  name: 'Globo Rosa',  img: 'assets/img/globo1.gif',  cost: 0,   owned: true  },
    { id: 'globo2',  name: 'Globo Dorado', img: 'assets/img/globo2.gif', cost: 50,  owned: false },
    { id: 'avion1',  name: 'Avioncito',   img: 'assets/img/avion1.gif',  cost: 100, owned: false },
];

// Guardar personajes desbloqueados en localStorage por jugador
function getOwnedChars(player) {
    try {
        const data = JSON.parse(localStorage.getItem(`flappy_chars_${player}`) || '["globo1"]');
        return data;
    } catch { return ['globo1']; }
}

function saveOwnedChars(player, owned) {
    localStorage.setItem(`flappy_chars_${player}`, JSON.stringify(owned));
}

function getSelectedChar(player) {
    return localStorage.getItem(`flappy_selected_${player}`) || 'globo1';
}

function saveSelectedChar(player, charId) {
    localStorage.setItem(`flappy_selected_${player}`, charId);
}

// Guardar récord flappy
function getFlappyRecord(player) {
    return parseInt(localStorage.getItem(`flappy_record_${player}`) || '0');
}

function saveFlappyRecord(player, score) {
    localStorage.setItem(`flappy_record_${player}`, score);
}

// ==========================
// RENDER SELECTOR DE JUEGOS
// ==========================
export function renderGamesTab(currentPlayer, myWallet, onWalletChange) {
    const container = document.getElementById('tab-games');
    if (!container) return;

    container.innerHTML = `
        <div class="games-header">
            <img src="assets/img/pusheen.gif" class="games-pusheen" alt="Pusheen">
            <h2 class="games-title">Mini-juegos 🎮</h2>
            <p class="games-sub">Cada juego cuesta <strong>1 🪙</strong></p>
        </div>
        <div class="games-grid">
            <button class="game-select-card" onclick="window.openGame('slots')">
                <span class="game-select-icon">🎰</span>
                <span class="game-select-name">Tragamonedas</span>
                <span class="game-select-desc">3 iguales = ganás</span>
            </button>
            <button class="game-select-card" onclick="window.openGame('ppt')">
                <span class="game-select-icon">🪨</span>
                <span class="game-select-name">PPT vs Pusheen</span>
                <span class="game-select-desc">Ganá = +${PPT_WIN_COINS} 🪙</span>
            </button>
            <button class="game-select-card flappy-card" onclick="window.openGame('flappy')">
                <span class="game-select-icon">🎈</span>
                <span class="game-select-name">Flappy Globo</span>
                <span class="game-select-desc">¡Esquivá los tubos!</span>
            </button>
        </div>
    `;

    // ==========================
    // TRAGAMONEDAS
    // ==========================
    function openSlots(content) {
        document.getElementById('game-fullscreen-title').textContent = '🎰 Tragamonedas';
        content.innerHTML = `
            <div class="gf-wallet">
                <span class="gf-wallet-label">Tus monedas</span>
                <span class="gf-wallet-num" id="gf-wallet-num">${window.getWallet()} 🪙</span>
            </div>
            <div class="slot-machine">
                <div class="slot-reels">
                    <div class="slot-reel" id="reel-0">🐾</div>
                    <div class="slot-reel" id="reel-1">🐾</div>
                    <div class="slot-reel" id="reel-2">🐾</div>
                </div>
                <div class="slot-line"></div>
            </div>
            <div class="slot-prizes-info">
                <div class="prize-row">👑 × 3 = <strong>+50 🪙 JACKPOT</strong></div>
                <div class="prize-row">💖 × 3 = +20 🪙</div>
                <div class="prize-row">⭐ × 3 = +10 🪙</div>
                <div class="prize-row">🍩 × 3 = +5 🪙 &nbsp;|&nbsp; 🌸 × 3 = +3 🪙 &nbsp;|&nbsp; 🐾 × 3 = +2 🪙</div>
            </div>
            <div id="slot-result" class="game-result" style="display:none;"></div>
            <button class="btn-play" id="btn-slot">
                Girar 🎰 <span class="btn-cost">−1 🪙</span>
            </button>
        `;

        let slotSpinning = false;
        document.getElementById('btn-slot').onclick = async () => {
            if (slotSpinning) return;
            if (window.getWallet() < 1) { showGameMsg('slot-result', '¡No tenés monedas! 🪙', 'error'); return; }
            slotSpinning = true;
            document.getElementById('btn-slot').disabled = true;
            await onWalletChange(-1); updateGFWallet();
            const reels     = [0,1,2].map(i => document.getElementById(`reel-${i}`));
            const intervals = reels.map((reel, i) => setInterval(() => { reel.textContent = weightedRandom(SLOT_SYMBOLS).emoji; reel.classList.add('spinning'); }, 80 + i * 20));
            const results   = [weightedRandom(SLOT_SYMBOLS), weightedRandom(SLOT_SYMBOLS), weightedRandom(SLOT_SYMBOLS)];
            setTimeout(() => { clearInterval(intervals[0]); reels[0].textContent = results[0].emoji; reels[0].classList.remove('spinning'); reels[0].classList.add('stop'); }, 700);
            setTimeout(() => { clearInterval(intervals[1]); reels[1].textContent = results[1].emoji; reels[1].classList.remove('spinning'); reels[1].classList.add('stop'); }, 1100);
            setTimeout(async () => {
                clearInterval(intervals[2]); reels[2].textContent = results[2].emoji; reels[2].classList.remove('spinning'); reels[2].classList.add('stop');
                setTimeout(() => reels.forEach(r => r.classList.remove('stop')), 500);
                const isWin = results[0].name === results[1].name && results[1].name === results[2].name;
                if (isWin) {
                    const prize = SLOT_PRIZES[results[0].name];
                    await onWalletChange(prize.coins); updateGFWallet();
                    showGameMsg('slot-result', prize.msg, 'win');
                    if (window.spawnCoins) window.spawnCoins(10);
                    if (results[0].name === 'corona') { reels.forEach(r => r.classList.add('jackpot')); setTimeout(() => reels.forEach(r => r.classList.remove('jackpot')), 2000); }
                } else { showGameMsg('slot-result', 'No fue esta vez... 😿', 'lose'); }
                slotSpinning = false; document.getElementById('btn-slot').disabled = false;
            }, 1500);
        };
    }

    // ==========================
    // PIEDRA PAPEL TIJERA
    // ==========================
    function openPPT(content) {
        document.getElementById('game-fullscreen-title').textContent = '🪨 Piedra Papel Tijera';
        content.innerHTML = `
            <div class="gf-wallet">
                <span class="gf-wallet-label">Tus monedas</span>
                <span class="gf-wallet-num" id="gf-wallet-num">${window.getWallet()} 🪙</span>
            </div>
            <div class="ppt-rules">
                <span class="ppt-rule win">✅ Ganás = <strong>+${PPT_WIN_COINS} 🪙</strong></span>
                <span class="ppt-rule tie">🤝 Empate = devuelve 🪙</span>
                <span class="ppt-rule lose">😹 Pusheen gana = <strong>−${PPT_LOSE_COINS} 🪙</strong></span>
            </div>
            <div class="ppt-arena">
                <div class="ppt-side"><div class="ppt-label">Tú</div><div class="ppt-choice" id="ppt-player-choice">❓</div></div>
                <div class="ppt-vs">VS</div>
                <div class="ppt-side"><div class="ppt-label">Pusheen</div><div class="ppt-choice" id="ppt-pusheen-choice">🐾</div></div>
            </div>
            <div class="ppt-buttons">
                <button class="btn-ppt" id="ppt-rock">🪨<span>Piedra</span></button>
                <button class="btn-ppt" id="ppt-paper">📄<span>Papel</span></button>
                <button class="btn-ppt" id="ppt-scissors">✂️<span>Tijera</span></button>
            </div>
            <div id="ppt-result" class="game-result" style="display:none;"></div>
            <p class="ppt-cost-note">Cada jugada cuesta <strong>1 🪙</strong></p>
        `;

        let pptPlaying = false;
        ['rock','paper','scissors'].forEach(choice => {
            document.getElementById(`ppt-${choice}`).onclick = async () => {
                if (pptPlaying) return;
                if (window.getWallet() < 1) { showGameMsg('ppt-result', '¡No tenés monedas! 🪙', 'error'); return; }
                pptPlaying = true;
                document.querySelectorAll('.btn-ppt').forEach(b => b.disabled = true);
                await onWalletChange(-1); updateGFWallet();
                const playerEl = document.getElementById('ppt-player-choice');
                const pusheenEl = document.getElementById('ppt-pusheen-choice');
                const chosen = PPT_OPTIONS.find(o => o.id === choice);
                playerEl.textContent = chosen.emoji; pusheenEl.textContent = '🤔';
                const thinkInterval = setInterval(() => { pusheenEl.textContent = ['🤔','😏','🐾','😼'][Math.floor(Math.random()*4)]; }, 200);
                setTimeout(async () => {
                    clearInterval(thinkInterval);
                    const pusheenChoice = PPT_OPTIONS[Math.floor(Math.random() * PPT_OPTIONS.length)];
                    pusheenEl.textContent = pusheenChoice.emoji;
                    const result = getPPTResult(choice, pusheenChoice.id);
                    if (result === 'win') {
                        await onWalletChange(PPT_WIN_COINS); updateGFWallet();
                        showGameMsg('ppt-result', `¡Ganaste! ${chosen.emoji} vence a ${pusheenChoice.emoji} · +${PPT_WIN_COINS} 🪙`, 'win');
                        if (window.spawnCoins) window.spawnCoins(8);
                        playerEl.classList.add('ppt-winner'); pusheenEl.classList.add('ppt-loser');
                    } else if (result === 'lose') {
                        await onWalletChange(-PPT_LOSE_COINS); updateGFWallet();
                        showGameMsg('ppt-result', `¡Pusheen ganó! ${pusheenChoice.emoji} vence a ${chosen.emoji} · −${PPT_LOSE_COINS} 🪙 😹`, 'lose');
                        pusheenEl.classList.add('ppt-winner'); playerEl.classList.add('ppt-loser');
                    } else {
                        await onWalletChange(1); updateGFWallet();
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
        });
    }

    // ==========================
    // 🎈 FLAPPY GLOBO
    // ==========================
    function openFlappy(content) {
        document.getElementById('game-fullscreen-title').textContent = '🎈 Flappy Globo';

        const owned    = getOwnedChars(currentPlayer);
        const selected = getSelectedChar(currentPlayer);
        const record   = getFlappyRecord(currentPlayer);
        const wallet   = window.getWallet();

        // Render pantalla de selección de personaje
        function renderCharSelect() {
            const w = window.getWallet();
            content.innerHTML = `
                <div class="gf-wallet">
                    <span class="gf-wallet-label">Tus monedas</span>
                    <span class="gf-wallet-num" id="gf-wallet-num">${w} 🪙</span>
                </div>

                <div class="flappy-char-section">
                    <div class="flappy-char-title">Elige tu personaje</div>
                    <div class="flappy-char-grid" id="flappy-char-grid">
                        ${FLAPPY_CHARS.map(ch => {
                            const isOwned    = getOwnedChars(currentPlayer).includes(ch.id);
                            const isSelected = getSelectedChar(currentPlayer) === ch.id;
                            return `
                            <div class="flappy-char-card ${isSelected ? 'selected' : ''} ${!isOwned ? 'locked' : ''}"
                                 data-id="${ch.id}" id="char-card-${ch.id}">
                                <img src="${ch.img}" class="flappy-char-img" alt="${ch.name}"
                                     onerror="this.style.opacity='0.3'">
                                <div class="flappy-char-name">${ch.name}</div>
                                ${isOwned
                                    ? `<div class="flappy-char-status ${isSelected ? 'active' : ''}">${isSelected ? '✅ Seleccionado' : 'Seleccionar'}</div>`
                                    : `<button class="flappy-char-buy" data-id="${ch.id}" data-cost="${ch.cost}">
                                         Desbloquear ${ch.cost} 🪙
                                       </button>`
                                }
                            </div>`;
                        }).join('')}
                    </div>
                </div>

                <div class="flappy-record-wrap">
                    <span>🏆 Tu récord: <strong id="flappy-record-display">${getFlappyRecord(currentPlayer)}</strong></span>
                </div>

                <div class="flappy-ranking" id="flappy-ranking">
                    <div class="flappy-ranking-title">🏆 Ranking</div>
                    <div class="flappy-ranking-rows" id="flappy-ranking-rows">Cargando...</div>
                </div>

                <button class="btn-play flappy-play-btn" id="btn-start-flappy">
                    ¡Jugar! 🎈
                </button>
            `;

            // Cargar ranking desde localStorage
            renderFlappyRanking();

            // Seleccionar personaje
            content.querySelectorAll('.flappy-char-card').forEach(card => {
                card.addEventListener('click', (e) => {
                    if (e.target.classList.contains('flappy-char-buy')) return;
                    const id = card.dataset.id;
                    if (!getOwnedChars(currentPlayer).includes(id)) return;
                    saveSelectedChar(currentPlayer, id);
                    renderCharSelect(); // re-render
                });
            });

            // Comprar personaje
            content.querySelectorAll('.flappy-char-buy').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    const id   = btn.dataset.id;
                    const cost = parseInt(btn.dataset.cost);
                    if (window.getWallet() < cost) {
                        btn.textContent = '¡Sin monedas! 😿';
                        setTimeout(() => { btn.textContent = `Desbloquear ${cost} 🪙`; }, 1500);
                        return;
                    }
                    await onWalletChange(-cost);
                    const newOwned = [...getOwnedChars(currentPlayer), id];
                    saveOwnedChars(currentPlayer, newOwned);
                    saveSelectedChar(currentPlayer, id);
                    renderCharSelect();
                });
            });

            // Botón jugar
            document.getElementById('btn-start-flappy').onclick = () => startFlappyGame();
        }

        // ==========================
        // RANKING FLAPPY
        // ==========================
        function renderFlappyRanking() {
            const rows = document.getElementById('flappy-ranking-rows');
            if (!rows) return;
            const players = ['Franco', 'Jess'];
            const scores  = players.map(p => ({ name: p, score: getFlappyRecord(p) }))
                                   .sort((a, b) => b.score - a.score);
            rows.innerHTML = scores.map((s, i) => `
                <div class="flappy-ranking-row ${s.name === currentPlayer ? 'me' : ''}">
                    <span>${i === 0 ? '👑' : '🥈'} ${s.name}</span>
                    <span><strong>${s.score}</strong> pts</span>
                </div>
            `).join('');
        }

        // ==========================
        // JUEGO FLAPPY CANVAS
        // ==========================
        function startFlappyGame() {
            const charId  = getSelectedChar(currentPlayer);
            const charCfg = FLAPPY_CHARS.find(c => c.id === charId) || FLAPPY_CHARS[0];

            content.innerHTML = `
                <div class="flappy-game-wrap" id="flappy-game-wrap">
                    <div class="flappy-hud">
                        <span id="flappy-score-display">0</span>
                        <span id="flappy-record-hud">Récord: ${getFlappyRecord(currentPlayer)}</span>
                    </div>
                    <canvas id="flappy-canvas"></canvas>
                    <div id="flappy-overlay" class="flappy-overlay">
                        <div class="flappy-overlay-box" id="flappy-overlay-box">
                            <div class="flappy-overlay-title" id="flappy-overlay-title">🎈 Flappy Globo</div>
                            <div class="flappy-overlay-sub" id="flappy-overlay-sub">Tocá para empezar</div>
                            <div class="flappy-overlay-score" id="flappy-overlay-score" style="display:none"></div>
                        </div>
                    </div>
                </div>
                <button class="btn-back-flappy" id="btn-back-flappy">← Personajes</button>
            `;

            document.getElementById('btn-back-flappy').onclick = () => {
                if (gameLoop) cancelAnimationFrame(gameLoop);
                renderCharSelect();
            };

            // Canvas setup
            const canvas  = document.getElementById('flappy-canvas');
            const ctx     = canvas.getContext('2d');
            const wrap    = document.getElementById('flappy-game-wrap');

            function resize() {
                canvas.width  = wrap.clientWidth  || 360;
                canvas.height = wrap.clientHeight || 480;
            }
            resize();
            window.addEventListener('resize', resize);

            // Cargar imagen del personaje
            const birdImg = new Image();
            birdImg.src   = charCfg.img;

            // Estado del juego
            let state     = 'waiting'; // waiting | playing | dead
            let score     = 0;
            let gameLoop  = null;

            // Física
            let bird      = { x: 0, y: 0, vy: 0, w: 50, h: 50 };
            let pipes     = [];
            let frameCount = 0;
            let pipeSpeed  = 2.5;
            const GRAVITY  = 0.35;
            const FLAP     = -7;
            const GAP      = 160;
            const PIPE_W   = 52;

            function resetGame() {
                bird     = { x: canvas.width * 0.22, y: canvas.height * 0.4, vy: 0, w: 50, h: 50 };
                pipes    = [];
                score    = 0;
                frameCount = 0;
                pipeSpeed  = 2.5;
                document.getElementById('flappy-score-display').textContent = '0';
            }

            function spawnPipe() {
                const minTop = 60;
                const maxTop = canvas.height - GAP - 60;
                const topH   = Math.random() * (maxTop - minTop) + minTop;
                pipes.push({ x: canvas.width, topH, passed: false });
            }

            function flap() {
                if (state === 'waiting') {
                    state = 'playing';
                    document.getElementById('flappy-overlay').style.display = 'none';
                    resetGame();
                }
                if (state === 'playing') bird.vy = FLAP;
            }

            // Input
            canvas.addEventListener('click', flap);
            canvas.addEventListener('touchstart', (e) => { e.preventDefault(); flap(); }, { passive: false });
            document.getElementById('flappy-overlay').addEventListener('click', flap);

            function drawBackground() {
                // Gradiente cielo
                const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
                grad.addColorStop(0, '#b8e4ff');
                grad.addColorStop(1, '#e8f7ff');
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Nubes decorativas (estáticas)
                ctx.fillStyle = 'rgba(255,255,255,0.8)';
                [[40, 60, 70, 30], [200, 40, 90, 25], [300, 80, 60, 20]].forEach(([x, y, w, h]) => {
                    ctx.beginPath();
                    ctx.ellipse(x, y, w, h, 0, 0, Math.PI * 2);
                    ctx.fill();
                });
            }

            function drawPipes() {
                pipes.forEach(pipe => {
                    // Tubo superior
                    const grad1 = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0);
                    grad1.addColorStop(0, '#ff9ec4');
                    grad1.addColorStop(0.5, '#ffaac9');
                    grad1.addColorStop(1, '#ff6fa8');
                    ctx.fillStyle = grad1;
                    ctx.beginPath();
                    ctx.roundRect(pipe.x, 0, PIPE_W, pipe.topH, [0, 0, 10, 10]);
                    ctx.fill();

                    // Capuchón superior
                    ctx.fillStyle = '#ff6fa8';
                    ctx.beginPath();
                    ctx.roundRect(pipe.x - 5, pipe.topH - 20, PIPE_W + 10, 20, 6);
                    ctx.fill();

                    // Tubo inferior
                    const botY = pipe.topH + GAP;
                    const grad2 = ctx.createLinearGradient(pipe.x, 0, pipe.x + PIPE_W, 0);
                    grad2.addColorStop(0, '#ff9ec4');
                    grad2.addColorStop(0.5, '#ffaac9');
                    grad2.addColorStop(1, '#ff6fa8');
                    ctx.fillStyle = grad2;
                    ctx.beginPath();
                    ctx.roundRect(pipe.x, botY, PIPE_W, canvas.height - botY, [10, 10, 0, 0]);
                    ctx.fill();

                    // Capuchón inferior
                    ctx.fillStyle = '#ff6fa8';
                    ctx.beginPath();
                    ctx.roundRect(pipe.x - 5, botY, PIPE_W + 10, 20, 6);
                    ctx.fill();
                });
            }

            function drawBird() {
                ctx.save();
                const angle = Math.min(Math.max(bird.vy * 3, -25), 35) * Math.PI / 180;
                ctx.translate(bird.x + bird.w / 2, bird.y + bird.h / 2);
                ctx.rotate(angle);
                if (birdImg.complete && birdImg.naturalWidth > 0) {
                    ctx.drawImage(birdImg, -bird.w / 2, -bird.h / 2, bird.w, bird.h);
                } else {
                    ctx.font = '36px serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('🎈', 0, 0);
                }
                ctx.restore();
            }

            function checkCollision() {
                const bx = bird.x + 6, by = bird.y + 6;
                const bw = bird.w - 12, bh = bird.h - 12;
                if (by <= 0 || by + bh >= canvas.height) return true;
                for (const pipe of pipes) {
                    if (bx + bw > pipe.x + 4 && bx < pipe.x + PIPE_W - 4) {
                        if (by < pipe.topH || by + bh > pipe.topH + GAP) return true;
                    }
                }
                return false;
            }

            async function onDead() {
                state = 'dead';
                const isRecord = score > getFlappyRecord(currentPlayer);
                if (isRecord) saveFlappyRecord(currentPlayer, score);

                const overlay    = document.getElementById('flappy-overlay');
                const titleEl    = document.getElementById('flappy-overlay-title');
                const subEl      = document.getElementById('flappy-overlay-sub');
                const scoreEl    = document.getElementById('flappy-overlay-score');

                overlay.style.display  = 'flex';
                titleEl.textContent    = isRecord ? '🏆 ¡Nuevo récord!' : '💥 ¡Chocaste!';
                subEl.textContent      = 'Tocá para reintentar';
                scoreEl.style.display  = 'block';
                scoreEl.innerHTML      = `Puntuación: <strong>${score}</strong><br>Récord: <strong>${getFlappyRecord(currentPlayer)}</strong>`;

                document.getElementById('flappy-record-hud').textContent = `Récord: ${getFlappyRecord(currentPlayer)}`;

                overlay.onclick = () => {
                    state = 'waiting';
                    titleEl.textContent   = '🎈 Flappy Globo';
                    subEl.textContent     = 'Tocá para empezar';
                    scoreEl.style.display = 'none';
                };
            }

            function loop() {
                gameLoop = requestAnimationFrame(loop);
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                drawBackground();

                if (state === 'playing') {
                    frameCount++;

                    // Aumentar velocidad gradualmente
                    pipeSpeed = 2.5 + score * 0.08;

                    // Física pájaro
                    bird.vy += GRAVITY;
                    bird.y  += bird.vy;

                    // Spawn pipes
                    if (frameCount % 90 === 0) spawnPipe();

                    // Mover pipes
                    pipes.forEach(pipe => { pipe.x -= pipeSpeed; });
                    pipes = pipes.filter(pipe => pipe.x > -PIPE_W - 10);

                    // Puntaje
                    pipes.forEach(pipe => {
                        if (!pipe.passed && pipe.x + PIPE_W < bird.x) {
                            pipe.passed = true;
                            score++;
                            document.getElementById('flappy-score-display').textContent = score;
                        }
                    });

                    // Colisión
                    if (checkCollision()) { onDead(); }
                }

                drawPipes();
                drawBird();

                // Puntaje en pantalla durante juego
                if (state === 'playing') {
                    ctx.fillStyle = 'rgba(255,255,255,0.9)';
                    ctx.font      = 'bold 28px Nunito, sans-serif';
                    ctx.textAlign = 'center';
                    ctx.fillText(score, canvas.width / 2, 42);
                }
            }

            loop();
        }

        // Mostrar selección de personaje al abrir
        renderCharSelect();
    }

    // ==========================
    // ROUTER
    // ==========================
    window.openGame = (gameId) => {
        const screen  = document.getElementById('game-fullscreen');
        const content = document.getElementById('game-fullscreen-content');
        if (gameId === 'slots')  openSlots(content);
        else if (gameId === 'ppt')    openPPT(content);
        else if (gameId === 'flappy') openFlappy(content);
        screen.classList.add('active');
    };
}