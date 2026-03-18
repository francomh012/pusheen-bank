// ================================================
// assets/js/main.js — Pusheen Bank 🐾
// ================================================

import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';
import { renderGamesTab } from './games.js';
import { renderJourneyScreen, showJourneyRewardModal } from './journey.js';
import {
  SUPABASE_URL, SUPABASE_KEY,
  AVATARS, RANKING_IMGS,
  COIN_REWARDS, STREAK_REWARDS,
  PUSHEEN_VIDEOS, VIDEO_PROBABILITY,
  DAILY_REWARD_COINS,
} from './config.js';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================
// ESTADO GLOBAL
// ==========================
let currentPlayer    = null;
let myWallet         = 0;
let sharedBank       = 0;
let sharedHistory    = [];
let isSaving         = false;
let isMyOwnUpdate    = false; // ✅ bloquea eventos realtime propios
let allComplaints    = [];
let myStreak         = 0;
let myTotalDonated   = 0;
let myClaimedRewards = [];
let myVideos         = [];
let myClaimedJourney = [];
let myClaimedPaws    = [];

// Cache anti-parpadeo
let lastRankingHTML  = '';
let lastHistoryHTML  = '';

// ==========================
// DOM
// ==========================
const coinDisplay   = document.getElementById('coin-count');
const walletDisplay = document.getElementById('available-coins');
const historyDiv    = document.getElementById('history');

window.getWallet = () => myWallet;

// ==========================
// MENSAJES
// ==========================
function showMessage(text, type = 'error', containerId = 'action-message') {
    const msg = document.getElementById(containerId);
    if (!msg) return;
    msg.textContent = text;
    msg.className = 'action-message ' + type;
    msg.style.display = 'block';
    clearTimeout(msg._timer);
    msg._timer = setTimeout(() => { msg.style.display = 'none'; }, 3500);
}

// ==========================
// ANIMACIONES
// ==========================
function bumpBankNum() {
    const num = document.getElementById('coin-count');
    if (!num) return;
    num.classList.remove('bump');
    void num.offsetWidth;
    num.classList.add('bump');
    setTimeout(() => num.classList.remove('bump'), 400);
}

function spawnCoins(count = 6) {
    const container = document.getElementById('coin-particles');
    if (!container) return;
    for (let i = 0; i < count; i++) {
        const coin = document.createElement('span');
        coin.textContent = '🪙';
        coin.className = 'coin-particle';
        coin.style.left = (25 + Math.random() * 50) + '%';
        coin.style.animationDelay = (Math.random() * 0.4) + 's';
        coin.style.fontSize = (14 + Math.random() * 10) + 'px';
        container.appendChild(coin);
        setTimeout(() => coin.remove(), 1400);
    }
}
window.spawnCoins = spawnCoins;

function updateNegativeStyles() {
    const bankNum    = document.getElementById('coin-count');
    const bankBubble = bankNum?.closest('.bank-bubble');
    const pusheenImg = document.getElementById('pusheen-main-img');
    const walletEl   = document.getElementById('available-coins');
    const walletWrap = walletEl?.closest('.wallet-amount');

    if (bankNum)    bankNum.classList.toggle('negative', sharedBank < 0);
    if (bankBubble) bankBubble.classList.toggle('negative', sharedBank < 0);
    if (pusheenImg) pusheenImg.classList.toggle('sad', sharedBank < 0);
    if (walletWrap) walletWrap.classList.toggle('negative', myWallet < 0);

    let debtBadge = document.getElementById('debt-badge');
    if (!debtBadge && bankBubble) {
        debtBadge = document.createElement('div');
        debtBadge.id = 'debt-badge';
        debtBadge.className = 'debt-badge';
        bankBubble.appendChild(debtBadge);
    }
    if (debtBadge) {
        if (sharedBank < 0) { debtBadge.textContent = `¡En deuda! ${sharedBank} 🪙`; debtBadge.classList.add('show'); }
        else { debtBadge.classList.remove('show'); }
    }
}

function setActionButtons(disabled) {
    document.querySelectorAll('.quick-btn, .btn-give, .btn-steal')
        .forEach(btn => btn.disabled = disabled);
}

