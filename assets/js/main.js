import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ==========================
// CONFIGURACIÓN SUPABASE
// ⚠️ Reemplaza con tu anon key real (empieza con eyJ...)
// ==========================
const SUPABASE_URL = 'https://erblqbqsjqhatarcpzjs.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVyYmxxYnFzanFoYXRhcmNwempzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE5Nzk4NTUsImV4cCI6MjA4NzU1NTg1NX0.p3WM4tO9vDIc1gtS6kg3FqYxMRHFhYUo2wcsHDVKZEk'; // 👈 CAMBIA ESTO
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================
// RECOMPENSAS — CONFIGURACIÓN
// ==========================

// Recompensas por monedas acumuladas donadas
const COIN_REWARDS = [
  { id: 'coins_50',  threshold: 50,  icon: '🌸', title: '50 monedas donadas',  desc: '+10 monedas bonus',   coins: 10,  badges: ['🌸'] },
  { id: 'coins_100', threshold: 100, icon: '💖', title: '100 monedas donadas', desc: '+25 monedas bonus',   coins: 25,  badges: ['💖'] },
  { id: 'coins_200', threshold: 200, icon: '✨', title: '200 monedas donadas', desc: '+60 monedas bonus',   coins: 60,  badges: ['✨'] },
  { id: 'coins_500', threshold: 500, icon: '👑', title: '500 monedas donadas', desc: '+150 monedas bonus',  coins: 150, badges: ['👑'] },
];

// Recompensas por racha diaria
const STREAK_REWARDS = [
  { id: 'streak_3',  threshold: 3,  icon: '🔥', title: '3 días seguidos',  desc: '+5 monedas bonus',   coins: 5,  badges: ['🔥'] },
  { id: 'streak_7',  threshold: 7,  icon: '⚡', title: '7 días seguidos',  desc: '+15 monedas bonus',  coins: 15, badges: ['⚡'] },
  { id: 'streak_14', threshold: 14, icon: '🌟', title: '14 días seguidos', desc: '+40 monedas bonus',  coins: 40, badges: ['🌟'] },
  { id: 'streak_30', threshold: 30, icon: '💫', title: '30 días seguidos', desc: '+100 monedas bonus', coins: 100, badges: ['💫'] },
];

// Videos de Pusheen en YouTube (IDs de videos públicos)
const PUSHEEN_VIDEOS = [
  'nABqDFIvcGw', // Pusheen official
  'wVhWnTpHYcs', // Pusheen animation
  'KiDpKlJwLLk', // Pusheen cat
  'cFDpTpMnqPE', // Pusheen cute
  'ZkWyBxALrHg', // Pusheen adventures
  'LB7vnuB5bsA', // Pusheen food
];

// Probabilidad de que aparezca un video (0.0 a 1.0)
const VIDEO_PROBABILITY = 0.4; // 40% de chance

// ==========================
// ESTADO GLOBAL
// ==========================
let currentPlayer = null;
let myWallet = 0;
let sharedBank = 0;
let sharedHistory = [];
let isSaving = false;
let allComplaints = [];
let myStreak = 0;
let myTotalDonated = 0;  // total histórico de monedas donadas
let myClaimedRewards = []; // IDs de recompensas ya reclamadas

const AVATARS = { Franco: '🧔', Jess: '👩' };

// Imágenes ranking según quien va ganando
const RANKING_IMGS = {
  Franco: { src: 'assets/img/corona1.png', label: '¡Franco va ganando! 👑' },
  Jess:   { src: 'assets/img/corona2.png', label: '¡Jess va ganando! 👑' },
  default:{ src: 'assets/img/corona1.png', label: '¡A ganar! 👑' },
};

// ==========================
// ELEMENTOS DEL DOM
// ==========================
const coinDisplay   = document.getElementById("coin-count");
const walletDisplay = document.getElementById("available-coins");
const historyDiv    = document.getElementById("history");

// ==========================
// MENSAJES VISUALES
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
function setPusheenGif(type) {
    const img = document.getElementById('pusheen-main-img');
    if (!img) return;
    if (type === 'steal') {
        img.classList.add('shake');
        setTimeout(() => img.classList.remove('shake'), 600);
    }
}

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

