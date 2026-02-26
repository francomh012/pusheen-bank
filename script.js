import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://erblqbqsjqhatarcpzjs.supabase.co';
const supabaseKey = 'sb_publishable_hqp5-27VsAh8eUKZoonUeg_KtTMjr99';
const supabase = createClient(supabaseUrl, supabaseKey);

let currentPlayer = null;
let myWallet = 0;
let sharedBank = 0;
let sharedHistory = [];
let isSaving = false; // Variable para evitar clics dobles

const coinDisplay = document.getElementById("coin-count");
const walletDisplay = document.getElementById("available-coins");
const historyDiv = document.getElementById("history");
const playerText = document.getElementById("current-player");

// ==========================
// INICIO Y LOGUEO
// ==========================
async function loadData(name) {
    currentPlayer = name;
    
    let { data: userData } = await supabase.from("players").select("*").eq("username", name).maybeSingle();
    
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
    
    // TIEMPO REAL: Escucha el banco y el ranking
    supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bank' }, (payload) => {
            sharedBank = payload.new.total_coins;
            sharedHistory = payload.new.history;
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
// RANKING UI
// ==========================
async function updateRankingUI() {
    const rankingList = document.getElementById("ranking-list");
    const { data: rankings, error } = await supabase
        .from("players")
        .select("username, weekly_donations")
        .order("weekly_donations", { ascending: false });

    if (error) return console.error(error);

    rankingList.innerHTML = "";
    rankings.forEach((player, index) => {
        const p = document.createElement("p");
        const medal = index === 0 ? "👑" : "🐾";
        if (index === 0) p.className = "first-place";
        p.textContent = `${medal} ${player.username}: ${player.weekly_donations} monedas`;
        rankingList.appendChild(p);
    });
}

// ==========================
// ACCIONES (DAR / QUITAR)
// ==========================
async function handleCoin(action) {
    if (isSaving) return;

    let donationChange = 0;
    const oldWallet = myWallet;
    const oldBank = sharedBank;
    const oldHistory = [...sharedHistory];

    if (action === 'add') {
        if (myWallet <= 0) return alert("¡No tienes monedas!");
        myWallet--;
        sharedBank++;
        donationChange = 1;
        sharedHistory.push(`${currentPlayer} dio 1 moneda 🪙`);
    } else {
        if (sharedBank <= 0) return alert("¡Pusheen no tiene monedas!");
        myWallet++;
        sharedBank--;
        donationChange = -1;
        sharedHistory.push(`${currentPlayer} robó 1 moneda ❌`);
    }

    renderUI();
    isSaving = true;

    try {
        const { data: userData, error: fetchError } = await supabase
            .from("players")
            .select("weekly_donations")
            .eq("username", currentPlayer)
            .single();

        if (fetchError) throw fetchError;

        const newWeeklyTotal = Math.max(0, (userData.weekly_donations || 0) + donationChange);

        const updates = [
            supabase.from("players").update({ 
                wallet_coins: myWallet, 
                weekly_donations: newWeeklyTotal 
            }).eq("username", currentPlayer),
            
            supabase.from("bank").update({ 
                total_coins: sharedBank, 
                history: sharedHistory 
            }).eq("id", 1)
        ];

        const results = await Promise.all(updates);
        if (results.some(r => r.error)) throw new Error("Error en la DB");

        updateRankingUI();

    } catch (error) {
        console.error("Error al guardar, revirtiendo...", error);
        myWallet = oldWallet;
        sharedBank = oldBank;
        sharedHistory = oldHistory;
        renderUI();
        alert("Error de conexión. Se han restaurado tus monedas.");
    } finally {
        isSaving = false;
    }
}

// ==========================
// RECOMPENSA DIARIA
// ==========================
async function checkDailyReward(user) {
    const hoy = new Date().toISOString().split('T')[0];
    if (user.last_claim !== hoy) {
        myWallet += 2;
        alert(`¡Hola ${currentPlayer}! 🐾 Has recibido tus 2 monedas diarias.`);
        await supabase.from("players")
            .update({ wallet_coins: myWallet, last_claim: hoy })
            .eq("username", currentPlayer);
        renderUI();
    }
}

async function refreshSharedData() {
    let { data: bankData } = await supabase.from("bank").select("*").eq("id", 1).single();
    if (bankData) {
        sharedBank = bankData.total_coins;
        sharedHistory = bankData.history || [];
    }
}

function renderUI() {
    coinDisplay.textContent = sharedBank;
    walletDisplay.textContent = myWallet;
    playerText.textContent = `Sesión: ${currentPlayer}`;
    historyDiv.innerHTML = "<h3>Historial de Monedas 🐾</h3>";
    [...sharedHistory].reverse().slice(0, 8).forEach(msg => {
        const p = document.createElement("p");
        p.textContent = msg;
        historyDiv.appendChild(p);
    });
}

// Eventos
document.getElementById("franco-btn").onclick = () => loadData("Franco");
document.getElementById("jess-btn").onclick = () => loadData("Jess");
document.getElementById("add-coin").onclick = () => handleCoin('add');
document.getElementById("remove-coin").onclick = () => handleCoin('remove');
document.getElementById("logout-btn").onclick = () => location.reload();