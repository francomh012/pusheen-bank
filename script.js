import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'https://erblqbqsjqhatarcpzjs.supabase.co';
const supabaseKey = 'sb_publishable_hqp5-27VsAh8eUKZoonUeg_KtTMjr99';
const supabase = createClient(supabaseUrl, supabaseKey);

let currentPlayer = null;
let myWallet = 0;
let sharedBank = 0;
let sharedHistory = [];

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
    
    // TIEMPO REAL ACTUALIZADO (Escucha el banco y el ranking)
    supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bank' }, (payload) => {
            sharedBank = payload.new.total_coins;
            sharedHistory = payload.new.history;
            renderUI();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players' }, () => {
            // Si cualquier jugador cambia, actualizamos el ranking para todos
            updateRankingUI();
        })
        .subscribe();

    document.getElementById("login-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";
    
    renderUI();
    updateRankingUI(); // Cargamos el ranking al entrar
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
// ACCIONES
// ==========================
async function handleCoin(action) {
    let donationChange = 0;

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
        sharedHistory.push(`${currentPlayer} quitó 1 moneda ❌`);
    }

    renderUI();

    // 1. Obtener donaciones actuales para sumar
    const { data } = await supabase.from("players").select("weekly_donations").eq("username", currentPlayer).single();
    const newWeeklyTotal = (data.weekly_donations || 0) + donationChange;

    // 2. Guardar en Supabase
    await supabase.from("players").update({ 
        wallet_coins: myWallet, 
        weekly_donations: Math.max(0, newWeeklyTotal) 
    }).eq("username", currentPlayer);

    await supabase.from("bank").update({ 
        total_coins: sharedBank, 
        history: sharedHistory 
    }).eq("id", 1);
    
    updateRankingUI();
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