// ==========================
// WALLET CHANGE — juegos
// ==========================
async function walletChange(delta) {
    const oldW = myWallet;
    myWallet += delta;
    walletDisplay.textContent = myWallet;
    updateNegativeStyles();
    try {
        const { error } = await supabase.from('players')
            .update({ wallet_coins: myWallet })
            .eq('username', currentPlayer);
        if (error) throw error;
    } catch (e) {
        myWallet = oldW;
        walletDisplay.textContent = myWallet;
        updateNegativeStyles();
        showMessage('Error al guardar monedas 😿', 'error');
        console.error(e);
    }
}

// ==========================
// ACCIONES DE MONEDAS
// ==========================
window.handleCustom = (action) => {
    const input = document.getElementById('custom-val');
    const val = parseInt(input.value);
    if (isNaN(val) || val <= 0) { showMessage('Escribe un número válido', 'error'); return; }
    window.handleCoin(action, val);
    input.value = '';
};

window.handleCoin = async (action, amount = 1) => {
    if (isSaving) return;

    if (action === 'remove') {
        const ok = confirm(`¿Seguro que quieres robar ${amount} moneda${amount > 1 ? 's' : ''}? ❌`);
        if (!ok) return;
    }

    const oldW = myWallet, oldB = sharedBank, oldH = [...sharedHistory];
    const oldTotalDonated = myTotalDonated;
    let donationChange = 0;

    if (action === 'add') {
        myWallet -= amount; sharedBank += amount;
        donationChange = amount; myTotalDonated += amount;
        sharedHistory.push(`${currentPlayer} dio ${amount} 🪙`);
        if (myWallet < 0) showMessage(`⚠️ Billetera en ${myWallet} 🪙 ¡En deuda!`, 'debt');
    } else {
        myWallet += amount; sharedBank -= amount;
        donationChange = -amount;
        sharedHistory.push(`${currentPlayer} robó ${amount} ❌`);
        if (sharedBank < 0) showMessage(`💀 ¡Pusheen en ${sharedBank} 🪙! ¡En deuda!`, 'debt');
    }

    coinDisplay.textContent   = sharedBank;
    walletDisplay.textContent = myWallet;
    updateNegativeStyles();
    bumpBankNum();

    if (action === 'add') {
        spawnCoins(6);
        document.getElementById('pusheen-main-img')?.classList.remove('sad');
    } else {
        const img = document.getElementById('pusheen-main-img');
        if (img) { img.classList.add('shake'); setTimeout(() => img.classList.remove('shake'), 600); }
    }

    isSaving = true;
    isMyOwnUpdate = true; // ✅ activar ANTES de guardar en Supabase
    setActionButtons(true);

    try {
        const { data, error: fe } = await supabase.from('players')
            .select('wallet_coins, weekly_donations, total_donated')
            .eq('username', currentPlayer).single();
        if (fe || !data) throw new Error(fe?.message);

        const newWeekly       = (data.weekly_donations || 0) + donationChange;
        const newTotalDonated = Math.max(0, (data.total_donated || 0) + (action === 'add' ? amount : 0));

        const [upP, upB] = await Promise.all([
            supabase.from('players').update({
                wallet_coins: myWallet, weekly_donations: newWeekly, total_donated: newTotalDonated,
            }).eq('username', currentPlayer),
            supabase.from('bank').update({
                total_coins: sharedBank, history: sharedHistory,
            }).eq('id', 1),
        ]);
        if (upP.error) throw new Error(upP.error.message);
        if (upB.error) throw new Error(upB.error.message);

        myTotalDonated = newTotalDonated;

        if (action === 'add' && myWallet >= 0) {
            showMessage(`¡Diste ${amount} moneda${amount > 1 ? 's' : ''} a Pusheen! 🪙`, 'success');
        } else if (action === 'remove' && sharedBank >= 0) {
            showMessage(`Robaste ${amount} moneda${amount > 1 ? 's' : ''}... ❌`, 'warning');
        }

        renderHistorySmooth();
        updateRankingUI();
        if (action === 'add') checkNewRewards();
        renderRewardsUI();

    } catch (e) {
        myWallet = oldW; sharedBank = oldB; sharedHistory = oldH;
        myTotalDonated = oldTotalDonated;
        coinDisplay.textContent   = sharedBank;
        walletDisplay.textContent = myWallet;
        updateNegativeStyles();
        showMessage('Error al guardar. Intenta de nuevo 😿', 'error');
        console.error(e);
    } finally {
        isSaving = false;
        setActionButtons(false);
        // ✅ Apagar con delay — el evento realtime llega ~300-600ms después
        setTimeout(() => { isMyOwnUpdate = false; }, 1500);
    }
};