// ==========================
// DESHABILITAR / HABILITAR BOTONES
// ==========================
function setActionButtons(disabled) {
    document.querySelectorAll('.quick-btn, .btn-give, .btn-steal')
        .forEach(btn => btn.disabled = disabled);
}

// ==========================
// ACCIONES DE MONEDAS
// ==========================
window.handleCustom = (action) => {
    const input = document.getElementById("custom-val");
    const val = parseInt(input.value);
    if (isNaN(val) || val <= 0) { showMessage("Escribe un número válido", 'error'); return; }
    window.handleCoin(action, val);
    input.value = "";
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
        if (myWallet < amount) { showMessage("¡No tienes suficientes monedas! 🪙", 'error'); return; }
        myWallet -= amount;
        sharedBank += amount;
        donationChange = amount;
        myTotalDonated += amount;
        sharedHistory.push(`${currentPlayer} dio ${amount} 🪙`);
    } else {
        if (sharedBank < amount) { showMessage("¡Pusheen no tiene tanto! 🐾", 'error'); return; }
        myWallet += amount;
        sharedBank -= amount;
        donationChange = -amount;
        sharedHistory.push(`${currentPlayer} robó ${amount} ❌`);
    }

    // Efectos visuales
    renderUI();
    bumpBankNum();
    setPusheenGif(action === 'add' ? 'give' : 'steal');
    if (action === 'add') spawnCoins(6);

    isSaving = true;
    setActionButtons(true);

    try {
        const { data, error: fetchError } = await supabase
            .from("players")
            .select("wallet_coins, weekly_donations, total_donated, claimed_rewards")
            .eq("username", currentPlayer)
            .single();

        if (fetchError || !data) throw new Error("No se encontró el jugador: " + (fetchError?.message || ''));

        const newWeekly = Math.max(0, (data.weekly_donations || 0) + donationChange);
        const newTotalDonated = Math.max(0, (data.total_donated || 0) + (action === 'add' ? amount : 0));

        const [upPlayer, upBank] = await Promise.all([
            supabase.from("players")
                .update({
                    wallet_coins: myWallet,
                    weekly_donations: newWeekly,
                    total_donated: newTotalDonated,
                })
                .eq("username", currentPlayer),
            supabase.from("bank")
                .update({ total_coins: sharedBank, history: sharedHistory })
                .eq("id", 1)
        ]);

        if (upPlayer.error) throw new Error(upPlayer.error.message);
        if (upBank.error)   throw new Error(upBank.error.message);

        myTotalDonated = newTotalDonated;

        showMessage(
            action === 'add'
                ? `¡Diste ${amount} moneda${amount > 1 ? 's' : ''} a Pusheen! 🪙`
                : `Robaste ${amount} moneda${amount > 1 ? 's' : ''}... ❌`,
            action === 'add' ? 'success' : 'warning'
        );

        // Verificar si hay nueva recompensa disponible
        if (action === 'add') checkNewRewards();

        updateRankingUI();
        renderRewardsUI();
    } catch (e) {
        myWallet = oldW; sharedBank = oldB; sharedHistory = oldH;
        myTotalDonated = oldTotalDonated;
        renderUI();
        showMessage("Error al guardar. Intenta de nuevo 😿", 'error');
        console.error("Error:", e);
    } finally {
        isSaving = false;
        setActionButtons(false);
    }
};

// ==========================
// RENDER MONEDAS
// ==========================
function renderUI() {
    coinDisplay.textContent = sharedBank;
    walletDisplay.textContent = myWallet;
    historyDiv.innerHTML = [...sharedHistory]
        .reverse().slice(0, 6)
        .map(m => `<div class="history-item">${m}</div>`)
        .join("");
}

