import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

const supabaseUrl = 'TU_SUPABASE_URL';
const supabaseKey = 'TU_SUPABASE_KEY';
const supabase = createClient(supabaseUrl, supabaseKey);

const coinDisplay = document.getElementById("coin-count");
const availableDisplay = document.getElementById("available-coins");
const addButton = document.getElementById("add-coin");
const removeButton = document.getElementById("remove-coin");
const historyDiv = document.getElementById("history");
const currentPlayerText = document.getElementById("current-player");

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
  currentPlayer = name;

  document.getElementById("login-screen").style.display = "none";
  document.getElementById("game-screen").style.display = "block";

  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("username", name)
    .single();

  if (!data) {
    playerCoins = 100;
    await supabase.from("players").insert([
      { username: name, coins: playerCoins }
    ]);
  } else {
    playerCoins = data.coins;
  }

  currentPlayerText.textContent =
    `Jugador: ${currentPlayer} | Tus monedas: ${playerCoins} 🪙`;

  loadBank();
}

// ==========================
// CARGAR BANCO GLOBAL
// ==========================
async function loadBank() {
  let { data } = await supabase
    .from("bank")
    .select("*")
    .limit(1)
    .single();

  if (!data) {
    await supabase.from("bank").insert([
      { id: 1, coins: 0, available: 100, history: [] }
    ]);
    bankCoins = 0;
    available = 100;
    history = [];
  } else {
    bankCoins = data.coins;
    available = data.available;
    history = data.history || [];
  }

  renderUI();
}

async function updateBank() {
  await supabase
    .from("bank")
    .update({ coins: bankCoins, available: available, history: history })
    .eq("id", 1);
}

async function updatePlayer() {
  await supabase
    .from("players")
    .update({ coins: playerCoins })
    .eq("username", currentPlayer);
}

// ==========================
// UI
// ==========================
function renderUI() {
  coinDisplay.textContent = bankCoins;
  availableDisplay.textContent = available;

  currentPlayerText.textContent =
    `Jugador: ${currentPlayer} | Tus monedas: ${playerCoins} 🪙`;

  historyDiv.innerHTML = "<h3>Historial</h3>";
  history.slice(-10).reverse().forEach(entry => {
    const p = document.createElement("p");
    p.textContent = entry;
    historyDiv.appendChild(p);
  });
}

// ==========================
// BOTONES PERFIL
// ==========================
francoBtn.addEventListener("click", () => loadPlayer("Franco"));
jessBtn.addEventListener("click", () => loadPlayer("Jess"));

// ==========================
// DAR MONEDA
// ==========================
addButton.addEventListener("click", async () => {
  if (!currentPlayer) return alert("Selecciona perfil primero 😼");
  if (playerCoins > 0 && available > 0) {
    playerCoins--;
    bankCoins++;
    available--;

    history.push(`${currentPlayer} dio una moneda 🪙`);

    await updatePlayer();
    await updateBank();
    renderUI();
  }
});

// ==========================
// QUITAR MONEDA
// ==========================
removeButton.addEventListener("click", async () => {
  if (!currentPlayer) return alert("Selecciona perfil primero 😼");
  if (bankCoins > 0) {
    playerCoins++;
    bankCoins--;
    available++;

    history.push(`${currentPlayer} quitó una moneda ❌`);

    await updatePlayer();
    await updateBank();
    renderUI();
  }
});

// ==========================
// CERRAR SESIÓN
// ==========================
document.getElementById("logout-btn").addEventListener("click", () => {
  currentPlayer = null;
  playerCoins = 0;
  document.getElementById("login-screen").style.display = "block";
  document.getElementById("game-screen").style.display = "none";
});