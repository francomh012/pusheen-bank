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
// INICIO Y TIEMPO REAL
// ==========================
async function loadData(name) {
    currentPlayer = name;
    
    // Cargar datos iniciales
    const { data: userData } = await supabase.from("players").select("*").eq("username", name).maybeSingle();
    
    if (!userData) {
        await supabase.from("players").insert([{ username: name, wallet_coins: 100 }]);
        myWallet = 100;
    } else {
        myWallet = userData.wallet_coins;
    }

    await refreshSharedData();
    
    // ACTIVAR TIEMPO REAL: Escuchar cambios en las tablas
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

async function refreshSharedData() {
    let { data: bankData } = await supabase.from("bank").select("*").eq("id", 1).single();
    sharedBank = bankData.total_coins;
    sharedHistory = bankData.history || [];
}

// ==========================
// ACCIONES (GUARDAR DATOS)
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
        newHistory.push(`${currentPlayer} quitó 1 moneda ❌`);
    }

    // Actualizamos localmente para que se sienta rápido
    myWallet = newWallet;
    sharedBank = newBank;
    sharedHistory = newHistory;
    renderUI();

    // Guardamos en Supabase
    const { error: err1 } = await supabase.from("players").update({ wallet_coins: newWallet }).eq("username", currentPlayer);
    const { error: err2 } = await supabase.from("bank").update({ total_coins: newBank, history: newHistory }).eq("id", 1);
    
    if (err1 || err2) console.error("Error al guardar:", err1 || err2);
}

function renderUI() {
    coinDisplay.textContent = sharedBank;
    walletDisplay.textContent = myWallet;
    playerText.textContent = `Sesión: ${currentPlayer}`;
    
    historyDiv.innerHTML = "<h3>Historial en Vivo 🐾</h3>";
    [...sharedHistory].reverse().slice(0, 8).forEach(msg => {
        const p = document.createElement("p");
        p.textContent = msg;
        historyDiv.appendChild(p);
    });
}

// Eventos de botones
document.getElementById("franco-btn").onclick = () => loadData("Franco");
document.getElementById("jess-btn").onclick = () => loadData("Jess");
document.getElementById("add-coin").onclick = () => handleCoin('add');
document.getElementById("remove-coin").onclick = () => handleCoin('remove');
document.getElementById("logout-btn").onclick = () => location.reload();