// ==========================
// RENDER — sin parpadeo
// ==========================
function renderUI() {
    coinDisplay.textContent   = sharedBank;
    walletDisplay.textContent = myWallet;
    const gfHeader = document.getElementById('gf-wallet-header-num');
    if (gfHeader) gfHeader.textContent = myWallet + ' 🪙';
    renderHistorySmooth();
    updateNegativeStyles();
}

function renderHistorySmooth() {
    const newHTML = [...sharedHistory].reverse().slice(0, 6)
        .map(m => `<div class="history-item">${m}</div>`).join('');
    if (newHTML !== lastHistoryHTML) {
        lastHistoryHTML = newHTML;
        historyDiv.innerHTML = newHTML;
    }
}

// ==========================
// RANKING — sin parpadeo
// ==========================
async function updateRankingUI() {
    const { data: r, error } = await supabase.from('players')
        .select('username, weekly_donations')
        .order('weekly_donations', { ascending: false });
    if (error) { console.error(error); return; }

    const heroImg   = document.getElementById('ranking-hero-img');
    const heroLabel = document.getElementById('ranking-hero-label');
    if (r?.length && heroImg) {
        const cfg = RANKING_IMGS[r[0].username] || RANKING_IMGS.default;
        if (!heroImg.src.endsWith(cfg.src.split('/').pop())) heroImg.src = cfg.src;
        if (heroLabel.textContent !== cfg.label) heroLabel.textContent = cfg.label;
    }

    const list = document.getElementById('ranking-list');
    if (!r || !list) return;

    const newHTML = r.map((p, i) => `
        <div class="ranking-item ${i === 0 ? 'first' : ''}">
            <span class="rank-pos">${i === 0 ? '👑' : i === 1 ? '🥈' : '🐾'}</span>
            <span class="rank-name">${AVATARS[p.username] || '🐾'} ${p.username}</span>
            <span class="rank-coins">${p.weekly_donations} 🪙</span>
        </div>`).join('');

    if (newHTML !== lastRankingHTML) {
        lastRankingHTML = newHTML;
        list.innerHTML  = newHTML;
    }
}

// ==========================
// RECOMPENSAS
// ==========================
function renderRewardsUI() {
    const streakEl = document.getElementById('streak-count');
    if (streakEl) streakEl.textContent = myStreak;
    renderRewardGrid('coin-rewards-grid',   COIN_REWARDS,   myTotalDonated, 'coins');
    renderRewardGrid('streak-rewards-grid', STREAK_REWARDS, myStreak,       'streak');
}

function renderRewardGrid(containerId, rewards, currentVal, type) {
    const grid = document.getElementById(containerId);
    if (!grid) return;
    grid.innerHTML = rewards.map((r, idx) => {
        const claimed  = myClaimedRewards.includes(r.id);
        const unlocked = !claimed && currentVal >= r.threshold;
        const pct      = Math.min(100, Math.round((currentVal / r.threshold) * 100));
        let actionHTML = claimed
            ? `<span class="badge-claimed">✅ Canjeada</span>`
            : unlocked
                ? `<button class="btn-claim gold" onclick="claimReward('${r.id}','${type}')">¡Canjear! 🎁</button>`
                : `<span class="badge-locked">🔒 ${currentVal}/${r.threshold}</span>`;
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
    }).join('');
}

function checkNewRewards() {
    const nr = COIN_REWARDS.find(r   => !myClaimedRewards.includes(r.id) && myTotalDonated >= r.threshold);
    const ns = STREAK_REWARDS.find(r => !myClaimedRewards.includes(r.id) && myStreak >= r.threshold);
    if (nr || ns) showMessage('🎁 ¡Tenés una recompensa disponible!', 'success');
}

