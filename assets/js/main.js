import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ==========================
// CONFIGURACIÓN SUPABASE
// ⚠️ Mueve estas claves a variables de entorno de Vercel en producción
// ==========================
const SUPABASE_URL = 'https://erblqbqsjqhatarcpzjs.supabase.co';
const SUPABASE_KEY = 'sb_publishable_hqp5-27VsAh8eUKZoonUeg_KtTMjr99';
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ==========================
// ESTADO GLOBAL
// ==========================
let currentPlayer = null;
let myWallet = 0;
let sharedBank = 0;
let sharedHistory = [];
let isSaving = false;

const AVATARS = { Franco: '🧔', Jess: '👩' };

// ==========================
// ELEMENTOS DEL DOM
// ==========================
const coinDisplay   = document.getElementById("coin-count");
const walletDisplay = document.getElementById("available-coins");
const historyDiv    = document.getElementById("history");

// ==========================
// MENSAJES VISUALES
// ==========================
function showMessage(text, type = 'error') {
    const msg = document.getElementById("action-message");
    msg.textContent = text;
    msg.className = 'action-message ' + type;
    msg.style.display = 'block';
    clearTimeout(msg._timer);
    msg._timer = setTimeout(() => { msg.style.display = 'none'; }, 3500);
}

// ==========================
// DESHABILITAR / HABILITAR BOTONES
// ==========================
function setActionButtons(disabled) {
    document.querySelectorAll('.quick-btn, .btn-give, .btn-steal')
        .forEach(btn => btn.disabled = disabled);
}

// ==========================
// ACCIONES
// ==========================
window.handleCustom = (action) => {
    const input = document.getElementById("custom-val");
    const val = parseInt(input.value);
    if (isNaN(val) || val <= 0) {
        showMessage("Escribe un número válido", 'error');
        return;
    }
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
    let donationChange = 0;

    if (action === 'add') {
        if (myWallet < amount) { showMessage("¡No tienes suficientes monedas! 🪙", 'error'); return; }
        myWallet -= amount; sharedBank += amount; donationChange = amount;
        sharedHistory.push(`${currentPlayer} dio ${amount} 🪙`);
    } else {
        if (sharedBank < amount) { showMessage("¡Pusheen no tiene tanto! 🐾", 'error'); return; }
        myWallet += amount; sharedBank -= amount; donationChange = -amount;
        sharedHistory.push(`${currentPlayer} robó ${amount} ❌`);
    }

    renderUI();
    isSaving = true;
    setActionButtons(true);

    try {
        const { data } = await supabase
            .from("players").select("weekly_donations")
            .eq("username", currentPlayer).single();

        const newWeekly = Math.max(0, (data.weekly_donations || 0) + donationChange);

        await Promise.all([
            supabase.from("players")
                .update({ wallet_coins: myWallet, weekly_donations: newWeekly })
                .eq("username", currentPlayer),
            supabase.from("bank")
                .update({ total_coins: sharedBank, history: sharedHistory })
                .eq("id", 1)
        ]);

        showMessage(
            action === 'add'
                ? `¡Diste ${amount} moneda${amount > 1 ? 's' : ''} a Pusheen! 🪙`
                : `Robaste ${amount} moneda${amount > 1 ? 's' : ''}... ❌`,
            action === 'add' ? 'success' : 'warning'
        );

        updateRankingUI();
    } catch (e) {
        myWallet = oldW; sharedBank = oldB; sharedHistory = oldH;
        renderUI();
        showMessage("Error al guardar. Intenta de nuevo 😿", 'error');
        console.error("Error:", e);
    } finally {
        isSaving = false;
        setActionButtons(false);
    }
};

// ==========================
// RENDER
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
// RANKING
// ==========================
async function updateRankingUI() {
    const { data: r } = await supabase
        .from("players").select("username, weekly_donations")
        .order("weekly_donations", { ascending: false });

    const list = document.getElementById("ranking-list");
    if (!r) return;

    list.innerHTML = r.map((p, i) => `
        <div class="ranking-item ${i === 0 ? 'first' : ''}">
            <span class="rank-pos">${i === 0 ? '👑' : '🐾'}</span>
            <span class="rank-name">${AVATARS[p.username] || '🐾'} ${p.username}</span>
            <span class="rank-coins">${p.weekly_donations} 🪙</span>
        </div>
    `).join("");
}

// ==========================
// CARGA INICIAL
// ==========================
async function loadData(name) {
    currentPlayer = name;

    // Mostrar avatar y nombre en header
    document.getElementById("player-avatar").textContent = AVATARS[name] || '🐾';
    document.getElementById("player-name").textContent = name;

    let { data: userData } = await supabase
        .from("players").select("*").eq("username", name).maybeSingle();

    if (!userData) {
        myWallet = 100;
        await supabase.from("players").insert([{
            username: name, wallet_coins: 100,
            last_claim: new Date().toISOString().split('T')[0], weekly_donations: 0
        }]);
    } else {
        myWallet = userData.wallet_coins;
        await checkDailyReward(userData);
    }

    await refreshSharedData();

    supabase.channel('db-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bank' }, (p) => {
            sharedBank = p.new.total_coins;
            sharedHistory = p.new.history;
            renderUI();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players' }, () => {
            updateRankingUI();
        })
        .subscribe();

    document.getElementById("login-screen").classList.remove('active');
    document.getElementById("game-screen").classList.add('active');
    renderUI();
    updateRankingUI();
}

// ==========================
// FUNCIONES DE APOYO
// ==========================
async function checkDailyReward(user) {
    const hoy = new Date().toISOString().split('T')[0];
    if (user.last_claim !== hoy) {
        myWallet += 2;
        showMessage(`¡Hola ${currentPlayer}! 🐾 +2 monedas diarias`, 'success');
        await supabase.from("players")
            .update({ wallet_coins: myWallet, last_claim: hoy })
            .eq("username", currentPlayer);
    }
}

async function refreshSharedData() {
    const { data: b } = await supabase.from("bank").select("*").eq("id", 1).single();
    if (b) { sharedBank = b.total_coins; sharedHistory = b.history || []; }
}

// ==========================
// BOTONES
// ==========================
document.getElementById("franco-btn").onclick = () => loadData("Franco");
document.getElementById("jess-btn").onclick   = () => loadData("Jess");
document.getElementById("logout-btn").onclick  = () => {
    document.getElementById("game-screen").classList.remove('active');
    document.getElementById("login-screen").classList.add('active');
};