// ==========================
// RANKING + IMAGEN DINÁMICA
// ==========================
async function updateRankingUI() {
    const { data: r, error } = await supabase
        .from("players").select("username, weekly_donations")
        .order("weekly_donations", { ascending: false });

    if (error) { console.error("Error ranking:", error); return; }

    const list = document.getElementById("ranking-list");
    if (!r) return;

    // Imagen dinámica según el líder
    const leader = r[0];
    const heroImg   = document.getElementById('ranking-hero-img');
    const heroLabel = document.getElementById('ranking-hero-label');
    if (leader && heroImg) {
        const cfg = RANKING_IMGS[leader.username] || RANKING_IMGS.default;
        heroImg.src       = cfg.src;
        heroLabel.textContent = cfg.label;
    }

    list.innerHTML = r.map((p, i) => `
        <div class="ranking-item ${i === 0 ? 'first' : ''}" style="animation-delay:${i * 0.08}s">
            <span class="rank-pos">${i === 0 ? '👑' : i === 1 ? '🥈' : '🐾'}</span>
            <span class="rank-name">${AVATARS[p.username] || '🐾'} ${p.username}</span>
            <span class="rank-coins">${p.weekly_donations} 🪙</span>
        </div>
    `).join("");
}

// ==========================
// RECOMPENSAS UI
// ==========================
function renderRewardsUI() {
    document.getElementById('streak-count').textContent = myStreak;
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

        let actionHTML = '';
        if (claimed) {
            actionHTML = `<span class="badge-claimed">✅ Canjeada</span>`;
        } else if (unlocked) {
            actionHTML = `<button class="btn-claim gold" onclick="claimReward('${r.id}','${type}')">¡Canjear! 🎁</button>`;
        } else {
            actionHTML = `<span class="badge-locked">🔒 ${currentVal}/${r.threshold}</span>`;
        }

        return `
        <div class="reward-card ${claimed ? 'claimed' : unlocked ? 'unlocked' : ''}" style="animation-delay:${idx*0.06}s">
            <div class="reward-card-icon">${r.icon}</div>
            <div class="reward-card-info">
                <div class="reward-card-title">${r.title}</div>
                <div class="reward-card-desc">${r.desc}</div>
                ${!claimed ? `
                <div class="reward-progress-wrap">
                    <div class="reward-progress-bar" style="width:${pct}%"></div>
                </div>` : ''}
            </div>
            <div class="reward-card-action">
                <span class="reward-pct">${claimed ? '100%' : pct + '%'}</span>
                ${actionHTML}
            </div>
        </div>`;
    }).join("");
}

// Verificar si hay nueva recompensa disponible (sin canjear aún)
function checkNewRewards() {
    const newCoin   = COIN_REWARDS.find(r => !myClaimedRewards.includes(r.id) && myTotalDonated >= r.threshold);
    const newStreak = STREAK_REWARDS.find(r => !myClaimedRewards.includes(r.id) && myStreak >= r.threshold);
    if (newCoin || newStreak) {
        showMessage('¡Tienes una recompensa disponible! Ve a 🎁 Recompensas', 'success');
    }
}

// Canjear recompensa
window.claimReward = async (rewardId, type) => {
    const allRewards = [...COIN_REWARDS, ...STREAK_REWARDS];
    const reward = allRewards.find(r => r.id === rewardId);
    if (!reward) return;

    // Verificar que sigue siendo elegible
    const currentVal = type === 'coins' ? myTotalDonated : myStreak;
    if (currentVal < reward.threshold) {
        showMessage('Aún no alcanzas esta recompensa', 'error'); return;
    }
    if (myClaimedRewards.includes(rewardId)) {
        showMessage('Ya canjeaste esta recompensa', 'error'); return;
    }

    // Agregar monedas bonus
    myWallet += reward.coins;
    myClaimedRewards = [...myClaimedRewards, rewardId];

    try {
        await supabase.from("players").update({
            wallet_coins: myWallet,
            claimed_rewards: myClaimedRewards,
        }).eq("username", currentPlayer);

        renderUI();
        renderRewardsUI();

        // ¿Sale video? Probabilidad aleatoria
        const showVideo = Math.random() < VIDEO_PROBABILITY;
        showRewardModal(reward, showVideo);

    } catch (e) {
        myWallet -= reward.coins;
        myClaimedRewards = myClaimedRewards.filter(id => id !== rewardId);
        showMessage("Error al canjear. Intenta de nuevo.", 'error');
        console.error(e);
    }
};

