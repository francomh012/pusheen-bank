// ================================================
// assets/js/rewards.js
// Lógica de recompensas — Pusheen Bank 🐾
// ================================================

import { COIN_REWARDS, STREAK_REWARDS, PUSHEEN_VIDEOS, VIDEO_PROBABILITY } from './config.js';

// ==========================
// RENDER SECCIÓN RECOMPENSAS
// ==========================
export function renderRewardsUI(myTotalDonated, myStreak, myClaimedRewards) {
    const streakEl = document.getElementById('streak-count');
    if (streakEl) streakEl.textContent = myStreak;

    renderRewardGrid('coin-rewards-grid',   COIN_REWARDS,   myTotalDonated, 'coins',  myClaimedRewards);
    renderRewardGrid('streak-rewards-grid', STREAK_REWARDS, myStreak,       'streak', myClaimedRewards);
}

function renderRewardGrid(containerId, rewards, currentVal, type, myClaimedRewards) {
    const grid = document.getElementById(containerId);
    if (!grid) return;

    grid.innerHTML = rewards.map((r, idx) => {
        const claimed  = myClaimedRewards.includes(r.id);
        const unlocked = !claimed && currentVal >= r.threshold;
        const pct      = Math.min(100, Math.round((currentVal / r.threshold) * 100));

        let actionHTML = '';
        if (claimed)       actionHTML = `<span class="badge-claimed">✅ Canjeada</span>`;
        else if (unlocked) actionHTML = `<button class="btn-claim gold" onclick="claimReward('${r.id}','${type}')">¡Canjear! 🎁</button>`;
        else               actionHTML = `<span class="badge-locked">🔒 ${currentVal}/${r.threshold}</span>`;

        return `
        <div class="reward-card ${claimed ? 'claimed' : unlocked ? 'unlocked' : ''}" style="animation-delay:${idx * 0.06}s">
            <div class="reward-card-icon">${r.icon}</div>
            <div class="reward-card-info">
                <div class="reward-card-title">${r.title}</div>
                <div class="reward-card-desc">${r.desc}</div>
                ${!claimed ? `<div class="reward-progress-wrap"><div class="reward-progress-bar" style="width:${pct}%"></div></div>` : ''}
            </div>
            <div class="reward-card-action">
                <span class="reward-pct">${claimed ? '100%' : pct + '%'}</span>
                ${actionHTML}
            </div>
        </div>`;
    }).join("");
}

// ==========================
// VERIFICAR NUEVAS RECOMPENSAS
// ==========================
export function checkNewRewards(myTotalDonated, myStreak, myClaimedRewards, showMessageFn) {
    const newCoin   = COIN_REWARDS.find(r   => !myClaimedRewards.includes(r.id) && myTotalDonated >= r.threshold);
    const newStreak = STREAK_REWARDS.find(r => !myClaimedRewards.includes(r.id) && myStreak >= r.threshold);
    if (newCoin || newStreak) {
        showMessageFn('🎁 ¡Tenés una recompensa disponible! Ir a Premios', 'success');
    }
}

// ==========================
// CANJEAR RECOMPENSA
// ==========================
export async function claimReward(rewardId, type, state, supabase, callbacks) {
    const { currentPlayer, myWallet, myClaimedRewards, myVideos, myTotalDonated, myStreak } = state;
    const { onSuccess, onError, showMessage, spawnCoins } = callbacks;

    const allRewards = [...COIN_REWARDS, ...STREAK_REWARDS];
    const reward = allRewards.find(r => r.id === rewardId);
    if (!reward) return;
    if (myClaimedRewards.includes(rewardId)) { showMessage('Ya canjeaste esta recompensa', 'error'); return; }

    const currentVal = type === 'coins' ? myTotalDonated : myStreak;
    if (currentVal < reward.threshold) { showMessage('Aún no alcanzás esta recompensa', 'error'); return; }

    const newWallet         = myWallet + reward.coins;
    const newClaimedRewards = [...myClaimedRewards, rewardId];

    // ¿Sale video? Probabilidad aleatoria
    const showVideo = Math.random() < VIDEO_PROBABILITY;
    let wonVideo    = null;

    if (showVideo) {
        const v  = PUSHEEN_VIDEOS[Math.floor(Math.random() * PUSHEEN_VIDEOS.length)];
        wonVideo = {
            id:    v.id,
            title: v.title,
            date:  new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }),
        };
    }

    const newVideos = wonVideo ? [...myVideos, wonVideo] : myVideos;

    try {
        const { error } = await supabase
            .from('players')
            .update({ wallet_coins: newWallet, claimed_rewards: newClaimedRewards, videos: newVideos })
            .eq('username', currentPlayer);

        if (error) throw error;

        if (spawnCoins) spawnCoins(10);
        onSuccess({ newWallet, newClaimedRewards, newVideos, reward, wonVideo });

    } catch (e) {
        onError(e);
        showMessage('Error al canjear. Intenta de nuevo.', 'error');
        console.error(e);
    }
}

