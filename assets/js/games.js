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
    el.textContent  = text;
    el.className    = `game-result game-result-${type}`;
    el.style.display = 'block';
    clearTimeout(el._t);
    el._t = setTimeout(() => { el.style.display = 'none'; }, 3500);
}

function updateGFWallet() {
    const el = document.getElementById('gf-wallet-num');
    if (el) el.textContent = window.getWallet() + ' 🪙';
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
            await onWalletChange(-1);
            updateGFWallet();

            const reels     = [0, 1, 2].map(i => document.getElementById(`reel-${i}`));
            const intervals = reels.map((reel, i) =>
                setInterval(() => {
                    reel.textContent = weightedRandom(SLOT_SYMBOLS).emoji;
                    reel.classList.add('spinning');
                }, 80 + i * 20)
            );
            const results = [
                weightedRandom(SLOT_SYMBOLS),
                weightedRandom(SLOT_SYMBOLS),
                weightedRandom(SLOT_SYMBOLS),
            ];

            setTimeout(() => { clearInterval(intervals[0]); reels[0].textContent = results[0].emoji; reels[0].classList.remove('spinning'); reels[0].classList.add('stop'); }, 700);
            setTimeout(() => { clearInterval(intervals[1]); reels[1].textContent = results[1].emoji; reels[1].classList.remove('spinning'); reels[1].classList.add('stop'); }, 1100);
            setTimeout(async () => {
                clearInterval(intervals[2]);
                reels[2].textContent = results[2].emoji;
                reels[2].classList.remove('spinning');
                reels[2].classList.add('stop');
                setTimeout(() => reels.forEach(r => r.classList.remove('stop')), 500);

                const isWin = results[0].name === results[1].name && results[1].name === results[2].name;
                if (isWin) {
                    const prize = SLOT_PRIZES[results[0].name];
                    await onWalletChange(prize.coins);
                    updateGFWallet();
                    showGameMsg('slot-result', prize.msg, 'win');
                    if (window.spawnCoins) window.spawnCoins(10);
                    if (results[0].name === 'corona') {
                        reels.forEach(r => r.classList.add('jackpot'));
                        setTimeout(() => reels.forEach(r => r.classList.remove('jackpot')), 2000);
                    }
                } else {
                    showGameMsg('slot-result', 'No fue esta vez... 😿', 'lose');
                }
                slotSpinning = false;
                document.getElementById('btn-slot').disabled = false;
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
                <button class="btn-ppt" id="ppt-rock">🪨<span>Piedra</span></button>
                <button class="btn-ppt" id="ppt-paper">📄<span>Papel</span></button>
                <button class="btn-ppt" id="ppt-scissors">✂️<span>Tijera</span></button>
            </div>
            <div id="ppt-result" class="game-result" style="display:none;"></div>
            <p class="ppt-cost-note">Cada jugada cuesta <strong>1 🪙</strong></p>
        `;

        let pptPlaying = false;

        ['rock', 'paper', 'scissors'].forEach(choice => {
            document.getElementById(`ppt-${choice}`).onclick = async () => {
                if (pptPlaying) return;
                if (window.getWallet() < 1) { showGameMsg('ppt-result', '¡No tenés monedas! 🪙', 'error'); return; }

                pptPlaying = true;
                document.querySelectorAll('.btn-ppt').forEach(b => b.disabled = true);
                await onWalletChange(-1);
                updateGFWallet();

                const playerEl  = document.getElementById('ppt-player-choice');
                const pusheenEl = document.getElementById('ppt-pusheen-choice');
                const chosen    = PPT_OPTIONS.find(o => o.id === choice);
                playerEl.textContent  = chosen.emoji;
                pusheenEl.textContent = '🤔';

                const thinkInterval = setInterval(() => {
                    pusheenEl.textContent = ['🤔', '😏', '🐾', '😼'][Math.floor(Math.random() * 4)];
                }, 200);

                setTimeout(async () => {
                    clearInterval(thinkInterval);
                    const pusheenChoice = PPT_OPTIONS[Math.floor(Math.random() * PPT_OPTIONS.length)];
                    pusheenEl.textContent = pusheenChoice.emoji;
                    const result = getPPTResult(choice, pusheenChoice.id);

                    if (result === 'win') {
                        await onWalletChange(PPT_WIN_COINS);
                        updateGFWallet();
                        showGameMsg('ppt-result', `¡Ganaste! ${chosen.emoji} vence a ${pusheenChoice.emoji} · +${PPT_WIN_COINS} 🪙`, 'win');
                        if (window.spawnCoins) window.spawnCoins(8);
                        playerEl.classList.add('ppt-winner');
                        pusheenEl.classList.add('ppt-loser');
                    } else if (result === 'lose') {
                        await onWalletChange(-PPT_LOSE_COINS);
                        updateGFWallet();
                        showGameMsg('ppt-result', `¡Pusheen ganó! ${pusheenChoice.emoji} vence a ${chosen.emoji} · −${PPT_LOSE_COINS} 🪙 😹`, 'lose');
                        pusheenEl.classList.add('ppt-winner');
                        playerEl.classList.add('ppt-loser');
                    } else {
                        await onWalletChange(1);
                        updateGFWallet();
                        showGameMsg('ppt-result', `¡Empate! ${chosen.emoji} vs ${pusheenChoice.emoji} · Moneda devuelta 🪙`, 'tie');
                    }

                    setTimeout(() => {
                        playerEl.classList.remove('ppt-winner', 'ppt-loser');
                        pusheenEl.classList.remove('ppt-winner', 'ppt-loser');
                        pptPlaying = false;
                        document.querySelectorAll('.btn-ppt').forEach(b => b.disabled = false);
                    }, 2500);
                }, 1200);
            };
        });
    }

    // ==========================
    // ABRIR JUEGO (router)
    // ==========================
    window.openGame = (gameId) => {
        const screen  = document.getElementById('game-fullscreen');
        const content = document.getElementById('game-fullscreen-content');
        if (gameId === 'slots') openSlots(content);
        else if (gameId === 'ppt') openPPT(content);
        screen.classList.add('active');
    };
}