// ==========================
// MODAL RECOMPENSA
// ==========================
function showRewardModal(reward, withVideo = false) {
    document.getElementById('reward-modal-title').textContent = `¡${reward.icon} ${reward.title}!`;
    document.getElementById('reward-modal-desc').textContent  = reward.desc;

    const coinsEl = document.getElementById('reward-modal-coins');
    coinsEl.textContent   = `+${reward.coins} 🪙`;
    coinsEl.style.display = 'block';

    // Confetti
    spawnModalConfetti();

    // Video aleatorio
    const videoWrap  = document.getElementById('reward-video-wrap');
    const videoFrame = document.getElementById('reward-video-frame');
    if (withVideo) {
        const videoId = PUSHEEN_VIDEOS[Math.floor(Math.random() * PUSHEEN_VIDEOS.length)];
        videoFrame.innerHTML = `<iframe src="https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1" allow="autoplay; encrypted-media" allowfullscreen></iframe>`;
        videoWrap.style.display = 'flex';
    } else {
        videoFrame.innerHTML = '';
        videoWrap.style.display = 'none';
    }

    document.getElementById('reward-modal').style.display  = 'flex';
    document.getElementById('reward-overlay').style.display = 'block';

    // Monedas volando
    spawnCoins(10);
}

function spawnModalConfetti() {
    const container = document.getElementById('reward-confetti');
    if (!container) return;
    container.innerHTML = '';
    const colors = ['#ff6fa8','#ffc94d','#ffaac9','#a8e6c0','#ff6b6b','#ffd6e7'];
    for (let i = 0; i < 30; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece';
        piece.style.left            = (Math.random() * 100) + '%';
        piece.style.background      = colors[Math.floor(Math.random() * colors.length)];
        piece.style.animationDuration = (1.2 + Math.random() * 1.2) + 's';
        piece.style.animationDelay  = (Math.random() * 0.5) + 's';
        piece.style.width           = (6 + Math.random() * 6) + 'px';
        piece.style.height          = (6 + Math.random() * 6) + 'px';
        piece.style.borderRadius    = Math.random() > 0.5 ? '50%' : '2px';
        container.appendChild(piece);
    }
}

// ==========================
// DENUNCIAS
// ==========================
async function loadComplaints() {
    const { data, error } = await supabase
        .from("complaints").select("*")
        .order("created_at", { ascending: false });
    if (error) { console.error("Error denuncias:", error); return; }
    allComplaints = data || [];
    renderComplaints();
    updateNotifBadge();
}

