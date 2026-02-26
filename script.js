const supabase = window.supabase;

const coinDisplay = document.getElementById("coin-count");
const availableDisplay = document.getElementById("available-coins");
const addButton = document.getElementById("add-coin");
const removeButton = document.getElementById("remove-coin");
const historyDiv = document.getElementById("history");

const francoBtn = document.getElementById("franco-btn");
const jessBtn = document.getElementById("jess-btn");
const currentPlayerText = document.getElementById("current-player");

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

  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("username", name)
    .single();

  if (!data) {
    await supabase.from("players").insert([
      { username: name, coins: 5 }
    ]);

    playerCoins = 5;
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
  const { data } = await supabase
    .from("bank")
    .select("*")
    .limit(1)
    .single();

  bankCoins = data.coins;
  available = data.available;
  history = data.history || [];

  renderUI();
}

async function updateBank() {
  await supabase
    .from("bank")
    .update({
      coins: bankCoins,
      available: available,
      history: history
    })
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

  if (playerCoins > 0) {
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