window.claimReward = async (rewardId, type) => {
    const reward = [...COIN_REWARDS, ...STREAK_REWARDS].find(r => r.id === rewardId);
    if (!reward || myClaimedRewards.includes(rewardId)) return;
    const cv = type === 'coins' ? myTotalDonated : myStreak;
    if (cv < reward.threshold) { showMessage('Aún no alcanzás esta recompensa', 'error'); return; }

    myWallet += reward.coins;
    myClaimedRewards = [...myClaimedRewards, rewardId];

    const showVideo = Math.random() < VIDEO_PROBABILITY;
    let wonVideo = null;
    if (showVideo) {
        const v  = PUSHEEN_VIDEOS[Math.floor(Math.random() * PUSHEEN_VIDEOS.length)];
        wonVideo = { id: v.id, title: v.title, date: new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) };
        myVideos = [...myVideos, wonVideo];
        updateBackpackBadge();
    }

    try {
        await supabase.from('players').update({
            wallet_coins: myWallet, claimed_rewards: myClaimedRewards, videos: myVideos,
        }).eq('username', currentPlayer);
        renderUI(); renderRewardsUI(); showRewardModal(reward, wonVideo);
    } catch (e) {
        myWallet -= reward.coins;
        myClaimedRewards = myClaimedRewards.filter(id => id !== rewardId);
        if (wonVideo) myVideos = myVideos.filter(v => v.id !== wonVideo.id);
        showMessage('Error al canjear.', 'error');
        console.error(e);
    }
};

// ==========================
// CAMINO — recompensa grande
// ==========================
async function handleJourneyReward(nodeId, reward) {
    if (myClaimedJourney.includes(nodeId)) return;
    myWallet += reward.coins;
    myClaimedJourney = [...myClaimedJourney, nodeId];

    const showVideo = Math.random() < VIDEO_PROBABILITY;
    let wonVideo = null;
    if (showVideo) {
        const v  = PUSHEEN_VIDEOS[Math.floor(Math.random() * PUSHEEN_VIDEOS.length)];
        wonVideo = { id: v.id, title: v.title, date: new Date().toLocaleDateString('es', { day: '2-digit', month: 'short', year: 'numeric' }) };
        myVideos = [...myVideos, wonVideo];
        updateBackpackBadge();
    }

    try {
        await supabase.from('players').update({
            wallet_coins: myWallet, claimed_journey: myClaimedJourney, videos: myVideos,
        }).eq('username', currentPlayer);
        renderUI();
        showJourneyRewardModal(reward, wonVideo, spawnCoins);
        refreshJourneyScreen();
    } catch (e) {
        myWallet -= reward.coins;
        myClaimedJourney = myClaimedJourney.filter(id => id !== nodeId);
        if (wonVideo) myVideos = myVideos.filter(v => v.id !== wonVideo.id);
        showMessage('Error al canjear.', 'error');
        console.error(e);
    }
}

// ==========================
// CAMINO — patita pequeña
// ==========================
async function handlePawClaim(nodeId) {
    if (myClaimedPaws.includes(nodeId)) return;
    myWallet += 1;
    myClaimedPaws = [...myClaimedPaws, nodeId];

    const toast = document.createElement('div');
    toast.className = 'paw-toast';
    toast.textContent = '+1 🪙 ¡Patita!';
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 1700);

    try {
        await supabase.from('players').update({
            wallet_coins: myWallet, claimed_paws: myClaimedPaws,
        }).eq('username', currentPlayer);
        renderUI();
        refreshJourneyScreen();
    } catch (e) {
        myWallet -= 1;
        myClaimedPaws = myClaimedPaws.filter(id => id !== nodeId);
        console.error(e);
    }
}

function refreshJourneyScreen() {
    const screen = document.getElementById('journey-fullscreen');
    if (screen?.classList.contains('active')) {
        renderJourneyScreen(myTotalDonated, myClaimedJourney, myClaimedPaws, handleJourneyReward, handlePawClaim);
    }
}

// ==========================
// MODAL RECOMPENSA
// ==========================
function showRewardModal(reward, wonVideo = null) {
    document.getElementById('reward-modal-title').textContent = `${reward.icon} ¡${reward.title}!`;
    document.getElementById('reward-modal-desc').textContent  = reward.desc;
    const coinsEl = document.getElementById('reward-modal-coins');
    coinsEl.textContent = `+${reward.coins} 🪙`; coinsEl.style.display = 'block';
    spawnModalConfetti(); spawnCoins(10);
    const videoWrap  = document.getElementById('reward-video-wrap');
    const videoFrame = document.getElementById('reward-video-frame');
    if (wonVideo) {
        videoFrame.innerHTML = `<iframe src="https://www.youtube-nocookie.com/embed/${wonVideo.id}?autoplay=1&mute=0&rel=0" allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>`;
        videoWrap.style.display = 'flex';
    } else { videoFrame.innerHTML = ''; videoWrap.style.display = 'none'; }
    document.getElementById('reward-modal').style.display   = 'flex';
    document.getElementById('reward-overlay').style.display = 'block';
}

