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

// ==========================
// ELEMENTOS DEL DOM
// ==========================
const coinDisplay   = document.getElementById("coin-count");
const walletDisplay = document.getElementById("available-coins");
const historyDiv    = document.getElementById("history");

// ==========================
// MENSAJES VISUALES
// Muestra un mensaje debajo de los botones de acción
// ==========================
function showMessage(text, type = 'error') {
    const msg = document.getElementById("action-message");
    msg.textContent = text;
    msg.className = 'action-message ' + type;
    msg.style.display = 'block';
    clearTimeout(msg._timer);
    msg._timer = setTimeout(() => {
        msg.style.display = 'none';
    }, 3500);
}

// ==========================
// DESHABILITAR / HABILITAR BOTONES
// ==========================
function setActionButtons(disabled) {
    const buttons = document.querySelectorAll('.main-actions button, .btn-small');
    buttons.forEach(btn => btn.disabled = disabled);
}

// ==========================
// ACCIONES (expuestas globalmente para los onclick del HTML)
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

    // Confirmación antes de robar
    if (action === 'remove') {
        const ok = confirm(`¿Seguro que quieres robar ${amount} moneda${amount > 1 ? 's' : ''}? ❌`);
        if (!ok) return;
    }

    const oldW = myWallet;
    const oldB = sharedBank;
    const oldH = [...sharedHistory];
    let donationChange = 0;

    if (action === 'add') {
        if (myWallet < amount) {
            showMessage("¡No tienes suficientes monedas! 🪙", 'error');
            return;
        }
        myWallet -= amount;
        sharedBank += amount;
        donationChange = amount;
        sharedHistory.push(`${currentPlayer} dio ${amount} 🪙`);
    } else {
        if (sharedBank < amount) {
            showMessage("¡Pusheen no tiene tanto! 🐾", 'error');
            return;
        }
        myWallet += amount;
        sharedBank -= amount;
        donationChange = -amount;
        sharedHistory.push(`${currentPlayer} robó ${amount} ❌`);
    }

    renderUI();
    isSaving = true;
    setActionButtons(true);

    try {
        const { data } = await supabase
            .from("players")
            .select("weekly_donations")
            .eq("username", currentPlayer)
            .single();

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
        myWallet = oldW;
        sharedBank = oldB;
        sharedHistory = oldH;
        renderUI();
        showMessage("Error al guardar. Intenta de nuevo 😿", 'error');
        console.error("Error al guardar:", e);
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
        .reverse()
        .slice(0, 6)
        .map(m => `<p>${m}</p>`)
        .join("");
}

// ==========================
// RANKING
// ==========================
async function updateRankingUI() {
    const { data: r } = await supabase
        .from("players")
        .select("username, weekly_donations")
        .order("weekly_donations", { ascending: false });

    const list = document.getElementById("ranking-list");
    if (!r) return;

    list.innerHTML = r.map((p, i) =>
        `<p class="${i === 0 ? 'first-place' : ''}">
            ${i === 0 ? '👑' : '🐾'} ${p.username}: ${p.weekly_donations} monedas
        </p>`
    ).join("");
}

// ==========================
// CARGA INICIAL
// ==========================
async function loadData(name) {
    currentPlayer = name;

    let { data: userData } = await supabase
        .from("players")
        .select("*")
        .eq("username", name)
        .maybeSingle();

    if (!userData) {
        myWallet = 100;
        await supabase.from("players").insert([{
            username: name,
            wallet_coins: 100,
            last_claim: new Date().toISOString().split('T')[0],
            weekly_donations: 0
        }]);
    } else {
        myWallet = userData.wallet_coins;
        await checkDailyReward(userData);
    }

    await refreshSharedData();

    // Tiempo real con Supabase Realtime
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

    document.getElementById("login-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";
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
    const { data: b } = await supabase
        .from("bank")
        .select("*")
        .eq("id", 1)
        .single();

    if (b) {
        sharedBank = b.total_coins;
        sharedHistory = b.history || [];
    }
}

// ==========================
// EVENTOS DE BOTONES
// ==========================

// Login
document.getElementById("franco-btn").onclick = () => loadData("Franco");
document.getElementById("jess-btn").onclick   = () => loadData("Jess");
document.getElementById("logout-btn").onclick  = () => location.reload();

// Navegación eventos
document.getElementById("events-btn").onclick = () => {
    document.getElementById("game-screen").style.display   = "none";
    document.getElementById("events-screen").style.display = "block";
};

document.getElementById("back-btn").onclick = () => {
    document.getElementById("events-screen").style.display = "none";
    document.getElementById("game-screen").style.display   = "block";
};

// Reclamar recompensa evento
document.getElementById("claim-btn").onclick = async () => {
    if (!currentPlayer) return;
    const btn = document.getElementById("claim-btn");
    if (btn.disabled) return;

    btn.disabled = true;
    btn.textContent = "Guardando...";

    try {
        myWallet += 100;
        renderUI();

        await supabase.from("players")
            .update({ wallet_coins: myWallet })
            .eq("username", currentPlayer);

        btn.textContent = "🎁 Recompensa reclamada";
    } catch (e) {
        myWallet -= 100;
        renderUI();
        btn.disabled = false;
        btn.textContent = "🎁 Reclamar 100 monedas";
        console.error("Error al reclamar:", e);
    }
};