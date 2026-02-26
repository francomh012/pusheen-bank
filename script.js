import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ⚠️ SUSTITUYE ESTO CON TUS DATOS REALES DE SUPABASE
const supabaseUrl = 'https://erblqbqsjqhatarcpzjs.supabase.co';
const supabaseKey = 'sb_publishable_hqp5-27VsAh8eUKZoonUeg_KtTMjr99';
const supabase = createClient(supabaseUrl, supabaseKey);

// Variables de estado
let currentPlayer = null;
let myWallet = 0;       // Monedas personales
let sharedBank = 0;     // Monedas en Pusheen (Compartido)
let sharedHistory = []; // Historial (Compartido)

// Elementos UI
const coinDisplay = document.getElementById("coin-count");
const walletDisplay = document.getElementById("available-coins");
const historyDiv = document.getElementById("history");
const playerText = document.getElementById("current-player");

// ==========================
// CARGAR DATOS (PERSONAL + COMPARTIDO)
// ==========================
async function loadData(name) {
    currentPlayer = name;
    
    // 1. Cargar mi billetera personal
    let { data: userData } = await supabase
        .from("players")
        .select("*")
        .eq("username", name)
        .maybeSingle();

    if (!userData) {
        // Si el usuario no existe, lo creamos
        await supabase.from("players").insert([{ username: name, wallet_coins: 100 }]);
        myWallet = 100;
    } else {
        myWallet = userData.wallet_coins;
    }

    // 2. Cargar el banco y el historial compartido
    await refreshSharedData();

    // Mostrar pantalla de juego
    document.getElementById("login-screen").style.display = "none";
    document.getElementById("game-screen").style.display = "block";
    renderUI();
}

async function refreshSharedData() {
    let { data: bankData } = await supabase
        .from("bank")
        .select("*")
        .eq("id", 1)
        .single();
    
    sharedBank = bankData.total_coins;
    sharedHistory = bankData.history || [];
}

// ==========================
// LÓGICA DE MONEDAS
// ==========================
async function handleCoin(action) {
    if (action === 'add') {
        if (myWallet <= 0) return alert("¡No tienes monedas personales!");
        myWallet--;
        sharedBank++;
        sharedHistory.push(`${currentPlayer} depositó 1 moneda 🪙`);
    } else {
        if (sharedBank <= 0) return alert("¡Pusheen no tiene monedas!");
        myWallet++;
        sharedBank--;
        sharedHistory.push(`${currentPlayer} retiró 1 moneda ❌`);
    }

    renderUI();

    // Guardar en Supabase (Ambas tablas)
    await Promise.all([
        supabase.from("players").update({ wallet_coins: myWallet }).eq("username", currentPlayer),
        supabase.from("bank").update({ total_coins: sharedBank, history: sharedHistory }).eq("id", 1)
    ]);
}

// ==========================
// RENDERIZADO
// ==========================
function renderUI() {
    coinDisplay.textContent = sharedBank;
    walletDisplay.textContent = myWallet;
    playerText.textContent = `Jugador: ${currentPlayer}`;
    
    historyDiv.innerHTML = "<h3>Historial Compartido</h3>";
    [...sharedHistory].reverse().slice(0, 7).forEach(msg => {
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