function spawnModalConfetti() {
    const container = document.getElementById('reward-confetti');
    if (!container) return; container.innerHTML = '';
    const colors = ['#ff6fa8','#ffc94d','#ffaac9','#a8e6c0','#ff6b6b','#ffd6e7'];
    for (let i = 0; i < 30; i++) {
        const p = document.createElement('div');
        p.className = 'confetti-piece';
        p.style.left = (Math.random()*100)+'%';
        p.style.background = colors[Math.floor(Math.random()*colors.length)];
        p.style.animationDuration = (1.2+Math.random()*1.2)+'s';
        p.style.animationDelay = (Math.random()*0.5)+'s';
        p.style.width = (6+Math.random()*6)+'px';
        p.style.height = (6+Math.random()*6)+'px';
        p.style.borderRadius = Math.random()>0.5?'50%':'2px';
        container.appendChild(p);
    }
}

// ==========================
// MOCHILA
// ==========================
function updateBackpackBadge() {
    const badge = document.getElementById('backpack-badge');
    if (!badge) return;
    if (myVideos.length > 0) { badge.textContent = myVideos.length; badge.style.display = 'flex'; }
    else { badge.style.display = 'none'; }
}

window.renderBackpack = () => {
    const list = document.getElementById('backpack-list');
    if (!list) return;
    if (!myVideos.length) {
        list.innerHTML = `<p class="notif-empty">Aún no ganaste videos 🐾<small>Canjea recompensas para ganarlos</small></p>`;
        return;
    }
    list.innerHTML = myVideos.map((v, idx) => `
        <div class="backpack-video-card" style="animation-delay:${idx*0.06}s">
            <iframe class="backpack-video-thumb" src="https://www.youtube-nocookie.com/embed/${v.id}?rel=0" allow="encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>
            <div class="backpack-video-info">
                <span class="backpack-video-label">🎬 ${v.title}</span>
                <span class="backpack-video-date">${v.date}</span>
            </div>
        </div>`).join('');
};

// ==========================
// DENUNCIAS
// ==========================
async function loadComplaints() {
    const { data, error } = await supabase.from('complaints').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return; }
    allComplaints = data || []; renderComplaints(); updateNotifBadge();
}

