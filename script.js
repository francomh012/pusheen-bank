const playerInfo = document.getElementById("player-info");

addButton.style.display = "none";
removeButton.style.display = "none";
const supabase = window.supabase;

const coinDisplay = document.getElementById("coin-count");
const availableDisplay = document.getElementById("available-coins");
const addButton = document.getElementById("add-coin");
const removeButton = document.getElementById("remove-coin");
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const historyDiv = document.getElementById("history");

let player = null;
let playerCoins = 0;

let bankCoins = 0;
let available = 0;
let history = [];

// ======================
// LOGIN / CREAR JUGADOR
// ======================

playerInfo.textContent = `Jugador: ${player.username} | Monedas: ${playerCoins} 🪙`;

addButton.style.display = "inline-block";
removeButton.style.display = "inline-block";

async function login() {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    alert("Pon usuario y contraseña 😼");
    return;
  }

  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("username", username)
    .single();

  if (data) {
    if (data.password !== password) {
      alert("Contraseña incorrecta ❌");
      return;
    }

    player = data;
    playerCoins = data.coins;
  } else {
    const { data: newPlayer } = await supabase
      .from("players")
      .insert([{ username, password, coins: 0 }])
      .select()
      .single();

    player = newPlayer;
    playerCoins = 0;
  }

  alert(`Bienvenido ${player.username} 🐾`);
  loadBank();
}

loginBtn.addEventListener("click", login);

passwordInput.addEventListener("keypress", function(e) {
  if (e.key === "Enter") {
    login();
  }
});

// ======================
// CARGAR BANCO GLOBAL
// ======================

async function loadBank() {
  const { data } = await supabase
    .from("bank")
    .select("*")
    .limit(1)
    .single();

  bankCoins = data.coins;
  available = data.available;
  history = data.history || [];

  coinDisplay.textContent = bankCoins;
  availableDisplay.textContent = available;

  renderHistory();
}

// ======================
// ACTUALIZAR BANK
// ======================

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

// ======================
// ACTUALIZAR PLAYER
// ======================

async function updatePlayer() {
  await supabase
    .from("players")
    .update({ coins: playerCoins })
    .eq("id", player.id);
}

// ======================
// HISTORIAL
// ======================

function renderHistory() {
  historyDiv.innerHTML = "<h3>Historial</h3>";

  history.slice(-10).reverse().forEach(entry => {
    const p = document.createElement("p");
    p.textContent = entry;
    historyDiv.appendChild(p);
  });
}

// ======================
// DAR MONEDA
// ======================

addButton.addEventListener("click", async () => {
  if (!player) return alert("Primero inicia sesión 😼");

  if (playerCoins > 0) {
    playerCoins--;
    bankCoins++;
    available--;

    history.push(`${player.username} dio una moneda 🪙 - ${new Date().toLocaleString()}`);

    await updatePlayer();
    await updateBank();
    loadBank();
  } else {
    alert("No tienes monedas personales 😿");
  }
});

// ======================
// QUITAR MONEDA
// ======================

removeButton.addEventListener("click", async () => {
  if (!player) return alert("Primero inicia sesión 😼");

  if (bankCoins > 0) {
    playerCoins++;
    bankCoins--;
    available++;

    history.push(`${player.username} quitó una moneda ❌ - ${new Date().toLocaleString()}`);

    await updatePlayer();
    await updateBank();
    loadBank();
  }
});