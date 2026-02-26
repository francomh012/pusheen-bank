const supabase = window.supabase;

// Pantallas
const loginScreen = document.getElementById("login-screen");
const gameScreen = document.getElementById("game-screen");

// Login
const usernameInput = document.getElementById("username");
const passwordInput = document.getElementById("password");
const loginBtn = document.getElementById("login-btn");
const registerBtn = document.getElementById("register-btn");
const loginMessage = document.getElementById("login-message");

// Juego
const coinDisplay = document.getElementById("coin-count");
const availableDisplay = document.getElementById("available-coins");
const addButton = document.getElementById("add-coin");
const removeButton = document.getElementById("remove-coin");
const logoutBtn = document.getElementById("logout-btn");
const playerInfo = document.getElementById("player-info");
const historyDiv = document.getElementById("history");

let player = null;
let playerCoins = 0;
let bankCoins = 0;
let available = 0;
let history = [];

// ================= LOGIN =================

registerBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  if (!username || !password) {
    loginMessage.textContent = "Completa todo 😼";
    return;
  }

  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("username", username)
    .single();

  if (data) {
    loginMessage.textContent = "Ese usuario ya existe ❌";
    return;
  }

  await supabase.from("players").insert([
    { username, password, coins: 5 } // empiezan con 5 monedas
  ]);

  loginMessage.textContent = "Perfil creado ✅ Ahora inicia sesión";
});

loginBtn.addEventListener("click", async () => {
  const username = usernameInput.value.trim();
  const password = passwordInput.value.trim();

  const { data } = await supabase
    .from("players")
    .select("*")
    .eq("username", username)
    .single();

  if (!data || data.password !== password) {
    loginMessage.textContent = "Datos incorrectos ❌";
    return;
  }

  player = data;
  playerCoins = data.coins;

  loginScreen.style.display = "none";
  gameScreen.style.display = "block";

  loadBank();
});

// ================= LOGOUT =================

logoutBtn.addEventListener("click", () => {
  player = null;
  loginScreen.style.display = "block";
  gameScreen.style.display = "none";
});

// ================= BANCO =================

async function loadBank() {
  const { data } = await supabase
    .from("bank")
    .select("*")
    .limit(1)
    .single();

  bankCoins = data.coins;
  available = data.available;
  history = data.history || [];

  updateUI();
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
    .eq("id", player.id);
}

function updateUI() {
  coinDisplay.textContent = bankCoins;
  availableDisplay.textContent = available;
  playerInfo.textContent = `Jugador: ${player.username} | Tus monedas: ${playerCoins} 🪙`;

  historyDiv.innerHTML = "<h3>Historial</h3>";
  history.slice(-10).reverse().forEach(entry => {
    const p = document.createElement("p");
    p.textContent = entry;
    historyDiv.appendChild(p);
  });
}

// ================= BOTONES =================

addButton.addEventListener("click", async () => {
  if (playerCoins > 0) {
    playerCoins--;
    bankCoins++;
    available--;

    history.push(`${player.username} dio una moneda 🪙`);

    await updatePlayer();
    await updateBank();
    updateUI();
  }
});

removeButton.addEventListener("click", async () => {
  if (bankCoins > 0) {
    playerCoins++;
    bankCoins--;
    available++;

    history.push(`${player.username} quitó una moneda ❌`);

    await updatePlayer();
    await updateBank();
    updateUI();
  }
});