function renderComplaints() {
    const list = document.getElementById('complaints-list');
    if (!allComplaints.length) {
        list.innerHTML = `<p style="text-align:center;color:var(--text-soft);padding:24px;font-weight:700;">No hay denuncias por ahora 🐾</p>`;
        return;
    }
    list.innerHTML = allComplaints.map((c, idx) => {
        const isNew  = !c.seen_by?.includes(currentPlayer) && c.reported_by !== currentPlayer;
        const isMine = c.reported_by === currentPlayer;
        const date   = new Date(c.created_at).toLocaleDateString('es', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
        const sev    = {leve:'😐 Leve',grave:'😠 Grave',catastrofico:'💀 Catastrófico'};
        return `
        <div class="complaint-card ${isNew?'nueva':''}" data-id="${c.id}" style="animation-delay:${idx*0.06}s">
            <div class="complaint-top">
                <span class="complaint-reporter">${AVATARS[c.reported_by]||'🐾'} ${c.reported_by} denuncia</span>
                <span class="severity-tag ${c.severity}">${sev[c.severity]||c.severity}</span>
            </div>
            <div class="complaint-category">${c.category}</div>
            <div class="complaint-desc">${c.description}</div>
            ${c.image_url?`<img src="${c.image_url}" class="complaint-img" alt="evidencia">`:''}
            <div class="complaint-footer">
                <span class="complaint-status ${c.status}">${c.status==='abierta'?'🔴 Abierta':'✅ Resuelta'}</span>
                <span class="complaint-date">${date}</span>
                ${isMine&&c.status==='abierta'?`<button class="btn-resolve resolver" onclick="resolveComplaint('${c.id}','resuelta')">✅ Resolver</button>`:''}
                ${isMine?`<button class="btn-resolve eliminar" onclick="deleteComplaint('${c.id}')">🗑️</button>`:''}
            </div>
        </div>`;
    }).join('');
}

async function uploadImage(file) {
    const ext = file.name.split('.').pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('complaint-images').upload(path, file);
    if (error) throw error;
    return supabase.storage.from('complaint-images').getPublicUrl(path).data.publicUrl;
}

document.getElementById('btn-submit-complaint').onclick = async () => {
    const category    = document.getElementById('c-category').value;
    const description = document.getElementById('c-description').value.trim();
    const severity    = document.getElementById('c-severity').value;
    const imageFile   = document.getElementById('c-image').files[0];
    if (!category)    { showMessage('Elige una categoría','error','complaint-msg'); return; }
    if (!description) { showMessage('Escribe qué pasó','error','complaint-msg'); return; }
    if (!severity)    { showMessage('Elige nivel de gravedad','error','complaint-msg'); return; }
    const btn = document.getElementById('btn-submit-complaint');
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
        let image_url = null;
        if (imageFile) image_url = await uploadImage(imageFile);
        const { error } = await supabase.from('complaints').insert([{
            reported_by: currentPlayer, category, description, severity,
            image_url, status: 'abierta', seen_by: [currentPlayer],
        }]);
        if (error) throw error;
        ['c-category','c-description','c-severity','c-image'].forEach(id => document.getElementById(id).value = '');
        document.querySelectorAll('.severity-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('complaint-form').style.display = 'none';
        document.getElementById('btn-new-complaint').style.display = 'block';
        showMessage('¡Denuncia enviada! 🚨','success','action-message');
    } catch(e) { showMessage('Error al enviar.','error','complaint-msg'); console.error(e); }
    finally { btn.disabled = false; btn.textContent = 'Enviar denuncia 🚨'; }
};

window.resolveComplaint = async (id, status) => { await supabase.from('complaints').update({ status }).eq('id', id); };
window.deleteComplaint  = async (id) => { if (!confirm('¿Eliminar?')) return; await supabase.from('complaints').delete().eq('id', id); };

// ==========================
// NOTIFICACIONES IN-APP
// ==========================
function updateNotifBadge() {
    const unseen = allComplaints.filter(c => !c.seen_by?.includes(currentPlayer) && c.reported_by !== currentPlayer).length;
    const badge  = document.getElementById('notif-badge');
    if (unseen > 0) { badge.textContent = unseen; badge.style.display = 'flex'; }
    else { badge.style.display = 'none'; }
    renderNotifPanel();
}

function renderNotifPanel() {
    const list   = document.getElementById('notif-list');
    const unread = allComplaints.filter(c => !c.seen_by?.includes(currentPlayer) && c.reported_by !== currentPlayer);
    const read   = allComplaints.filter(c => c.seen_by?.includes(currentPlayer) || c.reported_by === currentPlayer).slice(0, 5);
    if (!unread.length && !read.length) { list.innerHTML = `<p class="notif-empty">No hay notificaciones 🐾</p>`; return; }
    const item = (c, isNew) => {
        const date = new Date(c.created_at).toLocaleDateString('es', {day:'2-digit',month:'short',hour:'2-digit',minute:'2-digit'});
        return `<div class="notif-item ${isNew?'nueva':''}">🚨 <strong>${c.reported_by}</strong> hizo una denuncia: <em>${c.category}</em><div class="notif-time">${date}</div></div>`;
    };
    list.innerHTML =
        unread.map(c => item(c, true)).join('') +
        (read.length ? `<p style="font-size:0.78rem;color:var(--text-soft);padding:8px 0;font-weight:700;">— Anteriores —</p>` : '') +
        read.map(c => item(c, false)).join('');
}

window.markNotifsSeen = async () => {
    const unseen = allComplaints.filter(c => !c.seen_by?.includes(currentPlayer) && c.reported_by !== currentPlayer);
    for (const c of unseen) {
        await supabase.from('complaints').update({ seen_by: [...(c.seen_by || []), currentPlayer] }).eq('id', c.id);
    }
    document.getElementById('notif-badge').style.display = 'none';
};

// ==========================
// CARGA INICIAL
// ==========================
async function loadData(name) {
    currentPlayer = name;
    document.getElementById('player-avatar').textContent = AVATARS[name] || '🐾';
    document.getElementById('player-name').textContent   = name;

    let { data: u, error: ue } = await supabase.from('players').select('*').eq('username', name).maybeSingle();
    if (ue) { showMessage('Error al cargar tu perfil 😿', 'error'); return; }

    if (!u) {
        myWallet = 100; myStreak = 0; myTotalDonated = 0;
        myClaimedRewards = []; myVideos = []; myClaimedJourney = []; myClaimedPaws = [];
        await supabase.from('players').insert([{
            username: name, wallet_coins: 100,
            last_claim: new Date().toISOString().split('T')[0],
            weekly_donations: 0, total_donated: 0, streak: 0,
            claimed_rewards: [], videos: [], claimed_journey: [], claimed_paws: [],
        }]);
    } else {
        myWallet         = u.wallet_coins      ?? 100;
        myStreak         = u.streak            ?? 0;
        myTotalDonated   = u.total_donated     ?? 0;
        myClaimedRewards = u.claimed_rewards   ?? [];
        myVideos         = u.videos            ?? [];
        myClaimedJourney = u.claimed_journey   ?? [];
        myClaimedPaws    = u.claimed_paws      ?? [];
        await checkDailyReward(u);
    }

    await refreshSharedData();
    await loadComplaints();

    renderGamesTab(currentPlayer, myWallet, async (delta) => { await walletChange(delta); });

    supabase.channel('db-changes')
        .on('postgres_changes', { event:'UPDATE', schema:'public', table:'bank' }, (p) => {
            // ✅ Ignorar si es mi propio update — evita parpadeo
            if (isMyOwnUpdate) return;
            sharedBank = p.new.total_coins;
            sharedHistory = p.new.history;
            renderUI(); bumpBankNum();
        })
        .on('postgres_changes', { event:'UPDATE', schema:'public', table:'players' }, (p) => {
            // ✅ Ignorar mi propio update y mis propios cambios de perfil
            if (isMyOwnUpdate) return;
            if (p.new?.username === currentPlayer) return;
            updateRankingUI();
        })
        .on('postgres_changes', { event:'*', schema:'public', table:'complaints' }, () => loadComplaints())
        .subscribe();

    document.getElementById('login-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    renderUI(); updateRankingUI(); renderRewardsUI(); updateBackpackBadge();

    document.querySelector('[data-tab="journey"]')?.addEventListener('click', () => {
        const screen = document.getElementById('journey-fullscreen');
        if (screen) {
            renderJourneyScreen(myTotalDonated, myClaimedJourney, myClaimedPaws, handleJourneyReward, handlePawClaim);
            screen.classList.add('active');
        }
    });
}

async function checkDailyReward(user) {
    const hoy  = new Date().toISOString().split('T')[0];
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    if (user.last_claim === hoy) return;
    const newStreak = user.last_claim === ayer ? (user.streak || 0) + 1 : 1;
    myWallet += DAILY_REWARD_COINS; myStreak = newStreak;
    showMessage(`¡Hola ${currentPlayer}! 🐾 +${DAILY_REWARD_COINS} monedas · Racha: ${newStreak} 🔥`, 'success');
    spawnCoins(4);
    await supabase.from('players').update({ wallet_coins: myWallet, last_claim: hoy, streak: newStreak }).eq('username', currentPlayer);
    checkNewRewards(); renderRewardsUI();
}

async function refreshSharedData() {
    const { data: b, error } = await supabase.from('bank').select('*').eq('id', 1).single();
    if (error) { console.error(error); return; }
    if (b) { sharedBank = b.total_coins; sharedHistory = b.history || []; }
}

document.getElementById('franco-btn').onclick = () => loadData('Franco');
document.getElementById('jess-btn').onclick   = () => loadData('Jess');
document.getElementById('logout-btn').onclick  = () => {
    currentPlayer = null; myWallet = 0; myStreak = 0; myTotalDonated = 0;
    myClaimedRewards = []; myVideos = []; myClaimedJourney = []; myClaimedPaws = [];
    lastRankingHTML = ''; lastHistoryHTML = '';
    isMyOwnUpdate = false;
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('login-screen').classList.add('active');
};