function renderComplaints() {
    const list = document.getElementById("complaints-list");
    if (!allComplaints.length) {
        list.innerHTML = `<p style="text-align:center;color:var(--text-soft);padding:24px;font-weight:700;">No hay denuncias por ahora 🐾</p>`;
        return;
    }
    list.innerHTML = allComplaints.map((c, idx) => {
        const isNew  = !c.seen_by?.includes(currentPlayer) && c.reported_by !== currentPlayer;
        const isMine = c.reported_by === currentPlayer;
        const date   = new Date(c.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        const severityLabels = { leve: '😐 Leve', grave: '😠 Grave', catastrofico: '💀 Catastrófico' };
        return `
        <div class="complaint-card ${isNew ? 'nueva' : ''}" data-id="${c.id}" style="animation-delay:${idx*0.06}s">
            <div class="complaint-top">
                <span class="complaint-reporter">${AVATARS[c.reported_by] || '🐾'} ${c.reported_by} denuncia</span>
                <span class="severity-tag ${c.severity}">${severityLabels[c.severity] || c.severity}</span>
            </div>
            <div class="complaint-category">${c.category}</div>
            <div class="complaint-desc">${c.description}</div>
            ${c.image_url ? `<img src="${c.image_url}" class="complaint-img" alt="evidencia">` : ''}
            <div class="complaint-footer">
                <span class="complaint-status ${c.status}">${c.status === 'abierta' ? '🔴 Abierta' : '✅ Resuelta'}</span>
                <span class="complaint-date">${date}</span>
                ${isMine && c.status === 'abierta' ? `<button class="btn-resolve resolver" onclick="resolveComplaint('${c.id}','resuelta')">✅ Resolver</button>` : ''}
                ${isMine ? `<button class="btn-resolve eliminar" onclick="deleteComplaint('${c.id}')">🗑️</button>` : ''}
            </div>
        </div>`;
    }).join("");
}

async function uploadImage(file) {
    const ext  = file.name.split('.').pop();
    const path = `${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('complaint-images').upload(path, file);
    if (error) throw error;
    const { data } = supabase.storage.from('complaint-images').getPublicUrl(path);
    return data.publicUrl;
}

document.getElementById("btn-submit-complaint").onclick = async () => {
    const category    = document.getElementById("c-category").value;
    const description = document.getElementById("c-description").value.trim();
    const severity    = document.getElementById("c-severity").value;
    const imageFile   = document.getElementById("c-image").files[0];
    if (!category)    { showMessage("Elige una categoría", 'error', 'complaint-msg'); return; }
    if (!description) { showMessage("Escribe qué pasó",    'error', 'complaint-msg'); return; }
    if (!severity)    { showMessage("Elige nivel de gravedad", 'error', 'complaint-msg'); return; }
    const btn = document.getElementById("btn-submit-complaint");
    btn.disabled = true; btn.textContent = "Enviando...";
    try {
        let image_url = null;
        if (imageFile) image_url = await uploadImage(imageFile);
        const { error } = await supabase.from("complaints").insert([{
            reported_by: currentPlayer, category, description, severity,
            image_url, status: 'abierta', seen_by: [currentPlayer]
        }]);
        if (error) throw error;
        document.getElementById("c-category").value   = "";
        document.getElementById("c-description").value = "";
        document.getElementById("c-severity").value    = "";
        document.getElementById("c-image").value       = "";
        document.querySelectorAll('.severity-btn').forEach(b => b.classList.remove('active'));
        document.getElementById('complaint-form').style.display  = 'none';
        document.getElementById('btn-new-complaint').style.display = 'block';
        showMessage("¡Denuncia enviada! 🚨", 'success', 'action-message');
    } catch (e) {
        showMessage("Error al enviar.", 'error', 'complaint-msg');
        console.error(e);
    } finally {
        btn.disabled = false; btn.textContent = "Enviar denuncia 🚨";
    }
};

window.resolveComplaint = async (id, status) => {
    await supabase.from("complaints").update({ status }).eq("id", id);
};
window.deleteComplaint = async (id) => {
    if (!confirm("¿Eliminar esta denuncia?")) return;
    await supabase.from("complaints").delete().eq("id", id);
};

// ==========================
// NOTIFICACIONES
// ==========================
function updateNotifBadge() {
    const unseen = allComplaints.filter(
        c => !c.seen_by?.includes(currentPlayer) && c.reported_by !== currentPlayer
    ).length;
    const badge = document.getElementById("notif-badge");
    if (unseen > 0) { badge.textContent = unseen; badge.style.display = 'flex'; }
    else { badge.style.display = 'none'; }
    renderNotifPanel();
}

function renderNotifPanel() {
    const list   = document.getElementById("notif-list");
    const unread = allComplaints.filter(c => !c.seen_by?.includes(currentPlayer) && c.reported_by !== currentPlayer);
    const read   = allComplaints.filter(c => c.seen_by?.includes(currentPlayer) || c.reported_by === currentPlayer).slice(0, 5);
    if (!unread.length && !read.length) {
        list.innerHTML = `<p class="notif-empty">No hay notificaciones 🐾</p>`; return;
    }
    const item = (c, isNew) => {
        const date = new Date(c.created_at).toLocaleDateString('es', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
        return `<div class="notif-item ${isNew ? 'nueva' : ''}">🚨 <strong>${c.reported_by}</strong> hizo una denuncia: <em>${c.category}</em><div class="notif-time">${date}</div></div>`;
    };
    list.innerHTML =
        unread.map(c => item(c, true)).join("") +
        (read.length ? `<p style="font-size:0.78rem;color:var(--text-soft);padding:8px 0;font-weight:700;">— Anteriores —</p>` : '') +
        read.map(c => item(c, false)).join("");
}

window.markNotifsSeen = async () => {
    const unseen = allComplaints.filter(c => !c.seen_by?.includes(currentPlayer) && c.reported_by !== currentPlayer);
    for (const c of unseen) {
        await supabase.from("complaints").update({ seen_by: [...(c.seen_by || []), currentPlayer] }).eq("id", c.id);
    }
    document.getElementById("notif-badge").style.display = 'none';
};

// ==========================
// CARGA INICIAL
// ==========================
async function loadData(name) {
    currentPlayer = name;
    document.getElementById("player-avatar").textContent = AVATARS[name] || '🐾';
    document.getElementById("player-name").textContent   = name;

    let { data: userData, error: userError } = await supabase
        .from("players").select("*").eq("username", name).maybeSingle();

    if (userError) { showMessage("Error al cargar tu perfil 😿", 'error'); return; }

    if (!userData) {
        myWallet = 100;
        myStreak = 0; myTotalDonated = 0; myClaimedRewards = [];
        await supabase.from("players").insert([{
            username: name, wallet_coins: 100,
            last_claim: new Date().toISOString().split('T')[0],
            weekly_donations: 0, total_donated: 0,
            streak: 0, claimed_rewards: [],
        }]);
    } else {
        myWallet         = userData.wallet_coins;
        myStreak         = userData.streak        || 0;
        myTotalDonated   = userData.total_donated  || 0;
        myClaimedRewards = userData.claimed_rewards || [];
        await checkDailyReward(userData);
    }

    await refreshSharedData();
    await loadComplaints();

    // Tiempo real
    supabase.channel('db-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bank' }, (p) => {
            sharedBank = p.new.total_coins;
            sharedHistory = p.new.history;
            renderUI(); bumpBankNum();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players' }, () => updateRankingUI())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'complaints' }, () => loadComplaints())
        .subscribe();

    document.getElementById("login-screen").classList.remove('active');
    document.getElementById("game-screen").classList.add('active');
    renderUI();
    updateRankingUI();
    renderRewardsUI();
}

// ==========================
// REWARD DIARIO + RACHA
// ==========================
async function checkDailyReward(user) {
    const hoy  = new Date().toISOString().split('T')[0];
    const ayer = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (user.last_claim === hoy) return; // Ya recibió hoy

    // Calcular racha
    let newStreak = 1;
    if (user.last_claim === ayer) {
        newStreak = (user.streak || 0) + 1; // Racha continua
    }
    // Si no fue ayer, la racha se reinicia a 1

    myWallet += 2;
    myStreak  = newStreak;

    showMessage(`¡Hola ${currentPlayer}! 🐾 +2 monedas diarias · Racha: ${newStreak} 🔥`, 'success');
    spawnCoins(4);

    await supabase.from("players").update({
        wallet_coins: myWallet,
        last_claim:   hoy,
        streak:       newStreak,
    }).eq("username", currentPlayer);

    // Verificar recompensas de racha
    checkNewRewards();
    renderRewardsUI();
}

async function refreshSharedData() {
    const { data: b, error } = await supabase.from("bank").select("*").eq("id", 1).single();
    if (error) { console.error("Error banco:", error); return; }
    if (b) { sharedBank = b.total_coins; sharedHistory = b.history || []; }
}

// ==========================
// LOGIN / LOGOUT
// ==========================
document.getElementById("franco-btn").onclick = () => loadData("Franco");
document.getElementById("jess-btn").onclick   = () => loadData("Jess");
document.getElementById("logout-btn").onclick  = () => {
    currentPlayer = null;
    myWallet = 0; myStreak = 0; myTotalDonated = 0; myClaimedRewards = [];
    document.getElementById("game-screen").classList.remove('active');
    document.getElementById("login-screen").classList.add('active');
};