import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// ⚠️ SUSTITUYE ESTO CON TUS DATOS REALES DE SUPABASE
const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseKey = 'TU_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

const coinDisplay = document.getElementById("coin-count");
const availableDisplay = document.getElementById("available-coins");
const addButton = document.getElementById("add-coin");
const removeButton = document.getElementById("remove-coin");
const historyDiv = document.getElementById("history");
const currentPlayerText = document.getElementById("current-player");
const loginScreen = document.getElementById("login-screen");
const gameScreen = document.getElementById("game-screen");

const francoBtn = document.getElementById("franco-btn");
const jessBtn = document.getElementById("jess-btn");

let currentPlayer = null;
let playerCoins = 0;
let bankCoins = 0;
let available = 0;
let history = [];

// ==========================
// CARGAR JUGADOR
// ==========================
async function loadPlayer(name) {
    console.log("Intentando cargar jugador:", name);
    try {
        currentPlayer = name;

        // Intentar obtener los datos del jugador
        const { data, error } = await supabase
            .from("players")
            .select("*")
            .eq("username", name)
            .maybeSingle(); // Usamos maybeSingle para que no explote si no hay datos

        if (error) throw error;

        if (!data) {
            console.log("Creando jugador nuevo...");
            playerCoins = 100;
            const { error: insertError } = await supabase
                .from("players")
                .insert([{ username: name, coins: playerCoins }]);
            if (insertError) throw insertError;
        } else {
            playerCoins = data.coins;
        }

        // Si todo sale bien, cambiamos de pantalla
        loginScreen.style.display = "none";
        gameScreen.style.display = "block";
        
        await loadBank();
        renderUI();

    } catch (err) {
        console.error("Error al cargar jugador:", err.message);
        alert("Hubo un error al conectar con la base de datos. Revisa la consola.");
    }
}

// ==========================
// CARGAR BANCO GLOBAL
// ==========================
async function loadBank() {
    try {
        let { data, error } = await supabase
            .from("bank")
            .select("*")
            .eq("id", 1)
            .maybeSingle();

        if (error) throw error;

        if (!data) {
            console.log("Inicializando banco...");
            const initialBank = { id: 1, coins: 0, available: 100, history: [] };
            await supabase.from("bank").insert([initialBank]);
            bankCoins = 0;
            available = 100;
            history = [];
        } else {
            bankCoins = data.coins;
            available = data.available;
            history = data.history || [];
        }
    } catch (err) {
        console.error("Error al cargar el banco:", err.message);
    }
}

// ==========================
// ACTUALIZAR DATOS
// ==========================
async function updateData() {
    try {
        // Actualizar Banco
        await supabase
            .from("bank")
            .update({ coins: bankCoins, available: available, history: history })
            .eq("id", 1);

        // Actualizar Jugador
        await supabase
            .from("players")
            .update({ coins: playerCoins })
            .eq("username", currentPlayer);
            
    } catch (err) {
        console.error("Error al guardar:", err.message);
    }
}

// ==========================
// UI
// ==========================
function renderUI() {
    coinDisplay.textContent = bankCoins;
    availableDisplay.textContent = available;
    currentPlayerText.textContent = `Jugador: ${currentPlayer} | Tus monedas: ${playerCoins} 🪙`;

    historyDiv.innerHTML = "<h3>Historial</h3>";
    // Mostramos los últimos 5 movimientos
    [...history].reverse().slice(0, 5).forEach(entry => {
        const p = document.createElement("p");
        p.textContent = entry;
        p.style.fontSize = "0.9rem";
        p.style.color = "#555";
        historyDiv.appendChild(p);
    });
}

// ==========================
// EVENTOS
// ==========================
francoBtn.addEventListener("click", () => loadPlayer("Franco"));
jessBtn.addEventListener("click", () => loadPlayer("Jess"));

addButton.addEventListener("click", async () => {
    if (playerCoins > 0 && available > 0) {
        playerCoins--;
        bankCoins++;
        available--;
        history.push(`${currentPlayer} dio una moneda 🪙`);
        renderUI();
        await updateData();
    } else {
        alert("¡No tienes monedas o el banco está lleno!");
    }
});

removeButton.addEventListener("click", async () => {
    if (bankCoins > 0) {
        playerCoins++;
        bankCoins--;
        available++;
        history.push(`${currentPlayer} quitó una moneda ❌`);
        renderUI();
        await updateData();
    } else {
        alert("¡No hay monedas para quitar!");
    }
});

document.getElementById("logout-btn").addEventListener("click", () => {
    location.reload(); // La forma más limpia de resetear el estado
});