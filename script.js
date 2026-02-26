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
    
    // Cargar datos del jugador
    let { data: userData } = await supabase.from("players").select("*").eq("username", name).maybeSingle();
    
    if (!userData) {
        myWallet = 100;
        await supabase.from("players").insert([{ 
            username: name, 
            wallet_coins: 100, 
            last_claim: new Date().toISOString().split('T')[0] 
        }]);
    } else {
        myWallet = userData.wallet_coins;
        // RECOMPENSA DIARIA
        await checkDailyReward(userData);
    }

    // Cargar datos del banco
    await refreshSharedData();
    
    // ACTIVAR TIEMPO REAL
    supabase
        .channel('schema-db-changes')
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'bank' }, (payload) => {
            sharedBank = payload.new.total_coins;
            sharedHistory = payload.new.history;
            renderUI();
        })
        .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'players', filter: `username=eq.${currentPlayer}` }, (payload) => {
            myWallet = payload.new.wallet_coins;
            renderUI();
        })
        .subscribe();

    document.getElementById("login-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";
    renderUI();
}

// ==========================
// LÓGICA DE RECOMPENSA DIARIA
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

// ==========================
// ACCIONES (DAR / QUITAR)
// ==========================
async function handleCoin(action) {
    let newWallet = myWallet;
    let newBank = sharedBank;
    let newHistory = [...sharedHistory];

    if (action === 'add') {
        if (myWallet <= 0) return alert("¡No tienes monedas!");
        newWallet--;
        newBank++;
        newHistory.push(`${currentPlayer} dio 1 moneda 🪙`);
    } else {
        if (sharedBank <= 0) return alert("¡Pusheen no tiene monedas!");
        newWallet++;
        newBank--;
        newHistory.push(`${currentPlayer} robó 1 moneda ❌`);
    }

    // Optimismo UI (actualizar antes de la DB para que se sienta rápido)
    myWallet = newWallet;
    sharedBank = newBank;
    sharedHistory = newHistory;
    renderUI();

    await supabase.from("players").update({ wallet_coins: newWallet }).eq("username", currentPlayer);
    await supabase.from("bank").update({ total_coins: newBank, history: newHistory }).eq("id", 1);
}

function renderUI() {
    coinDisplay.textContent = sharedBank;
    walletDisplay.textContent = myWallet;
    playerText.textContent = `Jugador: ${currentPlayer}`;
    
    historyDiv.innerHTML = "<h3>Historial en Vivo 🐾</h3>";
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