// ==========================
// MODAL RECOMPENSA
// ==========================
export function showRewardModal(reward, wonVideo = null, spawnCoins) {
    document.getElementById('reward-modal-title').textContent = `${reward.icon} ¡${reward.title}!`;
    document.getElementById('reward-modal-desc').textContent  = reward.desc;

    const coinsEl = document.getElementById('reward-modal-coins');
    coinsEl.textContent   = `+${reward.coins} 🪙`;
    coinsEl.style.display = 'block';

    spawnModalConfetti();
    if (spawnCoins) spawnCoins(10);

    const videoWrap  = document.getElementById('reward-video-wrap');
    const videoFrame = document.getElementById('reward-video-frame');

    if (wonVideo) {
        videoFrame.innerHTML = `<iframe
            src="https://www.youtube-nocookie.com/embed/${wonVideo.id}?autoplay=1&mute=0&rel=0"
            allow="autoplay; encrypted-media; picture-in-picture"
            allowfullscreen loading="lazy">
        </iframe>`;
        videoWrap.style.display = 'flex';
    } else {
        videoFrame.innerHTML    = '';
        videoWrap.style.display = 'none';
    }

    document.getElementById('reward-modal').style.display   = 'flex';
    document.getElementById('reward-overlay').style.display = 'block';
}

function spawnModalConfetti() {
    const container = document.getElementById('reward-confetti');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#ff6fa8', '#ffc94d', '#ffaac9', '#a8e6c0', '#ff6b6b', '#ffd6e7'];
    for (let i = 0; i < 30; i++) {
        const p           = document.createElement('div');
        p.className       = 'confetti-piece';
        p.style.left              = (Math.random() * 100) + '%';
        p.style.background        = colors[Math.floor(Math.random() * colors.length)];
        p.style.animationDuration = (1.2 + Math.random() * 1.2) + 's';
        p.style.animationDelay    = (Math.random() * 0.5) + 's';
        p.style.width             = (6 + Math.random() * 6) + 'px';
        p.style.height            = (6 + Math.random() * 6) + 'px';
        p.style.borderRadius      = Math.random() > 0.5 ? '50%' : '2px';
        container.appendChild(p);
    }
}

// ==========================
// RACHA DIARIA
// ==========================
export async function checkDailyReward(userData, currentPlayer, myWallet, supabase, callbacks) {
    const { showMessage, spawnCoins, onRewardClaimed } = callbacks;
    const hoy  = new Date().toISOString().split('T')[0];
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (userData.last_claim === hoy) return { myWallet, myStreak: userData.streak || 0 };

    const newStreak = userData.last_claim === ayer ? (userData.streak || 0) + 1 : 1;
    const newWallet = myWallet + 2;

    showMessage(`¡Hola ${currentPlayer}! 🐾 +2 monedas · Racha: ${newStreak} 🔥`, 'success');
    if (spawnCoins) spawnCoins(4);

    try {
        await supabase
            .from('players')
            .update({ wallet_coins: newWallet, last_claim: hoy, streak: newStreak })
            .eq('username', currentPlayer);
    } catch (e) {
        console.error('Error actualizando reward diario:', e);
    }

    if (onRewardClaimed) onRewardClaimed(newStreak);
    return { myWallet: newWallet, myStreak: newStreak };
}