import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://erblqbqsjqhatarcpzjs.supabase.co';
const supabaseKey = 'sb_publishable_hqp5-27VsAh8eUKZoonUeg_KtTMjr99';
const supabase = createClient(supabaseUrl, supabaseKey);

let currentPlayer = null;
let myWallet = 0;
let sharedBank = 0;
let sharedHistory = [];
let isSaving = false;

const coinDisplay = document.getElementById("coin-count");
const walletDisplay = document.getElementById("available-coins");
const historyDiv = document.getElementById("history");
const playerText = document.getElementById("current-player");

// ==========================
// LOGUEO Y CARGA
// ==========================
async function loadData(name) {
    currentPlayer = name;
    let { data: userData } = await supabase.from("players").select("*").eq("username", name).maybeSingle();
    
    if (!userData) {
        myWallet = 100;
        await supabase.from("players").insert([{ username: name, wallet_coins: 100, last_claim: new Date().toISOString().split('T')[0], weekly_donations: 0 }]);
    } else {
        myWallet = userData.wallet_coins;
        await checkDailyReward(userData);
    }

    await refreshSharedData();
    
    // TIEMPO REAL
    supabase.channel('db-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bank' }, (p) => {
            sharedBank = p.new.total_coins;
            sharedHistory = p.new.history;
            renderUI();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players' }, () => updateRankingUI())
        .subscribe();

    document.getElementById("login-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";
    renderUI();
    updateRankingUI();
}

// ==========================
// ACCIONES (DAR / QUITAR)
// ==========================
window.handleCustom = (action) => {
    const input = document.getElementById("custom-val");
    const val = parseInt(input.value);
    if (isNaN(val) || val <= 0) return alert("Escribe un número");
    handleCoin(action, val);
    input.value = "";
};

window.handleCoin = async (action, amount = 1) => {
    if (isSaving) return;
    const oldW = myWallet; const oldB = sharedBank; const oldH = [...sharedHistory];
    let donationChange = 0;

    if (action === 'add') {
        if (myWallet < amount) return alert("No tienes suficientes monedas");
        myWallet -= amount; sharedBank += amount; donationChange = amount;
        sharedHistory.push(`${currentPlayer} dio ${amount} 🪙`);
    } else {
        if (sharedBank < amount) return alert("Pusheen no tiene tanto");
        myWallet += amount; sharedBank -= amount; donationChange = -amount;
        sharedHistory.push(`${currentPlayer} robó ${amount} ❌`);
    }

    renderUI();
    isSaving = true;

    try {
        const { data } = await supabase.from("players").select("weekly_donations").eq("username", currentPlayer).single();
        const newWeekly = Math.max(0, (data.weekly_donations || 0) + donationChange);

        await Promise.all([
            supabase.from("players").update({ wallet_coins: myWallet, weekly_donations: newWeekly }).eq("username", currentPlayer),
            supabase.from("bank").update({ total_coins: sharedBank, history: sharedHistory }).eq("id", 1)
        ]);
    } catch (e) {
        myWallet = oldW; sharedBank = oldB; sharedHistory = oldH; renderUI();
    } finally { isSaving = false; }
};

// ==========================
// UI Y RANKING
// ==========================
async function updateRankingUI() {
    const { data: r } = await supabase.from("players").select("username, weekly_donations").order("weekly_donations", { ascending: false });
    const list = document.getElementById("ranking-list");
    list.innerHTML = r.map((p, i) => `<p class="${i===0?'first-place':''}">${i===0?'👑':'🐾'} ${p.username}: ${p.weekly_donations}</p>`).join("");
}

async function checkDailyReward(user) {
    const hoy = new Date().toISOString().split('T')[0];
    if (user.last_claim !== hoy) {
        myWallet += 2;
        alert(`¡Hola! +2 monedas diarias 🐾`);
        await supabase.from("players").update({ wallet_coins: myWallet, last_claim: hoy }).eq("username", currentPlayer);
    }
}

async function refreshSharedData() {
    let { data: b } = await supabase.from("bank").select("*").eq("id", 1).single();
    if (b) { sharedBank = b.total_coins; sharedHistory = b.history || []; }
}

function renderUI() {
    coinDisplay.textContent = sharedBank;
    walletDisplay.textContent = myWallet;
    historyDiv.innerHTML = [...sharedHistory].reverse().slice(0, 5).map(m => `<p>${m}</p>`).join("");
}

document.getElementById("franco-btn").onclick = () => loadData("Franco");
document.getElementById("jess-btn").onclick = () => loadData("Jess");
document.getElementById("logout-btn").onclick = () => location.reload();